import React, { useState } from "react";
import Layout from "../components/Layout";
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
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    travelers: "2",
    budget: 50000,
    travelStyle: "",
    interests: [],
  });

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

  return (
    <Layout>
      {/* HERO */}
      <section className="plantrip-hero">
        <h1>Plan Your Perfect Trip</h1>
        <p>
          Tell us about your dream vacation and we’ll create a personalized
          itinerary for Nepal 🇳🇵
        </p>
      </section>

      {/* STEPS */}
      <div className="plantrip-steps">
        {["Basics", "Preferences", "Confirm"].map((label, index) => (
          <div
            key={label}
            className={`step ${step === index + 1 ? "active" : ""}`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      <div className="plantrip-container">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="card">
            <h2>Trip Basics</h2>

            <label>Destination</label>
            <select
              value={formData.destination}
              onChange={(e) =>
                setFormData({ ...formData, destination: e.target.value })
              }
            >
              <option value="">Select destination</option>
              {NEPAL_DESTINATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <div className="grid-2">
              <div>
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label>End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            {duration > 0 && (
              <p className="highlight">Duration: {duration} days</p>
            )}

            <button
              className="primary"
              disabled={!formData.destination}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="card">
            <h2>Your Preferences</h2>

            <label>Travel Style</label>
            <div className="chip-group">
              {TRAVEL_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`chip ${
                    formData.travelStyle === s.id ? "selected" : ""
                  }`}
                  onClick={() =>
                    setFormData({ ...formData, travelStyle: s.id })
                  }
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            <label>Interests</label>
            <div className="chip-group">
              {INTERESTS.map((i) => (
                <button
                  key={i.id}
                  className={`chip ${
                    formData.interests.includes(i.id) ? "selected" : ""
                  }`}
                  onClick={() => toggleInterest(i.id)}
                >
                  {i.icon} {i.label}
                </button>
              ))}
            </div>

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
            />
            <p className="highlight">
              NPR {Number(formData.budget).toLocaleString()}
            </p>

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="primary" onClick={() => setStep(3)}>
                Review
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card">
            <h2>Confirm Your Trip</h2>

            <ul className="summary">
              <li><strong>Destination:</strong> {formData.destination}</li>
              <li><strong>Dates:</strong> {formData.startDate} → {formData.endDate}</li>
              <li><strong>Travel Style:</strong> {formData.travelStyle}</li>
              <li>
                <strong>Budget:</strong> NPR{" "}
                {Number(formData.budget).toLocaleString()}
              </li>
            </ul>

            <div className="btn-row">
              <button className="secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="primary">Generate Itinerary</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Plantrip;
