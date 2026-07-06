import { describe, expect, it } from "vitest";
import { createDecisionReceipt } from "../lib/agent/receipt";
import type { RiskDecision, Signal } from "../lib/agent/types";

const signal: Signal = {
  id: "sig-receipt",
  fixtureId: "fixture-test",
  ts: 123_000,
  type: "MOMENTUM_SHIFT",
  severity: "MEDIUM",
  title: "Momentum",
  description: "test",
  confidence: 0.7,
  suggestedAction: "OPEN_P1",
  inputHash: "input-hash",
};

const riskDecision: RiskDecision = {
  signalId: signal.id,
  status: "PASS",
  finalAction: "OPEN_P1",
  checks: [
    {
      name: "Max exposure",
      status: "PASS",
      reason: "100/300 demo units after action",
    },
  ],
};

describe("receipt", () => {
  it("generates stable deterministic receipt hashes", () => {
    const first = createDecisionReceipt({
      fixtureId: signal.fixtureId,
      signal,
      riskDecision,
      action: "OPEN_P1",
      paperPositionId: "pos-1",
    });
    const second = createDecisionReceipt({
      fixtureId: signal.fixtureId,
      signal,
      riskDecision,
      action: "OPEN_P1",
      paperPositionId: "pos-1",
    });

    expect(first.receiptHash).toBe(second.receiptHash);
    expect(first.id).toBe(second.id);
  });
});
