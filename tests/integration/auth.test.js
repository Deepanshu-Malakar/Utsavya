const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

beforeAll(async () => {
    await pool.query("DELETE FROM user_sessions");
    await pool.query("DELETE FROM vendor_requests");
    await pool.query("DELETE FROM users");
});

describe("Auth Integration Tests", () => {

    const testEmail = `jest_${Date.now()}@example.com`;
    let testOtp;
    let accessToken;

    it("should register a user", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Test User",
                email: testEmail,
                password: "Password123"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBeDefined();
        expect(res.body.testOtp).toBeDefined();

        testOtp = res.body.testOtp;
    });

    it("should verify OTP and return access token", async () => {
        const res = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: testEmail,
                otp: testOtp
            });

        console.log("VERIFY RESPONSE:", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();

        accessToken = res.body.accessToken;
    });

    it("should login user and return access token + set refresh cookie", async () => {

        const res = await request(app)
            .post("/auth/login")
            .send({
                email: testEmail,
                password: "Password123"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();

        // 🔍 Check cookie is set
        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();

    });

    let refreshCookie;

    it("should login user and return access token + set refresh cookie", async () => {

        const res = await request(app)
            .post("/auth/login")
            .send({
                email: testEmail,
                password: "Password123"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();

        refreshCookie = cookies;  // store for next test
    });

    it("should refresh access token using cookie", async () => {

        const res = await request(app)
            .post("/auth/refresh")
            .set("Cookie", refreshCookie); // simulate browser

        expect(res.statusCode).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });

    it("should logout user and clear refresh cookie", async () => {

        const res = await request(app)
            .post("/auth/logout")
            .set("Cookie", refreshCookie);

        expect(res.statusCode).toBe(200);

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();

        // Cookie should be cleared
        expect(cookies[0]).toContain("refreshToken=;");
    });

    it("should fail to refresh after logout", async () => {

        const res = await request(app)
            .post("/auth/refresh")
            .set("Cookie", refreshCookie);

        expect(res.statusCode).toBe(401);
    });

});