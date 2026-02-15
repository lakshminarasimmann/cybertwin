/**
 * Attack Narrative Engine
 * 
 * Generates human-readable attack narratives for SOC teams.
 * "SOC teams don't want alerts — they want explanations."
 * 
 * Narrative Stages:
 * 1. Engagement — Initial interaction pattern
 * 2. Cognitive Stress — Behavioral indicators of manipulation
 * 3. Manipulation Success — Progressive compliance indicators
 * 4. Risky Action — Unusual/dangerous user actions
 * 5. Attack Confirmation — Pattern match confidence
 * 
 * This explanation is as important as detection.
 */

// ─── Attack Type Classification ────────────────────────────────────
const ATTACK_TYPES = {
    bot_attack: {
        name: 'Bot Attack',
        description: 'Automated bot or scripted attack with non-human behavioral patterns',
        icon: '🤖'
    },
    social_engineering: {
        name: 'Social Engineering',
        description: 'Cognitive manipulation of legitimate user',
        icon: '🎭'
    },
    session_hijack: {
        name: 'Session Hijacking',
        description: 'Unauthorized session takeover',
        icon: '🔗'
    },
    behavioral_anomaly: {
        name: 'Behavioral Anomaly',
        description: 'Significant deviation from established patterns',
        icon: '⚠️'
    }
};

// ─── Narrative Templates ───────────────────────────────────────────
const NARRATIVE_TEMPLATES = {

    // ── HIGH RISK (61-100) ──────────────────────────────────────────
    high_risk: {
        bot_attack: [
            "User session exhibits non-human motor patterns consistent with automated bot activity. Typing cadence deviation of {typing_dev}% shows robotic consistency — timing variance is abnormally LOW, indicating scripted keystroke injection rather than natural typing. Mouse velocity deviation of {mouse_dev}% and click timing ({click_dev}%) lack the micro-variability characteristic of human input. ML models confirm automated attack pattern.",
            "Behavioral analysis confirms automated bot attack. The current operator's interaction patterns show machine-like precision across all measured dimensions: typing speed ({typing_dev}%), mouse dynamics ({mouse_dev}%), and click patterns ({click_dev}%). The absence of natural human variability and cognitive rhythm indicates a scripted or automated attack tool. The cognitive digital twin has flagged this session for immediate quarantine.",
        ],
        social_engineering: [
            "User exhibited abnormal hesitation after content engagement, followed by repeated re-reads and delayed click action (read time deviation: {read_dev}%). Click interval increased by {click_dev}%, indicating cognitive stress consistent with social-engineering manipulation. Navigation entropy spike of {nav_dev}% suggests erratic exploration following manipulation attempt.",
            "Progressive cognitive manipulation detected across session timeline. Initial engagement showed prolonged content processing ({read_dev}% above baseline), followed by escalating click hesitation ({click_dev}%) and irregular navigation patterns ({nav_dev}%). Motor pattern degradation ({mouse_dev}% mouse speed change) indicates elevated cognitive load from processing deceptive content."
        ],
        session_hijack: [
            "Abrupt behavioral discontinuity detected at timestamp boundary. Pre-boundary metrics matched established twin, post-boundary metrics show complete behavioral profile shift. Typing speed changed by {typing_dev}%, mouse dynamics by {mouse_dev}%. This step-function change is characteristic of session hijacking.",
        ],
        behavioral_anomaly: [
            "Significant multi-dimensional behavioral deviation detected. Typing cadence: {typing_dev}% deviation. Click timing: {click_dev}% deviation. Mouse velocity: {mouse_dev}% deviation. Navigation entropy: {nav_dev}% deviation. The overall risk score of {risk_score} exceeds the block threshold. The pattern does not match known attack signatures but warrants immediate investigation.",
        ]
    },

    // ── MEDIUM RISK (31-60) ─────────────────────────────────────────
    medium_risk: {
        behavioral_anomaly: [
            "Moderate behavioral deviation detected across multiple metrics. Typing speed varies by {typing_dev}% from baseline, with click intervals showing {click_dev}% deviation. While not conclusive, these patterns warrant enhanced monitoring. The cognitive digital twin has activated elevated surveillance mode.",
            "User interaction patterns show notable shifts from established baseline. Read time deviation ({read_dev}%) and navigation entropy change ({nav_dev}%) suggest possible cognitive stress or environmental factors. Enhanced behavioral monitoring activated for this session."
        ]
    }
};

// ─── Narrative Stage Builder ───────────────────────────────────────
function buildNarrativeStages(deviations, riskScore, rawData) {
    const stages = [];

    // Stage 1: Engagement
    const readDev = deviations.read_time || 0;
    stages.push({
        stage: 'Stage 1: Engagement',
        icon: '🎯',
        description: readDev > 0.3
            ? `User engaged with content for ${(readDev * 100).toFixed(0)}% longer than baseline average, indicating heightened attention or unfamiliar content processing.`
            : `User opened content and entered normal reading phase. Read time within ${(readDev * 100).toFixed(0)}% of baseline.`,
        severity: readDev > 0.3 ? 'elevated' : 'normal',
        deviation: readDev
    });

    // Stage 2: Cognitive Stress
    const clickDev = deviations.click_interval || 0;
    const mouseDev = deviations.mouse_speed || 0;
    stages.push({
        stage: 'Stage 2: Cognitive Stress',
        icon: '🧠',
        description: clickDev > 0.3 || mouseDev > 0.3
            ? `Click hesitation increased by ${(clickDev * 100).toFixed(0)}%. Mouse speed deviated by ${(mouseDev * 100).toFixed(0)}%. These motor pattern changes indicate elevated cognitive load consistent with processing manipulative content.`
            : `Click timing and motor patterns remain within normal variance. No significant cognitive stress indicators detected.`,
        severity: clickDev > 0.3 || mouseDev > 0.3 ? 'elevated' : 'normal',
        deviation: Math.max(clickDev, mouseDev)
    });

    // Stage 3: Manipulation Success
    const typingDev = deviations.typing_speed || 0;
    stages.push({
        stage: 'Stage 3: Manipulation Indicators',
        icon: '⚡',
        description: typingDev > 0.3
            ? `Typing cadence deviation of ${(typingDev * 100).toFixed(0)}% suggests either a different operator or cognitive impairment. Progressive behavioral shift detected across session timeline.`
            : `Typing patterns remain consistent with established cognitive twin. No manipulation indicators detected.`,
        severity: typingDev > 0.3 ? 'elevated' : 'normal',
        deviation: typingDev
    });

    // Stage 4: Risky Action
    const navDev = deviations.navigation_entropy || 0;
    stages.push({
        stage: 'Stage 4: Behavioral Response',
        icon: '🚨',
        description: navDev > 0.3
            ? `Navigation entropy increased by ${(navDev * 100).toFixed(0)}%, indicating erratic exploration inconsistent with normal usage patterns. User navigated to unusual routes following stress pattern.`
            : `Navigation patterns remain within established boundaries. Route exploration depth is nominal.`,
        severity: navDev > 0.3 ? 'elevated' : 'normal',
        deviation: navDev
    });

    // Stage 5: Attack Confirmation
    const confidence = Math.min(95, (riskScore / 100 * 95)).toFixed(0);
    stages.push({
        stage: 'Stage 5: Assessment',
        icon: riskScore > 60 ? '🛑' : riskScore > 30 ? '⚠️' : '✅',
        description: riskScore > 60
            ? `Multi-dimensional behavioral analysis confirms anomalous pattern with ${confidence}% confidence. Session quarantined. Attack narrative dispatched for SOC review.`
            : riskScore > 30
                ? `Behavioral deviation detected but below critical threshold. Confidence: ${confidence}%. Enhanced monitoring activated. Session under observation.`
                : `Behavioral patterns are consistent with authenticated user's cognitive twin. No anomalies detected. Confidence: ${confidence}%.`,
        severity: riskScore > 60 ? 'critical' : riskScore > 30 ? 'elevated' : 'normal',
        deviation: riskScore / 100
    });

    return stages;
}

// ─── Main Narrative Generator ──────────────────────────────────────
/**
 * Generate a complete attack narrative from session behavioral data.
 * 
 * @param {Object} deviations - Per-metric deviation values
 * @param {Number} riskScore - Overall risk score (0-100)
 * @param {Object} rawData - Raw behavioral values for context
 * @returns {Object} Complete narrative with summary, stages, and classification
 */
function generateNarrative(deviations, riskScore, rawData = {}) {
    // Classify attack type based on deviation patterns
    const attackType = classifyAttackType(deviations, riskScore);

    // Select narrative template
    const riskLevel = riskScore > 60 ? 'high_risk' : 'medium_risk';
    const templates = NARRATIVE_TEMPLATES[riskLevel]?.[attackType]
        || NARRATIVE_TEMPLATES[riskLevel]?.behavioral_anomaly
        || NARRATIVE_TEMPLATES.high_risk.behavioral_anomaly;

    // Pick a random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Fill in template variables
    const summary = template
        .replace(/{typing_dev}/g, ((deviations.typing_speed || 0) * 100).toFixed(0))
        .replace(/{click_dev}/g, ((deviations.click_interval || 0) * 100).toFixed(0))
        .replace(/{mouse_dev}/g, ((deviations.mouse_speed || 0) * 100).toFixed(0))
        .replace(/{read_dev}/g, ((deviations.read_time || 0) * 100).toFixed(0))
        .replace(/{nav_dev}/g, ((deviations.navigation_entropy || 0) * 100).toFixed(0))
        .replace(/{risk_score}/g, riskScore);

    // Build narrative stages
    const stages = buildNarrativeStages(deviations, riskScore, rawData);

    return {
        summary,
        stages,
        attackType,
        attackInfo: ATTACK_TYPES[attackType],
        riskScore,
        confidence: Math.min(95, (riskScore / 100 * 95)).toFixed(0) + '%',
        timestamp: new Date().toISOString(),
        recommendation: riskScore > 60
            ? 'Immediate session termination and incident investigation recommended.'
            : 'Enhanced monitoring activated. Review behavioral trends for escalation.'
    };
}

/**
 * Classify attack type based on deviation pattern signatures
 */
function classifyAttackType(deviations, riskScore) {
    const typing = deviations.typing_speed || 0;
    const click = deviations.click_interval || 0;
    const mouse = deviations.mouse_speed || 0;
    const read = deviations.read_time || 0;
    const nav = deviations.navigation_entropy || 0;

    // Bot attack: all metrics deviate significantly (automated/non-human input)
    if (typing > 0.4 && mouse > 0.4 && click > 0.3) {
        return 'bot_attack';
    }

    // Social engineering: read time + click hesitation + nav entropy spike
    if (read > 0.3 && click > 0.3 && nav > 0.2) {
        return 'social_engineering';
    }

    // Session hijack: sudden motor pattern shift
    if (typing > 0.5 && mouse > 0.5 && read < 0.2) {
        return 'session_hijack';
    }

    return 'behavioral_anomaly';
}

module.exports = {
    generateNarrative,
    buildNarrativeStages,
    classifyAttackType,
    ATTACK_TYPES,
    NARRATIVE_TEMPLATES
};
