# QA Checklist — Inventory Management & Ship Requests

**Owner:** Ivan
**Backend routes:**
- `GET /api/bookings/:bookingId/inventory`
- `POST /api/bookings/:bookingId/inventory`
- `PUT /api/inventory/:inventoryId`
- `DELETE /api/inventory/:inventoryId`
- `GET /api/bookings/:bookingId/ship-requests`
- `POST /api/bookings/:bookingId/ship-requests`
- `PUT /api/ship-requests/:requestId/status`

**Status:** `[ ]` Not tested · `[x]` Pass · `[!]` Fail · `[-]` Blocked

---

## 1. Inventory — Create

### Happy path (via booking creation)
- `[ ]` Submitting `inventory` array in `POST /api/bookings` creates all items linked to the booking
- `[ ]` Each item has correct `booking_id` and `renter_id`
- `[ ]` Items with only `name` (all other fields optional) are created successfully
- `[ ]` `type` defaults to `item` if not provided
- `[ ]` `quantity` defaults to `1` if not provided

### Happy path (standalone add)
- `[ ]` `POST /api/bookings/:bookingId/inventory` by the booking's renter adds an item
- `[ ]` Adding an item to a booking with status `agreement_draft` works
- `[ ]` Adding an item to a `confirmed` booking works (inventory can be added post-confirmation — verify this is intended)
- `[ ]` Response is `201` with the new `item` object

### Guards
- `[ ]` Renter adds inventory to a booking that is not theirs → `403 FORBIDDEN`
- `[ ]` Host attempts to add inventory to a booking → `403 FORBIDDEN` (endpoint requires `requireBookingRenter`)
- `[ ]` Adding inventory to a `rejected` booking → `404 NOT_FOUND` (query excludes `rejected` and `cancelled`)
- `[ ]` Adding inventory to a `cancelled` booking → `404 NOT_FOUND`
- `[ ]` Missing `name` field → `400 VALIDATION_ERROR`
- `[ ]` Unapproved renter → `403 PENDING_APPROVAL`

---

## 2. Inventory — Read

- `[ ]` `GET /api/bookings/:bookingId/inventory` returns all items for the booking, ordered newest first
- `[ ]` Renter can fetch their own booking's inventory
- `[ ]` Host can fetch inventory for their listing's booking (`requireBookingParticipant` allows both)
- `[ ]` Another renter cannot fetch inventory for a booking they are not part of → `403 FORBIDDEN`
- `[ ]` Returns empty `inventory: []` array (not an error) when no items exist

---

## 3. Inventory — Update

- `[ ]` `PUT /api/inventory/:inventoryId` updates allowed fields: `name`, `type`, `sku`, `quantity`, `category`, `dimensions`, `weight_kg`, `notes`
- `[ ]` `updated_at` timestamp is refreshed on update
- `[ ]` Attempting to update `booking_id` or `renter_id` via the body has no effect (not in `allowedFields`)
- `[ ]` Non-owner renter attempts to update another renter's inventory item → `403 FORBIDDEN` (`requireInventoryOwner`)
- `[ ]` Host attempts to update a renter's inventory item → `403 FORBIDDEN`
- `[ ]` Body with no valid fields → `400 VALIDATION_ERROR` ("No valid fields to update")
- `[ ]` Non-existent `inventoryId` → `404 NOT_FOUND` (verify backend returns 404 for missing item)

---

## 4. Inventory — Delete

- `[ ]` `DELETE /api/inventory/:inventoryId` by the item's owner removes the record
- `[ ]` Response is `200` with success message
- `[ ]` Non-owner attempting delete → `403 FORBIDDEN`
- `[ ]` Deleting a non-existent item → document behavior (currently no explicit 404, may succeed silently — flag for Julian)

---

## 5. Ship Requests — Create

### Happy path
- `[ ]` Approved renter creates ship request on a `confirmed` booking
- `[ ]` Approved renter creates ship request on a `renter_accepted` booking (allowed per backend check)
- `[ ]` Request created with status `pending`
- `[ ]` Host receives `ship_request_created` notification
- `[ ]` All optional fields (`carrier_name`, `tracking_number`, `expected_arrival_date`, `description`) default to `null` when not provided
- `[ ]` Response is `201` with `ship_request` object

### Guards
- `[ ]` Host attempts to create a ship request → `403 FORBIDDEN` ("Only renters can create ship requests")
- `[ ]` Renter creates ship request on an `agreement_draft` booking → `404 NOT_FOUND` (query requires `confirmed` or `renter_accepted`)
- `[ ]` Renter creates ship request on a `rejected` booking → `404 NOT_FOUND`
- `[ ]` Renter creates ship request for a booking that belongs to another renter → `404 NOT_FOUND` (query checks `renter_id = user.id`)
- `[ ]` Unapproved renter → `403 PENDING_APPROVAL`

---

## 6. Ship Requests — Read

- `[ ]` `GET /api/bookings/:bookingId/ship-requests` returns all ship requests for a booking, newest first
- `[ ]` Renter can fetch for their own booking
- `[ ]` Host can fetch for a booking on their listing
- `[ ]` Third-party renter cannot fetch → `403 FORBIDDEN`
- `[ ]` Returns empty `ship_requests: []` when none exist

---

## 7. Ship Request Status Updates

### Happy path
- `[ ]` Host updates status `pending` → `acknowledged`: `acknowledged_at` timestamp is set
- `[ ]` Host updates status `acknowledged` → `received`: `received_at` timestamp is set
- `[ ]` Host adds `notes` along with a status update — persisted correctly
- `[ ]` Renter receives a `ship_request_updated` notification for each status change

### Edge cases & guards
- `[ ]` Renter attempts status update → `403 FORBIDDEN` ("Only the host can update ship request status")
- `[ ]` Host skips `acknowledged` and directly sets `received` — document whether this is allowed (no sequential enforcement exists in backend)
- `[ ]` Host attempts to set status back to `pending` from `acknowledged` — document whether rollback is allowed
- `[ ]` Invalid status value (e.g., `"shipped"`) → `400 VALIDATION_ERROR`
- `[ ]` Non-existent `requestId` → `404 NOT_FOUND`
- `[ ]` Admin can update a ship request status — verify (admin is not the host; `requireBookingParticipant` does not use `requireBookingHost`)

---

## 8. Notifications — Inventory Events

| Event | Recipient | Notification type | Tested |
|-------|-----------|-------------------|--------|
| Ship request created | Host | `ship_request_created` | `[ ]` |
| Ship request status updated | Renter | `ship_request_updated` | `[ ]` |

---

## 9. Notifications — General Endpoint Tests

- `[ ]` `GET /api/notifications` returns only the logged-in user's notifications
- `[ ]` `?unread_only=true` filters to unread only
- `[ ]` `GET /api/notifications/unread-count` returns correct integer count
- `[ ]` `POST /api/notifications/read` with `notification_ids: [...]` marks specific notifications as read
- `[ ]` `POST /api/notifications/read` with `read_all: true` marks all of user's notifications as read
- `[ ]` User A cannot mark User B's notifications as read (user_id scoping in the update query)
- `[ ]` `POST /api/notifications/read` with no `notification_ids` and no `read_all` → `400 VALIDATION_ERROR`
