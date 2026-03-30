import React, { useEffect, useState } from "react";
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
  User,
  Phone,
  Mail,
  Edit2,
  Check,
  X,
  Calendar,
  MapPin,
  Compass,
  FileText,
  Heart,
  Sparkles
} from "lucide-react";

const FIELDS = ["full_name", "phone", "address", "bio", "travel_style", "preferred_destinations"];
const TRAVEL_STYLE_OPTIONS = ["Adventure", "Luxury", "Budget", "Cultural", "Relaxation", "Solo", "Family"];

function normalizeProfileForm(data) {
  return {
    ...data,
    travel_style: data?.travel_style || "",
    preferred_destinations: Array.isArray(data?.preferred_destinations) ? data.preferred_destinations : [],
    recent_interests: Array.isArray(data?.recent_interests) ? data.recent_interests : [],
  };
}

function calcCompletion(profile) {
  if (!profile) return 0;
  let filled = 0;
  FIELDS.forEach((field) => {
    const value = profile[field];
    if (Array.isArray(value) ? value.length : !!value) filled += 1;
  });
  return Math.round((filled / FIELDS.length) * 100);
}

function memberSinceYear(profile) {
  const source = profile?.date_joined || profile?.created_at || null;
  if (!source) return "2026";
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? "2026" : String(date.getFullYear());
}

function statItems({ tripCount, itinCount, completion, year }) {
  return [
    { label: "Trips", value: tripCount, icon: <Compass size={18} /> },
    { label: "Itineraries", value: itinCount, icon: <FileText size={18} /> },
    { label: "Completion", value: `${completion}%`, icon: <Check size={18} /> },
    { label: "Member Since", value: year, icon: <Calendar size={18} /> }
  ];
}

function fallback(value, emptyText) {
  return value || <span className="pf-empty">{emptyText}</span>;
}

export default function Profile() {
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
  const [destinationInput, setDestinationInput] = useState("");
  const [styleInput, setStyleInput] = useState("");
  const [showStyleOptions, setShowStyleOptions] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      setNotLoggedIn(false);
      try {
        await initCsrf();
        const [profileRes, tripsRes, itinerariesRes] = await Promise.all([
          getMyProfile(),
          getMyBookedTrips().catch(() => []),
          getMyItineraries().catch(() => []),
        ]);

        if (!alive) return;
        setProfile(profileRes);
        setForm(normalizeProfileForm(profileRes));
        setTripCount(Array.isArray(tripsRes) ? tripsRes.length : 0);
        setItinCount(Array.isArray(itinerariesRes) ? itinerariesRes.length : 0);
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
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setStyleInput(form.travel_style || "");
  }, [form.travel_style, isEditing]);

  const toggleEdit = () => {
    if (isEditing) {
      setForm(normalizeProfileForm(profile));
      setDestinationInput("");
      setStyleInput(profile?.travel_style || "");
      setShowStyleOptions(false);
      setError(null);
      setSaveStatus(null);
    } else {
      setForm(normalizeProfileForm(profile));
      setDestinationInput("");
      setStyleInput(profile?.travel_style || "");
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const addDestinations = (rawValue) => {
    const additions = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!additions.length) return;

    setForm((current) => {
      const existing = Array.isArray(current.preferred_destinations) ? current.preferred_destinations : [];
      const seen = new Set(existing.map((item) => item.toLowerCase()));
      const next = [...existing];

      additions.forEach((item) => {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          next.push(item);
        }
      });

      return { ...current, preferred_destinations: next };
    });
    setDestinationInput("");
  };

  const handleDestinationInputChange = (event) => {
    const value = event.target.value;
    if (value.includes(",")) {
      addDestinations(value);
      return;
    }
    setDestinationInput(value);
  };

  const handleDestinationKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDestinations(destinationInput);
      return;
    }

    if (event.key === "Backspace" && !destinationInput.trim() && form.preferred_destinations?.length) {
      setForm((current) => ({
        ...current,
        preferred_destinations: current.preferred_destinations.slice(0, -1),
      }));
    }
  };

  const removeDestination = (destination) => {
    setForm((current) => ({
      ...current,
      preferred_destinations: current.preferred_destinations.filter((item) => item !== destination),
    }));
  };

  const commitTravelStyle = (value) => {
    const nextValue = value.trim();
    setForm((current) => ({ ...current, travel_style: nextValue }));
    setStyleInput(nextValue);
  };

  const filteredStyleOptions = TRAVEL_STYLE_OPTIONS.filter((option) =>
    option.toLowerCase().includes(styleInput.toLowerCase())
  );

  const handleTravelStyleInput = (event) => {
    const value = event.target.value;
    setStyleInput(value);
    setForm((current) => ({ ...current, travel_style: value }));
    setShowStyleOptions(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaveStatus(null);
    try {
      const updated = await updateMyProfile(form);
      setProfile(updated);
      setForm(normalizeProfileForm(updated));
      setDestinationInput("");
      setStyleInput(updated?.travel_style || "");
      setShowStyleOptions(false);
      setIsEditing(false);
      setSaveStatus("Changes saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setError(
        err?.response?.data
          ? Object.values(err.response.data).flat().join(", ")
          : err.message || "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="pf"><div className="pf-center"><div className="pf-spin" /></div></div>;
  }

  if (notLoggedIn) {
    return (
      <div className="pf">
        <div className="pf-center">
          <div className="pf-blank">
            <User size={36} strokeWidth={1.5} />
            <h2>Sign in to continue</h2>
            <p>You need to be logged in to view your profile.</p>
            <button className="pf-btn pf-btn-primary" onClick={() => navigate("/")}>Log In</button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pf">
        <div className="pf-center">
          <div className="pf-blank">
            <h2>Unable to load profile</h2>
            <p>{error}</p>
            <button className="pf-btn pf-btn-secondary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const email = localStorage.getItem("userEmail") || "";
  const initials = (profile?.full_name || email || "U").substring(0, 2).toUpperCase();
  const completion = calcCompletion(profile);
  const stats = statItems({
    tripCount,
    itinCount,
    completion,
    year: memberSinceYear(profile)
  });

  return (
    <div className="pf">
      <div className="pf-shell">
        {saveStatus && <div className="pf-toast pf-toast-ok"><Check size={14} />{saveStatus}</div>}
        {error && isEditing && <div className="pf-toast pf-toast-err"><X size={14} />{error}</div>}

        <section className="pf-hero">
          <div className="pf-hero-gradient" />
          <div className="pf-hero-main">
            <div className="pf-profile-card">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar">{initials}</div>
              </div>
              <div className="pf-profile-copy">
                {isEditing ? (
                  <input
                    className="pf-input pf-input-name"
                    name="full_name"
                    value={form.full_name || ""}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                ) : (
                  <h1 className="pf-name">{profile?.full_name || "Traveler"}</h1>
                )}
                <p className="pf-email"><Mail size={14} /> {email || "Not added yet"}</p>
                <div className="pf-role-badge"><Sparkles size={14} /> Traveler</div>
              </div>
            </div>

            <div className="pf-actions">
              {!isEditing ? (
                <button className="pf-btn pf-btn-primary" onClick={toggleEdit}>
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
          </div>
        </section>

        <section className="pf-stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="pf-stat-card">
              <div className="pf-stat-icon">{stat.icon}</div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        {completion < 100 && (
          <section className="pf-progress-card">
            <div className="pf-progress-row">
              <span className="pf-progress-label">Profile completion</span>
              <span className="pf-progress-pct">{completion}% complete</span>
            </div>
            <div className="pf-track"><div className="pf-fill" style={{ width: `${completion}%` }} /></div>
          </section>
        )}

        <div className="pf-grid">
          <div className="pf-column pf-column-main">
            <section className="pf-section-card">
              <div className="pf-section-head">
                <div>
                  <span className="pf-section-kicker">Primary Info</span>
                  <h2>Personal Information</h2>
                </div>
                <Edit2 size={16} className="pf-section-edit" />
              </div>

              <Row icon={<Phone size={16} />} label="Phone">
                {isEditing ? (
                  <input className="pf-input" name="phone" value={form.phone || ""} onChange={handleChange} placeholder="+977 98XXXXXXXX" />
                ) : (
                  <span className="pf-val">{fallback(profile?.phone, "Not added yet")}</span>
                )}
              </Row>

              <Row icon={<MapPin size={16} />} label="Address" align="start">
                {isEditing ? (
                  <input className="pf-input" name="address" value={form.address || ""} onChange={handleChange} placeholder="Kathmandu, Nepal" />
                ) : (
                  <span className="pf-val">{fallback(profile?.address, "Not added yet")}</span>
                )}
              </Row>
            </section>

            <section className="pf-section-card">
              <div className="pf-section-head">
                <div>
                  <span className="pf-section-kicker">Preferences</span>
                  <h2>Travel Preferences</h2>
                </div>
                <Edit2 size={16} className="pf-section-edit" />
              </div>

              <Row icon={<Compass size={16} />} label="Travel Style">
                {isEditing ? (
                  <div className="pf-preference-stack">
                    <div className="pf-style-picker">
                      <input
                        className="pf-input"
                        value={styleInput}
                        onChange={handleTravelStyleInput}
                        onFocus={() => setShowStyleOptions(true)}
                        onBlur={() => {
                          window.setTimeout(() => {
                            commitTravelStyle(styleInput);
                            setShowStyleOptions(false);
                          }, 120);
                        }}
                        placeholder="Select or type your travel style"
                      />
                      {showStyleOptions && filteredStyleOptions.length > 0 && (
                        <div className="pf-style-dropdown">
                          {filteredStyleOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`pf-style-option ${form.travel_style === option ? "is-active" : ""}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                commitTravelStyle(option);
                                setShowStyleOptions(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.travel_style ? (
                      <div className="pf-inline-chip-row">
                        <span className="pf-pill pf-pill-emphasis">{form.travel_style}</span>
                      </div>
                    ) : (
                      <span className="pf-empty">Not set yet</span>
                    )}
                  </div>
                ) : (
                  profile?.travel_style ? (
                    <div className="pf-inline-chip-row">
                      <span className="pf-pill pf-pill-emphasis">{profile.travel_style}</span>
                    </div>
                  ) : (
                    <span className="pf-empty">Not set yet</span>
                  )
                )}
              </Row>

              <Row icon={<MapPin size={16} />} label="Favorite Destinations" align="start">
                {isEditing ? (
                  <div className="pf-preference-stack">
                    <div className="pf-tag-input-wrap">
                      <div className="pf-tag-input">
                        {(form.preferred_destinations || []).map((destination) => (
                          <span key={destination} className="pf-pill pf-pill-tag">
                            {destination}
                            <button
                              type="button"
                              className="pf-pill-remove"
                              onClick={() => removeDestination(destination)}
                              aria-label={`Remove ${destination}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <input
                          className="pf-tag-field"
                          value={destinationInput}
                          onChange={handleDestinationInputChange}
                          onKeyDown={handleDestinationKeyDown}
                          onBlur={() => addDestinations(destinationInput)}
                          placeholder="Add destinations (comma separated)"
                        />
                      </div>
                    </div>
                    <span className="pf-helper">Press comma or Enter to turn each destination into a tag.</span>
                  </div>
                ) : profile?.preferred_destinations?.length > 0 ? (
                  <div className="pf-pills">
                    {profile.preferred_destinations.map((destination) => (
                      <span key={destination} className="pf-pill">{destination}</span>
                    ))}
                  </div>
                ) : (
                  <span className="pf-empty">Not set yet</span>
                )}
              </Row>
            </section>
          </div>

          <div className="pf-column pf-column-side">
            <section className="pf-section-card">
              <div className="pf-section-head">
                <div>
                  <span className="pf-section-kicker">Profile</span>
                  <h2>About</h2>
                </div>
                <Edit2 size={16} className="pf-section-edit" />
              </div>

              {isEditing ? (
                <textarea
                  className="pf-input pf-textarea"
                  name="bio"
                  rows="6"
                  value={form.bio || ""}
                  onChange={handleChange}
                  placeholder="Tell others about your travel style, favorite experiences, and the places you love most."
                />
              ) : (
                <p className={`pf-bio ${!profile?.bio ? "pf-empty" : ""}`}>
                  {profile?.bio || "Not added yet. Add a short bio to make your profile feel more complete."}
                </p>
              )}
            </section>

            <section className="pf-section-card">
              <div className="pf-section-head">
                <div>
                  <span className="pf-section-kicker">Interests</span>
                  <div className="pf-section-title-row">
                    <h2>Travel Interests</h2>
                    {profile?.recent_interests?.length > 0 && <span className="pf-meta-badge">Recent</span>}
                  </div>
                </div>
                <Heart size={16} className="pf-section-edit" />
              </div>

              {profile?.recent_interests?.length > 0 ? (
                <div className="pf-pills pf-interest-pills">
                  {profile.recent_interests.map((interest) => (
                    <span key={interest} className="pf-pill pf-pill-muted">{interest}</span>
                  ))}
                </div>
              ) : (
                <p className="pf-empty-state-copy">No recent planner interests yet</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children, align }) {
  return (
    <div className={`pf-row ${align === "start" ? "pf-row-start" : ""}`}>
      <div className="pf-row-label">
        <span className="pf-row-icon">{icon}</span>
        <span className="pf-label">{label}</span>
      </div>
      <div className="pf-row-value">{children}</div>
    </div>
  );
}
