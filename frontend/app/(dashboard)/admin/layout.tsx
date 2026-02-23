import Link from "next/link";
import { BarChart2, Users } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 z-50 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <span className="text-foreground font-semibold">WareShare Admin</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Users size={15} />
              Users
            </Link>
            <Link
              href="/admin/metrics"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <BarChart2 size={15} />
              Metrics
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
