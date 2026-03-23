import { useState, useEffect } from 'react';
import {
    FaUserCircle, FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope,
    FaGlobe, FaBriefcase, FaEdit, FaMountain, FaSpinner, FaTimes, FaSave
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const DESTINATIONS_COLORS = [
    '#4f7cff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
];

function ProfileSkeleton() {
    return (
        <div className="profile-page">
            <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                    <div className="skeleton-avatar large-avatar" />
                    <div className="skeleton-info" style={{ flex: 1, gap: 12 }}>
                        <div className="skeleton-line short" />
                        <div className="skeleton-line long" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Profile() {
    const { profile, loading, error, patchProfile, refreshProfile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(null);

    // Initialize form when profile changes
    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                address: profile.address || '',
                bio: profile.bio || '',
                specialization: profile.specialization || '',
                experience_years: profile.experience_years || 0,
                languages: (profile.languages || []).join(', '),
                destinations: (profile.destinations || []).join(', ')
            });
        }
    }, [profile]);

    if (loading || !form) return <ProfileSkeleton />;
    if (error) return (
        <div className="profile-page">
            <div className="profile-error-banner">⚠️ Could not load profile. {error}</div>
        </div>
    );

    const p = profile || {};

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
                destinations: form.destinations.split(',').map(s => s.trim()).filter(Boolean),
                experience_years: parseFloat(form.experience_years) || 0
            };
            await patchProfile(payload);
            await refreshProfile();
            setIsEditing(false);
            showToast('Profile saved successfully!');
        } catch (err) {
            alert('Failed to save profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const showToast = (msg) => {
        setSaveMsg(msg);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    return (
        <div className="profile-page">
            {/* Hero Banner */}
            <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar-circle">
                            {p.profile_image ? (
                                <img src={p.profile_image} alt={p.full_name} className="profile-avatar-img-real" />
                            ) : (
                                <FaUserCircle className="profile-avatar-icon" />
                            )}
                            {isEditing && (
                                <label className="avatar-edit-overlay">
                                    <FaEdit />
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        hidden 
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const formData = new FormData();
                                            formData.append('profile_image', file);
                                            try {
                                                setSaving(true);
                                                await patchProfile(formData);
                                                showToast('Profile image updated');
                                                await refreshProfile();
                                            } catch (err) {
                                                alert('Failed to upload image: ' + err.message);
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                        <div
                            className={`profile-avail-badge ${p.availability_badge === 'Available' ? 'available' : 'busy'}`}
                        >
                            <span className="avail-dot" />
                            {p.availability_badge}
                        </div>
                    </div>
                    <div className="profile-hero-info">
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="profile-edit-input title-input"
                                value={form.full_name} 
                                onChange={e => setForm({...form, full_name: e.target.value})}
                                placeholder="Your Full Name"
                            />
                        ) : (
                            <h1>{p.full_name || p.email || 'Your Profile'}</h1>
                        )}
                        
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="profile-edit-input spec-input"
                                value={form.specialization} 
                                onChange={e => setForm({...form, specialization: e.target.value})}
                                placeholder="e.g. Cultural Tours & Trekking Guide"
                            />
                        ) : (
                            <p className="profile-specialization">{p.specialization || 'No specialization set'}</p>
                        )}
                        
                        <div className="profile-rating">
                            <FaStar className="star-icon" />
                            <strong>{p.rating ?? 0}</strong>
                            <span className="rating-label">/ 5.0 · {p.tours_completed ?? 0} tours completed</span>
                        </div>
                    </div>
                    
                    <div className="profile-hero-actions">
                        {isEditing ? (
                            <>
                                <button className="profile-action-btn cancel" onClick={() => setIsEditing(false)} disabled={saving}>
                                    <FaTimes /> Cancel
                                </button>
                                <button className="profile-action-btn save" onClick={handleSaveProfile} disabled={saving}>
                                    {saving ? <FaSpinner className="spin" /> : <FaSave />} Save
                                </button>
                            </>
                        ) : (
                            <button className="profile-action-btn edit" onClick={() => setIsEditing(true)}>
                                <FaEdit /> Edit Profile
                            </button>
                        )}
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
                                <span>{p.email || '—'}</span>
                            </div>
                        </div>
                        <div className="profile-info-row">
                            <FaPhone className="pinfo-icon phone" />
                            <div className="edit-full-width">
                                <label>Phone</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        className="profile-edit-input"
                                        value={form.phone} 
                                        onChange={e => setForm({...form, phone: e.target.value})}
                                    />
                                ) : (
                                    <span>{p.phone || '—'}</span>
                                )}
                            </div>
                        </div>
                        <div className="profile-info-row">
                            <FaMapMarkerAlt className="pinfo-icon location" />
                            <div className="edit-full-width">
                                <label>Address</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        className="profile-edit-input"
                                        value={form.address} 
                                        onChange={e => setForm({...form, address: e.target.value})}
                                    />
                                ) : (
                                    <span>{p.address || '—'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Languages Card */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaGlobe className="card-title-icon" /> Languages Spoken</h3>
                        {isEditing ? (
                            <div className="edit-full-width">
                                <input 
                                    type="text" 
                                    className="profile-edit-input"
                                    value={form.languages} 
                                    onChange={e => setForm({...form, languages: e.target.value})}
                                    placeholder="English, Spanish, French (comma separated)"
                                />
                                <span className="profile-edit-hint">Comma separated</span>
                            </div>
                        ) : (
                            <div className="profile-tags">
                                {(p.languages || []).length === 0 ? (
                                    <span className="profile-empty-hint">No languages set</span>
                                ) : (
                                    (p.languages || []).map(lang => (
                                        <span key={lang} className="profile-tag lang-tag">{lang}</span>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Experience */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaBriefcase className="card-title-icon" /> Experience</h3>
                        {isEditing ? (
                             <div className="edit-full-width">
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.1"
                                    className="profile-edit-input"
                                    value={form.experience_years} 
                                    onChange={e => setForm({...form, experience_years: e.target.value})}
                                />
                                <span className="profile-edit-hint">Years of professional guiding</span>
                            </div>
                        ) : (
                            <div className="experience-display">
                                <div className="exp-number">{p.experience_years ? `${p.experience_years} yrs` : '—'}</div>
                                <div className="exp-label">of Professional Guiding</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="profile-right">
                    {/* Bio */}
                    <div className="profile-card bio-card">
                        <div className="bio-header">
                            <h3 className="profile-card-title">About Me</h3>
                        </div>
                        {isEditing ? (
                            <textarea 
                                className="profile-edit-textarea"
                                value={form.bio} 
                                onChange={e => setForm({...form, bio: e.target.value})}
                                rows={6}
                                placeholder="Tell travelers about yourself, your background, and your guiding philosophy..."
                            />
                        ) : (
                            <p className="bio-text">
                                {p.bio || 'No bio added yet. Click Edit Profile to add one.'}
                            </p>
                        )}
                    </div>

                    {/* Destinations */}
                    <div className="profile-card">
                        <h3 className="profile-card-title"><FaMountain className="card-title-icon" /> Covered Destinations</h3>
                        {isEditing ? (
                            <div className="edit-full-width">
                                <input 
                                    type="text" 
                                    className="profile-edit-input"
                                    value={form.destinations} 
                                    onChange={e => setForm({...form, destinations: e.target.value})}
                                    placeholder="Kathmandu, Pokhara, Everest Base Camp (comma separated)"
                                />
                                <span className="profile-edit-hint">Comma separated</span>
                            </div>
                        ) : (
                            <div className="destinations-grid">
                                {(p.destinations || []).length === 0 ? (
                                    <span className="profile-empty-hint">No destinations set</span>
                                ) : (
                                    (p.destinations || []).map((dest, i) => (
                                        <div
                                            key={dest}
                                            className="destination-chip"
                                            style={{ '--chip-color': DESTINATIONS_COLORS[i % DESTINATIONS_COLORS.length] }}
                                        >
                                            <span className="dest-dot" style={{ background: DESTINATIONS_COLORS[i % DESTINATIONS_COLORS.length] }} />
                                            {dest}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="profile-card stats-row-card">
                        <div className="profile-stat">
                            <div className="profile-stat-number">{p.tours_completed ?? 0}</div>
                            <div className="profile-stat-label">Tours Completed</div>
                        </div>
                        <div className="profile-stat-divider" />
                        <div className="profile-stat">
                            <div className="profile-stat-number">{p.rating ?? 0}</div>
                            <div className="profile-stat-label">Average Rating</div>
                        </div>
                        <div className="profile-stat-divider" />
                        <div className="profile-stat">
                            <div className="profile-stat-number">{isEditing ? form.languages.split(',').filter(x => x.trim()).length : (p.languages || []).length}</div>
                            <div className="profile-stat-label">Languages</div>
                        </div>
                        <div className="profile-stat-divider" />
                        <div className="profile-stat">
                            <div className="profile-stat-number">{isEditing ? form.destinations.split(',').filter(x => x.trim()).length : (p.destinations || []).length}</div>
                            <div className="profile-stat-label">Destinations</div>
                        </div>
                    </div>
                </div>
            </div>

            {saveMsg && <div className="profile-toast">{saveMsg}</div>}
        </div>
    );
}
