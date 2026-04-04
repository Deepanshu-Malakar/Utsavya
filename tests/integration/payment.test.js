const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");

jest.mock("../../src/config/stripe", () => ({
    checkout: {
        sessions: {
            create: jest.fn().mockResolvedValue({
                id: "cs_test_mock123",
                url: "https://checkout.stripe.com/mock"
            })
        }
    },
    webhooks: {
        constructEvent: jest.fn()
    }
}));

let customerToken;
let bookingId;
let paymentId;

const email = `pay_${Date.now()}@test.com`;

beforeAll(async () => {
    await pool.query(`
        TRUNCATE TABLE 
        payments,
        booking_items,
        bookings,
        users
        RESTART IDENTITY CASCADE
    `);
});

describe("Payment System Test", () => {

    test("setup: create user + booking", async () => {

        // register
        const res = await request(app)
            .post("/auth/register")
            .send({
                full_name: "Payment User",
                email,
                password: "123456"
            });

        const otp = res.body.testOtp;

        const verify = await request(app)
            .post("/auth/verify-otp")
            .send({
                email,
                otp
            });

        customerToken = verify.body.accessToken;

        // create booking
        const booking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                title: "Payment Event",
                event_start: "2026-02-10T09:00:00Z",
                event_end: "2026-02-12T23:00:00Z"
            });

        bookingId = booking.body.id;

        console.log("BOOKING CREATED:", booking.body);
    });

    test("✔ create payment", async () => {

        const res = await request(app)
            .post("/payments")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                booking_id: bookingId,
                amount: 50000
            });

        console.log("CREATE PAYMENT:", res.body);

        expect(res.statusCode).toBe(201);
        expect(res.body.checkout_url).toBe("https://checkout.stripe.com/mock");

        paymentId = res.body.payment.id;
    });

    test("✔ mark payment successful via Webhook", async () => {
        const stripe = require("../../src/config/stripe");

        stripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_mock123',
                    metadata: { bookingId: bookingId }
                }
            }
        });

        const res = await request(app)
            .post(`/payments/webhook`)
            .set("stripe-signature", "dummy-signature")
            .send(Buffer.from(JSON.stringify({ dummy: 'data' })));

        console.log("PAYMENT SUCCESS:", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body.received).toBe(true);
    });

    test("✔ verify DB updated", async () => {

        const result = await pool.query(
            `SELECT status FROM payments WHERE id = $1`,
            [paymentId]
        );

        console.log("DB PAYMENT STATUS:", result.rows[0]);

        expect(result.rows[0].status).toBe("successful");
    });

    test("❌ unauthorized user cannot create payment", async () => {

        const res = await request(app)
            .post("/payments")
            .send({
                booking_id: bookingId,
                amount: 50000
            });

        console.log("UNAUTHORIZED RESPONSE:", res.body);

        expect(res.statusCode).toBe(401);
    });

});