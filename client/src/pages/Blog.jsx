import React, { useState } from "react";
import "./Blog.css";

// MOCK DATA
const BLOG_POSTS = [
    {
        id: 1,
        title: "Conquering Everest Base Camp: A Beginner's Guide",
        excerpt: "Everything you need to know before embarking on the trek of a lifetime. From gear to altitude sickness.",
        image: "/images/dest-everest.jpg", // Reusing existing image
        category: "Trekking",
        author: "Pasang Sherpa",
        date: "Oct 12, 2025",
    },
    {
        id: 2,
        title: "Top 5 Hidden Temples in Kathmandu Valley",
        excerpt: "Discover the spiritual gems tucked away in the narrow alleys of Patan and gentle hills of Bhaktapur.",
        image: "/images/dest-temple.jpg",
        category: "Culture",
        author: "Sita Sharma",
        date: "Nov 05, 2025",
    },
    {
        id: 3,
        title: "A Foodie’s Tour of Nepal: Momos, Dal Bhat & More",
        excerpt: "Dive into the flavors of the Himalayas. We explore the best local eateries and street food spots.",
        image: "/images/dest-culture.jpg",
        category: "Food",
        author: "Ramesh Thapa",
        date: "Dec 20, 2025",
    },
    {
        id: 4,
        title: "Pokhara: The Adventure Capital of Nepal",
        excerpt: "Paragliding, zip-lining, and boating—why Pokhara is the ultimate destination for thrill-seekers.",
        image: "/images/hero-pokhara.jpg",
        category: "Adventure",
        author: "Aditi Gurung",
        date: "Jan 15, 2026",
    },
    {
        id: 5,
        title: "Best Time to Visit Nepal for Clear Mountain Views",
        excerpt: "Planning your trip? Learn about the seasons and when to catch the most breathtaking panoramas.",
        image: "/images/hero-everest.jpg",
        category: "Travel Tips",
        author: "TripPlanner Team",
        date: "Feb 01, 2026",
    },
    {
        id: 6,
        title: "Wildlife Safari in Chitwan: Meeting the One-Horned Rhino",
        excerpt: "An unforgettable journey into the jungle. Spotting rare wildlife in their natural habitat.",
        image: "/images/dest-adventure.jpg",
        category: "Adventure",
        author: "Bikash Rai",
        date: "Feb 10, 2026",
    },
];

const CATEGORIES = ["All", "Adventure", "Culture", "Trekking", "Food", "Travel Tips"];

export default function Blog() {
    const [activeCategory, setActiveCategory] = useState("All");

    const filteredPosts =
        activeCategory === "All"
            ? BLOG_POSTS
            : BLOG_POSTS.filter((post) => post.category === activeCategory);

    return (
        <div className="blog-page">
            {/* HERO SECTION */}
            <section className="blog-hero">
                <div className="blog-hero-bg" style={{ backgroundImage: "url('/images/hero-stupa.jpg')" }}></div>
                <div className="blog-hero-overlay"></div>
                <div className="blog-hero-content">
                    <h1>Travel Stories & Nepal Guides</h1>
                    <p>Inspiration, tips, and tales from the roof of the world.</p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="blog-container">
                {/* FILTERS */}
                <div className="blog-filters">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`filter-btn ${activeCategory === cat ? "active" : ""}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* BLOG GRID */}
                <div className="blog-grid">
                    {filteredPosts.map((post) => (
                        <article key={post.id} className="blog-card">
                            <div
                                className="blog-card-image"
                                style={{ backgroundImage: `url(${post.image})` }}
                            >
                                <span className="blog-category">{post.category}</span>
                            </div>
                            <div className="blog-card-content">
                                <div className="blog-meta">
                                    <span>{post.date}</span>
                                    <span>•</span>
                                    <span>{post.author}</span>
                                </div>
                                <h3>{post.title}</h3>
                                <p>{post.excerpt}</p>
                                <button className="read-more-btn">Read More →</button>
                            </div>
                        </article>
                    ))}
                </div>

                {filteredPosts.length === 0 && (
                    <div className="no-posts">
                        <p>No posts found for this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
