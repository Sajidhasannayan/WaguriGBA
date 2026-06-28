import { getSave, uploadSave } from "@/lib/fns/saves";

export async function downloadSaveForSlug(
  _userId: string,
  romSlug: string
): Promise<Uint8Array | null> {
  try {
    const b64 = await getSave({ data: { romSlug } });
    if (!b64) return null;
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function uploadSaveForSlug(
  _userId: string,
  romSlug: string,
  romTitle: string,
  data: Uint8Array
): Promise<void> {
  let b64 = "";
  for (let i = 0; i < data.length; i++) b64 += String.fromCharCode(data[i]);
  await uploadSave({
    data: {
      romSlug,
      romTitle,
      dataBase64: btoa(b64),
      sizeBytes: data.byteLength,
    },
  });
}
