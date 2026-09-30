"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { Settings } from "@/lib/types";

export async function getSettingsAction(): Promise<Settings | null> {
  await requireOwner();
  const db = getDb();

  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
  return data;
}

export async function updateBusinessDetailsAction(data: {
  business_name?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
}) {
  await requireOwner();
  const db = getDb();

  const { error } = await db
    .from("settings")
    .update({
      business_name: data.business_name?.trim() || null,
      business_phone: data.business_phone?.trim() || null,
      business_address: data.business_address?.trim() || null,
    })
    .eq("id", 1);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
});

export async function changeOwnerPasswordAction(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await requireOwner();
  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const db = getDb();
  const { data: owner, error: fetchErr } = await db
    .from("owners")
    .select("password_hash")
    .eq("id", session.ownerId)
    .single();

  if (fetchErr || !owner) {
    return { success: false, error: "Owner account not found" };
  }

  const isMatch = await bcrypt.compare(parsed.data.currentPassword, owner.password_hash);
  if (!isMatch) {
    return { success: false, error: "Incorrect current password" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const { error: updateErr } = await db
    .from("owners")
    .update({ password_hash: newHash })
    .eq("id", session.ownerId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  return { success: true };
}
