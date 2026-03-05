import RecentBookingCard from "@/components/renter/RecentBookingCard";
import { Booking } from "@/types/booking";

export default function RecentBookings({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <RecentBookingCard key={booking.id} booking={booking} />
        ))}
      </ul>
    </div>
  );
}
