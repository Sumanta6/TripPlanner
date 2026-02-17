import React, { useState } from "react";
import "./Profile.css";

// MOCK DATA
const USER_DATA = {
    fullName: "Sumanta Clement",
    email: "sumantagautamm@gmail.com",
    phone: "+977 9843094985",
    avatar: "https://ui-avatars.com/api/?name=Sumanta+Clement&background=0D8ABC&color=fff",
    preferences: {
        destinations: ["Everest Region", "Pokhara"],
        budget: "$1,000 - $2,000",
    },
    trips: [
        {
            id: 101,
            title: "Everest Base Camp Trek",
            destination: "Everest Region",
            duration: "14 Days",
            date: "Oct 15, 2025",
            status: "Upcoming",
            image: "/images/hero-everest.jpg"
        },
        {
            id: 102,
            title: "Pokhara Lakeside Retreat",
            destination: "Pokhara",
            duration: "5 Days",
            date: "Nov 20, 2025",
            status: "Planning",
            image: "/images/hero-pokhara.jpg"
        }
    ]
};

export default function Profile() {
    const [user] = useState(USER_DATA);

    return (
        <div className="profile-page">
            <div className="profile-container">
                {/* HEADER SECTION */}
                <header className="profile-header">
                    <div className="profile-avatar">
                        <img src={user.avatar} alt="Profile" />
                    </div>
                    <div className="profile-info">
                        <h1>{user.fullName}</h1>
                        <p>{user.email}</p>
                    </div>
                    <button className="btn-edit-profile">Edit Profile</button>
                </header>

                <div className="profile-grid">
                    {/* LEFT COLUMN: DETAILS & PREFERENCES */}
                    <div className="profile-left">
                        {/* Personal Details */}
                        <section className="profile-card">
                            <h2>Personal Details</h2>
                            <div className="detail-row">
                                <span className="label">Full Name</span>
                                <span className="value">{user.fullName}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Email</span>
                                <span className="value">{user.email}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Phone</span>
                                <span className="value">{user.phone}</span>
                            </div>
                        </section>

                        {/* Preferences */}
                        <section className="profile-card">
                            <h2>Trip Preferences</h2>
                            <div className="detail-row">
                                <span className="label">Favorite Destinations</span>
                                <div className="tags">
                                    {user.preferences.destinations.map(dest => (
                                        <span key={dest} className="tag">{dest}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="detail-row">
                                <span className="label">Budget Range</span>
                                <span className="value">{user.preferences.budget}</span>
                            </div>
                        </section>

                        {/* Account Actions */}
                        <section className="profile-card actions-card">
                            <h2>Account Settings</h2>
                            <button className="btn-action">Change Password</button>
                            <button className="btn-action btn-logout">Logout</button>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: PLANNED TRIPS */}
                    <div className="profile-right">
                        <section className="profile-card full-height">
                            <div className="section-header">
                                <h2>My Planned Trips</h2>
                                <button className="btn-link">View All</button>
                            </div>

                            <div className="trips-list">
                                {user.trips.map(trip => (
                                    <div key={trip.id} className="trip-card">
                                        <div className="trip-image" style={{ backgroundImage: `url(${trip.image})` }}></div>
                                        <div className="trip-details">
                                            <h3>{trip.title}</h3>
                                            <p className="trip-meta">{trip.destination} • {trip.duration}</p>
                                            <div className="trip-footer">
                                                <span className={`status-badge ${trip.status.toLowerCase()}`}>{trip.status}</span>
                                                <button className="btn-view-details">View Details</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
