import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { DecisionReceipt, PaperPosition } from "@/lib/agent/types";

function formatUnits(value?: number) {
  if (value === undefined) return "n/a";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

function formatOdds(value?: number) {
  return value !== undefined ? value.toFixed(2) : "n/a";
}

function formatProbabilityDelta(value?: number) {
  if (value === undefined) return "open";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}pp`;
}

export function PaperLedger({
  positions,
  receipts,
}: {
  positions: PaperPosition[];
  receipts: DecisionReceipt[];
}) {
  const openExposure = positions
    .filter((position) => position.status === "OPEN")
    .reduce((total, position) => total + position.stakeUnits, 0);
  const pnl = positions
    .filter((position) => position.status === "CLOSED")
    .reduce((total, position) => total + (position.pnlUnits ?? 0), 0);

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-stone-200">Simulated position ledger</h2>
          <p className="mt-1 font-mono text-xs text-stone-500">
            TxLINE odds-valued position state, no venue order routing
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase text-stone-500">open exposure</div>
            <div className="font-mono text-lg text-white">{openExposure} notional</div>
          </div>
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase text-stone-500">realized pnl</div>
            <div className={`font-mono text-lg ${pnl >= 0 ? "text-emerald-200" : "text-red-200"}`}>
              {formatUnits(pnl)}
            </div>
          </div>
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase text-stone-500">receipts</div>
            <div className="font-mono text-lg text-cyan-200">{receipts.length}</div>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <EmptyState title="No simulated positions yet">
          Passing open signals create 100-notional positions marked against TxLINE probabilities.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead className="font-mono text-[11px] uppercase text-stone-500">
              <tr>
                <th className="border-b border-stone-800 px-3 py-2">position</th>
                <th className="border-b border-stone-800 px-3 py-2">side</th>
                <th className="border-b border-stone-800 px-3 py-2">entry odds</th>
                <th className="border-b border-stone-800 px-3 py-2">exit odds</th>
                <th className="border-b border-stone-800 px-3 py-2">entry prob</th>
                <th className="border-b border-stone-800 px-3 py-2">exit prob</th>
                <th className="border-b border-stone-800 px-3 py-2">delta</th>
                <th className="border-b border-stone-800 px-3 py-2">notional</th>
                <th className="border-b border-stone-800 px-3 py-2">pnl</th>
                <th className="border-b border-stone-800 px-3 py-2">status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id} className="font-mono text-xs text-stone-300">
                  <td className="border-b border-stone-900 px-3 py-3">{position.id}</td>
                  <td className="border-b border-stone-900 px-3 py-3">{position.side}</td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {formatOdds(position.entryDecimalOdds)}
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {position.exitDecimalOdds !== undefined ? formatOdds(position.exitDecimalOdds) : "open"}
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {(position.entryProbability * 100).toFixed(1)}%
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {position.exitProbability !== undefined
                      ? `${(position.exitProbability * 100).toFixed(1)}%`
                      : "open"}
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {formatProbabilityDelta(position.probabilityDelta)}
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    {position.stakeUnits}
                  </td>
                  <td
                    className={`border-b border-stone-900 px-3 py-3 ${
                      (position.pnlUnits ?? 0) >= 0 ? "text-emerald-200" : "text-red-200"
                    }`}
                  >
                    {position.pnlUnits !== undefined ? formatUnits(position.pnlUnits) : "n/a"}
                  </td>
                  <td className="border-b border-stone-900 px-3 py-3">
                    <Badge tone={position.status === "OPEN" ? "cyan" : "green"}>
                      {position.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
