import { NextResponse } from "next/server";
import { z } from "zod";

import { createUploadUrl } from "@/lib/storage";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const upload = await createUploadUrl({
    workspaceId,
    filename: body.filename,
    contentType: body.contentType
  });

  return NextResponse.json(upload);
}
