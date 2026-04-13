import { useEffect, useState } from "react";
import { CalendarCheck2, CheckCircle2, Compass, Shield, Users } from "lucide-react";
import { fetchAdminDashboard } from "../services/adminApi";

const ICONS = {
  total_users: <Users size={18} />,
  total_guides: <Shield size={18} />,
  total_bookings: <CalendarCheck2 size={18} />,
  active_bookings: <Compass size={18} />,
  completed_bookings: <CheckCircle2 size={18} />,
  total_itineraries: <BookOpenProxy />,
};

function BookOpenProxy() {
  return <Compass size={18} />;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard().then(setData).catch((err) => setError(err.message || "Unable to load dashboard."));
  }, []);

  if (error) return <div className="tp-admin-card tp-admin-error">{error}</div>;
  if (!data) return <div className="tp-admin-card">Loading dashboard…</div>;

  return (
    <div className="tp-admin-stack">
      <section className="tp-admin-stats">
        {Object.entries(data.stats || {}).map(([key, value]) => (
          <article key={key} className="tp-admin-stat">
            <div className="tp-admin-stat-icon">{ICONS[key] || <Compass size={18} />}</div>
            <span>{key.replaceAll("_", " ")}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="tp-admin-grid">
        <div className="tp-admin-card">
          <h2>Recent Bookings</h2>
          <div className="tp-admin-list">
            {(data.recent_bookings || []).map((booking) => (
              <div key={booking.id} className="tp-admin-list-row">
                <div>
                  <strong>{booking.destination}</strong>
                  <span>{booking.traveler_name} with {booking.guide_name}</span>
                </div>
                <span className={`tp-admin-pill is-${booking.status}`}>{booking.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tp-admin-card">
          <h2>Status Breakdown</h2>
          <div className="tp-admin-list">
            {(data.booking_breakdown || []).map((row) => (
              <div key={row.status} className="tp-admin-list-row">
                <strong>{row.status}</strong>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
