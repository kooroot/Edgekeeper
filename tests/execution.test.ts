import { describe, expect, it } from "vitest";
import { applyPaperExecution, calculatePaperPnl } from "../lib/agent/execution";
import type { RiskDecision, Signal } from "../lib/agent/types";

describe("execution", () => {
  it("marks paper execution PnL from probability movement", () => {
    expect(calculatePaperPnl(100, 0.4, 0.5)).toBe(25);
    expect(calculatePaperPnl(100, 0.5, 0.4)).toBe(-20);
  });

  it("stores TxLINE decimal odds on simulated positions", () => {
    const signal: Signal = {
      id: "sig-odds-value",
      fixtureId: "fixture-test",
      ts: 1_000,
      type: "ODDS_VELOCITY",
      severity: "HIGH",
      title: "Velocity",
      description: "P1 probability moved",
      confidence: 0.8,
      suggestedAction: "OPEN_P1",
      inputHash: "hash",
    };
    const riskDecision: RiskDecision = {
      signalId: signal.id,
      status: "PASS",
      checks: [],
      finalAction: "OPEN_P1",
    };

    const opened = applyPaperExecution({
      signal,
      riskDecision,
      positions: [],
      latestOdds: [
        {
          fixtureId: "fixture-test",
          ts: 1_000,
          market: "1X2",
          selection: "P1",
          decimalOdds: 2.2,
          impliedProbability: 0.455,
        },
      ],
    });

    expect(opened.positions[0].entryDecimalOdds).toBe(2.2);
    expect(opened.positions[0].entryProbability).toBe(0.455);
  });
});
