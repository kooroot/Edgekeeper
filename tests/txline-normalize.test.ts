import { describe, expect, it } from "vitest";
import { normalizeOddsPoints, normalizeScoreUpdate } from "../lib/txline/normalize";

describe("TxLINE normalizers", () => {
  it("expands ProofMarket TxLINE odds PriceNames/Pct payloads into normalized points", () => {
    const points = normalizeOddsPoints({
      FixtureId: 18172280,
      Bookmaker: "TxODDS",
      SuperOddsType: "1X2",
      InRunning: false,
      Ts: 1782788706633,
      PriceNames: ["Home", "Draw", "Away"],
      Prices: [1850, 3600, 4200],
      Pct: ["52.632", "27.778", "19.231"],
    });

    expect(points).toMatchObject([
      { fixtureId: "18172280", selection: "P1", impliedProbability: 0.52632 },
      { fixtureId: "18172280", selection: "DRAW", impliedProbability: 0.27778 },
      { fixtureId: "18172280", selection: "P2", impliedProbability: 0.19231 },
    ]);
  });

  it("derives football score from TxLINE Stats keys 1 and 2", () => {
    const score = normalizeScoreUpdate({
      FixtureId: 18172280,
      Seq: 1068,
      Ts: 1782788706633,
      StatusId: 7,
      Clock: { Running: true, Seconds: 5489 },
      Stats: { "1": 1, "2": 1, "3": 0, "4": 1, "7": 5, "8": 7 },
    });

    expect(score.participant1Score).toBe(1);
    expect(score.participant2Score).toBe(1);
    expect(score.phaseId).toBe(7);
    expect(score.minute).toBe(91);
    expect(score.stats?.["8"]).toBe(7);
  });
});
