import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarRange,
  Compass,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  WalletCards
} from "lucide-react";
import "./HowItWorks.css";

const PROCESS_STEPS = [
  {
    id: 1,
    title: "Choose Destination & Dates",
    description: "Start with where you want to go and when. From Kathmandu city breaks to mountain escapes, TripPlanner turns a rough idea into a route-ready brief.",
    icon: <MapPinned size={22} />
  },
  {
    id: 2,
    title: "Set Budget & Preferences",
    description: "Add your budget, travel style, and interests so the planner can shape the trip around how you actually want to experience Nepal.",
    icon: <WalletCards size={22} />
  },
  {
    id: 3,
    title: "AI Builds the Plan",
    description: "Our AI combines route logic, pacing, destination context, and travel preferences to create a smarter day-by-day itinerary.",
    icon: <Sparkles size={22} />
  },
  {
    id: 4,
    title: "Review, Refine & Go",
    description: "See your itinerary, explore guides, refine details, and move from planning mode to a trip that feels ready to book.",
    icon: <Route size={22} />
  },
  {
    id: 5,
    title: "Match with a Local Guide",
    description: "Browse available guides for your selected dates, compare fit, and choose someone who can deliver the trip on the ground.",
    icon: <UserRoundSearch size={22} />
  },
  {
    id: 6,
    title: "Book & Start Your Trip",
    description: "Send a guide request, get confirmation, and move from planning into a real trip with local support behind it.",
    icon: <BadgeCheck size={22} />
  }
];

const BENEFITS = [
  {
    title: "Save planning hours",
    description: "Skip scattered tabs, spreadsheets, and note apps. TripPlanner gathers the key pieces into one guided flow.",
    icon: <CalendarRange size={18} />
  },
  {
    title: "Surface smarter recommendations",
    description: "Get routes, ideas, and destination choices that feel more local, balanced, and travel-aware.",
    icon: <Compass size={18} />
  },
  {
    title: "Keep decisions clear",
    description: "Budget, timing, and trip structure stay visible from first idea to final itinerary review.",
    icon: <ShieldCheck size={18} />
  }
];

const WORKFLOW = [
  {
    title: "Trip Brief",
    text: "Dates, destination, budget, interests",
    tone: "brief"
  },
  {
    title: "Planner Engine",
    text: "Personalization, timing, destination logic",
    tone: "engine"
  },
  {
    title: "Curated Itinerary",
    text: "Day-by-day plan, tips, map, guide matching",
    tone: "result"
  }
];

const GUIDE_FLOW = [
  {
    title: "AI Itinerary",
    text: "Your plan is ready with route, timing, and trip details.",
    meta: "Planning complete"
  },
  {
    title: "Match Guides",
    text: "Browse verified local guides filtered by your selected trip dates.",
    meta: "Real-time availability"
  },
  {
    title: "Request Guide",
    text: "Send a booking request directly from the trip flow without leaving context.",
    meta: "Instant request system"
  },
  {
    title: "Guide Accepts",
    text: "The guide reviews and confirms the request when the schedule aligns.",
    meta: "Verified local guides"
  },
  {
    title: "Trip Confirmed",
    text: "Your itinerary and guide are aligned, so the trip moves from plan to execution.",
    meta: "Ready to travel"
  }
];

export default function HowItWorks() {
  return (
    <div className="hiw-page">
      <section className="hiw-hero">
        <div className="hiw-hero-pattern" />
        <div className="hiw-container hiw-hero-shell">
          <div className="hiw-hero-copy">
            <span className="hiw-kicker">Product Walkthrough</span>
            <h1>How TripPlanner Works</h1>
            <p>
              Plan your Nepal journey with a clearer, faster, and more guided workflow designed to turn travel ideas into confident itineraries.
            </p>
            <div className="hiw-hero-meta">AI-powered trip planning designed for Nepal travel</div>
          </div>

          <div className="hiw-hero-panel">
            <div className="hiw-orbit-line" />
            <div className="hiw-hero-card hiw-hero-card-primary">
              <span>Traveler Inputs</span>
              <strong>Destination, style, dates, budget</strong>
            </div>
            <div className="hiw-hero-card hiw-hero-card-secondary">
              <span>Smart Output</span>
              <strong>Refined itinerary with route-aware flow</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-process">
        <div className="hiw-container">
          <div className="hiw-section-head">
            <span className="hiw-section-kicker">4-Step Journey</span>
            <h2>A guided flow from first idea to confirmed trip</h2>
            <p>TripPlanner is not just an itinerary generator. It connects planning and real-world execution in one product flow.</p>
          </div>

          <div className="steps-grid">
            {PROCESS_STEPS.map((step) => (
              <article key={step.id} className="step-card">
                <div className="step-connector" />
                <div className="step-top">
                  <div className="step-number">0{step.id}</div>
                  <div className="step-icon">{step.icon}</div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hiw-visual-flow">
        <div className="hiw-container flow-content">
          <div className="flow-text">
            <span className="hiw-section-kicker">From Idea to Itinerary</span>
            <h2>From Idea to Smart Plan</h2>
            <p>
              TripPlanner helps you move from a rough travel intention to a polished itinerary with better pacing, clearer tradeoffs, and a flow that feels closer to a real travel product than a generic form.
            </p>

            <div className="benefits-list">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="benefit-row">
                  <div className="benefit-icon">{benefit.icon}</div>
                  <div className="benefit-copy">
                    <strong>{benefit.title}</strong>
                    <span>{benefit.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flow-graphic">
            <div className="workflow-shell">
              {WORKFLOW.map((item, index) => (
                <div key={item.title} className={`workflow-card workflow-${item.tone}`}>
                  <div className="workflow-index">0{index + 1}</div>
                  <div className="workflow-copy">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </div>
                </div>
              ))}
              <div className="workflow-track" />
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-guide-flow">
        <div className="hiw-container">
          <div className="hiw-section-head hiw-section-head-left">
            <span className="hiw-section-kicker">Execution Layer</span>
            <h2>From Plan to Real Experience</h2>
            <p>
              Once the itinerary is ready, the product continues into guide booking so users can move from a smart plan to a real, supported trip.
            </p>
          </div>

          <div className="guide-flow-layout">
            <div className="guide-flow-copy">
              <div className="guide-benefit-list">
                <div className="guide-benefit-row">
                  <div className="guide-benefit-icon"><UserRoundSearch size={18} /></div>
                  <div>
                    <strong>Browse available guides by trip date</strong>
                    <span>Only relevant, requestable guides should appear for the user’s selected schedule.</span>
                  </div>
                </div>
                <div className="guide-benefit-row">
                  <div className="guide-benefit-icon"><ShieldCheck size={18} /></div>
                  <div>
                    <strong>See clear availability signals</strong>
                    <span>Availability badges help users understand which guide options are live, booked, or not requestable.</span>
                  </div>
                </div>
                <div className="guide-benefit-row">
                  <div className="guide-benefit-icon"><BadgeCheck size={18} /></div>
                  <div>
                    <strong>Request, confirm, and prepare to travel</strong>
                    <span>The guide accepts the request and the trip becomes a real booked experience, not just a saved plan.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="guide-flow-diagram">
              <div className="guide-flow-track" />
              {GUIDE_FLOW.map((item, index) => (
                <div key={item.title} className="guide-flow-card">
                  <div className="guide-flow-index">0{index + 1}</div>
                  <div className="guide-flow-card-copy">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                    <em>{item.meta}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="hiw-cta">
        <div className="hiw-container hiw-cta-shell">
          <div className="hiw-cta-copy">
            <span className="hiw-section-kicker">Start Planning</span>
            <h2>Build a trip that moves from smart planning to real travel support</h2>
            <p>Create your personalized Nepal itinerary, match with the right local guide, and move from planning mode to confirmed trip execution.</p>
          </div>
          <Link to="/plan-trip" className="btn-primary-large">
            Plan Your Trip &amp; Book a Guide →
          </Link>
        </div>
      </section>
    </div>
  );
}
