const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "test") {
    console.warn("⚠️ STRIPE_SECRET_KEY is missing in .env!");
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mockKey123");

module.exports = stripe;
