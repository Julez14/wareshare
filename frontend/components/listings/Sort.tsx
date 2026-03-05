import { useListingsStore } from "@/stores/listings";
import { ListingsSort, ListingsSortOrder } from "@/types/listing";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const SORT_OPTIONS: {
  label: string;
  sort: ListingsSort;
  order: ListingsSortOrder;
}[] = [
  { label: "Newest first", sort: "created_at", order: "desc" },
  { label: "Oldest first", sort: "created_at", order: "asc" },
  { label: "Price (low to high)", sort: "price_per_month", order: "asc" },
  { label: "Price (high to low)", sort: "price_per_month", order: "desc" },
  { label: "Largest first", sort: "size_sqft", order: "desc" },
  { label: "Smallest first", sort: "size_sqft", order: "asc" },
];

export default function Sort() {
  const sort = useListingsStore((s) => s.sort);
  const order = useListingsStore((s) => s.order);
  const setSort = useListingsStore((s) => s.setSort);
  const setOrder = useListingsStore((s) => s.setOrder);

  const value = `${sort}-${order}`;

  return (
    <Select
      value={value}
      onValueChange={(val: string) => {
        const [s, o] = val.split("-") as [ListingsSort, ListingsSortOrder];
        setSort(s);
        setOrder(o);
      }}
    >
      <SelectTrigger
        aria-label="Sort listings"
        className="h-9 min-w-40 max-w-44 shrink-0"
      >
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent position="popper">
        {SORT_OPTIONS.map((opt) => (
          <SelectItem
            key={`${opt.sort}-${opt.order}`}
            value={`${opt.sort}-${opt.order}`}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
