"use client";

import {
  Search,
  CalendarCheck,
  Package,
  MessageSquare,
  CircleUser,
} from "lucide-react";
import DashboardNav from "@/components/ui/dashboard/DashboardNav";

const navLinks = [
  { href: "/renter/listings", label: "Find Warehouses", icon: Search },
  { href: "/renter/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/renter/inventory", label: "Inventory", icon: Package },
  { href: "/renter/messages", label: "Messages", icon: MessageSquare },
];

const profileLink = {
  href: "/renter/profile",
  label: "Profile",
  icon: CircleUser,
};

export default function RenterNav() {
  return (
    <DashboardNav links={navLinks} profileLink={profileLink} iconSize={24} />
  );
}
