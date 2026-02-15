/**
 * Cognitive Digital Twin Engine
 * 
 * CORE NOVELTY: The system learns slowly, attackers act suddenly.
 * 
 * This engine maintains a rolling behavioral baseline per user.
 * The baseline is a "cognitive twin" — a statistical representation
 * of how the user naturally behaves under normal conditions.
 * 
 * Key properties:
 * - Gradual adaptation (exponential moving average)
 * - Resistant to sudden spikes (poisoning protection)
 * - Requires minimum session count before trusted
 * - Per-user isolation (no cross-contamination)
 */

const { db } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// Configuration
const LEARNING_RATE = parseFloat(process.env.BASELINE_LEARNING_RATE) || 0.1;
const SAFE_DEVIATION_THRESHOLD = parseFloat(process.env.BASELINE_SAFE_DEVIATION) || 0.5;
const MIN_SESSIONS = parseInt(process.env.MIN_SESSIONS_FOR_BASELINE) || 3;

/**
 * Update the behavioral baseline for a user
 * 
 * Uses exponential moving average with poisoning protection:
 * - If deviation > safe threshold, DON'T update baseline
 * - This prevents attackers from gradually shifting the baseline
 * 
 * Formula: baseline = (old * (1 - α)) + (new * α)
 * Where α = LEARNING_RATE (default 0.1)
 */
async function updateBaseline(userId, currentBehavior, existingBaseline) {
    let baseline = existingBaseline;
    let status = 'learning';
    let sessionCount = 0;

    if (!baseline) {
        // First session — initialize baseline from current behavior
        baseline = {
            id: uuidv4(),
            user_id: userId,
            avg_typing_speed: currentBehavior.typing_speed,
            avg_click_interval: currentBehavior.click_interval,
            avg_mouse_speed: currentBehavior.mouse_speed,
            avg_read_time: currentBehavior.read_time || 3000,
            avg_navigation_entropy: currentBehavior.navigation_entropy || 0.3,
            login_time_pattern: { preferred_hours: [new Date().getHours()], timezone: 'UTC' },
            session_count: 1,
            updated_at: new Date().toISOString()
        };

        await db.upsertBaseline(baseline);
        return { baseline, status: 'initialized', sessionCount: 1 };
    }

    sessionCount = (baseline.session_count || 0) + 1;

    // ─── Compute Deviations ──────────────────────────────────────────────
    const deviations = computeDeviations(currentBehavior, baseline);
    const avgDeviation = Object.values(deviations).reduce((a, b) => a + b, 0) / Object.values(deviations).length;

    // ─── Poisoning Protection ────────────────────────────────────────────
    // If deviation is too high, this might be an attacker trying to shift the baseline
    if (avgDeviation > SAFE_DEVIATION_THRESHOLD && sessionCount > MIN_SESSIONS) {
        status = 'deviation_detected';
        // Don't update baseline — protect twin integrity
        return { baseline, status, sessionCount, deviations, avgDeviation };
    }

    // ─── Exponential Moving Average Update ───────────────────────────────
    // The twin adapts slowly to genuine behavioral drift
    const α = LEARNING_RATE;
    const updatedBaseline = {
        ...baseline,
        avg_typing_speed: ema(baseline.avg_typing_speed, currentBehavior.typing_speed, α),
        avg_click_interval: ema(baseline.avg_click_interval, currentBehavior.click_interval, α),
        avg_mouse_speed: ema(baseline.avg_mouse_speed, currentBehavior.mouse_speed, α),
        avg_read_time: ema(baseline.avg_read_time, currentBehavior.read_time || baseline.avg_read_time, α),
        avg_navigation_entropy: ema(baseline.avg_navigation_entropy, currentBehavior.navigation_entropy || baseline.avg_navigation_entropy, α),
        session_count: sessionCount,
        updated_at: new Date().toISOString()
    };

    // Update time-of-day pattern
    const currentHour = new Date().getHours();
    const pattern = updatedBaseline.login_time_pattern || { preferred_hours: [] };
    if (!pattern.preferred_hours.includes(currentHour)) {
        pattern.preferred_hours.push(currentHour);
        // Keep only the most recent 10 hours
        if (pattern.preferred_hours.length > 10) {
            pattern.preferred_hours = pattern.preferred_hours.slice(-10);
        }
    }
    updatedBaseline.login_time_pattern = pattern;

    await db.upsertBaseline(updatedBaseline);

    status = sessionCount >= MIN_SESSIONS ? 'calibrated' : 'learning';

    return { baseline: updatedBaseline, status, sessionCount, deviations, avgDeviation };
}

/**
 * Compute normalized deviations between current behavior and baseline
 * Formula: |current - baseline| / baseline
 */
function computeDeviations(current, baseline) {
    return {
        typing_speed: safeDeviation(current.typing_speed, baseline.avg_typing_speed),
        click_interval: safeDeviation(current.click_interval, baseline.avg_click_interval),
        mouse_speed: safeDeviation(current.mouse_speed, baseline.avg_mouse_speed),
        read_time: safeDeviation(current.read_time || 0, baseline.avg_read_time),
        navigation_entropy: safeDeviation(current.navigation_entropy || 0, baseline.avg_navigation_entropy)
    };
}

/**
 * Get the current baseline status for a user
 */
async function getBaselineStatus(userId) {
    const baseline = await db.getBaseline(userId);
    if (!baseline) {
        return { exists: false, status: 'no_baseline', sessionCount: 0 };
    }

    return {
        exists: true,
        status: baseline.session_count >= MIN_SESSIONS ? 'calibrated' : 'learning',
        sessionCount: baseline.session_count,
        baseline: {
            avg_typing_speed: round2(baseline.avg_typing_speed),
            avg_click_interval: round2(baseline.avg_click_interval),
            avg_mouse_speed: round2(baseline.avg_mouse_speed),
            avg_read_time: round2(baseline.avg_read_time),
            avg_navigation_entropy: round2(baseline.avg_navigation_entropy),
            login_time_pattern: baseline.login_time_pattern,
            updated_at: baseline.updated_at
        }
    };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Exponential Moving Average
 */
function ema(oldValue, newValue, alpha) {
    if (!oldValue || oldValue === 0) return newValue;
    if (!newValue || newValue === 0) return oldValue;
    return (oldValue * (1 - alpha)) + (newValue * alpha);
}

/**
 * Safe deviation calculation — avoids division by zero
 */
function safeDeviation(current, baseline) {
    if (!baseline || baseline === 0) return 0;
    return Math.abs(current - baseline) / baseline;
}

/**
 * Round to 2 decimal places
 */
function round2(val) {
    return Math.round((val || 0) * 100) / 100;
}

module.exports = { updateBaseline, getBaselineStatus, computeDeviations };
