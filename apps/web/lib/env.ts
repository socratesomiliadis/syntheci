import { z } from "zod";

const envSchema = z.object({
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(20),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  MINIO_ENDPOINT: z.string().url(),
  MINIO_REGION: z.string().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  MINIO_PUBLIC_URL: z.string().url()
});

export const env = envSchema.parse({
  APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgres://syntheci:syntheci@localhost:5432/syntheci",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "replace-with-long-random-secret-and-rotate",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "replace-me",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "replace-me",
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  MINIO_REGION: process.env.MINIO_REGION ?? "us-east-1",
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  MINIO_BUCKET: process.env.MINIO_BUCKET ?? "syntheci-files",
  MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000"
});
