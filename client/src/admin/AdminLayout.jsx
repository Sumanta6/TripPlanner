import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, BookOpen, CalendarCheck2, LifeBuoy, LogOut, MessageSquareText, Shield, Star, Users } from "lucide-react";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
  { to: "/admin/users", label: "Users", icon: <Users size={18} /> },
  { to: "/admin/guides", label: "Guides", icon: <Shield size={18} /> },
  { to: "/admin/bookings", label: "Bookings", icon: <CalendarCheck2 size={18} /> },
  { to: "/admin/itineraries", label: "Itineraries", icon: <BookOpen size={18} /> },
  { to: "/admin/reviews", label: "Reviews", icon: <Star size={18} /> },
  { to: "/admin/support", label: "Support", icon: <LifeBuoy size={18} /> },
];

export default function AdminLayout({ currentUser, onLogout }) {
  return (
    <div className="tp-admin-shell">
      <aside className="tp-admin-sidebar">
        <div className="tp-admin-brand">
          <img className="tp-admin-brand-logo" src="/brand-logo.png" alt="TripPlanner" />
          <div>
            <strong>TripPlanner</strong>
            <span>Admin Dashboard</span>
          </div>
        </div>
        <nav className="tp-admin-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `tp-admin-link ${isActive ? "is-active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="tp-admin-logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>
      <div className="tp-admin-main">
        <header className="tp-admin-header">
          <div>
            <p className="tp-admin-kicker">Administrator</p>
            <h1>Control Center</h1>
          </div>
          <div className="tp-admin-header-search">
            <MessageSquareText size={16} />
            <span>Live platform oversight</span>
          </div>
          <div className="tp-admin-user">
            <div className="tp-admin-user-avatar">{(currentUser?.email || "A")[0]?.toUpperCase()}</div>
            <div>
              <strong>{currentUser?.full_name || currentUser?.email || "Admin"}</strong>
              <span>{currentUser?.email}</span>
            </div>
          </div>
        </header>
        <main className="tp-admin-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
