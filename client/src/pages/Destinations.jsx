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
    image: "/images/dest-everest.jpg",
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
    image: "/images/dest-patan.jpg",
    desc: "Known for its fine arts and skilled metal craftsmen, featuring the stunning Patan Durbar Square.",
  },
  {
    id: 9,
    name: "Phewa Lake",
    category: "Relaxation",
    image: "/images/dest-phewa.jpg",
    desc: "A semi-natural freshwater lake in Pokhara, perfect for boating and enjoying the reflection of Machhapuchhre.",
  },
  {
    id: 10,
    name: "Mustang",
    category: "Adventure",
    image: "/images/dest-mustang.jpg",
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
    <div className="destinations-page">
      {/* HERO SECTION */}
      <section
        className="destinations-hero"
        style={{ backgroundImage: "url('/images/hero-everest.jpg')" }}
      >
        <div className="dest-hero-overlay"></div>
        <div className="dest-hero-content">
          <h1>Explore the Wonders of Nepal</h1>
          <p>From the Majestic Himalayas to Cultural Cities</p>
        </div>
      </section>

      {/* FILTER & SEARCH SECTION */}
      <section className="filter-section">
        <div className="filter-container">
          <div className="category-filters">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
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
      <section className="destinations-grid-section">
        {filteredDestinations.length > 0 ? (
          <div className="destinations-grid-container">
            {filteredDestinations.map((dest) => (
              <div key={dest.id} className="dest-card">
                <div
                  className="dest-card-image"
                  style={{ backgroundImage: `url(${dest.image})` }}
                >
                  <span className="category-badge">{dest.category}</span>
                </div>
                <div className="dest-card-content">
                  <h3>{dest.name}</h3>
                  <p>{dest.desc}</p>
                  <Link to="/plan-trip" className="view-itinerary-btn">
                    Plan Trip
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <h3>No destinations found matching your criteria.</h3>
            <button
              className="clear-filters-btn"
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
