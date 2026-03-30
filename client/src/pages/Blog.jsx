import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock3, Compass, Flame, MapPinned, Mountain, Soup, Sparkles } from "lucide-react";
import "./Blog.css";

const BLOG_POSTS = [
  {
    id: 1,
    title: "Conquering Everest Base Camp: A Beginner's Guide",
    excerpt: "Everything you need to know before embarking on the trek of a lifetime, from gear and pacing to altitude awareness and route timing.",
    image: "/images/dest-everest.jpg",
    category: "Trekking",
    author: "Pasang Sherpa",
    date: "Oct 12, 2025",
    readTime: "8 min read",
    featured: true
  },
  {
    id: 2,
    title: "Top 5 Hidden Temples in Kathmandu Valley",
    excerpt: "Discover spiritual gems tucked into the alleyways of Patan and the quieter corners of Bhaktapur, far from the typical tourist path.",
    image: "/images/dest-temple.jpg",
    category: "Culture",
    author: "Sita Sharma",
    date: "Nov 05, 2025",
    readTime: "5 min read"
  },
  {
    id: 3,
    title: "A Foodie’s Tour of Nepal: Momos, Dal Bhat & More",
    excerpt: "Taste your way through Nepal with a guide to the most comforting classics, vibrant street food, and local must-try stops.",
    image: "/images/dest-culture.jpg",
    category: "Food",
    author: "Ramesh Thapa",
    date: "Dec 20, 2025",
    readTime: "6 min read"
  },
  {
    id: 4,
    title: "Pokhara: The Adventure Capital of Nepal",
    excerpt: "Paragliding, zip-lining, boating, and lakeside downtime all make Pokhara a standout for travelers who want thrill and balance.",
    image: "/images/hero-pokhara.jpg",
    category: "Adventure",
    author: "Aditi Gurung",
    date: "Jan 15, 2026",
    readTime: "4 min read"
  },
  {
    id: 5,
    title: "Best Time to Visit Nepal for Clear Mountain Views",
    excerpt: "Plan around weather, light, crowds, and mountain visibility so your trip lands in the season that matches your goals.",
    image: "/images/hero-everest.jpg",
    category: "Travel Tips",
    author: "TripPlanner Team",
    date: "Feb 01, 2026",
    readTime: "7 min read"
  },
  {
    id: 6,
    title: "Wildlife Safari in Chitwan: Meeting the One-Horned Rhino",
    excerpt: "Step into the jungle for a story-led look at Chitwan, from river safaris and birdlife to quiet moments with rare wildlife.",
    image: "/images/dest-adventure.jpg",
    category: "Adventure",
    author: "Bikash Rai",
    date: "Feb 10, 2026",
    readTime: "5 min read"
  }
];

const CATEGORIES = [
  { id: "All", label: "All Stories", icon: <Sparkles size={15} /> },
  { id: "Adventure", label: "Adventure", icon: <Flame size={15} /> },
  { id: "Culture", label: "Culture", icon: <MapPinned size={15} /> },
  { id: "Trekking", label: "Trekking", icon: <Mountain size={15} /> },
  { id: "Food", label: "Food", icon: <Soup size={15} /> },
  { id: "Travel Tips", label: "Travel Tips", icon: <Compass size={15} /> }
];

const EXPLORE_BLOCKS = [
  {
    title: "Trekking",
    description: "Trails, mountain timing, altitude prep, and route inspiration.",
    tone: "trek"
  },
  {
    title: "Culture",
    description: "Temples, local rituals, living heritage, and valley stories.",
    tone: "culture"
  },
  {
    title: "Food",
    description: "Dishes, neighborhood finds, and what to order first.",
    tone: "food"
  }
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredPosts = useMemo(() => {
    if (activeCategory === "All") return BLOG_POSTS;
    return BLOG_POSTS.filter((post) => post.category === activeCategory);
  }, [activeCategory]);

  const featuredPost = useMemo(() => {
    return BLOG_POSTS.find((post) => post.featured) || BLOG_POSTS[0];
  }, []);

  const trendingPosts = useMemo(() => BLOG_POSTS.slice(1, 5), []);

  return (
    <div className="blog-page">
      <section className="blog-hero">
        <div className="blog-hero-bg" style={{ backgroundImage: "url('/images/hero-stupa.jpg')" }} />
        <div className="blog-hero-overlay" />
        <div className="blog-hero-pattern" />
        <div className="blog-container blog-hero-shell">
          <div className="blog-hero-content">
            <span className="blog-kicker">Insights &amp; Stories</span>
            <h1>Travel Stories &amp; Nepal Guides</h1>
            <p>Editorial inspiration, local knowledge, and smart travel reads for planning Nepal with more confidence and depth.</p>
            <div className="blog-hero-subline">Travel ideas shaped by routes, culture, food, and mountain experiences across Nepal.</div>
            <a href="#latest-stories" className="blog-hero-cta">
              Explore Latest Stories <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <div className="blog-container blog-main">
        <section className="blog-featured">
          <div className="blog-section-head">
            <span className="blog-section-kicker">Featured Story</span>
            <h2>Featured Story of the Week</h2>
          </div>

          <article className="featured-story-card">
            <div className="featured-story-media">
              <img src={featuredPost.image} alt={featuredPost.title} loading="lazy" />
              <div className="featured-story-gradient" />
              <span className="featured-story-badge">{featuredPost.category}</span>
            </div>
            <div className="featured-story-copy">
              <div className="featured-story-meta">
                <span>{featuredPost.date}</span>
                <span>•</span>
                <span>{featuredPost.readTime}</span>
              </div>
              <h3>{featuredPost.title}</h3>
              <p>{featuredPost.excerpt}</p>
              <button className="read-more-btn">Read Featured Story →</button>
            </div>
          </article>
        </section>

        <section className="blog-trending">
          <div className="blog-section-head">
            <span className="blog-section-kicker">Trending</span>
            <h2>Most read this week</h2>
          </div>

          <div className="trending-row">
            {trendingPosts.map((post) => (
              <article key={post.id} className="trending-card">
                <img src={post.image} alt={post.title} loading="lazy" />
                <div className="trending-card-copy">
                  <span className="trending-card-tag">{post.category}</span>
                  <h3>{post.title}</h3>
                  <div className="trending-card-meta">
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="blog-explore">
          <div className="blog-section-head">
            <span className="blog-section-kicker">Explore by Category</span>
            <h2>Follow the stories that match your travel style</h2>
          </div>

          <div className="explore-grid">
            {EXPLORE_BLOCKS.map((block) => (
              <div key={block.title} className={`explore-card explore-${block.tone}`}>
                <strong>{block.title}</strong>
                <span>{block.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="blog-latest" id="latest-stories">
          <div className="blog-section-head blog-section-head-row">
            <div>
              <span className="blog-section-kicker">Latest Collection</span>
              <h2>Curated stories and destination reads</h2>
            </div>

            <div className="blog-filters">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`filter-btn ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="blog-grid">
              {[1, 2, 3].map((item) => (
                <div key={item} className="blog-card blog-card-skeleton animate-pulse">
                  <div className="blog-card-image skeleton-block" />
                  <div className="blog-card-content">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line medium" />
                    <div className="skeleton-line medium" />
                    <div className="skeleton-line long" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="no-posts">
              <div className="no-posts-icon"><Compass size={24} /></div>
              <h3>No stories in this category yet</h3>
              <p>Try another topic to explore more guides, stories, and practical Nepal travel insights.</p>
            </div>
          ) : (
            <div className="blog-grid">
              {filteredPosts.map((post) => (
                <article key={post.id} className="blog-card">
                  <div className="blog-card-image-wrap">
                    <img className="blog-card-image" src={post.image} alt={post.title} loading="lazy" />
                    <div className="blog-card-overlay" />
                    <span className="blog-category">{post.category}</span>
                  </div>

                  <div className="blog-card-content">
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>

                    <div className="blog-meta">
                      <span><Clock3 size={14} /> {post.readTime}</span>
                      <span>{post.date}</span>
                    </div>

                    <button className="read-more-btn">
                      Read More <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
