import { useState } from 'react';
import { FaSearch, FaFilter, FaPhone, FaEnvelope, FaStickyNote, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { travelers } from '../data/mockData';
import './Travelers.css';

const STATUS_CONFIG = {
    active: { label: 'Active', className: 'status-active' },
    upcoming: { label: 'Upcoming', className: 'status-upcoming' },
    completed: { label: 'Completed', className: 'status-completed' },
    pending: { label: 'Pending', className: 'status-pending' },
};

export default function Travelers() {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedNote, setExpandedNote] = useState(null);

    const filtered = travelers.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
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
                <div className="travelers-count-badge">{travelers.length} Total Travelers</div>
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
                        <option value="active">Active</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="travelers-stats-row">
                {['active', 'upcoming', 'pending', 'completed'].map(s => (
                    <div key={s} className={`stat-pill stat-pill-${s}`}>
                        <span className="stat-count">{travelers.filter(t => t.status === s).length}</span>
                        <span className="stat-label">{STATUS_CONFIG[s].label}</span>
                    </div>
                ))}
            </div>

            {/* Cards Grid */}
            {filtered.length === 0 ? (
                <div className="travelers-empty">
                    <p>No travelers match your search.</p>
                </div>
            ) : (
                <div className="travelers-grid">
                    {filtered.map(traveler => {
                        const sc = STATUS_CONFIG[traveler.status];
                        return (
                            <div className="traveler-card" key={traveler.id}>
                                {/* Card Header */}
                                <div className="traveler-card-header">
                                    <div className="traveler-avatar">{traveler.avatar}</div>
                                    <div className="traveler-name-block">
                                        <h3>{traveler.name}</h3>
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
                                        <span className="info-value">{formatDate(traveler.tripStart)} – {formatDate(traveler.tripEnd)}</span>
                                    </div>
                                    <div className="traveler-info-row">
                                        <FaPhone className="info-icon phone-icon" />
                                        <span className="info-label">Phone</span>
                                        <span className="info-value">{traveler.phone}</span>
                                    </div>
                                    <div className="traveler-info-row">
                                        <FaEnvelope className="info-icon email-icon" />
                                        <span className="info-label">Email</span>
                                        <span className="info-value">{traveler.email}</span>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div className="traveler-notes" onClick={() => setExpandedNote(expandedNote === traveler.id ? null : traveler.id)}>
                                    <FaStickyNote className="notes-icon" />
                                    <span className="notes-toggle">
                                        {expandedNote === traveler.id ? 'Hide Notes' : 'View Notes'}
                                    </span>
                                </div>
                                {expandedNote === traveler.id && (
                                    <div className="notes-content">
                                        <p>{traveler.notes}</p>
                                    </div>
                                )}

                                {/* Card Actions */}
                                <div className="traveler-card-actions">
                                    <a href={`tel:${traveler.phone}`} className="action-link-btn call-btn">
                                        <FaPhone /> Call
                                    </a>
                                    <a href={`mailto:${traveler.email}`} className="action-link-btn email-btn">
                                        <FaEnvelope /> Email
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
