# Database Schema

## Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | ULID |
| clerk_id | TEXT UNIQUE | Clerk auth ID |
| email | TEXT UNIQUE | |
| full_name | TEXT | |
| role | TEXT | `renter` `host` `admin` |
| approval_status | TEXT | `pending` `approved` `rejected` |
| business_reg_number | TEXT | |
| website | TEXT | |
| address | TEXT | |
| city | TEXT | |
| province | TEXT | |
| postal_code | TEXT | |
| phone | TEXT | |
| profile_photo_key | TEXT | R2 key |
| verification_doc_key | TEXT | R2 key |
| created_at / updated_at | TEXT | ISO 8601 |

---

### `listings`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | ULID |
| host_id | TEXT FK | → users |
| title | TEXT | |
| description | TEXT | |
| address | TEXT | Hidden from renters in API |
| city / province / postal_code / country | TEXT | |
| lat / lng | REAL | |
| size_sqft | INTEGER | |
| price_per_month | REAL | |
| currency | TEXT | Default `CAD` |
| features | TEXT | JSON array |
| availability_status | TEXT | `available` `unavailable` `rented` |
| fulfillment_available | INTEGER | 0 or 1 |
| fulfillment_description | TEXT | |
| min_rental_months / max_rental_months | INTEGER | |
| created_at / updated_at | TEXT | |

---

### `listing_photos`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| listing_id | TEXT FK | → listings |
| r2_key | TEXT | R2 object key |
| sort_order | INTEGER | |
| created_at | TEXT | |

---

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | ULID |
| listing_id | TEXT FK | → listings |
| renter_id | TEXT FK | → users |
| host_id | TEXT FK | → users |
| start_date / end_date | TEXT | YYYY-MM-DD |
| space_requested_sqft | INTEGER | |
| monthly_rate | REAL | Snapshot of price at booking time |
| status | TEXT | See lifecycle below |
| rejected_reason | TEXT | |
| cancelled_by | TEXT FK | → users |
| cancelled_at / confirmed_at | TEXT | |
| created_at / updated_at | TEXT | |

**Booking status lifecycle:**
```
pending_review → agreement_draft → host_edited → renter_accepted → confirmed
                                 ↘ rejected
                                 ↘ cancelled
```

---

### `storage_agreements`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| booking_id | TEXT FK UNIQUE | → bookings |
| content | TEXT | Structured JSON (sections array) |
| status | TEXT | `draft` `host_edited` `fully_accepted` |
| host_accepted_at | TEXT | Timestamp of host signature |
| renter_accepted_at | TEXT | Timestamp of renter signature |
| created_at / updated_at | TEXT | |

---

### `inventory_items`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| booking_id | TEXT FK | → bookings |
| renter_id | TEXT FK | → users |
| name | TEXT | |
| type | TEXT | `pallet` `box` `item` |
| sku | TEXT | |
| quantity | INTEGER | |
| category | TEXT | |
| dimensions | TEXT | |
| weight_kg | REAL | |
| notes | TEXT | |
| created_at / updated_at | TEXT | |

---

### `ship_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| booking_id | TEXT FK | → bookings |
| renter_id | TEXT FK | → users |
| carrier_name | TEXT | |
| tracking_number | TEXT | |
| expected_arrival_date | TEXT | |
| description | TEXT | |
| status | TEXT | `pending` `acknowledged` `received` |
| acknowledged_at / received_at | TEXT | |
| notes | TEXT | |
| created_at / updated_at | TEXT | |

---

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| user_id | TEXT FK | → users |
| type | TEXT | `booking_request` `booking_approved` `booking_rejected` `booking_cancelled` `agreement_ready` `agreement_signed` `message_received` `ship_request_created` `ship_request_updated` `account_approved` `account_rejected` `system` |
| title | TEXT | |
| message | TEXT | |
| related_entity_type | TEXT | e.g. `booking` `ship_request` |
| related_entity_id | TEXT | |
| is_read | INTEGER | 0 or 1 |
| created_at | TEXT | |

---

### `booking_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| booking_id | TEXT FK | → bookings |
| sender_id | TEXT FK | → users |
| content | TEXT | |
| created_at | TEXT | |

---

### `calendar_blocks`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| listing_id | TEXT FK | → listings |
| booking_id | TEXT FK | → bookings (nullable) |
| start_date / end_date | TEXT | |
| reason | TEXT | Default `booking` |
| created_at | TEXT | |

> Created automatically when a booking is `confirmed`. Deleted on cancellation.
