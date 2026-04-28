import rateLimit, { Options } from "express-rate-limit";
import { ErrorMessages } from "@timewell/shared";
import { env } from "../config/env";

function build(opts: Partial<Options> & { windowMs: number; max: number; name: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: env.isTest ? Number.MAX_SAFE_INTEGER : opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: opts.keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: ErrorMessages.RATE_LIMITED,
          requestId: req.requestId,
        },
      });
    },
  });
}

// Section 3: signup 5 per IP per hour
export const signupRateLimiter = build({
  name: "signup",
  windowMs: 60 * 60 * 1000,
  max: 5,
});

// Section 3: login 5 attempts per 10 min per account
export const loginRateLimiter = build({
  name: "login",
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const ident =
      (req.body?.email as string | undefined)?.toLowerCase() ??
      (req.body?.phone as string | undefined) ??
      req.ip ??
      "unknown";
    return `login:${ident}`;
  },
});

// Section 3: magic-link request — same shape as signup, conservative
export const magicLinkRateLimiter = build({
  name: "magic-link",
  windowMs: 60 * 60 * 1000,
  max: 5,
});

// Forgot-password (email enumeration mitigation): 5/hour/IP
export const forgotPasswordRateLimiter = build({
  name: "forgot-password",
  windowMs: 60 * 60 * 1000,
  max: 5,
});
