"""
CYBERTWIN — Advanced ML Pipeline on REAL CMU Keystroke Dynamics Dataset
═══════════════════════════════════════════════════════════════════════

Dataset: CMU Keystroke Dynamics Benchmark
Source:  https://www.cs.cmu.edu/~keystroke/
Paper:   "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics"
         Kevin Killourhy and Roy Maxion, IEEE S&P 2009

51 subjects × 400 sessions × 31 timing features = 20,400 samples

Models:
  1. Isolation Forest        — Unsupervised anomaly detection
  2. One-Class SVM            — Novelty detection per user
  3. Random Forest            — Binary classification (genuine vs impostor)
  4. Gradient Boosting        — Attack type classification
  5. K-Means Clustering       — User behavioral clustering
  6. PCA + t-SNE              — Dimensionality reduction for visualization

Exports:
  - model_weights.json        — Weights, importances, thresholds for Node.js
  - anomaly_scores.json       — Per-sample anomaly scores
  - cluster_assignments.json  — Cluster labels for visualization
  - pca_embeddings.json       — 2D embeddings for scatter plots
  - feature_distributions.json— Per-feature statistics
  - confusion_matrix.json     — Classification performance
"""

import numpy as np
import pandas as pd
import json
import os
import warnings
import joblib
warnings.filterwarnings('ignore')

from datetime import datetime

# Recursively convert all numpy types to native Python types (keys AND values)
def sanitize(obj):
    if isinstance(obj, dict):
        return {sanitize(k): sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj

# Monkey-patch json.dump/dumps to auto-sanitize
_original_dump = json.dump
_original_dumps = json.dumps
def _patched_dump(obj, fp, **kwargs):
    return _original_dump(sanitize(obj), fp, **kwargs)
def _patched_dumps(obj, **kwargs):
    return _original_dumps(sanitize(obj), **kwargs)
json.dump = _patched_dump
json.dumps = _patched_dumps

print("=" * 70)
print("CYBERTWIN — Advanced ML Pipeline")
print("Real CMU Keystroke Dynamics Dataset (20,400 samples)")
print("=" * 70)

# ═════════════════════════════════════════════════════════════════════
# 1. LOAD REAL DATASET
# ═════════════════════════════════════════════════════════════════════
print("\n[1/8] Loading CMU Keystroke Dynamics dataset...")

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'real', 'DSL-StrongPasswordData.csv')
df = pd.read_csv(DATA_PATH)

print(f"  Shape: {df.shape}")
print(f"  Subjects: {df['subject'].nunique()}")
print(f"  Sessions per subject: ~{len(df) // df['subject'].nunique()}")
print(f"  Features: {len(df.columns) - 3}")  # minus subject, sessionIndex, rep
print(f"  Columns: {list(df.columns[:10])}...")

# Feature columns (exclude metadata)
meta_cols = ['subject', 'sessionIndex', 'rep']
feature_cols = [c for c in df.columns if c not in meta_cols]
print(f"  Feature columns: {len(feature_cols)}")

# ═════════════════════════════════════════════════════════════════════
# 2. FEATURE ENGINEERING
# ═════════════════════════════════════════════════════════════════════
print("\n[2/8] Feature engineering...")

# Extract hold times (H.*), digraph times (DD.*), flight times (UD.*)
hold_cols = [c for c in feature_cols if c.startswith('H.')]
dd_cols = [c for c in feature_cols if c.startswith('DD.')]
ud_cols = [c for c in feature_cols if c.startswith('UD.')]

print(f"  Hold time features: {len(hold_cols)}")
print(f"  Digraph (DD) features: {len(dd_cols)}")
print(f"  Flight (UD) features: {len(ud_cols)}")

# Compute aggregate features per sample
df['mean_hold'] = df[hold_cols].mean(axis=1)
df['std_hold'] = df[hold_cols].std(axis=1)
df['mean_dd'] = df[dd_cols].mean(axis=1)
df['std_dd'] = df[dd_cols].std(axis=1)
df['mean_ud'] = df[ud_cols].mean(axis=1)
df['std_ud'] = df[ud_cols].std(axis=1)
df['hold_range'] = df[hold_cols].max(axis=1) - df[hold_cols].min(axis=1)
df['dd_range'] = df[dd_cols].max(axis=1) - df[dd_cols].min(axis=1)
df['ud_range'] = df[ud_cols].max(axis=1) - df[ud_cols].min(axis=1)
df['typing_consistency'] = df['std_hold'] / (df['mean_hold'] + 1e-6)
df['rhythm_score'] = df['std_dd'] / (df['mean_dd'] + 1e-6)
df['total_time'] = df[dd_cols].sum(axis=1)

agg_features = ['mean_hold', 'std_hold', 'mean_dd', 'std_dd', 'mean_ud', 'std_ud',
                  'hold_range', 'dd_range', 'ud_range', 'typing_consistency', 'rhythm_score', 'total_time']

all_features = feature_cols + agg_features
X = df[all_features].values
print(f"  Total features for ML: {len(all_features)}")

# ═════════════════════════════════════════════════════════════════════
# 3. IMPORT ML LIBRARIES
# ═════════════════════════════════════════════════════════════════════
print("\n[3/8] Loading ML libraries...")

from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import OneClassSVM
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report, confusion_matrix,
    precision_score, recall_score, f1_score, accuracy_score,
    silhouette_score, roc_auc_score
)
from sklearn.manifold import TSNE

print("  All libraries loaded successfully")

# ═════════════════════════════════════════════════════════════════════
# 4. STANDARDIZATION
# ═════════════════════════════════════════════════════════════════════
print("\n[4/8] Standardizing features...")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"  Scaled {X_scaled.shape[0]} samples × {X_scaled.shape[1]} features")

# ═════════════════════════════════════════════════════════════════════
# 5. MODEL 1: ISOLATION FOREST (Anomaly Detection)
# ═════════════════════════════════════════════════════════════════════
print("\n[5/8] Training models...")

# --- Isolation Forest ---
print("\n  [Model 1] Isolation Forest (Anomaly Detection)...")
iso_forest = IsolationForest(
    n_estimators=300,
    contamination=0.08,
    max_features=0.8,
    random_state=42,
    n_jobs=-1
)
iso_forest.fit(X_scaled)
anomaly_scores = iso_forest.decision_function(X_scaled)
anomaly_labels = iso_forest.predict(X_scaled)
df['anomaly_score'] = -anomaly_scores  # Higher = more anomalous
df['is_anomaly'] = (anomaly_labels == -1).astype(int)

n_anomalies = df['is_anomaly'].sum()
print(f"    Anomalies detected: {n_anomalies} ({n_anomalies/len(df)*100:.1f}%)")
print(f"    Anomaly score range: [{df['anomaly_score'].min():.4f}, {df['anomaly_score'].max():.4f}]")

# --- One-Class SVM (per-user novelty detection sample) ---
print("\n  [Model 2] One-Class SVM (Per-user novelty detection)...")
# Train on a sample user to demonstrate per-user capabilities
sample_user = df['subject'].value_counts().index[0]
user_data = df[df['subject'] == sample_user]
user_X = scaler.transform(user_data[all_features].values)

ocsvm = OneClassSVM(kernel='rbf', gamma='scale', nu=0.1)
ocsvm.fit(user_X)
ocsvm_scores = ocsvm.decision_function(user_X)
print(f"    Trained on user '{sample_user}' ({len(user_data)} samples)")
print(f"    Novelty score range: [{ocsvm_scores.min():.4f}, {ocsvm_scores.max():.4f}]")

# ═════════════════════════════════════════════════════════════════════
# 6. MODEL 3 & 4: CLASSIFICATION (Genuine vs Impostor)
# ═════════════════════════════════════════════════════════════════════
print("\n  [Model 3] Random Forest (Genuine vs Impostor)...")

# Create genuine vs impostor labels
# For each subject, their own samples are genuine; other subjects' samples are impostors
# We'll create a binary classification task for one target user
target_user = sample_user
df['is_genuine'] = (df['subject'] == target_user).astype(int)

X_binary = X_scaled
y_binary = df['is_genuine'].values

X_train, X_test, y_train, y_test = train_test_split(
    X_binary, y_binary, test_size=0.2, random_state=42, stratify=y_binary
)

rf_classifier = RandomForestClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_classifier.fit(X_train, y_train)
y_pred_rf = rf_classifier.predict(X_test)
rf_accuracy = accuracy_score(y_test, y_pred_rf)
rf_precision = precision_score(y_test, y_pred_rf, zero_division=0)
rf_recall = recall_score(y_test, y_pred_rf, zero_division=0)
rf_f1 = f1_score(y_test, y_pred_rf, zero_division=0)

# ROC AUC
y_proba_rf = rf_classifier.predict_proba(X_test)[:, 1]
rf_auc = roc_auc_score(y_test, y_proba_rf)

print(f"    Accuracy:  {rf_accuracy:.4f}")
print(f"    Precision: {rf_precision:.4f}")
print(f"    Recall:    {rf_recall:.4f}")
print(f"    F1 Score:  {rf_f1:.4f}")
print(f"    AUC-ROC:   {rf_auc:.4f}")

# Feature importances
importances = rf_classifier.feature_importances_
importance_dict = dict(zip(all_features, importances.tolist()))
sorted_importances = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)

print(f"\n    Top 10 Feature Importances:")
for feat, imp in sorted_importances[:10]:
    bar = '█' * int(imp * 100)
    print(f"      {feat:25s} {imp:.4f} {bar}")

# --- Gradient Boosting (multi-class: subject identification) ---
print("\n  [Model 4] Gradient Boosting (Subject Identification)...")

le = LabelEncoder()
y_subjects = le.fit_transform(df['subject'].values)

# Use a subset for speed (10 subjects)
top_subjects = df['subject'].value_counts().head(10).index.tolist()
mask = df['subject'].isin(top_subjects)
X_multi = X_scaled[mask]
y_multi = le.fit_transform(df[mask]['subject'].values)

X_train_m, X_test_m, y_train_m, y_test_m = train_test_split(
    X_multi, y_multi, test_size=0.2, random_state=42, stratify=y_multi
)

gb_classifier = GradientBoostingClassifier(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    random_state=42
)
gb_classifier.fit(X_train_m, y_train_m)
y_pred_gb = gb_classifier.predict(X_test_m)
gb_accuracy = accuracy_score(y_test_m, y_pred_gb)
print(f"    Accuracy (10 subjects): {gb_accuracy:.4f}")
print(f"    Subjects: {top_subjects}")

# Confusion matrix
cm = confusion_matrix(y_test_m, y_pred_gb)

# ═════════════════════════════════════════════════════════════════════
# 7. CLUSTERING & DIMENSIONALITY REDUCTION
# ═════════════════════════════════════════════════════════════════════
print("\n[6/8] Clustering & dimensionality reduction...")

# PCA
print("  Running PCA...")
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)
print(f"    Explained variance: {pca.explained_variance_ratio_.sum():.4f}")
print(f"    PC1: {pca.explained_variance_ratio_[0]:.4f}, PC2: {pca.explained_variance_ratio_[1]:.4f}")

# K-Means
print("  Running K-Means (k=10)...")
kmeans = KMeans(n_clusters=10, random_state=42, n_init=10, max_iter=300)
cluster_labels = kmeans.fit_predict(X_scaled)
df['cluster'] = cluster_labels
silhouette = silhouette_score(X_scaled, cluster_labels, sample_size=5000)
print(f"    Silhouette score: {silhouette:.4f}")

# t-SNE on a subset for visualization
print("  Running t-SNE (subset of 3000 samples)...")
tsne_sample = min(3000, len(X_scaled))
tsne_idx = np.random.choice(len(X_scaled), tsne_sample, replace=False)
tsne = TSNE(n_components=2, perplexity=30, random_state=42, max_iter=1000)
X_tsne = tsne.fit_transform(X_scaled[tsne_idx])
print(f"    t-SNE embedding complete")

# ═════════════════════════════════════════════════════════════════════
# 8. EXPORT EVERYTHING FOR NODE.JS
# ═════════════════════════════════════════════════════════════════════
print("\n[7/8] Exporting model artifacts...")

os.makedirs('ml/models', exist_ok=True)
os.makedirs('ml/data', exist_ok=True)

# 1. Model weights
model_export = {
    'model_info': {
        'name': 'CYBERTWIN Advanced Behavioral Analytics',
        'version': '2.0.0',
        'trained_at': datetime.now().isoformat(),
        'dataset': 'CMU Keystroke Dynamics Benchmark',
        'dataset_url': 'https://www.cs.cmu.edu/~keystroke/',
        'paper': 'Killourhy & Maxion, IEEE S&P 2009',
        'total_samples': len(df),
        'total_subjects': df['subject'].nunique(),
        'total_features': len(all_features),
        'feature_names': all_features,
    },
    'models': {
        'isolation_forest': {
            'type': 'anomaly_detection',
            'estimators': 300,
            'contamination': 0.08,
            'anomalies_detected': int(n_anomalies),
            'anomaly_rate': float(n_anomalies / len(df)),
        },
        'one_class_svm': {
            'type': 'novelty_detection',
            'kernel': 'rbf',
            'trained_on': sample_user,
            'samples_used': len(user_data),
        },
        'random_forest': {
            'type': 'binary_classification',
            'estimators': 300,
            'accuracy': float(rf_accuracy),
            'precision': float(rf_precision),
            'recall': float(rf_recall),
            'f1': float(rf_f1),
            'auc_roc': float(rf_auc),
        },
        'gradient_boosting': {
            'type': 'multi_class',
            'estimators': 200,
            'accuracy': float(gb_accuracy),
            'subjects_classified': len(top_subjects),
        },
        'kmeans': {
            'type': 'clustering',
            'k': 10,
            'silhouette_score': float(silhouette),
        }
    },
    'feature_importances': {k: round(float(v), 6) for k, v in sorted_importances},
    'top_features': [{'name': k, 'importance': round(float(v), 6)} for k, v in sorted_importances[:15]],
    'scaler': {
        'mean': scaler.mean_.tolist(),
        'scale': scaler.scale_.tolist(),
    },
    'pca': {
        'explained_variance': pca.explained_variance_ratio_.tolist(),
        'components': pca.components_.tolist(),
    },
    'thresholds': {
        'anomaly_percentile_95': float(np.percentile(df['anomaly_score'], 95)),
        'anomaly_percentile_99': float(np.percentile(df['anomaly_score'], 99)),
        'allow_max': 30,
        'warn_max': 60,
        'block_min': 61,
    }
}

with open('ml/models/model_weights.json', 'w') as f:
    json.dump(model_export, f, indent=2)
print("  Saved model_weights.json")

# 2. Anomaly scores
anomaly_export = {
    'total': len(df),
    'anomalies': int(n_anomalies),
    'scores': df['anomaly_score'].round(4).tolist(),
    'labels': df['is_anomaly'].tolist(),
    'subjects': df['subject'].tolist(),
    'distribution': {
        'mean': float(df['anomaly_score'].mean()),
        'std': float(df['anomaly_score'].std()),
        'min': float(df['anomaly_score'].min()),
        'max': float(df['anomaly_score'].max()),
        'percentiles': {
            'p25': float(df['anomaly_score'].quantile(0.25)),
            'p50': float(df['anomaly_score'].quantile(0.50)),
            'p75': float(df['anomaly_score'].quantile(0.75)),
            'p90': float(df['anomaly_score'].quantile(0.90)),
            'p95': float(df['anomaly_score'].quantile(0.95)),
            'p99': float(df['anomaly_score'].quantile(0.99)),
        }
    }
}
with open('ml/models/anomaly_scores.json', 'w') as f:
    json.dump(anomaly_export, f)
print("  Saved anomaly_scores.json")

# 3. PCA embeddings (for scatter plot visualization)
pca_export = {
    'method': 'PCA',
    'explained_variance': pca.explained_variance_ratio_.tolist(),
    'embeddings': X_pca.tolist(),
    'subjects': df['subject'].tolist(),
    'clusters': df['cluster'].tolist(),
    'anomaly_labels': df['is_anomaly'].tolist(),
}
with open('ml/models/pca_embeddings.json', 'w') as f:
    json.dump(pca_export, f)
print("  Saved pca_embeddings.json")

# 4. t-SNE embeddings
tsne_export = {
    'method': 't-SNE',
    'embeddings': X_tsne.tolist(),
    'subjects': df['subject'].iloc[tsne_idx].tolist(),
    'clusters': df['cluster'].iloc[tsne_idx].tolist(),
    'anomaly_labels': df['is_anomaly'].iloc[tsne_idx].tolist(),
    'sample_indices': tsne_idx.tolist(),
}
with open('ml/models/tsne_embeddings.json', 'w') as f:
    json.dump(tsne_export, f)
print("  Saved tsne_embeddings.json")

# 5. Feature distributions
feature_dist = {}
for feat in all_features:
    vals = df[feat]
    feature_dist[feat] = {
        'mean': round(float(vals.mean()), 6),
        'std': round(float(vals.std()), 6),
        'min': round(float(vals.min()), 6),
        'max': round(float(vals.max()), 6),
        'median': round(float(vals.median()), 6),
        'q1': round(float(vals.quantile(0.25)), 6),
        'q3': round(float(vals.quantile(0.75)), 6),
        'skew': round(float(vals.skew()), 6),
        'kurtosis': round(float(vals.kurtosis()), 6),
        'histogram': [int(x) for x in np.histogram(vals.dropna(), bins=30)[0]],
        'bin_edges': [float(x) for x in np.histogram(vals.dropna(), bins=30)[1]],
    }

with open('ml/models/feature_distributions.json', 'w') as f:
    json.dump(feature_dist, f, indent=2)
print("  Saved feature_distributions.json")

# 6. Confusion matrix
cm_export = {
    'matrix': cm.tolist(),
    'classes': le.inverse_transform(range(len(top_subjects))).tolist(),
    'accuracy': float(gb_accuracy),
}
with open('ml/models/confusion_matrix.json', 'w') as f:
    json.dump(cm_export, f, indent=2)
print("  Saved confusion_matrix.json")

# 7. Per-subject statistics
subject_stats = {}
for subj in df['subject'].unique():
    subj_df = df[df['subject'] == subj]
    subject_stats[subj] = {
        'samples': len(subj_df),
        'mean_hold': round(float(subj_df['mean_hold'].mean()), 6),
        'std_hold': round(float(subj_df['std_hold'].mean()), 6),
        'mean_dd': round(float(subj_df['mean_dd'].mean()), 6),
        'mean_ud': round(float(subj_df['mean_ud'].mean()), 6),
        'total_time_avg': round(float(subj_df['total_time'].mean()), 6),
        'anomaly_rate': round(float(subj_df['is_anomaly'].mean()), 6),
        'avg_anomaly_score': round(float(subj_df['anomaly_score'].mean()), 6),
        'cluster_mode': int(subj_df['cluster'].mode().iloc[0]),
    }

with open('ml/models/subject_stats.json', 'w') as f:
    json.dump(subject_stats, f, indent=2)
print("  Saved subject_stats.json")

# 8. Cluster analysis
cluster_analysis = {}
for c in range(10):
    c_data = df[df['cluster'] == c]
    cluster_analysis[str(c)] = {
        'size': len(c_data),
        'subjects': c_data['subject'].nunique(),
        'mean_hold': round(float(c_data['mean_hold'].mean()), 4),
        'mean_dd': round(float(c_data['mean_dd'].mean()), 4),
        'anomaly_rate': round(float(c_data['is_anomaly'].mean()), 4),
        'top_subjects': {k: int(v) for k, v in c_data['subject'].value_counts().head(5).to_dict().items()},
    }

with open('ml/models/cluster_analysis.json', 'w') as f:
    json.dump(cluster_analysis, f, indent=2)
print("  Saved cluster_analysis.json")

# 9. Serialize trained models with joblib for real-time Python prediction
print("\n  Saving trained model binaries (joblib)...")
joblib.dump(scaler, 'ml/models/scaler.pkl')
joblib.dump(iso_forest, 'ml/models/isolation_forest.pkl')
joblib.dump(rf_classifier, 'ml/models/random_forest.pkl')
joblib.dump(gb_classifier, 'ml/models/gradient_boosting.pkl')
joblib.dump(kmeans, 'ml/models/kmeans.pkl')
joblib.dump(pca, 'ml/models/pca.pkl')
joblib.dump(le, 'ml/models/label_encoder.pkl')
print("  Saved 7 model binaries (.pkl)")

# 10. Feature configuration for prediction pipeline
feature_config = {
    'raw_features': feature_cols,
    'agg_features': agg_features,
    'all_features': all_features,
    'hold_cols': hold_cols,
    'dd_cols': dd_cols,
    'ud_cols': ud_cols,
    'hold_indices': [feature_cols.index(c) for c in hold_cols],
    'dd_indices': [feature_cols.index(c) for c in dd_cols],
    'ud_indices': [feature_cols.index(c) for c in ud_cols],
}
with open('ml/models/feature_config.json', 'w') as f:
    json.dump(feature_config, f, indent=2)
print("  Saved feature_config.json")

# ═════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═════════════════════════════════════════════════════════════════════
print("\n[8/8] Pipeline complete!")
print("\n" + "=" * 70)
print("ADVANCED ML PIPELINE — RESULTS SUMMARY")
print("=" * 70)
print(f"""
Dataset:
  Source:   CMU Keystroke Dynamics Benchmark (REAL DATA)
  Samples:  {len(df)}
  Subjects: {df['subject'].nunique()}
  Features: {len(all_features)} (31 raw + 12 engineered)

Model Performance:
  ┌──────────────────────────────────────────────────────┐
  │ Isolation Forest (Anomaly Detection)                 │
  │   Anomalies: {n_anomalies} ({n_anomalies/len(df)*100:.1f}%)                             │
  │                                                      │
  │ One-Class SVM (Novelty Detection)                    │
  │   Per-user model trained on '{sample_user}'          │
  │                                                      │
  │ Random Forest (Binary: Genuine vs Impostor)          │
  │   Accuracy:  {rf_accuracy:.4f}                                 │
  │   Precision: {rf_precision:.4f}                                 │
  │   Recall:    {rf_recall:.4f}                                 │
  │   F1:        {rf_f1:.4f}                                 │
  │   AUC-ROC:   {rf_auc:.4f}                                 │
  │                                                      │
  │ Gradient Boosting (Subject Identification)           │
  │   Accuracy (10 subjects): {gb_accuracy:.4f}                    │
  │                                                      │
  │ K-Means Clustering (k=10)                            │
  │   Silhouette: {silhouette:.4f}                                │
  │                                                      │
  │ PCA (2D)                                             │
  │   Variance explained: {pca.explained_variance_ratio_.sum():.4f}                        │
  └──────────────────────────────────────────────────────┘

Exported Artifacts:
  ml/models/model_weights.json          — Complete model info
  ml/models/anomaly_scores.json         — Per-sample anomaly scores
  ml/models/pca_embeddings.json         — 2D PCA embeddings
  ml/models/tsne_embeddings.json        — t-SNE visualization data
  ml/models/feature_distributions.json  — Per-feature statistics
  ml/models/confusion_matrix.json       — Classification matrix
  ml/models/subject_stats.json          — Per-subject profiles
  ml/models/cluster_analysis.json       — Cluster compositions
  ml/models/*.pkl                       — Serialized sklearn models (joblib)
  ml/models/feature_config.json         — Feature name mappings
""")
