const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../../database/database"); // Adjust import as needed

// Sample event data
const sampleEvent = {
  event_name: "Sample Event",
  location: "Cape Town",
  start_date: "2026-04-01T10:00:00Z",
  end_date: "2026-04-01T18:00:00Z",
  category: "Music",
  event_type: "physical",
  created_by: "admin",
  organizer_id: 1,
  user_type: "admin",
};

test("Create event and fetch by ID", async () => {
  const event = await db.createEvent(sampleEvent);
  const fetched = await db.getEventById(event.event_id);
  assert.equal(fetched.event_name, sampleEvent.event_name);
});

test("Event cannot be created without name", async () => {
  await assert.rejects(() => db.createEvent({}), /event_name is required/);
});

test("Update event", async () => {
  const event = await db.createEvent(sampleEvent);
  const updated = await db.updateEvent(event.event_id, {
    event_name: "Updated Event",
  });
  assert.equal(updated.event_name, "Updated Event");
});

test("Delete event", async () => {
  const event = await db.createEvent(sampleEvent);
  await db.deleteEvent(event.event_id);
  const fetched = await db.getEventById(event.event_id);
  assert.equal(fetched, null);
});
