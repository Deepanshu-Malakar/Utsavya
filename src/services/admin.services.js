const pool = require("../config/db");

const getDashboardStats = async () => {
    // Revenue metrics (strictly from successful payments)
    const revenueQuery = `
        SELECT 
            COALESCE(SUM(amount), 0) AS lifetime_total,
            COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS monthly_total
        FROM payments
        WHERE status = 'successful'
    `;

    // Refund metrics
    const refundQuery = `
        SELECT 
            COUNT(*) AS successful_count,
            COALESCE(SUM(amount), 0) AS successful_total,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()) AND status = 'successful') AS monthly_successful_count
        FROM refunds
        WHERE status = 'successful'
    `;

    // Core system metrics
    const countsQuery = `
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users WHERE is_active = false) AS blocked_users,
            (SELECT COUNT(*) FROM users WHERE role = 'vendor') AS total_vendors_overall,
            (SELECT COUNT(*) FROM users WHERE role = 'vendor' AND is_active = true) AS active_vendors,
            (SELECT COUNT(*) FROM bookings WHERE event_start >= NOW() AND status IN ('planning', 'pending', 'confirmed')) AS upcoming_events,
            (SELECT COUNT(*) FROM bookings WHERE status IN ('planning', 'pending')) AS events_needing_action,
            (SELECT COUNT(*) FROM vendor_requests WHERE status = 'pending') AS pending_verifications,
            (SELECT COUNT(*) FROM vendor_reports) AS total_vendor_reports,
            (SELECT COUNT(*) FROM vendor_reports WHERE created_at >= date_trunc('month', NOW())) AS monthly_vendor_reports,
            (SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('month', NOW())) AS users_joined_this_month
    `;

    // Audit metrics (this month)
    const auditQuery = `
        SELECT
            COUNT(*) FILTER (WHERE event_type = 'account_deletion') AS deletion_count,
            COUNT(*) FILTER (WHERE event_type = 'security_breach') AS breach_count
        FROM audit_logs
        WHERE created_at >= date_trunc('month', NOW())
    `;

    const [{ rows: [revenue] }, { rows: [refunds] }, { rows: [counts] }, { rows: [audit] }] = await Promise.all([
        pool.query(revenueQuery),
        pool.query(refundQuery),
        pool.query(countsQuery),
        pool.query(auditQuery)
    ]);

    return {
        revenue: {
            lifetime: Number(revenue.lifetime_total) || 0,
            monthly: Number(revenue.monthly_total) || 0
        },
        refunds: {
            total_count: Number(refunds.successful_count) || 0,
            total_value: Number(refunds.successful_total) || 0,
            monthly_count: Number(refunds.monthly_successful_count) || 0
        },
        stats: {
            total_users: Number(counts.total_users) || 0,
            blocked_users: Number(counts.blocked_users) || 0,
            total_vendors: Number(counts.active_vendors) || 0,
            approved_vendors: Number(counts.active_vendors) || 0,
            total_vendors_overall: Number(counts.total_vendors_overall) || 0,
            upcoming_events: Number(counts.upcoming_events) || 0,
            pending_verifications: Number(counts.pending_verifications) || 0,
            events_needing_action: Number(counts.events_needing_action) || 0,
            total_vendor_reports: Number(counts.total_vendor_reports) || 0,
            monthly_vendor_reports: Number(counts.monthly_vendor_reports) || 0,
            users_joined_this_month: Number(counts.users_joined_this_month) || 0,
            monthly_deletions: Number(audit.deletion_count) || 0,
            monthly_security_breaches: Number(audit.breach_count) || 0
        }
    };
};

const getModerationQueue = async () => {
    const query = `
        SELECT 
            u.id as vendor_id,
            u.full_name,
            u.email,
            COUNT(vr.id)::INT as report_count,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT vr.reason), NULL) as reasons,
            MAX(vr.created_at) as last_reported_at,
            (ARRAY_AGG(vr.reason ORDER BY vr.created_at DESC))[1] as latest_reason,
            (ARRAY_AGG(vr.details ORDER BY vr.created_at DESC))[1] as latest_details,
            (ARRAY_AGG(r.full_name ORDER BY vr.created_at DESC))[1] as latest_reporter_name
        FROM users u
        JOIN vendor_reports vr ON u.id = vr.vendor_id
        LEFT JOIN users r ON r.id = vr.reporter_id
        WHERE u.is_active = true
        GROUP BY u.id
        ORDER BY report_count DESC, last_reported_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

const getPendingVendorRequests = async () => {
    const query = `
        SELECT 
            vr.*,
            u.full_name as requester_name,
            u.email as requester_email
        FROM vendor_requests vr
        JOIN users u ON vr.user_id = u.id
        WHERE vr.status = 'pending'
        ORDER BY vr.created_at ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

const getAllUsers = async (limit = 10, offset = 0) => {
    const query = `
        SELECT id, full_name, email, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(query, [limit, offset]);
    return rows;
};

const { sendAccountStatusEmail } = require("../utils/email");

const blockUser = async (userId, adminId) => {
    const query = `
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, is_active
    `;
    const { rows } = await pool.query(query, [userId]);
    if (rows.length === 0) {
        throw new Error("User not found");
    }

    // Notify user of account suspension
    const user = rows[0];
    await sendAccountStatusEmail(user.email, "BLOCKED", "Suspended due to policy violation or security review.").catch(console.error);

    return user;
};

module.exports = {
    getDashboardStats,
    getModerationQueue,
    getPendingVendorRequests,
    getAllUsers,
    blockUser
};
