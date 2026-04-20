import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Plantrip.css";
import MapView from "../components/MapView";
import AppPopupModal from "../components/AppPopupModal";
import {
  generateItinerary,
  getGuides,
  getPlannerDestinations,
  saveItinerary,
  updateMyProfile,
} from '../services/api';
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";


const TRAVEL_STYLES = [
  { id: "trekking", label: "Trekking", icon: "🥾" },
  { id: "nature", label: "Nature & Mountains", icon: "🏔️" },
  { id: "culture", label: "Cultural & Heritage", icon: "🏛️" },
  { id: "wildlife", label: "Wildlife Safari", icon: "🦏" },
  { id: "religious", label: "Spiritual Tour", icon: "🛕" },
  { id: "relax", label: "Relaxation", icon: "🏞️" },
  { id: "luxury", label: "Luxury Escape", icon: "✨" },
  { id: "family", label: "Family Trip", icon: "👨‍👩‍👧‍👦" },
  { id: "roadtrip", label: "Road Trip", icon: "🚗" },
  { id: "wellness", label: "Wellness Retreat", icon: "🧘" },
  { id: "solo", label: "Solo Travel", icon: "🎒" },
  { id: "romantic", label: "Romantic Getaway", icon: "💞" },
  { id: "backpacking", label: "Backpacking", icon: "🎟️" },
  { id: "festival", label: "Festival Experience", icon: "🎊" }
];

const INTERESTS = [
  { id: "mountains", label: "Mountains", icon: "🏔️" },
  { id: "temples", label: "Temples", icon: "🛕" },
  { id: "wildlife", label: "Wildlife", icon: "🦏" },
  { id: "lakes", label: "Lakes", icon: "🏞️" },
  { id: "photography", label: "Photography", icon: "📸" },
  { id: "culture", label: "Local Culture", icon: "🏠" },
  { id: "food", label: "Food & Cuisine", icon: "🍜" },
  { id: "adventure", label: "Adventure", icon: "⛰️" },
  { id: "hiking", label: "Hiking", icon: "🥾" },
  { id: "viewpoints", label: "Viewpoints", icon: "🌄" },
  { id: "history", label: "History", icon: "📜" },
  { id: "architecture", label: "Architecture", icon: "🏛️" },
  { id: "museums", label: "Museums", icon: "🖼️" },
  { id: "monasteries", label: "Monasteries", icon: "🙏" },
  { id: "camping", label: "Camping", icon: "⛺" },
  { id: "snow", label: "Snow", icon: "❄️" },
  { id: "waterfalls", label: "Waterfalls", icon: "💧" },
  { id: "hidden_gems", label: "Hidden Gems", icon: "💎" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "nightlife", label: "Nightlife", icon: "🌃" },
  { id: "meditation", label: "Meditation", icon: "🧘" },
  { id: "scenic_drives", label: "Scenic Drives", icon: "🚙" },
  { id: "rural_village", label: "Rural Village Experience", icon: "🌾" }
];

const DEFAULT_FORM_DATA = {
  destination: "",
  startDate: "",
  days: 3,
  travelers: "2",
  budget: 50000,
  travelStyle: "",
  interests: []
};

const DEFAULT_MAP_LOCATION = {
  lat: 27.7172,
  lng: 85.324,
  zoom: 11,
  label: "Kathmandu, Nepal"
};

const BUDGET_CATEGORIES = [
  { key: "transport", label: "Transport", weight: 0.18 },
  { key: "food", label: "Food", weight: 0.18 },
  { key: "accommodation", label: "Accommodation", weight: 0.3 },
  { key: "activities", label: "Activities", weight: 0.16 },
  { key: "guide", label: "Guide", weight: 0.08 },
  { key: "misc", label: "Emergency/Misc.", weight: 0.1 }
];

const RECOMMENDED_DESTINATION_NAMES = [
  "Kathmandu Valley",
  "Pokhara",
  "Chitwan National Park",
  "Lumbini",
  "Everest Base Camp"
];

function findDestinationEntry(destinations, destinationName) {
  if (!destinationName || !destinations?.length) return null;
  const target = destinationName.trim().toLowerCase();
  return destinations.find(
    (item) => String(item.name || "").trim().toLowerCase() === target
  );
}

function buildMapLocation(destinations, destinationName) {
  const entry = findDestinationEntry(destinations, destinationName);
  if (entry && entry.latitude != null && entry.longitude != null) {
    return {
      lat: Number(entry.latitude),
      lng: Number(entry.longitude),
      zoom: Number(entry.zoom || 11),
      label: entry.name
    };
  }

  return DEFAULT_MAP_LOCATION;
}

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

function dedupeDestinations(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.name) return;
    const key = item.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        ...item,
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

function formatNpr(value) {
  return `NPR ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function sanitizeBudgetAmount(value) {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

function buildInitialCategoryBudget(totalBudget = 0) {
  const total = Math.max(0, Number(totalBudget) || 0);
  let allocated = 0;

  return BUDGET_CATEGORIES.reduce((acc, category, index) => {
    if (index === BUDGET_CATEGORIES.length - 1) {
      acc[category.key] = Math.max(0, total - allocated);
      return acc;
    }

    const amount = Math.round(total * category.weight / 100) * 100;
    allocated += amount;
    acc[category.key] = amount;
    return acc;
  }, {});
}

function normalizeCategoryBudget(value, fallbackTotal = 0) {
  const source = value && typeof value === "object"
    ? value
    : buildInitialCategoryBudget(fallbackTotal);

  return BUDGET_CATEGORIES.reduce((acc, category) => {
    acc[category.key] = sanitizeBudgetAmount(source[category.key]);
    return acc;
  }, {});
}

function getBudgetStatus(totalUserBudget, totalEstimatedCost) {
  if (totalEstimatedCost <= 0) {
    return {
      label: "Needs Estimate",
      tone: "neutral",
      message: "Add a budget to compare against TripPlanner's estimate."
    };
  }

  const difference = totalUserBudget - totalEstimatedCost;
  const ratio = Math.abs(difference) / totalEstimatedCost;

  if (difference >= 0) {
    return {
      label: "Within Budget",
      tone: "good",
      message: "Your allocation covers the estimated trip expense."
    };
  }

  if (ratio <= 0.15) {
    return {
      label: "Slightly Over Budget",
      tone: "warning",
      message: "The plan is close, but a few categories need adjustment."
    };
  }

  return {
    label: "Significantly Over Budget",
    tone: "danger",
    message: "The estimate is materially higher than your current allocation."
  };
}

function estimateTripBudget(itineraryData, formData, selectedDestinationData) {
  const days = Math.max(1, Number(itineraryData?.days || formData.days) || 1);
  const travelers = Math.max(1, Number(formData.travelers) || Number(itineraryData?.summary?.people) || 1);
  const nights = Math.max(1, days - 1);
  const rooms = Math.max(1, Math.ceil(travelers / 2));
  const destinationType = String(selectedDestinationData?.type || itineraryData?.summary?.type || "").toLowerCase();
  const travelStyle = String(formData.travelStyle || itineraryData?.summary?.hotel_level || "").toLowerCase();
  const tier = budgetLabel(formData.budget || itineraryData?.budget).toLowerCase();
  const isTrek = destinationType.includes("trek");
  const isWildlife = destinationType.includes("wildlife") || destinationType.includes("national");
  const isLuxury = tier === "luxury" || travelStyle.includes("luxury");
  const isBackpacking = tier === "backpacking" || travelStyle.includes("backpacking");
  const isStandard = tier === "standard";

  const dayList = itineraryData?.itinerary?.days || [];
  const activityText = dayList
    .flatMap((day) => day.activities || [])
    .map((activity) => `${activity.title || ""} ${activity.description || ""}`)
    .join(" ")
    .toLowerCase();
  const activityCount = dayList.reduce((total, day) => total + (day.activities?.length || 0), 0);
  const adventureMatches = (activityText.match(/paragliding|rafting|bungee|safari|permit|trek|flight|jeep|boating/g) || []).length;

  const foodRate = isLuxury ? 2200 : isStandard ? 1400 : isBackpacking ? 750 : 1000;
  const stayRate = isLuxury ? 8500 : isStandard ? 4200 : isBackpacking ? 1200 : 2200;
  const transportBase = isTrek ? 6500 : isWildlife ? 5200 : 3500;
  const activityRate = isLuxury ? 1800 : isStandard ? 1100 : isBackpacking ? 450 : 750;
  const guideRate = isTrek ? 3500 : isWildlife ? 2500 : 1800;

  const transport = Math.round((transportBase + days * 900 + adventureMatches * 700) * Math.max(1, Math.sqrt(travelers)));
  const food = Math.round(foodRate * days * travelers);
  const accommodation = Math.round(stayRate * nights * rooms);
  const activities = Math.round((Math.max(activityCount, days * 2) * activityRate + adventureMatches * 1800) * travelers);
  const guide = Math.round(guideRate * days * (isTrek || isWildlife || travelers >= 4 ? 1 : 0.55));
  const subtotal = transport + food + accommodation + activities + guide;
  const misc = Math.round(subtotal * 0.1);

  return {
    transport,
    food,
    accommodation,
    activities,
    guide,
    misc
  };
}

function estimateRecommendedTripBudget(formData, selectedDestinationData) {
  if (!formData.destination || !selectedDestinationData) return null;

  const days = Math.max(1, Number(formData.days) || 1);
  const travelers = Math.max(1, Number(formData.travelers) || 1);
  const nights = Math.max(1, days - 1);
  const rooms = Math.max(1, Math.ceil(travelers / 2));
  const destinationName = String(selectedDestinationData.name || formData.destination || "").toLowerCase();
  const destinationType = String(selectedDestinationData.type || "").toLowerCase();

  const profile = (() => {
    if (destinationName.includes("everest base camp")) {
      return { transport: 18000, food: 1700, stay: 2600, activity: 900, guide: 4500, permit: 9000, label: "trekking route" };
    }
    if (destinationName.includes("annapurna base camp") || destinationType.includes("trek")) {
      return { transport: 12000, food: 1400, stay: 2200, activity: 700, guide: 3800, permit: 5500, label: "trekking route" };
    }
    if (destinationName.includes("chitwan")) {
      return { transport: 7500, food: 1400, stay: 4200, activity: 2500, guide: 2200, permit: 2500, label: "wildlife trip" };
    }
    if (destinationName.includes("pokhara")) {
      return { transport: 6500, food: 1300, stay: 3800, activity: 2200, guide: 1200, permit: 0, label: "lakeside city trip" };
    }
    if (destinationName.includes("lumbini")) {
      return { transport: 7000, food: 1100, stay: 2800, activity: 900, guide: 1400, permit: 0, label: "heritage trip" };
    }
    if (destinationName.includes("kathmandu")) {
      return { transport: 3500, food: 1200, stay: 3500, activity: 1200, guide: 1200, permit: 0, label: "city and heritage trip" };
    }
    if (destinationType.includes("wildlife") || destinationType.includes("national")) {
      return { transport: 7500, food: 1300, stay: 3800, activity: 2200, guide: 2000, permit: 2200, label: "nature trip" };
    }
    return { transport: 5500, food: 1200, stay: 3000, activity: 1200, guide: 1200, permit: 500, label: "Nepal trip" };
  })();

  const transport = Math.round(profile.transport * Math.max(1, Math.sqrt(travelers)));
  const food = Math.round(profile.food * days * travelers);
  const accommodation = Math.round(profile.stay * nights * rooms);
  const activities = Math.round((profile.activity * days + profile.permit) * travelers);
  const guide = Math.round(profile.guide * days * (destinationType.includes("trek") || destinationName.includes("base camp") ? 1 : 0.6));
  const subtotal = transport + food + accommodation + activities + guide;
  const emergency = Math.round(subtotal * 0.1);
  const total = Math.ceil((subtotal + emergency) / 5000) * 5000;

  return {
    total,
    label: profile.label,
    travelers,
    days,
    categories: {
      transport,
      food,
      accommodation,
      activities,
      guide,
      emergency
    }
  };
}

function analyzeBudgetPlan(userBudget, systemEstimate, itineraryData, formData, selectedDestinationData) {
  const normalizedUserBudget = normalizeCategoryBudget(userBudget, formData.budget);
  const normalizedEstimate = normalizeCategoryBudget(
    systemEstimate || estimateTripBudget(itineraryData, formData, selectedDestinationData)
  );

  const totalUserBudget = BUDGET_CATEGORIES.reduce((total, category) => total + normalizedUserBudget[category.key], 0);
  const totalEstimatedCost = BUDGET_CATEGORIES.reduce((total, category) => total + normalizedEstimate[category.key], 0);
  const remainingBalance = totalUserBudget - totalEstimatedCost;
  const status = getBudgetStatus(totalUserBudget, totalEstimatedCost);

  const categories = BUDGET_CATEGORIES.map((category) => {
    const allocated = normalizedUserBudget[category.key];
    const estimated = normalizedEstimate[category.key];
    const difference = allocated - estimated;
    const utilization = allocated > 0 ? Math.round((estimated / allocated) * 100) : estimated > 0 ? 100 : 0;
    let categoryStatus = "Sufficient";
    let tone = "good";

    if (difference < 0) {
      categoryStatus = Math.abs(difference) / Math.max(estimated, 1) > 0.18 ? "Underfunded" : "Tight";
      tone = categoryStatus === "Underfunded" ? "danger" : "warning";
    } else if (difference > estimated * 0.35) {
      categoryStatus = "Flexible";
      tone = "neutral";
    }

    return {
      ...category,
      allocated,
      estimated,
      difference,
      utilization,
      status: categoryStatus,
      tone
    };
  });

  const recommendations = buildBudgetRecommendations(categories, {
    days: Math.max(1, Number(itineraryData?.days || formData.days) || 1),
    travelers: Math.max(1, Number(formData.travelers) || 1),
    status: status.label,
    remainingBalance,
    selectedDestinationData
  });

  return {
    user_budget: normalizedUserBudget,
    system_estimate: normalizedEstimate,
    summary: {
      total_user_budget: totalUserBudget,
      total_estimated_cost: totalEstimatedCost,
      remaining_balance: remainingBalance,
      status: status.label,
      status_tone: status.tone,
      message: status.message
    },
    categories,
    recommendations
  };
}

function buildBudgetRecommendations(categories, context) {
  const recs = [];
  const categoryByKey = Object.fromEntries(categories.map((category) => [category.key, category]));
  const underfunded = categories.filter((category) => category.difference < 0);
  const emergencyPercent = categoryByKey.misc?.allocated / Math.max(1, categories.reduce((total, category) => total + category.allocated, 0));

  if (categoryByKey.food?.difference < 0) {
    recs.push(`Your food budget may be too low for ${context.days} day${context.days > 1 ? "s" : ""} and ${context.travelers} traveler${context.travelers > 1 ? "s" : ""}. Increase it or plan more local meals.`);
  }
  if (categoryByKey.transport?.difference >= 0) {
    recs.push("Transport budget is sufficient for the current route estimate.");
  } else {
    recs.push("Reduce transport pressure by using tourist buses, shared jeeps, or grouping nearby stops on the same day.");
  }
  if (categoryByKey.accommodation?.difference < 0) {
    recs.push("Reduce accommodation tier or choose standard guesthouses to bring the stay cost closer to budget.");
  }
  if (categoryByKey.activities?.difference < 0) {
    recs.push("Reduce activity spending by prioritizing paid experiences and mixing in free viewpoints, heritage walks, and local markets.");
  }
  if (context.status !== "Within Budget") {
    recs.push("Use a standard instead of luxury option for stay and activities until the shortage is covered.");
  }
  if (emergencyPercent < 0.1) {
    recs.push("Keep at least 10% of the total budget for emergency or miscellaneous expenses.");
  }
  if (!underfunded.length && context.remainingBalance > 0) {
    recs.push("Your allocation has a buffer. Keep the surplus reserved for weather delays, route changes, or guide tips.");
  }

  return [...new Set(recs)].slice(0, 5);
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

function buildPlannerSignature(formData) {
  return JSON.stringify({
    destination: normalizeDestinationInput(formData.destination),
    startDate: formData.startDate,
    days: Number(formData.days) || 0,
    travelers: String(formData.travelers || ""),
    budget: Number(formData.budget) || 0,
    travelStyle: formData.travelStyle || "",
    interests: [...(formData.interests || [])].sort()
  });
}

function createEmptyPopupState() {
  return {
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    primaryAction: null,
    secondaryAction: null,
    closeOnOverlay: true
  };
}

function classifyTravelTip(tip) {
  const text = String(tip || "").toLowerCase();

  if (text.includes("season") || text.includes("weather") || text.includes("monsoon")) {
    return "Best Season";
  }
  if (text.includes("book") || text.includes("permit") || text.includes("reserve") || text.includes("ticket")) {
    return "Booking Advice";
  }
  if (text.includes("early") || text.includes("timing") || text.includes("sunrise") || text.includes("crowd")) {
    return "Travel Timing";
  }
  if (text.includes("cash") || text.includes("budget") || text.includes("cost")) {
    return "Money Tip";
  }
  if (text.includes("pack") || text.includes("layer") || text.includes("shoe") || text.includes("clothes")) {
    return "Packing";
  }
  if (text.includes("transport") || text.includes("drive") || text.includes("flight") || text.includes("road")) {
    return "Getting Around";
  }

  return "Local Insight";
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
    `${summary.destination || formData.destination} itinerary for ${duration} day${duration > 1 ? "s" : ""
    }, planned for ${formData.travelers} traveler${Number(formData.travelers) > 1 ? "s" : ""
    } with a ${budgetLabel(formData.budget).toLowerCase()} budget.`;

  const routeStops = Array.isArray(data.route_stops)
    ? data.route_stops.map((stop, index) => ({
      order: stop.order || index + 1,
      day: stop.day || 1,
      name: stop.name || `Stop ${index + 1}`,
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      stop_type: stop.stop_type || "activity",
      time_of_day: stop.time_of_day || "Flexible",
      note: stop.note || ""
    })).filter((stop) => !Number.isNaN(stop.latitude) && !Number.isNaN(stop.longitude))
    : [];

  const routeSummary = data.route_summary || {
    stop_count: routeStops.length,
    route_mode: routeStops.length > 1 ? "stop_preview" : "destination_preview",
    distance_km: 0,
    has_connected_path: routeStops.length > 1
  };

  return {
    destination: summary.destination || data.destination || formData.destination,
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
    },
    route_stops: routeStops,
    route_summary: routeSummary
  };
}

function mapInterestIdsToLabels(selectedIds) {
  return selectedIds
    .map((id) => INTERESTS.find((item) => item.id === id)?.label || id)
    .filter(Boolean);
}

function buildGoogleMapsDirectionsUrl(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return "";

  const toCoord = (stop) => `${stop.latitude},${stop.longitude}`;
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(toCoord(stops[0]))}`;
  }

  const origin = toCoord(stops[0]);
  const destination = toCoord(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(toCoord).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
}

function Plantrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("plantrip_step");
    const parsed = saved ? parseInt(saved, 10) : 1;
    return [1, 2, 3].includes(parsed) ? parsed : 1;
  });

  const [formData, setFormData] = useState(() => {
    const saved = safeJSONParse(localStorage.getItem("plantrip_formData"), DEFAULT_FORM_DATA);
    return { ...DEFAULT_FORM_DATA, ...saved };
  });
  const [budgetWasEdited, setBudgetWasEdited] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [popupModal, setPopupModal] = useState(createEmptyPopupState);

  // Real guides state
  const [guides, setGuides] = useState([]);
  const [savedItineraryId, setSavedItineraryId] = useState(null);
  const [bookedGuideIds] = useState([]);

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
  const [categoryBudget, setCategoryBudget] = useState(() => {
    const savedItinerary = safeJSONParse(localStorage.getItem("plantrip_itinerary"), null);
    return normalizeCategoryBudget(savedItinerary?.budget_management?.user_budget, savedItinerary?.budget || DEFAULT_FORM_DATA.budget);
  });
  const [generatedPlanSignature, setGeneratedPlanSignature] = useState(
    () => localStorage.getItem("plantrip_generated_signature") || ""
  );

  const [expandedDays, setExpandedDays] = useState({});
  const resultsRef = useRef(null);

  const [destinations, setDestinations] = useState([]);
  const [destinationLoadError, setDestinationLoadError] = useState("");
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const today = useMemo(() => getTodayLocalDate(), []);
  const calculatedEndDate = useMemo(() => {
    if (!formData.startDate || !formData.days) return "";
    const date = new Date(formData.startDate);
    date.setDate(date.getDate() + (formData.days - 1));
    return date.toISOString().split("T")[0];
  }, [formData.startDate, formData.days]);
  const hasPlannerProgress = useMemo(() => {
    return Boolean(
      itinerary ||
      formData.destination ||
      formData.startDate ||
      Number(formData.days) !== DEFAULT_FORM_DATA.days ||
      String(formData.travelers) !== String(DEFAULT_FORM_DATA.travelers) ||
      Number(formData.budget) !== DEFAULT_FORM_DATA.budget ||
      formData.travelStyle ||
      formData.interests.length
    );
  }, [formData, itinerary]);
  const mapLocation = useMemo(
    () => buildMapLocation(destinations, formData.destination),
    [destinations, formData.destination]
  );
  const recommendedDestinations = useMemo(() => {
    return RECOMMENDED_DESTINATION_NAMES
      .map((name) => findDestinationEntry(destinations, name))
      .filter(Boolean);
  }, [destinations]);
  const remainingDestinations = useMemo(() => {
    const recommendedNames = new Set(recommendedDestinations.map((destination) => destination.name));
    return destinations.filter((destination) => !recommendedNames.has(destination.name));
  }, [destinations, recommendedDestinations]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const currentPlannerSignature = useMemo(() => buildPlannerSignature(formData), [formData]);
  const hasGeneratedItinerary = Boolean(itinerary?.itinerary?.days?.length);
  const hasConfirmedPlan = hasGeneratedItinerary && generatedPlanSignature === currentPlannerSignature;
  const routeStops = useMemo(() => {
    if (Array.isArray(itinerary?.route_stops) && itinerary.route_stops.length) {
      return itinerary.route_stops;
    }
    return [{
      order: 1,
      day: 1,
      name: mapLocation.label,
      latitude: mapLocation.lat,
      longitude: mapLocation.lng,
      stop_type: "destination",
      time_of_day: "Flexible",
      note: `Destination preview for ${formData.destination || mapLocation.label}.`
    }];
  }, [itinerary?.route_stops, mapLocation, formData.destination]);
  const routeSummary = itinerary?.route_summary || {
    stop_count: routeStops.length,
    route_mode: routeStops.length > 1 ? "stop_preview" : "destination_preview",
    distance_km: 0,
    has_connected_path: routeStops.length > 1
  };
  const googleMapsDirectionsUrl = useMemo(() => buildGoogleMapsDirectionsUrl(routeStops), [routeStops]);

  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      try {
        const data = await getPlannerDestinations();
        const rawItems = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        if (!cancelled) {
          setDestinationLoadError("");
          if (rawItems.length > 0) {
            setDestinations(dedupeDestinations(rawItems));
          }
        }
      } catch {
        if (!cancelled) {
          setDestinationLoadError("Supported destinations could not be loaded. Please refresh and try again.");
          setDestinations([]);
        }
      }
    }

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGuides() {
      try {
        const params = {};
        if (formData.startDate && calculatedEndDate) {
          params.trip_start = formData.startDate;
          params.trip_end = calculatedEndDate;
        }

        const data = await getGuides(params);
        if (!cancelled) {
          setGuides(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load guides:", err);
          setGuides([]);
        }
      }
    }

    loadGuides();

    return () => {
      cancelled = true;
    };
  }, [formData.startDate, calculatedEndDate]);

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
    if (generatedPlanSignature) {
      localStorage.setItem("plantrip_generated_signature", generatedPlanSignature);
      return;
    }

    localStorage.removeItem("plantrip_generated_signature");
  }, [generatedPlanSignature]);

  useEffect(() => {
    if (!isMapModalOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMapModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMapModalOpen]);

  useEffect(() => {
    if (!generatedPlanSignature || generatedPlanSignature === currentPlannerSignature) return;

    setShowSuccess(false);
  }, [currentPlannerSignature, generatedPlanSignature]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const queryCallbackState = {
      paymentCallbackStatus: query.get("paymentCallbackStatus") || "",
      paymentCallbackMessage: query.get("paymentCallbackMessage") || "",
      paymentBookingId: query.get("paymentBookingId") || "",
      paymentTransactionUuid: query.get("paymentTransactionUuid") || "",
      selectedGuideId: query.get("selectedGuideId") || "",
      paymentSuccess: query.get("paymentSuccess") || "",
    };

    const callbackState =
      queryCallbackState.paymentCallbackStatus || queryCallbackState.paymentSuccess
        ? queryCallbackState
        : (location.state || {});
    const callbackStatus = callbackState.paymentCallbackStatus;
    const callbackMessage = callbackState.paymentCallbackMessage;
    const paymentSuccess =
      callbackState.paymentSuccess === true ||
      callbackState.paymentSuccess === "true";

    if (!callbackStatus && !paymentSuccess) return;

    const message =
      callbackMessage ||
      (paymentSuccess
        ? "Payment completed successfully. You can continue from your saved trip."
        : "Payment status updated.");

    if (callbackStatus === "success" || paymentSuccess) {
      toast.success(message);
      openPopupModal({
        type: "success",
        title: "Guide payment completed",
        message,
        primaryAction: {
          label: "View My Trips",
          onClick: () => {
            closePopupModal();
            navigate("/my-trips");
          }
        },
        secondaryAction: {
          label: "Continue Planning",
          onClick: closePopupModal
        }
      });
    } else if (callbackStatus === "cancelled") {
      toast(message);
      openPopupModal({
        type: "info",
        title: "Payment not completed",
        message,
        primaryAction: {
          label: "Continue Planning",
          onClick: closePopupModal
        }
      });
    } else {
      toast.error(message);
      openPopupModal({
        type: "error",
        title: "Payment could not be confirmed",
        message,
        primaryAction: {
          label: "Continue Planning",
          onClick: closePopupModal
        }
      });
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }, [location.search, location.state, navigate]);

  const selectedDestinationData = useMemo(() => {
    return destinations.find(d => d.name === formData.destination);
  }, [formData.destination, destinations]);

  const budgetAnalysis = useMemo(() => {
    if (!itinerary?.itinerary?.days?.length) return null;
    return analyzeBudgetPlan(
      categoryBudget,
      itinerary?.budget_management?.system_estimate,
      itinerary,
      formData,
      selectedDestinationData
    );
  }, [categoryBudget, formData, itinerary, selectedDestinationData]);

  const recommendedBudget = useMemo(
    () => estimateRecommendedTripBudget(formData, selectedDestinationData),
    [formData, selectedDestinationData]
  );

  useEffect(() => {
    if (!recommendedBudget || budgetWasEdited || hasGeneratedItinerary) return;

    setFormData((prev) => {
      if (Number(prev.budget) === recommendedBudget.total) return prev;
      return { ...prev, budget: recommendedBudget.total };
    });
  }, [budgetWasEdited, hasGeneratedItinerary, recommendedBudget]);

  useEffect(() => {
    if (!itinerary || !budgetAnalysis) return;
    localStorage.setItem(
      "plantrip_itinerary",
      JSON.stringify({
        ...itinerary,
        budget_management: budgetAnalysis
      })
    );
  }, [budgetAnalysis, itinerary]);

  const isSupportedDestination = useMemo(() => {
    if (!formData.destination.trim()) return false;
    return destinations.some((destination) => destination.name === formData.destination);
  }, [destinations, formData.destination]);

  useEffect(() => {
    if (formData.destination && destinations.length > 0 && !isSupportedDestination) {
      setValidationErrors((prev) => ({
        ...prev,
        destination: "This destination is not currently supported by the AI planner. Please choose one of the available destinations."
      }));
    }
  }, [destinations, formData.destination, isSupportedDestination]);

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

  const matchedGuides = useMemo(() => {
    const destinationText = (itinerary?.destination || formData.destination || "").toLowerCase();

    const ranked = guides.map((guide) => {
      const gDestinations = guide.destinations || [];
      const score = gDestinations.reduce((acc, dest) => {
        const d = String(dest).toLowerCase();
        if (destinationText.includes(d)) return acc + 3;
        if (d.includes(destinationText) || destinationText.includes(d.split(" ")[0])) {
          return acc + 1;
        }
        return acc;
      }, 0);

      return {
        ...guide,
        _matchScore: score,
        _isAvailableForTrip: guide.availability_badge === "Available",
      };
    });

    const relevant = ranked.filter((guide) => guide._matchScore > 0);
    const pool = relevant.length ? relevant : ranked;

    return pool
      .sort(
        (a, b) =>
          Number(b._isAvailableForTrip) - Number(a._isAvailableForTrip) ||
          b._matchScore - a._matchScore ||
          (b.rating || 0) - (a.rating || 0)
      )
      .slice(0, 6);
  }, [formData.destination, itinerary, guides]);

  const availableMatchedGuides = useMemo(() => {
    return matchedGuides
      .filter((guide) => guide._isAvailableForTrip && !bookedGuideIds.includes(guide.id))
      .slice(0, 3);
  }, [bookedGuideIds, matchedGuides]);

  const selectedTravelStyleLabel = useMemo(() => {
    return TRAVEL_STYLES.find((s) => s.id === formData.travelStyle)?.label || "Not selected";
  }, [formData.travelStyle]);

  const selectedInterestsText = useMemo(() => {
    return formData.interests
      .map((id) => INTERESTS.find((i) => i.id === id)?.label)
      .filter(Boolean)
      .join(", ");
  }, [formData.interests]);

  const readinessScore = useMemo(() => {
    const checks = [
      Boolean(formData.destination && isSupportedDestination),
      Boolean(formData.startDate),
      Boolean(formData.days && Number(formData.days) > 0),
      Boolean(formData.travelers),
      Boolean(formData.budget),
      Boolean(formData.travelStyle),
      Boolean(formData.interests.length),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [formData, isSupportedDestination]);

  const readinessMessage = useMemo(() => {
    if (readinessScore >= 85) return "Your trip looks good";
    if (readinessScore >= 55) return "A few details will sharpen the plan";
    return "Add the core trip details to get started";
  }, [readinessScore]);

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
    } else if (!isSupportedDestination) {
      errors.destination = "This destination is not currently supported by the AI planner. Please choose one of the available destinations.";
    }
    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }
    if (!formData.days || formData.days <= 0) {
      errors.days = "Please enter a valid duration";
    }

    return errors;
  };

  const validateStep2 = () => {
    const errors = {};

    if (!formData.travelStyle) {
      errors.travelStyle = "Select at least one travel style to shape the itinerary.";
    }
    if (!formData.interests.length) {
      errors.interests = "Select at least one interest so the planner can personalize the route.";
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

  const handleContinueStep2 = () => {
    const errors = validateStep2();
    setValidationErrors((prev) => ({ ...prev, ...errors }));

    if (Object.keys(errors).length === 0) {
      const recentInterests = mapInterestIdsToLabels(formData.interests);
      updateMyProfile({ recent_interests: recentInterests }).catch(() => {});
      setStep(3);
      setValidationErrors((prev) => ({
        ...prev,
        travelStyle: undefined,
        interests: undefined
      }));
    }
  };

  const applySuggestedDestination = (name) => {
    setFormData((prev) => ({ ...prev, destination: name }));
    setDestinationSuggestions([]);
    setGenerationError(null);
    setValidationErrors((prev) => ({ ...prev, destination: undefined }));
  };

  const handleGenerateItinerary = async () => {
    const errors = { ...validateStep1(), ...validateStep2() };
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setStep(errors.destination || errors.startDate || errors.days ? 1 : 2);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setShowSuccess(false);
    setShowGuides(false);
    setDestinationSuggestions([]);

    try {
      const payload = {
        destination: normalizeDestinationInput(formData.destination),
        days: formData.days,
        start_date: formData.startDate,
        budget: Number(formData.budget),
        travel_style: formData.travelStyle,
        interests: formData.interests,
        people: Number(formData.travelers)
      };

      updateMyProfile({ recent_interests: mapInterestIdsToLabels(formData.interests) }).catch(() => {});
      const data = await generateItinerary(payload);

      const normalized = normalizeBackendResponse(data, formData, formData.days);

      if (!normalized || !normalized?.itinerary?.days?.length) {
        setGenerationError("The itinerary was generated but no day-wise plan was returned.");
        return;
      }

      const initialCategoryBudget = normalizeCategoryBudget(null, formData.budget);
      const initialSystemEstimate = estimateTripBudget(normalized, formData, selectedDestinationData);
      const initialBudgetAnalysis = analyzeBudgetPlan(
        initialCategoryBudget,
        initialSystemEstimate,
        normalized,
        formData,
        selectedDestinationData
      );

      normalized.budget_management = initialBudgetAnalysis;

      setCategoryBudget(initialCategoryBudget);
      setSavedItineraryId(null);
      setItinerary(normalized);
      setGeneratedPlanSignature(currentPlannerSignature);
      // Auto-save removed: we keep the generated itinerary in state until the user clicks save.
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
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Network error. Please ensure the backend server is running on port 8000.";
      const suggestions = Array.isArray(err?.response?.data?.suggestions)
        ? err.response.data.suggestions
        : [];
      setDestinationSuggestions(suggestions);
      setGenerationError(apiMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitGuideRequest = async () => {
    navigate("/guides", {
      state: {
        selectedGuideId: bookingModal.guide.id,
        itineraryId: savedItineraryId,
        destination: itinerary?.destination || formData.destination,
        trip_start: formData.startDate,
        trip_end: calculatedEndDate,
        notes: bookingModal.notes
      }
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const closePopupModal = () => {
    setPopupModal(createEmptyPopupState());
  };

  const openPopupModal = ({
    type,
    title,
    message,
    primaryAction,
    secondaryAction,
    closeOnOverlay = true
  }) => {
    setPopupModal({
      isOpen: true,
      type,
      title,
      message,
      primaryAction,
      secondaryAction,
      closeOnOverlay
    });
  };

  const handleSaveItinerary = async () => {
    if (savedItineraryId) {
      openPopupModal({
        type: "info",
        title: "Itinerary already saved",
        message: "This itinerary is already in My Trips. You can open it anytime from your saved trip list.",
        primaryAction: {
          label: "Go to My Trips",
          onClick: () => {
            closePopupModal();
            navigate(`/trips/${savedItineraryId}`);
          }
        },
        secondaryAction: {
          label: "Continue",
          onClick: closePopupModal
        }
      });
      return;
    }
    if (!itinerary) return;

    setIsSaving(true);
    try {
      const itineraryWithBudget = {
        ...itinerary,
        budget: budgetAnalysis?.summary?.total_user_budget ?? itinerary.budget,
        budget_management: budgetAnalysis
      };
      const saveRes = await saveItinerary({
        destination: itinerary.destination,
        days: itinerary.days,
        start_date: formData.startDate,
        budget: budgetAnalysis?.summary?.total_user_budget ?? itinerary.budget,
        budget_plan: budgetAnalysis,
        travelers: formData.travelers,
        notes: itinerary.notes,
        itinerary_data: itineraryWithBudget
      });
      setSavedItineraryId(saveRes.id);
      openPopupModal({
        type: "success",
        title: "Itinerary saved successfully",
        message: "Your trip has been added to My Trips and is ready for guide matching or later review.",
        primaryAction: {
          label: "Go to My Trips",
          onClick: () => {
            closePopupModal();
            navigate(`/trips/${saveRes.id}`);
          }
        },
        secondaryAction: {
          label: "Continue",
          onClick: closePopupModal
        }
      });
    } catch (err) {
      console.error("Save failed:", err);
      openPopupModal({
        type: "error",
        title: "Could not save itinerary",
        message: "TripPlanner could not save this itinerary right now. Please try again in a moment.",
        primaryAction: {
          label: "OK",
          onClick: closePopupModal
        }
      });
    } finally {
      setIsSaving(false);
    }
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
    setGeneratedPlanSignature("");
    setIsMapModalOpen(false);
    setBudgetWasEdited(false);
    setCategoryBudget(normalizeCategoryBudget(null, DEFAULT_FORM_DATA.budget));

    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");
    localStorage.removeItem("plantrip_generated_signature");
  };

  return (
    <>
      <section className="planner-top-shell">
        <div className="planner-top-card">
          <div className="planner-top-scenic-accent" aria-hidden="true"></div>
          <div className="planner-top-grid">
            <div className="planner-top-main">
              <div className="planner-top-header">
                <div className="planner-top-copy">
                  <p className="planner-top-eyebrow">Plan your next journey</p>
                  <h1>AI Trip Planner</h1>
                  <p className="planner-top-subtitle">
                    Build a smarter Nepal itinerary with a clear, guided flow and destination-aware recommendations.
                  </p>
                </div>
                {hasPlannerProgress && (
                  <button type="button" className="restart-btn planner-reset-btn" onClick={clearForm}>
                    Start Over
                  </button>
                )}
              </div>

              <div className="planner-top-badges">
                <span className="planner-badge">AI itinerary engine</span>
                <span className="planner-badge">
                  {step === 3
                    ? hasConfirmedPlan
                      ? "Itinerary generated"
                      : "Awaiting confirmation"
                    : `Step ${step} of 3`}
                </span>
                <span className="planner-badge planner-badge-success">{readinessScore}% readiness</span>
              </div>

              <div className="plantrip-steps">
                {["Basics", "Preferences", "Confirm"].map((label, index) => {
                  const isActive = step === index + 1;
                  const isCompleted = step > index + 1 || (index === 2 && hasConfirmedPlan);
                  const isSuccessActive = index === 2 && isActive && hasConfirmedPlan;

                  return (
                  <div
                    key={label}
                    className={`step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""} ${isSuccessActive ? "success-active" : ""}`}
                  >
                    <div className="step-circle">{isCompleted ? "✓" : index + 1}</div>
                    <div className="step-label">{label}</div>
                  </div>
                  );
                })}
              </div>

              <div className="planner-snapshot-strip">
                <div className="planner-snapshot-item">
                  <span className="planner-snapshot-label">Destination</span>
                  <strong>{formData.destination || "Choose a place"}</strong>
                </div>
                <div className="planner-snapshot-item">
                  <span className="planner-snapshot-label">Dates</span>
                  <strong>{formData.startDate ? `${formatDateDisplay(formData.startDate)}${calculatedEndDate ? ` • ${formatDateDisplay(calculatedEndDate)}` : ""}` : "Pick travel dates"}</strong>
                </div>
                <div className="planner-snapshot-item">
                  <span className="planner-snapshot-label">Travelers</span>
                  <strong>{formData.travelers || "0"} traveler{Number(formData.travelers || 0) > 1 ? "s" : ""}</strong>
                </div>
                <div className="planner-snapshot-item">
                  <span className="planner-snapshot-label">Budget</span>
                  <strong>NPR {Number(formData.budget || 0).toLocaleString()}</strong>
                </div>
                <div className="planner-snapshot-item">
                  <span className="planner-snapshot-label">Style</span>
                  <strong>{selectedTravelStyleLabel}</strong>
                </div>
              </div>
            </div>

            <aside className="planner-top-side">
              <div className="planner-readiness-card">
                <div className="planner-readiness-head">
                  <span className="planner-readiness-kicker">Trip readiness</span>
                  <span className="planner-readiness-score">{readinessScore}%</span>
                </div>
                <strong className="planner-readiness-title">{readinessMessage}</strong>
                <p className="planner-readiness-copy">
                  TripPlanner has enough context to shape a cleaner route, match the right pace, and recommend a more realistic day-by-day flow.
                </p>
                <div className="planner-readiness-bar">
                  <span style={{ width: `${readinessScore}%` }}></span>
                </div>
                <div className="planner-mini-tip">
                  <span>💡</span>
                  <p>{step === 3 ? "Review the summary, then generate the itinerary when everything feels right." : "Complete the next step to unlock a more confident travel brief."}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="plantrip-container">
        {step === 1 && (
          <div className="card">
            <div className="card-header-flex">
              <div>
                <h2>Trip Basics</h2>
                <p className="card-subtitle">Choose destination, dates and travelers</p>
              </div>

              {hasPlannerProgress && (
                <button type="button" className="clear-btn" onClick={clearForm}>
                  🧹 Clear
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Destination *</label>
              <select
                value={formData.destination}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, destination: e.target.value }));
                  setBudgetWasEdited(false);
                  setValidationErrors((prev) => ({ ...prev, destination: undefined }));
                  setGenerationError(null);
                  setDestinationSuggestions([]);
                }}
                className={validationErrors.destination ? "error" : ""}
              >
                <option value="">Select your destination</option>
                {recommendedDestinations.length > 0 && (
                  <optgroup label="Recommended places in Nepal">
                    {recommendedDestinations.map((d) => (
                      <option key={`recommended-${d.geoname_id || d.name}`} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="All supported destinations">
                  {remainingDestinations.map((d) => (
                    <option key={d.geoname_id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              </select>

              {validationErrors.destination && (
                <span className="error-message">⚠️ {validationErrors.destination}</span>
              )}
              {destinationLoadError && (
                <span className="error-message">⚠️ {destinationLoadError}</span>
              )}
            </div>

            <div className="grid-2 trip-basics-grid">
              <div className="form-group">
                <label>Number of Travelers</label>
                <select
                  value={formData.travelers}
                  onChange={(e) => {
                    setBudgetWasEdited(false);
                    setFormData({ ...formData, travelers: e.target.value });
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "traveler" : "travelers"}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>

            <div className="grid-2 trip-basics-grid">

              <div className="form-group">
                <label>Duration (Days) *</label>
                <input
                  type="number"
                  min={selectedDestinationData?.min_days || 1}
                  max={selectedDestinationData?.max_days || 30}
                  value={formData.days || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBudgetWasEdited(false);
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
            <p className="card-subtitle">Choose the themes and experiences you want the itinerary to focus on</p>

            <div className="form-group">
              <label>Travel Style *</label>
              <div className={`chip-group chip-grid ${validationErrors.travelStyle ? "chip-group-error" : ""}`}>
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip ${formData.travelStyle === s.id ? "selected" : ""}`}
                    onClick={() => {
                      setFormData({ ...formData, travelStyle: s.id });
                      setValidationErrors((prev) => ({ ...prev, travelStyle: undefined }));
                    }}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span className="chip-label">{s.label}</span>
                  </button>
                ))}
              </div>
              {validationErrors.travelStyle && (
                <span className="error-message">⚠️ {validationErrors.travelStyle}</span>
              )}
            </div>

            <div className="form-group">
              <label>Interests *</label>
              <div className={`chip-group chip-grid ${validationErrors.interests ? "chip-group-error" : ""}`}>
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`chip ${formData.interests.includes(i.id) ? "selected" : ""}`}
                    onClick={() => {
                      toggleInterest(i.id);
                      setValidationErrors((prev) => ({ ...prev, interests: undefined }));
                    }}
                  >
                    <span className="chip-icon">{i.icon}</span>
                    <span className="chip-label">{i.label}</span>
                  </button>
                ))}
              </div>
              {validationErrors.interests && (
                <span className="error-message">⚠️ {validationErrors.interests}</span>
              )}
            </div>

            <div className="form-group">
              <label>Budget (NPR)</label>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={formData.budget}
                onChange={(e) => {
                  setBudgetWasEdited(true);
                  setFormData({ ...formData, budget: Number(e.target.value) });
                }}
                className="slider"
              />
              <div className="budget-display">
                NPR {Number(formData.budget).toLocaleString()}
                <span className="budget-label"> · {budgetLabel(formData.budget)}</span>
              </div>
              {recommendedBudget && (
                <div className="budget-recommendation-strip">
                  <div>
                    <span>Recommended for this trip</span>
                    <strong>{formatNpr(recommendedBudget.total)}</strong>
                    <p>
                      Based on {recommendedBudget.travelers} traveler{recommendedBudget.travelers > 1 ? "s" : ""}, {recommendedBudget.days} day{recommendedBudget.days > 1 ? "s" : ""}, and {recommendedBudget.label} costs.
                    </p>
                  </div>
                  {Number(formData.budget) !== recommendedBudget.total && (
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetWasEdited(false);
                        setFormData((prev) => ({ ...prev, budget: recommendedBudget.total }));
                      }}
                    >
                      Use recommended
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="btn-row">
              <button type="button" className="secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="button" className="primary" onClick={handleContinueStep2}>
                Review Details →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="review-shell">
            <div className="card review-main-card">
              <div className="review-header">
                <div>
                  <h2>Review Your Trip</h2>
                  <p className="card-subtitle">A clean summary of your current plan before TripPlanner builds the itinerary.</p>
                </div>
                <div className={`review-status-pill ${hasConfirmedPlan ? "is-success" : "is-pending"}`}>
                  <span>{hasConfirmedPlan ? "✅" : "●"}</span>
                  <strong>{hasConfirmedPlan ? "Itinerary generated" : "Awaiting final confirmation"}</strong>
                </div>
              </div>

              <div className="review-highlight-strip">
                <span className="review-chip">Smart route logic</span>
                <span className="review-chip">Local travel context</span>
                <span className="review-chip">Budget-aware planning</span>
              </div>

              <div className="summary-grid review-summary-grid">
                <div className="summary-item">
                  <span className="summary-icon">📍</span>
                  <div>
                    <div className="summary-label">Destination</div>
                    <div className="summary-value">{formData.destination}</div>
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
              {destinationSuggestions.length > 0 && (
                <div className="suggestions-box">
                  <span className="suggestions-title">Try one of these supported destinations:</span>
                  <div className="suggestions-list">
                    {destinationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => {
                          applySuggestedDestination(suggestion);
                          setStep(1);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="review-sidebar">
              <div className="card review-sidebar-card">
                <div className="review-map-panel">
                  <div className="review-map-header">
                    <div className="review-map-heading">
                      <span className="review-map-heading-label">
                        {routeSummary.has_connected_path ? "Route Preview" : "Destination Map"}
                      </span>
                      <strong className="review-map-heading-title">{formData.destination || "Nepal"}</strong>
                      <p className="review-map-heading-copy">
                        {routeSummary.has_connected_path
                          ? "Follow the ordered trip flow across your current itinerary stops."
                          : "A polished live location preview to validate the destination before generating your itinerary."}
                      </p>
                    </div>
                    <div className="review-map-header-actions">
                      <span className="review-map-live-pill">
                        {routeSummary.has_connected_path ? `${routeSummary.stop_count} stops` : `${readinessScore}% ready`}
                      </span>
                      <button type="button" className="map-expand-button" onClick={() => setIsMapModalOpen(true)}>
                        View larger map
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="review-map-wrapper"
                    onClick={() => setIsMapModalOpen(true)}
                    aria-label="Open larger destination map"
                  >
                    <MapView
                      lat={mapLocation.lat}
                      lng={mapLocation.lng}
                      zoom={mapLocation.zoom}
                      title={mapLocation.label}
                      className="review-map-embed"
                      sectionLabel="Destination Map"
                      footerNote={
                        routeSummary.has_connected_path
                          ? "Connected stop overview for the current itinerary."
                          : "Use this preview to confirm place context before generating the route."
                      }
                      routeStops={routeStops}
                      showRouteLine={routeSummary.has_connected_path}
                      dragging={false}
                      touchZoom={false}
                      zoomControl={false}
                    />
                    <div className="review-map-action-overlay">
                      <span className="review-map-action-text">Click to expand the map preview</span>
                    </div>
                  </button>

                  <div className="review-map-meta-grid">
                    <div className="review-map-meta-card">
                      <span className="review-map-meta-label">Stop Flow</span>
                      <strong>{routeSummary.stop_count} mapped stop{routeSummary.stop_count === 1 ? "" : "s"}</strong>
                    </div>
                    <div className="review-map-meta-card">
                      <span className="review-map-meta-label">Travel Window</span>
                      <strong>
                      {formData.startDate
                        ? `${formatDateDisplay(formData.startDate)}${calculatedEndDate ? ` • ${formatDateDisplay(calculatedEndDate)}` : ""}`
                        : "Dates TBD"}
                      </strong>
                    </div>
                    <div className="review-map-meta-card">
                      <span className="review-map-meta-label">
                        {routeSummary.has_connected_path ? "Route Distance" : "Trip Style"}
                      </span>
                      <strong>
                        {routeSummary.has_connected_path && routeSummary.distance_km
                          ? `${routeSummary.distance_km} km overview`
                          : (selectedTravelStyleLabel || "Style not set")}
                      </strong>
                    </div>
                  </div>

                  {routeStops.length > 0 && (
                    <div className="review-route-stops-card">
                      <div className="review-route-stops-head">
                        <div>
                          <span className="review-route-stops-label">Where to go</span>
                          <strong className="review-route-stops-title">Ordered journey preview</strong>
                        </div>
                        {googleMapsDirectionsUrl && (
                          <a
                            href={googleMapsDirectionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="review-route-external-link"
                          >
                            Open in Google Maps
                          </a>
                        )}
                      </div>

                      <div className="review-route-stop-list">
                        {routeStops.map((stop, index) => (
                          <div key={`${stop.order}-${stop.name}-${index}`} className="review-route-stop-item">
                            <div className="review-route-stop-marker">{stop.order}</div>
                            <div className="review-route-stop-copy">
                              <div className="review-route-stop-topline">
                                <strong>{stop.name}</strong>
                                <span>Day {stop.day} · {stop.time_of_day}</span>
                              </div>
                              <p>{stop.note || "Planned route stop."}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="review-map-supporting-row">
                    <p className="review-map-supporting-copy">
                      {routeSummary.has_connected_path
                        ? "This is a connected stop overview of the trip flow. Exact turn-by-turn routing can be added later with a routing engine."
                        : (hasConfirmedPlan
                          ? "Use the larger map to inspect the destination context around your generated trip."
                          : "Use the larger view if you want a clearer spatial check before generating the route.")}
                    </p>
                    <div className="review-map-supporting-actions">
                      <button type="button" className="map-expand-button secondary" onClick={() => setIsMapModalOpen(true)}>
                        Open full preview
                      </button>
                      {googleMapsDirectionsUrl && (
                        <a
                          href={googleMapsDirectionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="map-expand-button secondary"
                        >
                          Navigate externally
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="review-action-bar">
                  <button type="button" className="secondary review-action-btn" onClick={() => setStep(1)}>
                    Edit Basics
                  </button>
                  <button type="button" className="secondary review-action-btn" onClick={() => setStep(2)}>
                    Back to Preferences
                  </button>
                  <button
                    type="button"
                    className="primary generate-btn review-generate-btn"
                    onClick={handleGenerateItinerary}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner"></span>
                        Generating itinerary...
                      </>
                    ) : (
                      "Generate Itinerary"
                    )}
                  </button>
                </div>

                {isGenerating && (
                  <div className="generating-hint">
                    <p>🤖 TripPlanner is organizing a day-wise route, highlights, stay suggestions, and travel notes...</p>
                  </div>
                )}
              </div>
            </aside>
            {isMapModalOpen && (
              <div
                className="map-modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Expanded map preview"
                onClick={() => setIsMapModalOpen(false)}
              >
                <div className="map-modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="map-modal-header">
                    <div>
                      <strong>Explore destination map</strong>
                      <p>{hasConfirmedPlan ? "Use the larger canvas to inspect the area around your generated trip." : "Review the destination context before you generate the itinerary."}</p>
                    </div>
                    <button type="button" className="map-modal-close" onClick={() => setIsMapModalOpen(false)}>
                      ×
                    </button>
                  </div>
                  <div className="map-modal-meta">
                    <span className="map-modal-chip">{formData.destination || "Nepal overview"}</span>
                    <span className="map-modal-chip">
                      {formData.startDate
                        ? `${formatDateDisplay(formData.startDate)}${calculatedEndDate ? ` • ${formatDateDisplay(calculatedEndDate)}` : ""}`
                        : "Dates TBD"}
                    </span>
                    <span className="map-modal-chip">{selectedTravelStyleLabel}</span>
                  </div>
                  <MapView
                    lat={mapLocation.lat}
                    lng={mapLocation.lng}
                    zoom={mapLocation.zoom}
                    title={mapLocation.label}
                    className="map-modal-map"
                    sectionLabel="Route Preview"
                    footerNote="Use the expanded canvas for a closer location check."
                    routeStops={routeStops}
                    showRouteLine={routeSummary.has_connected_path}
                    scrollWheelZoom={true}
                    doubleClickZoom={true}
                    dragging={true}
                    touchZoom={true}
                    zoomControl={true}
                  />
                  <div className="map-modal-footer">
                    <p>
                      {routeSummary.has_connected_path
                        ? "Zoom, drag, and inspect the connected itinerary stops. Use Google Maps for external navigation."
                        : "Zoom, drag, and inspect the destination more closely."}
                    </p>
                  </div>
                </div>
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
                <span>🗺️ {itinerary.destination}</span>
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

            {budgetAnalysis && (
              <section className={`budget-management-section ${showSuccess ? "hide" : "slide-up"}`}>
                <div className="budget-management-header">
                  <div>
                    <span className="budget-management-kicker">Budget Management</span>
                    <h2>Preference-Based Trip Budget</h2>
                    <p>
                      TripPlanner compares your planned budget with an itinerary-aware estimate for this destination, duration, and traveler count.
                    </p>
                  </div>
                  <span className={`budget-health-badge ${budgetAnalysis.summary.status_tone}`}>
                    {budgetAnalysis.summary.status}
                  </span>
                </div>

                <div className="budget-summary-grid">
                  <div className="budget-summary-card">
                    <span>Total User Budget</span>
                    <strong>{formatNpr(budgetAnalysis.summary.total_user_budget)}</strong>
                  </div>
                  <div className="budget-summary-card">
                    <span>Estimated Trip Expense</span>
                    <strong>{formatNpr(budgetAnalysis.summary.total_estimated_cost)}</strong>
                  </div>
                  <div className={`budget-summary-card ${budgetAnalysis.summary.remaining_balance < 0 ? "negative" : "positive"}`}>
                    <span>{budgetAnalysis.summary.remaining_balance < 0 ? "Budget Shortage" : "Remaining Balance"}</span>
                    <strong>{formatNpr(Math.abs(budgetAnalysis.summary.remaining_balance))}</strong>
                  </div>
                  <div className="budget-summary-card">
                    <span>Financial Health</span>
                    <strong>{budgetAnalysis.summary.message}</strong>
                  </div>
                </div>

                <div className="budget-workspace-grid">
                  <div className="budget-category-panel">
                    <div className="budget-panel-heading">
                      <h3>Category Breakdown</h3>
                      <span>Static estimate in NPR</span>
                    </div>

                    <div className="budget-category-list">
                      {budgetAnalysis.categories.map((category) => (
                        <div key={category.key} className="budget-category-row">
                          <div className="budget-category-topline">
                            <strong>{category.label}</strong>
                          </div>

                          <div className="budget-category-metrics">
                            <span>Allocated: {formatNpr(category.allocated)}</span>
                            <span>Estimated: {formatNpr(category.estimated)}</span>
                          </div>

                          <div className="budget-progress-track" aria-label={`${category.label} utilization ${category.utilization}%`}>
                            <span
                              className={category.tone}
                              style={{ width: `${Math.min(category.utilization, 140)}%` }}
                            ></span>
                          </div>
                          <div className="budget-utilization-label">
                            {category.utilization}% utilization of allocated budget
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="budget-recommendation-panel">
                    <div className="budget-panel-heading">
                      <h3>Smart Recommendations</h3>
                      <span>Live budget guidance</span>
                    </div>
                    <ul className="budget-recommendation-list">
                      {budgetAnalysis.recommendations.map((recommendation, index) => (
                        <li key={`${recommendation}-${index}`}>
                          <span>✓</span>
                          <p>{recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

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
                  <div className="tips-card-header">
                    <h3>Essential Tips</h3>
                    <span className="tips-card-kicker">Travel insights</span>
                  </div>
                  <ul className="tips-list">
                    {itinerary.itinerary.travel_tips.map((tip, idx) => (
                      <li key={idx}>
                        <span className="tips-list-icon">✓</span>
                        <div className="tips-list-copy">
                          <span className="tips-list-category">{classifyTravelTip(tip)}</span>
                          <p>{tip}</p>
                        </div>
                      </li>
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
                style={savedItineraryId ? { backgroundColor: '#10b981', borderColor: '#10b981', cursor: 'default' } : {}}
                disabled={isSaving || savedItineraryId}
              >
                {isSaving ? (
                  <><span className="spinner" style={{ marginRight: '8px', width: '16px', height: '16px' }}></span> Saving...</>
                ) : (
                  <><span className="btn-icon">{savedItineraryId ? "✓" : "💾"}</span> {savedItineraryId ? "Saved to My Trips" : "Save Itinerary"}</>
                )}
              </button>
              {savedItineraryId && (
                <button
                  type="button"
                  className="lp-btn-outline-dark ml-2"
                  onClick={() => navigate(`/trips/${savedItineraryId}`)}
                >
                  View Details
                </button>
              )}
            </div>

            {showGuides && (
              <div className="find-guide-section slide-up mt-12 mb-12">
                <div className="text-center mb-8">
                  <span className="lp-section-badge">Local Experts</span>
                  <h2 className="lp-section-title guide-section-title">
                    Match with a Guide
                  </h2>
                  <p className="lp-section-sub mx-auto">
                    Review a focused shortlist of guides who are available for your selected trip dates.
                  </p>
                </div>

                {availableMatchedGuides.length > 0 ? (
                  <>
                    <div className="guide-match-grid">
                      {availableMatchedGuides.map((guide) => (
                        <div key={guide.id} className="lp-dest-card guide-match-card">
                          <div className="guide-card-header">
                            <div className="guide-avatar-large">
                              {guide.profile_image ? (
                                <img src={`http://localhost:8000${guide.profile_image}`} alt={guide.full_name} className="guide-avatar-image" />
                              ) : "👤"}
                            </div>
                            <div className="guide-card-copy">
                              <div className="guide-availability-pill available">
                                Available for your trip
                              </div>
                              <h3 className="guide-card-name">{guide.full_name}</h3>
                              <span className="guide-card-specialization">
                                {guide.specialization || "Local Guide"}
                              </span>
                            </div>
                          </div>

                          <div className="guide-card-stats grid-2">
                            <div className="guide-stat-card">
                              <div className="guide-stat-label">
                                Experience
                              </div>
                              <strong className="guide-stat-value">{guide.experience_years} Years</strong>
                            </div>

                            <div className="guide-stat-card">
                              <div className="guide-stat-label">
                                Rating
                              </div>
                              <strong className="guide-stat-rating">⭐ {guide.rating}</strong>{" "}
                              <span className="guide-stat-meta">
                                ({guide.tours_completed} tours)
                              </span>
                            </div>
                          </div>

                          <div className="guide-destination-meta">
                            <strong>Covers:</strong> {(guide.destinations || []).join(" • ")}
                          </div>

                          <button
                            type="button"
                            className="guide-request-btn lp-btn-primary"
                            onClick={() => {
                              if (!savedItineraryId) {
                                openPopupModal({
                                  type: "warning",
                                  title: "Save itinerary first",
                                  message: "Save this itinerary before requesting a guide so TripPlanner can attach your trip details to the booking inquiry.",
                                  primaryAction: {
                                    label: "Save Itinerary First",
                                    onClick: closePopupModal
                                  },
                                  secondaryAction: {
                                    label: "Continue Browsing",
                                    onClick: closePopupModal
                                  }
                                });
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
                            Request Guide
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="guide-shortlist-footer">
                      <button
                        type="button"
                        className="lp-btn-outline-dark guide-browse-btn"
                        onClick={() => navigate("/guides")}
                      >
                        Explore More Guides
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="guide-empty-state">
                    <div className="guide-empty-icon">🧭</div>
                    <h3>No guides are available for your selected dates right now</h3>
                    <p>
                      Browse the full guide directory to explore more experts, alternate dates, or a wider destination list.
                    </p>
                    <button
                      type="button"
                      className="lp-btn-outline-dark guide-browse-btn"
                      onClick={() => navigate("/guides")}
                    >
                      Explore More Guides
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {bookingModal.isOpen && bookingModal.guide && (
        <div className="modal-overlay">
          <div className="modal-content auth-modal planner-guide-modal">
            <button className="close-btn" onClick={() => setBookingModal({ ...bookingModal, isOpen: false })}>×</button>
            <div className="planner-guide-modal-header">
              <h2>Request {bookingModal.guide.full_name}</h2>
              <p>Send a booking inquiry along with your proposed itinerary.</p>
            </div>

            {bookingModal.error && <p className="error-message planner-guide-modal-error">{bookingModal.error}</p>}
            {bookingModal.success && <div className="success-banner pop-in planner-guide-modal-success">
              <span className="success-icon planner-guide-modal-success-icon">✅</span> {bookingModal.success}
            </div>}

            {!bookingModal.success && (
              <div className="auth-form">
                <div className="form-group planner-guide-modal-group">
                  <label>Attached Plan</label>
                  <div className="planner-guide-modal-summary">
                    <strong>{itinerary.destination}</strong> ({formData.days} Days)<br />
                    <span className="planner-guide-modal-summary-dates">{formatDateDisplay(formData.startDate)} – {formatDateDisplay(calculatedEndDate)}</span>
                  </div>
                </div>

                <div className="form-group planner-guide-modal-group planner-guide-modal-group-lg">
                  <label>Message to Guide</label>
                  <textarea
                    value={bookingModal.notes}
                    onChange={(e) => setBookingModal({ ...bookingModal, notes: e.target.value })}
                    rows={5}
                    className="planner-guide-modal-textarea"
                  />
                </div>

                <button
                  className="lp-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={submitGuideRequest}
                  disabled={bookingModal.isSubmitting}
                >
                  {bookingModal.isSubmitting ? <><span className="spinner" style={{ marginRight: '8px', width: '16px', height: '16px' }}></span> Preparing payment...</> : "Continue to Payment"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      <AppPopupModal
        isOpen={popupModal.isOpen}
        type={popupModal.type}
        title={popupModal.title}
        message={popupModal.message}
        primaryAction={popupModal.primaryAction}
        secondaryAction={popupModal.secondaryAction}
        onClose={closePopupModal}
        closeOnOverlay={popupModal.closeOnOverlay}
      />
    </>
  );
}

export default Plantrip;
