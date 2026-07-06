import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export function Hero() {
  return (
    <section className="relative isolate min-h-[72svh] overflow-hidden border-b border-stone-900 px-4 py-8 md:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(120,113,108,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(120,113,108,0.10)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute right-[-18rem] top-12 -z-10 hidden w-[48rem] rotate-[-8deg] border border-stone-800 bg-black/55 p-4 shadow-2xl shadow-cyan-950/20 lg:block">
        <div className="mb-4 grid grid-cols-4 gap-2 font-mono text-[10px] uppercase text-stone-500">
          <span>agent decision</span>
          <span>risk gate</span>
          <span>position</span>
          <span>receipt</span>
        </div>
        {[
          ["OPEN_P1", "PASS", "+100 sim", "rcpt_a19c"],
          ["NOOP", "PASS", "watch", "rcpt_7fe2"],
          ["BLOCK", "SUSPENDED", "0 sim", "rcpt_4bd0"],
          ["CLOSE", "PASS", "+18.8 pnl", "rcpt_91aa"],
        ].map((row) => (
          <div
            key={row.join("-")}
            className="mb-2 grid grid-cols-4 gap-2 rounded-md border border-stone-800 bg-stone-950/80 px-3 py-3 font-mono text-sm"
          >
            <span className="text-stone-300">{row[0]}</span>
            <span className={row[1] === "SUSPENDED" ? "text-red-300" : "text-emerald-300"}>
              {row[1]}
            </span>
            <span className={row[2] === "0 sim" ? "text-stone-500" : "text-cyan-200"}>
              {row[2]}
            </span>
            <span className="text-amber-200">{row[3]}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col justify-center gap-8 pt-16 md:min-h-[62svh]">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">TRADING TOOLS AND AGENTS</Badge>
          <Badge tone="cyan">OPERATOR COCKPIT</Badge>
          <Badge tone="amber">TXLINE-VALUED SIM</Badge>
          <Badge tone="green">RECEIPT AUDIT</Badge>
        </div>

        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
            Proof-aware trading-agent cockpit
          </div>
          <h1 className="text-5xl font-semibold leading-tight text-white md:text-7xl">
            EdgeKeeper
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-8 text-stone-300 md:text-2xl">
            Agent decisions, deterministic risk gates, simulated positions, and receipts
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">
            Built for the TxODDS World Cup Trading Tools and Agents track. EdgeKeeper is an
            operator cockpit for strategy developers, not a prediction market, wallet flow,
            or real-money bot.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/cockpit"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-black transition hover:bg-cyan-200"
            >
              Open Agent Cockpit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-stone-500">
              Simulated execution only. No real-money betting. Unofficial data tool.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
