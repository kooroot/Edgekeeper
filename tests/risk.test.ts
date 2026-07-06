import { describe, expect, it } from "vitest";
import { evaluateRisk } from "../lib/agent/risk";
import type { Signal } from "../lib/agent/types";

const signal: Signal = {
  id: "sig-risk",
  fixtureId: "fixture-test",
  ts: 200_000,
  type: "ODDS_VELOCITY",
  severity: "HIGH",
  title: "Velocity",
  description: "test",
  confidence: 0.8,
  suggestedAction: "OPEN_P1",
  inputHash: "abc",
};

describe("risk", () => {
  it("blocks live decisions when odds or score feed is stale", () => {
    const decision = evaluateRisk(signal, {
      mode: "live",
      now: 200_000,
      latestOdds: [
        {
          fixtureId: "fixture-test",
          ts: 90_000,
          market: "1X2",
          selection: "P1",
          impliedProbability: 0.5,
        },
      ],
      latestScore: {
        fixtureId: "fixture-test",
        ts: 90_000,
        phaseId: 2,
      },
      positions: [],
      cumulativePnlUnits: 0,
    });

    expect(decision.status).toBe("BLOCK");
    expect(decision.checks.find((check) => check.name === "Stale feed block")?.status).toBe(
      "BLOCK",
    );
  });
});
