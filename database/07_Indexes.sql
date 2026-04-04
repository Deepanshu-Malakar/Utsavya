-- Performance Optimization: Indexing

-- 1. Optimized Budget Search (City + Category + Price)
-- Speeds up vendors/search with budget filters
CREATE INDEX IF NOT EXISTS idx_vendor_services_search_composite 
ON vendor_services(city, category, price) 
WHERE is_active = TRUE;

-- 2. Optimized Conflict Detection (Vendor + Time Range)
-- Speeds up availability checks during booking edits
CREATE INDEX IF NOT EXISTS idx_vendor_availability_lookup 
ON vendor_availability(vendor_id, start_time, end_time);

-- 3. Optimized Admin/Vendor Insights (Created At)
-- Speeds up dashboards and audit log history
CREATE INDEX IF NOT EXISTS idx_audit_logs_timeline 
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_timeline 
ON bookings(event_start DESC);

-- 4. Optimized Notification Retrieval
-- Speeds up "Unread" counts for the frontend bell icon
CREATE INDEX IF NOT EXISTS idx_notifications_unread_fast 
ON notifications(user_id, created_at DESC) 
WHERE is_read = FALSE;