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
];

const TRAVEL_STYLES = [
  { id: "trekking", label: "Trekking", icon: "🥾" },
  { id: "nature", label: "Nature & Mountains", icon: "🏔️" },
  { id: "culture", label: "Cultural & Heritage", icon: "🏛️" },
  { id: "wildlife", label: "Wildlife Safari", icon: "🦏" },
  { id: "religious", label: "Religious Tour", icon: "🛕" },
  { id: "relax", label: "Relaxation", icon: "🏞️" },
];

const INTERESTS = [
  { id: "mountains", label: "Mountains", icon: "🏔️" },
  { id: "temples", label: "Temples", icon: "🛕" },
  { id: "wildlife", label: "Wildlife", icon: "🦏" },
  { id: "lakes", label: "Lakes", icon: "🏞️" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "culture", label: "Local Culture", icon: "🏠" },
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

  // UX Enhancement States
  const [validationErrors, setValidationErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(() => {
    const saved = localStorage.getItem("plantrip_itinerary");
    return saved ? JSON.parse(saved) : null;
  });
  const resultsRef = useRef(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("plantrip_step", step.toString());
  }, [step]);

  useEffect(() => {
    localStorage.setItem("plantrip_formData", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (itinerary) {
      localStorage.setItem("plantrip_itinerary", JSON.stringify(itinerary));
    }
  }, [itinerary]);

  const toggleInterest = (id) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
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

  // Validation Functions
  const validateStep1 = () => {
    const errors = {};
    if (!formData.destination) {
      errors.destination = "Please select a destination";
    }
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      errors.endDate = "End date is required";
    }
    if (
      formData.endDate &&
      formData.startDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
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

  // Generate Itinerary Handler
  const handleGenerateItinerary = async () => {
    setIsGenerating(true);

    // Simulate API call - Replace with actual backend call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock itinerary data - Replace with actual API response
    const mockItinerary = {
      days: [
        {
          date: formData.startDate,
          activities: [
            {
              time: "09:00 AM",
              title: "Arrival & Hotel Check-in",
              description: "Arrive at the destination and check into your hotel. Rest and freshen up.",
            },
            {
              time: "02:00 PM",
              title: "Local Market Exploration",
              description: "Explore the local markets and get a feel for the culture.",
            },
            {
              time: "07:00 PM",
              title: "Welcome Dinner",
              description: "Enjoy traditional Nepali cuisine at a local restaurant.",
            },
          ],
        },
        {
          date: new Date(new Date(formData.startDate).getTime() + 86400000).toISOString().split('T')[0],
          activities: [
            {
              time: "08:00 AM",
              title: "Breakfast at Hotel",
              description: "Start your day with a hearty breakfast.",
            },
            {
              time: "10:00 AM",
              title: "Heritage Site Visit",
              description: "Visit UNESCO World Heritage sites and learn about the rich history.",
            },
            {
              time: "03:00 PM",
              title: "Scenic Viewpoint",
              description: "Head to a scenic viewpoint for breathtaking mountain views.",
            },
          ],
        },
      ],
    };

    setItinerary(mockItinerary);
    setIsGenerating(false);

    // Smooth scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Clear form and start fresh
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
    setValidationErrors({});
    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");
  };

  return (
    <>
      {/* HERO */}
      <section className="plantrip-hero">
        <div className="hero-badge">✨ AI-Powered Trip Planning</div>
        <h1>Plan Your Perfect Nepal Adventure</h1>
        <p>
          Tell us about your dream vacation and we'll create a personalized
          itinerary just for you 🇳🇵
        </p>
        {(step > 1 || formData.destination || itinerary) && (
          <button className="restart-btn" onClick={clearForm}>
            🔄 Start Fresh
          </button>
        )}
      </section>

      {/* ENHANCED STEP INDICATOR */}
      <div className="plantrip-steps">
        {["Basics", "Preferences", "Confirm"].map((label, index) => (
          <div
            key={label}
            className={`step ${step === index + 1 ? "active" : ""} ${step > index + 1 ? "completed" : ""
              }`}
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
            <h2>Trip Basics</h2>
            <p className="card-subtitle">Let's start with the essentials</p>

            <div className="form-group">
              <label>Destination *</label>
              <select
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                className={validationErrors.destination ? "error" : ""}
              >
                <option value="">Select your destination</option>
                {NEPAL_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {validationErrors.destination && (
                <span className="error-message">
                  ⚠️ {validationErrors.destination}
                </span>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className={validationErrors.startDate ? "error" : ""}
                  min={new Date().toISOString().split('T')[0]}
                />
                {validationErrors.startDate && (
                  <span className="error-message">
                    ⚠️ {validationErrors.startDate}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className={validationErrors.endDate ? "error" : ""}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
                {validationErrors.endDate && (
                  <span className="error-message">
                    ⚠️ {validationErrors.endDate}
                  </span>
                )}
              </div>
            </div>

            {duration > 0 && (
              <div className="info-box">
                <span className="info-icon">📅</span>
                <span>Your trip duration: <strong>{duration} days</strong></span>
              </div>
            )}

            <button
              className="primary"
              onClick={handleContinueStep1}
            >
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
                    className={`chip ${formData.travelStyle === s.id ? "selected" : ""
                      }`}
                    onClick={() =>
                      setFormData({ ...formData, travelStyle: s.id })
                    }
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
                    className={`chip ${formData.interests.includes(i.id) ? "selected" : ""
                      }`}
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
                onChange={(e) =>
                  setFormData({ ...formData, budget: e.target.value })
                }
                className="slider"
              />
              <div className="budget-display">
                NPR {Number(formData.budget).toLocaleString()}
              </div>
            </div>

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="primary" onClick={() => setStep(3)}>
                Review Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card">
            <h2>Review Your Trip</h2>
            <p className="card-subtitle">Make sure everything looks good</p>

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
                  <div className="summary-value">
                    {formData.startDate} → {formData.endDate}
                  </div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">⏱️</span>
                <div>
                  <div className="summary-label">Duration</div>
                  <div className="summary-value">{duration} days</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">💰</span>
                <div>
                  <div className="summary-label">Budget</div>
                  <div className="summary-value">
                    NPR {Number(formData.budget).toLocaleString()}
                  </div>
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
                      {formData.interests.map(id =>
                        INTERESTS.find(i => i.id === id)?.label
                      ).join(", ")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                className="primary"
                onClick={handleGenerateItinerary}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner"></span>
                    Generating Your Itinerary...
                  </>
                ) : (
                  "🎯 Generate My Itinerary"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ITINERARY RESULTS */}
        {itinerary && (
          <div ref={resultsRef} className="itinerary-results">
            <div className="results-header">
              <h2>Your Personalized Itinerary</h2>
              <p>A day-by-day guide to your perfect {formData.destination} adventure</p>
            </div>

            {itinerary.days.map((day, index) => (
              <div key={index} className="day-card">
                <div className="day-header">
                  <div className="day-number">Day {index + 1}</div>
                  <div className="day-date">{day.date}</div>
                </div>

                <div className="day-activities">
                  {day.activities.map((activity, i) => (
                    <div key={i} className="activity-item">
                      <div className="activity-time">{activity.time}</div>
                      <div className="activity-content">
                        <h4>{activity.title}</h4>
                        <p>{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="results-actions">
              <button className="primary">Save Itinerary</button>
              <button className="secondary">Download PDF</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Plantrip;
