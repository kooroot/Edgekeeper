import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export function Hero() {
  return (
    <section className="relative isolate min-h-[72svh] overflow-hidden border-b border-stone-900 px-4 py-8 md:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(120,113,108,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(120,113,108,0.10)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute right-[-6rem] top-10 -z-10 hidden w-[46rem] rotate-[-8deg] border border-stone-800 bg-black/60 p-4 shadow-2xl shadow-cyan-950/20 md:block">
        <div className="mb-4 grid grid-cols-4 gap-2 font-mono text-[10px] uppercase text-stone-500">
          <span>market</span>
          <span>signal</span>
          <span>risk</span>
          <span>receipt</span>
        </div>
        {[
          ["1X2 P1", "+6.0pp", "PASS", "rcpt_a19c"],
          ["score", "momentum", "PASS", "rcpt_7fe2"],
          ["odds", "suspended", "BLOCK", "rcpt_4bd0"],
          ["1X2 P1", "-9.0pp", "CLOSE", "rcpt_91aa"],
        ].map((row) => (
          <div
            key={row.join("-")}
            className="mb-2 grid grid-cols-4 gap-2 rounded-md border border-stone-800 bg-stone-950/80 px-3 py-3 font-mono text-sm"
          >
            <span className="text-stone-300">{row[0]}</span>
            <span className="text-cyan-200">{row[1]}</span>
            <span className={row[2] === "BLOCK" ? "text-red-300" : "text-emerald-300"}>
              {row[2]}
            </span>
            <span className="text-amber-200">{row[3]}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col justify-center gap-8 pt-16 md:min-h-[62svh]">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">TRADING TOOLS AND AGENTS</Badge>
          <Badge tone="cyan">REPLAY MODE</Badge>
          <Badge tone="amber">TXLINE-VALUED SIM</Badge>
          <Badge tone="green">RISK CHECKED</Badge>
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
            Auditable trading-agent decisions for verified football data
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">
            Built for the TxODDS World Cup Trading Tools and Agents track. Operator tooling,
            not a prediction market, fan app, wallet flow, or real-money bot.
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
