type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search by city",
}: SearchBarProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-input bg-background focus:border-primary focus:ring-primary/20 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition outline-none focus:ring-2"
      aria-label="Search by city"
    />
  );
}
