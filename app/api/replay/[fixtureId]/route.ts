import { buildReplayRun } from "@/lib/replay/replay-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  if (process.env.ENABLE_INTERNAL_REPLAY_API !== "true") {
    return Response.json(
      { error: "Internal replay API is disabled; use live TxLINE routes" },
      { status: 404 },
    );
  }

  const { fixtureId } = await params;
  const run = buildReplayRun();

  if (fixtureId !== run.fixture.fixtureId) {
    return Response.json({ error: "Unknown replay fixture" }, { status: 404 });
  }

  return Response.json(run);
}
