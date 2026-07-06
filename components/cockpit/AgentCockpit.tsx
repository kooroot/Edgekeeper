"use client";

import { useEffect, useRef, useState } from "react";
import type { DecisionReceipt } from "@/lib/agent/types";
import type { ReplayFrame, ReplayRun } from "@/lib/replay/replay-engine";
import { AgentStatusBar } from "./AgentStatusBar";
import { MarketStatePanel } from "./MarketStatePanel";
import { LiveSnapshotPanel } from "./LiveSnapshotPanel";
import { PaperLedger } from "./PaperLedger";
import { ReceiptDrawer } from "./ReceiptDrawer";
import { ReplayControls, type ReplayStatus } from "./ReplayControls";
import { RiskPanel } from "./RiskPanel";
import { SignalFeed } from "./SignalFeed";

function frameForElapsed(frames: ReplayFrame[], elapsedSec: number) {
  let index = 0;
  for (let i = 0; i < frames.length; i += 1) {
    if (frames[i].offsetSec <= elapsedSec) index = i;
  }
  return index;
}

export function AgentCockpit({ replayRun }: { replayRun: ReplayRun }) {
  const [activeMode, setActiveMode] = useState<"replay" | "live">("replay");
  const [frameIndex, setFrameIndex] = useState(0);
  const [status, setStatus] = useState<ReplayStatus>("idle");
  const [speed, setSpeed] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<DecisionReceipt | null>(null);
  const startWallMs = useRef(0);
  const frames = replayRun.frames;
  const frame = frames[frameIndex] ?? frames[0];

  useEffect(() => {
    if (status !== "running" || frames.length === 0) return;

    const interval = window.setInterval(() => {
      const elapsedSec = ((performance.now() - startWallMs.current) / 1000) * speed;
      const nextIndex = frameForElapsed(frames, elapsedSec);
      setFrameIndex(nextIndex);

      if (nextIndex >= frames.length - 1 && elapsedSec >= replayRun.durationSec) {
        setStatus("complete");
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [frames, replayRun.durationSec, speed, status]);

  function startReplay() {
    const shouldRestart = status === "complete" || frameIndex >= frames.length - 1;
    if (shouldRestart) {
      setFrameIndex(0);
      startWallMs.current = performance.now();
    } else {
      startWallMs.current = performance.now() - (frame.offsetSec * 1000) / speed;
    }
    setStatus("running");
  }

  function pauseReplay() {
    setStatus("paused");
  }

  function resetReplay() {
    setFrameIndex(0);
    setSelectedReceipt(null);
    setStatus("idle");
    startWallMs.current = 0;
  }

  function changeSpeed(nextSpeed: number) {
    if (status === "running") {
      startWallMs.current = performance.now() - (frame.offsetSec * 1000) / nextSpeed;
    }
    setSpeed(nextSpeed);
  }

  function selectReceipt(signalId: string) {
    const receipt = frame.receipts.find((item) => item.signal.id === signalId);
    if (receipt) setSelectedReceipt(receipt);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
        <AgentStatusBar replayRun={replayRun} frame={frame} status={status} />

        <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-2">
          <div className="inline-flex overflow-hidden rounded-md border border-stone-700">
            <button
              type="button"
              onClick={() => setActiveMode("replay")}
              className={`h-10 px-4 font-mono text-sm ${
                activeMode === "replay"
                  ? "bg-cyan-300 text-black"
                  : "bg-stone-900 text-stone-300 hover:text-white"
              }`}
            >
              Replay Demo
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("live")}
              className={`h-10 border-l border-stone-700 px-4 font-mono text-sm ${
                activeMode === "live"
                  ? "bg-cyan-300 text-black"
                  : "bg-stone-900 text-stone-300 hover:text-white"
              }`}
            >
              Live TxLINE Snapshot
            </button>
          </div>
        </section>

        {activeMode === "live" ? (
          <LiveSnapshotPanel fallbackFixture={replayRun.fixture} />
        ) : (
          <>
            <ReplayControls
              durationSec={replayRun.durationSec}
              frame={frame}
              onPause={pauseReplay}
              onReset={resetReplay}
              onSpeedChange={changeSpeed}
              onStart={startReplay}
              speed={speed}
              status={status}
            />

            <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(380px,1.35fr)_minmax(320px,0.95fr)]">
              <MarketStatePanel market={frame.market} />
              <SignalFeed
                receipts={frame.receipts}
                signals={frame.signals}
                newSignalIds={frame.newSignalIds}
                onSelectReceipt={selectReceipt}
              />
              <RiskPanel
                decisions={frame.riskDecisions}
                signals={frame.signals}
                newReceiptIds={frame.newReceiptIds}
                receipts={frame.receipts}
              />
            </section>

            <PaperLedger positions={frame.positions} receipts={frame.receipts} />
          </>
        )}
      </div>

      <ReceiptDrawer receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </main>
  );
}
