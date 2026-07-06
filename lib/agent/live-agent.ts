import { createDecisionReceipt, STRATEGY_VERSION } from "@/lib/agent/receipt";
import { evaluateRisk } from "@/lib/agent/risk";
import {
  createLiveMarketScanSignal,
  detectSignals,
} from "@/lib/agent/signals";
import { createInitialAgentState, cumulativePnlUnits } from "@/lib/agent/state";
import type {
  DecisionReceipt,
  PaperPosition,
  RiskDecision,
  Signal,
} from "@/lib/agent/types";
import { applyPaperExecution } from "@/lib/agent/execution";
import type {
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "@/lib/txline/types";
import { isOutcomeSelection } from "@/lib/txline/live-summary";

type StoredLiveAgentState = ReturnType<typeof createInitialAgentState> & {
  latestOdds: NormalizedOddsPoint[];
  latestScore?: NormalizedScoreUpdate;
  priorOdds: NormalizedOddsPoint[];
};

export type LiveAgentTickResult = {
  mode: "live-agent";
  fixtureId: string;
  tickedAt: number;
  strategyVersion: string;
  inputSummary: {
    oddsCount: number;
    scoreCount: number;
    latestOddsTs?: number;
    latestScoreTs?: number;
    suspended: boolean;
  };
  signals: Signal[];
  riskDecisions: RiskDecision[];
  positions: PaperPosition[];
  receipts: DecisionReceipt[];
  latestReceipt?: DecisionReceipt;
};

const selectionOrder = new Map([
  ["P1", 0],
  ["DRAW", 1],
  ["P2", 2],
]);

const liveStates = new Map<string, StoredLiveAgentState>();

function stateForFixture(fixtureId: string) {
  const existing = liveStates.get(fixtureId);
  if (existing) return existing;

  const created: StoredLiveAgentState = {
    ...createInitialAgentState(),
    latestOdds: [],
    priorOdds: [],
  };
  liveStates.set(fixtureId, created);
  return created;
}

function sortOdds(points: NormalizedOddsPoint[]) {
  return [...points].sort((a, b) => {
    const selectionDelta =
      (selectionOrder.get(a.selection) ?? 99) - (selectionOrder.get(b.selection) ?? 99);
    return selectionDelta || a.selection.localeCompare(b.selection) || b.ts - a.ts;
  });
}

function latestOddsSnapshot(points: NormalizedOddsPoint[]) {
  const latestByKey = new Map<string, NormalizedOddsPoint>();
  for (const point of points) {
    const key = `${point.market}:${point.selection}`;
    const previous = latestByKey.get(key);
    if (!previous || point.ts > previous.ts || (point.ts === previous.ts && (point.seq ?? 0) > (previous.seq ?? 0))) {
      latestByKey.set(key, point);
    }
  }
  return sortOdds([...latestByKey.values()]);
}

function latestScoreSnapshot(scores: NormalizedScoreUpdate[]) {
  return [...scores].sort((a, b) => b.ts - a.ts || (b.seq ?? 0) - (a.seq ?? 0))[0];
}

function oddsSeq(points: NormalizedOddsPoint[]) {
  return points.find((point) => point.seq !== undefined)?.seq;
}

export function runLiveAgentTick({
  fixtureId,
  now = Date.now(),
  odds,
  scores,
}: {
  fixtureId: string;
  now?: number;
  odds: NormalizedOddsPoint[];
  scores: NormalizedScoreUpdate[];
}): LiveAgentTickResult {
  const state = stateForFixture(fixtureId);
  const strategyOdds = odds.filter((point) => isOutcomeSelection(point.selection));
  const latestOdds = latestOddsSnapshot(strategyOdds);
  const latestScore = latestScoreSnapshot(scores);
  const previousLatestOdds = state.latestOdds;
  const previousScore = state.latestScore;

  let tickSignals = detectSignals({
    fixtureId,
    now,
    mode: "live",
    currentOdds: latestOdds,
    priorOdds: state.priorOdds,
    latestOdds,
    previousLatestOdds,
    currentScore: latestScore,
    previousScore,
    latestScore,
  });

  if (tickSignals.length === 0) {
    tickSignals = [
      createLiveMarketScanSignal({
        fixtureId,
        now,
        latestOdds,
        latestScore,
        previousLatestOdds,
        previousScore,
        oddsCount: odds.length,
        scoreCount: scores.length,
      }),
    ];
  }

  const tickRiskDecisions: RiskDecision[] = [];
  const tickReceipts: DecisionReceipt[] = [];

  for (const signal of tickSignals) {
    state.signals.push(signal);

    const riskDecision = evaluateRisk(signal, {
      mode: "live",
      now,
      latestOdds,
      latestScore,
      positions: state.positions,
      cumulativePnlUnits: cumulativePnlUnits(state.positions),
    });
    tickRiskDecisions.push(riskDecision);
    state.riskDecisions.push(riskDecision);

    const execution = applyPaperExecution({
      signal,
      riskDecision,
      positions: state.positions,
      latestOdds,
    });
    state.positions = execution.positions;

    const receipt = createDecisionReceipt({
      fixtureId,
      signal,
      riskDecision,
      action: riskDecision.finalAction,
      paperPositionId: execution.paperPositionId,
      proofReference: {
        source: "txline",
        fixtureId,
        scoreSeq: latestScore?.seq,
        oddsSeq: oddsSeq(latestOdds),
        note: "Derived from a server-side live TxLINE agent tick; no raw TxODDS response is included.",
      },
    });
    state.receipts.push(receipt);
    tickReceipts.push(receipt);
  }

  state.latestOdds = latestOdds;
  state.latestScore = latestScore;
  state.priorOdds = [...state.priorOdds, ...latestOdds].slice(-120);

  return {
    mode: "live-agent",
    fixtureId,
    tickedAt: now,
    strategyVersion: STRATEGY_VERSION,
    inputSummary: {
      oddsCount: odds.length,
      scoreCount: scores.length,
      latestOddsTs: latestOdds.length > 0 ? Math.max(...latestOdds.map((point) => point.ts)) : undefined,
      latestScoreTs: latestScore?.ts,
      suspended: latestOdds.some((point) => point.suspended),
    },
    signals: tickSignals,
    riskDecisions: tickRiskDecisions,
    positions: state.positions,
    receipts: tickReceipts,
    latestReceipt: tickReceipts.at(-1),
  };
}
