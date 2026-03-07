const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const authenticateUser = require("./middlewares/auth.middleware");
const vendorRoutes = require("./routes/vendor.routes");
const serviceRoutes = require("./routes/service.routes");
//const authorizeRoles = require("./middlewares/role.middleware");

require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/vendors", vendorRoutes);
app.use("/services", serviceRoutes);
//app.use("/vendor/services", serviceRoutes);

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

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;