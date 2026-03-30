import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  Compass,
  Cpu,
  FolderKanban,
  HelpCircle,
  MapPinned,
  Settings2,
  UserRound,
  Wrench
} from "lucide-react";
import "./FAQ.css";

const FAQ_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <Compass size={18} />,
    items: [
      {
        q: "What does TripPlanner actually do?",
        a: "TripPlanner helps you plan Nepal trips with an AI itinerary builder, guide matching, saved itineraries, trip tracking, and profile-based preference syncing."
      },
      {
        q: "Do I need an account to use the AI Planner?",
        a: "You can explore the planner UI without much setup, but saving itineraries, requesting guides, and syncing profile preferences require you to be logged in."
      },
      {
        q: "What information should I prepare before planning a trip?",
        a: "The planner works best when you already know your destination idea, travel dates, duration, budget, traveler count, and a few interests or style preferences."
      },
      {
        q: "Is TripPlanner focused on Nepal only?",
        a: "Yes. The destination logic, recommendations, and guide flow are designed specifically around Nepal travel rather than generic worldwide trip planning."
      },
      {
        q: "Why does the review step appear before the trip is complete?",
        a: "The review step is only the final checkpoint before generation. Your trip is not considered completed until you actually generate and optionally save the itinerary."
      }
    ]
  },
  {
    id: "ai-planner",
    title: "AI Itinerary Planner",
    icon: <Cpu size={18} />,
    items: [
      {
        q: "How is my itinerary generated in TripPlanner?",
        a: "Your itinerary is generated from your selected destination, dates, duration, budget, travel style, and interests. The system organizes activities into day-by-day structure with supporting tips."
      },
      {
        q: "Why do some days feel similar in my itinerary?",
        a: "If your trip has limited duration or narrow inputs, the planner may repeat similar activity patterns. Broader interests or a longer trip usually produce more variety."
      },
      {
        q: "Can I change the number of days after generating a plan?",
        a: "Not directly inside the generated itinerary. Update the trip duration in the planner inputs and generate again so the itinerary stays consistent with the new length."
      },
      {
        q: "Why does the Confirm step stay active instead of completed?",
        a: "That step represents pending confirmation. It only becomes a true completed state after Generate Itinerary succeeds for the current planner selections."
      },
      {
        q: "Why does the planner ask for at least one interest?",
        a: "Interests help the itinerary engine shape recommendations around what you care about. Without them, the trip becomes too generic and less personalized."
      },
      {
        q: "Do my planner selections affect my profile later?",
        a: "Yes. Recent planner interests and some travel preferences can be synced back into your profile so the account reflects your latest planning behavior."
      }
    ]
  },
  {
    id: "guide-booking",
    title: "Guide Booking System",
    icon: <MapPinned size={18} />,
    items: [
      {
        q: "Why is a guide marked as “Unavailable for selected dates”?",
        a: "That guide already has an accepted or active booking overlapping your requested travel dates, so the system removes them from requestable options for that period."
      },
      {
        q: "Can I book a guide without saving my itinerary?",
        a: "No. You need to save the itinerary first so the booking request has a real trip reference and can be reviewed properly by the guide."
      },
      {
        q: "What happens when multiple users request the same guide?",
        a: "Pending requests can coexist, but once a guide accepts a booking, overlapping pending requests may be auto-rejected if the dates conflict."
      },
      {
        q: "Why do I only see some guides in the planner review page?",
        a: "That section is a shortlist, not the full guide catalog. It only shows guides who are currently requestable for your selected trip dates."
      },
      {
        q: "What does the guide request actually send?",
        a: "The request includes your saved itinerary reference, destination, trip dates, and any notes you add so the guide can review the full context before responding."
      },
      {
        q: "Why did a guide disappear after I changed my dates?",
        a: "Guide availability is date-sensitive. Changing trip dates can remove guides who were available for the earlier range but not for the updated one."
      }
    ]
  },
  {
    id: "trips-saved",
    title: "Trips & Saved Itineraries",
    icon: <FolderKanban size={18} />,
    items: [
      {
        q: "What is the difference between “Saved Trips” and “My Trips”?",
        a: "Saved Trips is your library of AI itineraries. My Trips focuses on actual guide-related trip bookings and request statuses connected to those itineraries."
      },
      {
        q: "Why is my itinerary still visible after logging out and logging back in?",
        a: "The planner caches in-progress data locally for continuity. Saved itineraries also remain on your account server-side, so they return when you sign back in."
      },
      {
        q: "Why can I still see a generated itinerary before saving it?",
        a: "Generation and saving are separate actions. The itinerary stays in page state so you can review it first, then decide whether to save it."
      },
      {
        q: "Can I delete a saved itinerary later?",
        a: "Yes. Saved Trips includes a delete action that removes the itinerary from your saved collection once you confirm the action."
      },
      {
        q: "Why is a trip labeled as upcoming, ongoing, or past?",
        a: "Trip status is derived from the trip dates. The app compares your itinerary or booking dates against the current date to label the trip automatically."
      }
    ]
  },
  {
    id: "profile-preferences",
    title: "Profile & Preferences",
    icon: <UserRound size={18} />,
    items: [
      {
        q: "Why are my travel interests showing as “Recent”?",
        a: "That label means the interests came from your latest AI Planner selections, not from a static manual list. It reflects your most recent planning behavior."
      },
      {
        q: "How are my preferences used in itinerary generation?",
        a: "Travel style, destinations, and recent interests help shape itinerary tone and recommendations. They give the planner better context for future trip generation."
      },
      {
        q: "Can I manually change my favorite destinations?",
        a: "Yes. The Profile page supports comma or Enter-based destination tags, and those are stored as an array on your traveler profile."
      },
      {
        q: "Why does my travel style show “Not set yet”?",
        a: "That means your profile does not currently have a saved travel style. You can select one from the profile input or let your planner behavior inform future edits."
      },
      {
        q: "Do planner preferences overwrite my whole profile?",
        a: "No. Only specific synced fields, such as recent interests, are updated from planner activity. Your other profile data stays separate unless you edit it directly."
      }
    ]
  },
  {
    id: "settings-security",
    title: "Settings & Security",
    icon: <Settings2 size={18} />,
    items: [
      {
        q: "Why is my password change not working?",
        a: "The most common reasons are an incorrect current password, a new password shorter than the minimum requirement, or a mismatch between new and confirm password."
      },
      {
        q: "Do I need to log in again after changing my password?",
        a: "No. The backend refreshes your authenticated session after a successful password change, so you should stay signed in on the current device."
      },
      {
        q: "Why does the app ask for my current password first?",
        a: "That prevents unauthorized password changes on an already-open session. The system verifies the current password before allowing an update."
      },
      {
        q: "What happens if I log out from Settings?",
        a: "Your session is cleared, local login state is removed, and planner cache entries related to your session are also cleaned up before redirecting you home."
      },
      {
        q: "Why does the logout action use a popup instead of a browser confirm box?",
        a: "TripPlanner uses custom in-app confirmation modals so account actions feel consistent with the rest of the product and work better in dark mode."
      }
    ]
  },
  {
    id: "technical-usage",
    title: "Technical & Usage",
    icon: <Wrench size={18} />,
    items: [
      {
        q: "Why does the map sometimes open in a larger modal instead of staying in the sidebar?",
        a: "The sidebar map is intended as a preview. The larger modal is the main interactive map surface for dragging, zooming, and reviewing markers in detail."
      },
      {
        q: "Why do some pages show loading skeletons before content appears?",
        a: "Skeletons are used to keep the layout stable while content loads. They reduce abrupt jumps and make the interface feel more responsive."
      },
      {
        q: "Why do I see different behavior after a hard refresh?",
        a: "Some planner and UI state is cached locally during a session. A hard refresh clears volatile in-memory state and can force the app to fetch fresh data."
      },
      {
        q: "What should I do if a guide or itinerary action fails unexpectedly?",
        a: "Check that you are signed in, that your itinerary is saved if required, and that the backend is running. Most booking and planner actions depend on authenticated API calls."
      },
      {
        q: "Why do some changes appear only after the page reloads?",
        a: "If your browser is serving older compiled assets, a refresh may be needed to pull the latest frontend bundle. This is more common during active development."
      }
    ]
  }
];

const POPULAR_IDS = [
  "How is my itinerary generated in TripPlanner?",
  "Can I book a guide without saving my itinerary?",
  "What is the difference between “Saved Trips” and “My Trips”?",
  "Why are my travel interests showing as “Recent”?"
];

export default function FAQ() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(POPULAR_IDS[0]);

  const normalizedQuery = search.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return FAQ_SECTIONS;

    return FAQ_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(normalizedQuery) ||
            item.a.toLowerCase().includes(normalizedQuery)
        )
      }))
      .filter((section) => section.items.length > 0);
  }, [normalizedQuery]);

  const popularItems = useMemo(
    () =>
      FAQ_SECTIONS.flatMap((section) => section.items).filter((item) =>
        POPULAR_IDS.includes(item.q)
      ),
    []
  );

  const toggleItem = (question) => {
    setOpenId((current) => (current === question ? null : question));
  };

  return (
    <div className="faq-page">
      <div className="faq-shell">
        <section className="faq-hero">
          <div className="faq-hero-pattern" />
          <div className="faq-hero-copy">
            <span className="faq-kicker">Help Center</span>
            <h1>TripPlanner FAQ</h1>
            <p>Answers based on how TripPlanner actually works, from AI itinerary generation to guide booking, saved trips, profile syncing, and account settings.</p>
          </div>

          <div className="faq-search-card">
            <div className="faq-search-icon"><HelpCircle size={18} /></div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search help topics..."
              aria-label="Search FAQ"
            />
          </div>
        </section>

        <section className="faq-popular">
          <div className="faq-section-head">
            <span className="faq-section-kicker">Popular Questions</span>
            <h2>Common issues users actually run into</h2>
          </div>

          <div className="faq-popular-grid">
            {popularItems.map((item) => (
              <button
                key={item.q}
                type="button"
                className={`faq-popular-card ${openId === item.q ? "is-active" : ""}`}
                onClick={() => setOpenId(item.q)}
              >
                <strong>{item.q}</strong>
                <span>{item.a}</span>
              </button>
            ))}
          </div>
        </section>

        {filteredSections.length === 0 ? (
          <section className="faq-empty">
            <div className="faq-empty-icon"><HelpCircle size={22} /></div>
            <h2>No help topics found</h2>
            <p>Try a different keyword such as itinerary, guide, saved trips, password, or profile.</p>
          </section>
        ) : (
          <section className="faq-sections">
            {filteredSections.map((section) => (
              <article key={section.id} className="faq-section-card">
                <div className="faq-category-head">
                  <div className="faq-category-icon">{section.icon}</div>
                  <div>
                    <h3>{section.title}</h3>
                    <span>{section.items.length} questions</span>
                  </div>
                </div>

                <div className="faq-accordion">
                  {section.items.map((item) => {
                    const isOpen = openId === item.q;
                    return (
                      <div key={item.q} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                        <button
                          type="button"
                          className="faq-question"
                          onClick={() => toggleItem(item.q)}
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          <ChevronDown size={18} />
                        </button>
                        <div className="faq-answer-wrap">
                          <div className="faq-answer">
                            <p>{item.a}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
