/**
 * Attack Narrative Reconstruction Engine
 * 
 * "SOC teams don't want alerts — they want explanations."
 * 
 * This engine transforms raw behavioral deviations into human-readable
 * attack narratives that explain WHAT happened, not just THAT something happened.
 * 
 * Narrative Stages:
 * 1. Engagement    — Initial interaction pattern
 * 2. Cognitive Stress — Deviation indicators
 * 3. Manipulation Success — Behavioral breaking point
 * 4. Risky Action  — Anomalous action taken
 * 5. Attack Confirmation — Pattern matches known attack cognitive fingerprint
 */

/**
 * Generate a structured attack narrative from risk analysis
 * 
 * @param {Object} riskResult — Output from riskEngine.computeRiskScore
 * @param {Array} recentBehavior — Time-ordered session behavior entries
 * @param {Object} baseline — User's behavioral baseline (digital twin)
 * @returns {Object} Narrative with summary, stages, and technical details
 */
function generateNarrative(riskResult, recentBehavior, baseline) {
    const { score, deviations, rawDeviations, dominantSignal } = riskResult;

    // ─── Build Narrative Stages ──────────────────────────────────────────
    const stages = [];

    // Stage 1: Engagement Analysis
    stages.push(buildEngagementStage(recentBehavior, baseline));

    // Stage 2: Cognitive Stress Detection
    if (score > 30) {
        stages.push(buildCognitiveStressStage(deviations, rawDeviations, dominantSignal));
    }

    // Stage 3: Manipulation Indicators
    if (score > 45) {
        stages.push(buildManipulationStage(recentBehavior, rawDeviations));
    }

    // Stage 4: Risky Action Detection
    if (score > 60) {
        stages.push(buildRiskyActionStage(recentBehavior, rawDeviations));
    }

    // Stage 5: Attack Confirmation
    if (score > 75) {
        stages.push(buildConfirmationStage(score, rawDeviations, recentBehavior));
    }

    // ─── Generate Summary ───────────────────────────────────────────────
    const summary = buildNarrativeSummary(score, stages, dominantSignal, rawDeviations);

    // ─── Technical Analysis ─────────────────────────────────────────────
    const technical = {
        risk_score: score,
        dominant_deviation: dominantSignal,
        deviation_breakdown: rawDeviations,
        behavioral_timeline_length: recentBehavior ? recentBehavior.length : 0,
        analysis_timestamp: new Date().toISOString(),
        confidence: computeConfidence(score, recentBehavior)
    };

    return {
        summary,
        stages,
        technical,
        severity: score > 75 ? 'critical' : score > 50 ? 'high' : score > 30 ? 'medium' : 'low'
    };
}

// ─── Narrative Stage Builders ─────────────────────────────────────────────────

function buildEngagementStage(recentBehavior, baseline) {
    const behaviorCount = recentBehavior ? recentBehavior.length : 0;
    let description;

    if (behaviorCount <= 1) {
        description = 'Session initiated with limited behavioral data. Initial interaction patterns being established.';
    } else if (behaviorCount <= 5) {
        description = 'User engaged in brief interaction sequence. Early behavioral signals captured for twin comparison.';
    } else {
        description = 'Extended session activity detected. Sufficient behavioral data collected for high-confidence twin comparison.';
    }

    return {
        stage: 'Engagement',
        phase: 1,
        icon: '🎯',
        description,
        data_points: behaviorCount,
        status: behaviorCount > 3 ? 'sufficient_data' : 'limited_data'
    };
}

function buildCognitiveStressStage(deviations, rawDeviations, dominantSignal) {
    const stressIndicators = [];

    if (rawDeviations.typing_speed > 0.3) {
        stressIndicators.push({
            signal: 'Typing cadence deviation',
            deviation: `${(rawDeviations.typing_speed * 100).toFixed(1)}%`,
            interpretation: rawDeviations.typing_speed > 0.5
                ? 'Significant keystroke timing anomaly — indicative of unfamiliar motor patterns or elevated stress.'
                : 'Moderate keystroke rhythm change — possible distraction or elevated cognitive load.'
        });
    }

    if (rawDeviations.click_interval > 0.3) {
        stressIndicators.push({
            signal: 'Click hesitation anomaly',
            deviation: `${(rawDeviations.click_interval * 100).toFixed(1)}%`,
            interpretation: rawDeviations.click_interval > 0.5
                ? 'Abnormal click delay pattern — consistent with decision uncertainty under manipulation.'
                : 'Increased click interval variance — user exhibiting unusual deliberation.'
        });
    }

    if (rawDeviations.mouse_speed > 0.3) {
        stressIndicators.push({
            signal: 'Mouse dynamics shift',
            deviation: `${(rawDeviations.mouse_speed * 100).toFixed(1)}%`,
            interpretation: rawDeviations.mouse_speed > 0.5
                ? 'Motor pattern inconsistency — different operator or extreme agitation.'
                : 'Mouse velocity deviation — subtle motor control change detected.'
        });
    }

    if (rawDeviations.read_time > 0.4) {
        stressIndicators.push({
            signal: 'Read time deviation',
            deviation: `${(rawDeviations.read_time * 100).toFixed(1)}%`,
            interpretation: rawDeviations.read_time > 0.7
                ? 'Prolonged content engagement — repeated re-reading consistent with social engineering response.'
                : 'Modified content processing time — elevated attention to displayed content.'
        });
    }

    if (rawDeviations.navigation_entropy > 0.4) {
        stressIndicators.push({
            signal: 'Navigation entropy spike',
            deviation: `${(rawDeviations.navigation_entropy * 100).toFixed(1)}%`,
            interpretation: 'Erratic navigation pattern — user exploring unusual paths, possible confusion or directed behavior.'
        });
    }

    const description = stressIndicators.length > 0
        ? `Cognitive stress indicators detected across ${stressIndicators.length} behavioral signal(s). ${stressIndicators[0].interpretation}`
        : 'Mild cognitive deviation observed in interaction pattern timing.';

    return {
        stage: 'Cognitive Stress',
        phase: 2,
        icon: '🧠',
        description,
        indicators: stressIndicators,
        status: stressIndicators.length > 2 ? 'high_stress' : 'moderate_stress'
    };
}

function buildManipulationStage(recentBehavior, rawDeviations) {
    const manipulationSignals = [];

    // Check for interaction pattern consistency break
    const highDeviationCount = Object.values(rawDeviations)
        .filter(d => d > 0.4).length;

    if (highDeviationCount >= 3) {
        manipulationSignals.push('Multiple simultaneous behavioral deviations — characteristic of externally influenced decision-making.');
    }

    // Check for escalating pattern in recent behavior
    if (recentBehavior && recentBehavior.length >= 3) {
        const recentClicks = recentBehavior.slice(-3).map(b => b.click_interval || 0);
        const increasing = recentClicks.every((v, i) => i === 0 || v >= recentClicks[i - 1] * 0.8);
        if (increasing && recentClicks[recentClicks.length - 1] > recentClicks[0] * 1.3) {
            manipulationSignals.push('Progressive click hesitation escalation — cognitive resistance weakening over time.');
        }
    }

    // Check for read-time anomaly pattern
    if (rawDeviations.read_time > 0.5 && rawDeviations.click_interval > 0.4) {
        manipulationSignals.push('Prolonged read-then-hesitant-click pattern — consistent with social-engineering content processing.');
    }

    const description = manipulationSignals.length > 0
        ? manipulationSignals.join(' ')
        : 'Behavioral deviation pattern shows characteristics of external influence on user decision-making.';

    return {
        stage: 'Manipulation Success',
        phase: 3,
        icon: '⚡',
        description,
        signals: manipulationSignals,
        status: manipulationSignals.length > 1 ? 'confirmed' : 'probable'
    };
}

function buildRiskyActionStage(recentBehavior, rawDeviations) {
    const riskActions = [];

    if (rawDeviations.navigation_entropy > 0.5) {
        riskActions.push('User navigated to unusual area following behavioral stress pattern.');
    }

    if (rawDeviations.click_interval > 0.6) {
        riskActions.push('Anomalous action execution delay — user proceeded despite apparent uncertainty.');
    }

    if (rawDeviations.typing_speed > 0.5 && rawDeviations.mouse_speed > 0.4) {
        riskActions.push('Both fine motor patterns (typing and mouse) deviate significantly — strong indicator of different operator.');
    }

    const description = riskActions.length > 0
        ? riskActions.join(' ')
        : 'Behavioral anomaly persisted through critical action execution, suggesting compromised decision-making.';

    return {
        stage: 'Risky Action',
        phase: 4,
        icon: '🚨',
        description,
        actions: riskActions,
        status: 'action_taken'
    };
}

function buildConfirmationStage(score, rawDeviations, recentBehavior) {
    const attackType = classifyAttackType(rawDeviations, recentBehavior);

    return {
        stage: 'Attack Confirmation',
        phase: 5,
        icon: '🛑',
        description: `Cognitive attack pattern confirmed with ${score}% confidence. Classification: ${attackType.label}. ${attackType.description}`,
        attack_type: attackType,
        status: 'confirmed',
        recommendation: 'Immediate session quarantine recommended. Notify security operations center.'
    };
}

// ─── Attack Classification ──────────────────────────────────────────────────

function classifyAttackType(rawDeviations, recentBehavior) {
    // Social Engineering — high read time + high click hesitation
    if (rawDeviations.read_time > 0.5 && rawDeviations.click_interval > 0.5) {
        return {
            type: 'social_engineering',
            label: 'Social Engineering Manipulation',
            description: 'Pattern consistent with user processing deceptive content and exhibiting decision uncertainty characteristic of social engineering attacks.'
        };
    }

    // Credential Theft — different motor patterns entirely
    if (rawDeviations.typing_speed > 0.6 && rawDeviations.mouse_speed > 0.6) {
        return {
            type: 'credential_theft',
            label: 'Credential Misuse / Account Takeover',
            description: 'Motor patterns (typing cadence, mouse dynamics) significantly differ from established identity — likely a different human operator using stolen credentials.'
        };
    }

    // Session Hijack — sudden navigation pattern change
    if (rawDeviations.navigation_entropy > 0.7) {
        return {
            type: 'session_hijack',
            label: 'Session Hijack / Automated Access',
            description: 'Navigation pattern shows non-human or foreign operator characteristics — possible session hijack or automated tool usage.'
        };
    }

    // Generic cognitive attack
    return {
        type: 'cognitive_attack',
        label: 'Cognitive Attack Surface Exploitation',
        description: 'Multi-signal behavioral deviation indicates exploitation of the user\'s cognitive attack surface through external manipulation.'
    };
}

// ─── Summary Builder ──────────────────────────────────────────────────────────

function buildNarrativeSummary(score, stages, dominantSignal, rawDeviations) {
    const parts = [];

    if (score > 75) {
        parts.push('CRITICAL: ');
    } else if (score > 50) {
        parts.push('WARNING: ');
    }

    // Opening
    if (rawDeviations.read_time > 0.4) {
        parts.push('User exhibited abnormal hesitation after content engagement');
    } else if (rawDeviations.typing_speed > 0.4) {
        parts.push('User displayed atypical keystroke dynamics during session');
    } else if (rawDeviations.click_interval > 0.4) {
        parts.push('User showed unusual click timing patterns');
    } else {
        parts.push('User behavioral pattern deviated from established cognitive twin');
    }

    // Middle
    if (rawDeviations.click_interval > 0.3 && rawDeviations.read_time > 0.3) {
        parts.push(', followed by delayed click actions and prolonged content re-reading');
    } else if (rawDeviations.mouse_speed > 0.3) {
        parts.push(', accompanied by altered mouse movement dynamics');
    }

    // Conclusion
    if (score > 60) {
        parts.push(', indicating cognitive stress consistent with social-engineering manipulation or unauthorized session access.');
    } else if (score > 30) {
        parts.push(', suggesting elevated cognitive load or environmental distraction.');
    } else {
        parts.push('.');
    }

    return parts.join('');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function computeConfidence(score, recentBehavior) {
    const dataPoints = recentBehavior ? recentBehavior.length : 0;
    // More data points = higher confidence in the assessment
    const datConfidence = Math.min(1, dataPoints / 10);
    // Higher score deviations = more certain the detection is genuine
    const scoreConfidence = score > 50 ? 0.8 : score > 30 ? 0.6 : 0.4;

    return Math.round((datConfidence * 0.4 + scoreConfidence * 0.6) * 100);
}

module.exports = { generateNarrative, classifyAttackType };
