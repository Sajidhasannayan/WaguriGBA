import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, requireAuth } from "@/integrations/auth-middleware";

const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

async function uploadToImgbb(base64: string, name?: string): Promise<{ url: string; thumb_url: string }> {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw new Error("IMGBB_API_KEY is not configured on the server");

  const body = new URLSearchParams();
  body.set("key", key);
  body.set("image", base64);
  if (name) body.set("name", name);

  const res = await fetch(IMGBB_UPLOAD_URL, { method: "POST", body });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ImgBB error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: { url: string; display_url: string; thumb?: { url: string } };
    error?: { message: string };
  };

  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? "ImgBB upload failed");
  }

  return {
    url: json.data.display_url,
    thumb_url: json.data.thumb?.url ?? json.data.display_url,
  };
}

export const adminUploadCoverToImgbb = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { base64: string; name?: string }) => {
    if (!d.base64 || typeof d.base64 !== "string") throw new Error("No image data provided");
    if (d.base64.length > 11_000_000) throw new Error("Image is too large (max ~8 MB)");
    return d;
  })
  .handler(async ({ data }) => {
    return uploadToImgbb(data.base64, data.name);
  });

export const uploadAvatarToImgbb = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: { base64: string; name?: string }) => {
    if (!d.base64 || typeof d.base64 !== "string") throw new Error("No image data provided");
    if (d.base64.length > 11_000_000) throw new Error("Image is too large (max ~8 MB)");
    return d;
  })
  .handler(async ({ data }) => {
    return uploadToImgbb(data.base64, data.name);
  });
