import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./AppError";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: "user" | "admin";
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: "refresh";
  jti: string;
}

export function signAccessToken(userId: string, role: "user" | "admin"): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] };
  return jwt.sign({ sub: userId, role, type: "access" }, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(userId: string, jti: string): string {
  const opts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"] };
  return jwt.sign({ sub: userId, type: "refresh", jti }, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== "access") throw AppError.unauthorized();
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError({ code: "TOKEN_EXPIRED", statusCode: 401 });
    }
    throw new AppError({ code: "TOKEN_INVALID", statusCode: 401 });
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== "refresh") throw AppError.unauthorized();
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError({ code: "TOKEN_EXPIRED", statusCode: 401 });
    }
    throw new AppError({ code: "TOKEN_INVALID", statusCode: 401 });
  }
}
