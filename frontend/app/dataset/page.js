'use client';
import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DatasetPage() {
    const [stats, setStats] = useState(null);
    const [samples, setSamples] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [subjectData, setSubjectData] = useState(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [tab, setTab] = useState('overview');
    const [anomalies, setAnomalies] = useState([]);

    const holdDistRef = useRef(null);
    const holdDistChart = useRef(null);
    const subjectBarRef = useRef(null);
    const subjectBarChart = useRef(null);
    const scatterRef = useRef(null);
    const scatterChart = useRef(null);

    const LIMIT = 30;

    useEffect(() => {
        Promise.all([
            fetch(`${API}/api/dataset/stats`).then(r => r.json()),
            fetch(`${API}/api/dataset/samples?limit=${LIMIT}&offset=0`).then(r => r.json()),
            fetch(`${API}/api/dataset/subjects`).then(r => r.json()),
            fetch(`${API}/api/dataset/anomalies?limit=20`).then(r => r.json()),
        ]).then(([s, d, sub, anom]) => {
            setStats(s);
            setSamples(d.samples);
            setTotal(d.total);
            setSubjects(sub.subjects);
            setAnomalies(anom.anomalies || []);
        }).catch(e => console.error('Dataset load error:', e));
    }, []);

    // Hold time distribution chart
    useEffect(() => {
        if (!holdDistRef.current || !subjects.length) return;
        if (holdDistChart.current) holdDistChart.current.destroy();

        const sorted = [...subjects].sort((a, b) => (b.mean_hold || 0) - (a.mean_hold || 0)).slice(0, 20);

        holdDistChart.current = new Chart(holdDistRef.current, {
            type: 'bar',
            data: {
                labels: sorted.map(s => s.subject),
                datasets: [{
                    label: 'Avg Hold Time (s)',
                    data: sorted.map(s => s.mean_hold || 0),
                    backgroundColor: sorted.map(s => (s.anomaly_rate || 0) > 0.1 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(6, 182, 212, 0.7)'),
                    borderColor: sorted.map(s => (s.anomaly_rate || 0) > 0.1 ? '#ef4444' : '#06b6d4'),
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f0f4f8', bodyColor: '#94a3b8',
                        callbacks: { afterLabel: (ctx) => `Samples: ${sorted[ctx.dataIndex]?.samples || 'N/A'}\nAnomaly Rate: ${((sorted[ctx.dataIndex]?.anomaly_rate || 0) * 100).toFixed(1)}%` }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } } },
                    y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10, family: 'JetBrains Mono' } } },
                }
            }
        });
    }, [subjects]);

    // Subject comparison scatter
    useEffect(() => {
        if (!scatterRef.current || !subjects.length) return;
        if (scatterChart.current) scatterChart.current.destroy();

        const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f43f5e', '#14b8a6', '#a855f7', '#ec4899'];

        scatterChart.current = new Chart(scatterRef.current, {
            type: 'scatter',
            data: {
                datasets: subjects.slice(0, 10).map((s, i) => ({
                    label: s.subject,
                    data: [{ x: s.mean_hold || 0, y: s.mean_dd || 0 }],
                    backgroundColor: colors[i % colors.length],
                    pointRadius: Math.max(6, (s.samples || 1) / 40),
                    pointHoverRadius: 12,
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, pointStyle: 'circle', padding: 8 } },
                    tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8' },
                },
                scales: {
                    x: { title: { display: true, text: 'Mean Hold Time (s)', color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                    y: { title: { display: true, text: 'Mean DD Time (s)', color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                }
            }
        });
    }, [subjects]);

    const loadPage = (newPage) => {
        const offset = newPage * LIMIT;
        fetch(`${API}/api/dataset/samples?limit=${LIMIT}&offset=${offset}`)
            .then(r => r.json())
            .then(d => { setSamples(d.samples); setPage(newPage); });
    };

    const loadSubject = (subj) => {
        setSelectedSubject(subj);
        fetch(`${API}/api/dataset/subject/${subj}`)
            .then(r => r.json())
            .then(d => setSubjectData(d));
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="container">
            <div className="page-header">
                <span className="page-badge">◈ CMU Keystroke Dynamics Benchmark</span>
                <h1>Real Dataset Explorer</h1>
                <p>Browse and analyze 20,400 genuine behavioral samples from 51 human subjects</p>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid-4 mb-3 animate-in">
                    <div className="card stat-card card-glow-cyan">
                        <div className="stat-value text-cyan">{stats.total_samples?.toLocaleString()}</div>
                        <div className="stat-label">Total Samples</div>
                    </div>
                    <div className="card stat-card card-glow-blue">
                        <div className="stat-value text-blue">{stats.total_subjects}</div>
                        <div className="stat-label">Unique Subjects</div>
                    </div>
                    <div className="card stat-card card-glow-purple">
                        <div className="stat-value text-purple">{stats.anomaly_count}</div>
                        <div className="stat-label">Anomalies Found</div>
                    </div>
                    <div className="card stat-card" style={{ boxShadow: 'var(--shadow-glow-cyan)' }}>
                        <div className="stat-value text-amber">{stats.avg_hold_period ? (stats.avg_hold_period * 1000).toFixed(1) : '—'}ms</div>
                        <div className="stat-label">Avg Hold Time</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                {['overview', 'samples', 'subjects', 'anomalies'].map(t => (
                    <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t === 'overview' ? '📊 Overview' : t === 'samples' ? '📋 Sample Data' : t === 'subjects' ? '👤 Subjects' : '⚠ Anomalies'}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="grid-2 mb-3 animate-in">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">📊 Hold Time by Subject (Top 20)</span>
                        </div>
                        <div className="chart-container chart-container-lg">
                            <canvas ref={holdDistRef} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">🔘 Subject Behavioral Clusters</span>
                            <span className="card-subtitle">Hold vs DD Time</span>
                        </div>
                        <div className="chart-container chart-container-lg">
                            <canvas ref={scatterRef} />
                        </div>
                    </div>
                    {stats && (
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-header">
                                <span className="card-title">📄 Dataset Information</span>
                            </div>
                            <div className="grid-3" style={{ gap: '2rem' }}>
                                <div>
                                    <h4 className="text-cyan mb-1">Source</h4>
                                    <p className="text-sm text-muted">{stats.dataset_name}</p>
                                    <p className="text-xs text-muted mt-1">{stats.paper}</p>
                                    <p className="text-xs text-muted"><a href={stats.source} target="_blank" rel="noopener">{stats.source}</a></p>
                                </div>
                                <div>
                                    <h4 className="text-purple mb-1">Description</h4>
                                    <p className="text-sm text-muted">{stats.description}</p>
                                </div>
                                <div>
                                    <h4 className="text-emerald mb-1">Feature Types</h4>
                                    {stats.features && Object.entries(stats.features).map(([k, v]) => (
                                        <p key={k} className="text-sm text-muted"><strong className="text-primary">{k}:</strong> {v}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sample Data Tab */}
            {tab === 'samples' && (
                <div className="card mb-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">📋 Raw Dataset Samples</span>
                        <span className="card-subtitle">Page {page + 1} of {totalPages} • {total.toLocaleString()} rows</span>
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Session</th>
                                    <th>Rep</th>
                                    <th>H.period</th>
                                    <th>DD.period.t</th>
                                    <th>UD.period.t</th>
                                    <th>H.t</th>
                                    <th>DD.t.i</th>
                                    <th>UD.t.i</th>
                                    <th>H.i</th>
                                    <th>Anomaly</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {samples.map((s, i) => (
                                    <tr key={i}>
                                        <td className="highlight" style={{ cursor: 'pointer' }} onClick={() => { loadSubject(s.subject); setTab('subjects'); }}>{s.subject}</td>
                                        <td>{s.session_index}</td>
                                        <td>{s.rep}</td>
                                        <td>{s.h_period?.toFixed(4)}</td>
                                        <td>{s.dd_period_t?.toFixed(4)}</td>
                                        <td>{s.ud_period_t?.toFixed(4)}</td>
                                        <td>{s.h_t?.toFixed(4)}</td>
                                        <td>{s.dd_t_i?.toFixed(4)}</td>
                                        <td>{s.ud_t_i?.toFixed(4)}</td>
                                        <td>{s.h_i?.toFixed(4)}</td>
                                        <td>{s.is_anomaly ? <span className="tag tag-block">YES</span> : <span className="tag tag-allow">NO</span>}</td>
                                        <td style={{ color: s.anomaly_score > 0.5 ? 'var(--red)' : 'var(--text-muted)' }}>
                                            {s.anomaly_score?.toFixed(3) || '0'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination">
                        <button onClick={() => loadPage(0)} disabled={page === 0}>First</button>
                        <button onClick={() => loadPage(page - 1)} disabled={page === 0}>← Prev</button>
                        <span className="text-sm text-muted">Page {page + 1} / {totalPages}</span>
                        <button onClick={() => loadPage(page + 1)} disabled={page >= totalPages - 1}>Next →</button>
                        <button onClick={() => loadPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</button>
                    </div>
                </div>
            )}

            {/* Subjects Tab */}
            {tab === 'subjects' && (
                <div className="grid-1-2 mb-3 animate-in">
                    <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <div className="card-header">
                            <span className="card-title">👤 Subjects ({subjects.length})</span>
                        </div>
                        {subjects.map((s, i) => (
                            <div key={i} onClick={() => loadSubject(s.subject)}
                                style={{
                                    padding: '0.6rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: selectedSubject === s.subject ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = selectedSubject === s.subject ? 'rgba(6, 182, 212, 0.08)' : 'transparent'}
                            >
                                <span className="text-sm" style={{ color: selectedSubject === s.subject ? 'var(--cyan)' : 'var(--text-secondary)' }}>{s.subject}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted">{s.samples} samples</span>
                                    {(s.anomaly_rate || 0) > 0.1 && <span className="tag tag-block" style={{ fontSize: '0.6rem' }}>HIGH</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="card">
                        {subjectData ? (
                            <>
                                <div className="card-header">
                                    <span className="card-title">📊 Subject: {selectedSubject}</span>
                                    <span className="card-subtitle">{subjectData.total} samples</span>
                                </div>
                                <div className="grid-3 mb-2" style={{ gap: '0.75rem' }}>
                                    <div className="stat-card card" style={{ padding: '0.75rem' }}>
                                        <div className="stat-value text-cyan" style={{ fontSize: '1.2rem' }}>{(subjectData.stats?.hold_time?.mean * 1000)?.toFixed(1)}ms</div>
                                        <div className="stat-label">Avg Hold</div>
                                    </div>
                                    <div className="stat-card card" style={{ padding: '0.75rem' }}>
                                        <div className="stat-value text-purple" style={{ fontSize: '1.2rem' }}>{(subjectData.stats?.dd_time?.mean * 1000)?.toFixed(1)}ms</div>
                                        <div className="stat-label">Avg DD</div>
                                    </div>
                                    <div className="stat-card card" style={{ padding: '0.75rem' }}>
                                        <div className="stat-value" style={{ fontSize: '1.2rem', color: subjectData.stats?.anomaly_rate > 0.1 ? 'var(--red)' : 'var(--emerald)' }}>
                                            {(subjectData.stats?.anomaly_rate * 100)?.toFixed(1)}%
                                        </div>
                                        <div className="stat-label">Anomaly Rate</div>
                                    </div>
                                </div>
                                <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Session</th>
                                                <th>H.period</th>
                                                <th>DD.period.t</th>
                                                <th>UD.period.t</th>
                                                <th>Anomaly</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjectData.data?.map((d, i) => (
                                                <tr key={i}>
                                                    <td>{d.session_index}</td>
                                                    <td>{d.h_period?.toFixed(4)}</td>
                                                    <td>{d.dd_period_t?.toFixed(4)}</td>
                                                    <td>{d.ud_period_t?.toFixed(4)}</td>
                                                    <td>{d.is_anomaly ? <span className="tag tag-block">⚠</span> : <span className="tag tag-allow">✓</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <div className="icon">👤</div>
                                <h3>Select a Subject</h3>
                                <p>Click on a subject to view their behavioral profile</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Anomalies Tab */}
            {tab === 'anomalies' && (
                <div className="card mb-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">⚠ Detected Anomalies</span>
                        <span className="tag tag-block">{anomalies.length} anomalies</span>
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Session</th>
                                    <th>Anomaly Score</th>
                                    <th>H.period</th>
                                    <th>DD.period.t</th>
                                    <th>UD.period.t</th>
                                    <th>H.t</th>
                                </tr>
                            </thead>
                            <tbody>
                                {anomalies.map((a, i) => (
                                    <tr key={i}>
                                        <td className="highlight">{a.subject}</td>
                                        <td>{a.session_index}</td>
                                        <td className="danger" style={{ fontWeight: 700 }}>{a.anomaly_score?.toFixed(4)}</td>
                                        <td>{a.h_period?.toFixed(4)}</td>
                                        <td>{a.dd_period_t?.toFixed(4)}</td>
                                        <td>{a.ud_period_t?.toFixed(4)}</td>
                                        <td>{a.h_t?.toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
