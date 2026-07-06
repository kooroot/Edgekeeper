export type NormalizedFixture = {
  fixtureId: string;
  participant1: string;
  participant2: string;
  participant1IsHome?: boolean;
  startTime?: string;
  status?: string;
  competitionId?: number | string;
  competition?: string;
};

export type NormalizedOddsPoint = {
  fixtureId: string;
  ts: number;
  seq?: number;
  market: "1X2" | "MATCH_WINNER" | "UNKNOWN";
  selection: "P1" | "DRAW" | "P2" | string;
  decimalOdds?: number;
  impliedProbability?: number;
  suspended?: boolean;
  source?: "txline" | "replay";
};

export type NormalizedScoreUpdate = {
  fixtureId: string;
  ts: number;
  seq?: number;
  phaseId?: number;
  minute?: number;
  participant1Score?: number;
  participant2Score?: number;
  stats?: Record<string, number>;
  rawSummary?: string;
  source?: "txline" | "replay";
};
