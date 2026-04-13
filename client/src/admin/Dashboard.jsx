import { useEffect, useMemo, useState } from "react";
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

const CHART_COLORS = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#0ea5e9"];

function StatCard({ label, value, icon }) {
  return (
    <article className="tp-admin-stat">
      <div className="tp-admin-stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartCard({ title, subtitle, updatedAt, children }) {
  return (
    <AdminCard className="tp-admin-chart-card">
      <div className="tp-admin-chart-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {updatedAt ? <span className="tp-admin-chart-meta">Updated {updatedAt}</span> : null}
      </div>
      {children}
    </AdminCard>
  );
}

function DoughnutChart({ data, valueKey, labelKey, colors = CHART_COLORS }) {
  const total = Math.max(data.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0), 1);
  let current = 0;
  const segments = data.map((item, index) => {
    const value = Number(item[valueKey] || 0);
    const dash = (value / total) * 314;
    const node = {
      ...item,
      color: colors[index % colors.length],
      dash,
      offset: -current,
      percent: Math.round((value / total) * 100),
      label: item[labelKey],
    };
    current += dash;
    return node;
  });

  return (
    <div className="tp-admin-doughnut-wrap">
      <svg viewBox="0 0 140 140" className="tp-admin-doughnut" aria-hidden="true">
        <circle cx="70" cy="70" r="50" fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="70"
            cy="70"
            r="50"
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeDasharray={`${segment.dash} 314`}
            strokeDashoffset={segment.offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        ))}
        <text x="70" y="64" textAnchor="middle" className="tp-admin-doughnut-total-label">Total</text>
        <text x="70" y="82" textAnchor="middle" className="tp-admin-doughnut-total-value">{total}</text>
      </svg>
      <div className="tp-admin-chart-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="tp-admin-legend-row">
            <span className="tp-admin-legend-dot" style={{ backgroundColor: segment.color }} />
            <strong>{segment.label}</strong>
            <span>{segment.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, series, height = 220 }) {
  const width = 520;
  const maxValue = Math.max(1, ...data.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0))));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const buildPath = (key) =>
    data
      .map((item, index) => {
        const x = index * stepX;
        const y = height - (Number(item[key] || 0) / maxValue) * (height - 24) - 12;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  return (
    <div className="tp-admin-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((mark) => (
          <line key={mark} x1="0" y1={height * mark} x2={width} y2={height * mark} className="tp-admin-grid-line" />
        ))}
        {series.map((entry) => (
          <path key={entry.key} d={buildPath(entry.key)} fill="none" stroke={entry.color} strokeWidth="3" strokeLinecap="round" />
        ))}
      </svg>
      <div className="tp-admin-line-labels">
        {data.filter((_, index) => index % Math.max(1, Math.floor(data.length / 6)) === 0 || index === data.length - 1).map((item) => (
          <span key={item.date}>{item.label}</span>
        ))}
      </div>
      <div className="tp-admin-chart-legend">
        {series.map((entry) => (
          <div key={entry.key} className="tp-admin-legend-row">
            <span className="tp-admin-legend-dot" style={{ backgroundColor: entry.color }} />
            <strong>{entry.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ data, valueKey, labelKey, colors = CHART_COLORS }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  return (
    <div className="tp-admin-horizontal-bars">
      {data.map((item, index) => (
        <div key={item[labelKey]} className="tp-admin-horizontal-row">
          <div className="tp-admin-horizontal-meta">
            <strong>{item[labelKey]}</strong>
            <span>{item[valueKey]}</span>
          </div>
          <div className="tp-admin-bar-track">
            <div className="tp-admin-bar-fill" style={{ width: `${(Number(item[valueKey] || 0) / max) * 100}%`, background: colors[index % colors.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingBars({ data }) {
  const normalized = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: Number(data.find((item) => Number(item.rating) === rating)?.count || 0),
  }));
  const max = Math.max(1, ...normalized.map((item) => item.count));
  return (
    <div className="tp-admin-rating-bars">
      {normalized.map((item) => (
        <div key={item.rating} className="tp-admin-rating-row">
          <span>{item.rating}★</span>
          <div className="tp-admin-bar-track">
            <div className="tp-admin-bar-fill is-completed" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function HealthProgress({ health }) {
  const total = Math.max(health?.total || 0, 1);
  const segments = [
    { label: "Active", value: health?.active || 0, color: "#0f766e" },
    { label: "Completed", value: health?.completed || 0, color: "#2563eb" },
    { label: "Cancelled", value: health?.cancelled || 0, color: "#dc2626" },
  ];
  return (
    <div className="tp-admin-health-progress">
      <div className="tp-admin-health-track">
        {segments.map((segment) => (
          <div key={segment.label} style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }} />
        ))}
      </div>
      <div className="tp-admin-chart-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="tp-admin-legend-row">
            <span className="tp-admin-legend-dot" style={{ backgroundColor: segment.color }} />
            <strong>{segment.label}</strong>
            <span>{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard().then(setData).catch((err) => setError(err.message || "Unable to load dashboard."));
  }, []);

  const lastUpdated = useMemo(() => formatDate(new Date().toISOString(), true), []);

  if (error) return <div className="tp-admin-card tp-admin-error">{error}</div>;
  if (!data) return <div className="tp-admin-card">Loading dashboard…</div>;

  const stats = data.stats || {};
  const analytics = data.analytics || {};

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Platform overview"
        title="TripPlanner Analytics Control Center"
        subtitle="Operational KPIs, growth, demand, supply, feedback, and support analytics in one real-time dashboard."
      />

      <section className="tp-admin-stats">
        {Object.entries(stats).map(([key, value]) => (
          <StatCard key={key} label={key.replaceAll("_", " ")} value={value} icon={ICONS[key] || <Compass size={18} />} />
        ))}
      </section>

      <section className="tp-admin-grid">
        <ChartCard title="Bookings by status" subtitle="Live mix of all booking states across the platform." updatedAt={lastUpdated}>
          <DoughnutChart data={analytics.booking_status_chart || []} valueKey="count" labelKey="status" />
        </ChartCard>

        <ChartCard title="Platform health" subtitle="Active, completed, and cancelled booking load." updatedAt={lastUpdated}>
          <HealthProgress health={analytics.platform_health} />
          <div className="tp-admin-health-grid">
            {Object.entries(data.health || {}).map(([key, value]) => (
              <div key={key} className="tp-admin-health-item">
                <span>{key.replaceAll("_", " ")}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="tp-admin-grid">
        <ChartCard title="Booking trend over time" subtitle="30-day booking creation trend." updatedAt={lastUpdated}>
          <LineChart
            data={analytics.booking_trend || []}
            series={[
              { key: "bookings", label: "Bookings", color: "#2563eb" },
              { key: "contacts", label: "Contacts", color: "#0f766e" },
              { key: "chats", label: "Chats", color: "#f59e0b" },
            ]}
          />
        </ChartCard>

        <ChartCard title="User growth vs guide growth" subtitle="30-day account creation comparison." updatedAt={lastUpdated}>
          <LineChart
            data={analytics.growth_trend || []}
            series={[
              { key: "users", label: "Users", color: "#2563eb" },
              { key: "guides", label: "Guides", color: "#7c3aed" },
            ]}
          />
        </ChartCard>
      </section>

      <section className="tp-admin-grid">
        <ChartCard title="Top saved destinations" subtitle="Most frequently saved itinerary locations." updatedAt={lastUpdated}>
          <HorizontalBars data={analytics.top_destinations || []} valueKey="count" labelKey="destination" />
        </ChartCard>

        <ChartCard title="Ratings distribution" subtitle="Current review spread across all guide feedback." updatedAt={lastUpdated}>
          <RatingBars data={analytics.review_distribution || []} />
        </ChartCard>
      </section>

      <section className="tp-admin-grid">
        <ChartCard title="Recent signups" subtitle="Latest accounts created on the platform.">
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
        </ChartCard>

        <ChartCard title="Recent booking activity" subtitle="Latest booking movements needing attention.">
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
        </ChartCard>
      </section>

      <section className="tp-admin-grid">
        <ChartCard title="Latest reviews" subtitle="Fresh feedback entering the quality loop.">
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
        </ChartCard>

        <ChartCard title="Ops summary" subtitle="High-signal operational checkpoints.">
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
        </ChartCard>
      </section>
    </div>
  );
}
