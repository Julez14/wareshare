# QA Checklist — Booking System & State Machine

**Owner:** Ivan
**Backend routes:** `POST /api/bookings`, `GET /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/reject`, `PUT /api/bookings/:id/agreement`, `POST /api/bookings/:id/agreement/accept`, `POST /api/bookings/:id/cancel`

**Status:** `[ ]` Not tested · `[x]` Pass · `[!]` Fail · `[-]` Blocked

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
- `[ ]` Approved renter creates booking with valid `listing_id`, `start_date`, `end_date`
  - Response is `201` with `booking`, `agreement`, and `inventory` fields
  - Booking status is `agreement_draft` (transitions from `pending_review` automatically)
  - Storage agreement is created with status `draft`
  - Host receives a `booking_request` notification

- `[ ]` Booking creation with `inventory` array populates `inventory_items` table
  - Each item is returned in response
  - Items are linked to the correct `booking_id` and `renter_id`

- `[ ]` Booking creation without optional `space_requested_sqft` succeeds (nullable field)

### Guards & edge cases
- `[ ]` **Unauthenticated request** → `401 UNAUTHORIZED`
- `[ ]` **Pending-approval renter** tries to create booking → `403 PENDING_APPROVAL`
- `[ ]` **Rejected renter** tries to create booking → `403 REJECTED_ACCOUNT`
- `[ ]` **Host attempts** to create a booking (own role) → `403 FORBIDDEN` ("Only renters can create booking requests")
- `[ ]` **Non-existent listing ID** → `404 NOT_FOUND`
- `[ ]` **Listing with `availability_status: unavailable`** → `409 CONFLICT` ("This listing is not currently available")
- `[ ]` **Listing whose host is not approved** → `409 CONFLICT` ("This listing's host is not approved")
- `[ ]` Missing `start_date` or `end_date` → `400 VALIDATION_ERROR`
- `[ ]` `start_date` same as or after `end_date` — verify backend handles or document as frontend validation responsibility

### Overlap check
- `[ ]` Two renters request the same listing for overlapping dates — BOTH requests create bookings in `agreement_draft` (calendar is only blocked after `confirmed`). Verify neither is immediately blocked.
- `[ ]` After one booking reaches `confirmed`, a second renter attempts to book the same dates — listing `availability_status` may or may not have changed (document current behavior as this is MVP)

---

## 2. Listing Bookings

### Retrieval
- `[ ]` Renter calling `GET /api/bookings` only receives their own bookings (filtered by `renter_id`)
- `[ ]` Host calling `GET /api/bookings` only receives bookings for their listings (filtered by `host_id`)
- `[ ]` Admin calling `GET /api/bookings` receives all bookings
- `[ ]` `?status=confirmed` filter returns only confirmed bookings
- `[ ]` `GET /api/bookings/:id` returns booking + agreement + inventory
- `[ ]` Renter cannot fetch a booking belonging to another renter → `403 FORBIDDEN`
- `[ ]` Host cannot fetch a booking for a listing they don't own → `403 FORBIDDEN`

---

## 3. Host Rejects Booking

### Happy path
- `[ ]` Host rejects from `agreement_draft` status → booking becomes `rejected`
- `[ ]` Host rejects from `host_edited` status → booking becomes `rejected`
- `[ ]` Renter receives a `booking_rejected` notification
- `[ ]` Rejected reason is stored and returned in booking response

### Guards
- `[ ]` Renter attempts to reject a booking → `403 FORBIDDEN` (only hosts can call this endpoint)
- `[ ]` Host tries to reject an already `confirmed` booking → `409 CONFLICT` ("Cannot reject a booking in this status")
- `[ ]` Host tries to reject a `cancelled` booking → `409 CONFLICT`
- `[ ]` Host tries to reject a `rejected` booking → `409 CONFLICT`
- `[ ]` Rejection without a reason body is accepted (reason is optional — sends `null`)

---

## 4. Host Edits Storage Agreement

### Happy path
- `[ ]` Host edits agreement when booking is `agreement_draft` → booking transitions to `host_edited`, agreement to `host_edited`
- `[ ]` Host edits `special_conditions` array — persists correctly in `content` JSON
- `[ ]` Host edits `notes` field — persists correctly
- `[ ]` Host can re-edit agreement when already `host_edited` (status stays `host_edited`)
- `[ ]` Renter receives an `agreement_ready` notification after each host edit

### Guards
- `[ ]` Renter attempts to edit the agreement → `403 FORBIDDEN` (endpoint is `requireBookingHost`)
- `[ ]` Editing agreement when booking is `confirmed` → `409 CONFLICT`
- `[ ]` Editing agreement when booking is `rejected` or `cancelled` → `409 CONFLICT`
- `[ ]` Body with no recognized fields → `400 VALIDATION_ERROR` (or no-op, document behavior)

---

## 5. Agreement Signing (Accept)

### Renter signs first (standard flow)
- `[ ]` Renter calls `POST /api/bookings/:id/agreement/accept` when status is `host_edited`
  - `renter_accepted_at` timestamp is set
  - Booking transitions to `renter_accepted`
  - Host receives `agreement_signed` notification

### Host signs after renter
- `[ ]` Host calls accept when status is `renter_accepted`
  - `host_accepted_at` timestamp is set
  - Both timestamps now populated → booking transitions to `confirmed`
  - Agreement status transitions to `fully_accepted`
  - A `calendar_block` row is created for the listing's date range
  - Both renter and host receive `booking_approved` notification

### Host signs first (edge case)
- `[ ]` Host calls accept when status is `host_edited` (before renter signs)
  - `host_accepted_at` is set
  - Booking status stays `host_edited` (no dedicated "host only signed" status exists in current implementation — document this)
  - Renter receives `agreement_signed` notification

- `[ ]` Renter then signs → both timestamps populated → `confirmed` (same outcome)

### Double-signing guard
- `[ ]` Host calls accept a second time after already signing → `409 CONFLICT` ("Host has already signed this agreement")
- `[ ]` Renter calls accept a second time after already signing → `409 CONFLICT` ("Renter has already signed this agreement")

### Status guards
- `[ ]` Either party calls accept when booking is `agreement_draft` (host hasn't edited yet) → `409 CONFLICT`
- `[ ]` Either party calls accept when booking is `confirmed` → `409 CONFLICT`
- `[ ]` Third party (not renter or host of this booking) calls accept → `403 FORBIDDEN`

---

## 6. Booking Cancellation

### Happy path
- `[ ]` Renter cancels when status is `agreement_draft` → booking becomes `cancelled`
- `[ ]` Renter cancels when status is `host_edited` → booking becomes `cancelled`
- `[ ]` Host cancels when status is `renter_accepted` → booking becomes `cancelled`
- `[ ]` Either party cancels a `confirmed` booking → booking becomes `cancelled`, `calendar_block` row is deleted
- `[ ]` `cancelled_by` is set to the user ID of whoever cancelled
- `[ ]` The other party receives a `booking_cancelled` notification

### Guards
- `[ ]` Cancelling from `rejected` status → `409 CONFLICT` ("Cannot cancel a booking in this status")
- `[ ]` Cancelling from `cancelled` status → `409 CONFLICT`
- `[ ]` Third party (not booking participant) attempts cancel → `403 FORBIDDEN`

---

## 7. Calendar Blocks

- `[ ]` After a booking reaches `confirmed`, a row exists in `calendar_blocks` for the correct `listing_id`, `start_date`, `end_date`, `booking_id`
- `[ ]` After cancelling a `confirmed` booking, the `calendar_blocks` row is deleted
- `[ ]` `GET /api/listings/:id/calendar` (or equivalent) returns only blocks for confirmed bookings (no pending bookings block dates)
- `[ ]` Listing `availability_status` does NOT change automatically when a booking is created (only changes if host manually sets it or an explicit confirmed logic exists — document current behavior)

---

## 8. Notifications — Booking Events

| Event | Recipient | Notification type | Tested |
|-------|-----------|-------------------|--------|
| Booking created | Host | `booking_request` | `[ ]` |
| Host rejects booking | Renter | `booking_rejected` | `[ ]` |
| Host edits agreement | Renter | `agreement_ready` | `[ ]` |
| Either party signs | Other party | `agreement_signed` | `[ ]` |
| Booking confirmed (both signed) | Both | `booking_approved` | `[ ]` |
| Booking cancelled | Other party | `booking_cancelled` | `[ ]` |
