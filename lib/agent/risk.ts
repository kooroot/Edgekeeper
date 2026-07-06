import type { NormalizedOddsPoint, NormalizedScoreUpdate } from "@/lib/txline/types";
import type { PaperPosition, RiskCheck, RiskDecision, Signal } from "./types";

export const FINAL_PHASE_IDS = new Set([5, 10, 13]);

export type RiskMode = "replay" | "live";

export type RiskLimits = {
  maxExposureUnits: number;
  perTradeStakeUnits: number;
  maxOpenPositions: number;
  staleBlockMs: number;
  drawdownBlockUnits: number;
};

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxExposureUnits: 300,
  perTradeStakeUnits: 100,
  maxOpenPositions: 3,
  staleBlockMs: 90_000,
  drawdownBlockUnits: -200,
};

export type RiskContext = {
  mode: RiskMode;
  now: number;
  latestOdds: NormalizedOddsPoint[];
  latestScore?: NormalizedScoreUpdate;
  positions: PaperPosition[];
  cumulativePnlUnits: number;
};

function isOpeningAction(action: string) {
  return action === "OPEN_P1" || action === "OPEN_DRAW" || action === "OPEN_P2";
}

function check(name: string, blocked: boolean, reason: string): RiskCheck {
  return {
    name,
    status: blocked ? "BLOCK" : "PASS",
    reason,
  };
}

export function evaluateRisk(
  signal: Signal,
  context: RiskContext,
  limits: RiskLimits = DEFAULT_RISK_LIMITS,
): RiskDecision {
  const openPositions = context.positions.filter((position) => position.status === "OPEN");
  const exposure = openPositions.reduce((total, position) => total + position.stakeUnits, 0);
  const opening = isOpeningAction(signal.suggestedAction);
  const latestOddsTs = Math.max(...context.latestOdds.map((point) => point.ts), 0);
  const latestScoreTs = context.latestScore?.ts ?? 0;
  const freshnessBase = Math.min(latestOddsTs || context.now, latestScoreTs || context.now);
  const feedAge = context.now - freshnessBase;
  const suspended = context.latestOdds.some((point) => point.suspended);
  const ended = context.latestScore?.phaseId
    ? FINAL_PHASE_IDS.has(context.latestScore.phaseId)
    : false;

  const checks: RiskCheck[] = [
    check(
      "Max exposure",
      opening && exposure + limits.perTradeStakeUnits > limits.maxExposureUnits,
      opening
        ? `${exposure + limits.perTradeStakeUnits}/${limits.maxExposureUnits} notional units after action`
        : `${exposure}/${limits.maxExposureUnits} notional units currently exposed`,
    ),
    check(
      "Per trade stake",
      opening && limits.perTradeStakeUnits > 100,
      `${limits.perTradeStakeUnits} notional units per simulated trade`,
    ),
    check(
      "Max open positions",
      opening && openPositions.length >= limits.maxOpenPositions,
      `${openPositions.length}/${limits.maxOpenPositions} open positions`,
    ),
    check(
      "Stale feed block",
      context.mode === "live" && (feedAge > limits.staleBlockMs || !latestOddsTs || !latestScoreTs),
      context.mode === "live"
        ? `oldest required live update age is ${Math.round(feedAge / 1000)}s`
        : "replay mode uses a deterministic local update sequence",
    ),
    check(
      "Suspended market block",
      suspended,
      suspended ? "latest odds packet is suspended" : "latest market is eligible for simulation",
    ),
    check(
      "Ended match block",
      opening && ended,
      ended ? `phase ${context.latestScore?.phaseId} is final` : "fixture is not final",
    ),
    check(
      "Drawdown guard",
      context.cumulativePnlUnits <= limits.drawdownBlockUnits,
      `${context.cumulativePnlUnits.toFixed(2)} notional units cumulative PnL`,
    ),
  ];

  const blocked = signal.suggestedAction === "BLOCK" || checks.some((item) => item.status === "BLOCK");

  return {
    signalId: signal.id,
    status: blocked ? "BLOCK" : "PASS",
    checks,
    finalAction: blocked ? "BLOCK" : signal.suggestedAction,
  };
}
