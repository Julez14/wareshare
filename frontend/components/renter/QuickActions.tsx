import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  Package,
  Search,
} from "lucide-react";
import { routes } from "@/lib/routes";

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

function ActionCard({ href, title, description, icon: Icon }: ActionCardProps) {
  return (
    <Link
      className="border-border bg-card focus-visible:ring-ring group hover:border-primary/30 flex items-start gap-4 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline sm:p-5"
      href={href}
    >
      <div className="bg-primary/10 text-primary group-hover:bg-primary/15 flex shrink-0 rounded-lg p-2 transition-colors">
        <Icon />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-foreground font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>
      <ArrowRight
        className="text-muted-foreground size-4 shrink-0 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ActionCard
        href={routes.renter.listings.root}
        title="Find Warehouses"
        description="Search and compare warehouse listings"
        icon={Search}
      />
      <ActionCard
        href={routes.renter.bookings.root}
        title="My Bookings"
        description="View and manage your bookings"
        icon={CalendarCheck}
      />
      <ActionCard
        href={routes.renter.inventory.root}
        title="Inventory"
        description="Track items across your bookings"
        icon={Package}
      />
      <ActionCard
        href={routes.renter.messages.root}
        title="Messages"
        description="Chat with hosts"
        icon={MessageSquare}
      />
    </div>
  );
}
