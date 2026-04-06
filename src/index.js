const express = require("express");
const path = require("path");
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

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Use Helmet to secure Express headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            "script-src-attr": ["'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
            "connect-src": ["'self'", "http:", "https:"]
        }
    }
}));
// Use Morgan to log HTTP requests in the console
app.use(morgan("dev"));

// Apply a global rate limiter to API requests only (skip static files)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "test" ? 1000 : 500, // Raised to 500 to support multi-step flows (signup, file uploads, etc.)
    message: { message: "Too many requests from this IP, please try again after 15 minutes" },
    skip: (req) => {
        // Don't rate-limit requests for static HTML, CSS, JS, images
        const staticExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.woff', '.woff2'];
        return staticExts.some(ext => req.path.endsWith(ext));
    }
});
app.use(globalLimiter);

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true
}));

// Webhook MUST be placed BEFORE express.json() to preserve the raw stream for crypto verification
app.post("/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookController);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    // Health check can still be logged or DB pinged, but we render the landing page for UI
    try {
        await pool.query("SELECT NOW()");
        res.render("landing");
    } catch (err) {
        console.error(err);
        res.status(500).send("Database connection failed, cannot load app.");
    }
});

app.get("/test/auth", authenticateUser, (req, res) => {
    res.status(200).json({
        user: req.user
    });
});

// Admin dashboard page route
app.get("/admin/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
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