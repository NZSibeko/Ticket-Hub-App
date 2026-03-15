const express = require('express');
const router = express.Router();
const { dbOperations } = require('../../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Support login - FIXED: Only use email (no username column exists)
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // Use email if provided, otherwise use username (which will be treated as email)
    const identifier = email || username;

    console.log('[SUPPORT AUTH] Login attempt for:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Check in support_staff table - ONLY check email column
    let user = await dbOperations.get(
      `SELECT support_id, name, email, password, phone, department, role, status, last_login
       FROM support_staff WHERE email = ?`,
      [identifier]
    );

    if (!user) {
      console.log('[SUPPORT AUTH] Support staff not found:', identifier);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        error: 'Account is not active. Please contact administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('[SUPPORT AUTH] Invalid password for support:', identifier);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await dbOperations.run(
      `UPDATE support_staff SET last_login = ? WHERE support_id = ?`,
      [new Date().toISOString(), user.support_id]
    );

    // Create token
    const resolvedRole = user.role || 'omni_support_consultant';
    const displayRole = resolvedRole === 'event_support_consultant'
      ? 'Event Support Consultant'
      : 'Omni Support Consultant';

    const token = jwt.sign(
      { 
        userId: user.support_id,
        email: user.email,
        role: resolvedRole,
        name: user.name,
        department: user.department,
        userType: resolvedRole,
        support_id: user.support_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[SUPPORT AUTH] Login successful for:', identifier);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: {
        id: user.support_id,
        userId: user.support_id,
        support_id: user.support_id,
        email: user.email,
        role: resolvedRole,
        userType: resolvedRole,
        name: user.name,
        department: user.department,
        displayRole,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('[SUPPORT AUTH] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      details: error.message 
    });
  }
});

module.exports = router;
