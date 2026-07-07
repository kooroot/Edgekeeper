import { getTxLineClient, getTxLineClients } from "@/lib/txline/client";
import {
  buildLiveFixturePreview,
  normalizeFixtureScope,
  type FixtureScope,
} from "@/lib/txline/live-summary";

export const dynamic = "force-dynamic";

async function getFixturesForScope(
  client: ReturnType<typeof getTxLineClient>,
  scope: FixtureScope,
) {
  const currentEpochDay = Math.floor(Date.now() / 86_400_000);
  if (scope === "scheduled") return client.getFixturesSnapshot();
  if (scope === "live") {
    return client.getFixturesSnapshot({ startEpochDay: currentEpochDay - 2 });
  }
  return client.getFixturesSnapshot({ startEpochDay: currentEpochDay - 45 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = normalizeFixtureScope(url.searchParams.get("scope"));
  const requestedLimit = Number(url.searchParams.get("limit") ?? 120);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(160, Math.max(1, requestedLimit))
    : 120;
  const clients = getTxLineClients();

  if (clients.length > 0) {
    let fallbackFrom: string | undefined;
    let lastError: unknown;

    for (const client of clients) {
      try {
        const fixtures = await getFixturesForScope(client, scope);
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
            limit,
            scope,
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
        limit,
        scope,
      }),
    },
    { status: 503 },
  );
}
