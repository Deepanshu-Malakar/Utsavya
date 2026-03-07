const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

describe("Vendor Service API", () => {

    let vendorToken;
    let customerToken;

    const customerEmail = `customer${Date.now()}@test.com`;
    const vendorEmail = `vendor${Date.now()}@test.com`;

    beforeAll(async () => {

        // register customer
        const registerCustomer = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Customer User",
                email: customerEmail,
                password: "password123"
            });

        const otpCustomer = registerCustomer.body.testOtp;

        const verifyCustomer = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: customerEmail,
                otp: otpCustomer
            });

        customerToken = verifyCustomer.body.accessToken;


        // register vendor
        const registerVendor = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Vendor User",
                email: vendorEmail,
                password: "password123"
            });

        const otpVendor = registerVendor.body.testOtp;

        const verifyVendor = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: vendorEmail,
                otp: otpVendor
            });

        vendorToken = verifyVendor.body.accessToken;

        // promote to vendor
        await pool.query(
            `UPDATE users SET role = 'vendor' WHERE email = $1`,
            [vendorEmail]
        );

        // re-login to get vendor token
        const loginVendor = await request(app)
            .post("/auth/login")
            .send({
                email: vendorEmail,
                password: "password123"
            });

        vendorToken = loginVendor.body.accessToken;

    });


    test("vendor can create service", async () => {

        const res = await request(app)
            .post("/services")
            .set("Authorization", `Bearer ${vendorToken}`)
            .send({
                title: "Wedding Planning",
                description: "Complete wedding planning service",
                city: "Delhi",
                price: 150000,
                price_type: "fixed"
            });

        console.log("SERVICE RESPONSE:", res.body);

        expect(res.statusCode).toBe(201);
        expect(res.body.title).toBe("Wedding Planning");

    });


    test("customer cannot create service", async () => {

        const res = await request(app)
            .post("/services")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                title: "Test Service",
                city: "Delhi"
            });

        expect(res.statusCode).toBe(403);

    });


    test("unauthenticated user blocked", async () => {

        const res = await request(app)
            .post("/services")
            .send({
                title: "Test Service",
                city: "Delhi"
            });

        expect(res.statusCode).toBe(401);

    });

});