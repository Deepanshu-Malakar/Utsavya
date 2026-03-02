CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_vendor_requests
BEFORE UPDATE ON vendor_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();