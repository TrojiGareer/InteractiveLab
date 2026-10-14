"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Simulator" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/simulations", label: "Run history" },
];

type PrimaryNavigationProps = {
  className?: string;
};

export function PrimaryNavigation({
  className,
}: PrimaryNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={className}
      aria-label="Primary navigation"
    >
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              isActive ? "page" : undefined
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
