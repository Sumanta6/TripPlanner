import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import "./Destinations.css";

const destinationsData = [
  {
    id: "kathmandu",
    name: "Kathmandu Valley",
    region: "Central Nepal",
    rating: 4.8,
    price: 25000,
    description: "Cultural heart of Nepal with temples and heritage.",
  },
  {
    id: "pokhara",
    name: "Pokhara",
    region: "Western Nepal",
    rating: 4.9,
    price: 30000,
    description: "Lakeside city with mountain views and adventure.",
  },
  {
    id: "chitwan",
    name: "Chitwan National Park",
    region: "Southern Nepal",
    rating: 4.7,
    price: 28000,
    description: "Wildlife safaris and jungle experience.",
  },
];

function Destinations() {
  const [search, setSearch] = useState("");

  const filtered = destinationsData.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <section className="dest-hero">
        <h1>Explore Destinations</h1>
        <input
          className="search-input"
          placeholder="Search destinations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section className="dest-grid">
        {filtered.map((d) => (
          <Link
            key={d.id}
            to={`/destinations/${d.id}`}
            className="dest-card"
          >
            <div className="img-placeholder">Image</div>
            <div className="card-body">
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              <span>⭐ {d.rating}</span>
              <div className="price">
                from NPR {d.price.toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </Layout>
  );
}

export default Destinations;
