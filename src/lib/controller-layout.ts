import { getLayout as getLayoutFn, saveLayout as saveLayoutFn } from "@/lib/fns/layouts";

export type ButtonId =
  | "up" | "down" | "left" | "right"
  | "a" | "b" | "l" | "r"
  | "start" | "select";

export type ButtonLayout = {
  id: ButtonId;
  x: number;
  y: number;
  size: number;
};

export type ControllerLayout = {
  version: 1;
  buttons: ButtonLayout[];
};

export const DEFAULT_LAYOUT: ControllerLayout = {
  version: 1,
  buttons: [
    { id: "up",    x: 12, y: 62, size: 11 },
    { id: "down",  x: 12, y: 84, size: 11 },
    { id: "left",  x: 4,  y: 73, size: 11 },
    { id: "right", x: 20, y: 73, size: 11 },
    { id: "a",     x: 88, y: 70, size: 13 },
    { id: "b",     x: 74, y: 80, size: 13 },
    { id: "l",     x: 6,  y: 46, size: 10 },
    { id: "r",     x: 86, y: 46, size: 10 },
    { id: "start",  x: 58, y: 94, size: 8 },
    { id: "select", x: 42, y: 94, size: 8 },
  ],
};

export const BUTTON_KEYS: Record<ButtonId, { key: string; code: string; keyCode: number }> = {
  up:     { key: "ArrowUp",    code: "ArrowUp",    keyCode: 38 },
  down:   { key: "ArrowDown",  code: "ArrowDown",  keyCode: 40 },
  left:   { key: "ArrowLeft",  code: "ArrowLeft",  keyCode: 37 },
  right:  { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  a:      { key: "x", code: "KeyX", keyCode: 88 },
  b:      { key: "z", code: "KeyZ", keyCode: 90 },
  l:      { key: "a", code: "KeyA", keyCode: 65 },
  r:      { key: "s", code: "KeyS", keyCode: 83 },
  start:  { key: "Enter", code: "Enter", keyCode: 13 },
  select: { key: "Shift", code: "ShiftRight", keyCode: 16 },
};

export const BUTTON_LABELS: Record<ButtonId, string> = {
  up: "▲", down: "▼", left: "◀", right: "▶",
  a: "A", b: "B", l: "L", r: "R",
  start: "START", select: "SELECT",
};

export async function loadLayout(_userId: string, romSlug: string): Promise<ControllerLayout> {
  try {
    const layout = await getLayoutFn({ data: { romSlug } });
    return layout ?? DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export async function saveLayout(
  _userId: string,
  romSlug: string,
  layout: ControllerLayout
): Promise<void> {
  await saveLayoutFn({ data: { romSlug, layout } });
}
