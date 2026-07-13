import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  Headphones,
  Library,
  MapPinned,
  Settings,
  Upload,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const primaryNav: AppNavItem[] = [
  { href: "/", label: "Today", icon: Calendar },
  { href: "/batch", label: "Islands", icon: MapPinned },
  { href: "/recall", label: "Active Recall", icon: Brain },
  { href: "/listen?step=shadow", label: "Shadowing", icon: Headphones },
  { href: "/library", label: "Library", icon: Library },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export const toolsNav: AppNavItem[] = [
  { href: "/prepare", label: "Pre-study", icon: ClipboardList },
  { href: "/weak", label: "Weak sentences", icon: AlertTriangle },
];

export const footerNav: AppNavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/guide", label: "Guide", icon: BookOpen },
  { href: "/import", label: "Import", icon: Upload },
];

export function isNavActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/listen") return pathname.startsWith("/listen");
  return pathname === path || (path !== "/" && pathname.startsWith(path));
}
