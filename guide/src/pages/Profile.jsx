import { useState } from 'react';
import {
    FaUserCircle, FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope,
    FaGlobe, FaBriefcase, FaEdit, FaMountain
} from 'react-icons/fa';
import { guideProfile } from '../data/mockData';
import './Profile.css';

const DESTINATIONS_COLORS = [
    '#4f7cff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
];

export default function Profile() {
    const [availability, setAvailability] = useState(guideProfile.availability);

    const toggleAvailability = () => {
        setAvailability(prev => prev === 'available' ? 'busy' : 'available');
    };

    return (
        <div className="profile-page">
            {/* Hero Banner */}
            <div className="profile-hero">
                <div className="profile-hero-bg"></div>
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar-circle">
                            <FaUserCircle className="profile-avatar-icon" />
                        </div>
                        <button
                            className={`profile-avail-toggle ${availability}`}
                            onClick={toggleAvailability}
                        >
                            <span className="avail-dot"></span>
                            {availability === 'available' ? 'Available' : 'Busy'}
                        </button>
                    </div>
                    <div className="profile-hero-info">
                        <h1>{guideProfile.name}</h1>
                        <p className="profile-specialization">{guideProfile.specialization}</p>
                        <div className="profile-rating">
                            <FaStar className="star-icon" />
                            <strong>{guideProfile.rating}</strong>
                            <span className="rating-label"> / 5.0 &middot; {guideProfile.toursCompleted} tours completed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="profile-main">
                {/* Left Column */}
                <div className="profile-left">
                    {/* Contact Card */}
                    <div className="profile-card">
                        <h3 className="profile-card-title">Contact Information</h3>
                        <div className="profile-info-row">
                            <FaEnvelope className="pinfo-icon email" />
                            <div>
                                <label>Email</label>
                                <span>{guideProfile.email}</span>
                            </div>
                        </div>
                        <div className="profile-info-row">
                            <FaPhone className="pinfo-icon phone" />
                            <div>
                                <label>Phone</label>
                                <span>{guideProfile.phone}</span>
                            </div>
                        </div>
                        <div className="profile-info-row">
                            <FaMapMarkerAlt className="pinfo-icon location" />
                            <div>
                                <label>Address</label>
                                <span>{guideProfile.address}</span>
                            </div>
                        </div>
                    </div>

                    {/* Languages Card */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaGlobe className="card-title-icon" /> Languages Spoken</h3>
                        <div className="profile-tags">
                            {guideProfile.languages.map(lang => (
                                <span key={lang} className="profile-tag lang-tag">{lang}</span>
                            ))}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaBriefcase className="card-title-icon" /> Experience</h3>
                        <div className="experience-display">
                            <div className="exp-number">{guideProfile.experience}</div>
                            <div className="exp-label">of Professional Guiding</div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="profile-right">
                    {/* Bio */}
                    <div className="profile-card bio-card">
                        <div className="bio-header">
                            <h3 className="profile-card-title">About Me</h3>
                            <button className="edit-btn"><FaEdit /> Edit</button>
                        </div>
                        <p className="bio-text">{guideProfile.bio}</p>
                    </div>

                    {/* Destinations */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaMountain className="card-title-icon" /> Covered Destinations</h3>
                        <div className="destinations-grid">
                            {guideProfile.destinations.map((dest, i) => (
                                <div
                                    key={dest}
                                    className="destination-chip"
                                    style={{ '--chip-color': DESTINATIONS_COLORS[i % DESTINATIONS_COLORS.length] }}
                                >
                                    <span className="dest-dot" style={{ background: DESTINATIONS_COLORS[i % DESTINATIONS_COLORS.length] }}></span>
                                    {dest}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="profile-card stats-row-card">
                        <div className="profile-stat">
                            <div className="profile-stat-number">{guideProfile.toursCompleted}</div>
                            <div className="profile-stat-label">Tours Completed</div>
                        </div>
                        <div className="profile-stat-divider"></div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{guideProfile.rating}</div>
                            <div className="profile-stat-label">Average Rating</div>
                        </div>
                        <div className="profile-stat-divider"></div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{guideProfile.languages.length}</div>
                            <div className="profile-stat-label">Languages</div>
                        </div>
                        <div className="profile-stat-divider"></div>
                        <div className="profile-stat">
                            <div className="profile-stat-number">{guideProfile.destinations.length}</div>
                            <div className="profile-stat-label">Destinations</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
