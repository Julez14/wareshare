import { useQuery } from "@tanstack/react-query";
import { listingsApi } from "@/lib/api";

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => listingsApi.getListingById(id),
  });
}
