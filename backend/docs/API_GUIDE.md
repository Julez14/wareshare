# WareShare API Guide

This guide is for frontend developers integrating with the WareShare backend API.

## Base URL

```
Development: http://localhost:8787/api
Production: https://wareshare-api.juelzlax.workers.dev/api
```

Set this in your environment as `NEXT_PUBLIC_API_URL`.

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

For development/testing, use tokens in the format `test-<clerk_user_id>`. The backend will look up the user by their Clerk ID.

### User Sync

When a user signs up through Clerk, call this endpoint to create their record in the database:

```
POST /api/users/sync
Content-Type: application/json

{
  "clerk_id": "user_2abc123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "renter" | "host"
}
```

Response:
```json
{
  "user": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "clerk_id": "user_2abc123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "renter",
    "approval_status": "pending",
    "created_at": "2026-02-18T12:00:00.000Z"
  },
  "isNew": true
}
```

---

## Response Format

### Success
```json
{
  "data": { ... },
  "message": "Optional message"
}
```

### Error
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `PENDING_APPROVAL` | 403 | Account pending admin approval |
| `REJECTED_ACCOUNT` | 403 | Account was rejected by admin |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource conflict (e.g., already exists) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Enums

### User Role
- `renter`
- `host`
- `admin`

### Approval Status
- `pending` — awaiting admin approval
- `approved` — can access all features
- `rejected` — cannot access platform

### Booking Status
| Status | Description |
|--------|-------------|
| `pending_review` | Initial state (transitions quickly) |
| `agreement_draft` | Agreement generated, awaiting host review |
| `host_edited` | Host has edited the agreement |
| `renter_accepted` | Renter has signed, awaiting host signature |
| `confirmed` | Both parties signed, booking active |
| `rejected` | Host rejected the booking |
| `cancelled` | Either party cancelled |

### Agreement Status
- `draft` — initial auto-generated agreement
- `host_edited` — host has made modifications
- `fully_accepted` — both parties signed

### Inventory Type
- `pallet`
- `box`
- `item`

### Ship Request Status
- `pending` — new request
- `acknowledged` — host acknowledged
- `received` — goods received at warehouse

---

## Endpoints

### Users

#### GET /api/users/me
Get current authenticated user's profile.

**Response:**
```json
{
  "user": {
    "id": "...",
    "clerk_id": "...",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "renter",
    "approval_status": "approved",
    "business_reg_number": "123456789",
    "website": "https://example.com",
    "address": "123 Main St",
    "city": "Toronto",
    "province": "ON",
    "postal_code": "M5V 1A1",
    "phone": "+1-555-123-4567",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### PUT /api/users/me
Update current user's profile. **Requires approved status.**

**Body:**
```json
{
  "full_name": "John Smith",
  "phone": "+1-555-999-8888",
  "address": "456 New St",
  "city": "Vancouver",
  "province": "BC",
  "postal_code": "V6B 1A1",
  "website": "https://newsite.com",
  "business_reg_number": "987654321"
}
```

---

### Admin

All admin endpoints require `role: admin`.

#### GET /api/admin/users
List all users with optional filtering.

**Query Parameters:**
- `role` — filter by role (`renter`, `host`, `admin`)
- `approval_status` — filter by status (`pending`, `approved`, `rejected`)
- `page` — page number (default: 1)
- `per_page` — items per page (default: 20, max: 100)

**Response:**
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### GET /api/admin/users/:id
Get a specific user's details (includes verification_doc_key for admin viewing).

#### POST /api/admin/users/:id/approve
Approve a pending user.

**Response:**
```json
{
  "message": "User approved successfully",
  "user": { ... }
}
```

#### POST /api/admin/users/:id/reject
Reject a pending user.

**Body (optional):**
```json
{
  "reason": "Incomplete business documentation"
}
```

#### GET /api/admin/stats
Get platform statistics.

**Response:**
```json
{
  "users": {
    "by_role": { "renter": 25, "host": 10, "admin": 2 },
    "by_approval_status": { "pending": 5, "approved": 30, "rejected": 2 }
  },
  "listings": {
    "total": 15,
    "by_availability": { "available": 12, "unavailable": 2, "rented": 1 }
  },
  "bookings": {
    "total": 50,
    "by_status": { "confirmed": 20, "pending_review": 5, ... }
  }
}
```

---

### Listings

#### GET /api/listings
Search and filter warehouse listings. **Public endpoint (no auth required).**

**Query Parameters:**
- `city` — filter by city (partial match)
- `province` — filter by province (exact match)
- `min_price` — minimum price per month
- `max_price` — maximum price per month
- `min_size` — minimum size in sqft
- `max_size` — maximum size in sqft
- `fulfillment` — set to `true` for fulfillment-available listings
- `page` — page number
- `per_page` — items per page
- `sort` — sort field (`created_at`, `price_per_month`, `size_sqft`, `title`)
- `order` — sort order (`asc`, `desc`)

**Response:**
```json
{
  "listings": [
    {
      "id": "...",
      "host_id": "...",
      "title": "Downtown Warehouse Space",
      "description": "Climate-controlled storage...",
      "city": "Toronto",
      "province": "ON",
      "size_sqft": 5000,
      "price_per_month": 2500,
      "currency": "CAD",
      "features": "[\"climate-controlled\", \"24-7-access\"]",
      "availability_status": "available",
      "fulfillment_available": 1,
      "photos": [
        { "id": "...", "r2_key": "listing-photo/...", "sort_order": 0 }
      ]
    }
  ],
  "pagination": { ... }
}
```

> **Note:** Full address is NOT included for non-owners. Only city/province is shown.

#### GET /api/listings/:id
Get a single listing's details. Owners and admins see the full address.

#### POST /api/listings
Create a new listing. **Requires: approved host.**

**Body:**
```json
{
  "title": "Warehouse Space Available",
  "description": "5,000 sq ft of climate-controlled storage space",
  "address": "123 Industrial Blvd",
  "city": "Toronto",
  "province": "ON",
  "postal_code": "M5V 1A1",
  "country": "Canada",
  "lat": 43.6532,
  "lng": -79.3832,
  "size_sqft": 5000,
  "price_per_month": 2500,
  "currency": "CAD",
  "features": ["climate-controlled", "24-7-access", "loading-dock"],
  "fulfillment_available": true,
  "fulfillment_description": "Pick and pack services available",
  "min_rental_months": 3,
  "max_rental_months": 24
}
```

#### PUT /api/listings/:id
Update a listing. **Requires: listing owner (host).**

#### DELETE /api/listings/:id
Delete a listing. **Requires: listing owner (host).**

#### GET /api/listings/host/my
Get all listings for the authenticated host. **Requires: approved host.**

#### POST /api/listings/:id/photos
Add a photo to a listing. Use R2 upload first, then reference the key.

**Body:**
```json
{
  "r2_key": "listing-photo/host-id/photo-id.jpg"
}
```

#### DELETE /api/listings/:id/photos/:photoId
Remove a photo from a listing.

---

### Bookings

#### GET /api/bookings
List bookings for the authenticated user.
- Renters see their own bookings
- Hosts see bookings for their listings
- Admins see all bookings

**Query Parameters:**
- `status` — filter by booking status
- `page`, `per_page` — pagination

#### GET /api/bookings/:id
Get a booking's details, including the storage agreement and inventory.

**Response:**
```json
{
  "booking": {
    "id": "...",
    "listing_id": "...",
    "renter_id": "...",
    "host_id": "...",
    "start_date": "2026-03-01",
    "end_date": "2026-06-01",
    "monthly_rate": 2500,
    "status": "host_edited",
    ...
  },
  "agreement": {
    "id": "...",
    "booking_id": "...",
    "content": "{...structured JSON...}",
    "status": "host_edited",
    "host_accepted_at": null,
    "renter_accepted_at": null
  },
  "inventory": [...]
}
```

#### POST /api/bookings
Create a booking request. **Requires: approved renter.**

**Body:**
```json
{
  "listing_id": "...",
  "start_date": "2026-03-01",
  "end_date": "2026-06-01",
  "space_requested_sqft": 1000,
  "inventory": [
    {
      "name": "Pallet of Electronics",
      "type": "pallet",
      "quantity": 5,
      "category": "Electronics"
    },
    {
      "name": "Cardboard Boxes",
      "type": "box",
      "quantity": 20
    }
  ]
}
```

This automatically:
1. Creates the booking
2. Creates inventory items
3. Generates a draft storage agreement
4. Sends notification to the host

#### POST /api/bookings/:id/reject
Reject a booking. **Requires: booking host.**

**Body (optional):**
```json
{
  "reason": "Dates not available"
}
```

#### PUT /api/bookings/:id/agreement
Host edits the storage agreement. **Requires: booking host.**

**Body:**
```json
{
  "sections": [...],
  "special_conditions": ["No hazardous materials", "Access limited to business hours"],
  "notes": "Please confirm insurance coverage before signing."
}
```

#### POST /api/bookings/:id/agreement/accept
Sign the storage agreement. **Requires: booking participant (host or renter).**

- If host signs first → status becomes `renter_accepted` (waiting for renter)
- If renter signs first → status stays `host_edited` (waiting for host)
- When both sign → status becomes `confirmed`, calendar block created

#### POST /api/bookings/:id/cancel
Cancel a booking. **Requires: booking participant.**

---

### Inventory & Ship Requests

#### GET /api/bookings/:bookingId/inventory
Get all inventory items for a booking. **Requires: booking participant.**

#### POST /api/bookings/:bookingId/inventory
Add an inventory item. **Requires: booking renter.**

**Body:**
```json
{
  "name": "New Item",
  "type": "item",
  "sku": "SKU-123",
  "quantity": 10,
  "category": "Electronics",
  "dimensions": "10x10x5 cm",
  "weight_kg": 2.5,
  "notes": "Fragile"
}
```

#### PUT /api/inventory/:inventoryId
Update an inventory item. **Requires: item owner (renter).**

#### DELETE /api/inventory/:inventoryId
Delete an inventory item. **Requires: item owner (renter).**

#### GET /api/bookings/:bookingId/ship-requests
Get ship requests for a booking. **Requires: booking participant.**

#### POST /api/bookings/:bookingId/ship-requests
Create a ship request. **Requires: booking renter.**

**Body:**
```json
{
  "carrier_name": "FedEx",
  "tracking_number": "1234567890123",
  "expected_arrival_date": "2026-03-15",
  "description": "5 pallets of electronics arriving via freight"
}
```

#### PUT /api/ship-requests/:requestId/status
Update ship request status. **Requires: booking host.**

**Body:**
```json
{
  "status": "acknowledged",
  "notes": "Dock 3, arrive between 9am-12pm"
}
```

---

### Notifications

#### GET /api/notifications
Get notifications for the authenticated user.

**Query Parameters:**
- `unread_only` — set to `true` for unread only
- `page`, `per_page` — pagination

#### POST /api/notifications/read
Mark notifications as read.

**Body:**
```json
{
  "notification_ids": ["id1", "id2"]
}
```

Or mark all as read:
```json
{
  "read_all": true
}
```

#### GET /api/notifications/unread-count
Get the count of unread notifications.

---

### Messages (Booking Comments)

#### GET /api/bookings/:id/messages
Get messages for a booking. **Requires: booking participant.**

#### POST /api/bookings/:id/messages
Send a message on a booking. **Requires: booking participant.**

**Body:**
```json
{
  "content": "What are the access hours for the warehouse?"
}
```

---

### File Uploads (R2)

The upload flow is:
1. Request a presigned URL
2. Upload the file directly to R2 using the presigned URL
3. Confirm the upload and get the key

#### POST /api/uploads/presigned-url
Get a presigned URL for uploading. **Requires: approved user.**

**Body:**
```json
{
  "filename": "warehouse-photo.jpg",
  "type": "listing-photo"
}
```

**Types:**
- `listing-photo` — hosts only
- `profile-photo` — any user
- `verification-doc` — admins only

**Response:**
```json
{
  "upload_url": "https://...",
  "key": "listing-photo/host-id/ulid.jpg",
  "expires_in": 3600
}
```

#### Upload to R2
```javascript
await fetch(upload_url, {
  method: 'PUT',
  body: fileBlob,
  headers: {
    'Content-Type': file.type
  }
});
```

#### POST /api/uploads/confirm
Confirm upload and get the stored key.

**Body:**
```json
{
  "key": "listing-photo/host-id/ulid.jpg"
}
```

#### GET /api/uploads/view/:key
View/download a file from R2.

#### DELETE /api/uploads/:key
Delete an uploaded file. **Requires: file owner.**

---

## Storage Agreement Structure

The agreement `content` field is structured JSON:

```json
{
  "version": "1.0",
  "generated_at": "2026-02-18T12:00:00.000Z",
  "sections": [
    {
      "key": "rental_terms",
      "title": "Rental Terms",
      "summary": "What this means for you: ...",
      "items": [
        { "label": "Start Date", "value": "March 1, 2026" },
        { "label": "End Date", "value": "June 1, 2026" }
      ]
    },
    {
      "key": "special_conditions",
      "title": "Special Conditions",
      "summary": "Added by host",
      "items": [],
      "editable_by_host": true
    },
    {
      "key": "notes",
      "title": "Additional Notes",
      "freeform": true,
      "content": ""
    }
  ]
}
```

When the host edits, they can modify `sections`, `special_conditions`, and `notes`.

---

## Development Tips

1. **Always check `approval_status`** — Users with `pending` status can only access `/api/users/me` and `PUT /api/users/me`.

2. **Handle errors consistently** — Use the `code` field for programmatic handling, `error` for display.

3. **Pagination** — All list endpoints return `pagination` object with `total` and `total_pages`.

4. **Features array** — The `features` field on listings is a JSON string. Parse it before use.

5. **Timestamps** — All timestamps are ISO 8601 strings in UTC.

---

## Quick Reference

| Endpoint | Auth | Approved | Role | Description |
|----------|------|----------|------|-------------|
| `GET /api/listings` | No | - | - | Search listings |
| `GET /api/listings/:id` | No | - | - | Get listing |
| `POST /api/listings` | Yes | Yes | host | Create listing |
| `POST /api/bookings` | Yes | Yes | renter | Create booking |
| `GET /api/bookings` | Yes | Yes | any | List my bookings |
| `POST /api/bookings/:id/reject` | Yes | Yes | host | Reject booking |
| `PUT /api/bookings/:id/agreement` | Yes | Yes | host | Edit agreement |
| `POST /api/bookings/:id/agreement/accept` | Yes | Yes | participant | Sign agreement |
| `POST /api/admin/users/:id/approve` | Yes | Yes | admin | Approve user |
| `POST /api/uploads/presigned-url` | Yes | Yes | varies | Get upload URL |
