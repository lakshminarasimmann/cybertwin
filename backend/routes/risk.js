/**
 * Risk Routes — Risk Event Management (v2 with SQLite)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/risk/events — Get risk event history
router.get('/events', authenticateToken, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const events = db.getRiskByUser(req.user.id, limit);
        res.json({ events, total: events.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/risk/all — Get all risk events (for admin/demo)
router.get('/all', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const events = db.getAllRiskEvents(limit);
        res.json({ events, total: events.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/risk/stats — Risk statistics for user
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const stats = db.getRiskStats(req.user.id);
        const trend = db.getRiskTrend(req.user.id, 20);

        res.json({
            stats: {
                total_events: stats.total,
                avg_score: stats.avg_score ? +stats.avg_score.toFixed(1) : 0,
                max_score: stats.max_score || 0,
                min_score: stats.min_score || 0,
                decisions: {
                    allow: stats.allow_count || 0,
                    warn: stats.warn_count || 0,
                    block: stats.block_count || 0,
                }
            },
            trend: trend.reverse(),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/risk/trend — Risk score trend
router.get('/trend', authenticateToken, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const trend = db.getRiskTrend(req.user.id, limit);
        res.json({ trend: trend.reverse() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
