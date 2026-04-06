import React, { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.324, zoom: 11 };

function buildMarkerIcon(order, isPrimary) {
  return L.divIcon({
    className: "map-card__marker-wrap",
    html: `
      <div class="map-card__marker ${isPrimary ? "map-card__marker--primary" : ""}">
        <span class="map-card__marker-core">${order}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
}

function FitBounds({ stops }) {
  const map = useMap();

  React.useEffect(() => {
    if (!stops?.length) return;
    if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], map.getZoom());
      return;
    }
    const bounds = L.latLngBounds(stops.map((stop) => [stop.latitude, stop.longitude]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, stops]);

  return null;
}

function MapView({
  lat = DEFAULT_CENTER.lat,
  lng = DEFAULT_CENTER.lng,
  zoom = DEFAULT_CENTER.zoom,
  title = "Kathmandu, Nepal",
  className = "",
  sectionLabel = "Destination Map",
  footerNote = "",
  routeStops = [],
  showRouteLine = false,
  scrollWheelZoom = false,
  doubleClickZoom = false,
  dragging = true,
  touchZoom = true,
  zoomControl = true,
  keyboard = false
}) {
  const normalizedStops = useMemo(() => {
    if (Array.isArray(routeStops) && routeStops.length) {
      return routeStops
        .filter((stop) => stop?.latitude != null && stop?.longitude != null)
        .map((stop) => ({
          ...stop,
          latitude: Number(stop.latitude),
          longitude: Number(stop.longitude)
        }));
    }

    return [{
      order: 1,
      name: title,
      latitude: lat,
      longitude: lng,
      stop_type: "destination"
    }];
  }, [lat, lng, routeStops, title]);

  const polylinePositions = normalizedStops.map((stop) => [stop.latitude, stop.longitude]);
  const initialCenter = normalizedStops[0]
    ? [normalizedStops[0].latitude, normalizedStops[0].longitude]
    : [lat, lng];

  return (
    <div className={`map-card ${className}`.trim()}>
      <div className="map-card__chrome">
        <div className="map-card__eyebrow">{sectionLabel}</div>
        <div className="map-card__heading-row">
          <div>
            <strong className="map-card__title">{title}</strong>
            {footerNote ? <p className="map-card__subtitle">{footerNote}</p> : null}
          </div>
          <div className="map-card__pin-pill">
            <span className="map-card__pin-dot" />
            {normalizedStops.length > 1 ? `${normalizedStops.length} stops` : "Live preview"}
          </div>
        </div>
      </div>

      <div className="map-card__stage">
        <MapContainer
          className="map-card__container"
          center={initialCenter}
          zoom={zoom}
          scrollWheelZoom={scrollWheelZoom}
          doubleClickZoom={doubleClickZoom}
          dragging={dragging}
          touchZoom={touchZoom}
          zoomControl={zoomControl}
          keyboard={keyboard}
          attributionControl={false}
          aria-label={title}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {normalizedStops.length > 1 ? <FitBounds stops={normalizedStops} /> : null}
          {showRouteLine && polylinePositions.length > 1 ? (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: "#1d8a9b",
                weight: 4,
                opacity: 0.82,
                lineCap: "round",
                lineJoin: "round",
                dashArray: "10 8"
              }}
            />
          ) : null}
          {normalizedStops.map((stop, index) => (
            <Marker
              key={`${stop.order}-${stop.name}-${stop.latitude}-${stop.longitude}`}
              position={[stop.latitude, stop.longitude]}
              icon={buildMarkerIcon(stop.order || index + 1, index === 0)}
              keyboard={false}
              autoPanOnFocus={false}
            />
          ))}
        </MapContainer>

        <div className="map-card__depth" />
      </div>

      <div className="map-card__footer">
        <span className="map-card__footer-copy">Map tiles by OpenStreetMap contributors</span>
      </div>
    </div>
  );
}

export default MapView;
