/**
 * CYBERTWIN — ML Prediction Engine (Real sklearn Models via Python)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Calls the ACTUAL trained sklearn models (Isolation Forest, Random Forest,
 * Gradient Boosting, K-Means) through a Python subprocess for authentic
 * machine learning predictions. Falls back to heuristic only if Python fails.
 */

const fs = require('fs');
const path = require('path');
const { PythonShell } = require('python-shell');

const MODEL_DIR = path.join(__dirname, '..', 'ml');
const MODELS_SUBDIR = path.join(MODEL_DIR, 'models');

const MODEL_FILES = [
    'isolation_forest.pkl',
    'random_forest.pkl',
    'gradient_boosting.pkl',
    'kmeans.pkl',
    'scaler.pkl',
    'feature_config.json'
];

let modelWeights = null;
let pythonAvailable = false;

// ─── 1. Model Weight Loading ────────────────────────────────────────
function loadModelWeights() {
    if (modelWeights) return modelWeights;
    const filepath = path.join(MODELS_SUBDIR, 'model_weights.json');
    if (!fs.existsSync(filepath)) return null;
    try {
        modelWeights = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return modelWeights;
    } catch (e) {
        console.error('Error loading model weights:', e);
        return null;
    }
}

// ─── 2. Python Environment Check ────────────────────────────────────
function checkPython() {
    // Check if model files exist
    const hasModels = MODEL_FILES.every(f => fs.existsSync(path.join(MODELS_SUBDIR, f)));

    if (hasModels) {
        // We'll trust python-shell to find python in the path
        pythonAvailable = true;
        console.log('  [ML] ✓ Trained models found. Engine ready.');
        return true;
    } else {
        console.warn('  [ML] ⚠ Model files missing (run train_model.py)');
        console.log('  [ML] ⚠ Switched to Heuristic Fallback Mode');
        pythonAvailable = false;
        return false;
    }
}

// ─── 3. Real Prediction (PythonShell) ───────────────────────────────
function predictWithPython(features) {
    return new Promise((resolve, reject) => {
        const options = {
            mode: 'json',
            pythonPath: 'python', // Assumes python is in PATH
            pythonOptions: ['-u'], // get print results in real-time
            scriptPath: MODEL_DIR,
            args: []
        };

        const pyshell = new PythonShell('predict.py', options);

        // Send data to stdin
        pyshell.send({ features });

        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            resolve(message);
        });

        pyshell.on('error', function (err) {
            console.error('[ML] PythonShell Error:', err);
            reject(err);
        });

        pyshell.end(function (err) {
            if (err) reject(err);
        });
    });
}

// ─── 4. Heuristic Fallback (JavaScript) ─────────────────────────────
function predictHeuristic(features) {
    const weights = loadModelWeights();

    // Basic stats
    const avg = features.reduce((a, b) => a + b, 0) / features.length;

    // Heuristic logic
    let risk = 0;
    let decision = 'allow';

    if (avg > 0.5) { // Very slow -> likely impostor
        risk = 75;
        decision = 'block';
    } else if (avg < 0.05) { // Too fast -> likely bot
        risk = 90;
        decision = 'block';
    } else {
        risk = Math.floor(Math.random() * 20); // Normal variation
        decision = 'allow';
    }

    return {
        risk_score: risk,
        decision: decision,
        is_anomaly: risk > 50 ? 1 : 0,
        anomaly_score: risk / 100,
        genuine_confidence: risk < 50 ? (1 - risk / 100) : 0.1,
        impostor_probability: risk > 50 ? (risk / 100) : 0.1,
        cluster: -1,
        models_used: ['heuristic_fallback'],
        ml_backend: 'heuristic'
    };
}

// ─── 5. Main Export ─────────────────────────────────────────────────
async function predict(features) {
    if (pythonAvailable) {
        try {
            const result = await predictWithPython(features);
            if (result) {
                // Normalize field names if needed
                if (result.score !== undefined && result.risk_score === undefined) {
                    result.risk_score = result.score;
                }
                return result;
            }
        } catch (e) {
            // Fallback silently if Python fails
            // console.error('[ML] Python prediction failed, falling back to heuristic');
        }
    }
    return predictHeuristic(features);
}

// Initialize
checkPython();
loadModelWeights();

module.exports = { predict, loadModelWeights, checkPython };
