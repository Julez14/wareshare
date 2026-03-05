import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Warehouse } from "lucide-react";
import { routes } from "@/lib/routes";

export default function EmptyBookingsOverview() {
  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-lg border p-6 text-center">
      <div className="bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-full sm:size-16">
        <Warehouse className="size-7 sm:size-8" aria-hidden />
      </div>
      <h3 className="text-foreground text-lg font-semibold uppercase">
        No Bookings Yet
      </h3>
      <p className="text-muted-foreground mt-2 max-w-sm">
        Find warehouse space that fits your needs and start booking
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link href={routes.renter.listings.root}>
          Find warehouses
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
