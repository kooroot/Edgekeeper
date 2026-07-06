import { getTxLineClient, getTxLineClients } from "@/lib/txline/client";
import { buildLiveFixturePreview } from "@/lib/txline/live-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = getTxLineClients();

  if (clients.length > 0) {
    let fallbackFrom: string | undefined;
    let lastError: unknown;

    for (const client of clients) {
      try {
        const fixtures = await client.getFixturesSnapshot();
        return Response.json({
          mode: "live",
          credentialsAvailable: true,
          credentialsSource: client.credentialsSource,
          fallbackFrom,
          fetchedAt: Date.now(),
          ...buildLiveFixturePreview({
            fixtures,
            network: client.network,
            freeTiers: client.config.freeServiceLevels,
          }),
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
        credentialsAvailable: true,
        credentialsSource: client?.credentialsSource ?? "missing",
        network: client?.network ?? "mainnet",
        fallbackFrom,
        error: lastError instanceof Error ? lastError.message : "TxLINE fixtures request failed",
        fixtures: [],
      },
      { status: 502 },
    );
  }

  const client = getTxLineClient();
  return Response.json(
    {
      mode: "live",
      credentialsAvailable: false,
      credentialsSource: client.credentialsSource,
      fetchedAt: Date.now(),
      error: "Server-only TxLINE credentials are required for live fixture data",
      ...buildLiveFixturePreview({
        fixtures: [],
        network: client.network,
        freeTiers: client.config.freeServiceLevels,
      }),
    },
    { status: 503 },
  );
}
