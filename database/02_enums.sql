CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('customer','vendor','admin');

CREATE TYPE price_type AS ENUM ('fixed','per_person','custom');

CREATE TYPE booking_status AS ENUM (
    'pending','accepted','rejected','completed','cancelled'
);

CREATE TYPE cancelled_by AS ENUM ('customer','vendor','admin');

CREATE TYPE payment_status AS ENUM (
    'initiated','successful','failed','refunded'
);

CREATE TYPE media_type AS ENUM ('image','video');

CREATE TYPE notification_type AS ENUM (
    'booking','payment','review','message','system'
);

CREATE TYPE dispute_status AS ENUM (
    'open','in_review','resolved','rejected'
);

CREATE TYPE vendor_request_status AS ENUM (
    'pending', 'approved', 'rejected', 'withdrawn'
);

CREATE TYPE auth_provider AS ENUM (
	'local', 'google'
);

CREATE TYPE event_status AS ENUM (
    'planning',
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);

CREATE TYPE collaborator_role AS ENUM (
    'owner',
    'planner',
    'member'
);