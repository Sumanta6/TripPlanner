import { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaPhone, FaEnvelope, FaStickyNote, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getMyBookings, updateBookingStatus, initCsrf } from '../services/guidesService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Travelers.css';

const STATUS_CONFIG = {
    pending:   { label: 'Pending',   className: 'status-pending' },
    accepted:  { label: 'Accepted',  className: 'status-active' },
    active:    { label: 'Active',    className: 'status-active' },
    completed: { label: 'Completed', className: 'status-completed' },
    rejected:  { label: 'Rejected',  className: 'status-rejected' },
    auto_rejected: { label: 'Auto Rejected', className: 'status-rejected' },
};

function SkeletonTravelerCard() {
    return (
        <div className="traveler-card skeleton-card">
            <div className="traveler-card-header">
                <div className="skeleton-avatar" />
                <div className="skeleton-info">
                    <div className="skeleton-line short" style={{ marginBottom: 6 }} />
                    <div className="skeleton-line short" style={{ width: '40%' }} />
                </div>
            </div>
            <div className="traveler-card-body">
                {[1,2,3,4].map(i => <div key={i} className="skeleton-line long" style={{ margin: '8px 0' }} />)}
            </div>
        </div>
    );
}

export default function Travelers() {
    const [bookings, setBookings]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [search, setSearch]       = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedNote, setExpandedNote] = useState(null);
    const [processing, setProcessing] = useState({});
    const { refreshProfile } = useAuth();
    const navigate = useNavigate();

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

    const handleStatusChange = async (id, newStatus) => {
        if (processing[id]) return;
        setProcessing(prev => ({ ...prev, [id]: true }));
        try {
            await initCsrf();
            const updatedBooking = await updateBookingStatus(id, newStatus);
            setBookings(prev => prev.map(b => b.id === id ? updatedBooking : b));
            await refreshProfile(); // Refresh the guide profile to update availability_badge
            
            if (newStatus === 'accepted') {
                toast.success('Booking accepted successfully!');
                navigate('/itineraries', { state: { autoOpenBookingId: id } });
            } else if (newStatus === 'rejected') {
                toast.success('Booking rejected successfully.');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to update request status. Please try again.');
        } finally {
            setProcessing(prev => ({ ...prev, [id]: false }));
        }
    };

    const filtered = bookings.filter(t => {
        const matchSearch =
            t.traveler_name.toLowerCase().includes(search.toLowerCase()) ||
            t.destination.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="travelers-page">
            {/* Header */}
            <div className="travelers-header">
                <div className="travelers-title-area">
                    <h1>👥 Travelers Directory</h1>
                    <p>Manage all travelers assigned to you</p>
                </div>
                <div className="travelers-count-badge">{bookings.length} Total Travelers</div>
            </div>

            {/* Filters */}
            <div className="travelers-filters">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or destination..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <FaFilter className="filter-icon" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="auto_rejected">Auto Rejected</option>
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="travelers-stats-row">
                {['pending', 'accepted', 'active', 'completed', 'rejected', 'auto_rejected'].map(s => (
                    <div key={s} className={`stat-pill stat-pill-${s}`}>
                        <span className="stat-count">{bookings.filter(t => t.status === s).length}</span>
                        <span className="stat-label">{STATUS_CONFIG[s].label}</span>
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && <div className="travelers-error-banner">⚠️ {error}</div>}

            {/* Cards Grid */}
            {loading ? (
                <div className="travelers-grid">
                    {[1,2,3,4].map(i => <SkeletonTravelerCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="travelers-empty">
                    <p>{bookings.length === 0 ? 'No travelers assigned to you yet.' : 'No travelers match your search.'}</p>
                </div>
            ) : (
                <div className="travelers-grid">
                    {filtered.map(traveler => {
                        const sc = STATUS_CONFIG[traveler.status] || STATUS_CONFIG.pending;
                        return (
                            <div className="traveler-card" key={traveler.id}>
                                {/* Card Header */}
                                <div className="traveler-card-header">
                                    <div className="traveler-avatar">
                                        {traveler.avatar && traveler.avatar.length > 2 ? (
                                            <img src={traveler.avatar} alt={traveler.traveler_name} className="traveler-avatar-img-real" />
                                        ) : (
                                            traveler.avatar
                                        )}
                                    </div>
                                    <div className="traveler-name-block">
                                        <h3>{traveler.traveler_name}</h3>
                                        <span className={`traveler-status-badge ${sc.className}`}>{sc.label}</span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="traveler-card-body">
                                    <div className="traveler-info-row">
                                        <FaMapMarkerAlt className="info-icon destination-icon" />
                                        <span className="info-label">Destination</span>
                                        <span className="info-value">{traveler.destination}</span>
                                    </div>
                                    <div className="traveler-info-row">
                                        <FaCalendarAlt className="info-icon date-icon" />
                                        <span className="info-label">Trip Dates</span>
                                        <span className="info-value">{formatDate(traveler.trip_start)} – {formatDate(traveler.trip_end)}</span>
                                    </div>
                                    {traveler.traveler_phone && (
                                        <div className="traveler-info-row">
                                            <FaPhone className="info-icon phone-icon" />
                                            <span className="info-label">Phone</span>
                                            <span className="info-value">{traveler.traveler_phone}</span>
                                        </div>
                                    )}
                                    {traveler.traveler_email && (
                                        <div className="traveler-info-row">
                                            <FaEnvelope className="info-icon email-icon" />
                                            <span className="info-label">Email</span>
                                            <span className="info-value">{traveler.traveler_email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notes Section */}
                                {traveler.notes && (
                                    <>
                                        <div
                                            className="traveler-notes"
                                            onClick={() => setExpandedNote(expandedNote === traveler.id ? null : traveler.id)}
                                        >
                                            <FaStickyNote className="notes-icon" />
                                            <span className="notes-toggle">
                                                {expandedNote === traveler.id ? 'Hide Notes' : 'View Notes'}
                                            </span>
                                        </div>
                                        {expandedNote === traveler.id && (
                                            <div className="notes-content"><p>{traveler.notes}</p></div>
                                        )}
                                    </>
                                )}

                                {/* Card Actions */}
                                <div className="traveler-card-actions">
                                    {traveler.status === 'pending' ? (
                                        <>
                                            <button 
                                                className="action-link-btn" 
                                                style={{backgroundColor: processing[traveler.id] ? '#9ca3af' : '#10b981', color: '#fff'}}
                                                onClick={() => handleStatusChange(traveler.id, 'accepted')}
                                                disabled={processing[traveler.id]}
                                            >
                                                {processing[traveler.id] ? 'Processing...' : 'Accept'}
                                            </button>
                                            <button 
                                                className="action-link-btn" 
                                                style={{backgroundColor: processing[traveler.id] ? '#9ca3af' : '#ef4444', color: '#fff'}}
                                                onClick={() => handleStatusChange(traveler.id, 'rejected')}
                                                disabled={processing[traveler.id]}
                                            >
                                                {processing[traveler.id] ? 'Wait...' : 'Reject'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {traveler.traveler_phone && (
                                                <a href={`tel:${traveler.traveler_phone}`} className="action-link-btn call-btn">
                                                    <FaPhone /> Call
                                                </a>
                                            )}
                                            {traveler.traveler_email && (
                                                <a href={`mailto:${traveler.traveler_email}`} className="action-link-btn email-btn">
                                                    <FaEnvelope /> Email
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
