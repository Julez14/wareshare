import Link from "next/link";
import {
  Search,
  CalendarCheck,
  Package,
  MessageSquare,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Booking } from "@/types/booking";
import EmptyBookingsOverview from "@/components/renter/EmptyBookingsOverview";
import RecentBookings from "@/components/renter/RecentBookings";
import QuickActions from "@/components/renter/QuickActions";
import StatCard from "@/components/renter/StatCard";

// Placeholder data – replace with real data from API later
const MOCK_BOOKINGS: Booking[] = [
  {
    id: "b1",
    listing_id: "LISTING001",
    renter_id: "RENTER001",
    host_id: "HOST001",
    start_date: "2026-03-01",
    end_date: "2026-06-30",
    space_requested_sqft: 500,
    monthly_rate: 2500,
    status: "confirmed",
    rejected_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    confirmed_at: "2026-02-15",
    created_at: "2026-02-10",
    updated_at: "2026-02-15",
    listing_title: "Downtown Toronto Warehouse",
    listing_city: "Toronto",
    listing_province: "ON",
    renter_name: "John Storage",
    host_name: "Jane Warehouse",
  },
  {
    id: "b2",
    listing_id: "LISTING002",
    renter_id: "RENTER001",
    host_id: "HOST001",
    start_date: "2026-04-15",
    end_date: "2026-07-14",
    space_requested_sqft: 1000,
    monthly_rate: 7500,
    status: "host_edited",
    rejected_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    confirmed_at: null,
    created_at: "2026-02-12",
    updated_at: "2026-02-14",
    listing_title: "Mississauga Distribution Center",
    listing_city: "Mississauga",
    listing_province: "ON",
    renter_name: "John Storage",
    host_name: "Jane Warehouse",
  },
  {
    id: "b3",
    listing_id: "LISTING003",
    renter_id: "RENTER001",
    host_id: "HOST002",
    start_date: "2025-12-01",
    end_date: "2026-02-28",
    space_requested_sqft: null,
    monthly_rate: 1200,
    status: "confirmed",
    rejected_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    confirmed_at: "2025-11-20",
    created_at: "2025-11-15",
    updated_at: "2025-11-20",
    listing_title: "Scarborough Storage Hub",
    listing_city: "Scarborough",
    listing_province: "ON",
    renter_name: "John Storage",
    host_name: "Bob Warehouse",
  },
];

const MOCK_STATS = {
  activeBookings: MOCK_BOOKINGS.length,
  unreadMessages: 0,
};

export default function RenterPage() {
  const hasBookings = MOCK_STATS.activeBookings > 0;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome section */}
        <section className="mb-8 md:mb-10">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your storage and find warehouse space
          </p>
          <div className="mt-4 sm:mt-6">
            <Button asChild size="lg" className="gap-2">
              <Link href="/renter/listings">
                <Search className="size-5" aria-hidden />
                Find warehouse space
              </Link>
            </Button>
          </div>
        </section>

        {/* Quick stats */}
        <section className="mb-8 md:mb-10">
          <h2 className="text-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active bookings"
              value={MOCK_STATS.activeBookings}
              href="/renter/bookings"
              icon={CalendarCheck}
            />
            <StatCard
              label="Unread messages"
              value={MOCK_STATS.unreadMessages}
              href="/renter/messages"
              icon={MessageSquare}
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="mb-8 md:mb-10">
          <h2 className="text-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
            Quick actions
          </h2>
          <QuickActions />
        </section>

        {/* Recent activity / Empty state */}
        <section>
          <h2 className="text-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
            Your bookings
          </h2>
          {hasBookings ? (
            <RecentBookings bookings={MOCK_BOOKINGS} />
          ) : (
            <EmptyBookingsOverview />
          )}
        </section>
      </div>
    </div>
  );
}
