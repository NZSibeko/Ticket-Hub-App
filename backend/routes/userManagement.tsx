// backend/routes/userManagement.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Helper to use for the new user's avatar generation
const getAvatar = (firstName, lastName) => {
    if (!firstName || !lastName) return 'N/A';
    return firstName[0].toUpperCase() + lastName[0].toUpperCase();
};

// Helper to map role keys to display names (for consistency)
const getRoleDisplay = (role) => {
    switch((role || '').toLowerCase()) {
        case 'customer': return 'Customer';
        case 'manager':
        case 'event_manager': return 'Manager';
        case 'event_organizer': return 'Event Organizer';
        case 'omni_support_consultant':
        case 'support': return 'Omni Support Consultant';
        case 'event_support_consultant': return 'Event Support Consultant';
        case 'admin': return 'Admin';
        default: return 'Customer';
    }
};

// =================================================================
// 1. GET Dashboard Data (GET /api/users/dashboard)
// =================================================================
router.get('/dashboard', async (req, res) => {
    // This route is protected by authenticateToken and requireAdmin in server.js
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    try {
        // 1. Fetch Dashboard Metrics (stats, analytics, recentActivity)
        const metricsRows = await dbOperations.all(`SELECT key, value FROM dashboard_metrics`);
        const metrics = metricsRows.reduce((acc, row) => {
            try {
                acc[row.key] = JSON.parse(row.value);
            } catch (e) {
                console.error(`Error parsing metric key ${row.key}:`, e);
                acc[row.key] = {};
            }
            return acc;
        }, {});

        // 2. Fetch User List
        // NOTE: Password field is excluded for security
        const userList = await dbOperations.all(`
            SELECT id, name, email, role, status, joined, lastActive, avatar, country 
            FROM dashboard_user_list 
            ORDER BY id ASC
        `);

        // 3. Construct the final data object
        const dashboardData = {
            stats: metrics.stats || {},
            analytics: metrics.analytics || {},
            userList: userList,
            recentActivity: metrics.recentActivity || [],
        };

        res.json({ success: true, data: dashboardData });
    } catch (err) {
        console.error('Fetch dashboard data error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
    }
});

// =================================================================
// 2. CREATE New User (POST /api/users)
// =================================================================
router.post('/', async (req, res) => {
    // This check is redundant due to middleware but kept for robustness
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'SUPER_ADMIN')) {
         return res.status(403).json({ success: false, error: 'Admin access required to create users' });
    }
    
    const { firstName, lastName, email, password, role, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Check if user already exists
        const existingDashboardUser = await dbOperations.get(`SELECT id FROM dashboard_user_list WHERE email = ?`, [email]);
        if (existingDashboardUser) {
            return res.status(409).json({ success: false, error: 'User with this email already exists' });
        }

        const name = `${firstName} ${lastName}`;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userAvatar = getAvatar(firstName, lastName);
        const roleDisplay = getRoleDisplay(role);
        const defaultStatus = 'active';
        const defaultJoined = new Date().toISOString().split('T')[0];
        const defaultLastActive = 'Just now';
        const defaultCountry = 'South Africa'; 

        // 1. Insert into dashboard_user_list
        const dashboardQuery = `
            INSERT INTO dashboard_user_list 
            (name, email, password, role, status, joined, lastActive, avatar, country) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const dashboardResult = await dbOperations.run(dashboardQuery, [
            name, email, hashedPassword, roleDisplay, defaultStatus, defaultJoined, 
            defaultLastActive, userAvatar, defaultCountry
        ]);
        
        // 2. Insert into the specific user table 
        const userId = uuidv4();
        if (role === 'customer') {
             await dbOperations.run(`INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, role)
                VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
                [userId, firstName, lastName, email, hashedPassword, phone || null]
            );
        } else if (role === 'manager' || role === 'event_manager') {
            await dbOperations.run(`INSERT INTO event_managers (manager_id, name, email, password, phone, role) 
                VALUES (?, ?, ?, ?, ?, 'manager')`,
                [userId, name, email, hashedPassword, phone || null]
            );
        } else if (role === 'omni_support_consultant' || role === 'support') {
            await dbOperations.run(`INSERT INTO support_staff (support_id, name, email, password, phone, department, role, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
                [userId, name, email, hashedPassword, phone || null, 'omni_support', 'omni_support_consultant']
            );
        } else if (role === 'event_support_consultant') {
            await dbOperations.run(`INSERT INTO support_staff (support_id, name, email, password, phone, department, role, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
                [userId, name, email, hashedPassword, phone || null, 'event_operations', 'event_support_consultant']
            );
        } else if (role === 'event_organizer') {
            await dbOperations.run(`INSERT INTO event_organizers (organizer_id, name, email, password, phone, role, status, created_at) 
                VALUES (?, ?, ?, ?, ?, 'event_organizer', 'active', datetime('now'))`,
                [userId, name, email, hashedPassword, phone || null]
            );
        } else if (role === 'admin') {
            await dbOperations.run(`INSERT INTO admins (admin_id, name, email, password, role) 
                VALUES (?, ?, ?, ?, 'admin')`,
                [userId, name, email, hashedPassword]
            );
        }
        
        // 3. Update Dashboard Metrics (Stats and Activity)
        // NOTE: Full metric update logic is omitted here for brevity, assuming the full dashboard data will be re-fetched by the frontend.
        
        // 4. Return the created user object
        const newUser = {
            id: dashboardResult.id, 
            name: name,
            email: email,
            role: roleDisplay,
            status: defaultStatus,
            joined: defaultJoined,
            lastActive: defaultLastActive,
            avatar: userAvatar,
            country: defaultCountry
        };

        return res.status(201).json({ 
            success: true, 
            message: 'User created successfully!', 
            user: newUser 
        });
    } catch (err) {
        console.error('Create user error:', err);
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
             return res.status(409).json({ success: false, error: 'A user with this email already exists in one of the main tables.' });
        }
        res.status(500).json({ success: false, error: 'Failed to create user due to an internal server error.' });
    }
});


module.exports = router;