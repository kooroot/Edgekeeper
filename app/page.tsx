import { Hero } from "@/components/landing/Hero";
import { PositioningCards } from "@/components/landing/PositioningCards";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <PositioningCards />
    </main>
  );
}
