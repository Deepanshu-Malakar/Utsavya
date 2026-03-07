const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

describe("Vendor Request API", () => {

    let accessToken;
    const email = `vendorrequest${Date.now()}@test.com`;

    beforeAll(async () => {

        const registerRes = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Vendor Request User",
                email: email,
                password: "password123"
            });

        const otp = registerRes.body.testOtp;

        const verifyRes = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: email,
                otp: otp
            });

        accessToken = verifyRes.body.accessToken;
    });

    test("customer can submit vendor request", async () => {

        const res = await request(app)
            .post("/vendors/request")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                business_name: "Dream Weddings",
                business_description: "Premium wedding planners",
                city: "Delhi",
                documents_url: "https://cloudinary.com/docs.pdf"
            });

        console.log("Vendor request response:", res.body);

        expect(res.statusCode).toBe(201);
        expect(res.body.business_name).toBe("Dream Weddings");
    });

    test("unauthenticated user cannot submit request", async () => {

        const res = await request(app)
            .post("/vendors/request")
            .send({
                business_name: "Test Vendor",
                city: "Delhi"
            });

        console.log("Vendor request response:", res.body);

        expect(res.statusCode).toBe(401);
    });

});