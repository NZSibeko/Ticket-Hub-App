// backend/routes/auth/eventManagerAuth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbOperations } = require('../../database');
const JWT_SECRET = 'ticket-hub-super-secret-2025'; // MUST MATCH server.js

router.post('/login', async (req, res) => {
  const { email, username, password } = req.body;
  const loginEmail = email || username || '';

  if (!loginEmail || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    const manager = await dbOperations.get(`SELECT * FROM event_managers WHERE email = ?`, [loginEmail]);

    if (!manager || !(await bcrypt.compare(password, manager.password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: manager.manager_id,
        email: manager.email,
        userType: 'event_manager',
        role: 'event_manager'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        manager_id: manager.manager_id,
        name: manager.name,
        email: manager.email,
        role: 'event_manager',
        userType: 'event_manager',
        displayRole: 'Event Manager'
      }
    });
  } catch (err) {
    console.error('Event Manager login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;