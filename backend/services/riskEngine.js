/**
 * Deviation & Risk Scoring Engine
 * 
 * "No signatures. No reputation. Pure behavioral truth."
 * 
 * Quantifies cognitive abnormality by computing weighted deviations
 * from the user's behavioral baseline (digital twin).
 * 
 * Risk Score (0–100):
 *   typing_deviation * w1 +
 *   click_deviation * w2 +
 *   mouse_deviation * w3 +
 *   navigation_entropy * w4 +
 *   read_time_deviation * w5
 * 
 * Decisions:
 *   0–30  → Allow (normal behavior)
 *   31–60 → Warn (suspicious deviation)
 *   61–100 → Block / Logout / Quarantine
 */

// ─── Weight Configuration ────────────────────────────────────────────────────
// These weights reflect the relative importance of each behavioral signal
// in detecting cognitive manipulation.
const WEIGHTS = {
    typing_speed: 0.25,       // Keystroke dynamics are highly individual
    click_interval: 0.20,     // Click hesitation reveals cognitive stress
    mouse_speed: 0.15,        // Mouse dynamics show motor pattern changes
    read_time: 0.20,          // Read time deviation indicates content processing anomaly
    navigation_entropy: 0.20  // Navigation pattern reveals intent divergence
};

// ─── Risk Thresholds ─────────────────────────────────────────────────────────
const THRESHOLDS = {
    warn: parseInt(process.env.RISK_WARN_THRESHOLD) || 31,
    block: parseInt(process.env.RISK_BLOCK_THRESHOLD) || 61
};

/**
 * Compute risk score from current behavior vs baseline
 * 
 * The score normalizes deviations into a 0–100 range where:
 * - 0 = perfect match to behavioral twin
 * - 100 = maximum deviation across all signals
 */
function computeRiskScore(currentBehavior, baseline) {
    if (!baseline) {
        return {
            score: 0,
            deviations: {},
            rawDeviations: {},
            message: 'No baseline established yet — learning mode active.'
        };
    }

    // ─── Compute per-signal deviations ──────────────────────────────────
    const rawDeviations = {
        typing_speed: safeDeviation(currentBehavior.typing_speed, baseline.avg_typing_speed),
        click_interval: safeDeviation(currentBehavior.click_interval, baseline.avg_click_interval),
        mouse_speed: safeDeviation(currentBehavior.mouse_speed, baseline.avg_mouse_speed),
        read_time: safeDeviation(currentBehavior.read_time || 0, baseline.avg_read_time),
        navigation_entropy: safeDeviation(currentBehavior.navigation_entropy || 0, baseline.avg_navigation_entropy)
    };

    // ─── Apply sigmoid normalization ───────────────────────────────────
    // Sigmoid maps raw deviations (0 → ∞) to a 0–1 range
    // This prevents any single extreme deviation from dominating the score
    const normalizedDeviations = {};
    for (const [key, value] of Object.entries(rawDeviations)) {
        normalizedDeviations[key] = sigmoid(value, 2.0); // k=2.0 for moderate sensitivity
    }

    // ─── Weighted risk score ──────────────────────────────────────────
    let score = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        score += (normalizedDeviations[key] || 0) * weight;
    }

    // Scale to 0–100
    score = Math.round(score * 100);
    score = Math.min(100, Math.max(0, score));

    // ─── Identify dominant deviation ──────────────────────────────────
    const dominantSignal = Object.entries(rawDeviations)
        .sort((a, b) => b[1] - a[1])[0];

    return {
        score,
        deviations: normalizedDeviations,
        rawDeviations,
        dominantSignal: dominantSignal ? { signal: dominantSignal[0], deviation: round2(dominantSignal[1]) } : null,
        message: generateScoreMessage(score, dominantSignal)
    };
}

/**
 * Make risk decision based on score thresholds
 */
function makeDecision(score) {
    if (score >= THRESHOLDS.block) {
        return {
            action: 'block',
            level: 'critical',
            color: '#ff0040',
            label: 'ATTACK DETECTED — SESSION BLOCKED',
            icon: '🛑',
            autoLogout: true,
            description: 'Behavioral deviation exceeds critical threshold. Identity verification failed.'
        };
    }

    if (score >= THRESHOLDS.warn) {
        return {
            action: 'warn',
            level: 'warning',
            color: '#ffb703',
            label: 'SUSPICIOUS BEHAVIOR DETECTED',
            icon: '⚠️',
            autoLogout: false,
            description: 'Behavioral deviation detected. Enhanced monitoring active.'
        };
    }

    return {
        action: 'allow',
        level: 'safe',
        color: '#00ff88',
        label: 'IDENTITY VERIFIED',
        icon: '✅',
        autoLogout: false,
        description: 'Behavior consistent with established cognitive twin.'
    };
}

/**
 * Batch analyze multiple behavior entries for trend detection
 */
function analyzeTrend(behaviorEntries, baseline) {
    if (!behaviorEntries || behaviorEntries.length === 0) {
        return { trend: 'stable', scores: [], avg: 0 };
    }

    const scores = behaviorEntries.map(b => computeRiskScore(b, baseline).score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Check if scores are escalating
    if (scores.length >= 3) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg + 15) return { trend: 'escalating', scores, avg: round2(avg) };
        if (secondAvg < firstAvg - 15) return { trend: 'de-escalating', scores, avg: round2(avg) };
    }

    return { trend: 'stable', scores, avg: round2(avg) };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Sigmoid normalization: maps value to 0–1 range
 * Higher k = more sensitive to small deviations
 */
function sigmoid(x, k = 2.0) {
    return 1 / (1 + Math.exp(-k * (x - 0.5)));
}

function safeDeviation(current, baseline) {
    if (!baseline || baseline === 0) return 0;
    return Math.abs(current - baseline) / baseline;
}

function round2(val) {
    return Math.round((val || 0) * 100) / 100;
}

function generateScoreMessage(score, dominantSignal) {
    if (score <= 10) return 'Behavior matches cognitive twin with high confidence.';
    if (score <= 30) return 'Minor behavioral variance within normal range.';
    if (score <= 50) {
        const signal = dominantSignal ? dominantSignal[0].replace(/_/g, ' ') : 'multiple signals';
        return `Moderate deviation detected in ${signal}. Enhanced monitoring active.`;
    }
    if (score <= 70) {
        return 'Significant behavioral anomaly — cognitive stress indicators present.';
    }
    return 'Critical deviation — behavioral pattern inconsistent with established identity.';
}

module.exports = { computeRiskScore, makeDecision, analyzeTrend, WEIGHTS, THRESHOLDS };
