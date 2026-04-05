ALTER TABLE users OWNER TO deepanshu;
ALTER TABLE user_auth_providers OWNER TO deepanshu;
ALTER TABLE email_verification_otp OWNER TO deepanshu;
ALTER TABLE vendor_requests OWNER TO deepanshu;
ALTER TABLE user_sessions OWNER TO deepanshu;
ALTER TABLE vendor_services OWNER TO deepanshu;
ALTER TABLE service_media OWNER TO deepanshu;
ALTER TABLE bookings OWNER TO deepanshu;
ALTER TABLE booking_items OWNER TO deepanshu;
ALTER TABLE booking_collaborators OWNER TO deepanshu;
ALTER TABLE reviews OWNER TO deepanshu;
ALTER TABLE review_media OWNER TO deepanshu;
ALTER TABLE payments OWNER TO deepanshu;
ALTER TABLE vendor_availability OWNER TO deepanshu;
ALTER TABLE vendor_reports OWNER TO deepanshu;
ALTER TABLE notifications OWNER TO deepanshu;
ALTER TABLE password_reset_otp OWNER TO deepanshu;
ALTER TABLE refunds OWNER TO deepanshu;
ALTER TABLE audit_logs OWNER TO deepanshu;

-- Enums Ownership
ALTER TYPE user_role OWNER TO deepanshu;
ALTER TYPE price_type OWNER TO deepanshu;
ALTER TYPE booking_status OWNER TO deepanshu;
ALTER TYPE cancelled_by OWNER TO deepanshu;
ALTER TYPE payment_status OWNER TO deepanshu;
ALTER TYPE media_type OWNER TO deepanshu;
ALTER TYPE notification_type OWNER TO deepanshu;
ALTER TYPE dispute_status OWNER TO deepanshu;
ALTER TYPE vendor_request_status OWNER TO deepanshu;
ALTER TYPE auth_provider OWNER TO deepanshu;
ALTER TYPE event_status OWNER TO deepanshu;
ALTER TYPE collaborator_role OWNER TO deepanshu;
ALTER TYPE refund_status OWNER TO deepanshu;
ALTER TYPE service_category OWNER TO deepanshu;
ALTER TYPE audit_event_type OWNER TO deepanshu;

-- Functions Ownership
ALTER FUNCTION update_updated_at_column() OWNER TO deepanshu;