// eventOperations.js - CRUD for events
const sqlite3 = require("sqlite3").verbose();
const dbFile = require("./ticket_hub.db");
const dbConn = new sqlite3.Database(dbFile);

async function createEvent(data) {
  if (!data.event_name) throw new Error("event_name is required");
  return new Promise((resolve, reject) => {
    dbConn.run(
      `INSERT INTO events (event_name, location, start_date, end_date, category, event_type, created_by, organizer_id, user_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.event_name,
        data.location,
        data.start_date,
        data.end_date,
        data.category,
        data.event_type,
        data.created_by,
        data.organizer_id,
        data.user_type,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ event_id: this.lastID, ...data });
      },
    );
  });
}

async function getEventById(event_id) {
  return new Promise((resolve, reject) => {
    dbConn.get(
      `SELECT * FROM events WHERE event_id = ?`,
      [event_id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      },
    );
  });
}

async function getAllEvents() {
  return new Promise((resolve, reject) => {
    dbConn.all(`SELECT * FROM events`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function updateEvent(event_id, updates) {
  const fields = Object.keys(updates);
  const values = fields.map((f) => updates[f]);
  if (fields.length === 0) throw new Error("No updates provided");
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  return new Promise((resolve, reject) => {
    dbConn.run(
      `UPDATE events SET ${setClause} WHERE event_id = ?`,
      [...values, event_id],
      function (err) {
        if (err) return reject(err);
        resolve({ event_id, ...updates });
      },
    );
  });
}

async function deleteEvent(event_id) {
  return new Promise((resolve, reject) => {
    dbConn.run(
      `DELETE FROM events WHERE event_id = ?`,
      [event_id],
      function (err) {
        if (err) return reject(err);
        resolve();
      },
    );
  });
}

module.exports = {
  createEvent,
  getEventById,
  getAllEvents,
  updateEvent,
  deleteEvent,
};
