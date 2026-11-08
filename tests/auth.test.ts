import { describe, expect, it } from "vitest";
import { sign } from "jsonwebtoken";
import { api, createUser } from "./helpers";

describe("accounts and authentication", () => {
  it("creates an account without exposing sensitive data", async () => {
    const response = await api().post("/v1/user").send({ name: "alice123", password: "secret12" }).expect(201);

    expect(response.body).toMatchObject({ name: "alice123", trophies: 0, userRole: 0 });
    expect(response.body.password).toBeUndefined();
    expect(response.body.email).toBeUndefined();
  });

  it("rejects duplicated names and invalid input", async () => {
    await api().post("/v1/user").send({ name: "bob12345", password: "secret12" }).expect(201);

    const duplicated = await api().post("/v1/user").send({ name: "bob12345", password: "secret12" }).expect(400);
    expect(duplicated.body.error).toBe("UserAlreadyExists");

    const shortName = await api().post("/v1/user").send({ name: "ab", password: "secret12" }).expect(400);
    expect(shortName.body.error).toBe("BadRequest");

    await api().post("/v1/user").send({ name: "with space", password: "secret12" }).expect(400);
    await api().post("/v1/user").send({ name: "carol123", password: "123" }).expect(400);
  });

  it("logs in, returns an expiring token and validates it", async () => {
    await api().post("/v1/user").send({ name: "dave1234", password: "secret12" }).expect(201);

    const login = await api().post("/v1/login").send({ name: "dave1234", password: "secret12" }).expect(200);
    const payload = JSON.parse(Buffer.from(login.body.token.split(".")[1], "base64url").toString());
    expect(payload.exp - payload.iat).toBe(30 * 24 * 60 * 60);

    const me = await api().get("/v1/login").set({ authorization: `Bearer ${login.body.token}` }).expect(200);
    expect(me.body.name).toBe("dave1234");
  });

  it("rejects wrong credentials with the same message", async () => {
    await api().post("/v1/user").send({ name: "erin1234", password: "secret12" }).expect(201);

    const wrongPassword = await api().post("/v1/login").send({ name: "erin1234", password: "wrong123" }).expect(401);
    const unknownUser = await api().post("/v1/login").send({ name: "nobody99", password: "secret12" }).expect(401);

    expect(wrongPassword.body.error).toBe("InvalidCredentials");
    expect(unknownUser.body.message).toBe(wrongPassword.body.message);
  });

  it("rejects missing, malformed and expired tokens", async () => {
    const user = await createUser();

    expect((await api().get("/v1/puzzles/list/official").expect(401)).body.error).toBe("InvalidAuth");
    await api().get("/v1/login").set({ authorization: user.token }).expect(401);
    await api().get("/v1/login").set({ authorization: "Bearer not-a-token" }).expect(401);

    const expired = sign({}, process.env.JWT_KEY!, { subject: user.id, expiresIn: -10 });
    await api().get("/v1/login").set({ authorization: `Bearer ${expired}` }).expect(401);
  });
});
