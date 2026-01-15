import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "./DestinationDetails.css";

const destinationsData = [
  {
    id: "kathmandu",
    name: "Kathmandu Valley",
    region: "Central Nepal",
    rating: 4.8,
    price: 25000,
    description:
      "Kathmandu Valley is the cultural and historical heart of Nepal.",
    highlights: ["Pashupatinath", "Boudhanath", "Durbar Square"],
  },
  {
    id: "pokhara",
    name: "Pokhara",
    region: "Western Nepal",
    rating: 4.9,
    price: 30000,
    description:
      "Pokhara offers lakes, mountains, and adventure activities.",
    highlights: ["Phewa Lake", "Sarangkot", "Davis Falls"],
  },
];

function DestinationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const destination = destinationsData.find((d) => d.id === id);

  if (!destination) {
    return (
      <Layout>
        <p style={{ padding: "40px" }}>Destination not found</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="details-container">
        <h1>{destination.name}</h1>
        <p>{destination.description}</p>

        <p>⭐ {destination.rating}</p>
        <p>From NPR {destination.price.toLocaleString()}</p>

        <h3>Highlights</h3>
        <ul>
          {destination.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <button
          className="primary"
          onClick={() =>
            navigate("/plantrip", {
              state: { destination: destination.name },
            })
          }
        >
          Plan Trip
        </button>
      </div>
    </Layout>
  );
}

export default DestinationDetails;
