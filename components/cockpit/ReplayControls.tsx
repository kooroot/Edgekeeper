import { Gauge, Pause, Play, RotateCcw } from "lucide-react";
import type { ReplayFrame } from "@/lib/replay/replay-engine";

export type ReplayStatus = "idle" | "running" | "paused" | "complete";

const speedOptions = [1, 5, 20];

export function ReplayControls({
  durationSec,
  frame,
  onPause,
  onReset,
  onSpeedChange,
  onStart,
  speed,
  status,
}: {
  durationSec: number;
  frame: ReplayFrame;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onStart: () => void;
  speed: number;
  status: ReplayStatus;
}) {
  const progress = durationSec > 0 ? Math.min(100, (frame.offsetSec / durationSec) * 100) : 0;

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-300 px-3 text-sm font-semibold text-black transition hover:bg-emerald-200"
            title="Start Replay"
          >
            <Play className="h-4 w-4" />
            Start Replay
          </button>
          <button
            type="button"
            onClick={onPause}
            disabled={status !== "running"}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            title="Pause Replay"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200 transition hover:text-white"
            title="Reset Replay"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-800 bg-black/30 px-3 font-mono text-xs text-stone-400">
            <Gauge className="h-4 w-4 text-cyan-200" />
            speed
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-stone-700">
            {speedOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSpeedChange(option)}
                className={`h-10 min-w-14 border-r border-stone-800 px-3 font-mono text-sm last:border-r-0 ${
                  speed === option
                    ? "bg-cyan-300 text-black"
                    : "bg-stone-900 text-stone-300 hover:text-white"
                }`}
                title={`Replay speed ${option}x`}
              >
                {option}x
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between font-mono text-[11px] uppercase text-stone-500">
            <span>t+{frame.offsetSec}s</span>
            <span>{durationSec}s demo path</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-900">
            <div
              className="h-full bg-cyan-300 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
