import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import ClientChatLauncher from "./ClientChatLauncher";

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

      <ClientChatLauncher isLoggedIn={isLoggedIn} />
    </div>
  );
}
