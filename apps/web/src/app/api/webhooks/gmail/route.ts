import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { connectedAccounts, db } from "@syntheci/db";
import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { env } from "@/lib/env";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, ingestionQueue } from "@/lib/queue";

interface GmailPushEnvelope {
  emailAddress: string;
  historyId: string;
}

interface PubSubPushBody {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
}

function decodeGmailEnvelope(data: string): GmailPushEnvelope {
  const text = Buffer.from(data, "base64").toString("utf8");
  return JSON.parse(text) as GmailPushEnvelope;
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== env.GOOGLE_PUBSUB_VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json()) as PubSubPushBody;
  const encodedData = body.message?.data;
  if (!encodedData) {
    return NextResponse.json({ ok: true });
  }

  const envelope = decodeGmailEnvelope(encodedData);
  const accounts = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.provider, "google")
  });
  const account = accounts.find((candidate) => {
    const email = (candidate.metadata as Record<string, unknown>)?.email;
    return typeof email === "string" && email.toLowerCase() === envelope.emailAddress.toLowerCase();
  });

  if (!account) {
    return NextResponse.json({ ok: true, skipped: "no_connected_account" });
  }

  const idempotencyKey = buildIdempotencyKey(
    "gmail-push",
    envelope.emailAddress,
    envelope.historyId,
    body.message?.messageId
  );

  await upsertJobAudit({
    workspaceId: account.workspaceId,
    queueName: QUEUE_NAMES.ingestion,
    jobName: JOB_NAMES.INGEST_GMAIL_NOTIFICATION,
    idempotencyKey,
    status: "queued",
    payload: envelope as unknown as Record<string, unknown>
  });

  await enqueueJob({
    queue: ingestionQueue,
    name: JOB_NAMES.INGEST_GMAIL_NOTIFICATION,
    payload: {
      workspaceId: account.workspaceId,
      idempotencyKey,
      connectedAccountId: account.id,
      historyId: envelope.historyId
    }
  });

  return NextResponse.json({ ok: true });
}
