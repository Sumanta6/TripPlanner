import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaMapMarkedAlt, FaClock, FaCalendarCheck, FaUserCircle, FaChartBar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, getMyActivity } from '../services/guidesService';
import './Home.css';

const ACTIVITY_TYPE_CONFIG = {
    assignment: { color: '#4f7cff', bg: '#e0e7ff', emoji: '📋' },
    accepted:   { color: '#10b981', bg: '#d1fae5', emoji: '✅' },
    request:    { color: '#f59e0b', bg: '#fef3c7', emoji: '📩' },
    completed:  { color: '#8b5cf6', bg: '#ede9fe', emoji: '🏆' },
    upcoming:   { color: '#06b6d4', bg: '#cffafe', emoji: '📅' },
    rating:     { color: '#ec4899', bg: '#fce7f3', emoji: '⭐' },
};

// ── Skeleton Cards ─────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="summary-card skeleton-card">
            <div className="skeleton-icon" />
            <div className="skeleton-info">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
            </div>
        </div>
    );
}

export default function Home() {
    const { profile, patchProfile } = useAuth();
    const [bookings, setBookings]     = useState([]);
    const [activity, setActivity]     = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [dataError, setDataError]   = useState(null);

    // Keep local availability in sync with profile
    const availability = profile?.availability || 'available';

    useEffect(() => {
        let alive = true;
        async function load() {
            setLoadingData(true);
            setDataError(null);
            try {
                const [b, a] = await Promise.all([getMyBookings(), getMyActivity(10)]);
                if (alive) {
                    setBookings(b);
                    setActivity(a);
                }
            } catch (err) {
                if (alive) setDataError(err.message);
            } finally {
                if (alive) setLoadingData(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    const activeTrips    = bookings.filter(t => t.status === 'active').length;
    const pendingReqs    = bookings.filter(t => t.status === 'pending').length;
    const upcomingTrips  = bookings.filter(t => t.status === 'upcoming').length;
    const activeTravelers = bookings.filter(t => t.status === 'active');

    const handleToggle = async () => {
        const next = availability === 'available' ? 'busy' : 'available';
        try { await patchProfile({ availability: next }); } catch (_) { /* handled in context */ }
    };

    const firstName = profile?.full_name?.split(' ')[0] || 'Guide';

    return (
        <div className="guide-home-page">
            <header className="guide-home-header">
                <div className="guide-home-welcome">
                    <h1>Welcome back, {firstName}! 👋</h1>
                    <p>Here's your activity overview for today — {new Date().toLocaleDateString('en-NP', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <button
                    className={`guide-status-badge interactive ${availability}`}
                    onClick={handleToggle}
                    title="Click to toggle availability"
                >
                    <span className="status-dot" />
                    {availability === 'available' ? 'Available' : 'Busy'}
                </button>
            </header>

            {/* Overview / Summary Cards */}
            <section className="guide-summary-cards">
                {loadingData ? (
                    [1,2,3,4].map(i => <SkeletonCard key={i} />)
                ) : (
                    <>
                        <div className="summary-card">
                            <div className="summary-icon"><FaUsers /></div>
                            <div className="summary-info">
                                <h3>Assigned Travelers</h3>
                                <p className="summary-number">{bookings.length}</p>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon" style={{ color: '#10b981', backgroundColor: '#d1fae5' }}>
                                <FaMapMarkedAlt />
                            </div>
                            <div className="summary-info">
                                <h3>Active Trips</h3>
                                <p className="summary-number">{activeTrips}</p>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon" style={{ color: '#f59e0b', backgroundColor: '#fef3c7' }}>
                                <FaClock />
                            </div>
                            <div className="summary-info">
                                <h3>Pending Requests</h3>
                                <p className="summary-number">{pendingReqs}</p>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon" style={{ color: '#8b5cf6', backgroundColor: '#ede9fe' }}>
                                <FaCalendarCheck />
                            </div>
                            <div className="summary-info">
                                <h3>Upcoming Trips</h3>
                                <p className="summary-number">{upcomingTrips}</p>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {dataError && (
                <div className="home-error-banner">⚠️ {dataError}</div>
            )}

            {/* Quick Actions & Recent Activity Area */}
            <div className="guide-home-content">
                {/* Quick Actions */}
                <section className="quick-actions-section">
                    <h2>Quick Actions</h2>
                    <div className="quick-actions-grid">
                        <Link to="/travelers" className="action-btn"><FaUsers /> View Travelers</Link>
                        <Link to="/itineraries" className="action-btn secondary"><FaMapMarkedAlt /> View Itineraries</Link>
                        <Link to="/profile" className="action-btn outline"><FaUserCircle /> Update Profile</Link>
                        <Link to="/dashboard" className="action-btn secondary"><FaChartBar /> Analytics Dashboard</Link>
                    </div>

                    {/* Active Travelers Quick View */}
                    <div className="active-travelers-mini">
                        <h3>Active Travelers</h3>
                        {loadingData ? (
                            <div className="mini-traveler-list">
                                {[1,2].map(i => <div key={i} className="skeleton-line long" style={{ margin: '8px 0', borderRadius: 8 }} />)}
                            </div>
                        ) : activeTravelers.length === 0 ? (
                            <p className="home-empty-hint">No active travelers right now.</p>
                        ) : (
                            <div className="mini-traveler-list">
                                {activeTravelers.map(t => (
                                    <div className="mini-traveler-row" key={t.id}>
                                        <div className="mini-avatar">{t.avatar}</div>
                                        <div className="mini-info">
                                            <span className="mini-name">{t.traveler_name}</span>
                                            <span className="mini-dest">{t.destination}</span>
                                        </div>
                                        <span className="mini-status-badge active">Active</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Activity */}
                <section className="recent-activity-section">
                    <h2>Recent Activity</h2>
                    {loadingData ? (
                        <ul className="activity-list">
                            {[1,2,3].map(i => (
                                <li className="activity-item" key={i}>
                                    <div className="skeleton-icon" />
                                    <div className="skeleton-info">
                                        <div className="skeleton-line long" />
                                        <div className="skeleton-line short" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : activity.length === 0 ? (
                        <p className="home-empty-hint">No recent activity to show.</p>
                    ) : (
                        <ul className="activity-list">
                            {activity.map(item => {
                                const cfg = ACTIVITY_TYPE_CONFIG[item.activity_type] || ACTIVITY_TYPE_CONFIG.assignment;
                                return (
                                    <li className="activity-item" key={item.id}>
                                        <div className="activity-emoji-icon" style={{ background: cfg.bg }}>
                                            {cfg.emoji}
                                        </div>
                                        <div className="activity-text">
                                            <p>
                                                {item.message}{' '}
                                                <strong style={{ color: cfg.color }}>{item.highlight}</strong>
                                            </p>
                                            <span className="activity-sub">{item.sub}</span>
                                            <span className="activity-time">{item.time}</span>
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
