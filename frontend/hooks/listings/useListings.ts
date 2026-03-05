import { useQuery } from "@tanstack/react-query";
import { listingsApi } from "@/lib/api";
import { ListingsParams } from "@/types/listing";

export function useListings(params: ListingsParams = {}) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: () => listingsApi.getListings(params),
  });
}
