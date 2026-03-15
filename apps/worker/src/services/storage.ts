import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

export const minioBucket = process.env.MINIO_BUCKET ?? "syntheci-files";

export function createObjectStorageClient() {
  return new S3Client({
    region: process.env.MINIO_REGION ?? "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin"
    }
  });
}

export const objectStorage = createObjectStorageClient();

type ObjectStorageClient = Pick<S3Client, "send">;

function getAwsErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return {
    code: candidate.Code ?? candidate.code ?? candidate.name ?? null,
    httpStatusCode: candidate.$metadata?.httpStatusCode ?? null
  };
}

function isMissingBucketError(error: unknown) {
  const details = getAwsErrorCode(error);
  if (!details) {
    return false;
  }

  return details.code === "NoSuchBucket" || details.code === "NotFound" || details.httpStatusCode === 404;
}

function isExistingBucketError(error: unknown) {
  const details = getAwsErrorCode(error);
  if (!details) {
    return false;
  }

  return details.code === "BucketAlreadyOwnedByYou" || details.code === "BucketAlreadyExists";
}

export async function ensureBucketExists(
  client: ObjectStorageClient = objectStorage,
  bucket: string = minioBucket
) {
  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: bucket
      })
    );
    return;
  } catch (error) {
    if (!isMissingBucketError(error)) {
      throw error;
    }
  }

  try {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket
      })
    );
  } catch (error) {
    if (!isExistingBucketError(error)) {
      throw error;
    }
  }
}
