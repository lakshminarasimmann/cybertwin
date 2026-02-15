'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AnalyticsPage() {
    const [models, setModels] = useState(null);
    const [pcaData, setPcaData] = useState(null);
    const [tsneData, setTsneData] = useState(null);
    const [clusters, setClusters] = useState(null);
    const [confMatrix, setConfMatrix] = useState(null);
    const [anomalyDist, setAnomalyDist] = useState(null);
    const [featureImportances, setFeatureImportances] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [tab, setTab] = useState('models');
    const [loading, setLoading] = useState(true);

    const importanceRef = useRef(null);
    const importanceChart = useRef(null);
    const pcaRef = useRef(null);
    const pcaChart = useRef(null);
    const tsneRef = useRef(null);
    const tsneChart = useRef(null);
    const clusterRef = useRef(null);
    const clusterChart = useRef(null);
    const anomalyRef = useRef(null);
    const anomalyChart = useRef(null);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch(`${API}/api/ml/models`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/feature-importances`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/pca?limit=1500`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/tsne?limit=1500`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/clusters`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/confusion-matrix`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/anomaly-distribution`).then(r => r.json()).catch(() => null),
            fetch(`${API}/api/ml/subject-profiles`).then(r => r.json()).catch(() => null),
        ]).then(([m, fi, pca, tsne, cl, cm, ad, sp]) => {
            setModels(m);
            setFeatureImportances(fi?.importances || []);
            setPcaData(pca);
            setTsneData(tsne);
            setClusters(cl);
            setConfMatrix(cm);
            setAnomalyDist(ad);
            setProfiles(sp?.profiles || []);
            setLoading(false);
        });
    }, []);

    // Feature Importance Bar Chart
    useEffect(() => {
        if (!importanceRef.current || featureImportances.length === 0) return;
        if (importanceChart.current) importanceChart.current.destroy();

        const top15 = featureImportances.slice(0, 15);
        importanceChart.current = new Chart(importanceRef.current, {
            type: 'bar',
            data: {
                labels: top15.map(f => f.name),
                datasets: [{
                    label: 'Importance',
                    data: top15.map(f => f.importance),
                    backgroundColor: top15.map((_, i) => {
                        const hue = 180 + (i * 12);
                        return `hsla(${hue}, 70%, 55%, 0.8)`;
                    }),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(17,24,39,0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8' } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } } },
                    y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 } } },
                }
            }
        });
    }, [featureImportances, tab]);

    // PCA Scatter
    useEffect(() => {
        if (!pcaRef.current || !pcaData?.points?.length) return;
        if (pcaChart.current) pcaChart.current.destroy();

        const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f43f5e', '#14b8a6', '#a855f7', '#ec4899'];
        const uniqueSubjects = [...new Set(pcaData.points.map(p => p.subject))].slice(0, 10);

        const datasets = uniqueSubjects.map((subj, i) => ({
            label: subj,
            data: pcaData.points.filter(p => p.subject === subj).map(p => ({ x: p.x, y: p.y })),
            backgroundColor: pcaData.points.filter(p => p.subject === subj).map(p => p.is_anomaly ? 'rgba(239,68,68,0.8)' : colors[i % colors.length] + 'CC'),
            pointRadius: 3,
            pointHoverRadius: 6,
        }));

        // "Others" bucket
        const others = pcaData.points.filter(p => !uniqueSubjects.includes(p.subject));
        if (others.length > 0) {
            datasets.push({
                label: 'Others',
                data: others.map(p => ({ x: p.x, y: p.y })),
                backgroundColor: 'rgba(100,116,139,0.3)',
                pointRadius: 2,
            });
        }

        pcaChart.current = new Chart(pcaRef.current, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 9 }, usePointStyle: true, padding: 8 } },
                    tooltip: { backgroundColor: 'rgba(17,24,39,0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8' },
                },
                scales: {
                    x: { title: { display: true, text: `PC1 (${(pcaData.explained_variance?.[0] * 100)?.toFixed(1)}%)`, color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                    y: { title: { display: true, text: `PC2 (${(pcaData.explained_variance?.[1] * 100)?.toFixed(1)}%)`, color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                }
            }
        });
    }, [pcaData, tab]);

    // t-SNE Scatter
    useEffect(() => {
        if (!tsneRef.current || !tsneData?.points?.length) return;
        if (tsneChart.current) tsneChart.current.destroy();

        const colors10 = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f43f5e', '#14b8a6', '#a855f7', '#ec4899'];

        tsneChart.current = new Chart(tsneRef.current, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Normal',
                    data: tsneData.points.filter(p => !p.is_anomaly).map(p => ({ x: p.x, y: p.y })),
                    backgroundColor: tsneData.points.filter(p => !p.is_anomaly).map(p => colors10[p.cluster % 10] + '99'),
                    pointRadius: 3,
                }, {
                    label: 'Anomaly',
                    data: tsneData.points.filter(p => p.is_anomaly).map(p => ({ x: p.x, y: p.y })),
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    pointRadius: 5,
                    pointStyle: 'crossRot',
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true } },
                    tooltip: { backgroundColor: 'rgba(17,24,39,0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8' },
                },
                scales: {
                    x: { title: { display: true, text: 't-SNE 1', color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                    y: { title: { display: true, text: 't-SNE 2', color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                }
            }
        });
    }, [tsneData, tab]);

    // Cluster Doughnut
    useEffect(() => {
        if (!clusterRef.current || !clusters?.clusters) return;
        if (clusterChart.current) clusterChart.current.destroy();

        const entries = Object.entries(clusters.clusters);
        const colors10 = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f43f5e', '#14b8a6', '#a855f7', '#ec4899'];

        clusterChart.current = new Chart(clusterRef.current, {
            type: 'doughnut',
            data: {
                labels: entries.map(([k]) => `Cluster ${k}`),
                datasets: [{
                    data: entries.map(([, v]) => v.size),
                    backgroundColor: colors10.map(c => c + 'CC'),
                    borderColor: colors10,
                    borderWidth: 1,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 9 }, usePointStyle: true, padding: 8 } },
                    tooltip: {
                        backgroundColor: 'rgba(17,24,39,0.95)', titleColor: '#f0f4f8', bodyColor: '#94a3b8',
                        callbacks: {
                            afterLabel: (ctx) => {
                                const cl = entries[ctx.dataIndex][1];
                                return `Subjects: ${cl.subjects}\nAnomaly Rate: ${(cl.anomaly_rate * 100).toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }, [clusters, tab]);

    if (loading) {
        return (
            <div className="container">
                <div className="page-header"><h1>Loading ML Analytics...</h1></div>
                <div className="grid-3">
                    {[1, 2, 3].map(i => <div key={i} className="card"><div className="skeleton skeleton-block" /></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <span className="page-badge">◉ Machine Learning Analytics</span>
                <h1>ML Pipeline Results</h1>
                <p>5 trained models on real CMU Keystroke Dynamics data — Isolation Forest, SVM, Random Forest, Gradient Boosting, K-Means</p>
            </div>

            {/* Model Performance Cards */}
            {models?.models && (
                <div className="grid-4 mb-3 animate-in">
                    <div className="card stat-card card-glow-cyan">
                        <div className="stat-value text-cyan">{(models.models.random_forest?.accuracy * 100)?.toFixed(1)}%</div>
                        <div className="stat-label">RF Accuracy</div>
                        <div className="stat-change positive">AUC {(models.models.random_forest?.auc_roc * 100)?.toFixed(1)}%</div>
                    </div>
                    <div className="card stat-card card-glow-purple">
                        <div className="stat-value text-purple">{(models.models.gradient_boosting?.accuracy * 100)?.toFixed(1)}%</div>
                        <div className="stat-label">GB Accuracy (10 subjects)</div>
                    </div>
                    <div className="card stat-card card-glow-blue">
                        <div className="stat-value text-blue">{models.models.isolation_forest?.anomalies_detected}</div>
                        <div className="stat-label">Anomalies Detected</div>
                        <div className="stat-change negative">{(models.models.isolation_forest?.anomaly_rate * 100)?.toFixed(1)}% rate</div>
                    </div>
                    <div className="card stat-card" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}>
                        <div className="stat-value text-emerald">{models.models.kmeans?.silhouette_score?.toFixed(3)}</div>
                        <div className="stat-label">Silhouette Score</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                {['models', 'embeddings', 'clusters', 'importances', 'profiles'].map(t => (
                    <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t === 'models' ? '🤖 Models' : t === 'embeddings' ? '🔘 Embeddings' : t === 'clusters' ? '🎯 Clusters' : t === 'importances' ? '📊 Features' : '👤 Profiles'}
                    </button>
                ))}
            </div>

            {/* Models Tab */}
            {tab === 'models' && models && (
                <div className="animate-in">
                    <div className="grid-2 mb-3">
                        {/* Model Details */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">🤖 Trained Models</span>
                                <span className="tag tag-info">{Object.keys(models.models).length} models</span>
                            </div>
                            {Object.entries(models.models).map(([name, info], i) => (
                                <div key={name} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                            <span className="tag tag-info ml-1" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>{info.type}</span>
                                        </div>
                                        {info.accuracy && <span className="text-mono text-cyan">{(info.accuracy * 100).toFixed(1)}%</span>}
                                    </div>
                                    {info.precision && (
                                        <div className="flex gap-1 mt-1">
                                            <span className="text-xs text-muted">P: {(info.precision * 100).toFixed(1)}%</span>
                                            <span className="text-xs text-muted">R: {(info.recall * 100).toFixed(1)}%</span>
                                            <span className="text-xs text-muted">F1: {(info.f1 * 100).toFixed(1)}%</span>
                                        </div>
                                    )}
                                    {info.anomalies_detected && <div className="text-xs text-muted mt-1">{info.anomalies_detected} anomalies ({(info.anomaly_rate * 100).toFixed(1)}%)</div>}
                                </div>
                            ))}
                        </div>

                        {/* Confusion Matrix */}
                        {confMatrix && (
                            <div className="card">
                                <div className="card-header">
                                    <span className="card-title">🎯 Confusion Matrix (10-Subject Classification)</span>
                                    <span className="card-subtitle">{(confMatrix.accuracy * 100).toFixed(1)}% accuracy</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <div className="cm-grid" style={{ gridTemplateColumns: `auto repeat(${confMatrix.classes.length}, 1fr)`, gap: '2px', fontSize: '0.65rem' }}>
                                        <div />
                                        {confMatrix.classes.map((c, i) => (
                                            <div key={i} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4px', fontFamily: 'var(--font-mono)' }}>{String(c).slice(0, 4)}</div>
                                        ))}
                                        {confMatrix.matrix.map((row, i) => (
                                            <React.Fragment key={`row-${i}`}>
                                                <div style={{ color: 'var(--text-muted)', padding: '4px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{String(confMatrix.classes[i]).slice(0, 4)}</div>
                                                {row.map((val, j) => {
                                                    const maxVal = Math.max(...confMatrix.matrix.flat());
                                                    const intensity = val / maxVal;
                                                    const bg = i === j
                                                        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.7})`
                                                        : val > 0 ? `rgba(239, 68, 68, ${0.1 + intensity * 0.5})` : 'rgba(255,255,255,0.02)';
                                                    return (
                                                        <div key={`${i}-${j}`} className="cm-cell" style={{ background: bg, color: val > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                            {val}
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dataset Info */}
                    {models.info && (
                        <div className="card mb-3">
                            <div className="card-header">
                                <span className="card-title">📄 Training Information</span>
                            </div>
                            <div className="grid-3" style={{ gap: '1rem' }}>
                                <div>
                                    <div className="text-xs text-muted">Dataset</div>
                                    <div className="text-sm">{models.info.dataset}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Paper</div>
                                    <div className="text-sm">{models.info.paper}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted">Training Stats</div>
                                    <div className="text-sm">{models.info.total_samples?.toLocaleString()} samples • {models.info.total_subjects} subjects • {models.info.total_features} features</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Embeddings Tab */}
            {tab === 'embeddings' && (
                <div className="grid-2 mb-3 animate-in">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">🔘 PCA Embedding (2D)</span>
                            <span className="card-subtitle">{pcaData?.explained_variance ? `${((pcaData.explained_variance[0] + pcaData.explained_variance[1]) * 100).toFixed(1)}% variance` : ''}</span>
                        </div>
                        <div className="chart-container chart-container-lg">
                            {pcaData?.points?.length ? <canvas ref={pcaRef} /> : <div className="empty-state"><p>No PCA data available</p></div>}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">🌀 t-SNE Embedding</span>
                            <span className="card-subtitle">{tsneData?.points?.length || 0} points</span>
                        </div>
                        <div className="chart-container chart-container-lg">
                            {tsneData?.points?.length ? <canvas ref={tsneRef} /> : <div className="empty-state"><p>No t-SNE data available</p></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Clusters Tab */}
            {tab === 'clusters' && clusters?.clusters && (
                <div className="grid-2 mb-3 animate-in">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">🎯 K-Means Cluster Distribution</span>
                        </div>
                        <div className="chart-container" style={{ height: '350px' }}>
                            <canvas ref={clusterRef} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">📋 Cluster Details</span>
                        </div>
                        <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Cluster</th><th>Size</th><th>Subjects</th><th>Avg Hold</th><th>Anomaly %</th></tr>
                                </thead>
                                <tbody>
                                    {Object.entries(clusters.clusters).map(([k, v]) => (
                                        <tr key={k}>
                                            <td className="highlight">Cluster {k}</td>
                                            <td>{v.size}</td>
                                            <td>{v.subjects}</td>
                                            <td>{(v.mean_hold * 1000).toFixed(1)}ms</td>
                                            <td style={{ color: v.anomaly_rate > 0.1 ? 'var(--red)' : 'var(--emerald)' }}>
                                                {(v.anomaly_rate * 100).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Importances Tab */}
            {tab === 'importances' && (
                <div className="grid-2 mb-3 animate-in">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">📊 Feature Importance (Top 15)</span>
                            <span className="card-subtitle">Random Forest</span>
                        </div>
                        <div className="chart-container chart-container-lg">
                            <canvas ref={importanceRef} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">📋 All Feature Rankings</span>
                            <span className="card-subtitle">{featureImportances.length} features</span>
                        </div>
                        <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>#</th><th>Feature</th><th>Importance</th><th>Bar</th></tr>
                                </thead>
                                <tbody>
                                    {featureImportances.slice(0, 30).map((f, i) => (
                                        <tr key={i}>
                                            <td>{f.rank}</td>
                                            <td className="highlight">{f.name}</td>
                                            <td className="text-mono">{f.importance?.toFixed(4)}</td>
                                            <td>
                                                <div className="progress-bar" style={{ width: '100px' }}>
                                                    <div className="progress-fill" style={{ width: `${Math.min(f.importance / (featureImportances[0]?.importance || 1) * 100, 100)}%` }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Profiles Tab */}
            {tab === 'profiles' && profiles.length > 0 && (
                <div className="card mb-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">👤 Subject Behavioral Profiles</span>
                        <span className="card-subtitle">{profiles.length} subjects</span>
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th><th>Samples</th><th>Avg Hold</th><th>Std Hold</th>
                                    <th>Avg DD</th><th>Avg UD</th><th>Total Time</th><th>Anomaly %</th><th>Cluster</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.map((p, i) => (
                                    <tr key={i}>
                                        <td className="highlight">{p.subject}</td>
                                        <td>{p.samples}</td>
                                        <td>{(p.mean_hold * 1000)?.toFixed(1)}ms</td>
                                        <td>{(p.std_hold * 1000)?.toFixed(1)}ms</td>
                                        <td>{(p.mean_dd * 1000)?.toFixed(1)}ms</td>
                                        <td>{(p.mean_ud * 1000)?.toFixed(1)}ms</td>
                                        <td>{p.total_time_avg?.toFixed(2)}s</td>
                                        <td style={{ color: p.anomaly_rate > 0.1 ? 'var(--red)' : 'var(--emerald)' }}>
                                            {(p.anomaly_rate * 100).toFixed(1)}%
                                        </td>
                                        <td><span className="tag tag-info">C{p.cluster_mode}</span></td>
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
