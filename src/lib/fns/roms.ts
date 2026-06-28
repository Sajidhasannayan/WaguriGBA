import { createServerFn } from "@tanstack/react-start";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { requireAdmin } from "@/integrations/auth-middleware";

export type RomCategory = "official" | "hack";

type RomEntry = {
  id: string;
  title: string;
  slug: string;
  category: RomCategory;
  description: string | null;
  cover_url: string | null;
  rom_url: string | null;
  uploader_id: string | null;
  is_public: boolean;
  created_at: string;
};

function catalogPath() {
  return path.join(os.homedir(), ".wagurigba", "catalog.json");
}

async function readCatalog(): Promise<RomEntry[]> {
  try {
    const data = await fs.readFile(catalogPath(), "utf-8");
    return JSON.parse(data) as RomEntry[];
  } catch {
    return [];
  }
}

async function writeCatalog(roms: RomEntry[]): Promise<void> {
  const dir = path.dirname(catalogPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(catalogPath(), JSON.stringify(roms, null, 2), "utf-8");
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || `rom-${Date.now()}`
  );
}

export const listRoms = createServerFn({ method: "GET" }).handler(async () => {
  const roms = await readCatalog();
  return roms
    .filter((r) => r.is_public)
    .map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      category: r.category,
      description: r.description,
      cover_url: r.cover_url,
      rom_url: r.rom_url,
      uploader_id: r.uploader_id,
    }));
});

export const getRomBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const roms = await readCatalog();
    const rom = roms.find((r) => r.slug === data.slug);
    if (!rom) return null;
    return {
      id: rom.id,
      title: rom.title,
      slug: rom.slug,
      category: rom.category,
      description: rom.description,
      cover_url: rom.cover_url,
      rom_url: rom.rom_url,
    };
  });

export const adminCreateRom = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(
    (d: {
      title: string;
      category: RomCategory;
      description?: string;
      rom_url: string;
      cover_url?: string;
    }) => d
  )
  .handler(async ({ context, data }) => {
    const roms = await readCatalog();
    const slug = slugify(data.title);
    const existing = roms.find((r) => r.slug === slug);
    if (existing) throw new Error(`A ROM with slug "${slug}" already exists`);

    const newRom: RomEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: data.title.trim(),
      slug,
      category: data.category,
      description: data.description?.trim() ?? null,
      rom_url: data.rom_url.trim(),
      cover_url: data.cover_url?.trim() ?? null,
      is_public: true,
      uploader_id: context.userId,
      created_at: new Date().toISOString(),
    };

    roms.push(newRom);
    await writeCatalog(roms);
    return { slug };
  });

export const adminDeleteRom = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { romId: string }) => d)
  .handler(async ({ data }) => {
    const roms = await readCatalog();
    const target = roms.find((r) => r.id === data.romId);

    if (target?.rom_url) {
      try {
        const url = new URL(target.rom_url, "http://localhost");
        const filename = url.searchParams.get("file");
        if (filename && /^[a-zA-Z0-9._-]+$/.test(filename)) {
          const filePath = path.join(process.cwd(), "public", "roms", filename);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {
      }
    }

    const updated = roms.filter((r) => r.id !== data.romId);
    await writeCatalog(updated);
    return { ok: true };
  });
