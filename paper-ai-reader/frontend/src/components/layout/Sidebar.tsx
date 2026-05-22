import { BookOpen, Brain, Library, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../utils/cn";

const navItems = [
  { to: "/", label: "文献", icon: Library },
  { to: "/reader", label: "阅读", icon: BookOpen },
  { to: "/settings", label: "设置", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-card px-3 py-4 md:block">
      <div className="mb-6 flex h-10 items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Brain className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Paper AI Reader</div>
          <div className="truncate text-xs text-muted-foreground">Local workspace</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                isActive && "bg-muted text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
