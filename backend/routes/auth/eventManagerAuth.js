// backend/routes/auth/eventManagerAuth.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ticket-hub-super-secret-2025';

// Event Manager Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    try {
        // Find event manager by email
        const manager = await dbOperations.get(
            'SELECT * FROM event_managers WHERE email = ?',
            [username]
        );

        if (!manager) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 🔥 CHECK USER STATUS
        if (manager.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account suspended. Please contact administrator.' 
            });
        }

        if (manager.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account inactive. Please contact administrator.' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, manager.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            {
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

        // Update last login time in dashboard_user_list
        try {
            await dbOperations.run(
                `UPDATE dashboard_user_list SET lastActive = ? WHERE email = ?`,
                [new Date().toISOString(), manager.email]
            );
        } catch (updateError) {
            console.log('Could not update lastActive:', updateError.message);
        }

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                manager_id: manager.manager_id,
                name: manager.name,
                email: manager.email,
                phone: manager.phone,
                role: 'event_manager',
                userType: 'event_manager',
                status: manager.status
            }
        });

    } catch (err) {
        console.error('Event manager login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

module.exports = router;