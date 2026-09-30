"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";

/**
 * Snooze backup reminder for 7 days
 */
export async function snoozeBackupAction() {
  await requireOwner();
  const db = getDb();
  const snoozedUntil = addDays(new Date(), 7).toISOString();

  await db
    .from("settings")
    .update({ backup_snoozed_until: snoozedUntil })
    .eq("id", 1);

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Mark backup as complete (updates last_backup_at and clears snooze)
 */
export async function markBackupCompleteAction() {
  await requireOwner();
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .from("settings")
    .update({
      last_backup_at: now,
      backup_snoozed_until: null,
    })
    .eq("id", 1);

  revalidatePath("/", "layout");
  return { success: true, nextReminder: now };
}

/**
 * Update backup interval (1, 3, or 6 months)
 */
export async function updateBackupIntervalAction(months: 1 | 3 | 6) {
  await requireOwner();
  const db = getDb();

  await db
    .from("settings")
    .update({ backup_interval_months: months })
    .eq("id", 1);

  revalidatePath("/", "layout");
  return { success: true };
}
