#!/usr/bin/env npx tsx
/**
 * WareShare — Edge Case & Gap Tests
 *
 * Supplements test-endpoints.ts by covering guards and edge cases that the
 * main happy-path script does not hit:
 *
 * • Rejected renter blocked from booking
 * • Non-existent listing → 404 on booking create
 * • Unavailable listing → 409 on booking create
 * • Admin approval_status filter
 * • Admin metrics endpoint
 * • Host rejects booking (happy path)
 * • Renter cannot edit agreement (403)
 * • Accept agreement in wrong state → 409
 * • Double-sign guard
 * • Cancel from already-cancelled → 409
 * • Inventory add to rejected booking → 404
 * • Notifications: mark specific IDs as read
 * • Cross-renter isolation: RENTER003 cannot access RENTER001 resources
 *   (third-party booking/inventory/ship-request 403s)
 * • Admin role & approval_status filters
 * • Admin idempotency (approve already-approved, reject already-rejected)
 * • Admin reversed state (approve rejected user, reject approved user)
 * • Ship request: host cannot create, rejected booking guard
 * • Ship request remaining: optional fields, renter GET, notification assertion,
 *   skip-acknowledged direct-to-received
 * • Inventory: defaults (type/quantity), draft booking, host update/delete blocked
 * • Cross-host isolation: HOST003 cannot access HOST001 resources
 */

const BASE_URL =
  process.env.TEST_BASE_URL ?? "https://wareshare-api.juelzlax.workers.dev";

const ADMIN_TOKEN = "Bearer test-admin_test";
const HOST_TOKEN  = "Bearer test-host_test";
const HOST2_TOKEN = "Bearer test-host2_test"; // HOST003 — second approved host
const RENTER_TOKEN = "Bearer test-renter_test";
const RENTER2_TOKEN = "Bearer test-renter2_test"; // RENTER003 — second approved renter
const PENDING_RENTER_TOKEN = "Bearer test-pending_renter_test";

interface TestResult { name: string; passed: boolean; error?: string }
const results: TestResult[] = [];
let currentSuite = "";

function suite(name: string) {
  currentSuite = name;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"═".repeat(60)}`);
}

async function test(name: string, fn: () => Promise<void>) {
  const fullName = `${currentSuite} › ${name}`;
  try {
    await fn();
    results.push({ name: fullName, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: fullName, passed: false, error: msg });
    console.log(`  ✗ ${name}`);
    console.log(`    ${msg}`);
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}
function assertStatus(actual: number, expected: number, body?: unknown) {
  if (actual !== expected)
    throw new Error(`Expected status ${expected}, got ${actual}. Body: ${JSON.stringify(body)}`);
}
function assertCode(body: unknown, expected: string) {
  const b = body as Record<string, unknown>;
  assert(b.code === expected, `expected code ${expected}, got ${b.code}`);
}

async function req(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = opts.token;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body: unknown;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { status: res.status, body };
}

// We'll store IDs created during this run
let edgeBookingId = "";
let edgeCancelledBookingId = "";
let firstNotificationId = "";
let renter1InventoryId = ""; // used by cross-renter isolation suite
let remainingShipRequestId = ""; // used by ship request remaining suite

// ─────────────────────────────────────────────────────────────────────────────
// Global setup: ensure RENTER002 is rejected before any suite runs.
// The "Reversed State Transitions" suite approves RENTER002 at the end of a
// run, so without a reset the Booking Guards suite would see them as approved.
// This call is idempotent: if already rejected it returns 200 "already rejected".
await req("POST", "/api/admin/users/RENTER002/reject", {
  token: ADMIN_TOKEN,
  body: { reason: "Test run setup: ensuring non-approved state" },
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Booking Guards");

await test("Rejected renter cannot create booking (403 REJECTED_ACCOUNT)", async () => {
  // RENTER002 was rejected by the main test script
  const { status, body } = await req("POST", "/api/bookings", {
    token: "Bearer test-pending_renter_test",
    body: { listing_id: "LISTING001", start_date: "2026-09-01", end_date: "2026-11-30" },
  });
  // RENTER002 is pending (the main script approved HOST002, rejected RENTER002)
  // So we get PENDING_APPROVAL or REJECTED_ACCOUNT depending on current state
  assert(status === 403, `expected 403, got ${status}`);
  const code = (body as Record<string, unknown>).code as string;
  assert(
    code === "PENDING_APPROVAL" || code === "REJECTED_ACCOUNT",
    `expected PENDING_APPROVAL or REJECTED_ACCOUNT, got ${code}`
  );
});

await test("Non-existent listing → 404 on booking create", async () => {
  const { status, body } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING_DOES_NOT_EXIST", start_date: "2026-09-01", end_date: "2026-11-30" },
  });
  assertStatus(status, 404, body);
});

await test("Unavailable listing → 409 on booking create", async () => {
  // First, set LISTING002 to unavailable via host
  await req("PUT", "/api/listings/LISTING002", {
    token: HOST_TOKEN,
    body: { availability_status: "unavailable" },
  });
  const { status, body } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING002", start_date: "2026-09-01", end_date: "2026-11-30" },
  });
  assertStatus(status, 409, body);
  // Restore listing
  await req("PUT", "/api/listings/LISTING002", {
    token: HOST_TOKEN,
    body: { availability_status: "available" },
  });
});

await test("start_date missing end_date → 400", async () => {
  const { status, body } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2026-09-01" },
  });
  assertStatus(status, 400, body);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Booking Rejection (happy path)");

// Create a fresh booking to reject
await test("Create fresh booking for rejection test", async () => {
  const { status, body } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2026-10-01", end_date: "2026-12-31" },
  });
  assertStatus(status, 201, body);
  const b = body as Record<string, unknown>;
  edgeBookingId = (b.booking as Record<string, unknown>).id as string;
  assert(typeof edgeBookingId === "string" && edgeBookingId.length > 0, "booking id present");
});

await test("Host rejects booking from agreement_draft → status=rejected", async () => {
  const { status, body } = await req("POST", `/api/bookings/${edgeBookingId}/reject`, {
    token: HOST_TOKEN,
    body: { reason: "Not enough space available for requested dates." },
  });
  assertStatus(status, 200, body);
  const booking = (body as Record<string, unknown>).booking as Record<string, unknown>;
  assert(booking.status === "rejected", `expected rejected, got ${booking.status}`);
  assert(booking.rejected_reason === "Not enough space available for requested dates.", "reason stored");
});

await test("Renter receives booking_rejected notification", async () => {
  const { status, body } = await req("GET", "/api/notifications?unread_only=true", {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const rejected = notifs.find((n) => n.type === "booking_rejected");
  assert(rejected !== undefined, "booking_rejected notification found");
});

await test("Rejection without reason body succeeds (reason=null)", async () => {
  // Create another booking to reject
  const { status: bStatus, body: bBody } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2027-01-01", end_date: "2027-03-31" },
  });
  assertStatus(bStatus, 201, bBody);
  const bId = ((bBody as Record<string, unknown>).booking as Record<string, unknown>).id as string;

  const { status, body } = await req("POST", `/api/bookings/${bId}/reject`, {
    token: HOST_TOKEN,
    body: {},
  });
  assertStatus(status, 200, body);
  const booking = (body as Record<string, unknown>).booking as Record<string, unknown>;
  assert(booking.status === "rejected", "rejected without reason");
});

await test("Cannot reject already-rejected booking (409)", async () => {
  const { status } = await req("POST", `/api/bookings/${edgeBookingId}/reject`, {
    token: HOST_TOKEN,
    body: { reason: "Again" },
  });
  assertStatus(status, 409);
});

await test("Renter cannot call reject endpoint (403)", async () => {
  // Need a fresh rejectable booking — reuse the already-rejected one; expect 403 before 409
  // Actually requireBookingHost fires first, returning 403 before status check
  const { status } = await req("POST", `/api/bookings/${edgeBookingId}/reject`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Agreement State Guards");

// Create a new booking to test agreement guards
let guardBookingId = "";

await test("Create booking for agreement guard tests", async () => {
  const { status, body } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2027-04-01", end_date: "2027-06-30" },
  });
  assertStatus(status, 201, body);
  guardBookingId = ((body as Record<string, unknown>).booking as Record<string, unknown>).id as string;
});

await test("Renter cannot edit agreement (403)", async () => {
  const { status } = await req("PUT", `/api/bookings/${guardBookingId}/agreement`, {
    token: RENTER_TOKEN,
    body: { notes: "Renter trying to edit" },
  });
  assertStatus(status, 403);
});

await test("Accept agreement in agreement_draft state → 409 (host hasn't edited yet)", async () => {
  // Booking is in agreement_draft; accept requires host_edited or renter_accepted
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/agreement/accept`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 409);
});

await test("Host edits agreement → host_edited", async () => {
  const { status, body } = await req("PUT", `/api/bookings/${guardBookingId}/agreement`, {
    token: HOST_TOKEN,
    body: { special_conditions: ["No access on statutory holidays."], notes: "Contact host 24h before arrival." },
  });
  assertStatus(status, 200, body);
  const agreement = (body as Record<string, unknown>).agreement as Record<string, unknown>;
  assert(agreement.status === "host_edited", "agreement host_edited");
});

await test("Renter signs → renter_accepted", async () => {
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/agreement/accept`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 200, body);
  const booking = (body as Record<string, unknown>).booking as Record<string, unknown>;
  assert(
    booking.status === "renter_accepted" || booking.status === "confirmed",
    `got ${booking.status}`
  );
});

await test("Renter double-sign guard → 409", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/agreement/accept`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 409);
});

await test("Host signs → confirmed + fully_accepted", async () => {
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/agreement/accept`, {
    token: HOST_TOKEN,
  });
  assertStatus(status, 200, body);
  const booking = (body as Record<string, unknown>).booking as Record<string, unknown>;
  assert(booking.status === "confirmed", `expected confirmed, got ${booking.status}`);
  const agreement = (body as Record<string, unknown>).agreement as Record<string, unknown>;
  assert(agreement.status === "fully_accepted", "agreement fully_accepted");
  assert(typeof agreement.host_accepted_at === "string", "host_accepted_at timestamp set");
  assert(typeof agreement.renter_accepted_at === "string", "renter_accepted_at timestamp set");
});

await test("Host double-sign guard → 409", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/agreement/accept`, {
    token: HOST_TOKEN,
  });
  assertStatus(status, 409);
});

await test("Cannot edit agreement when confirmed → 409", async () => {
  const { status } = await req("PUT", `/api/bookings/${guardBookingId}/agreement`, {
    token: HOST_TOKEN,
    body: { notes: "Too late" },
  });
  assertStatus(status, 409);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Cancellation Guards");

await test("Cancel from already-cancelled status → 409", async () => {
  // Create a booking then cancel it twice
  const { body: b1 } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2027-07-01", end_date: "2027-09-30" },
  });
  const cancelId = ((b1 as Record<string, unknown>).booking as Record<string, unknown>).id as string;
  edgeCancelledBookingId = cancelId;

  // First cancel
  const { status: s1 } = await req("POST", `/api/bookings/${cancelId}/cancel`, {
    token: RENTER_TOKEN,
  });
  assertStatus(s1, 200);

  // Second cancel
  const { status: s2 } = await req("POST", `/api/bookings/${cancelId}/cancel`, {
    token: RENTER_TOKEN,
  });
  assertStatus(s2, 409);
});

await test("Cancel from rejected status → 409", async () => {
  const { status } = await req("POST", `/api/bookings/${edgeBookingId}/cancel`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 409);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Inventory Guards");

await test("Cannot add inventory to rejected booking → 404", async () => {
  const { status } = await req("POST", `/api/bookings/${edgeBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { name: "Ghost Item", type: "item" },
  });
  assertStatus(status, 404);
});

await test("Cannot add inventory to cancelled booking → 404", async () => {
  const { status } = await req("POST", `/api/bookings/${edgeCancelledBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { name: "Ghost Item", type: "item" },
  });
  assertStatus(status, 404);
});

await test("Missing inventory name → 400", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { type: "pallet" },
  });
  assertStatus(status, 400);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Ship Request Guards");

await test("Renter cannot create ship request on agreement_draft booking → 404", async () => {
  // Create a booking in agreement_draft
  const { body: b } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2027-10-01", end_date: "2027-12-31" },
  });
  const draftId = ((b as Record<string, unknown>).booking as Record<string, unknown>).id as string;
  const { status } = await req("POST", `/api/bookings/${draftId}/ship-requests`, {
    token: RENTER_TOKEN,
    body: { description: "Early ship attempt" },
  });
  assertStatus(status, 404);
});

await test("Invalid ship request status value → 400", async () => {
  // Use the confirmed booking from agreement guard suite
  const { body: srBody } = await req("POST", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: RENTER_TOKEN,
    body: { carrier_name: "UPS", description: "Test shipment" },
  });
  const srId = ((srBody as Record<string, unknown>).ship_request as Record<string, unknown>).id as string;
  const { status } = await req("PUT", `/api/ship-requests/${srId}/status`, {
    token: HOST_TOKEN,
    body: { status: "shipped" }, // invalid
  });
  assertStatus(status, 400);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Admin — Filters & Metrics");

await test("GET /api/admin/users?approval_status=pending — filter by pending", async () => {
  const { status, body } = await req("GET", "/api/admin/users?approval_status=pending", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const users = (body as Record<string, unknown>).users as Record<string, unknown>[];
  assert(
    users.every((u) => u.approval_status === "pending"),
    "all users are pending"
  );
});

await test("GET /api/admin/users?approval_status=approved — filter by approved", async () => {
  const { status, body } = await req("GET", "/api/admin/users?approval_status=approved", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const users = (body as Record<string, unknown>).users as Record<string, unknown>[];
  assert(
    users.every((u) => u.approval_status === "approved"),
    "all users are approved"
  );
});

await test("GET /api/admin/metrics — returns all metric groups", async () => {
  const { status, body } = await req("GET", "/api/admin/metrics", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const b = body as Record<string, unknown>;
  assert(typeof b.users === "object", "users group present");
  assert(typeof b.listings === "object", "listings group present");
  assert(typeof b.bookings === "object", "bookings group present");
  assert(typeof b.revenue === "object", "revenue group present");
  assert(Array.isArray(b.top_cities), "top_cities array present");
  const users = b.users as Record<string, unknown>;
  assert(typeof users.total === "number", "users.total is number");
  assert(typeof users.pending_approval === "number", "pending_approval is number");
  assert(typeof users.new_last_30_days === "number", "new_last_30_days is number");
  const bookings = b.bookings as Record<string, unknown>;
  assert(typeof bookings.confirmation_rate === "number", "confirmation_rate is number");
  assert(typeof bookings.in_progress === "number", "in_progress is number");
  const demand = b.demand as Record<string, unknown>;
  assert(typeof demand === "object" && demand !== null, "demand group present");
  assert(
    demand.avg_rental_duration_days === null || typeof demand.avg_rental_duration_days === "number",
    "avg_rental_duration_days is number or null"
  );
  assert(
    demand.avg_space_requested_sqft === null || typeof demand.avg_space_requested_sqft === "number",
    "avg_space_requested_sqft is number or null"
  );
  const svcType = demand.bookings_by_service_type as Record<string, unknown>;
  assert(typeof svcType.fulfillment === "number", "fulfillment count is number");
  assert(typeof svcType.storage_only === "number", "storage_only count is number");
  const vacancy = b.vacancy as Record<string, unknown>;
  assert(typeof vacancy === "object" && vacancy !== null, "vacancy group present");
  assert(
    vacancy.avg_days_until_first_booking === null || typeof vacancy.avg_days_until_first_booking === "number",
    "avg_days_until_first_booking is number or null"
  );
  assert(typeof vacancy.listings_never_booked === "number", "listings_never_booked is number");
});

await test("GET /api/admin/metrics — non-admin gets 403", async () => {
  const { status } = await req("GET", "/api/admin/metrics", { token: HOST_TOKEN });
  assertStatus(status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Notifications — Mark Specific IDs");

await test("GET /api/notifications — fetch to get a notification ID", async () => {
  const { status, body } = await req("GET", "/api/notifications", { token: RENTER_TOKEN });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  if (notifs.length > 0) {
    firstNotificationId = notifs[0].id as string;
  }
  assert(true, "fetched notifications");
});

await test("POST /api/notifications/read — mark specific notification IDs as read", async () => {
  if (!firstNotificationId) {
    console.log("    (skipped — no notifications to mark)");
    return;
  }
  const { status, body } = await req("POST", "/api/notifications/read", {
    token: RENTER_TOKEN,
    body: { notification_ids: [firstNotificationId] },
  });
  assertStatus(status, 200, body);
  const b = body as Record<string, unknown>;
  assert(typeof b.message === "string", "message returned");
});

await test("POST /api/notifications/read — no payload → 400", async () => {
  const { status } = await req("POST", "/api/notifications/read", {
    token: RENTER_TOKEN,
    body: {},
  });
  assertStatus(status, 400);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Cross-Renter Isolation");
// guardBookingId is RENTER001's confirmed booking (from Agreement State Guards suite)
// RENTER003 (renter2_test) must not be able to access any of its resources.

await test("RENTER003 cannot GET RENTER001's booking → 403", async () => {
  const { status } = await req("GET", `/api/bookings/${guardBookingId}`, {
    token: RENTER2_TOKEN,
  });
  assertStatus(status, 403);
});

await test("RENTER003 cannot cancel RENTER001's booking → 403", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/cancel`, {
    token: RENTER2_TOKEN,
  });
  assertStatus(status, 403);
});

await test("Setup: RENTER001 adds inventory item to their confirmed booking", async () => {
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { name: "Ownership Test Box", type: "item", quantity: 2 },
  });
  assertStatus(status, 201, body);
  renter1InventoryId = ((body as Record<string, unknown>).item as Record<string, unknown>).id as string;
  assert(renter1InventoryId.length > 0, "inventory id captured");
});

await test("RENTER003 cannot GET RENTER001's inventory → 403", async () => {
  const { status } = await req("GET", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER2_TOKEN,
  });
  assertStatus(status, 403);
});

await test("RENTER003 cannot add inventory to RENTER001's booking → 403", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER2_TOKEN,
    body: { name: "Unauthorized Item", type: "item" },
  });
  assertStatus(status, 403);
});

await test("RENTER003 cannot update RENTER001's inventory item → 403", async () => {
  const { status } = await req("PUT", `/api/inventory/${renter1InventoryId}`, {
    token: RENTER2_TOKEN,
    body: { name: "Hacked Name" },
  });
  assertStatus(status, 403);
});

await test("RENTER003 cannot delete RENTER001's inventory item → 403", async () => {
  const { status } = await req("DELETE", `/api/inventory/${renter1InventoryId}`, {
    token: RENTER2_TOKEN,
  });
  assertStatus(status, 403);
});

await test("RENTER003 cannot create ship request on RENTER001's booking → 404 (renter_id scoped)", async () => {
  // Backend query for ship request creation filters: booking.renter_id = user.id
  // So RENTER003 just gets NOT_FOUND, not FORBIDDEN
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: RENTER2_TOKEN,
    body: { description: "Unauthorized ship" },
  });
  assertStatus(status, 404);
});

await test("RENTER003 cannot GET RENTER001's ship requests → 403", async () => {
  const { status } = await req("GET", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: RENTER2_TOKEN,
  });
  assertStatus(status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Admin — Role Filter & Status Filter");

await test("GET /api/admin/users?role=renter — all results have role=renter", async () => {
  const { status, body } = await req("GET", "/api/admin/users?role=renter", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const users = (body as Record<string, unknown>).users as Record<string, unknown>[];
  assert(users.length > 0, "at least one renter exists");
  assert(users.every((u) => u.role === "renter"), "all results have role=renter");
});

await test("Setup: reject RENTER002 to populate rejected state", async () => {
  const { status, body } = await req("POST", "/api/admin/users/RENTER002/reject", {
    token: ADMIN_TOKEN,
    body: { reason: "Failed verification" },
  });
  assertStatus(status, 200, body);
  const user = (body as Record<string, unknown>).user as Record<string, unknown>;
  assert(user.approval_status === "rejected", "RENTER002 is now rejected");
});

await test("GET /api/admin/users?approval_status=rejected — all results are rejected", async () => {
  const { status, body } = await req("GET", "/api/admin/users?approval_status=rejected", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const users = (body as Record<string, unknown>).users as Record<string, unknown>[];
  assert(users.length > 0, "at least one rejected user exists");
  assert(
    users.every((u) => u.approval_status === "rejected"),
    "all results have approval_status=rejected"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Admin — Idempotency");

await test("Approve HOST001 (already approved) → 200 with idempotent message", async () => {
  const { status, body } = await req("POST", "/api/admin/users/HOST001/approve", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const b = body as Record<string, unknown>;
  assert(
    (b.message as string).toLowerCase().includes("already approved"),
    `expected 'already approved' in message, got: ${b.message}`
  );
});

await test("Reject RENTER002 again (already rejected) → 200 with idempotent message", async () => {
  // RENTER002 was rejected in the previous suite setup step
  const { status, body } = await req("POST", "/api/admin/users/RENTER002/reject", {
    token: ADMIN_TOKEN,
    body: { reason: "Trying again" },
  });
  assertStatus(status, 200, body);
  const b = body as Record<string, unknown>;
  assert(
    (b.message as string).toLowerCase().includes("already rejected"),
    `expected 'already rejected' in message, got: ${b.message}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Ship Request — Host Cannot Create");

await test("Host attempts to create ship request on their own booking → 403", async () => {
  // guardBookingId is HOST001's confirmed booking — hosts cannot create ship requests
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: HOST_TOKEN,
    body: { carrier_name: "FedEx", description: "Host trying to ship" },
  });
  assertStatus(status, 403, body);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Inventory — Remaining Guards");
// renter1InventoryId was created in the Cross-Renter Isolation suite

await test("PUT /api/inventory/:id with empty body → 400 (no valid fields)", async () => {
  const { status, body } = await req("PUT", `/api/inventory/${renter1InventoryId}`, {
    token: RENTER_TOKEN,
    body: {},
  });
  assertStatus(status, 400, body);
  assertCode(body, "VALIDATION_ERROR");
});

await test("PUT /api/inventory/nonexistent → 404 NOT_FOUND", async () => {
  const { status, body } = await req("PUT", "/api/inventory/INVENTORY_DOES_NOT_EXIST", {
    token: RENTER_TOKEN,
    body: { name: "Ghost" },
  });
  assertStatus(status, 404, body);
  assertCode(body, "NOT_FOUND");
});

await test("DELETE /api/inventory/nonexistent → 404 NOT_FOUND", async () => {
  const { status, body } = await req("DELETE", "/api/inventory/INVENTORY_DOES_NOT_EXIST", {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 404, body);
  assertCode(body, "NOT_FOUND");
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Notification — Event Assertions");
// guardBookingId went through the full agreement state machine:
//   host edited → agreement_ready (→ renter)
//   renter signed → agreement_signed (→ host)
//   host signed → booking_approved (→ both)

await test("Renter received agreement_ready notification after host edited", async () => {
  const { status, body } = await req("GET", "/api/notifications", { token: RENTER_TOKEN });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "agreement_ready");
  assert(found !== undefined, "agreement_ready notification found for renter");
});

await test("Host received agreement_signed notification after renter signed", async () => {
  const { status, body } = await req("GET", "/api/notifications", { token: HOST_TOKEN });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "agreement_signed");
  assert(found !== undefined, "agreement_signed notification found for host");
});

await test("Renter received booking_approved notification after full confirmation", async () => {
  const { status, body } = await req("GET", "/api/notifications", { token: RENTER_TOKEN });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "booking_approved");
  assert(found !== undefined, "booking_approved notification found for renter");
});

await test("Host received booking_approved notification after full confirmation", async () => {
  const { status, body } = await req("GET", "/api/notifications", { token: HOST_TOKEN });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "booking_approved");
  assert(found !== undefined, "booking_approved notification found for host");
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Cross-Host Isolation");
// HOST003 (host2_test) has no listings/bookings — must be blocked from HOST001's resources

await test("HOST003 cannot GET a booking they are not party to → 403", async () => {
  const { status } = await req("GET", `/api/bookings/${guardBookingId}`, {
    token: HOST2_TOKEN,
  });
  assertStatus(status, 403);
});

await test("HOST003 cannot reject HOST001's booking → 403", async () => {
  const { status } = await req("POST", `/api/bookings/${guardBookingId}/reject`, {
    token: HOST2_TOKEN,
    body: { reason: "Unauthorized reject" },
  });
  assertStatus(status, 403);
});

await test("HOST003 cannot edit HOST001's storage agreement → 403", async () => {
  const { status } = await req("PUT", `/api/bookings/${guardBookingId}/agreement`, {
    token: HOST2_TOKEN,
    body: { notes: "Unauthorized edit" },
  });
  assertStatus(status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Inventory — Defaults & Remaining Edge Cases");
// renter1InventoryId is RENTER001's item on guardBookingId (confirmed)

await test("Item created with only name — type defaults to 'item', quantity defaults to 1", async () => {
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { name: "Bare Minimum Box" },
  });
  assertStatus(status, 201, body);
  const item = (body as Record<string, unknown>).item as Record<string, unknown>;
  assert(item.type === "item", `expected type='item', got '${item.type}'`);
  assert(item.quantity === 1, `expected quantity=1, got ${item.quantity}`);
});

await test("Add inventory to agreement_draft booking → 201", async () => {
  // Create a fresh booking that is in agreement_draft (not advanced)
  const { status: bStatus, body: bBody } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2028-01-01", end_date: "2028-03-31" },
  });
  assertStatus(bStatus, 201, bBody);
  const draftBookingId = ((bBody as Record<string, unknown>).booking as Record<string, unknown>).id as string;
  assert((bBody as Record<string, unknown>).booking !== null, "draft booking created");

  const { status, body } = await req("POST", `/api/bookings/${draftBookingId}/inventory`, {
    token: RENTER_TOKEN,
    body: { name: "Draft Stage Item", type: "pallet", quantity: 5 },
  });
  assertStatus(status, 201, body);
  const item = (body as Record<string, unknown>).item as Record<string, unknown>;
  assert(item.name === "Draft Stage Item", "item name correct");

  // Verify GET returns empty list on a booking that has only 1 item — also proves non-empty case
  const { status: gStatus, body: gBody } = await req("GET", `/api/bookings/${draftBookingId}/inventory`, {
    token: RENTER_TOKEN,
  });
  assertStatus(gStatus, 200, gBody);
  const items = (gBody as Record<string, unknown>).inventory as unknown[];
  assert(Array.isArray(items), "inventory is array");
  assert(items.length === 1, `expected 1 item, got ${items.length}`);
});

await test("GET inventory on booking with no items → empty array (not error)", async () => {
  // Create a booking but add no inventory
  const { body: bBody } = await req("POST", "/api/bookings", {
    token: RENTER_TOKEN,
    body: { listing_id: "LISTING001", start_date: "2028-04-01", end_date: "2028-06-30" },
  });
  const emptyBookingId = ((bBody as Record<string, unknown>).booking as Record<string, unknown>).id as string;

  const { status, body } = await req("GET", `/api/bookings/${emptyBookingId}/inventory`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 200, body);
  const items = (body as Record<string, unknown>).inventory as unknown[];
  assert(Array.isArray(items) && items.length === 0, `expected empty array, got ${JSON.stringify(items)}`);
});

await test("Host cannot update renter's inventory item → 403", async () => {
  const { status } = await req("PUT", `/api/inventory/${renter1InventoryId}`, {
    token: HOST_TOKEN,
    body: { name: "Host Overwrite Attempt" },
  });
  assertStatus(status, 403);
});

await test("Host cannot delete renter's inventory item → 403", async () => {
  const { status } = await req("DELETE", `/api/inventory/${renter1InventoryId}`, {
    token: HOST_TOKEN,
  });
  assertStatus(status, 403);
});

await test("updated_at is refreshed on inventory update", async () => {
  // Fetch current state
  const { body: before } = await req("GET", `/api/bookings/${guardBookingId}/inventory`, {
    token: RENTER_TOKEN,
  });
  const items = (before as Record<string, unknown>).inventory as Record<string, unknown>[];
  const target = items.find((i) => i.id === renter1InventoryId);
  assert(target !== undefined, "target item found");
  const updatedAtBefore = target!.updated_at as string;

  // Wait 1s to ensure timestamp differs
  await new Promise((r) => setTimeout(r, 1000));

  const { status, body: after } = await req("PUT", `/api/inventory/${renter1InventoryId}`, {
    token: RENTER_TOKEN,
    body: { notes: "timestamp refresh test" },
  });
  assertStatus(status, 200, after);
  const updatedItem = (after as Record<string, unknown>).item as Record<string, unknown>;
  assert(
    updatedItem.updated_at !== updatedAtBefore,
    `updated_at should have changed (before=${updatedAtBefore}, after=${updatedItem.updated_at})`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Ship Request — Remaining Edge Cases");

await test("Ship request on rejected booking → 404", async () => {
  // edgeBookingId was rejected by the host in the Booking Rejection suite
  const { status } = await req("POST", `/api/bookings/${edgeBookingId}/ship-requests`, {
    token: RENTER_TOKEN,
    body: { description: "Should not work on rejected booking" },
  });
  assertStatus(status, 404);
});

await test("Optional ship request fields default to null when not provided", async () => {
  const { status, body } = await req("POST", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: RENTER_TOKEN,
    body: { description: "Minimal ship request" },
  });
  assertStatus(status, 201, body);
  const sr = (body as Record<string, unknown>).ship_request as Record<string, unknown>;
  assert(sr.carrier_name === null, `carrier_name should be null, got ${sr.carrier_name}`);
  assert(sr.tracking_number === null, `tracking_number should be null, got ${sr.tracking_number}`);
  assert(sr.expected_arrival_date === null, `expected_arrival_date should be null, got ${sr.expected_arrival_date}`);
  remainingShipRequestId = sr.id as string;
  assert(remainingShipRequestId.length > 0, "ship request id captured");
});

await test("Renter can GET their own ship requests", async () => {
  const { status, body } = await req("GET", `/api/bookings/${guardBookingId}/ship-requests`, {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 200, body);
  const requests = (body as Record<string, unknown>).ship_requests as unknown[];
  assert(Array.isArray(requests), "ship_requests is array");
  assert(requests.length > 0, "at least one ship request returned");
});

await test("Host receives ship_request_created notification", async () => {
  const { status, body } = await req("GET", "/api/notifications?unread_only=false", {
    token: HOST_TOKEN,
  });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "ship_request_created");
  assert(found !== undefined, "ship_request_created notification found for host");
});

await test("Host can skip acknowledged and set status directly to received", async () => {
  // Backend has no sequential enforcement — this should succeed
  const { status, body } = await req("PUT", `/api/ship-requests/${remainingShipRequestId}/status`, {
    token: HOST_TOKEN,
    body: { status: "received", notes: "Skipped acknowledged intentionally" },
  });
  assertStatus(status, 200, body);
  const sr = (body as Record<string, unknown>).ship_request as Record<string, unknown>;
  assert(sr.status === "received", `expected received, got ${sr.status}`);
  assert(sr.acknowledged_at === null, `acknowledged_at should still be null (skipped), got ${sr.acknowledged_at}`);
  assert(typeof sr.received_at === "string", "received_at timestamp set");
});

await test("Renter receives ship_request_updated notification", async () => {
  const { status, body } = await req("GET", "/api/notifications", {
    token: RENTER_TOKEN,
  });
  assertStatus(status, 200, body);
  const notifs = (body as Record<string, unknown>).notifications as Record<string, unknown>[];
  const found = notifs.find((n) => n.type === "ship_request_updated");
  assert(found !== undefined, "ship_request_updated notification found for renter");
});

// ─────────────────────────────────────────────────────────────────────────────
suite("Admin — Reversed State Transitions");
// Tests that approval changes can be reversed (no one-way lock)

await test("Approve a rejected user (RENTER002) → approval_status becomes approved", async () => {
  // RENTER002 was rejected in the Admin Role Filter suite
  const { status, body } = await req("POST", "/api/admin/users/RENTER002/approve", {
    token: ADMIN_TOKEN,
  });
  assertStatus(status, 200, body);
  const user = (body as Record<string, unknown>).user as Record<string, unknown>;
  assert(
    user.approval_status === "approved",
    `expected approved, got ${user.approval_status}`
  );
});

await test("Reject an approved user (HOST003) → approval_status becomes rejected", async () => {
  // HOST003 is seeded as approved and has no live bookings
  const { status, body } = await req("POST", "/api/admin/users/HOST003/reject", {
    token: ADMIN_TOKEN,
    body: { reason: "Testing reversed state transition" },
  });
  assertStatus(status, 200, body);
  const user = (body as Record<string, unknown>).user as Record<string, unknown>;
  assert(
    user.approval_status === "rejected",
    `expected rejected, got ${user.approval_status}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`\n${"═".repeat(60)}`);
console.log(`  RESULTS: ${passed}/${total} passed  |  ${failed} failed`);
console.log(`${"═".repeat(60)}`);

if (failed > 0) {
  console.log("\nFailed tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  ✗ ${r.name}`);
      if (r.error) console.log(`    ${r.error}`);
    });
  process.exit(1);
} else {
  console.log("\nAll edge case tests passed!");
  process.exit(0);
}
