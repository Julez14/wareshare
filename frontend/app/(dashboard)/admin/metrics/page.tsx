"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/ui/dashboard/StatCard";
import { BookingFunnel, ProgressBarRow } from "@/components/ui/dashboard/MetricsCharts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types matching GET /api/admin/metrics response shape
// ---------------------------------------------------------------------------

type MetricsData = {
  users: {
    total: number;
    by_role: Record<string, number>;
    pending_approval: number;
    new_last_30_days: number;
  };
  listings: {
    total: number;
    by_availability: Record<string, number>;
  };
  bookings: {
    total: number;
    by_status: Record<string, number>;
    confirmed: number;
    in_progress: number;
    confirmation_rate: number;
  };
  revenue: {
    total_contracted_cad: number;
    average_booking_value_cad: number;
  };
  top_cities: Array<{ city: string; province: string; listing_count: number }>;
  demand: {
    avg_rental_duration_days: number | null;
    avg_space_requested_sqft: number | null;
    bookings_by_service_type: { fulfillment: number; storage_only: number };
  };
  vacancy: {
    avg_days_until_first_booking: number | null;
    listings_never_booked: number;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-foreground mb-4 text-base font-semibold">{children}</h2>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-muted animate-pulse rounded-lg border p-5">
      <div className="bg-muted-foreground/20 mb-2 h-3 w-1/2 rounded" />
      <div className="bg-muted-foreground/20 h-8 w-1/3 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MetricsDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
      // TODO: replace with real Clerk token once auth is wired up
      const token = process.env.NEXT_PUBLIC_DEV_TOKEN ?? "";
      const res = await fetch(`${apiUrl}/api/admin/metrics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }
      const json = await res.json() as MetricsData;
      setData(json);
      setLastRefreshed(new Date());
    } catch {
      setError("Could not load metrics. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const byAvailability = data?.listings.by_availability ?? {};
  const listingTotal = data?.listings.total ?? 0;
  const topCityMax = Math.max(1, ...(data?.top_cities.map((c) => c.listing_count) ?? [1]));

  const bookingCancelled =
    (data?.bookings.by_status["cancelled"] ?? 0);
  const bookingRejected =
    (data?.bookings.by_status["rejected"] ?? 0);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Metrics</h1>
          {lastRefreshed && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMetrics}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Users section */}
      <section>
        <SectionHeading>Users</SectionHeading>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Users"
                value={data?.users.total ?? 0}
              />
              <StatCard
                label="Renters"
                value={data?.users.by_role["renter"] ?? 0}
                variant="muted"
              />
              <StatCard
                label="Hosts"
                value={data?.users.by_role["host"] ?? 0}
                variant="muted"
              />
              <StatCard
                label="Pending Approval"
                value={data?.users.pending_approval ?? 0}
                subtext="Tap to review"
                variant={
                  (data?.users.pending_approval ?? 0) > 0 ? "warning" : "default"
                }
                href="/admin?filter=pending"
              />
            </>
          )}
        </div>
        {!loading && data && (
          <p className="text-muted-foreground mt-3 text-sm">
            <span className="text-foreground font-medium">
              {data.users.new_last_30_days}
            </span>{" "}
            new signup{data.users.new_last_30_days !== 1 ? "s" : ""} in the last 30 days
          </p>
        )}
      </section>

      <Separator />

      {/* Bookings + Listings */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Bookings */}
        <section>
          <SectionHeading>Bookings</SectionHeading>
          {loading ? (
            <div className="bg-muted animate-pulse h-48 rounded-lg" />
          ) : data ? (
            <div className="bg-card space-y-5 rounded-lg border p-5">
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="text-foreground text-2xl font-bold tabular-nums">
                    {data.bookings.total}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Confirmed</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600">
                    {data.bookings.confirmed}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Confirmation Rate</p>
                  <p className="text-foreground text-2xl font-bold tabular-nums">
                    {data.bookings.confirmation_rate}%
                  </p>
                </div>
              </div>
              <BookingFunnel
                total={data.bookings.total}
                confirmed={data.bookings.confirmed}
                inProgress={data.bookings.in_progress}
                rejected={bookingRejected}
                cancelled={bookingCancelled}
              />
            </div>
          ) : null}
        </section>

        {/* Listings */}
        <section>
          <SectionHeading>Listings</SectionHeading>
          {loading ? (
            <div className="bg-muted animate-pulse h-48 rounded-lg" />
          ) : data ? (
            <div className="bg-card space-y-5 rounded-lg border p-5">
              <div>
                <p className="text-muted-foreground text-xs">Total Listings</p>
                <p className="text-foreground text-2xl font-bold tabular-nums">
                  {data.listings.total}
                </p>
              </div>
              <div className="space-y-3">
                <ProgressBarRow
                  label="Available"
                  value={byAvailability["available"] ?? 0}
                  total={listingTotal}
                  color="bg-emerald-500"
                />
                <ProgressBarRow
                  label="Unavailable"
                  value={byAvailability["unavailable"] ?? 0}
                  total={listingTotal}
                  color="bg-amber-400"
                />
                <ProgressBarRow
                  label="Rented"
                  value={byAvailability["rented"] ?? 0}
                  total={listingTotal}
                  color="bg-blue-500"
                />
              </div>

              {/* Top Cities */}
              {data.top_cities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
                      Top Cities
                    </p>
                    <div className="space-y-2">
                      {data.top_cities.map(({ city, province, listing_count }) => (
                        <div key={`${city}-${province}`} className="flex items-center gap-3">
                          <span className="text-muted-foreground w-32 shrink-0 truncate text-sm">
                            {city}, {province}
                          </span>
                          <div className="bg-muted h-4 flex-1 overflow-hidden rounded">
                            <div
                              className="bg-primary flex h-full items-center justify-end rounded pr-1.5 transition-all duration-500"
                              style={{
                                width: `${Math.max(8, (listing_count / topCityMax) * 100)}%`,
                              }}
                            >
                              <span className="text-primary-foreground text-xs font-semibold">
                                {listing_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <Separator />

      <Separator />

      {/* Demand Profile */}
      <section>
        <SectionHeading>Demand Profile</SectionHeading>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Avg Rental Duration"
                value={data.demand.avg_rental_duration_days !== null ? `${data.demand.avg_rental_duration_days} days` : "—"}
                variant="muted"
              />
              <StatCard
                label="Avg Space Requested"
                value={data.demand.avg_space_requested_sqft !== null ? `${data.demand.avg_space_requested_sqft.toLocaleString()} sqft` : "—"}
                variant="muted"
              />
              <StatCard
                label="Fulfillment Bookings"
                value={data.demand.bookings_by_service_type.fulfillment}
                variant="muted"
              />
              <StatCard
                label="Storage-Only Bookings"
                value={data.demand.bookings_by_service_type.storage_only}
                variant="muted"
              />
            </div>
            {(() => {
              const totalServiceBookings =
                data.demand.bookings_by_service_type.fulfillment +
                data.demand.bookings_by_service_type.storage_only;
              return (
                <div className="bg-card space-y-3 rounded-lg border p-5">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Service Type Breakdown
                  </p>
                  <ProgressBarRow
                    label="Fulfillment"
                    value={data.demand.bookings_by_service_type.fulfillment}
                    total={totalServiceBookings}
                    color="bg-violet-500"
                  />
                  <ProgressBarRow
                    label="Storage Only"
                    value={data.demand.bookings_by_service_type.storage_only}
                    total={totalServiceBookings}
                    color="bg-sky-400"
                  />
                </div>
              );
            })()}
          </div>
        ) : null}
      </section>

      <Separator />

      {/* Listing Vacancy */}
      <section>
        <SectionHeading>Listing Vacancy</SectionHeading>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Avg Days Until First Booking"
                value={data.vacancy.avg_days_until_first_booking !== null ? `${data.vacancy.avg_days_until_first_booking} days` : "—"}
                variant="muted"
              />
              <StatCard
                label="Listings Never Booked"
                value={data.vacancy.listings_never_booked}
                variant={data.vacancy.listings_never_booked > 0 ? "warning" : "default"}
              />
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              * Vacancy counted from listing creation to first confirmed booking.
            </p>
          </>
        ) : null}
      </section>

      <Separator />

      {/* Revenue */}
      <section>
        <SectionHeading>Revenue (Simulated)</SectionHeading>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Contracted Value"
                value={formatCurrency(data.revenue.total_contracted_cad)}
                variant="success"
              />
              <StatCard
                label="Avg Booking Value"
                value={
                  data.revenue.average_booking_value_cad > 0
                    ? formatCurrency(data.revenue.average_booking_value_cad)
                    : "—"
                }
                variant="muted"
              />
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              * Simulated values based on agreed monthly rates for confirmed bookings. No payments have been processed.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
