# Database Schema

## users

- `id` — ULID primary key
- `clerk_id` — unique Clerk auth ID
- `email` — unique
- `full_name`
- `role` — `renter` | `host` | `admin`
- `approval_status` — `pending` | `approved` | `rejected`
- `business_reg_number`, `website`, `address`, `city`, `province`, `postal_code`, `phone`
- `profile_photo_key`, `verification_doc_key` — R2 keys
- `created_at`, `updated_at`

## listings

- `id` — ULID primary key
- `host_id` → users
- `title`, `description`
- `address`, `city`, `province`, `postal_code`, `country` — address hidden from renters in API responses
- `lat`, `lng`
- `size_sqft`, `price_per_month`, `currency`
- `features` — JSON array (e.g. `["climate-controlled", "loading-dock"]`)
- `availability_status` — `available` | `unavailable` | `rented`
- `fulfillment_available` — boolean (0/1), `fulfillment_description`
- `min_rental_months`, `max_rental_months`
- `created_at`, `updated_at`

## listing_photos

- `id`
- `listing_id` → listings
- `r2_key` — R2 object key
- `sort_order`
- `created_at`

## bookings

- `id` — ULID primary key
- `listing_id` → listings
- `renter_id`, `host_id` → users
- `start_date`, `end_date` — YYYY-MM-DD
- `space_requested_sqft`
- `monthly_rate` — snapshot of price at time of booking
- `status` — lifecycle below
- `rejected_reason`
- `cancelled_by` → users, `cancelled_at`
- `confirmed_at`
- `created_at`, `updated_at`

**Status lifecycle:**
`pending_review` → `agreement_draft` → `host_edited` → `renter_accepted` → `confirmed`
At any active stage: → `rejected` or `cancelled`

## storage_agreements

- `id`
- `booking_id` → bookings (unique — one agreement per booking)
- `content` — structured JSON with sections array
- `status` — `draft` | `host_edited` | `fully_accepted`
- `host_accepted_at`, `renter_accepted_at` — populated when each party signs; booking confirms when both are set
- `created_at`, `updated_at`

## inventory_items

- `id`
- `booking_id` → bookings
- `renter_id` → users
- `name`
- `type` — `pallet` | `box` | `item`
- `sku`, `quantity`, `category`, `dimensions`, `weight_kg`, `notes`
- `created_at`, `updated_at`

## ship_requests

- `id`
- `booking_id` → bookings
- `renter_id` → users
- `carrier_name`, `tracking_number`, `expected_arrival_date`, `description`
- `status` — `pending` | `acknowledged` | `received`
- `acknowledged_at`, `received_at`, `notes`
- `created_at`, `updated_at`

## notifications

- `id`
- `user_id` → users
- `type` — `booking_request` | `booking_approved` | `booking_rejected` | `booking_cancelled` | `agreement_ready` | `agreement_signed` | `message_received` | `ship_request_created` | `ship_request_updated` | `account_approved` | `account_rejected` | `system`
- `title`, `message`
- `related_entity_type`, `related_entity_id` — e.g. `booking`, `<booking_id>`
- `is_read` — 0/1
- `created_at`

## booking_messages

- `id`
- `booking_id` → bookings
- `sender_id` → users
- `content`
- `created_at`

## calendar_blocks

- `id`
- `listing_id` → listings
- `booking_id` → bookings (nullable)
- `start_date`, `end_date`
- `reason` — default `booking`
- `created_at`

> Created automatically when a booking is confirmed. Deleted on cancellation.
