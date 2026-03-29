import { useNavigate } from "react-router-dom";

import { DestinationCard } from "../features/destinations/DestinationCard";
import { DestinationDetailModal } from "../features/destinations/DestinationDetailModal";
import { DestinationFilters } from "../features/destinations/DestinationFilters";
import { DestinationHero } from "../features/destinations/DestinationHero";
import { DestinationSkeletons } from "../features/destinations/DestinationSkeletons";
import { DestinationState } from "../features/destinations/DestinationState";
import { useDestinationExplorer } from "../features/destinations/useDestinationExplorer";
import "./Destinations.css";
export default function Destinations() {
  const navigate = useNavigate();
  const {
    filters,
    destinations,
    loading,
    loadingMore,
    hasNext,
    error,
    hasActiveFilters,
    selectedDestination,
    detailLoading,
    detailError,
    updateFilter,
    resetFilters,
    retry,
    loadMore,
    openDestination,
    closeDestination,
  } = useDestinationExplorer();

  function handlePlan(dest) {
    navigate("/plan-trip", {
      state: {
        destination: dest.name,
        district: dest.district,
        province: dest.province,
      },
    });
  }

  return (
    <div className="destination-page">
      <DestinationHero />

      <div className="destination-shell">
        <DestinationFilters
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <section className="destination-results">
          <div className="destination-section-heading">
            <div>
              <span className="destination-kicker">Destinations</span>
              <h2>Browse places worth building a trip around</h2>
            </div>
          </div>

        {loading && (
          <DestinationSkeletons count={6} />
        )}

        {!loading && error && (
          <DestinationState
            role="alert"
            title="Destination feed unavailable"
            body={error}
            actionLabel="Try again"
            onAction={retry}
          />
        )}

        {!loading && !error && destinations.length === 0 && (
          <DestinationState
            title="No destinations match this view"
            body="Try widening the region, switching the sort, or searching with a shorter keyword."
            actionLabel="Clear filters"
            onAction={resetFilters}
          />
        )}

        {!loading && !error && destinations.length > 0 && (
          <>
            <div className="destination-grid" aria-label="Destinations list">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.geoname_id}
                  destination={destination}
                  onOpen={openDestination}
                  onPlan={handlePlan}
                />
              ))}
            </div>

            {hasNext && (
              <div className="destination-results__footer">
                <button
                  type="button"
                  className="destination-btn destination-btn--secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading more…" : "Load more destinations"}
                </button>
              </div>
            )}
          </>
        )}
        </section>
      </div>

      <DestinationDetailModal
        open={Boolean(selectedDestination || detailLoading || detailError)}
        destination={selectedDestination}
        loading={detailLoading}
        error={detailError}
        onClose={closeDestination}
        onPlan={handlePlan}
      />
    </div>
  );
}
