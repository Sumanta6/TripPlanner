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
      <div className="trip-detail-page min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Trip Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "This itinerary might have been deleted or doesn't exist."}</p>
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
    <div className="trip-detail-page min-h-screen bg-slate-50 pt-20 pb-20">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white relative">
        <div className="absolute inset-0 bg-[url('/images/hero-pokhara.jpg')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
        
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 relative z-10">
          <button onClick={() => navigate("/saved-trips")} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-6">
             <ArrowLeft size={18} /> Back to Saved Trips
          </button>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              🇳🇵 AI Trip Plan
            </span>
            <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              {trip.days} Days
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{trip.destination}</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-200 text-sm">
             <div className="flex items-center gap-2"><Calendar size={18} className="text-teal-400"/> <span>Starts: {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Flexible'}</span></div>
             <div className="flex items-center gap-2"><MapPin size={18} className="text-teal-400"/> <span>From: {trip.starting_place}</span></div>
             <div className="flex items-center gap-2"><Wallet size={18} className="text-teal-400"/> <span>Budget: NPR {trip.budget ? Number(trip.budget).toLocaleString() : 'TBD'}</span></div>
             <div className="flex items-center gap-2"><Users size={18} className="text-teal-400"/> <span>Travelers: {trip.travelers}</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Actions Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4 mb-8 setup-animation">
           <div>
              <p className="text-sm text-slate-500 font-medium">Trip Reference ID: #{trip.id}</p>
           </div>
           <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={handleDelete} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors bg-white font-medium text-sm">
                <Trash2 size={16}/> Delete
              </button>
              <button onClick={handleBookGuide} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm">
                Book a Guide
              </button>
           </div>
        </div>

        {/* Content Tabs / Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Day by Day Plan</h2>
              
              <div className="timeline-wrapper pt-0 bg-transparent">
                  <div className="timeline-line hidden md:block" style={{ left: '2rem' }}></div>
                  
                  {daysList.map((day, index) => {
                    const isExpanded = !!expandedDays[index];
                    return (
                      <div key={index} className={`timeline-day-card bg-white !ml-0 md:!ml-12 ${isExpanded ? "expanded" : ""}`}>
                        <div className="timeline-marker hidden md:flex" style={{ left: '-3rem' }}>
                          <span>{day.day_number || index + 1}</span>
                        </div>

                        <div className="day-card-content">
                          <div className="day-card-header" onClick={() => toggleDay(index)}>
                            <div className="day-header-titles">
                              <span className="day-label text-teal-600 font-bold">{day.date_label || `Day ${index + 1}`}</span>
                              <h3 className="day-title text-lg text-slate-800 font-bold mt-1">{day.title}</h3>
                            </div>
                            <div className={`expand-icon text-slate-400 ${isExpanded ? "rotated" : ""}`}>▼</div>
                          </div>

                          <div className="day-badges-row gap-2 mt-4 px-5">
                            {day.accommodation && <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1">🏠 {day.accommodation}</div>}
                            {day.meals && <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1">🥘 {day.meals}</div>}
                          </div>

                          <div className="day-collapsible-content border-t border-slate-100 mt-4" style={{ maxHeight: isExpanded ? "2000px" : "0", padding: isExpanded ? "20px" : "0 20px" }}>
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
                                    <h4 className="text-slate-800 font-semibold mb-1 flex items-center gap-2">
                                      <span>{getActivityIcon(act.title)}</span>
                                      {act.title}
                                    </h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{act.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {day.local_tips && (
                              <div className="bg-amber-50 rounded-lg p-4 mt-6 border border-amber-100 flex gap-3">
                                <span className="text-amber-500 mt-0.5">💡</span>
                                <div>
                                  <strong className="text-amber-800 text-sm block mb-1">Trip Note</strong>
                                  <p className="text-amber-700/80 text-sm">{day.local_tips}</p>
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
           <div className="space-y-6">
              {itData.itinerary?.trip_summary && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">📝 Overview</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{itData.itinerary.trip_summary}</p>
                </div>
              )}

              {budgetBreakdown.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">💰 Est. Budget</h3>
                  <div className="space-y-3">
                    {budgetBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{item.category}</span>
                        <span className="font-semibold text-slate-800">NPR {Number(item.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tips.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🎒 Tips</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-teal-500 mt-1">•</span>
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
