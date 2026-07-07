import { getTxLineClient, getTxLineClients } from "@/lib/txline/client";
import { summarizeScores } from "@/lib/txline/live-summary";
import type { NormalizedScoreUpdate } from "@/lib/txline/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;
  const url = new URL(request.url);
  const preferHistorical = url.searchParams.get("history") === "1";
  const clients = getTxLineClients();

  if (clients.length > 0) {
    let fallbackFrom: string | undefined;
    let lastError: unknown;

    for (const client of clients) {
      try {
        let historicalFallback = false;
        let scores: NormalizedScoreUpdate[] = [];
        if (preferHistorical) {
          try {
            scores = await client.getHistoricalScores(fixtureId);
          } catch {
            historicalFallback = true;
          }
        }
        if (scores.length === 0) {
          historicalFallback = preferHistorical;
          scores = await client.getScoresSnapshot(fixtureId);
        }
        return Response.json({
          mode: "live",
          network: client.network,
          credentialsSource: client.credentialsSource,
          fallbackFrom,
          historicalRequested: preferHistorical,
          historicalFallback,
          fetchedAt: Date.now(),
          ...summarizeScores(scores, fixtureId),
        });
      } catch (error) {
        lastError = error;
        fallbackFrom ??= client.network;
      }
    }

    const client = clients[clients.length - 1];
    return Response.json(
      {
        mode: "live",
        network: client?.network ?? "mainnet",
        credentialsSource: client?.credentialsSource ?? "missing",
        fixtureId,
        fallbackFrom,
        error: lastError instanceof Error ? lastError.message : "TxLINE scores request failed",
        latest: undefined,
      },
      { status: 502 },
    );
  }

  const client = getTxLineClient();
  return Response.json(
    {
      mode: "live",
      network: client.network,
      credentialsAvailable: false,
      credentialsSource: client.credentialsSource,
      error: "Server-only TxLINE credentials are required for live score data",
      ...summarizeScores([], fixtureId),
    },
    { status: 503 },
  );
}
