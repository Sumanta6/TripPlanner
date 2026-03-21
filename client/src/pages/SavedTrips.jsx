import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Trash2, Users, Wallet, ChevronRight, Compass, Navigation } from "lucide-react";
import { getMyItineraries, deleteItinerary } from "../services/api";
import "./SavedTrips.css";

export default function SavedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    async function fetchTrips() {
      try {
        const data = await getMyItineraries();
        if (alive) {
          setTrips(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        if (alive) {
          setError("Failed to load your saved trips. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchTrips();
    return () => { alive = false; };
  }, []);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this trip itinerary?")) return;

    setIsDeleting(id);
    try {
      await deleteItinerary(id);
      setTrips(trips.filter(t => t.id !== id));
    } catch (err) {
      alert("Failed to delete the trip. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Flexible Dates";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  const getTripStatus = (startDateStr) => {
    if (!startDateStr) return { label: "Planning", class: "status-planning" };
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(startDateStr);
    
    if (start < today) return { label: "Past Trip", class: "status-past" };
    if (start.getTime() === today.getTime()) return { label: "Ongoing", class: "status-ongoing" };
    return { label: "Upcoming", class: "status-upcoming" };
  };

  const renderSkeletons = () => (
    <div className="saved-trips-grid">
      {[1, 2, 3].map(n => (
        <div key={n} className="skeleton-card animate-pulse">
           <div className="skeleton-hero"></div>
           <div className="skeleton-body">
              <div className="skeleton-line medium"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-box"></div>
              <div className="skeleton-btn"></div>
           </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="saved-trips-page">
      <div className="max-w-7xl">
        <div className="saved-trips-header">
          <div className="saved-trips-title">
            <h1>Saved Itineraries</h1>
            <p>Manage your highly-personalized AI trip plans.</p>
          </div>
          <Link to="/plan-trip" className="plan-new-btn">
            ✨ Plan New Trip
          </Link>
        </div>

        {loading ? renderSkeletons() : error ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
            </div>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="plan-new-btn" style={{ backgroundColor: '#64748b' }}>Try Again</button>
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrap">
              <Compass size={40} />
            </div>
            <h2>Your journey begins here</h2>
            <p>
              You haven't saved any itineraries yet. Let our AI craft the perfect, personalized adventure through Nepal for you.
            </p>
            <Link to="/plan-trip" className="plan-new-btn">
              Generate Your First Itinerary
            </Link>
          </div>
        ) : (
          <div className="saved-trips-grid">
            {trips.map(trip => {
              const status = getTripStatus(trip.start_date);
              
              return (
              <div key={trip.id} className="trip-card">
                <div className="trip-card-hero">
                   <div className="trip-card-bg"></div>
                   <div className="trip-card-gradient"></div>
                   
                   <div className={`status-badge ${status.class}`}>
                     {status.label}
                   </div>

                   <div className="trip-card-title-area">
                      <h3 className="trip-card-dest">
                        {trip.destination}
                      </h3>
                      <div className="trip-card-from">
                        <Navigation size={14} /> From {trip.starting_place || 'Kathmandu'}
                      </div>
                   </div>
                </div>
                
                <div className="trip-card-body">
                  {trip.preview && (
                    <p className="trip-preview">
                      "{trip.preview}"
                    </p>
                  )}

                  <div className="trip-stats-grid">
                    <div className="stat-item">
                       <div className="stat-icon"><Calendar size={14} /></div>
                       <div className="stat-text">
                          <span className="stat-label">Date</span>
                          <span className="stat-value" title={formatDate(trip.start_date)}>{formatDate(trip.start_date)}</span>
                       </div>
                    </div>
                    <div className="stat-item">
                       <div className="stat-icon"><Clock size={14} /></div>
                       <div className="stat-text">
                          <span className="stat-label">Duration</span>
                          <span className="stat-value">{trip.days} Days</span>
                       </div>
                    </div>
                    <div className="stat-item">
                       <div className="stat-icon"><Wallet size={14} /></div>
                       <div className="stat-text">
                          <span className="stat-label">Budget</span>
                          <span className="stat-value" title={`NPR ${trip.budget || 'TBD'}`}>NPR {trip.budget ? Number(trip.budget).toLocaleString() : 'TBD'}</span>
                       </div>
                    </div>
                    <div className="stat-item">
                       <div className="stat-icon"><Users size={14} /></div>
                       <div className="stat-text">
                          <span className="stat-label">Travelers</span>
                          <span className="stat-value">{trip.travelers} Pax</span>
                       </div>
                    </div>
                  </div>

                  <div className="trip-card-actions">
                    <button 
                       onClick={() => navigate(`/trips/${trip.id}`)}
                       className="btn-view"
                    >
                      View Trip <ChevronRight size={16} />
                    </button>
                    <button 
                       onClick={() => navigate(`/guides`, { state: { itineraryId: trip.id, destination: trip.destination, trip_start: trip.start_date, trip_end: trip.end_date } })}
                       className="btn-guide"
                    >
                      Find Guide
                    </button>
                    <button 
                       onClick={(e) => handleDelete(trip.id, e)}
                       disabled={isDeleting === trip.id}
                       className="btn-delete"
                       title="Delete Trip"
                    >
                      {isDeleting === trip.id ? <div className="st-spinner"></div> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
