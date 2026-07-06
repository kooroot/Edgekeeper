import { Clock3, RadioTower } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import type { MarketState } from "@/lib/replay/replay-engine";
import { formatAge, formatClock, phaseLabel } from "@/lib/utils/time";

function probability(point: MarketState["latestOdds"][number]) {
  return point.impliedProbability ?? (point.decimalOdds ? 1 / point.decimalOdds : undefined);
}

function selectionName(selection: string, market: MarketState) {
  if (selection === "P1") return market.fixture.participant1;
  if (selection === "P2") return market.fixture.participant2;
  return selection;
}

export function MarketStatePanel({ market }: { market: MarketState }) {
  const score = `${market.latestScore?.participant1Score ?? 0}-${
    market.latestScore?.participant2Score ?? 0
  }`;

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-stone-200">TxLINE market state</h2>
          <p className="mt-1 font-mono text-xs text-stone-500">agent input summary</p>
        </div>
        {market.suspended ? <Badge tone="red">SUSPENDED</Badge> : <Badge tone="green">ACTIVE</Badge>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-md border border-stone-800 bg-black/30 p-3">
          <div className="font-mono text-[11px] uppercase text-stone-500">score</div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-sm text-stone-300">{market.fixture.participant1}</div>
              <div className="text-sm text-stone-300">{market.fixture.participant2}</div>
            </div>
            <div className="font-mono text-4xl font-semibold text-white">{score}</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
            <RadioTower className="h-4 w-4 text-cyan-200" />
            {phaseLabel(market.latestScore?.phaseId)}
            {market.latestScore?.minute !== undefined ? ` / ${market.latestScore.minute}'` : ""}
          </div>
        </div>

        <div className="rounded-md border border-stone-800 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase text-stone-500">1X2 probabilities</div>
            <div className="font-mono text-[11px] text-stone-500">
              {formatClock(market.lastOddsTs)}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {market.latestOdds.map((point) => {
              const value = probability(point) ?? 0;
              return (
                <div key={`${point.selection}-${point.seq ?? point.ts}`}>
                  <div className="mb-1 flex items-center justify-between font-mono text-xs">
                    <span className="text-stone-300">{selectionName(point.selection, market)}</span>
                    <span className={point.suspended ? "text-red-300" : "text-cyan-200"}>
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-900">
                    <div
                      className={`h-full ${point.suspended ? "bg-red-400" : "bg-cyan-300"}`}
                      style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-stone-800 bg-black/30 p-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase text-stone-500">
            <Clock3 className="h-4 w-4 text-amber-200" />
            freshness
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs text-stone-300">
            <div className="rounded-md bg-stone-900/70 p-2">
              <div className="text-stone-500">odds age</div>
              <div>{formatAge(market.now, market.lastOddsTs)}</div>
            </div>
            <div className="rounded-md bg-stone-900/70 p-2">
              <div className="text-stone-500">score age</div>
              <div>{formatAge(market.now, market.lastScoreTs)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
