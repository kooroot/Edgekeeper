"use client";

import { Check, Clipboard, Download } from "lucide-react";
import { useMemo, useState } from "react";

export function JsonPreview({
  value,
  downloadName,
  copyLabel = "Copy JSON",
  downloadLabel = "Download JSON",
}: {
  value: unknown;
  downloadName: string;
  copyLabel?: string;
  downloadLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(value, null, 2), [value]);

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
      <div className="flex flex-col gap-2 border-b border-stone-800 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-mono text-xs uppercase text-stone-500">receipt json</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyJson}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:border-cyan-500/60 hover:text-white"
            title={copyLabel}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : copyLabel}
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:border-cyan-500/60 hover:text-white"
            title={downloadLabel}
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </button>
        </div>
      </div>
      <pre className="max-h-[62vh] overflow-auto p-4 font-mono text-xs leading-5 text-stone-300">
        {json}
      </pre>
    </section>
  );
}
