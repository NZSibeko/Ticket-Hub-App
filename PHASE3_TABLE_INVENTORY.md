# Phase 3 Table Inventory

## Current Known Tables

### Identity / Auth
- `admins`
- `event_managers`
- `event_organizers`
- `support_staff`
- `customers`
- `dashboard_user_list`

### Event / Ticketing
- `events`
- `tickets`
- `payments`

### Support / Messaging
- `support_conversations`
- `support_messages`
- `support_agent_status`
- `support_agents`

### Metrics / Platform
- `dashboard_metrics`
- `system_metrics`
- `platform_settings`

### Misc / Audit / Activity
- `user_activity_logs`

---

## Current Usage Notes

### admins
Purpose:
- administrator login
- admin dashboard and system access

Issues:
- duplicated identity pattern vs other user tables

### event_managers
Purpose:
- stores manager accounts

Issues:
- table name still legacy
- role values historically mixed between `event_manager` and `manager`

### event_organizers
Purpose:
- event organizer accounts

### support_staff
Purpose:
- currently holds both support consultant types

Issues:
- table name is acceptable short term, but role values must be canonical
- should distinguish:
  - `omni_support_consultant`
  - `event_support_consultant`

### customers
Purpose:
- customer accounts

### dashboard_user_list
Purpose:
- dashboard-facing user directory snapshot

Issues:
- duplicates identity data
- should not remain source of truth

### events
Purpose:
- event records

Issues:
- approval and assignment history likely under-modeled

### tickets
Purpose:
- purchased/generated tickets

Issues:
- event-support scanning should eventually write into dedicated `ticket_scans`

### support_conversations / support_messages
Purpose:
- customer support messaging

Issues:
- should evolve into normalized thread/message model

### support_agent_status / support_agents
Purpose:
- support availability / routing state

Issues:
- overlapping responsibility; may need consolidation later

### dashboard_metrics / system_metrics / platform_settings
Purpose:
- dashboard and admin reporting

Issues:
- some metrics currently mix real values and fallback logic

---

## Target Canonical Tables

### Identity
- `users`
- `roles`
- `user_roles`

### Event domain
- `events`
- `event_assignments`
- `event_approval_history`

### Support domain
- `support_threads`
- `support_messages`
- `support_tags`
- `support_thread_tags`
- `support_tasks`

### Ticketing domain
- `tickets`
- `ticket_scans`

### Admin / platform
- `audit_logs`
- `system_settings`

---

## Short-Term Recommendation
During transition:
- keep current tables operational
- normalize role values first
- add canonical tables beside legacy tables
- gradually migrate reads/writes
