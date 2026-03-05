// Describes the shape of a single storage listing object retrieved from the API
export type Listing = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  city: string;
  province: string;
  size_sqft: number;
  price_per_month: number;
  currency: string;
  features: string[];
  availability_status: "available" | "unavailable" | "rented";
  fulfillment_available: number;
  photos: { id: string; r2_key: string; sort_order: number }[];
  created_at: string;
  updated_at: string;
};

// Describes the response structure when fetching listings from the API
export type ListingResponse = {
  listings: Listing[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

export type ListingsSort =
  | "created_at"
  | "price_per_month"
  | "size_sqft"
  | "title";
export type ListingsSortOrder = "asc" | "desc";

// Describes the set of query parameters accepted for fetching/filtering listings
export type ListingsParams = {
  city?: string;
  province?: string;
  min_price?: number;
  max_price?: number;
  min_size?: number;
  max_size?: number;
  fulfillment?: boolean;
  page?: number;
  per_page?: number;
  sort?: ListingsSort;
  order?: ListingsSortOrder;
};
