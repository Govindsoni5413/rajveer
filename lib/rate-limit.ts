import { getDb } from "./db";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Check if the given identifier (username or IP) is rate-limited.
 * Returns { blocked: true, remainingMinutes } if locked out.
 */
export async function checkRateLimit(
  identifier: string
): Promise<{ blocked: boolean; remainingMinutes: number }> {
  try {
    const db = getDb();
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: attempts, error } = await db
      .from("login_attempts")
      .select("created_at, success")
      .eq("identifier", identifier)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false });

    if (error || !attempts) {
      return { blocked: false, remainingMinutes: 0 };
    }

    // Count consecutive failed attempts within the window
    let failedCount = 0;
    let oldestFailedTime: number | null = null;

    for (const attempt of attempts) {
      if (!attempt.success) {
        failedCount++;
        oldestFailedTime = new Date(attempt.created_at).getTime();
      } else {
        // If a successful login occurred, reset consecutive failures
        break;
      }
    }

    if (failedCount >= MAX_FAILED_ATTEMPTS && oldestFailedTime) {
      const lockExpiresAt = oldestFailedTime + WINDOW_MINUTES * 60 * 1000;
      const msRemaining = Math.max(0, lockExpiresAt - Date.now());
      const remainingMinutes = Math.max(1, Math.ceil(msRemaining / (60 * 1000)));

      if (msRemaining > 0) {
        return { blocked: true, remainingMinutes };
      }
    }

    return { blocked: false, remainingMinutes: 0 };
  } catch (err) {
    console.error("Rate limit check error:", err);
    return { blocked: false, remainingMinutes: 0 };
  }
}

/**
 * Record a login attempt in the database
 */
export async function recordLoginAttempt(
  identifier: string,
  success: boolean
): Promise<void> {
  try {
    const db = getDb();
    await db.from("login_attempts").insert({
      identifier,
      success,
    });
  } catch (err) {
    console.error("Failed to record login attempt:", err);
  }
}
