-- WareShare Test Data Seed
-- Run with: wrangler d1 execute wareshare-db --local --file=./src/db/seed.sql

-- Admin user (clerk_id: admin_test)
INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, created_at, updated_at)
VALUES ('ADMIN001', 'admin_test', 'admin@wareshare.com', 'Admin User', 'admin', 'approved', datetime('now'), datetime('now'));

-- Host user (clerk_id: host_test)
INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, business_reg_number, website, address, city, province, postal_code, phone, created_at, updated_at)
VALUES ('HOST001', 'host_test', 'host@example.com', 'Jane Warehouse', 'host', 'approved', '123456789', 'https://warehouse.example.com', '100 Industrial Ave', 'Toronto', 'ON', 'M5V 1A1', '+1-555-123-4567', datetime('now'), datetime('now'));

-- Renter user (clerk_id: renter_test)
INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, business_reg_number, address, city, province, postal_code, created_at, updated_at)
VALUES ('RENTER001', 'renter_test', 'renter@example.com', 'John Storage', 'renter', 'approved', '987654321', '200 Business St', 'Toronto', 'ON', 'M5V 2B2', datetime('now'), datetime('now'));

-- Pending host (clerk_id: pending_host_test)
INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, created_at, updated_at)
VALUES ('HOST002', 'pending_host_test', 'pending_host@example.com', 'Pending Host', 'host', 'pending', datetime('now'), datetime('now'));

-- Pending renter (clerk_id: pending_renter_test)
INSERT INTO users (id, clerk_id, email, full_name, role, approval_status, created_at, updated_at)
VALUES ('RENTER002', 'pending_renter_test', 'pending_renter@example.com', 'Pending Renter', 'renter', 'pending', datetime('now'), datetime('now'));

-- Sample listing
INSERT INTO listings (id, host_id, title, description, address, city, province, postal_code, country, lat, lng, size_sqft, price_per_month, currency, features, availability_status, fulfillment_available, fulfillment_description, min_rental_months, created_at, updated_at)
VALUES (
  'LISTING001',
  'HOST001',
  'Downtown Toronto Warehouse',
  'Climate-controlled warehouse space in the heart of Toronto. Perfect for e-commerce businesses.',
  '100 Industrial Ave',
  'Toronto',
  'ON',
  'M5V 1A1',
  'Canada',
  43.6532,
  -79.3832,
  5000,
  2500.00,
  'CAD',
  '["climate-controlled", "24-7-access", "loading-dock", "security-system"]',
  'available',
  1,
  'Pick and pack services available. Contact for pricing.',
  3,
  datetime('now'),
  datetime('now')
);

-- Another listing
INSERT INTO listings (id, host_id, title, description, address, city, province, postal_code, country, size_sqft, price_per_month, currency, features, availability_status, fulfillment_available, min_rental_months, created_at, updated_at)
VALUES (
  'LISTING002',
  'HOST001',
  'Mississauga Distribution Center',
  'Large distribution center near Pearson Airport. High ceilings and multiple loading bays.',
  '500 Cargo Rd',
  'Mississauga',
  'ON',
  'L5T 1A1',
  'Canada',
  15000,
  7500.00,
  'CAD',
  '["high-ceilings", "multiple-loading-bays", "truck-court"]',
  'available',
  0,
  6,
  datetime('now'),
  datetime('now')
);

-- Sample listing photo
INSERT INTO listing_photos (id, listing_id, r2_key, sort_order, created_at)
VALUES ('PHOTO001', 'LISTING001', 'listing-photo/HOST001/sample-warehouse.jpg', 0, datetime('now'));
