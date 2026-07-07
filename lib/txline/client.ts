import {
  normalizeFixtures,
  normalizeOddsPoints,
  normalizeScoreUpdates,
} from "./normalize";
import { txlineEnv, txlineEnvSource } from "./local-env";
import {
  getTxlineNetworkConfig,
  isNumericId,
  normalizeTxlineNetwork,
  txlineApiUrl,
  type TxlineNetwork,
} from "./network";
import type {
  NormalizedFixture,
  NormalizedOddsPoint,
  NormalizedScoreUpdate,
} from "./types";

type TxLineClientOptions = {
  network?: string;
  origin?: string;
  jwt?: string;
  apiToken?: string;
  credentialsSource?: string;
  timeoutMs?: number;
};

export class TxLineClient {
  readonly network: TxlineNetwork;
  private readonly origin?: string;
  private readonly jwt?: string;
  private readonly apiToken?: string;
  private readonly credentialsSourceName: string;
  private readonly timeoutMs: number;

  constructor(options: TxLineClientOptions = {}) {
    this.network = normalizeTxlineNetwork(options.network ?? txlineEnv("TXLINE_NETWORK"));
    const envOrigin = txlineEnv("TXLINE_API_ORIGIN");
    this.origin =
      options.origin ??
      (envOrigin && envOrigin !== getTxlineNetworkConfig(this.network).apiOrigin
        ? envOrigin
        : undefined);
    this.jwt = options.jwt ?? txlineEnv("TXLINE_JWT");
    this.apiToken = options.apiToken ?? txlineEnv("TXLINE_API_TOKEN");
    this.credentialsSourceName = options.credentialsSource ?? txlineEnvSource();
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  get hasCredentials() {
    return Boolean(this.jwt && this.apiToken);
  }

  get config() {
    return getTxlineNetworkConfig(this.network);
  }

  get credentialsSource() {
    return this.credentialsSourceName;
  }

  async getFixturesSnapshot(options: {
    startEpochDay?: number | null;
    competitionId?: number | string;
  } = {}): Promise<NormalizedFixture[]> {
    const startEpochDay =
      options.startEpochDay === undefined
        ? Math.floor(Date.now() / 86_400_000)
        : options.startEpochDay;
    const competitionId = options.competitionId ?? 72;
    const params = new URLSearchParams({ competitionId: String(competitionId) });
    if (startEpochDay !== null) params.set("startEpochDay", String(startEpochDay));
    const data = await this.fetchJson(`/api/fixtures/snapshot?${params.toString()}`);
    return normalizeFixtures(data);
  }

  async getOddsSnapshot(fixtureId: string): Promise<NormalizedOddsPoint[]> {
    if (!isNumericId(fixtureId)) throw new Error("fixtureId must be numeric");
    const data = await this.fetchJson(`/api/odds/snapshot/${encodeURIComponent(fixtureId)}`);
    return normalizeOddsPoints(data, fixtureId);
  }

  async getScoresSnapshot(fixtureId: string): Promise<NormalizedScoreUpdate[]> {
    if (!isNumericId(fixtureId)) throw new Error("fixtureId must be numeric");
    const data = await this.fetchJson(`/api/scores/snapshot/${encodeURIComponent(fixtureId)}`);
    return normalizeScoreUpdates(data, fixtureId);
  }

  async getHistoricalScores(fixtureId: string): Promise<NormalizedScoreUpdate[]> {
    if (!isNumericId(fixtureId)) throw new Error("fixtureId must be numeric");
    const data = await this.fetchJson(`/api/scores/historical/${encodeURIComponent(fixtureId)}`);
    return normalizeScoreUpdates(data, fixtureId);
  }

  streamOdds(): Promise<Response> {
    return this.fetchStream("/api/odds/stream");
  }

  streamScores(): Promise<Response> {
    return this.fetchStream("/api/scores/stream");
  }

  private headers(accept = "application/json") {
    if (!this.jwt || !this.apiToken) {
      throw new Error("TXLINE_JWT and TXLINE_API_TOKEN are required for live TxLINE access");
    }

    return {
      Accept: accept,
      Authorization: `Bearer ${this.jwt}`,
      "Accept-Encoding": "gzip",
      "X-Api-Token": this.apiToken,
    };
  }

  private async fetchJson(path: string) {
    const response = await this.fetchWithTimeout(path, this.headers());
    if (!response.ok) {
      throw new Error(`TxLINE request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  private async fetchStream(path: string) {
    const response = await this.fetchWithTimeout(path, this.headers("text/event-stream"));
    if (!response.ok) {
      throw new Error(`TxLINE stream failed: ${response.status} ${response.statusText}`);
    }
    return response;
  }

  private async fetchWithTimeout(path: string, headers: HeadersInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = this.origin ? new URL(path, this.origin).toString() : txlineApiUrl(path, this.network);

    try {
      return await fetch(url, {
        headers,
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

}

export function getTxLineClient() {
  return new TxLineClient({ credentialsSource: txlineEnvSource() });
}

export function getSecondaryTxLineClient() {
  const hasSecondaryCredentials = Boolean(
    txlineEnv("TXLINE_SECONDARY_JWT") && txlineEnv("TXLINE_SECONDARY_API_TOKEN"),
  );
  return new TxLineClient({
    network: txlineEnv("TXLINE_SECONDARY_NETWORK"),
    origin: txlineEnv("TXLINE_SECONDARY_API_ORIGIN"),
    jwt: txlineEnv("TXLINE_SECONDARY_JWT"),
    apiToken: txlineEnv("TXLINE_SECONDARY_API_TOKEN"),
    credentialsSource: hasSecondaryCredentials ? "secondary" : "missing",
  });
}

export function getTxLineClients() {
  return [getTxLineClient(), getSecondaryTxLineClient()].filter((client) => client.hasCredentials);
}
