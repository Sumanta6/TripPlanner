import { useState, useEffect } from 'react';
import { FaChartBar, FaStar, FaUsers, FaMapMarkedAlt, FaClock, FaCalendarCheck } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getMyDashboard } from '../services/guidesService';
import './DashboardNew.css';

function SkeletonKPI() {
    return (
        <div className="dn-kpi-card skeleton-card">
            <div className="skeleton-icon" />
            <div className="skeleton-info">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { profile } = useAuth();
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await getMyDashboard();
                if (alive) setStats(data);
            } catch (err) {
                if (alive) setError(err.message);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    const total = stats?.total_travelers || 0;

    const completionRate = stats?.completion_rate ?? 0;

    return (
        <div className="dashboard-new-page">
            <div className="dn-header">
                <div>
                    <h1>📊 Analytics Dashboard</h1>
                    <p>Your guide performance overview</p>
                </div>
                <div className="dn-guide-badge">
                    <FaStar className="dn-star" />
                    <span>{profile?.rating ?? '—'} Rating</span>
                </div>
            </div>

            {error && <div className="dn-error-banner">⚠️ {error}</div>}

            {/* KPI Cards */}
            <div className="dn-kpi-grid">
                {loading ? (
                    [1,2,3,4].map(i => <SkeletonKPI key={i} />)
                ) : (
                    [
                        { icon: FaUsers,       label: 'Total Travelers',  value: stats?.total_travelers ?? 0, color: '#4f7cff', bg: '#e0e7ff' },
                        { icon: FaMapMarkedAlt,label: 'Active Trips',     value: stats?.active_trips ?? 0,   color: '#10b981', bg: '#d1fae5' },
                        { icon: FaClock,       label: 'Pending Requests', value: stats?.pending_requests ?? 0,color: '#f59e0b', bg: '#fef3c7' },
                        { icon: FaCalendarCheck,label:'Upcoming Trips',   value: stats?.upcoming_trips ?? 0, color: '#8b5cf6', bg: '#ede9fe' },
                    ].map(kpi => {
                        const Icon = kpi.icon;
                        return (
                            <div className="dn-kpi-card" key={kpi.label}>
                                <div className="dn-kpi-icon" style={{ color: kpi.color, backgroundColor: kpi.bg }}>
                                    <Icon />
                                </div>
                                <div className="dn-kpi-info">
                                    <p className="dn-kpi-label">{kpi.label}</p>
                                    <p className="dn-kpi-value">{kpi.value}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Main Grid */}
            <div className="dn-main-grid">
                {/* Trip Status Breakdown */}
                <div className="dn-card">
                    <h3 className="dn-card-title"><FaChartBar /> Trip Status Breakdown</h3>
                    <div className="dn-status-bars">
                        {[
                            { label: 'Completed', count: stats?.completed_trips ?? 0,  color: '#10b981' },
                            { label: 'Active',    count: stats?.active_trips ?? 0,     color: '#4f7cff' },
                            { label: 'Upcoming',  count: stats?.upcoming_trips ?? 0,   color: '#8b5cf6' },
                            { label: 'Pending',   count: stats?.pending_requests ?? 0, color: '#f59e0b' },
                        ].map(item => {
                            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                            return (
                                <div className="dn-bar-row" key={item.label}>
                                    <div className="dn-bar-label-row">
                                        <span>{item.label}</span>
                                        <span>{item.count} ({pct}%)</span>
                                    </div>
                                    <div className="dn-bar-track">
                                        <div
                                            className="dn-bar-fill"
                                            style={{ width: `${pct}%`, background: item.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="dn-completion-rate">
                        <div className="completion-circle">
                            <svg viewBox="0 0 36 36" className="circular-chart">
                                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="circle" strokeDasharray={`${completionRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" className="percentage">{completionRate}%</text>
                            </svg>
                        </div>
                        <div className="completion-info">
                            <p className="completion-title">Completion Rate</p>
                            <p className="completion-sub">{stats?.completed_trips ?? 0} of {total} trips completed</p>
                        </div>
                    </div>
                </div>

                {/* Top Destinations */}
                <div className="dn-card">
                    <h3 className="dn-card-title"><FaMapMarkedAlt /> Top Destinations</h3>
                    <div className="dn-destinations">
                        {loading ? (
                            [1,2,3].map(i => <div key={i} className="skeleton-line long" style={{ margin: '10px 0', borderRadius: 8 }} />)
                        ) : (stats?.top_destinations ?? []).length === 0 ? (
                            <p className="dn-empty-hint">No destination data yet.</p>
                        ) : (
                            stats.top_destinations.map(({ name, count }, i) => {
                                const maxCount = Math.max(...stats.top_destinations.map(d => d.count));
                                return (
                                    <div className="dn-dest-row" key={name}>
                                        <div className="dn-dest-rank">{i + 1}</div>
                                        <div className="dn-dest-info">
                                            <span className="dn-dest-name">{name}</span>
                                            <span className="dn-dest-count">{count} trip{count > 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="dn-dest-bar">
                                            <div className="dn-dest-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="dn-rating-block">
                        <div className="dn-rating-stars">
                            {[1,2,3,4,5].map(n => (
                                <FaStar key={n} className={n <= Math.floor(profile?.rating ?? 0) ? 'star-filled' : 'star-empty'} />
                            ))}
                        </div>
                        <div className="dn-rating-num">{profile?.rating ?? '—'} / 5.0</div>
                        <div className="dn-rating-label">{profile?.tours_completed ?? 0} completed tours</div>
                    </div>
                </div>
            </div>

            {/* Guide Performance Summary */}
            <div className="dn-perf-bar">
                {[
                    { value: profile?.experience_years ? `${profile.experience_years} yrs` : '—', label: 'Experience' },
                    { value: stats?.languages_count ?? 0, label: 'Languages' },
                    { value: stats?.destinations_count ?? 0, label: 'Destinations' },
                    { value: profile?.tours_completed ?? 0, label: 'Total Tours' },
                    { value: profile?.rating ? `${profile.rating}⭐` : '—', label: 'Rating' },
                ].map((item, i, arr) => (
                    <div key={item.label} style={{ display: 'contents' }}>
                        <div className="dn-perf-item">
                            <span className="dn-perf-value">{item.value}</span>
                            <span className="dn-perf-label">{item.label}</span>
                        </div>
                        {i < arr.length - 1 && <div className="dn-perf-divider" />}
                    </div>
                ))}
            </div>
        </div>
    );
}
