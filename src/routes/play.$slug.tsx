import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { EmulatorPlayer } from "@/components/emulator-player";
import { Badge } from "@/components/ui/badge";
import { getRomBySlug } from "@/lib/fns/roms";
import { getStoredToken, decodeToken } from "@/lib/token";

export const Route = createFileRoute("/play/$slug")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    if (typeof window === "undefined") return;
    // Require auth for custom GBA upload
    if (params.slug === "custom") {
      const token = getStoredToken();
      if (!token || !decodeToken(token)) throw redirect({ to: "/auth" });
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Play ${params.slug} · WaguriGBA` },
      { name: "description", content: `Play ${params.slug} in your browser with cloud saves.` },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { slug } = Route.useParams();
  const { data: rom } = useQuery({
    queryKey: ["rom", slug],
    queryFn: async () => {
      if (slug === "custom") return null;
      return getRomBySlug({ data: { slug } });
    },
  });

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link
          to="/library"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />Library
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{rom?.title ?? slug}</h1>
            {rom?.description && (
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{rom.description}</p>
            )}
          </div>
          {rom?.category && (
            <Badge variant="outline" className="text-xs">
              <BookOpen className="mr-1 h-3 w-3" />
              {rom.category === "official" ? "Official" : "ROM Hack"}
            </Badge>
          )}
        </div>

        <div className="mt-8">
          <EmulatorPlayer
            romSlug={slug}
            romTitle={rom?.title ?? slug}
            romId={rom?.id ?? null}
            preloadedRomUrl={rom?.rom_url ?? null}
          />
        </div>
      </main>
    </div>
  );
}
