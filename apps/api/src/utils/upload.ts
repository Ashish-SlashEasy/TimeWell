import multer from "multer";
import { AppError } from "./AppError";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/m4a", "audio/webm"];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;  // 15 MB
const MAX_MEDIA_BYTES = 200 * 1024 * 1024; // 200 MB (video ceiling)

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", statusCode: 415 }));
  },
});

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MEDIA_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", statusCode: 415 }));
  },
});
