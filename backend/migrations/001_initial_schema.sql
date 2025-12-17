-- TC Nutrition Athlete Portal Database Migration Script
-- This script creates all necessary tables and indexes for the TC Nutrition Athlete Portal platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'AFFILIATE', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CRYPTO', 'WISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE affiliate_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE offer_status AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conversion_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE commission_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE creative_type AS ENUM ('BANNER', 'LOGO', 'SOCIAL_MEDIA', 'EMAIL_TEMPLATE', 'VIDEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coupon_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE webhook_status AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rule_type AS ENUM ('IP_BLOCKING', 'RATE_LIMITING', 'BOT_DETECTION', 'GEO_BLOCKING', 'DEVICE_BLOCKING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rule_action AS ENUM ('BLOCK', 'ALLOW', 'REDIRECT', 'CAPTCHA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rule_status AS ENUM ('ACTIVE', 'INACTIVE', 'TESTING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT 'user_' || uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role DEFAULT 'AFFILIATE',
    status user_status DEFAULT 'ACTIVE',
    avatar TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT 'session_' || uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliate profiles table
CREATE TABLE IF NOT EXISTS affiliate_profiles (
    id TEXT PRIMARY KEY DEFAULT 'affiliate_' || uuid_generate_v4()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT,
    website TEXT,
    social_media JSONB,
    payment_method payment_method DEFAULT 'PAYPAL',
    payment_email TEXT,
    tax_id TEXT,
    address JSONB,
    tier affiliate_tier DEFAULT 'BRONZE',
    commission_rate DECIMAL(5,2) DEFAULT 30.0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
    id TEXT PRIMARY KEY DEFAULT 'admin_' || uuid_generate_v4()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions TEXT[] DEFAULT '{}',
    department TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY DEFAULT 'offer_' || uuid_generate_v4()::text,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    status offer_status DEFAULT 'ACTIVE',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    terms TEXT,
    requirements TEXT,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_commissions DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offer applications table
CREATE TABLE IF NOT EXISTS offer_applications (
    id TEXT PRIMARY KEY DEFAULT 'app_' || uuid_generate_v4()::text,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    status application_status DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(affiliate_id, offer_id)
);

-- Affiliate links table
CREATE TABLE IF NOT EXISTS affiliate_links (
    id TEXT PRIMARY KEY DEFAULT 'link_' || uuid_generate_v4()::text,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
    original_url TEXT NOT NULL,
    short_url TEXT UNIQUE NOT NULL,
    custom_slug TEXT,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    earnings DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clicks table
CREATE TABLE IF NOT EXISTS clicks (
    id TEXT PRIMARY KEY DEFAULT 'click_' || uuid_generate_v4()::text,
    link_id TEXT NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    referrer TEXT,
    country TEXT,
    city TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    converted BOOLEAN DEFAULT false,
    conversion_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversions table
CREATE TABLE IF NOT EXISTS conversions (
    id TEXT PRIMARY KEY DEFAULT 'conversion_' || uuid_generate_v4()::text,
    click_id TEXT UNIQUE NOT NULL REFERENCES clicks(id) ON DELETE CASCADE,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    customer_email TEXT,
    customer_value DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    status conversion_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY DEFAULT 'commission_' || uuid_generate_v4()::text,
    conversion_id TEXT UNIQUE NOT NULL REFERENCES conversions(id) ON DELETE CASCADE,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    status commission_status DEFAULT 'PENDING',
    payout_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payouts table
CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY DEFAULT 'payout_' || uuid_generate_v4()::text,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    method payment_method NOT NULL,
    status payout_status DEFAULT 'PENDING',
    reference_id TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creatives table
CREATE TABLE IF NOT EXISTS creatives (
    id TEXT PRIMARY KEY DEFAULT 'creative_' || uuid_generate_v4()::text,
    offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type creative_type NOT NULL,
    size TEXT NOT NULL,
    format TEXT NOT NULL,
    url TEXT NOT NULL,
    download_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT 'coupon_' || uuid_generate_v4()::text,
    affiliate_id TEXT NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    discount TEXT NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    usage INTEGER DEFAULT 0,
    max_usage INTEGER,
    status coupon_status DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT 'notification_' || uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (audit trail)
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY DEFAULT 'activity_' || uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY DEFAULT 'webhook_' || uuid_generate_v4()::text,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT NOT NULL,
    status webhook_status DEFAULT 'ACTIVE',
    last_triggered TIMESTAMP,
    success_rate DECIMAL(5,2) DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Traffic rules table
CREATE TABLE IF NOT EXISTS traffic_rules (
    id TEXT PRIMARY KEY DEFAULT 'rule_' || uuid_generate_v4()::text,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type rule_type NOT NULL,
    conditions JSONB NOT NULL,
    action rule_action NOT NULL,
    status rule_status DEFAULT 'ACTIVE',
    hits INTEGER DEFAULT 0,
    last_triggered TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_user_id ON affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_tier ON affiliate_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offer_applications_affiliate_id ON offer_applications(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_offer_applications_offer_id ON offer_applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_offer_id ON affiliate_links(offer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_short_url ON affiliate_links(short_url);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id ON clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_ip_address ON clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id ON conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_offer_id ON conversions(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_conversion_id ON commissions(conversion_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_id ON payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);
CREATE INDEX IF NOT EXISTS idx_creatives_offer_id ON creatives(offer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_affiliate_id ON coupons(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
CREATE INDEX IF NOT EXISTS idx_traffic_rules_status ON traffic_rules(status);
CREATE INDEX IF NOT EXISTS idx_traffic_rules_type ON traffic_rules(type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_profiles_updated_at BEFORE UPDATE ON affiliate_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offer_applications_updated_at BEFORE UPDATE ON offer_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_links_updated_at BEFORE UPDATE ON affiliate_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversions_updated_at BEFORE UPDATE ON conversions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_traffic_rules_updated_at BEFORE UPDATE ON traffic_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (id, email, password, first_name, last_name, role, status) VALUES
('admin_1', 'admin@tcnutrition.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8QZ8K2', 'Admin', 'User', 'ADMIN', 'ACTIVE'),
('affiliate_1', 'affiliate@tcnutrition.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8QZ8K2', 'John', 'Doe', 'AFFILIATE', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO admin_profiles (user_id, permissions, department) VALUES
('admin_1', ARRAY['all'], 'Management')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO affiliate_profiles (user_id, company_name, website, payment_method, payment_email, tier, commission_rate) VALUES
('affiliate_1', 'John Doe Marketing', 'https://johndoe.com', 'PAYPAL', 'john@johndoe.com', 'GOLD', 35.0)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO offers (id, name, description, category, commission_rate, start_date, end_date, status) VALUES
('offer_1', 'Premium Software License', 'Get 30% commission on premium software sales', 'Software', 30.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', 'ACTIVE'),
('offer_2', 'E-commerce Products', 'Earn commissions on product sales', 'E-commerce', 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 months', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Create a function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update conversion rates
CREATE OR REPLACE FUNCTION update_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE affiliate_profiles 
    SET conversion_rate = CASE 
        WHEN total_clicks > 0 THEN (total_conversions::DECIMAL / total_clicks::DECIMAL) * 100
        ELSE 0 
    END
    WHERE id = NEW.affiliate_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversion_rate_trigger
    AFTER INSERT OR UPDATE ON clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_rate();

COMMIT;


