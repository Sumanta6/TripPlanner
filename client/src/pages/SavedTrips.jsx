import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Navigation,
  Search,
  Trash2,
  Users,
  Wallet
} from "lucide-react";
import { deleteItinerary, getMyItineraries } from "../services/api";
import AppPopupModal from "../components/AppPopupModal";
import "./SavedTrips.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" }
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest saved" },
  { id: "nearest", label: "Nearest trip date" }
];

function formatDate(dateString) {
  if (!dateString) return "Flexible Dates";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getTripStatus(startDateStr) {
  if (!startDateStr) return { label: "Planning", className: "status-planning", group: "upcoming" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  if (start < today) return { label: "Past Trip", className: "status-past", group: "past" };
  if (start.getTime() === today.getTime()) return { label: "Ongoing", className: "status-ongoing", group: "upcoming" };
  return { label: "Upcoming", className: "status-upcoming", group: "upcoming" };
}

function getSummaryText(trip) {
  const preview = String(trip.preview || trip.notes || "").trim();
  if (preview) return preview;
  return `A ${trip.days || "multi-day"} trip through ${trip.destination || "Nepal"} with space to fine-tune your route, stays, and guide plans.`;
}

function getTripCoverStyle(destination = "") {
  const key = String(destination).toLowerCase();

  if (key.includes("pokhara")) {
    return {
      background:
        "linear-gradient(140deg, rgba(10, 32, 64, 0.95), rgba(30, 87, 125, 0.78)), radial-gradient(circle at top left, rgba(116, 227, 255, 0.34), transparent 38%)"
    };
  }
  if (key.includes("mustang") || key.includes("annapurna")) {
    return {
      background:
        "linear-gradient(135deg, rgba(44, 24, 15, 0.95), rgba(121, 70, 39, 0.78)), radial-gradient(circle at top right, rgba(255, 194, 138, 0.28), transparent 42%)"
    };
  }
  if (key.includes("chitwan") || key.includes("bardia")) {
    return {
      background:
        "linear-gradient(135deg, rgba(19, 47, 33, 0.95), rgba(49, 116, 73, 0.8)), radial-gradient(circle at top left, rgba(155, 228, 179, 0.24), transparent 40%)"
    };
  }

  return {
    background:
      "linear-gradient(135deg, rgba(12, 27, 48, 0.96), rgba(27, 73, 95, 0.82)), radial-gradient(circle at top right, rgba(119, 205, 227, 0.26), transparent 40%)"
  };
}

export default function SavedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [popup, setPopup] = useState({ isOpen: false, tripId: null });
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    async function fetchTrips() {
      try {
        const data = await getMyItineraries();
        if (alive) {
          setTrips(Array.isArray(data) ? data : data.results || []);
        }
      } catch {
        if (alive) {
          setError("Failed to load your saved trips. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchTrips();
    return () => {
      alive = false;
    };
  }, []);

  const enrichedTrips = useMemo(
    () =>
      trips.map((trip) => ({
        ...trip,
        status: getTripStatus(trip.start_date),
        summaryText: getSummaryText(trip),
      })),
    [trips]
  );

  const summaryStats = useMemo(() => {
    const upcoming = enrichedTrips.filter((trip) => trip.status.group === "upcoming").length;
    const past = enrichedTrips.filter((trip) => trip.status.group === "past").length;

    return [
      { label: "Total Trips", value: enrichedTrips.length },
      { label: "Upcoming", value: upcoming },
      { label: "Past", value: past }
    ];
  }, [enrichedTrips]);

  const filteredTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const nextTrips = enrichedTrips.filter((trip) => {
      const matchesFilter = activeFilter === "all" || trip.status.group === activeFilter;
      const haystack = [trip.destination, trip.starting_place, trip.summaryText].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesFilter && matchesSearch;
    });

    nextTrips.sort((a, b) => {
      if (sortBy === "nearest") {
        const aDate = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }

      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });

    return nextTrips;
  }, [activeFilter, enrichedTrips, searchQuery, sortBy]);

  const emptyCategoryLabel = FILTERS.find((item) => item.id === activeFilter)?.label || "Trips";

  const handleDelete = async () => {
    const tripId = popup.tripId;
    if (!tripId) return;

    setIsDeleting(tripId);
    try {
      await deleteItinerary(tripId);
      setTrips((current) => current.filter((trip) => trip.id !== tripId));
      setPopup({ isOpen: false, tripId: null });
    } catch {
      setError("Failed to delete the trip. Please try again.");
      setPopup({ isOpen: false, tripId: null });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderSkeletons = () => (
    <div className="saved-trips-grid">
      {[1, 2, 3].map((n) => (
        <div key={n} className="saved-trip-card skeleton-card animate-pulse">
          <div className="saved-trip-cover skeleton-hero" />
          <div className="saved-trip-content">
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
            <div className="skeleton-box" />
            <div className="skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="saved-trips-page">
      <div className="saved-trips-shell">
        <AppPopupModal
          isOpen={popup.isOpen}
          type="warning"
          title="Delete saved trip?"
          message="This itinerary will be removed from your saved trips. This action cannot be undone."
          onClose={() => setPopup({ isOpen: false, tripId: null })}
          primaryAction={{
            label: isDeleting ? "Deleting..." : "Delete Trip",
            onClick: handleDelete
          }}
          secondaryAction={{
            label: "Cancel",
            onClick: () => setPopup({ isOpen: false, tripId: null })
          }}
        />

        <section className="saved-trips-header">
          <div className="saved-trips-header-copy">
            <span className="saved-trips-kicker">Travel Dashboard</span>
            <h1>Saved Trips</h1>
            <p>Manage your upcoming and past itineraries in one calm, curated place.</p>
          </div>
          <Link to="/plan-trip" className="plan-new-btn">
            ✨ Plan New Trip
          </Link>
        </section>

        {!loading && !error && trips.length > 0 && (
          <>
            <section className="saved-stats-grid">
              {summaryStats.map((stat) => (
                <div key={stat.label} className="saved-stat-card">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </section>

            <section className="saved-controls">
              <div className="saved-tabs" role="tablist" aria-label="Trip filters">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`saved-tab ${activeFilter === filter.id ? "is-active" : ""}`}
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="saved-control-actions">
                <label className="saved-search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search destination"
                  />
                </label>

                <label className="saved-sort">
                  <ArrowUpDown size={15} />
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          </>
        )}

        {loading ? renderSkeletons() : error ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrap empty-icon-error">
              <span>⚠️</span>
            </div>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="plan-new-btn plan-new-btn-muted">
              Try Again
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrap">
              <Compass size={40} />
            </div>
            <h2>Your saved trips will appear here</h2>
            <p>Create your first itinerary and come back to manage future departures, past trips, and guide bookings.</p>
            <Link to="/plan-trip" className="plan-new-btn">
              Generate Your First Itinerary
            </Link>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="empty-state-card empty-state-compact">
            <div className="empty-icon-wrap">
              <MapPin size={34} />
            </div>
            <h2>No {emptyCategoryLabel.toLowerCase()} trips found</h2>
            <p>Try a different filter or search term to find the itinerary you want.</p>
          </div>
        ) : (
          <div className="saved-trips-grid">
            {filteredTrips.map((trip) => (
              <article key={trip.id} className="saved-trip-card">
                <div className="saved-trip-cover" style={getTripCoverStyle(trip.destination)}>
                  <div className="saved-trip-cover-glow" />
                  <div className={`status-badge ${trip.status.className}`}>{trip.status.label}</div>
                  <div className="saved-trip-cover-body">
                    <div className="saved-trip-eyebrow">
                      <Navigation size={13} />
                      <span>From {trip.starting_place || "Kathmandu"}</span>
                    </div>
                    <h3>{trip.destination}</h3>
                    <p>{trip.days} day itinerary curated for your route and pace</p>
                  </div>
                </div>

                <div className="saved-trip-content">
                  <p className="saved-trip-summary">{trip.summaryText}</p>

                  <div className="saved-trip-meta">
                    <div className="saved-trip-meta-item">
                      <Calendar size={15} />
                      <span>{formatDate(trip.start_date)}</span>
                    </div>
                    <div className="saved-trip-meta-item">
                      <Clock size={15} />
                      <span>{trip.days} Days</span>
                    </div>
                    <div className="saved-trip-meta-item">
                      <Wallet size={15} />
                      <span>NPR {trip.budget ? Number(trip.budget).toLocaleString() : "TBD"}</span>
                    </div>
                    <div className="saved-trip-meta-item">
                      <Users size={15} />
                      <span>{trip.travelers || 1} Travelers</span>
                    </div>
                  </div>

                  <div className="saved-trip-actions">
                    <button onClick={() => navigate(`/trips/${trip.id}`)} className="btn-view">
                      View Trip <ChevronRight size={16} />
                    </button>
                    {trip.status.group === "upcoming" && (
                      <button
                        onClick={() =>
                          navigate("/guides", {
                            state: {
                              itineraryId: trip.id,
                              destination: trip.destination,
                              trip_start: trip.start_date,
                              trip_end: trip.end_date
                            }
                          })
                        }
                        className="btn-guide"
                      >
                        Find Guide
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPopup({ isOpen: true, tripId: trip.id })}
                      disabled={isDeleting === trip.id}
                      className="btn-delete"
                      title="Delete Trip"
                    >
                      {isDeleting === trip.id ? <div className="st-spinner" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
