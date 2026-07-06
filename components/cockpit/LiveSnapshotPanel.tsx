"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, SatelliteDish } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { LiveAgentTickResult } from "@/lib/agent/live-agent";
import type { MarketState } from "@/lib/replay/replay-engine";
import type { LiveFixturePreview, LiveOddsSummary, LiveScoreSummary } from "@/lib/txline/live-summary";
import type { NormalizedFixture } from "@/lib/txline/types";
import { MarketStatePanel } from "./MarketStatePanel";

type FixturesResponse =
  | (LiveFixturePreview & {
      mode: "live";
      credentialsAvailable: boolean;
      credentialsSource: string;
      fallbackFrom?: string;
      fetchedAt: number;
    })
  | {
      mode: "replay";
      credentialsAvailable: false;
      credentialsSource: string;
      network: string;
      fixtures: NormalizedFixture[];
    }
  | {
      mode: "live";
      credentialsAvailable: boolean;
      credentialsSource: string;
      network: string;
      fallbackFrom?: string;
      error: string;
      fixtures: NormalizedFixture[];
    };

function buildMarket(
  fixture: NormalizedFixture,
  odds?: LiveOddsSummary,
  score?: LiveScoreSummary,
): MarketState {
  const now = Date.now();
  return {
    fixture,
    now,
    latestOdds: odds?.points ?? [],
    latestScore: score?.latest,
    lastOddsTs: odds?.latestTs,
    lastScoreTs: score?.latest?.ts,
    suspended: odds?.suspended ?? false,
  };
}

export function LiveSnapshotPanel({ fallbackFixture }: { fallbackFixture: NormalizedFixture }) {
  const [fixturesResponse, setFixturesResponse] = useState<FixturesResponse | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [odds, setOdds] = useState<LiveOddsSummary | undefined>();
  const [score, setScore] = useState<LiveScoreSummary | undefined>();
  const [agentTick, setAgentTick] = useState<LiveAgentTickResult | undefined>();
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [loadingAgentTick, setLoadingAgentTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fixtures = fixturesResponse?.fixtures ?? [];
  const selectedFixture =
    fixtures.find((fixture) => fixture.fixtureId === selectedFixtureId) ?? fixtures[0] ?? fallbackFixture;
  const market = useMemo(
    () => buildMarket(selectedFixture, odds, score),
    [odds, score, selectedFixture],
  );

  const loadFixtures = useCallback(async () => {
    setLoadingFixtures(true);
    setError(null);
    try {
      const response = await fetch("/api/fixtures", { cache: "no-store" });
      const body = (await response.json()) as FixturesResponse;
      setFixturesResponse(body);
      if ("error" in body) setError(body.error);
      const nextFixtureId = body.fixtures?.[0]?.fixtureId ?? "";
      setSelectedFixtureId((current) => current || nextFixtureId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Live fixtures request failed");
    } finally {
      setLoadingFixtures(false);
    }
  }, []);

  const loadSnapshot = useCallback(async (fixtureId = selectedFixture.fixtureId) => {
    if (!fixtureId || fixtureId === fallbackFixture.fixtureId) return;
    setLoadingSnapshot(true);
    setError(null);
    try {
      const [oddsResponse, scoreResponse] = await Promise.all([
        fetch(`/api/odds/${encodeURIComponent(fixtureId)}`, { cache: "no-store" }),
        fetch(`/api/scores/${encodeURIComponent(fixtureId)}`, { cache: "no-store" }),
      ]);
      const oddsBody = (await oddsResponse.json()) as LiveOddsSummary & { error?: string };
      const scoreBody = (await scoreResponse.json()) as LiveScoreSummary & { error?: string };
      if (!oddsResponse.ok) throw new Error(oddsBody.error ?? "Live odds request failed");
      if (!scoreResponse.ok) throw new Error(scoreBody.error ?? "Live scores request failed");
      setOdds(oddsBody);
      setScore(scoreBody);
    } catch (snapshotError) {
      setError(snapshotError instanceof Error ? snapshotError.message : "Live snapshot request failed");
    } finally {
      setLoadingSnapshot(false);
    }
  }, [fallbackFixture.fixtureId, selectedFixture.fixtureId]);

  const runAgentTick = useCallback(async (fixtureId = selectedFixture.fixtureId) => {
    if (!fixtureId || fixtureId === fallbackFixture.fixtureId) return;
    setLoadingAgentTick(true);
    setError(null);
    try {
      const response = await fetch(`/api/live-agent/${encodeURIComponent(fixtureId)}`, {
        cache: "no-store",
        method: "POST",
      });
      const body = (await response.json()) as LiveAgentTickResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Live agent tick failed");
      setAgentTick(body);
    } catch (tickError) {
      setError(tickError instanceof Error ? tickError.message : "Live agent tick failed");
    } finally {
      setLoadingAgentTick(false);
    }
  }, [fallbackFixture.fixtureId, selectedFixture.fixtureId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFixtures();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFixtures]);

  useEffect(() => {
    if (!selectedFixtureId) return;
    const timer = window.setTimeout(() => {
      void loadSnapshot(selectedFixtureId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSnapshot, selectedFixtureId]);

  useEffect(() => {
    if (!selectedFixtureId || fixturesResponse?.mode !== "live") return;
    const run = () => {
      void runAgentTick(selectedFixtureId);
    };
    const timer = window.setTimeout(run, 0);
    const interval = window.setInterval(run, 60_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [fixturesResponse?.mode, runAgentTick, selectedFixtureId]);

  const hasLiveData = fixturesResponse?.mode === "live";
  const hasDirectCredentials = hasLiveData && fixturesResponse.credentialsAvailable === true;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(420px,1.2fr)]">
      <div className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase text-stone-200">Live TxLINE snapshot</h2>
            <p className="mt-1 font-mono text-xs text-stone-500">
              EdgeKeeper-owned TxLINE credentials, server-side only
            </p>
          </div>
          <Badge tone={hasLiveData ? "green" : "amber"}>
            {hasLiveData ? "LIVE DATA" : "REPLAY FALLBACK"}
          </Badge>
        </div>

        <div className="mb-4 grid gap-2 font-mono text-xs text-stone-300 sm:grid-cols-2">
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="text-stone-500">network</div>
            <div>{fixturesResponse && "network" in fixturesResponse ? fixturesResponse.network : "mainnet"}</div>
          </div>
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="text-stone-500">credentials</div>
            <div>{hasDirectCredentials ? fixturesResponse.credentialsSource : "missing"}</div>
          </div>
        </div>
        {fixturesResponse?.mode === "live" && fixturesResponse.fallbackFrom ? (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 font-mono text-xs text-amber-100">
            primary {fixturesResponse.fallbackFrom} unavailable; using {fixturesResponse.network}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <select
            value={selectedFixture.fixtureId}
            onChange={(event) => setSelectedFixtureId(event.target.value)}
            className="h-10 rounded-md border border-stone-700 bg-black/40 px-3 font-mono text-sm text-white outline-none"
            disabled={fixtures.length === 0}
          >
            {fixtures.length > 0 ? (
              fixtures.map((fixture) => (
                <option key={fixture.fixtureId} value={fixture.fixtureId}>
                  {fixture.participant1} vs {fixture.participant2} · {fixture.fixtureId}
                </option>
              ))
            ) : (
              <option value={fallbackFixture.fixtureId}>No live fixture loaded</option>
            )}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadFixtures()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:text-white"
              disabled={loadingFixtures}
            >
              <SatelliteDish className="h-4 w-4" />
              {loadingFixtures ? "Loading fixtures" : "Refresh Fixtures"}
            </button>
            <button
              type="button"
              onClick={() => void loadSnapshot()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-300 px-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loadingSnapshot || fixtures.length === 0}
            >
              <RefreshCw className="h-4 w-4" />
              {loadingSnapshot ? "Loading snapshot" : "Refresh Snapshot"}
            </button>
            <button
              type="button"
              onClick={() => void runAgentTick()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/50 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loadingAgentTick || fixtures.length === 0}
            >
              <RefreshCw className="h-4 w-4" />
              {loadingAgentTick ? "Running agent" : "Run Agent Tick"}
            </button>
          </div>

          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
              {error}
            </div>
          ) : null}

          {!hasLiveData ? (
            <EmptyState title="Live TxLINE source not loaded">
              Configure server-only TxLINE credentials, then restart the dev server.
              Replay mode remains fully available without any external account.
            </EmptyState>
          ) : null}

          {hasLiveData && fixtures.length === 0 && !loadingFixtures ? (
            <EmptyState title="No live World Cup fixture in preview">
              The server route is authenticated, but the filtered World Cup fixture preview returned no
              upcoming fixtures.
            </EmptyState>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <MarketStatePanel market={market} />
        <div className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="cyan">DERIVED SUMMARY</Badge>
            <Badge tone="amber">NO RAW FEED EXPORT</Badge>
            <Badge tone="green">AUTO 60S AGENT TICK</Badge>
            {odds?.count ? <Badge tone="green">{odds.count} odds rows read</Badge> : null}
            {score?.count ? <Badge tone="green">{score.count} score rows read</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-stone-400">
            Live mode fetches TxLINE snapshots through server routes, normalizes them, and displays
            market state summaries. Secrets never reach the browser and full raw TxODDS responses are
            not downloadable here.
          </p>
        </div>
        <LiveAgentTickPanel tick={agentTick} loading={loadingAgentTick} />
      </div>
    </section>
  );
}

function LiveAgentTickPanel({
  tick,
  loading,
}: {
  tick?: LiveAgentTickResult;
  loading: boolean;
}) {
  const latestSignal = tick?.signals.at(-1);
  const latestRisk = tick?.riskDecisions.at(-1);
  const latestReceipt = tick?.latestReceipt;
  const blockedCheck = latestRisk?.checks.find((check) => check.status === "BLOCK");

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/80 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-stone-200">Live agent tick</h2>
          <p className="mt-1 font-mono text-xs text-stone-500">
            TxLINE input to strategy, risk, simulated action, and receipt
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={tick ? "green" : "neutral"}>{tick ? "LIVE STRATEGY RAN" : "WAITING"}</Badge>
          <Badge tone="cyan">SERVER-SIDE</Badge>
        </div>
      </div>

      {!tick ? (
        <EmptyState title={loading ? "Live agent running" : "No live agent tick yet"}>
          The live tab automatically runs the agent every 60 seconds once a fixture is loaded.
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] uppercase text-stone-500">decision</div>
              <Badge tone={latestSignal?.suggestedAction === "BLOCK" ? "red" : "cyan"}>
                {latestSignal?.suggestedAction ?? "NOOP"}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-white">
              {latestSignal?.title ?? "No signal"}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              {latestSignal?.description ?? "No decision description available."}
            </p>
          </div>

          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] uppercase text-stone-500">risk</div>
              <Badge tone={latestRisk?.status === "BLOCK" ? "red" : "green"}>
                {latestRisk?.status ?? "PASS"}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-white">
              {latestRisk?.finalAction ?? "NOOP"}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              {blockedCheck?.reason ?? `${latestRisk?.checks.length ?? 0} deterministic checks evaluated.`}
            </p>
          </div>

          <div className="rounded-md border border-stone-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] uppercase text-stone-500">receipt</div>
              <Badge tone={latestReceipt ? "cyan" : "neutral"}>
                {tick.receipts.length} emitted
              </Badge>
            </div>
            <div className="break-all font-mono text-xs text-cyan-100">
              {latestReceipt?.id ?? "pending"}
            </div>
            <p className="mt-2 font-mono text-[11px] leading-5 text-stone-500">
              positions {tick.positions.length} / odds rows {tick.inputSummary.oddsCount} / score rows{" "}
              {tick.inputSummary.scoreCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
