"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { JsonPreview } from "@/components/common/JsonPreview";
import type { DecisionReceipt } from "@/lib/agent/types";

export function ReceiptDrawer({
  receipt,
  onClose,
}: {
  receipt: DecisionReceipt | null;
  onClose: () => void;
}) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 p-2 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-stone-800 bg-stone-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 p-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="cyan">RECEIPT GENERATED</Badge>
              <Badge tone={receipt.riskDecision.status === "BLOCK" ? "red" : "green"}>
                {receipt.riskDecision.status}
              </Badge>
            </div>
            <h3 className="break-all font-mono text-lg font-semibold text-white">{receipt.id}</h3>
            <p className="mt-1 text-xs text-stone-500">{receipt.signal.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-700 bg-stone-900 text-stone-300 transition hover:text-white"
            title="Close receipt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3">
            <Link
              href={`/receipts/${receipt.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:border-cyan-500/60 hover:text-white"
            >
              Open receipt page
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <JsonPreview
            value={receipt}
            downloadName={`${receipt.id}.json`}
            copyLabel="Copy Receipt JSON"
            downloadLabel="Download Receipt JSON"
          />
        </div>
      </aside>
    </div>
  );
}
