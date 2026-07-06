import { DatabaseZap, FileCheck2, Radar } from "lucide-react";

const cards = [
  {
    title: "Ingest verified market state",
    description: "Server-side connectors normalize TxLINE odds, scores, phase, and stat snapshots.",
    icon: DatabaseZap,
  },
  {
    title: "Run strategy and risk gates",
    description: "Agent logic turns normalized inputs into decisions, then blocks unsafe actions.",
    icon: Radar,
  },
  {
    title: "Mark positions and receipts",
    description: "Simulation state, PnL marks, input hashes, and decision receipts stay inspectable.",
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
