import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Library as LibraryIcon,
  Search,
  Sparkles,
  Wrench,
  PlayCircle,
  Upload,
  Trash2,
  Loader2,
  ShieldCheck,
  Link as LinkIcon,
  ImageUp,
  FileUp,
  X,
  HardDrive,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  listRoms,
  adminCreateRom,
  adminDeleteRom,
  type RomCategory,
} from "@/lib/fns/roms";
import { adminUploadCoverToImgbb } from "@/lib/fns/imgbb";
import { getStoredToken, decodeToken } from "@/lib/token";
import { ImageCropModal } from "@/components/image-crop-modal";

export const Route = createFileRoute("/library")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const token = getStoredToken();
    if (!token || !decodeToken(token)) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Library · WaguriGBA" },
      { name: "description", content: "Browse official GBA games and ROM hacks." },
    ],
  }),
  component: LibraryPage,
});

type Rom = {
  id: string;
  title: string;
  slug: string;
  category: "official" | "hack";
  description: string | null;
  cover_url: string | null;
  rom_url: string | null;
  uploader_id: string | null;
};

// ─── page ─────────────────────────────────────────────────────────────────────

function LibraryPage() {
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["roms"],
    queryFn: () => listRoms(),
  });

  const filter = (list: Rom[] | undefined) =>
    (list ?? []).filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan">
              <LibraryIcon className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest">Library</span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Pick a game</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Play ROMs in the library, or bring your own{" "}
              <code className="font-mono">.gba</code> file.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="pl-9"
            />
          </div>
        </div>

        <BringYourOwn />

        {user && isAdmin && (
          <AdminAdd onAdded={() => qc.invalidateQueries({ queryKey: ["roms"] })} />
        )}

        <Tabs defaultValue="official" className="mt-8">
          <TabsList className="bg-surface">
            <TabsTrigger value="official">
              <Sparkles className="mr-2 h-4 w-4" />Official ROMs
            </TabsTrigger>
            <TabsTrigger value="hack">
              <Wrench className="mr-2 h-4 w-4" />ROM Hacks
            </TabsTrigger>
          </TabsList>

          {(["official", "hack"] as const).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6">
              {isLoading ? (
                <SkeletonGrid />
              ) : (
                <RomGrid
                  roms={filter(data?.filter((r) => r.category === cat))}
                  isAdmin={isAdmin}
                  onDeleted={() => qc.invalidateQueries({ queryKey: ["roms"] })}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

// ─── bring your own ───────────────────────────────────────────────────────────

function BringYourOwn() {
  return (
    <div className="card-glass mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Bring your own ROM</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Have a <code className="font-mono text-cyan">.gba</code> file on your device? Pick it on
          the player page — it stays in your browser and never gets uploaded.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/play/$slug" params={{ slug: "custom" }}>
          <Upload className="mr-2 h-4 w-4" />
          Play my .gba
        </Link>
      </Button>
    </div>
  );
}

// ─── Google Drive URL helpers ─────────────────────────────────────────────────

function normalizeGoogleDriveUrl(input: string): string {
  const trimmed = input.trim();
  // https://drive.google.com/file/d/FILE_ID/view?...
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.usercontent.google.com/u/0/uc?id=${fileMatch[1]}&export=download`;
  }
  // https://drive.google.com/open?id=FILE_ID
  const openMatch = trimmed.match(/drive\.google\.com\/open\?.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.usercontent.google.com/u/0/uc?id=${openMatch[1]}&export=download`;
  }
  // https://docs.google.com/uc?id=FILE_ID  or already usercontent format
  return trimmed;
}

function isGoogleDriveUrl(url: string): boolean {
  return (
    url.includes("drive.google.com") ||
    url.includes("drive.usercontent.google.com") ||
    url.includes("docs.google.com/uc")
  );
}

// ─── admin panel ──────────────────────────────────────────────────────────────

type RomInputMode = "url" | "file";

function AdminAdd({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RomCategory>("official");
  const [description, setDescription] = useState("");

  // ROM source
  const [romMode, setRomMode] = useState<RomInputMode>("url");
  const [romUrl, setRomUrl] = useState("");
  const [romFile, setRomFile] = useState<File | null>(null);
  const [uploadingRom, setUploadingRom] = useState(false);
  const romFileRef = useRef<HTMLInputElement>(null);

  // Cover image
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const [busy, setBusy] = useState(false);

  // ── upload ROM file to server ──────────────────────────────────────────────
  async function handleRomFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRomFile(file);
    setUploadingRom(true);
    try {
      const token = getStoredToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/roms/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setRomUrl(json.url ?? "");
      toast.success(`ROM saved: ${json.url}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ROM upload failed");
      setRomFile(null);
    } finally {
      setUploadingRom(false);
    }
  }

  // ── pick cover image → open crop modal ────────────────────────────────────
  function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    if (coverFileRef.current) coverFileRef.current.value = "";
  }

  // ── after crop: upload cropped image to ImgBB ─────────────────────────────
  async function handleCoverCropComplete(base64: string) {
    setUploadingCover(true);
    try {
      const result = await adminUploadCoverToImgbb({
        data: { base64, name: title.trim() || "cover" },
      });
      setCoverUrl(result.url);
      toast.success("Cover uploaded to ImgBB");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setUploadingCover(false);
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Enter a title");
    if (!romUrl.trim()) return toast.error("Provide a ROM URL or upload a file");
    setBusy(true);
    try {
      await adminCreateRom({
        data: {
          title,
          category,
          description: description || undefined,
          rom_url: romUrl,
          cover_url: coverUrl || undefined,
        },
      });
      toast.success(`Added "${title.trim()}" to the library`);
      setTitle("");
      setDescription("");
      setRomUrl("");
      setRomFile(null);
      setCoverUrl("");
      setRomMode("url");
      if (romFileRef.current) romFileRef.current.value = "";
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add ROM");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card-glass mt-4 space-y-5 rounded-2xl p-5">
        {/* header */}
        <div className="flex items-center gap-2 text-magenta">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs uppercase tracking-widest font-medium">
            Admin · Add a game to the library
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* title */}
          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pokémon Emerald"
              required
            />
          </div>

          {/* category */}
          <div className="space-y-2">
            <Label className="text-xs">Category</Label>
            <div className="flex gap-2">
              {(["official", "hack"] as const).map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={category === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(c)}
                >
                  {c === "official" ? "Official" : "ROM Hack"}
                </Button>
              ))}
            </div>
          </div>

          {/* description */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short blurb shown on the card"
            />
          </div>

          {/* ROM source */}
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">ROM File</Label>
              {/* mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                <button
                  type="button"
                  onClick={() => { setRomMode("url"); setRomFile(null); setRomUrl(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    romMode === "url"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface hover:bg-surface/80 text-muted-foreground"
                  }`}
                >
                  <LinkIcon className="h-3 w-3" />
                  Link URL
                </button>
                <button
                  type="button"
                  onClick={() => { setRomMode("file"); setRomUrl(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    romMode === "file"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface hover:bg-surface/80 text-muted-foreground"
                  }`}
                >
                  <FileUp className="h-3 w-3" />
                  Upload File
                </button>
              </div>
            </div>

            {romMode === "url" ? (
              <div className="space-y-2">
                <div className="relative">
                  {isGoogleDriveUrl(romUrl) ? (
                    <HardDrive className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan" />
                  ) : (
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <Input
                    value={romUrl}
                    onChange={(e) => {
                      const normalized = normalizeGoogleDriveUrl(e.target.value);
                      setRomUrl(normalized);
                    }}
                    placeholder="https://example.com/game.gba  or  Google Drive link"
                    className="pl-9"
                  />
                </div>
                {isGoogleDriveUrl(romUrl) ? (
                  <p className="flex items-center gap-1.5 text-xs text-cyan">
                    <HardDrive className="h-3 w-3" />
                    Google Drive link detected — ROM will be downloaded to the player's browser at launch.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Direct download link to a{" "}
                    <code className="font-mono">.gba</code> or{" "}
                    <code className="font-mono">.zip</code> file. Google Drive share links are automatically converted.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={romFileRef}
                  type="file"
                  accept=".gba,.gbc,.gb,.zip"
                  className="hidden"
                  onChange={handleRomFileChange}
                />

                {romFile && romUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
                    <FileUp className="h-4 w-4 shrink-0 text-cyan" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{romFile.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{romUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setRomFile(null); setRomUrl(""); if (romFileRef.current) romFileRef.current.value = ""; }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : uploadingRom ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading ROM to server…
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => romFileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface/40 py-6 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    <FileUp className="h-5 w-5" />
                    Click to pick a .gba / .gbc / .zip file
                  </button>
                )}
              </div>
            )}
          </div>

          {/* cover image */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Cover Image (optional)</Label>

            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg  or upload →"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={uploadingCover}
                onClick={() => coverFileRef.current?.click()}
              >
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageUp className="h-4 w-4" />
                )}
                {uploadingCover ? "Uploading…" : "Upload & Crop"}
              </Button>
            </div>

            {coverUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={coverUrl}
                  alt="cover preview"
                  className="h-20 w-32 rounded-lg object-contain border border-border bg-surface/60"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={busy || uploadingRom || uploadingCover}
          className="bg-gradient-to-r from-primary to-magenta text-primary-foreground"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Add to library
        </Button>
      </form>

      {/* Cover crop modal */}
      {cropSrc && (
        <ImageCropModal
          open={showCropModal}
          onClose={() => { setShowCropModal(false); setCropSrc(null); }}
          imageSrc={cropSrc}
          aspect={3 / 2}
          title="Crop ROM Cover Image"
          onCropComplete={handleCoverCropComplete}
        />
      )}
    </>
  );
}

// ─── rom grid ─────────────────────────────────────────────────────────────────

function RomGrid({
  roms,
  isAdmin,
  onDeleted,
}: {
  roms: Rom[];
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(rom: Rom) {
    if (!confirm(`Delete "${rom.title}" from the library? This cannot be undone.`)) return;
    setDeletingId(rom.id);
    try {
      await adminDeleteRom({ data: { romId: rom.id } });
      toast.success(`"${rom.title}" removed`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (roms.length === 0) {
    return (
      <div className="card-glass mt-2 rounded-2xl p-12 text-center text-sm text-muted-foreground">
        No games here yet.{" "}
        {isAdmin
          ? "Use the admin panel above to add one."
          : "Check back once the admin adds one."}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roms.map((rom) => (
        <div
          key={rom.id}
          className="card-glass group relative block overflow-hidden rounded-2xl transition hover:ring-glow"
        >
          <Link to="/play/$slug" params={{ slug: rom.slug }} className="block">
            <div className="relative aspect-[3/2] bg-gradient-to-br from-primary/20 via-cyan/10 to-magenta/20">
              {rom.cover_url ? (
                <img
                  src={rom.cover_url}
                  alt={rom.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <PlayCircle className="h-12 w-12 text-foreground/60 transition group-hover:scale-110 group-hover:text-foreground" />
                </div>
              )}
              <Badge
                className="absolute right-3 top-3 bg-background/80 text-foreground backdrop-blur"
                variant="outline"
              >
                {rom.category === "official" ? "Official" : "ROM Hack"}
              </Badge>
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-semibold">{rom.title}</h3>
              {rom.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {rom.description}
                </p>
              )}
            </div>
          </Link>

          {isAdmin && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute bottom-3 right-3 gap-1.5"
              disabled={deletingId === rom.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(rom);
              }}
            >
              {deletingId === rom.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-glass h-64 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
