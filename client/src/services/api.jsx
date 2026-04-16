import axios from "axios";

// ── Helper to get CSRF token from cookies ─────────────────────────────────────
export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: "http://localhost:8000",
    withCredentials: true,
    xsrfCookieName: "csrftoken",
    xsrfHeaderName: "X-CSRFToken",
    headers: {
        "Content-Type": "application/json",
    },
});

// ── Request interceptor – attach CSRF token on every request ─────────────────
api.interceptors.request.use((config) => {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
}, (error) => Promise.reject(error));

// ── Response interceptor – pass errors through; let components decide ─────────
//    We do NOT auto-logout or redirect here. Doing so causes the profile page
//    to boot the user out before they can even see an error message. Each
//    component that uses authenticated endpoints handles 401/403 itself.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Attach a friendly status code so components can check it easily
        if (error.response) {
            error.statusCode = error.response.status;
        }
        return Promise.reject(error);
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /accounts/csrf-cookie/ – ensure CSRF cookie is set before mutating */
export async function initCsrf() {
    await api.get("/accounts/csrf-cookie/");
}

export const getMyBookedTrips = () => api.get('/api/guides/my-trips/').then(res => res.data);

// ─────────────────────────────────────────────────────────────────────────────
// TRAVELER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/** GET /accounts/profile/me/ – the logged-in traveler's profile */
export async function getMyProfile() {
    const { data } = await api.get("/accounts/profile/me/");
    return data;
}

export async function getAuthStatus() {
    const { data } = await api.get("/accounts/check-auth/");
    return data;
}

/** PATCH /accounts/profile/me/ – partially update the traveler's profile */
export async function updateMyProfile(updates) {
    const { data } = await api.patch("/accounts/profile/me/", updates);
    return data;
}

export async function changeMyPassword(payload) {
    await initCsrf();
    const { data } = await api.post("/accounts/change-password/", payload);
    return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDES & BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/guides/ – fetch public list of all guides */
export async function getGuides(params = {}) {
    const { data } = await api.get("/api/guides/", { params });
    return data;
}

/** GET /api/guides/:id/ – fetch public detail for one guide */
export async function getGuideById(guideId, params = {}) {
    const { data } = await api.get(`/api/guides/${guideId}/`, { params });
    return data;
}

/** GET /api/guides/:id/reviews/ – fetch verified guide reviews */
export async function getGuideReviews(guideId) {
    const { data } = await api.get(`/api/guides/${guideId}/reviews/`);
    return data;
}

/** POST /api/guides/:id/request/ – request to book a guide */
export async function requestGuideWithItinerary(guideId, bookingData) {
    const { data } = await api.post(`/api/guides/${guideId}/request/`, bookingData);
    return data;
}

/** POST /api/guides/bookings/:id/cancel/ – cancel the current traveler's booking */
export async function cancelTravelerBooking(bookingId, payload = {}) {
    const { data } = await api.post(`/api/guides/bookings/${bookingId}/cancel/`, payload);
    return data;
}

/** POST /api/guides/reviews/ – create verified review */
export async function createGuideReview(payload) {
    const { data } = await api.post("/api/guides/reviews/", payload);
    return data;
}

/** GET /api/guides/bookings/:id/chat/ – fetch booking chat thread */
export async function getBookingChat(bookingId) {
    const { data } = await api.get(`/api/guides/bookings/${bookingId}/chat/`);
    return data;
}

/** POST /api/guides/bookings/:id/chat/ – send booking chat message */
export async function sendBookingChatMessage(bookingId, message) {
    const { data } = await api.post(`/api/guides/bookings/${bookingId}/chat/`, { message });
    return data;
}

/** GET /accounts/profile/requests/ – get the traveler's sent guide requests */
export async function getMyGuideRequests() {
    const { data } = await api.get("/accounts/profile/requests/");
    return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// ITINERARY
// ─────────────────────────────────────────────────────────────────────────────

export const generateItinerary = (data) => api.post('/api/itinerary/generate/', data).then(res => res.data);
export const saveItinerary     = (data) => api.post('/api/itinerary/save/', data).then(res => res.data);
export const getMyItineraries  = ()     => api.get('/api/itinerary/my/').then(res => res.data);
export const getItineraryDetail= (id)   => api.get(`/api/itinerary/${id}/`).then(res => res.data);
export const deleteItinerary   = (id)   => api.delete(`/api/itinerary/${id}/delete/`).then(res => res.data);
export const getPlannerDestinations = () =>
  api.get('/api/itinerary/planner-destinations/').then(res => res.data);

// ─────────────────────────────────────────────────────────────────────────────
// DESTINATIONS  (served from local GeoNames DB — no third-party dependency)
// ─────────────────────────────────────────────────────────────────────────────
/** GET /api/itinerary/destinations/ with optional params: search, province, category, page, page_size */
export const getDestinations = (params = {}, config = {}) =>
  api.get("/api/itinerary/destinations/", { params, ...config }).then((res) => res.data);

/** GET /api/itinerary/destinations/<geoname_id>/ */
export const getDestinationDetail = (geonameId) =>
  api.get(`/api/itinerary/destinations/${geonameId}/`).then(res => res.data);

export default api;
