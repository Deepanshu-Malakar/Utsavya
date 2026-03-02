const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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
            userId: user.id
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

        console.log(`OTP for ${email}: ${otp}`);

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

        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        // Store refresh session
        await client.query(
            `
            INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days')
            `,
            [user.id, refreshTokenHash]
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
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await pool.query(
        `
        INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '7 days')
        `,
        [user.id, refreshTokenHash]
    );

    return { accessToken, refreshToken };
};

// 🔹 REFRESH TOKEN
const refreshTokenService = async (refreshToken) => {
    try {
        // 1. Verify JWT
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const userId = decoded.userId;

        // 2. Get all sessions for user
        const sessions = await pool.query(
            `SELECT * FROM user_sessions WHERE user_id = $1`,
            [userId]
        );

        if (sessions.rows.length === 0) {
            throw new Error('Session not found');
        }

        // 3. Compare hashed token
        let validSession = null;

        for (const session of sessions.rows) {
            const isMatch = await bcrypt.compare(
                refreshToken,
                session.refresh_token_hash
            );

            if (isMatch) {
                validSession = session;
                break;
            }
        }

        if (!validSession) {
            throw new Error('Invalid refresh token');
        }

        // 4. Check expiry
        if (new Date() > validSession.expires_at) {
            throw new Error('Refresh token expired');
        }

        // 5. Generate new access token
        const userResult = await pool.query(
            `SELECT id, role FROM users WHERE id = $1`,
            [userId]
        );

        const user = userResult.rows[0];

        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return { accessToken };

    } catch (error) {
        throw error;
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
            return { message: 'Logged out successfully' };
        }
    }

    throw new Error('Session not found');
};

module.exports = {
    registerUser,
    verifyOtp,
    loginUser,
    refreshTokenService,
    logoutService
};