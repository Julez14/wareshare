# WareShare — Metrics Dashboard Specification

**Owner:** Ivan (QA/Product)
**Route:** `/admin/metrics`
**Access:** `role: admin` only
**Backend endpoint:** `GET /api/admin/metrics`
**Last updated:** February 23, 2026

---

## Purpose

Give the WareShare team (admin) a live view of platform health, user growth, and booking activity at a glance. No manual counting, no spreadsheets.

---

## KPIs Tracked

### 1. User Metrics
| KPI | Source |
|-----|--------|
| Total registered users | `COUNT(users)` |
| Total renters | `COUNT WHERE role = 'renter'` |
| Total hosts | `COUNT WHERE role = 'host'` |
| Pending approval (action needed) | `COUNT WHERE approval_status = 'pending'` |
| New signups in last 30 days | `COUNT WHERE created_at >= now - 30 days` |

### 2. Listing Metrics
| KPI | Source |
|-----|--------|
| Total listings | `COUNT(listings)` |
| Available | `COUNT WHERE availability_status = 'available'` |
| Unavailable / Rented | breakdown by status |

### 3. Booking Metrics
| KPI | Source |
|-----|--------|
| Total bookings | `COUNT(bookings)` |
| Confirmed bookings | `COUNT WHERE status = 'confirmed'` |
| In-progress (agreement flow) | `COUNT WHERE status IN (agreement_draft, host_edited, renter_accepted)` |
| Rejected | `COUNT WHERE status = 'rejected'` |
| Cancelled | `COUNT WHERE status = 'cancelled'` |
| Confirmation rate | `confirmed / total * 100` (%) |

### 4. Revenue (Simulated / Estimated)
| KPI | Source |
|-----|--------|
| Total contracted value | `SUM(monthly_rate * duration_months)` for confirmed bookings |
| Average booking value | `AVG(monthly_rate * duration_months)` for confirmed bookings |

*Note: No real payments exist in MVP. These are estimates based on agreed monthly rates.*

### 5. Geographic Spread
| KPI | Source |
|-----|--------|
| Top 5 cities by listing count | `GROUP BY city ORDER BY count DESC LIMIT 5` |

### 6. Demand Profile 
| KPI | Source |
|-----|--------|
| Average rental duration (days) | `AVG(julianday(end_date) - julianday(start_date))` on `confirmed` bookings |
| Average space requested (sqft) | `AVG(space_requested_sqft)` across all bookings |
| Bookings requiring fulfillment | `COUNT WHERE l.fulfillment_available = 1` via JOIN |
| Bookings storage-only | `COUNT WHERE l.fulfillment_available = 0` via JOIN |

*Note: Search-query logging (e.g. how many times a filter was applied) requires a `search_logs` table not yet in the schema.*

### 7. Listing Vacancy 
| KPI | Source |
|-----|--------|
| Average days until first confirmed booking | Per listing: `MIN(b.confirmed_at) - l.created_at`, averaged over listings with ≥1 confirmed booking |
| Listings never booked | `COUNT listings WHERE NOT EXISTS (confirmed booking)` |

*These two metrics help admin understand demand lag — how quickly new listings attract renters, and how many spaces are sitting idle.*

---

## API Response Shape — `GET /api/admin/metrics`

```json
{
  "users": {
    "total": 45,
    "by_role": { "renter": 30, "host": 15, "admin": 1 },
    "pending_approval": 8,
    "new_last_30_days": 12
  },
  "listings": {
    "total": 20,
    "by_availability": { "available": 15, "unavailable": 3, "rented": 2 }
  },
  "bookings": {
    "total": 50,
    "by_status": {
      "pending_review": 2,
      "agreement_draft": 10,
      "host_edited": 4,
      "renter_accepted": 3,
      "confirmed": 18,
      "rejected": 6,
      "cancelled": 7
    },
    "confirmation_rate": 36,
    "in_progress": 17
  },
  "revenue": {
    "total_contracted_cad": 85000,
    "average_booking_value_cad": 4722
  },
  "top_cities": [
    { "city": "Vancouver", "province": "BC", "listing_count": 5 },
    { "city": "Burnaby", "province": "BC", "listing_count": 3 }
  ],
  "demand": {
    "avg_rental_duration_days": 92,
    "avg_space_requested_sqft": 1400,
    "bookings_by_service_type": {
      "fulfillment": 18,
      "storage_only": 32
    }
  },
  "vacancy": {
    "avg_days_until_first_booking": 14,
    "listings_never_booked": 4
  }
}
```

---

## Page Layout

```
/admin/metrics
┌────────────────────────────────────────────────────────────────────┐
│  Platform Metrics                          [Last refreshed: now]   │
├────────────┬───────────┬────────────────┬──────────────────────────┤
│ Total Users│   Renters │  Hosts         │  Pending Approval ⚠️     │
│    45      │    30     │   15           │         8                │
├────────────┴───────────┴────────────────┴──────────────────────────┤
│  New signups (last 30 days): 12                                    │
├────────────────────────────────────┬───────────────────────────────┤
│  Bookings                          │  Listings                     │
│  Total: 50                         │  Total: 20                    │
│  Confirmation rate: 36%            │  Available: ████████  75%    │
│  ┌ Booking Funnel ──────────────┐  │  Unavailable: ███     15%    │
│  │ Created     ████████████ 50 │  │  Rented: ██           10%    │
│  │ In Progress ███████      17 │  │                               │
│  │ Confirmed   ████         18 │  ├───────────────────────────────┤
│  │ Rejected    ██            6 │  │  Top Cities                   │
│  └──────────────────────────────┘  │  Vancouver, BC   █████  5    │
├────────────────────────────────────┤  Burnaby, BC     ███    3    │
│  Revenue (Simulated)               │  Calgary, AB     ██     2    │
│  💰 Total Contracted: $85,000 CAD  └───────────────────────────────┤
│  📊 Avg Booking Value: $4,722 CAD                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- `[ ]` Page accessible only to `role: admin`; non-admin redirected to their dashboard
- `[ ]` Fetches `GET /api/admin/metrics` on page load
- `[ ]` Stat cards render with correct values from API response
- `[ ]` "Pending Approval" card has a warning colour and links to the users pending list
- `[ ]` Booking funnel bars are proportional to the largest segment (not fixed width)
- `[ ]` Listing availability breakdown shows percentage bars
- `[ ]` Top Cities rendered as a sorted horizontal bar list
- `[ ]` Revenue figures formatted with `$` sign and thousands separator (e.g. `$85,000`)
- `[ ]` Confirmation rate rendered as a `%` integer
- `[ ]` Loading skeleton shown while data is fetching
- `[ ]` Error state shown if API call fails (e.g. "Could not load metrics. Try refreshing.")
- `[ ]` A "Refresh" button re-fetches the data without full page reload
- `[ ]` Revenue section includes a disclaimer: "Simulated values based on agreed rates. No payments processed."
- `[ ]` **Demand Profile section** rendered with: avg rental duration (days), avg space requested (sqft), fulfillment vs storage-only `ProgressBarRow`
- `[ ]` **Listing Vacancy section** rendered with: avg days until first booking, listings-never-booked count; includes note "Vacancy counted from listing creation to first confirmed booking."
- `[ ]` All new stat values are numeric (non-null); zero is rendered as `0` not blank
