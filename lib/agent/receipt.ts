import { sha256 } from "@/lib/utils/hash";
import { stableJson } from "@/lib/utils/stable-json";
import type { DecisionReceipt, RiskDecision, Signal } from "./types";

export const STRATEGY_VERSION = "edgekeeper-demo-v1";

export function createDecisionReceipt({
  fixtureId,
  signal,
  riskDecision,
  action,
  paperPositionId,
  proofReference,
}: {
  fixtureId: string;
  signal: Signal;
  riskDecision: RiskDecision;
  action: string;
  paperPositionId?: string;
  proofReference?: DecisionReceipt["proofReference"];
}): DecisionReceipt {
  const inputHash = signal.inputHash;
  const receiptPayload = {
    fixtureId,
    signal,
    riskDecision,
    action,
    paperPositionId,
    inputHash,
  };
  const receiptHash = sha256(stableJson(receiptPayload));

  return {
    id: `rcpt_${receiptHash.slice(0, 14)}`,
    fixtureId,
    createdAt: signal.ts,
    strategyVersion: STRATEGY_VERSION,
    signal,
    riskDecision,
    action,
    paperPositionId,
    inputHash,
    receiptHash,
    proofReference,
  };
}
