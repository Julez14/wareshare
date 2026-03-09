# QA Checklist — Admin Workflows

**Owner:** Ivan
**Backend routes:** `GET /api/admin/users`, `GET /api/admin/users/:id`, `POST /api/admin/users/:id/approve`, `POST /api/admin/users/:id/reject`, `GET /api/admin/stats`

**Status:** `[ ]` Not tested · `[x]` Pass · `[!]` Fail · `[-]` Blocked

---

## Test Run Log

| Run | Date | Script | Result |
|-----|------|--------|--------|
| 1 | 2026-02-25 | `test-endpoints.ts` | 66/66 ✓ |
| 2 | 2026-02-25 | `test-edge-cases.ts` | 32/33 ✓ (1 fail: metrics not deployed on live API) |
| 3 | 2026-02-25 | `test-edge-cases.ts` (local) | 33/33 ✓ metrics confirmed working locally |
| 4 | 2026-02-25 | `test-edge-cases.ts` (local, +RENTER003) | 42/42 ✓ cross-renter isolation confirmed |
| 5 | 2026-02-26 | `test-edge-cases.ts` (local, +HOST003) | **58/58 ✓** role filter, idempotency, host isolation confirmed |
| 6 | 2026-02-26 | `test-edge-cases.ts` (local, full) | **72/72 ✓** reversed state transitions confirmed |
| 7 | 2026-03-09 | `test-edge-cases.ts` (live, post-Julian deploy + seed) | **72/72 ✓** all live API failures resolved |

---

## 1. Access Control

- `[x]` Authenticated user with `role: admin` can access all `/api/admin/*` routes
- `[x]` Authenticated user with `role: renter` calling any `/api/admin/*` route → `403 FORBIDDEN`
- `[x]` Authenticated user with `role: host` calling any `/api/admin/*` route → `403 FORBIDDEN`
- `[x]` Unauthenticated request to any `/api/admin/*` route → `401 UNAUTHORIZED`

---

## 2. List Users

### Happy path
- `[x]` `GET /api/admin/users` returns all users, newest first, with pagination metadata
- `[x]` `?role=renter` filters to renters only
- `[x]` `?role=host` filters to hosts only
- `[x]` `?approval_status=pending` filters to pending accounts only
- `[x]` `?approval_status=approved` filters to approved accounts only
- `[x]` `?approval_status=rejected` filters to rejected accounts only
- `[-]` Combined filter `?role=host&approval_status=pending` returns pending hosts only — not tested
- `[-]` Pagination: `?page=2&per_page=5` returns correct page slice and correct `total_pages` math — not tested

### Response fields
- `[x]` Response includes `id`, `clerk_id`, `email`, `full_name`, `role`, `approval_status`, `business_reg_number`, `website`, `city`, `province`, `phone`, `created_at`, `updated_at`
- `[x]` Sensitive fields present: `verification_doc_key`, `address` (admin has full access) — verified on `GET /admin/users/:id`

---

## 3. View Individual User

- `[x]` `GET /api/admin/users/:id` returns full user record including `verification_doc_key` and `address`
- `[x]` Requesting a non-existent user ID → `404 NOT_FOUND`

---

## 4. Approve User

### Happy path
- `[x]` Calling `POST /api/admin/users/:id/approve` on a `pending` user → `approval_status` becomes `approved`
- `[ ]` User receives an `account_approved` notification with message: "Your WareShare account has been approved. You can now access all platform features."
- `[ ]` Approved user can now access approved-only endpoints (e.g., create a booking or listing)

### Idempotency & guards
- `[x]` Approving an already-`approved` user → `200` with message "User already approved" (no duplicate notification)
- `[x]` Approving a `rejected` user → status changes to `approved` *(run 6: RENTER002 was rejected, then re-approved → approval_status=approved)*
- `[-]` Approving a non-existent user ID → `404 NOT_FOUND` — not tested

---

## 5. Reject User

### Happy path
- `[x]` Calling `POST /api/admin/users/:id/reject` on a `pending` user → `approval_status` becomes `rejected`
- `[ ]` User receives an `account_rejected` notification with title "Account Application Declined"
- `[x]` Rejection with a `reason` body → notification message includes the reason text
- `[x]` Rejection without a `reason` body → no crash, default message used

### Post-rejection access enforcement
- `[x]` Rejected user attempts `GET /api/bookings` → `403 REJECTED_ACCOUNT`
- `[-]` Rejected user attempts `POST /api/listings` → not explicitly tested
- `[-]` Rejected user attempts `POST /api/bookings` → not explicitly tested (renter_test was rejected AFTER their bookings were created in main run; the edge cases script tests this on a fresh rejected user)
- `[-]` Rejected user can still call `GET /api/listings` (public browse) — not tested; document expected behavior

### Idempotency & guards
- `[x]` Rejecting an already-`rejected` user → `200` with message "User already rejected" (no duplicate notification)
- `[x]` Rejecting an `approved` user → status changes to `rejected` *(run 6: HOST003 was approved, then rejected → approval_status=rejected)*
- `[-]` Rejecting a non-existent user ID → `404 NOT_FOUND` — not tested

---

## 6. Platform Stats

- `[x]` `GET /api/admin/stats` returns users broken down by `role` (renter / host / admin)
- `[x]` Returns users broken down by `approval_status` (pending / approved / rejected)
- `[x]` Returns listings total and broken down by `availability_status`
- `[x]` Returns bookings total and broken down by `status`
- `[-]` Stats reflect live data — counts verified to be non-zero; exact post-action re-check not automated

---

## 7. Metrics Dashboard (⚠️ DEPLOYMENT REQUIRED)

> **ACTION REQUIRED FOR JULIAN:** The `GET /api/admin/metrics` endpoint has been written in `backend/src/routes/admin.ts` and **confirmed working in local dev (33/33 tests pass)**. The live API at `wareshare-api.juelzlax.workers.dev` still returns `404 NOT_FOUND`. Julian must run `npm run deploy` (i.e., `wrangler deploy`) to push it.

- `[!]` `GET /api/admin/metrics` returns 200 with all metric groups — **FAIL on live API (404, not deployed) — PASS locally ✓**
- `[x]` `GET /api/admin/metrics` called by non-admin user → `403 FORBIDDEN` ✔ *(middleware fires before route resolution)*
- `[ ]` `users` group contains: `total`, `by_role`, `pending`, `new_last_30_days`
- `[ ]` `listings` group contains: `total`, `by_availability`
- `[ ]` `bookings` group contains: `total`, `by_status`, `confirmed`, `in_progress`, `confirmation_rate`
- `[ ]` `revenue` group contains: `total_estimated`, `average_monthly`
- `[ ]` `top_cities` array contains up to 5 entries with `city`, `province`, `listing_count`
- `[ ]` Live data check: counts match current DB state

---

## 8. Downstream Effects of Approval / Rejection

These test cross-system behaviour after admin actions:

- `[-]` Approved host creates a listing → listing is visible in `GET /api/listings` (public search) — not isolated post-approval; seed host (HOST001) was already approved
- `[-]` Rejected host’s existing listings do NOT appear in public search — not tested
- `[-]` Approved host who is then rejected — verify their listing disappears from public results — not tested
- `[-]` Pending renter tries to message on a booking → `403 PENDING_APPROVAL` — not tested

---

## 9. Frontend Integration (when admin UI is built)

- `[ ]` Default view on admin dashboard shows `?approval_status=pending` list
- `[ ]` Approve button calls correct endpoint; row updates inline without page reload
- `[ ]` Reject button presents a reason text field (optional); confirms before submitting
- `[ ]` Stats summary cards on dashboard reflect `GET /api/admin/stats` data
- `[ ]` Metrics cards on `/admin/metrics` load from `GET /api/admin/metrics` once deployed
- `[ ]` Admin can navigate to an individual user record and view their verification document if uploaded
