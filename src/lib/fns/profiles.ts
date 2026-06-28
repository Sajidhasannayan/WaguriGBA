import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/mongodb";

export const getPublicProfile = createServerFn({ method: "GET" })
  .validator((d: { username: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    const user = await col.findOne(
      { username: data.username },
      { projection: { password_hash: 0 } }
    );
    if (!user) return null;
    return {
      id: (user._id as ObjectId).toHexString(),
      display_name: (user.display_name as string) ?? null,
      username: (user.username as string) ?? null,
      bio: (user.bio as string) ?? null,
      avatar_url: (user.avatar_url as string) ?? null,
      last_seen: (user.last_seen as string) ?? null,
      current_rom_slug: (user.current_rom_slug as string) ?? null,
      current_rom_title: (user.current_rom_title as string) ?? null,
      is_banned: Boolean(user.is_banned),
      role: (user.role as string) ?? "user",
    };
  });
