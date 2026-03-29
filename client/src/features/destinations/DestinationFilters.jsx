import { CATEGORY_OPTIONS, REGION_OPTIONS, SORT_OPTIONS } from "./constants";

export function DestinationFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
}) {
  return (
    <section className="destination-controls" aria-label="Destination filters">
      <div className="destination-controls__bar">
        <label className="destination-field destination-field--search" htmlFor="destination-search">
          <span>Search</span>
          <input
            id="destination-search"
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Search destination, district, or region"
          />
        </label>

        <label className="destination-field" htmlFor="destination-category">
          <span>Category</span>
          <select
            id="destination-category"
            value={filters.category}
            onChange={(event) => onFilterChange("category", event.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="destination-field" htmlFor="destination-region">
          <span>Region</span>
          <select
            id="destination-region"
            value={filters.region}
            onChange={(event) => onFilterChange("region", event.target.value)}
          >
            {REGION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="destination-field" htmlFor="destination-sort">
          <span>Sort</span>
          <select
            id="destination-sort"
            value={filters.sort}
            onChange={(event) => onFilterChange("sort", event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="destination-reset"
          onClick={onReset}
          disabled={!hasActiveFilters}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
