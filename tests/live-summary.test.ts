import { describe, expect, it } from "vitest";
import { buildLiveFixturePreview } from "../lib/txline/live-summary";
import type { NormalizedFixture } from "../lib/txline/types";

const now = Date.parse("2026-07-07T00:00:00.000Z");

function fixture(
  fixtureId: string,
  startTime: string,
  status = "Scheduled",
): NormalizedFixture {
  return {
    fixtureId,
    participant1: `P1-${fixtureId}`,
    participant2: `P2-${fixtureId}`,
    startTime,
    status,
    competitionId: 72,
  };
}

const freeTiers = [{ id: 12, latency: "real-time" }];

describe("live fixture summary", () => {
  it("keeps past and future fixtures in the analysis scope", () => {
    const preview = buildLiveFixturePreview({
      fixtures: [
        fixture("past", "2026-07-06T18:00:00.000Z", "Ended"),
        fixture("future", "2026-07-08T18:00:00.000Z"),
      ],
      network: "mainnet",
      freeTiers,
      now,
      scope: "analysis",
    });

    expect(preview.fixtures.map((item) => item.fixtureId).sort()).toEqual(["future", "past"]);
  });

  it("can narrow the fixture universe to completed matches", () => {
    const preview = buildLiveFixturePreview({
      fixtures: [
        fixture("past", "2026-07-06T18:00:00.000Z", "Ended"),
        fixture("future", "2026-07-08T18:00:00.000Z"),
      ],
      network: "mainnet",
      freeTiers,
      now,
      scope: "completed",
    });

    expect(preview.fixtures.map((item) => item.fixtureId)).toEqual(["past"]);
  });
});
