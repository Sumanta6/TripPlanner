/**
 * guidesService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised API service for all Guide-related backend calls.
 * Uses session-cookie authentication (withCredentials: true) matching the
 * existing accounts app pattern.
 *
 * Base URL: http://127.0.0.1:8000/api/guides/
 */

import axios from 'axios';

const GUIDE_TOKEN_KEY = 'guideAuthToken';

export function getGuideAuthToken() {
    return localStorage.getItem(GUIDE_TOKEN_KEY) || sessionStorage.getItem(GUIDE_TOKEN_KEY) || '';
}

export function storeGuideAuthToken(token, remember = false) {
    if (!token) return;
    if (remember) {
        localStorage.setItem(GUIDE_TOKEN_KEY, token);
        sessionStorage.removeItem(GUIDE_TOKEN_KEY);
        return;
    }
    sessionStorage.setItem(GUIDE_TOKEN_KEY, token);
    localStorage.removeItem(GUIDE_TOKEN_KEY);
}

export function clearGuideAuthToken() {
    localStorage.removeItem(GUIDE_TOKEN_KEY);
    sessionStorage.removeItem(GUIDE_TOKEN_KEY);
}

// ── Helper to get CSRF token from cookies ─────────────────────────────────────
export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: 'http://localhost:8000/api/guides/',
    withCredentials: true,       // send session cookie
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor – attach CSRF manually ────────────────────────────────
api.interceptors.request.use((config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    const guideToken = getGuideAuthToken();
    if (guideToken) {
        config.headers.Authorization = `Bearer ${guideToken}`;
    }
    return config;
}, (error) => Promise.reject(error));

// ── Response interceptor – normalise errors ───────────────────────────────────

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error?.response?.data?.error ||
            error?.response?.data?.detail ||
            Object.values(error?.response?.data || {}).flat().join(' ') ||
            error.message ||
            'An unexpected error occurred.';
        return Promise.reject(new Error(message));
    }
);

// ── Public endpoints ──────────────────────────────────────────────────────────

/** GET /accounts/csrf-cookie/ – ensure CSRF cookie is set */
export async function initCsrf() {
    await api.get('http://localhost:8000/accounts/csrf-cookie/');
}

/** GET /api/guides/ – list of all guides (public) */
export async function getGuides() {
    const { data } = await api.get('');
    return data;
}

/** GET /api/guides/<id>/ – single guide profile (public) */
export async function getGuideById(id) {
    const { data } = await api.get(`${id}/`);
    return data;
}

// ── Authenticated – My Profile ─────────────────────────────────────────────────

/** GET /api/guides/me/ – the logged-in guide's profile */
export async function getMyProfile() {
    const { data } = await api.get('me/');
    return data;
}

/**
 * PATCH /api/guides/me/ – partially update profile or toggle availability.
 * @param {Object} updates – fields to update, e.g. { availability: 'busy' }
 */
export async function updateMyProfile(updates) {
    const { data } = await api.patch('me/', updates);
    return data;
}

// ── Authenticated – Bookings (Travelers) ──────────────────────────────────────

/**
 * GET /api/guides/me/bookings/ – traveler bookings assigned to the guide.
 * @param {string|null} statusFilter – optional 'active'|'upcoming'|'pending'|'completed'
 */
export async function getMyBookings(statusFilter = null) {
    const params = statusFilter ? { status: statusFilter } : {};
    const { data } = await api.get('me/bookings/', { params });
    return data;
}

/**
 * PATCH /api/guides/me/bookings/<id>/status/ – accept or reject a booking
 * @param {number} id – booking ID
 * @param {string} status – new status (e.g., 'active', 'rejected')
 */
export async function updateBookingStatus(id, status) {
    const { data } = await api.patch(`me/bookings/${id}/status/`, { status });
    return data;
}

/** GET /api/guides/bookings/<id>/chat/ – booking chat thread */
export async function getBookingChat(id) {
    const { data } = await api.get(`bookings/${id}/chat/`);
    return data;
}

/** POST /api/guides/bookings/<id>/chat/ – send booking chat message */
export async function sendBookingChatMessage(id, message) {
    const { data } = await api.post(`bookings/${id}/chat/`, { message });
    return data;
}

// ── Authenticated – Activity Feed ─────────────────────────────────────────────

/**
 * GET /api/guides/me/activity/ – recent activity feed.
 * @param {number} limit – optional max items (default 20 on backend)
 */
export async function getMyActivity(limit = 20) {
    const { data } = await api.get('me/activity/', { params: { limit } });
    return data;
}

// ── Authenticated – Dashboard Stats ───────────────────────────────────────────

/** GET /api/guides/me/dashboard/ – aggregated KPI stats */
export async function getMyDashboard() {
    const { data } = await api.get('me/dashboard/');
    return data;
}

export default api;
