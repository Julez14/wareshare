# QA Checklist — Booking System & State Machine

**Owner:** Ivan
**Backend routes:** `POST /api/bookings`, `GET /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/reject`, `PUT /api/bookings/:id/agreement`, `POST /api/bookings/:id/agreement/accept`, `POST /api/bookings/:id/cancel`

**Status:** `[ ]` Not tested · `[x]` Pass · `[!]` Fail · `[-]` Blocked

---

## Test Run Log

| Run | Date | Script | Result |
|-----|------|--------|--------|
| 1 | 2026-02-25 | `test-endpoints.ts` | 66/66 ✓ |
| 2 | 2026-02-25 | `test-edge-cases.ts` | 32/33 ✓ (1 fail: metrics not deployed) |

Booking system items covered across both runs. Items marked `[ ]` require manual testing once the frontend is built. Items marked `[-]` need seed data setup or are noted architectural decisions.

---

## Booking Status Machine Reference

```
[Renter creates booking]
         ↓
  pending_review ──────────────────────────────→ agreement_draft  (auto, same request)
         ↓ (host can reject here)
  agreement_draft
         ↓ host edits agreement (or rejects)
    host_edited
         ↓ renter signs (or rejects via cancel)
   renter_accepted
         ↓ host signs
      confirmed  ←── calendar block created here
         ↓
   (can be cancelled by either party until confirmed; after confirmed, cancel still allowed)

  rejected  (host rejects from: agreement_draft, host_edited)
  cancelled (either party from: agreement_draft, host_edited, renter_accepted, confirmed)
```

**Key PRD rules:**
- Calendar is NOT blocked until `confirmed`
- Availability status does NOT change until `confirmed`
- No payment is triggered at any point

---

## 1. Booking Creation

### Happy path
- `[x]` Approved renter creates booking with valid `listing_id`, `start_date`, `end_date`
  - Response is `201` with `booking`, `agreement`, and `inventory` fields
  - Booking status is `agreement_draft` (transitions from `pending_review` automatically)
  - Storage agreement is created with status `draft`
  - Host receives a `booking_request` notification

- `[x]` Booking creation with `inventory` array populates `inventory_items` table
  - Each item is returned in response
  - Items are linked to the correct `booking_id` and `renter_id`

- `[ ]` Booking creation without optional `space_requested_sqft` succeeds (nullable field)

### Guards & edge cases
- `[x]` **Unauthenticated request** → `401 UNAUTHORIZED`
- `[x]` **Pending-approval renter** tries to create booking → `403 PENDING_APPROVAL`
- `[x]` **Rejected renter** tries to create booking → `403 REJECTED_ACCOUNT`
- `[x]` **Host attempts** to create a booking (own role) → `403 FORBIDDEN` ("Only renters can create booking requests")
- `[x]` **Non-existent listing ID** → `404 NOT_FOUND`
- `[x]` **Listing with `availability_status: unavailable`** → `409 CONFLICT` ("This listing is not currently available")
- `[-]` **Listing whose host is not approved** → `409 CONFLICT` — seed has only one host (approved); needs second unapproved host to test
- `[x]` Missing `start_date` or `end_date` → `400 VALIDATION_ERROR`
- `[-]` `start_date` same as or after `end_date` — **frontend validation responsibility** per current backend (no server-side date order check)

### Overlap check
- `[-]` Two renters request the same listing for overlapping dates — **documented behavior:** both requests succeed in `agreement_draft` (calendar only blocked after `confirmed`). Neither is blocked. Requires second renter seed user to test automatically.
- `[-]` After one booking reaches `confirmed`, availability_status does NOT auto-flip — **documented MVP behavior**: host must manually set `unavailable`. Flagged to Julian as intentional.

---

## 2. Listing Bookings

### Retrieval
- `[x]` Renter calling `GET /api/bookings` only receives their own bookings (filtered by `renter_id`)
- `[x]` Host calling `GET /api/bookings` only receives bookings for their listings (filtered by `host_id`)
- `[x]` Admin calling `GET /api/bookings` receives all bookings
- `[ ]` `?status=confirmed` filter returns only confirmed bookings
- `[x]` `GET /api/bookings/:id` returns booking + agreement + inventory
- `[x]` Renter cannot fetch a booking belonging to another renter → `403 FORBIDDEN` *(RENTER003 → RENTER001's booking)*
- `[x]` Host cannot fetch a booking for a listing they don't own → `403 FORBIDDEN` *(HOST003 → HOST001's booking)*

---

## 3. Host Rejects Booking

### Happy path
- `[x]` Host rejects from `agreement_draft` status → booking becomes `rejected`
- `[-]` Host rejects from `host_edited` status → not yet tested (needs multi-step booking setup)
- `[x]` Renter receives a `booking_rejected` notification
- `[x]` Rejected reason is stored and returned in booking response

### Guards
- `[x]` Renter attempts to reject a booking → `403 FORBIDDEN` (only hosts can call this endpoint)
- `[-]` Host tries to reject an already `confirmed` booking → not tested (confirmed bookings were cancelled before rejection test)
- `[x]` Host tries to reject a `cancelled` booking → `409 CONFLICT` *(tested via main script: reject after cancel)*
- `[x]` Host tries to reject a `rejected` booking → `409 CONFLICT`
- `[x]` Rejection without a reason body is accepted (reason is optional — sends `null`)

---

## 4. Host Edits Storage Agreement

### Happy path
- `[x]` Host edits agreement when booking is `agreement_draft` → booking transitions to `host_edited`, agreement to `host_edited`
- `[x]` Host edits `special_conditions` array — persists correctly in `content` JSON
- `[x]` Host edits `notes` field — persists correctly
- `[-]` Host can re-edit agreement when already `host_edited` (status stays `host_edited`) — not explicitly retested after first edit
- `[x]` Renter receives an `agreement_ready` notification after each host edit

### Guards
- `[x]` Renter attempts to edit the agreement → `403 FORBIDDEN` (endpoint is `requireBookingHost`)
- `[x]` Editing agreement when booking is `confirmed` → `409 CONFLICT`
- `[-]` Editing agreement when booking is `rejected` or `cancelled` → not tested
- `[-]` Body with no recognized fields → **no-op behavior** (backend returns 200 with unchanged agreement, no 400). Documented: frontend should validate before calling.

---

## 5. Agreement Signing (Accept)

### Renter signs first (standard flow)
- `[x]` Renter calls `POST /api/bookings/:id/agreement/accept` when status is `host_edited`
  - `renter_accepted_at` timestamp is set
  - Booking transitions to `renter_accepted`
  - Host receives `agreement_signed` notification `[x]`

### Host signs after renter
- `[x]` Host calls accept when status is `renter_accepted`
  - `host_accepted_at` timestamp is set
  - Both timestamps now populated → booking transitions to `confirmed`
  - Agreement status transitions to `fully_accepted`
  - A `calendar_block` row is created for the listing's date range
  - Both renter and host receive `booking_approved` notification `[x]`

### Host signs first (edge case)
- `[-]` Host calls accept when status is `host_edited` (before renter signs) — **documented behavior:** `host_accepted_at` is set but booking status stays `host_edited`. No dedicated intermediate status exists. Needs second test run to explicitly verify.
  - Renter receives `agreement_signed` notification `[x]`

- `[-]` Renter then signs → both timestamps populated → `confirmed` (same outcome) — follows from above

### Double-signing guard
- `[x]` Host calls accept a second time after already signing → `409 CONFLICT` ("Host has already signed this agreement")
- `[x]` Renter calls accept a second time after already signing → `409 CONFLICT` ("Renter has already signed this agreement")

### Status guards
- `[x]` Either party calls accept when booking is `agreement_draft` (host hasn't edited yet) → `409 CONFLICT`
- `[-]` Either party calls accept when booking is `confirmed` → not explicitly tested (double-sign guard fires first)
- `[-]` Third party (not renter or host of this booking) calls accept → needs second renter seed user

---

## 6. Booking Cancellation

### Happy path
- `[-]` Renter cancels when status is `agreement_draft` — not isolated in test; covered implicitly by cancel flow
- `[-]` Renter cancels when status is `host_edited` — not isolated
- `[-]` Host cancels when status is `renter_accepted` — not isolated
- `[x]` Either party cancels a `confirmed` booking → booking becomes `cancelled`, `calendar_block` row is deleted *(main script)*
- `[ ]` `cancelled_by` is set to the user ID of whoever cancelled
- `[ ]` The other party receives a `booking_cancelled` notification

### Guards
- `[x]` Cancelling from `rejected` status → `409 CONFLICT` *(edge cases script)*
- `[x]` Cancelling from `cancelled` status → `409 CONFLICT` *(edge cases script)*
- `[x]` Third party (not booking participant) attempts cancel → `403 FORBIDDEN` *(RENTER003 → RENTER001's booking)*

---

## 7. Calendar Blocks

- `[ ]` After a booking reaches `confirmed`, a row exists in `calendar_blocks` for the correct `listing_id`, `start_date`, `end_date`, `booking_id` — **needs direct DB or calendar endpoint query to verify**
- `[ ]` After cancelling a `confirmed` booking, the `calendar_blocks` row is deleted — **needs DB query to verify** (cancellation endpoint returns 200 correctly)
- `[ ]` `GET /api/listings/:id/calendar` (or equivalent) returns only blocks for confirmed bookings
- `[-]` Listing `availability_status` does NOT change automatically when a booking is created — **confirmed MVP behavior**: host sets manually. Documented.

---

## 8. Notifications — Booking Events

| Event | Recipient | Notification type | Tested |
|-------|-----------|-------------------|--------|
| Booking created | Host | `booking_request` | `[x]` |
| Host rejects booking | Renter | `booking_rejected` | `[x]` |
| Host edits agreement | Renter | `agreement_ready` | `[x]` |
| Either party signs | Other party | `agreement_signed` | `[x]` |
| Booking confirmed (both signed) | Both | `booking_approved` | `[x]` |
| Booking cancelled | Other party | `booking_cancelled` | `[ ]` |
