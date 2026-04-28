import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function useLocalStorage(): boolean {
  if (env.isTest) return true;
  if (env.isProd) return false;
  return !env.S3_ENDPOINT || env.AWS_ACCESS_KEY_ID === "your_aws_access_key_id";
}

// Lazy S3 client — only instantiated when actually uploading to S3 (never in tests).
let _s3: import("@aws-sdk/client-s3").S3Client | null = null;
async function getS3(): Promise<import("@aws-sdk/client-s3").S3Client> {
  if (!_s3) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    _s3 = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      ...(env.S3_ENDPOINT
        ? { endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE }
        : {}),
    });
  }
  return _s3;
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (useLocalStorage()) {
    const dest = path.join(LOCAL_UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buffer);
    return `/uploads/${key}`;
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await getS3();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return env.S3_ENDPOINT
    ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
    : `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  if (useLocalStorage()) {
    try {
      await fs.unlink(path.join(LOCAL_UPLOADS_DIR, key));
    } catch {
      // ignore missing file
    }
    return;
  }
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await getS3();
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
