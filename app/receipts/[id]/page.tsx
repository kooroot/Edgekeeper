import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { JsonPreview } from "@/components/common/JsonPreview";
import { findReplayReceipt } from "@/lib/replay/replay-engine";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = findReplayReceipt(id);
  if (!receipt) notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Link
          href="/cockpit"
          className="inline-flex w-fit items-center gap-2 text-sm text-stone-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cockpit
        </Link>

        <section className="rounded-lg border border-stone-800 bg-stone-950/80 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone="cyan">RECEIPT GENERATED</Badge>
                <Badge tone="green">RISK CHECKED</Badge>
                <Badge tone="amber">SIMULATED EXECUTION</Badge>
              </div>
              <h1 className="font-mono text-xl font-semibold text-white md:text-2xl">
                {receipt.id}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
                Deterministic decision receipt for a replay-mode agent action. It contains
                signal, risk, action, hashes, and proof reference summaries without raw feed
                dumps.
              </p>
            </div>
            <div className="rounded-md border border-stone-800 bg-black/40 p-3 font-mono text-xs text-stone-300">
              <div className="text-stone-500">receiptHash</div>
              <div className="max-w-full break-all text-cyan-200">{receipt.receiptHash}</div>
            </div>
          </div>
        </section>

        <JsonPreview
          value={receipt}
          downloadName={`${receipt.id}.json`}
          copyLabel="Copy Receipt JSON"
          downloadLabel="Download Receipt JSON"
        />
      </div>
    </main>
  );
}
