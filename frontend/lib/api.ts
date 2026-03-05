import { api } from "@/lib/axios";
import { Listing, ListingResponse, ListingsParams } from "@/types/listing";

export const listingsApi = {
  getListings: async (params: ListingsParams): Promise<ListingResponse> => {
    const response = await api.get("/listings", { params });
    return response.data;
  },
  getListingById: async (id: string): Promise<Listing> => {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  },
};
