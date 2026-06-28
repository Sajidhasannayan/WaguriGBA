import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI environment variable");

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export default clientPromise;

const DB = "wagurigba";

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB);
}

// ── Admin account bootstrap ───────────────────────────────────────────────────

const ADMIN_EMAIL = "sksajidul01952411@gmail.com";
const ADMIN_PASSWORD = "4pkj9!uwoj69ttsajidobhai7!";

let _adminSeeded: Promise<void> | null = null;

async function _seedAdminAccount() {
  const col = (await getDb()).collection("users");
  const existing = await col.findOne({ email: ADMIN_EMAIL });
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const now = new Date().toISOString();

  if (!existing) {
    await col.insertOne({
      email: ADMIN_EMAIL,
      password_hash,
      role: "admin",
      display_name: "Admin",
      username: "admin",
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
  } else {
    await col.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { password_hash, role: "admin" } }
    );
  }
}

// ── Indexes ────────────────────────────────────────────────────────────────────

let _usersIndexesEnsured: Promise<void> | null = null;

async function _ensureUsersIndexes() {
  const col = (await getDb()).collection("users");
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex(
    { username: 1 },
    { unique: true, partialFilterExpression: { username: { $type: "string" } } }
  );
}

export async function getUsersCollection() {
  if (!_usersIndexesEnsured) {
    _usersIndexesEnsured = _ensureUsersIndexes();
  }
  await _usersIndexesEnsured;

  if (!_adminSeeded) {
    _adminSeeded = _seedAdminAccount().catch((e) =>
      console.error("[admin-seed] failed:", e)
    );
  }

  return (await getDb()).collection("users");
}

export async function getRomsCollection() {
  return (await getDb()).collection("roms");
}
export async function getSavesCollection() {
  return (await getDb()).collection("game_saves");
}
export async function getLayoutsCollection() {
  return (await getDb()).collection("controller_layouts");
}
export async function getPlaySessionsCollection() {
  return (await getDb()).collection("play_sessions");
}
