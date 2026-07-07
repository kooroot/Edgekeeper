import type {
  NormalizedFixture,
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "./types";

export type LiveFixturePreview = {
  network: "devnet" | "mainnet";
  source: "TxLINE World Cup Free Tier";
  scope: FixtureScope;
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

const OUTCOME_SELECTIONS = new Set(["P1", "DRAW", "P2"]);
const FINAL_STATUS_PATTERN = /(ended|finished|final|full\s*time|after\s+extra|penalt)/i;
const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;
const SCHEDULED_GRACE_MS = 15 * 60 * 1000;

export type FixtureScope = "analysis" | "live" | "completed" | "scheduled";

export function isOutcomeSelection(selection: string) {
  return OUTCOME_SELECTIONS.has(selection);
}

function startMs(fixture: NormalizedFixture) {
  const parsed = fixture.startTime ? Date.parse(fixture.startTime) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCompetitionFixture(fixture: NormalizedFixture, competitionId: number | string) {
  if (String(fixture.competitionId ?? "") === String(competitionId)) return true;
  return fixture.competition?.trim().toLowerCase() === "world cup";
}

export function normalizeFixtureScope(value: string | null | undefined): FixtureScope {
  if (value === "live" || value === "completed" || value === "scheduled") return value;
  if (value === "upcoming") return "scheduled";
  return "analysis";
}

function isCompletedFixture(fixture: NormalizedFixture, now: number) {
  if (fixture.status && FINAL_STATUS_PATTERN.test(fixture.status)) return true;
  const start = startMs(fixture);
  return start > 0 && start < now - LIVE_WINDOW_MS;
}

function isLiveWindowFixture(fixture: NormalizedFixture, now: number) {
  const start = startMs(fixture);
  return (
    start > 0 &&
    start >= now - LIVE_WINDOW_MS &&
    start <= now + SCHEDULED_GRACE_MS &&
    !isCompletedFixture(fixture, now)
  );
}

function isScheduledFixture(fixture: NormalizedFixture, now: number) {
  const start = startMs(fixture);
  return start === 0 || start > now + SCHEDULED_GRACE_MS;
}

function sortFixtures(
  fixtures: NormalizedFixture[],
  scope: FixtureScope,
  now: number,
) {
  return [...fixtures].sort((a, b) => {
    const aStart = startMs(a);
    const bStart = startMs(b);
    if (scope === "completed") return bStart - aStart;
    if (scope === "scheduled") return aStart - bStart;
    return Math.abs(aStart - now) - Math.abs(bStart - now) || aStart - bStart;
  });
}

export function buildLiveFixturePreview({
  fixtures,
  network,
  freeTiers,
  limit = 120,
  now = Date.now(),
  competitionId = 72,
  scope = "analysis",
}: {
  fixtures: NormalizedFixture[];
  network: "devnet" | "mainnet";
  freeTiers: readonly { id: number; latency: string }[];
  limit?: number;
  now?: number;
  competitionId?: number | string;
  scope?: FixtureScope;
}): LiveFixturePreview {
  const competitionFixtures = fixtures
    .filter((fixture) => fixture.fixtureId !== "unknown-fixture")
    .filter((fixture) => isCompetitionFixture(fixture, competitionId));
  const scoped = competitionFixtures.filter((fixture) => {
    if (scope === "live") return isLiveWindowFixture(fixture, now);
    if (scope === "completed") return isCompletedFixture(fixture, now);
    if (scope === "scheduled") return isScheduledFixture(fixture, now);
    return true;
  });
  const normalized = sortFixtures(scoped, scope, now);

  return {
    network,
    source: "TxLINE World Cup Free Tier",
    scope,
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
  const outcomePoints = points.filter((point) => isOutcomeSelection(point.selection));

  for (const point of outcomePoints) {
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
