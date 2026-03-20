const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

const API_URL = "http://localhost:8081/api/events";

test("GET /events returns array", async () => {
  const res = await axios.get(API_URL);
  assert.ok(Array.isArray(res.data));
});

test("POST /events creates event", async () => {
  const event = {
    event_name: "API Test Event",
    location: "Joburg",
    start_date: "2026-05-01T10:00:00Z",
    end_date: "2026-05-01T18:00:00Z",
    category: "Business",
    event_type: "physical",
    created_by: "admin",
    organizer_id: 1,
    user_type: "admin",
  };
  const res = await axios.post(API_URL, event);
  assert.equal(res.data.event_name, event.event_name);
});
