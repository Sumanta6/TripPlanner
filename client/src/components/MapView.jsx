import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.324, zoom: 11 };

// Leaflet needs the icon URLs wired up when used inside a bundler.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function MapView({
  lat = DEFAULT_CENTER.lat,
  lng = DEFAULT_CENTER.lng,
  zoom = DEFAULT_CENTER.zoom,
  title = "Kathmandu, Nepal",
  className = "",
  scrollWheelZoom = false,
  doubleClickZoom = false,
  dragging = true,
  touchZoom = true,
  zoomControl = true,
  keyboard = false
}) {
  const position = [lat, lng];

  return (
    <div className={`map-card ${className}`.trim()}>
      <MapContainer
        className="map-card__container"
        center={position}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        doubleClickZoom={doubleClickZoom}
        dragging={dragging}
        touchZoom={touchZoom}
        zoomControl={zoomControl}
        keyboard={keyboard}
        aria-label={title}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="Map data © OpenStreetMap contributors"
        />
        <Marker position={position} keyboard={false} autoPanOnFocus={false}>
          <Popup autoPan={false}>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;
