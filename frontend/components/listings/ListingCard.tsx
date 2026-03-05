import type { Listing } from "@/types/listing";
import { routes } from "@/lib/routes";
import Link from "next/link";

function getFeatures(listing: Listing): string[] {
  const f = listing.features;
  if (Array.isArray(f)) return f;
  if (typeof f === "string") {
    try {
      const parsed = JSON.parse(f);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const available = listing.availability_status === "available";
  const features = getFeatures(listing);

  return (
    <div
      className={`border-border bg-card flex flex-col rounded-lg border p-4 shadow transition-shadow hover:shadow-md ${!available ? "opacity-65" : ""}`}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-foreground text-lg font-semibold">
          {listing.title}
        </h3>
        {!available && (
          <span className="bg-destructive/10 text-destructive rounded px-2 py-0.5 text-xs font-semibold">
            Unavailable
          </span>
        )}
      </div>
      <p className="text-muted-foreground mb-1 text-sm">
        {listing.city}, {listing.province}
      </p>
      <div className="mb-2 flex gap-3 text-sm">
        <span>
          <span className="font-medium">
            {listing.size_sqft.toLocaleString()}
          </span>{" "}
          sqft
        </span>
        <span>
          <span className="font-medium">
            ${listing.price_per_month.toLocaleString()}
          </span>{" "}
          /mo
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {features.map((f) => (
          <span
            key={f}
            className="bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs"
          >
            {String(f).replace(/-/g, " ")}
          </span>
        ))}
      </div>
      <Link
        href={routes.renter.listings.details(listing.id)}
        className={`mt-auto w-full rounded-md px-4 py-2 text-center text-sm font-semibold transition ${available ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
        aria-disabled={!available}
      >
        {available ? "View details" : "Unavailable"}
      </Link>
    </div>
  );
}
