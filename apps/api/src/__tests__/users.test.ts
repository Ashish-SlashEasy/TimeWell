import "./setup";
import request from "supertest";
import { createApp } from "../app";
import { User } from "../models";
import { signAccessToken } from "../utils/jwt";
import { hashPassword, comparePassword } from "../utils/password";

const app = createApp();

async function createVerifiedUser(email: string, password = "currentpass1") {
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    emailVerified: true,
    firstName: "Test",
    lastName: "User",
  });
  return { user, accessToken: signAccessToken(user.id, "user") };
}

describe("GET /api/users/me", () => {
  it("returns the authenticated user's profile", async () => {
    const { accessToken } = await createVerifiedUser("me@example.com");
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("me@example.com");
    expect(res.body.data.firstName).toBe("Test");
    expect(res.body.data.role).toBe("user");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid bearer tokens", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("GET /api/users/me/quota", () => {
  it("returns total/used/remaining", async () => {
    const { user, accessToken } = await createVerifiedUser("quota@example.com");
    user.purchasedCards = 5;
    user.usedCards = 2;
    await user.save();

    const res = await request(app)
      .get("/api/users/me/quota")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 5, used: 2, remaining: 3 });
  });
});

describe("PATCH /api/users/me", () => {
  it("updates first/last name immediately", async () => {
    const { accessToken } = await createVerifiedUser("name@example.com");
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ firstName: "Alice", lastName: "Smith" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe("Alice");
    expect(res.body.data.user.lastName).toBe("Smith");
    expect(res.body.data.emailChangePending).toBe(false);
  });

  it("does NOT immediately commit an email change; queues verification", async () => {
    const { accessToken } = await createVerifiedUser("old@example.com");
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "new@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.emailChangePending).toBe(true);

    // Verify the user document still has the old email
    const u = await User.findOne({ email: "old@example.com" });
    expect(u).not.toBeNull();
    const newRecord = await User.findOne({ email: "new@example.com" });
    expect(newRecord).toBeNull();
  });

  it("rejects an invalid phone format", async () => {
    const { accessToken } = await createVerifiedUser("phone@example.com");
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ phone: "not-a-phone" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/users/me/change-password", () => {
  it("changes the password when current password is correct", async () => {
    const { user, accessToken } = await createVerifiedUser("pw@example.com", "oldpassword1");
    const res = await request(app)
      .post("/api/users/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "oldpassword1",
        newPassword: "newpassword2",
        confirmPassword: "newpassword2",
      });
    expect(res.status).toBe(200);

    const refreshed = await User.findById(user.id).select("+passwordHash");
    expect(await comparePassword("newpassword2", refreshed!.passwordHash!)).toBe(true);
  });

  it("rejects when current password is wrong", async () => {
    const { accessToken } = await createVerifiedUser("pw2@example.com", "oldpassword1");
    const res = await request(app)
      .post("/api/users/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "wrong",
        newPassword: "newpassword2",
        confirmPassword: "newpassword2",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");
  });

  it("rejects when newPassword and confirmPassword don't match", async () => {
    const { accessToken } = await createVerifiedUser("pw3@example.com", "oldpassword1");
    const res = await request(app)
      .post("/api/users/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "oldpassword1",
        newPassword: "newpassword2",
        confirmPassword: "different2",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
