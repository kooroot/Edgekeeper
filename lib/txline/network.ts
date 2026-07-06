export type TxlineNetwork = "devnet" | "mainnet";

export type TxlineServiceLevel = {
  id: number;
  label: string;
  latency: "60-second delay" | "real-time";
};

export type TxlineNetworkConfig = {
  network: TxlineNetwork;
  apiOrigin: string;
  apiBaseUrl: string;
  programId: string;
  freeServiceLevels: readonly TxlineServiceLevel[];
};

const TXLINE_NETWORKS: Record<TxlineNetwork, TxlineNetworkConfig> = {
  devnet: {
    network: "devnet",
    apiOrigin: "https://txline-dev.txodds.com",
    apiBaseUrl: "https://txline-dev.txodds.com/api",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        latency: "60-second delay",
      },
    ],
  },
  mainnet: {
    network: "mainnet",
    apiOrigin: "https://txline.txodds.com",
    apiBaseUrl: "https://txline.txodds.com/api",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        latency: "60-second delay",
      },
      {
        id: 12,
        label: "World Cup & Int Friendlies",
        latency: "real-time",
      },
    ],
  },
};

export function normalizeTxlineNetwork(value?: string | null): TxlineNetwork {
  const normalized = (value ?? "mainnet").trim().toLowerCase();
  if (normalized === "" || normalized === "mainnet") return "mainnet";
  if (normalized === "devnet") return "devnet";
  throw new Error(`Unsupported TXLINE_NETWORK "${value}". Use "devnet" or "mainnet".`);
}

export function getTxlineNetworkConfig(network?: string | null) {
  return TXLINE_NETWORKS[normalizeTxlineNetwork(network)];
}

export function txlineApiUrl(path: string, network?: string | null) {
  const cfg = getTxlineNetworkConfig(network);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${cfg.apiOrigin}${normalizedPath}`;
  }
  return `${cfg.apiBaseUrl}${normalizedPath}`;
}

export function isNumericId(value: string | null): value is string {
  return value !== null && /^\d+$/.test(value);
}
