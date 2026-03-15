// backend/routes/auth/organizerAuth.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Event Organizer Login - FIXED
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Use email if provided, otherwise use username (which will be treated as email)
    const identifier = email || username;

    console.log('[ORGANIZER AUTH] Login attempt for:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Get database from app.locals (set in server.js)
    const db = req.app.locals.db;
    
    if (!db) {
      console.error('❌ [ORGANIZER AUTH] Database not available');
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection error' 
      });
    }

    // Check in event_organizers table
    let user = await db.get(
      `SELECT organizer_id, name, email, password, phone, company, status, role, last_login
       FROM event_organizers WHERE email = ?`,
      [identifier]
    );

    if (!user) {
      console.log('[ORGANIZER AUTH] Organizer not found:', identifier);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      console.log('[ORGANIZER AUTH] Account not active:', identifier, 'Status:', user.status);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is not active. Please contact administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('[ORGANIZER AUTH] Invalid password for organizer:', identifier);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    try {
      await db.run(
        `UPDATE event_organizers SET last_login = ? WHERE organizer_id = ?`,
        [new Date().toISOString(), user.organizer_id]
      );
    } catch (updateError) {
      console.log('⚠️ [ORGANIZER AUTH] Could not update last_login:', updateError.message);
    }

    // Create token
    const token = jwt.sign(
      { 
        userId: user.organizer_id,
        organizer_id: user.organizer_id,
        email: user.email,
        role: 'event_organizer',
        name: user.name,
        company: user.company || '',
        userType: 'event_organizer'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ [ORGANIZER AUTH] Login successful for:', identifier);

    // Return complete user object with ALL ID variations
    res.json({
      success: true,
      token,
      user: {
        // ID fields - ALL variations for maximum compatibility
        organizer_id: user.organizer_id,
        userId: user.organizer_id,
        id: user.organizer_id,
        
        // User information
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: user.company || '',
        
        // Role information - CRITICAL for navigation
        role: 'event_organizer',
        userType: 'event_organizer',
        displayRole: 'Event Organizer',
        
        // Status
        status: user.status
      }
    });
  } catch (error) {
    console.error('[ORGANIZER AUTH] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Event Organizer Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;
    
    console.log('[ORGANIZER AUTH] Registration attempt for:', email);
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and password are required'
      });
    }

    const db = req.app.locals.db;
    const uuidv4 = req.app.locals.uuidv4;

    if (!db) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection error' 
      });
    }

    // Check if email already exists
    const existing = await db.get(
      'SELECT * FROM event_organizers WHERE email = ?',
      [email]
    );

    if (existing) {
      console.log('[ORGANIZER AUTH] Email already exists:', email);
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const organizer_id = uuidv4();

    // Insert new event organizer
    await db.run(
      `INSERT INTO event_organizers (
        organizer_id, name, email, password, phone, company,
        role, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizer_id,
        name,
        email,
        hashedPassword,
        phone || null,
        company || null,
        'event_organizer',
        'active',
        new Date().toISOString()
      ]
    );

    console.log('✅ [ORGANIZER AUTH] Registration successful for:', email);

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        organizer_id,
        name,
        email,
        role: 'event_organizer'
      }
    });

  } catch (err) {
    console.error('❌ [ORGANIZER AUTH] Registration error:', err);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
