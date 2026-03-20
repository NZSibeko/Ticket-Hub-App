# Phase 3 Migration Map

## Canonical Role Mapping

| Legacy Value | Canonical Value |
|---|---|
| event_manager | manager |
| support | omni_support_consultant |
| support_staff | omni_support_consultant or event_support_consultant depending on department/use |

---

## Table Mapping

### User identity
| Current Tables | Target Tables | Notes |
|---|---|---|
| admins | users + user_roles | role = admin |
| event_managers | users + user_roles | role = manager |
| event_organizers | users + user_roles | role = event_organizer |
| support_staff | users + user_roles | split by role into omni/event support consultant |
| customers | users + user_roles | role = customer |
| dashboard_user_list | derived query/view | retire as source of truth |

### Support operations
| Current Tables | Target Tables | Notes |
|---|---|---|
| support_conversations | support_threads | map status, customer, assigned owner |
| support_messages | support_messages | preserve body/timestamp/sender |
| support_agent_status | support_tasks / agent presence layer | keep short term, evaluate long term |
| support_agents | agent presence layer | merge if duplicated with support_agent_status |

### Event operations
| Current Tables | Target Tables | Notes |
|---|---|---|
| events | events | preserve IDs where possible |
| tickets | tickets | add relational cleanup if needed |
| none / implicit scanning | ticket_scans | new table needed |
| none / implicit assignment | event_assignments | new table needed |
| none / implicit approval state | event_approval_history | new table needed |

---

## Migration Order

### Step 1 - Normalize current data
- update persisted roles in legacy tables
- make all auth flows accept canonical roles
- stop creating new legacy role values

### Step 2 - Create canonical identity tables
- create `users`
- create `roles`
- create `user_roles`
- backfill users from legacy account tables

### Step 3 - Create operational tables
- create `support_threads`
- create `support_messages` target structure if needed
- create `support_tasks`
- create `event_assignments`
- create `event_approval_history`
- create `ticket_scans`
- create `audit_logs`

### Step 4 - Backfill operational data
- move support conversations/messages
- seed assignments/tasks where possible
- attach support/event relationships

### Step 5 - Switch application reads
- dashboards use canonical queries
- support workspace uses canonical tables
- event support flows use assignment/scan tables

### Step 6 - Switch application writes
- new users write to canonical user model
- new support tasks/threads write canonically
- ticket scans write to `ticket_scans`

### Step 7 - Retire legacy duplication
- stop writing to dashboard_user_list
- replace with view/query
- gradually retire old user-specific auth assumptions

---

## Risk Notes
- user ID collisions need careful handling during backfill
- password hashes must be preserved exactly
- dual-write period may be required for safe rollout
- dashboards should be switched after canonical reads are tested
