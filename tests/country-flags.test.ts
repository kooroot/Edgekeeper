import { describe, expect, it } from "vitest";
import { countryWithFlag, flagForCountry } from "../lib/utils/country-flags";

describe("country flag formatting", () => {
  it("adds flags for current TxLINE fixture countries", () => {
    expect(countryWithFlag("Argentina")).toBe("🇦🇷 Argentina");
    expect(countryWithFlag("Egypt")).toBe("🇪🇬 Egypt");
    expect(countryWithFlag("USA")).toBe("🇺🇸 USA");
    expect(countryWithFlag("England")).toContain("England");
  });

  it("falls back to plain text for unknown labels", () => {
    expect(flagForCountry("Unknown FC")).toBeUndefined();
    expect(countryWithFlag("Unknown FC")).toBe("Unknown FC");
  });
});
