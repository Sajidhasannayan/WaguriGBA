export const TOKEN_KEY = "wagurigba_token";
export const AUTH_EVENT = "wagurigba:auth";

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + padding);
    const payload = JSON.parse(json);
    if (!payload.sub || !payload.email) return null;
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return { id: payload.sub, email: payload.email, role: payload.role ?? "user" };
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getCurrentUser(): AuthUser | null {
  const token = getStoredToken();
  if (!token) return null;
  return decodeToken(token);
}
