"use client";

import React, { useState } from "react";
import { Download, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { snoozeBackupAction, markBackupCompleteAction } from "@/app/actions/backup";

interface BackupBannerProps {
  intervalMonths: number;
}

export function BackupBanner({ intervalMonths }: BackupBannerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  if (dismissedLocally) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      toast.info("Generating full backup archive (ZIP)... Please wait.");

      const response = await fetch("/api/export/backup");
      if (!response.ok) {
        throw new Error("Failed to generate backup");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `Rajveer_Backup_${today}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await markBackupCompleteAction();
      setDismissedLocally(true);
      toast.success("Backup downloaded successfully! Next reminder set for 6 months.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download backup");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setIsSnoozing(true);
      await snoozeBackupAction();
      setDismissedLocally(true);
      toast.success("Reminder snoozed for 7 days.");
    } catch {
      toast.error("Failed to snooze reminder");
    } finally {
      setIsSnoozing(false);
    }
  };

  return (
    <div className="bg-[#F5B400] text-[#0A0A0A] px-4 py-3 sm:py-2.5 shadow-sm border-b border-[#D99A00] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-black fill-black/10" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            {intervalMonths} months are complete. Download a full backup of all your data now.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownload}
            disabled={isDownloading || isSnoozing}
            className="touch-target flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0A0A0A] text-[#F5B400] hover:bg-[#1A1A1A] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isDownloading ? (
              <span className="w-3.5 h-3.5 border-2 border-[#F5B400] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download full backup</span>
          </button>

          <button
            onClick={handleSnooze}
            disabled={isDownloading || isSnoozing}
            className="touch-target px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/30 text-black hover:bg-white/40 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Remind me in 7 days</span>
          </button>
        </div>
      </div>
    </div>
  );
}
