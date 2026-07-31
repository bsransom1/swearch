import type { LucideIcon } from "lucide-react";

export default function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        <Icon size={16} strokeWidth={2} className="text-text-tertiary" />
        <span>
          {title}
          {count != null && count > 0 ? ` (${count})` : ""}
        </span>
      </div>
      <div className="h-px bg-border-subtle w-full" />
    </div>
  );
}
