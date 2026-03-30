import React, { useState, useEffect } from "react";
import { getGuides, requestGuideWithItinerary, initCsrf } from "../services/api";
import { Star, MapPin, Languages, CheckCircle, X, Search, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import "./Guides.css";

export default function Guides() {
    const navigate = useNavigate();
    const location = useLocation();
    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [bookingData, setBookingData] = useState({
        destination: "",
        trip_start: "",
        trip_end: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [modalError, setModalError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState("all");
    const [languageFilter, setLanguageFilter] = useState("all");

    useEffect(() => {
        let alive = true;
        async function fetchGuides() {
            setLoading(true);
            try {
                const state = location.state || {};
                const params = {};
                if (state.trip_start) params.trip_start = state.trip_start;
                if (state.trip_end) params.trip_end = state.trip_end;

                const data = await getGuides(params);
                if (alive) setGuides(data);
            } catch (err) {
                const msg = err.response?.data?.detail || "Failed to load guides.";
                if (alive) setError(msg);
                toast.error(msg);
            } finally {
                if (alive) setLoading(false);
            }
        }
        fetchGuides();
        return () => { alive = false; };
    }, [location.state]);

    const isLoggedIn = () => {
        return localStorage.getItem("isLoggedIn") === "true" || sessionStorage.getItem("isLoggedIn") === "true";
    };

    const handleOpenModal = (guide) => {
        if (!isLoggedIn()) {
            navigate("/"); // redirect to login if not authenticated
            return;
        }
        setSelectedGuide(guide);
        setShowModal(true);
        const state = location.state || {};
        setBookingData({
            destination: state.destination || "",
            trip_start: state.trip_start || "",
            trip_end: state.trip_end || "",
            notes: state.itineraryId ? `Hi ${guide.full_name},\n\nI have an AI-generated itinerary attached to this request and would love for you to guide me on this trip.` : "",
            itinerary_id: state.itineraryId || null
        });
        setModalError("");
        setSuccessMessage("");
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedGuide(null);
    };

    const handleInputChange = (e) => {
        setBookingData({ ...bookingData, [e.target.name]: e.target.value });
    };

    const checkConflict = () => {
        if (!bookingData.trip_start || !bookingData.trip_end || !selectedGuide?.booked_ranges) return null;

        const start = new Date(bookingData.trip_start);
        const end = new Date(bookingData.trip_end);

        for (const range of selectedGuide.booked_ranges) {
            const bStart = new Date(range.trip_start);
            const bEnd = new Date(range.trip_end);

            // Check if (start <= bEnd) AND (end >= bStart)
            if (start <= bEnd && end >= bStart) {
                return `Guide is already booked from ${bStart.toLocaleDateString()} to ${bEnd.toLocaleDateString()}.`;
            }
        }
        return null;
    };

    const conflictWarning = checkConflict();

    const availableLanguages = Array.from(
        new Set(
            guides.flatMap((guide) => Array.isArray(guide.languages) ? guide.languages : [])
        )
    ).sort((a, b) => a.localeCompare(b));

    const filteredGuides = guides.filter((guide) => {
        const name = String(guide.full_name || "").toLowerCase();
        const specialization = String(guide.specialization || "").toLowerCase();
        const destinations = (guide.destinations || []).join(" ").toLowerCase();
        const languages = (guide.languages || []).join(" ").toLowerCase();
        const search = searchTerm.trim().toLowerCase();

        const matchesSearch = !search || [name, specialization, destinations, languages].some((value) => value.includes(search));
        const matchesAvailability = availabilityFilter === "all" || guide.availability_badge === availabilityFilter;
        const matchesLanguage = languageFilter === "all" || (guide.languages || []).includes(languageFilter);

        return matchesSearch && matchesAvailability && matchesLanguage;
    });

    const handleSubmitBooking = async (e) => {
        e.preventDefault();

        if (!bookingData.destination.trim()) {
            setModalError("Destination is required.");
            return;
        }
        if (!bookingData.trip_start || !bookingData.trip_end) {
            setModalError("Both start and end dates are required.");
            return;
        }
        if (new Date(bookingData.trip_end) < new Date(bookingData.trip_start)) {
            setModalError("End date cannot be earlier than start date.");
            return;
        }

        const conflict = checkConflict();
        if (conflict) {
            setModalError(conflict);
            return;
        }

        setSubmitting(true);
        setModalError("");
        try {
            await initCsrf();
            await requestGuideWithItinerary(selectedGuide.id, bookingData);
            setSuccessMessage("Request sent successfully! The guide will review it soon.");
            toast.success("Booking request sent!");
            setTimeout(() => {
                handleCloseModal();
            }, 2500);
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || "Failed to send request. Please try again.";
            setModalError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="guides-page flex-center"><div className="loader-spinner"></div></div>;
    }

    if (error) {
        return (
            <div className="guides-page flex-center">
                <div className="empty-state-card error-card">
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="guides-page">
            <div className="guides-container setup-animation">
                <div className="guides-header text-center mb-6">
                    <span className="guides-header-badge">Verified Local Experts</span>
                    <h1>Find Your Perfect Guide</h1>
                    <p className="text-muted">Browse trusted local experts, compare availability, and send a polished booking request with confidence.</p>
                </div>

                <div className="guides-filters">
                    <div className="guides-filter-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by guide, destination, or specialty"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="guides-filter-select">
                        <Filter size={16} />
                        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
                            <option value="all">All availability</option>
                            <option value="Available">Available</option>
                            <option value="Booked">Booked</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>
                    <div className="guides-filter-select">
                        <Languages size={16} />
                        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                            <option value="all">All languages</option>
                            {availableLanguages.map((language) => (
                                <option key={language} value={language}>{language}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredGuides.length === 0 ? (
                    <div className="empty-state-card mx-auto mt-6">
                        <MapPin size={48} className="empty-icon text-muted mx-auto" />
                        <h2 className="text-center">No Guides Found</h2>
                        <p className="text-center">Try adjusting your filters or search terms to explore more local experts.</p>
                    </div>
                ) : (
                    <div className="guides-grid">
                        {filteredGuides.map(guide => (
                            <div key={guide.id} className="guide-card card">
                                <div className="guide-card-top">
                                    <div className="guide-avatar-wrap">
                                        <div className="guide-avatar-frame">
                                            {guide.profile_image ? (
                                                <img src={guide.profile_image} alt={guide.full_name} className="guide-avatar-img" />
                                            ) : (
                                                <div className="guide-avatar-placeholder">
                                                    {(guide.full_name || "G").substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`status-dot ${guide.availability_badge === 'Available' ? 'active' : 'busy'}`}></div>
                                    </div>
                                    <div className="guide-card-heading">
                                        <div className={`availability-banner mb-2 ${guide.availability_badge === 'Available' ? 'available' : 'booked'}`}>
                                            {guide.availability_badge}
                                        </div>
                                        <h3 className="guide-name">{guide.full_name}</h3>
                                        <p className="guide-specialty text-teal">{guide.specialization || "General Guide"}</p>
                                    </div>
                                </div>
                                <div className="guide-info">
                                    <div className="guide-stats">
                                        <span className="guide-stat-pill"><Star size={14} className="text-gold" /> {guide.rating || "New"}</span>
                                        <span className="guide-stat-pill"><CheckCircle size={14} className="text-green" /> {guide.tours_completed} tours</span>
                                    </div>

                                    <div className="guide-meta">
                                        <div className="meta-row">
                                            <MapPin size={16} />
                                            <div>
                                                <span className="meta-label">Destinations</span>
                                                <span>{(guide.destinations || []).length ? guide.destinations.join(", ") : "Flexible locations"}</span>
                                            </div>
                                        </div>
                                        <div className="meta-row">
                                            <Languages size={16} />
                                            <div>
                                                <span className="meta-label">Languages</span>
                                                <span>{(guide.languages || []).length ? guide.languages.join(", ") : "English"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {guide.bio && (
                                        <p className="guide-bio text-sm text-muted line-clamp-3">
                                            {guide.bio}
                                        </p>
                                    )}

                                    <button
                                        className={`btn-primary guide-cta ${guide.availability_badge !== "Available" ? "btn-disabled" : ""}`}
                                        disabled={guide.availability_badge !== "Available"}
                                        onClick={() => handleOpenModal(guide)}
                                    >
                                        {guide.availability_badge === "Available" ? "Request Guide" : "Currently Unavailable"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* REQUEST MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="booking-modal card setup-animation">
                        <button className="close-btn" onClick={handleCloseModal}><X size={20} /></button>

                        <div className="modal-header">
                            <h2>Request {selectedGuide?.full_name}</h2>
                            <p className="text-muted text-sm">Fill in your trip details.</p>
                            {bookingData.itinerary_id && (
                                <div className="bg-teal-50 border border-teal-200 text-teal-700 px-3 py-2 rounded-lg text-sm mt-3 flex items-center gap-2">
                                    <span>✨</span> AI Itinerary Attached
                                </div>
                            )}
                        </div>

                        {successMessage ? (
                            <div className="booking-success text-center py-6">
                                <CheckCircle size={48} className="text-green mx-auto mb-3" />
                                <h3>{successMessage}</h3>
                            </div>
                        ) : (
                            <form className="booking-form mt-4" onSubmit={handleSubmitBooking}>
                                {modalError && <div className="alert-error mb-4">{modalError}</div>}
                                {conflictWarning && !modalError && (
                                    <div className="alert-warning mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm flex items-start gap-2">
                                        <span>⚠️</span> {conflictWarning}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Destination <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="destination"
                                        required
                                        className="edit-input w-full"
                                        placeholder="e.g. Kathmandu Valley"
                                        value={bookingData.destination}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-row flex gap-4 mt-3">
                                    <div className="form-group w-full">
                                        <label>Start Date <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            name="trip_start"
                                            required
                                            className="edit-input w-full"
                                            value={bookingData.trip_start}
                                            onChange={handleInputChange}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="form-group w-full">
                                        <label>End Date <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            name="trip_end"
                                            required
                                            className="edit-input w-full"
                                            value={bookingData.trip_end}
                                            onChange={handleInputChange}
                                            min={bookingData.trip_start || new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                <div className="form-group mt-3">
                                    <label>Notes / Requirements</label>
                                    <textarea
                                        name="notes"
                                        rows="3"
                                        className="edit-input w-full"
                                        placeholder="Tell the guide what you're looking for..."
                                        value={bookingData.notes}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>

                                <div className="modal-footer flex gap-2 justify-end mt-6">
                                    <button type="button" className="btn-outline" onClick={handleCloseModal} disabled={submitting}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? "Sending..." : "Send Request"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
