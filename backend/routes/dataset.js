/**
 * Dataset Explorer API — Real CMU Keystroke Dynamics Data
 * 
 * Provides endpoints to browse, filter, and analyze the real dataset
 * stored in SQLite. Powers the frontend dataset visualization.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const path = require('path');
const fs = require('fs');

// GET /api/dataset/stats — Overall dataset statistics
router.get('/stats', (req, res) => {
    try {
        const stats = db.getDatasetStats();
        const subjects = db.getDatasetSubjects();
        res.json({
            ...stats,
            subjects: subjects,
            dataset_name: 'CMU Keystroke Dynamics Benchmark',
            source: 'https://www.cs.cmu.edu/~keystroke/',
            paper: 'Killourhy & Maxion, IEEE S&P 2009',
            description: '51 subjects typing .tie5Roanl 400 times each, capturing 31 timing features per keystroke sequence',
            features: {
                hold_times: 'Duration a key is pressed (H.*)',
                digraph_times: 'Time between consecutive key presses (DD.*)',
                flight_times: 'Time between key release and next key press (UD.*)',
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/samples?limit=50&offset=0 — Paginated samples
router.get('/samples', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const offset = parseInt(req.query.offset) || 0;
        const samples = db.getDatasetSamples(limit, offset);
        const total = db.getDatasetCount();
        res.json({
            samples,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/subjects — List all subjects with stats
router.get('/subjects', (req, res) => {
    try {
        const subjects = db.getDatasetSubjects();

        // Load subject stats if available
        const statsPath = path.join(__dirname, '..', 'ml', 'models', 'subject_stats.json');
        let subjectStats = {};
        if (fs.existsSync(statsPath)) {
            subjectStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }

        const enriched = subjects.map(s => ({
            ...s,
            ...(subjectStats[s.subject] || {})
        }));

        res.json({ subjects: enriched, total: subjects.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/subject/:id — Get data for a specific subject
router.get('/subject/:id', (req, res) => {
    try {
        const subject = req.params.id;
        const limit = Math.min(parseInt(req.query.limit) || 400, 400);
        const data = db.getSubjectData(subject, limit);

        if (data.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        // Compute per-subject statistics
        const holdTimes = data.map(d => d.h_period);
        const ddTimes = data.map(d => d.dd_period_t);
        const udTimes = data.map(d => d.ud_period_t);

        const stats = {
            subject,
            sample_count: data.length,
            hold_time: computeStats(holdTimes),
            dd_time: computeStats(ddTimes),
            ud_time: computeStats(udTimes),
            anomaly_count: data.filter(d => d.is_anomaly === 1).length,
            anomaly_rate: data.filter(d => d.is_anomaly === 1).length / data.length,
        };

        res.json({ data: data.slice(0, 100), stats, total: data.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/anomalies — Get anomalous samples
router.get('/anomalies', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const anomalies = db.getAnomalies(limit);
        res.json({ anomalies, total: anomalies.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/distribution/:feature — Feature value distribution
router.get('/distribution/:feature', (req, res) => {
    try {
        const feature = req.params.feature;
        // Validate feature name to prevent SQL injection
        const allowedFeatures = ['h_period', 'dd_period_t', 'ud_period_t', 'h_t', 'dd_t_i', 'ud_t_i',
            'h_i', 'dd_i_e', 'ud_i_e', 'h_e', 'anomaly_score'];

        if (!allowedFeatures.includes(feature)) {
            return res.status(400).json({ error: 'Invalid feature name' });
        }

        const distribution = db.getDistribution(feature);

        // Load feature distributions from ML pipeline if available
        const distPath = path.join(__dirname, '..', 'ml', 'models', 'feature_distributions.json');
        let mlDist = null;
        if (fs.existsSync(distPath)) {
            const allDist = JSON.parse(fs.readFileSync(distPath, 'utf8'));
            // Map DB column names to ML feature names
            const nameMap = {
                'h_period': 'H.period', 'dd_period_t': 'DD.period.t', 'ud_period_t': 'UD.period.t',
                'h_t': 'H.t', 'dd_t_i': 'DD.t.i', 'ud_t_i': 'UD.t.i',
                'h_i': 'H.i', 'dd_i_e': 'DD.i.e', 'ud_i_e': 'UD.i.e', 'h_e': 'H.e',
            };
            mlDist = allDist[nameMap[feature] || feature];
        }

        res.json({ feature, distribution, ml_statistics: mlDist });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/dataset/compare — Compare two subjects
router.get('/compare', (req, res) => {
    try {
        const { subject1, subject2 } = req.query;
        if (!subject1 || !subject2) {
            return res.status(400).json({ error: 'Both subject1 and subject2 required' });
        }

        const data1 = db.getSubjectData(subject1, 400);
        const data2 = db.getSubjectData(subject2, 400);

        const comparison = {
            subject1: {
                id: subject1,
                samples: data1.length,
                avg_hold: avg(data1.map(d => d.h_period)),
                avg_dd: avg(data1.map(d => d.dd_period_t)),
                avg_ud: avg(data1.map(d => d.ud_period_t)),
                std_hold: std(data1.map(d => d.h_period)),
                anomaly_rate: data1.filter(d => d.is_anomaly).length / data1.length,
            },
            subject2: {
                id: subject2,
                samples: data2.length,
                avg_hold: avg(data2.map(d => d.h_period)),
                avg_dd: avg(data2.map(d => d.dd_period_t)),
                avg_ud: avg(data2.map(d => d.ud_period_t)),
                std_hold: std(data2.map(d => d.h_period)),
                anomaly_rate: data2.filter(d => d.is_anomaly).length / data2.length,
            },
        };

        res.json(comparison);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helpers
function computeStats(arr) {
    const n = arr.length;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const sorted = [...arr].sort((a, b) => a - b);
    return {
        mean: +mean.toFixed(6),
        std: +Math.sqrt(variance).toFixed(6),
        min: +Math.min(...arr).toFixed(6),
        max: +Math.max(...arr).toFixed(6),
        median: +sorted[Math.floor(n / 2)].toFixed(6),
        q1: +sorted[Math.floor(n * 0.25)].toFixed(6),
        q3: +sorted[Math.floor(n * 0.75)].toFixed(6),
    };
}

function avg(arr) { return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(6); }
function std(arr) {
    const m = avg(arr);
    return +Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length).toFixed(6);
}

module.exports = router;
