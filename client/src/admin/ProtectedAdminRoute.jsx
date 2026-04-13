import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedAdminRoute({ isAdmin, authReady }) {
  if (!authReady) return null;
  return isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
}
