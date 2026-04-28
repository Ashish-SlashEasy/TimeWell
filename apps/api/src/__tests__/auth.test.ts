import "./setup";
import request from "supertest";
import { createApp } from "../app";
import { AuthToken, User } from "../models";
import { getCapturedEmails } from "../utils/email";
import { getCapturedSms as getSms } from "../utils/sms";
import { hashPassword } from "../utils/password";

const app = createApp();

function extractTokenFromMagicLink(text: string): string {
  const m = /token=([^\s"']+)/.exec(text);
  if (!m) throw new Error("token not found in magic link: " + text);
  return decodeURIComponent(m[1]);
}

describe("POST /api/auth/signup", () => {
  it("creates a user shell and dispatches a magic link for email signup", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ ok: true });

    const user = await User.findOne({ email: "alice@example.com" });
    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBe(false);

    const emails = getCapturedEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("alice@example.com");

    const tokens = await AuthToken.find({ purpose: "magic_link" });
    expect(tokens).toHaveLength(1);
  });

  it("dispatches an OTP via SMS for phone signup", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ phone: "+14155550100" });

    expect(res.status).toBe(202);
    const sms = getSms();
    expect(sms).toHaveLength(1);
    expect(sms[0].to).toBe("+14155550100");
    expect(sms[0].body).toMatch(/\d{6}/);
  });

  it("returns the same 202 response for an existing user (no enumeration)", async () => {
    await request(app).post("/api/auth/signup").send({ email: "bob@example.com" });
    const res = await request(app).post("/api/auth/signup").send({ email: "bob@example.com" });
    expect(res.status).toBe(202);
    expect(getCapturedEmails().length).toBe(2);
  });

  it("rejects when neither email nor phone is provided", async () => {
    const res = await request(app).post("/api/auth/signup").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid E.164 phone", async () => {
    const res = await request(app).post("/api/auth/signup").send({ phone: "415-555-0100" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/verify (magic link)", () => {
  async function signupAndExtractToken(email: string): Promise<string> {
    await request(app).post("/api/auth/signup").send({ email });
    const emails = getCapturedEmails();
    return extractTokenFromMagicLink(emails[emails.length - 1].text);
  }

  it("verifies a valid magic-link token, marks email verified, and issues tokens", async () => {
    const token = await signupAndExtractToken("carol@example.com");
    const res = await request(app).post("/api/auth/verify").send({ token });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.userId).toBeDefined();

    const cookies = res.headers["set-cookie"];
    const cookieArr = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    expect(cookieArr.some((c: string) => c.startsWith("tw_refresh="))).toBe(true);
    expect(cookieArr.some((c: string) => /HttpOnly/i.test(c))).toBe(true);

    const user = await User.findOne({ email: "carol@example.com" });
    expect(user?.emailVerified).toBe(true);
  });

  it("rejects an invalid token", async () => {
    const res = await request(app).post("/api/auth/verify").send({ token: "garbage" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });

  it("rejects a token that has already been consumed", async () => {
    const token = await signupAndExtractToken("dave@example.com");
    const first = await request(app).post("/api/auth/verify").send({ token });
    expect(first.status).toBe(200);
    const second = await request(app).post("/api/auth/verify").send({ token });
    expect(second.status).toBe(400);
    expect(["TOKEN_INVALID", "TOKEN_CONSUMED"]).toContain(second.body.error.code);
  });
});

describe("POST /api/auth/verify (OTP)", () => {
  it("verifies a valid OTP code and issues tokens", async () => {
    await request(app).post("/api/auth/signup").send({ phone: "+14155551234" });
    const sms = getSms();
    const code = /\b(\d{6})\b/.exec(sms[0].body)![1];

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ code, phone: "+14155551234" });
    expect(res.status).toBe(200);

    const user = await User.findOne({ phone: "+14155551234" });
    expect(user?.phoneVerified).toBe(true);
  });

  it("rejects a wrong code", async () => {
    await request(app).post("/api/auth/signup").send({ phone: "+14155559999" });
    const res = await request(app)
      .post("/api/auth/verify")
      .send({ code: "000000", phone: "+14155559999" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  async function createVerifiedUserWithPassword(email: string, password: string) {
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      emailVerified: true,
    });
    return user;
  }

  it("logs in with correct password and sets refresh cookie", async () => {
    await createVerifiedUserWithPassword("eve@example.com", "supersecret123");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "eve@example.com", password: "supersecret123" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    const cookies = res.headers["set-cookie"];
    const arr = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    expect(arr.some((c: string) => c.startsWith("tw_refresh="))).toBe(true);
  });

  it("rejects an unknown email with INVALID_CREDENTIALS (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a wrong password and increments failed attempts; locks after 5", async () => {
    await createVerifiedUserWithPassword("frank@example.com", "rightpassword");
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "frank@example.com", password: "wrong" });
      expect(res.status).toBe(401);
    }
    const locked = await request(app)
      .post("/api/auth/login")
      .send({ email: "frank@example.com", password: "rightpassword" });
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
  });
});

describe("POST /api/auth/refresh + /logout", () => {
  it("refreshes the access token from a valid refresh cookie", async () => {
    await User.create({ email: "grace@example.com", emailVerified: true });
    const sign = await request(app).post("/api/auth/signup").send({ email: "grace@example.com" });
    expect(sign.status).toBe(202);
    const token = extractTokenFromMagicLink(getCapturedEmails()[0].text);
    const verifyRes = await request(app).post("/api/auth/verify").send({ token });
    const cookieHeader = (verifyRes.headers["set-cookie"] as unknown as string[]).find((c) =>
      c.startsWith("tw_refresh="),
    )!;

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader.split(";")[0]);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it("rejects refresh without cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("logout clears the refresh cookie", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"];
    const arr = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    expect(arr.some((c: string) => c.includes("tw_refresh=") && /Expires=/i.test(c))).toBe(true);
  });
});

describe("Forgot + reset password", () => {
  it("forgot-password silently 202s for unknown emails", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });
    expect(res.status).toBe(202);
    expect(getCapturedEmails()).toHaveLength(0);
  });

  it("forgot-password sends a reset email for known users; reset-password updates the hash", async () => {
    const passwordHash = await hashPassword("oldpassword");
    await User.create({ email: "henry@example.com", emailVerified: true, passwordHash });

    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "henry@example.com" });
    expect(forgot.status).toBe(202);
    const emails = getCapturedEmails();
    expect(emails).toHaveLength(1);
    const resetToken = extractTokenFromMagicLink(emails[0].text);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetToken, newPassword: "newpassword123" });
    expect(reset.status).toBe(200);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "henry@example.com", password: "newpassword123" });
    expect(newLogin.status).toBe(200);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "henry@example.com", password: "oldpassword" });
    expect(oldLogin.status).toBe(401);
  });

  it("reset-password rejects an unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "garbage", newPassword: "whatever12" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("Magic link request endpoint", () => {
  it("issues a magic link for an existing user", async () => {
    await User.create({ email: "ivy@example.com" });
    const res = await request(app).post("/api/auth/magic-link").send({ email: "ivy@example.com" });
    expect(res.status).toBe(202);
    expect(getCapturedEmails()).toHaveLength(1);
  });
});

