// backend/routes/auth/adminAuth.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set backend/.env JWT_SECRET for production.');
}

// Admin Login
router.post('/login', async (req, res) => {
    const { username, email, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    try {
        // Find admin by email
        const admin = await dbOperations.get(
            'SELECT * FROM admins WHERE email = ?',
            [identifier]
        );

        if (!admin) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 🔥 CHECK USER STATUS
        if (admin.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account suspended. Please contact administrator.' 
            });
        }

        if (admin.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account inactive. Please contact administrator.' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                email: admin.email,
                role: admin.role || 'admin',
                userType: 'admin',
                name: admin.name,
                status: admin.status
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login time in dashboard_user_list
        try {
            await dbOperations.run(
                `UPDATE dashboard_user_list SET lastActive = ? WHERE email = ?`,
                [new Date().toISOString(), admin.email]
            );
        } catch (updateError) {
            console.log('Could not update lastActive:', updateError.message);
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    admin_id: admin.admin_id,
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    role: admin.role || 'admin',
                    userType: 'admin',
                    status: admin.status
                }
            },
            token,
            user: {
                admin_id: admin.admin_id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role || 'admin',
                userType: 'admin',
                status: admin.status
            }
        });

    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Demo admin login endpoint used by frontend fallback flow
router.post('/demo-login', async (req, res) => {
    const { username, email, password } = req.body || {};
    const identifier = email || username;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    try {
        const admin = await dbOperations.get(
            'SELECT * FROM admins WHERE email = ?',
            [identifier]
        );

        if (!admin) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        if (admin.status === 'suspended' || admin.status === 'inactive') {
            return res.status(403).json({
                success: false,
                error: 'Account unavailable. Please contact administrator.'
            });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                email: admin.email,
                role: admin.role || 'admin',
                userType: 'admin',
                name: admin.name,
                status: admin.status
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Demo login successful',
            data: {
                token,
                user: {
                    admin_id: admin.admin_id,
                    name: admin.name,
                    email: admin.email,
                    phone: admin.phone,
                    role: admin.role || 'admin',
                    userType: 'admin',
                    status: admin.status
                }
            },
            token,
            user: {
                admin_id: admin.admin_id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role || 'admin',
                userType: 'admin',
                status: admin.status
            }
        });
    } catch (err) {
        console.error('Demo admin login error:', err);
        return res.status(500).json({ success: false, error: 'Login failed' });
    }
});

module.exports = router;
