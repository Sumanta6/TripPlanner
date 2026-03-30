import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ArrowRight,
  Eye,
  Bell
} from "lucide-react";
import { getMyBookedTrips } from "../services/api";
import "./MyTrips.css";

const TAB_LABELS = ["Upcoming / Active", "Completed", "Declined"];

function formatDate(dateString) {
  if (!dateString) return "TBD";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getStatusDisplay(status) {
  switch (status) {
    case "pending":
      return { label: "Pending Response", icon: <Clock size={14} />, className: "pending" };
    case "accepted":
      return { label: "Guide Accepted", icon: <CheckCircle2 size={14} />, className: "active" };
    case "active":
      return { label: "Trip in Progress", icon: <CheckCircle2 size={14} />, className: "active" };
    case "rejected":
      return { label: "Declined", icon: <XCircle size={14} />, className: "declined" };
    case "auto_rejected":
      return { label: "System Declined", icon: <XCircle size={14} />, className: "declined" };
    case "completed":
      return { label: "Completed", icon: <CheckCircle2 size={14} />, className: "completed" };
    case "cancelled":
      return { label: "Cancelled", icon: <XCircle size={14} />, className: "declined" };
    default:
      return { label: status, icon: <AlertCircle size={14} />, className: "pending" };
  }
}

export default function MyTrips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Upcoming / Active");
  const [expandedNotes, setExpandedNotes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    async function fetchBookings() {
      try {
        const data = await getMyBookedTrips();
        if (alive) {
          setBookings(Array.isArray(data) ? data : data.results || []);
        }
      } catch {
        if (alive) {
          setError("Failed to load your trips. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchBookings();
    return () => {
      alive = false;
    };
  }, []);

  const recentUpdates = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => {
        if (booking.status !== "active" && booking.status !== "accepted" && booking.status !== "rejected") {
          return false;
        }
        const updated = new Date(booking.updated_at);
        const hoursDiff = (now - updated) / (1000 * 60 * 60);
        return hoursDiff < 72;
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3);
  }, [bookings]);

  const groupedTrips = useMemo(() => {
    const upcomingActive = bookings.filter((booking) =>
      ["pending", "accepted", "active"].includes(booking.status)
    );
    const completed = bookings.filter((booking) => booking.status === "completed");
    const declined = bookings.filter((booking) =>
      ["rejected", "auto_rejected", "cancelled"].includes(booking.status)
    );

    return {
      "Upcoming / Active": upcomingActive,
      Completed: completed,
      Declined: declined
    };
  }, [bookings]);

  const summary = useMemo(() => ({
    total: bookings.length,
    active: groupedTrips["Upcoming / Active"].length,
    completed: groupedTrips.Completed.length
  }), [bookings.length, groupedTrips]);

  const visibleTrips = groupedTrips[activeTab] || [];

  const toggleNote = (bookingId) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  const renderSkeletons = () => (
    <div className="mt-cards">
      {[1, 2, 3].map((item) => (
        <div key={item} className="mt-skeleton mt-animate-pulse">
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-box"></div>
        </div>
      ))}
    </div>
  );

  const openGuidesForTrip = (booking) => {
    navigate("/guides", {
      state: {
        destination: booking.destination,
        trip_start: booking.trip_start,
        trip_end: booking.trip_end,
        itineraryId: booking.itinerary?.id || null
      }
    });
  };

  return (
    <div className="my-trips-page">
      <div className="mt-shell">
        <header className="mt-header">
          <div className="mt-title">
            <span className="mt-eyebrow">Travel Dashboard</span>
            <h1>My Trips</h1>
            <p>Track upcoming journeys, revisit completed experiences, and manage guide bookings in one clean workspace.</p>
          </div>
          <Link to="/saved-trips" className="mt-btn-outline mt-header-action">
            View Saved Itineraries <ArrowRight size={16} />
          </Link>
        </header>

        <section className="mt-summary-strip">
          <div className="mt-summary-card">
            <span className="mt-summary-label">Total Trips</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="mt-summary-card">
            <span className="mt-summary-label">Active Trips</span>
            <strong>{summary.active}</strong>
          </div>
          <div className="mt-summary-card">
            <span className="mt-summary-label">Completed Trips</span>
            <strong>{summary.completed}</strong>
          </div>
        </section>

        {loading ? renderSkeletons() : error ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon mt-empty-error">
              <AlertCircle size={40} />
            </div>
            <h2>Unable to load trips</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="mt-btn-outline">Try Again</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon">
              <MapPin size={40} />
            </div>
            <h2>No trips yet</h2>
            <p>You haven’t booked a guide yet. Start with a saved itinerary or browse available local experts to plan your next journey.</p>
            <div className="mt-empty-actions">
              <Link to="/guides" className="mt-btn-primary">Browse Guides</Link>
              <Link to="/saved-trips" className="mt-btn-outline">View Saved Itineraries</Link>
            </div>
          </div>
        ) : (
          <>
            {recentUpdates.length > 0 && (
              <section className="mt-updates-panel">
                <div className="mt-updates-header">
                  <div className="mt-updates-title">
                    <Bell size={18} className="mt-bell-icon" />
                    <h3>Recent Updates</h3>
                  </div>
                  <span className="mt-updates-caption">Last 72 hours</span>
                </div>
                <div className="mt-updates-list">
                  {recentUpdates.map((update) => (
                    <div
                      key={`update-${update.id}`}
                      className={`mt-update-item ${update.status === "accepted" || update.status === "active" ? "active" : "declined"}`}
                    >
                      <p>
                        {update.status === "accepted" || update.status === "active"
                          ? <>Your guide request for <strong>{update.destination}</strong> was accepted by <strong>{update.guide_name || "your guide"}</strong>.</>
                          : <>Your request for <strong>{update.destination}</strong> was declined. You can rebook with another guide anytime.</>}
                      </p>
                      <span>{formatDate(update.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-tabs-shell">
              <div className="mt-tabs">
                {TAB_LABELS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`mt-tab ${activeTab === tab ? "is-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    <span className="mt-tab-count">{groupedTrips[tab].length}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-section">
              <div className="mt-section-header">
                <div>
                  <h2>{activeTab}</h2>
                  <p>
                    {activeTab === "Upcoming / Active" && "Stay on top of accepted guides, pending requests, and trips that are currently underway."}
                    {activeTab === "Completed" && "Review past guided trips and reopen the same travel direction when you are ready to plan again."}
                    {activeTab === "Declined" && "Requests that were declined or cancelled are kept here so you can quickly try again with another guide."}
                  </p>
                </div>
              </div>

              {visibleTrips.length === 0 ? (
                <div className="mt-inline-empty">
                  <h3>No trips in this section</h3>
                  <p>This tab is clear right now. Browse guides or saved itineraries to start a new request.</p>
                </div>
              ) : (
                <div className="mt-cards">
                  {visibleTrips.map((booking) => {
                    const status = getStatusDisplay(booking.status);
                    const noteExpanded = Boolean(expandedNotes[booking.id]);
                    const hasLongNote = Boolean(booking.notes && booking.notes.length > 140);

                    return (
                      <article key={booking.id} className="mt-trip-card">
                        <div className="mt-trip-main">
                          <div className="mt-trip-overview">
                            <div className="mt-trip-title-row">
                              <div>
                                <div className="mt-destination-row">
                                  <MapPin size={16} />
                                  <h3>{booking.destination}</h3>
                                </div>
                                <p className="mt-trip-booked">Booked on {formatDate(booking.created_at)}</p>
                              </div>
                              <span className={`mt-status ${status.className}`}>
                                {status.icon}
                                {status.label}
                              </span>
                            </div>

                            <div className="mt-trip-detail-grid">
                              <div className="mt-detail-chip">
                                <Calendar size={16} />
                                <div>
                                  <span>Dates</span>
                                  <strong>{formatDate(booking.trip_start)} to {formatDate(booking.trip_end)}</strong>
                                </div>
                              </div>

                              <div className="mt-detail-chip">
                                <Clock size={16} />
                                <div>
                                  <span>Reference</span>
                                  <strong>BOOK-{booking.id.toString().padStart(4, "0")}</strong>
                                </div>
                              </div>
                            </div>

                            {booking.notes && (
                              <div className="mt-note-block">
                                <span className="mt-note-label">Trip Notes</span>
                                <p className={noteExpanded ? "is-expanded" : ""}>{booking.notes}</p>
                                {hasLongNote && (
                                  <button type="button" className="mt-note-toggle" onClick={() => toggleNote(booking.id)}>
                                    {noteExpanded ? "View less" : "View more"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-guide-panel">
                            <span className="mt-guide-kicker">Guide</span>
                            <div className="mt-guide-row">
                              <div className="mt-guide-avatar">
                                {booking.guide_name ? booking.guide_name.charAt(0) : "G"}
                              </div>
                              <div className="mt-guide-copy">
                                <h4>{booking.guide_name || "Local Guide"}</h4>
                                <button type="button" className="mt-guide-link" onClick={() => navigate("/guides")}>
                                  View Profile
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-trip-actions">
                          {booking.itinerary && (
                            <button
                              type="button"
                              className="mt-btn-outline"
                              onClick={() => navigate(`/trips/${booking.itinerary.id}`)}
                            >
                              <Eye size={16} />
                              View Itinerary
                            </button>
                          )}

                          {booking.status === "completed" && (
                            <button type="button" className="mt-btn-primary" onClick={() => openGuidesForTrip(booking)}>
                              Rebook
                            </button>
                          )}

                          {["rejected", "auto_rejected", "cancelled"].includes(booking.status) && (
                            <button type="button" className="mt-btn-primary" onClick={() => openGuidesForTrip(booking)}>
                              Find Another Guide
                            </button>
                          )}

                          {["pending", "accepted", "active"].includes(booking.status) && (
                            <button type="button" className="mt-btn-outline" onClick={() => navigate("/guides")}>
                              Browse Guides
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
