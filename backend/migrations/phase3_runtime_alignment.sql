-- Align legacy runtime tables with current route expectations

ALTER TABLE event_managers ADD COLUMN phone TEXT;
-- ignore if exists

ALTER TABLE events ADD COLUMN event_description TEXT;
ALTER TABLE events ADD COLUMN event_image TEXT;
ALTER TABLE events ADD COLUMN current_attendees INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN requires_approval INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN user_type TEXT;
ALTER TABLE events ADD COLUMN source TEXT DEFAULT 'manual';

ALTER TABLE tickets ADD COLUMN ticket_code TEXT;
ALTER TABLE tickets ADD COLUMN qr_code TEXT;
ALTER TABLE tickets ADD COLUMN price REAL;
ALTER TABLE tickets ADD COLUMN currency TEXT DEFAULT 'ZAR';
ALTER TABLE tickets ADD COLUMN ticket_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE tickets ADD COLUMN payment_status TEXT DEFAULT 'COMPLETED';
ALTER TABLE tickets ADD COLUMN payment_id TEXT;
ALTER TABLE tickets ADD COLUMN validation_date TEXT;

ALTER TABLE payments ADD COLUMN payment_status TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS event_creation_registry (
  registry_id TEXT PRIMARY KEY,
  event_id INTEGER NOT NULL,
  creator_user_id TEXT,
  creator_email TEXT NOT NULL,
  creator_role TEXT NOT NULL,
  created_from TEXT DEFAULT 'web',
  approval_required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_creation_registry_event_id ON event_creation_registry(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_ticket_id ON payments(ticket_id);
