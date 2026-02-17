import React from "react";
import { Link } from "react-router-dom";
import "./HowItWorks.css";

// STEPS DATA
const PROCES_STEPS = [
    {
        id: 1,
        title: "Choose Destination & Dates",
        description: "Tell us where you want to go and when. Whether it's the Everest Base Camp or a city tour in Kathmandu.",
        icon: "📅",
    },
    {
        id: 2,
        title: "Enter Budget & Preferences",
        description: "Set your budget range and travel style (Adventure, Culture, Luxury, etc.) so we can tailor the experience.",
        icon: "💰",
    },
    {
        id: 3,
        title: "AI Generates Smart Itinerary",
        description: "Our advanced AI analyzes thousands of options to create the perfect day-by-day plan just for you.",
        icon: "🤖",
    },
    {
        id: 4,
        title: "Review & Customize Plan",
        description: "Review your itinerary, make adjustments if needed, and finalize your dream trip to Nepal.",
        icon: "✨",
    },
];

export default function HowItWorks() {
    return (
        <div className="hiw-page">
            {/* HERO SECTION */}
            <section className="hiw-hero">
                <div className="hiw-hero-content">
                    <h1>How TripPlanner Works</h1>
                    <p>Your dream trip to Nepal, planned in minutes with the power of AI.</p>
                </div>
            </section>

            {/* PROCESS STEPS */}
            <section className="hiw-process">
                <div className="hiw-container">
                    <div className="steps-grid">
                        {PROCES_STEPS.map((step) => (
                            <div key={step.id} className="step-card">
                                <div className="step-number">{step.id}</div>
                                <div className="step-icon">{step.icon}</div>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VISUAL FLOW / INFO SECTION */}
            <section className="hiw-visual-flow">
                <div className="hiw-container flow-content">
                    <div className="flow-text">
                        <h2>From Idea to Itinerary</h2>
                        <p>
                            Forget spending hours researching hotels, routes, and activities.
                            Our smart algorithms handle the logistics so you can focus on the excitement
                            of your upcoming adventure.
                        </p>
                        <ul className="benefits-list">
                            <li>✅ Save hours of planning time</li>
                            <li>✅ Get hidden gem recommendations</li>
                            <li>✅ Optimize your travel budget</li>
                            <li>✅ 24/7 Access to your details</li>
                        </ul>
                    </div>
                    <div className="flow-graphic">
                        {/* Simple CSS representation of flow */}
                        <div className="flow-box input-box">USER INPUT</div>
                        <div className="flow-arrow">⬇</div>
                        <div className="flow-box ai-box">AI PROCESSING</div>
                        <div className="flow-arrow">⬇</div>
                        <div className="flow-box output-box">ITINERARY</div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="hiw-cta">
                <div className="hiw-container">
                    <h2>Ready to Start Your Journey?</h2>
                    <p>Create your personalized Nepal itinerary today.</p>
                    <Link to="/plan-trip" className="btn-primary-large">
                        Start Planning Now
                    </Link>
                </div>
            </section>
        </div>
    );
}
