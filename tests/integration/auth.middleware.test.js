const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

describe("Auth Middleware Tests", () => {

    let accessToken;

    beforeAll(async () => {

        const registerRes = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Test User",
                email: "middleware@test.com",
                password: "password123"
            });

        const otp = registerRes.body.testOtp;

        const verifyRes = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: "middleware@test.com",
                otp: otp
            });

        accessToken = verifyRes.body.accessToken;
    });

    test("should fail without token", async () => {

        const res = await request(app)
            .get("/test/auth");

        expect(res.statusCode).toBe(401);
    });

    test("should fail with invalid token", async () => {

        const res = await request(app)
            .get("/test/auth")
            .set("Authorization", "Bearer invalidtoken");

        expect(res.statusCode).toBe(401);
    });

    test("should allow access with valid token", async () => {

        const res = await request(app)
            .get("/test/auth")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user).toHaveProperty("userId");
    });

});