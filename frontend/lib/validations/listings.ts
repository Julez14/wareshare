// Form values for filters
export type ListingsFiltersFormValues = {
  province: string;
  min_size: string;
  max_size: string;
  min_price: string;
  max_price: string;
  fulfillment: boolean;
};

// Initial values for filters
export const filtersInitialValues: ListingsFiltersFormValues = {
  province: "",
  min_size: "",
  max_size: "",
  min_price: "",
  max_price: "",
  fulfillment: false,
};
