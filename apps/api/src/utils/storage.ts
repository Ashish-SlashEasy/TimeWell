import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function useCloudinary(): boolean {
  return !env.isTest && Boolean(env.CLOUDINARY_CLOUD_NAME);
}

function useLocalStorage(): boolean {
  return !useCloudinary();
}

let _cloudinaryReady = false;
async function getCloudinary() {
  const { v2 } = await import("cloudinary");
  if (!_cloudinaryReady) {
    v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    _cloudinaryReady = true;
  }
  return v2;
}

function resourceType(contentType: string): "image" | "video" | "raw" {
  if (contentType.startsWith("video/") || contentType.startsWith("audio/")) return "video";
  if (contentType.startsWith("image/")) return "image";
  return "raw";
}

function publicIdFromUrl(url: string): string {
  // https://res.cloudinary.com/{cloud}/{rtype}/upload/v{ver}/{public_id}.{ext}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : "";
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
    return `${env.API_PUBLIC_URL}/uploads/${key}`;
  }

  const cloudinary = await getCloudinary();
  const publicId = `timewell/${key.replace(/\.[^.]+$/, "")}`;
  const rtype = resourceType(contentType);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ public_id: publicId, resource_type: rtype, overwrite: true }, (err, result) => {
        if (err || !result) reject(err ?? new Error("Cloudinary upload failed"));
        else resolve(result.secure_url);
      })
      .end(buffer);
  });
}

export async function deleteFile(key: string): Promise<void> {
  if (useLocalStorage()) {
    try { await fs.unlink(path.join(LOCAL_UPLOADS_DIR, key)); } catch { /* ignore */ }
    return;
  }

  const cloudinary = await getCloudinary();
  const publicId = key.startsWith("http")
    ? publicIdFromUrl(key)
    : `timewell/${key.replace(/\.[^.]+$/, "")}`;
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "auto" }).catch(() => null);
}
