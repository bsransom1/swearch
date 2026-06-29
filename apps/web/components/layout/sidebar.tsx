"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/projects", label: "Projects", icon: "◫" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-surface-1 border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="text-text-primary font-semibold text-sm">Swearch</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-surface-2 text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-2"
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-2 transition-colors"
        >
          <span className="text-base leading-none">→</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
