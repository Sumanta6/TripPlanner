import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProfile, updateMyProfile, getMyGuideRequests, initCsrf } from "../services/api";
import "./Profile.css";

// Icons (Using Lucide React if available, or fallbacks)
import { 
    User, MapPin, Phone, Mail, Navigation, Heart, 
    Edit2, Check, X, Map
} from "lucide-react";

export default function Profile({ setIsLoggedIn }) {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [guideRequests, setGuideRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notLoggedIn, setNotLoggedIn] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // MOCK TRIPS for now
    const MOCK_TRIPS = [
        {
            id: 101,
            title: "Everest Base Camp Trek",
            destination: "Everest Region",
            duration: "14 Days",
            status: "Upcoming",
            image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=300&h=200"
        }
    ];

    useEffect(() => {
        let alive = true;
        async function loadProfile() {
            setLoading(true);
            setError(null);
            setNotLoggedIn(false);
            try {
                await initCsrf();
                const [profData, requestsData] = await Promise.all([
                    getMyProfile(),
                    getMyGuideRequests().catch(() => []) // fail gracefully for requests
                ]);
                
                if (alive) {
                    setProfile(profData);
                    setForm(profData);
                    setGuideRequests(requestsData);
                }
            } catch (err) {
                if (!alive) return;
                const status = err?.response?.status || err?.statusCode;
                if (status === 401 || status === 403) {
                    setNotLoggedIn(true);
                } else {
                    setError(err?.response?.data?.detail || err.message || "Failed to load profile.");
                }
            } finally {
                if (alive) setLoading(false);
            }
        }
        loadProfile();
        return () => { alive = false; };
    }, []);

    const handleEditToggle = () => {
        if (isEditing) {
            setForm(profile);
            setError(null);
            setSaveStatus(null);
        }
        setIsEditing(!isEditing);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleDestinationsChange = (e) => {
        const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
        setForm({ ...form, preferred_destinations: arr });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaveStatus(null);
        try {
            const updated = await updateMyProfile(form);
            setProfile(updated);
            setForm(updated);
            setIsEditing(false);
            setSaveStatus("Profile updated successfully!");
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            const msg = err?.response?.data
                ? Object.values(err.response.data).flat().join(", ")
                : err.message || "Failed to save profile.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── STATES ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="profile-page flex-center">
                <div className="loader-spinner"></div>
            </div>
        );
    }

    if (notLoggedIn) {
        return (
            <div className="profile-page flex-center">
                <div className="empty-state-card">
                    <User size={48} className="empty-icon text-muted" />
                    <h2>You are not logged in</h2>
                    <p>Please log in to view and manage your travel profile.</p>
                    <button className="btn-primary mt-4" onClick={() => navigate("/")}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="profile-page flex-center">
                <div className="empty-state-card error-card">
                    <h2>Oops, something went wrong</h2>
                    <p>{error}</p>
                    <button className="btn-outline mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const email = localStorage.getItem("userEmail") || "";
    const avatarInitials = (profile?.full_name || email || "U").substring(0, 2).toUpperCase();

    return (
        <div className="profile-page">
            <div className="profile-container setup-animation">

                {/* Notifications */}
                {saveStatus && (
                    <div className="profile-toast success">
                        <Check size={18} />
                        {saveStatus}
                    </div>
                )}
                {error && isEditing && (
                    <div className="profile-toast error">
                        <X size={18} />
                        {error}
                    </div>
                )}

                {/* ── HERO HEADER ── */}
                <div className="profile-hero card">
                    <div className="hero-content">
                        <div className="hero-avatar">
                            {avatarInitials}
                        </div>
                        <div className="hero-info">
                            {isEditing ? (
                                <input
                                    className="edit-input title-input"
                                    type="text"
                                    name="full_name"
                                    value={form.full_name || ""}
                                    onChange={handleChange}
                                    placeholder="Your Full Name"
                                />
                            ) : (
                                <h1>{profile?.full_name || "Traveler"}</h1>
                            )}
                            
                            <div className="hero-meta">
                                <span className="meta-item"><Mail size={16} /> {email}</span>
                            </div>

                            <div className="hero-bio mt-3">
                                {isEditing ? (
                                    <textarea
                                        className="edit-input w-full"
                                        name="bio"
                                        rows="2"
                                        value={form.bio || ""}
                                        onChange={handleChange}
                                        placeholder="Write a short bio about yourself..."
                                    />
                                ) : (
                                    <p>{profile?.bio || "No bio added yet. Tell us about your travel dreams!"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hero-actions">
                        {!isEditing ? (
                            <button className="btn-primary" onClick={handleEditToggle}>
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button className="btn-outline" onClick={handleEditToggle} disabled={saving}>
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── MAIN CONTENT GRID ── */}
                <div className="profile-grid mt-6">
                    
                    {/* LEFT COLUMN */}
                    <div className="profile-col-left">
                        
                        {/* Contact & Personal */}
                        <div className="card list-group">
                            <h3 className="card-title">Personal Details</h3>
                            
                            <div className="list-item">
                                <div className="item-icon"><Phone size={18}/></div>
                                <div className="item-content">
                                    <p className="item-label">Phone Number</p>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            type="text"
                                            name="phone"
                                            value={form.phone || ""}
                                            onChange={handleChange}
                                            placeholder="+977 98XXXXXXXX"
                                        />
                                    ) : (
                                        <p className="item-value">{profile?.phone || "—"}</p>
                                    )}
                                </div>
                            </div>

                            <div className="list-item">
                                <div className="item-icon"><MapPin size={18}/></div>
                                <div className="item-content">
                                    <p className="item-label">Address</p>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            type="text"
                                            name="address"
                                            value={form.address || ""}
                                            onChange={handleChange}
                                            placeholder="Kathmandu, Nepal"
                                        />
                                    ) : (
                                        <p className="item-value">{profile?.address || "—"}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Travel Preferences */}
                        <div className="card mt-6 list-group">
                            <h3 className="card-title">Travel Preferences</h3>
                            
                            <div className="list-item">
                                <div className="item-icon"><Navigation size={18}/></div>
                                <div className="item-content">
                                    <p className="item-label">Travel Style</p>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            type="text"
                                            name="travel_style"
                                            value={form.travel_style || ""}
                                            onChange={handleChange}
                                            placeholder="e.g. Trekking, Cultural tour, Adventure..."
                                        />
                                    ) : (
                                        <p className="item-value">{profile?.travel_style || "—"}</p>
                                    )}
                                </div>
                            </div>

                            <div className="list-item align-start">
                                <div className="item-icon mt-1"><Heart size={18}/></div>
                                <div className="item-content w-full">
                                    <p className="item-label mb-2">Favorite Destinations</p>
                                    {isEditing ? (
                                        <input
                                            className="edit-input w-full"
                                            type="text"
                                            value={(form.preferred_destinations || []).join(", ")}
                                            onChange={handleDestinationsChange}
                                            placeholder="e.g. Pokhara, Everest Base Camp, Chitwan"
                                        />
                                    ) : (
                                        <div className="pill-container">
                                            {profile?.preferred_destinations?.length > 0 ? (
                                                profile.preferred_destinations.map((dest, i) => (
                                                    <span key={i} className="pill">{dest}</span>
                                                ))
                                            ) : (
                                                <p className="text-muted text-sm">—</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="profile-col-right">
                        
                        {/* Guide Requests */}
                        <div className="card mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="card-title mb-0">My Guide Requests</h3>
                            </div>
                            
                            <div className="trips-grid">
                                {guideRequests.length > 0 ? guideRequests.map(req => (
                                    <div key={req.id} className="trip-card-modern p-4 text-sm" style={{flexDirection: "column"}}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-navy m-0">Guide Request: {req.destination}</h4>
                                            <span className={`pill ${req.status === 'active' ? 'bg-green text-white' : req.status === 'rejected' ? 'bg-red text-white' : ''}`}>
                                                {req.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-muted mb-2">
                                            <Map size={14} className="inline mr-1" /> {req.trip_start} to {req.trip_end}
                                        </div>
                                        {req.notes && (
                                            <p className="mt-2 text-xs italic text-gray mt-2 bg-light p-2 rounded">"{req.notes}"</p>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-muted text-sm">You haven't requested any guides yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="card h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="card-title mb-0">My Planned Trips</h3>
                                <button className="btn-text">View All</button>
                            </div>

                            <div className="trips-grid">
                                {MOCK_TRIPS.length > 0 ? MOCK_TRIPS.map(trip => (
                                    <div key={trip.id} className="trip-card-modern">
                                        <div className="trip-img-wrap">
                                            <img src={trip.image} alt={trip.title} />
                                            <div className="trip-badge">{trip.status}</div>
                                        </div>
                                        <div className="trip-content">
                                            <h4>{trip.title}</h4>
                                            <div className="trip-meta-row">
                                                <span><Map size={14}/> {trip.destination}</span>
                                                <span>• {trip.duration}</span>
                                            </div>
                                            <button className="btn-outline w-full mt-4">View Details</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-trips">
                                        <Map size={40} className="text-muted mb-3" />
                                        <p>No trips planned yet.</p>
                                        <button className="btn-primary mt-3" onClick={() => navigate('/plan-trip')}>
                                            Plan a Trip
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
