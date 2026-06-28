import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { getUsersCollection, getPlaySessionsCollection } from "@/lib/mongodb";
import { requireAuth } from "@/integrations/auth-middleware";

export const pingPresence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { romSlug?: string | null; romTitle?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const col = await getUsersCollection();
    await col.updateOne(
      { _id: new ObjectId(context.userId) },
      {
        $set: {
          last_seen: new Date().toISOString(),
          current_rom_slug: data.romSlug ?? null,
          current_rom_title: data.romTitle ?? null,
        },
      }
    );
    return { ok: true };
  });

export const startPlaySession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { romSlug: string; romTitle: string }) => d)
  .handler(async ({ context, data }) => {
    const col = await getPlaySessionsCollection();
    const result = await col.insertOne({
      user_id: context.userId,
      rom_slug: data.romSlug,
      rom_title: data.romTitle,
      started_at: new Date().toISOString(),
      ended_at: null,
      seconds_played: 0,
    });
    return { id: result.insertedId.toHexString() };
  });

export const endPlaySession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { sessionId: string; seconds: number }) => d)
  .handler(async ({ data }) => {
    if (!data.sessionId || data.seconds <= 0) return { ok: true };
    const col = await getPlaySessionsCollection();
    await col.updateOne(
      { _id: new ObjectId(data.sessionId) },
      {
        $set: {
          ended_at: new Date().toISOString(),
          seconds_played: Math.round(data.seconds),
        },
      }
    );
    return { ok: true };
  });

export const getUserPlaytime = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const col = await getPlaySessionsCollection();
    const result = await col
      .aggregate([
        { $match: { user_id: data.userId } },
        {
          $group: {
            _id: { rom_slug: "$rom_slug", rom_title: "$rom_title" },
            total_seconds: { $sum: "$seconds_played" },
            sessions: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            rom_slug: "$_id.rom_slug",
            rom_title: "$_id.rom_title",
            total_seconds: 1,
            sessions: 1,
          },
        },
        { $sort: { total_seconds: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    return result as { rom_slug: string; rom_title: string; total_seconds: number; sessions: number }[];
  });
