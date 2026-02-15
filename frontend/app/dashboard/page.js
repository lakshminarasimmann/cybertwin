'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DashboardPage() {
    const [token, setToken] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [riskTrend, setRiskTrend] = useState([]);
    const [riskStats, setRiskStats] = useState(null);
    const [baseline, setBaseline] = useState(null);
    const [loading, setLoading] = useState({});
    const [toast, setToast] = useState(null);
    const [simResult, setSimResult] = useState(null);
    const [liveMetrics, setLiveMetrics] = useState({
        typing_speed: 0, click_interval: 0, mouse_speed: 0,
        hold_time: 0, dd_time: 0, ud_time: 0
    });
    const [behaviorCapture, setBehaviorCapture] = useState({ keystrokes: 0, clicks: 0, moves: 0 });

    const riskTrendRef = useRef(null);
    const riskTrendChart = useRef(null);
    const decisionRef = useRef(null);
    const decisionChart = useRef(null);
    const radarRef = useRef(null);
    const radarChart = useRef(null);

    // Auto-auth on mount
    useEffect(() => {
        fetch(`${API}/api/auth/demo-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(r => r.json())
            .then(d => { setToken(d.token); showToast('Session initialized — behavioral tracking active', 'info'); })
            .catch(() => showToast('Backend not reachable', 'error'));
    }, []);

    // Load data when token is ready
    useEffect(() => {
        if (!token) return;
        const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        Promise.all([
            fetch(`${API}/api/risk/stats`, { headers: h }).then(r => r.json()),
            fetch(`${API}/api/risk/trend?limit=20`, { headers: h }).then(r => r.json()),
            fetch(`${API}/api/twin/baseline`, { headers: h }).then(r => r.json()),
        ]).then(([stats, trend, twin]) => {
            setRiskStats(stats.stats);
            setRiskTrend(trend.trend || []);
            setBaseline(twin.baseline);
        }).catch(() => { });
    }, [token]);

    // Live behavior capture
    useEffect(() => {
        let keyTimes = [];
        let clickTimes = [];
        let lastMouse = null;

        const onKey = (e) => {
            keyTimes.push(performance.now());
            setBehaviorCapture(prev => ({ ...prev, keystrokes: prev.keystrokes + 1 }));
            if (keyTimes.length > 10) {
                const intervals = [];
                for (let i = 1; i < keyTimes.length; i++) intervals.push(keyTimes[i] - keyTimes[i - 1]);
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                setLiveMetrics(prev => ({ ...prev, typing_speed: Math.round(60000 / avgInterval), hold_time: +(avgInterval / 1000).toFixed(3) }));
            }
        };

        const onClick = (e) => {
            clickTimes.push(performance.now());
            setBehaviorCapture(prev => ({ ...prev, clicks: prev.clicks + 1 }));
            if (clickTimes.length > 3) {
                const intervals = [];
                for (let i = 1; i < clickTimes.length; i++) intervals.push(clickTimes[i] - clickTimes[i - 1]);
                setLiveMetrics(prev => ({ ...prev, click_interval: Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) }));
            }
        };

        const onMove = (e) => {
            if (lastMouse) {
                const dx = e.clientX - lastMouse.x;
                const dy = e.clientY - lastMouse.y;
                const speed = Math.sqrt(dx * dx + dy * dy);
                setLiveMetrics(prev => ({ ...prev, mouse_speed: +(speed * 0.1 + prev.mouse_speed * 0.9).toFixed(1) }));
            }
            lastMouse = { x: e.clientX, y: e.clientY };
            setBehaviorCapture(prev => ({ ...prev, moves: prev.moves + 1 }));
        };

        window.addEventListener('keydown', onKey);
        window.addEventListener('click', onClick);
        window.addEventListener('mousemove', onMove);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('click', onClick);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    // Risk Trend Line Chart
    useEffect(() => {
        if (!riskTrendRef.current || riskTrend.length === 0) return;
        if (riskTrendChart.current) riskTrendChart.current.destroy();

        const labels = riskTrend.map((r, i) => `E${i + 1}`);
        const scores = riskTrend.map(r => r.risk_score);
        const colors = scores.map(s => s > 60 ? '#ef4444' : s > 30 ? '#f59e0b' : '#10b981');

        riskTrendChart.current = new Chart(riskTrendRef.current, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Risk Score',
                    data: scores,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: colors,
                    pointBorderColor: colors,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f0f4f8',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(6, 182, 212, 0.3)',
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => `Risk Score: ${ctx.parsed.y}/100 — ${ctx.parsed.y > 60 ? 'BLOCK' : ctx.parsed.y > 30 ? 'WARN' : 'ALLOW'}`,
                        }
                    }
                },
                scales: {
                    y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } } },
                    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } } },
                }
            }
        });
    }, [riskTrend]);

    // Decision Doughnut Chart
    useEffect(() => {
        if (!decisionRef.current || !riskStats) return;
        if (decisionChart.current) decisionChart.current.destroy();

        decisionChart.current = new Chart(decisionRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Allow', 'Warn', 'Block'],
                datasets: [{
                    data: [riskStats.decisions?.allow || 0, riskStats.decisions?.warn || 0, riskStats.decisions?.block || 0],
                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderColor: ['rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(239, 68, 68, 0.3)'],
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8', borderColor: 'rgba(6, 182, 212, 0.3)', borderWidth: 1 },
                }
            }
        });
    }, [riskStats]);

    // Radar Chart for behavioral deviation
    useEffect(() => {
        if (!radarRef.current || !simResult?.deviation) return;
        if (radarChart.current) radarChart.current.destroy();

        const labels = Object.keys(simResult.deviation);
        const values = Object.values(simResult.deviation).map(v => Math.min(v * 100, 100));

        radarChart.current = new Chart(radarRef.current, {
            type: 'radar',
            data: {
                labels: labels.map(l => l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
                datasets: [{
                    label: 'Deviation %',
                    data: values,
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    pointBackgroundColor: values.map(v => v > 50 ? '#ef4444' : v > 25 ? '#f59e0b' : '#10b981'),
                    pointRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        angleLines: { color: 'rgba(255,255,255,0.05)' },
                        pointLabels: { color: '#94a3b8', font: { size: 9, family: 'JetBrains Mono' } },
                        ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 8 } },
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8' },
                }
            }
        });
    }, [simResult]);

    const showToast = (msg, type = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const runSimulation = async (type) => {
        if (!token) return;
        setLoading(prev => ({ ...prev, [type]: true }));
        const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        try {
            const endpoint = type === 'normal' ? 'simulate-normal' : type === 'attacker' ? 'simulate-attacker' : 'simulate-social-engineering';
            const res = await fetch(`${API}/api/demo/${endpoint}`, { method: 'POST', headers: h });
            const data = await res.json();
            setSimResult(data);
            setRiskData(data.risk || data.final_risk);

            // Refresh stats/trend
            const [statsRes, trendRes, baseRes] = await Promise.all([
                fetch(`${API}/api/risk/stats`, { headers: h }).then(r => r.json()),
                fetch(`${API}/api/risk/trend?limit=20`, { headers: h }).then(r => r.json()),
                fetch(`${API}/api/twin/baseline`, { headers: h }).then(r => r.json()),
            ]);
            setRiskStats(statsRes.stats);
            setRiskTrend(trendRes.trend || []);
            setBaseline(baseRes.baseline);

            const risk = data.risk || data.final_risk;
            showToast(`${type.toUpperCase()} — Score: ${risk.score} | ${risk.decision.toUpperCase()}`, risk.decision === 'allow' ? 'success' : 'error');
        } catch (e) {
            showToast('Simulation failed: ' + e.message, 'error');
        }
        setLoading(prev => ({ ...prev, [type]: false }));
    };

    const resetDemo = async () => {
        if (!token) return;
        setLoading(prev => ({ ...prev, reset: true }));
        try {
            await fetch(`${API}/api/demo/reset`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
            setRiskData(null);
            setSimResult(null);
            setRiskTrend([]);
            setRiskStats(null);
            showToast('Demo reset — baseline cleared', 'info');
        } catch (e) { showToast('Reset failed', 'error'); }
        setLoading(prev => ({ ...prev, reset: false }));
    };

    const riskScore = riskData?.score ?? 0;
    const riskColor = riskScore > 60 ? '#ef4444' : riskScore > 30 ? '#f59e0b' : '#10b981';
    const circumference = 2 * Math.PI * 80;
    const dashOffset = circumference - (riskScore / 100) * circumference;

    return (
        <div className="container">
            <div className="page-header">
                <span className="page-badge">◎ Security Command Center</span>
                <h1>Live Dashboard</h1>
                <p>Real-time behavioral analysis, risk scoring, and attack narrative reconstruction</p>
            </div>

            {/* Live Behavior Capture */}
            <div className="card mb-3 animate-in" style={{ borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                <div className="card-header">
                    <span className="card-title">🔴 Live Behavior Capture</span>
                    <span className="tag tag-info" style={{ animation: 'statusPulse 2s infinite' }}>RECORDING</span>
                </div>
                <div className="live-monitor">
                    <div className={`live-metric ${liveMetrics.typing_speed > 300 ? 'alert' : ''}`}>
                        <div className="value">{liveMetrics.typing_speed || '—'}</div>
                        <div className="label">Keys/min</div>
                    </div>
                    <div className="live-metric">
                        <div className="value">{liveMetrics.click_interval || '—'}</div>
                        <div className="label">Click Interval (ms)</div>
                    </div>
                    <div className="live-metric">
                        <div className="value">{liveMetrics.mouse_speed?.toFixed(1) || '—'}</div>
                        <div className="label">Mouse Speed</div>
                    </div>
                    <div className="live-metric">
                        <div className="value">{behaviorCapture.keystrokes}</div>
                        <div className="label">Keystrokes</div>
                    </div>
                    <div className="live-metric">
                        <div className="value">{behaviorCapture.clicks}</div>
                        <div className="label">Clicks</div>
                    </div>
                    <div className="live-metric">
                        <div className="value">{behaviorCapture.moves}</div>
                        <div className="label">Mouse Events</div>
                    </div>
                </div>
            </div>

            {/* Simulation Controls */}
            <div className="card mb-3 animate-in stagger-1">
                <div className="card-header">
                    <span className="card-title">⚡ Attack Simulation Controls</span>
                    <button className="btn btn-sm btn-secondary" onClick={resetDemo} disabled={loading.reset}>
                        {loading.reset ? '⟳ Resetting...' : '↻ Reset'}
                    </button>
                </div>
                <div className="btn-group">
                    <button className={`btn btn-success ${loading.normal ? 'loading' : ''}`} onClick={() => runSimulation('normal')} disabled={loading.normal}>
                        ✓ Normal User
                    </button>
                    <button className={`btn btn-danger ${loading.attacker ? 'loading' : ''}`} onClick={() => runSimulation('attacker')} disabled={loading.attacker}>
                        🤖 Bot Attack
                    </button>
                    <button className={`btn btn-primary ${loading.social ? 'loading' : ''}`} onClick={() => runSimulation('social')} disabled={loading.social}>
                        🎭 Social Engineering
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid-3 mb-3">
                {/* Risk Gauge */}
                <div className="card animate-in stagger-2 text-center">
                    <div className="card-header">
                        <span className="card-title">🎯 Risk Score</span>
                        <span className={`tag ${riskScore > 60 ? 'tag-block' : riskScore > 30 ? 'tag-warn' : 'tag-allow'}`}>
                            {riskData?.decision?.toUpperCase() || 'AWAITING'}
                        </span>
                    </div>
                    <div className="risk-gauge">
                        <svg viewBox="0 0 180 180">
                            <circle cx="90" cy="90" r="80" className="risk-gauge-bg" />
                            <circle cx="90" cy="90" r="80" className="risk-gauge-fill"
                                style={{
                                    stroke: riskColor,
                                    strokeDasharray: circumference,
                                    strokeDashoffset: dashOffset,
                                    filter: `drop-shadow(0 0 6px ${riskColor})`,
                                    transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                        </svg>
                        <div className="risk-gauge-value">
                            <div className="risk-gauge-number" style={{ color: riskColor }}>{riskScore}</div>
                            <div className="risk-gauge-label">{riskData?.label || 'No Data'}</div>
                        </div>
                    </div>
                </div>

                {/* Decision Distribution */}
                <div className="card animate-in stagger-3">
                    <div className="card-header">
                        <span className="card-title">📊 Decision Distribution</span>
                    </div>
                    <div className="chart-container chart-container-sm">
                        <canvas ref={decisionRef} />
                    </div>
                    {riskStats && (
                        <div className="flex justify-between mt-1" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Total: {riskStats.total_events || 0}</span>
                            <span>Avg: {riskStats.avg_score || 0}</span>
                            <span>Max: {riskStats.max_score || 0}</span>
                        </div>
                    )}
                </div>

                {/* Behavioral Deviation Radar */}
                <div className="card animate-in stagger-4">
                    <div className="card-header">
                        <span className="card-title">🕸 Behavioral Deviation</span>
                    </div>
                    <div className="chart-container chart-container-sm">
                        {simResult?.deviation ? (
                            <canvas ref={radarRef} />
                        ) : (
                            <div className="empty-state">
                                <div className="icon">🕸</div>
                                <p className="text-sm">Run a simulation to see deviation radar</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Risk Trend + Narrative */}
            <div className="grid-2 mb-3">
                <div className="card animate-in stagger-3">
                    <div className="card-header">
                        <span className="card-title">📈 Risk Score Trend</span>
                        <span className="card-subtitle">{riskTrend.length} events</span>
                    </div>
                    <div className="chart-container" style={{ height: '280px' }}>
                        {riskTrend.length > 0 ? (
                            <canvas ref={riskTrendRef} />
                        ) : (
                            <div className="empty-state">
                                <div className="icon">📈</div>
                                <p className="text-sm">Run simulations to populate the trend chart</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card animate-in stagger-4">
                    <div className="card-header">
                        <span className="card-title">📝 Attack Narrative</span>
                        {simResult?.narrative?.attackType && (
                            <span className="tag tag-block">{simResult.narrative.attackType}</span>
                        )}
                    </div>
                    {simResult?.narrative ? (
                        <div>
                            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                {simResult.narrative.summary}
                            </p>
                            {simResult.narrative.stages && (
                                <div className="timeline">
                                    {simResult.narrative.stages.map((stage, i) => (
                                        <div key={i} className={`timeline-item ${i === simResult.narrative.stages.length - 1 ? 'danger' : ''}`}>
                                            <div className="text-xs text-mono text-muted">{stage.stage || `Stage ${i + 1}`}</div>
                                            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{stage.description || stage.detail || JSON.stringify(stage)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="icon">📝</div>
                            <h3>No Narrative</h3>
                            <p>Run attack simulations to generate narratives</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Cognitive Twin Baseline */}
            {baseline && (
                <div className="card mb-3 animate-in stagger-5">
                    <div className="card-header">
                        <span className="card-title">🧬 Cognitive Digital Twin Baseline</span>
                        <span className="tag tag-info">Session #{baseline.session_count || 0}</span>
                    </div>
                    <div className="grid-4">
                        {[
                            { label: 'Typing Speed', value: baseline.avg_typing_speed?.toFixed(1), unit: 'wpm' },
                            { label: 'Click Interval', value: baseline.avg_click_interval?.toFixed(0), unit: 'ms' },
                            { label: 'Mouse Speed', value: baseline.avg_mouse_speed?.toFixed(2), unit: 'px/ms' },
                            { label: 'Hold Time', value: (baseline.avg_hold_time * 1000)?.toFixed(1), unit: 'ms' },
                            { label: 'DD Time', value: (baseline.avg_dd_time * 1000)?.toFixed(1), unit: 'ms' },
                            { label: 'UD Time', value: (baseline.avg_ud_time * 1000)?.toFixed(1), unit: 'ms' },
                            { label: 'Read Time', value: baseline.avg_read_time?.toFixed(0), unit: 'ms' },
                            { label: 'Nav Entropy', value: baseline.avg_navigation_entropy?.toFixed(3), unit: '' },
                        ].map((m, i) => (
                            <div key={i} className="stat-card card" style={{ padding: '0.75rem' }}>
                                <div className="stat-value text-cyan" style={{ fontSize: '1.3rem' }}>{m.value || '—'}</div>
                                <div className="stat-label" style={{ fontSize: '0.65rem' }}>{m.label}</div>
                                <div className="text-xs text-muted">{m.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Simulation Result Details */}
            {simResult && simResult.stages && (
                <div className="card mb-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">🎭 Social Engineering — Stage Progression</span>
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Stage</th>
                                    <th>Risk Score</th>
                                    <th>Decision</th>
                                    <th>Typing Δ</th>
                                    <th>Mouse Δ</th>
                                    <th>Click Δ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {simResult.stages.map((s, i) => (
                                    <tr key={i}>
                                        <td className="highlight">{s.name}</td>
                                        <td style={{ color: s.risk.score > 60 ? 'var(--red)' : s.risk.score > 30 ? 'var(--amber)' : 'var(--emerald)' }}>
                                            {s.risk.score}
                                        </td>
                                        <td><span className={`tag tag-${s.risk.decision}`}>{s.risk.decision}</span></td>
                                        <td>{(s.deviation.typing_speed * 100).toFixed(1)}%</td>
                                        <td>{(s.deviation.mouse_speed * 100).toFixed(1)}%</td>
                                        <td>{(s.deviation.click_interval * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ⓘ'}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
