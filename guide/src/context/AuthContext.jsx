/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides the logged-in guide's profile globally so every page can access it
 * without prop-drilling or repeated API calls.
 *
 * Usage inside any protected component:
 *   const { profile, loading, error, refreshProfile } = useAuth();
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMyProfile, updateMyProfile, initCsrf } from '../services/guidesService';

const AuthContext = createContext(null);

export function AuthProvider({ children, loggedIn, onLogout }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!loggedIn) {
            setProfile(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await initCsrf();
            const data = await getMyProfile();
            setProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [loggedIn]);

    // Fetch whenever loggedIn changes (login / logout)
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    /**
     * Update specific profile fields (e.g. availability toggle).
     * Optimistically updates local state then syncs with server.
     */
    const patchProfile = useCallback(async (updates) => {
        setError(null);
        try {
            const updated = await updateMyProfile(updates);
            setProfile(updated);
            return updated;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const logout = useCallback(() => {
        setProfile(null);
        setError(null);
        onLogout();
    }, [onLogout]);

    return (
        <AuthContext.Provider
            value={{
                profile,
                loading,
                error,
                refreshProfile: fetchProfile,
                patchProfile,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/** Convenience hook */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
