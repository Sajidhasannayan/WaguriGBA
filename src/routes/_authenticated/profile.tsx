import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download, Trash2, User as UserIcon, Save as SaveIcon, PlayCircle,
  Shield, Clock, Gamepad2, Ban, CheckCircle2, Crown, Loader2, ExternalLink,
  Link as LinkIcon, CalendarDays, AtSign, Lock, Pencil, X, Check, AlertCircle,
  ImageUp,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/user-avatar";
import { formatPlaytime, isOnline } from "@/lib/presence";
import { getMe, updateProfile } from "@/lib/fns/auth";
import { listSaves, deleteSave, getSave } from "@/lib/fns/saves";
import { getUserPlaytime } from "@/lib/fns/presence";
import { adminListUsers, adminSetBanned, adminSetRole, adminSetUsername } from "@/lib/fns/admin";
import { uploadAvatarToImgbb } from "@/lib/fns/imgbb";
import { ImageCropModal } from "@/components/image-crop-modal";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · WaguriGBA" }] }),
  component: ProfilePage,
});

type Save = {
  id: string;
  rom_slug: string;
  rom_title: string;
  size_bytes: number;
  updated_at: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => getMe(),
  });

  const { data: saves } = useQuery({
    queryKey: ["saves", user?.id],
    enabled: !!user,
    queryFn: () => listSaves(),
  });

  const { data: playtime } = useQuery({
    queryKey: ["playtime", user?.id],
    enabled: !!user,
    queryFn: () => getUserPlaytime({ data: { userId: user!.id } }),
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const initialized = useRef(false);

  // Avatar upload + crop state
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profile || initialized.current) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setAdminUsername(profile.username ?? "");
    initialized.current = true;
  }, [profile]);

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    // reset so same file can be picked again
    if (avatarFileRef.current) avatarFileRef.current.value = "";
  }

  async function handleAvatarCropComplete(base64: string) {
    setUploadingAvatar(true);
    try {
      const result = await uploadAvatarToImgbb({
        data: { base64, name: user?.email ?? "avatar" },
      });
      setAvatarUrl(result.url);
      toast.success("Avatar uploaded — click Save profile to apply");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfileData() {
    setSaving(true);
    try {
      await updateProfile({ data: { display_name: displayName, bio, avatar_url: avatarUrl || undefined } });
      toast.success("Profile updated");
      initialized.current = false;
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdminUsername() {
    const u = adminUsername.trim();
    if (!u || !/^[a-zA-Z0-9_]{3,24}$/.test(u)) {
      return toast.error("Username must be 3–24 characters: letters, numbers, underscore");
    }
    setSavingUsername(true);
    try {
      await adminSetUsername({ data: { userId: user!.id, username: u } });
      toast.success("Username updated");
      initialized.current = false;
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  }

  async function downloadSave(s: Save) {
    try {
      const b64 = await getSave({ data: { romSlug: s.rom_slug } });
      if (!b64) return toast.error("Save not found");
      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.rom_title}.sav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDeleteSave(s: Save) {
    if (!confirm(`Delete your save for ${s.rom_title}? This cannot be undone.`)) return;
    try {
      await deleteSave({ data: { saveId: s.id } });
      toast.success("Save deleted");
      qc.invalidateQueries({ queryKey: ["saves", user?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const online = isOnline(profile?.last_seen);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Profile header */}
        <div className="card-glass flex flex-wrap items-center gap-6 rounded-2xl p-6">
          <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? user?.email} size="xl" online={online} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">
                {profile?.display_name ?? "Player"}
              </h1>
              {isAdmin && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30" variant="outline">
                  <Crown className="mr-1 h-3 w-3" />Admin
                </Badge>
              )}
              {profile?.is_banned && (
                <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />Banned</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile?.username ? `@${profile.username}` : user?.email}
            </p>
            {profile?.created_at && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Member since {formatDate(profile.created_at)}
              </p>
            )}
            {profile?.current_rom_title && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Playing {profile.current_rom_title}
              </div>
            )}
          </div>
          {profile?.username && (
            <Button asChild variant="outline" size="sm">
              <Link to="/u/$username" params={{ username: profile.username }}>
                <ExternalLink className="mr-2 h-4 w-4" />View public profile
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue="profile" className="mt-8">
          <TabsList className="bg-surface">
            <TabsTrigger value="profile"><UserIcon className="mr-2 h-4 w-4" />Profile</TabsTrigger>
            <TabsTrigger value="saves"><SaveIcon className="mr-2 h-4 w-4" />Cloud Saves</TabsTrigger>
            <TabsTrigger value="games"><Gamepad2 className="mr-2 h-4 w-4" />Game Stats</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin"><Shield className="mr-2 h-4 w-4" />Admin</TabsTrigger>}
          </TabsList>

          {/* Profile tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="card-glass space-y-5 rounded-2xl p-6">
              {/* Account info card */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border/50 bg-surface/40 p-4">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <AtSign className="h-3 w-3" />Username
                    {!isAdmin && <Lock className="ml-auto h-3 w-3 text-muted-foreground/60" />}
                    {isAdmin && <span className="ml-auto text-xs text-amber-400">(Admin: editable)</span>}
                  </p>
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center rounded-md border border-input bg-transparent focus-within:ring-1 focus-within:ring-ring">
                        <span className="pl-3 text-muted-foreground text-sm">@</span>
                        <input
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          maxLength={24}
                          placeholder="yourhandle"
                          className="h-8 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button size="sm" onClick={saveAdminUsername} disabled={savingUsername} variant="outline">
                        {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">
                      {profile?.username ? `@${profile.username}` : <span className="italic text-muted-foreground">Not set</span>}
                    </p>
                  )}
                  {!isAdmin && <p className="text-xs text-muted-foreground">Username cannot be changed after account creation.</p>}
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarDays className="h-3 w-3" />Member since
                  </p>
                  <p className="text-sm font-medium">{formatDate(profile?.created_at)}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="What others see (can be changed anytime)" maxLength={64} />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell people what you play…" maxLength={300} />
                </div>

                {/* Avatar section */}
                <div className="space-y-3">
                  <Label>Profile Picture</Label>

                  {/* Preview */}
                  {avatarUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />Remove
                      </button>
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={uploadingAvatar}
                    onClick={() => avatarFileRef.current?.click()}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageUp className="h-4 w-4" />
                    )}
                    {uploadingAvatar ? "Uploading…" : "Upload photo"}
                  </Button>

                  {/* Manual URL fallback */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Or paste a direct image link:</p>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={saveProfileData} disabled={saving || uploadingAvatar} className="bg-gradient-to-r from-primary to-magenta text-primary-foreground">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save profile
              </Button>
            </div>
          </TabsContent>

          {/* Saves tab */}
          <TabsContent value="saves" className="mt-6">
            {!saves || saves.length === 0 ? (
              <div className="card-glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No cloud saves yet. Play a game and click <span className="text-foreground">Save to cloud</span> on the player.
              </div>
            ) : (
              <ul className="space-y-2">
                {(saves as Save[]).map((s) => (
                  <li key={s.id} className="card-glass flex flex-wrap items-center gap-3 rounded-xl p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-cyan">
                      <SaveIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm">{s.rom_title}.sav</div>
                      <div className="text-xs text-muted-foreground">
                        {(s.size_bytes / 1024).toFixed(1)} KB · updated {new Date(s.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/play/$slug" params={{ slug: s.rom_slug }}>
                        <PlayCircle className="mr-1 h-4 w-4" />Play
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadSave(s)}>
                      <Download className="mr-1 h-4 w-4" />Download
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteSave(s)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Game stats tab */}
          <TabsContent value="games" className="mt-6">
            {!playtime || playtime.length === 0 ? (
              <div className="card-glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No play time recorded yet. Start playing — sessions are tracked automatically.
              </div>
            ) : (
              <ul className="space-y-2">
                {playtime.map((p) => (
                  <li key={p.rom_slug} className="card-glass flex items-center gap-3 rounded-xl p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-magenta">
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.rom_title}</div>
                      <div className="text-xs text-muted-foreground">{p.sessions} session{p.sessions === 1 ? "" : "s"}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />{formatPlaytime(p.total_seconds)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Admin tab */}
          {isAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Avatar crop modal */}
      {cropSrc && (
        <ImageCropModal
          open={showCropModal}
          onClose={() => { setShowCropModal(false); setCropSrc(null); }}
          imageSrc={cropSrc}
          aspect={1}
          title="Crop Profile Picture"
          onCropComplete={handleAvatarCropComplete}
        />
      )}
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  created_at: string;
  is_banned: boolean;
  role: string;
  current_rom_title: string | null;
};

function AdminPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingUsernameId, setEditingUsernameId] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminListUsers(),
    refetchInterval: 30_000,
    retry: 2,
  });

  const filtered = (users ?? [] as AdminUser[]).filter((u) => {
    const s = q.toLowerCase();
    return (
      !s ||
      u.email?.toLowerCase().includes(s) ||
      u.display_name?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s)
    );
  });

  async function setBanned(row: AdminUser, banned: boolean) {
    setBusyId(row.id);
    const reason = banned ? prompt(`Ban ${row.email}? Optional reason:`, "") : null;
    if (banned && reason === null) { setBusyId(null); return; }
    try {
      await adminSetBanned({ data: { userId: row.id, banned, reason } });
      toast.success(banned ? "User banned" : "Ban lifted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusyId(null); }
  }

  async function toggleAdmin(row: AdminUser) {
    setBusyId(row.id);
    const newRole = row.role === "admin" ? "user" : "admin";
    try {
      await adminSetRole({ data: { userId: row.id, role: newRole } });
      toast.success(newRole === "admin" ? "Admin granted" : "Admin revoked");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusyId(null); }
  }

  function startEditUsername(row: AdminUser) {
    setEditingUsernameId(row.id);
    setUsernameInput(row.username ?? "");
  }

  async function saveUsername(row: AdminUser) {
    const u = usernameInput.trim();
    if (!u || !/^[a-zA-Z0-9_]{3,24}$/.test(u)) {
      return toast.error("Username must be 3–24 characters: letters, numbers, underscore");
    }
    setBusyId(row.id);
    try {
      await adminSetUsername({ data: { userId: row.id, username: u } });
      toast.success(`Username set to @${u.toLowerCase()}`);
      setEditingUsernameId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">All users</h2>
          <p className="text-xs text-muted-foreground">
            {users?.length ?? 0} total · auto-refreshes every 30s
          </p>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name, username…" className="max-w-xs" />
      </div>

      {isLoading && (
        <div className="card-glass flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      )}

      {isError && (
        <div className="card-glass flex items-center gap-3 rounded-2xl border border-destructive/30 p-6 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load users</p>
            <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          </div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <ul className="space-y-2">
          {filtered.map((u) => {
            const online = isOnline(u.last_seen);
            const isEditingUsername = editingUsernameId === u.id;
            return (
              <li key={u.id} className="card-glass rounded-xl p-4 space-y-3">
                {/* Row 1: avatar + name + badges + actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <UserAvatar src={u.avatar_url} name={u.display_name ?? u.email} size="md" online={online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{u.display_name ?? <span className="italic text-muted-foreground">No display name</span>}</span>
                      {u.role === "admin" && (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                          <Crown className="mr-1 h-3 w-3" />admin
                        </Badge>
                      )}
                      {u.is_banned && <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />banned</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} ·{" "}
                      {online ? <span className="text-emerald-400">online</span> : `last seen ${u.last_seen ? new Date(u.last_seen).toLocaleString() : "never"}`}
                      {u.current_rom_title && <span className="ml-2 text-emerald-300">· playing {u.current_rom_title}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {busyId === u.id && !isEditingUsername ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u)} title={u.role === "admin" ? "Revoke admin" : "Grant admin"}>
                          <Crown className="h-4 w-4" />
                        </Button>
                        {u.is_banned ? (
                          <Button size="sm" variant="outline" onClick={() => setBanned(u, false)}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />Unban
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setBanned(u, true)} className="text-destructive hover:text-destructive">
                            <Ban className="mr-1 h-4 w-4" />Ban
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: username editor + account info */}
                <div className="flex flex-wrap items-center gap-4 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AtSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {isEditingUsername ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          maxLength={24}
                          autoFocus
                          className="h-6 w-32 rounded border border-input bg-transparent px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button onClick={() => saveUsername(u)} disabled={!!busyId} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                          {busyId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setEditingUsernameId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {u.username ? `@${u.username}` : <span className="italic">no username</span>}
                        </span>
                        <button onClick={() => startEditUsername(u)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Joined {formatDate(u.created_at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
