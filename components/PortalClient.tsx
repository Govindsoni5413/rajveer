"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CreditCard,
  History,
  Download,
  Search,
  Calendar,
  LogOut,
  RefreshCw,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { PortalData } from "@/app/actions/portal";
import { logoutAction } from "@/app/actions/auth";
import { formatCurrency, formatGold, formatDate, formatBillNo } from "@/lib/format";
import { Logo } from "@/components/Logo";

interface PortalClientProps {
  initialData: PortalData;
}

type PortalViewTab = "history" | "bills" | "receipts";

export function PortalClient({ initialData }: PortalClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PortalData>(initialData);
  const [activeTab, setActiveTab] = useState<PortalViewTab>("history");
  const [itemSearch, setItemSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const { customer, bills, receipts, settings, isDirectLink } = data;

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const handleRefresh = () => {
    router.refresh();
  };

  // Filter bills & receipts
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (itemSearch.trim() && !b.item.toLowerCase().includes(itemSearch.toLowerCase().trim())) {
        return false;
      }
      if (fromDate && b.bill_date < fromDate) return false;
      if (toDate && b.bill_date > toDate) return false;
      return true;
    });
  }, [bills, itemSearch, fromDate, toDate]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (fromDate && r.receipt_date < fromDate) return false;
      if (toDate && r.receipt_date > toDate) return false;
      return true;
    });
  }, [receipts, fromDate, toDate]);

  // Combined chronological transaction history
  const combinedHistory = useMemo(() => {
    const billItems = filteredBills.map((b) => ({
      id: b.id,
      type: "bill" as const,
      date: b.bill_date,
      bill_no: b.bill_no,
      title: b.item,
      gold_weight: Number(b.gold_weight) || 0,
      amount: Number(b.amount) || 0,
      note: b.note,
      created_at: b.created_at,
    }));

    const receiptItems = filteredReceipts.map((r) => ({
      id: r.id,
      type: "receipt" as const,
      date: r.receipt_date,
      bill_no: undefined,
      title: "Payment Received",
      gold_weight: Number(r.gold_weight) || 0,
      amount: Number(r.cash_amount) || 0,
      note: r.note,
      created_at: r.created_at,
    }));

    return [...billItems, ...receiptItems].sort((a, b) => {
      const dDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dDiff !== 0) return dDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredBills, filteredReceipts]);

  const isAdvance = customer.pending_amount < 0;

  return (
    <div className="min-h-screen bg-[#FFFBEB]/30 pb-16">
      {/* Top Customer Portal Header */}
      <header className="bg-[#0A0A0A] text-white border-b border-[#222] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" inverted />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="touch-target p-2 rounded-xl text-[#FFF3C4] hover:text-white hover:bg-[#222] transition"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4 text-[#F5B400]" />
            </button>

            {!isDirectLink && (
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="touch-target px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FFF3C4] hover:text-white hover:bg-[#222] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5 text-[#F5B400]" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Customer Welcome & Statement Download */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EFE7C8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B]">
                Customer Account
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] bg-green-50 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#0A0A0A] mt-0.5">
              {customer.name}
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              @{customer.username} • {settings?.business_name || "Rajveer Jewellers"}
            </p>
          </div>

          <div>
            <a
              href="/api/export/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition shadow-xs text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Statement</span>
            </a>
          </div>
        </div>

        {/* Balance Cards: 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Billed */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B] block mb-1">
              Total Billed
            </span>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#0A0A0A]">
              {formatCurrency(customer.billed_amount)}
            </div>
            <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#F5B400]" />
              Gold: <strong className="text-[#0A0A0A]">{formatGold(customer.billed_gold)}</strong>
            </div>
          </div>

          {/* Received */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#15803D] block mb-1">
              Total Received
            </span>
            <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#15803D]">
              {formatCurrency(customer.received_cash)}
            </div>
            <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#15803D]" />
              Gold: <strong className="text-[#15803D]">{formatGold(customer.received_gold)}</strong>
            </div>
          </div>

          {/* Pending Balance */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
            <span
              className={`text-xs uppercase font-semibold tracking-wider block mb-1 ${
                isAdvance ? "text-[#15803D]" : "text-[#B91C1C]"
              }`}
            >
              {isAdvance ? "Advance Balance" : "Pending Balance"}
            </span>
            <div
              className={`text-xl sm:text-2xl font-heading font-extrabold ${
                isAdvance ? "text-[#15803D]" : "text-[#B91C1C]"
              }`}
            >
              {isAdvance
                ? `${formatCurrency(Math.abs(customer.pending_amount))} (Advance)`
                : formatCurrency(customer.pending_amount)}
            </div>
            <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#D99A00]" />
              Gold Balance:{" "}
              <strong className={customer.pending_gold < 0 ? "text-[#15803D]" : "text-[#0A0A0A]"}>
                {customer.pending_gold < 0
                  ? `${formatGold(Math.abs(customer.pending_gold))} (Adv)`
                  : formatGold(customer.pending_gold)}
              </strong>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search items in your ledger..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-xs text-[#0A0A0A] placeholder-[#6B6B6B]/70"
            />
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-[#D99A00]" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
            />
            <span className="text-[#6B6B6B]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
            />
            {(fromDate || toDate || itemSearch) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setItemSearch("");
                }}
                className="text-xs text-[#D99A00] font-bold hover:underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded-2xl border border-[#EFE7C8] shadow-xs">
          <button
            onClick={() => setActiveTab("history")}
            className={`touch-target py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === "history"
                ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>All Activity ({combinedHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("bills")}
            className={`touch-target py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === "bills"
                ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bills ({filteredBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("receipts")}
            className={`touch-target py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === "receipts"
                ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments ({filteredReceipts.length})</span>
          </button>
        </div>

        {/* Tab 1: Chronological Transaction History */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {combinedHistory.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#EFE7C8] text-center">
                <History className="w-8 h-8 text-[#D99A00] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#0A0A0A]">No records found</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">No bills or payments matching your filter</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {combinedHistory.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="bg-white p-4 rounded-2xl border border-[#EFE7C8] shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.type === "bill"
                            ? "bg-[#FFF3C4] text-[#0A0A0A]"
                            : "bg-green-50 text-[#15803D]"
                        }`}
                      >
                        {item.type === "bill" ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <CreditCard className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#0A0A0A] truncate">
                          {item.type === "bill"
                            ? `${formatBillNo(item.bill_no)} — ${item.title}`
                            : "Cash / Gold Payment"}
                        </div>
                        <div className="text-xs text-[#6B6B6B]">
                          {formatDate(item.date)}
                          {item.gold_weight > 0 && ` • Gold: ${formatGold(item.gold_weight)}`}
                          {item.note && ` • ${item.note}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span
                        className={`text-base font-heading font-extrabold ${
                          item.type === "bill" ? "text-[#0A0A0A]" : "text-[#15803D]"
                        }`}
                      >
                        {item.type === "bill"
                          ? formatCurrency(item.amount)
                          : formatCurrency(item.amount)}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-[#6B6B6B]">
                        {item.type === "bill" ? "Billed" : "Received"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bill-wise details */}
        {activeTab === "bills" && (
          <div className="space-y-3">
            {filteredBills.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#EFE7C8] text-center">
                <p className="text-xs text-[#6B6B6B]">No work bills found.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredBills.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white p-4 rounded-2xl border border-[#EFE7C8] shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#D99A00]">
                          {formatBillNo(b.bill_no)}
                        </span>
                        <h4 className="text-sm font-bold text-[#0A0A0A]">{b.item}</h4>
                      </div>
                      <span className="text-base font-heading font-extrabold text-[#0A0A0A]">
                        {formatCurrency(b.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6B6B6B] pt-1">
                      <span>{formatDate(b.bill_date)}</span>
                      {b.gold_weight > 0 && <span>Gold: {formatGold(b.gold_weight)}</span>}
                    </div>

                    {b.note && (
                      <p className="text-[11px] text-[#6B6B6B] italic mt-1.5 bg-[#FFFBEB]/50 p-2 rounded-xl">
                        {b.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Received payments */}
        {activeTab === "receipts" && (
          <div className="space-y-3">
            {filteredReceipts.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-[#EFE7C8] text-center">
                <p className="text-xs text-[#6B6B6B]">No payment receipts found.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredReceipts.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-4 rounded-2xl border border-[#EFE7C8] shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs text-[#6B6B6B] block">{formatDate(r.receipt_date)}</span>
                      {r.note && <span className="text-xs text-[#0A0A0A] font-medium">{r.note}</span>}
                      {r.gold_weight > 0 && (
                        <div className="text-xs font-medium text-[#0A0A0A] bg-amber-50 px-2 py-0.5 rounded-lg inline-block mt-1">
                          Gold Received: {formatGold(r.gold_weight)}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-base font-heading font-extrabold text-[#15803D]">
                        {formatCurrency(r.cash_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
