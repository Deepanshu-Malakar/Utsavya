const pool = require("../config/db");

const {
    createVendorRequest,
    getVendorRequestById,
    updateVendorRequestStatus,
    promoteUserToVendor
} = require("../models/vendor.model");

const { getVendorRatings, getVendorReviews } = require("./review.services");

const submitVendorRequest = async (user, data) => {

    if (user.role !== "customer") {
        throw new Error("Only customers can request vendor access");
    }

    const vendorRequest = await createVendorRequest({
        user_id: user.userId,
        ...data
    });

    return vendorRequest;
};

const { sendAccountStatusEmail } = require("../utils/email");

const reviewVendorRequest = async (adminUser, requestId, data) => {

    if (adminUser.role !== "admin") {
        throw new Error("Only admins can review vendor requests");
    }

    const request = await getVendorRequestById(requestId);

    if (!request) {
        throw new Error("Vendor request not found");
    }

    if (request.status !== "pending") {
        throw new Error("Request already reviewed");
    }

    const updatedRequest = await updateVendorRequestStatus({
        request_id: requestId,
        status: data.status,
        admin_note: data.admin_note,
        admin_id: adminUser.userId
    });

    if (!updatedRequest) {
        throw new Error("Failed to update request");
    }

    if (data.status === "approved") {
        await promoteUserToVendor(request.user_id);
    }

    // Notify user of their vendor application status
    const statusMsg = data.status === "approved" ? "APPROVED - PROMOTED TO VENDOR" : "REJECTED";
    const reasonMsg = data.admin_note || (data.status === "approved" 
        ? "Congratulations! Your account has been officially promoted. You can now log out, log back in, and access your Vendor Dashboard." 
        : "Your application did not meet our current requirements.");
    
    // We need the user's email, but we already have it in the request object (joined with users table in model)
    // Actually, getVendorRequestById might not have the email. Let's check the model or just fetch it.
    const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [request.user_id]);
    if (userRes.rows.length > 0) {
        await sendAccountStatusEmail(userRes.rows[0].email, statusMsg, reasonMsg).catch(console.error);
    }

    return updatedRequest;
};

const getVendorProfile = async (vendorId) => {

    // Vendor basic info
    const vendorQuery = `
        SELECT id, full_name
        FROM users
        WHERE id = $1 AND role = 'vendor'
    `;

    const vendorResult = await pool.query(vendorQuery, [vendorId]);

    if (vendorResult.rows.length === 0) {
        throw new Error("Vendor not found");
    }

    const vendor = vendorResult.rows[0];

    // Availability blocks (for calendar)
    const availabilityRes = await pool.query(
        "SELECT id, start_time, end_time, reason FROM vendor_availability WHERE vendor_id = $1 ORDER BY start_time ASC",
        [vendorId]
    );

    // Ratings
    const rating = await getVendorRatings(vendorId);

    // Services
    const servicesQuery = `
        SELECT id, title, description, city, price, price_type
        FROM vendor_services
        WHERE vendor_id = $1
    `;

    const servicesResult = await pool.query(servicesQuery, [vendorId]);

    // Reviews preview
    const reviews = await getVendorReviews(vendorId, {
        limit: 3,
        offset: 0
    });

    return {
        ...vendor,
        availability: availabilityRes.rows,
        rating,
        services: servicesResult.rows,
        reviews_preview: reviews
    };
};

const searchVendors = async (queryParams) => {

    const {
        city,
        service,
        event_start,
        event_end,
        sort,
        limit = 10,
        offset = 0
    } = queryParams;

    let filters = [];
    let values = [];
    let idx = 1;

    let availabilitySubquery = "TRUE as is_available";
    if (event_start && event_end) {
        // We use placeholders here and will append them to values array
        const startIdx = idx++;
        const endIdx = idx++;
        values.push(new Date(event_start).toISOString(), new Date(event_end).toISOString());

        availabilitySubquery = `
            NOT EXISTS (
                SELECT 1 FROM vendor_availability va 
                WHERE va.vendor_id = u.id 
                AND va.start_time < $${endIdx} AND va.end_time > $${startIdx}
            ) AND NOT EXISTS (
                SELECT 1 FROM booking_items bi2 
                JOIN bookings b2 ON bi2.booking_id = b2.id
                WHERE bi2.vendor_id = u.id 
                AND bi2.status IN ('accepted', 'completed')
                AND b2.event_start < $${endIdx} AND b2.event_end > $${startIdx}
            ) as is_available
        `;
    }

    // price filters (Budget)
    if (queryParams.min_price) {
        filters.push(`vs.price >= $${idx++}`);
        values.push(queryParams.min_price);
    }
    if (queryParams.max_price) {
        filters.push(`vs.price <= $${idx++}`);
        values.push(queryParams.max_price);
    }

    // city filter
    if (city) {
        filters.push(`vs.city = $${idx++}`);
        values.push(city);
    }

    // service filter
    if (service) {
        filters.push(`vs.title ILIKE $${idx++}`);
        values.push(`%${service}%`);
    }

    // WHERE clause
    const whereClause = `
        WHERE u.role = 'vendor'
        ${filters.length > 0 ? "AND " + filters.join(" AND ") : ""}
    `;

    // sorting
    let orderBy = "average_rating DESC";

    if (sort === "latest") {
        orderBy = "u.created_at DESC";
    }

    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.profile_image,

            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
            COUNT(DISTINCT r.id) AS total_reviews,

            ARRAY_AGG(DISTINCT vs.title) AS service_titles,
            MIN(vs.price) AS starting_price,
            MIN(vs.city) AS city,
            ${availabilitySubquery}

        FROM users u
        JOIN vendor_services vs ON u.id = vs.vendor_id
        LEFT JOIN booking_items bi ON bi.vendor_id = u.id
        LEFT JOIN reviews r ON r.booking_item_id = bi.id

        ${whereClause}

        GROUP BY u.id
        ORDER BY ${orderBy}
        LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(limit, offset);

    const { rows } = await pool.query(query, values);

    return rows.map(v => ({
        ...v,
        average_rating: parseFloat(v.average_rating) || 0,
        total_reviews: parseInt(v.total_reviews) || 0,
        starting_price: parseFloat(v.starting_price) || 0,
        services: v.service_titles || []   // keep 'services' field for frontend compatibility
    }));
};

const reportVendor = async (reporterId, vendorId, data) => {
    const { reason, details } = data;
    const query = `
        INSERT INTO vendor_reports (reporter_id, vendor_id, reason, details)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const { rows } = await pool.query(query, [reporterId, vendorId, reason, details]);
    return rows[0];
};

const getVendorDashboardStats = async (vendorId) => {
    // 1. Revenue Analytics (Lifetime & Monthly)
    const revenueQuery = `
        SELECT 
            COALESCE(SUM(p.amount), 0) as total_lifetime,
            COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= date_trunc('month', NOW())), 0) as total_monthly
        FROM payments p
        JOIN booking_items bi ON p.booking_id = bi.booking_id
        WHERE bi.vendor_id = $1 AND bi.is_selected = TRUE AND p.status = 'successful'
    `;
    const { rows: [revenue] } = await pool.query(revenueQuery, [vendorId]);

    // 2. Booking Success Metrics
    const metricsQuery = `
        SELECT 
            COUNT(*) as total_bookings,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
            COUNT(*) FILTER (WHERE status = 'accepted') as upcoming_bookings
        FROM booking_items
        WHERE vendor_id = $1
    `;
    const { rows: [metrics] } = await pool.query(metricsQuery, [vendorId]);

    const total = parseInt(metrics.total_bookings);
    const completed = parseInt(metrics.completed_bookings);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
        revenue: {
            lifetime: parseFloat(revenue.total_lifetime),
            monthly: parseFloat(revenue.total_monthly)
        },
        metrics: {
            total_bookings: total,
            completed_bookings: completed,
            cancelled_bookings: parseInt(metrics.cancelled_bookings),
            upcoming_bookings: parseInt(metrics.upcoming_bookings),
            success_rate: `${successRate}%`
        }
    };
};

/**
 * Finds similar vendors based on category, city, and price point.
 * Used for both general discovery and auto-recovery during booking edits.
 */
const getSimilarVendors = async (vendorId, options = {}) => {
    let { limit = 4, category, city, targetPrice } = options;

    // 1. If category/city not provided, fetch from source vendor
    if (!category || !city) {
        const sourceRes = await pool.query(
            "SELECT category, city, price FROM vendor_services WHERE vendor_id = $1 LIMIT 1",
            [vendorId]
        );
        if (sourceRes.rows.length > 0) {
            category = category || sourceRes.rows[0].category;
            city = city || sourceRes.rows[0].city;
            targetPrice = targetPrice || sourceRes.rows[0].price;
        }
    }

    if (!category || !city) return [];

    // 2. Find similar vendors with 'Price Proximity' and 'Rating' ranking
    const query = `
        SELECT 
            u.id, 
            u.full_name,
            u.profile_image,
            vs.price,
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
            -- Calculate proximity score: 1.0 is perfect match, decreases as price gaps grow
            CASE 
                WHEN $3::numeric IS NULL OR $3 = 0 THEN 1
                ELSE (1 - ABS(vs.price - $3) / GREATEST(vs.price, $3, 1))
            END as price_proximity_score
        FROM users u
        JOIN vendor_services vs ON u.id = vs.vendor_id
        LEFT JOIN booking_items bi ON bi.vendor_id = u.id
        LEFT JOIN reviews r ON r.booking_item_id = bi.id
        WHERE u.role = 'vendor' 
        AND u.id != $1
        AND vs.category = $2
        AND vs.city = $4
        AND vs.is_active = TRUE
        GROUP BY u.id, vs.price
        ORDER BY price_proximity_score DESC, average_rating DESC
        LIMIT $5
    `;

    const { rows } = await pool.query(query, [vendorId, category, targetPrice, city, limit]);
    return rows.map(v => ({
        ...v,
        average_rating: parseFloat(v.average_rating),
        price: parseFloat(v.price),
        price_proximity_score: parseFloat(v.price_proximity_score)
    }));
};

module.exports = {
    submitVendorRequest,
    reviewVendorRequest,
    getVendorProfile,
    searchVendors,
    reportVendor,
    getVendorDashboardStats,
    getSimilarVendors
};
