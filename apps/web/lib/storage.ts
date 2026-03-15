import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "./env";

const globalForS3 = globalThis as unknown as {
  s3?: S3Client;
  browserUploadSigner?: S3Client;
};

export const s3 =
  globalForS3.s3 ??
  new S3Client({
    region: env.MINIO_REGION,
    endpoint: env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY
    }
  });

export const browserUploadSigner =
  globalForS3.browserUploadSigner ??
  new S3Client({
    region: env.MINIO_REGION,
    endpoint: env.MINIO_PUBLIC_URL,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY
    }
  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3 = s3;
  globalForS3.browserUploadSigner = browserUploadSigner;
}

export async function createUploadUrl(input: {
  workspaceId: string;
  filename: string;
  contentType: string;
}) {
  const objectKey = `${input.workspaceId}/${Date.now()}-${randomUUID()}-${input.filename}`;
  const command = new PutObjectCommand({
    Bucket: env.MINIO_BUCKET,
    Key: objectKey,
    ContentType: input.contentType
  });

  const uploadUrl = await getSignedUrl(browserUploadSigner, command, {
    expiresIn: 900
  });

  return {
    objectKey,
    uploadUrl,
    publicUrl: `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${objectKey}`
  };
}
