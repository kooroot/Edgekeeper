import { Activity, CircleDot, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import type { ReplayFrame, ReplayRun } from "@/lib/replay/replay-engine";
import { FixtureSelector } from "./FixtureSelector";
import type { ReplayStatus } from "./ReplayControls";

const statusTone: Record<ReplayStatus, "neutral" | "cyan" | "green" | "amber"> = {
  idle: "neutral",
  running: "green",
  paused: "amber",
  complete: "cyan",
};

export function AgentStatusBar({
  replayRun,
  frame,
  status,
}: {
  replayRun: ReplayRun;
  frame: ReplayFrame;
  status: ReplayStatus;
}) {
  return (
    <header className="rounded-lg border border-stone-800 bg-stone-950/90 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FixtureSelector fixture={replayRun.fixture} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">REPLAY MODE</Badge>
            <Badge tone="neutral">OPERATOR COCKPIT</Badge>
            <Badge tone="amber">TXLINE-VALUED SIM</Badge>
            {frame.riskDecisions.length > 0 ? <Badge tone="green">RISK CHECKED</Badge> : null}
            {frame.receipts.length > 0 ? <Badge tone="cyan">RECEIPT GENERATED</Badge> : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-5 lg:min-w-[700px]">
          <div className="flex items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 py-2">
            <CircleDot className="h-4 w-4 text-cyan-200" />
            <div>
              <div className="font-mono text-[10px] uppercase text-stone-500">status</div>
              <Badge tone={statusTone[status]}>{status}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 py-2">
            <Activity className="h-4 w-4 text-emerald-200" />
            <div>
              <div className="font-mono text-[10px] uppercase text-stone-500">signals</div>
              <div className="font-mono text-sm text-white">{frame.signals.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-amber-200" />
            <div>
              <div className="font-mono text-[10px] uppercase text-stone-500">risk decisions</div>
              <div className="font-mono text-sm text-white">{frame.riskDecisions.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 py-2">
            <Gauge className="h-4 w-4 text-amber-200" />
            <div>
              <div className="font-mono text-[10px] uppercase text-stone-500">positions</div>
              <div className="font-mono text-sm text-white">{frame.positions.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 py-2">
            <FileCheck2 className="h-4 w-4 text-cyan-200" />
            <div>
              <div className="font-mono text-[10px] uppercase text-stone-500">receipts</div>
              <div className="font-mono text-sm text-white">{frame.receipts.length}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
