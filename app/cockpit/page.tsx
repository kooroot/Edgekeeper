import { AgentCockpit } from "@/components/cockpit/AgentCockpit";
import { buildReplayRun } from "@/lib/replay/replay-engine";

export default function CockpitPage() {
  const replayRun = buildReplayRun();

  return <AgentCockpit replayRun={replayRun} />;
}
