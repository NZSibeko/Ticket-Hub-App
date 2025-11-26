// backend/routes/auth/adminAuth.js
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
    const admin = await dbOperations.get(`SELECT * FROM admins WHERE email = ?`, [loginEmail]);

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: admin.admin_id,
        email: admin.email,
        userType: 'admin',
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        userType: 'admin',
        displayRole: 'Administrator'
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;