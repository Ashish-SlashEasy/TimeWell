import crypto from "crypto";

export function generateMagicLinkToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = sha256(raw);
  return { raw, hash };
}

export function generateOtpCode(): { raw: string; hash: string } {
  const n = crypto.randomInt(0, 1_000_000);
  const raw = String(n).padStart(6, "0");
  return { raw, hash: sha256(raw) };
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateShareToken(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function newJti(): string {
  return crypto.randomUUID();
}
