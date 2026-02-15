#!/usr/bin/env python3
"""
CYBERTWIN — Real-Time ML Prediction using Trained Models
═══════════════════════════════════════════════════════════
Uses the ACTUAL trained sklearn models (Isolation Forest, Random Forest,
Gradient Boosting, K-Means) loaded via joblib for authentic predictions.

Input:  JSON array of 31 raw keystroke features via stdin
Output: JSON prediction result to stdout
"""

import sys
import json
import numpy as np
import joblib
import os

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

def load_models():
    """Load all serialized sklearn models."""
    models = {}
    required = ['scaler.pkl', 'isolation_forest.pkl', 'random_forest.pkl',
                 'gradient_boosting.pkl', 'kmeans.pkl', 'feature_config.json']
    
    for f in required:
        path = os.path.join(MODEL_DIR, f)
        if not os.path.exists(path):
            return None, f"Missing model file: {f}"
    
    models['scaler'] = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    models['iso_forest'] = joblib.load(os.path.join(MODEL_DIR, 'isolation_forest.pkl'))
    models['rf'] = joblib.load(os.path.join(MODEL_DIR, 'random_forest.pkl'))
    models['gb'] = joblib.load(os.path.join(MODEL_DIR, 'gradient_boosting.pkl'))
    models['kmeans'] = joblib.load(os.path.join(MODEL_DIR, 'kmeans.pkl'))
    
    with open(os.path.join(MODEL_DIR, 'feature_config.json'), 'r') as f:
        models['config'] = json.load(f)
    
    # Load label encoder if available
    le_path = os.path.join(MODEL_DIR, 'label_encoder.pkl')
    if os.path.exists(le_path):
        models['le'] = joblib.load(le_path)
    
    return models, None


def engineer_features(raw_features, config):
    """
    Compute the same engineered features as train_model.py.
    
    raw_features: list of 31 values in order: 
        H.period, DD.period.t, UD.period.t, H.t, DD.t.i, UD.t.i,
        H.i, DD.i.e, UD.i.e, H.e, DD.e.five, UD.e.five,
        H.five, DD.five.Shift.r, UD.five.Shift.r, H.Shift.r, DD.Shift.r.o, UD.Shift.r.o,
        H.o, DD.o.a, UD.o.a, H.a, DD.a.n, UD.a.n,
        H.n, DD.n.l, UD.n.l, H.l, DD.l.Return, UD.l.Return, H.Return
    
    Returns: list of 43 values (31 raw + 12 engineered)
    """
    hold_indices = config['hold_indices']   # indices of H.* columns in raw features
    dd_indices = config['dd_indices']       # indices of DD.* columns
    ud_indices = config['ud_indices']       # indices of UD.* columns
    
    h_vals = np.array([raw_features[i] for i in hold_indices])
    dd_vals = np.array([raw_features[i] for i in dd_indices])
    ud_vals = np.array([raw_features[i] for i in ud_indices])
    
    mean_hold = float(np.mean(h_vals))
    std_hold = float(np.std(h_vals))
    mean_dd = float(np.mean(dd_vals))
    std_dd = float(np.std(dd_vals))
    mean_ud = float(np.mean(ud_vals))
    std_ud = float(np.std(ud_vals))
    hold_range = float(np.max(h_vals) - np.min(h_vals))
    dd_range = float(np.max(dd_vals) - np.min(dd_vals))
    ud_range = float(np.max(ud_vals) - np.min(ud_vals))
    typing_consistency = std_hold / (mean_hold + 1e-6)
    rhythm_score = std_dd / (mean_dd + 1e-6)
    total_time = float(np.sum(dd_vals))
    
    engineered = [mean_hold, std_hold, mean_dd, std_dd, mean_ud, std_ud,
                  hold_range, dd_range, ud_range, typing_consistency, rhythm_score, total_time]
    
    return raw_features + engineered


def predict(raw_features, models):
    """
    Run ALL trained models on the input features.
    Returns a comprehensive prediction result.
    """
    config = models['config']
    
    # Engineer features (31 raw → 43 total)
    all_features = engineer_features(raw_features, config)
    X = np.array(all_features).reshape(1, -1)
    
    # Scale using the SAME scaler used during training
    X_scaled = models['scaler'].transform(X)
    
    # ── Model 1: Isolation Forest (Anomaly Detection) ──
    iso_score_raw = models['iso_forest'].decision_function(X_scaled)[0]
    iso_prediction = models['iso_forest'].predict(X_scaled)[0]  # 1 = normal, -1 = anomaly
    anomaly_score = float(-iso_score_raw)  # Higher = more anomalous (same as training)
    is_anomaly = int(iso_prediction == -1)
    
    # ── Model 2: Random Forest (Genuine vs Impostor) ──
    rf_prediction = int(models['rf'].predict(X_scaled)[0])  # 0 = impostor, 1 = genuine
    rf_probabilities = models['rf'].predict_proba(X_scaled)[0].tolist()
    rf_confidence = float(max(rf_probabilities))
    is_genuine = rf_prediction == 1
    
    # ── Model 3: Gradient Boosting (Subject Identification) ──
    gb_prediction = int(models['gb'].predict(X_scaled)[0])
    gb_probabilities = models['gb'].predict_proba(X_scaled)[0]
    gb_confidence = float(max(gb_probabilities))
    gb_top3_indices = np.argsort(gb_probabilities)[-3:][::-1]
    gb_top3 = [{'class': int(idx), 'probability': float(gb_probabilities[idx])} 
               for idx in gb_top3_indices]
    
    # ── Model 4: K-Means (Cluster Assignment) ──
    cluster = int(models['kmeans'].predict(X_scaled)[0])
    cluster_distance = float(models['kmeans'].transform(X_scaled).min())
    
    # ── Composite Risk Score ──
    # Combine multiple model outputs into a unified risk score
    # Higher anomaly score → higher risk
    # Not genuine → higher risk  
    # Low cluster distance → lower risk (well-clustered behavior)
    
    # Normalize anomaly score to 0-100 range using training distribution
    # Training anomaly scores typically range from -0.15 to 0.3
    normalized_anomaly = np.clip((anomaly_score + 0.15) / 0.45 * 100, 0, 100)
    
    # Impostor probability (1 - genuine probability)
    impostor_probability = rf_probabilities[0] if len(rf_probabilities) > 1 else (1 - rf_confidence)
    
    # Weighted composite score
    risk_score = int(np.clip(
        normalized_anomaly * 0.40 +           # 40% from anomaly detection
        impostor_probability * 100 * 0.40 +    # 40% from impostor classification
        (1 - gb_confidence) * 100 * 0.20,      # 20% from identity uncertainty
        0, 100
    ))
    
    # Decision based on risk score
    if risk_score <= 30:
        decision = 'allow'
    elif risk_score <= 60:
        decision = 'warn'
    else:
        decision = 'block'
    
    return {
        'risk_score': risk_score,
        'decision': decision,
        'is_anomaly': is_anomaly,
        'anomaly_score': round(anomaly_score, 6),
        'is_genuine': int(is_genuine),
        'genuine_confidence': round(rf_confidence, 4),
        'impostor_probability': round(float(impostor_probability), 4),
        'rf_prediction': rf_prediction,
        'rf_probabilities': [round(p, 4) for p in rf_probabilities],
        'gb_predicted_class': gb_prediction,
        'gb_confidence': round(gb_confidence, 4),
        'gb_top3': gb_top3,
        'cluster': cluster,
        'cluster_distance': round(cluster_distance, 4),
        'models_used': ['isolation_forest', 'random_forest', 'gradient_boosting', 'kmeans'],
        'feature_count': len(all_features),
        'ml_backend': 'sklearn_real',
    }


if __name__ == '__main__':
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        if isinstance(input_data, dict):
            features = input_data.get('features', input_data.get('raw_features', []))
        elif isinstance(input_data, list):
            features = input_data
        else:
            print(json.dumps({'error': 'Invalid input format'}))
            sys.exit(1)
        
        if len(features) != 31:
            print(json.dumps({'error': f'Expected 31 raw features, got {len(features)}'}))
            sys.exit(1)
        
        # Load models
        models, err = load_models()
        if err:
            print(json.dumps({'error': err}))
            sys.exit(1)
        
        # Predict
        result = predict(features, models)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e), 'type': type(e).__name__}))
        sys.exit(1)
