import { describe, expect, it } from "vitest";
import {
  calculateImpliedProbability,
  detectOddsVelocitySignal,
} from "../lib/agent/signals";
import type { NormalizedOddsPoint } from "../lib/txline/types";

const fixtureId = "fixture-test";

function odds(selection: string, ts: number, probability: number): NormalizedOddsPoint {
  return {
    fixtureId,
    ts,
    market: "1X2",
    selection,
    impliedProbability: probability,
    suspended: false,
    source: "replay",
  };
}

describe("signals", () => {
  it("calculates implied probability from decimal odds", () => {
    expect(calculateImpliedProbability(2.5)).toBe(0.4);
  });

  it("detects OddsVelocitySignal when probability moves by threshold inside window", () => {
    const previous = odds("P1", 1_000, 0.41);
    const current = odds("P1", 61_000, 0.47);
    const signal = detectOddsVelocitySignal({
      fixtureId,
      now: current.ts,
      mode: "replay",
      currentOdds: [current],
      priorOdds: [previous],
      latestOdds: [current],
      previousLatestOdds: [previous],
    });

    expect(signal?.type).toBe("ODDS_VELOCITY");
    expect(signal?.suggestedAction).toBe("OPEN_P1");
    expect(signal?.confidence).toBeGreaterThan(0.5);
  });
});
