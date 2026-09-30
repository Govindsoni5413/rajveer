"use client";

import React, { useState, useTransition } from "react";
import {
  Building2,
  Lock,
  Clock,
  Download,
  LogOut,
  Save,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Settings } from "@/lib/types";
import { updateBusinessDetailsAction, changeOwnerPasswordAction } from "@/app/actions/settings";
import { updateBackupIntervalAction, markBackupCompleteAction } from "@/app/actions/backup";
import { logoutAction } from "@/app/actions/auth";
import { formatDate } from "@/lib/format";

interface SettingsClientProps {
  initialSettings: Settings | null;
  ownerUsername: string;
}

export function SettingsClient({ initialSettings, ownerUsername }: SettingsClientProps) {
  const [settings, setSettings] = useState<Settings | null>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  // Business details state
  const [businessName, setBusinessName] = useState(settings?.business_name || "");
  const [businessPhone, setBusinessPhone] = useState(settings?.business_phone || "");
  const [businessAddress, setBusinessAddress] = useState(settings?.business_address || "");

  // Backup interval state
  const [backupInterval, setBackupInterval] = useState<1 | 3 | 6>(
    (settings?.backup_interval_months as 1 | 3 | 6) || 6
  );

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateBusinessDetailsAction({
        business_name: businessName,
        business_phone: businessPhone,
        business_address: businessAddress,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save business details");
        return;
      }

      toast.success("Business details updated successfully!");
    });
  };

  const handleIntervalChange = async (val: 1 | 3 | 6) => {
    setBackupInterval(val);
    startTransition(async () => {
      const res = await updateBackupIntervalAction(val);
      if (!res.success) {
        toast.error("Failed to update reminder interval");
        return;
      }
      toast.success(`Backup reminder set to every ${val} month(s)`);
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const res = await changeOwnerPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  const handleManualBackup = async () => {
    try {
      setIsDownloading(true);
      toast.info("Generating full backup archive (ZIP)... Please wait.");

      const response = await fetch("/api/export/backup");
      if (!response.ok) throw new Error("Failed to generate backup");

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
      toast.success("Backup downloaded! Next reminder scheduled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download backup");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 1. Business Profile Details */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-[#0A0A0A]">
              Business Information
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Displayed in PDF statements and customer receipts
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Business / Store Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Rajveer Jewellers"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Store Phone
              </label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Store City / Market
              </label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="e.g. Zaveri Bazaar, Mumbai"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="touch-target px-5 py-2.5 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center gap-2 shadow-xs cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. 6-Monthly Backup Reminder Settings */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FFFBEB] text-[#D99A00] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-[#0A0A0A]">
              Backup Reminder Frequency
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Automatic reminder banner and daily login modal intervals
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-2">
              Remind me to download full backup every:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 6].map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => handleIntervalChange(months as 1 | 3 | 6)}
                  className={`touch-target py-2.5 rounded-xl text-xs font-bold transition border ${
                    backupInterval === months
                      ? "bg-[#F5B400] text-[#0A0A0A] border-[#D99A00] shadow-xs"
                      : "bg-[#FFFBEB]/50 border-[#EFE7C8] text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  {months} Month{months > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#FFFBEB] rounded-2xl border border-[#EFE7C8] text-xs text-[#6B6B6B] flex items-center justify-between">
            <span>
              Last backup:{" "}
              <strong className="text-[#0A0A0A]">
                {settings?.last_backup_at ? formatDate(settings.last_backup_at) : "Never"}
              </strong>
            </span>
            <button
              onClick={handleManualBackup}
              disabled={isDownloading}
              className="touch-target px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0A0A0A] text-[#F5B400] hover:bg-[#1A1A1A] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? "Building ZIP..." : "Backup Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Change Password */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-[#0A0A0A]">
              Owner Security & Password
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Change your password for username: <strong>{ownerUsername}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-[#0A0A0A]">
                Current Password
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A] flex items-center gap-1"
              >
                {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPasswords ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPasswords ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                New Password (min 8 chars)
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="touch-target px-5 py-2.5 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center gap-2 shadow-xs cursor-pointer text-xs"
            >
              <Shield className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Logout Section */}
      <div className="bg-white p-5 rounded-3xl border border-[#EFE7C8] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-heading font-bold text-[#0A0A0A]">
            Log Out of Owner Session
          </h3>
          <p className="text-xs text-[#6B6B6B]">
            End your authenticated session on this browser
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="touch-target px-4 py-2 rounded-xl text-xs font-bold border border-[#EFE7C8] hover:bg-[#FFFBEB] text-[#B91C1C] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
