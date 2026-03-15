# Phase 3 Migration Execution Checklist

## Safe Execution Order

1. Back up the current database file.
2. Run runtime alignment migration:
   - `backend/migrations/phase3_runtime_alignment.sql`
3. Run role normalization migration:
   - `backend/migrations/phase3_role_normalization.sql`
4. Run canonical schema creation:
   - `backend/migrations/phase3_canonical_schema.sql`
5. Run canonical user backfill:
   - `backend/migrations/phase3_backfill_users.sql`
6. Optionally run dev seed scaffold in non-production:
   - `backend/seeds/phase3_dev_seed.sql`

---

## Validation Checks

### Roles
- [ ] `event_managers.role` values are normalized to `manager`
- [ ] `support_staff.role` values are normalized to consultant roles
- [ ] login still works for admin, manager, organizer, support, customer

### Events
- [ ] creating an event writes into `events`
- [ ] admin/manager event creation writes into `event_creation_registry`
- [ ] manager/admin can still fetch managed events

### Tickets / Payments
- [ ] purchasing tickets writes rows into `tickets`
- [ ] payment confirmation writes rows into `payments`
- [ ] customer ticket retrieval still works

### Canonical identity
- [ ] `users` contains rows from all legacy user tables
- [ ] `user_roles` correctly maps canonical roles

---

## Recommended Dev Verification Queries

```sql
SELECT role, COUNT(*) FROM event_managers GROUP BY role;
SELECT role, COUNT(*) FROM support_staff GROUP BY role;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM user_roles;
SELECT COUNT(*) FROM event_creation_registry;
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM payments;
```

---

## Rollback Guidance
- restore DB backup if any migration corrupts runtime behavior
- do not run dev seed against production
- validate route behavior before switching dashboards to canonical reads
