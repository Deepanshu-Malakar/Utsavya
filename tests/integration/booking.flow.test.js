const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

let customerToken;
let vendorToken;
let vendor2Token;

let bookingId;
let serviceId;
let vendorId;
let vendor2Id;

let item1;
let item2;

// dynamic emails
const customerEmail = `user_${Date.now()}@test.com`;
const vendorEmail = `vendor1_${Date.now()}@test.com`;
const vendor2Email = `vendor2_${Date.now()}@test.com`;

beforeAll(async () => {
    await pool.query(`
        TRUNCATE TABLE 
        booking_items,
        bookings,
        users
        RESTART IDENTITY CASCADE
    `);
});

describe("Booking Flow Integration Test", () => {

    test("register + login customer", async () => {

        const res = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Test User",
                email: customerEmail,
                password: "123456"
            });

        const otp = res.body.testOtp;

        const verify = await request(app)
            .post("/auth/verify-otp")
            .send({
                email: customerEmail,
                otp
            });

        customerToken = verify.body.accessToken;
    });

    test("create booking", async () => {

        const res = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                title: "Test Wedding",
                event_start: "2026-02-10T09:00:00Z",
                event_end: "2026-02-12T23:00:00Z",
                location: "Delhi",
                guest_count: 200
            });

        expect(res.statusCode).toBe(201);
        bookingId = res.body.id;
    });

    test("create vendors + service", async () => {

        // ---------- Vendor 1 ----------
        const res1 = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Vendor User 1",
                email: vendorEmail,
                password: "123456"
            });

        const otp1 = res1.body.testOtp;

        await request(app)
            .post("/auth/verify-otp")
            .send({
                email: vendorEmail,
                otp: otp1
            });

        // promote role
        await pool.query(
            `UPDATE users SET role = 'vendor' WHERE email = $1`,
            [vendorEmail]
        );

        // login again (IMPORTANT)
        const login1 = await request(app)
            .post("/auth/login")
            .send({
                email: vendorEmail,
                password: "123456"
            });

        vendorToken = login1.body.accessToken;

        const user1 = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [vendorEmail]
        );

        vendorId = user1.rows[0].id;

        // create service (by vendor1)
        const service = await request(app)
            .post("/services")
            .set("Authorization", `Bearer ${vendorToken}`)
            .send({
                title: "Photography",
                description: "Best photos",
                city: "Delhi",
                price: 50000,
                price_type: "fixed"
            });

        serviceId = service.body.id;


        // ---------- Vendor 2 ----------
        const res2 = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Vendor User 2",
                email: vendor2Email,
                password: "123456"
            });

        const otp2 = res2.body.testOtp;

        await request(app)
            .post("/auth/verify-otp")
            .send({
                email: vendor2Email,
                otp: otp2
            });

        await pool.query(
            `UPDATE users SET role = 'vendor' WHERE email = $1`,
            [vendor2Email]
        );

        const login2 = await request(app)
            .post("/auth/login")
            .send({
                email: vendor2Email,
                password: "123456"
            });

        vendor2Token = login2.body.accessToken;

        const user2 = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [vendor2Email]
        );

        vendor2Id = user2.rows[0].id;
    });

    test("customer requests service from 2 vendors", async () => {

        // vendor 1
        const res1 = await request(app)
            .post("/bookings/items")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                booking_id: bookingId,
                service_id: serviceId,
                vendor_id: vendorId
            });

        expect(res1.statusCode).toBe(201);
        item1 = res1.body.id;

        // vendor 2
        const res2 = await request(app)
            .post("/bookings/items")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                booking_id: bookingId,
                service_id: serviceId,
                vendor_id: vendor2Id
            });

        expect(res2.statusCode).toBe(201);
        item2 = res2.body.id;
    });

    test("vendor accepts request", async () => {

        const res = await request(app)
            .patch(`/vendors/booking-requests/${item1}`)
            .set("Authorization", `Bearer ${vendorToken}`)
            .send({
                status: "accepted",
                price_quote: 50000
            });

        expect(res.statusCode).toBe(200);
    });

    test("customer selects vendor", async () => {

        const res = await request(app)
            .patch(`/bookings/items/${item1}/select`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.statusCode).toBe(200);
    });

    test("verify only one vendor selected", async () => {

        const result = await pool.query(
            `SELECT * FROM booking_items WHERE booking_id = $1`,
            [bookingId]
        );

        const selected = result.rows.filter(r => r.is_selected);
        const cancelled = result.rows.filter(r => r.status === "cancelled");

        expect(selected.length).toBe(1);
        expect(cancelled.length).toBeGreaterThanOrEqual(1);
    });

});

test("customer can fetch booking details", async () => {

    const res = await request(app)
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${customerToken}`);

    console.log(res.body);
    expect(res.statusCode).toBe(200);

    expect(res.body.id).toBe(bookingId);

    expect(Array.isArray(res.body.items)).toBe(true);

    // at least one selected vendor
    const selected = res.body.items.filter(i => i.is_selected);
    expect(selected.length).toBe(1);
});

test("another user cannot access booking", async () => {

    const otherEmail = `other_${Date.now()}@test.com`;

    // register another user
    const res = await request(app)
        .post("/auth/register")
        .send({
            full_name: "Other User",
            email: otherEmail,
            password: "123456"
        });

    const otp = res.body.testOtp;

    const verify = await request(app)
        .post("/auth/verify-otp")
        .send({
            email: otherEmail,
            otp
        });

    const otherToken = verify.body.accessToken;

    const result = await request(app)
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${otherToken}`);
    console.log(result.body);
    expect(result.statusCode).toBe(400); // unauthorized
});