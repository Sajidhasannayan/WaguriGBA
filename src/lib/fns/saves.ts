import { createServerFn } from "@tanstack/react-start";
import { Binary, ObjectId } from "mongodb";
import { getSavesCollection } from "@/lib/mongodb";
import { requireAuth } from "@/integrations/auth-middleware";

export const getSave = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((d: { romSlug: string }) => d)
  .handler(async ({ context, data }) => {
    const col = await getSavesCollection();
    const doc = await col.findOne({
      user_id: context.userId,
      rom_slug: data.romSlug,
    });
    if (!doc?.data) return null;
    const bytes = (doc.data as Binary).buffer;
    const arr = new Uint8Array(bytes);
    let b64 = "";
    for (let i = 0; i < arr.length; i++) b64 += String.fromCharCode(arr[i]);
    return btoa(b64);
  });

export const uploadSave = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
    (d: {
      romSlug: string;
      romTitle: string;
      dataBase64: string;
      sizeBytes: number;
    }) => d
  )
  .handler(async ({ context, data }) => {
    const col = await getSavesCollection();
    const raw = atob(data.dataBase64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const binary = new Binary(Buffer.from(bytes));
    await col.updateOne(
      { user_id: context.userId, rom_slug: data.romSlug },
      {
        $set: {
          rom_title: data.romTitle,
          data: binary,
          size_bytes: data.sizeBytes,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: {
          user_id: context.userId,
          rom_slug: data.romSlug,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    return { ok: true };
  });

export const listSaves = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const col = await getSavesCollection();
    const docs = await col
      .find({ user_id: context.userId })
      .sort({ updated_at: -1 })
      .project({ data: 0 })
      .toArray();
    return docs.map((d) => ({
      id: (d._id as ObjectId).toHexString(),
      rom_slug: d.rom_slug as string,
      rom_title: d.rom_title as string,
      size_bytes: d.size_bytes as number,
      updated_at: d.updated_at as string,
    }));
  });

export const deleteSave = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { saveId: string }) => d)
  .handler(async ({ context, data }) => {
    const col = await getSavesCollection();
    await col.deleteOne({
      _id: new ObjectId(data.saveId),
      user_id: context.userId,
    });
    return { ok: true };
  });
