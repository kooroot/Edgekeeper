type Jsonish = null | boolean | number | string | Jsonish[] | { [key: string]: Jsonish };

function stableValue(value: unknown): Jsonish {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === "object") {
    const output: { [key: string]: Jsonish } = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) output[key] = stableValue(child);
    }
    return output;
  }
  return null;
}

export function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}
