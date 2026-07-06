import { Hero } from "@/components/landing/Hero";
import { OperatorWorkflow } from "@/components/landing/OperatorWorkflow";
import { PositioningCards } from "@/components/landing/PositioningCards";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <OperatorWorkflow />
      <PositioningCards />
    </main>
  );
}
