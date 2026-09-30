"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt as ReceiptIcon,
  Clock,
  Coins,
  Users,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Plus,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatGold, formatDate, formatBillNo } from "@/lib/format";
import { DashboardData, PeriodFilter, getDashboardDataAction } from "@/app/actions/dashboard";
import { DashboardChart } from "./DashboardChart";
import { markBackupCompleteAction } from "@/app/actions/backup";

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    if (newPeriod === "custom") {
      setShowCustomModal(true);
      return;
    }
    setPeriod(newPeriod);
    startTransition(async () => {
      const refreshed = await getDashboardDataAction(newPeriod);
      setData(refreshed);
    });
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) {
      toast.error("Please pick both start and end dates");
      return;
    }
    setPeriod("custom");
    setShowCustomModal(false);
    startTransition(async () => {
      const refreshed = await getDashboardDataAction("custom", {
        from: customFrom,
        to: customTo,
      });
      setData(refreshed);
    });
  };

  const handleManualBackup = async () => {
    try {
      setIsDownloadingBackup(true);
      toast.info("Generating full backup ZIP archive... Please wait.");
      const res = await fetch("/api/export/backup");
      if (!res.ok) throw new Error("Failed to generate backup");

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
      toast.success("Backup downloaded successfully!");
      // Refresh dashboard data
      const refreshed = await getDashboardDataAction(period);
      setData(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Failed to download backup");
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const { stats, recentActivity, topPendingCustomers, monthlyChartData, backupStatus } = data;
  const isAdvance = stats.pendingAmount < 0;

  return (
    <div className="space-y-6">
      {/* Top Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {[
            { id: "this_month", label: "This month" },
            { id: "last_month", label: "Last month" },
            { id: "this_year", label: "This year" },
            { id: "all_time", label: "All time" },
            { id: "custom", label: period === "custom" && customFrom ? `${customFrom} to ${customTo}` : "Custom range" },
          ].map((chip) => {
            const isSelected = period === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => handlePeriodChange(chip.id as PeriodFilter)}
                className={`touch-target whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                    : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#FFFBEB]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <Link
          href="/customers?action=new"
          className="touch-target hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </Link>
      </div>

      {/* Loading Overlay Indicator */}
      {isPending && (
        <div className="text-center py-1">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#D99A00]">
            <span className="w-3.5 h-3.5 border-2 border-[#D99A00] border-t-transparent rounded-full animate-spin" />
            Updating stats...
          </span>
        </div>
      )}

      {/* Primary Stat Cards: 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Revenue (Received Cash) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Revenue (Received)
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-50 text-[#15803D] flex items-center justify-center">
              <ReceiptIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#15803D]">
              {formatCurrency(stats.revenue)}
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1 font-medium">
              Cash received from customers
            </div>
          </div>
        </div>

        {/* 2. Total Billed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Total Billed
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF3C4] text-[#0A0A0A] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#0A0A0A]">
              {formatCurrency(stats.totalBilled)}
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1 font-medium">
              Sum of work done bills
            </div>
          </div>
        </div>

        {/* 3. Pending (Billed - Received) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              {isAdvance ? "Advance Balance" : "Pending Amount"}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isAdvance
                  ? "bg-green-50 text-[#15803D]"
                  : stats.pendingAmount > 0
                  ? "bg-red-50 text-[#B91C1C]"
                  : "bg-gray-50 text-[#6B6B6B]"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-heading font-extrabold ${
                isAdvance
                  ? "text-[#15803D]"
                  : stats.pendingAmount > 0
                  ? "text-[#B91C1C]"
                  : "text-[#0A0A0A]"
              }`}
            >
              {isAdvance
                ? `${formatCurrency(Math.abs(stats.pendingAmount))} (Advance)`
                : formatCurrency(stats.pendingAmount)}
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1 font-medium">
              {isAdvance ? "Customers paid ahead" : "Outstanding money to collect"}
            </div>
          </div>
        </div>

        {/* 4. Total Work */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Total Work
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] text-[#D99A00] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#0A0A0A]">
              {stats.billCount} <span className="text-sm font-normal text-[#6B6B6B]">Bills</span>
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1 font-medium">
              Gold billed: <strong className="text-[#0A0A0A]">{formatGold(stats.billedGold)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row: Gold breakdown, Customers, & Backup Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Gold Weight Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Gold Ledger (Weight)
            </span>
            <Coins className="w-4 h-4 text-[#F5B400]" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-[#FFFBEB]">
              <span className="text-[10px] text-[#6B6B6B] block">Billed</span>
              <span className="text-sm font-bold text-[#0A0A0A]">{formatGold(stats.billedGold)}</span>
            </div>
            <div className="p-2 rounded-xl bg-green-50">
              <span className="text-[10px] text-[#15803D] block">Received</span>
              <span className="text-sm font-bold text-[#15803D]">{formatGold(stats.receivedGold)}</span>
            </div>
            <div className={`p-2 rounded-xl ${stats.pendingGold < 0 ? "bg-green-50 text-[#15803D]" : "bg-red-50 text-[#B91C1C]"}`}>
              <span className="text-[10px] block">{stats.pendingGold < 0 ? "Advance" : "Pending"}</span>
              <span className="text-sm font-bold">
                {stats.pendingGold < 0 ? formatGold(Math.abs(stats.pendingGold)) : formatGold(stats.pendingGold)}
              </span>
            </div>
          </div>
        </div>

        {/* Customers Count Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Customer Base
            </span>
            <Users className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-2xl font-heading font-extrabold text-[#0A0A0A]">
                {stats.totalCustomers}
              </div>
              <div className="text-xs text-[#6B6B6B] mt-0.5">
                Total registered clients
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#15803D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                {stats.activeCustomers} Active
              </span>
            </div>
          </div>
        </div>

        {/* 6-Monthly Backup Status Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
              Backup Status ({backupStatus.intervalMonths}M)
            </span>
            {backupStatus.isDue ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-[#B91C1C]">
                <ShieldAlert className="w-3 h-3" />
                Backup Due
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-[#15803D]">
                <ShieldCheck className="w-3 h-3" />
                Up to Date
              </span>
            )}
          </div>
          <div className="text-xs text-[#6B6B6B] space-y-1">
            <div>
              Last backup:{" "}
              <strong className="text-[#0A0A0A]">
                {backupStatus.lastBackupDate ? formatDate(backupStatus.lastBackupDate) : "Never"}
              </strong>
            </div>
            <div>
              Next due:{" "}
              <strong className="text-[#0A0A0A]">
                {formatDate(backupStatus.nextDueDate)}
              </strong>
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={handleManualBackup}
              disabled={isDownloadingBackup}
              className="touch-target w-full py-1.5 px-3 rounded-xl text-xs font-bold border border-[#EFE7C8] hover:bg-[#FFFBEB] text-[#0A0A0A] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isDownloadingBackup ? (
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#F5B400]" />
              )}
              <span>Download Full Backup (ZIP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Section: Monthly comparison */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EFE7C8] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-heading font-bold text-[#0A0A0A]">
              Monthly Billed vs Received
            </h3>
            <p className="text-xs text-[#6B6B6B]">Last 6 months performance comparison</p>
          </div>
        </div>
        <DashboardChart data={monthlyChartData} />
      </div>

      {/* Bottom Grid: Top Pending Customers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pending Customers */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-heading font-bold text-[#0A0A0A]">
                Top Pending Customers
              </h3>
              <p className="text-xs text-[#6B6B6B]">Highest outstanding balances</p>
            </div>
            <Link
              href="/customers"
              className="text-xs font-semibold text-[#D99A00] hover:text-[#0A0A0A] flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topPendingCustomers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#FFFBEB]/30 rounded-2xl border border-dashed border-[#EFE7C8]">
              <Users className="w-8 h-8 text-[#D99A00] mb-2" />
              <p className="text-sm font-semibold text-[#0A0A0A]">No pending payments</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                All customer balances are currently clear or in advance.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFE7C8]">
              {topPendingCustomers.map((cust) => (
                <Link
                  key={cust.id}
                  href={`/customers/${cust.id}`}
                  className="py-3 flex items-center justify-between hover:bg-[#FFFBEB]/40 px-2 rounded-xl transition group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-bold text-[#0A0A0A] truncate group-hover:text-[#D99A00]">
                      {cust.name}
                    </div>
                    <div className="text-xs text-[#6B6B6B]">
                      @{cust.username} • {formatGold(cust.pending_gold)} gold pending
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#B91C1C]">
                      {formatCurrency(cust.pending_amount)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-heading font-bold text-[#0A0A0A]">
                Recent Activity
              </h3>
              <p className="text-xs text-[#6B6B6B]">Latest bills and receipts recorded</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#FFFBEB]/30 rounded-2xl border border-dashed border-[#EFE7C8]">
              <FileText className="w-8 h-8 text-[#D99A00] mb-2" />
              <p className="text-sm font-semibold text-[#0A0A0A]">No recent activity</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Start by creating your first customer and recording work.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFE7C8]">
              {recentActivity.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between px-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === "bill"
                          ? "bg-[#FFF3C4] text-[#0A0A0A]"
                          : "bg-green-50 text-[#15803D]"
                      }`}
                    >
                      {item.type === "bill" ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0A0A0A] truncate">
                        {item.type === "bill"
                          ? `${formatBillNo(item.bill_no)} — ${item.item}`
                          : "Cash / Gold Received"}
                      </div>
                      <div className="text-xs text-[#6B6B6B]">
                        {item.customer_name} • {formatDate(item.date)}
                        {item.gold_weight > 0 && ` • ${formatGold(item.gold_weight)}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span
                      className={`text-sm font-extrabold ${
                        item.type === "bill" ? "text-[#0A0A0A]" : "text-[#15803D]"
                      }`}
                    >
                      {item.type === "bill"
                        ? formatCurrency(item.amount)
                        : formatCurrency(item.cash_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Floating Action Button (+) */}
      <Link
        href="/customers?action=new"
        className="touch-target md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#F5B400] text-black shadow-xl flex items-center justify-center hover:bg-[#D99A00] active:scale-95 transition-all border-2 border-black"
        aria-label="Add Customer"
      >
        <Plus className="w-7 h-7" />
      </Link>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#EFE7C8]">
            <h4 className="text-base font-heading font-bold text-[#0A0A0A] mb-4">
              Select Custom Date Range
            </h4>
            <form onSubmit={handleApplyCustomRange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  required
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
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
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="touch-target flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B] hover:text-[#0A0A0A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="touch-target flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00]"
                >
                  Apply Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
