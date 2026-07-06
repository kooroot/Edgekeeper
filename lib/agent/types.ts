export type Signal = {
  id: string;
  fixtureId: string;
  ts: number;
  type:
    | "ODDS_VELOCITY"
    | "SCORE_PRICE_DIVERGENCE"
    | "MOMENTUM_SHIFT"
    | "STALE_FEED"
    | "SUSPENSION_GUARD";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  confidence: number;
  suggestedAction: "OPEN_P1" | "OPEN_DRAW" | "OPEN_P2" | "CLOSE" | "NOOP" | "BLOCK";
  inputHash: string;
};

export type RiskCheck = {
  name: string;
  status: "PASS" | "BLOCK";
  reason: string;
};

export type RiskDecision = {
  signalId: string;
  status: "PASS" | "BLOCK";
  checks: RiskCheck[];
  finalAction: string;
};

export type PaperPosition = {
  id: string;
  fixtureId: string;
  side: "P1" | "DRAW" | "P2";
  openedAt: number;
  closedAt?: number;
  entryProbability: number;
  exitProbability?: number;
  entryDecimalOdds?: number;
  exitDecimalOdds?: number;
  probabilityDelta?: number;
  stakeUnits: number;
  pnlUnits?: number;
  status: "OPEN" | "CLOSED" | "BLOCKED";
};

export type DecisionReceipt = {
  id: string;
  fixtureId: string;
  createdAt: number;
  strategyVersion: string;
  signal: Signal;
  riskDecision: RiskDecision;
  action: string;
  paperPositionId?: string;
  inputHash: string;
  receiptHash: string;
  proofReference?: {
    source: "txline" | "replay";
    fixtureId: string;
    scoreSeq?: number;
    oddsSeq?: number;
    note: string;
  };
};
