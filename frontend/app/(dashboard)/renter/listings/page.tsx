import SearchListings from "@/components/listings/SearchListings";

export default function RenterListingsPage() {
  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SearchListings />
      </div>
    </div>
  );
}
