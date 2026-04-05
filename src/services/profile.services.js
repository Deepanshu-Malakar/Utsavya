const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const fs = require("fs-extra");
const { sendAccountDeleteEmail, sendNoticeEmail } = require("../utils/email");
const { logAuditEvent } = require("./audit.services");
const { extractPublicId } = require("../utils/cloudinaryHelper");

const updateProfile = async (userId, userRole, updates, file) => {
    // 1. SECURITY LOCK: Vendors cannot change business_name or business_city via profile update
    if (userRole === 'vendor') {
        delete updates.business_name;
        delete updates.business_city;
        delete updates.role; // No one can change roles here
    }

    // Capture old email for security notice if it changes (though not supported yet, good practice)
    // For now, let's just focus on the core requirement...

    // 2. Handle Profile Image Upload
    if (file) {
        try {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: `profiles/${userId}`,
                resource_type: 'image'
            });
            updates.profile_image = result.secure_url;
            await fs.unlink(file.path);
        } catch (error) {
            if (file && file.path) await fs.unlink(file.path).catch(console.error);
            throw new Error("Failed to upload profile image");
        }
    }

    // 3. Prepare Dynamic Update Query
    const fields = [];
    const values = [];
    let idx = 1;

    // Filter out restricted fields
    const allowedFields = ['full_name', 'phone', 'profile_image'];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            fields.push(`${key} = $${idx++}`);
            values.push(value);
        }
    }

    if (fields.length === 0 && !updates.profile_image) {
        throw new Error("No valid fields provided for update");
    }

    values.push(userId);
    const query = `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${idx}
        RETURNING id, full_name, email, phone, role, profile_image, business_name, business_city
    `;

    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) {
        throw new Error("User not found");
    }

    // Security Alert: If full name or phone changed, we could send a notice here
    // await sendNoticeEmail(rows[0].email, "Profile Updated", "Security Alert: Profile Activity", "Your profile details were recently updated. If this wasn't you, please secure your account.").catch(console.error);

    return rows[0];
};

const deleteAccount = async (userId, reason = "No reason provided") => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Fetch user email before deletion for the notification
        const userRes = await client.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userRes.rows.length === 0) throw new Error("User not found");
        const email = userRes.rows[0].email;

        // 2. FETCH ALL ASSOCIATED MEDIA (Profile, Service Media, Review Media)
        const mediaRes = await client.query(`
            SELECT profile_image as url FROM users WHERE id = $1
            UNION ALL
            SELECT media_url as url FROM service_media WHERE uploaded_by = $1
            UNION ALL
            SELECT media_url as url FROM review_media WHERE uploaded_by = $1
        `, [userId]);

        const mediaUrls = mediaRes.rows.map(r => r.url).filter(Boolean);

        // 3. PURGE FROM CLOUDINARY
        for (const url of mediaUrls) {
            const publicId = extractPublicId(url);
            if (publicId) {
                // Determine resource type (could be video or image)
                const resourceType = url.includes('/video/') ? 'video' : 'image';
                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
                    .catch(err => console.error(`[Non-critical] Cloudinary purge failed for ${publicId}:`, err.message));
            }
        }

        // 4. Log deletion to audit table before purging
        await logAuditEvent('account_deletion', userId, { reason });

        // 3. Delete user (cascades to internal tables)
        await client.query("DELETE FROM users WHERE id = $1", [userId]);

        await client.query("COMMIT");

        // 4. Notify user
        await sendAccountDeleteEmail(email).catch(console.error);

        return { success: true, message: "Account successfully deleted" };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    updateProfile,
    deleteAccount
};
