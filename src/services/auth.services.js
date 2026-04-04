const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendOtpEmail } = require("../utils/email");
const cloudinary = require('../config/cloudinary');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';


// 🔹 Generate Tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        {
            userId: user.id,
            jti: crypto.randomUUID() // 🛡️ Unique ID for every rotation
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
};

// 🔹 REGISTER (Local)
const registerUser = async ({ full_name, email, password }) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user already exists
        const existingUser = await client.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('Email already registered');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userResult = await client.query(
            `
            INSERT INTO users (full_name, email)
            VALUES ($1, $2)
            RETURNING id, full_name, email, role
            `,
            [full_name, email]
        );

        const user = userResult.rows[0];

        // Create auth provider (local)
        await client.query(
            `
            INSERT INTO user_auth_providers 
            (user_id, provider, provider_user_id, password_hash)
            VALUES ($1, 'local', $2, $3)
            `,
            [user.id, email, password_hash]
        );

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_hash = await bcrypt.hash(otp, 10);
        const expires_at = new Date(Date.now() + 15 * 60 * 1000);

        // Remove old OTP if exists
        await client.query(
            `DELETE FROM email_verification_otp WHERE user_id = $1`,
            [user.id]
        );

        // Insert new OTP
        await client.query(
            `
            INSERT INTO email_verification_otp (user_id, otp_hash, expires_at)
            VALUES ($1, $2, $3)
            `,
            [user.id, otp_hash, expires_at]
        );

        await client.query('COMMIT');

        // console.log(`OTP for ${email}: ${otp}`);
        if (process.env.NODE_ENV === "test") {
            return { message: "Registered successfully. Please verify OTP.", testOtp: otp };
        }

        await sendOtpEmail(email, otp);

        return {
            message: 'Registered successfully. Please verify OTP.'
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 🔹 VERIFY OTP
const verifyOtp = async ({ email, otp }) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Find user
        const userResult = await client.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }

        const user = userResult.rows[0];

        // Get OTP record
        const otpResult = await client.query(
            `SELECT * FROM email_verification_otp WHERE user_id = $1`,
            [user.id]
        );

        if (otpResult.rows.length === 0) {
            throw new Error('OTP not found');
        }

        const otpRecord = otpResult.rows[0];

        // Check expiry
        if (new Date() > otpRecord.expires_at) {
            throw new Error('OTP expired');
        }

        // Check attempts
        if (otpRecord.attempt_count >= 5) {
            throw new Error('Maximum OTP attempts exceeded');
        }

        // Compare OTP
        const isMatch = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isMatch) {
            await client.query(
                `
                UPDATE email_verification_otp
                SET attempt_count = attempt_count + 1
                WHERE user_id = $1
                `,
                [user.id]
            );

            throw new Error('Invalid OTP');
        }

        // Mark email verified
        await client.query(
            `
            UPDATE users
            SET is_email_verified = true,
                email_verified_at = NOW()
            WHERE id = $1
            `,
            [user.id]
        );

        // Delete OTP
        await client.query(
            `DELETE FROM email_verification_otp WHERE user_id = $1`,
            [user.id]
        );

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);
        const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        // Store refresh session with JTI
        await client.query(
            `
            INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, jti)
            VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)
            `,
            [user.id, refreshTokenHash, decodedToken.jti]
        );

        await client.query('COMMIT');

        return { accessToken, refreshToken };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 🔹 LOGIN (Local)
const loginUser = async ({ email, password }) => {
    const userResult = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    if (!user.is_email_verified) {
        throw new Error('Please verify your email first');
    }

    const providerResult = await pool.query(
        `
        SELECT * FROM user_auth_providers
        WHERE user_id = $1 AND provider = 'local'
        `,
        [user.id]
    );

    const provider = providerResult.rows[0];

    const isMatch = await bcrypt.compare(password, provider.password_hash);

    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await pool.query(
        `
        INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, jti)
        VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)
        `,
        [user.id, refreshTokenHash, decodedToken.jti]
    );

    return { accessToken, refreshToken };
};

// 🔹 GOOGLE AUTH (OAuth Login/Signup)
const googleAuthService = async (idToken) => {
    const client = await pool.connect();

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        const email = payload.email;
        const full_name = payload.name;
        const google_id = payload.sub;
        const profile_image = payload.picture;

        if (!email) {
            console.error("[Google Auth Error]: No email provided in payload", payload);
            throw new Error('Google token did not provide an email');
        }

        await client.query('BEGIN');

        // Check if user exists
        const existingUserResult = await client.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        let user;
        let final_profile_image = profile_image;

        // Sync profile image to Cloudinary if it exists
        if (profile_image) {
            try {
                const uploadRes = await cloudinary.uploader.upload(profile_image, {
                    folder: 'profiles/google_photos',
                    resource_type: 'image'
                });
                final_profile_image = uploadRes.secure_url;
            } catch (err) {
                console.error("[Non-critical] Google profile photo sync failed:", err.message);
                // Fallback to original Google URL if upload fails
            }
        }

        if (existingUserResult.rows.length === 0) {
            // Register new user
            const userResult = await client.query(
                `
                INSERT INTO users (full_name, email, is_email_verified, email_verified_at, profile_image)
                VALUES ($1, $2, true, NOW(), $3)
                RETURNING id, full_name, email, role, profile_image
                `,
                [full_name, email, final_profile_image]
            );

            user = userResult.rows[0];

            // Create google auth provider record
            await client.query(
                `
                INSERT INTO user_auth_providers 
                (user_id, provider, provider_user_id)
                VALUES ($1, 'google', $2)
                `,
                [user.id, google_id]
            );

        } else {
            user = existingUserResult.rows[0];
            
            // Check if provider exists
            const providerResult = await client.query(
                `SELECT * FROM user_auth_providers WHERE user_id = $1 AND provider = 'google'`,
                [user.id]
            );

            if (providerResult.rows.length === 0) {
                // Link this provider
                await client.query(
                    `
                    INSERT INTO user_auth_providers 
                    (user_id, provider, provider_user_id)
                    VALUES ($1, 'google', $2)
                    `,
                    [user.id, google_id]
                );
                
                if (!user.is_email_verified && payload.email_verified) {
                    await client.query(
                        `UPDATE users SET is_email_verified = true, email_verified_at = NOW() WHERE id = $1`,
                        [user.id]
                    );
                }

                // If user doesn't have a profile image, or it's not from Cloudinary, update it
                if (final_profile_image && (!user.profile_image || !user.profile_image.includes('res.cloudinary.com'))) {
                    await client.query(
                        `UPDATE users SET profile_image = $1 WHERE id = $2`,
                        [final_profile_image, user.id]
                    );
                }
            }
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);
        const decodedToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        // Store refresh session with JTI
        await client.query(
            `
            INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, jti)
            VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)
            `,
            [user.id, refreshTokenHash, decodedToken.jti]
        );

        await client.query('COMMIT');

        return { accessToken, refreshToken };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 🔹 REFRESH TOKEN
const refreshTokenService = async (refreshToken) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Verify JWT signature and payload
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        const userId = decoded.userId;

        // 2. Fetch all sessions for this user
        const sessionsRes = await client.query(
            `SELECT * FROM user_sessions WHERE user_id = $1`,
            [userId]
        );

        // 3. Find the matching session by comparing JTI
        // This is O(1) and secure
        const jti = decoded.jti;
        if (!jti) {
            throw new Error("Invalid refresh token: missing JTI");
        }

        const sessionMatchRes = await client.query(
            `SELECT * FROM user_sessions WHERE user_id = $1 AND jti = $2`,
            [userId, jti]
        );
        let currentSession = sessionMatchRes.rows[0];

        if (!currentSession) {
            throw new Error("Invalid or consumed refresh token");
        }

        // 4. Check expiry
        if (new Date() > currentSession.expires_at) {
            await client.query("DELETE FROM user_sessions WHERE id = $1", [currentSession.id]);
            await client.query("COMMIT");
            throw new Error("Refresh token expired");
        }

        // 5. CONSUME THE TOKEN: Delete the old session to prevent reuse
        const deleteRes = await client.query("DELETE FROM user_sessions WHERE id = $1", [currentSession.id]);
        if (deleteRes.rowCount === 0) {
            throw new Error("Invalid or already consumed refresh token");
        }

        // 6. Generate NEW tokens
        const userRes = await client.query(
            `SELECT id, role FROM users WHERE id = $1`,
            [userId]
        );
        const user = userRes.rows[0];
        
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

        // 7. Store NEW session with JTI
        // decodedNew contains the new unique JTI for current refresh operation
        const decodedNew = jwt.verify(newRefreshToken, process.env.JWT_REFRESH_SECRET);
        
        await client.query(
            `
            INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, jti)
            VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)
            `,
            [user.id, newRefreshTokenHash, decodedNew.jti]
        );

        await client.query("COMMIT");

        // 🛡️ Security Notification (Safe & Non-blocking)
        try {
            const { createNotification } = require("./notification.services");
            createNotification(
                userId,
                "Security Alert: Session Refreshed",
                "Your account session was recently refreshed. If this was not you, please secure your account.",
                "system"
            ).catch(err => console.error("[NON-CRITICAL] Notification failed:", err.message));
        } catch (e) {
            console.error("[NON-CRITICAL] Failed to load notification service:", e.message);
        }

        return { accessToken, refreshToken: newRefreshToken };

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }
        if (error.name === 'JsonWebTokenError') throw new Error('Invalid refresh token');
        if (error.name === 'TokenExpiredError') throw new Error('Refresh token expired');
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};

// 🔹 LOGOUT
const logoutService = async (refreshToken) => {
    // Verify token first
    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
    );

    const userId = decoded.userId;

    const sessions = await pool.query(
        `SELECT * FROM user_sessions WHERE user_id = $1`,
        [userId]
    );

    let deleted = false;
    for (const session of sessions.rows) {
        const isMatch = await bcrypt.compare(
            refreshToken,
            session.refresh_token_hash
        );

        if (isMatch) {
            await pool.query(
                `DELETE FROM user_sessions WHERE id = $1`,
                [session.id]
            );
            deleted = true;
        }
    }

    if (deleted) {
        return { message: 'Logged out successfully' };
    }

    throw new Error('Session not found');
};

module.exports = {
    registerUser,
    verifyOtp,
    loginUser,
    googleAuthService,
    refreshTokenService,
    logoutService
};