const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");
const fs = require("fs");
const path = require("path");

jest.mock("../../src/config/cloudinary", () => ({
    uploader: {
        upload: jest.fn().mockResolvedValue({ secure_url: "https://mocked-cloudinary.com/test.jpg" })
    }
}));

describe("Service Media API", () => {

    let vendorToken;
    let serviceId;
    let mediaId;

    const vendorEmail = `mediaVendor${Date.now()}@test.com`;
    const dummyImagePath = path.join(__dirname, "dummy.jpg");

    beforeAll(async () => {
        fs.writeFileSync(dummyImagePath, "fake image content");

        // register vendor
        const registerRes = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Media Vendor",
                email: vendorEmail,
                password: "password123"
            });

        const otp = registerRes.body.testOtp;

        const verifyRes = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: vendorEmail,
                otp: otp
            });

        // promote to vendor
        await pool.query(
            `UPDATE users SET role='vendor' WHERE email=$1`,
            [vendorEmail]
        );

        // login again
        const loginRes = await request(app)
            .post("/auth/login")
            .send({
                email: vendorEmail,
                password: "password123"
            });

        vendorToken = loginRes.body.accessToken;

        // create service
        const serviceRes = await request(app)
            .post("/services")
            .set("Authorization", `Bearer ${vendorToken}`)
            .send({
                title: "Wedding Photography",
                description: "Premium wedding photography",
                city: "Delhi",
                price: 50000,
                price_type: "fixed"
            });

        serviceId = serviceRes.body.id;
    });


    test("vendor uploads service media", async () => {

        const res = await request(app)
            .post(`/services/${serviceId}/media`)
            .set("Authorization", `Bearer ${vendorToken}`)
            .attach("file", dummyImagePath);

        console.log("Service Media Response:", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.media_url).toBe("https://mocked-cloudinary.com/test.jpg");

        mediaId = res.body.id;
    });


    test("public can view service media", async () => {

        const res = await request(app)
            .get(`/services/${serviceId}/media`);

        console.log("View Media Response:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });


    test("vendor can delete own media", async () => {

        const res = await request(app)
            .delete(`/services/media/${mediaId}`)
            .set("Authorization", `Bearer ${vendorToken}`);

        console.log("Delete Media Response:", res.body);
        expect(res.statusCode).toBe(200);
    });

    afterAll(() => {
        if (fs.existsSync(dummyImagePath)) {
            fs.unlinkSync(dummyImagePath);
        }
    });

});