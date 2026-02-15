/**
 * Session Routes — Behavioral Telemetry Ingestion (v2 with SQLite)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getTwin } = require('../engines/twin');
const { computeRiskScore } = require('../engines/risk');
const { generateNarrative } = require('../engines/narrative');

// POST /api/session/behavior — Submit behavioral metrics
router.post('/behavior', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const behavior = req.body;

        // Store raw session data in SQLite
        db.insertSession({
            user_id: userId,
            session_id: behavior.session_id,
            hold_time: behavior.hold_time,
            dd_time: behavior.dd_time,
            ud_time: behavior.ud_time,
            typing_speed: behavior.typing_speed,
            flight_time: behavior.flight_time,
            dwell_time: behavior.dwell_time,
            click_interval: behavior.click_interval,
            mouse_speed: behavior.mouse_speed,
            mouse_acceleration: behavior.mouse_acceleration,
            scroll_speed: behavior.scroll_speed,
            navigation_depth: behavior.navigation_depth,
            read_time: behavior.read_time,
            navigation_entropy: behavior.navigation_entropy,
            page_transitions: behavior.page_transitions,
            idle_time: behavior.idle_time,
            raw_features: behavior,
        });

        // Load/update twin
        const twin = getTwin(userId);
        twin.loadBaselineSync(db);
        const deviation = twin.computeDeviation(behavior);
        const risk = computeRiskScore(deviation.metrics);

        // Generate narrative if risk is elevated
        let narrative = null;
        if (risk.score > 30) {
            narrative = generateNarrative(deviation.metrics, risk.score, deviation.raw);
        }

        // Update twin baseline
        const twinUpdate = twin.updateBaselineSync(behavior, db);

        // Store risk event
        db.insertRiskEvent({
            session_id: behavior.session_id,
            user_id: userId,
            risk_score: risk.score,
            decision: risk.decision,
            attack_type: narrative?.attackType || null,
            confidence: narrative ? parseFloat(narrative.confidence) : null,
            narrative_summary: narrative?.summary || `Session processed. Risk: ${risk.score}/100`,
            narrative_stages: narrative?.stages || null,
            deviations: deviation.metrics,
            raw_behavior: behavior,
            baseline_snapshot: twin.getBaseline(),
        });

        res.json({
            risk: {
                score: risk.score,
                decision: risk.decision,
                label: risk.label,
            },
            deviation: deviation.metrics,
            narrative: narrative ? {
                summary: narrative.summary,
                stages: narrative.stages,
                attackType: narrative.attackType,
                confidence: narrative.confidence,
            } : null,
            twinUpdated: twinUpdate.updated,
            baseline: twin.getBaseline(),
            sessionCount: db.getSessionCount(userId),
        });
    } catch (error) {
        console.error('Behavior ingestion error:', error);
        res.status(500).json({ error: 'Failed to process behavior' });
    }
});

// GET /api/session/history — Get session behavior history
router.get('/history', authenticateToken, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const sessions = db.getSessionsByUser(req.user.id, limit);

        // Parse raw_features JSON
        const parsed = sessions.map(s => ({
            ...s,
            raw_features: s.raw_features ? JSON.parse(s.raw_features) : null,
        }));

        res.json({
            sessions: parsed,
            total: db.getSessionCount(req.user.id),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
