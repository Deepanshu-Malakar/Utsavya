const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

describe("Vendor Review API", () => {

    let customerToken;
    let adminToken;
    let vendorRequestId;

    const customerEmail = `reviewcustomer${Date.now()}@test.com`;
    const adminEmail = `reviewadmin${Date.now()}@test.com`;

    beforeAll(async () => {

        // register customer
        const registerCustomer = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Customer User",
                email: customerEmail,
                password: "password123"
            });

        const customerOtp = registerCustomer.body.testOtp;

        const verifyCustomer = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: customerEmail,
                otp: customerOtp
            });

        customerToken = verifyCustomer.body.accessToken;


        // customer submits vendor request
        const vendorReq = await request(app)
            .post("/vendors/request")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                business_name: "Dream Weddings",
                business_description: "Luxury wedding planners",
                city: "Delhi",
                documents_url: "https://cloudinary.com/doc.pdf"
            });

        vendorRequestId = vendorReq.body.id;


        // register admin
        const registerAdmin = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Admin User",
                email: adminEmail,
                password: "password123"
            });

        const adminOtp = registerAdmin.body.testOtp;

        const verifyAdmin = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: adminEmail,
                otp: adminOtp
            });

        adminToken = verifyAdmin.body.accessToken;

        // promote admin
        await pool.query(
            `UPDATE users SET role = 'admin' WHERE email = $1`,
            [adminEmail]
        );

        // re-login to get admin token
        const adminLogin = await request(app)
            .post("/auth/login")
            .send({
                email: adminEmail,
                password: "password123"
            });

        adminToken = adminLogin.body.accessToken;
    });


    test("customer cannot review vendor request", async () => {

        const res = await request(app)
            .patch(`/vendors/${vendorRequestId}/review`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                status: "approved",
                admin_note: "Approved"
            });

        expect(res.statusCode).toBe(403);
    });


    test("admin can approve vendor request", async () => {

        const res = await request(app)
            .patch(`/vendors/${vendorRequestId}/review`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "approved",
                admin_note: "Documents verified"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("approved");
    });


    test("request cannot be reviewed twice", async () => {

        const res = await request(app)
            .patch(`/vendors/${vendorRequestId}/review`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "rejected",
                admin_note: "Second attempt"
            });

        expect(res.statusCode).toBe(400);
    });

});