const request = require("supertest");
const app = require("../../src/index");
const pool = require("../../src/config/db");
const stripe = require("../../src/config/stripe");

// Mock Stripe & email to avoid real calls
jest.mock("../../src/config/stripe", () => ({
    refunds: {
        create: jest.fn().mockImplementation(() => Promise.resolve({ id: `re_test_${Date.now()}` }))
    }
}));

jest.mock("../../src/utils/email", () => ({
    sendNoticeEmail: jest.fn().mockResolvedValue(true),
    sendOtpEmail: jest.fn(),
    sendPaymentReceiptEmail: jest.fn()
}));

const { sendNoticeEmail } = require("../../src/utils/email");

describe("Refunds & Notifications Integration", () => {
    let customerToken, vendorToken, vendorId, serviceId, bookingId, itemId;

    beforeAll(async () => {
        // 1. Setup Customer & Vendor
        const customerEmail = `c${Date.now()}@test.com`;
        const regC = await request(app).post("/auth/register").send({ full_name: "Customer", email: customerEmail, password: "password123" });
        const vC = await request(app).post("/auth/verify-otp").send({ email: customerEmail, otp: regC.body.testOtp });
        customerToken = vC.body.accessToken;

        const vendorEmail = `v${Date.now()}@test.com`;
        const regV = await request(app).post("/auth/register").send({ full_name: "Vendor", email: vendorEmail, password: "password123" });
        
        // Elevate to vendor role in DB BEFORE verify-otp generates the token
        await pool.query("UPDATE users SET role = 'vendor' WHERE email = $1", [vendorEmail]);

        const vV = await request(app).post("/auth/verify-otp").send({ email: vendorEmail, otp: regV.body.testOtp });
        vendorToken = vV.body.accessToken;
        
        const vAuth = await request(app).get("/test/auth").set("Authorization", `Bearer ${vendorToken}`);
        vendorId = vAuth.body.user.userId;

        // 2. Create Service
        const sRes = await pool.query("INSERT INTO vendor_services (vendor_id, title, city, price) VALUES ($1, 'Test Service', 'New York', 1000) RETURNING id", [vendorId]);
        serviceId = sRes.rows[0].id;

        // 3. Create Booking
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const bRes = await request(app).post("/bookings").set("Authorization", `Bearer ${customerToken}`).send({
            title: "Test Event", event_start: new Date(), event_end: tomorrow, location: "Loc"
        });
        bookingId = bRes.body.id;

        // 4. Request Service
        const itemRes = await request(app).post("/bookings/items").set("Authorization", `Bearer ${customerToken}`).send({
            booking_id: bookingId, service_id: serviceId, vendor_id: vendorId
        });
        itemId = itemRes.body.id;
    });

    test("✔ New Request triggers email to Vendor", () => {
        expect(sendNoticeEmail).toHaveBeenCalledWith(expect.any(String), "New Booking Request", expect.any(String), expect.any(String));
    });

    test("✔ Vendor Accept triggers email to Customer", async () => {
        sendNoticeEmail.mockClear();
        await request(app).patch(`/bookings/items/${itemId}/status`).set("Authorization", `Bearer ${vendorToken}`).send({ status: "accepted", price_quote: 1000 });
        expect(sendNoticeEmail).toHaveBeenCalledWith(expect.any(String), "Booking ACCEPTED", expect.any(String), expect.any(String));
    });

    test("✔ Vendor Cancel on PAID booking triggers 100% refund", async () => {
        // Setup a simulated 'paid' state
        const pRes = await pool.query("INSERT INTO payments (booking_id, amount, status, payment_intent_id) VALUES ($1, 1000, 'successful', 'pi_123') RETURNING id", [bookingId]);
        
        await request(app).patch(`/bookings/items/${itemId}/cancel`).set("Authorization", `Bearer ${vendorToken}`).send({ reason: "Busy" });
        
        // 100% of 1000 = 1000
        expect(stripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000 })); 
    });

    test("✔ Customer Cancel on PAID booking triggers 95% refund", async () => {
        // Reset item to 'accepted' and mock stripe
        await pool.query("UPDATE booking_items SET status = 'accepted' WHERE id = $1", [itemId]);
        stripe.refunds.create.mockClear();

        await request(app).patch(`/bookings/items/${itemId}/cancel`).set("Authorization", `Bearer ${customerToken}`).send({ reason: "Change of plans" });
        
        // 95% of 1000 = 950
        expect(stripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 95000 }));
    });
});
