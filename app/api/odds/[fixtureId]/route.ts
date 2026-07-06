import { getDemoFixture, getDemoOddsUpdates } from "@/lib/replay/sample-data";
import { getTxLineClients } from "@/lib/txline/client";
import { summarizeOdds } from "@/lib/txline/live-summary";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;
  const clients = getTxLineClients();

  if (clients.length > 0) {
    let fallbackFrom: string | undefined;
    let lastError: unknown;

    for (const client of clients) {
      try {
        const points = await client.getOddsSnapshot(fixtureId);
        return Response.json({
          mode: "live",
          network: client.network,
          credentialsSource: client.credentialsSource,
          fallbackFrom,
          fetchedAt: Date.now(),
          ...summarizeOdds(points, fixtureId),
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
        error: lastError instanceof Error ? lastError.message : "TxLINE odds request failed",
        points: [],
      },
      { status: 502 },
    );
  }

  const demo = getDemoFixture();
  if (fixtureId !== demo.fixtureId) {
    return Response.json({ error: "Unknown replay fixture" }, { status: 404 });
  }

  return Response.json({
    mode: "replay",
    ...summarizeOdds(getDemoOddsUpdates(), fixtureId),
  });
}
