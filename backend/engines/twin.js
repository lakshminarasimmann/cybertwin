/**
 * Cognitive Digital Twin Engine (v2 — Sync SQLite)
 */

const TWIN_CONFIG = {
    LEARNING_RATE: 0.1,
    MAX_SAFE_DEVIATION: 0.5,
    MIN_CALIBRATION_SESSIONS: 5,
    DEFAULT_BASELINE: {
        avg_hold_time: 0.1, avg_dd_time: 0.2, avg_ud_time: 0.1,
        avg_typing_speed: 200, avg_flight_time: 0.12, avg_dwell_time: 0.08,
        avg_click_interval: 450, avg_mouse_speed: 2.0,
        avg_read_time: 3000, avg_navigation_entropy: 0.35,
        session_count: 0
    }
};

class CognitiveDigitalTwin {
    constructor(userId) {
        this.userId = userId;
        this.baseline = null;
        this.calibrated = false;
    }

    loadBaselineSync(db) {
        try {
            const existing = db.getBaseline(this.userId);
            if (existing) {
                this.baseline = existing;
                this.calibrated = (existing.session_count || 0) >= TWIN_CONFIG.MIN_CALIBRATION_SESSIONS;
                return this.baseline;
            }
            const newBaseline = { user_id: this.userId, ...TWIN_CONFIG.DEFAULT_BASELINE };
            db.upsertBaseline(newBaseline);
            this.baseline = newBaseline;
            this.calibrated = false;
            return this.baseline;
        } catch (error) {
            console.error('Baseline load error:', error);
            this.baseline = { user_id: this.userId, ...TWIN_CONFIG.DEFAULT_BASELINE };
            return this.baseline;
        }
    }

    // For backward compat
    async loadBaseline() {
        const { db } = require('../config/database');
        return this.loadBaselineSync(db);
    }

    updateBaselineSync(currentBehavior, db) {
        if (!this.baseline) this.loadBaselineSync(db);

        const metrics = [
            ['avg_typing_speed', 'typing_speed'],
            ['avg_click_interval', 'click_interval'],
            ['avg_mouse_speed', 'mouse_speed'],
            ['avg_read_time', 'read_time'],
            ['avg_navigation_entropy', 'navigation_entropy'],
            ['avg_hold_time', 'hold_time'],
            ['avg_dd_time', 'dd_time'],
            ['avg_ud_time', 'ud_time'],
        ];

        let updateRejected = false;
        const updatedFields = {};

        for (const [baseKey, currentKey] of metrics) {
            const currentValue = currentBehavior[currentKey];
            const baselineValue = this.baseline[baseKey];
            if (currentValue == null || baselineValue == null) continue;

            const deviation = baselineValue > 0 ? Math.abs(currentValue - baselineValue) / baselineValue : 0;
            if (deviation > TWIN_CONFIG.MAX_SAFE_DEVIATION) {
                updateRejected = true;
                continue;
            }

            updatedFields[baseKey] = baselineValue * (1 - TWIN_CONFIG.LEARNING_RATE) + currentValue * TWIN_CONFIG.LEARNING_RATE;
        }

        updatedFields.session_count = (this.baseline.session_count || 0) + 1;
        this.baseline = { ...this.baseline, ...updatedFields };
        this.calibrated = updatedFields.session_count >= TWIN_CONFIG.MIN_CALIBRATION_SESSIONS;

        try {
            db.upsertBaseline({ user_id: this.userId, ...this.baseline, calibrated: this.calibrated });
        } catch (e) { console.error('Baseline persist error:', e); }

        return {
            updated: !updateRejected,
            baseline: this.baseline,
            rejectionReason: updateRejected ? 'High deviation — poisoning protection active' : null,
            calibrated: this.calibrated
        };
    }

    async updateBaseline(currentBehavior) {
        const { db } = require('../config/database');
        return this.updateBaselineSync(currentBehavior, db);
    }

    computeDeviation(currentBehavior) {
        if (!this.baseline) return { overall: 0, metrics: {}, raw: {} };

        const deviations = {};
        const raw = {};
        const metricMap = {
            typing_speed: 'avg_typing_speed', click_interval: 'avg_click_interval',
            mouse_speed: 'avg_mouse_speed', read_time: 'avg_read_time',
            navigation_entropy: 'avg_navigation_entropy',
            hold_time: 'avg_hold_time', dd_time: 'avg_dd_time', ud_time: 'avg_ud_time',
        };

        for (const [currentKey, baselineKey] of Object.entries(metricMap)) {
            const cv = currentBehavior[currentKey];
            const bv = this.baseline[baselineKey];
            if (cv == null || !bv) { deviations[currentKey] = 0; raw[currentKey] = { current: cv || 0, baseline: bv || 0 }; continue; }
            deviations[currentKey] = Math.abs(cv - bv) / bv;
            raw[currentKey] = { current: cv, baseline: bv, deviation: deviations[currentKey] };
        }

        const weights = {
            typing_speed: 0.20, click_interval: 0.15, mouse_speed: 0.10,
            read_time: 0.15, navigation_entropy: 0.10,
            hold_time: 0.12, dd_time: 0.10, ud_time: 0.08,
        };

        let ws = 0, tw = 0;
        for (const [k, w] of Object.entries(weights)) {
            if (deviations[k] != null) { ws += deviations[k] * w; tw += w; }
        }
        const overall = tw > 0 ? ws / tw : 0;
        return { overall, metrics: deviations, raw };
    }

    getBaseline() { return this.baseline; }
    isCalibrated() { return this.calibrated; }
}

const twinCache = new Map();
function getTwin(userId) {
    if (!twinCache.has(userId)) twinCache.set(userId, new CognitiveDigitalTwin(userId));
    return twinCache.get(userId);
}
function clearTwinCache(userId) { userId ? twinCache.delete(userId) : twinCache.clear(); }

module.exports = { CognitiveDigitalTwin, getTwin, clearTwinCache, TWIN_CONFIG };
