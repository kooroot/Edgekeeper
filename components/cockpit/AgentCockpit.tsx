"use client";

import { LiveSnapshotPanel } from "./LiveSnapshotPanel";
import { Badge } from "@/components/common/Badge";

export function AgentCockpit() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
        <header className="rounded-lg border border-stone-800 bg-stone-950/90 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-mono text-xs uppercase text-stone-500">selected source</div>
              <h1 className="mt-1 text-lg font-semibold text-white">Live TxLINE Agent Cockpit</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">LIVE MODE</Badge>
              <Badge tone="neutral">OPERATOR COCKPIT</Badge>
              <Badge tone="amber">TXLINE-VALUED SIM</Badge>
              <Badge tone="cyan">AUTO 60S AGENT TICK</Badge>
            </div>
          </div>
        </header>

        <LiveSnapshotPanel />
      </div>
    </main>
  );
}
