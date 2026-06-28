import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(s);
};

export interface AppJWTPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<AppJWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AppJWTPayload;
  } catch {
    return null;
  }
}
