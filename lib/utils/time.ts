export function formatClock(ts?: number) {
  if (!ts) return "n/a";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function formatAge(now: number, ts?: number) {
  if (!ts) return "n/a";
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function phaseLabel(phaseId?: number) {
  const labels: Record<number, string> = {
    1: "NS",
    2: "H1",
    3: "HT",
    4: "H2",
    5: "F",
    6: "WET",
    7: "ET1",
    8: "HTET",
    9: "ET2",
    10: "FET",
    11: "WPE",
    12: "PE",
    13: "FPE",
    14: "I",
    15: "A",
    16: "C",
    17: "TXCC",
    18: "TXCS",
    19: "P",
  };
  return phaseId ? (labels[phaseId] ?? `Phase ${phaseId}`) : "n/a";
}
