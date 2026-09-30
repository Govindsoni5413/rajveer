"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { signSession, setSessionCookie, clearSessionCookie } from "@/lib/session";
import { checkRateLimit, recordLoginAttempt } from "@/lib/rate-limit";

const ownerLoginSchema = z.object({
  username: z.string().min(1, "Username is required").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const customerLoginSchema = z.object({
  username: z.string().min(1, "Username is required").trim().toLowerCase(),
  pin: z.string().length(4, "PIN must be exactly 4 digits").regex(/^\d{4}$/, "PIN must be 4 digits"),
});

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return h.get("x-real-ip") || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

export type AuthActionResult = {
  success: boolean;
  error?: string;
  remainingMinutes?: number;
};

/**
 * Handle Owner Login
 */
export async function loginOwnerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const parsed = ownerLoginSchema.safeParse({ username, password });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid credentials",
    };
  }

  const cleanUsername = parsed.data.username;
  const cleanPassword = parsed.data.password;
  const clientIp = await getClientIp();

  // Rate limit checks (on username & IP)
  const userRate = await checkRateLimit(cleanUsername);
  if (userRate.blocked) {
    return {
      success: false,
      error: `Too many failed attempts. Account locked. Please try again in ${userRate.remainingMinutes} minute(s).`,
      remainingMinutes: userRate.remainingMinutes,
    };
  }

  const ipRate = await checkRateLimit(clientIp);
  if (ipRate.blocked) {
    return {
      success: false,
      error: `Too many failed attempts from your network. Please try again in ${ipRate.remainingMinutes} minute(s).`,
      remainingMinutes: ipRate.remainingMinutes,
    };
  }

  try {
    const db = getDb();
    const { data: owner, error } = await db
      .from("owners")
      .select("id, username, password_hash")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error || !owner) {
      await recordLoginAttempt(cleanUsername, false);
      await recordLoginAttempt(clientIp, false);
      return {
        success: false,
        error: "Incorrect username or password",
      };
    }

    const passwordMatch = await bcrypt.compare(cleanPassword, owner.password_hash);
    if (!passwordMatch) {
      await recordLoginAttempt(cleanUsername, false);
      await recordLoginAttempt(clientIp, false);
      return {
        success: false,
        error: "Incorrect username or password",
      };
    }

    // Success: 7 days session
    await recordLoginAttempt(cleanUsername, true);
    const token = await signSession(
      {
        role: "owner",
        ownerId: owner.id,
        username: owner.username,
      },
      7 * 24 * 60 * 60
    );

    await setSessionCookie(token, 7 * 24 * 60 * 60);
  } catch (err: any) {
    console.error("Owner login error:", err);
    return {
      success: false,
      error: err.message || "Failed to log in. Please try again.",
    };
  }

  redirect("/dashboard");
}

/**
 * Handle Customer PIN Login
 */
export async function loginCustomerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const username = formData.get("username") as string;
  const pin = formData.get("pin") as string;

  const parsed = customerLoginSchema.safeParse({ username, pin });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid credentials",
    };
  }

  const cleanUsername = parsed.data.username;
  const cleanPin = parsed.data.pin;
  const clientIp = await getClientIp();

  // Rate limit checks
  const userRate = await checkRateLimit(cleanUsername);
  if (userRate.blocked) {
    return {
      success: false,
      error: `Too many failed attempts. Locked out for ${userRate.remainingMinutes} minute(s).`,
      remainingMinutes: userRate.remainingMinutes,
    };
  }

  const ipRate = await checkRateLimit(clientIp);
  if (ipRate.blocked) {
    return {
      success: false,
      error: `Too many failed attempts from your network. Locked out for ${ipRate.remainingMinutes} minute(s).`,
      remainingMinutes: ipRate.remainingMinutes,
    };
  }

  try {
    const db = getDb();
    const { data: customer, error } = await db
      .from("customers")
      .select("id, name, username, access_mode, pin_hash, is_active")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error || !customer || !customer.is_active) {
      await recordLoginAttempt(cleanUsername, false);
      await recordLoginAttempt(clientIp, false);
      return {
        success: false,
        error: "Incorrect username or PIN",
      };
    }

    if (customer.access_mode !== "pin" || !customer.pin_hash) {
      return {
        success: false,
        error: "This account uses direct link access. Please use your personal access link.",
      };
    }

    const pinMatch = await bcrypt.compare(cleanPin, customer.pin_hash);
    if (!pinMatch) {
      await recordLoginAttempt(cleanUsername, false);
      await recordLoginAttempt(clientIp, false);
      return {
        success: false,
        error: "Incorrect username or PIN",
      };
    }

    // Success: 30 days session
    await recordLoginAttempt(cleanUsername, true);
    const token = await signSession(
      {
        role: "customer",
        customerId: customer.id,
        username: customer.username,
        name: customer.name,
      },
      30 * 24 * 60 * 60
    );

    await setSessionCookie(token, 30 * 24 * 60 * 60);
  } catch (err: any) {
    console.error("Customer login error:", err);
    return {
      success: false,
      error: err.message || "Failed to log in. Please try again.",
    };
  }

  redirect("/portal");
}

/**
 * Handle Logout
 */
export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
