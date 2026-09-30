import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthSession, OwnerSessionPayload, CustomerSessionPayload } from "./types";

const COOKIE_NAME = "rajveer_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "rajveer-fallback-secret-minimum-32-chars-long";
  return new TextEncoder().encode(secret);
}

/**
 * Sign a session JWT with given payload and expiration
 */
export async function signSession(
  payload: OwnerSessionPayload | CustomerSessionPayload,
  expiresInSeconds: number
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getSecretKey());
}

/**
 * Verify session token and return parsed payload
 */
export async function verifySession(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role === "owner") {
      return {
        role: "owner",
        ownerId: payload.ownerId as string,
        username: payload.username as string,
      };
    } else if (payload.role === "customer") {
      return {
        role: "customer",
        customerId: payload.customerId as string,
        username: payload.username as string,
        name: payload.name as string,
        isDirectLink: payload.isDirectLink as boolean | undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set HTTP-only session cookie
 */
export async function setSessionCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

/**
 * Remove session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

/**
 * Require an owner session or redirect to /login
 */
export async function requireOwner(): Promise<OwnerSessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    redirect("/login");
  }
  return session;
}

/**
 * Require a customer session or redirect to /login
 */
export async function requireCustomer(): Promise<CustomerSessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/login");
  }
  return session;
}
