import type {
  NormalizedFixture,
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "./types";

export type LiveFixturePreview = {
  network: "devnet" | "mainnet";
  source: "TxLINE World Cup Free Tier";
  count: number;
  fixtures: NormalizedFixture[];
  freeTiers: Array<{ serviceLevel: number; latency: string }>;
};

export type LiveOddsSummary = {
  fixtureId: string;
  count: number;
  latestTs?: number;
  suspended: boolean;
  points: NormalizedOddsPoint[];
};

export type LiveScoreSummary = {
  fixtureId: string;
  count: number;
  latest?: NormalizedScoreUpdate;
};

function startMs(fixture: NormalizedFixture) {
  const parsed = fixture.startTime ? Date.parse(fixture.startTime) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCompetitionFixture(fixture: NormalizedFixture, competitionId: number | string) {
  if (String(fixture.competitionId ?? "") === String(competitionId)) return true;
  return fixture.competition?.trim().toLowerCase() === "world cup";
}

export function buildLiveFixturePreview({
  fixtures,
  network,
  freeTiers,
  limit = 12,
  now = Date.now(),
  competitionId = 72,
}: {
  fixtures: NormalizedFixture[];
  network: "devnet" | "mainnet";
  freeTiers: readonly { id: number; latency: string }[];
  limit?: number;
  now?: number;
  competitionId?: number | string;
}): LiveFixturePreview {
  const normalized = fixtures
    .filter((fixture) => fixture.fixtureId !== "unknown-fixture")
    .filter((fixture) => isCompetitionFixture(fixture, competitionId))
    .filter((fixture) => startMs(fixture) === 0 || startMs(fixture) >= now - 6 * 60 * 60 * 1000)
    .sort((a, b) => startMs(a) - startMs(b));

  return {
    network,
    source: "TxLINE World Cup Free Tier",
    count: normalized.length,
    fixtures: normalized.slice(0, limit),
    freeTiers: freeTiers.map((tier) => ({
      serviceLevel: tier.id,
      latency: tier.latency,
    })),
  };
}

export function summarizeOdds(points: NormalizedOddsPoint[], fixtureId: string): LiveOddsSummary {
  const latestBySelection = new Map<string, NormalizedOddsPoint>();
  for (const point of points) {
    const key = `${point.market}:${point.selection}`;
    const previous = latestBySelection.get(key);
    if (!previous || point.ts > previous.ts) latestBySelection.set(key, point);
  }

  const latest = [...latestBySelection.values()].sort((a, b) => {
    const order = (selection: string) => ({ P1: 0, DRAW: 1, P2: 2 })[selection] ?? 99;
    return order(a.selection) - order(b.selection) || b.ts - a.ts;
  });

  return {
    fixtureId,
    count: points.length,
    latestTs: latest.length > 0 ? Math.max(...latest.map((point) => point.ts)) : undefined,
    suspended: latest.some((point) => point.suspended),
    points: latest.slice(0, 12),
  };
}

export function summarizeScores(
  scores: NormalizedScoreUpdate[],
  fixtureId: string,
): LiveScoreSummary {
  const latest = [...scores].sort((a, b) => b.ts - a.ts || (b.seq ?? 0) - (a.seq ?? 0))[0];
  return {
    fixtureId,
    count: scores.length,
    latest,
  };
}
