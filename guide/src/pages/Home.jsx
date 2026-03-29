import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    FaCalendarAlt, FaChartLine, FaUsers, FaStar,
    FaMapMarkedAlt, FaUserCircle, FaChartBar
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, getMyActivity, getMyDashboard } from '../services/guidesService';
import toast from 'react-hot-toast';
import './Home.css';

/* ── Activity type colour map ────────────────────────────────────────────────── */
const ACT_CONFIG = {
    assignment: { bg: '#e0e7ff', emoji: '📋' },
    accepted:   { bg: 'var(--green-bg)', emoji: '✅' },
    rejected:   { bg: 'var(--red-bg)',   emoji: '❌' },
    auto_rejected: { bg: 'var(--red-bg)', emoji: '⚡' },
    request:    { bg: 'var(--amber-bg)', emoji: '📩' },
    completed:  { bg: 'var(--purple-bg)', emoji: '🏆' },
    upcoming:   { bg: 'var(--teal-bg)',  emoji: '📅' },
    rating:     { bg: 'var(--pink-bg)',  emoji: '⭐' },
};

/* ── useCountUp hook  ────────────────────────────────────────────────────────── */
function useCountUp(target, duration = 1400) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (target == null || isNaN(target)) { setValue(0); return; }
        const start = performance.now();
        const from = 0;
        const to = Number(target);
        const isDecimal = !Number.isInteger(to);

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = from + (to - from) * ease;
            setValue(isDecimal ? parseFloat(current.toFixed(1)) : Math.round(current));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target, duration]);

    return value;
}

/* ── Helper: format date as "Mar 25" ─────────────────────────────────────────── */
function shortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Skeleton Stat Card ──────────────────────────────────────────────────────── */
function SkeletonStatCard() {
    return (
        <div className="gh-stat-card skeleton">
            <div className="gh-stat-icon" />
            <div className="gh-stat-info">
                <div className="gh-stat-label" />
                <div className="gh-stat-value" />
            </div>
        </div>
    );
}

/* ── Animated Stat Card ──────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, bg, suffix = '' }) {
    const animated = useCountUp(value);
    return (
        <div className="gh-stat-card">
            <div className="gh-stat-icon" style={{ color, background: bg }}>
                {icon}
            </div>
            <div className="gh-stat-info">
                <div className="gh-stat-label">{label}</div>
                <div className="gh-stat-value">{animated}{suffix}</div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function Home() {
    const { profile, patchProfile } = useAuth();

    const [dashboard, setDashboard] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toggling, setToggling] = useState(false);

    const availability = profile?.availability || 'available';
    const availBadge = profile?.availability_badge || (availability === 'available' ? 'Available' : 'Busy');
    const isBooked = availBadge.toLowerCase().startsWith('booked');
    const isAvailable = availBadge === 'Available';
    const firstName = profile?.full_name?.split(' ')[0] || 'Guide';

    /* ── Fetch all data in parallel ──────────────────────────────────────────── */
    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [dash, bk, act] = await Promise.all([
                    getMyDashboard(),
                    getMyBookings(),
                    getMyActivity(8),
                ]);
                if (alive) {
                    setDashboard(dash);
                    setBookings(bk);
                    setActivity(act);
                }
            } catch (err) {
                if (alive) setError(err.message);
                toast.error('Failed to load dashboard data');
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    /* ── Toggle availability ─────────────────────────────────────────────────── */
    const handleToggle = useCallback(async () => {
        if (toggling) return;
        const next = availability === 'available' ? 'busy' : 'available';
        setToggling(true);
        try {
            await patchProfile({ availability: next });
            toast.success(`Status set to ${next === 'available' ? 'Available' : 'Busy'}`);
        } catch (_) { /* handled in context */ }
        finally { setToggling(false); }
    }, [availability, patchProfile, toggling]);

    /* ── Derived data ────────────────────────────────────────────────────────── */
    const upcomingTrips = bookings.filter(b => b.status === 'accepted');
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    /* ════════════════════════════════════════════════════════════════════════── */
    return (
        <div className="gh-page">

            {/* ── HERO ─────────────────────────────────────────────────────────── */}
            <section className="gh-hero">
                <div className="gh-hero-left">
                    <div className="gh-avatar">
                        {profile?.profile_image ? (
                            <img src={`http://localhost:8000${profile.profile_image}`} alt={firstName} />
                        ) : '👤'}
                    </div>
                    <div className="gh-hero-text">
                        <h1>Welcome back, {firstName}! 👋</h1>
                        <p>{today}</p>
                    </div>
                </div>

                {isBooked ? (
                    /* Booked badge – no toggle, just status display */
                    <div className="gh-status-badge booked">
                        <span className="gh-status-dot booked" />
                        {availBadge}
                    </div>
                ) : (
                    /* Available / Busy toggle */
                    <button
                        className="gh-avail-toggle"
                        onClick={handleToggle}
                        disabled={toggling}
                        title="Click to toggle availability"
                    >
                        <span className={`gh-avail-dot ${isAvailable ? 'available' : 'busy'}`} />
                        {availBadge}
                    </button>
                )}
            </section>

            {/* ── Error Banner ──────────────────────────────────────────────────── */}
            {error && (
                <div className="gh-error-banner">⚠️ {error}</div>
            )}

            {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
            <section className="gh-stats-grid">
                {loading ? (
                    [1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)
                ) : (
                    <>
                        <StatCard
                            icon={<FaCalendarAlt />}
                            label="Total Bookings"
                            value={dashboard?.total_travelers ?? 0}
                            color="#4f7cff"
                            bg="var(--accent-bg)"
                        />
                        <StatCard
                            icon={<FaChartLine />}
                            label="Active Trips"
                            value={dashboard?.active_trips ?? 0}
                            color="var(--teal)"
                            bg="var(--teal-bg)"
                        />
                        <StatCard
                            icon={<FaUsers />}
                            label="Completed"
                            value={dashboard?.completed_trips ?? 0}
                            color="var(--green)"
                            bg="var(--green-bg)"
                        />
                        <StatCard
                            icon={<FaStar />}
                            label="Rating"
                            value={dashboard?.rating ?? 0}
                            color="var(--amber)"
                            bg="var(--amber-bg)"
                            suffix=" ★"
                        />
                    </>
                )}
            </section>

            {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
            <section className="gh-actions-row">
                <Link to="/travelers" className="gh-action-card">
                    <div className="gh-action-icon" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                        <FaUsers />
                    </div>
                    View Requests
                </Link>
                <Link to="/profile" className="gh-action-card">
                    <div className="gh-action-icon" style={{ background: 'var(--teal-bg)', color: 'var(--teal)' }}>
                        <FaUserCircle />
                    </div>
                    Update Profile
                </Link>
                <Link to="/dashboard" className="gh-action-card">
                    <div className="gh-action-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                        <FaChartBar />
                    </div>
                    Analytics
                </Link>
            </section>

            {/* ── CONTENT GRID (Upcoming Trips + Activity) ──────────────────────── */}
            <div className="gh-content-grid">

                {/* Upcoming Trips */}
                <section className="gh-section">
                    <h2 className="gh-section-title">
                        <span className="icon">✈️</span> Upcoming Trips
                    </h2>

                    {loading ? (
                        <div className="gh-trip-list">
                            {[1, 2, 3].map(i => (
                                <div className="gh-trip-row" key={i}>
                                    <div className="skeleton-icon" style={{ borderRadius: 10 }} />
                                    <div className="skeleton-info">
                                        <div className="skeleton-line short" />
                                        <div className="skeleton-line long" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : upcomingTrips.length === 0 ? (
                        <div className="gh-empty-trips">
                            <div className="gh-empty-icon">🧭</div>
                            <p className="gh-empty-title">No upcoming trips yet</p>
                            <p className="gh-empty-sub">
                                Once travelers book you for a trip, their upcoming plans will appear here.
                                Stay available and keep your profile updated!
                            </p>
                        </div>
                    ) : (
                        <div className="gh-trip-list">
                            {upcomingTrips.slice(0, 5).map(trip => (
                                <div className="gh-trip-row" key={trip.id}>
                                    <div className="gh-trip-avatar">
                                        {(trip.traveler_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="gh-trip-info">
                                        <div className="gh-trip-name">{trip.traveler_name}</div>
                                        <div className="gh-trip-dest">
                                            <FaMapMarkedAlt style={{ fontSize: 11, marginRight: 4, opacity: 0.6 }} />
                                            {trip.destination}
                                        </div>
                                    </div>
                                    <div className="gh-trip-date">
                                        {shortDate(trip.trip_start)} – {shortDate(trip.trip_end)}
                                    </div>
                                </div>
                            ))}
                            {upcomingTrips.length > 5 && (
                                <Link to="/travelers" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textAlign: 'center', display: 'block', marginTop: 8 }}>
                                    View all {upcomingTrips.length} trips →
                                </Link>
                            )}
                        </div>
                    )}
                </section>

                {/* Recent Activity */}
                <section className="gh-section">
                    <h2 className="gh-section-title">
                        <span className="icon">📊</span> Recent Activity
                    </h2>

                    {loading ? (
                        <ul className="gh-timeline">
                            {[1, 2, 3].map(i => (
                                <li className="gh-timeline-item skeleton" key={i}>
                                    <div className="gh-timeline-dot" />
                                    <div className="skeleton-info">
                                        <div className="skeleton-line long" />
                                        <div className="skeleton-line short" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : activity.length === 0 ? (
                        <div className="gh-empty-trips">
                            <div className="gh-empty-icon">📋</div>
                            <p className="gh-empty-title">No recent activity</p>
                            <p className="gh-empty-sub">
                                Your latest actions like bookings, completions, and ratings will show up here.
                            </p>
                        </div>
                    ) : (
                        <ul className="gh-timeline">
                            {activity.map(item => {
                                const cfg = ACT_CONFIG[item.activity_type] || ACT_CONFIG.assignment;
                                return (
                                    <li className="gh-timeline-item" key={item.id}>
                                        <div className="gh-timeline-dot" style={{ background: cfg.bg }}>
                                            {cfg.emoji}
                                        </div>
                                        <div className="gh-timeline-text">
                                            <p className="gh-timeline-msg">
                                                {item.message}{' '}
                                                <strong>{item.highlight}</strong>
                                            </p>
                                            {item.sub && <span className="gh-timeline-sub">{item.sub}</span>}
                                            <span className="gh-timeline-time">{item.time}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
