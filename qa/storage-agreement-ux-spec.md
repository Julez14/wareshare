# WareShare — Storage Agreement UX Specification

**Owner:** Ivan (Product/QA)
**For:** Abdinasir (Frontend implementation)
**Backend data source:** `GET /api/bookings/:id` → `agreement.content` (JSON)
**Last updated:** February 23, 2026

---

## Design Principle

> Do not make the storage agreement feel like a scary legal wall.

The agreement should feel like a **friendly summary of what both parties are agreeing to**, not a dense legal document. Every section has a plain-language summary. Users expand sections to see detail, not the other way around.

---

## Agreement Sections (from backend content JSON)

The backend generates an `agreement.content` JSON object with a `sections` array. Each section has:

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique identifier (e.g. `rental_terms`) |
| `title` | string | Display heading |
| `summary` | string | "What this means for you" — plain language |
| `items` | `{label, value}[]` | Key-value pairs shown inside the section |
| `editable_by_host` | boolean | Whether host can modify this section |
| `freeform` | boolean | Whether it's a free-text field |
| `content` | string | Free-text content (for `notes` section) |

### Section Order

1. **Rental Terms** (`rental_terms`) — always present
2. **Warehouse Details** (`warehouse_details`) — always present
3. **Inventory Declared** (`inventory_declared`) — always present; items may be empty
4. **Fulfillment Options** (`fulfillment_options`) — only present if listing has fulfillment
5. **Standard Platform Terms** (`platform_terms`) — always present
6. **Special Conditions** (`special_conditions`) — always present; items may be empty (host editable)
7. **Additional Notes** (`notes`) — always present; freeform text (host editable)

---

## Layout — Renter & Host Shared View

```
┌─────────────────────────────────────────────┐
│  📄 Storage Agreement                        │
│  Draft generated on [date]  ·  Status badge  │
├─────────────────────────────────────────────┤
│  ▶ Rental Terms                              │  ← collapsed by default
│    "You are agreeing to rent warehouse..."   │  ← summary always visible
├─────────────────────────────────────────────┤
│  ▼ Warehouse Details     [expanded]         │
│    Listing: Burnaby Industrial Unit A        │
│    Size: 5,000 sq ft                         │
│    Location: Burnaby, BC                     │
├─────────────────────────────────────────────┤
│  ▶ Inventory Declared                        │
│    "These are the items you plan to store."  │
├─────────────────────────────────────────────┤
│  ▶ Standard Platform Terms                   │
├─────────────────────────────────────────────┤
│  ▶ Special Conditions    [host editable]     │
│    "The host may add specific conditions."   │
├─────────────────────────────────────────────┤
│  ▶ Additional Notes                          │
├─────────────────────────────────────────────┤
│  [Action area — see below]                   │
└─────────────────────────────────────────────┘
```

### Collapse behaviour
- All sections start **collapsed** except the first unchecked/active one
- Each section header is a clickable accordion row
- When expanded, key-value pairs are shown as a clean list — not a table, not a wall of text
- Use icons to distinguish section types (e.g. 📅 for dates, 📦 for inventory, ⚠️ for special conditions)

### Status badge colours
| Agreement status | Badge |
|-----------------|-------|
| `draft` | Grey — "Draft" |
| `host_edited` | Orange — "Awaiting Your Signature" |
| `fully_accepted` | Green — "Fully Signed" |

---

## Renter View — Action Area

### When `booking.status = agreement_draft`
> Host hasn't reviewed the agreement yet.

```
┌──────────────────────────────────────────────────┐
│  ⏳ Waiting for the host to review this agreement │
│  You will be notified when it's ready to sign.    │
└──────────────────────────────────────────────────┘
```

No signing action is available yet.

---

### When `booking.status = host_edited`
> Host has reviewed and returned the agreement. Renter must review and sign.

```
┌──────────────────────────────────────────────────┐
│  ✏️  The host has updated this agreement.         │
│  Review any changes, especially Special           │
│  Conditions, before signing.                      │
└──────────────────────────────────────────────────┘

[ ] I have read and understood all sections of this
    storage agreement.

[ ] I agree to the rental terms and special conditions
    listed above.

            [Cancel Booking]   [Sign Agreement →]
```

- **Both checkboxes must be checked** before "Sign Agreement" becomes enabled
- "Sign Agreement" calls `POST /api/bookings/:id/agreement/accept`
- After signing, show: "✅ You've signed. Waiting for host to countersign."
- "Cancel Booking" calls `POST /api/bookings/:id/cancel` — show a confirmation modal first

---

### When `booking.status = renter_accepted`
> Renter has signed. Waiting for host.

```
✅ You've signed this agreement.
⏳ Waiting for the host to countersign.
```

---

### When `booking.status = confirmed`
> Both parties have signed.

```
✅ Booking Confirmed
Both parties have signed the agreement.
Signed by renter on [date] · Signed by host on [date]
```

---

## Host View — Action Area

### When `booking.status = agreement_draft`
> Host needs to review and optionally edit before returning to renter.

Show an **"Edit Agreement"** panel (collapsible, below the agreement):

```
┌─── Edit Agreement ────────────────────────────────┐
│                                                    │
│  Special Conditions (one per line)                 │
│  ┌──────────────────────────────────────────────┐ │
│  │ e.g. No access after 8pm                     │ │
│  │ e.g. Loading dock closed on weekends         │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Additional Notes (freeform)                       │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│         [Reject Booking]   [Send to Renter →]      │
└────────────────────────────────────────────────────┘
```

- "Send to Renter" calls `PUT /api/bookings/:id/agreement` with `special_conditions` and `notes`
- Host does NOT sign here — they send it back first
- After saving: "✅ Agreement sent to renter for review."
- "Reject Booking" calls `POST /api/bookings/:id/reject` — confirmation modal with optional reason field

---

### When `booking.status = host_edited` (after sending back, before renter signs)
> Renter has not signed yet. Host can re-edit.

- Show same Edit Agreement panel
- "Send to Renter" re-saves (`PUT /api/bookings/:id/agreement`), booking stays `host_edited`
- Add info banner: "⏳ Waiting for renter to sign."

---

### When `booking.status = renter_accepted`
> Renter has signed. Host must now countersign to confirm.

```
✅ The renter has signed the agreement.
Review it one final time, then sign to confirm the booking.

[ ] I have reviewed this agreement and accept the terms.

        [Reject Booking]   [Sign & Confirm Booking →]
```

- Checkbox required before "Sign & Confirm" is enabled
- "Sign & Confirm" calls `POST /api/bookings/:id/agreement/accept`
- After both sign → booking becomes `confirmed`, calendar block is created

---

### When `booking.status = confirmed`
Same as renter confirmed view — show timestamps for both signatures.

---

## Inventory Section — Empty State

If no inventory items were declared at booking time:

```
📦 No inventory declared yet.
Items will appear here once the renter adds them.
```

---

## QA Acceptance Criteria — Agreement UI

- `[ ]` All sections render from `agreement.content.sections` — no hardcoded section titles
- `[ ]` Sections are collapsed by default; clicking expands/collapses
- `[ ]` "What this means for you" summary is always visible without expanding
- `[ ]` `special_conditions` section with no items shows a friendly note: "No special conditions added."
- `[ ]` Checkboxes are unchecked on initial render; cannot submit without checking both
- `[ ]` "Sign Agreement" button is disabled until all required checkboxes are checked
- `[ ]` After renter signs, the action area changes to "Waiting for host" state without page reload
- `[ ]` After both sign, success banner appears and all action buttons are removed
- `[ ]` Agreement status badge updates to reflect `fully_accepted`
- `[ ]` Timestamps `host_accepted_at` and `renter_accepted_at` are displayed in a human-readable format after signing
- `[ ]` Host's "Edit Agreement" panel is not visible to the renter
- `[ ]` Renter's signing checkboxes are not visible to the host
- `[ ]` On mobile, sections stack vertically; edit panel is full-width
