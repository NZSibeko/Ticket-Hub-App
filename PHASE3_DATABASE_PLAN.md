# Phase 3 Database Cleanup Plan

## Goal
Move Ticket Hub from a mixed prototype schema to a cleaner, deployment-ready architecture with:
- consistent role naming
- real database-backed dashboards
- no production mock fallbacks
- normalized operational data

---

## 1. Current Problems

### Role inconsistency
Current codebase still mixes:
- `event_manager`
- `manager`
- `support`
- `support_staff`
- `omni_support_consultant`
- `event_support_consultant`

### Multiple user sources of truth
Current user data is split across:
- `admins`
- `event_managers`
- `event_organizers`
- `support_staff`
- `customers`
- `dashboard_user_list`

### Mock data mixed into runtime
Mock/fallback logic still exists in:
- auth/dashboard routes
- support workspace flows
- scraper fallback services
- overview KPI/workspace cards

### Dashboard duplication
`dashboard_user_list` behaves like duplicated user storage instead of a derived reporting layer.

---

## 2. Target Role Vocabulary
Use these as the canonical role values everywhere:
- `admin`
- `manager`
- `event_organizer`
- `omni_support_consultant`
- `event_support_consultant`
- `customer`

Legacy values to map during migration:
- `event_manager` -> `manager`
- `support` -> `omni_support_consultant`
- `support_staff` -> use as table/grouping only, not final role value

---

## 3. Recommended Target Schema

## 3.1 Core identity
### users
- id
- first_name
- last_name
- display_name
- email
- password_hash
- phone
- status
- last_login
- created_at
- updated_at

### roles
- id
- code
- name

### user_roles
- id
- user_id
- role_id
- assigned_at

---

## 3.2 Event domain
### events
- id
- organizer_user_id
- approved_by_user_id
- name
- description
- venue
- start_at
- end_at
- status
- created_at
- updated_at

### event_assignments
- id
- event_id
- user_id
- assignment_role
- assigned_by_user_id
- status
- created_at

### event_approval_history
- id
- event_id
- acted_by_user_id
- action
- notes
- created_at

---

## 3.3 Support / CRM domain
### support_threads
- id
- customer_user_id
- channel
- subject
- priority
- status
- assigned_user_id
- event_id nullable
- created_at
- updated_at

### support_messages
- id
- thread_id
- sender_user_id
- sender_type
- body
- is_internal_note
- created_at

### support_tags
- id
- name
- color

### support_thread_tags
- id
- thread_id
- tag_id

### support_tasks
- id
- thread_id nullable
- event_id nullable
- assigned_user_id
- title
- description
- status
- priority
- due_at
- created_at

---

## 3.4 Ticketing / event support domain
### tickets
- id
- event_id
- customer_user_id
- ticket_type
- ticket_code
- status
- price
- purchased_at

### ticket_scans
- id
- ticket_id
- event_id
- scanned_by_user_id
- scan_result
- gate_name
- scanned_at

---

## 3.5 Admin / audit domain
### audit_logs
- id
- actor_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at

### system_settings
- id
- key
- value
- type
- updated_at

---

## 4. Tables To Phase Out Or Demote

### dashboard_user_list
Recommendation:
- stop using as source of truth
- replace with a computed query or SQL view
- only keep temporarily for backward compatibility

### role-specific user tables
Long term:
- migrate away from multiple auth-specific user tables
- consolidate into `users + user_roles`

---

## 5. Mock Data Removal Plan
Replace mock runtime data with seeded database records.

### Move to database
- support conversations
- support messages
- event support tasks
- team planner rows
- CRM snapshot cards
- queue KPI cards
- overview workspace metrics

### Seed strategy
Create:
- `backend/seeds/dev-seed.ts`
- `backend/seeds/staging-seed.ts`
- no automatic production mock seeding

---

## 6. Migration Strategy

## Phase 3A - Stabilize current schema
- normalize persisted role values
- update login/auth to use canonical role names
- stop introducing new legacy role values

## Phase 3B - Introduce canonical identity tables
Add:
- `users`
- `roles`
- `user_roles`

Backfill from:
- `admins`
- `event_managers`
- `event_organizers`
- `support_staff`
- `customers`

## Phase 3C - Add operational tables
Add:
- `support_threads`
- `support_messages`
- `support_tasks`
- `event_assignments`
- `ticket_scans`
- `audit_logs`

## Phase 3D - Transition reads/writes
- switch dashboards to canonical queries
- switch support workspace to real thread/task tables
- switch event support scanning to `ticket_scans`
- stop relying on dashboard duplication tables

## Phase 3E - Retire old structures
- remove mock fallbacks from production paths
- retire `dashboard_user_list`
- retire duplicated role logic

---

## 7. Immediate Implementation Checklist

### Role cleanup
- [ ] finish remaining legacy role strings across backend
- [ ] finish remaining legacy role strings across frontend
- [ ] normalize seed/default user roles

### Database prep
- [ ] inventory current tables and columns
- [ ] map current tables to target schema
- [ ] define migration order
- [ ] add missing foreign keys and indexes

### Dashboard / workspace
- [ ] replace mock KPI cards with real queries
- [ ] replace mock support tasks with real DB rows
- [ ] replace mock planner rows with assignment data
- [ ] replace mock CRM counters with query-backed metrics

### Deployment readiness
- [ ] remove production mock fallback behavior
- [ ] ensure JWT/env config is production-safe
- [ ] verify all role-based route guards
- [ ] test all role login flows end-to-end

---

## 8. Suggested Next Technical Deliverables
1. `PHASE3_TABLE_INVENTORY.md`
2. `PHASE3_MIGRATION_MAP.md`
3. canonical SQL migration for `users / roles / user_roles`
4. seed scripts for dev/staging
5. support workspace DB query integration plan

---

## 9. Definition of Done
Phase 3 is complete when:
- all dashboards are DB-driven
- all runtime mock data is removed from prod paths
- all role checks use canonical names
- support/event operations use normalized operational tables
- user identity is centralized and auditable
