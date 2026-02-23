# QA Checklist — Admin Workflows

**Owner:** Ivan
**Backend routes:** `GET /api/admin/users`, `GET /api/admin/users/:id`, `POST /api/admin/users/:id/approve`, `POST /api/admin/users/:id/reject`, `GET /api/admin/stats`

**Status:** `[ ]` Not tested · `[x]` Pass · `[!]` Fail · `[-]` Blocked

---

## 1. Access Control

- `[ ]` Authenticated user with `role: admin` can access all `/api/admin/*` routes
- `[ ]` Authenticated user with `role: renter` calling any `/api/admin/*` route → `403 FORBIDDEN`
- `[ ]` Authenticated user with `role: host` calling any `/api/admin/*` route → `403 FORBIDDEN`
- `[ ]` Unauthenticated request to any `/api/admin/*` route → `401 UNAUTHORIZED`

---

## 2. List Users

### Happy path
- `[ ]` `GET /api/admin/users` returns all users, newest first, with pagination metadata
- `[ ]` `?role=renter` filters to renters only
- `[ ]` `?role=host` filters to hosts only
- `[ ]` `?approval_status=pending` filters to pending accounts only
- `[ ]` `?approval_status=approved` filters to approved accounts only
- `[ ]` `?approval_status=rejected` filters to rejected accounts only
- `[ ]` Combined filter `?role=host&approval_status=pending` returns pending hosts only
- `[ ]` Pagination: `?page=2&per_page=5` returns correct page slice and correct `total_pages` math

### Response fields
- `[ ]` Response includes `id`, `clerk_id`, `email`, `full_name`, `role`, `approval_status`, `business_reg_number`, `website`, `city`, `province`, `phone`, `created_at`, `updated_at`
- `[ ]` Sensitive fields present: `verification_doc_key`, `address` (admin has full access)

---

## 3. View Individual User

- `[ ]` `GET /api/admin/users/:id` returns full user record including `verification_doc_key` and `address`
- `[ ]` Requesting a non-existent user ID → `404 NOT_FOUND`

---

## 4. Approve User

### Happy path
- `[ ]` Calling `POST /api/admin/users/:id/approve` on a `pending` user → `approval_status` becomes `approved`
- `[ ]` User receives an `account_approved` notification with message: "Your WareShare account has been approved. You can now access all platform features."
- `[ ]` Approved user can now access approved-only endpoints (e.g., create a booking or listing)

### Idempotency & guards
- `[ ]` Approving an already-`approved` user → `200` with message "User already approved" (no error, no duplicate notification)
- `[ ]` Approving a `rejected` user → status changes to `approved` (re-approval is allowed — verify this is intentional)
- `[ ]` Approving a non-existent user ID → `404 NOT_FOUND`

---

## 5. Reject User

### Happy path
- `[ ]` Calling `POST /api/admin/users/:id/reject` on a `pending` user → `approval_status` becomes `rejected`
- `[ ]` User receives an `account_rejected` notification with title "Account Application Declined"
- `[ ]` Rejection with a `reason` body → notification message includes the reason text
- `[ ]` Rejection without a `reason` body → notification contains default message only (no crash)

### Post-rejection access enforcement
- `[ ]` Rejected user attempts `GET /api/bookings` → `403 REJECTED_ACCOUNT`
- `[ ]` Rejected user attempts `POST /api/listings` → `403 REJECTED_ACCOUNT`
- `[ ]` Rejected user attempts `POST /api/bookings` → `403 REJECTED_ACCOUNT`
- `[ ]` Rejected user can still call `GET /api/listings` (public browse, no auth required) — document expected behavior

### Idempotency & guards
- `[ ]` Rejecting an already-`rejected` user → `200` with message "User already rejected" (no duplicate notification)
- `[ ]` Rejecting an `approved` user → status changes to `rejected` (verify this is intentional for revoking access)
- `[ ]` Rejecting a non-existent user ID → `404 NOT_FOUND`

---

## 6. Platform Stats

- `[ ]` `GET /api/admin/stats` returns users broken down by `role` (renter / host / admin)
- `[ ]` Returns users broken down by `approval_status` (pending / approved / rejected)
- `[ ]` Returns listings total and broken down by `availability_status`
- `[ ]` Returns bookings total and broken down by `status`
- `[ ]` Stats reflect live data — approve a user and re-call stats to confirm counts update

---

## 7. Downstream Effects of Approval / Rejection

These test cross-system behaviour after admin actions:

- `[ ]` Approved host creates a listing → listing is visible in `GET /api/listings` (public search)
- `[ ]` Rejected host's existing listings do NOT appear in public search (listings query joins `users.approval_status = 'approved'`)
- `[ ]` Approved host who is then rejected — verify their listing disappears from public results
- `[ ]` Pending renter tries to message on a booking → `403 PENDING_APPROVAL`

---

## 8. Frontend Integration (when admin UI is built)

- `[ ]` Default view on admin dashboard shows `?approval_status=pending` list
- `[ ]` Approve button calls correct endpoint; row updates inline without page reload
- `[ ]` Reject button presents a reason text field (optional); confirms before submitting
- `[ ]` Stats summary cards on dashboard reflect `GET /api/admin/stats` data
- `[ ]` Admin can navigate to an individual user record and view their verification document if uploaded
