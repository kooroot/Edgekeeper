import { z } from "zod";
import type {
  NormalizedFixture,
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "./types";

const passthroughObject = z.object({}).passthrough();

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): LooseRecord {
  return passthroughObject.parse(isRecord(value) ? value : {});
}

function keyFingerprint(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getField(record: LooseRecord, names: string[]) {
  for (const name of names) {
    if (name in record) return record[name];
  }

  const wanted = names.map(keyFingerprint);
  const foundKey = Object.keys(record).find((key) =>
    wanted.includes(keyFingerprint(key)),
  );

  return foundKey ? record[foundKey] : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}

function normalizeTimestamp(value: unknown): number | undefined {
  const numeric = toNumber(value);
  if (numeric !== undefined) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }

  const stringValue = toStringValue(value);
  if (!stringValue) return undefined;
  const parsed = Date.parse(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMarket(value: unknown): NormalizedOddsPoint["market"] {
  const raw = toStringValue(value)?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return "UNKNOWN";
  if (["1X2", "THREEWAY", "FULLTIME1X2"].includes(raw)) return "1X2";
  if (["MATCHWINNER", "WINNER", "MONEYLINE"].includes(raw)) {
    return "MATCH_WINNER";
  }
  return "UNKNOWN";
}

function normalizeSelection(value: unknown): NormalizedOddsPoint["selection"] {
  const original = toStringValue(value);
  const raw = original?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return "P1";
  if (["1", "P1", "HOME", "H", "PARTICIPANT1", "TEAM1"].includes(raw)) {
    return "P1";
  }
  if (["X", "DRAW", "D", "TIE"].includes(raw)) return "DRAW";
  if (["2", "P2", "AWAY", "A", "PARTICIPANT2", "TEAM2"].includes(raw)) {
    return "P2";
  }
  return original ?? raw;
}

function selectionFromPriceName(value: unknown): NormalizedOddsPoint["selection"] {
  const raw = toStringValue(value)?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (["HOME", "P1", "1", "PARTICIPANT1"].includes(raw ?? "")) return "P1";
  if (["AWAY", "P2", "2", "PARTICIPANT2"].includes(raw ?? "")) return "P2";
  if (["DRAW", "X", "TIE"].includes(raw ?? "")) return "DRAW";
  return normalizeSelection(value);
}

function probabilityFromPct(value: unknown): number | undefined {
  const numeric = toNumber(value);
  if (numeric === undefined || numeric < 0) return undefined;
  const probability = numeric > 1 ? numeric / 100 : numeric;
  if (probability > 1) return undefined;
  return Number(probability.toFixed(6));
}

function normalizeStats(value: unknown): Record<string, number> | undefined {
  if (Array.isArray(value)) {
    const stats: Record<string, number> = {};
    for (const item of value) {
      const record = asRecord(item);
      const key = toStringValue(
        getField(record, ["key", "statKey", "StatKey", "id", "StatId"]),
      );
      const statValue = toNumber(getField(record, ["value", "Value", "count", "Count"]));
      if (key && statValue !== undefined) stats[key] = statValue;
    }
    return Object.keys(stats).length > 0 ? stats : undefined;
  }

  if (!isRecord(value)) return undefined;

  const stats: Record<string, number> = {};
  for (const [key, statValue] of Object.entries(value)) {
    const numeric = toNumber(statValue);
    if (numeric !== undefined) stats[key] = numeric;
  }
  return Object.keys(stats).length > 0 ? stats : undefined;
}

function unwrapArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];

  for (const key of ["data", "Data", "items", "Items", "fixtures", "odds", "scores"]) {
    const nested = input[key];
    if (Array.isArray(nested)) return nested;
  }

  return [input];
}

export function impliedProbabilityFromDecimal(decimalOdds?: number) {
  if (!decimalOdds || decimalOdds <= 0) return undefined;
  return Number((1 / decimalOdds).toFixed(6));
}

export function normalizeFixture(input: unknown): NormalizedFixture {
  const record = asRecord(input);
  const fixtureId = toStringValue(getField(record, ["fixtureId", "FixtureId", "id", "Id"]));
  const participant1 = toStringValue(
    getField(record, ["participant1", "Participant1", "home", "HomeTeam", "team1"]),
  );
  const participant2 = toStringValue(
    getField(record, ["participant2", "Participant2", "away", "AwayTeam", "team2"]),
  );

  const startTimestamp = normalizeTimestamp(
    getField(record, ["startTime", "StartTime", "startTimeMs", "StartTimeMs", "kickoff"]),
  );
  const startText = toStringValue(
    getField(record, ["startTime", "StartTime", "startTimeMs", "StartTimeMs", "kickoff"]),
  );

  return {
    fixtureId: fixtureId ?? "unknown-fixture",
    participant1: participant1 ?? "Participant 1",
    participant2: participant2 ?? "Participant 2",
    participant1IsHome: toBoolean(
      getField(record, ["participant1IsHome", "Participant1IsHome", "isHome"]),
    ),
    startTime: startTimestamp ? new Date(startTimestamp).toISOString() : startText,
    status: toStringValue(getField(record, ["status", "Status", "phase", "Phase"])),
    competitionId:
      toNumber(getField(record, ["competitionId", "CompetitionId"])) ??
      toStringValue(getField(record, ["competitionId", "CompetitionId"])),
    competition: toStringValue(getField(record, ["competition", "Competition"])),
  };
}

export function normalizeFixtures(input: unknown): NormalizedFixture[] {
  return unwrapArray(input).map(normalizeFixture);
}

export function normalizeOddsPoint(
  input: unknown,
  fallbackFixtureId?: string,
): NormalizedOddsPoint {
  const record = asRecord(input);
  const fixtureId =
    toStringValue(getField(record, ["fixtureId", "FixtureId", "fixture_id"])) ??
    fallbackFixtureId ??
    "unknown-fixture";
  const decimalCandidate = toNumber(
    getField(record, ["decimalOdds", "DecimalOdds", "odds", "Odds", "price", "Price"]),
  );
  const explicitProbability = toNumber(
    getField(record, [
      "impliedProbability",
      "ImpliedProbability",
      "probability",
      "Probability",
      "fairProbability",
      "FairProbability",
    ]),
  );
  const decimalOdds =
    decimalCandidate !== undefined && decimalCandidate > 1 ? decimalCandidate : undefined;
  const impliedProbability =
    explicitProbability ??
    (decimalCandidate !== undefined && decimalCandidate > 0 && decimalCandidate <= 1
      ? decimalCandidate
      : impliedProbabilityFromDecimal(decimalOdds));

  return {
    fixtureId,
    ts:
      normalizeTimestamp(getField(record, ["ts", "Ts", "timestamp", "Timestamp", "time"])) ??
      Date.now(),
    seq: toNumber(getField(record, ["seq", "Seq", "sequence", "Sequence"])),
    market: normalizeMarket(getField(record, ["market", "Market", "marketType", "MarketType"])),
    selection: normalizeSelection(
      getField(record, ["selection", "Selection", "outcome", "Outcome", "name", "Name"]),
    ),
    decimalOdds,
    impliedProbability,
    suspended: toBoolean(getField(record, ["suspended", "Suspended", "isSuspended"])),
    source:
      toStringValue(getField(record, ["source", "Source"])) === "replay" ? "replay" : "txline",
  };
}

export function normalizeOddsPoints(
  input: unknown,
  fallbackFixtureId?: string,
): NormalizedOddsPoint[] {
  return unwrapArray(input).flatMap((point) => {
    const record = asRecord(point);
    const priceNames = getField(record, ["priceNames", "PriceNames"]);
    if (!Array.isArray(priceNames)) return [normalizeOddsPoint(point, fallbackFixtureId)];

    const prices = getField(record, ["prices", "Prices"]);
    const pct = getField(record, ["pct", "Pct"]);
    const fixtureId =
      toStringValue(getField(record, ["fixtureId", "FixtureId", "fixture_id"])) ??
      fallbackFixtureId ??
      "unknown-fixture";
    const ts =
      normalizeTimestamp(getField(record, ["ts", "Ts", "timestamp", "Timestamp", "time"])) ??
      Date.now();
    const market = normalizeMarket(
      getField(record, ["superOddsType", "SuperOddsType", "market", "Market"]),
    );
    const suspended = toBoolean(getField(record, ["suspended", "Suspended", "isSuspended"]));

    return priceNames.map((name, index) => {
      const price = Array.isArray(prices) ? toNumber(prices[index]) : undefined;
      const impliedProbability = probabilityFromPct(Array.isArray(pct) ? pct[index] : undefined);
      return {
        fixtureId,
        ts,
        seq: toNumber(getField(record, ["seq", "Seq", "sequence", "Sequence"])),
        market,
        selection: selectionFromPriceName(name),
        decimalOdds: price !== undefined && price > 1 && price < 100 ? price : undefined,
        impliedProbability,
        suspended,
        source: "txline" as const,
      };
    });
  });
}

export function normalizeScoreUpdate(
  input: unknown,
  fallbackFixtureId?: string,
): NormalizedScoreUpdate {
  const record = asRecord(input);
  const fixtureId =
    toStringValue(getField(record, ["fixtureId", "FixtureId", "fixture_id"])) ??
    fallbackFixtureId ??
    "unknown-fixture";
  const stats = normalizeStats(getField(record, ["stats", "Stats", "statistics", "Statistics"]));
  const clock = asRecord(getField(record, ["clock", "Clock"]));
  const clockSeconds = toNumber(getField(clock, ["seconds", "Seconds"]));

  return {
    fixtureId,
    ts:
      normalizeTimestamp(getField(record, ["ts", "Ts", "timestamp", "Timestamp", "time"])) ??
      Date.now(),
    seq: toNumber(getField(record, ["seq", "Seq", "sequence", "Sequence"])),
    phaseId: toNumber(
      getField(record, ["phaseId", "PhaseId", "statusId", "StatusId", "gamePhase", "GamePhase"]),
    ),
    minute:
      toNumber(getField(record, ["minute", "Minute", "gameMinute", "GameMinute"])) ??
      (clockSeconds !== undefined ? Math.floor(clockSeconds / 60) : undefined),
    participant1Score: toNumber(
      getField(record, [
        "participant1Score",
        "Participant1Score",
        "p1Score",
        "homeScore",
        "score1",
      ]),
    ) ?? stats?.["1"],
    participant2Score: toNumber(
      getField(record, [
        "participant2Score",
        "Participant2Score",
        "p2Score",
        "awayScore",
        "score2",
      ]),
    ) ?? stats?.["2"],
    stats,
    rawSummary: toStringValue(
      getField(record, ["rawSummary", "RawSummary", "summary", "Summary", "gameState"]),
    ),
    source:
      toStringValue(getField(record, ["source", "Source"])) === "replay" ? "replay" : "txline",
  };
}

export function normalizeScoreUpdates(
  input: unknown,
  fallbackFixtureId?: string,
): NormalizedScoreUpdate[] {
  return unwrapArray(input).map((score) => normalizeScoreUpdate(score, fallbackFixtureId));
}
