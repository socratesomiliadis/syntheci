import { Readability } from "@mozilla/readability";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { JSDOM } from "jsdom";
import pdfParse from "pdf-parse";

import { minioBucket, objectStorage } from "./storage";

async function streamToBuffer(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream) {
  if ("getReader" in stream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function extractTextFromObject(input: {
  objectKey: string;
  mimeType: string | null;
}) {
  const response = await objectStorage.send(
    new GetObjectCommand({
      Bucket: minioBucket,
      Key: input.objectKey
    })
  );

  if (!response.Body) {
    throw new Error("Missing object body");
  }

  const buffer = await streamToBuffer(response.Body as NodeJS.ReadableStream);
  const mime = (input.mimeType ?? "").toLowerCase();

  if (mime.includes("pdf")) {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString("utf8");
}

export async function extractTextFromUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "SyntheciBot/0.1"
    }
  });
  if (!response.ok) {
    throw new Error(`URL fetch failed (${response.status})`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent?.trim()) {
    throw new Error("No readable article content found");
  }

  return {
    title: article.title ?? url,
    text: article.textContent.trim()
  };
}
