-- WareShare Database Schema
-- Run with: wrangler d1 execute wareshare-db --local --file=./src/db/schema.sql

-- Users table: stores all user data including role and approval status
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('renter', 'host', 'admin')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
  business_reg_number TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  profile_photo_key TEXT,
  verification_doc_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- Listings table: warehouse listings created by hosts
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',
  lat REAL,
  lng REAL,
  size_sqft INTEGER NOT NULL,
  price_per_month REAL NOT NULL,
  currency TEXT DEFAULT 'CAD',
  features TEXT DEFAULT '[]',
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK(availability_status IN ('available', 'unavailable', 'rented')),
  fulfillment_available INTEGER DEFAULT 0,
  fulfillment_description TEXT,
  min_rental_months INTEGER DEFAULT 1,
  max_rental_months INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_host_id ON listings(host_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_province ON listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_availability ON listings(availability_status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price_per_month);
CREATE INDEX IF NOT EXISTS idx_listings_size ON listings(size_sqft);

-- Listing photos table: R2 references for listing images
CREATE TABLE IF NOT EXISTS listing_photos (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos(listing_id);

-- Bookings table: booking requests and their lifecycle
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  renter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  space_requested_sqft INTEGER,
  monthly_rate REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN (
    'pending_review',
    'agreement_draft',
    'host_edited',
    'renter_accepted',
    'confirmed',
    'rejected',
    'cancelled'
  )),
  rejected_reason TEXT,
  cancelled_by TEXT REFERENCES users(id),
  cancelled_at TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);

-- Storage agreements table: structured JSON agreements tied to bookings
CREATE TABLE IF NOT EXISTS storage_agreements (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'host_edited', 'fully_accepted')),
  host_accepted_at TEXT,
  renter_accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_storage_agreements_booking_id ON storage_agreements(booking_id);

-- Inventory items table: items renters plan to store
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  renter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('pallet', 'box', 'item')),
  sku TEXT,
  quantity INTEGER DEFAULT 1,
  category TEXT,
  dimensions TEXT,
  weight_kg REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_booking_id ON inventory_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_renter_id ON inventory_items(renter_id);

-- Ship requests table: manual ship request workflow
CREATE TABLE IF NOT EXISTS ship_requests (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  renter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  carrier_name TEXT,
  tracking_number TEXT,
  expected_arrival_date TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'acknowledged', 'received')),
  acknowledged_at TEXT,
  received_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ship_requests_booking_id ON ship_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_ship_requests_renter_id ON ship_requests(renter_id);
CREATE INDEX IF NOT EXISTS idx_ship_requests_status ON ship_requests(status);

-- Notifications table: in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN (
    'booking_request',
    'booking_approved',
    'booking_rejected',
    'booking_cancelled',
    'agreement_ready',
    'agreement_signed',
    'message_received',
    'ship_request_created',
    'ship_request_updated',
    'account_approved',
    'account_rejected',
    'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Booking messages table: comments/messages tied to bookings
CREATE TABLE IF NOT EXISTS booking_messages (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON booking_messages(created_at);

-- Calendar availability table: blocks dates for confirmed bookings
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT DEFAULT 'booking',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_listing_id ON calendar_blocks(listing_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_dates ON calendar_blocks(start_date, end_date);
