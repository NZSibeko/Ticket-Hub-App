// backend/routes/auth/eventManagerAuth.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ticket-hub-super-secret-2025';

// Event Manager Login - FIXED
router.post('/login', async (req, res) => {
    // Accept both email and username parameters (frontend sends "email")
    const { email, username, password } = req.body;
    const identifier = email || username;

    console.log('[EVENT MANAGER AUTH] Login attempt for:', identifier);

    if (!identifier || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email and password required' 
        });
    }

    try {
        // Get database from app.locals (set in server.js)
        const db = req.app.locals.db;
        
        if (!db) {
            console.error('❌ [EVENT MANAGER AUTH] Database not available');
            return res.status(500).json({ 
                success: false, 
                error: 'Database connection error' 
            });
        }

        // Find event manager by email
        const manager = await db.get(
            'SELECT * FROM event_managers WHERE email = ?',
            [identifier]
        );

        if (!manager) {
            console.log('[EVENT MANAGER AUTH] Manager not found:', identifier);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Check user status
        if (manager.status === 'suspended') {
            console.log('[EVENT MANAGER AUTH] Account suspended:', identifier);
            return res.status(403).json({ 
                success: false, 
                error: 'Account suspended. Please contact administrator.' 
            });
        }

        if (manager.status === 'inactive') {
            console.log('[EVENT MANAGER AUTH] Account inactive:', identifier);
            return res.status(403).json({ 
                success: false, 
                error: 'Account inactive. Please contact administrator.' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, manager.password);
        if (!validPassword) {
            console.log('[EVENT MANAGER AUTH] Invalid password for:', identifier);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                userId: manager.manager_id,
                manager_id: manager.manager_id,
                email: manager.email,
                role: 'event_manager',
                userType: 'event_manager',
                name: manager.name,
                status: manager.status
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        try {
            await db.run(
                `UPDATE event_managers SET last_login = ? WHERE manager_id = ?`,
                [new Date().toISOString(), manager.manager_id]
            );
        } catch (updateError) {
            console.log('⚠️ [EVENT MANAGER AUTH] Could not update last_login:', updateError.message);
        }

        // Update dashboard_user_list if it exists
        try {
            await db.run(
                `UPDATE dashboard_user_list SET lastActive = ? WHERE email = ?`,
                [new Date().toISOString(), manager.email]
            );
        } catch (updateError) {
            // Table might not exist, that's okay
        }

        console.log('✅ [EVENT MANAGER AUTH] Login successful for:', identifier);

        // Return complete user object
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                // ID fields - ALL variations for maximum compatibility
                manager_id: manager.manager_id,
                userId: manager.manager_id,
                id: manager.manager_id,
                
                // User information
                name: manager.name,
                email: manager.email,
                phone: manager.phone,
                
                // Role information - CRITICAL for navigation
                role: 'event_manager',
                userType: 'event_manager',
                displayRole: 'Event Manager',
                
                // Status
                status: manager.status,
                
                // Permissions
                permissions: manager.permissions || '{}'
            }
        });

    } catch (err) {
        console.error('❌ [EVENT MANAGER AUTH] Login error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Event Manager Registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        console.log('[EVENT MANAGER AUTH] Registration attempt for:', email);
        
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
            'SELECT * FROM event_managers WHERE email = ?',
            [email]
        );

        if (existing) {
            console.log('[EVENT MANAGER AUTH] Email already exists:', email);
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const manager_id = uuidv4();

        // Insert new event manager
        await db.run(
            `INSERT INTO event_managers (
                manager_id, name, email, password, phone, 
                role, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                manager_id,
                name,
                email,
                hashedPassword,
                phone || null,
                'event_manager',
                'active',
                new Date().toISOString()
            ]
        );

        console.log('✅ [EVENT MANAGER AUTH] Registration successful for:', email);

        res.json({
            success: true,
            message: 'Registration successful',
            user: {
                manager_id,
                name,
                email,
                role: 'event_manager'
            }
        });

    } catch (err) {
        console.error('❌ [EVENT MANAGER AUTH] Registration error:', err);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;