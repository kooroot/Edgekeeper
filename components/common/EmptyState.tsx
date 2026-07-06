import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-stone-800 bg-black/20 p-5 text-center">
      <div className="text-sm font-medium text-stone-200">{title}</div>
      {children ? <div className="mt-2 max-w-sm text-xs leading-5 text-stone-500">{children}</div> : null}
    </div>
  );
}
