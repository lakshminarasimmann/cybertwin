/**
 * ML Routes — Machine Learning model results and predictions
 * 
 * Serves pre-computed ML artifacts from train_model.py and provides
 * real-time anomaly scoring using the trained model weights.
 * ALL data from authentic CMU Keystroke Dynamics Benchmark.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { predict, loadModelWeights } = require('../engines/ml');

const MODELS_DIR = path.join(__dirname, '..', 'ml', 'models');

function loadModel(filename) {
    if (filename === 'model_weights.json') {
        return loadModelWeights();
    }
    const filepath = path.join(MODELS_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
        console.error(`Failed to load ${filename}:`, e.message);
        return null;
    }
}

// GET /api/ml/models — Model performance and info
router.get('/models', (req, res) => {
    try {
        const weights = loadModel('model_weights.json');
        if (!weights) {
            return res.status(404).json({ error: 'Models not trained yet. Run: python ml/train_model.py' });
        }
        res.json({
            info: weights.model_info,
            models: weights.models,
            thresholds: weights.thresholds,
            top_features: weights.top_features,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/feature-importances — Feature importance rankings
router.get('/feature-importances', (req, res) => {
    try {
        const weights = loadModel('model_weights.json');
        if (!weights) return res.status(404).json({ error: 'Models not trained' });

        const sorted = Object.entries(weights.feature_importances)
            .sort((a, b) => b[1] - a[1])
            .map(([name, importance], rank) => ({ rank: rank + 1, name, importance }));

        res.json({ importances: sorted, total: sorted.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/anomaly-distribution — Anomaly score distribution
router.get('/anomaly-distribution', (req, res) => {
    try {
        const scores = loadModel('anomaly_scores.json');
        if (!scores) return res.status(404).json({ error: 'Anomaly scores not generated' });

        res.json({
            total: scores.total,
            anomalies: scores.anomalies,
            anomaly_rate: scores.anomalies / scores.total,
            distribution: scores.distribution,
            top_anomaly_indices: scores.scores
                .map((s, i) => ({ score: s, index: i, subject: scores.subjects[i] }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 20),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/pca — PCA embeddings for scatter plot
router.get('/pca', (req, res) => {
    try {
        const pca = loadModel('pca_embeddings.json');
        if (!pca) return res.status(404).json({ error: 'PCA not computed' });

        const maxPoints = parseInt(req.query.limit) || 2000;
        const step = Math.max(1, Math.floor(pca.embeddings.length / maxPoints));

        const sampled = {
            method: pca.method,
            explained_variance: pca.explained_variance,
            points: [],
        };

        for (let i = 0; i < pca.embeddings.length; i += step) {
            sampled.points.push({
                x: pca.embeddings[i][0],
                y: pca.embeddings[i][1],
                subject: pca.subjects[i],
                cluster: pca.clusters[i],
                is_anomaly: pca.anomaly_labels[i],
            });
        }

        res.json(sampled);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/tsne — t-SNE embeddings
router.get('/tsne', (req, res) => {
    try {
        const tsne = loadModel('tsne_embeddings.json');
        if (!tsne) return res.status(404).json({ error: 't-SNE not computed' });

        const maxPoints = parseInt(req.query.limit) || 1500;
        const step = Math.max(1, Math.floor(tsne.embeddings.length / maxPoints));

        const sampled = {
            method: tsne.method,
            points: [],
        };

        for (let i = 0; i < tsne.embeddings.length; i += step) {
            sampled.points.push({
                x: tsne.embeddings[i][0],
                y: tsne.embeddings[i][1],
                subject: tsne.subjects[i],
                cluster: tsne.clusters[i],
                is_anomaly: tsne.anomaly_labels[i],
            });
        }

        res.json(sampled);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/clusters — K-Means cluster analysis
router.get('/clusters', (req, res) => {
    try {
        const clusters = loadModel('cluster_analysis.json');
        if (!clusters) return res.status(404).json({ error: 'Clusters not computed' });
        res.json({ clusters, total: Object.keys(clusters).length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/confusion-matrix — Classification confusion matrix
router.get('/confusion-matrix', (req, res) => {
    try {
        const cm = loadModel('confusion_matrix.json');
        if (!cm) return res.status(404).json({ error: 'Confusion matrix not computed' });
        res.json(cm);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/feature-distributions — Feature distribution data
router.get('/feature-distributions', (req, res) => {
    try {
        const dist = loadModel('feature_distributions.json');
        if (!dist) return res.status(404).json({ error: 'Distributions not computed' });

        const feature = req.query.feature;
        if (feature && dist[feature]) {
            return res.json({ feature, ...dist[feature] });
        }

        const summary = Object.entries(dist).map(([name, stats]) => ({
            name,
            mean: stats.mean,
            std: stats.std,
            min: stats.min,
            max: stats.max,
            skew: stats.skew,
        }));

        res.json({ features: summary, total: summary.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/ml/subject-profiles — Per-subject behavioral profiles
router.get('/subject-profiles', (req, res) => {
    try {
        const stats = loadModel('subject_stats.json');
        if (!stats) return res.status(404).json({ error: 'Subject stats not computed' });

        const profiles = Object.entries(stats).map(([subject, data]) => ({
            subject,
            ...data,
        }));

        res.json({ profiles, total: profiles.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ml/predict — Real-time prediction (single sample)
router.post('/predict', async (req, res) => {
    try {
        const { features } = req.body;
        if (!features || !Array.isArray(features)) {
            return res.status(400).json({ error: 'features array required (31 feature values)' });
        }

        const result = await predict(features);
        res.json(result);
    } catch (error) {
        console.error('Prediction API error:', error);
        res.status(500).json({ error: 'Prediction failed' });
    }
});

module.exports = router;
