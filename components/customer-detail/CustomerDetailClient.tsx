"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Link as LinkIcon,
  Phone,
  FileSpreadsheet,
  FileText,
  Share2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Coins,
  Receipt as ReceiptIcon,
  Clock,
  MoreVertical,
  Calendar,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { CustomerWithBalance, Bill, Receipt } from "@/lib/types";
import {
  formatCurrency,
  formatGold,
  formatDate,
  formatBillNo,
  buildWhatsAppLink,
} from "@/lib/format";
import { regenerateCustomerLinkAction, toggleCustomerActiveAction } from "@/app/actions/customers";
import { deleteBillAction } from "@/app/actions/bills";
import { deleteReceiptAction } from "@/app/actions/receipts";
import { AddEditBillDialog } from "./AddEditBillDialog";
import { AddEditReceiptDialog } from "./AddEditReceiptDialog";
import {
  EditCustomerDialog,
  ResetPinDialog,
  SwitchModeDialog,
  DeleteCustomerModal,
  DeleteItemDialog,
} from "./CustomerActionsDialogs";

interface CustomerDetailClientProps {
  customer: CustomerWithBalance;
  initialBills: Bill[];
  initialReceipts: Receipt[];
  suggestedItems: string[];
}

export function CustomerDetailClient({
  customer,
  initialBills,
  initialReceipts,
  suggestedItems,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [isPending, startTransition] = useTransition();

  // Mobile active tab: "bills" or "receipts"
  const [mobileTab, setMobileTab] = useState<"bills" | "receipts">("bills");

  // Date range filter
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modals state
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);

  const [isAddReceiptOpen, setIsAddReceiptOpen] = useState(false);
  const [receiptToEdit, setReceiptToEdit] = useState<Receipt | null>(null);

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const [isSwitchModeOpen, setIsSwitchModeOpen] = useState(false);
  const [isDeleteCustomerOpen, setIsDeleteCustomerOpen] = useState(false);

  // Deletion targets
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);

  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Filter bills & receipts by date
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (fromDate && b.bill_date < fromDate) return false;
      if (toDate && b.bill_date > toDate) return false;
      return true;
    });
  }, [bills, fromDate, toDate]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (fromDate && r.receipt_date < fromDate) return false;
      if (toDate && r.receipt_date > toDate) return false;
      return true;
    });
  }, [receipts, fromDate, toDate]);

  // Recalculate totals based on filtered or all records
  const totalBilledAmount = filteredBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalBilledGold = filteredBills.reduce((acc, b) => acc + (Number(b.gold_weight) || 0), 0);
  const totalReceivedCash = filteredReceipts.reduce((acc, r) => acc + (Number(r.cash_amount) || 0), 0);
  const totalReceivedGold = filteredReceipts.reduce((acc, r) => acc + (Number(r.gold_weight) || 0), 0);

  const pendingAmount = totalBilledAmount - totalReceivedCash;
  const pendingGold = totalBilledGold - totalReceivedGold;
  const isAdvance = pendingAmount < 0;

  const handleRefresh = () => {
    router.refresh();
  };

  const handleRegenerateLink = () => {
    if (!confirm("Regenerating the link will invalidate the previous access link. Continue?")) {
      return;
    }
    startTransition(async () => {
      const res = await regenerateCustomerLinkAction(customer.id);
      if (!res.success) {
        toast.error("Failed to regenerate link");
        return;
      }
      toast.success("New direct link generated!");
      router.refresh();
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      const res = await toggleCustomerActiveAction(customer.id, customer.is_active);
      if (!res.success) {
        toast.error("Failed to update status");
        return;
      }
      toast.success(`Customer is now ${customer.is_active ? "inactive" : "active"}`);
      router.refresh();
    });
  };

  const handleConfirmDeleteBill = () => {
    if (!billToDelete) return;
    startTransition(async () => {
      const res = await deleteBillAction(billToDelete.id, customer.id);
      if (!res.success) {
        toast.error("Failed to delete bill");
        return;
      }
      setBills(bills.filter((b) => b.id !== billToDelete.id));
      setBillToDelete(null);
      toast.success("Bill deleted successfully");
      router.refresh();
    });
  };

  const handleConfirmDeleteReceipt = () => {
    if (!receiptToDelete) return;
    startTransition(async () => {
      const res = await deleteReceiptAction(receiptToDelete.id, customer.id);
      if (!res.success) {
        toast.error("Failed to delete receipt");
        return;
      }
      setReceipts(receipts.filter((r) => r.id !== receiptToDelete.id));
      setReceiptToDelete(null);
      toast.success("Receipt deleted successfully");
      router.refresh();
    });
  };

  const getCustomerLink = () => {
    if (typeof window === "undefined") return "";
    const siteUrl = window.location.origin;
    if (customer.access_mode === "link") {
      return `${siteUrl}/c/${customer.link_token}`;
    }
    return `${siteUrl}/login?tab=customer&username=${customer.username}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getCustomerLink());
    toast.success("Customer link copied!");
  };

  const handleWhatsAppShare = () => {
    const siteUrl = window.location.origin;
    const portalUrl =
      customer.access_mode === "link"
        ? `${siteUrl}/c/${customer.link_token}`
        : `${siteUrl}/login?tab=customer&username=${customer.username}`;

    const text = `Namaste ${customer.name},\n\nHere is your jewellery ledger update from Rajveer:\n\n• Total Billed: ${formatCurrency(
      customer.billed_amount
    )} (${formatGold(customer.billed_gold)})\n• Received: ${formatCurrency(
      customer.received_cash
    )} (${formatGold(customer.received_gold)})\n• ${
      customer.pending_amount < 0 ? "Advance Balance" : "Pending Balance"
    }: ${formatCurrency(Math.abs(customer.pending_amount))} (${formatGold(
      Math.abs(customer.pending_gold)
    )})\n\nView your full ledger details here:\n${portalUrl}`;

    const link = buildWhatsAppLink(customer.phone, text);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Back and Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EFE7C8] shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#0A0A0A]">
                {customer.name}
              </h1>

              {/* Access Mode Badge */}
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  customer.access_mode === "pin"
                    ? "bg-[#FFF3C4] text-[#0A0A0A]"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {customer.access_mode === "pin" ? (
                  <KeyRound className="w-3.5 h-3.5" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                <span>{customer.access_mode === "pin" ? "PIN Mode" : "Direct Link"}</span>
              </span>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  customer.is_active
                    ? "bg-green-50 text-[#15803D]"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {customer.is_active ? "Active" : "Deactivated"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#6B6B6B] mt-1.5 flex-wrap">
              <span>@{customer.username}</span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </span>
              )}
              {customer.notes && (
                <span className="italic text-[#0A0A0A]/80">Note: {customer.notes}</span>
              )}
            </div>
          </div>

          {/* Quick Share & Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="touch-target px-3.5 py-2 rounded-xl text-xs font-bold bg-[#15803D] text-white hover:bg-[#126832] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <a
              href={`/api/export/excel?customerId=${customer.id}`}
              className="touch-target px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0A0A0A] text-[#F5B400] hover:bg-[#1A1A1A] transition flex items-center gap-1.5 shadow-xs"
              title="Export Customer Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </a>

            <a
              href={`/api/export/pdf?customerId=${customer.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target px-3.5 py-2 rounded-xl text-xs font-bold border border-[#EFE7C8] hover:bg-[#FFFBEB] text-[#0A0A0A] transition flex items-center gap-1.5 shadow-xs"
              title="Download PDF Statement"
            >
              <FileText className="w-4 h-4 text-[#D99A00]" />
              <span className="hidden sm:inline">PDF</span>
            </a>

            {/* Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="touch-target p-2 rounded-xl border border-[#EFE7C8] hover:bg-[#FFFBEB] text-[#0A0A0A]"
                title="Customer Settings"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActionsDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowActionsDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#EFE7C8] py-1.5 z-30 divide-y divide-[#EFE7C8]/60 text-xs">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setIsEditCustomerOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A] flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          handleCopyLink();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A] flex items-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Access Link</span>
                      </button>

                      {customer.access_mode === "pin" ? (
                        <button
                          onClick={() => {
                            setShowActionsDropdown(false);
                            setIsResetPinOpen(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A] flex items-center gap-2"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset PIN</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowActionsDropdown(false);
                            handleRegenerateLink();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A] flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate Link</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setIsSwitchModeOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A] flex items-center gap-2"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Switch Access Mode</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          handleToggleActive();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFFBEB] text-[#0A0A0A]"
                      >
                        {customer.is_active ? "Deactivate Customer" : "Activate Customer"}
                      </button>

                      <button
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setIsDeleteCustomerOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-[#B91C1C] flex items-center gap-2 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Customer</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Billed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#6B6B6B] block mb-1">
            Total Billed
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#0A0A0A]">
            {formatCurrency(totalBilledAmount)}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1 font-medium">
            <Coins className="w-3.5 h-3.5 text-[#F5B400]" />
            Gold Billed: <strong className="text-[#0A0A0A]">{formatGold(totalBilledGold)}</strong>
          </div>
        </div>

        {/* Received */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EFE7C8] shadow-xs">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#15803D] block mb-1">
            Total Received
          </span>
          <div className="text-xl sm:text-2xl font-heading font-extrabold text-[#15803D]">
            {formatCurrency(totalReceivedCash)}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1 font-medium">
            <Coins className="w-3.5 h-3.5 text-[#15803D]" />
            Gold Received: <strong className="text-[#15803D]">{formatGold(totalReceivedGold)}</strong>
          </div>
        </div>

        {/* Pending */}
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
              ? `${formatCurrency(Math.abs(pendingAmount))} (Advance)`
              : formatCurrency(pendingAmount)}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1 flex items-center gap-1 font-medium">
            <Coins className="w-3.5 h-3.5 text-[#D99A00]" />
            Gold Balance:{" "}
            <strong className={pendingGold < 0 ? "text-[#15803D]" : "text-[#0A0A0A]"}>
              {pendingGold < 0
                ? `${formatGold(Math.abs(pendingGold))} (Adv)`
                : formatGold(pendingGold)}
            </strong>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#EFE7C8] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-[#0A0A0A] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#D99A00]" />
            Filter by Date:
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
          />
          <span className="text-[#6B6B6B]">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-xs text-[#D99A00] font-bold hover:underline ml-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick Add Buttons on Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => {
              setBillToEdit(null);
              setIsAddBillOpen(true);
            }}
            className="touch-target px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
          <button
            onClick={() => {
              setReceiptToEdit(null);
              setIsAddReceiptOpen(true);
            }}
            className="touch-target px-3 py-1.5 rounded-xl text-xs font-bold bg-[#15803D] text-white hover:bg-[#126832] transition flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payment</span>
          </button>
        </div>
      </div>

      {/* Mobile Tabs Switcher (<640px) */}
      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-2xl border border-[#EFE7C8] md:hidden">
        <button
          onClick={() => setMobileTab("bills")}
          className={`touch-target py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === "bills"
              ? "bg-[#F5B400] text-black shadow-xs"
              : "text-[#6B6B6B]"
          }`}
        >
          <span>Bills ({filteredBills.length})</span>
        </button>
        <button
          onClick={() => setMobileTab("receipts")}
          className={`touch-target py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === "receipts"
              ? "bg-[#15803D] text-white shadow-xs"
              : "text-[#6B6B6B]"
          }`}
        >
          <span>Received ({filteredReceipts.length})</span>
        </button>
      </div>

      {/* Tables / Stacked Cards Container: Side-by-Side on Desktop, Tabs on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Bills (Work Done) */}
        <div className={`space-y-3 ${mobileTab !== "bills" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-[#0A0A0A] flex items-center gap-1.5">
              <span>Work Done (Bills)</span>
              <span className="text-xs text-[#6B6B6B] font-normal">({filteredBills.length})</span>
            </h3>

            <button
              onClick={() => {
                setBillToEdit(null);
                setIsAddBillOpen(true);
              }}
              className="touch-target sm:hidden px-3 py-1 rounded-xl text-xs font-bold bg-[#F5B400] text-black flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bill</span>
            </button>
          </div>

          {filteredBills.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-[#EFE7C8] text-center">
              <p className="text-xs text-[#6B6B6B] mb-3">No work bills recorded yet.</p>
              <button
                onClick={() => {
                  setBillToEdit(null);
                  setIsAddBillOpen(true);
                }}
                className="text-xs font-bold text-[#D99A00] hover:underline"
              >
                + Record first bill
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Stacked Bills */}
              <div className="space-y-2.5 sm:hidden">
                {filteredBills.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white p-3.5 rounded-2xl border border-[#EFE7C8] shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#D99A00]">
                          {formatBillNo(b.bill_no)}
                        </span>
                        <h4 className="text-sm font-bold text-[#0A0A0A]">{b.item}</h4>
                      </div>
                      <span className="text-sm font-heading font-extrabold text-[#0A0A0A]">
                        {formatCurrency(b.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#6B6B6B] pt-1">
                      <span>{formatDate(b.bill_date)}</span>
                      {b.gold_weight > 0 && <span>Gold: {formatGold(b.gold_weight)}</span>}
                    </div>

                    {b.note && (
                      <p className="text-[11px] text-[#6B6B6B] italic mt-1 bg-[#FFFBEB]/50 p-1.5 rounded-lg">
                        {b.note}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#EFE7C8]/60">
                      <button
                        onClick={() => {
                          setBillToEdit(b);
                          setIsAddBillOpen(true);
                        }}
                        className="text-xs font-semibold text-[#0A0A0A] hover:text-[#D99A00] p-1 flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setBillToDelete(b)}
                        className="text-xs font-semibold text-[#B91C1C] hover:text-red-800 p-1 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Bills Table */}
              <div className="hidden sm:block bg-white rounded-2xl border border-[#EFE7C8] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0A0A0A] text-white uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Bill No.</th>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Item</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Gold</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7C8]">
                    {filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-[#FFFBEB]/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#D99A00]">
                          {formatBillNo(b.bill_no)}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B6B6B] whitespace-nowrap">
                          {formatDate(b.bill_date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#0A0A0A]">
                          <div>{b.item}</div>
                          {b.note && <div className="text-[10px] text-[#6B6B6B] font-normal italic">{b.note}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#0A0A0A]">
                          {b.gold_weight > 0 ? formatGold(b.gold_weight) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-heading font-bold text-[#0A0A0A]">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setBillToEdit(b);
                                setIsAddBillOpen(true);
                              }}
                              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A] transition"
                              title="Edit Bill"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setBillToDelete(b)}
                              className="p-1 text-[#B91C1C] hover:text-red-900 transition"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Section 2: Received Payments */}
        <div className={`space-y-3 ${mobileTab !== "receipts" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading font-bold text-[#0A0A0A] flex items-center gap-1.5">
              <span>Received Payments</span>
              <span className="text-xs text-[#6B6B6B] font-normal">({filteredReceipts.length})</span>
            </h3>

            <button
              onClick={() => {
                setReceiptToEdit(null);
                setIsAddReceiptOpen(true);
              }}
              className="touch-target sm:hidden px-3 py-1 rounded-xl text-xs font-bold bg-[#15803D] text-white flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment</span>
            </button>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-[#EFE7C8] text-center">
              <p className="text-xs text-[#6B6B6B] mb-3">No payments received yet.</p>
              <button
                onClick={() => {
                  setReceiptToEdit(null);
                  setIsAddReceiptOpen(true);
                }}
                className="text-xs font-bold text-[#15803D] hover:underline"
              >
                + Record first payment
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Stacked Receipts */}
              <div className="space-y-2.5 sm:hidden">
                {filteredReceipts.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-3.5 rounded-2xl border border-[#EFE7C8] shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-xs text-[#6B6B6B] block">{formatDate(r.receipt_date)}</span>
                        {r.note && <span className="text-xs text-[#0A0A0A] font-medium">{r.note}</span>}
                      </div>
                      <span className="text-sm font-heading font-extrabold text-[#15803D]">
                        {formatCurrency(r.cash_amount)}
                      </span>
                    </div>

                    {r.gold_weight > 0 && (
                      <div className="text-xs font-medium text-[#0A0A0A] bg-amber-50 px-2 py-1 rounded-lg inline-block">
                        Gold Received: {formatGold(r.gold_weight)}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#EFE7C8]/60">
                      <button
                        onClick={() => {
                          setReceiptToEdit(r);
                          setIsAddReceiptOpen(true);
                        }}
                        className="text-xs font-semibold text-[#0A0A0A] hover:text-[#15803D] p-1 flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setReceiptToDelete(r)}
                        className="text-xs font-semibold text-[#B91C1C] hover:text-red-800 p-1 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Receipts Table */}
              <div className="hidden sm:block bg-white rounded-2xl border border-[#EFE7C8] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0A0A0A] text-white uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Gold (g)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Cash (₹)</th>
                      <th className="py-2.5 px-3 font-semibold">Note</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7C8]">
                    {filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#FFFBEB]/40 transition">
                        <td className="py-2.5 px-3 text-[#6B6B6B] whitespace-nowrap">
                          {formatDate(r.receipt_date)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#0A0A0A]">
                          {r.gold_weight > 0 ? formatGold(r.gold_weight) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-heading font-extrabold text-[#15803D]">
                          {formatCurrency(r.cash_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B6B6B] italic">
                          {r.note || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setReceiptToEdit(r);
                                setIsAddReceiptOpen(true);
                              }}
                              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A] transition"
                              title="Edit Receipt"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setReceiptToDelete(r)}
                              className="p-1 text-[#B91C1C] hover:text-red-900 transition"
                              title="Delete Receipt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Action Button (+) for Mobile */}
      <button
        onClick={() => {
          if (mobileTab === "bills") {
            setBillToEdit(null);
            setIsAddBillOpen(true);
          } else {
            setReceiptToEdit(null);
            setIsAddReceiptOpen(true);
          }
        }}
        className="touch-target md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#F5B400] text-black shadow-xl flex items-center justify-center hover:bg-[#D99A00] active:scale-95 transition-all border-2 border-black cursor-pointer"
        aria-label="Add Entry"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Dialogs */}
      <AddEditBillDialog
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        onSuccess={handleRefresh}
        customerId={customer.id}
        billToEdit={billToEdit}
        suggestedItems={suggestedItems}
      />

      <AddEditReceiptDialog
        isOpen={isAddReceiptOpen}
        onClose={() => setIsAddReceiptOpen(false)}
        onSuccess={handleRefresh}
        customerId={customer.id}
        receiptToEdit={receiptToEdit}
      />

      <EditCustomerDialog
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        customer={customer}
        onSuccess={handleRefresh}
      />

      <ResetPinDialog
        isOpen={isResetPinOpen}
        onClose={() => setIsResetPinOpen(false)}
        customer={customer}
        onSuccess={handleRefresh}
      />

      <SwitchModeDialog
        isOpen={isSwitchModeOpen}
        onClose={() => setIsSwitchModeOpen(false)}
        customer={customer}
        onSuccess={handleRefresh}
      />

      <DeleteCustomerModal
        isOpen={isDeleteCustomerOpen}
        onClose={() => setIsDeleteCustomerOpen(false)}
        customer={customer}
      />

      <DeleteItemDialog
        isOpen={Boolean(billToDelete)}
        onClose={() => setBillToDelete(null)}
        title="Delete Bill"
        description={`Are you sure you want to delete bill #${billToDelete?.bill_no} (${billToDelete?.item})? This will update the customer balance.`}
        onConfirm={handleConfirmDeleteBill}
        isPending={isPending}
      />

      <DeleteItemDialog
        isOpen={Boolean(receiptToDelete)}
        onClose={() => setReceiptToDelete(null)}
        title="Delete Payment Receipt"
        description={`Are you sure you want to delete this payment receipt of ${formatCurrency(
          receiptToDelete?.cash_amount
        )}?`}
        onConfirm={handleConfirmDeleteReceipt}
        isPending={isPending}
      />
    </div>
  );
}
