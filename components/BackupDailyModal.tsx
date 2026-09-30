"use client";

import React, { useEffect, useState } from "react";
import { Download, Clock, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { snoozeBackupAction, markBackupCompleteAction } from "@/app/actions/backup";

interface BackupDailyModalProps {
  isDue: boolean;
  intervalMonths: number;
}

export function BackupDailyModal({ isDue, intervalMonths }: BackupDailyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);

  useEffect(() => {
    if (!isDue) return;

    // Check if shown today
    const today = new Date().toISOString().split("T")[0];
    const lastShown = localStorage.getItem("rajveer_backup_modal_last_shown");

    if (lastShown !== today) {
      setIsOpen(true);
      localStorage.setItem("rajveer_backup_modal_last_shown", today);
    }
  }, [isDue]);

  if (!isOpen) return null;

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
      setIsOpen(false);
      toast.success("Backup downloaded successfully! Next reminder set for 6 months.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download backup");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setIsSnoozing(true);
      await snoozeBackupAction();
      setIsOpen(false);
      toast.success("Reminder snoozed for 7 days.");
    } catch {
      toast.error("Failed to snooze reminder");
    } finally {
      setIsSnoozing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-[#F5B400] relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full hover:bg-[#FFFBEB] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-[#FFF3C4] text-[#F5B400] rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-[#0A0A0A]" />
          </div>

          <h3 className="text-xl font-heading font-bold text-[#0A0A0A] mb-2">
            Backup Due ({intervalMonths} Months Completed)
          </h3>

          <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">
            Your ledger data is valuable. Download a complete Excel backup of all customer accounts and transaction records to keep in your Google Drive or local storage.
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={handleDownload}
              disabled={isDownloading || isSnoozing}
              className="touch-target w-full py-3 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>Download Full Backup (ZIP)</span>
            </button>

            <button
              onClick={handleSnooze}
              disabled={isDownloading || isSnoozing}
              className="touch-target w-full py-2.5 px-4 rounded-xl font-semibold border border-[#EFE7C8] text-[#0A0A0A] hover:bg-[#FFFBEB] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Clock className="w-4 h-4 text-[#6B6B6B]" />
              <span>Remind Me in 7 Days</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
