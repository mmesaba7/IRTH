import type { SVGProps } from "react";

export type IrthIconName =
  | "menu"
  | "close"
  | "search"
  | "cart"
  | "heart"
  | "bell"
  | "user"
  | "home"
  | "compass"
  | "grid"
  | "globe"
  | "story"
  | "orders"
  | "journal"
  | "pottery"
  | "textile"
  | "metal"
  | "wood"
  | "leather"
  | "jewelry"
  | "craft"
  | "shield"
  | "return"
  | "spark";

type IrthIconProps = SVGProps<SVGSVGElement> & {
  name: IrthIconName;
};

function Paths({ name }: { name: IrthIconName }) {
  switch (name) {
    case "menu": return <><path d="M4 7h16M4 12h16M4 17h16" /></>;
    case "close": return <><path d="m6 6 12 12M18 6 6 18" /></>;
    case "search": return <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>;
    case "cart": return <><path d="M3.5 5h2l1.7 9.1h9.6l2-6.4H6.1" /><circle cx="9" cy="18.5" r="1" /><circle cx="17" cy="18.5" r="1" /></>;
    case "heart": return <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />;
    case "bell": return <><path d="M7.5 10a4.5 4.5 0 1 1 9 0c0 5 2 5.8 2 5.8h-13s2-.8 2-5.8Z" /><path d="M10 19h4" /></>;
    case "user": return <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></>;
    case "home": return <><path d="m4 11 8-7 8 7" /><path d="M6.5 10.5V20h11v-9.5M10 20v-5h4v5" /></>;
    case "compass": return <><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9 3.9-1.7Z" /></>;
    case "grid": return <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>;
    case "globe": return <><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.5 2.5 3.5 5.3 3.5 8.5S14.5 18 12 20.5M12 3.5C9.5 6 8.5 8.8 8.5 12S9.5 18 12 20.5" /></>;
    case "story": return <><path d="M5 5.5h5.2c1 0 1.8.3 1.8 1.3v12.4c0-1-1-1.7-2.1-1.7H5V5.5Z" /><path d="M19 5.5h-5.2c-1 0-1.8.3-1.8 1.3v12.4c0-1 1-1.7 2.1-1.7H19V5.5Z" /></>;
    case "orders": return <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>;
    case "journal": return <><rect x="5" y="4" width="14" height="16" rx="1.5" /><path d="M9 4v16M12 8h4M12 12h4" /></>;
    case "pottery": return <><path d="M9 4h6M9.5 6h5l.8 3c.7 2.5 2.2 3.8 2.2 6.1 0 3-2.3 4.9-5.5 4.9s-5.5-1.9-5.5-4.9c0-2.3 1.5-3.6 2.2-6.1l.8-3Z" /><path d="M8 12h8" /></>;
    case "textile": return <><path d="M5 5h14v14H5zM8 5v14M12 5v14M16 5v14M5 9h14M5 13h14M5 17h14" /></>;
    case "metal": return <><path d="M7 18 17 6M6 7l4-3 3 3-3 4-4-4ZM14 14l4-3 2 2-3 4-3-3Z" /></>;
    case "wood": return <><path d="M5 18 18 5M6 6l12 12M8 5l11 11M5 8l11 11" /></>;
    case "leather": return <><path d="M8 4c1.5 1.6 2.7 2.2 4 2.2S14.5 5.6 16 4l2 5-2.2 11H8.2L6 9l2-5Z" /></>;
    case "jewelry": return <><circle cx="12" cy="12" r="6" /><path d="M9 6 12 3l3 3M8 12h8" /></>;
    case "craft": return <><path d="M6 18c3-7 9-7 12 0M8 8c0-2 1.6-3.5 4-3.5S16 6 16 8s-1.6 3.5-4 3.5S8 10 8 8Z" /></>;
    case "shield": return <><path d="M12 3 19 6v5c0 4.7-2.8 7.6-7 10-4.2-2.4-7-5.3-7-10V6l7-3Z" /><path d="m8.8 12 2 2 4.5-4.5" /></>;
    case "return": return <><path d="M8 7H5v-3M5.5 7A8 8 0 1 1 4 15" /><path d="M9 11h6v5H9z" /></>;
    case "spark": return <><path d="M12 3c.4 4.2 2.8 6.6 7 7-4.2.4-6.6 2.8-7 7-.4-4.2-2.8-6.6-7-7 4.2-.4 6.6-2.8 7-7Z" /><path d="M18.5 3.5c.2 1.5 1 2.3 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.2 2.3-1 2.5-2.5Z" /></>;
  }
}

export default function IrthIcon({ name, className, ...props }: IrthIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <Paths name={name} />
    </svg>
  );
}
