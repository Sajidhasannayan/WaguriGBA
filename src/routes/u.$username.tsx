import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Gamepad2, Ban, Crown, MapPin } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { formatPlaytime, isOnline } from "@/lib/presence";
import { getPublicProfile } from "@/lib/fns/profiles";
import { getUserPlaytime } from "@/lib/fns/presence";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} · WaguriGBA` }] }),
  component: PublicProfile,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">No such player</h1>
        <p className="mt-2 text-sm text-muted-foreground">That username doesn't exist.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </main>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Couldn't load profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </main>
    </div>
  ),
});

function PublicProfile() {
  const { username } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const p = await getPublicProfile({ data: { username } });
      if (!p) throw notFound();
      return p;
    },
  });

  const { data: playtime } = useQuery({
    queryKey: ["public-playtime", profile?.id],
    enabled: !!profile?.id,
    queryFn: () => getUserPlaytime({ data: { userId: profile!.id } }),
  });

  if (!profile) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-3xl animate-pulse px-4 py-10">
          <div className="card-glass h-44 rounded-2xl" />
        </main>
      </div>
    );
  }

  const online = isOnline(profile.last_seen);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="card-glass flex flex-wrap items-center gap-6 rounded-2xl p-6">
          <UserAvatar
            src={profile.avatar_url}
            name={profile.display_name ?? profile.username}
            size="xl"
            online={online}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">
                {profile.display_name ?? profile.username}
              </h1>
              {profile.role === "admin" && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-amber-400"
                >
                  <Crown className="mr-1 h-3 w-3" />Admin
                </Badge>
              )}
              {profile.is_banned && (
                <Badge variant="destructive">
                  <Ban className="mr-1 h-3 w-3" />Banned
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.current_rom_title ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                <Gamepad2 className="h-3 w-3" />
                Playing {profile.current_rom_title}
              </div>
            ) : online ? (
              <p className="mt-2 text-xs text-emerald-400">Online</p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Last seen{" "}
                {profile.last_seen ? new Date(profile.last_seen).toLocaleString() : "never"}
              </p>
            )}
            {profile.bio && (
              <p className="mt-3 max-w-prose text-sm text-foreground/90">{profile.bio}</p>
            )}
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl font-semibold">Top games</h2>
        {!playtime || playtime.length === 0 ? (
          <div className="card-glass mt-3 rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No play time yet.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {playtime.map((p) => (
              <li
                key={p.rom_slug}
                className="card-glass flex items-center gap-3 rounded-xl p-4"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-magenta">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.rom_title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.sessions} session{p.sessions === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatPlaytime(Number(p.total_seconds))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
