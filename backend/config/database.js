/**
 * CYBERTWIN — SQLite Database Module
 * 
 * Uses better-sqlite3 for synchronous, high-performance in-process SQLite.
 * No external database server needed — everything runs locally.
 * 
 * Tables:
 *   users             — Registered users
 *   behavior_baseline — Per-user cognitive digital twin
 *   session_behavior  — Raw session telemetry
 *   risk_events       — Risk assessments + narratives
 *   dataset_samples   — Real CMU Keystroke Dynamics data
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Database Initialization ───────────────────────────────────────
const DB_PATH = path.join(__dirname, '..', 'data', 'cybertwin.db');
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

console.log(`  [DB] SQLite connected: ${DB_PATH}`);

// ─── Schema Creation ───────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT 'Demo User',
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS behavior_baseline (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    avg_hold_time REAL DEFAULT 0.1,
    avg_dd_time REAL DEFAULT 0.2,
    avg_ud_time REAL DEFAULT 0.1,
    avg_typing_speed REAL DEFAULT 200,
    avg_flight_time REAL DEFAULT 0.12,
    avg_dwell_time REAL DEFAULT 0.08,
    avg_click_interval REAL DEFAULT 450,
    avg_mouse_speed REAL DEFAULT 2.0,
    avg_read_time REAL DEFAULT 3000,
    avg_navigation_entropy REAL DEFAULT 0.35,
    login_time_pattern TEXT DEFAULT '{}',
    session_count INTEGER DEFAULT 0,
    calibrated INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_behavior (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT,
    hold_time REAL,
    dd_time REAL,
    ud_time REAL,
    typing_speed REAL,
    flight_time REAL,
    dwell_time REAL,
    click_interval REAL,
    mouse_speed REAL,
    mouse_acceleration REAL,
    scroll_speed REAL,
    navigation_depth INTEGER,
    read_time REAL,
    navigation_entropy REAL,
    page_transitions INTEGER DEFAULT 0,
    idle_time REAL DEFAULT 0,
    raw_features TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS risk_events (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_id TEXT NOT NULL,
    risk_score INTEGER,
    decision TEXT CHECK(decision IN ('allow', 'warn', 'block')),
    attack_type TEXT,
    confidence REAL,
    narrative_summary TEXT,
    narrative_stages TEXT,
    deviations TEXT,
    raw_behavior TEXT,
    baseline_snapshot TEXT,
    ml_prediction TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dataset_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    session_index INTEGER,
    rep INTEGER,
    h_period REAL, dd_period_t REAL, ud_period_t REAL,
    h_t REAL, dd_t_i REAL, ud_t_i REAL,
    h_i REAL, dd_i_e REAL, ud_i_e REAL,
    h_e REAL, dd_e_five REAL, ud_e_five REAL,
    h_five REAL, dd_five_shift REAL, ud_five_shift REAL,
    h_shift_r REAL, dd_shift_r_o REAL, ud_shift_r_o REAL,
    h_o REAL, dd_o_a REAL, ud_o_a REAL,
    h_a REAL, dd_a_n REAL, ud_a_n REAL,
    h_n REAL, dd_n_l REAL, ud_n_l REAL,
    h_l REAL, dd_l_return REAL, ud_l_return REAL,
    h_return REAL,
    is_anomaly INTEGER DEFAULT 0,
    anomaly_score REAL DEFAULT 0,
    cluster_label INTEGER DEFAULT -1
  );

  CREATE TABLE IF NOT EXISTS ml_predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    model_type TEXT,
    prediction TEXT,
    confidence REAL,
    features_used TEXT,
    feature_importances TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_session_behavior_user ON session_behavior(user_id);
  CREATE INDEX IF NOT EXISTS idx_session_behavior_time ON session_behavior(timestamp);
  CREATE INDEX IF NOT EXISTS idx_risk_events_user ON risk_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_risk_events_time ON risk_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_risk_events_decision ON risk_events(decision);
  CREATE INDEX IF NOT EXISTS idx_dataset_subject ON dataset_samples(subject);
  CREATE INDEX IF NOT EXISTS idx_dataset_anomaly ON dataset_samples(is_anomaly);
`);

console.log(`  [DB] Schema initialized`);

// ─── Prepared Statements ───────────────────────────────────────────
const stmts = {
  // Users
  insertUser: sqlite.prepare(`
    INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)
  `),
  getUserByEmail: sqlite.prepare(`SELECT * FROM users WHERE email = ?`),
  getUserById: sqlite.prepare(`SELECT * FROM users WHERE id = ?`),
  updateLastLogin: sqlite.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`),

  // Baselines
  getBaseline: sqlite.prepare(`SELECT * FROM behavior_baseline WHERE user_id = ?`),
  upsertBaseline: sqlite.prepare(`
    INSERT INTO behavior_baseline (id, user_id, avg_hold_time, avg_dd_time, avg_ud_time,
      avg_typing_speed, avg_flight_time, avg_dwell_time, avg_click_interval, avg_mouse_speed,
      avg_read_time, avg_navigation_entropy, session_count, calibrated, updated_at)
    VALUES (@id, @user_id, @avg_hold_time, @avg_dd_time, @avg_ud_time,
      @avg_typing_speed, @avg_flight_time, @avg_dwell_time, @avg_click_interval, @avg_mouse_speed,
      @avg_read_time, @avg_navigation_entropy, @session_count, @calibrated, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      avg_hold_time = @avg_hold_time, avg_dd_time = @avg_dd_time, avg_ud_time = @avg_ud_time,
      avg_typing_speed = @avg_typing_speed, avg_flight_time = @avg_flight_time,
      avg_dwell_time = @avg_dwell_time, avg_click_interval = @avg_click_interval,
      avg_mouse_speed = @avg_mouse_speed, avg_read_time = @avg_read_time,
      avg_navigation_entropy = @avg_navigation_entropy, session_count = @session_count,
      calibrated = @calibrated, updated_at = datetime('now')
  `),

  // Session behavior
  insertSession: sqlite.prepare(`
    INSERT INTO session_behavior (id, user_id, session_id, hold_time, dd_time, ud_time,
      typing_speed, flight_time, dwell_time, click_interval, mouse_speed, mouse_acceleration,
      scroll_speed, navigation_depth, read_time, navigation_entropy, page_transitions,
      idle_time, raw_features, timestamp)
    VALUES (@id, @user_id, @session_id, @hold_time, @dd_time, @ud_time,
      @typing_speed, @flight_time, @dwell_time, @click_interval, @mouse_speed, @mouse_acceleration,
      @scroll_speed, @navigation_depth, @read_time, @navigation_entropy, @page_transitions,
      @idle_time, @raw_features, datetime('now'))
  `),
  getSessionsByUser: sqlite.prepare(`
    SELECT * FROM session_behavior WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
  `),
  getSessionCount: sqlite.prepare(`SELECT COUNT(*) as count FROM session_behavior WHERE user_id = ?`),

  // Risk events
  insertRisk: sqlite.prepare(`
    INSERT INTO risk_events (id, session_id, user_id, risk_score, decision, attack_type,
      confidence, narrative_summary, narrative_stages, deviations, raw_behavior,
      baseline_snapshot, ml_prediction, created_at)
    VALUES (@id, @session_id, @user_id, @risk_score, @decision, @attack_type,
      @confidence, @narrative_summary, @narrative_stages, @deviations, @raw_behavior,
      @baseline_snapshot, @ml_prediction, datetime('now'))
  `),
  getRiskByUser: sqlite.prepare(`
    SELECT * FROM risk_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `),
  getRiskStats: sqlite.prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(risk_score) as avg_score,
      MAX(risk_score) as max_score,
      MIN(risk_score) as min_score,
      SUM(CASE WHEN decision = 'allow' THEN 1 ELSE 0 END) as allow_count,
      SUM(CASE WHEN decision = 'warn' THEN 1 ELSE 0 END) as warn_count,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as block_count
    FROM risk_events WHERE user_id = ?
  `),
  getRiskTrend: sqlite.prepare(`
    SELECT risk_score, decision, created_at 
    FROM risk_events WHERE user_id = ? 
    ORDER BY created_at DESC LIMIT ?
  `),
  getAllRiskEvents: sqlite.prepare(`
    SELECT * FROM risk_events ORDER BY created_at DESC LIMIT ?
  `),

  // Dataset
  insertDatasetSample: sqlite.prepare(`
    INSERT INTO dataset_samples (subject, session_index, rep,
      h_period, dd_period_t, ud_period_t, h_t, dd_t_i, ud_t_i,
      h_i, dd_i_e, ud_i_e, h_e, dd_e_five, ud_e_five,
      h_five, dd_five_shift, ud_five_shift, h_shift_r, dd_shift_r_o, ud_shift_r_o,
      h_o, dd_o_a, ud_o_a, h_a, dd_a_n, ud_a_n,
      h_n, dd_n_l, ud_n_l, h_l, dd_l_return, ud_l_return, h_return,
      is_anomaly, anomaly_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getDatasetSamples: sqlite.prepare(`
    SELECT * FROM dataset_samples ORDER BY subject, session_index LIMIT ? OFFSET ?
  `),
  getDatasetCount: sqlite.prepare(`SELECT COUNT(*) as count FROM dataset_samples`),
  getDatasetSubjects: sqlite.prepare(`
    SELECT DISTINCT subject, COUNT(*) as samples FROM dataset_samples GROUP BY subject ORDER BY subject
  `),
  getDatasetStats: sqlite.prepare(`
    SELECT 
      COUNT(*) as total_samples,
      COUNT(DISTINCT subject) as total_subjects,
      AVG(h_period) as avg_hold_period,
      AVG(dd_period_t) as avg_dd_time,
      AVG(ud_period_t) as avg_ud_time,
      MIN(h_period) as min_hold,
      MAX(h_period) as max_hold,
      AVG(anomaly_score) as avg_anomaly_score,
      SUM(is_anomaly) as anomaly_count
    FROM dataset_samples
  `),
  getSubjectStats: sqlite.prepare(`
    SELECT
      subject,
      COUNT(*) as samples,
      AVG(h_period) as avg_hold,
      AVG(dd_period_t) as avg_dd,
      AVG(ud_period_t) as avg_ud,
      AVG(anomaly_score) as avg_anomaly,
      AVG(is_anomaly) as anomaly_rate
    FROM dataset_samples WHERE subject = ? GROUP BY subject
  `),
  getSubjectData: sqlite.prepare(`
    SELECT * FROM dataset_samples WHERE subject = ? ORDER BY session_index, rep LIMIT ?
  `),
  getAnomalies: sqlite.prepare(`
    SELECT * FROM dataset_samples WHERE is_anomaly = 1 ORDER BY anomaly_score DESC LIMIT ?
  `),

  // ML predictions
  insertPrediction: sqlite.prepare(`
    INSERT INTO ml_predictions (id, user_id, session_id, model_type, prediction, confidence, features_used, feature_importances)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Cleanup
  clearUserSessions: sqlite.prepare(`DELETE FROM session_behavior WHERE user_id = ?`),
  clearUserRisks: sqlite.prepare(`DELETE FROM risk_events WHERE user_id = ?`),
  clearBaseline: sqlite.prepare(`DELETE FROM behavior_baseline WHERE user_id = ?`),
};

// ─── Database API ──────────────────────────────────────────────────
const db = {
  // Users
  createUser(email, passwordHash, displayName = 'Demo User') {
    const id = uuidv4();
    stmts.insertUser.run(id, email, passwordHash, displayName);
    return { id, email, display_name: displayName };
  },
  getUserByEmail(email) { return stmts.getUserByEmail.get(email); },
  getUserById(id) { return stmts.getUserById.get(id); },
  updateLastLogin(id) { stmts.updateLastLogin.run(id); },

  // Baselines
  getBaseline(userId) { return stmts.getBaseline.get(userId); },
  upsertBaseline(data) {
    return stmts.upsertBaseline.run({
      id: data.id || uuidv4(),
      user_id: data.user_id,
      avg_hold_time: data.avg_hold_time || 0.1,
      avg_dd_time: data.avg_dd_time || 0.2,
      avg_ud_time: data.avg_ud_time || 0.1,
      avg_typing_speed: data.avg_typing_speed || 200,
      avg_flight_time: data.avg_flight_time || 0.12,
      avg_dwell_time: data.avg_dwell_time || 0.08,
      avg_click_interval: data.avg_click_interval || 450,
      avg_mouse_speed: data.avg_mouse_speed || 2.0,
      avg_read_time: data.avg_read_time || 3000,
      avg_navigation_entropy: data.avg_navigation_entropy || 0.35,
      session_count: data.session_count || 0,
      calibrated: data.calibrated ? 1 : 0,
    });
  },

  // Sessions
  insertSession(data) {
    return stmts.insertSession.run({
      id: uuidv4(),
      user_id: data.user_id,
      session_id: data.session_id || uuidv4(),
      hold_time: data.hold_time || null,
      dd_time: data.dd_time || null,
      ud_time: data.ud_time || null,
      typing_speed: data.typing_speed || null,
      flight_time: data.flight_time || null,
      dwell_time: data.dwell_time || null,
      click_interval: data.click_interval || null,
      mouse_speed: data.mouse_speed || null,
      mouse_acceleration: data.mouse_acceleration || null,
      scroll_speed: data.scroll_speed || null,
      navigation_depth: data.navigation_depth || null,
      read_time: data.read_time || null,
      navigation_entropy: data.navigation_entropy || null,
      page_transitions: data.page_transitions || 0,
      idle_time: data.idle_time || 0,
      raw_features: data.raw_features ? JSON.stringify(data.raw_features) : null,
    });
  },
  getSessionsByUser(userId, limit = 50) { return stmts.getSessionsByUser.all(userId, limit); },
  getSessionCount(userId) { return stmts.getSessionCount.get(userId).count; },

  // Risk events
  insertRiskEvent(data) {
    return stmts.insertRisk.run({
      id: uuidv4(),
      session_id: data.session_id || null,
      user_id: data.user_id,
      risk_score: data.risk_score,
      decision: data.decision,
      attack_type: data.attack_type || null,
      confidence: data.confidence || null,
      narrative_summary: data.narrative_summary || null,
      narrative_stages: data.narrative_stages ? JSON.stringify(data.narrative_stages) : null,
      deviations: data.deviations ? JSON.stringify(data.deviations) : null,
      raw_behavior: data.raw_behavior ? JSON.stringify(data.raw_behavior) : null,
      baseline_snapshot: data.baseline_snapshot ? JSON.stringify(data.baseline_snapshot) : null,
      ml_prediction: data.ml_prediction ? JSON.stringify(data.ml_prediction) : null,
    });
  },
  getRiskByUser(userId, limit = 50) {
    const rows = stmts.getRiskByUser.all(userId, limit);
    return rows.map(r => ({
      ...r,
      narrative_stages: r.narrative_stages ? JSON.parse(r.narrative_stages) : null,
      deviations: r.deviations ? JSON.parse(r.deviations) : null,
      raw_behavior: r.raw_behavior ? JSON.parse(r.raw_behavior) : null,
      baseline_snapshot: r.baseline_snapshot ? JSON.parse(r.baseline_snapshot) : null,
      ml_prediction: r.ml_prediction ? JSON.parse(r.ml_prediction) : null,
    }));
  },
  getRiskStats(userId) { return stmts.getRiskStats.get(userId); },
  getRiskTrend(userId, limit = 20) { return stmts.getRiskTrend.all(userId, limit); },
  getAllRiskEvents(limit = 100) {
    const rows = stmts.getAllRiskEvents.all(limit);
    return rows.map(r => ({
      ...r,
      deviations: r.deviations ? JSON.parse(r.deviations) : null,
    }));
  },

  // Dataset operations
  insertDatasetSample(data) {
    return stmts.insertDatasetSample.run(
      data.subject, data.session_index, data.rep,
      data.h_period, data.dd_period_t, data.ud_period_t,
      data.h_t, data.dd_t_i, data.ud_t_i,
      data.h_i, data.dd_i_e, data.ud_i_e,
      data.h_e, data.dd_e_five, data.ud_e_five,
      data.h_five, data.dd_five_shift, data.ud_five_shift,
      data.h_shift_r, data.dd_shift_r_o, data.ud_shift_r_o,
      data.h_o, data.dd_o_a, data.ud_o_a,
      data.h_a, data.dd_a_n, data.ud_a_n,
      data.h_n, data.dd_n_l, data.ud_n_l,
      data.h_l, data.dd_l_return, data.ud_l_return,
      data.h_return,
      data.is_anomaly || 0, data.anomaly_score || 0
    );
  },
  bulkInsertDataset: sqlite.transaction((rows) => {
    for (const row of rows) {
      stmts.insertDatasetSample.run(
        row.subject, row.session_index, row.rep,
        row.h_period, row.dd_period_t, row.ud_period_t,
        row.h_t, row.dd_t_i, row.ud_t_i,
        row.h_i, row.dd_i_e, row.ud_i_e,
        row.h_e, row.dd_e_five, row.ud_e_five,
        row.h_five, row.dd_five_shift, row.ud_five_shift,
        row.h_shift_r, row.dd_shift_r_o, row.ud_shift_r_o,
        row.h_o, row.dd_o_a, row.ud_o_a,
        row.h_a, row.dd_a_n, row.ud_a_n,
        row.h_n, row.dd_n_l, row.ud_n_l,
        row.h_l, row.dd_l_return, row.ud_l_return,
        row.h_return,
        row.is_anomaly || 0, row.anomaly_score || 0
      );
    }
  }),
  getDatasetSamples(limit = 50, offset = 0) { return stmts.getDatasetSamples.all(limit, offset); },
  getDatasetCount() { return stmts.getDatasetCount.get().count; },
  getDatasetSubjects() { return stmts.getDatasetSubjects.all(); },
  getDatasetStats() { return stmts.getDatasetStats.get(); },
  getSubjectData(subject, limit = 400) { return stmts.getSubjectData.all(subject, limit); },
  getAnomalies(limit = 50) { return stmts.getAnomalies.all(limit); },
  getDistribution(column) {
    const stmt = sqlite.prepare(`
      SELECT 
        ROUND(${column}, 2) as value,
        COUNT(*) as count
      FROM dataset_samples
      GROUP BY ROUND(${column}, 2)
      ORDER BY value
      LIMIT 100
    `);
    return stmt.all();
  },

  // Simulation helpers
  getRandomSample(subject) {
    if (subject) {
      return sqlite.prepare('SELECT * FROM dataset_samples WHERE subject = ? ORDER BY RANDOM() LIMIT 1').get(subject);
    }
    return sqlite.prepare('SELECT * FROM dataset_samples ORDER BY RANDOM() LIMIT 1').get();
  },
  getAttackSample(subject) {
    // Fetches a random sample from a subject different from the one provided
    return sqlite.prepare('SELECT * FROM dataset_samples WHERE subject != ? ORDER BY RANDOM() LIMIT 1').get(subject);
  },
  getOutlierSample(subject) {
    // Fetches the most anomalous sample for this subject
    return sqlite.prepare('SELECT * FROM dataset_samples WHERE subject = ? ORDER BY anomaly_score DESC LIMIT 1').get(subject);
  },

  // Cleanup
  resetUser(userId) {
    stmts.clearUserSessions.run(userId);
    stmts.clearUserRisks.run(userId);
    stmts.clearBaseline.run(userId);
  },

  // Raw query
  raw(sql, params = []) { return sqlite.prepare(sql).all(...params); },
  run(sql, params = []) { return sqlite.prepare(sql).run(...params); },

  // Close
  close() { sqlite.close(); }
};

module.exports = { db, sqlite };
