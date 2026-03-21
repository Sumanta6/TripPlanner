import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, User, CheckCircle2, AlertCircle, Clock, XCircle, ArrowRight, Eye, Bell } from "lucide-react";
import { getMyBookedTrips } from "../services/api";
import "./MyTrips.css";

export default function MyTrips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    async function fetchBookings() {
      try {
        const data = await getMyBookedTrips();
        if (alive) {
          setBookings(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        if (alive) {
          setError("Failed to load your bookings. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchBookings();
    return () => { alive = false; };
  }, []);

  const recentUpdates = React.useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      if (b.status !== 'active' && b.status !== 'rejected') return false;
      const updated = new Date(b.updated_at);
      const hoursDiff = (now - updated) / (1000 * 60 * 60);
      return hoursDiff < 72; // updated within 3 days
    }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);
  }, [bookings]);

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Response', icon: <Clock size={14}/>, class: 'pending' };
      case 'accepted':
        return { label: 'Guide Accepted', icon: <CheckCircle2 size={14}/>, class: 'active' };
      case 'active':
        return { label: 'Trip in Progress', icon: <CheckCircle2 size={14}/>, class: 'active' };
      case 'rejected':
        return { label: 'Declined', icon: <XCircle size={14}/>, class: 'rejected' };
      case 'auto_rejected':
        return { label: 'System Declined', icon: <XCircle size={14}/>, class: 'rejected' };
      case 'completed':
        return { label: 'Trip Completed', icon: <CheckCircle2 size={14}/>, class: 'completed' };
      case 'cancelled':
        return { label: 'Cancelled', icon: <XCircle size={14}/>, class: 'rejected' };
      default:
        return { label: status, icon: <AlertCircle size={14}/>, class: 'pending' };
    }
  };

  const renderSkeletons = () => (
    <div className="mt-list">
      {[1, 2].map(n => (
        <div key={n} className="mt-skeleton mt-animate-pulse">
           <div className="skeleton-line medium"></div>
           <div className="skeleton-line short"></div>
           <div className="skeleton-box"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="my-trips-page">
      <div className="mt-max-w">
        <div className="mt-header">
          <div className="mt-title">
            <h1>My Bookings</h1>
            <p>Track your guide requests and upcoming active trips.</p>
          </div>
          <Link to="/saved-trips" className="mt-btn-outline" style={{ backgroundColor: 'white' }}>
             View Saved Itineraries <ArrowRight size={16}/>
          </Link>
        </div>

        {loading ? renderSkeletons() : error ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
              <AlertCircle size={40} />
            </div>
            <h2>Unable to load bookings</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="mt-btn-outline">Try Again</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon">
              <MapPin size={40} />
            </div>
            <h2>No guide requests yet</h2>
            <p>
              You haven't requested any guides for your trips. Head over to our guides directory or your saved itineraries to find the perfect local expert.
            </p>
            <Link to="/guides" className="mt-btn-primary">
              Browse Guides
            </Link>
          </div>
        ) : (
          <div className="mt-list">
            {recentUpdates.length > 0 && (
                <div className="mt-notifications-panel">
                    <div className="mt-notifications-header">
                        <Bell size={18} className="mt-bell-icon" />
                        <h3>Recent Updates</h3>
                    </div>
                    <div className="mt-notifications-list">
                        {recentUpdates.map(update => (
                            <div key={`update-${update.id}`} className={`mt-notification-item ${update.status === 'accepted' || update.status === 'active' ? 'active' : 'rejected'}`}>
                                {update.status === 'accepted' || update.status === 'active' ? (
                                    <p>🎉 Your guide request for <strong>{update.destination}</strong> was <strong>accepted</strong> by {update.guide_name || 'your guide'}!</p>
                                ) : (
                                    <p>😞 Your guide request for <strong>{update.destination}</strong> was <strong>declined</strong> for {update.destination}.</p>
                                )}
                                <span className="mt-notif-time">{formatDate(update.updated_at)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-tabs-section">
              {['Processing', 'Upcoming & Active', 'History'].map(tab => {
                let list = [];
                if (tab === 'Processing') list = bookings.filter(b => b.status === 'pending');
                if (tab === 'Upcoming & Active') list = bookings.filter(b => b.status === 'accepted' || b.status === 'active');
                if (tab === 'History') list = bookings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'auto_rejected' || b.status === 'cancelled');

                if (list.length === 0) return null;

                return (
                  <div key={tab} className="mt-section-group">
                    <h2 className="mt-section-title">{tab}</h2>
                    <div className="mt-list">
                      {list.map(booking => {
                        const status = getStatusDisplay(booking.status);
                        return (
                          <div key={booking.id} className="mt-card">
                            <div className="mt-card-header">
                               <div className="mt-dest-wrap">
                                  <div className="mt-dest-icon">
                                     <MapPin size={20} />
                                  </div>
                                  <div className="mt-dest-info">
                                     <h3>{booking.destination}</h3>
                                     <p>Booked on {formatDate(booking.created_at)}</p>
                                  </div>
                               </div>
                               <div className={`mt-status ${status.class}`}>
                                 {status.icon} {status.label}
                               </div>
                            </div>
                            
                            <div className="mt-card-body">
                               <div className="mt-details-col">
                                  <div className="mt-detail-row">
                                     <Calendar size={18} className="mt-detail-icon" />
                                     <div className="mt-detail-text">
                                        <h4>Trip Dates</h4>
                                        <p>{formatDate(booking.trip_start)} — {formatDate(booking.trip_end)}</p>
                                     </div>
                                  </div>
                                  
                                  {booking.notes && (
                                    <div className="mt-detail-row">
                                       <AlertCircle size={18} className="mt-detail-icon" />
                                       <div className="mt-detail-text">
                                          <h4>Notes & Reason</h4>
                                          <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>{booking.notes}</p>
                                       </div>
                                    </div>
                                  )}
                               </div>
                               
                               <div className="mt-guide-col">
                                  <div className="mt-guide-header">Guide Information</div>
                                  <div className="mt-guide-profile">
                                     <div className="mt-guide-avatar">
                                        {booking.guide_name ? booking.guide_name.charAt(0) : 'G'}
                                     </div>
                                     <div className="mt-guide-info">
                                        <h5>{booking.guide_name || 'Local Guide'}</h5>
                                        <p>Guide Profile ID: #{booking.guide}</p>
                                     </div>
                                  </div>
                               </div>
                            </div>

                            <div className="mt-card-footer">
                               <span>Reference: BOOK-{booking.id.toString().padStart(4, '0')}</span>
                               {booking.itinerary && (
                                 <button 
                                    onClick={() => navigate(`/trips/${booking.itinerary.id}`)}
                                    className="mt-btn-outline"
                                 >
                                   <Eye size={16}/> View Linked Itinerary
                                 </button>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
