import { NextResponse } from "next/server";
import { z } from "zod";

import { answerWithCitations } from "@syntheci/ai";

import { retrieveContextChunks } from "@/lib/retrieval";
import { requireWorkspaceContext } from "@/lib/session";

const sourceTypeSchema = z.enum(["gmail", "slack", "note", "upload", "link"]);

const requestSchema = z.object({
  question: z.string().min(1),
  sourceTypes: z.array(sourceTypeSchema).optional()
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const chunks = await retrieveContextChunks({
    workspaceId,
    question: body.question,
    sourceTypes: body.sourceTypes
  });

  const result = await answerWithCitations({
    question: body.question,
    chunks
  });

  return NextResponse.json(result);
}
