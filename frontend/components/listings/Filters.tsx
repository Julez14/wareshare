"use client";

import { useForm } from "react-hook-form";
import { useListingsStore, hasActiveListingsFilters } from "@/stores/listings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filtersInitialValues,
  ListingsFiltersFormValues,
} from "@/lib/validations/listings";

// Sentinel for "All provinces" in the province select
const PROVINCE_ALL = "__all__";

const PROVINCES = [
  "ON",
  "BC",
  "AB",
  "QC",
  "MB",
  "SK",
  "NS",
  "NB",
  "NL",
  "PE",
  "YT",
  "NT",
  "NU",
] as const;

export default function Filters() {
  const applyFilters = useListingsStore((s) => s.applyFilters);
  const clearFilters = useListingsStore((s) => s.clearFilters);
  const hasActiveFilters = useListingsStore(hasActiveListingsFilters);

  const { register, handleSubmit, watch, setValue, reset } =
    useForm<ListingsFiltersFormValues>({
      defaultValues: filtersInitialValues,
    });

  const province = watch("province") ?? "";
  const provinceSelectValue = province === "" ? PROVINCE_ALL : province;

  const onApply = handleSubmit((values) => {
    applyFilters(values);
  });

  const onClear = () => {
    clearFilters();
    reset(filtersInitialValues);
  };

  return (
    <aside
      className="border-border bg-card rounded-lg border p-4 shadow-sm"
      aria-label="Filters"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="text-muted-foreground h-auto p-0 text-xs"
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </div>
      <form onSubmit={onApply} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filter-province">Province</Label>
          <Select
            value={provinceSelectValue}
            onValueChange={(value) =>
              setValue("province", value === PROVINCE_ALL ? "" : value)
            }
          >
            <SelectTrigger id="filter-province" className="h-9 w-full">
              <SelectValue placeholder="All provinces" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-60">
              <SelectItem value={PROVINCE_ALL}>All provinces</SelectItem>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Size range (sq ft)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              {...register("min_size")}
            />
            <Input
              type="number"
              min={0}
              placeholder="Max"
              {...register("max_size")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Price range ($/mo)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              {...register("min_price")}
            />
            <Input
              type="number"
              min={0}
              placeholder="Max"
              {...register("max_price")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-fulfillment" className="text-sm">
            Fulfillment services available
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="filter-fulfillment"
              type="checkbox"
              {...register("fulfillment")}
              className="border-input accent-primary size-4 shrink-0 rounded border"
            />
            <span className="text-muted-foreground text-sm">
              Only show warehouses with fulfillment services
            </span>
          </div>
        </div>

        <Button type="submit" className="w-full">
          Apply
        </Button>
      </form>
    </aside>
  );
}
