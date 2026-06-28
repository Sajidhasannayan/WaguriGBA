import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/mongodb";
import { requireAdmin } from "@/integrations/auth-middleware";
import { signToken } from "@/lib/jwt";

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const col = await getUsersCollection();
    const users = await col
      .find({})
      .sort({ created_at: -1 })
      .project({
        password_hash: 0,
      })
      .toArray();
    return users.map((u) => ({
      id: (u._id as ObjectId).toHexString(),
      email: u.email as string,
      display_name: (u.display_name as string) ?? null,
      username: (u.username as string) ?? null,
      avatar_url: (u.avatar_url as string) ?? null,
      last_seen: (u.last_seen as string) ?? null,
      created_at: u.created_at as string,
      last_login: (u.last_login as string) ?? null,
      is_banned: Boolean(u.is_banned),
      banned_reason: (u.banned_reason as string) ?? null,
      role: (u.role as string) ?? "user",
      current_rom_title: (u.current_rom_title as string) ?? null,
    }));
  });

export const adminSetBanned = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { userId: string; banned: boolean; reason?: string | null }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    await col.updateOne(
      { _id: new ObjectId(data.userId) },
      {
        $set: {
          is_banned: data.banned,
          banned_reason: data.banned ? (data.reason ?? null) : null,
        },
      }
    );
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { userId: string; role: "user" | "admin" }) => d)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("Cannot change your own role");
    const col = await getUsersCollection();
    await col.updateOne(
      { _id: new ObjectId(data.userId) },
      { $set: { role: data.role } }
    );
    return { ok: true };
  });

export const searchUsers = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    const term = data.q.trim();
    if (!term) return [];
    const docs = await col
      .find({
        username: { $exists: true, $ne: null },
        $or: [
          { username: { $regex: term, $options: "i" } },
          { display_name: { $regex: term, $options: "i" } },
        ],
      })
      .limit(8)
      .project({ password_hash: 0 })
      .toArray();
    return docs.map((u) => ({
      id: (u._id as ObjectId).toHexString(),
      username: u.username as string,
      display_name: (u.display_name as string) ?? null,
      avatar_url: (u.avatar_url as string) ?? null,
      last_seen: (u.last_seen as string) ?? null,
    }));
  });

export const adminSetUsername = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { userId: string; username: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    const uname = data.username.trim().toLowerCase();
    if (!uname || !/^[a-z0-9_]{3,24}$/.test(uname)) {
      throw new Error("Username must be 3–24 characters: letters, numbers, underscore");
    }
    const taken = await col.findOne({
      username: uname,
      _id: { $ne: new ObjectId(data.userId) },
    });
    if (taken) throw new Error("That username is already taken");
    await col.updateOne(
      { _id: new ObjectId(data.userId) },
      { $set: { username: uname } }
    );
    return { ok: true };
  });

export const adminRefreshToken = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    const user = await col.findOne({ _id: new ObjectId(data.userId) });
    if (!user) throw new Error("User not found");
    const token = await signToken({
      sub: (user._id as ObjectId).toHexString(),
      email: user.email as string,
      role: (user.role as "user" | "admin") ?? "user",
    });
    return { token };
  });
