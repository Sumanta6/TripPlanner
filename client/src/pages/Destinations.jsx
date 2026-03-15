import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Destinations.css";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "nature", label: "Nature" },
  { value: "temples", label: "Temples" },
  { value: "museums", label: "Museums" },
  { value: "hotels", label: "Hotels" },
  { value: "sights", label: "Sights" },
];

const PAGE_SIZE = 20;

function Destinations() {
  const [destinations, setDestinations] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  const fetchDestinations = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const params = {
          page: pageNum,
          page_size: PAGE_SIZE,
          category,
        };
        if (searchTerm) params.search = searchTerm;

        const { data } = await api.get("/destinations/", { params });

        if (append) {
          setDestinations((prev) => [...prev, ...(data.results || [])]);
        } else {
          setDestinations(data.results || []);
        }
        setHasNext(data.has_next ?? false);
        setPage(pageNum);
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.message ||
          "Failed to load destinations. Please try again.";
        setError(msg);
        if (!append) setDestinations([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchTerm, category]
  );

  useEffect(() => {
    fetchDestinations(1, false);
  }, [fetchDestinations]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const handleLoadMore = () => {
    fetchDestinations(page + 1, true);
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };

  return (
    <div className="destinations-page lp-root">
      {/* HERO SECTION */}
      <section className="dest-hero lp-hero" style={{ minHeight: "500px" }}>
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
            From the Majestic Himalayas to Cultural Cities, find your perfect
            getaway.
          </p>
        </div>
      </section>

      {/* FILTER & SEARCH SECTION */}
      <section className="dest-filter-section">
        <div className="dest-filter-container">
          <div className="dest-category-filters">
            <select
              className="dest-filter-select"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <form
            className="dest-search-wrapper"
            onSubmit={handleSearch}
          >
            <span className="dest-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search destinations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="dest-search-btn">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* LOADING / ERROR / GRID */}
      <section
        className="lp-section bg-light"
        style={{ minHeight: "600px", paddingTop: "60px" }}
      >
        {loading ? (
          <div className="dest-loading">
            <div className="dest-spinner"></div>
            <p>Loading destinations...</p>
          </div>
        ) : error ? (
          <div className="dest-error">
            <p>{error}</p>
            <button
              className="lp-btn-primary"
              onClick={() => fetchDestinations(1, false)}
            >
              Retry
            </button>
          </div>
        ) : destinations.length > 0 ? (
          <>
            <div className="lp-dest-grid" style={{ marginTop: "0" }}>
              {destinations.map((dest) => (
                <Link
                  to={`/destinations/${dest.id}`}
                  key={dest.id}
                  className="lp-dest-card"
                >
                  <div className="dest-img-wrap">
                    <div
                      className="dest-img"
                      style={{
                        backgroundImage: dest.image_url
                          ? `url(${dest.image_url})`
                          : "url('/images/hero-everest.jpg')",
                      }}
                    ></div>
                    <div
                      className="dest-img-overlay"
                      style={{
                        background: "transparent",
                        padding: "16px",
                      }}
                    >
                      <span className="dest-category-badge">
                        {dest.category || "Sight"}
                      </span>
                    </div>
                  </div>
                  <div className="dest-card-body">
                    <h3>{dest.name}</h3>
                    {dest.location && (
                      <p className="dest-location">{dest.location}</p>
                    )}
                    <p>{dest.description}</p>
                    <button className="dest-explore-btn mt-auto">
                      View Details <span className="btn-icon">→</span>
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            {hasNext && (
              <div className="dest-load-more">
                <button
                  className="lp-btn-primary dest-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <span className="dest-spinner-small"></span> Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="dest-no-results text-center">
            <h3>No destinations found matching your criteria.</h3>
            <button
              className="lp-btn-primary mt-6"
              onClick={() => {
                setCategory("all");
                setSearchInput("");
                setSearchTerm("");
                fetchDestinations(1, false);
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
