import { buildReplayRun } from "@/lib/replay/replay-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;
  const run = buildReplayRun();

  if (fixtureId !== run.fixture.fixtureId) {
    return Response.json({ error: "Unknown replay fixture" }, { status: 404 });
  }

  return Response.json(run);
}
