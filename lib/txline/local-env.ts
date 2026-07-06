type TxlineEnv = Partial<
  Record<
    | "TXLINE_API_ORIGIN"
    | "TXLINE_NETWORK"
    | "TXLINE_JWT"
    | "TXLINE_API_TOKEN"
    | "TXLINE_SECONDARY_API_ORIGIN"
    | "TXLINE_SECONDARY_NETWORK"
    | "TXLINE_SECONDARY_JWT"
    | "TXLINE_SECONDARY_API_TOKEN",
    string
  >
>;

export function txlineEnv(name: keyof TxlineEnv) {
  const processValue = process.env[name]?.trim();
  return processValue || undefined;
}

export function txlineEnvSource() {
  if (process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN) return "process.env";
  return "missing";
}
