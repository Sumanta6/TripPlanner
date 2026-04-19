import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaChartBar, FaStar, FaUsers, FaMapMarkedAlt,
    FaClock, FaCalendarCheck, FaChartLine, FaCheckCircle,
    FaTrophy, FaPercentage
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getMyDashboard, getMyBookings } from '../services/guidesService';
import toast from 'react-hot-toast';
import './DashboardNew.css';

/* ── useCountUp hook ─────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
    const [value, setValue] = useState(0);
    const raf = useRef(null);

    useEffect(() => {
        if (target == null || isNaN(target)) { setValue(0); return; }
        const start = performance.now();
        const to = Number(target);
        const decimal = !Number.isInteger(to);

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setValue(decimal ? parseFloat((to * ease).toFixed(1)) : Math.round(to * ease));
            if (progress < 1) raf.current = requestAnimationFrame(tick);
        }
        raf.current = requestAnimationFrame(tick);
        return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [target, duration]);

    return value;
}

/* ── Skeleton KPI ────────────────────────────────────────────────────────────── */
function SkeletonKPI() {
    return (
        <div className="dn-kpi skeleton">
            <div className="dn-kpi-icon" />
            <div className="dn-kpi-info">
                <div className="dn-kpi-label" />
                <div className="dn-kpi-value" />
            </div>
        </div>
    );
}

/* ── Animated KPI Card ───────────────────────────────────────────────────────── */
function KPICard({ icon, label, value, color, bg, suffix = '' }) {
    const animated = useCountUp(value);
    return (
        <div className="dn-kpi">
            <div className="dn-kpi-icon" style={{ color, background: bg }}>
                {icon}
            </div>
            <div className="dn-kpi-info">
                <div className="dn-kpi-label">{label}</div>
                <div className="dn-kpi-value">{animated}{suffix}</div>
            </div>
        </div>
    );
}

function RatingCard({ value, onClick }) {
    const animated = useCountUp(value);
    return (
        <div
            role="button"
            tabIndex={0}
            className="dn-kpi dn-kpi-button"
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="dn-kpi-icon" style={{ color: 'var(--gold)', background: 'var(--amber-bg)' }}>
                <FaStar />
            </div>
            <div className="dn-kpi-info">
                <div className="dn-kpi-label">Rating</div>
                <div className="dn-kpi-value">{animated} ★</div>
            </div>
        </div>
    );
}

/* ── Donut Chart (SVG) ───────────────────────────────────────────────────────── */
function DonutChart({ segments, total }) {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="dn-donut-container">
            <div className="dn-donut-wrap">
                <svg className="dn-donut-svg" viewBox="0 0 120 120">
                    {segments.map((seg, i) => {
                        const pct = total > 0 ? seg.value / total : 0;
                        const dashLen = pct * circumference;
                        const dashOff = -offset;
                        offset += dashLen;
                        return (
                            <circle
                                key={i}
                                className="dn-donut-circle"
                                cx="60" cy="60" r={radius}
                                stroke={seg.color}
                                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                                strokeDashoffset={dashOff}
                                style={{ animationDelay: `${i * 0.15}s` }}
                            />
                        );
                    })}
                </svg>
                <div className="dn-donut-center">
                    <div className="dn-donut-center-value">{total}</div>
                    <div className="dn-donut-center-label">Total</div>
                </div>
            </div>
            <div className="dn-donut-legend">
                {segments.map((seg, i) => (
                    <div className="dn-legend-item" key={i}>
                        <span className="dn-legend-dot" style={{ background: seg.color }} />
                        {seg.label} ({seg.value})
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── MONTH LABELS ────────────────────────────────────────────────────────────── */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ── Fetch data ──────────────────────────────────────────────────────────── */
    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [dash, bk] = await Promise.all([
                    getMyDashboard(),
                    getMyBookings(),
                ]);
                if (alive) {
                    setStats(dash);
                    setBookings(Array.isArray(bk) ? bk : bk.results || []);
                }
            } catch (err) {
                if (alive) setError(err.message);
                toast.error('Failed to load dashboard');
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    /* ── Compute monthly bookings (last 6 months) ────────────────────────────── */
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: MONTH_SHORT[d.getMonth()],
                count: 0,
            });
        }

        bookings.forEach(b => {
            if (!b.created_at) return;
            const d = new Date(b.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const match = months.find(m => m.key === key);
            if (match) match.count++;
        });

        const max = Math.max(...months.map(m => m.count), 1);
        return months.map(m => ({ ...m, pct: Math.round((m.count / max) * 100) }));
    }, [bookings]);

    /* ── Status distribution ─────────────────────────────────────────────────── */
    const statusDist = useMemo(() => {
        const counts = { accepted: 0, pending: 0, completed: 0, rejected: 0 };
        bookings.forEach(b => {
            if (b.status === 'accepted' || b.status === 'active') counts.accepted++;
            else if (b.status === 'pending') counts.pending++;
            else if (b.status === 'completed') counts.completed++;
            else if (b.status === 'rejected' || b.status === 'auto_rejected' || b.status === 'cancelled') counts.rejected++;
        });
        return counts;
    }, [bookings]);

    const statusTotal = statusDist.accepted + statusDist.pending + statusDist.completed + statusDist.rejected;

    const donutSegments = [
        { label: 'Completed', value: statusDist.completed, color: '#10b981' },
        { label: 'Accepted', value: statusDist.accepted, color: '#4f7cff' },
        { label: 'Pending', value: statusDist.pending, color: '#f59e0b' },
        { label: 'Rejected', value: statusDist.rejected, color: '#ef4444' },
    ];

    /* ── Derived stats ───────────────────────────────────────────────────────── */
    const total = stats?.total_travelers ?? 0;
    const accepted = (stats?.active_trips ?? 0) + (stats?.upcoming_trips ?? 0) + (stats?.completed_trips ?? 0);
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const experiencePct = Math.min(Math.round(((stats?.experience_years ?? 0) / 15) * 100), 100);

    /* ════════════════════════════════════════════════════════════════════════── */
    return (
        <div className="dn-page">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="dn-header">
                <div className="dn-header-left">
                    <h1>📊 Analytics Dashboard</h1>
                    <p>Your complete performance overview &amp; insights</p>
                </div>
                <button type="button" className="dn-rating-badge dn-rating-button" onClick={() => navigate('/reviews')}>
                    <FaStar /> {profile?.rating ?? '—'} Rating
                </button>
            </header>

            {error && <div className="dn-error">⚠️ {error}</div>}

            {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
            <section className="dn-kpi-grid">
                {loading ? (
                    [1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonKPI key={i} />)
                ) : (
                    <>
                        <KPICard icon={<FaUsers />} label="Total Bookings" value={total} color="#4f7cff" bg="var(--accent-bg)" />
                        <KPICard icon={<FaCheckCircle />} label="Accepted" value={accepted} color="var(--green)" bg="var(--green-bg)" />
                        <KPICard icon={<FaCalendarCheck />} label="Completed" value={stats?.completed_trips ?? 0} color="var(--purple)" bg="var(--purple-bg)" />
                        <KPICard icon={<FaClock />} label="Pending" value={stats?.pending_requests ?? 0} color="var(--amber)" bg="var(--amber-bg)" />
                        <KPICard icon={<FaChartLine />} label="Active Trips" value={stats?.active_trips ?? 0} color="var(--teal)" bg="var(--teal-bg)" />
                        <RatingCard value={stats?.rating ?? 0} onClick={() => navigate('/reviews')} />
                        <KPICard icon={<FaPercentage />} label="Completion Rate" value={stats?.completion_rate ?? 0} color="var(--green)" bg="var(--green-bg)" suffix="%" />
                        <KPICard icon={<FaTrophy />} label="Tours Done" value={stats?.tours_completed ?? 0} color="var(--pink)" bg="var(--pink-bg)" />
                    </>
                )}
            </section>

            {/* ── CHARTS ─────────────────────────────────────────────────────── */}
            <div className="dn-charts-row">
                {/* Monthly Bookings Bar Chart */}
                <section className="dn-section" style={{ animationDelay: '0.35s' }}>
                    <h2 className="dn-section-title"><FaChartBar /> Monthly Bookings</h2>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div className="skeleton-line" style={{ width: 40, height: 14 }} />
                                    <div className="skeleton-line long" style={{ height: 28, flex: 1 }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="dn-bar-chart">
                            {monthlyData.map(m => (
                                <div className="dn-bar-row" key={m.key}>
                                    <span className="dn-bar-label">{m.label}</span>
                                    <div className="dn-bar-track">
                                        <div className="dn-bar-fill" style={{ width: `${Math.max(m.pct, m.count > 0 ? 8 : 0)}%` }}>
                                            {m.count > 0 && <span className="dn-bar-count">{m.count}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Donut Chart: Status Distribution */}
                <section className="dn-section" style={{ animationDelay: '0.4s' }}>
                    <h2 className="dn-section-title"><FaChartLine /> Booking Status</h2>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <div className="skeleton-avatar" style={{ width: 140, height: 140, borderRadius: '50%' }} />
                        </div>
                    ) : statusTotal === 0 ? (
                        <div className="dn-empty">
                            <div className="dn-empty-icon">📊</div>
                            <p className="dn-empty-text">No booking data yet</p>
                        </div>
                    ) : (
                        <DonutChart segments={donutSegments} total={statusTotal} />
                    )}
                </section>
            </div>

            {/* ── INSIGHTS ───────────────────────────────────────────────────── */}
            <div className="dn-insights-row">
                {/* Top Destinations */}
                <section className="dn-section" style={{ animationDelay: '0.45s' }}>
                    <h2 className="dn-section-title"><FaMapMarkedAlt /> Top Destinations Guided</h2>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div className="skeleton-icon" style={{ width: 28, height: 28, borderRadius: 6 }} />
                                    <div className="skeleton-line long" />
                                </div>
                            ))}
                        </div>
                    ) : (stats?.top_destinations || []).length === 0 ? (
                        <div className="dn-empty">
                            <div className="dn-empty-icon">🗺️</div>
                            <p className="dn-empty-text">Complete more trips to see your top destinations</p>
                        </div>
                    ) : (
                        <div className="dn-dest-list">
                            {stats.top_destinations.map((d, i) => (
                                <div className="dn-dest-item" key={d.name || i}>
                                    <div className="dn-dest-rank">#{i + 1}</div>
                                    <div className="dn-dest-name">{d.name}</div>
                                    <div className="dn-dest-count">{d.count} trips</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Performance Overview */}
                <section className="dn-section" style={{ animationDelay: '0.5s' }}>
                    <h2 className="dn-section-title"><FaTrophy /> Performance Overview</h2>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i}>
                                    <div className="skeleton-line short" style={{ marginBottom: 8 }} />
                                    <div className="skeleton-line long" style={{ height: 10 }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="dn-perf-list">
                            <div className="dn-perf-item">
                                <div className="dn-perf-header">
                                    <span className="dn-perf-label">Completion Rate</span>
                                    <span className="dn-perf-value">{stats?.completion_rate ?? 0}%</span>
                                </div>
                                <div className="dn-perf-track">
                                    <div
                                        className="dn-perf-fill"
                                        style={{
                                            width: `${stats?.completion_rate ?? 0}%`,
                                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="dn-perf-item">
                                <div className="dn-perf-header">
                                    <span className="dn-perf-label">Acceptance Rate</span>
                                    <span className="dn-perf-value">{acceptanceRate}%</span>
                                </div>
                                <div className="dn-perf-track">
                                    <div
                                        className="dn-perf-fill"
                                        style={{
                                            width: `${acceptanceRate}%`,
                                            background: 'linear-gradient(90deg, #4f7cff, #6d9bff)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="dn-perf-item">
                                <div className="dn-perf-header">
                                    <span className="dn-perf-label">Experience Level</span>
                                    <span className="dn-perf-value">{stats?.experience_years ?? 0} yrs</span>
                                </div>
                                <div className="dn-perf-track">
                                    <div
                                        className="dn-perf-fill"
                                        style={{
                                            width: `${experiencePct}%`,
                                            background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="dn-perf-item">
                                <div className="dn-perf-header">
                                    <span className="dn-perf-label">Rating Score</span>
                                    <span className="dn-perf-value">{stats?.rating ?? 0} / 5.0</span>
                                </div>
                                <div className="dn-perf-track">
                                    <div
                                        className="dn-perf-fill"
                                        style={{
                                            width: `${((stats?.rating ?? 0) / 5) * 100}%`,
                                            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
