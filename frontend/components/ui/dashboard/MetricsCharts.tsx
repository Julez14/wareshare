type FunnelRow = {
  label: string;
  value: number;
  color: string;
};

type BookingFunnelProps = {
  total: number;
  confirmed: number;
  inProgress: number;
  rejected: number;
  cancelled: number;
};

export function BookingFunnel({
  total,
  confirmed,
  inProgress,
  rejected,
  cancelled,
}: BookingFunnelProps) {
  const rows: FunnelRow[] = [
    { label: "Total Created", value: total, color: "bg-primary" },
    { label: "In Progress", value: inProgress, color: "bg-blue-500" },
    { label: "Confirmed", value: confirmed, color: "bg-emerald-500" },
    { label: "Rejected", value: rejected, color: "bg-red-400" },
    { label: "Cancelled", value: cancelled, color: "bg-muted-foreground" },
  ];

  const max = Math.max(total, 1);

  return (
    <div className="space-y-3">
      {rows.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-muted-foreground w-28 shrink-0 text-right text-sm">
            {label}
          </span>
          <div className="bg-muted h-6 flex-1 overflow-hidden rounded">
            <div
              className={`${color} flex h-full items-center justify-end rounded pr-2 transition-all duration-500`}
              style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
            >
              {value > 0 && (
                <span className="text-xs font-semibold text-white">{value}</span>
              )}
            </div>
          </div>
          {value === 0 && (
            <span className="text-muted-foreground text-sm">0</span>
          )}
        </div>
      ))}
    </div>
  );
}

type ProgressBarRowProps = {
  label: string;
  value: number;
  total: number;
  color?: string;
};

export function ProgressBarRow({
  label,
  value,
  total,
  color = "bg-primary",
}: ProgressBarRowProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
