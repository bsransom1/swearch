import type { ProjectGoogleDocRole } from "@swearch/shared/types/project-google-doc";
import { DOC_ROLE_OPTIONS } from "./LinkedProjectDocCard";
import { BTN_SECONDARY } from "../../lib/theme";

interface Props {
  docTitle: string;
  showBothOption: boolean;
  onConfirm: (role: ProjectGoogleDocRole) => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function DocRoleChooser({
  docTitle,
  showBothOption,
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 space-y-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
          How should Swearch use this doc?
        </p>
        <p className="text-sm font-medium text-text-primary mt-1 line-clamp-2">{docTitle}</p>
      </div>

      <fieldset className="space-y-2 border-0 p-0 m-0">
        {DOC_ROLE_OPTIONS.filter(
          (option) => option.value !== "both" || showBothOption
        ).map((option) => (
          <RoleOption
            key={option.value}
            name="doc-role"
            value={option.value}
            label={option.label}
            description={option.description}
            onSelect={onConfirm}
            disabled={busy}
          />
        ))}
      </fieldset>

      <button type="button" onClick={onCancel} disabled={busy} className={`w-full ${BTN_SECONDARY}`}>
        Cancel
      </button>
      <p className="text-[11px] text-text-tertiary text-center">Select a role above to continue.</p>
    </div>
  );
}

function RoleOption({
  name,
  value,
  label,
  description,
  onSelect,
  disabled,
}: {
  name: string;
  value: ProjectGoogleDocRole;
  label: string;
  description: string;
  onSelect: (role: ProjectGoogleDocRole) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border-subtle hover:bg-surface-2 cursor-pointer transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-50">
      <input
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="mt-0.5 accent-accent"
      />
      <span className="min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-[11px] text-text-tertiary leading-snug mt-0.5">{description}</span>
      </span>
    </label>
  );
}
