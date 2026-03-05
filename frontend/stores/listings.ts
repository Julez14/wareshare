import { create } from "zustand";
import type {
  ListingsSort,
  ListingsSortOrder,
  ListingsParams,
} from "@/types/listing";
import type { ListingsFiltersFormValues } from "@/lib/validations/listings";

const PER_PAGE = 20;

type ListingsState = {
  city: string;
  province: string;
  min_size: string;
  max_size: string;
  min_price: string;
  max_price: string;
  fulfillment: boolean;
  isFiltersOpen: boolean;
  sort: ListingsSort;
  order: ListingsSortOrder;
  page: number;
  per_page: number;
};

type ListingsActions = {
  setCity: (city: string) => void;
  applyFilters: (values: ListingsFiltersFormValues) => void;
  clearFilters: () => void;
  setSort: (sort: ListingsSort) => void;
  setOrder: (order: ListingsSortOrder) => void;
  setPage: (page: number) => void;
  toggleFilters: () => void;
};

const initialState: ListingsState = {
  city: "",
  province: "",
  min_size: "",
  max_size: "",
  min_price: "",
  max_price: "",
  fulfillment: false,
  isFiltersOpen: false,
  sort: "created_at",
  order: "desc",
  page: 1,
  per_page: PER_PAGE,
};

export const useListingsStore = create<ListingsState & ListingsActions>(
  (set) => ({
    ...initialState,

    setCity: (city) => set({ city }),

    applyFilters: (values) =>
      set({
        province: values.province,
        min_size: values.min_size,
        max_size: values.max_size,
        min_price: values.min_price,
        max_price: values.max_price,
        fulfillment: values.fulfillment,
        page: 1,
      }),

    clearFilters: () =>
      set({
        province: "",
        min_size: "",
        max_size: "",
        min_price: "",
        max_price: "",
        fulfillment: false,
        page: 1,
      }),

    setSort: (sort) => set({ sort }),
    setOrder: (order) => set({ order }),
    setPage: (page) => set({ page }),
    toggleFilters: () => set((s) => ({ isFiltersOpen: !s.isFiltersOpen })),
  }),
);

// Build params from current applied filter state (for useListings)
export function getListingsParams(state: ListingsState): ListingsParams {
  const p: ListingsParams = {
    city: state.city.trim() || undefined,
    province: state.province.trim() || undefined,
    sort: state.sort,
    order: state.order,
    page: state.page,
    per_page: state.per_page,
  };

  // add possible filtered params (converted to numbers for the backend)
  const minS = state.min_size.trim();
  const maxS = state.max_size.trim();
  const minP = state.min_price.trim();
  const maxP = state.max_price.trim();
  if (minS && !isNaN(Number(minS))) p.min_size = Number(minS);
  if (maxS && !isNaN(Number(maxS))) p.max_size = Number(maxS);
  if (minP && !isNaN(Number(minP))) p.min_price = Number(minP);
  if (maxP && !isNaN(Number(maxP))) p.max_price = Number(maxP);
  if (state.fulfillment) p.fulfillment = true;
  return p;
}

export function hasActiveListingsFilters(state: ListingsState): boolean {
  return (
    state.province !== "" ||
    state.min_size !== "" ||
    state.max_size !== "" ||
    state.min_price !== "" ||
    state.max_price !== "" ||
    state.fulfillment
  );
}
