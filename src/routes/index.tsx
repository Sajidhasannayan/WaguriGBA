import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WaguriGBA — Browser GBA Emulator with Cloud Saves" },
      { name: "description", content: "Play GBA games online with cloud-synced .sav files, a layout editor, and a curated library of official games and ROM hacks." },
      { property: "og:title", content: "WaguriGBA — Browser GBA Emulator" },
      { property: "og:description", content: "Cloud saves, custom touch layouts, official + hack library." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center md:pt-28">
          <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-7xl">
            The <span className="text-gradient-primary">GBA</span>,<br />polished for the web.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-muted-foreground md:text-lg">
            A clean, fast Game Boy Advance emulator. Pick a game and play.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-magenta text-primary-foreground hover:opacity-90 ring-glow">
              <Link to="/library"><Gamepad2 className="mr-2 h-5 w-5" />Browse library</Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg">
                <Link to="/auth">Create free account<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        WaguriGBA · Maintained by sajidmogged. For Personal use only. We do not distribute copyrighted ROMs.
      </footer>
    </div>
  );
}