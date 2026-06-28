import { createServerFn } from "@tanstack/react-start";
import { getLayoutsCollection } from "@/lib/mongodb";
import { requireAuth } from "@/integrations/auth-middleware";
import type { ControllerLayout } from "@/lib/controller-layout";

export const getLayout = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((d: { romSlug: string }) => d)
  .handler(async ({ context, data }) => {
    const col = await getLayoutsCollection();
    const doc = await col.findOne({
      user_id: context.userId,
      name: data.romSlug,
    });
    if (doc?.layout) return doc.layout as unknown as ControllerLayout;
    const def = await col.findOne({ user_id: context.userId, is_default: true });
    if (def?.layout) return def.layout as unknown as ControllerLayout;
    return null;
  });

export const saveLayout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { romSlug: string; layout: ControllerLayout }) => d)
  .handler(async ({ context, data }) => {
    const col = await getLayoutsCollection();
    await col.updateOne(
      { user_id: context.userId, name: data.romSlug },
      {
        $set: {
          layout: data.layout as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: {
          user_id: context.userId,
          name: data.romSlug,
          is_default: false,
        },
      },
      { upsert: true }
    );
    return { ok: true };
  });
