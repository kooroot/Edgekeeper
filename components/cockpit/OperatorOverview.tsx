import { Bot, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import type { ReplayFrame } from "@/lib/replay/replay-engine";

function formatUnits(value?: number) {
  if (value === undefined) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function shortHash(value?: string) {
  if (!value) return "pending";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatProbability(value?: number) {
  return value !== undefined ? `${(value * 100).toFixed(1)}%` : "n/a";
}

export function OperatorOverview({ frame }: { frame: ReplayFrame }) {
  const latestSignal = frame.signals.at(-1);
  const latestDecision = frame.riskDecisions.at(-1);
  const latestReceipt = frame.receipts.at(-1);
  const latestPosition = frame.positions.at(-1);
  const openExposure = frame.positions
    .filter((position) => position.status === "OPEN")
    .reduce((total, position) => total + position.stakeUnits, 0);
  const realizedPnl = frame.positions
    .filter((position) => position.status === "CLOSED")
    .reduce((total, position) => total + (position.pnlUnits ?? 0), 0);
  const blockedCount = frame.riskDecisions.filter(
    (decision) => decision.status === "BLOCK",
  ).length;

  return (
    <section className="grid gap-3 lg:grid-cols-4">
      <article className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-cyan-200" />
            <h2 className="text-sm font-semibold uppercase text-stone-200">Agent decision</h2>
          </div>
          <Badge tone={latestSignal ? "cyan" : "neutral"}>
            {latestSignal?.suggestedAction ?? "WAITING"}
          </Badge>
        </div>
        <div className="min-h-14 text-sm font-semibold text-white">
          {latestSignal?.title ?? "Replay agent has not emitted a decision."}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] text-stone-500">
          <div className="rounded-md bg-black/30 p-2">
            <div>confidence</div>
            <div className="mt-1 text-cyan-200">
              {latestSignal ? `${(latestSignal.confidence * 100).toFixed(0)}%` : "n/a"}
            </div>
          </div>
          <div className="rounded-md bg-black/30 p-2">
            <div>input hash</div>
            <div className="mt-1 break-all text-stone-300">{shortHash(latestSignal?.inputHash)}</div>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            <h2 className="text-sm font-semibold uppercase text-stone-200">Risk engine</h2>
          </div>
          <Badge tone={latestDecision?.status === "BLOCK" ? "red" : latestDecision ? "green" : "neutral"}>
            {latestDecision?.status ?? "IDLE"}
          </Badge>
        </div>
        <div className="min-h-14 text-sm font-semibold text-white">
          {latestDecision?.finalAction ?? "No proposed action has reached the guardrails."}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] text-stone-500">
          <div className="rounded-md bg-black/30 p-2">
            <div>checks</div>
            <div className="mt-1 text-emerald-200">{latestDecision?.checks.length ?? 0}</div>
          </div>
          <div className="rounded-md bg-black/30 p-2">
            <div>blocked</div>
            <div className={blockedCount > 0 ? "mt-1 text-red-200" : "mt-1 text-stone-300"}>
              {blockedCount}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-200" />
            <h2 className="text-sm font-semibold uppercase text-stone-200">Simulated position</h2>
          </div>
          <Badge tone={latestPosition?.status === "OPEN" ? "cyan" : latestPosition ? "green" : "neutral"}>
            {latestPosition?.status ?? "NONE"}
          </Badge>
        </div>
        <div className="min-h-14 text-sm font-semibold text-white">
          {latestPosition
            ? `${latestPosition.side} / ${latestPosition.stakeUnits} notional / ${formatProbability(
                latestPosition.entryProbability,
              )} entry`
            : "No position state has been created."}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] text-stone-500">
          <div className="rounded-md bg-black/30 p-2">
            <div>exposure</div>
            <div className="mt-1 text-cyan-200">{openExposure}</div>
          </div>
          <div className="rounded-md bg-black/30 p-2">
            <div>realized pnl</div>
            <div className={realizedPnl >= 0 ? "mt-1 text-emerald-200" : "mt-1 text-red-200"}>
              {formatUnits(realizedPnl)}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-cyan-200" />
            <h2 className="text-sm font-semibold uppercase text-stone-200">Receipt trail</h2>
          </div>
          <Badge tone={latestReceipt ? "cyan" : "neutral"}>
            {frame.receipts.length} total
          </Badge>
        </div>
        {latestReceipt ? (
          <div className="min-h-14 break-all font-mono text-xs text-white">{latestReceipt.id}</div>
        ) : (
          <div className="min-h-14 text-sm font-semibold text-white">
            No decision receipt has been generated.
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] text-stone-500">
          <div className="rounded-md bg-black/30 p-2">
            <div>receipt hash</div>
            <div className="mt-1 break-all text-cyan-200">
              {shortHash(latestReceipt?.receiptHash)}
            </div>
          </div>
          <div className="rounded-md bg-black/30 p-2">
            <div>proof seq</div>
            <div className="mt-1 text-stone-300">
              {latestReceipt
                ? `${latestReceipt.proofReference?.oddsSeq ?? "x"}/${
                    latestReceipt.proofReference?.scoreSeq ?? "x"
                  }`
                : "n/a"}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
