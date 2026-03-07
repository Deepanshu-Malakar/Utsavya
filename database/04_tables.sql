CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name TEXT NOT NULL,

    email CITEXT NOT NULL UNIQUE,

    phone VARCHAR(15) UNIQUE,

    --password_hash TEXT NOT NULL,

    role user_role NOT NULL DEFAULT 'customer',

    profile_image TEXT,

    is_email_verified BOOLEAN DEFAULT false,

    email_verified_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT true,

    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users DROP COLUMN password_hash;

CREATE TABLE vendor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    business_name TEXT NOT NULL,

    business_description TEXT,

    city TEXT NOT NULL,

    documents_url TEXT,

    status vendor_request_status NOT NULL DEFAULT 'pending',

    admin_note TEXT,

    reviewed_by UUID
        REFERENCES users(id),

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_verification_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    otp_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    attempt_count INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_auth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    provider auth_provider NOT NULL,

    provider_user_id TEXT NOT NULL,

    password_hash TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_provider_per_user
        UNIQUE (user_id, provider),

    CONSTRAINT unique_provider_user_id
        UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    refresh_token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vendor_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    city TEXT NOT NULL,

    price NUMERIC(10,2),

    price_type price_type NOT NULL DEFAULT 'fixed',

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_services_vendor_id
ON vendor_services(vendor_id);

CREATE INDEX idx_vendor_services_active
ON vendor_services(is_active);

CREATE INDEX idx_vendor_services_created_at
ON vendor_services(created_at DESC);

CREATE TABLE service_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_id UUID NOT NULL
        REFERENCES vendor_services(id)
        ON DELETE CASCADE,

    media_url TEXT NOT NULL,

    media_type media_type NOT NULL,

    uploaded_by UUID NOT NULL
        REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bookings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_reference TEXT UNIQUE NOT NULL,

    customer_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    event_start TIMESTAMPTZ NOT NULL,
    event_end TIMESTAMPTZ NOT NULL,

    location TEXT,
    guest_count INT,

    status event_status DEFAULT 'planning',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (event_end > event_start)
);

CREATE TABLE booking_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES bookings(id)
        ON DELETE CASCADE,

    service_id UUID NOT NULL
        REFERENCES vendor_services(id)
        ON DELETE CASCADE,

    vendor_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    price_quote NUMERIC,

    status booking_status DEFAULT 'pending',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (booking_id, service_id, vendor_id)
);

CREATE TABLE booking_collaborators (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES bookings(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role collaborator_role DEFAULT 'member',

    invited_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (booking_id, user_id)
);

CREATE INDEX idx_bookings_customer
ON bookings(customer_id);

CREATE INDEX idx_bookings_event_start
ON bookings(event_start);

CREATE INDEX idx_booking_items_booking
ON booking_items(booking_id);

CREATE INDEX idx_booking_items_vendor
ON booking_items(vendor_id);

CREATE INDEX idx_booking_items_service
ON booking_items(service_id);

CREATE INDEX idx_booking_collaborators_booking
ON booking_collaborators(booking_id);