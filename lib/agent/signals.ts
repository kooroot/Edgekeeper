import type { NormalizedOddsPoint, NormalizedScoreUpdate } from "@/lib/txline/types";
import { sha256 } from "@/lib/utils/hash";
import { stableJson } from "@/lib/utils/stable-json";
import type { Signal } from "./types";

const DEFAULT_VELOCITY_WINDOW_MS = 120_000;
const DEFAULT_VELOCITY_THRESHOLD = 0.04;
const DEFAULT_STALE_THRESHOLD_MS = 90_000;

export type SignalEngineInput = {
  fixtureId: string;
  now: number;
  mode: "replay" | "live";
  currentOdds: NormalizedOddsPoint[];
  priorOdds: NormalizedOddsPoint[];
  latestOdds: NormalizedOddsPoint[];
  previousLatestOdds: NormalizedOddsPoint[];
  currentScore?: NormalizedScoreUpdate;
  previousScore?: NormalizedScoreUpdate;
  latestScore?: NormalizedScoreUpdate;
  staleThresholdMs?: number;
};

export function calculateImpliedProbability(decimalOdds?: number) {
  if (!decimalOdds || decimalOdds <= 0) return undefined;
  return Number((1 / decimalOdds).toFixed(6));
}

export function oddsProbability(point?: NormalizedOddsPoint) {
  if (!point) return undefined;
  return point.impliedProbability ?? calculateImpliedProbability(point.decimalOdds);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function severityFromScore(score: number): Signal["severity"] {
  if (score >= 0.08) return "HIGH";
  if (score >= 0.055) return "MEDIUM";
  return "LOW";
}

function signalHash(input: unknown) {
  return sha256(stableJson(input));
}

function makeSignal(
  partial: Omit<Signal, "id" | "inputHash"> & { input: unknown; discriminator: string },
): Signal {
  const inputHash = signalHash(partial.input);
  return {
    id: `sig_${partial.type.toLowerCase()}_${partial.ts}_${inputHash.slice(0, 10)}`,
    fixtureId: partial.fixtureId,
    ts: partial.ts,
    type: partial.type,
    severity: partial.severity,
    title: partial.title,
    description: partial.description,
    confidence: partial.confidence,
    suggestedAction: partial.suggestedAction,
    inputHash,
  };
}

function actionForSelection(selection: string): Signal["suggestedAction"] {
  if (selection === "P1") return "OPEN_P1";
  if (selection === "P2") return "OPEN_P2";
  if (selection === "DRAW") return "OPEN_DRAW";
  return "NOOP";
}

function selectionLabel(selection: string) {
  if (selection === "P1") return "Participant 1";
  if (selection === "P2") return "Participant 2";
  return selection;
}

function findLatestForSelection(
  points: NormalizedOddsPoint[],
  selection: string,
  beforeTs?: number,
) {
  return points
    .filter((point) => {
      if (point.selection !== selection || point.suspended) return false;
      return beforeTs === undefined ? true : point.ts < beforeTs;
    })
    .sort((a, b) => b.ts - a.ts)[0];
}

function scoreTotal(score?: NormalizedScoreUpdate) {
  return (score?.participant1Score ?? 0) + (score?.participant2Score ?? 0);
}

function scoreLeader(score?: NormalizedScoreUpdate): "P1" | "P2" | "DRAW" {
  const p1 = score?.participant1Score ?? 0;
  const p2 = score?.participant2Score ?? 0;
  if (p1 > p2) return "P1";
  if (p2 > p1) return "P2";
  return "DRAW";
}

function stat(score: NormalizedScoreUpdate | undefined, key: number) {
  return score?.stats?.[String(key)] ?? 0;
}

export function detectOddsVelocitySignal(input: SignalEngineInput): Signal | undefined {
  let best:
    | {
        point: NormalizedOddsPoint;
        previous: NormalizedOddsPoint;
        delta: number;
        probability: number;
        previousProbability: number;
      }
    | undefined;

  for (const point of input.currentOdds) {
    if (point.suspended) continue;
    const probability = oddsProbability(point);
    if (probability === undefined) continue;

    const previous = findLatestForSelection(input.priorOdds, point.selection, point.ts);
    const previousProbability = oddsProbability(previous);
    if (!previous || previousProbability === undefined) continue;
    if (point.ts - previous.ts > DEFAULT_VELOCITY_WINDOW_MS) continue;

    const delta = probability - previousProbability;
    if (Math.abs(delta) < DEFAULT_VELOCITY_THRESHOLD) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { point, previous, delta, probability, previousProbability };
    }
  }

  if (!best) return undefined;

  const absDelta = Math.abs(best.delta);
  const isIncrease = best.delta > 0;
  const suggestedAction = isIncrease ? actionForSelection(best.point.selection) : "CLOSE";

  return makeSignal({
    fixtureId: input.fixtureId,
    ts: best.point.ts,
    type: "ODDS_VELOCITY",
    severity: severityFromScore(absDelta),
    title: isIncrease
      ? `${selectionLabel(best.point.selection)} probability velocity`
      : `${selectionLabel(best.point.selection)} probability reversal`,
    description: `${selectionLabel(best.point.selection)} implied probability moved ${(
      best.delta * 100
    ).toFixed(1)} points inside ${Math.round((best.point.ts - best.previous.ts) / 1000)}s.`,
    confidence: Number(clamp(0.5 + absDelta * 5, 0.55, 0.96).toFixed(2)),
    suggestedAction,
    input: {
      current: best.point,
      previous: best.previous,
      delta: best.delta,
      strategy: "odds_velocity_v1",
    },
    discriminator: best.point.selection,
  });
}

export function detectScorePriceDivergenceSignal(
  input: SignalEngineInput,
): Signal | undefined {
  if (!input.currentScore || !input.previousScore) return undefined;
  if (scoreTotal(input.currentScore) === scoreTotal(input.previousScore)) return undefined;

  const leader = scoreLeader(input.currentScore);
  if (leader === "DRAW") return undefined;

  const before = input.previousLatestOdds.find((point) => point.selection === leader);
  const after = input.latestOdds.find((point) => point.selection === leader);
  const beforeProbability = oddsProbability(before);
  const afterProbability = oddsProbability(after);
  if (beforeProbability === undefined || afterProbability === undefined) return undefined;

  const priceDelta = afterProbability - beforeProbability;
  const barelyMoved = Math.abs(priceDelta) < 0.015;
  const aggressiveMove = Math.abs(priceDelta) > 0.08;
  if (!barelyMoved && !aggressiveMove) return undefined;

  const suggestedAction = barelyMoved ? actionForSelection(leader) : "NOOP";

  return makeSignal({
    fixtureId: input.fixtureId,
    ts: input.currentScore.ts,
    type: "SCORE_PRICE_DIVERGENCE",
    severity: aggressiveMove ? "HIGH" : "MEDIUM",
    title: barelyMoved ? "Score moved before price confirmation" : "Aggressive score repricing",
    description: `Score changed to ${input.currentScore.participant1Score ?? 0}-${
      input.currentScore.participant2Score ?? 0
    } while ${leader} probability moved ${(priceDelta * 100).toFixed(1)} points.`,
    confidence: Number((barelyMoved ? 0.74 : 0.68).toFixed(2)),
    suggestedAction,
    input: {
      currentScore: input.currentScore,
      previousScore: input.previousScore,
      before,
      after,
      leader,
      priceDelta,
      strategy: "score_price_divergence_v1",
    },
    discriminator: leader,
  });
}

export function detectMomentumShiftSignal(input: SignalEngineInput): Signal | undefined {
  if (!input.currentScore || !input.previousScore) return undefined;

  const p1CornerDelta = stat(input.currentScore, 7) - stat(input.previousScore, 7);
  const p2CornerDelta = stat(input.currentScore, 8) - stat(input.previousScore, 8);
  const p1RedDelta = stat(input.currentScore, 5) - stat(input.previousScore, 5);
  const p2RedDelta = stat(input.currentScore, 6) - stat(input.previousScore, 6);
  const p1YellowDelta = stat(input.currentScore, 3) - stat(input.previousScore, 3);
  const p2YellowDelta = stat(input.currentScore, 4) - stat(input.previousScore, 4);

  const p1Pressure = p1CornerDelta - p2CornerDelta + p2RedDelta * 3 + p2YellowDelta * 0.5;
  const p2Pressure = p2CornerDelta - p1CornerDelta + p1RedDelta * 3 + p1YellowDelta * 0.5;
  const side = p1Pressure >= 2 ? "P1" : p2Pressure >= 2 ? "P2" : undefined;
  if (!side) return undefined;

  const pressure = Math.max(p1Pressure, p2Pressure);

  return makeSignal({
    fixtureId: input.fixtureId,
    ts: input.currentScore.ts,
    type: "MOMENTUM_SHIFT",
    severity: pressure >= 4 ? "HIGH" : "MEDIUM",
    title: `${selectionLabel(side)} momentum shift`,
    description: `${selectionLabel(side)} pressure rose from corners/cards without waiting for a price dump.`,
    confidence: Number(clamp(0.58 + pressure * 0.08, 0.6, 0.9).toFixed(2)),
    suggestedAction: actionForSelection(side),
    input: {
      currentScore: input.currentScore,
      previousScore: input.previousScore,
      p1CornerDelta,
      p2CornerDelta,
      p1RedDelta,
      p2RedDelta,
      p1YellowDelta,
      p2YellowDelta,
      strategy: "momentum_shift_v1",
    },
    discriminator: side,
  });
}

export function detectSuspensionGuardSignal(input: SignalEngineInput): Signal | undefined {
  const suspendedPoint = input.currentOdds.find((point) => point.suspended);
  if (!suspendedPoint) return undefined;

  return makeSignal({
    fixtureId: input.fixtureId,
    ts: suspendedPoint.ts,
    type: "SUSPENSION_GUARD",
    severity: "HIGH",
    title: "Market suspension guard",
    description: "Latest odds packet marks the market as suspended, so the agent must not act.",
    confidence: 0.99,
    suggestedAction: "BLOCK",
    input: {
      suspendedPoint,
      strategy: "suspension_guard_v1",
    },
    discriminator: suspendedPoint.selection,
  });
}

export function detectStaleFeedGuardSignal(input: SignalEngineInput): Signal | undefined {
  const threshold = input.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
  const lastOddsTs = Math.max(...input.latestOdds.map((point) => point.ts), 0);
  const lastScoreTs = input.latestScore?.ts ?? 0;
  const oldestRequired = Math.min(lastOddsTs || input.now, lastScoreTs || input.now);
  const age = input.now - oldestRequired;
  if (age <= threshold) return undefined;

  return makeSignal({
    fixtureId: input.fixtureId,
    ts: input.now,
    type: "STALE_FEED",
    severity: "HIGH",
    title: "Feed freshness guard",
    description: `Required odds/score state is ${Math.round(age / 1000)}s old.`,
    confidence: 0.98,
    suggestedAction: "BLOCK",
    input: {
      lastOddsTs,
      lastScoreTs,
      now: input.now,
      threshold,
      strategy: "stale_feed_guard_v1",
    },
    discriminator: "stale",
  });
}

export function detectSignals(input: SignalEngineInput): Signal[] {
  return [
    detectSuspensionGuardSignal(input),
    detectOddsVelocitySignal(input),
    detectScorePriceDivergenceSignal(input),
    detectMomentumShiftSignal(input),
    detectStaleFeedGuardSignal(input),
  ].filter(Boolean) as Signal[];
}
