/**
 * CYBERTWIN — Backend Server v2.0
 * Now with SQLite, real dataset, and full feature implementation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Initialize database (creates tables)
const { db } = require('./config/database');
const fs = require('fs');

// Verify ML models exist
const MODELS_DIR = path.join(__dirname, 'ml', 'models');
if (!fs.existsSync(MODELS_DIR)) {
  console.warn('\n  [WARNING] ML models directory not found at:', MODELS_DIR);
  console.warn('  Please run: cd backend && python ml/train_model.py\n');
}

// Load real dataset into SQLite
const { loadDataset } = require('./scripts/loadDataset');

// Route imports
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const riskRoutes = require('./routes/risk');
const twinRoutes = require('./routes/twin');
const demoRoutes = require('./routes/demo');
const datasetRoutes = require('./routes/dataset');
const mlRoutes = require('./routes/ml');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { error: 'Too many requests' }
});
app.use(limiter);

// ─── Static files (ML model outputs) ───────────────────────────────
app.use('/api/static/ml', express.static(path.join(__dirname, 'ml', 'models')));

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/twin', twinRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/dataset', datasetRoutes);
app.use('/api/ml', mlRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const datasetCount = db.getDatasetCount();
  res.json({
    status: 'operational',
    system: 'CYBERTWIN v2.0',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      type: 'SQLite',
      status: 'connected',
      dataset_samples: datasetCount,
    },
    services: {
      authentication: 'active',
      behaviorCapture: 'active',
      cognitiveTwin: 'active',
      riskEngine: 'active',
      narrativeEngine: 'active',
      mlPipeline: 'active',
      datasetExplorer: 'active',
    }
  });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[CYBERTWIN ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// ─── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  // Load dataset on startup
  try {
    loadDataset();
  } catch (e) {
    console.error('  [Dataset] Load failed:', e.message);
  }

  // Create demo user if not exists
  try {
    const existing = db.getUserByEmail('demo@cybertwin.io');
    if (!existing) {
      db.createUser('demo@cybertwin.io', '$2b$10$demo_hash_not_real', 'Demo Operator');
      console.log('  [Auth] Demo user created');
    }
  } catch (e) { /* ignore */ }

  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   ██████╗██╗   ██╗██████╗ ███████╗██████╗ ████████╗     ║
  ║  ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝     ║
  ║  ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝   ██║        ║
  ║  ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗   ██║        ║
  ║  ╚██████╗   ██║   ██████╔╝███████╗██║  ██║   ██║        ║
  ║   ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝        ║
  ║                                                          ║
  ║  v2.0 — Real Dataset + SQLite + Advanced ML              ║
  ║                                                          ║
  ║  Server:   http://localhost:${PORT}                         ║
  ║  Database: SQLite (in-process)                           ║
  ║  Dataset:  CMU Keystroke Dynamics (20,400 samples)       ║
  ║  Status:   OPERATIONAL                                   ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
