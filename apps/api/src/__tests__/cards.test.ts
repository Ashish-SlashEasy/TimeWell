import "./setup";
import sharp from "sharp";
import request from "supertest";
import { createApp } from "../app";
import { User } from "../models";
import { signAccessToken } from "../utils/jwt";

const app = createApp();

// Generate a valid 2x2 JPEG using sharp before tests run
let TINY_JPEG: Buffer;
beforeAll(async () => {
  TINY_JPEG = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .jpeg()
    .toBuffer();
});

async function createUser(email: string) {
  const user = await User.create({ email, emailVerified: true, role: "user" });
  const token = signAccessToken(user.id, user.role);
  return { user, token };
}

describe("Cards API", () => {
  describe("POST /api/cards", () => {
    it("creates a card and returns 201", async () => {
      const { token } = await createUser("owner@example.com");
      const res = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "My Card", orientation: "landscape" });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("My Card");
      expect(res.body.data.status).toBe("draft");
      expect(res.body.data.shareToken).toBeTruthy();
    });

    it("requires authentication", async () => {
      const res = await request(app).post("/api/cards").send({ title: "X" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/cards", () => {
    it("returns only the owner's cards", async () => {
      const { token } = await createUser("owner2@example.com");
      const { token: otherToken } = await createUser("other@example.com");

      await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Card A" });
      await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ title: "Card B" });

      const res = await request(app).get("/api/cards").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("Card A");
    });
  });

  describe("PATCH /api/cards/:id", () => {
    it("updates title and message", async () => {
      const { token } = await createUser("edit@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Old" });

      const res = await request(app)
        .patch(`/api/cards/${create.body.data.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New", message: "Hello world" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("New");
      expect(res.body.data.message).toBe("Hello world");
    });

    it("prevents another user from editing", async () => {
      const { token } = await createUser("owner3@example.com");
      const { token: t2 } = await createUser("other2@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .patch(`/api/cards/${create.body.data.id}`)
        .set("Authorization", `Bearer ${t2}`)
        .send({ title: "Hacked" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/cards/:id", () => {
    it("soft-deletes the card", async () => {
      const { token } = await createUser("del@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      const id = create.body.data.id;

      const del = await request(app)
        .delete(`/api/cards/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(del.status).toBe(204);

      const get = await request(app)
        .get(`/api/cards/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(get.status).toBe(404);
    });
  });

  describe("POST /api/cards/:id/cover", () => {
    it("uploads a cover image and returns derivatives", async () => {
      const { token } = await createUser("cover@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .post(`/api/cards/${create.body.data.id}/cover`)
        .set("Authorization", `Bearer ${token}`)
        .attach("cover", TINY_JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(200);
      expect(res.body.data.coverImage.original).toBeTruthy();
      expect(res.body.data.coverImage.web).toBeTruthy();
      expect(res.body.data.coverImage.thumb).toBeTruthy();
      expect(res.body.data.status).toBe("in_progress");
    });

    it("rejects non-image files", async () => {
      const { token } = await createUser("cover2@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .post(`/api/cards/${create.body.data.id}/cover`)
        .set("Authorization", `Bearer ${token}`)
        .attach("cover", Buffer.from("not an image"), {
          filename: "file.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(415);
    });
  });
});

describe("Contributions API", () => {
  describe("POST /api/cards/:cardId/contributions", () => {
    it("allows anonymous contribution to a public card", async () => {
      const { token } = await createUser("contrib@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .post(`/api/cards/${create.body.data.id}/contributions`)
        .field("senderName", "Alice")
        .field("senderMessage", "Happy birthday!")
        .attach("photo", TINY_JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(201);
      expect(res.body.data.senderName).toBe("Alice");
      expect(res.body.data.mediaKey).toBeTruthy();
    });

    it("returns 422 when contributions are disabled", async () => {
      const { token } = await createUser("nodisable@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      await request(app)
        .patch(`/api/cards/${create.body.data.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ settings: { allowContributions: false } });

      const res = await request(app)
        .post(`/api/cards/${create.body.data.id}/contributions`)
        .field("senderName", "Bob")
        .attach("photo", TINY_JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("CONTRIBUTIONS_DISABLED");
    });
  });

  describe("GET /api/cards/:cardId/contributions", () => {
    it("lists contributions for the card owner", async () => {
      const { token } = await createUser("listowner@example.com");
      const create = await request(app)
        .post("/api/cards")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      const cardId = create.body.data.id;

      await request(app)
        .post(`/api/cards/${cardId}/contributions`)
        .field("senderName", "Alice")
        .attach("photo", TINY_JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });

      const res = await request(app)
        .get(`/api/cards/${cardId}/contributions`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
