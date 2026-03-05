# WareShare QA & Product — Ivan

This folder contains all QA deliverables for the WareShare MVP.

## Documents

| File | Purpose |
|------|---------|
| [acceptance-criteria.md](acceptance-criteria.md) | "Done" definition for every screen/feature — for Abdinasir to build against |
| [checklist-booking-system.md](checklist-booking-system.md) | Test cases for the full booking lifecycle and state machine |
| [checklist-admin-workflows.md](checklist-admin-workflows.md) | Test cases for admin approval/rejection and platform oversight |
| [checklist-inventory-ship-requests.md](checklist-inventory-ship-requests.md) | Test cases for inventory CRUD and ship request workflow |
| [storage-agreement-ux-spec.md](storage-agreement-ux-spec.md) | UX spec for the storage agreement UI (structure, copy, signing flow) |
| [metrics-dashboard-spec.md](metrics-dashboard-spec.md) | KPI dashboard spec — layout, API shape, acceptance criteria |

## Status Legend (used in checklists)

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not yet tested |
| `[x]` | Pass |
| `[!]` | Fail — bug filed |
| `[-]` | Blocked / not yet implemented |

## Backend API base URL

- **Dev:** `http://localhost:8787/api`
- **Prod:** `https://wareshare-api.juelzlax.workers.dev/api`

Auth header format: `Authorization: Bearer test-<clerk_user_id>` (dev)

Full API reference: [`backend/docs/API_GUIDE.md`](../backend/docs/API_GUIDE.md)
Schema reference: [`backend/docs/SCHEMA.md`](../backend/docs/SCHEMA.md)
