/**
 * Risk Scoring Engine
 * 
 * Quantifies behavioral abnormality using weighted deviation formula
 * with sigmoid normalization.
 * 
 * "No signatures. No reputation. Pure behavioral truth."
 * 
 * Risk Score (0-100):
 *   typing_deviation × w1 +
 *   click_deviation × w2 +
 *   mouse_deviation × w3 +
 *   read_time_deviation × w4 +
 *   navigation_entropy × w5
 * 
 * Decisions:
 *   0-30   → Allow (identity verified)
 *   31-60  → Warn (enhanced monitoring)
 *   61-100 → Block (session quarantined)
 */

// ─── Weight Configuration ──────────────────────────────────────────
// Informed by ML feature importance analysis on behavioral biometrics dataset
const RISK_WEIGHTS = {
    typing_speed: 0.25,       // Highest discriminator — motor pattern uniqueness
    click_interval: 0.20,     // Click hesitation correlates with cognitive stress
    mouse_speed: 0.15,        // Motor pattern — harder to replicate
    read_time: 0.20,          // Content processing — key for social engineering
    navigation_entropy: 0.20  // Route exploration — indicates familiarity
};

// ─── Threshold Configuration ───────────────────────────────────────
const THRESHOLDS = {
    ALLOW_MAX: 30,
    WARN_MAX: 60,
    BLOCK_MIN: 61
};

// ─── Sigmoid Normalization ─────────────────────────────────────────
/**
 * Maps raw deviation to 0-100 scale using sigmoid function.
 * Provides smooth transition between risk levels and prevents
 * extreme values from dominating the score.
 * 
 * sigmoid(x) = 100 / (1 + e^(-k * (x - x0)))
 * Where:
 *   k = steepness (controls transition sharpness)
 *   x0 = midpoint (deviation value that maps to risk=50)
 */
function sigmoidNormalize(rawDeviation, midpoint = 0.5, steepness = 8) {
    const x = rawDeviation;
    const result = 100 / (1 + Math.exp(-steepness * (x - midpoint)));
    return Math.min(100, Math.max(0, Math.round(result)));
}

// ─── Risk Score Computation ────────────────────────────────────────
/**
 * Compute risk score from behavioral deviations.
 * 
 * @param {Object} deviations - Normalized deviations per metric
 * @returns {Object} Risk assessment { score, decision, label, details }
 */
function computeRiskScore(deviations) {
    let weightedSum = 0;
    let totalWeight = 0;
    const details = {};

    for (const [metric, weight] of Object.entries(RISK_WEIGHTS)) {
        const deviation = deviations[metric] || 0;
        const contribution = deviation * weight;
        weightedSum += contribution;
        totalWeight += weight;

        details[metric] = {
            deviation: deviation,
            weight: weight,
            contribution: contribution,
            riskContribution: sigmoidNormalize(deviation)
        };
    }

    // Normalize and apply sigmoid
    const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const score = sigmoidNormalize(rawScore);

    // Determine decision
    let decision, label;
    if (score <= THRESHOLDS.ALLOW_MAX) {
        decision = 'allow';
        label = 'IDENTITY VERIFIED';
    } else if (score <= THRESHOLDS.WARN_MAX) {
        decision = 'warn';
        label = 'ENHANCED MONITORING';
    } else {
        decision = 'block';
        label = 'SESSION QUARANTINED';
    }

    return {
        score,
        decision,
        label,
        rawDeviation: rawScore,
        details,
        thresholds: THRESHOLDS,
        timestamp: new Date().toISOString()
    };
}

/**
 * Quick risk assessment without full details
 */
function quickRiskAssess(overallDeviation) {
    const score = sigmoidNormalize(overallDeviation);
    let decision = 'allow';
    let label = 'IDENTITY VERIFIED';

    if (score > THRESHOLDS.WARN_MAX) {
        decision = 'block';
        label = 'SESSION QUARANTINED';
    } else if (score > THRESHOLDS.ALLOW_MAX) {
        decision = 'warn';
        label = 'ENHANCED MONITORING';
    }

    return { score, decision, label };
}

module.exports = {
    computeRiskScore,
    quickRiskAssess,
    sigmoidNormalize,
    RISK_WEIGHTS,
    THRESHOLDS
};
