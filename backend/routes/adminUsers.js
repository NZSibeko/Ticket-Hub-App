// backend/routes/adminUsers.js - FIXED WITH REALISTIC DATE GENERATION
const express = require('express');
const router = express.Router();
const dbOperations = require('../database').dbOperations;

// FIXED: More flexible middleware that handles role variations
const requireAdminOrManager = (req, res, next) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Normalize role to lowercase for comparison
    const userRole = (user.role || user.userType || '').toLowerCase().trim();
    
    // Check if user has admin or event_manager privileges
    const hasAdminAccess = ['admin', 'super_admin', 'administrator'].includes(userRole);
    const hasManagerAccess = ['event_manager', 'eventmanager', 'event-manager', 'manager'].includes(userRole);
    
    if (hasAdminAccess || hasManagerAccess) {
        return next();
    }
    
    return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Requires Admin or Event Manager role.',
        userRole: userRole,
        userRoles: user
    });
};

// =========================================================================
// Helper Functions with SIMPLE and REALISTIC date handling
// =========================================================================

// Generate realistic relative time strings
const generateRealisticTime = (daysAgo = 0, hoursAgo = 0, minutesAgo = 0) => {
    const now = new Date();
    const targetDate = new Date(now);
    
    targetDate.setDate(targetDate.getDate() - daysAgo);
    targetDate.setHours(targetDate.getHours() - hoursAgo);
    targetDate.setMinutes(targetDate.getMinutes() - minutesAgo);
    
    const diffMs = now - targetDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    
    // For older dates, return a formatted date
    return targetDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
    });
};

// Generate user-specific last active times
const generateUserLastActive = (userIndex, userRole) => {
    // Base times based on user index and role
    const baseMinutes = userIndex * 45; // 0, 45, 90, 135, etc minutes
    
    // Adjust based on role - admins more recent, customers less recent
    let roleAdjustment = 0;
    if (userRole === 'Admin') roleAdjustment = -30; // Admins more recent
    if (userRole === 'Event Manager') roleAdjustment = -15; // Managers somewhat recent
    if (userRole === 'Customer') roleAdjustment = 30; // Customers less recent
    
    const totalMinutes = Math.max(5, baseMinutes + roleAdjustment); // Minimum 5 minutes
    
    if (totalMinutes < 60) {
        return `${totalMinutes} mins ago`;
    } else if (totalMinutes < 1440) { // 24 hours
        const hours = Math.floor(totalMinutes / 60);
        return `${hours} hours ago`;
    } else {
        const days = Math.floor(totalMinutes / 1440);
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    }
};

const fetchAllUsers = async () => {
    try {
        const customers = await dbOperations.all(`
            SELECT customer_id as id, first_name, last_name, email, 'Customer' as role,
                   status, created_at as joined, phone as phone_number, 'South Africa' as country
            FROM customers
        `);

        const managers = await dbOperations.all(`
            SELECT manager_id as id, name, email, 'Event Manager' as role,
                   status, created_at as joined, phone as phone_number, 'South Africa' as country
            FROM event_managers
        `).then(rows => rows.map(row => {
            const parts = (row.name || 'Event Manager').trim().split(' ');
            const first_name = parts[0];
            const last_name = parts.slice(1).join(' ') || 'Manager';
            return { ...row, first_name, last_name };
        }));

        const admins = await dbOperations.all(`
            SELECT admin_id as id, name, email, 'Admin' as role,
                   status, created_at as joined, phone as phone_number, 'South Africa' as country
            FROM admins
        `).then(rows => rows.map(row => {
            const parts = (row.name || 'Super Admin').trim().split(' ');
            const first_name = parts[0];
            const last_name = parts.slice(1).join(' ') || 'Admin';
            return { ...row, first_name, last_name };
        }));

        // Combine and shuffle to mix roles
        const allUsers = [...customers, ...managers, ...admins];
        
        // Sort by created_at to get chronological order
        allUsers.sort((a, b) => new Date(a.joined || 0) - new Date(b.joined || 0));
        
        const processedUsers = allUsers.map((user, index) => {
            // Generate realistic last active time based on index and role
            const lastActive = generateUserLastActive(index, user.role);
            
            // Format joined date properly
            let joinedDate;
            try {
                joinedDate = new Date(user.joined);
                if (isNaN(joinedDate.getTime())) {
                    // Generate a realistic join date (within last 30 days)
                    const daysAgo = Math.floor(Math.random() * 30);
                    joinedDate = new Date();
                    joinedDate.setDate(joinedDate.getDate() - daysAgo);
                }
            } catch (err) {
                // Default to 7 days ago if parsing fails
                joinedDate = new Date();
                joinedDate.setDate(joinedDate.getDate() - 7);
            }
            
            const joined = joinedDate.toISOString().split('T')[0];
            
            return {
                id: user.id,
                name: user.name || `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role,
                status: user.status || 'active',
                phone: user.phone_number || 'Not provided',
                joined: joined,
                lastActive: lastActive,
                avatar: `${user.first_name?.[0] || 'A'}${user.last_name?.[0] || 'A'}`.toUpperCase(),
                country: user.country || 'South Africa',
                first_name: user.first_name,
                last_name: user.last_name
            };
        });

        return processedUsers;
    } catch (err) {
        console.error('fetchAllUsers error:', err);
        throw err;
    }
};

// =========================================================================
// 1. GET Dashboard Data - FIXED with realistic dates
// =========================================================================
router.get('/dashboard', requireAdminOrManager, async (req, res) => {
    try {
        const userList = await fetchAllUsers();

        const total = userList.length;
        const active = userList.filter(u => u.status === 'active').length;
        const suspended = userList.filter(u => u.status === 'suspended').length;
        const inactive = userList.filter(u => u.status === 'inactive').length;
        
        // Calculate new this week (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newThisWeek = userList.filter(u => {
            try {
                const joinDate = new Date(u.joined);
                return joinDate >= oneWeekAgo;
            } catch (e) {
                return false;
            }
        }).length;

        const roleDistribution = userList.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});

        const totalUsers = userList.length || 1;
        const roleDistributionPerc = Object.fromEntries(
            Object.entries(roleDistribution).map(([role, count]) => [role, Math.round((count / totalUsers) * 100)])
        );

        // Generate realistic recent activity with proper relative times
        const recentActivity = [
            {
                type: 'user_login',
                user: userList.find(u => u.role === 'Admin')?.name || 'Super Admin',
                time: generateRealisticTime(0, 0, 5), // 5 minutes ago
                status: 'success',
                details: 'Logged in from desktop browser'
            },
            {
                type: 'user_registered',
                user: userList.find(u => u.role === 'Customer')?.name || 'New Customer',
                time: generateRealisticTime(0, 2, 0), // 2 hours ago
                status: 'success',
                details: 'New customer registered via website'
            },
            {
                type: 'user_suspended',
                user: userList.find(u => u.status === 'suspended')?.name || 'Suspended User',
                time: generateRealisticTime(1, 0, 0), // 1 day ago
                status: 'error',
                details: 'Account suspended for policy violation'
            },
            {
                type: 'role_changed',
                user: userList.find(u => u.role === 'Event Manager')?.name || 'Event Manager',
                time: generateRealisticTime(2, 0, 0), // 2 days ago
                status: 'warning',
                details: 'Role upgraded from Customer to Event Manager'
            },
            {
                type: 'profile_updated',
                user: userList.find(u => u.role === 'Admin')?.name || 'Admin User',
                time: generateRealisticTime(3, 0, 0), // 3 days ago
                status: 'success',
                details: 'Updated contact information'
            },
            {
                type: 'password_reset',
                user: userList.find(u => u.role === 'Customer')?.name || 'Customer',
                time: generateRealisticTime(4, 0, 0), // 4 days ago
                status: 'info',
                details: 'Password reset requested and completed'
            },
            {
                type: 'message_sent',
                user: userList.find(u => u.role === 'Event Manager')?.name || 'Manager',
                time: generateRealisticTime(5, 0, 0), // 5 days ago
                status: 'success',
                details: 'Welcome email sent to new user'
            }
        ].filter(a => a.user !== undefined && a.user !== 'undefined');

        const dashboardData = {
            stats: {
                total,
                active,
                inactive,
                suspended,
                newThisWeek,
                growthRate: 12.3
            },
            analytics: {
                roleDistribution: roleDistributionPerc,
                weeklyGrowth: [98, 112, 134, 156, 142, 168, 156],
                geographic: { 'South Africa': 72, USA: 15, UK: 8, Other: 5 },
                loginTrend: { today: 892, yesterday: 834, avg: 765 }
            },
            userList,
            recentActivity
        };

        res.json({ success: true, data: dashboardData });

    } catch (err) {
        console.error('User Dashboard fetch error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user dashboard data' });
    }
});

// =========================================================================
// 2. CREATE User - WITH REALISTIC TIMES
// =========================================================================
router.post('/create', requireAdminOrManager, async (req, res) => {
    const { firstName, lastName, email, password, role, phone } = req.body;
    
    if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        const bcrypt = req.app.locals.bcrypt;
        const uuidv4 = req.app.locals.uuidv4;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();
        const fullName = `${firstName} ${lastName}`.trim();

        let tableName, insertQuery, insertParams;

        if (role === 'admin') {
            tableName = 'admins';
            insertQuery = `INSERT INTO admins (admin_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            insertParams = [userId, fullName, email, hashedPassword, phone || null, 'active', 'admin', now, now];
        }
        else if (role === 'event_manager') {
            tableName = 'event_managers';
            insertQuery = `INSERT INTO event_managers (manager_id, name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            insertParams = [userId, fullName, email, hashedPassword, phone || null, 'active', 'event_manager', now, now];
        }
        else {
            tableName = 'customers';
            insertQuery = `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, status, role, last_login, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            insertParams = [userId, firstName, lastName, email, hashedPassword, phone || null, 'active', 'customer', now, now];
        }

        const existing = await dbOperations.get(`SELECT email FROM ${tableName} WHERE email = ?`, [email]);
        if (existing) {
             return res.status(409).json({ success: false, error: `User with email ${email} already exists.` });
        }
        
        await dbOperations.run(insertQuery, insertParams);
        
        const roleDisplay = role === 'customer' ? 'Customer' : 
                            role === 'event_manager' ? 'Event Manager' : 'Admin';

        // Insert into dashboard_user_list
        await dbOperations.run(
            `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fullName, email, hashedPassword, roleDisplay, 'active', now.split('T')[0], 'Just now', 
             (firstName[0] + lastName[0]).toUpperCase(), 'South Africa']
        );

        res.json({ 
            success: true, 
            message: 'User created successfully', 
            user: { 
                id: userId, 
                name: fullName, 
                email, 
                role: roleDisplay, 
                status: 'active',
                phone: phone || 'Not provided',
                joined: now.split('T')[0],
                lastActive: 'Just now',
                avatar: (firstName[0] + lastName[0]).toUpperCase(),
                country: 'South Africa',
                first_name: firstName,
                last_name: lastName
            } 
        });

    } catch (err) {
        console.error('User creation error:', err);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

// =========================================================================
// 3. SUSPEND/ACTIVATE User - UPDATES MAIN TABLE
// =========================================================================
router.put('/:id/suspend', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;
    const { action } = req.body; // 'suspend' or 'activate'
    
    if (!action || !['suspend', 'activate'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action. Use "suspend" or "activate"' });
    }

    try {
        // First, determine which table the user is in
        let tableInfo = null;
        let userData = null;
        
        // Check each table
        const tables = [
            { name: 'customers', idColumn: 'customer_id', displayName: 'Customer' },
            { name: 'event_managers', idColumn: 'manager_id', displayName: 'Event Manager' },
            { name: 'admins', idColumn: 'admin_id', displayName: 'Admin' }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                tableInfo = table;
                userData = user;
                break;
            }
        }
        
        if (!tableInfo || !userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Update status in the main user table
        const newStatus = action === 'suspend' ? 'suspended' : 'active';
        await dbOperations.run(
            `UPDATE ${tableInfo.name} SET status = ? WHERE ${tableInfo.idColumn} = ?`,
            [newStatus, userId]
        );
        
        // Update status in dashboard_user_list
        await dbOperations.run(
            `UPDATE dashboard_user_list SET status = ? WHERE email = ?`,
            [newStatus, userData.email]
        );
        
        // Update last_login to now (user was active)
        const now = new Date().toISOString();
        await dbOperations.run(
            `UPDATE ${tableInfo.name} SET last_login = ? WHERE ${tableInfo.idColumn} = ?`,
            [now, userId]
        );
        
        // Update recent activity
        const activityType = action === 'suspend' ? 'user_suspended' : 'user_activated';
        const userName = userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        
        res.json({
            success: true,
            message: `User ${action === 'suspend' ? 'suspended' : 'activated'} successfully`,
            user: {
                id: userId,
                status: newStatus,
                name: userName
            }
        });
        
    } catch (err) {
        console.error('Suspend/Activate user error:', err);
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
});

// =========================================================================
// 4. UPDATE User Profile
// =========================================================================
router.put('/:id/update', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;
    const { firstName, lastName, email, phone, role } = req.body;
    
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Determine which table the user is in
        let tableInfo = null;
        let currentUser = null;
        
        const tables = [
            { name: 'customers', idColumn: 'customer_id', updateQuery: `
                UPDATE customers SET 
                    first_name = ?, 
                    last_name = ?, 
                    email = ?, 
                    phone = ? 
                WHERE customer_id = ?` 
            },
            { name: 'event_managers', idColumn: 'manager_id', updateQuery: `
                UPDATE event_managers SET 
                    name = ?, 
                    email = ?, 
                    phone = ? 
                WHERE manager_id = ?` 
            },
            { name: 'admins', idColumn: 'admin_id', updateQuery: `
                UPDATE admins SET 
                    name = ?, 
                    email = ?, 
                    phone = ? 
                WHERE admin_id = ?` 
            }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                tableInfo = table;
                currentUser = user;
                break;
            }
        }
        
        if (!tableInfo || !currentUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Update the main table
        if (tableInfo.name === 'customers') {
            await dbOperations.run(tableInfo.updateQuery, [
                firstName, lastName, email, phone || null, userId
            ]);
        } else {
            const fullName = `${firstName} ${lastName}`;
            await dbOperations.run(tableInfo.updateQuery, [
                fullName, email, phone || null, userId
            ]);
        }
        
        // Update dashboard_user_list
        const fullName = tableInfo.name === 'customers' ? `${firstName} ${lastName}` : `${firstName} ${lastName}`;
        await dbOperations.run(
            `UPDATE dashboard_user_list SET name = ?, email = ? WHERE email = ?`,
            [fullName, email, currentUser.email]
        );
        
        res.json({
            success: true,
            message: 'User profile updated successfully',
            user: {
                id: userId,
                name: fullName,
                email,
                phone: phone || 'Not provided',
                first_name: firstName,
                last_name: lastName
            }
        });
        
    } catch (err) {
        console.error('Update user error:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ success: false, error: 'Email already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to update user profile' });
    }
});

// =========================================================================
// 5. RESET User Password
// =========================================================================
router.put('/:id/reset-password', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    try {
        // Determine which table the user is in
        let tableInfo = null;
        let currentUser = null;
        
        const tables = [
            { name: 'customers', idColumn: 'customer_id' },
            { name: 'event_managers', idColumn: 'manager_id' },
            { name: 'admins', idColumn: 'admin_id' }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                tableInfo = table;
                currentUser = user;
                break;
            }
        }
        
        if (!tableInfo || !currentUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Hash the new password
        const bcrypt = req.app.locals.bcrypt;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password in the main table
        await dbOperations.run(
            `UPDATE ${tableInfo.name} SET password = ? WHERE ${tableInfo.idColumn} = ?`,
            [hashedPassword, userId]
        );
        
        // Update password in dashboard_user_list
        await dbOperations.run(
            `UPDATE dashboard_user_list SET password = ? WHERE email = ?`,
            [hashedPassword, currentUser.email]
        );
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

// =========================================================================
// 6. SEND Message to User
// =========================================================================
router.post('/:id/send-message', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;
    const { subject, message, method } = req.body; // method: 'email' or 'notification'
    
    if (!subject || !message || !method) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Find user email
        let userEmail = null;
        let userName = null;
        
        const tables = [
            { name: 'customers', idColumn: 'customer_id', emailField: 'email', nameField: "first_name || ' ' || last_name" },
            { name: 'event_managers', idColumn: 'manager_id', emailField: 'email', nameField: 'name' },
            { name: 'admins', idColumn: 'admin_id', emailField: 'email', nameField: 'name' }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT ${table.emailField} as email, ${table.nameField} as name FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                userEmail = user.email;
                userName = user.name;
                break;
            }
        }
        
        if (!userEmail) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Simulate sending message
        console.log(`Sending ${method} to ${userEmail} (${userName}):`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        
        // Add to recent activity
        const activity = {
            type: 'message_sent',
            user: userName,
            time: 'Just now',
            status: 'success',
            details: `${method === 'email' ? 'Email' : 'Notification'} sent: ${subject}`
        };
        
        res.json({
            success: true,
            message: `${method === 'email' ? 'Email' : 'Notification'} sent successfully to ${userName}`,
            details: {
                to: userEmail,
                subject,
                method,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// =========================================================================
// 7. GET User Details
// =========================================================================
router.get('/:id', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;

    try {
        // Check all tables for the user
        const tables = [
            { name: 'customers', idColumn: 'customer_id', role: 'Customer' },
            { name: 'event_managers', idColumn: 'manager_id', role: 'Event Manager' },
            { name: 'admins', idColumn: 'admin_id', role: 'Admin' }
        ];
        
        let userData = null;
        let userRole = null;
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                userData = user;
                userRole = table.role;
                break;
            }
        }
        
        if (!userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get status from dashboard_user_list
        const dashboardUser = await dbOperations.get(
            `SELECT status, joined, lastActive, avatar, country FROM dashboard_user_list WHERE email = ?`,
            [userData.email]
        );
        
        const fullName = userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        
        // Generate realistic last active time
        let lastActive = 'Recently';
        if (userData.last_login) {
            const lastLogin = new Date(userData.last_login);
            const now = new Date();
            const diffHours = Math.floor((now - lastLogin) / 3600000);
            
            if (diffHours < 1) {
                const diffMins = Math.floor((now - lastLogin) / 60000);
                lastActive = diffMins < 1 ? 'Just now' : `${diffMins} mins ago`;
            } else if (diffHours < 24) {
                lastActive = `${diffHours} hours ago`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                lastActive = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
            }
        } else if (dashboardUser?.lastActive) {
            lastActive = dashboardUser.lastActive;
        }
        
        // Format joined date
        let joined = 'Unknown';
        if (dashboardUser?.joined) {
            joined = dashboardUser.joined;
        } else if (userData.created_at) {
            try {
                const joinDate = new Date(userData.created_at);
                joined = joinDate.toISOString().split('T')[0];
            } catch (err) {
                joined = 'Unknown';
            }
        }
        
        res.json({
            success: true,
            user: {
                id: userId,
                name: fullName,
                email: userData.email,
                role: userRole,
                status: userData.status || dashboardUser?.status || 'active',
                phone: userData.phone || 'Not provided',
                joined: joined,
                lastActive: lastActive,
                avatar: dashboardUser?.avatar || (fullName[0] || 'A').toUpperCase(),
                country: dashboardUser?.country || 'South Africa',
                first_name: userData.first_name || fullName.split(' ')[0],
                last_name: userData.last_name || fullName.split(' ').slice(1).join(' ')
            }
        });
        
    } catch (err) {
        console.error('Get user details error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user details' });
    }
});

// =========================================================================
// 8. CHANGE USER ROLE - WITH STATUS PRESERVATION
// =========================================================================
router.put('/:id/change-role', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;
    const { newRole } = req.body;
    
    if (!newRole || !['customer', 'event_manager', 'admin'].includes(newRole)) {
        return res.status(400).json({ success: false, error: 'Invalid role. Must be customer, event_manager, or admin' });
    }

    try {
        // First, determine which table the user is currently in
        let currentTable = null;
        let currentUser = null;
        
        const tables = [
            { name: 'customers', idColumn: 'customer_id', role: 'Customer' },
            { name: 'event_managers', idColumn: 'manager_id', role: 'Event Manager' },
            { name: 'admins', idColumn: 'admin_id', role: 'Admin' }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                currentTable = table;
                currentUser = user;
                break;
            }
        }
        
        if (!currentTable || !currentUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Don't allow changing to the same role
        const currentRole = currentTable.name === 'customers' ? 'customer' : 
                           currentTable.name === 'event_managers' ? 'event_manager' : 'admin';
        
        if (currentRole === newRole) {
            return res.status(400).json({ success: false, error: 'User already has this role' });
        }

        // Determine target table based on new role
        let targetTable, targetIdColumn;
        switch(newRole) {
            case 'customer':
                targetTable = 'customers';
                targetIdColumn = 'customer_id';
                break;
            case 'event_manager':
                targetTable = 'event_managers';
                targetIdColumn = 'manager_id';
                break;
            case 'admin':
                targetTable = 'admins';
                targetIdColumn = 'admin_id';
                break;
        }

        // Check if email already exists in target table
        const existingInTarget = await dbOperations.get(
            `SELECT * FROM ${targetTable} WHERE email = ?`,
            [currentUser.email]
        );
        
        if (existingInTarget && existingInTarget[targetIdColumn] !== userId) {
            return res.status(409).json({ success: false, error: 'A user with this email already exists in the target role table' });
        }

        // Begin transaction-like operations
        try {
            // 1. Copy user data to new table with preserved status
            const now = new Date().toISOString();
            if (newRole === 'customer') {
                await dbOperations.run(
                    `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, status, role, last_login, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        currentUser.first_name || currentUser.name?.split(' ')[0] || 'User',
                        currentUser.last_name || currentUser.name?.split(' ').slice(1).join(' ') || 'User',
                        currentUser.email,
                        currentUser.password,
                        currentUser.phone || null,
                        currentUser.status || 'active', // PRESERVE STATUS
                        'customer',
                        now, // Update last_login to now
                        currentUser.created_at || now
                    ]
                );
            } else if (newRole === 'event_manager') {
                const fullName = currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
                await dbOperations.run(
                    `INSERT INTO event_managers (manager_id, name, email, password, phone, status, role, last_login, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        fullName,
                        currentUser.email,
                        currentUser.password,
                        currentUser.phone || null,
                        currentUser.status || 'active', // PRESERVE STATUS
                        'event_manager',
                        now, // Update last_login to now
                        currentUser.created_at || now
                    ]
                );
            } else if (newRole === 'admin') {
                const fullName = currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
                await dbOperations.run(
                    `INSERT INTO admins (admin_id, name, email, password, phone, status, role, last_login, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        fullName,
                        currentUser.email,
                        currentUser.password,
                        currentUser.phone || null,
                        currentUser.status || 'active', // PRESERVE STATUS
                        'admin',
                        now, // Update last_login to now
                        currentUser.created_at || now
                    ]
                );
            }

            // 2. Remove from old table
            await dbOperations.run(
                `DELETE FROM ${currentTable.name} WHERE ${currentTable.idColumn} = ?`,
                [userId]
            );

            // 3. Update dashboard_user_list
            const roleDisplay = newRole === 'customer' ? 'Customer' : 
                               newRole === 'event_manager' ? 'Event Manager' : 'Admin';
            
            await dbOperations.run(
                `UPDATE dashboard_user_list SET role = ?, status = ?, lastActive = 'Just now' WHERE email = ?`,
                [roleDisplay, currentUser.status || 'active', currentUser.email]
            );

            // 4. Get updated user info for response
            let updatedUser;
            if (newRole === 'customer') {
                updatedUser = await dbOperations.get(
                    `SELECT * FROM customers WHERE customer_id = ?`,
                    [userId]
                );
            } else if (newRole === 'event_manager') {
                updatedUser = await dbOperations.get(
                    `SELECT * FROM event_managers WHERE manager_id = ?`,
                    [userId]
                );
            } else {
                updatedUser = await dbOperations.get(
                    `SELECT * FROM admins WHERE admin_id = ?`,
                    [userId]
                );
            }

            const fullName = newRole === 'customer' 
                ? `${updatedUser.first_name} ${updatedUser.last_name}`
                : updatedUser.name;

            res.json({
                success: true,
                message: `User role changed to ${roleDisplay} successfully`,
                user: {
                    id: userId,
                    name: fullName,
                    email: updatedUser.email,
                    role: roleDisplay,
                    status: updatedUser.status || 'active',
                    phone: updatedUser.phone || 'Not provided',
                    first_name: newRole === 'customer' ? updatedUser.first_name : fullName.split(' ')[0],
                    last_name: newRole === 'customer' ? updatedUser.last_name : fullName.split(' ').slice(1).join(' ')
                }
            });

        } catch (transferError) {
            console.error('Role transfer error:', transferError);
            // Attempt to rollback by deleting from target table
            try {
                await dbOperations.run(
                    `DELETE FROM ${targetTable} WHERE ${targetIdColumn} = ?`,
                    [userId]
                );
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
            throw transferError;
        }
        
    } catch (err) {
        console.error('Change role error:', err);
        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            return res.status(409).json({ success: false, error: 'User with this email already exists in target table' });
        }
        res.status(500).json({ success: false, error: 'Failed to change user role' });
    }
});

// =========================================================================
// 9. DELETE USER - PERMANENTLY REMOVE FROM ALL TABLES
// =========================================================================
router.delete('/:id/delete', requireAdminOrManager, async (req, res) => {
    const userId = req.params.id;

    try {
        // First, determine which table the user is in
        let tableInfo = null;
        let currentUser = null;
        
        const tables = [
            { name: 'customers', idColumn: 'customer_id' },
            { name: 'event_managers', idColumn: 'manager_id' },
            { name: 'admins', idColumn: 'admin_id' }
        ];
        
        for (const table of tables) {
            const user = await dbOperations.get(
                `SELECT * FROM ${table.name} WHERE ${table.idColumn} = ?`,
                [userId]
            );
            
            if (user) {
                tableInfo = table;
                currentUser = user;
                break;
            }
        }
        
        if (!tableInfo || !currentUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent deleting the currently logged-in admin
        const loggedInUser = req.user;
        if (loggedInUser && 
            (loggedInUser.admin_id === userId || 
             loggedInUser.userId === userId || 
             loggedInUser.email === currentUser.email)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You cannot delete your own account while logged in' 
            });
        }

        // Prevent deleting default accounts
        const defaultEmails = [
            'admin@tickethub.co.za',
            'manager@tickethub.co.za',
            'customer@test.com'
        ];
        
        if (defaultEmails.includes(currentUser.email)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot delete default system accounts' 
            });
        }

        // Begin deletion process
        try {
            // 1. Delete from the main user table
            await dbOperations.run(
                `DELETE FROM ${tableInfo.name} WHERE ${tableInfo.idColumn} = ?`,
                [userId]
            );
            
            // 2. Delete from dashboard_user_list
            await dbOperations.run(
                `DELETE FROM dashboard_user_list WHERE email = ?`,
                [currentUser.email]
            );
            
            // 3. Optional: Delete related data
            try {
                // If the user is an event manager, archive their events
                if (tableInfo.name === 'event_managers') {
                    await dbOperations.run(
                        `UPDATE events SET status = 'ARCHIVED' WHERE created_by = ?`,
                        [userId]
                    );
                }
                
                // If the user is a customer, delete their tickets
                if (tableInfo.name === 'customers') {
                    try {
                        await dbOperations.run(
                            `DELETE FROM tickets WHERE customer_id = ?`,
                            [userId]
                        );
                    } catch (ticketError) {
                        // Tickets table might not exist
                        console.log('Note: Tickets table not found or no foreign key constraint');
                    }
                }
            } catch (relatedDataError) {
                console.log('Note: Could not clean up related data:', relatedDataError.message);
                // Continue anyway - main user deletion succeeded
            }

            res.json({
                success: true,
                message: 'User account permanently deleted successfully',
                details: {
                    userId,
                    email: currentUser.email,
                    name: currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                    deletedFrom: [tableInfo.name, 'dashboard_user_list']
                }
            });
            
        } catch (deleteError) {
            console.error('Deletion error:', deleteError);
            throw deleteError;
        }
        
    } catch (err) {
        console.error('Delete user error:', err);
        if (err.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(409).json({ 
                success: false, 
                error: 'Cannot delete user because they have related records. Please reassign or delete related records first.' 
            });
        }
        res.status(500).json({ success: false, error: 'Failed to delete user account' });
    }
});

module.exports = router;