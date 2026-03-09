import React, { useState, useRef, useEffect } from "react";
import "./Plantrip.css";

const NEPAL_DESTINATIONS = [
  "Kathmandu Valley",
  "Pokhara",
  "Chitwan National Park",
  "Lumbini",
  "Everest Base Camp",
  "Annapurna Base Camp",
  "Langtang",
  "Mustang",
  "Rara Lake",
  "Manaslu Circuit",
  "Upper Mustang",
  "Ghorepani Poon Hill",
];

const TRAVEL_STYLES = [
  { id: "trekking", label: "Trekking", icon: "🥾" },
  { id: "nature", label: "Nature & Mountains", icon: "🏔️" },
  { id: "culture", label: "Cultural & Heritage", icon: "🏛️" },
  { id: "wildlife", label: "Wildlife Safari", icon: "🦏" },
  { id: "religious", label: "Spiritual Tour", icon: "🛕" },
  { id: "relax", label: "Relaxation", icon: "🏞️" },
];

// Mock Guide Data for the new Find Guide feature
const MOCK_GUIDES = [
  {
    id: 1,
    name: "Ramesh Thapa",
    specialization: "Trekking & Mountain Expeditions",
    destinations: ["Everest Region", "Annapurna", "Langtang"],
    experience: "8 Years",
    rating: 4.9,
    reviews: 142,
    avatar: "👨🏽‍🌾"
  },
  {
    id: 2,
    name: "Sita Sharma",
    specialization: "Cultural & Heritage Tours",
    destinations: ["Kathmandu Valley", "Lumbini", "Bhaktapur"],
    experience: "5 Years",
    rating: 4.8,
    reviews: 98,
    avatar: "👩🏽‍🏫"
  },
  {
    id: 3,
    name: "Pasang Sherpa",
    specialization: "Peak Climbing & High Altitude",
    destinations: ["Everest Base Camp", "Manaslu"],
    experience: "12 Years",
    rating: 5.0,
    reviews: 215,
    avatar: "🧑🏽‍🏔️"
  }
];

const INTERESTS = [
  { id: "mountains", label: "Mountains", icon: "🏔️" },
  { id: "temples", label: "Temples", icon: "🛕" },
  { id: "wildlife", label: "Wildlife", icon: "🦏" },
  { id: "lakes", label: "Lakes", icon: "🏞️" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "culture", label: "Local Culture", icon: "🏠" },
  { id: "food", label: "Food & Cuisine", icon: "🍜" },
  { id: "adventure", label: "Adventure", icon: "⛰️" },
];

function Plantrip() {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("plantrip_step");
    return saved ? parseInt(saved) : 1;
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("plantrip_formData");
    return saved ? JSON.parse(saved) : {
      destination: "",
      startDate: "",
      endDate: "",
      travelers: "2",
      budget: 50000,
      travelStyle: "",
      interests: [],
    };
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuides, setShowGuides] = useState(false); // New state for guides

  const [itinerary, setItinerary] = useState(() => {
    const saved = localStorage.getItem("plantrip_itinerary");
    return saved ? JSON.parse(saved) : null;
  });

  const [generationError, setGenerationError] = useState(null);
  const resultsRef = useRef(null);

  // State for expanded timeline cards
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    localStorage.setItem("plantrip_step", step.toString());
  }, [step]);

  useEffect(() => {
    localStorage.setItem("plantrip_formData", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (itinerary) {
      localStorage.setItem("plantrip_itinerary", JSON.stringify(itinerary));
      // Auto-expand the first day by default
      if (itinerary.itinerary?.days?.length > 0 && !showSuccess) {
        setExpandedDays({ 0: true });
      }
    }
  }, [itinerary, showSuccess]);

  const toggleInterest = (id) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const toggleDay = (index) => {
    setExpandedDays(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const duration =
    formData.startDate && formData.endDate
      ? Math.max(
        0,
        Math.ceil(
          (new Date(formData.endDate) - new Date(formData.startDate)) /
          (1000 * 60 * 60 * 24)
        )
      )
      : 0;

  const validateStep1 = () => {
    const errors = {};
    if (!formData.destination) errors.destination = "Please select a destination";
    if (!formData.startDate) errors.startDate = "Start date is required";
    if (!formData.endDate) errors.endDate = "End date is required";
    if (formData.endDate && formData.startDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = "End date must be after start date";
    }
    return errors;
  };

  const handleContinueStep1 = () => {
    const errors = validateStep1();
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep(2);
      setValidationErrors({});
    }
  };

  const handleGenerateItinerary = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setShowSuccess(false);

    try {
      const response = await fetch("http://localhost:8000/api/itinerary/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: formData.destination,
          days: duration,
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: formData.budget,
          travelStyle: formData.travelStyle,
          interests: formData.interests,
          travelers: formData.travelers,
        }),
      });

      const data = await response.json();

      if (response.ok && data.itinerary) {
        setItinerary(data);
        setShowSuccess(true);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          // Show guides after a short delay for dramatic effect
          setTimeout(() => setShowGuides(true), 1500);
        }, 100);
      } else {
        setGenerationError(data.error || "Failed to generate itinerary. Please try again.");
      }
    } catch (err) {
      setGenerationError("Network error. Please ensure the server is running on port 8000.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveItinerary = () => {
    // Add logic to save to user profile when backend is ready
    alert("Itinerary saved to your profile! (Coming soon)");
  };

  const clearForm = () => {
    setStep(1);
    setFormData({
      destination: "",
      startDate: "",
      endDate: "",
      travelers: "2",
      budget: 50000,
      travelStyle: "",
      interests: [],
    });
    setItinerary(null);
    setGenerationError(null);
    setValidationErrors({});
    setExpandedDays({});
    setShowSuccess(false);
    setShowGuides(false);
    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");
  };

  // Helper to format time-of-day specific classes
  const getTimeClass = (timeStr) => {
    if (!timeStr) return 'time-default';
    const lower = timeStr.toLowerCase();
    if (lower.includes('morning')) return 'time-morning';
    if (lower.includes('afternoon')) return 'time-afternoon';
    if (lower.includes('evening') || lower.includes('night')) return 'time-evening';
    return 'time-default';
  };

  // Helper for activity icons
  const getActivityIcon = (title) => {
    if (!title) return '✨';
    const lower = title.toLowerCase();
    if (lower.includes('trek') || lower.includes('hike') || lower.includes('walk')) return '🥾';
    if (lower.includes('temple') || lower.includes('stupa') || lower.includes('cultural')) return '🏛️';
    if (lower.includes('flight') || lower.includes('drive') || lower.includes('transfer')) return '🚙';
    if (lower.includes('meal') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast')) return '🥘';
    if (lower.includes('rest') || lower.includes('relax')) return '☕';
    return '✨';
  };

  return (
    <>
      {/* HERO */}
      <section className="plantrip-hero lp-hero" style={{ minHeight: '400px', height: 'auto', paddingBottom: '60px' }}>
        <div className="lp-hero-bg fade-in" style={{ backgroundImage: "url('/images/hero-pokhara.jpg')" }} />
        <div className="lp-hero-overlay" style={{ background: 'linear-gradient(180deg, rgba(6,23,41,0.85) 0%, rgba(6,23,41,0.6) 100%)' }}></div>
        <div className="lp-hero-content pt-nav" style={{ maxWidth: '800px' }}>
          <div className="lp-section-badge" style={{ borderColor: 'rgba(0,180,216,0.5)', color: 'var(--teal-light)', background: 'rgba(0,180,216,0.1)' }}>✨ AI-Powered Planning</div>
          <h1 className="lp-hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>Design Your Perfect Trip</h1>
          <p className="lp-hero-sub mx-auto text-white">
            Tell us about your dream vacation and our AI guide will craft a
            personalized itinerary just for you 🇳🇵
          </p>
        </div>
      </section>

      {/* STEP INDICATOR */}
      <div className="plantrip-steps">
        {["Basics", "Preferences", "Confirm"].map((label, index) => (
          <div
            key={label}
            className={`step ${step === index + 1 ? "active" : ""} ${step > index + 1 ? "completed" : ""}`}
          >
            <div className="step-circle">
              {step > index + 1 ? "✓" : index + 1}
            </div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="plantrip-container">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="card">
            <div className="card-header-flex">
              <div>
                <h2>Trip Basics</h2>
                <p className="card-subtitle">Let's start with the essentials</p>
              </div>
              {(formData.destination || duration > 0) && (
                <button className="clear-btn" onClick={clearForm}>
                  🧹 Clear
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Destination *</label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className={validationErrors.destination ? "error" : ""}
              >
                <option value="">Select your destination</option>
                {NEPAL_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {validationErrors.destination && (
                <span className="error-message">⚠️ {validationErrors.destination}</span>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={validationErrors.startDate ? "error" : ""}
                  min={new Date().toISOString().split('T')[0]}
                />
                {validationErrors.startDate && (
                  <span className="error-message">⚠️ {validationErrors.startDate}</span>
                )}
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={validationErrors.endDate ? "error" : ""}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
                {validationErrors.endDate && (
                  <span className="error-message">⚠️ {validationErrors.endDate}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Number of Travelers</label>
              <select
                value={formData.travelers}
                onChange={(e) => setFormData({ ...formData, travelers: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "traveler" : "travelers"}</option>
                ))}
              </select>
            </div>

            {duration > 0 && (
              <div className="info-box">
                <span className="info-icon">📅</span>
                <span>Your trip duration: <strong>{duration} day{duration > 1 ? 's' : ''}</strong></span>
              </div>
            )}

            <button className="primary" onClick={handleContinueStep1}>
              Continue to Preferences →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="card">
            <h2>Your Preferences</h2>
            <p className="card-subtitle">Customize your travel experience</p>

            <div className="form-group">
              <label>Travel Style</label>
              <div className="chip-group">
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${formData.travelStyle === s.id ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, travelStyle: s.id })}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Interests (Select multiple)</label>
              <div className="chip-group">
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    className={`chip ${formData.interests.includes(i.id) ? "selected" : ""}`}
                    onClick={() => toggleInterest(i.id)}
                  >
                    <span className="chip-icon">{i.icon}</span>
                    <span>{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Budget (NPR)</label>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="slider"
              />
              <div className="budget-display">
                NPR {Number(formData.budget).toLocaleString()}
                <span className="budget-label">
                  {parseInt(formData.budget) < 20000 ? " · Backpacking" :
                    parseInt(formData.budget) < 60000 ? " · Budget" :
                      parseInt(formData.budget) < 150000 ? " · Standard" : " · Luxury"}
                </span>
              </div>
            </div>

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="primary" onClick={() => setStep(3)}>Review Details →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card">
            <h2>Review Your Trip</h2>
            <p className="card-subtitle">Make sure everything looks good before we generate</p>

            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-icon">📍</span>
                <div>
                  <div className="summary-label">Destination</div>
                  <div className="summary-value">{formData.destination}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">📅</span>
                <div>
                  <div className="summary-label">Travel Dates</div>
                  <div className="summary-value">{formData.startDate} → {formData.endDate}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">⏱️</span>
                <div>
                  <div className="summary-label">Duration</div>
                  <div className="summary-value">{duration} day{duration > 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">👥</span>
                <div>
                  <div className="summary-label">Travelers</div>
                  <div className="summary-value">{formData.travelers}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">💰</span>
                <div>
                  <div className="summary-label">Budget</div>
                  <div className="summary-value">NPR {Number(formData.budget).toLocaleString()}</div>
                </div>
              </div>

              {formData.travelStyle && (
                <div className="summary-item">
                  <span className="summary-icon">✈️</span>
                  <div>
                    <div className="summary-label">Travel Style</div>
                    <div className="summary-value">
                      {TRAVEL_STYLES.find((s) => s.id === formData.travelStyle)?.label}
                    </div>
                  </div>
                </div>
              )}

              {formData.interests.length > 0 && (
                <div className="summary-item full-width">
                  <span className="summary-icon">❤️</span>
                  <div>
                    <div className="summary-label">Interests</div>
                    <div className="summary-value">
                      {formData.interests.map(id => INTERESTS.find(i => i.id === id)?.label).join(", ")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {generationError && (
              <div className="generation-error">
                <span>⚠️</span> {generationError}
              </div>
            )}

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(2)}>← Back</button>
              <button
                className="primary generate-btn"
                onClick={handleGenerateItinerary}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner"></span>
                    AI is crafting your itinerary...
                  </>
                ) : (
                  "🎯 Generate My Itinerary"
                )}
              </button>
            </div>

            {isGenerating && (
              <div className="generating-hint">
                <p>🤖 Our AI Nepal travel guide is personalizing your trip. This may take 10–20 seconds...</p>
              </div>
            )}
          </div>
        )}

        {/* AI ITINERARY RESULTS (TIMELINE UI) */}
        {itinerary && itinerary.itinerary && (
          <div ref={resultsRef} className="itinerary-timeline-container">

            {/* Success Confirmation Animation */}
            {showSuccess && (
              <div className="success-banner pop-in">
                <div className="success-content">
                  <span className="success-icon">✅</span>
                  <div>
                    <h3 className="success-title">Itinerary Generated Successfully!</h3>
                    <p className="success-text">Your perfect {itinerary.destination} adventure is ready below.</p>
                  </div>
                </div>
                <button className="success-ok-btn" onClick={() => setShowSuccess(false)}>
                  OK
                </button>
              </div>
            )}

            {/* Summary Header */}
            <div className={`timeline-header-card ${showSuccess ? 'hide' : 'slide-up'}`}>
              <div className="results-badge">🇳🇵 AI-Generated Itinerary</div>
              <h2>Your {itinerary.destination} Adventure</h2>
              <div className="results-meta">
                <span>📅 {duration} Days</span>
                <span>💰 NPR {Number(itinerary.budget).toLocaleString()}</span>
              </div>

              {itinerary.itinerary.trip_summary && (
                <p className="trip-overview-text">
                  {itinerary.itinerary.trip_summary}
                </p>
              )}
            </div>

            {/* Vertical Timeline */}
            <div className={`timeline-wrapper ${showSuccess ? 'hide' : 'slide-up'}`}>
              <div className="timeline-line"></div>

              {itinerary.itinerary.days?.map((day, index) => {
                const isExpanded = !!expandedDays[index];

                return (
                  <div key={index} className={`timeline-day-card ${isExpanded ? 'expanded' : ''}`}>
                    {/* Day Marker Bubble */}
                    <div className="timeline-marker">
                      <span>{day.day_number || index + 1}</span>
                    </div>

                    <div className="day-card-content">
                      {/* Clickable Header */}
                      <div className="day-card-header" onClick={() => toggleDay(index)}>
                        <div className="day-header-titles">
                          <span className="day-label">{day.date_label || `Day ${index + 1}`}</span>
                          <h3 className="day-title">{day.title}</h3>
                        </div>
                        <div className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                          ▼
                        </div>
                      </div>

                      {/* Quick Summary Badges (Always Visible) */}
                      <div className="day-badges-row">
                        {day.altitude && (
                          <div className="day-badge tooltip-container">
                            🏔️ {day.altitude}
                            <span className="tooltip">Current Altitude</span>
                          </div>
                        )}
                        {day.accommodation && (
                          <div className="day-badge tooltip-container">
                            🏠 Stay Details
                            <span className="tooltip">{day.accommodation}</span>
                          </div>
                        )}
                        {day.meals && (
                          <div className="day-badge tooltip-container">
                            🥘 Meals
                            <span className="tooltip">{day.meals}</span>
                          </div>
                        )}
                      </div>

                      {/* Collapsible Content */}
                      <div className="day-collapsible-content" style={{ maxHeight: isExpanded ? '2000px' : '0' }}>
                        <div className="activities-list">
                          {day.activities?.map((act, actIdx) => (
                            <div key={actIdx} className={`activity-block ${getTimeClass(act.time_of_day)}`}>
                              <div className="activity-time-badge">
                                {act.time_of_day === 'Morning' && '🌄'}
                                {act.time_of_day === 'Afternoon' && '☀️'}
                                {act.time_of_day === 'Evening' && '🌙'}
                                {(!act.time_of_day || (!act.time_of_day.includes('Morning') && !act.time_of_day.includes('Afternoon') && !act.time_of_day.includes('Evening'))) && act.time_of_day}
                              </div>
                              <div className="activity-details">
                                <h4>
                                  <span className="activity-icon">{getActivityIcon(act.title)}</span>
                                  {act.title}
                                </h4>
                                <p>{act.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Local Tip Box */}
                        {day.local_tips && (
                          <div className="local-tip-box">
                            <span className="tip-icon">💡</span>
                            <div>
                              <strong>Local Guide's Tip:</strong>
                              <p>{day.local_tips}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Travel Tips & Budget Footer */}
            <div className={`timeline-footer-grid ${showSuccess ? 'hide' : 'slide-up'}`}>
              {itinerary.itinerary.budget_breakdown && (
                <div className="footer-card budget-card">
                  <h3>💰 Budget Allocation</h3>
                  <ul className="budget-list">
                    {itinerary.itinerary.budget_breakdown.map((item, idx) => (
                      <li key={idx}>
                        <span>{item.category}</span>
                        <strong>NPR {Number(item.amount).toLocaleString()}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.itinerary.travel_tips && (
                <div className="footer-card tips-card">
                  <h3>🎒 Essential Tips</h3>
                  <ul className="tips-list">
                    {itinerary.itinerary.travel_tips.map((tip, idx) => (
                      <li key={idx}>✓ {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={`results-actions clean-actions ${showSuccess ? 'hide' : 'slide-up'}`}>
              <button className="lp-btn-outline-dark" onClick={clearForm}>
                <span className="btn-icon">🔄</span> Plan Another Trip
              </button>
              <button className="lp-btn-primary save-btn" onClick={handleSaveItinerary}>
                <span className="btn-icon">💾</span> Save Itinerary
              </button>
            </div>

            {/* FIND GUIDE SECTION */}
            {showGuides && (
              <div className="find-guide-section slide-up mt-12 mb-12">
                <div className="text-center mb-8">
                  <span className="lp-section-badge">Local Experts</span>
                  <h2 className="lp-section-title" style={{ fontSize: '2rem' }}>Match with a Guide</h2>
                  <p className="lp-section-sub mx-auto">
                    Enhance your {itinerary.destination} trip with a verified local expert.
                  </p>
                </div>

                <div className="guide-match-grid">
                  {MOCK_GUIDES.filter(g =>
                    /* Simplified mock matching logic */
                    g.destinations.some(d => formData.destination.includes(d.split(' ')[0])) || true
                  ).slice(0, 3).map(guide => (
                    <div key={guide.id} className="lp-dest-card guide-match-card">
                      <div className="guide-card-header">
                        <div className="guide-avatar-large">{guide.avatar}</div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--navy)' }}>{guide.name}</h3>
                          <span style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 600 }}>{guide.specialization}</span>
                        </div>
                      </div>

                      <div className="guide-card-stats grid-2" style={{ gap: '10px', marginTop: '16px', marginBottom: '16px' }}>
                        <div className="g-stat" style={{ background: 'var(--bg-light)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Experience</div>
                          <strong style={{ color: 'var(--navy)' }}>{guide.experience}</strong>
                        </div>
                        <div className="g-stat" style={{ background: 'var(--bg-light)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>Rating</div>
                          <strong style={{ color: 'var(--gold)' }}>⭐ {guide.rating} </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>({guide.reviews})</span>
                        </div>
                      </div>

                      <div className="g-dests" style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '20px' }}>
                        <strong>Covers:</strong> {guide.destinations.join(" • ")}
                      </div>

                      <button className="lp-btn-outline-dark" style={{ width: '100%', justifyContent: 'center' }} onClick={() => alert(`Request sent to ${guide.name}! They will contact you shortly.`)}>
                        Request Guide
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}

export default Plantrip;
