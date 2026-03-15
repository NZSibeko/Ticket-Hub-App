const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// --- IMPORT REQUIRED MIDDLEWARES AND DEPENDENCIES ---
// Assuming app.locals or global context provides bcrypt, JWT_SECRET, and middlewares
// In a proper module system, these would be imported from shared/config/middleware files.
// For this migration, we rely on what's available in the global scope/app.locals as per server.js context.

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Middleware injection to get database access (assumes app.locals.db is set by server.js)
router.use(async (req, res, next) => {
    const dbOperations = req.app.locals.db; // Access dbOperations via app.locals (as set in server.js)
    
    if (!dbOperations) {
        return res.status(500).json({ success: false, error: 'Database operations not available via router context' });
    }
    req.dbOperations = dbOperations;
    next();
});

// Re-import necessary global context available in server.js
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  // JWT_SECRET is now env-dependent due to earlier edit
  jwt.verify(token, JWT_SECRET, (err, user) => { 
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const checkUserStatus = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    try {
        const user = req.user;
        let userTable, userIdColumn;
        
        if (user.role === 'customer' || user.userType === 'customer') {
            userTable = 'customers';
            userIdColumn = 'customer_id';
        } else if (['event_manager','manager'].includes(user.role) || ['event_manager','manager'].includes(user.userType)) {
            userTable = 'event_managers';
            userIdColumn = 'manager_id';
        } else if (user.role === 'admin' || user.userType === 'admin' || user.role === 'SUPER_ADMIN') {
            userTable = 'admins';
            userIdColumn = 'admin_id';
        } else if (['support','omni_support_consultant','event_support_consultant','support_staff'].includes(user.role) || ['support','omni_support_consultant','event_support_consultant','support_staff'].includes(user.userType)) {
            userTable = 'support_staff';
            userIdColumn = 'support_id';
        } else if (user.role === 'event_organizer' || user.userType === 'event_organizer') {
            userTable = 'event_organizers';
            userIdColumn = 'organizer_id';
        } else {
            return next();
        }

        const dbUser = await req.dbOperations.get(
            `SELECT status FROM ${userTable} WHERE ${userIdColumn} = ?`,
            [user[userIdColumn] || user.userId]
        );

        if (dbUser && dbUser.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account has been suspended. Please contact administrator.' 
            });
        }

        if (dbUser && dbUser.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Your account is inactive. Please contact administrator.' 
            });
        }

        next();
    } catch (err) {
        console.error('User status check error:', err);
        next(); 
    }
};

// --- UNIVERSAL LOGIN ENDPOINT ---
router.post('/login', authenticateToken, checkUserStatus, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password required' 
      });
    }
    
    console.log(`[UNIVERSAL LOGIN] Attempt for: ${email}`);
    
    const dbOperations = req.dbOperations;
    if (!dbOperations) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not ready' 
      });
    }
    
    // Check all user tables
    const tables = [
      { table: 'admins', id: 'admin_id', roleType: 'admin' },
      { table: 'event_managers', id: 'manager_id', roleType: 'manager' },
      { table: 'support_staff', id: 'support_id', roleType: 'omni_support_consultant' },
      { table: 'event_organizers', id: 'organizer_id', roleType: 'event_organizer' },
      { table: 'customers', id: 'customer_id', roleType: 'customer' }
    ];
    
    let user = null;
    let userType = null;
    let userId = null;
    let idColumn = null;
    let tableName = null;
    
    for (const { table, id, roleType } of tables) {
      const result = await dbOperations.get(`SELECT * FROM ${table} WHERE email = ?`, [email]);
      if (result) {
        user = result;
        userType = result.role || roleType;
        userId = result[id];
        idColumn = id;
        tableName = table;
        break;
      }
    }
    
    if (!user) {
      console.log(`[UNIVERSAL LOGIN] User not found: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Check account status
    if (user.status && user.status !== 'active') {
      console.log(`[UNIVERSAL LOGIN] Account not active: ${email} (status: ${user.status})`);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is not active. Please contact administrator.' 
      });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`[UNIVERSAL LOGIN] Invalid password for: ${email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Create token payload with all required fields
    const tokenPayload = {
      userId: userId,
      email: user.email,
      role: userType,
      userType: userType,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
    };
    const mutableTokenPayload: any = tokenPayload;
    
    // Add role-specific ID to token
    if (userType === 'admin') mutableTokenPayload.admin_id = userId;
    else if (['event_manager','manager'].includes(userType)) mutableTokenPayload.manager_id = userId;
    else if (['support_staff','support','omni_support_consultant','event_support_consultant'].includes(userType)) mutableTokenPayload.support_id = userId;
    else if (userType === 'event_organizer') mutableTokenPayload.organizer_id = userId;
    else if (userType === 'customer') mutableTokenPayload.customer_id = userId;
    
    const token = jwt.sign(mutableTokenPayload, JWT_SECRET, { expiresIn: '24h' });
    const now = new Date().toISOString();
    
    // Update last login - FIXED: Use the idColumn we already retrieved
    try {
      await dbOperations.run(
        `UPDATE ${tableName} SET last_login = ? WHERE ${idColumn} = ?`,
        [now, userId]
      );
      console.log(`[UNIVERSAL LOGIN] Updated last_login for ${email}`);
    } catch (updateError) {
      console.log(`[UNIVERSAL LOGIN] Could not update last_login: ${updateError.message}`);
      // Don't fail the login if we can't update last_login
    }
    
    console.log(`[UNIVERSAL LOGIN] Success for: ${email} (${userType})`);
    
    // Build complete user object for response
    const userResponse: any = {
      ...mutableTokenPayload,
      
      // Add ALL possible ID variations for maximum compatibility
      id: userId,
      userId: userId,
      
      // Role information
      role: userType,
      userType: userType,
      displayRole: userType === 'admin' ? 'Administrator' : 
                  ['event_manager','manager'].includes(userType) ? 'Manager' :
                  userType === 'event_support_consultant' ? 'Event Support Consultant' :
                  ['support_staff','support','omni_support_consultant'].includes(userType) ? 'Omni Support Consultant' :
                  userType === 'event_organizer' ? 'Event Organizer' : 'Customer',
      
      // User details
      email: user.email,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
      phone: user.phone,
      
      // Status
      status: user.status || 'active'
    };
    
    // Add role-specific fields
    if (userType === 'event_organizer') {
      userResponse.organizer_id = userId;
      userResponse.company = user.company;
    } else if (['event_manager','manager'].includes(userType)) {
      userResponse.manager_id = userId;
      userResponse.permissions = user.permissions;
    } else if (['support_staff','support','omni_support_consultant','event_support_consultant'].includes(userType)) {
      userResponse.support_id = userId;
      userResponse.department = user.department;
    } else if (userType === 'admin') {
      userResponse.admin_id = userId;
      userResponse.permissions = user.permissions;
    } else if (userType === 'customer') {
      userResponse.customer_id = userId;
      userResponse.first_name = user.first_name;
      userResponse.last_name = user.last_name;
    }
    
    res.json({
      success: true,
      token: token,
      user: userResponse,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('[UNIVERSAL LOGIN] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

