import type { ReactNode } from "react";

const toneClasses = {
  neutral: "border-stone-700 bg-stone-900 text-stone-200",
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  red: "border-red-500/40 bg-red-500/10 text-red-200",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 font-mono text-[11px] font-medium uppercase tracking-normal ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
