import { DatabaseZap, FileCheck2, Radar } from "lucide-react";

const cards = [
  {
    title: "Ingest TxLINE odds and scores",
    description: "Server-side connectors normalize TxLINE-shaped snapshots and streams.",
    icon: DatabaseZap,
  },
  {
    title: "Detect signals and run risk checks",
    description: "Deterministic engines flag movement, divergence, momentum, stale feeds, and suspensions.",
    icon: Radar,
  },
  {
    title: "Mark simulated positions and emit receipts",
    description: "Every pass, block, open, and close action is marked with TxLINE odds and receipt hashes.",
    icon: FileCheck2,
  },
];

export function PositioningCards() {
  return (
    <section className="px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-lg border border-stone-800 bg-stone-950/80 p-5"
            >
              <Icon className="mb-5 h-6 w-6 text-cyan-200" />
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">{card.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
