/**
 * Dataset Loader — Imports CMU Keystroke Dynamics into SQLite
 * 
 * CMU Benchmark: 51 subjects, 400 sessions each, 31 features
 * Source: https://www.cs.cmu.edu/~keystroke/
 * Paper: "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics"
 *        by Kevin Killourhy and Roy Maxion
 */

const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

const CSV_PATH = path.join(__dirname, '..', 'ml', 'data', 'real', 'DSL-StrongPasswordData.csv');

function loadDataset() {
    const count = db.getDatasetCount();
    if (count > 0) {
        console.log(`  [Dataset] Already loaded: ${count} samples`);
        return count;
    }

    console.log('  [Dataset] Loading CMU Keystroke Dynamics...');
    const raw = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = raw.trim().split('\n');
    const header = lines[0].split(',');

    console.log(`  [Dataset] Parsing ${lines.length - 1} rows...`);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',');
        if (vals.length < 34) continue;

        rows.push({
            subject: vals[0].trim(),
            session_index: parseInt(vals[1]) || 0,
            rep: parseInt(vals[2]) || 0,
            h_period: parseFloat(vals[3]) || 0,
            dd_period_t: parseFloat(vals[4]) || 0,
            ud_period_t: parseFloat(vals[5]) || 0,
            h_t: parseFloat(vals[6]) || 0,
            dd_t_i: parseFloat(vals[7]) || 0,
            ud_t_i: parseFloat(vals[8]) || 0,
            h_i: parseFloat(vals[9]) || 0,
            dd_i_e: parseFloat(vals[10]) || 0,
            ud_i_e: parseFloat(vals[11]) || 0,
            h_e: parseFloat(vals[12]) || 0,
            dd_e_five: parseFloat(vals[13]) || 0,
            ud_e_five: parseFloat(vals[14]) || 0,
            h_five: parseFloat(vals[15]) || 0,
            dd_five_shift: parseFloat(vals[16]) || 0,
            ud_five_shift: parseFloat(vals[17]) || 0,
            h_shift_r: parseFloat(vals[18]) || 0,
            dd_shift_r_o: parseFloat(vals[19]) || 0,
            ud_shift_r_o: parseFloat(vals[20]) || 0,
            h_o: parseFloat(vals[21]) || 0,
            dd_o_a: parseFloat(vals[22]) || 0,
            ud_o_a: parseFloat(vals[23]) || 0,
            h_a: parseFloat(vals[24]) || 0,
            dd_a_n: parseFloat(vals[25]) || 0,
            ud_a_n: parseFloat(vals[26]) || 0,
            h_n: parseFloat(vals[27]) || 0,
            dd_n_l: parseFloat(vals[28]) || 0,
            ud_n_l: parseFloat(vals[29]) || 0,
            h_l: parseFloat(vals[30]) || 0,
            dd_l_return: parseFloat(vals[31]) || 0,
            ud_l_return: parseFloat(vals[32]) || 0,
            h_return: parseFloat(vals[33]) || 0,
            is_anomaly: 0,
            anomaly_score: 0
        });
    }

    // Bulk insert in a transaction (fast!)
    console.log(`  [Dataset] Inserting ${rows.length} rows into SQLite...`);
    db.bulkInsertDataset(rows);

    const final = db.getDatasetCount();
    console.log(`  [Dataset] Loaded ${final} samples from ${db.getDatasetSubjects().length} subjects`);
    return final;
}

module.exports = { loadDataset };
