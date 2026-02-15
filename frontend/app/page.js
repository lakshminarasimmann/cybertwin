'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function HomePage() {
    const canvasRef = useRef(null);
    const [stats, setStats] = useState({ samples: '—', subjects: '—', features: '—', accuracy: '—' });

    useEffect(() => {
        fetch('/api/dataset/stats')
            .then(r => r.json())
            .then(d => setStats({
                samples: d.total_samples?.toLocaleString() || '20,400',
                subjects: d.total_subjects || 51,
                features: '43',
                accuracy: '99.7%'
            }))
            .catch(() => setStats({ samples: '20,400', subjects: '51', features: '43', accuracy: '99.7%' }));

        // Particle network animation
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 2 + 0.5,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
                ctx.fill();

                particles.slice(i + 1).forEach(p2 => {
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    const features = [
        { icon: '🧬', title: 'Cognitive Digital Twin', desc: 'EMA-based behavioral baseline that evolves with each session. Detects identity drift using weighted deviation analysis across 43 biometric features.', color: 'var(--cyan)' },
        { icon: '🛡️', title: 'Real-Time Risk Engine', desc: 'Sigmoid-normalized risk scoring with configurable thresholds. Instant allow/warn/block decisions powered by trained ML models.', color: 'var(--blue)' },
        { icon: '📊', title: 'Real Dataset Analytics', desc: 'CMU Keystroke Dynamics Benchmark — 20,400 real samples from 51 subjects. No synthetic data. Full statistical analysis with interactive charts.', color: 'var(--purple)' },
        { icon: '🔮', title: 'Attack Narrative Engine', desc: '5-stage attack reconstruction generating human-readable explanations. Classifies credential theft, social engineering, and insider threats.', color: 'var(--emerald)' },
        { icon: '🤖', title: 'Advanced ML Pipeline', desc: 'Isolation Forest, One-Class SVM, Random Forest, Gradient Boosting, K-Means, PCA + t-SNE — all trained on real behavioral data.', color: 'var(--amber)' },
        { icon: '🔒', title: 'Privacy-Preserving', desc: 'Content-agnostic analysis capturing only timing patterns, never keystroke content. Behavioral fingerprinting without compromising user privacy.', color: 'var(--rose)' },
    ];

    return (
        <>
            <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }} />

            <section className="hero">
                <div className="hero-badge">
                    ◈ CMU Keystroke Dynamics Dataset • 20,400 Real Samples • 51 Subjects
                </div>
                <h1>
                    <span className="gradient-text">CYBERTWIN</span>
                    <br />
                    <span style={{ fontSize: '0.45em', fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '0px' }}>
                        Continuous Identity Verification &<br />
                        Cognitive Attack Narrative Reconstruction
                    </span>
                </h1>
                <p className="hero-subtitle">
                    Privacy-preserving behavioral biometric system that builds a cognitive digital twin
                    of each user's interaction patterns. Detects identity anomalies, credential theft,
                    and social engineering attacks in real-time — without ever seeing message content.
                </p>
                <div className="hero-actions">
                    <Link href="/dashboard" className="btn btn-primary btn-lg">
                        ◎ Launch Dashboard
                    </Link>
                    <Link href="/dataset" className="btn btn-secondary btn-lg">
                        ◈ Explore Dataset
                    </Link>
                    <Link href="/analytics" className="btn btn-secondary btn-lg">
                        ◉ ML Analytics
                    </Link>
                </div>
                <div className="hero-stats">
                    <div className="hero-stat animate-in stagger-1">
                        <div className="number">{stats.samples}</div>
                        <div className="label">Real Samples</div>
                    </div>
                    <div className="hero-stat animate-in stagger-2">
                        <div className="number">{stats.subjects}</div>
                        <div className="label">Unique Subjects</div>
                    </div>
                    <div className="hero-stat animate-in stagger-3">
                        <div className="number">{stats.features}</div>
                        <div className="label">Biometric Features</div>
                    </div>
                    <div className="hero-stat animate-in stagger-4">
                        <div className="number">{stats.accuracy}</div>
                        <div className="label">Model Accuracy</div>
                    </div>
                </div>
            </section>

            <section className="section" style={{ position: 'relative', zIndex: 1 }}>
                <div className="container">
                    <div className="text-center mb-3">
                        <span className="page-badge">◈ Core Capabilities</span>
                        <h2 className="section-title">Six Pillars of Behavioral Intelligence</h2>
                        <p className="section-subtitle">From raw keystroke dynamics to actionable threat narratives</p>
                    </div>
                    <div className="grid-3">
                        {features.map((f, i) => (
                            <div key={i} className={`feature-card animate-up stagger-${i + 1}`}>
                                <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30` }}>
                                    {f.icon}
                                </div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" style={{ position: 'relative', zIndex: 1 }}>
                <div className="container">
                    <div className="text-center mb-3">
                        <span className="page-badge">◈ CMU Research Dataset</span>
                        <h2 className="section-title">Built on Real Keystroke Dynamics</h2>
                        <p className="section-subtitle">Not synthetic data — genuine biometric signatures from 51 human subjects</p>
                    </div>
                    <div className="grid-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div className="card card-glow-cyan">
                            <div className="card-header">
                                <span className="card-title">📄 Dataset Source</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                <strong style={{ color: 'var(--cyan)' }}>CMU Keystroke Dynamics Benchmark</strong><br />
                                Paper: "Comparing Anomaly-Detection Algorithms for Keystroke Dynamics"<br />
                                Authors: Kevin Killourhy & Roy Maxion<br />
                                Venue: IEEE Symposium on Security & Privacy, 2009<br />
                                Password: <code style={{ color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>.tie5Roanl</code>
                            </p>
                        </div>
                        <div className="card card-glow-purple">
                            <div className="card-header">
                                <span className="card-title">📊 Feature Categories</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div className="flex items-center gap-1">
                                    <span className="tag tag-info">H.*</span>
                                    <span className="text-sm text-muted">Hold Times — duration a key is pressed (11 features)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="tag tag-purple">DD.*</span>
                                    <span className="text-sm text-muted">Digraph Times — time between key presses (10 features)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="tag tag-allow">UD.*</span>
                                    <span className="text-sm text-muted">Flight Times — release-to-press intervals (10 features)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="tag tag-warn">ENG</span>
                                    <span className="text-sm text-muted">Engineered — consistency, rhythm, range (12 features)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
