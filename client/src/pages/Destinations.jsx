import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Destinations.css";

const ALL_DESTINATIONS = [
  {
    id: 1,
    name: "Mount Everest Base Camp",
    category: "Adventure",
    image: "/images/hero-everest.jpg",
    desc: "Trek to the foot of the world's highest peak. A challenging yet rewarding journey through the Khumbu region.",
  },
  {
    id: 2,
    name: "Pokhara",
    category: "Relaxation",
    image: "/images/hero-pokhara.jpg",
    desc: "The city of lakes, offering paragliding, boating, and stunning views of the Annapurna range.",
  },
  {
    id: 3,
    name: "Kathmandu Valley",
    category: "Culture",
    image: "/images/dest-temple.jpg",
    desc: "The cultural heart of Nepal, filled with ancient temples, palaces, and vibrant street life.",
  },
  {
    id: 4,
    name: "Chitwan National Park",
    category: "Nature",
    image: "/images/dest-adventure.jpg",
    desc: "Home to the one-horned rhino and Bengal tiger. Experience jungle safaris and canoe rides.",
  },
  {
    id: 5,
    name: "Lumbini",
    category: "Culture",
    image: "/images/hero-stupa.jpg",
    desc: "The birthplace of Lord Buddha, a UNESCO World Heritage site and a place of peace and meditation.",
  },
  {
    id: 6,
    name: "Annapurna Circuit",
    category: "Adventure",
    image: "/images/dest-everest.jpg", // Using available fallback
    desc: "One of the world's most beautiful treks, circling the Annapurna massif with diverse landscapes.",
  },
  {
    id: 7,
    name: "Bhaktapur",
    category: "Culture",
    image: "/images/dest-culture.jpg",
    desc: "A living museum of medieval art and architecture, known for its pottery and woodcarving.",
  },
  {
    id: 8,
    name: "Patan (Lalitpur)",
    category: "Culture",
    image: "/images/dest-temple.jpg", // Using available fallback
    desc: "Known for its fine arts and skilled metal craftsmen, featuring the stunning Patan Durbar Square.",
  },
  {
    id: 9,
    name: "Phewa Lake",
    category: "Relaxation",
    image: "/images/hero-pokhara.jpg", // Using available fallback
    desc: "A semi-natural freshwater lake in Pokhara, perfect for boating and enjoying the reflection of Machhapuchhre.",
  },
  {
    id: 10,
    name: "Mustang",
    category: "Adventure",
    image: "/images/dest-mustang.jpg", // Needs fallback or check if exists
    desc: "An isolated region of the Himalayas, offering a unique desert-like landscape and rich Tibetan culture.",
  },
];

const FILTERS = ["All", "Adventure", "Culture", "Nature", "Relaxation"];

function Destinations() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDestinations, setFilteredDestinations] = useState(ALL_DESTINATIONS);

  useEffect(() => {
    let result = ALL_DESTINATIONS;

    // Apply Category Filter
    if (activeFilter !== "All") {
      result = result.filter((dest) => dest.category === activeFilter);
    }

    // Apply Search Filter
    if (searchTerm) {
      result = result.filter((dest) =>
        dest.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDestinations(result);
  }, [activeFilter, searchTerm]);

  return (
    <div className="destinations-page lp-root">
      {/* HERO SECTION (Using Landing Page Styles) */}
      <section className="dest-hero lp-hero" style={{ minHeight: '500px' }}>
        <div
          className="lp-hero-bg fade-in"
          style={{ backgroundImage: "url('/images/hero-everest.jpg')" }}
        />
        <div className="lp-hero-overlay"></div>
        <div className="lp-hero-content pt-nav">
          <div className="lp-hero-badge">Destinations</div>
          <h1 className="lp-hero-title">
            Explore the Wonders <br />
            <span className="hero-highlight">of Nepal</span>
          </h1>
          <p className="lp-hero-sub mx-auto">
            From the Majestic Himalayas to Cultural Cities, find your perfect getaway.
          </p>
        </div>
      </section>

      {/* FILTER & SEARCH SECTION */}
      <section className="dest-filter-section">
        <div className="dest-filter-container">
          <div className="dest-category-filters">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`dest-filter-btn ${activeFilter === filter ? "active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="dest-search-wrapper">
            <span className="dest-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search destinations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* DESTINATIONS GRID */}
      <section className="lp-section bg-light" style={{ minHeight: '600px', paddingTop: '60px' }}>
        {filteredDestinations.length > 0 ? (
          <div className="lp-dest-grid" style={{ marginTop: '0' }}>
            {filteredDestinations.map((dest) => (
              <Link to={`/destinations/${dest.id}`} key={dest.id} className="lp-dest-card">
                <div className="dest-img-wrap">
                  <div
                    className="dest-img"
                    style={{ backgroundImage: `url(${dest.image})` }}
                  ></div>
                  <div className="dest-img-overlay" style={{ background: 'transparent', padding: '16px' }}>
                    <span className="dest-category-badge">{dest.category}</span>
                  </div>
                </div>
                <div className="dest-card-body">
                  <h3>{dest.name}</h3>
                  <p>{dest.desc}</p>
                  <button className="dest-explore-btn mt-auto">
                    View Details <span className="btn-icon">→</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dest-no-results text-center">
            <h3>No destinations found matching your criteria.</h3>
            <button
              className="lp-btn-primary mt-6"
              onClick={() => {
                setActiveFilter("All");
                setSearchTerm("");
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default Destinations;
