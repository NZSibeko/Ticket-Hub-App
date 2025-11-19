// backend/routes/auth/customerAuth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbOperations } = require('../../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-2025';

router.post('/login', async (req, res) => {
  const { email, username, password } = req.body;
  const loginEmail = email || username || '';

  if (!loginEmail || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    const customer = await dbOperations.get(`SELECT * FROM customers WHERE email = ?`, [loginEmail]);

    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: customer.customer_id,
        email: customer.email,
        userType: 'customer',
        role: 'customer'
      },
      JWT_SECRET,
      { expiresIn: '48h' }
    );

    res.json({
      success: true,
      token,
      user: {
        customer_id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        role: 'customer',
        userType: 'customer',
        displayRole: 'Customer'
      }
    });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;