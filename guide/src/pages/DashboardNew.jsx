import { FaChartBar, FaStar, FaUsers, FaMapMarkedAlt, FaClock, FaCalendarCheck } from 'react-icons/fa';
import { travelers, itineraries, guideProfile } from '../data/mockData';
import './DashboardNew.css';

export default function Dashboard() {
    const activeTrips = travelers.filter(t => t.status === 'active').length;
    const pendingRequests = travelers.filter(t => t.status === 'pending').length;
    const upcomingTrips = travelers.filter(t => t.status === 'upcoming').length;
    const completedTrips = travelers.filter(t => t.status === 'completed').length;

    const completionRate = Math.round((completedTrips / travelers.length) * 100);

    const destinationCounts = {};
    itineraries.forEach(it => {
        const dest = it.destination.split('&')[0].trim().split(' ')[0];
        destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
    });
    const topDest = Object.entries(destinationCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return (
        <div className="dashboard-new-page">
            <div className="dn-header">
                <div>
                    <h1>📊 Analytics Dashboard</h1>
                    <p>Your guide performance overview</p>
                </div>
                <div className="dn-guide-badge">
                    <FaStar className="dn-star" />
                    <span>{guideProfile.rating} Rating</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="dn-kpi-grid">
                {[
                    { icon: FaUsers, label: 'Total Travelers', value: travelers.length, color: '#4f7cff', bg: '#e0e7ff' },
                    { icon: FaMapMarkedAlt, label: 'Active Trips', value: activeTrips, color: '#10b981', bg: '#d1fae5' },
                    { icon: FaClock, label: 'Pending Requests', value: pendingRequests, color: '#f59e0b', bg: '#fef3c7' },
                    { icon: FaCalendarCheck, label: 'Upcoming Trips', value: upcomingTrips, color: '#8b5cf6', bg: '#ede9fe' },
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
                })}
            </div>

            {/* Main Grid */}
            <div className="dn-main-grid">
                {/* Trip Status Breakdown */}
                <div className="dn-card">
                    <h3 className="dn-card-title"><FaChartBar /> Trip Status Breakdown</h3>
                    <div className="dn-status-bars">
                        {[
                            { label: 'Completed', count: completedTrips, color: '#10b981' },
                            { label: 'Active', count: activeTrips, color: '#4f7cff' },
                            { label: 'Upcoming', count: upcomingTrips, color: '#8b5cf6' },
                            { label: 'Pending', count: pendingRequests, color: '#f59e0b' },
                        ].map(item => {
                            const pct = Math.round((item.count / travelers.length) * 100);
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
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="dn-completion-rate">
                        <div className="completion-circle">
                            <svg viewBox="0 0 36 36" className="circular-chart">
                                <path
                                    className="circle-bg"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="circle"
                                    strokeDasharray={`${completionRate}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <text x="18" y="20.35" className="percentage">{completionRate}%</text>
                            </svg>
                        </div>
                        <div className="completion-info">
                            <p className="completion-title">Completion Rate</p>
                            <p className="completion-sub">{completedTrips} of {travelers.length} trips completed</p>
                        </div>
                    </div>
                </div>

                {/* Top Destinations */}
                <div className="dn-card">
                    <h3 className="dn-card-title"><FaMapMarkedAlt /> Top Destinations</h3>
                    <div className="dn-destinations">
                        {topDest.map(([dest, count], i) => (
                            <div className="dn-dest-row" key={dest}>
                                <div className="dn-dest-rank">{i + 1}</div>
                                <div className="dn-dest-info">
                                    <span className="dn-dest-name">{dest}</span>
                                    <span className="dn-dest-count">{count} trip{count > 1 ? 's' : ''}</span>
                                </div>
                                <div className="dn-dest-bar">
                                    <div
                                        className="dn-dest-bar-fill"
                                        style={{ width: `${(count / Math.max(...Object.values(destinationCounts))) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="dn-rating-block">
                        <div className="dn-rating-stars">
                            {[1, 2, 3, 4, 5].map(n => (
                                <FaStar key={n} className={n <= Math.floor(guideProfile.rating) ? 'star-filled' : 'star-empty'} />
                            ))}
                        </div>
                        <div className="dn-rating-num">{guideProfile.rating} / 5.0</div>
                        <div className="dn-rating-label">{guideProfile.toursCompleted} completed tours</div>
                    </div>
                </div>
            </div>

            {/* Guide Performance Summary */}
            <div className="dn-perf-bar">
                <div className="dn-perf-item">
                    <span className="dn-perf-value">{guideProfile.experience}</span>
                    <span className="dn-perf-label">Experience</span>
                </div>
                <div className="dn-perf-divider"></div>
                <div className="dn-perf-item">
                    <span className="dn-perf-value">{guideProfile.languages.length}</span>
                    <span className="dn-perf-label">Languages</span>
                </div>
                <div className="dn-perf-divider"></div>
                <div className="dn-perf-item">
                    <span className="dn-perf-value">{guideProfile.destinations.length}</span>
                    <span className="dn-perf-label">Destinations</span>
                </div>
                <div className="dn-perf-divider"></div>
                <div className="dn-perf-item">
                    <span className="dn-perf-value">{guideProfile.toursCompleted}</span>
                    <span className="dn-perf-label">Total Tours</span>
                </div>
                <div className="dn-perf-divider"></div>
                <div className="dn-perf-item">
                    <span className="dn-perf-value">{guideProfile.rating}⭐</span>
                    <span className="dn-perf-label">Rating</span>
                </div>
            </div>
        </div>
    );
}
