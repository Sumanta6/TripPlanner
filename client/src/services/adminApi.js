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

const get = (path, params = {}) => api.get(path, { params }).then((res) => res.data);
const post = (path, data = {}) => api.post(path, data).then((res) => res.data);
const patch = (path, data = {}) => api.patch(path, data).then((res) => res.data);
const remove = (path) => api.delete(path).then((res) => res.data);

export const adminCheckAuth = () => get("/api/admin/check-auth/");
export const fetchAdminDashboard = () => get("/api/admin/dashboard/");

export const fetchAdminUsers = (params = {}) => get("/api/admin/users/", params);
export const createAdminUser = (data) => post("/api/admin/users/", data);
export const fetchAdminUserDetail = (id) => get(`/api/admin/users/${id}/`);
export const updateAdminUser = (id, data) => patch(`/api/admin/users/${id}/`, data);
export const deleteAdminUser = (id) => remove(`/api/admin/users/${id}/`);
export const triggerAdminUserResetPassword = (id) => post(`/api/admin/users/${id}/reset-password/`);

export const fetchAdminGuides = (params = {}) => get("/api/admin/guides/", params);
export const createAdminGuide = (data) => post("/api/admin/guides/", data);
export const fetchAdminGuideDetail = (id) => get(`/api/admin/guides/${id}/`);
export const updateAdminGuide = (id, data) => patch(`/api/admin/guides/${id}/`, data);
export const deleteAdminGuide = (id) => remove(`/api/admin/guides/${id}/`);

export const fetchAdminBookings = (params = {}) => get("/api/admin/bookings/", params);
export const createAdminBooking = (data) => post("/api/admin/bookings/", data);
export const fetchAdminBookingDetail = (id) => get(`/api/admin/bookings/${id}/`);
export const updateAdminBooking = (id, data) => patch(`/api/admin/bookings/${id}/`, data);
export const updateAdminBookingStatus = (id, status) => patch(`/api/admin/bookings/${id}/status/`, { status });
export const deleteAdminBooking = (id) => remove(`/api/admin/bookings/${id}/`);

export const fetchAdminItineraries = (params = {}) => get("/api/admin/itineraries/", params);
export const createAdminItinerary = (data) => post("/api/admin/itineraries/", data);
export const fetchAdminItineraryDetail = (id) => get(`/api/admin/itineraries/${id}/`);
export const updateAdminItinerary = (id, data) => patch(`/api/admin/itineraries/${id}/`, data);
export const deleteAdminItinerary = (id) => remove(`/api/admin/itineraries/${id}/`);

export const fetchAdminReviews = (params = {}) => get("/api/admin/reviews/", params);
export const fetchAdminReviewDetail = (id) => get(`/api/admin/reviews/${id}/`);
export const deleteAdminReview = (id) => remove(`/api/admin/reviews/${id}/`);

export const fetchAdminContacts = (params = {}) => get("/api/admin/contacts/", params);
export const fetchAdminContactDetail = (id) => get(`/api/admin/contacts/${id}/`);
export const updateAdminContact = (id, data) => patch(`/api/admin/contacts/${id}/`, data);
export const deleteAdminContact = (id) => remove(`/api/admin/contacts/${id}/`);

export const fetchAdminChatThreads = (params = {}) => get("/api/admin/chat-threads/", params);
export const fetchAdminChatThreadDetail = (bookingId) => get(`/api/admin/chat-threads/${bookingId}/`);
