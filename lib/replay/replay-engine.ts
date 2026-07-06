import type {
  NormalizedFixture,
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "@/lib/txline/types";
import { applyPaperExecution } from "@/lib/agent/execution";
import { createDecisionReceipt } from "@/lib/agent/receipt";
import { evaluateRisk } from "@/lib/agent/risk";
import { detectSignals } from "@/lib/agent/signals";
import { createInitialAgentState, cumulativePnlUnits } from "@/lib/agent/state";
import type { DecisionReceipt, PaperPosition, RiskDecision, Signal } from "@/lib/agent/types";
import { getDemoFixture, getDemoOddsUpdates, getDemoScoreUpdates } from "./sample-data";

export type ReplayEvent = {
  ts: number;
  offsetSec: number;
  odds: NormalizedOddsPoint[];
  score?: NormalizedScoreUpdate;
};

export type MarketState = {
  fixture: NormalizedFixture;
  now: number;
  latestOdds: NormalizedOddsPoint[];
  latestScore?: NormalizedScoreUpdate;
  lastOddsTs?: number;
  lastScoreTs?: number;
  suspended: boolean;
};

export type ReplayFrame = {
  index: number;
  ts: number;
  offsetSec: number;
  market: MarketState;
  signals: Signal[];
  riskDecisions: RiskDecision[];
  positions: PaperPosition[];
  receipts: DecisionReceipt[];
  newSignalIds: string[];
  newReceiptIds: string[];
};

export type ReplayRun = {
  mode: "replay";
  fixture: NormalizedFixture;
  durationSec: number;
  events: ReplayEvent[];
  frames: ReplayFrame[];
  receipts: DecisionReceipt[];
};

const selectionOrder = new Map([
  ["P1", 0],
  ["DRAW", 1],
  ["P2", 2],
]);

function sortOdds(points: NormalizedOddsPoint[]) {
  return [...points].sort((a, b) => {
    const selectionDelta =
      (selectionOrder.get(a.selection) ?? 99) - (selectionOrder.get(b.selection) ?? 99);
    return selectionDelta || a.selection.localeCompare(b.selection);
  });
}

function buildEvents(
  oddsUpdates: NormalizedOddsPoint[],
  scoreUpdates: NormalizedScoreUpdate[],
): ReplayEvent[] {
  const eventMap = new Map<number, ReplayEvent>();
  const allTimestamps = [...oddsUpdates.map((point) => point.ts), ...scoreUpdates.map((score) => score.ts)];
  const startTs = Math.min(...allTimestamps);

  for (const point of oddsUpdates) {
    const event = eventMap.get(point.ts) ?? {
      ts: point.ts,
      offsetSec: Math.round((point.ts - startTs) / 1000),
      odds: [],
    };
    event.odds.push(point);
    eventMap.set(point.ts, event);
  }

  for (const score of scoreUpdates) {
    const event = eventMap.get(score.ts) ?? {
      ts: score.ts,
      offsetSec: Math.round((score.ts - startTs) / 1000),
      odds: [],
    };
    event.score = score;
    eventMap.set(score.ts, event);
  }

  return [...eventMap.values()]
    .map((event) => ({ ...event, odds: sortOdds(event.odds) }))
    .sort((a, b) => a.ts - b.ts);
}

function oddsSeq(points: NormalizedOddsPoint[]) {
  return points.find((point) => point.seq !== undefined)?.seq;
}

function snapshotMarket(
  fixture: NormalizedFixture,
  now: number,
  latestOdds: Map<string, NormalizedOddsPoint>,
  latestScore?: NormalizedScoreUpdate,
): MarketState {
  const odds = sortOdds([...latestOdds.values()]);
  return {
    fixture,
    now,
    latestOdds: odds,
    latestScore,
    lastOddsTs: odds.length > 0 ? Math.max(...odds.map((point) => point.ts)) : undefined,
    lastScoreTs: latestScore?.ts,
    suspended: odds.some((point) => point.suspended),
  };
}

export function buildReplayRun(): ReplayRun {
  const fixture = getDemoFixture();
  const oddsUpdates = getDemoOddsUpdates();
  const scoreUpdates = getDemoScoreUpdates();
  const events = buildEvents(oddsUpdates, scoreUpdates);
  const state = createInitialAgentState();
  const latestOdds = new Map<string, NormalizedOddsPoint>();
  const priorOdds: NormalizedOddsPoint[] = [];
  const frames: ReplayFrame[] = [];
  let latestScore: NormalizedScoreUpdate | undefined;

  for (const event of events) {
    const previousLatestOdds = sortOdds([...latestOdds.values()]);
    const previousScore = latestScore;

    for (const point of event.odds) {
      latestOdds.set(point.selection, point);
    }
    if (event.score) {
      latestScore = event.score;
    }

    const market = snapshotMarket(fixture, event.ts, latestOdds, latestScore);
    const newSignals = detectSignals({
      fixtureId: fixture.fixtureId,
      now: event.ts,
      mode: "replay",
      currentOdds: event.odds,
      priorOdds,
      latestOdds: market.latestOdds,
      previousLatestOdds,
      currentScore: event.score,
      previousScore,
      latestScore,
    });

    const newReceiptIds: string[] = [];

    for (const signal of newSignals) {
      state.signals.push(signal);
      const riskDecision = evaluateRisk(signal, {
        mode: "replay",
        now: event.ts,
        latestOdds: market.latestOdds,
        latestScore,
        positions: state.positions,
        cumulativePnlUnits: cumulativePnlUnits(state.positions),
      });
      state.riskDecisions.push(riskDecision);

      const execution = applyPaperExecution({
        signal,
        riskDecision,
        positions: state.positions,
        latestOdds: market.latestOdds,
      });
      state.positions = execution.positions;

      const receipt = createDecisionReceipt({
        fixtureId: fixture.fixtureId,
        signal,
        riskDecision,
        action: riskDecision.finalAction,
        paperPositionId: execution.paperPositionId,
        proofReference: {
          source: "replay",
          fixtureId: fixture.fixtureId,
          scoreSeq: event.score?.seq ?? latestScore?.seq,
          oddsSeq: oddsSeq(event.odds) ?? oddsSeq(market.latestOdds),
          note: "Derived from local replay packets; no raw TxODDS response is included.",
        },
      });
      state.receipts.push(receipt);
      newReceiptIds.push(receipt.id);
    }

    priorOdds.push(...event.odds);

    frames.push({
      index: frames.length,
      ts: event.ts,
      offsetSec: event.offsetSec,
      market: snapshotMarket(fixture, event.ts, latestOdds, latestScore),
      signals: [...state.signals],
      riskDecisions: [...state.riskDecisions],
      positions: [...state.positions],
      receipts: [...state.receipts],
      newSignalIds: newSignals.map((signal) => signal.id),
      newReceiptIds,
    });
  }

  const durationSec = frames.at(-1)?.offsetSec ?? 0;

  return {
    mode: "replay",
    fixture,
    durationSec,
    events,
    frames,
    receipts: state.receipts,
  };
}

export function findReplayReceipt(id: string) {
  return buildReplayRun().receipts.find((receipt) => receipt.id === id);
}
