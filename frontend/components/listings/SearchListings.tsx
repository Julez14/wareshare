"use client";

import { useShallow } from "zustand/react/shallow";
import { useListings } from "@/hooks/listings/useListings";
import { useListingsStore, getListingsParams } from "@/stores/listings";
import TopBar from "@/components/listings/TopBar";
import Filters from "@/components/listings/Filters";
import ListingCard from "@/components/listings/ListingCard";

export default function SearchListings() {
  const params = useListingsStore(useShallow((s) => getListingsParams(s)));
  const isFiltersOpen = useListingsStore((s) => s.isFiltersOpen);

  const { data, isLoading, isError, error, refetch } = useListings(params);

  const listings = data?.listings ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="bg-muted/30 min-h-screen py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TopBar />

        <div className="lg:flex lg:gap-6">
          <div
            className={`hidden ${isFiltersOpen ? "lg:block lg:w-64 lg:shrink-0" : "lg:hidden"}`}
          >
            <div className="lg:sticky lg:top-4">
              <Filters />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {isFiltersOpen && (
              <div className="mb-4 lg:hidden">
                <Filters />
              </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-muted h-48 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            )}

            {isError && (
              <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-center">
                <p className="text-destructive">
                  {error?.message ?? "Failed to load listings."}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 rounded-md px-4 py-2 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                <p className="text-muted-foreground mb-2 text-sm">
                  {total} {total === 1 ? "warehouse" : "warehouses"} found
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {listings.length === 0 ? (
                    <div className="text-muted-foreground col-span-full py-10 text-center">
                      No listings match your filters.
                    </div>
                  ) : (
                    listings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
