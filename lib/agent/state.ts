import type { DecisionReceipt, PaperPosition, RiskDecision, Signal } from "./types";

export type AgentState = {
  signals: Signal[];
  riskDecisions: RiskDecision[];
  positions: PaperPosition[];
  receipts: DecisionReceipt[];
};

export function createInitialAgentState(): AgentState {
  return {
    signals: [],
    riskDecisions: [],
    positions: [],
    receipts: [],
  };
}

export function cumulativePnlUnits(positions: PaperPosition[]) {
  return Number(
    positions
      .filter((position) => position.status === "CLOSED")
      .reduce((total, position) => total + (position.pnlUnits ?? 0), 0)
      .toFixed(2),
  );
}
