-- Phase 3 role normalization
-- Normalize legacy role values in existing tables before canonical backfill.

UPDATE event_managers
SET role = 'manager'
WHERE role = 'event_manager' OR role IS NULL OR TRIM(role) = '';

UPDATE support_staff
SET role = 'omni_support_consultant'
WHERE role = 'support';

UPDATE support_staff
SET role = 'omni_support_consultant'
WHERE role IS NULL OR TRIM(role) = '';

-- Optional department-based support split
UPDATE support_staff
SET role = 'event_support_consultant'
WHERE department IN ('event_operations', 'event_support')
  AND role = 'omni_support_consultant';

-- Normalize dashboard display cache if still used
UPDATE dashboard_user_list
SET role = 'Manager'
WHERE role = 'Event Manager';

UPDATE dashboard_user_list
SET role = 'Omni Support Consultant'
WHERE role IN ('Support', 'Support Staff');
