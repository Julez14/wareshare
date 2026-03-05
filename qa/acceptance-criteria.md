# WareShare MVP — Acceptance Criteria

**Owner:** Ivan (QA/Product)
**For:** Abdinasir (Frontend) to build against; Julian (Backend) for contract confirmation
**Last updated:** February 23, 2026

Each section defines what "done" means for a given screen or feature. These criteria gate milestone sign-off.

---

## 1. Auth — Login Page (`/login`)

**AC-1.1** Form renders with email and password fields.
**AC-1.2** Validation fires on submit: email must be valid format, password must not be empty. Inline error messages appear below the relevant field.
**AC-1.3** On success, the user is redirected based on role:
  - `renter` → `/renter` dashboard
  - `host` → `/host` dashboard
  - `admin` → `/admin` dashboard
**AC-1.4** If the user's `approval_status` is `pending`, they are redirected to a "pending approval" screen (not shown an error).
**AC-1.5** If the user's `approval_status` is `rejected`, a clear message is shown: "Your account was not approved. Please contact support."
**AC-1.6** Invalid credentials show an inline error: "Incorrect email or password."
**AC-1.7** Link to `/signup` is present.

---

## 2. Auth — Signup Page (`/signup`)

**AC-2.1** Form renders with: Full Name, Email, Password, Role selection (Renter / Host).
**AC-2.2** Additional optional fields: Business Registration Number, Website, Phone, Address (city, province, postal code).
**AC-2.3** Role selection is a required field. Selecting "Host" shows an additional prompt: warehouse size, location, permitted storage types (onboarding questionnaire).
**AC-2.4** On submit, the form calls `POST /api/users/sync` with `clerk_id`, `email`, `full_name`, `role`.
**AC-2.5** On success, the user is redirected to a "pending approval" screen regardless of role.
**AC-2.6** If the email is already registered, an error is shown: "An account with this email already exists."
**AC-2.7** Password has a minimum of 8 characters. Validation message appears inline.
**AC-2.8** Link to `/login` is present.

---

## 3. Pending Approval Screen

**AC-3.1** Shown after signup and when an approved user's token resolves to `approval_status: pending`.
**AC-3.2** Message: "Your account is under review. We'll notify you once approved." (friendly tone, not alarming).
**AC-3.3** A logout button is available.
**AC-3.4** No navigation to marketplace or dashboard features is accessible from this screen.

---

## 4. Listings — Search / Browse Page (`/listings`)

**AC-4.1** Listings are fetched from `GET /api/listings` on page load with no auth required.
**AC-4.2** Filter controls are available: City, Province, Min Price, Max Price, Min Size (sqft), Max Size (sqft), Fulfillment Available (toggle).
**AC-4.3** Applying filters updates results without a full page reload.
**AC-4.4** Each listing card shows: title, city, province, price per month, size (sqft), fulfillment badge (if applicable), and a primary photo if available.
**AC-4.5** Full address is NOT shown on listing cards or in search results.
**AC-4.6** Pagination controls are shown when results exceed one page (default 20 per page).
**AC-4.7** Clicking a listing card navigates to `/listings/:id`.
**AC-4.8** An empty state message is shown when no results match the filters.

---

## 5. Listings — Detail Page (`/listings/:id`)

**AC-5.1** Fetches from `GET /api/listings/:id`.
**AC-5.2** Shows: title, city, province, size, price/month, description, features, photos, fulfillment details, min/max rental months.
**AC-5.3** Full address and host email are only visible if the logged-in user is the listing owner or an admin (backend enforces this; frontend should render conditionally).
**AC-5.4** A "Request Booking" button is visible for approved renters only. Unapproved users or unauthenticated users see a prompt to log in / wait for approval.
**AC-5.5** Hosts do not see a "Request Booking" button on their own listings.
**AC-5.6** A read-only availability calendar is shown, reflecting `calendar_blocks` for this listing (blocked dates = grey/unavailable). Calendar only shows blocks from `confirmed` bookings.
**AC-5.7** Photos are displayed in a gallery, ordered by `sort_order`.

---

## 6. Renter — Dashboard (`/renter`)

**AC-6.1** Accessible only to authenticated users with `role: renter` and `approval_status: approved`.
**AC-6.2** Shows a list of the renter's bookings fetched from `GET /api/bookings`.
**AC-6.3** Each booking row shows: listing title, city, dates, status badge, and a link to the booking detail.
**AC-6.4** Status badges use distinct colours:
  - `agreement_draft` → yellow "Awaiting Your Review"
  - `host_edited` → orange "Agreement Updated — Action Required"
  - `renter_accepted` → blue "Awaiting Host Signature"
  - `confirmed` → green "Confirmed"
  - `rejected` → red "Rejected"
  - `cancelled` → grey "Cancelled"
**AC-6.5** A notification indicator is shown when there are unread notifications.
**AC-6.6** Quick link to browse listings is present.

---

## 7. Renter — Booking Request Form

**AC-7.1** Accessible from the listing detail page via "Request Booking."
**AC-7.2** Fields: Start Date, End Date, Space Requested (sqft, optional), Inventory Items (add/remove rows), Fulfillment Request (checkbox + text if listing supports it).
**AC-7.3** Date picker prevents selecting dates that overlap with existing `calendar_blocks` for that listing.
**AC-7.4** Inventory item row fields: Name (required), Type (pallet / box / item), Quantity, Category, SKU, Notes.
**AC-7.5** On submit, calls `POST /api/bookings`. On success, redirects to the booking detail page showing the generated storage agreement.
**AC-7.6** An explanatory note is shown: "Submitting this request will generate a draft storage agreement for the host to review."
**AC-7.7** Validation prevents submission if start date ≥ end date.

---

## 8. Booking Detail Page (Renter view + Host view)

**AC-8.1** Fetches from `GET /api/bookings/:id` — returns booking, agreement, and inventory.
**AC-8.2** Both renter and host views show: listing info, dates, space requested, monthly rate, current status, inventory list.
**AC-8.3** The storage agreement is rendered using the UX spec in [`storage-agreement-ux-spec.md`](storage-agreement-ux-spec.md) (expandable sections, summaries, checkbox).
**AC-8.4** **Host-specific actions:**
  - When status is `agreement_draft` or `host_edited`: "Edit Agreement" form is shown (special conditions, notes).
  - "Reject Booking" button is available (with optional reason text field).
  - "Sign Agreement" button available once editing is done.
**AC-8.5** **Renter-specific actions:**
  - When status is `host_edited`: "Review & Sign" CTA is prominent.
  - When status is `renter_accepted`: message shown — "Waiting for host to sign."
  - "Cancel Booking" button is always available for active bookings.
**AC-8.6** Booking messages thread is shown at the bottom. Any participant can post a message.
**AC-8.7** When status is `confirmed`, a success banner is shown and the "Sign" / "Edit" actions are hidden.

---

## 9. Host — Dashboard (`/host`)

**AC-9.1** Accessible only to authenticated users with `role: host` and `approval_status: approved`.
**AC-9.2** Shows a list of the host's listings with an "Edit" / "Delete" action per listing, and a count of active bookings.
**AC-9.3** Shows a list of incoming booking requests (status `agreement_draft`, `host_edited`, `renter_accepted`) with quick action links.
**AC-9.4** "Create New Listing" button navigates to the listing creation form.
**AC-9.5** Notification indicator for unread notifications.

---

## 10. Host — Create / Edit Listing Form

**AC-10.1** Fields: Title, Description, Address (full), City, Province, Postal Code, Size (sqft), Price/Month, Features (multi-select or tags), Fulfillment Available (toggle), Fulfillment Description, Min/Max Rental Months.
**AC-10.2** Photo upload control — calls `POST /api/uploads/listing-photo` and attaches to the listing.
**AC-10.3** Create calls `POST /api/listings`; edit calls `PUT /api/listings/:id`.
**AC-10.4** Owner can set `availability_status` to `available` or `unavailable`.
**AC-10.5** Delete triggers a confirmation modal, then calls `DELETE /api/listings/:id`.
**AC-10.6** Validation: Title required, Address required, Size > 0, Price > 0.

---

## 11. Admin — Dashboard (`/admin`)

**AC-11.1** Accessible only to `role: admin` users.
**AC-11.2** Shows a table of all users filterable by `role` and `approval_status` (default filter: `pending`).
**AC-11.3** Each row shows: full name, email, role, registration date, approval status.
**AC-11.4** "Approve" and "Reject" buttons on each pending user row.
  - Approve → calls `POST /api/admin/users/:id/approve`
  - Reject → calls `POST /api/admin/users/:id/reject` (optional reason field)
**AC-11.5** Approved/rejected rows update inline without full page reload.
**AC-11.6** A summary count is shown: X pending, Y approved, Z rejected.
**AC-11.7** Admin can click into a user to see their profile details (verification documents if uploaded).

---

## 12. Notifications Panel

**AC-12.1** Accessible from main nav (bell icon with unread badge count).
**AC-12.2** Fetches from `GET /api/notifications`.
**AC-12.3** Each notification shows: title, message, relative timestamp, unread indicator.
**AC-12.4** Clicking a notification marks it as read (`PATCH /api/notifications/:id/read`) and navigates to the related entity (booking, listing etc.) where applicable.
**AC-12.5** "Mark all read" button is available.

---

## 13. Inventory Management Page (within Booking Detail)

**AC-13.1** Renter can add items via `POST /api/bookings/:id/inventory`.
**AC-13.2** Renter can edit existing items via `PUT /api/inventory/:inventoryId`.
**AC-13.3** Renter can delete items via `DELETE /api/inventory/:inventoryId`.
**AC-13.4** Host can view but not edit the renter's inventory.
**AC-13.5** Item types displayed as readable labels: "Pallet", "Box", "Item".

---

## 14. Ship Request Form (within Booking Detail — Renter)

**AC-14.1** Renter can create a ship request via `POST /api/bookings/:id/ship-requests`.
**AC-14.2** Fields: Carrier Name, Tracking Number, Expected Arrival Date, Description.
**AC-14.3** Host sees a list of ship requests for each confirmed booking, with current status badge.
**AC-14.4** Host can update status: `pending` → `acknowledged` → `received`.
**AC-14.5** Status updates notify the renter.
