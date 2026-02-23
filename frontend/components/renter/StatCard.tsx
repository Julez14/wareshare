import Link from "next/link";

type StatCardProps = {
  href: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
};

export default function StatCard({
  href,
  label,
  value,
  icon: Icon,
}: StatCardProps) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:border-primary/30 focus-visible:ring-ring flex flex-col rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline"
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium sm:text-sm">
          {label}
        </span>
        <Icon className="text-muted-foreground size-4 sm:size-5" aria-hidden />
      </div>
      <span className="text-foreground mt-2 text-2xl font-bold sm:text-3xl">
        {value}
      </span>
    </Link>
  );
}
