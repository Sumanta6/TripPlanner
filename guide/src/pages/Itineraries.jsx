import { useState, useEffect } from 'react';
import { FaMapMarkedAlt, FaEye, FaChevronDown, FaChevronUp, FaCheckCircle, FaClock, FaCalendarAlt, FaWallet } from 'react-icons/fa';
import { getMyBookings } from '../services/guidesService';
import './Itineraries.css';

const STATUS_CONFIG = {
    active:    { label: 'Active',    className: 'itin-status-active' },
    upcoming:  { label: 'Upcoming',  className: 'itin-status-upcoming' },
    completed: { label: 'Completed', className: 'itin-status-completed' },
    pending:   { label: 'Pending',   className: 'itin-status-pending' },
};

function SkeletonCard() {
    return (
        <div className="itin-card skeleton-card" style={{ padding: 20 }}>
            <div className="skeleton-line short" style={{ marginBottom: 12 }} />
            <div className="skeleton-line long" style={{ marginBottom: 8 }} />
            <div className="skeleton-line long" />
        </div>
    );
}

export default function Itineraries() {
    const [bookings, setBookings]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);
    const [selectedBooking, setSelected] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await getMyBookings();
                if (alive) setBookings(data);
            } catch (err) {
                if (alive) setError(err.message);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    const filtered = bookings.filter(
        it => filterStatus === 'all' || it.status === filterStatus
    );

    const toggleDay = dayNum =>
        setExpandedDays(prev => ({ ...prev, [dayNum]: !prev[dayNum] }));

    const formatDate = dateStr =>
        new Date(dateStr).toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' });

    // Duration in days
    const duration = (b) => {
        if (!b.trip_start || !b.trip_end) return '—';
        const diff = Math.ceil(
            (new Date(b.trip_end) - new Date(b.trip_start)) / (1000 * 60 * 60 * 24)
        ) + 1;
        return `${diff} Day${diff !== 1 ? 's' : ''}`;
    };

    return (
        <div className="itineraries-page">
            {/* Header */}
            <div className="itin-header">
                <div className="itin-title-area">
                    <h1>🗺️ Trip Itineraries</h1>
                    <p>View and manage all trip itineraries assigned to you</p>
                </div>
                <div className="itin-filter-bar">
                    {['all', 'active', 'upcoming', 'completed'].map(s => (
                        <button
                            key={s}
                            className={filterStatus === s ? 'itin-filter-btn active' : 'itin-filter-btn'}
                            onClick={() => setFilterStatus(s)}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="itin-error-banner">⚠️ {error}</div>}

            {/* Cards Grid */}
            {loading ? (
                <div className="itin-grid">
                    {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="itin-empty">
                    <FaMapMarkedAlt className="itin-empty-icon" />
                    <p>{bookings.length === 0
                        ? 'No itineraries assigned yet. Once travelers are booked, their trips will appear here.'
                        : 'No itineraries match the selected filter.'
                    }</p>
                </div>
            ) : (
                <div className="itin-grid">
                    {filtered.map(booking => {
                        const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                        return (
                            <div className="itin-card" key={booking.id}>
                                <div className="itin-card-top">
                                    <div className="itin-destination-icon"><FaMapMarkedAlt /></div>
                                    <span className={`itin-status-badge ${sc.className}`}>{sc.label}</span>
                                </div>

                                <div className="itin-card-body">
                                    <h3>{booking.destination}</h3>
                                    <p className="itin-traveler-name">
                                        Traveler: <strong>{booking.traveler_name}</strong>
                                    </p>

                                    <div className="itin-meta">
                                        <div className="itin-meta-item">
                                            <FaClock className="itin-meta-icon" />
                                            <span>{duration(booking)}</span>
                                        </div>
                                        <div className="itin-meta-item">
                                            <FaCalendarAlt className="itin-meta-icon" />
                                            <span>{formatDate(booking.trip_start)}</span>
                                        </div>
                                    </div>

                                    {booking.notes && (
                                        <p className="itin-notes-preview">📝 {booking.notes.substring(0, 80)}{booking.notes.length > 80 ? '…' : ''}</p>
                                    )}
                                </div>

                                <button className="itin-view-btn" onClick={() => { setSelected(booking); setExpandedDays({}); }}>
                                    <FaEye /> View Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedBooking && (
                <div className="itin-modal-overlay" onClick={() => setSelected(null)}>
                    <div className="itin-modal" onClick={e => e.stopPropagation()}>
                        <div className="itin-modal-header">
                            <div>
                                <h2>{selectedBooking.destination}</h2>
                                <p>
                                    Traveler: <strong>{selectedBooking.traveler_name}</strong>
                                    &nbsp;|&nbsp; {duration(selectedBooking)}
                                    &nbsp;|&nbsp; {formatDate(selectedBooking.trip_start)} – {formatDate(selectedBooking.trip_end)}
                                </p>
                                {selectedBooking.traveler_email && (
                                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>✉ {selectedBooking.traveler_email}</p>
                                )}
                            </div>
                            <button className="itin-modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>

                        <div className="itin-modal-body">
                            {selectedBooking.notes ? (
                                <>
                                    <h3 className="itin-modal-days-title">📝 Trip Notes</h3>
                                    <div className="itin-notes-box">{selectedBooking.notes}</div>
                                </>
                            ) : (
                                <div className="itin-empty-modal">
                                    <FaMapMarkedAlt />
                                    <p>No itinerary details yet for this booking. A full day-by-day plan will appear here once added by the system.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
