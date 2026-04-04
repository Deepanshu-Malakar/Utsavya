const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

describe("Booking Overall Edit System Integration", () => {
    let customerToken, vendorToken, bookingId, itemId, vendorId, serviceId;
    let customerEmail = `cust-edit-${Date.now()}@test.com`;
    let vendorEmail = `vend-edit-${Date.now()}@test.com`;

    beforeAll(async () => {
        // 1. Create Customer
        const cReg = await request(app).post("/auth/register").send({ full_name: "Edit Customer", email: customerEmail, password: "password123" });
        await request(app).post("/auth/verify-otp").send({ email: customerEmail, otp: cReg.body.testOtp });
        const cLogin = await request(app).post("/auth/login").send({ email: customerEmail, password: "password123" });
        customerToken = cLogin.body.accessToken;

        // 2. Create and Approve Vendor
        const vReg = await request(app).post("/auth/register").send({ full_name: "Edit Vendor", email: vendorEmail, password: "password123" });
        await request(app).post("/auth/verify-otp").send({ email: vendorEmail, otp: vReg.body.testOtp });
        const vLogin = await request(app).post("/auth/login").send({ email: vendorEmail, password: "password123" });
        vendorToken = vLogin.body.accessToken;
        vendorId = vLogin.body.user?.id; // Note: We might need to fetch this if not in login body

        // Manual approval for test speed
        const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [vendorEmail]);
        vendorId = userRes.rows[0].id;
        await pool.query("UPDATE users SET role = 'vendor' WHERE id = $1", [vendorId]);

        // 3. Create Service
        const sRes = await pool.query(
            "INSERT INTO vendor_services (vendor_id, title, city, price, category) VALUES ($1, 'Test Service', 'Test City', 100, 'catering') RETURNING id",
            [vendorId]
        );
        serviceId = sRes.rows[0].id;

        // 4. Create Booking
        const bRes = await request(app).post("/bookings").set("Authorization", `Bearer ${customerToken}`).send({
            title: "Original Event",
            event_start: new Date(Date.now() + 86400000).toISOString(),
            event_end: new Date(Date.now() + 172800000).toISOString(),
            location: "Original Venue",
            guest_count: 100
        });
        bookingId = bRes.body.id;

        // 5. Request Service
        const iRes = await request(app).post("/bookings/items").set("Authorization", `Bearer ${customerToken}`).send({
            booking_id: bookingId,
            service_id: serviceId,
            vendor_id: vendorId
        });
        itemId = iRes.body.id;
    });

    test("✔ Customer can update non-critical details (Title/Location)", async () => {
        const res = await request(app)
            .patch(`/bookings/${bookingId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ title: "Updated Event Title" });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.data.title).toBe("Updated Event Title");
    });

    test("✔ Critical update (Guest Count) resets item status to pending", async () => {
        // First, vendor accepts
        await pool.query("UPDATE booking_items SET status = 'accepted', is_selected = TRUE WHERE id = $1", [itemId]);

        const res = await request(app)
            .patch(`/bookings/${bookingId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ guest_count: 500 });
        
        expect(res.statusCode).toBe(200);
        
        // Check DB: is_selected should be FALSE and status should be 'pending'
        const itemRes = await pool.query("SELECT status, is_selected FROM booking_items WHERE id = $1", [itemId]);
        expect(itemRes.rows[0].status).toBe("pending");
        expect(itemRes.rows[0].is_selected).toBe(false);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [customerEmail, vendorEmail]);
        // await pool.end(); // Skipping pool.end() to avoid Jest hang
    });
});
