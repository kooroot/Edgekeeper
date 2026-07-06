import fixtureJson from "../../data/replay/demo-fixture.json";
import oddsJson from "../../data/replay/demo-odds-updates.json";
import scoreJson from "../../data/replay/demo-score-updates.json";
import {
  normalizeFixture,
  normalizeOddsPoints,
  normalizeScoreUpdates,
} from "@/lib/txline/normalize";

export function getDemoFixture() {
  return normalizeFixture(fixtureJson);
}

export function getDemoOddsUpdates() {
  const fixture = getDemoFixture();
  return normalizeOddsPoints(oddsJson, fixture.fixtureId);
}

export function getDemoScoreUpdates() {
  const fixture = getDemoFixture();
  return normalizeScoreUpdates(scoreJson, fixture.fixtureId);
}
