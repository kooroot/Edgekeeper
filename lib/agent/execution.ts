import type { NormalizedOddsPoint } from "@/lib/txline/types";
import { oddsProbability } from "./signals";
import type { PaperPosition, RiskDecision, Signal } from "./types";

export type ExecutionResult = {
  positions: PaperPosition[];
  paperPositionId?: string;
  affectedPositionIds: string[];
};

function sideFromAction(action: string): PaperPosition["side"] | undefined {
  if (action === "OPEN_P1") return "P1";
  if (action === "OPEN_DRAW") return "DRAW";
  if (action === "OPEN_P2") return "P2";
  return undefined;
}

function probabilityForSide(latestOdds: NormalizedOddsPoint[], side: PaperPosition["side"]) {
  return oddsProbability(latestOdds.find((point) => point.selection === side)) ?? 0;
}

function oddsPointForSide(latestOdds: NormalizedOddsPoint[], side: PaperPosition["side"]) {
  return latestOdds.find((point) => point.selection === side);
}

function decimalOddsForSide(latestOdds: NormalizedOddsPoint[], side: PaperPosition["side"]) {
  const point = oddsPointForSide(latestOdds, side);
  if (point?.decimalOdds) return point.decimalOdds;
  const probability = oddsProbability(point);
  return probability && probability > 0 ? Number((1 / probability).toFixed(3)) : undefined;
}

export function calculatePaperPnl(
  stakeUnits: number,
  entryProbability?: number,
  exitProbability?: number,
) {
  if (!entryProbability || entryProbability <= 0 || exitProbability === undefined) return 0;
  return Number((stakeUnits * ((exitProbability - entryProbability) / entryProbability)).toFixed(2));
}

export function applyPaperExecution({
  signal,
  riskDecision,
  positions,
  latestOdds,
  stakeUnits = 100,
}: {
  signal: Signal;
  riskDecision: RiskDecision;
  positions: PaperPosition[];
  latestOdds: NormalizedOddsPoint[];
  stakeUnits?: number;
}): ExecutionResult {
  if (riskDecision.status === "BLOCK") {
    return { positions, affectedPositionIds: [] };
  }

  const side = sideFromAction(riskDecision.finalAction);
  if (side) {
    const entryProbability = probabilityForSide(latestOdds, side);
    const entryDecimalOdds = decimalOddsForSide(latestOdds, side);
    const position: PaperPosition = {
      id: `pos_${signal.id.slice(4)}`,
      fixtureId: signal.fixtureId,
      side,
      openedAt: signal.ts,
      entryProbability,
      entryDecimalOdds,
      stakeUnits,
      status: "OPEN",
    };

    return {
      positions: [...positions, position],
      paperPositionId: position.id,
      affectedPositionIds: [position.id],
    };
  }

  if (riskDecision.finalAction === "CLOSE") {
    const affectedPositionIds: string[] = [];
    const nextPositions = positions.map((position) => {
      if (position.fixtureId !== signal.fixtureId || position.status !== "OPEN") {
        return position;
      }

      const exitProbability = probabilityForSide(latestOdds, position.side);
      const exitDecimalOdds = decimalOddsForSide(latestOdds, position.side);
      const closed: PaperPosition = {
        ...position,
        closedAt: signal.ts,
        exitProbability,
        exitDecimalOdds,
        probabilityDelta: Number((exitProbability - position.entryProbability).toFixed(6)),
        pnlUnits: calculatePaperPnl(position.stakeUnits, position.entryProbability, exitProbability),
        status: "CLOSED",
      };
      affectedPositionIds.push(position.id);
      return closed;
    });

    return {
      positions: nextPositions,
      paperPositionId: affectedPositionIds[0],
      affectedPositionIds,
    };
  }

  return { positions, affectedPositionIds: [] };
}
