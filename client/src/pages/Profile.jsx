import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getMyProfile,
    updateMyProfile,
    getMyItineraries,
    getMyBookedTrips,
    initCsrf,
} from "../services/api";
import "./Profile.css";
import {
    User, MapPin, Phone, Mail, Edit2, Check, X,
    Calendar, Map, Bookmark, FileText, Navigation, Heart, Activity,
} from "lucide-react";

const FIELDS = ["full_name", "phone", "address", "bio", "travel_style", "preferred_destinations"];
function calcCompletion(p) {
    if (!p) return 0;
    let n = 0;
    FIELDS.forEach(f => { const v = p[f]; if (Array.isArray(v) ? v.length : !!v) n++; });
    return Math.round((n / FIELDS.length) * 100);
}

export default function Profile({ setIsLoggedIn }) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notLoggedIn, setNotLoggedIn] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [tripCount, setTripCount] = useState(0);
    const [itinCount, setItinCount] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true); setError(null); setNotLoggedIn(false);
            try {
                await initCsrf();
                const [p, t, it] = await Promise.all([
                    getMyProfile(),
                    getMyBookedTrips().catch(() => []),
                    getMyItineraries().catch(() => []),
                ]);
                if (!alive) return;
                setProfile(p); setForm(p);
                setTripCount(Array.isArray(t) ? t.length : 0);
                setItinCount(Array.isArray(it) ? it.length : 0);
            } catch (err) {
                if (!alive) return;
                const s = err?.response?.status || err?.statusCode;
                if (s === 401 || s === 403) setNotLoggedIn(true);
                else setError(err?.response?.data?.detail || err.message || "Failed to load profile.");
            } finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, []);

    const toggleEdit = () => {
        if (isEditing) { setForm(profile); setError(null); setSaveStatus(null); }
        setIsEditing(!isEditing);
    };
    const chg = e => setForm({ ...form, [e.target.name]: e.target.value });
    const chgDest = e => setForm({
        ...form, preferred_destinations: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
    });
    const save = async () => {
        setSaving(true); setError(null); setSaveStatus(null);
        try {
            const u = await updateMyProfile(form);
            setProfile(u); setForm(u); setIsEditing(false);
            setSaveStatus("Changes saved"); setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            setError(err?.response?.data ? Object.values(err.response.data).flat().join(", ") : err.message || "Save failed.");
        } finally { setSaving(false); }
    };

    // --- States ---
    if (loading) return <div className="pf"><div className="pf-center"><div className="pf-spin" /></div></div>;
    if (notLoggedIn) return (
        <div className="pf"><div className="pf-center">
            <div className="pf-blank">
                <User size={36} strokeWidth={1.5} />
                <h2>Sign in to continue</h2>
                <p>You need to be logged in to view your profile.</p>
                <button className="pf-btn pf-btn-primary" onClick={() => navigate("/")}>Log In</button>
            </div>
        </div></div>
    );
    if (error && !profile) return (
        <div className="pf"><div className="pf-center">
            <div className="pf-blank">
                <h2>Unable to load profile</h2><p>{error}</p>
                <button className="pf-btn pf-btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            </div>
        </div></div>
    );

    const email = localStorage.getItem("userEmail") || "";
    const initials = (profile?.full_name || email || "U").substring(0, 2).toUpperCase();
    const comp = calcCompletion(profile);

    return (
        <div className="pf">
            <div className="pf-shell">

                {/* Toasts */}
                {saveStatus && <div className="pf-toast pf-toast-ok"><Check size={14} />{saveStatus}</div>}
                {error && isEditing && <div className="pf-toast pf-toast-err"><X size={14} />{error}</div>}

                {/* ─── HEADER ─── */}
                <header className="pf-header">
                    <div className="pf-identity">
                        <div className="pf-avatar">{initials}</div>
                        <div>
                            {isEditing ? (
                                <input className="pf-input pf-input-name" name="full_name"
                                    value={form.full_name || ""} onChange={chg} placeholder="Your name" />
                            ) : (
                                <h1 className="pf-name">{profile?.full_name || "Traveler"}</h1>
                            )}
                            <p className="pf-email">{email}</p>
                        </div>
                    </div>
                    <div className="pf-actions">
                        {!isEditing ? (
                            <button className="pf-btn pf-btn-secondary" onClick={toggleEdit}>
                                <Edit2 size={14} /> Edit Profile
                            </button>
                        ) : (
                            <>
                                <button className="pf-btn pf-btn-ghost" onClick={toggleEdit} disabled={saving}>Cancel</button>
                                <button className="pf-btn pf-btn-primary" onClick={save} disabled={saving}>
                                    {saving ? "Saving…" : "Save Changes"}
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* ─── METRICS ─── */}
                <div className="pf-metrics">
                    <div className="pf-metric">
                        <span className="pf-metric-val">{tripCount}</span>
                        <span className="pf-metric-lbl">Trips</span>
                    </div>
                    <div className="pf-metric-sep" />
                    <div className="pf-metric">
                        <span className="pf-metric-val">{itinCount}</span>
                        <span className="pf-metric-lbl">Itineraries</span>
                    </div>
                    <div className="pf-metric-sep" />
                    <div className="pf-metric">
                        <span className="pf-metric-val">{comp}%</span>
                        <span className="pf-metric-lbl">Complete</span>
                    </div>
                    <div className="pf-metric-sep" />
                    <div className="pf-metric">
                        <span className="pf-metric-val pf-metric-date"><Calendar size={13} /> 2026</span>
                        <span className="pf-metric-lbl">Member since</span>
                    </div>
                </div>

                {/* ─── COMPLETION BAR ─── */}
                {comp < 100 && (
                    <div className="pf-progress-section">
                        <div className="pf-progress-row">
                            <span className="pf-progress-label">Profile completion</span>
                            <span className="pf-progress-pct">{comp}%</span>
                        </div>
                        <div className="pf-track"><div className="pf-fill" style={{ width: `${comp}%` }} /></div>
                    </div>
                )}

                {/* ─── CONTENT GRID ─── */}
                <div className="pf-grid">

                    {/* LEFT */}
                    <div className="pf-section">
                        <h2 className="pf-section-title">Personal Information</h2>

                        <Row label="Phone">
                            {isEditing
                                ? <input className="pf-input" name="phone" value={form.phone || ""} onChange={chg} placeholder="+977 98XXXXXXXX" />
                                : <span className="pf-val">{profile?.phone || <span className="pf-empty">Not provided</span>}</span>}
                        </Row>
                        <Row label="Address">
                            {isEditing
                                ? <input className="pf-input" name="address" value={form.address || ""} onChange={chg} placeholder="Kathmandu, Nepal" />
                                : <span className="pf-val">{profile?.address || <span className="pf-empty">Not provided</span>}</span>}
                        </Row>

                        <div className="pf-section-gap" />
                        <h2 className="pf-section-title">Travel Preferences</h2>

                        <Row label="Style">
                            {isEditing
                                ? <input className="pf-input" name="travel_style" value={form.travel_style || ""} onChange={chg} placeholder="e.g. Adventure, Cultural" />
                                : <span className="pf-val">{profile?.travel_style || <span className="pf-empty">Not set</span>}</span>}
                        </Row>
                        <Row label="Destinations" align="start">
                            {isEditing
                                ? <input className="pf-input" value={(form.preferred_destinations || []).join(", ")} onChange={chgDest} placeholder="e.g. Pokhara, Everest Base Camp" />
                                : profile?.preferred_destinations?.length > 0
                                    ? <div className="pf-pills">{profile.preferred_destinations.map((d, i) => <span key={i} className="pf-pill">{d}</span>)}</div>
                                    : <span className="pf-empty">No destinations added</span>}
                        </Row>
                    </div>

                    {/* RIGHT */}
                    <div className="pf-section">
                        <h2 className="pf-section-title">About</h2>
                        {isEditing ? (
                            <textarea className="pf-input pf-textarea" name="bio" rows="5"
                                value={form.bio || ""} onChange={chg}
                                placeholder="Tell others about your travel experiences and interests…" />
                        ) : (
                            <p className={`pf-bio ${!profile?.bio ? "pf-empty" : ""}`}>
                                {profile?.bio || "No bio yet — share your story."}
                            </p>
                        )}

                        <div className="pf-section-gap" />
                        <h2 className="pf-section-title">Interests</h2>
                        <div className="pf-pills">
                            {["Trekking", "Culture", "Photography", "Wildlife", "Food", "History"].map(t => (
                                <span key={t} className="pf-pill pf-pill-muted">{t}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, children, align }) {
    return (
        <div className={`pf-row ${align === "start" ? "pf-row-start" : ""}`}>
            <span className="pf-label">{label}</span>
            <div className="pf-row-value">{children}</div>
        </div>
    );
}
