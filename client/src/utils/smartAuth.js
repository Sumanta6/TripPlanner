import { clearAdminToken, clearAuthMeta, storeAdminToken, storeAuthMeta } from "../services/adminApi";

export const AUTH_CHANGED_EVENT = "tripplanner-auth-changed";

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function clearAllAuthState({ emit = true } = {}) {
  localStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  sessionStorage.removeItem("userEmail");
  localStorage.removeItem("is_logged_in");
  sessionStorage.removeItem("is_logged_in");
  clearAdminToken();
  clearAuthMeta();
  if (emit) notifyAuthChanged();
}

export function persistTravelerSession(email, remember) {
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  if (remember) {
    localStorage.setItem("isLoggedIn", "true");
    sessionStorage.removeItem("isLoggedIn");
  } else {
    sessionStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("isLoggedIn");
  }
  storage.setItem("userEmail", email || "");
  other.removeItem("userEmail");
}

export function handleUnifiedLoginSuccess(data, remember, navigate, setIsLoggedIn) {
  const role = data?.role || data?.user?.role;
  const user = data?.user || null;
  clearAllAuthState({ emit: false });

  if (role === "admin") {
    storeAdminToken(data?.admin_token || "", remember);
    storeAuthMeta({ role, user }, remember);
    setIsLoggedIn?.(false);
    notifyAuthChanged();
    navigate("/admin/dashboard");
    return;
  }

  if (role === "guide") {
    const guideToken = data?.guide_token || "";
    const target = new URL("http://localhost:3001/");
    target.searchParams.set("guide_token", guideToken);
    target.searchParams.set("remember", remember ? "1" : "0");
    window.location.assign(target.toString());
    return;
  }

  persistTravelerSession(data?.email || user?.email || "", remember);
  storeAuthMeta({ role: "traveler", user }, remember);
  setIsLoggedIn?.(true);
  notifyAuthChanged();
  navigate("/home");
}
