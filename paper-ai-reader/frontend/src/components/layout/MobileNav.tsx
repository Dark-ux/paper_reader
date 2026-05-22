import { BookOpen, Library, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../utils/cn";

const navItems = [
  { to: "/", label: "文献", icon: Library },
  { to: "/reader", label: "阅读", icon: BookOpen },
  { to: "/settings", label: "设置", icon: Settings }
];

export function MobileNav() {
  return (
    <div className="sticky top-0 z-10 border-b bg-card px-3 py-2 md:hidden">
      <nav className="grid grid-cols-3 gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center justify-center gap-1 rounded-md text-sm text-muted-foreground",
                isActive && "bg-muted text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
