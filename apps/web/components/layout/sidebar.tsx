"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FolderOpen, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const confirmed = window.confirm("Sign out of Swearch?");
    if (!confirmed) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="w-[200px] flex-shrink-0 bg-surface-bg border-r border-border-subtle flex flex-col">
      <div className="px-4 py-4 border-b border-border-subtle">
        <Link href="/projects" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="text-text-primary font-semibold text-sm">Swearch</span>
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ease-out",
                active
                  ? "bg-accent-50 text-accent font-medium"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.25 : 1.75} className="flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3 border-t border-border-subtle pt-3">
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-1 transition-colors duration-150 ease-out w-full text-left"
        >
          <LogOut size={15} strokeWidth={1.75} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
