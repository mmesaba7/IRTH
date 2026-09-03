import Link from "next/link";
import IrthIcon, { type IrthIconName } from "./IrthIcon";

type MobileBottomNavItem = {
  key: "home" | "search" | "explore" | "saved" | "account";
  href: string;
  label: string;
  icon: IrthIconName;
};

const items: MobileBottomNavItem[] = [
  { key: "home", href: "/", label: "Home", icon: "home" },
  { key: "search", href: "/search", label: "Search", icon: "search" },
  { key: "explore", href: "/explore", label: "Explore", icon: "compass" },
  { key: "saved", href: "/saved", label: "Saved", icon: "heart" },
  { key: "account", href: "/account", label: "Account", icon: "user" },
];

export type MobileBottomNavActive = MobileBottomNavItem["key"];

export default function MobileBottomNav({ active }: { active?: MobileBottomNavActive }) {
  return (
    <nav className="bottom-nav md:hidden" aria-label="Mobile navigation">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={isActive ? "active" : undefined}
            aria-current={isActive ? "page" : undefined}
          >
            <IrthIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
