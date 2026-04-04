const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth.routes");
const authenticateUser = require("./middlewares/auth.middleware");
const vendorRoutes = require("./routes/vendor.routes");
const serviceRoutes = require("./routes/service.routes");
const bookingRoutes = require("./routes/booking.routes");
const reviewRoutes = require("./routes/review.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminRoutes = require("./routes/admin.routes");
const notificationRoutes = require("./routes/notification.routes");
const { stripeWebhookController } = require("./controllers/payment.controller");
//const authorizeRoles = require("./middlewares/role.middleware");

require("dotenv").config();

const pool = require("./config/db");

const app = express();

// Use Helmet to secure Express headers
app.use(helmet());
// Use Morgan to log HTTP requests in the console
app.use(morgan("dev"));

// Apply a global rate limiter to all api requests
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "test" ? 1000 : 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use(globalLimiter);

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true
}));

// Webhook MUST be placed BEFORE express.json() to preserve the raw stream for crypto verification
app.post("/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookController);

app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/vendors", vendorRoutes);
app.use("/services", serviceRoutes);
app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);
app.use("/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/notifications", notificationRoutes);

app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            message: "Database connected!",
            time: result.rows[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database connection failed" });
    }
});

app.get("/test/auth", authenticateUser, (req, res) => {
    res.status(200).json({
        user: req.user
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;