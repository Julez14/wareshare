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

## Test Run Log

| Run | Date | Script | Result |
|-----|------|--------|--------|
| 1 | 2026-02-25 | `test-endpoints.ts` | 66/66 ✓ |
| 2 | 2026-02-25 | `test-edge-cases.ts` | 32/33 ✓ (1 fail: metrics not deployed) |
| 3 | 2026-02-25 | `test-edge-cases.ts` (local) | 33/33 ✓ metrics confirmed working locally |
| 4 | 2026-02-25 | `test-edge-cases.ts` (local, +RENTER003) | 42/42 ✓ cross-renter isolation confirmed |
| 5 | 2026-02-26 | `test-edge-cases.ts` (local, +HOST003) | **58/58 ✓** role filter, idempotency, host isolation confirmed |
| 6 | 2026-02-26 | `test-edge-cases.ts` (local, full) | **72/72 ✓** inventory defaults, ship request edge cases, admin reversed transitions |
| 7 | 2026-03-09 | `test-edge-cases.ts` (live, post-Julian deploy + seed) | **72/72 ✓** all live API failures resolved |

---

## 1. Inventory — Create

### Happy path (via booking creation)
- `[x]` Submitting `inventory` array in `POST /api/bookings` creates all items linked to the booking
- `[x]` Each item has correct `booking_id` and `renter_id`
- `[x]` Items with only `name` (all other fields optional) are created successfully *(run 6: `"Bare Minimum Box"` → 201)*
- `[x]` `type` defaults to `item` if not provided *(run 6: explicitly asserted)*
- `[x]` `quantity` defaults to `1` if not provided *(run 6: explicitly asserted)*

### Happy path (standalone add)
- `[x]` `POST /api/bookings/:bookingId/inventory` by the booking’s renter adds an item
- `[x]` Adding an item to a booking with status `agreement_draft` works *(run 6: dedicated draft booking test → 201)*
- `[x]` Adding an item to a `confirmed` booking works (inventory can be added post-confirmation — **intentional, confirmed allowed**) *(main script + run 6)*
- `[x]` Response is `201` with the new `item` object

### Guards
- `[x]` Renter adds inventory to a booking that is not theirs → `403 FORBIDDEN` *(run 4: RENTER003 → RENTER001's booking)*
- `[x]` Host attempts to add inventory to a booking → `403 FORBIDDEN`
- `[x]` Adding inventory to a `rejected` booking → `404 NOT_FOUND`
- `[x]` Adding inventory to a `cancelled` booking → `404 NOT_FOUND`
- `[x]` Missing `name` field → `400 VALIDATION_ERROR`
- `[-]` Unapproved renter → `403 PENDING_APPROVAL` — not specifically tested for inventory (general auth guard covers it)

---

## 2. Inventory — Read

- `[x]` `GET /api/bookings/:bookingId/inventory` returns all items for the booking, ordered newest first
- `[x]` Renter can fetch their own booking’s inventory
- `[x]` Host can fetch inventory for their listing’s booking (`requireBookingParticipant` allows both)
- `[x]` Another renter cannot fetch inventory for a booking they are not part of → `403 FORBIDDEN` *(RENTER003 → RENTER001's booking)*
- `[x]` Returns empty `inventory: []` array (not an error) when no items exist *(run 6: fresh booking with no inventory → `[]`)*

---

## 3. Inventory — Update

- `[x]` `PUT /api/inventory/:inventoryId` updates allowed fields: `name`, `type`, `sku`, `quantity`, `category`, `dimensions`, `weight_kg`, `notes`
- `[x]` `updated_at` timestamp is refreshed on update *(run 6: 1s wait + before/after assert)*
- `[-]` Attempting to update `booking_id` or `renter_id` via the body has no effect (not in `allowedFields`) — low-risk; `allowedFields` array in inventory.ts excludes these fields by design
- `[x]` Non-owner renter attempts to update another renter's inventory item → `403 FORBIDDEN` *(RENTER003 → RENTER001's item)*
- `[x]` Host attempts to update a renter's inventory item → `403 FORBIDDEN` *(run 6: HOST_TOKEN → renter1InventoryId)*
- `[x]` Body with no valid fields → `400 VALIDATION_ERROR` (`"No valid fields to update"`)
- `[x]` Non-existent `inventoryId` → `404 NOT_FOUND` *(requireInventoryOwner middleware returns 404 before handler runs)*

---

## 4. Inventory — Delete

- `[x]` `DELETE /api/inventory/:inventoryId` by the item’s owner removes the record
- `[x]` Response is `200` with success message
- `[x]` Non-owner attempting delete → `403 FORBIDDEN` *(RENTER003 → RENTER001's item)*
- `[x]` Deleting a non-existent item → `404 NOT_FOUND` *(requireInventoryOwner middleware — corrected from earlier note: NOT a silent 200)*

---

## 5. Ship Requests — Create

### Happy path
- `[x]` Approved renter creates ship request on a `confirmed` booking
- `[-]` Approved renter creates ship request on a `renter_accepted` booking (allowed per backend check) — not tested in isolation
- `[x]` Request created with status `pending`
- `[x]` Host receives `ship_request_created` notification *(run 6: asserted from HOST_TOKEN /api/notifications)*
- `[x]` All optional fields (`carrier_name`, `tracking_number`, `expected_arrival_date`) default to `null` when not provided *(run 6: explicitly asserted)*
- `[x]` Response is `201` with `ship_request` object

### Guards
- `[x]` Host attempts to create a ship request → `403 FORBIDDEN`
- `[x]` Renter creates ship request on an `agreement_draft` booking → `404 NOT_FOUND`
- `[x]` Renter creates ship request on a `rejected` booking → `404 NOT_FOUND` *(run 6: edgeBookingId was rejected → 404)*
- `[x]` Renter creates ship request for a booking that belongs to another renter → `404 NOT_FOUND` *(renter_id scoped query — RENTER003 → RENTER001)*
- `[-]` Unapproved renter → `403 PENDING_APPROVAL` — general auth guard applies

---

## 6. Ship Requests — Read

- `[x]` `GET /api/bookings/:bookingId/ship-requests` returns all ship requests for a booking — renter GET confirmed *(run 6: RENTER_TOKEN on guardBookingId → array with items)*
- `[x]` Host can fetch for a booking on their listing
- `[x]` Third-party renter cannot fetch → `403 FORBIDDEN` *(RENTER003 → RENTER001's booking)*
- `[-]` Returns empty `ship_requests: []` when none exist — not tested

---

## 7. Ship Request Status Updates

### Happy path
- `[x]` Host updates status `pending` → `acknowledged`: `acknowledged_at` timestamp is set
- `[x]` Host updates status `acknowledged` → `received`: `received_at` timestamp is set
- `[x]` Host adds `notes` along with a status update — persisted correctly
- `[x]` Renter receives a `ship_request_updated` notification after status change *(run 6: explicitly asserted from RENTER_TOKEN after host set received)*

### Edge cases & guards
- `[x]` Renter attempts status update → `403 FORBIDDEN`
- `[x]` Host skips `acknowledged` and directly sets `received` → **confirmed allowed** *(run 6: host sets `received` on `pending` SR; `acknowledged_at` remains null, `received_at` is set)* — Note for Julian/April: add sequential enforcement if product requires it
- `[-]` Host attempts to set status back to `pending` from `acknowledged` — not tested; document whether rollback is allowed
- `[x]` Invalid status value (e.g., `"shipped"`) → `400 VALIDATION_ERROR`
- `[-]` Non-existent `requestId` → `404 NOT_FOUND` — not tested
- `[-]` Admin can update a ship request status — not tested

---

## 8. Notifications — Inventory Events

| Event | Recipient | Notification type | Tested |
|-------|-----------|-------------------|--------|
| Ship request created | Host | `ship_request_created` | `[x]` main script |
| Ship request status updated | Renter | `ship_request_updated` | `[x]` main script |
| Host edits agreement | Renter | `agreement_ready` | `[x]` event asserted in Notification Event Assertions suite |
| Either party signs | Other party | `agreement_signed` | `[x]` event asserted in Notification Event Assertions suite |
| Booking confirmed | Both parties | `booking_approved` | `[x]` event asserted in Notification Event Assertions suite |
---

## 9. Notifications — General Endpoint Tests

- `[x]` `GET /api/notifications` returns only the logged-in user’s notifications
- `[x]` `?unread_only=true` filters to unread only
- `[x]` `GET /api/notifications/unread-count` returns correct integer count
- `[x]` `POST /api/notifications/read` with `notification_ids: [...]` marks specific notifications as read
- `[x]` `POST /api/notifications/read` with `read_all: true` marks all of user’s notifications as read
- `[-]` User A cannot mark User B’s notifications as read (user_id scoping in the update query) — needs second user sending IDs across accounts
- `[x]` `POST /api/notifications/read` with no `notification_ids` and no `read_all` → `400 VALIDATION_ERROR`
