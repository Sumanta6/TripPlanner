import Navbar from "./Navbar";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

export default function Layout({
  isLoggedIn,
  setIsLoggedIn,
  userEmail,
}) {
  return (
    <div className="app-layout">
      <Navbar
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        userEmail={userEmail}
      />

      <main className="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
