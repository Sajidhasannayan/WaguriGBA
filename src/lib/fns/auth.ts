import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { signToken } from "@/lib/jwt";
import { getUsersCollection } from "@/lib/mongodb";
import { requireAuth } from "@/integrations/auth-middleware";

export const signUp = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; username: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();

    // Validate username
    const uname = data.username.trim().toLowerCase();
    if (!uname || !/^[a-z0-9_]{3,24}$/.test(uname)) {
      throw new Error("Username must be 3–24 characters: letters, numbers, underscore");
    }

    // Check email uniqueness
    const existingEmail = await col.findOne({ email: data.email.toLowerCase().trim() });
    if (existingEmail) throw new Error("An account with that email already exists");

    // Check username uniqueness
    const existingUsername = await col.findOne({ username: uname });
    if (existingUsername) throw new Error("That username is already taken");

    const password_hash = await bcrypt.hash(data.password, 12);
    const now = new Date().toISOString();
    const result = await col.insertOne({
      email: data.email.toLowerCase().trim(),
      password_hash,
      role: "user",
      display_name: null,
      username: uname,
      bio: null,
      avatar_url: null,
      is_banned: false,
      banned_reason: null,
      last_seen: null,
      current_rom_slug: null,
      current_rom_title: null,
      created_at: now,
      last_login: now,
    });
    const token = await signToken({
      sub: result.insertedId.toHexString(),
      email: data.email.toLowerCase().trim(),
      role: "user",
    });
    return { token };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator((d: { emailOrUsername: string; password: string }) => d)
  .handler(async ({ data }) => {
    const col = await getUsersCollection();
    const identifier = data.emailOrUsername.trim().toLowerCase();

    // Try email first, then username
    let user = await col.findOne({ email: identifier });
    if (!user) {
      user = await col.findOne({ username: identifier });
    }
    if (!user) throw new Error("No account found with that email or username");

    const ok = await bcrypt.compare(data.password, user.password_hash as string);
    if (!ok) throw new Error("Incorrect password");
    if (user.is_banned) throw new Error("Your account has been banned");

    await col.updateOne(
      { _id: user._id },
      { $set: { last_login: new Date().toISOString() } }
    );
    const token = await signToken({
      sub: (user._id as ObjectId).toHexString(),
      email: user.email as string,
      role: (user.role as "user" | "admin") ?? "user",
    });
    return { token };
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const col = await getUsersCollection();
    const user = await col.findOne({ _id: new ObjectId(context.userId) });
    if (!user) throw new Error("User not found");
    return {
      id: (user._id as ObjectId).toHexString(),
      email: user.email as string,
      role: (user.role as string) ?? "user",
      display_name: user.display_name as string | null,
      username: user.username as string | null,
      bio: user.bio as string | null,
      avatar_url: user.avatar_url as string | null,
      is_banned: Boolean(user.is_banned),
      last_seen: user.last_seen as string | null,
      current_rom_slug: user.current_rom_slug as string | null,
      current_rom_title: user.current_rom_title as string | null,
      created_at: user.created_at as string,
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
    (d: {
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    }) => d
  )
  .handler(async ({ context, data }) => {
    const col = await getUsersCollection();
    const updates: Record<string, unknown> = {};
    const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
    if (data.display_name !== undefined) updates.display_name = str(data.display_name);
    if (data.bio !== undefined) updates.bio = str(data.bio);
    if (data.avatar_url !== undefined) updates.avatar_url = str(data.avatar_url);
    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: new ObjectId(context.userId) }, { $set: updates });
    }
    return { ok: true };
  });
