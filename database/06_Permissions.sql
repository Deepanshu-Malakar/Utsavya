ALTER TABLE users OWNER TO bhaskar_projects;
ALTER TABLE user_auth_providers OWNER TO bhaskar_projects;
ALTER TABLE email_verification_otp OWNER TO bhaskar_projects;
ALTER TABLE vendor_requests OWNER TO bhaskar_projects;
ALTER TABLE user_sessions OWNER TO bhaskar_projects;
ALTER TABLE vendor_services OWNER TO bhaskar_projects;
ALTER TABLE service_media OWNER TO bhaskar_projects;
ALTER TABLE bookings OWNER TO bhaskar_projects;
ALTER TABLE booking_items OWNER TO bhaskar_projects;
ALTER TABLE booking_collaborators OWNER TO bhaskar_projects;
ALTER TABLE reviews OWNER TO bhaskar_projects;
ALTER TABLE review_media OWNER TO bhaskar_projects;
ALTER TABLE payments OWNER TO bhaskar_projects;
ALTER TABLE vendor_availability OWNER TO bhaskar_projects;
ALTER TABLE vendor_reports OWNER TO bhaskar_projects;
ALTER TABLE notifications OWNER TO bhaskar_projects;
ALTER TABLE password_reset_otp OWNER TO bhaskar_projects;
ALTER TABLE refunds OWNER TO bhaskar_projects;
ALTER TABLE audit_logs OWNER TO bhaskar_projects;

-- Enums Ownership
ALTER TYPE user_role OWNER TO bhaskar_projects;
ALTER TYPE price_type OWNER TO bhaskar_projects;
ALTER TYPE booking_status OWNER TO bhaskar_projects;
ALTER TYPE cancelled_by OWNER TO bhaskar_projects;
ALTER TYPE payment_status OWNER TO bhaskar_projects;
ALTER TYPE media_type OWNER TO bhaskar_projects;
ALTER TYPE notification_type OWNER TO bhaskar_projects;
ALTER TYPE dispute_status OWNER TO bhaskar_projects;
ALTER TYPE vendor_request_status OWNER TO bhaskar_projects;
ALTER TYPE auth_provider OWNER TO bhaskar_projects;
ALTER TYPE event_status OWNER TO bhaskar_projects;
ALTER TYPE collaborator_role OWNER TO bhaskar_projects;
ALTER TYPE refund_status OWNER TO bhaskar_projects;
ALTER TYPE service_category OWNER TO bhaskar_projects;
ALTER TYPE audit_event_type OWNER TO bhaskar_projects;

-- Functions Ownership
ALTER FUNCTION update_updated_at_column() OWNER TO bhaskar_projects;