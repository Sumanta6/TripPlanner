import React, { useState } from "react";
import "./ContactUs.css";

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Form submitted:", formData);
        alert("Thank you for your message! We will get back to you soon.");
        setFormData({
            name: "",
            email: "",
            phone: "",
            message: "",
        });
    };

    return (
        <div className="contact-page">
            {/* HERO SECTION */}
            <section className="contact-hero">
                <div className="contact-hero-bg" style={{ backgroundImage: "url('/images/hero-pokhara.jpg')" }}></div>
                <div className="contact-hero-overlay"></div>
                <div className="contact-hero-content">
                    <h1>We’d Love to Hear From You</h1>
                    <p>Start your journey to the Himalayas with us today.</p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="contact-container">
                <div className="contact-grid">
                    {/* LEFT COLUMN: FORM */}
                    <div className="contact-form-section">
                        <h2>Send Us a Message</h2>
                        <p>Fill out the form below and our travel experts will reach out.</p>
                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="message">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="5"
                                    required
                                ></textarea>
                            </div>

                            <button type="submit" className="btn-submit">
                                Send Message
                            </button>
                        </form>
                    </div>

                    {/* RIGHT COLUMN: INFO CARDS */}
                    <div className="contact-info-section">
                        <div className="info-card">
                            <div className="icon-box">📞</div>
                            <h3>Call Us</h3>
                            <p>+977 9843094985</p>
                        </div>

                        <div className="info-card">
                            <div className="icon-box">✉️</div>
                            <h3>Email Us</h3>
                            <p>sumantagautamm@gmail.com</p>
                        </div>
                    </div>
                </div>

                {/* FAQ PREVIEW */}
                <div className="faq-preview">
                    <h2>Frequently Asked Questions</h2>
                    <div className="faq-grid">
                        <div className="faq-item">
                            <h4>Do I need a visa for Nepal?</h4>
                            <p>Yes, most travelers can get a visa on arrival at Tribhuvan International Airport.</p>
                        </div>
                        <div className="faq-item">
                            <h4>What is the best time to visit?</h4>
                            <p>Spring (March-May) and Autumn (September-November) are ideal for trekking and sightseeing.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Is it safe to travel alone?</h4>
                            <p>Nepal is considered very safe, but we recommend our guided tours for the best experience.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
