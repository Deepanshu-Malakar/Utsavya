CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name TEXT NOT NULL,

    email CITEXT NOT NULL UNIQUE,

    phone VARCHAR(15) UNIQUE,

    password_hash TEXT NOT NULL,

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
