import { Bot, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";

const workflow = [
  {
    label: "Agent Decision",
    title: "Signals become actions",
    description: "Odds velocity, score-price divergence, momentum, stale-feed, and suspension signals resolve to OPEN, CLOSE, NOOP, or BLOCK.",
    icon: Bot,
  },
  {
    label: "Risk Engine",
    title: "Every action is gated",
    description: "Exposure, open-position count, stale data, suspended markets, final phases, and drawdown are checked deterministically.",
    icon: ShieldCheck,
  },
  {
    label: "Simulated Position",
    title: "No venue execution",
    description: "Positions are simulation-only and marked from TxLINE decimal odds and implied probability movement.",
    icon: Gauge,
  },
  {
    label: "Receipt",
    title: "Replayable proof trail",
    description: "Each pass, block, open, and close emits hashes, proof references, and compact JSON without raw feed dumps.",
    icon: FileCheck2,
  },
];

export function OperatorWorkflow() {
  return (
    <section className="border-b border-stone-900 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="cyan">OPERATOR WORKFLOW</Badge>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-white md:text-3xl">
              Built around agent accountability and auditability
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-stone-500">
            The primary artifact is a traceable decision path that a trading team can
            inspect after the agent acts.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="border border-stone-800 bg-stone-950/80 p-4"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <span className="font-mono text-xs text-stone-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="font-mono text-[11px] uppercase text-cyan-200">
                  {item.label}
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-500">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
