'use client';
import { useState } from 'react';

export default function ArchitecturePage() {
    const [activeLayer, setActiveLayer] = useState('capture');

    const layers = [
        {
            id: 'capture',
            name: 'Behavior Capture Layer',
            icon: '📡',
            color: '#06b6d4',
            tech: ['Custom React Hooks', 'Invisible Collection', 'Content-Agnostic'],
            description: 'Invisible behavioral telemetry collection using custom React hooks. Captures keystroke dynamics (hold time, digraph time, flight time), mouse movement velocity/acceleration, click patterns, scroll behavior, and navigation sequences — all without recording actual content typed.',
            signals: ['Keystroke Timing (H.*, DD.*, UD.*)', 'Mouse Velocity & Acceleration', 'Click Interval Patterns', 'Scroll Depth & Speed', 'Navigation Path Entropy', 'Session Duration & Idle Time'],
        },
        {
            id: 'ingestion',
            name: 'Session Ingestion Pipeline',
            icon: '⚙️',
            color: '#3b82f6',
            tech: ['Express.js REST API', 'JWT Auth Middleware', 'SQLite Persistence'],
            description: 'Validates, normalizes, and persists raw behavioral data. Each session is authenticated via JWT, ensuring all data points are cryptographically linked to a verified identity. Data is stored in SQLite for efficient in-process querying.',
            signals: ['JWT Token Validation', 'Schema Validation & Normalization', 'SQLite INSERT (session_behavior)', 'Timestamp & Metadata Enrichment', 'Rate Limiting & CORS Protection'],
        },
        {
            id: 'twin',
            name: 'Cognitive Digital Twin Engine',
            icon: '🧬',
            color: '#8b5cf6',
            tech: ['EMA Baseline', 'Rolling Statistics', 'Weighted Deviation'],
            description: 'Maintains a continuously evolving behavioral profile (digital twin) for each user using Exponential Moving Average (EMA) with configurable α. The twin adapts to gradual behavioral changes while remaining sensitive to sudden deviations indicative of account takeover.',
            signals: ['EMA α=0.3 Baseline Update', 'Per-Feature Rolling Mean/Std', 'Deviation = |current - baseline| / (std + ε)', 'Weighted Multi-Signal Fusion', 'Session Count & Confidence Tracking'],
        },
        {
            id: 'risk',
            name: 'Risk Scoring Engine',
            icon: '🛡️',
            color: '#f59e0b',
            tech: ['Sigmoid Normalization', 'Configurable Thresholds', 'ML Anomaly Scores'],
            description: 'Computes a composite risk score [0-100] by fusing per-feature deviation scores with ML-generated anomaly scores. Uses sigmoid normalization: score = 100 / (1 + exp(-k*(deviation - threshold))). Decisions are mapped to allow (≤30), warn (31-60), or block (>60).',
            signals: ['Sigmoid Risk Normalization', 'Per-Signal Weight Configuration', 'Allow ≤ 30 | Warn 31-60 | Block > 60', 'Historical Trend Analysis', 'ML Isolation Forest Integration'],
        },
        {
            id: 'narrative',
            name: 'Attack Narrative Engine',
            icon: '📝',
            color: '#ef4444',
            tech: ['5-Stage Reconstruction', 'Attack Classification', 'NLP Summaries'],
            description: 'Generates human-readable attack narratives by classifying the type and stage of detected anomalies. Identifies bot attacks, social engineering, compromised sessions, and insider threats based on behavioral deviation patterns and temporal analysis.',
            signals: ['Attack Type Classification', '5-Stage Narrative Generation', 'Deviation Pattern Matching', 'Temporal Sequence Analysis', 'Human-Readable Summary Output'],
        },
        {
            id: 'ml',
            name: 'ML Pipeline (Real Data)',
            icon: '🤖',
            color: '#10b981',
            tech: ['scikit-learn', 'CMU Dataset', '6 Model Types'],
            description: 'Advanced ML pipeline trained on the real CMU Keystroke Dynamics Benchmark (20,400 samples, 51 subjects). Trained models are serialized via joblib and loaded by the Node.js backend through a Python subprocess for real-time predictions using actual sklearn models.',
            signals: ['Isolation Forest (Anomaly Detection)', 'One-Class SVM (Novelty Detection)', 'Random Forest (Binary Classification)', 'Gradient Boosting (Subject Identification)', 'K-Means + PCA + t-SNE (Clustering)', 'Feature Engineering (12 aggregate features)'],
        },
    ];

    const techStack = [
        {
            category: 'Frontend', items: [
                { name: 'Next.js 15', desc: 'React framework with App Router' },
                { name: 'Chart.js', desc: 'Interactive charts & visualizations' },
                { name: 'Vanilla CSS', desc: 'Custom design system with 60+ component styles' },
            ]
        },
        {
            category: 'Backend', items: [
                { name: 'Express.js', desc: 'RESTful API with 6 route modules' },
                { name: 'SQLite (better-sqlite3)', desc: 'In-process database — zero external deps' },
                { name: 'JWT + bcrypt', desc: 'Stateless auth & password hashing' },
            ]
        },
        {
            category: 'ML & Data', items: [
                { name: 'scikit-learn', desc: '6 model types trained on real data' },
                { name: 'NumPy + Pandas', desc: 'Feature engineering & data processing' },
                { name: 'CMU Benchmark', desc: '20,400 samples × 31 features × 51 subjects' },
            ]
        },
        {
            category: 'Security', items: [
                { name: 'Helmet', desc: 'Security headers (CSP, HSTS, etc.)' },
                { name: 'CORS', desc: 'Cross-origin request filtering' },
                { name: 'Rate Limiting', desc: '100 req/15min per IP' },
            ]
        },
    ];

    const dbSchema = [
        { table: 'users', cols: 'id, username, password_hash, email, role, created_at', purpose: 'Authenticated user accounts' },
        { table: 'behavior_baselines', cols: 'id, user_id, avg_typing_speed, avg_click_interval, avg_mouse_speed, avg_hold_time, avg_dd_time, avg_ud_time, ...', purpose: 'EMA-updated cognitive twin baseline' },
        { table: 'session_behavior', cols: 'id, user_id, session_id, typing_speed, click_interval, mouse_speed, hold_time, dd_time, ud_time, ...', purpose: 'Per-session behavioral telemetry' },
        { table: 'risk_events', cols: 'id, user_id, session_id, risk_score, decision, label, deviation_json, narrative_json, ...', purpose: 'Risk scores with attack narratives' },
        { table: 'dataset_samples', cols: 'id, subject, session_index, rep, h_period, dd_period_t, ud_period_t, ..., anomaly_score, is_anomaly', purpose: 'CMU Keystroke Dynamics samples' },
    ];

    const active = layers.find(l => l.id === activeLayer);

    return (
        <div className="container">
            <div className="page-header">
                <span className="page-badge">⬡ System Architecture</span>
                <h1>Architecture & Design</h1>
                <p>Six-layer pipeline from invisible behavior capture to attack narrative reconstruction</p>
            </div>

            {/* Interactive Flow Diagram */}
            <div className="card mb-3 animate-in">
                <div className="card-header">
                    <span className="card-title">⬡ Processing Pipeline</span>
                    <span className="card-subtitle">Click each layer to explore</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {layers.map((l, i) => (
                        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setActiveLayer(l.id)}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${activeLayer === l.id ? l.color : 'var(--border)'}`,
                                    background: activeLayer === l.id ? `${l.color}15` : 'var(--bg-glass)',
                                    color: activeLayer === l.id ? l.color : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.8rem',
                                    fontWeight: activeLayer === l.id ? 600 : 400,
                                    minWidth: '140px',
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{l.icon}</div>
                                {l.name}
                            </button>
                            {i < layers.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '1.5rem' }}>→</span>}
                        </div>
                    ))}
                </div>

                {active && (
                    <div className="animate-scale" key={activeLayer} style={{ padding: '1.5rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: `1px solid ${active.color}30` }}>
                        <div className="flex items-center gap-1 mb-2">
                            <span style={{ fontSize: '1.5rem' }}>{active.icon}</span>
                            <h3 style={{ color: active.color, fontSize: '1.2rem' }}>{active.name}</h3>
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{active.description}</p>
                        <div className="flex gap-1 mb-2 flex-wrap">
                            {active.tech.map((t, i) => <span key={i} className="tag tag-info">{t}</span>)}
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <div className="text-xs text-muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Signals & Components</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                                {active.signals.map((s, i) => (
                                    <div key={i} className="flex items-center gap-1" style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        <span style={{ color: active.color }}>▸</span>
                                        <span className="text-sm text-muted">{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tech Stack */}
            <div className="grid-4 mb-3">
                {techStack.map((cat, i) => (
                    <div key={i} className={`card animate-up stagger-${i + 1}`}>
                        <div className="card-header">
                            <span className="card-title">{cat.category}</span>
                        </div>
                        {cat.items.map((item, j) => (
                            <div key={j} style={{ padding: '0.5rem 0', borderBottom: j < cat.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div className="text-sm" style={{ fontWeight: 600, color: 'var(--cyan)' }}>{item.name}</div>
                                <div className="text-xs text-muted">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Database Schema */}
            <div className="card mb-3 animate-in">
                <div className="card-header">
                    <span className="card-title">🗄 SQLite Database Schema</span>
                    <span className="tag tag-info">better-sqlite3 (in-process)</span>
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr><th>Table</th><th>Key Columns</th><th>Purpose</th></tr>
                        </thead>
                        <tbody>
                            {dbSchema.map((t, i) => (
                                <tr key={i}>
                                    <td className="highlight">{t.table}</td>
                                    <td className="text-muted" style={{ maxWidth: '400px', whiteSpace: 'normal', lineHeight: 1.6 }}>{t.cols}</td>
                                    <td className="text-muted">{t.purpose}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* API Endpoints */}
            <div className="card mb-3 animate-in">
                <div className="card-header">
                    <span className="card-title">🔗 REST API Endpoints</span>
                    <span className="card-subtitle">Express.js @ port 5000</span>
                </div>
                <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Method</th><th>Path</th><th>Description</th><th>Auth</th></tr>
                        </thead>
                        <tbody>
                            {[
                                ['POST', '/api/auth/register', 'User registration', '❌'],
                                ['POST', '/api/auth/login', 'User login + JWT', '❌'],
                                ['POST', '/api/auth/demo-token', 'Generate demo token', '❌'],
                                ['POST', '/api/session/behavior', 'Submit behavioral telemetry', '✅'],
                                ['GET', '/api/risk/events', 'Fetch risk events', '✅'],
                                ['GET', '/api/risk/stats', 'Risk statistics & trends', '✅'],
                                ['GET', '/api/risk/trend', 'Historical risk trend', '✅'],
                                ['GET', '/api/twin/baseline', 'Get cognitive twin baseline', '✅'],
                                ['POST', '/api/twin/reset', 'Reset behavioral baseline', '✅'],
                                ['POST', '/api/demo/simulate-normal', 'Normal user simulation', '✅'],
                                ['POST', '/api/demo/simulate-attacker', 'Bot attack simulation', '✅'],
                                ['POST', '/api/demo/simulate-social-engineering', 'Social engineering sim', '✅'],
                                ['GET', '/api/dataset/stats', 'Dataset overview statistics', '❌'],
                                ['GET', '/api/dataset/samples', 'Paginated raw samples', '❌'],
                                ['GET', '/api/dataset/subjects', 'Subject list + profiles', '❌'],
                                ['GET', '/api/dataset/subject/:id', 'Per-subject drill-down', '❌'],
                                ['GET', '/api/dataset/anomalies', 'Detected anomalies', '❌'],
                                ['GET', '/api/ml/models', 'ML model performance', '❌'],
                                ['GET', '/api/ml/feature-importances', 'Feature rankings', '❌'],
                                ['GET', '/api/ml/pca', 'PCA 2D embeddings', '❌'],
                                ['GET', '/api/ml/tsne', 't-SNE embeddings', '❌'],
                                ['GET', '/api/ml/clusters', 'K-Means cluster analysis', '❌'],
                                ['GET', '/api/ml/confusion-matrix', 'Classification matrix', '❌'],
                                ['GET', '/api/ml/subject-profiles', 'Subject behavioral profiles', '❌'],
                                ['POST', '/api/ml/predict', 'Real-time anomaly prediction', '❌'],
                            ].map(([method, path, desc, auth], i) => (
                                <tr key={i}>
                                    <td><span className={`tag ${method === 'POST' ? 'tag-warn' : 'tag-allow'}`}>{method}</span></td>
                                    <td className="highlight">{path}</td>
                                    <td className="text-muted">{desc}</td>
                                    <td>{auth}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Core Algorithms */}
            <div className="grid-2 mb-3">
                <div className="card animate-up stagger-1">
                    <div className="card-header">
                        <span className="card-title">📐 Core Algorithms</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 2 }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <div className="text-cyan" style={{ fontWeight: 600 }}>EMA Baseline Update:</div>
                            <div style={{ paddingLeft: '1rem' }}>baseline[t] = α × current + (1 - α) × baseline[t-1]</div>
                            <div style={{ paddingLeft: '1rem', color: 'var(--text-muted)' }}>where α = 0.3 (configurable)</div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <div className="text-purple" style={{ fontWeight: 600 }}>Deviation Score:</div>
                            <div style={{ paddingLeft: '1rem' }}>d = |current - baseline| / (std + ε)</div>
                            <div style={{ paddingLeft: '1rem', color: 'var(--text-muted)' }}>ε = 1e-6 for numerical stability</div>
                        </div>
                        <div>
                            <div className="text-amber" style={{ fontWeight: 600 }}>Risk Normalization (Sigmoid):</div>
                            <div style={{ paddingLeft: '1rem' }}>score = 100 / (1 + exp(-k × (Σ wᵢdᵢ - θ)))</div>
                            <div style={{ paddingLeft: '1rem', color: 'var(--text-muted)' }}>k = steepness, θ = threshold</div>
                        </div>
                    </div>
                </div>
                <div className="card animate-up stagger-2">
                    <div className="card-header">
                        <span className="card-title">🔐 Security Model</span>
                    </div>
                    <div style={{ lineHeight: 2 }}>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>Content-Agnostic:</strong> Only timing patterns captured</div>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>JWT Stateless Auth:</strong> No server-side sessions</div>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>bcrypt Hashing:</strong> 10 rounds, salted</div>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>Rate Limiting:</strong> 100 req / 15 min per IP</div>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>Helmet Headers:</strong> CSP, HSTS, XSS Protection</div>
                        <div className="text-sm mb-1"><span className="text-emerald">✓</span> <strong>CORS:</strong> Whitelist-based origin filtering</div>
                        <div className="text-sm"><span className="text-emerald">✓</span> <strong>In-Process DB:</strong> No network-exposed database</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
