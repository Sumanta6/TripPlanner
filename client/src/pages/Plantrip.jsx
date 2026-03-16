import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Plantrip.css";
import { getGuides, saveItinerary, requestGuideWithItinerary } from '../services/api';

const FALLBACK_DESTINATIONS = [
  { name: "Kathmandu Valley", type: "cultural" },
  { name: "Pokhara", type: "city" },
  { name: "Chitwan National Park", type: "wildlife" },
  { name: "Lumbini", type: "cultural" },
  { name: "Everest Base Camp", type: "trekking" },
  { name: "Annapurna Base Camp", type: "trekking" },
  { name: "Langtang Valley Trek", type: "trekking" },
  { name: "Ghorepani Poon Hill Trek", type: "trekking" },
  { name: "Bhaktapur", type: "cultural" },
  { name: "Patan", type: "cultural" },
  { name: "Nagarkot", type: "adventure" },
  { name: "Dhulikhel", type: "city" },
  { name: "Bandipur", type: "cultural" },
  { name: "Begnas Lake", type: "lake" },
  { name: "Bardia National Park", type: "wildlife" },
  { name: "Janakpur", type: "cultural" },
  { name: "Ilam", type: "city" },
  { name: "Dharan", type: "city" },
  { name: "Biratnagar", type: "city" },
  { name: "Butwal", type: "city" },
  { name: "Hetauda", type: "city" },
  { name: "Kakani", type: "adventure" },
  { name: "Chandragiri Hills", type: "adventure" },
  { name: "Sarangkot", type: "adventure" },
  { name: "Ghandruk", type: "cultural" },
  { name: "Jomsom", type: "city" },
  { name: "Kalinchowk", type: "adventure" },
  { name: "Banke National Park", type: "wildlife" },
  { name: "Besisahar", type: "city" },
  { name: "Manang", type: "city" },
  { name: "Khopra Ridge Trek", type: "trekking" },
  { name: "Helambu Trek", type: "trekking" }
];

const TRAVEL_STYLES = [
  { id: "trekking", label: "Trekking", icon: "🥾" },
  { id: "nature", label: "Nature & Mountains", icon: "🏔️" },
  { id: "culture", label: "Cultural & Heritage", icon: "🏛️" },
  { id: "wildlife", label: "Wildlife Safari", icon: "🦏" },
  { id: "religious", label: "Spiritual Tour", icon: "🛕" },
  { id: "relax", label: "Relaxation", icon: "🏞️" }
];

const INTERESTS = [
  { id: "mountains", label: "Mountains", icon: "🏔️" },
  { id: "temples", label: "Temples", icon: "🛕" },
  { id: "wildlife", label: "Wildlife", icon: "🦏" },
  { id: "lakes", label: "Lakes", icon: "🏞️" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "culture", label: "Local Culture", icon: "🏠" },
  { id: "food", label: "Food & Cuisine", icon: "🍜" },
  { id: "adventure", label: "Adventure", icon: "⛰️" }
];

const HOTEL_LEVELS = [
  { id: "budget", label: "Budget" },
  { id: "standard", label: "Standard" },
  { id: "luxury", label: "Luxury" }
];

const PACES = [
  { id: "slow", label: "Slow & Relaxed" },
  { id: "balanced", label: "Balanced" },
  { id: "fast", label: "Fast-Paced" }
];



const DEFAULT_FORM_DATA = {
  startingPlace: "Kathmandu",
  destination: "",
  startDate: "",
  days: 3,
  travelers: "2",
  budget: 50000,
  travelStyle: "",
  interests: [],
  pace: "balanced",
  hotelLevel: "standard"
};

function safeJSONParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getTodayLocalDate() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().split("T")[0];
}

function normalizeDestinationType(type) {
  if (!type) return "unknown";
  return String(type).toLowerCase().trim();
}

function dedupeDestinations(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.name) return;
    const key = item.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: item.name.trim(),
        type: item.type || "unknown"
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeDestinationInput(name) {
  const value = String(name || "").trim().toLowerCase();

  const aliases = {
    "chitwan national park (sauraha)": "Chitwan National Park",
    "annapurna base camp (abc) trek": "Annapurna Base Camp",
    "everest base camp trek": "Everest Base Camp",
    "bardiya national park": "Bardia National Park",
    "illam": "Ilam",
    "patan (lalitpur)": "Patan",
    "gorkha (gorkha durbar)": "Gorkha",
    "bhote koshi bungee": "Bhote Koshi",
    "davis falls (pokhara)": "Pokhara",
    "world peace pagoda (pokhara)": "Pokhara",
    "sauraha riverside": "Chitwan National Park",
    "boudhanath (kathmandu)": "Kathmandu Valley",
    "pashupatinath (kathmandu)": "Kathmandu Valley",
    "swayambhunath (kathmandu)": "Kathmandu Valley",
    "bhaktapur durbar square": "Bhaktapur",
    "patan durbar square": "Patan",
    "seti river rafting (pokhara)": "Pokhara",
    "phewa lake": "Pokhara"
  };

  return aliases[value] || name;
}

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function budgetLabel(value) {
  const amount = Number(value);
  if (amount < 20000) return "Backpacking";
  if (amount < 60000) return "Budget";
  if (amount < 150000) return "Standard";
  return "Luxury";
}

function getTimelineTimeClass(timeStr) {
  const lower = String(timeStr || "").toLowerCase();
  if (lower.includes("morning")) return "time-morning";
  if (lower.includes("afternoon")) return "time-afternoon";
  if (lower.includes("evening") || lower.includes("night")) return "time-evening";
  return "time-default";
}

function getActivityIcon(text) {
  const lower = String(text || "").toLowerCase();

  if (
    lower.includes("trek") ||
    lower.includes("hike") ||
    lower.includes("walk") ||
    lower.includes("trail")
  ) {
    return "🥾";
  }
  if (
    lower.includes("temple") ||
    lower.includes("stupa") ||
    lower.includes("durbar") ||
    lower.includes("heritage") ||
    lower.includes("culture")
  ) {
    return "🏛️";
  }
  if (
    lower.includes("lake") ||
    lower.includes("view") ||
    lower.includes("sunrise") ||
    lower.includes("nature")
  ) {
    return "🏞️";
  }
  if (
    lower.includes("drive") ||
    lower.includes("flight") ||
    lower.includes("transfer") ||
    lower.includes("transport")
  ) {
    return "🚙";
  }
  if (
    lower.includes("dinner") ||
    lower.includes("lunch") ||
    lower.includes("breakfast") ||
    lower.includes("food")
  ) {
    return "🍽️";
  }
  if (
    lower.includes("safari") ||
    lower.includes("wildlife") ||
    lower.includes("jungle")
  ) {
    return "🦏";
  }
  if (
    lower.includes("adventure") ||
    lower.includes("rafting") ||
    lower.includes("paragliding") ||
    lower.includes("bungee")
  ) {
    return "⛰️";
  }
  return "✨";
}

function normalizeBackendResponse(data, formData, duration) {
  if (!data) return null;

  const summary = data.summary || {};
  const rawDays = Array.isArray(data.itinerary)
    ? data.itinerary
    : Array.isArray(data?.itinerary?.days)
    ? data.itinerary.days
    : [];

  const normalizedDays = rawDays.map((day, index) => {
    const rawSchedule = Array.isArray(day.schedule)
      ? day.schedule
      : Array.isArray(day.activities)
      ? day.activities
      : [];

    const normalizedActivities = rawSchedule.map((item) => ({
      time_of_day: item.time || item.time_of_day || "Flexible",
      title: item.title || item.place || item.activity_type || "Planned Activity",
      description:
        item.details ||
        item.description ||
        item.notes ||
        item.route ||
        "Planned experience"
    }));

    return {
      day_number: day.day || day.day_number || index + 1,
      date_label:
        day.date ||
        day.date_label ||
        `Day ${day.day || day.day_number || index + 1}`,
      title:
        day.headline ||
        day.theme ||
        day.title ||
        `Day ${day.day || day.day_number || index + 1}`,
      activities: normalizedActivities,
      accommodation: day.stay || day.accommodation || "",
      meals:
        typeof day.meals === "string"
          ? day.meals
          : Array.isArray(day.meals)
          ? day.meals.join(", ")
          : "",
      local_tips: day.notes || day.local_tips || "",
      altitude: day.altitude || ""
    };
  });

  let budgetBreakdown = [];
  if (Array.isArray(data?.itinerary?.budget_breakdown)) {
    budgetBreakdown = data.itinerary.budget_breakdown;
  } else if (summary.estimated_total_cost) {
    const total = Number(summary.estimated_total_cost);
    budgetBreakdown = [
      { category: "Estimated Total", amount: total }
    ];
  }

  const recommendedStay = Array.isArray(data.recommended_stay)
    ? data.recommended_stay
    : [];

  const travelTips = Array.isArray(data.travel_tips)
    ? data.travel_tips
    : Array.isArray(data?.itinerary?.travel_tips)
    ? data.itinerary.travel_tips
    : [];

  const tripSummary =
    data?.itinerary?.trip_summary ||
    `${summary.destination || formData.destination} itinerary for ${duration} day${
      duration > 1 ? "s" : ""
    }, planned for ${formData.travelers} traveler${
      Number(formData.travelers) > 1 ? "s" : ""
    } with a ${budgetLabel(formData.budget).toLowerCase()} budget.`;

  return {
    destination: summary.destination || data.destination || formData.destination,
    starting_place: data.starting_place || formData.startingPlace,
    budget: Number(summary.budget || data.budget || formData.budget || 0),
    days: data.days || formData.days,
    notes: data.notes || "",
    summary,
    transport_notes: data.transport_notes || "",
    recommended_stay: recommendedStay,
    itinerary: {
      trip_summary: tripSummary,
      travel_tips: travelTips,
      budget_breakdown: budgetBreakdown,
      days: normalizedDays
    }
  };
}

function Plantrip() {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("plantrip_step");
    const parsed = saved ? parseInt(saved, 10) : 1;
    return [1, 2, 3].includes(parsed) ? parsed : 1;
  });

  const [formData, setFormData] = useState(() => {
    const saved = safeJSONParse(localStorage.getItem("plantrip_formData"), DEFAULT_FORM_DATA);
    return { ...DEFAULT_FORM_DATA, ...saved };
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  
  // Real guides state
  const [guides, setGuides] = useState([]);
  const [savedItineraryId, setSavedItineraryId] = useState(null);
  const [bookedGuideIds, setBookedGuideIds] = useState([]);
  
  // Booking modal state
  const [bookingModal, setBookingModal] = useState({
      isOpen: false,
      guide: null,
      notes: "",
      isSubmitting: false,
      error: null,
      success: null
  });

  const [itinerary, setItinerary] = useState(() =>
    safeJSONParse(localStorage.getItem("plantrip_itinerary"), null)
  );

  const [expandedDays, setExpandedDays] = useState({});
  const resultsRef = useRef(null);

  const [destinations, setDestinations] = useState(() =>
    dedupeDestinations(FALLBACK_DESTINATIONS)
  );
  const [destQuery, setDestQuery] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [destActiveIdx, setDestActiveIdx] = useState(-1);
  const destWrapperRef = useRef(null);

  const today = useMemo(() => getTodayLocalDate(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      try {
        const res = await fetch("http://localhost:8000/api/itinerary/destinations/");
        const data = await res.json();

        if (!cancelled && res.ok) {
          const rawItems = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : [];

          if (rawItems.length > 0) {
            setDestinations(rawItems.map(d => ({
              ...d,
              type: d.type || d.category || "unknown"
            })));
          }
        }
      } catch {
        // fallback stays
      }
    }

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target)) {
        setDestOpen(false);
        setDestActiveIdx(-1);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Fetch real guides on mount
  useEffect(() => {
    async function loadGuides() {
      try {
        const data = await getGuides();
        setGuides(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Failed to load guides:", err);
      }
    }
    loadGuides();
  }, []);

  useEffect(() => {
    localStorage.setItem("plantrip_step", String(step));
  }, [step]);

  useEffect(() => {
    localStorage.setItem("plantrip_formData", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (itinerary) {
      localStorage.setItem("plantrip_itinerary", JSON.stringify(itinerary));
      if (itinerary?.itinerary?.days?.length > 0) {
        setExpandedDays((prev) =>
          Object.keys(prev).length ? prev : { 0: true }
        );
      }
      setShowGuides(true);
    }
  }, [itinerary]);

  useEffect(() => {
    if (formData.destination && !destQuery) {
      setDestQuery(formData.destination);
    }
  }, [formData.destination, destQuery]);

  const filteredDestinations = useMemo(() => {
    const q = destQuery.trim().toLowerCase();

    if (!q) return destinations.slice(0, 12);

    const startsWith = destinations.filter((d) =>
      d.name.toLowerCase().startsWith(q)
    );
    const includes = destinations.filter(
      (d) =>
        !d.name.toLowerCase().startsWith(q) &&
        d.name.toLowerCase().includes(q)
    );

    return [...startsWith, ...includes].slice(0, 12);
  }, [destQuery, destinations]);

  const selectedDestinationData = useMemo(() => {
    return destinations.find(d => d.name === formData.destination);
  }, [formData.destination, destinations]);

  const [durationMessage, setDurationMessage] = useState("");

  useEffect(() => {
    if (selectedDestinationData) {
      const { min_days, max_days } = selectedDestinationData;
      let newDays = formData.days;
      let msg = "";

      if (formData.days < min_days) {
        newDays = min_days;
        msg = `${formData.destination} trips usually require at least ${min_days} days. Adjusted to ${min_days} days.`;
      } else if (formData.days > max_days) {
        newDays = max_days;
        msg = `${formData.destination} trips are usually planned for up to ${max_days} days. Adjusted to ${max_days} days.`;
      }

      if (msg) {
        setFormData(prev => ({ ...prev, days: newDays }));
        setDurationMessage(msg);
        setTimeout(() => setDurationMessage(""), 5000);
      }
    }
  }, [formData.destination, selectedDestinationData, formData.days]);

  const calculatedEndDate = useMemo(() => {
    if (!formData.startDate || !formData.days) return "";
    const date = new Date(formData.startDate);
    date.setDate(date.getDate() + (formData.days - 1));
    return date.toISOString().split("T")[0];
  }, [formData.startDate, formData.days]);

  const matchedGuides = useMemo(() => {
    const destinationText = (itinerary?.destination || formData.destination || "").toLowerCase();

    return guides.map((guide) => {
      const gDestinations = guide.destinations || [];
      const score = gDestinations.reduce((acc, dest) => {
        const d = String(dest).toLowerCase();
        if (destinationText.includes(d)) return acc + 3;
        if (d.includes(destinationText) || destinationText.includes(d.split(" ")[0])) {
          return acc + 1;
        }
        return acc;
      }, 0);

      return { ...guide, _matchScore: score };
    })
      .sort((a, b) => b._matchScore - a._matchScore || (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
  }, [formData.destination, itinerary, guides]);

  const duration =
    formData.startDate && formData.endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(formData.endDate) - new Date(formData.startDate)) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const selectedTravelStyleLabel = useMemo(() => {
    return TRAVEL_STYLES.find((s) => s.id === formData.travelStyle)?.label || "Not selected";
  }, [formData.travelStyle]);

  const selectedPaceLabel = useMemo(() => {
    return PACES.find((p) => p.id === formData.pace)?.label || "Balanced";
  }, [formData.pace]);

  const selectedHotelLabel = useMemo(() => {
    return HOTEL_LEVELS.find((h) => h.id === formData.hotelLevel)?.label || "Standard";
  }, [formData.hotelLevel]);

  const selectedInterestsText = useMemo(() => {
    return formData.interests
      .map((id) => INTERESTS.find((i) => i.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  }, [formData.interests]);

  const selectDestination = (d) => {
    setFormData((prev) => ({ ...prev, destination: d.name }));
    setDestQuery(d.name);
    setDestOpen(false);
    setDestActiveIdx(-1);
    setValidationErrors((prev) => ({ ...prev, destination: undefined }));
  };

  const toggleInterest = (id) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id]
    }));
  };

  const toggleDay = (index) => {
    setExpandedDays((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const validateStep1 = () => {
    const errors = {};

    if (!formData.destination.trim()) {
      errors.destination = "Please select a destination";
    }
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!formData.days || formData.days <= 0) {
      errors.days = "Please enter a valid duration";
    }

    return errors;
  };

  const handleContinueStep1 = () => {
    const errors = validateStep1();
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      setStep(2);
      setValidationErrors({});
    }
  };

  const handleGenerateItinerary = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setShowSuccess(false);
    setShowGuides(false);

    try {
      const payload = {
        destination: normalizeDestinationInput(formData.destination),
        starting_place: formData.startingPlace,
        days: formData.days,
        start_date: formData.startDate,
        budget: Number(formData.budget),
        travel_style: formData.travelStyle,
        interests: formData.interests,
        people: Number(formData.travelers),
        pace: formData.pace,
        hotel_level: formData.hotelLevel
      };

      const response = await fetch("http://localhost:8000/api/itinerary/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setGenerationError(data?.message || data?.error || "Failed to generate itinerary.");
        return;
      }

      const normalized = normalizeBackendResponse(data, formData, duration);

      if (!normalized || !normalized?.itinerary?.days?.length) {
        setGenerationError("The itinerary was generated but no day-wise plan was returned.");
        return;
      }

      setItinerary(normalized);
      // Automatically save itinerary to DB
      try {
         const saveRes = await saveItinerary({
            destination: normalized.destination,
            starting_place: normalized.starting_place,
            days: normalized.days,
            start_date: formData.startDate,
            notes: normalized.notes,
            itinerary_data: normalized
         });
         setSavedItineraryId(saveRes.id);
      } catch (err) {
         console.error("Autosave of itinerary failed:", err);
      }
      
      setShowSuccess(true);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        setTimeout(() => {
          setShowGuides(true);
        }, 900);
      }, 120);
    } catch {
      setGenerationError(
        "Network error. Please ensure the backend server is running on port 8000."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const submitGuideRequest = async () => {
    setBookingModal(prev => ({ ...prev, isSubmitting: true, error: null }));
    try {
        const payload = {
            guide: bookingModal.guide.id,
            itinerary_id: savedItineraryId,
            destination: itinerary?.destination || formData.destination,
            trip_start: formData.startDate,
            trip_end: calculatedEndDate,
            notes: bookingModal.notes
        };
        await requestGuideWithItinerary(bookingModal.guide.id, payload);
        
        setBookedGuideIds(prev => [...prev, bookingModal.guide.id]);
        setBookingModal(prev => ({ 
            ...prev, 
            isSubmitting: false, 
            success: "Requirement sent successfully! The guide will review your request and get back to you soon." 
        }));
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            setBookingModal({ isOpen: false, guide: null, notes: "", isSubmitting: false, error: null, success: null });
        }, 3000);
    } catch (err) {
        let msg = err.message || "Failed to request guide. Please try again.";
        if (err.statusCode === 401 || err.statusCode === 403) {
            msg = "You must be logged in to request a guide.";
        }
        setBookingModal(prev => ({ ...prev, isSubmitting: false, error: msg }));
    }
  };

  const handleSaveItinerary = async () => {
    alert("Itinerary is auto-saved on generation!");
  };

  const clearForm = () => {
    setStep(1);
    setFormData(DEFAULT_FORM_DATA);
    setItinerary(null);
    setGenerationError(null);
    setValidationErrors({});
    setExpandedDays({});
    setShowSuccess(false);
    setShowGuides(false);
    setDestQuery("");
    setDestOpen(false);
    setDestActiveIdx(-1);

    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");
  };

  return (
    <>
      <section
        className="plantrip-hero lp-hero"
        style={{ minHeight: "400px", height: "auto", paddingBottom: "60px" }}
      >
        <div
          className="lp-hero-bg fade-in"
          style={{ backgroundImage: "url('/images/hero-pokhara.jpg')" }}
        />
        <div
          className="lp-hero-overlay"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,23,41,0.85) 0%, rgba(6,23,41,0.6) 100%)"
          }}
        />
        <div className="lp-hero-content pt-nav" style={{ maxWidth: "800px" }}>
          <div
            className="lp-section-badge"
            style={{
              borderColor: "rgba(0,180,216,0.5)",
              color: "var(--teal-light)",
              background: "rgba(0,180,216,0.1)"
            }}
          >
            ✨ AI-Powered Planning
          </div>
          <h1
            className="lp-hero-title"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
          >
            Design Your Perfect Trip
          </h1>
          <p className="lp-hero-sub mx-auto text-white">
            Tell us about your plan and TripPlanner will build a smarter Nepal itinerary for you.
          </p>
        </div>
      </section>

      <div className="plantrip-steps">
        {["Basics", "Preferences", "Confirm"].map((label, index) => (
          <div
            key={label}
            className={`step ${step === index + 1 ? "active" : ""} ${
              step > index + 1 ? "completed" : ""
            }`}
          >
            <div className="step-circle">{step > index + 1 ? "✓" : index + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="plantrip-container">
        {step === 1 && (
          <div className="card">
            <div className="card-header-flex">
              <div>
                <h2>Trip Basics</h2>
                <p className="card-subtitle">Choose destination, dates and travelers</p>
              </div>

              {(formData.destination || duration > 0) && (
                <button type="button" className="clear-btn" onClick={clearForm}>
                  🧹 Clear
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Destination *</label>
              <div className="dest-search-wrapper" ref={destWrapperRef}>
                <input
                  className={`dest-search-input ${
                    validationErrors.destination ? "error" : ""
                  }`}
                  type="text"
                  placeholder="Search destinations like Pokhara, Kathmandu Valley, Chitwan..."
                  value={destQuery}
                  onFocus={() => {
                    setDestOpen(true);
                    setDestActiveIdx(-1);
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDestQuery(value);
                    setDestOpen(true);
                    setDestActiveIdx(-1);
                    setFormData((prev) => ({ ...prev, destination: value }));
                  }}
                  onKeyDown={(e) => {
                    if (!destOpen) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setDestActiveIdx((i) =>
                        Math.min(i + 1, filteredDestinations.length - 1)
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setDestActiveIdx((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const chosen =
                        filteredDestinations[destActiveIdx] ||
                        filteredDestinations[0];
                      if (chosen) selectDestination(chosen);
                    } else if (e.key === "Escape") {
                      setDestOpen(false);
                      setDestActiveIdx(-1);
                    }
                  }}
                />

                {destOpen && filteredDestinations.length > 0 && (
                  <div className="dest-dropdown">
                    {filteredDestinations.map((d, idx) => (
                      <button
                        key={`${d.name}-${idx}`}
                        type="button"
                        className={`dest-option ${idx === destActiveIdx ? "active" : ""}`}
                        onMouseEnter={() => setDestActiveIdx(idx)}
                        onClick={() => selectDestination(d)}
                      >
                        <span className="dest-option-name">{d.name}</span>
                        <span
                          className={`dest-type-badge type-${normalizeDestinationType(d.type)}`}
                        >
                          {d.type || "unknown"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {validationErrors.destination && (
                <span className="error-message">⚠️ {validationErrors.destination}</span>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Starting Place *</label>
                <select
                  value={formData.startingPlace}
                  onChange={(e) => setFormData({ ...formData, startingPlace: e.target.value })}
                >
                  <option value="Kathmandu">Kathmandu</option>
                  <option value="Pokhara">Pokhara</option>
                  <option value="Chitwan">Chitwan</option>
                  <option value="Lumbini">Lumbini</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of Travelers</label>
                <select
                  value={formData.travelers}
                  onChange={(e) =>
                    setFormData({ ...formData, travelers: e.target.value })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "traveler" : "travelers"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className={validationErrors.startDate ? "error" : ""}
                  min={today}
                />
                {validationErrors.startDate && (
                  <span className="error-message">⚠️ {validationErrors.startDate}</span>
                )}
              </div>

              <div className="form-group">
                <label>Duration (Days) *</label>
                <input
                  type="number"
                  min={selectedDestinationData?.min_days || 1}
                  max={selectedDestinationData?.max_days || 30}
                  value={formData.days || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData({ ...formData, days: isNaN(val) ? "" : val });
                  }}
                  className={validationErrors.days ? "error" : ""}
                />
                {selectedDestinationData && (
                  <div className="duration-hints">
                    <span>Rec: {selectedDestinationData.recommended_days} days</span>
                    <span>Range: {selectedDestinationData.min_days}-{selectedDestinationData.max_days} days</span>
                  </div>
                )}
                {durationMessage && (
                  <span className="info-message">ℹ️ {durationMessage}</span>
                )}
                {validationErrors.days && (
                  <span className="error-message">⚠️ {validationErrors.days}</span>
                )}
              </div>
            </div>

            {formData.startDate && formData.days > 0 && (
              <div className="info-box">
                <span className="info-icon">📅</span>
                <span>
                  Ends on: <strong>{formatDateDisplay(calculatedEndDate)}</strong>
                </span>
              </div>
            )}

            <button type="button" className="primary" onClick={handleContinueStep1}>
              Continue to Preferences →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>Your Preferences</h2>
            <p className="card-subtitle">Customize the itinerary style and comfort level</p>

            <div className="form-group">
              <label>Travel Style</label>
              <div className="chip-group">
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip ${formData.travelStyle === s.id ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, travelStyle: s.id })}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Interests</label>
              <div className="chip-group">
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`chip ${formData.interests.includes(i.id) ? "selected" : ""}`}
                    onClick={() => toggleInterest(i.id)}
                  >
                    <span className="chip-icon">{i.icon}</span>
                    <span>{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Travel Pace</label>
                <select
                  value={formData.pace}
                  onChange={(e) => setFormData({ ...formData, pace: e.target.value })}
                >
                  {PACES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Hotel Level</label>
                <select
                  value={formData.hotelLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, hotelLevel: e.target.value })
                  }
                >
                  {HOTEL_LEVELS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Budget (NPR)</label>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={formData.budget}
                onChange={(e) =>
                  setFormData({ ...formData, budget: Number(e.target.value) })
                }
                className="slider"
              />
              <div className="budget-display">
                NPR {Number(formData.budget).toLocaleString()}
                <span className="budget-label"> · {budgetLabel(formData.budget)}</span>
              </div>
            </div>

            <div className="btn-row">
              <button type="button" className="secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="button" className="primary" onClick={() => setStep(3)}>
                Review Details →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2>Review Your Trip</h2>
            <p className="card-subtitle">Check your inputs before generating the itinerary</p>

            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-icon">📍</span>
                <div>
                  <div className="summary-label">Start / Dest</div>
                  <div className="summary-value">
                    {formData.startingPlace} → {formData.destination}
                  </div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">📅</span>
                <div>
                  <div className="summary-label">Travel Dates</div>
                  <div className="summary-value">
                    {formatDateDisplay(formData.startDate)} → {formatDateDisplay(calculatedEndDate)}
                  </div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">⏱️</span>
                <div>
                  <div className="summary-label">Duration</div>
                  <div className="summary-value">
                    {formData.days} day{formData.days > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">👥</span>
                <div>
                  <div className="summary-label">Travelers</div>
                  <div className="summary-value">{formData.travelers}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">💰</span>
                <div>
                  <div className="summary-label">Budget</div>
                  <div className="summary-value">
                    NPR {Number(formData.budget).toLocaleString()} · {budgetLabel(formData.budget)}
                  </div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">✈️</span>
                <div>
                  <div className="summary-label">Travel Style</div>
                  <div className="summary-value">{selectedTravelStyleLabel}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">⚡</span>
                <div>
                  <div className="summary-label">Pace</div>
                  <div className="summary-value">{selectedPaceLabel}</div>
                </div>
              </div>

              <div className="summary-item">
                <span className="summary-icon">🏨</span>
                <div>
                  <div className="summary-label">Hotel Level</div>
                  <div className="summary-value">{selectedHotelLabel}</div>
                </div>
              </div>

              {selectedInterestsText && (
                <div className="summary-item full-width">
                  <span className="summary-icon">❤️</span>
                  <div>
                    <div className="summary-label">Interests</div>
                    <div className="summary-value">{selectedInterestsText}</div>
                  </div>
                </div>
              )}
            </div>

            {generationError && (
              <div className="generation-error">
                <span>⚠️</span> {generationError}
              </div>
            )}

            <div className="btn-row">
              <button type="button" className="secondary" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                type="button"
                className="primary generate-btn"
                onClick={handleGenerateItinerary}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner"></span>
                    Generating itinerary...
                  </>
                ) : (
                  "🎯 Generate My Itinerary"
                )}
              </button>
            </div>

            {isGenerating && (
              <div className="generating-hint">
                <p>🤖 TripPlanner is organizing a day-wise route, highlights, stay suggestions, and travel notes...</p>
              </div>
            )}
          </div>
        )}

        {itinerary && itinerary.itinerary && (
          <div ref={resultsRef} className="itinerary-timeline-container">
            {showSuccess && (
              <div className="success-banner pop-in">
                <div className="success-content">
                  <span className="success-icon">✅</span>
                  <div>
                    <h3 className="success-title">Itinerary Generated Successfully!</h3>
                    <p className="success-text">
                      Your {itinerary.destination} itinerary is ready below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="success-ok-btn"
                  onClick={() => setShowSuccess(false)}
                >
                  OK
                </button>
              </div>
            )}

            {itinerary.notes && (
              <div className="info-box adjustment-note" style={{ marginBottom: "16px" }}>
                <span className="info-icon">💡</span>
                <span>{itinerary.notes}</span>
              </div>
            )}

            <div className={`timeline-header-card ${showSuccess ? "hide" : "slide-up"}`}>
              <div className="results-badge">🇳🇵 AI-Generated Itinerary</div>
              <h2>Your {itinerary.destination} Adventure</h2>
              <div className="results-meta">
                <span>🗺️ {itinerary.starting_place} → {itinerary.destination}</span>
                <span>📅 {itinerary.days} Days</span>
                <span>💰 NPR {Number(itinerary.budget).toLocaleString()}</span>
              </div>

              {itinerary.itinerary.trip_summary && (
                <p className="trip-overview-text">{itinerary.itinerary.trip_summary}</p>
              )}

              {itinerary.transport_notes && (
                <div className="info-box" style={{ marginTop: "14px" }}>
                  <span className="info-icon">🚕</span>
                  <span>{itinerary.transport_notes}</span>
                </div>
              )}

              {itinerary.recommended_stay?.length > 0 && (
                <div className="info-box" style={{ marginTop: "10px" }}>
                  <span className="info-icon">🏨</span>
                  <span>
                    Recommended stay: <strong>{itinerary.recommended_stay.join(", ")}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className={`timeline-wrapper ${showSuccess ? "hide" : "slide-up"}`}>
              <div className="timeline-line"></div>

              {itinerary.itinerary.days?.map((day, index) => {
                const isExpanded = !!expandedDays[index];

                return (
                  <div
                    key={index}
                    className={`timeline-day-card ${isExpanded ? "expanded" : ""}`}
                  >
                    <div className="timeline-marker">
                      <span>{day.day_number || index + 1}</span>
                    </div>

                    <div className="day-card-content">
                      <div
                        className="day-card-header"
                        onClick={() => toggleDay(index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleDay(index);
                          }
                        }}
                      >
                        <div className="day-header-titles">
                          <span className="day-label">{day.date_label || `Day ${index + 1}`}</span>
                          <h3 className="day-title">{day.title}</h3>
                        </div>
                        <div className={`expand-icon ${isExpanded ? "rotated" : ""}`}>▼</div>
                      </div>

                      <div className="day-badges-row">
                        {day.accommodation && (
                          <div className="day-badge tooltip-container">
                            🏠 Stay
                            <span className="tooltip">{day.accommodation}</span>
                          </div>
                        )}
                        {day.meals && (
                          <div className="day-badge tooltip-container">
                            🥘 Meals
                            <span className="tooltip">{day.meals}</span>
                          </div>
                        )}
                        {day.altitude && (
                          <div className="day-badge tooltip-container">
                            🏔️ Altitude
                            <span className="tooltip">{day.altitude}</span>
                          </div>
                        )}
                      </div>

                      <div
                        className="day-collapsible-content"
                        style={{ maxHeight: isExpanded ? "2000px" : "0" }}
                      >
                        <div className="activities-list">
                          {day.activities?.map((act, actIdx) => (
                            <div
                              key={actIdx}
                              className={`activity-block ${getTimelineTimeClass(act.time_of_day)}`}
                            >
                              <div className="activity-time-badge">
                                {act.time_of_day === "Morning" && "🌄"}
                                {act.time_of_day === "Afternoon" && "☀️"}
                                {act.time_of_day === "Evening" && "🌙"}
                                {!["Morning", "Afternoon", "Evening"].includes(act.time_of_day) &&
                                  act.time_of_day}
                              </div>

                              <div className="activity-details">
                                <h4>
                                  <span className="activity-icon">{getActivityIcon(act.title)}</span>
                                  {act.title}
                                </h4>
                                <p>{act.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {day.local_tips && (
                          <div className="local-tip-box">
                            <span className="tip-icon">💡</span>
                            <div>
                              <strong>Trip Note:</strong>
                              <p>{day.local_tips}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`timeline-footer-grid ${showSuccess ? "hide" : "slide-up"}`}>
              {itinerary.itinerary.budget_breakdown?.length > 0 && (
                <div className="footer-card budget-card">
                  <h3>💰 Budget Overview</h3>
                  <ul className="budget-list">
                    {itinerary.itinerary.budget_breakdown.map((item, idx) => (
                      <li key={idx}>
                        <span>{item.category}</span>
                        <strong>NPR {Number(item.amount).toLocaleString()}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.itinerary.travel_tips?.length > 0 && (
                <div className="footer-card tips-card">
                  <h3>🎒 Essential Tips</h3>
                  <ul className="tips-list">
                    {itinerary.itinerary.travel_tips.map((tip, idx) => (
                      <li key={idx}>✓ {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={`results-actions clean-actions ${showSuccess ? "hide" : "slide-up"}`}>
              <button
                type="button"
                className="lp-btn-outline-dark"
                onClick={clearForm}
              >
                <span className="btn-icon">🔄</span> Plan Another Trip
              </button>
              <button
                type="button"
                className="lp-btn-primary save-btn"
                onClick={handleSaveItinerary}
              >
                <span className="btn-icon">💾</span> Save Itinerary
              </button>
            </div>

            {showGuides && (
              <div className="find-guide-section slide-up mt-12 mb-12">
                <div className="text-center mb-8">
                  <span className="lp-section-badge">Local Experts</span>
                  <h2 className="lp-section-title" style={{ fontSize: "2rem" }}>
                    Match with a Guide
                  </h2>
                  <p className="lp-section-sub mx-auto">
                    Add a verified local expert to make your {itinerary.destination} trip smoother.
                  </p>
                </div>

                <div className="guide-match-grid">
                  {matchedGuides.map((guide) => (
                    <div key={guide.id} className="lp-dest-card guide-match-card">
                      <div className="guide-card-header">
                        <div className="guide-avatar-large">
                            {guide.profile_image ? (
                                <img src={`http://localhost:8000${guide.profile_image}`} alt={guide.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : "👤"}
                        </div>
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1.2rem",
                              color: "var(--navy)"
                            }}
                          >
                            {guide.full_name}
                          </h3>
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--teal)",
                              fontWeight: 600
                            }}
                          >
                            {guide.specialization || "Local Guide"}
                          </span>
                        </div>
                      </div>

                      <div
                        className="guide-card-stats grid-2"
                        style={{
                          gap: "10px",
                          marginTop: "16px",
                          marginBottom: "16px"
                        }}
                      >
                        <div
                          style={{
                            background: "var(--bg-light)",
                            padding: "10px",
                            borderRadius: "8px",
                            textAlign: "center"
                          }}
                        >
                          <div style={{ fontSize: "12px", color: "var(--text-gray)" }}>
                            Experience
                          </div>
                          <strong style={{ color: "var(--navy)" }}>{guide.experience_years} Years</strong>
                        </div>

                        <div
                          style={{
                            background: "var(--bg-light)",
                            padding: "10px",
                            borderRadius: "8px",
                            textAlign: "center"
                          }}
                        >
                          <div style={{ fontSize: "12px", color: "var(--text-gray)" }}>
                            Rating
                          </div>
                          <strong style={{ color: "var(--gold)" }}>⭐ {guide.rating}</strong>{" "}
                          <span style={{ fontSize: "11px", color: "var(--text-gray)" }}>
                            ({guide.tours_completed} tours)
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text-gray)",
                          marginBottom: "20px"
                        }}
                      >
                        <strong>Covers:</strong> {(guide.destinations || []).join(" • ")}
                      </div>

                      <button
                        type="button"
                        className={bookedGuideIds.includes(guide.id) ? "lp-btn-outline-dark" : "lp-btn-primary"}
                        style={{ width: "100%", justifyContent: "center", backgroundColor: bookedGuideIds.includes(guide.id) ? "#e2e8f0" : undefined, color: bookedGuideIds.includes(guide.id) ? "#64748b" : undefined, borderColor: bookedGuideIds.includes(guide.id) ? "#cbd5e1" : undefined }}
                        disabled={bookedGuideIds.includes(guide.id)}
                        onClick={() => {
                            if (!savedItineraryId) {
                                alert("Please wait for your itinerary to save or try logging in.");
                                return;
                            }
                            setBookingModal({
                                isOpen: true,
                                guide: guide,
                                notes: `Hi ${guide.full_name.split(' ')[0]},\n\nI'm planning a ${formData.days}-day trip to ${itinerary.destination} starting ${formData.startDate}. I have generated an AI itinerary and would like you to guide me for this trip. Please check my plan and let me know if you are available.`,
                                isSubmitting: false,
                                error: null,
                                success: null
                            });
                        }}
                      >
                        {bookedGuideIds.includes(guide.id) ? "✓ Request Sent" : "Request Guide"}
                      </button>
                    </div>
                  ))}
                  {matchedGuides.length === 0 && (
                      <div className="info-box"><span className="info-icon">🔍</span><span>No guides found matching this destination yet. Try clearing the destination filter.</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {bookingModal.isOpen && bookingModal.guide && (
          <div className="modal-overlay">
              <div className="modal-content auth-modal" style={{ maxWidth: "500px", padding: "30px" }}>
                  <button className="close-btn" onClick={() => setBookingModal({ ...bookingModal, isOpen: false })}>×</button>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Request {bookingModal.guide.full_name}</h2>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Send a booking inquiry along with your proposed itinerary.</p>
                  </div>
                  
                  {bookingModal.error && <p className="error-message" style={{ marginBottom: '15px' }}>{bookingModal.error}</p>}
                  {bookingModal.success && <div className="success-banner pop-in" style={{ padding: '15px', marginBottom: '15px' }}>
                      <span className="success-icon" style={{ fontSize: '1.2rem', marginRight: '10px' }}>✅</span> {bookingModal.success}
                  </div>}
                  
                  {!bookingModal.success && (
                      <div className="auth-form">
                          <div className="form-group" style={{ marginBottom: '15px' }}>
                              <label>Attached Plan</label>
                              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--navy)', border: '1px solid #e2e8f0' }}>
                                  <strong>{itinerary.destination}</strong> ({formData.days} Days)<br/>
                                  <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>{formatDateDisplay(formData.startDate)} – {formatDateDisplay(calculatedEndDate)}</span>
                              </div>
                          </div>
                          
                          <div className="form-group" style={{ marginBottom: '20px' }}>
                              <label>Message to Guide</label>
                              <textarea 
                                  value={bookingModal.notes} 
                                  onChange={(e) => setBookingModal({...bookingModal, notes: e.target.value})}
                                  rows={5}
                                  style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical' }}
                              />
                          </div>
                          
                          <button 
                              className="lp-btn-primary" 
                              style={{ width: '100%', justifyContent: 'center' }}
                              onClick={submitGuideRequest}
                              disabled={bookingModal.isSubmitting}
                          >
                              {bookingModal.isSubmitting ? <><span className="spinner" style={{ marginRight: '8px', width: '16px', height: '16px' }}></span> Sending...</> : "Send Request"}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </>
  );
}

export default Plantrip;