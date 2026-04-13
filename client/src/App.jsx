import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Destinations from "./pages/Destinations";
import Plantrip from "./pages/Plantrip";
import ResetPassword from "./pages/ResetPassword";
import ContactUs from "./pages/ContactUs";
import Blog from "./pages/Blog";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DestinationDetails from "./pages/DestinationDetails";
import Guides from "./pages/Guides";
import SavedTrips from "./pages/SavedTrips";
import MyTrips from "./pages/MyTrips";
import TripDetail from "./pages/TripDetail";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";
import ProtectedAdminRoute from "./admin/ProtectedAdminRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/Dashboard";
import AdminUsers from "./admin/Users";
import AdminGuides from "./admin/Guides";
import AdminBookings from "./admin/Bookings";
import AdminItineraries from "./admin/Itineraries";
import AdminReviews from "./admin/Reviews";
import AdminSupport from "./admin/Support";
import { adminCheckAuth, getAdminToken, getStoredAuthMeta, storeAuthMeta } from "./services/adminApi";
import { AUTH_CHANGED_EVENT, clearAllAuthState } from "./utils/smartAuth";
import "./admin/admin.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authMeta, setAuthMeta] = useState(() => getStoredAuthMeta());
  const [authReady, setAuthReady] = useState(false);

  const syncLocalAuthState = useCallback(() => {
    const loggedIn =
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true";

    const email =
      localStorage.getItem("userEmail") ||
      sessionStorage.getItem("userEmail") ||
      "";

    setIsLoggedIn(loggedIn);
    setUserEmail(email);
    setAuthMeta(getStoredAuthMeta());
  }, []);

  // =========================
  // LOAD LOGIN STATE ON APP START
  // =========================
  useEffect(() => {
    let active = true;

    const hydrateAuth = async () => {
      syncLocalAuthState();

      const storedMeta = getStoredAuthMeta();
      const adminToken = getAdminToken();

      if (storedMeta?.role === "admin") {
        if (!adminToken) {
          clearAllAuthState({ emit: false });
          setAuthMeta(null);
          setIsLoggedIn(false);
          setUserEmail("");
          if (active) setAuthReady(true);
          return;
        }

        try {
          const data = await adminCheckAuth();
          if (!active) return;
          const nextMeta = { role: "admin", user: data?.user || null };
          storeAuthMeta(nextMeta, Boolean(localStorage.getItem("tripplanner.admin.token")));
          setAuthMeta(nextMeta);
          setIsLoggedIn(false);
          setUserEmail("");
        } catch {
          if (!active) return;
          clearAllAuthState({ emit: false });
          setAuthMeta(null);
          setIsLoggedIn(false);
          setUserEmail("");
        }
      }

      if (active) setAuthReady(true);
    };

    // Load theme
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    void hydrateAuth();

    const handleAuthChange = () => {
      setAuthReady(false);
      void hydrateAuth();
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, [syncLocalAuthState]);

  const handleAdminLogout = () => {
    clearAllAuthState();
    setAuthMeta(null);
    setIsLoggedIn(false);
    setUserEmail("");
    window.location.href = "/";
  };

  const isAdmin = authMeta?.role === "admin";

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* ========================= */}
        {/* LANDING (NO LAYOUT) */}
        {/* ========================= */}
        <Route
          path="/"
          element={<Landing setIsLoggedIn={setIsLoggedIn} />}
        />
        <Route path="/login" element={<Login />} />

        {/* ========================= */}
        {/* RESET PASSWORD (NO LAYOUT) */}
        {/* ========================= */}
        <Route
          path="/reset-password/:uid/:token"
          element={<ResetPassword />}
        />

        {/* ========================= */}
        {/* PAGES WITH LAYOUT */}
        {/* ========================= */}
        <Route
          element={
            <Layout
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
              userEmail={userEmail}
            />
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetails />} />
          <Route path="/saved-trips" element={<SavedTrips />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/plan-trip" element={<Plantrip />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/profile" element={<Profile setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/settings" element={<Settings setIsLoggedIn={setIsLoggedIn} />} />
        </Route>

        <Route element={<ProtectedAdminRoute isAdmin={isAdmin} authReady={authReady} />}>
          <Route element={<AdminLayout currentUser={authMeta?.user || null} onLogout={handleAdminLogout} />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/guides" element={<AdminGuides />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/itineraries" element={<AdminItineraries />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/support" element={<AdminSupport />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
