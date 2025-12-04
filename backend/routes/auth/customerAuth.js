// backend/routes/auth/customerAuth.js
const express = require('express');
const router = express.Router();
const { dbOperations } = require('../../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ticket-hub-super-secret-2025';

// Customer Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    try {
        // Find customer by email
        const customer = await dbOperations.get(
            'SELECT * FROM customers WHERE email = ?',
            [username]
        );

        if (!customer) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 🔥 CHECK USER STATUS
        if (customer.status === 'suspended') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account suspended. Please contact administrator.' 
            });
        }

        if (customer.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                error: 'Account inactive. Please contact administrator.' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, customer.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                customer_id: customer.customer_id,
                email: customer.email,
                role: 'customer',
                userType: 'customer',
                name: `${customer.first_name} ${customer.last_name}`,
                status: customer.status
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login time in dashboard_user_list
        try {
            await dbOperations.run(
                `UPDATE dashboard_user_list SET lastActive = ? WHERE email = ?`,
                [new Date().toISOString(), customer.email]
            );
        } catch (updateError) {
            console.log('Could not update lastActive:', updateError.message);
        }

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                customer_id: customer.customer_id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone: customer.phone,
                role: 'customer',
                userType: 'customer',
                status: customer.status
            }
        });

    } catch (err) {
        console.error('Customer login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Customer Registration (optional - keep existing)
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        const bcrypt = require('bcryptjs');
        const { v4: uuidv4 } = require('uuid');

        // Check if email already exists
        const existing = await dbOperations.get(
            'SELECT email FROM customers WHERE email = ?',
            [email]
        );

        if (existing) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const customerId = uuidv4();
        const now = new Date().toISOString();

        // Insert into customers table with active status
        await dbOperations.run(
            `INSERT INTO customers (customer_id, first_name, last_name, email, password, phone, status, role, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customerId, firstName, lastName, email, hashedPassword, phone || null, 'active', 'customer', now]
        );

        // Insert into dashboard_user_list
        await dbOperations.run(
            `INSERT INTO dashboard_user_list (name, email, password, role, status, joined, lastActive, avatar, country)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`${firstName} ${lastName}`, email, hashedPassword, 'Customer', 'active', 
             now.split('T')[0], 'Just now', (firstName[0] + lastName[0]).toUpperCase(), 'South Africa']
        );

        // Create JWT token
        const token = jwt.sign(
            {
                customer_id: customerId,
                email: email,
                role: 'customer',
                userType: 'customer',
                name: `${firstName} ${lastName}`,
                status: 'active'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                customer_id: customerId,
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone || null,
                role: 'customer',
                userType: 'customer',
                status: 'active'
            }
        });

    } catch (err) {
        console.error('Customer registration error:', err);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

module.exports = router;