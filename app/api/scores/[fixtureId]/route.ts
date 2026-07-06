import { getTxLineClient, getTxLineClients } from "@/lib/txline/client";
import { summarizeScores } from "@/lib/txline/live-summary";

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
        const scores = await client.getScoresSnapshot(fixtureId);
        return Response.json({
          mode: "live",
          network: client.network,
          credentialsSource: client.credentialsSource,
          fallbackFrom,
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
