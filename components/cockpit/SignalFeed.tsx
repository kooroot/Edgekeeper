import { FileCheck2, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { DecisionReceipt, Signal } from "@/lib/agent/types";

function severityTone(severity: Signal["severity"]): "cyan" | "amber" | "red" {
  if (severity === "HIGH") return "red";
  if (severity === "MEDIUM") return "amber";
  return "cyan";
}

export function SignalFeed({
  signals,
  receipts,
  newSignalIds,
  onSelectReceipt,
}: {
  signals: Signal[];
  receipts: DecisionReceipt[];
  newSignalIds: string[];
  onSelectReceipt: (signalId: string) => void;
}) {
  const receiptBySignal = new Map(receipts.map((receipt) => [receipt.signal.id, receipt]));

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-stone-200">Signal feed</h2>
          <p className="mt-1 font-mono text-xs text-stone-500">agent timeline</p>
        </div>
        <Badge tone="cyan">{signals.length} signals</Badge>
      </div>

      {signals.length === 0 ? (
        <EmptyState title="No agent signals yet">Start replay to process odds and score updates.</EmptyState>
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
          {signals
            .slice()
            .reverse()
            .map((signal) => {
              const receipt = receiptBySignal.get(signal.id);
              const isNew = newSignalIds.includes(signal.id);
              return (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => onSelectReceipt(signal.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isNew
                      ? "border-cyan-500/70 bg-cyan-500/10"
                      : "border-stone-800 bg-black/25 hover:border-stone-600"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(signal.severity)}>{signal.severity}</Badge>
                    <Badge tone="neutral">{signal.type}</Badge>
                    <Badge tone={signal.suggestedAction === "BLOCK" ? "red" : "green"}>
                      {signal.suggestedAction}
                    </Badge>
                    {receipt ? <Badge tone="cyan">RECEIPT GENERATED</Badge> : null}
                  </div>
                  <div className="text-sm font-semibold text-white">{signal.title}</div>
                  <p className="mt-2 text-xs leading-5 text-stone-400">{signal.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-stone-500">
                    <span>confidence {(signal.confidence * 100).toFixed(0)}%</span>
                    <span className="inline-flex items-center gap-1 text-cyan-200">
                      {receipt ? <FileCheck2 className="h-3.5 w-3.5" /> : <MousePointer2 className="h-3.5 w-3.5" />}
                      {receipt?.id ?? "pending"}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </section>
  );
}
