import { describe, expect, it } from "vitest";
import { runLiveAgentTick } from "../lib/agent/live-agent";
import type { NormalizedOddsPoint, NormalizedScoreUpdate } from "../lib/txline/types";

const fixtureId = "live-agent-test-fixture";
const now = 200_000;

function odds(selection: string, probability: number): NormalizedOddsPoint {
  return {
    fixtureId,
    ts: now,
    market: "1X2",
    selection,
    impliedProbability: probability,
    suspended: false,
    source: "txline",
  };
}

const score: NormalizedScoreUpdate = {
  fixtureId,
  ts: now,
  seq: 7,
  phaseId: 1,
  minute: 12,
  participant1Score: 0,
  participant2Score: 0,
  source: "txline",
};

describe("live agent tick", () => {
  it("runs a deterministic live scan decision and receipt from TxLINE-shaped inputs", () => {
    const tick = runLiveAgentTick({
      fixtureId,
      now,
      odds: [odds("P1", 0.42), odds("DRAW", 0.27), odds("P2", 0.31)],
      scores: [score],
    });

    expect(tick.mode).toBe("live-agent");
    expect(tick.signals[0]?.type).toBe("LIVE_MARKET_SCAN");
    expect(tick.riskDecisions[0]?.finalAction).toBe("NOOP");
    expect(tick.latestReceipt?.proofReference?.source).toBe("txline");
    expect(tick.latestReceipt?.receiptHash).toHaveLength(64);
  });
});
