import { useEffect, useState } from "react";
import { Activity, CalendarCheck2, CheckCircle2, Compass, Mail, Shield, Star, Users } from "lucide-react";
import { fetchAdminDashboard } from "../services/adminApi";
import { AdminCard, AdminSectionHeader, AdminStatusBadge, formatDate } from "./AdminUI";

const ICONS = {
  total_users: <Users size={18} />,
  total_guides: <Shield size={18} />,
  total_bookings: <CalendarCheck2 size={18} />,
  active_bookings: <Activity size={18} />,
  completed_bookings: <CheckCircle2 size={18} />,
  cancelled_bookings: <Compass size={18} />,
  total_itineraries: <Compass size={18} />,
  total_reviews: <Star size={18} />,
  total_contacts: <Mail size={18} />,
};

function StatCard({ label, value, icon }) {
  return (
    <article className="tp-admin-stat">
      <div className="tp-admin-stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard().then(setData).catch((err) => setError(err.message || "Unable to load dashboard."));
  }, []);

  if (error) return <div className="tp-admin-card tp-admin-error">{error}</div>;
  if (!data) return <div className="tp-admin-card">Loading dashboard…</div>;

  const stats = data.stats || {};
  const totalBookings = Math.max(stats.total_bookings || 0, 1);

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Platform overview"
        title="TripPlanner Control Center"
        subtitle="Real-time operational visibility across users, guides, bookings, itineraries, reviews, support, and chat health."
      />

      <section className="tp-admin-stats">
        {Object.entries(stats).map(([key, value]) => (
          <StatCard key={key} label={key.replaceAll("_", " ")} value={value} icon={ICONS[key] || <Compass size={18} />} />
        ))}
      </section>

      <section className="tp-admin-grid tp-admin-grid-wide">
        <AdminCard>
          <h3>Booking mix</h3>
          <div className="tp-admin-bars">
            {(data.booking_breakdown || []).map((row) => (
              <div key={row.status} className="tp-admin-bar-row">
                <div className="tp-admin-bar-meta">
                  <span>{row.status}</span>
                  <strong>{row.count}</strong>
                </div>
                <div className="tp-admin-bar-track">
                  <div className={`tp-admin-bar-fill is-${row.status}`} style={{ width: `${Math.max(8, (row.count / totalBookings) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h3>System health</h3>
          <div className="tp-admin-health-grid">
            {Object.entries(data.health || {}).map(([key, value]) => (
              <div key={key} className="tp-admin-health-item">
                <span>{key.replaceAll("_", " ")}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>

      <section className="tp-admin-grid">
        <AdminCard>
          <h3>Recent signups</h3>
          <div className="tp-admin-list">
            {(data.recent_signups || []).map((user) => (
              <div key={user.id} className="tp-admin-list-row">
                <div>
                  <strong>{user.full_name || user.email}</strong>
                  <span>{user.email}</span>
                </div>
                <span>{formatDate(user.date_joined, true)}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h3>Recent booking activity</h3>
          <div className="tp-admin-list">
            {(data.recent_booking_activity || []).map((booking) => (
              <div key={booking.id} className="tp-admin-list-row">
                <div>
                  <strong>{booking.destination}</strong>
                  <span>{booking.traveler_name} with {booking.guide_name}</span>
                </div>
                <AdminStatusBadge tone={booking.status}>{booking.status}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>

      <section className="tp-admin-grid">
        <AdminCard>
          <h3>Latest reviews</h3>
          <div className="tp-admin-list">
            {(data.recent_reviews || []).map((review) => (
              <div key={review.id} className="tp-admin-list-row">
                <div>
                  <strong>{review.guide_name}</strong>
                  <span>{review.traveler_name} on {review.destination}</span>
                </div>
                <AdminStatusBadge tone="completed">{review.rating}/5</AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h3>Ops summary</h3>
          <div className="tp-admin-summary-stack">
            <div className="tp-admin-summary-item">
              <strong>{stats.active_bookings || 0}</strong>
              <span>live trips currently in accepted or active state</span>
            </div>
            <div className="tp-admin-summary-item">
              <strong>{stats.total_contacts || 0}</strong>
              <span>support conversations available for moderation</span>
            </div>
            <div className="tp-admin-summary-item">
              <strong>{stats.total_guides || 0}</strong>
              <span>guide profiles available for operational review</span>
            </div>
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
