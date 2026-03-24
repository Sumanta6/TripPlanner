import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getItineraryDetail, deleteItinerary } from "../services/api";
import { MapPin, Calendar, Clock, Wallet, Users, ArrowLeft, Trash2 } from "lucide-react";
import "./TripDetail.css";

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDays, setExpandedDays] = useState({ 0: true });

  useEffect(() => {
    let alive = true;
    async function fetchDetail() {
      try {
        const data = await getItineraryDetail(id);
        if (alive) {
          setTrip(data);
          // Expand first day by default
          if (data?.itinerary_data?.itinerary?.days?.length > 0) {
            setExpandedDays({ 0: true });
          }
        }
      } catch (err) {
        if (alive) setError(err.response?.data?.error || "Failed to load itinerary details.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchDetail();
    return () => { alive = false; };
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this itinerary?")) return;
    try {
      await deleteItinerary(id);
      navigate("/saved-trips", { replace: true });
    } catch (err) {
      alert("Failed to delete. Please try again.");
    }
  };

  const handleBookGuide = () => {
    navigate("/guides", {
      state: {
        itineraryId: id,
        destination: trip.destination,
        trip_start: trip.start_date,
        trip_end: trip.end_date
      }
    });
  };

  const toggleDay = (index) => {
    setExpandedDays((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getActivityIcon = (text) => {
    const lower = String(text || "").toLowerCase();
    if (lower.includes("trek") || lower.includes("hike") || lower.includes("walk")) return "🥾";
    if (lower.includes("temple") || lower.includes("stupa") || lower.includes("heritage")) return "🏛️";
    if (lower.includes("lake") || lower.includes("view") || lower.includes("nature")) return "🏞️";
    if (lower.includes("drive") || lower.includes("flight") || lower.includes("transfer")) return "🚙";
    if (lower.includes("dinner") || lower.includes("lunch") || lower.includes("food")) return "🍽️";
    if (lower.includes("safari") || lower.includes("wildlife")) return "🦏";
    if (lower.includes("adventure") || lower.includes("rafting")) return "⛰️";
    return "✨";
  };

  const getTimelineTimeClass = (timeStr) => {
    const lower = String(timeStr || "").toLowerCase();
    if (lower.includes("morning")) return "time-morning";
    if (lower.includes("afternoon")) return "time-afternoon";
    if (lower.includes("evening") || lower.includes("night")) return "time-evening";
    return "time-default";
  };

  if (loading) {
    return <div className="trip-detail-page flex-center min-h-screen"><div className="loader-spinner"></div></div>;
  }

  if (error || !trip) {
    return (
      <div className="trip-detail-page td-error-state">
        <div className="td-error-card">
          <h2 className="td-error-title">Trip Not Found</h2>
          <p className="td-error-message">{error || "This itinerary might have been deleted or doesn't exist."}</p>
          <button onClick={() => navigate("/saved-trips")} className="lp-btn-primary">View My Trips</button>
        </div>
      </div>
    );
  }

  const itData = trip.itinerary_data || {};
  const daysList = itData.itinerary?.days || [];
  const budgetBreakdown = itData.itinerary?.budget_breakdown || [];
  const tips = itData.itinerary?.travel_tips || [];

  return (
    <div className="trip-detail-page">
      {/* Hero Header */}
      <div className="td-hero">
        <div className="td-hero-bg" style={{ backgroundImage: "url('/images/hero-pokhara.jpg')" }}></div>
        <div className="td-hero-gradient"></div>

        <div className="td-hero-content">
          <button onClick={() => navigate("/saved-trips")} className="td-back-btn">
            <ArrowLeft size={18} /> Back to Saved Trips
          </button>

          <div className="td-badges">
            <span className="td-badge-primary">
              🇳🇵 AI Trip Plan
            </span>
            <span className="td-badge-secondary">
              {trip.days} Days
            </span>
          </div>

          <h1 className="td-hero-title">{trip.destination}</h1>

          <div className="td-hero-stats">
            <div className="td-stat-item"><Calendar size={18} className="td-stat-icon" /> <span>Starts: {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Flexible'}</span></div>
            <div className="td-stat-item"><MapPin size={18} className="td-stat-icon" /> <span>From: {trip.starting_place}</span></div>
            <div className="td-stat-item"><Wallet size={18} className="td-stat-icon" /> <span>Budget: NPR {trip.budget ? Number(trip.budget).toLocaleString() : 'TBD'}</span></div>
            <div className="td-stat-item"><Users size={18} className="td-stat-icon" /> <span>Travelers: {trip.travelers}</span></div>
          </div>
        </div>
      </div>

      <div className="td-main-container">

        {/* Actions Bar */}
        <div className="td-actions-bar setup-animation">
          <div>
            <p className="td-ref-id">Trip Reference ID: #{trip.id}</p>
          </div>
          <div className="td-actions-buttons">
            <button onClick={handleDelete} className="td-delete-btn">
              <Trash2 size={16} /> Delete
            </button>
            <button onClick={handleBookGuide} className="td-book-btn">
              Book a Guide
            </button>
          </div>
        </div>

        {/* Content Tabs / Main layout */}
        <div className="td-content-grid">

          <div className="td-timeline-section">
            <h2 className="td-section-title">Day by Day Plan</h2>

            <div className="td-timeline-wrapper">
              <div className="td-timeline-line"></div>

              {daysList.map((day, index) => {
                const isExpanded = !!expandedDays[index];
                return (
                  <div key={index} className={`td-day-card ${isExpanded ? "expanded" : ""}`}>
                    <div className="td-day-marker">
                      <span>{day.day_number || index + 1}</span>
                    </div>

                    <div className="day-card-content">
                      <div className="day-card-header" onClick={() => toggleDay(index)}>
                        <div className="day-header-titles">
                          <span className="td-day-label">{day.date_label || `Day ${index + 1}`}</span>
                          <h3 className="td-day-title">{day.title}</h3>
                        </div>
                        <div className={`expand-icon ${isExpanded ? "rotated" : ""}`}>▼</div>
                      </div>

                      <div className="td-day-badges">
                        {day.accommodation && <div className="td-day-badge">🏠 {day.accommodation}</div>}
                        {day.meals && <div className="td-day-badge">🥘 {day.meals}</div>}
                      </div>

                      <div className="td-collapse-content" style={{ maxHeight: isExpanded ? "2000px" : "0", padding: isExpanded ? "20px" : "0 20px" }}>
                        <div className="activities-list">
                          {day.activities?.map((act, actIdx) => (
                            <div key={actIdx} className={`activity-block ${getTimelineTimeClass(act.time_of_day)}`}>
                              <div className="activity-time-badge shadow-sm">
                                {act.time_of_day === "Morning" && "🌄"}
                                {act.time_of_day === "Afternoon" && "☀️"}
                                {act.time_of_day === "Evening" && "🌙"}
                                {!["Morning", "Afternoon", "Evening"].includes(act.time_of_day) && act.time_of_day}
                              </div>

                              <div className="activity-details">
                                <h4 className="td-act-title">
                                  <span>{getActivityIcon(act.title)}</span>
                                  {act.title}
                                </h4>
                                <p className="td-act-desc">{act.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {day.local_tips && (
                          <div className="td-local-tip">
                            <span className="td-tip-icon">💡</span>
                            <div>
                              <strong className="td-tip-title">Trip Note</strong>
                              <p className="td-tip-text">{day.local_tips}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="td-sidebar">
            {itData.itinerary?.trip_summary && (
              <div className="td-sidebar-card">
                <h3 className="td-sidebar-title">📝 Overview</h3>
                <p className="td-sidebar-text">{itData.itinerary.trip_summary}</p>
              </div>
            )}

            {budgetBreakdown.length > 0 && (
              <div className="td-sidebar-card">
                <h3 className="td-sidebar-title">💰 Est. Budget</h3>
                <div className="td-budget-list">
                  {budgetBreakdown.map((item, idx) => (
                    <div key={idx} className="td-budget-item">
                      <span className="td-budget-cat">{item.category}</span>
                      <span className="td-budget-amt">NPR {Number(item.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tips.length > 0 && (
              <div className="td-sidebar-card">
                <h3 className="td-sidebar-title">🎒 Tips</h3>
                <ul className="td-tips-list">
                  {tips.map((tip, idx) => (
                    <li key={idx} className="td-tip-item">
                      <span className="td-tip-bullet">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
