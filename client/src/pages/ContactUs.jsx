import React, { useState } from "react";
import "./ContactUs.css";

const SuccessModal = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;
    const isSuccess = type === "success";
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-icon">{isSuccess ? "✅" : "⚠️"}</div>
                <h2>{isSuccess ? "Message Received" : "Something went wrong"}</h2>
                <p>{message}</p>
                <button
                    className={`btn-modal-close ${!isSuccess ? 'error-btn' : ''}`}
                    onClick={onClose}
                >
                    {isSuccess ? "thanks!" : "Try Again"}
                </button>
            </div>
        </div>
    );
};

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    });

    const [uiState, setUiState] = useState({
        loading: false,
        fieldErrors: {}, // Store errors for specific fields
        modal: {
            isOpen: false,
            type: "success",
            message: ""
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for field when user starts typing
        if (uiState.fieldErrors[name]) {
            setUiState(prev => ({
                ...prev,
                fieldErrors: { ...prev.fieldErrors, [name]: null }
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Full name is required.";
        if (!formData.email.trim()) {
            errors.email = "Email address is required.";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                errors.email = "Please enter a valid email address.";
            }
        }
        if (!formData.message.trim()) {
            errors.message = "Message cannot be empty.";
        } else if (formData.message.trim().length < 10) {
            errors.message = "Message must be at least 10 characters long.";
        }

        return Object.keys(errors).length > 0 ? errors : null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm();
        if (errors) {
            setUiState({
                ...uiState,
                fieldErrors: errors,
                modal: {
                    isOpen: true,
                    type: "error",
                    message: "Please fix the highlighted errors before submitting."
                }
            });
            return;
        }

        setUiState({ ...uiState, loading: true, fieldErrors: {} });

        try {
            const dataToSend = {
                ...formData,
                subject: "General Inquiry"
            };

            const response = await fetch("http://localhost:8000/api/contact/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSend),
            });

            if (response.ok) {
                setUiState({
                    loading: false,
                    fieldErrors: {},
                    modal: {
                        isOpen: true,
                        type: "success",
                        message: "✅ Message received successfully! Our team will respond via email within 24 hours."
                    }
                });
                setFormData({ name: "", email: "", phone: "", message: "" });
            } else {
                const data = await response.json().catch(() => ({}));
                setUiState({
                    loading: false,
                    fieldErrors: data, // Could contain specific field errors from Django
                    modal: {
                        isOpen: true,
                        type: "error",
                        message: "Failed to send message. Please check the fields below."
                    }
                });
            }
        } catch (err) {
            setUiState({
                loading: false,
                fieldErrors: {},
                modal: {
                    isOpen: true,
                    type: "error",
                    message: "Network error. Please ensure the server is running."
                }
            });
        }
    };

    return (
        <div className="contact-page">
            <SuccessModal
                isOpen={uiState.modal.isOpen}
                type={uiState.modal.type}
                message={uiState.modal.message}
                onClose={() => setUiState({ ...uiState, modal: { ...uiState.modal, isOpen: false } })}
            />

            <section className="contact-hero">
                <div className="contact-hero-overlay"></div>
                <div className="contact-hero-content">
                    <h1>Get in Touch</h1>
                    <p>Plan your Himalayan adventure with our expert team. We're here to help you every step of the way.</p>
                </div>
            </section>

            <div className="contact-outer-container">
                <div className="contact-inner-grid">
                    <div className="contact-form-section">
                        <div className="form-head">
                            <h2>Send us a message</h2>
                            <p>Fill out the form below and our team will get back to you shortly.</p>
                        </div>

                        <form className="refined-contact-form" onSubmit={handleSubmit}>
                            <div className={`input-field ${uiState.fieldErrors.name ? 'has-error' : ''}`}>
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder=""
                                    value={formData.name}
                                    onChange={handleChange}
                                    autoFocus
                                    className={uiState.fieldErrors.name ? 'error-input' : ''}
                                />
                                {uiState.fieldErrors.name && <span className="error-text">{uiState.fieldErrors.name}</span>}
                            </div>

                            <div className="input-row">
                                <div className={`input-field ${uiState.fieldErrors.email ? 'has-error' : ''}`}>
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder=""
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={uiState.fieldErrors.email ? 'error-input' : ''}
                                    />
                                    {uiState.fieldErrors.email && <span className="error-text">{uiState.fieldErrors.email}</span>}
                                </div>
                                <div className="input-field">
                                    <label>Phone Number (Optional)</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder=""
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className={`input-field ${uiState.fieldErrors.message ? 'has-error' : ''}`}>
                                <label>Message *</label>
                                <textarea
                                    name="message"
                                    placeholder="Tell us about your travel plans..."
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="6"
                                    className={uiState.fieldErrors.message ? 'error-input' : ''}
                                ></textarea>
                                {uiState.fieldErrors.message && <span className="error-text">{uiState.fieldErrors.message}</span>}
                            </div>

                            <button type="submit" className="btn-contact-submit" disabled={uiState.loading}>
                                {uiState.loading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        Sending...
                                    </>
                                ) : "Send Message"}
                            </button>
                        </form>
                    </div>

                    <div className="contact-sidebar">
                        <div className="sidebar-card">
                            <h3>Digital Support</h3>
                            <p>TripPlanner is an AI-driven online platform. We prioritize fast, secure email communication to give you the best experience.</p>

                            <div className="contact-details">
                                <div className="detail-item">
                                    <span className="detail-icon">✉️</span>
                                    <div>
                                        <strong>Email</strong>
                                        <p>sumantagautamm@gmail.com</p>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">📞</span>
                                    <div>
                                        <strong>Phone</strong>
                                        <p>+977 9843094985</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
