/**
 * Auth Routes — JWT Authentication (v2 with SQLite)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'cybertwin_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// POST /api/auth/demo-token — Get demo token (no login needed)
router.post('/demo-token', (req, res) => {
    try {
        let user = db.getUserByEmail('demo@cybertwin.io');
        if (!user) {
            user = db.createUser('demo@cybertwin.io', '$2b$10$demo', 'Demo Operator');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'demo', name: user.display_name || 'Demo Operator' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        db.updateLastLogin(user.id);

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.display_name || 'Demo Operator', role: 'demo' },
            message: 'Demo session initialized — behavioral tracking active'
        });
    } catch (error) {
        console.error('Demo token error:', error);
        res.status(500).json({ error: 'Failed to create demo token' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existing = db.getUserByEmail(email);
        if (existing) return res.status(409).json({ error: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = db.createUser(email, passwordHash, name || email.split('@')[0]);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'user', name: user.display_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.display_name } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = db.getUserByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.display_name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        db.updateLastLogin(user.id);

        res.json({ token, user: { id: user.id, email: user.email, name: user.display_name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me — Check current session
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ user: decoded, valid: true });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token', valid: false });
    }
});

module.exports = router;
