import { addMonths } from "date-fns";
import { getDb } from "./db";

export interface BackupStatus {
  isDue: boolean;
  isSnoozed: boolean;
  showBanner: boolean;
  lastBackupDate: string | null;
  nextDueDate: string;
  intervalMonths: number;
}

/**
 * Compute the 6-monthly (or user configured) backup status
 */
export async function getBackupStatus(): Promise<BackupStatus> {
  try {
    const db = getDb();

    // Fetch settings and owner creation date
    const [settingsRes, ownerRes] = await Promise.all([
      db.from("settings").select("*").eq("id", 1).maybeSingle(),
      db.from("owners").select("created_at").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    ]);

    const settings = settingsRes.data;
    const ownerCreatedAt = ownerRes.data?.created_at || new Date().toISOString();
    const intervalMonths = settings?.backup_interval_months || 6;

    const baseDateStr = settings?.last_backup_at || ownerCreatedAt;
    const baseDate = new Date(baseDateStr);
    const nextDueDate = addMonths(baseDate, intervalMonths);

    const now = Date.now();
    const isDue = now >= nextDueDate.getTime();

    let isSnoozed = false;
    if (settings?.backup_snoozed_until) {
      isSnoozed = now < new Date(settings.backup_snoozed_until).getTime();
    }

    return {
      isDue,
      isSnoozed,
      showBanner: isDue && !isSnoozed,
      lastBackupDate: settings?.last_backup_at || null,
      nextDueDate: nextDueDate.toISOString(),
      intervalMonths,
    };
  } catch (err) {
    console.error("Error computing backup status:", err);
    return {
      isDue: false,
      isSnoozed: false,
      showBanner: false,
      lastBackupDate: null,
      nextDueDate: addMonths(new Date(), 6).toISOString(),
      intervalMonths: 6,
    };
  }
}
