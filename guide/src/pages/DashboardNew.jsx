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
                            const totalStats = (stats?.completed_trips || 0) + (stats?.active_trips || 0) + (stats?.upcoming_trips || 0) + (stats?.pending_requests || 0);
                            const pct = totalStats > 0 ? Math.round((item.count / totalStats) * 100) : 0;
                            return (
                                <div className="dn-status-row" key={item.label}>
                                    <div className="dn-status-label">
                                        <span>{item.label}</span>
                                        <strong>{item.count}</strong>
                                    </div>
                                    <div className="dn-status-track">
                                        <div 
                                            className="dn-status-fill" 
                                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Destinations */}
                <div className="dn-card">
                    <h3 className="dn-card-title"><FaMapMarkedAlt /> Top Destinations</h3>
                    {loading ? (
                        <div className="dn-skeleton-list">
                            <div className="skeleton-line long" />
                            <div className="skeleton-line" />
                            <div className="skeleton-line short" />
                        </div>
                    ) : (stats?.top_destinations || []).length === 0 ? (
                        <p className="dn-empty-hint">No destination data yet. Accept more trips to see trends!</p>
                    ) : (
                        <div className="dn-dest-list">
                            {stats.top_destinations.map((d, i) => (
                                <div className="dn-dest-item" key={d.destination}>
                                    <div className="dn-dest-rank">#{i + 1}</div>
                                    <div className="dn-dest-name">{d.destination}</div>
                                    <div className="dn-dest-count">{d.count} trips</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
