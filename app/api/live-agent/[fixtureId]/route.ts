import { runLiveAgentTick } from "@/lib/agent/live-agent";
import { getTxLineClients } from "@/lib/txline/client";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;
  const clients = getTxLineClients();

  if (clients.length === 0) {
    return Response.json(
      {
        mode: "live-agent",
        fixtureId,
        error: "Server-side TxLINE credentials are required for a live agent tick.",
      },
      { status: 503 },
    );
  }

  let fallbackFrom: string | undefined;
  let lastError: unknown;

  for (const client of clients) {
    try {
      const [odds, scores] = await Promise.all([
        client.getOddsSnapshot(fixtureId),
        client.getScoresSnapshot(fixtureId),
      ]);
      const tick = runLiveAgentTick({
        fixtureId,
        now: Date.now(),
        odds,
        scores,
      });

      return Response.json({
        ...tick,
        network: client.network,
        credentialsSource: client.credentialsSource,
        fallbackFrom,
      });
    } catch (error) {
      lastError = error;
      fallbackFrom ??= client.network;
    }
  }

  const client = clients[clients.length - 1];
  return Response.json(
    {
      mode: "live-agent",
      fixtureId,
      network: client?.network ?? "mainnet",
      credentialsSource: client?.credentialsSource ?? "missing",
      fallbackFrom,
      error: lastError instanceof Error ? lastError.message : "Live agent tick failed",
    },
    { status: 502 },
  );
}
