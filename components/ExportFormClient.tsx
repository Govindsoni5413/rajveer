"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  User,
  Archive,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { CustomerWithBalance } from "@/lib/types";
import { markBackupCompleteAction } from "@/app/actions/backup";

interface ExportFormClientProps {
  customers: CustomerWithBalance[];
}

export function ExportFormClient({ customers }: ExportFormClientProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [period, setPeriod] = useState<"all" | "this_year" | "month" | "year" | "custom">("all");
  const [pickedMonth, setPickedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [pickedYear, setPickedYear] = useState<string>(String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const handleExportExcel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (period === "custom" && (!customFrom || !customTo)) {
      toast.error("Please pick both start and end dates for custom range");
      return;
    }

    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedCustomerId !== "all") {
        params.set("customerId", selectedCustomerId);
      }
      params.set("period", period);

      if (period === "month") {
        params.set("month", pickedMonth);
        params.set("year", pickedYear);
      } else if (period === "year") {
        params.set("year", pickedYear);
      } else if (period === "custom") {
        params.set("from", customFrom);
        params.set("to", customTo);
      }

      toast.info("Generating Excel workbook... Download will begin shortly.");

      const res = await fetch(`/api/export/excel?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to generate Excel file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Extract filename from response header or compute
      const disposition = res.headers.get("content-disposition");
      let filename = "Rajveer_Export.xlsx";
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) filename = matches[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Excel exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFullBackup = async () => {
    try {
      setIsDownloadingZip(true);
      toast.info("Building full backup ZIP archive... This may take a few seconds.");

      const res = await fetch("/api/export/backup");
      if (!res.ok) {
        throw new Error("Failed to generate backup archive");
      }

      const blob = await res.blob();
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
      toast.success("Full backup ZIP downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate backup archive");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Excel Export Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-[#0A0A0A]" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-[#0A0A0A]">
              Export Excel Ledger
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Download formatted .xlsx files with summary sheets and customer balances
            </p>
          </div>
        </div>

        <form onSubmit={handleExportExcel} className="space-y-5">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#D99A00]" />
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="touch-target w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-sm text-[#0A0A0A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            >
              <option value="all">All Customers (Complete Ledger with Summary Sheet)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (@{c.username})
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#D99A00]" />
              Select Time Period
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-[#FFFBEB] p-1.5 rounded-2xl border border-[#EFE7C8]">
              {[
                { id: "all", label: "All time" },
                { id: "this_year", label: "This year" },
                { id: "month", label: "Pick month" },
                { id: "year", label: "Pick year" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as any)}
                  className={`touch-target py-2 px-2 rounded-xl text-xs font-semibold transition ${
                    period === p.id
                      ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Date Controls */}
          {period === "month" && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#FFFBEB]/50 rounded-2xl border border-[#EFE7C8]">
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Month
                </label>
                <select
                  value={pickedMonth}
                  onChange={(e) => setPickedMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-xs font-semibold"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December",
                  ].map((m, idx) => (
                    <option key={m} value={String(idx + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Year
                </label>
                <select
                  value={pickedYear}
                  onChange={(e) => setPickedYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-xs font-semibold"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {period === "year" && (
            <div className="p-4 bg-[#FFFBEB]/50 rounded-2xl border border-[#EFE7C8]">
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Select Year
              </label>
              <select
                value={pickedYear}
                onChange={(e) => setPickedYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-xs font-semibold"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {period === "custom" && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#FFFBEB]/50 rounded-2xl border border-[#EFE7C8]">
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  required
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-xs text-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  required
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-xs text-[#0A0A0A]"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isExporting}
              className="touch-target w-full py-3.5 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Full 6-Month System Backup Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] text-[#F5B400] flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-[#0A0A0A]">
              Full System Backup (ZIP)
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Complete archive including all customer workbooks and consolidated database sheets
            </p>
          </div>
        </div>

        <p className="text-xs text-[#6B6B6B] leading-relaxed mb-5">
          This creates a single ZIP file containing <code>Rajveer_All_Data.xlsx</code> (all bills, receipts, customer records, and summary) and a <code>Customers/</code> folder with individual <code>.xlsx</code> sheets for every registered customer.
        </p>

        <button
          onClick={handleDownloadFullBackup}
          disabled={isDownloadingZip}
          className="touch-target w-full py-3 px-4 rounded-xl font-bold bg-[#0A0A0A] text-[#F5B400] hover:bg-[#1A1A1A] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isDownloadingZip ? (
            <span className="w-5 h-5 border-2 border-[#F5B400] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Full Backup Archive (ZIP)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
