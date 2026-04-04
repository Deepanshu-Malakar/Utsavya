const axios = require("axios");

/**
 * Shared HTML Layout for professional emails
 */
const getEmailLayout = (title, content, theme = "INFO") => {
    const colors = {
        SUCCESS: "#2ecc71",
        ALERT: "#e67e22",
        INFO: "#8e44ad",
        CANCEL: "#e74c3c"
    };
    const themeColor = colors[theme] || colors.INFO;

    return `
        <html>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="background-color: ${themeColor}; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">UTSAVYA EMS</h1>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px; color: #333333; line-height: 1.6;">
                    <h2 style="color: ${themeColor}; margin-top: 0;">${title}</h2>
                    <div style="font-size: 16px;">
                        ${content}
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 14px; color: #666;">Need help? Contact our support team at <a href="mailto:support@utsavya.com" style="color: ${themeColor};">support@utsavya.com</a></p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                    <p style="margin: 5px 0;">© 2026 Utsavya Event Management System</p>
                    <p style="margin: 5px 0;">This is an automated security notification.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

const sendEmail = async ({ to, subject, htmlContent }) => {
    try {
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: { name: "Utsavya EMS", email: process.env.EMAIL_USER },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent
            },
            {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (error) {
        console.error("Brevo Email Error:", error.response?.data || error.message);
    }
};

const sendOtpEmail = async (to, otp) => {
    const content = `
        <p>Hello,</p>
        <p>Welcome to <strong>Utsavya EMS</strong>! To verify your account, please use the following one-time password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #8e44ad; background: #f0f0f0; padding: 10px 20px; border-radius: 4px; border: 1px dashed #8e44ad;">${otp}</span>
        </div>
        <p>This code is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email or contact support immediately.</p>
    `;
    await sendEmail({ to, subject: "Verify Your Account - Utsavya EMS", htmlContent: getEmailLayout("Account Verification", content, "SUCCESS") });
};

const sendPasswordResetOtpEmail = async (to, otp) => {
    const content = `
        <p>We received a request to reset the password for your Utsavya account. Use the code below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #e67e22; background: #fff5eb; padding: 10px 20px; border-radius: 4px; border: 1px dashed #e67e22;">${otp}</span>
        </div>
        <p>This code will expire in 15 minutes. <strong>If you did not request a password reset</strong>, please ensure your account is secure by logging in and checking your settings.</p>
    `;
    await sendEmail({ to, subject: "Password Reset Request", htmlContent: getEmailLayout("Security: Password Reset", content, "ALERT") });
};

const sendPasswordResetSuccessEmail = async (to) => {
    const content = `
        <p>Your password for <strong>Utsavya EMS</strong> has been successfully reset.</p>
        <p>You can now log in with your new password. If you did not perform this action, please <strong>reset your password immediately</strong> and contact our security team.</p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/login" style="background-color: #2ecc71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login now</a>
        </div>
    `;
    await sendEmail({ to, subject: "Password Changed Successfully", htmlContent: getEmailLayout("Security Alert: Password Changed", content, "SUCCESS") });
};

const sendAccountStatusEmail = async (to, status, reason) => {
    const isBlocked = status.toUpperCase() === "BLOCKED";
    const theme = isBlocked ? "ALERT" : "SUCCESS";
    const content = `
        <p>Your account status has been updated to: <strong style="color: ${isBlocked ? '#e67e22' : '#2ecc71'}">${status.toUpperCase()}</strong></p>
        <p><strong>Reason:</strong> ${reason || "Policy update or standard review."}</p>
        ${isBlocked ? '<p>If you believe this was a mistake, you can appeal by replying to this email.</p>' : '<p>You can now resume your activities on the platform.</p>'}
    `;
    await sendEmail({ to, subject: `Account Status Update: ${status}`, htmlContent: getEmailLayout("Account Notification", content, theme) });
};

const sendAccountDeleteEmail = async (to) => {
    const content = `
        <div style="background-color: #fff0f0; border-left: 5px solid #e74c3c; padding: 15px; margin-bottom: 20px;">
            <p style="color: #c0392b; margin: 0;"><strong>Important: Account Deleted</strong></p>
        </div>
        <p>We are writing to confirm that your account at <strong>Utsavya EMS</strong> has been permanently deleted at your request.</p>
        <p>All your data has been removed from our active systems. We are sorry to see you go and hope to serve you again in the future.</p>
    `;
    await sendEmail({ to, subject: "Account Deletion Confirmation", htmlContent: getEmailLayout("Goodbye from Utsavya", content, "INFO") });
};

const sendPaymentReceiptEmail = async (to, bookingRef, totalAmount) => {
    const content = `
        <p>Thank you for choosing Utsavya EMS! Your payment has been successfully processed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${bookingRef}</p>
            <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${totalAmount}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
        </div>
        <p>You can view your booking details and track the status in your dashboard.</p>
    `;
    await sendEmail({ to, subject: "Success! Your Payment Receipt", htmlContent: getEmailLayout("Payment Confirmed", content, "SUCCESS") });
};

const sendNoticeEmail = async (to, subject, title, body) => {
    // Determine theme based on subject keywords
    let theme = "INFO";
    if (subject.toLowerCase().includes("cancel") || subject.toLowerCase().includes("reject")) theme = "CANCEL";
    if (subject.toLowerCase().includes("accept") || subject.toLowerCase().includes("complete")) theme = "SUCCESS";

    const content = `
        <p>${body}</p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #8e44ad; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </div>
    `;
    await sendEmail({ to, subject, htmlContent: getEmailLayout(title, content, theme) });
};

module.exports = { 
    sendOtpEmail, 
    sendPasswordResetOtpEmail,
    sendPasswordResetSuccessEmail,
    sendAccountStatusEmail,
    sendAccountDeleteEmail,
    sendPaymentReceiptEmail,
    sendNoticeEmail
};