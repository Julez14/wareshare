"use client";

import SearchBar from "@/components/listings/SearchBar";
import Sort from "@/components/listings/Sort";
import { useListingsStore } from "@/stores/listings";
import { Filter } from "lucide-react";

export default function TopBar() {
  const city = useListingsStore((s) => s.city);
  const setCity = useListingsStore((s) => s.setCity);
  const isFiltersOpen = useListingsStore((s) => s.isFiltersOpen);
  const toggleSidebar = useListingsStore((s) => s.toggleFilters);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <SearchBar
          value={city}
          onChange={setCity}
          placeholder="Search by city"
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
        <Sort />
        <button
          type="button"
          onClick={toggleSidebar}
          className="border-input bg-background hover:bg-muted inline-flex h-9 shrink-0 items-center rounded-md border px-2.5 py-2 text-sm font-medium shadow-sm transition"
        >
          <Filter className="mr-1 size-4 shrink-0" />
          <span className="whitespace-nowrap">
            {isFiltersOpen ? "Hide filters" : "Filters"}
          </span>
        </button>
      </div>
    </div>
  );
}
