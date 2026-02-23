import { formatCurrency, formatDate } from "@/lib/format";
import { Booking } from "@/types/booking";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending review",
  agreement_draft: "Agreement draft",
  host_edited: "Awaiting your signature",
  renter_accepted: "Awaiting host signature",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function RecentBookingCard({ booking }: { booking: Booking }) {
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;
  const isActive =
    booking.status === "confirmed" ||
    booking.status === "host_edited" ||
    booking.status === "renter_accepted";

  return (
    <Link
      href={`/renter/bookings/${booking.id}`}
      className="border-border bg-card hover:border-primary/30 group rounded-lg border p-4"
    >
      <div className="flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-foreground font-semibold">
          {booking.listing_title}
        </h3>
        {/* Location */}
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <MapPin size={14} className="shrink-0" />
          <span>
            {booking.listing_city}, {booking.listing_province}
          </span>
        </p>
        {/* Dates */}
        <p className="text-muted-foreground text-sm">
          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
        </p>
        {/* Status - Price */}
        <div className="flex flex-wrap justify-between">
          <span
            className={`flex rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            {statusLabel}
          </span>
          <span className="text-foreground text-sm font-medium">
            {formatCurrency(booking.monthly_rate)}
            <span className="text-muted-foreground text-xs">/mo</span>
          </span>
        </div>
        {/* Details */}
        <span className="text-primary mt-2 flex items-center gap-1 text-sm font-medium group-hover:underline">
          View details
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
