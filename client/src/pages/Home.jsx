import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getGuides,
  getMyGuideRequests,
  getMyItineraries,
  getMyProfile,
} from "../services/api";
import api from "../services/api";
import "./Home.css";

const DEFAULT_PLANNER_FORM = {
  destination: "",
  startDate: "",
  days: 4,
  travelers: "2",
  budget: 50000,
  travelStyle: "",
  interests: [],
};

const HERO_DESTINATIONS = ["Pokhara", "Kathmandu Valley", "Chitwan National Park", "Everest Base Camp", "Mustang"];
const HERO_STYLES = ["Adventure", "Cultural", "Luxury", "Budget", "Family"];

const QUICK_ACTIONS = [
  { id: "plan", icon: "✦", label: "Plan a Trip", sub: "Generate a route with AI", to: "/plan-trip" },
  { id: "destinations", icon: "◦", label: "Explore Destinations", sub: "Compare regions and places", to: "/destinations" },
  { id: "guides", icon: "•", label: "Find a Guide", sub: "Match with verified locals", to: "/guides" },
  { id: "saved", icon: "◈", label: "View Saved Trips", sub: "Continue unfinished plans", to: "/saved-trips" },
];

const TRUST_POINTS = [
  "Verified local guides",
  "Transparent planning flow",
  "Saved trips synced to your account",
  "Nepal-focused route recommendations",
];

const DESTINATION_SPOTLIGHTS = [
  {
    id: "pokhara",
    name: "Pokhara Escape",
    subtitle: "Calm lake stays, mountain views, and easy day planning",
    meta: "Ideal for shorter premium trips",
    image: "/images/hero-pokhara.jpg",
  },
  {
    id: "everest",
    name: "Everest Region",
    subtitle: "A serious trekking route with strong guide demand",
    meta: "Best when you want structure and pace",
    image: "/images/hero-everest.jpg",
  },
  {
    id: "kathmandu",
    name: "Kathmandu Valley",
    subtitle: "Culture-first city breaks with temples, food, and history",
    meta: "Strong choice for flexible dates",
    image: "/images/hero-stupa.jpg",
  },
];

const TRIP_STYLES = [
  { title: "Trekking", detail: "Mountain-first routes with pacing and altitude in mind." },
  { title: "Culture", detail: "Heritage sites, food, neighborhoods, and local rhythms." },
  { title: "Wildlife", detail: "National parks, safari days, and slower scenic movement." },
  { title: "Family", detail: "Balanced travel with smoother logistics and shorter days." },
];

const CURATED_ITINERARIES = [
  {
    title: "4-Day Pokhara Reset",
    detail: "Lakeside stay, hill views, soft adventure, and local dining.",
    season: "Best in spring",
    price: "From NPR 48,000",
  },
  {
    title: "7-Day Cultural Nepal",
    detail: "Kathmandu, Bhaktapur, Patan, and slower heritage pacing.",
    season: "Ideal in autumn",
    price: "From NPR 62,000",
  },
  {
    title: "10-Day Everest Journey",
    detail: "For travelers ready to commit to a guided trekking plan.",
    season: "Peak Mar–May",
    price: "Custom quote",
  },
];

const SUPPORT_POINTS = [
  { title: "Clear planning inputs", body: "Destination, dates, budget, and style are visible before you commit." },
  { title: "Trip transparency", body: "Saved itineraries, guide requests, and recent activity stay accessible in one account." },
  { title: "Help stays close", body: "How It Works, FAQ, and contact access remain visible when you need reassurance." },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(dateString) {
  if (!dateString) return "Flexible";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates not set yet";
  if (!endDate) return formatDate(startDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function normalizeBudget(value) {
  if (!value) return "Budget not set";
  if (typeof value === "number") return `NPR ${value.toLocaleString()}`;
  return String(value);
}

function getTripStatusLabel(status) {
  switch (status) {
    case "payment_pending":
      return "Payment pending";
    case "accepted":
    case "active":
      return "Trip in progress";
    case "pending":
      return "Waiting on guide";
    case "completed":
      return "Completed";
    default:
      return "Saved itinerary";
  }
}

function buildActivity(itineraries, guideRequests, trips) {
  const itineraryActivity = itineraries.slice(0, 3).map((trip) => ({
    id: `itin-${trip.id}`,
    title: `Saved itinerary for ${trip.destination || "Nepal"}`,
    meta: trip.created_at,
    type: "Saved plan",
  }));

  const guideActivity = guideRequests.slice(0, 2).map((request) => ({
    id: `req-${request.id}`,
    title:
      request.status === "payment_pending"
        ? `Payment started for ${request.destination || "your trip"}`
        : request.status === "accepted"
        ? `Guide accepted for ${request.destination || "your trip"}`
        : `Guide request sent for ${request.destination || "your trip"}`,
    meta: request.created_at,
    type: request.status === "payment_pending" ? "Payment pending" : request.status === "accepted" ? "Guide confirmed" : "Guide request",
  }));

  const tripActivity = trips.slice(0, 2).map((trip) => ({
    id: `trip-${trip.id}`,
    title: `${trip.destination || "Trip"} updated`,
    meta: trip.updated_at || trip.trip_start,
    type: getTripStatusLabel(trip.status),
  }));

  return [...itineraryActivity, ...guideActivity, ...tripActivity]
    .filter((item) => item.meta)
    .sort((a, b) => new Date(b.meta) - new Date(a.meta))
    .slice(0, 5);
}

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [guideRequests, setGuideRequests] = useState([]);
  const [guides, setGuides] = useState([]);
  const [trips, setTrips] = useState([]);
  const [plannerForm, setPlannerForm] = useState({
    destination: HERO_DESTINATIONS[0],
    days: "4",
    travelers: "2",
    travelStyle: HERO_STYLES[0],
  });

  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true" ||
    sessionStorage.getItem("isLoggedIn") === "true";

  useEffect(() => {
    let alive = true;

    async function loadHomeData() {
      try {
        const guideList = await getGuides();
        if (alive) {
          const availableGuides = Array.isArray(guideList)
            ? guideList.filter((guide) => guide.availability_badge === "Available").slice(0, 3)
            : [];
          setGuides(availableGuides);
        }

        if (!isLoggedIn) return;

        const [profileRes, itinerariesRes, requestsRes, tripsRes] = await Promise.allSettled([
          getMyProfile(),
          getMyItineraries(),
          getMyGuideRequests(),
          api.get("/api/guides/my-trips/").then((response) => response.data),
        ]);

        if (!alive) return;

        if (profileRes.status === "fulfilled") setUser(profileRes.value);
        if (itinerariesRes.status === "fulfilled") {
          setItineraries(Array.isArray(itinerariesRes.value) ? itinerariesRes.value : []);
        }
        if (requestsRes.status === "fulfilled") {
          setGuideRequests(Array.isArray(requestsRes.value) ? requestsRes.value : []);
        }
        if (tripsRes.status === "fulfilled") {
          setTrips(Array.isArray(tripsRes.value) ? tripsRes.value : []);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadHomeData();
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  const displayName =
    user?.full_name || user?.username || user?.first_name || user?.email?.split("@")[0] || "Traveler";

  const firstName = displayName.split(" ")[0];

  const activeTrip = useMemo(() => {
    const nextBookedTrip = [...trips].sort(
      (a, b) => new Date(a.trip_start || a.updated_at || 0) - new Date(b.trip_start || b.updated_at || 0)
    )[0];

    if (nextBookedTrip) {
      return {
        title: nextBookedTrip.destination || "Upcoming trip",
        dates: formatDateRange(nextBookedTrip.trip_start, nextBookedTrip.trip_end),
        budget: normalizeBudget(nextBookedTrip.budget),
        status: getTripStatusLabel(nextBookedTrip.status),
        note:
          nextBookedTrip.message ||
          nextBookedTrip.notes ||
          "Your guide-linked trip is ready to review and continue.",
        actionLabel: "View My Trips",
        actionTo: "/my-trips",
      };
    }

    const latestItinerary = itineraries[0];
    if (latestItinerary) {
      return {
        title: latestItinerary.destination || latestItinerary.title || "Saved itinerary",
        dates: formatDateRange(latestItinerary.start_date, latestItinerary.end_date),
        budget: normalizeBudget(latestItinerary.budget),
        status: "Saved itinerary",
        note:
          latestItinerary.preview ||
          latestItinerary.notes ||
          "Continue refining this saved plan or open it in the AI Planner.",
        actionLabel: "Continue Last Trip",
        actionTo: "/saved-trips",
      };
    }

    return null;
  }, [itineraries, trips]);

  const recentActivity = useMemo(
    () => buildActivity(itineraries, guideRequests, trips),
    [guideRequests, itineraries, trips]
  );

  const summaryStats = [
    { label: "Saved Trips", value: itineraries.length },
    { label: "Active Trips", value: trips.length },
    { label: "Guide Requests", value: guideRequests.length },
  ];

  const handlePlannerLaunch = () => {
    const nextForm = {
      ...DEFAULT_PLANNER_FORM,
      destination: plannerForm.destination,
      days: Number(plannerForm.days) || 4,
      travelers: String(plannerForm.travelers || "2"),
      travelStyle: plannerForm.travelStyle,
    };

    localStorage.setItem("plantrip_step", "1");
    localStorage.setItem("plantrip_formData", JSON.stringify(nextForm));
    navigate("/plan-trip");
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="home-loading-spinner" />
        <p>Loading your TripPlanner home…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="home-dashboard-page">
        <div className="home-dashboard-shell">
          <section className="home-public-hero">
            <div className="home-public-copy">
              <span className="home-section-kicker">Nepal Trip Planning</span>
              <h1>Plan your Nepal journey with AI, guides, and clearer travel decisions.</h1>
              <p>
                TripPlanner helps you move from an idea to a route-ready itinerary, compare destinations faster, and connect with verified local guides when you are ready to travel.
              </p>
              <div className="home-hero-actions">
                <button type="button" className="home-btn-primary" onClick={handlePlannerLaunch}>
                  Plan Your Trip
                </button>
                <Link to="/guides" className="home-btn-secondary home-btn-secondary-dark">
                  Meet Our Guides
                </Link>
              </div>
              <div className="home-trust-row">
                {TRUST_POINTS.map((point) => (
                  <span key={point}>{point}</span>
                ))}
              </div>
            </div>

            <div className="home-planner-card">
              <div className="home-planner-head">
                <span className="home-section-kicker">Start Planning</span>
                <h2>Build a trip in minutes</h2>
              </div>
              <label className="home-field">
                <span>Destination</span>
                <select
                  value={plannerForm.destination}
                  onChange={(event) =>
                    setPlannerForm((current) => ({ ...current, destination: event.target.value }))
                  }
                >
                  {HERO_DESTINATIONS.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </label>
              <div className="home-field-row">
                <label className="home-field">
                  <span>Days</span>
                  <select
                    value={plannerForm.days}
                    onChange={(event) =>
                      setPlannerForm((current) => ({ ...current, days: event.target.value }))
                    }
                  >
                    {[3, 4, 5, 7, 10].map((day) => (
                      <option key={day} value={day}>
                        {day} days
                      </option>
                    ))}
                  </select>
                </label>
                <label className="home-field">
                  <span>Travelers</span>
                  <select
                    value={plannerForm.travelers}
                    onChange={(event) =>
                      setPlannerForm((current) => ({ ...current, travelers: event.target.value }))
                    }
                  >
                    {["1", "2", "4", "6+"].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="home-field">
                <span>Trip style</span>
                <select
                  value={plannerForm.travelStyle}
                  onChange={(event) =>
                    setPlannerForm((current) => ({ ...current, travelStyle: event.target.value }))
                  }
                >
                  {HERO_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="home-btn-primary home-btn-primary-wide" onClick={handlePlannerLaunch}>
                Open Planner
              </button>
            </div>
          </section>

          <section className="home-public-section">
            <div className="home-section-head">
              <div>
                <span className="home-section-kicker">Featured Destinations</span>
                <h2>Choose a direction before you plan the details</h2>
              </div>
              <Link to="/destinations" className="home-inline-link">Browse all</Link>
            </div>
            <div className="home-destination-grid">
              {DESTINATION_SPOTLIGHTS.map((destination) => (
                <Link
                  key={destination.id}
                  to="/destinations"
                  className="home-destination-card"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 15, 28, 0.18), rgba(7, 15, 28, 0.72)), url(${destination.image})` }}
                >
                  <div className="home-destination-copy">
                    <strong>{destination.name}</strong>
                    <span>{destination.subtitle}</span>
                    <p>{destination.meta}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="home-public-grid">
            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Trip Styles</span>
                  <h2>Browse by intent, not just destination</h2>
                </div>
              </div>
              <div className="home-style-grid">
                {TRIP_STYLES.map((style) => (
                  <div key={style.title} className="home-style-card">
                    <strong>{style.title}</strong>
                    <p>{style.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Curated Itineraries</span>
                  <h2>Examples of premium route structure</h2>
                </div>
              </div>
              <div className="home-itinerary-list">
                {CURATED_ITINERARIES.map((itinerary) => (
                  <div key={itinerary.title} className="home-itinerary-row">
                    <div>
                      <strong>{itinerary.title}</strong>
                      <span>{itinerary.detail}</span>
                    </div>
                    <div className="home-itinerary-meta">
                      <em>{itinerary.season}</em>
                      <strong>{itinerary.price}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="home-public-grid">
            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Guide Highlights</span>
                  <h2>Human trust matters in travel</h2>
                </div>
                <Link to="/guides" className="home-inline-link">Meet our guides</Link>
              </div>
              {guides.length > 0 ? (
                <div className="home-guide-list">
                  {guides.map((guide) => (
                    <div key={guide.id} className="home-guide-row">
                      <div className="home-guide-avatar">
                        {guide.name?.charAt(0)?.toUpperCase() || "G"}
                      </div>
                      <div className="home-guide-copy">
                        <strong>{guide.name}</strong>
                        <span>{guide.specialization || guide.experience || "Verified local guide"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="home-empty-copy">Guide profiles will appear here when current availability is available.</p>
              )}
            </div>

            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Support & Confidence</span>
                  <h2>Premium travel design means clarity</h2>
                </div>
              </div>
              <div className="home-support-list">
                {SUPPORT_POINTS.map((item) => (
                  <div key={item.title} className="home-support-row">
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="home-dashboard-page">
      <div className="home-dashboard-shell">
        <section className="home-dashboard-hero">
          <div className="home-hero-copy">
            <span className="home-section-kicker">{getGreeting()}, {firstName}</span>
            <h1>Ready for your next Nepal adventure?</h1>
            <p>
              Your TripPlanner workspace keeps planning, saved routes, guide matching, and recent activity in one calm place so you can continue faster.
            </p>
            <div className="home-hero-actions">
              <Link to="/plan-trip" className="home-btn-primary">Plan a Trip</Link>
              <Link to={activeTrip ? activeTrip.actionTo : "/my-trips"} className="home-btn-secondary">
                {activeTrip ? activeTrip.actionLabel : "View My Trips"}
              </Link>
            </div>
          </div>

          <div className="home-hero-summary">
            {summaryStats.map((item) => (
              <div key={item.label} className="home-summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-head">
            <div>
              <span className="home-section-kicker">Quick Actions</span>
              <h2>Jump back into planning</h2>
            </div>
          </div>
          <div className="home-actions-grid">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.id} to={action.to} className="home-action-card">
                <span className="home-action-icon">{action.icon}</span>
                <div className="home-action-copy">
                  <strong>{action.label}</strong>
                  <span>{action.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-dashboard-grid">
          <div className="home-column home-column-main">
            <div className="home-card home-card-feature">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Upcoming / Recent Trip</span>
                  <h2>{activeTrip ? activeTrip.title : "No active trip yet"}</h2>
                </div>
                {activeTrip ? <span className="home-status-pill">{activeTrip.status}</span> : null}
              </div>

              {activeTrip ? (
                <>
                  <div className="home-trip-meta">
                    <div>
                      <span>Dates</span>
                      <strong>{activeTrip.dates}</strong>
                    </div>
                    <div>
                      <span>Budget</span>
                      <strong>{activeTrip.budget}</strong>
                    </div>
                  </div>
                  <p className="home-trip-note">{activeTrip.note}</p>
                  <Link to={activeTrip.actionTo} className="home-inline-link">
                    {activeTrip.actionLabel}
                  </Link>
                </>
              ) : (
                <div className="home-empty-card">
                  <p>You do not have an active or saved trip yet. Start a new AI plan and your dashboard will begin filling with real trip context.</p>
                  <Link to="/plan-trip" className="home-btn-primary">Start Planning</Link>
                </div>
              )}
            </div>

            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Recommended Destinations</span>
                  <h2>Good next picks for your dashboard</h2>
                </div>
                <Link to="/destinations" className="home-inline-link">View all</Link>
              </div>
              <div className="home-destination-grid">
                {DESTINATION_SPOTLIGHTS.map((destination) => (
                  <Link
                    key={destination.id}
                    to="/destinations"
                    className="home-destination-card"
                    style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 15, 28, 0.18), rgba(7, 15, 28, 0.72)), url(${destination.image})` }}
                  >
                    <div className="home-destination-copy">
                      <strong>{destination.name}</strong>
                      <span>{destination.subtitle}</span>
                      <p>{destination.meta}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="home-column home-column-side">
            <div className="home-card home-card-insight">
              <span className="home-section-kicker">Seasonal Pick</span>
              <h2>Spring in Nepal is opening up your best planning window</h2>
              <p>
                Pokhara, Annapurna foothills, and Kathmandu Valley are currently the easiest high-value picks for balanced weather, scenery, and guide availability.
              </p>
              <Link to="/destinations" className="home-inline-link">Explore seasonal destinations</Link>
            </div>

            <div className="home-card">
              <div className="home-card-head">
                <div>
                  <span className="home-section-kicker">Guide Highlights</span>
                  <h2>Need a local expert?</h2>
                </div>
                <Link to="/guides" className="home-inline-link">Browse guides</Link>
              </div>
              {guides.length > 0 ? (
                <div className="home-guide-list">
                  {guides.map((guide) => (
                    <div key={guide.id} className="home-guide-row">
                      <div className="home-guide-avatar">
                        {guide.name?.charAt(0)?.toUpperCase() || "G"}
                      </div>
                      <div className="home-guide-copy">
                        <strong>{guide.name}</strong>
                        <span>{guide.experience || guide.specialization || "Local guide"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="home-empty-copy">No guide highlights are available right now. You can still browse the full guide directory.</p>
              )}
            </div>
          </div>
        </section>

        <section className="home-bottom-grid">
          <div className="home-card">
            <div className="home-card-head">
              <div>
                <span className="home-section-kicker">Recent Activity</span>
                <h2>Your latest planning actions</h2>
              </div>
            </div>
            {recentActivity.length > 0 ? (
              <div className="home-activity-list">
                {recentActivity.map((item) => (
                  <div key={item.id} className="home-activity-row">
                    <div className="home-activity-dot" />
                    <div className="home-activity-copy">
                      <strong>{item.title}</strong>
                      <span>{item.type} · {formatDate(item.meta)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-empty-copy">No recent activity yet. Once you start saving trips or sending guide requests, this feed will update automatically.</p>
            )}
          </div>

          <div className="home-card">
            <div className="home-card-head">
              <div>
                <span className="home-section-kicker">Saved Plans</span>
                <h2>Continue what you were building</h2>
              </div>
              <Link to="/saved-trips" className="home-inline-link">Open saved trips</Link>
            </div>
            {itineraries.length > 0 ? (
              <div className="home-saved-list">
                {itineraries.slice(0, 4).map((trip) => (
                  <Link key={trip.id} to="/saved-trips" className="home-saved-row">
                    <div className="home-saved-copy">
                      <strong>{trip.destination || trip.title || "Untitled itinerary"}</strong>
                      <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                    </div>
                    <span className="home-saved-budget">{normalizeBudget(trip.budget)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="home-empty-copy">You have not saved any itineraries yet. Planning a trip will automatically create useful content here.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
