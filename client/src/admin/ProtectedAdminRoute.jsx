import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedAdminRoute({ isAdmin, authReady }) {
  if (!authReady) {
    return (
      <div className="tp-admin-shell">
        <div className="tp-admin-main">
          <div className="tp-admin-card">
            Loading admin workspace…
          </div>
        </div>
      </div>
    );
  }
  return isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
}
