'use client';
import { useState, useEffect } from 'react';

export default function AboutPage() {
    const [openSection, setOpenSection] = useState('problem');

    const sections = [
        {
            id: 'problem',
            title: 'The Problem',
            icon: '🔴',
            content: `Traditional authentication ends at login — once credentials are verified, the system blindly trusts the session. This creates a critical window for credential theft, session hijacking, insider threats, and social engineering attacks. Behavioral biometrics closes this gap by continuously verifying identity through interaction patterns that are nearly impossible to forge.`,
        },
        {
            id: 'solution',
            title: 'The CYBERTWIN Approach',
            icon: '🧬',
            content: `CYBERTWIN builds a Cognitive Digital Twin — a living behavioral model — for each user. Using Exponential Moving Average (EMA) with α = 0.3, it maintains rolling baselines across 43 biometric features extracted from keystroke dynamics, mouse movements, click patterns, and navigation behavior. When deviation exceeds configurable thresholds, the system generates a risk score, makes an allow/warn/block decision, and constructs a 5-stage attack narrative explaining what likely happened and why.`,
        },
        {
            id: 'dataset',
            title: 'CMU Keystroke Dynamics Benchmark',
            icon: '📊',
            content: `Our ML pipeline is trained on the genuine CMU Keystroke Dynamics Benchmark dataset — 20,400 samples from 51 human subjects. Each sample contains 31 timing features (hold times, digraph times, flight times) measured as subjects typed the password ".tie5Roanl" across 400 sessions. This is the gold standard in keystroke biometrics research, cited by the seminal paper "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics" by Kevin Killourhy and Roy Maxion (IEEE S&P 2009).`,
        },
        {
            id: 'ml',
            title: 'Machine Learning Pipeline',
            icon: '🤖',
            content: `Six model types are trained on the real dataset:\n\n• Isolation Forest — Unsupervised anomaly detection identifying 8% of samples as behavioral outliers\n• One-Class SVM — Per-user novelty detection trained on individual behavioral signatures\n• Random Forest — Binary classification (genuine vs impostor) achieving ~99.7% accuracy with AUC-ROC > 0.99\n• Gradient Boosting — Multi-class subject identification across 10 subjects at ~90%+ accuracy\n• K-Means Clustering — Groups users into 10 behavioral clusters based on typing patterns\n• PCA + t-SNE — Dimensionality reduction for interactive 2D visualization of the behavioral space`,
        },
        {
            id: 'privacy',
            title: 'Privacy Guarantees',
            icon: '🔒',
            content: `CYBERTWIN is fundamentally content-agnostic. It captures only temporal patterns — how long keys are held, intervals between keystrokes, mouse velocity curves — never what was typed. No message content, no browsing history, no personal data is stored. The behavioral fingerprint is a mathematical signature, not a surveillance record. All data is stored locally in an in-process SQLite database with no external network exposure.`,
        },
        {
            id: 'attacks',
            title: 'Attack Vectors & Detection',
            icon: '⚔️',
            content: `CYBERTWIN detects multiple attack categories:\n\n• Credential Theft — Stolen passwords show completely different typing dynamics (rhythm, hold times, flight patterns)\n• Social Engineering — Gradual behavioral drift under coercion detected through progressive deviation analysis\n• Session Hijacking — Abrupt behavioral discontinuity triggers immediate block\n• Insider Threats — Subtle long-term changes in interaction patterns identified via baseline drift analysis\n• Bot/Automation — Non-human click intervals, zero mouse jitter, and perfectly consistent timing expose scripted attacks\n• Keylogger Testing — Replayed keystrokes lack natural timing variance and micro-hesitations`,
        },
        {
            id: 'demo',
            title: 'Demo Scenarios',
            icon: '🎮',
            content: `Three simulation scenarios demonstrate the system:\n\n1. Normal User — Generates behavioral data within the established baseline. Risk score remains low (0-30), decision is ALLOW. The digital twin updates its baseline via EMA.\n\n2. Credential Theft — Simulates a different person using stolen credentials. Typing speed, hold times, and mouse velocity deviate significantly (2-5x baseline). Risk score jumps to 60-100, decision is BLOCK.\n\n3. Social Engineering — Models a 5-stage attack: initial contact (normal), trust building (slight drift), information extraction (moderate deviation), credential compromise (high deviation), and full takeover (extreme deviation). Progressively escalating risk scores demonstrate real-time detection.`,
        },
    ];

    const teamContributions = [
        { area: 'Behavioral Analysis Engine', desc: 'EMA-based cognitive twin with weighted multi-signal deviation scoring' },
        { area: 'Real Dataset Integration', desc: 'CMU Keystroke Dynamics Benchmark — 20,400 genuine biometric samples' },
        { area: 'Advanced ML Pipeline', desc: '6 model types: Isolation Forest, SVM, Random Forest, Gradient Boosting, K-Means, PCA/t-SNE' },
        { area: 'Risk Scoring & Decisions', desc: 'Sigmoid-normalized scoring with configurable allow/warn/block thresholds' },
        { area: 'Attack Narrative Engine', desc: '5-stage reconstruction with attack type classification and NLP summaries' },
        { area: 'Interactive Dashboard', desc: 'Real-time charts (Chart.js), live behavior capture, simulation controls' },
        { area: 'Dataset Explorer', desc: 'Paginated sample browser, per-subject drill-down, anomaly detection results' },
        { area: 'ML Analytics Visualization', desc: 'PCA/t-SNE scatter plots, confusion matrix, feature importance rankings, cluster analysis' },
        { area: 'In-Process Database', desc: 'SQLite (better-sqlite3) with 5 tables, prepared statements, zero external dependencies' },
        { area: 'RESTful API', desc: '25 endpoints across 7 route modules with JWT auth, rate limiting, and security headers' },
    ];

    return (
        <div className="container">
            <div className="page-header">
                <span className="page-badge">ⓘ About CYBERTWIN</span>
                <h1>About the Project</h1>
                <p>Continuous Identity Verification & Cognitive Attack Narrative Reconstruction</p>
            </div>

            {/* Expandable Sections */}
            <div className="mb-3">
                {sections.map((s, i) => (
                    <div key={s.id} className={`card mb-2 animate-up stagger-${Math.min(i + 1, 5)}`}
                        style={{ cursor: 'pointer', borderColor: openSection === s.id ? 'var(--border-active)' : 'var(--border)' }}
                        onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{s.title}</h3>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem', transform: openSection === s.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▾</span>
                        </div>
                        {openSection === s.id && (
                            <div className="animate-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 2, whiteSpace: 'pre-line' }}>{s.content}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Key Contributions */}
            <div className="card mb-3 animate-in">
                <div className="card-header">
                    <span className="card-title">🏆 System Capabilities</span>
                    <span className="card-subtitle">{teamContributions.length} components</span>
                </div>
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                    {teamContributions.map((c, i) => (
                        <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div className="text-sm" style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: '0.25rem' }}>{c.area}</div>
                            <div className="text-xs text-muted">{c.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Research Basis */}
            <div className="grid-2 mb-3">
                <div className="card animate-up stagger-1">
                    <div className="card-header">
                        <span className="card-title">📚 Research Foundation</span>
                    </div>
                    <div style={{ lineHeight: 2.2 }}>
                        <div className="text-sm mb-1">
                            <strong className="text-cyan">Primary:</strong> "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics" — Killourhy & Maxion, IEEE S&P 2009
                        </div>
                        <div className="text-sm mb-1">
                            <strong className="text-purple">Dataset:</strong> CMU Keystroke Dynamics Benchmark — 51 subjects × 400 sessions × 31 features
                        </div>
                        <div className="text-sm mb-1">
                            <strong className="text-emerald">Domain:</strong> Behavioral Biometrics, Continuous Authentication, Anomaly Detection
                        </div>
                        <div className="text-sm">
                            <strong className="text-amber">Methods:</strong> Exponential Moving Average, Isolation Forest, One-Class SVM, Ensemble Classification, Manifold Learning
                        </div>
                    </div>
                </div>
                <div className="card animate-up stagger-2">
                    <div className="card-header">
                        <span className="card-title">🔬 Key Insights</span>
                    </div>
                    <div style={{ lineHeight: 2.2 }}>
                        <div className="text-sm mb-1">
                            <span className="text-cyan">1.</span> Keystroke dynamics are unique enough to distinguish 51 subjects with 90%+ accuracy
                        </div>
                        <div className="text-sm mb-1">
                            <span className="text-cyan">2.</span> Hold time and digraph timing are the strongest individual identifiers
                        </div>
                        <div className="text-sm mb-1">
                            <span className="text-cyan">3.</span> Anomaly detection reliably flags ~8% of sessions as behaviorally suspicious
                        </div>
                        <div className="text-sm mb-1">
                            <span className="text-cyan">4.</span> Binary classification (genuine vs impostor) achieves &gt;99% accuracy with ensemble methods
                        </div>
                        <div className="text-sm">
                            <span className="text-cyan">5.</span> Behavioral clusters reveal natural groupings of "typing styles" across subjects
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Start */}
            <div className="card mb-3 animate-in">
                <div className="card-header">
                    <span className="card-title">🚀 Quick Start</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 2.5, color: 'var(--text-secondary)' }}>
                    <div><span className="text-muted"># 1. Start backend</span></div>
                    <div><span className="text-cyan">cd</span> backend && <span className="text-cyan">npm install</span> && <span className="text-cyan">node</span> server.js</div>
                    <div style={{ marginTop: '0.5rem' }}><span className="text-muted"># 2. Train ML models (one-time)</span></div>
                    <div><span className="text-cyan">cd</span> backend && <span className="text-cyan">python</span> ml/train_model.py</div>
                    <div style={{ marginTop: '0.5rem' }}><span className="text-muted"># 3. Start frontend</span></div>
                    <div><span className="text-cyan">cd</span> frontend && <span className="text-cyan">npm install</span> && <span className="text-cyan">npm run dev</span></div>
                    <div style={{ marginTop: '0.5rem' }}><span className="text-muted"># 4. Open in browser</span></div>
                    <div>Navigate to <span className="text-amber">http://localhost:3000</span></div>
                </div>
            </div>
        </div>
    );
}
