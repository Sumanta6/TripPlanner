import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Destinations from "./pages/Destinations";
import Plantrip from "./pages/Plantrip";
import ResetPassword from "./pages/ResetPassword";
import ContactUs from "./pages/ContactUs";
import Blog from "./pages/Blog";
import HowItWorks from "./pages/HowItWorks";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DestinationDetails from "./pages/DestinationDetails";
import Guides from "./pages/Guides";
import SavedTrips from "./pages/SavedTrips";
import MyTrips from "./pages/MyTrips";
import TripDetail from "./pages/TripDetail";
import { Toaster } from "react-hot-toast";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // =========================
  // LOAD LOGIN STATE ON APP START
  // =========================
  useEffect(() => {
    const loggedIn =
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true";

    setIsLoggedIn(loggedIn);

    const email = localStorage.getItem("userEmail");
    if (email) setUserEmail(email);

    // Load theme
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

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
          <Route path="/profile" element={<Profile setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/settings" element={<Settings setIsLoggedIn={setIsLoggedIn} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
