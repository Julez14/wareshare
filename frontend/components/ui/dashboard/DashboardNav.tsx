"use client";

import { LucideIcon, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useState } from "react";

type NavLink = { href: string; label: string; icon: LucideIcon };
type DashboardNavProps = {
  links: NavLink[];
  profileLink: NavLink;
  iconSize?: number;
};

function isActiveLink(href: string, pathname: string): boolean {
  if (pathname === href || pathname === href + "/") return true;
  if (href === "/renter") return false;
  return pathname.startsWith(href + "/");
}

export default function DashboardNav({
  links,
  profileLink,
  iconSize,
}: DashboardNavProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const pathname = usePathname();

  const allLinks = [...links, profileLink];
  const ProfileIcon = profileLink.icon as LucideIcon;

  return (
    <header className="border-border bg-card sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* LOGO */}
        <Link
          href="/renter"
          className="text-foreground flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
        >
          <Image
            src="/logo.png"
            alt="WareShare"
            width={100}
            height={100}
            className="rounded-sm"
          />
        </Link>

        {/* MAIN LINKS (Desktop Visible) */}
        <nav
          className="hidden flex-1 items-center justify-center gap-6 md:flex"
          aria-label="Main navigation"
        >
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = isActiveLink(href, pathname);
            return (
              <Link
                href={href}
                key={href}
                className={
                  isActive
                    ? "text-primary bg-primary/10 flex items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors"
                    : "text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors"
                }
              >
                <Icon size={iconSize} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Profile  (Desktop Visible) */}
        <div className="hidden shrink-0 items-center md:flex">
          <Link
            href={profileLink.href}
            className="text-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ProfileIcon size={iconSize} />
            {profileLink.label}
          </Link>
        </div>

        {/* Hamburger Button (Mobile Visible) */}
        <button
          type="button"
          onClick={() => setIsOpen((s) => !s)}
          className="text-foreground hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded-md md:hidden"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X size={iconSize} /> : <Menu size={iconSize} />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div
          className="border-border bg-card flex flex-col gap-1 border-t p-4 md:hidden"
          role="dialog"
          aria-label="Mobile navigation"
        >
          {allLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen((s) => !s)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Icon size={iconSize} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
