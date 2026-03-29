import { useEffect, useMemo, useState } from "react";

import { getDestinationDetail, getDestinations } from "../../services/api";
import { PAGE_SIZE } from "./constants";
import { useDebouncedValue } from "./useDebouncedValue";

const DEFAULT_FILTERS = {
  search: "",
  category: "all",
  region: "all",
  sort: "recommended",
};

export function useDestinationExplorer() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [destinations, setDestinations] = useState([]);
  const [featuredDestinations, setFeaturedDestinations] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const debouncedSearch = useDebouncedValue(filters.search);

  useEffect(() => {
    let isActive = true;

    async function loadDestinations() {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: 1,
          page_size: PAGE_SIZE,
          sort: filters.sort,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filters.category !== "all") params.category = filters.category;
        if (filters.region !== "all") params.region = filters.region;

        const response = await getDestinations(params);
        if (!isActive) return;

        const results = response.results || [];
        setDestinations(results);
        setCount(response.count || 0);
        setHasNext(Boolean(response.has_next));
        setPage(1);
        setFeaturedDestinations(results.filter((item) => item.featured).slice(0, 3));
      } catch (requestError) {
        if (!isActive) return;
        setDestinations([]);
        setCount(0);
        setHasNext(false);
        setFeaturedDestinations([]);
        setError(
          requestError.response?.data?.error ||
            requestError.message ||
            "We could not load destinations right now."
        );
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadDestinations();

    return () => {
      isActive = false;
    };
  }, [debouncedSearch, filters.category, filters.region, filters.sort, refreshKey]);

  async function loadMore() {
    if (!hasNext || loadingMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = {
        page: nextPage,
        page_size: PAGE_SIZE,
        sort: filters.sort,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.category !== "all") params.category = filters.category;
      if (filters.region !== "all") params.region = filters.region;

      const response = await getDestinations(params);
      setDestinations((current) => [...current, ...(response.results || [])]);
      setHasNext(Boolean(response.has_next));
      setPage(nextPage);
      setCount(response.count || count);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          "We could not load more destinations."
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function openDestination(destinationId) {
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await getDestinationDetail(destinationId);
      setSelectedDestination(response);
    } catch (requestError) {
      setDetailError(
        requestError.response?.data?.error ||
          requestError.message ||
          "We could not load destination details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDestination() {
    setSelectedDestination(null);
    setDetailError("");
    setDetailLoading(false);
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function retry() {
    setRefreshKey((current) => current + 1);
  }

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.search.trim() ||
        filters.category !== "all" ||
        filters.region !== "all" ||
        filters.sort !== "recommended"
    );
  }, [filters]);

  return {
    filters,
    destinations,
    featuredDestinations,
    count,
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
  };
}
