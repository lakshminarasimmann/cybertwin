/**
 * Twin Routes (v2 with SQLite)
 */
const express = require('express');
const router = express.Router();
const { getTwin, clearTwinCache, TWIN_CONFIG } = require('../engines/twin');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/baseline', authenticateToken, (req, res) => {
    try {
        const twin = getTwin(req.user.id);
        twin.loadBaselineSync(db);
        res.json({ baseline: twin.getBaseline(), calibrated: twin.isCalibrated(), userId: req.user.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch baseline' });
    }
});

router.post('/reset', authenticateToken, (req, res) => {
    try {
        clearTwinCache(req.user.id);
        const defaultBaseline = { user_id: req.user.id, ...TWIN_CONFIG.DEFAULT_BASELINE };
        db.upsertBaseline(defaultBaseline);
        res.json({ message: 'Baseline reset', baseline: defaultBaseline });
    } catch (error) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

module.exports = router;
