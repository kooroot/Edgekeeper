import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { DecisionReceipt, RiskDecision, Signal } from "@/lib/agent/types";

export function RiskPanel({
  decisions,
  signals,
  receipts,
  newReceiptIds,
}: {
  decisions: RiskDecision[];
  signals: Signal[];
  receipts: DecisionReceipt[];
  newReceiptIds: string[];
}) {
  const latest = decisions.at(-1);
  const latestSignal = latest ? signals.find((signal) => signal.id === latest.signalId) : undefined;
  const latestReceipt = latest ? receipts.find((receipt) => receipt.signal.id === latest.signalId) : undefined;
  const blockedCount = decisions.filter((decision) => decision.status === "BLOCK").length;

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-stone-200">Risk engine</h2>
          <p className="mt-1 font-mono text-xs text-stone-500">deterministic execution gates</p>
        </div>
        <Badge tone={blockedCount > 0 ? "red" : "green"}>{blockedCount} blocked</Badge>
      </div>

      {!latest ? (
        <EmptyState title="No risk decision yet">Risk checks run when the first agent decision appears.</EmptyState>
      ) : (
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-3 ${
              latest.status === "BLOCK"
                ? "border-red-500/50 bg-red-500/10"
                : "border-emerald-500/40 bg-emerald-500/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {latest.status === "BLOCK" ? (
                <ShieldAlert className="mt-0.5 h-5 w-5 text-red-200" />
              ) : (
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-200" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={latest.status === "BLOCK" ? "red" : "green"}>
                    {latest.status}
                  </Badge>
                  <Badge tone="neutral">{latest.finalAction}</Badge>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {latestSignal?.title ?? latest.signalId}
                </div>
                <div className="mt-1 break-all font-mono text-[11px] text-stone-500">
                  {latestReceipt?.id}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {latest.checks.map((check) => (
              <div
                key={check.name}
                className="rounded-md border border-stone-800 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-stone-200">{check.name}</div>
                  <Badge tone={check.status === "BLOCK" ? "red" : "green"}>{check.status}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">{check.reason}</p>
              </div>
            ))}
          </div>

          {newReceiptIds.length > 0 ? (
            <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 p-3 font-mono text-xs text-cyan-100">
              receipt emitted: {newReceiptIds.join(", ")}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
