import { useState } from 'react';
import { FaMapMarkedAlt, FaEye, FaChevronDown, FaChevronUp, FaCheckCircle, FaClock, FaCalendarAlt, FaWallet } from 'react-icons/fa';
import { itineraries } from '../data/mockData';
import './Itineraries.css';

const STATUS_CONFIG = {
    active: { label: 'Active', className: 'itin-status-active' },
    upcoming: { label: 'Upcoming', className: 'itin-status-upcoming' },
    completed: { label: 'Completed', className: 'itin-status-completed' },
    pending: { label: 'Pending', className: 'itin-status-pending' },
};

export default function Itineraries() {
    const [selectedItinerary, setSelectedItinerary] = useState(null);
    const [expandedDays, setExpandedDays] = useState({});
    const [filterStatus, setFilterStatus] = useState('all');

    const filtered = itineraries.filter(it => filterStatus === 'all' || it.status === filterStatus);

    const toggleDay = (dayNum) => {
        setExpandedDays(prev => ({ ...prev, [dayNum]: !prev[dayNum] }));
    };

    const openDetail = (itinerary) => {
        setSelectedItinerary(itinerary);
        setExpandedDays({});
    };

    const closeDetail = () => setSelectedItinerary(null);

    return (
        <div className="itineraries-page">
            {/* Header */}
            <div className="itin-header">
                <div className="itin-title-area">
                    <h1>🗺️ Trip Itineraries</h1>
                    <p>View and manage all trip itineraries assigned to you</p>
                </div>
                <div className="itin-filter-bar">
                    <button className={filterStatus === 'all' ? 'itin-filter-btn active' : 'itin-filter-btn'} onClick={() => setFilterStatus('all')}>All</button>
                    <button className={filterStatus === 'active' ? 'itin-filter-btn active' : 'itin-filter-btn'} onClick={() => setFilterStatus('active')}>Active</button>
                    <button className={filterStatus === 'upcoming' ? 'itin-filter-btn active' : 'itin-filter-btn'} onClick={() => setFilterStatus('upcoming')}>Upcoming</button>
                    <button className={filterStatus === 'completed' ? 'itin-filter-btn active' : 'itin-filter-btn'} onClick={() => setFilterStatus('completed')}>Completed</button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="itin-grid">
                {filtered.map(itin => {
                    const sc = STATUS_CONFIG[itin.status];
                    return (
                        <div className="itin-card" key={itin.id}>
                            <div className="itin-card-top">
                                <div className="itin-destination-icon">
                                    <FaMapMarkedAlt />
                                </div>
                                <span className={`itin-status-badge ${sc.className}`}>{sc.label}</span>
                            </div>

                            <div className="itin-card-body">
                                <h3>{itin.destination}</h3>
                                <p className="itin-traveler-name">Traveler: <strong>{itin.travelerName}</strong></p>

                                <div className="itin-meta">
                                    <div className="itin-meta-item">
                                        <FaClock className="itin-meta-icon" />
                                        <span>{itin.duration}</span>
                                    </div>
                                    <div className="itin-meta-item">
                                        <FaWallet className="itin-meta-icon" />
                                        <span>{itin.budget}</span>
                                    </div>
                                    <div className="itin-meta-item">
                                        <FaCalendarAlt className="itin-meta-icon" />
                                        <span>{itin.startDate}</span>
                                    </div>
                                </div>

                                <div className="itin-days-preview">
                                    <span className="itin-days-count">{itin.days.length} Days Planned</span>
                                    <div className="itin-day-dots">
                                        {itin.days.slice(0, 7).map(d => (
                                            <div key={d.day} className="day-dot" title={`Day ${d.day}`}></div>
                                        ))}
                                        {itin.days.length > 7 && <span className="day-dot-more">+{itin.days.length - 7}</span>}
                                    </div>
                                </div>
                            </div>

                            <button className="itin-view-btn" onClick={() => openDetail(itin)}>
                                <FaEye /> View Details
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedItinerary && (
                <div className="itin-modal-overlay" onClick={closeDetail}>
                    <div className="itin-modal" onClick={e => e.stopPropagation()}>
                        <div className="itin-modal-header">
                            <div>
                                <h2>{selectedItinerary.destination}</h2>
                                <p>Traveler: <strong>{selectedItinerary.travelerName}</strong> &nbsp;|&nbsp; {selectedItinerary.duration} &nbsp;|&nbsp; {selectedItinerary.budget}</p>
                            </div>
                            <button className="itin-modal-close" onClick={closeDetail}>✕</button>
                        </div>

                        <div className="itin-modal-body">
                            <h3 className="itin-modal-days-title">Day-wise Itinerary</h3>
                            {selectedItinerary.days.map(d => (
                                <div className="day-accordion" key={d.day}>
                                    <button
                                        className="day-accordion-header"
                                        onClick={() => toggleDay(d.day)}
                                    >
                                        <div className="day-header-left">
                                            <span className="day-number">Day {d.day}</span>
                                            <span className="day-title">{d.title}</span>
                                        </div>
                                        {expandedDays[d.day] ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    {expandedDays[d.day] && (
                                        <div className="day-accordion-body">
                                            <ul className="activity-checklist">
                                                {d.activities.map((act, i) => (
                                                    <li key={i}>
                                                        <FaCheckCircle className="check-icon" />
                                                        <span>{act}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
