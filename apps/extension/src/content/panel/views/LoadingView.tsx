import { SPINNER } from "../../../lib/theme";

interface Props {
  label?: string;
}

export default function LoadingView({ label = "Analyzing with Claude…" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className={SPINNER} />
      <p className="text-xs text-text-tertiary">{label}</p>
    </div>
  );
}
