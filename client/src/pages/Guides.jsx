import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    getGuides,
    getGuideById,
    requestGuideWithItinerary,
    initCsrf,
    cancelTravelerBooking,
    initiateEsewaPayment,
} from "../services/api";
import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Compass,
    CreditCard,
    Filter,
    Globe2,
    Languages,
    LoaderCircle,
    MapPin,
    Mountain,
    Search,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingUp,
    Wallet,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import BookingCancellationModal from "../components/BookingCancellationModal";
import "./Guides.css";

function getInitials(name) {
    return (name || "Guide")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "G";
}

function formatList(items, fallback) {
    return Array.isArray(items) && items.length ? items.join(", ") : fallback;
}

function formatDateLabel(dateString) {
    if (!dateString) return "Flexible";
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatReviewDate(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function getAvailabilityTone(availabilityBadge = "") {
    const badge = availabilityBadge.toLowerCase();
    if (badge.includes("available")) return "available";
    if (badge.includes("booked")) return "booked";
    return "limited";
}

function submitPostRedirect(paymentUrl, formData) {
    if (!paymentUrl || !formData || typeof formData !== "object") {
        throw new Error("Invalid payment redirect payload.");
    }

    const form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", paymentUrl);
    form.style.display = "none";

    Object.entries(formData).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.setAttribute("type", "hidden");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
}

function isNonPayableError(errorCode) {
    return [
        "already_paid",
        "booking_cancelled",
        "booking_completed",
        "booking_rejected",
        "booking_expired",
        "booking_not_payable",
        "invalid_payment_status",
    ].includes(errorCode);
}

function resolveExistingDraft(selectedGuide, requestedRetryId) {
    if (requestedRetryId && String(selectedGuide?.current_traveler_booking?.id) === String(requestedRetryId)) {
        return selectedGuide.current_traveler_booking;
    }
    if (requestedRetryId && String(selectedGuide?.latest_traveler_booking?.id) === String(requestedRetryId)) {
        return selectedGuide.latest_traveler_booking;
    }
    if (selectedGuide?.current_traveler_booking?.status === "payment_pending") {
        return selectedGuide.current_traveler_booking;
    }
    if (selectedGuide?.latest_traveler_booking?.status === "payment_pending") {
        return selectedGuide.latest_traveler_booking;
    }
    return null;
}

function getBookingStatusTitle(booking) {
    if (!booking) return "Booking update";
    if (booking.status === "payment_pending") {
        return booking.payment_status === "failed" ? "Payment retry required" : "Awaiting payment";
    }
    if (booking.status === "cancelled") {
        if (booking.status_updated_by_role === "traveler") return "Cancelled by you";
        if (booking.status_updated_by_role === "guide") return "Cancelled by guide";
        if (booking.status_updated_by_role === "admin") return "Cancelled by admin";
        return "Cancelled booking";
    }
    if (booking.status === "rejected" || booking.status === "auto_rejected") {
        return "Request not accepted";
    }
    if (booking.status === "completed") {
        return "Completed booking";
    }
    if (booking.status === "active") {
        return "Active booking";
    }
    if (booking.status === "accepted") {
        return "Accepted booking";
    }
    if (booking.status === "pending") {
        return "Pending request";
    }
    return "Booking update";
}

function buildConfidenceHighlights(guide) {
    return [
        {
            icon: ShieldCheck,
            title: "Trusted profile",
            text: guide.rating > 0 ? `${guide.rating.toFixed(1)} average guide rating` : "Newly onboarded local expert profile",
        },
        {
            icon: BriefcaseBusiness,
            title: "Field experience",
            text: guide.experience_years > 0 ? `${guide.experience_years} years leading trips` : "Growing professional guiding experience",
        },
        {
            icon: TrendingUp,
            title: "Trip delivery",
            text: `${guide.tours_completed || 0} completed tours recorded`,
        },
    ];
}

const STATUS_REASON_OPTIONS = [
    { value: "change_of_plans", label: "Change of plans" },
    { value: "found_another_option", label: "Found another option" },
    { value: "schedule_conflict", label: "Schedule conflict" },
    { value: "price_issue", label: "Price issue" },
    { value: "personal_reason", label: "Personal reason" },
    { value: "other", label: "Other", requiresNote: true },
];

export default function Guides() {
    const navigate = useNavigate();
    const location = useLocation();

    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedGuideId, setSelectedGuideId] = useState(null);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [bookingCancelTarget, setBookingCancelTarget] = useState(null);
    const [bookingCancelError, setBookingCancelError] = useState("");
    const [bookingCancelling, setBookingCancelling] = useState(false);
    const [bookingCancelReasonCode, setBookingCancelReasonCode] = useState("");
    const [bookingCancelReasonNote, setBookingCancelReasonNote] = useState("");
    const [bookingStep, setBookingStep] = useState("details");
    const [bookingProcessing, setBookingProcessing] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState("");
    const [paymentError, setPaymentError] = useState("");

    const [bookingData, setBookingData] = useState({
        destination: "",
        trip_start: "",
        trip_end: "",
        notes: "",
        itinerary_id: null,
    });
    const [successMessage, setSuccessMessage] = useState("");
    const [modalError, setModalError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState("all");
    const [languageFilter, setLanguageFilter] = useState("all");

    const getGuideQueryParams = useCallback(() => {
        const state = location.state || {};
        const params = {};
        if (state.trip_start) params.trip_start = state.trip_start;
        if (state.trip_end) params.trip_end = state.trip_end;
        return params;
    }, [location.state]);

    const fetchGuides = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const data = await getGuides(getGuideQueryParams());
            setGuides(Array.isArray(data) ? data : []);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to load guides.";
            if (!silent) {
                setError(msg);
                toast.error(msg);
            }
            throw err;
        } finally {
            if (!silent) setLoading(false);
        }
    }, [getGuideQueryParams]);

    const fetchGuideProfile = useCallback(async (guideId) => {
        setProfileLoading(true);
        setProfileError("");
        try {
            const detail = await getGuideById(guideId, getGuideQueryParams());
            setSelectedGuide(detail);
            return detail;
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || "Unable to load this guide profile.";
            setProfileError(msg);
            toast.error(msg);
            throw err;
        } finally {
            setProfileLoading(false);
        }
    }, [getGuideQueryParams]);

    const isLoggedIn = () =>
        localStorage.getItem("isLoggedIn") === "true" ||
        sessionStorage.getItem("isLoggedIn") === "true";

    const handleOpenProfile = useCallback((guide) => {
        const state = location.state || {};

        setSelectedGuideId(guide.id);
        setSelectedGuide(guide);
        setShowModal(true);
        setModalError("");
        setSuccessMessage("");
        setBookingCancelTarget(null);
        setBookingCancelError("");
        setProfileError("");
        setBookingData({
            destination: state.destination || "",
            trip_start: state.trip_start || "",
            trip_end: state.trip_end || "",
            notes: state.itineraryId
                ? `Hi ${guide.full_name},\n\nI have an AI-generated itinerary attached to this request and would love your help guiding this trip.`
                : "",
            itinerary_id: state.itineraryId || null,
        });
    }, [location.state]);

    useEffect(() => {
        let alive = true;

        async function loadGuides() {
            try {
                const data = await fetchGuides();
                if (!alive) return;

                const presetGuideId = location.state?.selectedGuideId;
                if (presetGuideId) {
                    const presetGuide = data.find((guide) => String(guide.id) === String(presetGuideId));
                    if (presetGuide) {
                        handleOpenProfile(presetGuide);
                        if (location.state?.retryBookingId) {
                            setBookingStep("payment");
                        }
                        if (location.state?.paymentSuccess && location.state?.confirmedBooking) {
                            setConfirmedBooking(location.state.confirmedBooking);
                            setConfirmedPaymentMethod("paid");
                            setBookingStep("confirmation");
                            // Clean history state so refresh doesn't trigger it again
                            window.history.replaceState({}, document.title);
                        }
                    }
                }
            } catch {
                // handled inside fetchGuides
            }
        }

        loadGuides();
        return () => {
            alive = false;
        };
    }, [fetchGuides, handleOpenProfile, location.state?.selectedGuideId]);

    useEffect(() => {
        if (!showModal || !selectedGuideId) return undefined;

        let alive = true;

        async function loadProfile() {
            try {
                await fetchGuideProfile(selectedGuideId);
            } catch {
                if (!alive) return;
            }
        }

        loadProfile();
        return () => {
            alive = false;
        };
    }, [showModal, selectedGuideId, fetchGuideProfile]);

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedGuideId(null);
        setSelectedGuide(null);
        setProfileError("");
        setModalError("");
        setSuccessMessage("");
        setBookingCancelTarget(null);
        setBookingCancelError("");
        setBookingStep("details");
        setBookingProcessing(false);
        setConfirmedBooking(null);
        setConfirmedPaymentMethod("");
    };

    const openCancelModal = (booking) => {
        setBookingCancelTarget(booking);
        setBookingCancelError("");
        setBookingCancelReasonCode("");
        setBookingCancelReasonNote("");
    };

    const closeCancelModal = () => {
        if (bookingCancelling) return;
        setBookingCancelTarget(null);
        setBookingCancelError("");
        setBookingCancelReasonCode("");
        setBookingCancelReasonNote("");
    };


    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setBookingData((current) => ({ ...current, [name]: value }));
    };

    const checkConflict = () => {
        if (!bookingData.trip_start || !bookingData.trip_end || !selectedGuide?.booked_ranges) return null;

        const start = new Date(bookingData.trip_start);
        const end = new Date(bookingData.trip_end);

        for (const range of selectedGuide.booked_ranges) {
            const bookedStart = new Date(range.trip_start);
            const bookedEnd = new Date(range.trip_end);

            if (start <= bookedEnd && end >= bookedStart) {
                return `Guide is already booked from ${bookedStart.toLocaleDateString()} to ${bookedEnd.toLocaleDateString()}.`;
            }
        }

        return null;
    };

    const conflictWarning = checkConflict();
    const currentTravelerBooking = selectedGuide?.current_traveler_booking || null;
    const latestTravelerBooking = selectedGuide?.latest_traveler_booking || null;
    const selectedGuideHasCancellableBooking = Boolean(currentTravelerBooking?.can_cancel);
    const selectedGuideHasBlockingBooking = Boolean(currentTravelerBooking);
    const selectedGuideHistoryOnly =
        Boolean(latestTravelerBooking) &&
        (!currentTravelerBooking || latestTravelerBooking.id !== currentTravelerBooking.id);

    const availableLanguages = useMemo(
        () =>
            Array.from(
                new Set(
                    guides.flatMap((guide) => (Array.isArray(guide.languages) ? guide.languages : []))
                )
            ).sort((a, b) => a.localeCompare(b)),
        [guides]
    );

    const filteredGuides = useMemo(
        () =>
            guides.filter((guide) => {
                const name = String(guide.full_name || "").toLowerCase();
                const specialization = String(guide.specialization || "").toLowerCase();
                const destinations = (guide.destinations || []).join(" ").toLowerCase();
                const languages = (guide.languages || []).join(" ").toLowerCase();
                const search = searchTerm.trim().toLowerCase();

                const matchesSearch =
                    !search ||
                    [name, specialization, destinations, languages].some((value) => value.includes(search));
                const matchesAvailability =
                    availabilityFilter === "all" || guide.availability_badge === availabilityFilter;
                const matchesLanguage =
                    languageFilter === "all" || (guide.languages || []).includes(languageFilter);

                return matchesSearch && matchesAvailability && matchesLanguage;
            }),
        [guides, searchTerm, availabilityFilter, languageFilter]
    );

    const profileTone = getAvailabilityTone(selectedGuide?.availability_badge);
    const profileHighlights = selectedGuide ? buildConfidenceHighlights(selectedGuide) : [];

    const guideQuickFacts = selectedGuide
        ? [
              {
                  icon: Compass,
                  label: "Specialization",
                  value: selectedGuide.specialization || "Custom private guiding",
              },
              {
                  icon: Languages,
                  label: "Languages",
                  value: formatList(selectedGuide.languages, "English"),
              },
              {
                  icon: Globe2,
                  label: "Coverage",
                  value: formatList(selectedGuide.destinations, "Flexible across Nepal"),
              },
              {
                  icon: Clock3,
                  label: "Availability",
                  value: selectedGuide.availability_badge || "Check profile",
              },
          ]
        : [];

    const reviewCount = Number(selectedGuide?.review_count || 0);
    const ratingValue = Number(selectedGuide?.rating || 0);
    const ratingBreakdown = selectedGuide?.rating_breakdown || [];
    const recentReviews = selectedGuide?.recent_reviews || [];

    const handleSubmitBooking = async (event) => {
        event.preventDefault();

        if (!isLoggedIn()) {
            toast.error("Please log in before sending a booking request.");
            navigate("/");
            return;
        }

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

        setModalError("");
        setBookingStep("payment");
    };

    const handlePayNow = async () => {
        if (!selectedGuide) return;
        setBookingProcessing(true);
        setPaymentError("");

        try {
            await initCsrf();

            const requestedRetryId = location.state?.retryBookingId;
            const existingDraft = resolveExistingDraft(selectedGuide, requestedRetryId);

            const booking = existingDraft || await requestGuideWithItinerary(selectedGuide.id, bookingData);
            const paymentRedirect = await initiateEsewaPayment(booking.id);

            submitPostRedirect(paymentRedirect.payment_url, paymentRedirect.form_data);
        } catch (err) {
            const errorData = err.response?.data || {};
            const msg = errorData.detail || errorData.error || err.message || "Unable to initiate payment.";
            const errorCode = errorData.error_code;
            setPaymentError(msg);
            toast.error(msg);

            if (errorCode === "already_paid" && errorData.booking) {
                setConfirmedBooking(errorData.booking);
                setConfirmedPaymentMethod("paid");
                setBookingStep("confirmation");
            } else if (isNonPayableError(errorCode)) {
                setBookingStep("details");
            }

            if (selectedGuideId) {
                try {
                    await fetchGuides({ silent: true });
                    await fetchGuideProfile(selectedGuideId);
                } catch {
                    // Keep the current message visible if refresh fails.
                }
            }
            setBookingProcessing(false);
        }
    };

    const handlePayLater = async () => {
        if (!selectedGuide) return;
        setBookingProcessing(true);
        setPaymentError("");

        try {
            await initCsrf();
            const requestedRetryId = location.state?.retryBookingId;
            const existingDraft = resolveExistingDraft(selectedGuide, requestedRetryId);
            const booking = existingDraft || await requestGuideWithItinerary(selectedGuide.id, bookingData);
            setConfirmedBooking(booking);
            setConfirmedPaymentMethod("later");
            setBookingStep("confirmation");
            await fetchGuides({ silent: true });
            if (selectedGuideId) await fetchGuideProfile(selectedGuideId);
            toast.success("Booking saved. You can pay anytime.");
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || err.message || "Unable to create booking.";
            setPaymentError(msg);
            toast.error(msg);
        } finally {
            setBookingProcessing(false);
        }
    };


    const handleCancelBooking = async () => {
        if (!bookingCancelTarget?.id) return;

        setBookingCancelling(true);
        setBookingCancelError("");

        try {
            await initCsrf();
            const updatedBooking = await cancelTravelerBooking(bookingCancelTarget.id, {
                reason_code: bookingCancelReasonCode,
                reason_note: bookingCancelReasonNote.trim(),
            });
            await fetchGuides({ silent: true });
            if (showModal && selectedGuideId) {
                await fetchGuideProfile(selectedGuideId);
            }
            setBookingCancelTarget(null);
            setBookingCancelReasonCode("");
            setBookingCancelReasonNote("");
            toast.success("Booking cancelled successfully.");

            if (selectedGuide?.id && String(selectedGuide.id) === String(updatedBooking.guide)) {
                setSuccessMessage("");
            }
        } catch (err) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.detail ||
                "Unable to cancel this booking right now.";
            setBookingCancelError(msg);
            toast.error(msg);
        } finally {
            setBookingCancelling(false);
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
                    <p className="text-muted">
                        Browse trusted local experts, open a full professional profile, and request the right guide with clarity before you commit.
                    </p>
                </div>

                <div className="guides-filters">
                    <div className="guides-filter-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by guide, destination, or specialty"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                    <div className="guides-filter-select">
                        <Filter size={16} />
                        <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
                            <option value="all">All availability</option>
                            <option value="Available">Available</option>
                            <option value="Booked">Booked</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>
                    <div className="guides-filter-select">
                        <Languages size={16} />
                        <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                            <option value="all">All languages</option>
                            {availableLanguages.map((language) => (
                                <option key={language} value={language}>
                                    {language}
                                </option>
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
                        {filteredGuides.map((guide) => {
                            const availabilityTone = getAvailabilityTone(guide.availability_badge);
                            const travelerBooking = guide.current_traveler_booking;
                            const latestTravelerBooking = guide.latest_traveler_booking;
                            const draftBooking = latestTravelerBooking?.status === "payment_pending" ? latestTravelerBooking : null;
                            const isDraft = Boolean(draftBooking);
                            const hasBlockingBooking = Boolean(travelerBooking);
                            const hasCancellableBooking = Boolean(travelerBooking?.can_cancel);
                            const historyBooking =
                                latestTravelerBooking && (!travelerBooking || latestTravelerBooking.id !== travelerBooking.id) && !isDraft
                                    ? latestTravelerBooking
                                    : null;
                            const canRequestAgain = Boolean(guide.can_request_now && historyBooking?.status === "cancelled");

                            return (
                                <article
                                    key={guide.id}
                                    className="guide-card card guide-card-interactive"
                                    onClick={() => handleOpenProfile(guide)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            handleOpenProfile(guide);
                                        }
                                    }}
                                >
                                    <div className="guide-card-top">
                                        <div className="guide-avatar-wrap">
                                            <div className="guide-avatar-frame">
                                                {guide.profile_image ? (
                                                    <img src={guide.profile_image} alt={guide.full_name} className="guide-avatar-img" />
                                                ) : (
                                                    <div className="guide-avatar-placeholder">
                                                        {getInitials(guide.full_name)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`status-dot ${availabilityTone === "available" ? "active" : "busy"}`}></div>
                                        </div>
                                        <div className="guide-card-heading">
                                            <div className={`availability-banner mb-2 ${availabilityTone}`}>
                                                {guide.availability_badge}
                                            </div>
                                            <h3 className="guide-name">{guide.full_name}</h3>
                                            <p className="guide-specialty text-teal">{guide.specialization || "Private Local Guide"}</p>
                                        </div>
                                    </div>

                                    <div className="guide-info">
                                        <div className="guide-stats">
                                            <span className="guide-stat-pill">
                                                <Star size={14} className="text-gold" />
                                                {guide.rating ? Number(guide.rating).toFixed(1) : "New"}
                                            </span>
                                            <span className="guide-stat-pill">
                                                <CheckCircle size={14} className="text-green" />
                                                {guide.tours_completed || 0} tours
                                            </span>
                                            <span className="guide-stat-pill">
                                                <Languages size={14} className="text-teal" />
                                                {(guide.languages || []).length || 1} languages
                                            </span>
                                        </div>

                                        <div className="guide-meta">
                                            <div className="meta-row">
                                                <MapPin size={16} />
                                                <div>
                                                    <span className="meta-label">Destinations</span>
                                                    <span>{formatList(guide.destinations, "Flexible locations")}</span>
                                                </div>
                                            </div>
                                            <div className="meta-row">
                                                <Languages size={16} />
                                                <div>
                                                    <span className="meta-label">Languages</span>
                                                    <span>{formatList(guide.languages, "English")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {guide.bio && (
                                            <p className="guide-bio text-sm text-muted line-clamp-3">
                                                {guide.bio}
                                            </p>
                                        )}

                                        {isDraft ? (
                                            <>
                                                <div className="guide-draft-note">
                                                    <AlertTriangle size={14} />
                                                    <span>
                                                        Unpaid Draft: You have a pending booking draft. Please complete payment or cancel to release it.
                                                    </span>
                                                </div>
                                                <div className="guide-cta-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-cancel-draft"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openCancelModal(draftBooking);
                                                        }}
                                                    >
                                                        Cancel Draft
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-primary guide-cta guide-cta-split"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleOpenProfile(guide);
                                                            setBookingData({
                                                                destination: draftBooking.destination,
                                                                trip_start: draftBooking.trip_start,
                                                                trip_end: draftBooking.trip_end,
                                                                notes: "",
                                                                itinerary_id: null,
                                                            });
                                                            setBookingStep("payment");
                                                        }}
                                                    >
                                                        {draftBooking.payment_status === "failed" ? "Retry Payment" : "Complete Payment"}
                                                    </button>
                                                </div>
                                            </>
                                        ) : hasBlockingBooking ? (
                                            <>
                                                <div className="guide-booking-note">
                                                    <AlertTriangle size={14} />
                                                    <span>
                                                        Your booking is {travelerBooking.status} for {formatDateLabel(travelerBooking.trip_start)} to {formatDateLabel(travelerBooking.trip_end)}.
                                                    </span>
                                                </div>
                                                <div className="guide-cta-row">
                                                    <button
                                                        type="button"
                                                        className="btn-primary guide-cta guide-cta-split"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleOpenProfile(guide);
                                                        }}
                                                    >
                                                        View Profile
                                                        <ChevronRight size={16} />
                                                    </button>
                                                    {hasCancellableBooking && (
                                                        <button
                                                            type="button"
                                                            className="guide-cancel-inline"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openCancelModal(travelerBooking);
                                                            }}
                                                        >
                                                            Cancel Booking
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {historyBooking?.status_reason_display ? (
                                                    <div className="guide-status-note">
                                                        <strong>{getBookingStatusTitle(historyBooking)}</strong>
                                                        <span>{historyBooking.status_reason_display}</span>
                                                    </div>
                                                ) : null}
                                                {historyBooking?.status === "cancelled" ? (
                                                    <div className="guide-history-hint">
                                                        Your previous booking was cancelled. You can send a new request if this guide is available.
                                                    </div>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="btn-primary guide-cta"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleOpenProfile(guide);
                                                    }}
                                                >
                                                    {canRequestAgain ? "Request Again" : "View Profile"}
                                                    <ChevronRight size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div
                        className="guide-profile-modal card setup-animation"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button className="close-btn" onClick={handleCloseModal} type="button" aria-label="Close guide profile">
                            <X size={20} />
                        </button>

                        {profileLoading && !selectedGuide ? (
                            <div className="guide-profile-loading">
                                <div className="loader-spinner"></div>
                            </div>
                        ) : (
                            <>
                                {profileError && <div className="alert-error profile-alert">{profileError}</div>}

                                <div className="guide-profile-shell">
                                    <div className="guide-profile-main">
                                        <section className="guide-profile-hero">
                                            <div className="guide-profile-hero-top">
                                                <div className="guide-profile-avatar-frame">
                                                    {selectedGuide?.profile_image ? (
                                                        <img
                                                            src={selectedGuide.profile_image}
                                                            alt={selectedGuide.full_name}
                                                            className="guide-profile-avatar"
                                                        />
                                                    ) : (
                                                        <div className="guide-profile-avatar guide-profile-avatar-fallback">
                                                            {getInitials(selectedGuide?.full_name)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="guide-profile-hero-copy">
                                                    <div className={`availability-banner ${profileTone}`}>
                                                        {selectedGuide?.availability_badge || "Availability pending"}
                                                    </div>
                                                    <h2>{selectedGuide?.full_name}</h2>
                                                    <p className="guide-profile-subtitle">
                                                        {selectedGuide?.specialization || "Private local guide"} across {formatList(selectedGuide?.destinations, "Nepal")}
                                                    </p>

                                                    <div className="guide-profile-hero-stats">
                                                        <span className="guide-profile-stat">
                                                            <Star size={16} />
                                                            {selectedGuide?.rating ? Number(selectedGuide.rating).toFixed(1) : "New profile"}
                                                        </span>
                                                        <span className="guide-profile-stat">
                                                            <BriefcaseBusiness size={16} />
                                                            {selectedGuide?.tours_completed || 0} tours completed
                                                        </span>
                                                        <span className="guide-profile-stat">
                                                            <CalendarDays size={16} />
                                                            {selectedGuide?.experience_years || 0} years experience
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="guide-confidence-grid">
                                                {profileHighlights.map(({ icon: Icon, title, text }) => (
                                                    <div key={title} className="guide-confidence-card">
                                                        <span className="guide-confidence-icon"><Icon size={18} /></span>
                                                        <div>
                                                            <strong>{title}</strong>
                                                            <p>{text}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="guide-section">
                                            <div className="guide-section-head">
                                                <Sparkles size={18} />
                                                <div>
                                                    <h3>About</h3>
                                                    <p>Trust-building details drawn from the live guide profile.</p>
                                                </div>
                                            </div>
                                            <p className="guide-section-body">
                                                {selectedGuide?.bio || "This guide has not added a bio yet, but their profile is active and ready for inquiries."}
                                            </p>
                                        </section>

                                        <section className="guide-section guide-quickfacts">
                                            <div className="guide-section-head">
                                                <BadgeCheck size={18} />
                                                <div>
                                                    <h3>Quick Facts</h3>
                                                    <p>Key details that help travelers evaluate fit immediately.</p>
                                                </div>
                                            </div>
                                            <div className="guide-facts-grid">
                                                {guideQuickFacts.map(({ icon: Icon, label, value }) => (
                                                    <div key={label} className="guide-fact-card">
                                                        <span className="guide-fact-icon"><Icon size={18} /></span>
                                                        <span className="guide-fact-label">{label}</span>
                                                        <strong>{value}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="guide-profile-detail-grid">
                                            <section className="guide-section">
                                                <div className="guide-section-head">
                                                    <Compass size={18} />
                                                    <div>
                                                        <h3>Expertise</h3>
                                                        <p>What this guide is best positioned to lead.</p>
                                                    </div>
                                                </div>
                                                <div className="guide-chip-list">
                                                    <span className="guide-chip">{selectedGuide?.specialization || "Custom planning"}</span>
                                                    <span className="guide-chip">{selectedGuide?.experience_years || 0}+ years field experience</span>
                                                    <span className="guide-chip">{selectedGuide?.tours_completed || 0}+ completed trips</span>
                                                </div>
                                            </section>

                                            <section className="guide-section">
                                                <div className="guide-section-head">
                                                    <Languages size={18} />
                                                    <div>
                                                        <h3>Languages</h3>
                                                        <p>Languages available for in-trip communication.</p>
                                                    </div>
                                                </div>
                                                <div className="guide-chip-list">
                                                    {(selectedGuide?.languages || ["English"]).map((language) => (
                                                        <span key={language} className="guide-chip">{language}</span>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="guide-section">
                                                <div className="guide-section-head">
                                                    <MapPin size={18} />
                                                    <div>
                                                        <h3>Destinations Covered</h3>
                                                        <p>Regions and routes currently listed on the guide profile.</p>
                                                    </div>
                                                </div>
                                                <div className="guide-chip-list">
                                                    {(selectedGuide?.destinations || ["Nepal"]).map((destination) => (
                                                        <span key={destination} className="guide-chip">{destination}</span>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="guide-section">
                                                <div className="guide-section-head">
                                                    <Mountain size={18} />
                                                    <div>
                                                        <h3>Travel Style</h3>
                                                        <p>Inferred from the guide’s live specialties and trip history.</p>
                                                    </div>
                                                </div>
                                                <div className="guide-chip-list">
                                                    <span className="guide-chip">Private guided experiences</span>
                                                    <span className="guide-chip">{selectedGuide?.specialization || "Flexible regional planning"}</span>
                                                    <span className="guide-chip">{(selectedGuide?.destinations || []).length > 2 ? "Multi-destination routes" : "Focused destination expertise"}</span>
                                                </div>
                                            </section>
                                        </div>

                                        <section className="guide-section">
                                            <div className="guide-section-head">
                                                <CalendarDays size={18} />
                                                <div>
                                                    <h3>Availability Snapshot</h3>
                                                    <p>Live timing context based on the current itinerary or selected travel dates.</p>
                                                </div>
                                            </div>
                                            <div className="availability-snapshot">
                                                <div className={`availability-snapshot-card ${profileTone}`}>
                                                    <strong>{selectedGuide?.availability_badge || "Check availability"}</strong>
                                                    <span>
                                                        {bookingData.trip_start && bookingData.trip_end
                                                            ? `${formatDateLabel(bookingData.trip_start)} to ${formatDateLabel(bookingData.trip_end)}`
                                                            : "Add travel dates in the booking panel to validate fit."}
                                                    </span>
                                                </div>
                                                <div className="availability-snapshot-note">
                                                    Accepted and active trips automatically block overlapping dates for this guide.
                                                </div>
                                            </div>
                                        </section>

                                        <section className="guide-section premium-reviews">
                                            <div className="guide-section-head">
                                                <Star size={18} />
                                                <div>
                                                    <h3>Traveler Reviews</h3>
                                                    <p>Verified feedback from travelers who completed a trip with this guide.</p>
                                                </div>
                                            </div>

                                            <div className="reviews-overview">
                                                <div className="reviews-score-card">
                                                    <div className="reviews-score-top">
                                                        <strong>{reviewCount ? ratingValue.toFixed(1) : "New"}</strong>
                                                        <div className="reviews-stars">
                                                            {Array.from({ length: 5 }).map((_, index) => (
                                                                <Star
                                                                    key={index}
                                                                    size={16}
                                                                    fill={index < Math.round(ratingValue) ? "currentColor" : "none"}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p>
                                                        {reviewCount
                                                            ? "Verified completed-trip feedback helps travelers judge quality with confidence."
                                                            : "No verified reviews yet. Completed travelers will be able to leave feedback after their trip."}
                                                    </p>
                                                    <div className="reviews-score-meta">
                                                        <span>{reviewCount} verified review{reviewCount === 1 ? "" : "s"}</span>
                                                        <span>{selectedGuide?.tours_completed || 0} tours completed</span>
                                                        <span>Completed-trip reviews only</span>
                                                    </div>
                                                </div>

                                                <div className="reviews-breakdown-card">
                                                    {ratingBreakdown.map((row) => (
                                                        <div key={row.stars} className="reviews-breakdown-row">
                                                            <span>{row.stars} star</span>
                                                            <div className="reviews-bar-track">
                                                                <div className="reviews-bar-fill" style={{ width: `${row.percentage}%` }} />
                                                            </div>
                                                            <strong>{row.percentage}%</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="review-tiles">
                                                {recentReviews.length === 0 ? (
                                                    <article className="review-tile review-tile-empty">
                                                        <div className="review-tile-head">
                                                            <div className="review-avatar">TP</div>
                                                            <div>
                                                                <strong>Verified reviews pending</strong>
                                                                <span>Completed trips unlock trusted traveler feedback</span>
                                                            </div>
                                                        </div>
                                                        <p>This guide profile will show verified completed-trip ratings as soon as eligible travelers submit them.</p>
                                                    </article>
                                                ) : recentReviews.map((review) => (
                                                    <article key={review.id} className="review-tile">
                                                        <div className="review-tile-head">
                                                            <div className="review-avatar">
                                                                {review.traveler_avatar ? (
                                                                    <img src={review.traveler_avatar} alt={review.traveler_name} className="review-avatar-image" />
                                                                ) : (
                                                                    getInitials(review.traveler_name)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <strong>{review.traveler_name}</strong>
                                                                <span>{review.trip_type}</span>
                                                            </div>
                                                            <div className="review-date">{formatReviewDate(review.created_at)}</div>
                                                        </div>
                                                        <div className="review-stars">
                                                            {Array.from({ length: review.rating }).map((_, index) => (
                                                                <Star key={index} size={14} fill="currentColor" />
                                                            ))}
                                                        </div>
                                                        <div className="review-verified-badge">
                                                            <BadgeCheck size={14} />
                                                            {review.verified_label}
                                                        </div>
                                                        <p>{review.comment || "Verified traveler feedback submitted after a completed guided trip."}</p>
                                                    </article>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <aside className="guide-profile-aside">
                                        <div className="booking-sticky-card">
                                            {/* ── Stepper indicator ── */}
                                            {!selectedGuideHasBlockingBooking && !successMessage && (
                                                <div className="booking-stepper">
                                                    {["details", "payment", "confirmation"].map((step, idx) => {
                                                        const stepLabels = ["Details", "Payment", "Confirmation"];
                                                        const stepOrder = { details: 0, payment: 1, confirmation: 2 };
                                                        const currentOrder = stepOrder[bookingStep] ?? 0;
                                                        const isActive = idx === currentOrder;
                                                        const isCompleted = idx < currentOrder;
                                                        return (
                                                            <div key={step} className={`booking-stepper-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}>
                                                                <span className="booking-stepper-dot">
                                                                    {isCompleted ? <CheckCircle size={16} /> : idx + 1}
                                                                </span>
                                                                <span className="booking-stepper-label">{stepLabels[idx]}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* ── Blocking booking state ── */}
                                            {successMessage ? (
                                                <div className="booking-success-panel">
                                                    <CheckCircle size={42} />
                                                    <h4>{successMessage}</h4>
                                                </div>
                                            ) : selectedGuideHasBlockingBooking ? (
                                                <>
                                                    <div className="booking-sticky-head">
                                                        <h3>Booking Status</h3>
                                                        <p>{selectedGuide?.request_state_message || "This guide already has a live booking with you for the selected dates."}</p>
                                                    </div>
                                                    <div className="booking-active-state">
                                                        <div className="booking-active-state-head">
                                                            <span className="booking-active-state-badge">Current Booking</span>
                                                            <strong>{getBookingStatusTitle(currentTravelerBooking)}</strong>
                                                        </div>
                                                        <div className="booking-active-state-card">
                                                            <div className="booking-summary-row">
                                                                <span>Destination</span>
                                                                <strong>{currentTravelerBooking.destination}</strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Dates</span>
                                                                <strong>{formatDateLabel(currentTravelerBooking.trip_start)} to {formatDateLabel(currentTravelerBooking.trip_end)}</strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Reference</span>
                                                                <strong>BOOK-{String(currentTravelerBooking.id).padStart(4, "0")}</strong>
                                                            </div>
                                                            {currentTravelerBooking.payment_status ? (
                                                                <div className="booking-summary-row">
                                                                    <span>Payment</span>
                                                                    <strong>{currentTravelerBooking.payment_status}</strong>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <p className="booking-active-state-copy">
                                                            {selectedGuide?.request_state_message || "This guide is already attached to your current booking for the selected dates."}
                                                        </p>
                                                        {currentTravelerBooking.status === "payment_pending" ? (
                                                            <button
                                                                type="button"
                                                                className="btn-primary guide-profile-submit"
                                                                onClick={() => {
                                                                    setBookingData({
                                                                        destination: currentTravelerBooking.destination,
                                                                        trip_start: currentTravelerBooking.trip_start,
                                                                        trip_end: currentTravelerBooking.trip_end,
                                                                        notes: bookingData.notes,
                                                                        itinerary_id: bookingData.itinerary_id,
                                                                    });
                                                                    setBookingStep("payment");
                                                                }}
                                                            >
                                                                {currentTravelerBooking.payment_status === "failed" ? "Retry Payment" : "Complete Payment"}
                                                            </button>
                                                        ) : selectedGuideHasCancellableBooking ? (
                                                            <button
                                                                type="button"
                                                                className="guide-cancel-primary"
                                                                onClick={() => openCancelModal(currentTravelerBooking)}
                                                            >
                                                                Cancel Booking
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </>

                                            /* ── Step 1: Booking Details ── */
                                            ) : bookingStep === "details" ? (
                                                <>
                                                    <div className="booking-sticky-head">
                                                        <h3>
                                                            {latestTravelerBooking?.status === "cancelled"
                                                                ? "Request This Guide Again"
                                                                : "Booking Details"}
                                                        </h3>
                                                        <p>Enter your trip details to continue.</p>
                                                    </div>

                                                    {bookingData.itinerary_id && (
                                                        <div className="booking-itinerary-pill">
                                                            <Sparkles size={16} />
                                                            AI itinerary attached
                                                        </div>
                                                    )}

                                                    {selectedGuideHistoryOnly ? (
                                                        <div className="booking-history-panel">
                                                            <div className="booking-active-state-head">
                                                                <span className="booking-active-state-badge">Previous Booking</span>
                                                                <strong>{getBookingStatusTitle(latestTravelerBooking)}</strong>
                                                            </div>
                                                            <div className="booking-active-state-card">
                                                                <div className="booking-summary-row">
                                                                    <span>Destination</span>
                                                                    <strong>{latestTravelerBooking.destination}</strong>
                                                                </div>
                                                                <div className="booking-summary-row">
                                                                    <span>Dates</span>
                                                                    <strong>{formatDateLabel(latestTravelerBooking.trip_start)} to {formatDateLabel(latestTravelerBooking.trip_end)}</strong>
                                                                </div>
                                                            </div>
                                                            {latestTravelerBooking.status_reason_display ? (
                                                                <div className="booking-status-readonly">
                                                                    <span>
                                                                        {latestTravelerBooking.status === "cancelled" ? "Cancellation Reason" : "Note"}
                                                                    </span>
                                                                    <strong>{latestTravelerBooking.status_reason_display}</strong>
                                                                </div>
                                                            ) : null}
                                                            <p className="booking-history-message">
                                                                {selectedGuide?.request_state_message || "Your previous booking was cancelled. You can send a new request."}
                                                            </p>
                                                        </div>
                                                    ) : null}

                                                    <form className="booking-form" onSubmit={handleSubmitBooking}>
                                                        {modalError && <div className="alert-error">{modalError}</div>}
                                                        {conflictWarning && !modalError && (
                                                            <div className="alert-warning">
                                                                <span>⚠️</span>
                                                                <span>{conflictWarning}</span>
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

                                                        <div className="booking-form-grid">
                                                            <div className="form-group">
                                                                <label>Start Date <span className="text-danger">*</span></label>
                                                                <input
                                                                    type="date"
                                                                    name="trip_start"
                                                                    required
                                                                    className="edit-input w-full"
                                                                    value={bookingData.trip_start}
                                                                    onChange={handleInputChange}
                                                                    min={new Date().toISOString().split("T")[0]}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>End Date <span className="text-danger">*</span></label>
                                                                <input
                                                                    type="date"
                                                                    name="trip_end"
                                                                    required
                                                                    className="edit-input w-full"
                                                                    value={bookingData.trip_end}
                                                                    onChange={handleInputChange}
                                                                    min={bookingData.trip_start || new Date().toISOString().split("T")[0]}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="form-group">
                                                            <label>Trip Notes</label>
                                                            <textarea
                                                                name="notes"
                                                                rows="3"
                                                                className="edit-input w-full"
                                                                placeholder="Share trip goals, interests, or special requirements..."
                                                                value={bookingData.notes}
                                                                onChange={handleInputChange}
                                                            />
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            className={`btn-primary guide-profile-submit ${conflictWarning ? "btn-disabled" : ""}`}
                                                            disabled={Boolean(conflictWarning)}
                                                        >
                                                            Next
                                                            <ChevronRight size={18} />
                                                        </button>

                                                        {!isLoggedIn() && (
                                                            <p className="booking-login-hint">
                                                                You can view profiles freely. Log in when you're ready to book.
                                                            </p>
                                                        )}
                                                    </form>
                                                </>

                                            /* ── Step 2: Payment ── */
                                            ) : bookingStep === "payment" ? (
                                                <div className="booking-step-payment">
                                                    <div className="booking-sticky-head">
                                                        <h3>Payment</h3>
                                                        <p>Review your booking summary and choose a payment option.</p>
                                                    </div>

                                                    <div className="bsp-summary-card">
                                                        <div className="bsp-guide-row">
                                                            <div className="bsp-guide-avatar">
                                                                {selectedGuide?.profile_image ? (
                                                                    <img src={selectedGuide.profile_image} alt={selectedGuide.full_name} />
                                                                ) : (
                                                                    getInitials(selectedGuide?.full_name)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <strong>{selectedGuide?.full_name}</strong>
                                                                <span>{selectedGuide?.specialization || "Private Local Guide"}</span>
                                                            </div>
                                                        </div>

                                                        <div className="bsp-detail-rows">
                                                            <div className="booking-summary-row">
                                                                <span>Destination</span>
                                                                <strong>{bookingData.destination}</strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Dates</span>
                                                                <strong>{formatDateLabel(bookingData.trip_start)} — {formatDateLabel(bookingData.trip_end)}</strong>
                                                            </div>
                                                            {bookingData.notes ? (
                                                                <div className="booking-summary-row bsp-notes-row">
                                                                    <span>Notes</span>
                                                                    <strong>{bookingData.notes}</strong>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <div className="bsp-pricing-card">
                                                        <div className="bsp-pricing-row">
                                                            <span>Booking Fee</span>
                                                            <strong>NPR 1,000</strong>
                                                        </div>
                                                        <div className="bsp-pricing-row bsp-pricing-total">
                                                            <span>Total</span>
                                                            <strong>NPR 1,000</strong>
                                                        </div>
                                                    </div>

                                                    <div className="bsp-brand-chip">
                                                        <Wallet size={16} />
                                                        Pay with eSewa
                                                    </div>

                                                    {paymentError && <div className="alert-error">{paymentError}</div>}

                                                    <div className="bsp-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-primary guide-profile-submit"
                                                            onClick={handlePayNow}
                                                            disabled={bookingProcessing}
                                                        >
                                                            {bookingProcessing ? (
                                                                <><LoaderCircle size={18} className="spin" /> Processing...</>
                                                            ) : (
                                                                <><CreditCard size={18} /> Pay Now</>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="bsp-pay-later-btn"
                                                            onClick={handlePayLater}
                                                            disabled={bookingProcessing}
                                                        >
                                                            Pay Later
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="bsp-back-link"
                                                        onClick={() => { setBookingStep("details"); setPaymentError(""); }}
                                                        disabled={bookingProcessing}
                                                    >
                                                        <ArrowLeft size={16} />
                                                        Back to Details
                                                    </button>

                                                    <div className="bsp-security-note">
                                                        <ShieldCheck size={16} />
                                                        <span>You will be redirected to eSewa sandbox to complete payment securely.</span>
                                                    </div>
                                                </div>

                                            /* ── Step 3: Confirmation ── */
                                            ) : bookingStep === "confirmation" ? (
                                                <div className="booking-step-confirmation">
                                                    <div className="bsc-icon-wrap">
                                                        <CheckCircle2 size={56} />
                                                    </div>
                                                    <h3 className="bsc-title">
                                                        {confirmedPaymentMethod === "paid" ? "Booking Confirmed" : "Booking Saved"}
                                                    </h3>
                                                    <p className="bsc-message">
                                                        {confirmedPaymentMethod === "paid"
                                                            ? "Payment confirmed. Your guide request is now pending approval."
                                                            : "Booking saved. You can complete payment anytime from My Trips."}
                                                    </p>

                                                    {confirmedBooking && (
                                                        <div className="bsc-summary-card">
                                                            <div className="booking-summary-row">
                                                                <span>Reference</span>
                                                                <strong>BOOK-{String(confirmedBooking.id).padStart(4, "0")}</strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Status</span>
                                                                <strong className={confirmedPaymentMethod === "paid" ? "bsc-status-paid" : "bsc-status-pending"}>
                                                                    {confirmedPaymentMethod === "paid" ? "Pending Approval" : "Payment Pending"}
                                                                </strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Destination</span>
                                                                <strong>{confirmedBooking.destination || bookingData.destination}</strong>
                                                            </div>
                                                            <div className="booking-summary-row">
                                                                <span>Dates</span>
                                                                <strong>{formatDateLabel(confirmedBooking.trip_start || bookingData.trip_start)} — {formatDateLabel(confirmedBooking.trip_end || bookingData.trip_end)}</strong>
                                                            </div>
                                                            {confirmedPaymentMethod === "paid" && (
                                                                <div className="booking-summary-row">
                                                                    <span>Amount Paid</span>
                                                                    <strong>NPR 1,000</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="bsc-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-primary guide-profile-submit"
                                                            onClick={() => navigate("/my-trips")}
                                                        >
                                                            View My Trips
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="bsp-back-link"
                                                            onClick={handleCloseModal}
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </aside>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <BookingCancellationModal
                isOpen={Boolean(bookingCancelTarget)}
                booking={bookingCancelTarget}
                reasons={STATUS_REASON_OPTIONS}
                reasonCode={bookingCancelReasonCode}
                reasonNote={bookingCancelReasonNote}
                loading={bookingCancelling}
                loadingLabel="Cancelling..."
                error={bookingCancelError}
                onReasonCodeChange={setBookingCancelReasonCode}
                onReasonNoteChange={setBookingCancelReasonNote}
                onClose={closeCancelModal}
                onConfirm={handleCancelBooking}
            />


        </div>
    );
}
