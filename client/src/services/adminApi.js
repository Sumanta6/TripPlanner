import axios from "axios";

const ADMIN_TOKEN_KEY = "tripplanner.admin.token";
const AUTH_META_KEY = "tripplanner.auth.meta";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function storeAdminToken(token, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  storage.setItem(ADMIN_TOKEN_KEY, token);
  other.removeItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getStoredAuthMeta() {
  const value = localStorage.getItem(AUTH_META_KEY) || sessionStorage.getItem(AUTH_META_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function storeAuthMeta(meta, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  storage.setItem(AUTH_META_KEY, JSON.stringify(meta));
  other.removeItem(AUTH_META_KEY);
}

export function clearAuthMeta() {
  localStorage.removeItem(AUTH_META_KEY);
  sessionStorage.removeItem(AUTH_META_KEY);
}

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.detail ||
      error.message ||
      "Request failed.";
    return Promise.reject(new Error(message));
  }
);

export const adminCheckAuth = () => api.get("/api/admin/check-auth/").then((res) => res.data);
export const fetchAdminDashboard = () => api.get("/api/admin/dashboard/").then((res) => res.data);
export const fetchAdminUsers = (params = {}) => api.get("/api/admin/users/", { params }).then((res) => res.data);
export const fetchAdminGuides = (params = {}) => api.get("/api/admin/guides/", { params }).then((res) => res.data);
export const fetchAdminBookings = (params = {}) => api.get("/api/admin/bookings/", { params }).then((res) => res.data);
export const updateAdminBookingStatus = (id, status) =>
  api.patch(`/api/admin/bookings/${id}/status/`, { status }).then((res) => res.data);
export const fetchAdminItineraries = (params = {}) =>
  api.get("/api/admin/itineraries/", { params }).then((res) => res.data);
