import multer from "multer";
import { AppError } from "./AppError";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", statusCode: 415 }));
    }
  },
});
