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

// ─────────────────────────────────────────────────────────────────────────────
// TRAVELER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/** GET /accounts/profile/me/ – the logged-in traveler's profile */
export async function getMyProfile() {
    const { data } = await api.get("/accounts/profile/me/");
    return data;
}

/** PATCH /accounts/profile/me/ – partially update the traveler's profile */
export async function updateMyProfile(updates) {
    const { data } = await api.patch("/accounts/profile/me/", updates);
    return data;
}

export default api;
