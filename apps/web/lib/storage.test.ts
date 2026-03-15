import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const S3ClientMock = vi.fn().mockImplementation((config: Record<string, unknown>) => {
    return { config };
  });

  return {
    S3ClientMock,
    PutObjectCommandMock: vi.fn().mockImplementation((input: Record<string, unknown>) => ({
      input
    })),
    getSignedUrlMock: vi.fn()
  };
});

vi.mock("./env", () => ({
  env: {
    MINIO_REGION: "us-east-1",
    MINIO_ENDPOINT: "http://minio:9000",
    MINIO_PUBLIC_URL: "http://localhost:9000",
    MINIO_ACCESS_KEY: "minioadmin",
    MINIO_SECRET_KEY: "minioadmin",
    MINIO_BUCKET: "syntheci-files"
  }
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: mocks.PutObjectCommandMock,
  S3Client: mocks.S3ClientMock
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrlMock
}));

describe("createUploadUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.S3ClientMock.mockClear();
    mocks.PutObjectCommandMock.mockClear();
    mocks.getSignedUrlMock.mockReset();
    delete (globalThis as { s3?: unknown }).s3;
    delete (globalThis as { browserUploadSigner?: unknown }).browserUploadSigner;
  });

  it("signs browser uploads against the public MinIO URL", async () => {
    mocks.getSignedUrlMock.mockResolvedValue("http://localhost:9000/signed-upload");

    const { createUploadUrl } = await import("./storage");
    const result = await createUploadUrl({
      workspaceId: "workspace-1",
      filename: "README.pdf",
      contentType: "application/pdf"
    });

    expect(mocks.S3ClientMock).toHaveBeenCalledTimes(2);
    expect(mocks.S3ClientMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        endpoint: "http://minio:9000"
      })
    );
    expect(mocks.S3ClientMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        endpoint: "http://localhost:9000"
      })
    );
    expect(mocks.getSignedUrlMock).toHaveBeenCalledWith(
      mocks.S3ClientMock.mock.results[1]?.value,
      expect.any(Object),
      expect.objectContaining({
        expiresIn: 900
      })
    );
    expect(result.uploadUrl).toBe("http://localhost:9000/signed-upload");
    expect(result.objectKey).toMatch(/^workspace-1\/\d+-.*-README\.pdf$/);
    expect(result.publicUrl).toMatch(
      /^http:\/\/localhost:9000\/syntheci-files\/workspace-1\/\d+-.*-README\.pdf$/
    );
  });
});
