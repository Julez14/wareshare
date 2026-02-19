---
title: WareShare MVP --- Team Charter, Deliverables, PRD, & User Workflows
---

# Project Objective

Build a **web-based warehouse sharing marketplace MVP** where warehouse owners can list space and renters can book storage. The MVP focuses on:

- Core marketplace functionality
- Secure user interactions and data access
- Demo-ready workflows suitable for Riipen evaluation

Advanced features (full payment, logistics automation, real-time chat) are **out of scope**.

# MVP Deliverables

## Core Features

1. **User & Host Management**
   - Secure registration and authentication
   - Role-based access (renter, host)
   - **Admin dashboard** to approve/reject new users

2. **Warehouse Listings & Search**
   - Create, edit, delete listings
   - Search and filtering by size, location, price
   - Display availability

3. **Booking System**
   - Request/approval workflow with Storage Agreement (pending → approved → rejected)
   - Dashboards for renters and owners
   - Basic calendar visualization (read-only / availability flags)

4. **Messaging / Request Notes**
   - Comment field tied to booking requests
   - Status notifications (approved/rejected)
   - Limited to booking-related communication

5. **Inventory Management & Ship Requests**
   - Renters can list items they plan to store
   - Owners can view incoming inventory per booking
   - Basic "ship request" workflow (manual, MVP-safe)

6. **Backend Security**
   - Cloudflare Workers & Cloudflare D1
   - Row Level Security (RLS) for all tables
   - Permission enforcement based on roles

## Out of Scope

- Payment processing or transaction handling
- Real-time messaging / threaded chat
- Advanced inventory optimization or logistics automation
- Multi-admin roles or complex analytics dashboards

# Student Role Summaries & Responsibilities

**Julian --- Backend & Architecture Lead**

**Skills Leveraged:** TypeScript, Node.js, Cloudflare Workers, Cloudflare D1, RLS, security rules, API design

**Responsibilities:**

- Design database schema for users, bookings, inventory, messaging
- Implement Row Level Security for all tables
- Build booking system logic: state transitions, approval/rejection, basic validation
- Build inventory and ship request backend logic
- Support admin dashboard approvals logic
- Ensure data integrity and security
- Coordinate with Abdinasir on API contracts

**Deliverables**:

- Cloudflare tables & RLS rules
- Backend API endpoints for bookings, inventory, messaging, and admin approval
- Documentation for schema and RLS rules

**Abdinasir --- Frontend Lead**

**Skills Leveraged:** React, Next.js, TypeScript, Tailwind CSS, calendar UI, dashboards

**Responsibilities:**

- Build all frontend components: dashboards, forms, search, listings
- Implement booking calendar visualization
- Storage agreement
- Implement messaging / request notes UI
- Build inventory management UI and ship request flows
- Build admin dashboard for approving hosts/renters
- Coordinate with Julian to consume APIs securely

**Deliverables:**

- Fully functional user-facing dashboards and forms
- Calendar view for bookings
- Storage Agreement
- Inventory & ship request UI
- Admin approval dashboard UI

**Ivan --- Product & QA Lead**

**Skills Leveraged:** React, Django, Python, QA, product validation, testing, documentation

**Responsibilities:**

- Define acceptance criteria for each feature
- Test booking system, messaging, inventory, and admin workflows
- Ensure edge cases are handled: overlapping bookings, unapproved users, inventory conflicts
- Validate UX and workflow clarity
- Support documentation for Riipen submission
- Coordinate feedback between Candidates 1 & 2

**Deliverables:**

- QA checklists and validation reports
- Feature validation documentation
- Riipen-ready reflections and learning summaries

**April**

**Responsibilities:**

- Define MVP vision and scope
- Review milestones and approve deliverables
- Act as initial admin for Cloudflare
- Coordinate with Riipen for evaluation

# Proposed Weekly Milestone Plan (8 Weeks)

| **Week** | **Goals / Deliverables**                                                             |
| -------- | ------------------------------------------------------------------------------------ |
| **1**    | Kickoff: setup Cloudflare, GitHub, project boards; define user stories; assign tasks |
| **2**    | User & host management MVP; backend auth & RLS; frontend registration/login forms    |
| **3**    | Admin dashboard: approve/reject users; dashboards skeleton setup                     |
| **4**    | Warehouse listings CRUD + search/filter MVP                                          |
| **5**    | Booking system backend + frontend integration; status workflow MVP                   |
| **6**    | Booking calendar visualization; messaging/comments tied to bookings                  |
| **7**    | Inventory system MVP + basic ship request workflow                                   |
| **8**    | QA & testing, bug fixes, final documentation, Riipen deliverables, demo prep         |

Each week includes check-ins, peer reviews, and documentation updates.

# Riipen Deliverables

1. **Functional MVP platform** with:
   - Authenticated renter/host accounts
   - Admin approval workflow
   - Listings, search, dashboards
   - Booking system + calendar
   - Messaging/comments for bookings
   - Inventory tracking & basic ship requests

2. **Technical Documentation**
   - Architecture diagrams
   - Database schema + RLS explanation
   - Feature-specific implementation notes

3. **Demo / Presentation**
   - Walkthrough of all workflows
   - Screenshots or video of demo
   - Reflections & key learnings

4. **Project Management Artifacts**
   - Task board / backlog with completion tracking
   - Weekly milestone summary
   - QA checklist (by Ivan)

# Governance & Access

- **Cloudflare Owner:** Founder
- **Backend / Frontend Developers:** Julian (full backend), Abdinasir (frontend API access)
- **QA / Product Oversight:** Ivan (testing access)

**Rules:**

- Backend logic changes require Julian approval
- Frontend changes must respect API contracts
- Workflows validated by Ivan before marking milestones complete

---

# WareShare MVP --- PRD

**Project Name:** WareShare MVP  
**Owner:** April Goode Khan  
**Team:** Julian (Backend), Abdinasir (Frontend), Ivan (QA/Product)  
**Date:** February 8, 2026

## 1. Database Choice

- Use a relational database like Cloudflare D1 for structured data and relational integrity.
- MongoDB is optional if flexible inventory hierarchies are needed.

## 2. Core Data Models and Storage Needs

| **Model**              | **Description / Student Focus**                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Users**              | Authentication credentials, role (Renter, Host, Admin), profile info, verification documents  |
| **Hosts**              | Warehouse listing info: location, size, pricing, features, photos, availability               |
| **Warehouse Listings** | CRUD operations: available space, fulfillment options, pricing, real-time updates             |
| **Inventory**          | Basic hierarchy: pallets → boxes → items; SKU, quantity, category; CSV bulk upload optional   |
| **Bookings**           | Start/end dates, requested space, booking status, associated user/host IDs, Storage Agreement |
| **Transactions**       | Payment status (simulate Stripe or stub for MVP)                                              |
| **Notifications**      | Messages about bookings, inventory, or admin updates                                          |

## 3. File Storage

- Photos for listings and optional uploaded documents (for host verification)
- Secure storage using Cloudflare R2
- Encryption for sensitive documents optional for MVP

## 4. Security & Compliance

- Sensitive documents accessible only to Admin
- Role-based access control for Renter, Host, and Admin
- Authentication via Clerk

## 5. Scalability & Performance

- Efficient queries for listing search and filtering
- Calendar reflects booking approvals dynamically
- Optional: index frequently queried fields

## 6. Backups & Disaster Recovery

- Students should simulate saving data periodically

## 7. Backend & API Spec Essentials

**Tech Stack Suggestions**

- Frontend: React / Next.js
- Backend: Cloudflare Workers
- Authentication: Clerk
- File Storage: Cloudflare R2
- Payments: Optional Stripe stub

**Key Backend Modules / Responsibilities:**

| **Module**        | **Student Responsibility**                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth              | Renter/Host signup, login, role access                                                                                                                                          |
| Users             | Profile & inventory management                                                                                                                                                  |
| Hosts             | Listing CRUD, booking approvals, calendar                                                                                                                                       |
| Listings          | CRUD, search/filter                                                                                                                                                             |
| Bookings          | Create booking, approval workflow, status updates                                                                                                                               |
| Storage Agreement | Autogenerate agreement when booking request, stored as text in DB, status field (draft, host edited, fully accepted), host_approved_at time stamp, renter_accepted_at timestamp |
| Inventory         | CRUD, CSV upload optional                                                                                                                                                       |
| Notifications     | In-app messages, booking alerts                                                                                                                                                 |
| Admin             | Approve users, view dashboard, simulate verification                                                                                                                            |

**Example API Endpoints:**

| **Endpoint**          | **Method** | **Description**                |
| --------------------- | ---------- | ------------------------------ |
| /auth/register        | POST       | Renter/Host registration       |
| /auth/login           | POST       | Login                          |
| /listings             | GET        | Search available warehouses    |
| /listings             | POST       | Host creates listing           |
| /listings/:id         | PUT        | Host edits listing             |
| /bookings             | POST       | Renter creates booking request |
| /bookings/:id/approve | POST       | Host approves booking          |
| /inventory            | POST       | Add inventory items            |
| /notifications        | GET        | Fetch notifications            |

## 8. Security Measures

- Input validation on forms
- Role-based access in frontend/backend
- Basic error handling

## 9. Additional Considerations

- API versioning optional for MVP
- Clear error messages for user feedback
- Pagination optional for listing display
- Unit tests or QA checks encouraged

## 10. User Workflows

**Renter Workflow:**

1. **Onboarding**  
   Registration → questionnaire → admin approval

2. **Search Listings**  
   Filter by size, location, price, warehouse features (including fulfillment option)

3. **Request Booking**
   - Select dates
   - Add inventory items
   - Submit request

4. **Storage Agreement -- Draft Generated (NEW STEP)**
   - System auto-generates agreement from:
     - Listing terms
     - Rental dates
     - Inventory declared
     - Platform standard terms
     - Fulfillment details
     - Fillable notes section

5. Status: Pending Host Review

6. **Review Agreement Changes (if edited by host)**
   - View redlined or updated terms
   - Accept or reject
   - Optional messaging

7. **Digitally Sign Agreement**
   - Both parties e-sign
   - Timestamp stored
   - Agreement text stored in DB

8. **Booking Confirmed → Calendar Updated**

9. **View Booking Status**  
   Dashboard + calendar

10. **Messaging** (ongoing) -- can also be emails if messaging is too time intensive to build

11. **Optional Ship Request**

**Host Workflow:**

1. **Onboarding**  
   Registration → warehouse info → admin approval

2. **Create / Manage Listings**  
   CRUD

3. **Review Booking Request**

4. **Review & Edit Storage Agreement (NEW CORE STEP)**  
   Host can:
   - Add special conditions
   - Modify access rules
   - Clarify prohibited items
   - Reject booking
   - Then:  
     → Submit back to renter

5. **Wait for Renter Signature**

6. **Final Sign → Booking Confirmed**

7. **Manage Inventory**

8. **Messaging**

**Admin Workflow:**

1. Admin onboarding → pre-assigned access
2. Approve users → host/renter verification
3. Monitor platform → optional dashboard views

---

# WareShare MVP --- Feature Ownership Diagram

**Owner Legend**

| **Feature / Layer**                                                           | **Backend Owner** | **Frontend Owner** | **QA / Product Owner** |
| ----------------------------------------------------------------------------- | ----------------- | ------------------ | ---------------------- |
| Admin Dashboard                                                               | Julian            | Abdinasir          | Ivan                   |
| Booking System + Calendar                                                     | Julian            | Abdinasir          | Ivan                   |
| Storage Agreement (generate -> host edit -> renter accept -> status tracking) | Julian            | Abdinasir          | Ivan                   |
| Messaging / Comments                                                          | Julian            | Abdinasir          | Ivan                   |
| Inventory & Ship Requests                                                     | Julian            | Abdinasir          | Ivan                   |
| Listings & Search CRUD                                                        | Julian            | Abdinasir          | Ivan                   |
| User & Host Management                                                        | Julian            | Abdinasir          | Ivan                   |

---

# WareShare MVP --- User Workflows

## Renter Workflow (with Onboarding)

**Goal:** Book warehouse space and manage inventory.

1. **Onboarding**
   - Complete registration form (name, email, password, business registration number, website, physical address, phone number optional profile details) -- "WareShare will contact you for proof of documentation"
   - Wait for **admin approval**
   - Once approved, receive welcome email and login access

2. **Search for Warehouse**
   - Enter filters (location, size, price, warehouse features)
   - Browse listings and view details

3. **Request Booking**
   - Select dates and desired space
   - Add inventory items to store (basic list), add fulfillment request (if applicable)
   - Submit booking request to host -> draft storage agreement

4. **Storage Agreement**
   - Click agree to storage terms after host submits agreement back

5. **View Booking Status**
   - Dashboard shows pending, approved, or rejected bookings
   - View booking calendar (read-only)

6. **Messaging / Notes**
   - Optional: leave booking-related comments for host
   - Receive notifications when host responds

7. **Ship Request (Optional MVP)**
   - Create manual "ship request" to inform host about incoming goods
   - Host can view request in inventory section

## Host / Warehouse Owner Workflow (with Onboarding)

**Goal:** Manage listings, approve bookings, and track renter inventory.

1. **Onboarding**
   - Complete registration form (name, email, password, business registration number, website, physical address, phone number optional profile details) -- "WareShare will contact you for proof of documentation"
   - Complete onboarding questionnaire (e.g., warehouse size, location, permitted storage types)
   - Wait for **admin approval**
   - Once approved, receive welcome email and login access

2. **Create & Manage Listings**
   - Add warehouse space with details (size, price, availability)
   - Edit or delete listings
   - Listings appear in renter search results

3. **Review Booking Requests**
   - View booking requests per listing
   - Approve or reject requests -> amend storage agreement
   - Update booking status → reflects in renter dashboard

4. **Storage Agreement**
   - Click agree to storage terms

5. **View Booking Calendar**
   - Calendar shows upcoming bookings and blocked dates
   - Helps prevent double-booking

6. **Manage Inventory**
   - View renter-submitted inventory for each booking
   - Track items arriving at warehouse
   - Optional: update status of ship requests

7. **Messaging / Notes**
   - Respond to renter booking comments or questions

## Admin Workflow

**Goal:** Approve new users and oversee platform integrity.

1. **Admin Onboarding**
   - Pre-assigned role in Cloudflare (founder or project admin)
   - Login credentials provided

2. **Approve Users**
   - View pending renter and host registrations
   - Approve or reject accounts
   - Changes take effect immediately for the approved/rejected user

3. **Monitor Platform**
   - Optional: view summary dashboards (basic MVP)
   - Ensure bookings, listings, messaging, and inventory flows are functioning

## Workflow Diagram

[Renter] → Onboarding → Wait for Admin Approval → Search Listings → Request Booking → Add Inventory → Storage Agreement -> Messaging → Ship Request

[Host] → Onboarding → Wait for Admin Approval → Create Listings → Review Bookings → Update Booking Status → Storage Agreement -> Inventory Management → Messaging

[Admin] → Admin Onboarding → Approve Users → Monitor Platform

Onboarding ensures that **all users have provided necessary info and are approved** before accessing marketplace features -- however, need to make a decision of any user can browse the listings without creating an account?

Other note, we need to hide address information, general location is OK.

Do not make the storage agreement feel like a scary legal wall.

Make it:

- Structured sections (expandable)
- Clear bullet summaries
- "What this means for you" explanations
- Checkbox acknowledgment before signing

That increases completion rates.

The booking should not:

- Block calendar
- Trigger payment
- Update availability

Until:

Agreement is fully signed.
