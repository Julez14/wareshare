import { cn } from "@/lib/utils";
import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "warning" | "success" | "muted";
  href?: string;
};

const variantStyles = {
  default: "bg-card border-border",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  muted: "bg-muted border-border",
};

const valueStyles = {
  default: "text-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
  muted: "text-muted-foreground",
};

export function StatCard({
  label,
  value,
  subtext,
  variant = "default",
  href,
}: StatCardProps) {
  const card = (
    <div
      className={cn(
        "rounded-lg border p-5 transition-shadow",
        variantStyles[variant],
        href && "hover:shadow-md cursor-pointer",
      )}
    >
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", valueStyles[variant])}>
        {value}
      </p>
      {subtext && (
        <p className="text-muted-foreground mt-1 text-xs">{subtext}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }
  return card;
}
