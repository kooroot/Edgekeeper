import { findReplayReceipt } from "@/lib/replay/replay-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const receipt = findReplayReceipt(id);

  if (!receipt) {
    return Response.json({ error: "Receipt not found" }, { status: 404 });
  }

  return Response.json(receipt);
}
