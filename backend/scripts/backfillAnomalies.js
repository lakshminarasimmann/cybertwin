/**
 * Backfill anomaly scores and labels from ML model output into SQLite.
 * The train_model.py computed anomalies but only saved to JSON files.
 * This script syncs those results back to the database.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'cybertwin.db');
const SCORES_PATH = path.join(__dirname, '..', 'ml', 'models', 'anomaly_scores.json');

console.log('=== Backfilling anomaly data into SQLite ===');

if (!fs.existsSync(SCORES_PATH)) {
    console.error('anomaly_scores.json not found. Run train_model.py first.');
    process.exit(1);
}

const scores = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf8'));
console.log(`Loaded ${scores.scores.length} anomaly scores (${scores.anomalies} anomalies)`);

const sqlite = new Database(DB_PATH);

// Get all samples in order (same order as training pipeline)
const samples = sqlite.prepare('SELECT rowid, subject, session_index, rep FROM dataset_samples ORDER BY rowid').all();
console.log(`Database has ${samples.length} samples`);

if (samples.length !== scores.scores.length) {
    console.error(`Mismatch: DB has ${samples.length} samples but ML has ${scores.scores.length} scores`);
    process.exit(1);
}

const update = sqlite.prepare('UPDATE dataset_samples SET anomaly_score = ?, is_anomaly = ? WHERE rowid = ?');

const backfill = sqlite.transaction(() => {
    let updated = 0;
    for (let i = 0; i < samples.length; i++) {
        const score = scores.scores[i];
        const label = scores.labels[i];
        update.run(score, label, samples[i].rowid);
        updated++;
    }
    return updated;
});

const count = backfill();
console.log(`Updated ${count} rows with anomaly data`);

// Verify
const stats = sqlite.prepare(`
    SELECT 
        COUNT(*) as total,
        SUM(is_anomaly) as anomaly_count,
        AVG(anomaly_score) as avg_score,
        MAX(anomaly_score) as max_score
    FROM dataset_samples
`).get();

console.log(`\nVerification:`);
console.log(`  Total samples: ${stats.total}`);
console.log(`  Anomalies: ${stats.anomaly_count} (${(stats.anomaly_count / stats.total * 100).toFixed(1)}%)`);
console.log(`  Avg anomaly score: ${stats.avg_score.toFixed(4)}`);
console.log(`  Max anomaly score: ${stats.max_score.toFixed(4)}`);

sqlite.close();
console.log('\n=== Backfill complete ===');
