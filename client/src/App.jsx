import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";

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
  }, []);

  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
