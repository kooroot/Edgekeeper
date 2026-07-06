import { ChevronDown } from "lucide-react";
import type { NormalizedFixture } from "@/lib/txline/types";

export function FixtureSelector({ fixture }: { fixture: NormalizedFixture }) {
  return (
    <div className="relative min-w-0">
      <select
        className="h-10 w-full appearance-none rounded-md border border-stone-700 bg-black/40 pl-3 pr-9 font-mono text-sm text-white outline-none sm:min-w-[320px]"
        value={fixture.fixtureId}
        disabled
      >
        <option value={fixture.fixtureId}>
          {fixture.participant1} vs {fixture.participant2}
        </option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-stone-500" />
    </div>
  );
}
