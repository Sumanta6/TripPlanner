import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaMapMarkedAlt, FaEye, FaChevronDown, FaChevronUp,
    FaClock, FaCalendarAlt, FaSearch, FaClipboardList,
    FaChartLine, FaCheckCircle
} from 'react-icons/fa';
import { getMyBookings } from '../services/guidesService';
import './Itineraries.css';

/* ── Status config ───────────────────────────────────────────────────────────── */
const STATUS_MAP = {
    pending:       { label: 'Pending',       badge: 'it-badge-pending' },
    accepted:      { label: 'Accepted',      badge: 'it-badge-accepted' },
    active:        { label: 'Active',        badge: 'it-badge-active' },
    completed:     { label: 'Completed',     badge: 'it-badge-completed' },
    rejected:      { label: 'Rejected',      badge: 'it-badge-rejected' },
    auto_rejected: { label: 'Auto Rejected', badge: 'it-badge-auto_rejected' },
};

const TAB_KEYS = ['all', 'pending', 'accepted', 'active', 'completed', 'rejected', 'auto_rejected'];

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmtDate(s) {
    if (!s) return '';
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function duration(b) {
    if (!b.trip_start || !b.trip_end) return '—';
    const d = Math.ceil((new Date(b.trip_end) - new Date(b.trip_start)) / 864e5) + 1;
    return `${d} Day${d !== 1 ? 's' : ''}`;
}

/* ── Skeleton ────────────────────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="it-card skeleton">
            <div className="it-card-top">
                <div className="it-dest-icon" />
                <div className="skeleton-line" style={{ width: 60, height: 20 }} />
            </div>
            <div className="it-card-body">
                <div className="skeleton-line short" style={{ marginBottom: 8 }} />
                <div className="skeleton-line long" style={{ marginBottom: 6 }} />
                <div className="skeleton-line" style={{ width: '50%' }} />
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function Itineraries() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelected] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    const location = useLocation();
    const navigate = useNavigate();

    /* ── Auto-open from nav state ────────────────────────────────────────────── */
    useEffect(() => {
        if (!loading && bookings.length > 0 && location.state?.autoOpenBookingId) {
            const b = bookings.find(x => x.id === location.state.autoOpenBookingId);
            if (b) setSelected(b);
            navigate(location.pathname, { replace: true });
        }
    }, [loading, bookings, location, navigate]);

    /* ── Fetch ───────────────────────────────────────────────────────────────── */
    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await getMyBookings();
                if (alive) setBookings(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                if (alive) setError(err.message);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    /* ── KPI counts ──────────────────────────────────────────────────────────── */
    const kpi = useMemo(() => {
        let total = 0, active = 0, completed = 0, pending = 0;
        bookings.forEach(b => {
            total++;
            if (b.status === 'active' || b.status === 'accepted') active++;
            if (b.status === 'completed') completed++;
            if (b.status === 'pending') pending++;
        });
        return { total, active, completed, pending };
    }, [bookings]);

    /* ── Filter ──────────────────────────────────────────────────────────────── */
    const filtered = useMemo(() => {
        return bookings.filter(b => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                b.traveler_name.toLowerCase().includes(q) ||
                b.destination.toLowerCase().includes(q);
            const matchStatus = filterStatus === 'all' || b.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [bookings, search, filterStatus]);

    const toggleDay = idx => setExpandedDays(prev => ({ ...prev, [idx]: !prev[idx] }));

    /* ════════════════════════════════════════════════════════════════════════── */
    return (
        <div className="it-page">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="it-header">
                <div className="it-header-left">
                    <h1>🗺️ Trip Itineraries</h1>
                    <p>View and manage all trip itineraries assigned to you</p>
                </div>
                <div className="it-header-badge">{bookings.length} Itineraries</div>
            </header>

            {/* ── KPI Row ────────────────────────────────────────────────────── */}
            <section className="it-kpi-row">
                <div className="it-kpi">
                    <div className="it-kpi-icon" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}><FaClipboardList /></div>
                    <div><div className="it-kpi-val">{kpi.total}</div><div className="it-kpi-lbl">Total</div></div>
                </div>
                <div className="it-kpi">
                    <div className="it-kpi-icon" style={{ background: 'var(--teal-bg)', color: 'var(--teal)' }}><FaChartLine /></div>
                    <div><div className="it-kpi-val">{kpi.active}</div><div className="it-kpi-lbl">Active</div></div>
                </div>
                <div className="it-kpi">
                    <div className="it-kpi-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><FaCheckCircle /></div>
                    <div><div className="it-kpi-val">{kpi.completed}</div><div className="it-kpi-lbl">Completed</div></div>
                </div>
                <div className="it-kpi">
                    <div className="it-kpi-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><FaClock /></div>
                    <div><div className="it-kpi-val">{kpi.pending}</div><div className="it-kpi-lbl">Pending</div></div>
                </div>
            </section>

            {/* ── Search ─────────────────────────────────────────────────────── */}
            <div className="it-toolbar">
                <div className="it-search">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search by traveler or destination..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────────── */}
            <div className="it-tabs">
                {TAB_KEYS.map(s => (
                    <button
                        key={s}
                        className={`it-tab ${filterStatus === s ? 'active' : ''}`}
                        onClick={() => setFilterStatus(s)}
                    >
                        {s === 'auto_rejected' ? 'Auto Rejected' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {error && <div className="it-error">⚠️ {error}</div>}

            {/* ── Cards ──────────────────────────────────────────────────────── */}
            {loading ? (
                <div className="it-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="it-empty">
                    <div className="it-empty-icon">{bookings.length === 0 ? '🗺️' : '🔍'}</div>
                    <p className="it-empty-title">
                        {bookings.length === 0 ? 'No itineraries yet' : 'No itineraries match your filter'}
                    </p>
                    <p className="it-empty-sub">
                        {bookings.length === 0
                            ? 'Once travelers are booked, their trip itineraries will appear here.'
                            : 'Try changing the filter or clearing your search.'}
                    </p>
                </div>
            ) : (
                <div className="it-grid">
                    {filtered.map(booking => {
                        const cfg = STATUS_MAP[booking.status] || STATUS_MAP.pending;
                        return (
                            <div className="it-card" key={booking.id}>
                                <div className="it-card-top">
                                    <div className="it-dest-icon"><FaMapMarkedAlt /></div>
                                    <span className={`it-badge ${cfg.badge}`}>{cfg.label}</span>
                                </div>

                                <div className="it-card-body">
                                    <h3 className="it-card-dest">{booking.destination}</h3>
                                    <p className="it-card-traveler">Traveler: <strong>{booking.traveler_name}</strong></p>

                                    <div className="it-meta-row">
                                        <span className="it-meta-chip"><FaClock /> {duration(booking)}</span>
                                        <span className="it-meta-chip"><FaCalendarAlt /> {fmtDate(booking.trip_start)}</span>
                                    </div>

                                    {booking.itinerary && (
                                        <div className="it-ai-badge">✨ AI Itinerary Attached</div>
                                    )}

                                    {booking.notes && (
                                        <p className="it-notes-hint">📝 {booking.notes.substring(0, 70)}{booking.notes.length > 70 ? '…' : ''}</p>
                                    )}
                                </div>

                                <button className="it-view-btn" onClick={() => { setSelected(booking); setExpandedDays({}); }}>
                                    <FaEye /> View Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail Modal ────────────────────────────────────────────────── */}
            {selectedBooking && (
                <div className="it-modal-overlay" onClick={() => setSelected(null)}>
                    <div className="it-modal" onClick={e => e.stopPropagation()}>
                        <div className="it-modal-head">
                            <div>
                                <h2>{selectedBooking.destination}</h2>
                                <p>
                                    Traveler: <strong>{selectedBooking.traveler_name}</strong>
                                    &nbsp;·&nbsp;{duration(selectedBooking)}
                                    &nbsp;·&nbsp;{fmtDate(selectedBooking.trip_start)} – {fmtDate(selectedBooking.trip_end)}
                                    {selectedBooking.traveler_email && <>&nbsp;·&nbsp;✉ {selectedBooking.traveler_email}</>}
                                </p>
                            </div>
                            <button className="it-modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>

                        <div className="it-modal-body">
                            {selectedBooking.notes && (
                                <div className="it-modal-notes">
                                    <strong>Traveler's Message:</strong><br />
                                    {selectedBooking.notes}
                                </div>
                            )}

                            {selectedBooking.itinerary && selectedBooking.itinerary.itinerary_data ? (
                                <div>
                                    <h3 className="it-modal-section-title">✨ Attached AI Itinerary</h3>

                                    {(selectedBooking.itinerary.itinerary_data.itinerary?.days || []).map((day, idx) => {
                                        const isOpen = !!expandedDays[idx];
                                        return (
                                            <div key={idx} className={`it-day ${isOpen ? 'expanded' : ''}`}>
                                                <div className="it-day-head" onClick={() => toggleDay(idx)}>
                                                    <div className="it-day-left">
                                                        <span className="it-day-num">Day {day.day_number || idx + 1}</span>
                                                        <span className="it-day-title">{day.title}</span>
                                                    </div>
                                                    <span className="it-day-chevron">
                                                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                                                    </span>
                                                </div>

                                                {isOpen && (
                                                    <div className="it-day-body">
                                                        {(day.accommodation || day.meals || day.altitude) && (
                                                            <div className="it-day-chips">
                                                                {day.accommodation && <span>🏨 {day.accommodation}</span>}
                                                                {day.meals && <span>🍽️ {day.meals}</span>}
                                                                {day.altitude && <span>⛰️ {day.altitude}</span>}
                                                            </div>
                                                        )}

                                                        <ul className="it-act-list">
                                                            {(day.activities || []).map((act, i) => (
                                                                <li key={i}>
                                                                    <span className="it-act-time">{act.time_of_day}</span>
                                                                    <div className="it-act-info">
                                                                        <strong>{act.title}</strong>
                                                                        <p>{act.description}</p>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        {day.local_tips && (
                                                            <div className="it-day-tip">
                                                                <strong>💡 Tip:</strong> {day.local_tips}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="it-modal-empty">
                                    <FaMapMarkedAlt />
                                    <p>No detailed AI itinerary attached.<br />The traveler did not attach an AI plan to this request.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
