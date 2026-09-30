"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Receipt } from "@/lib/types";
import { createReceiptAction, updateReceiptAction } from "@/app/actions/receipts";

interface AddEditReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  receiptToEdit?: Receipt | null;
}

export function AddEditReceiptDialog({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  receiptToEdit,
}: AddEditReceiptDialogProps) {
  const isEditing = Boolean(receiptToEdit);

  const [receiptDate, setReceiptDate] = useState("");
  const [goldWeight, setGoldWeight] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (receiptToEdit) {
      setReceiptDate(receiptToEdit.receipt_date);
      setGoldWeight(receiptToEdit.gold_weight > 0 ? String(receiptToEdit.gold_weight) : "");
      setCashAmount(receiptToEdit.cash_amount > 0 ? String(receiptToEdit.cash_amount) : "");
      setNote(receiptToEdit.note || "");
    } else {
      setReceiptDate(new Date().toISOString().split("T")[0]);
      setGoldWeight("");
      setCashAmount("");
      setNote("");
    }
  }, [receiptToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gold = Number(goldWeight) || 0;
    const cash = Number(cashAmount) || 0;

    if (gold <= 0 && cash <= 0) {
      toast.error("Please enter either received Cash Amount (₹) or Gold Weight (g)");
      return;
    }

    startTransition(async () => {
      if (isEditing && receiptToEdit) {
        const res = await updateReceiptAction(receiptToEdit.id, customerId, {
          receipt_date: receiptDate,
          gold_weight: gold,
          cash_amount: cash,
          note,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to update receipt");
          return;
        }
        toast.success("Receipt updated successfully!");
      } else {
        const res = await createReceiptAction({
          customer_id: customerId,
          receipt_date: receiptDate,
          gold_weight: gold,
          cash_amount: cash,
          note,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to record payment");
          return;
        }
        toast.success("Payment receipt recorded successfully!");
      }

      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#EFE7C8] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full hover:bg-[#FFFBEB] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-green-50 text-[#15803D] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-[#0A0A0A]">
              {isEditing ? "Edit Payment Receipt" : "Record Received Payment"}
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              Record cash and/or gold weight received from customer
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Receipt Date *
            </label>
            <input
              type="date"
              required
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />
          </div>

          <div className="p-3 bg-[#FFFBEB] rounded-2xl border border-[#EFE7C8] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A0A0A]">
              <AlertCircle className="w-4 h-4 text-[#D99A00]" />
              <span>Fill Cash, Gold, or Both:</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#15803D] mb-1">
                  Cash Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="₹ 0.00"
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-[#15803D] font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#15803D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Gold Received (g)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  value={goldWeight}
                  onChange={(e) => setGoldWeight(e.target.value)}
                  placeholder="0.00 g"
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE7C8] bg-white text-[#0A0A0A] font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Payment Note / Reference (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via UPI, Old gold exchanged"
              className="w-full px-3.5 py-2 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="touch-target flex-1 py-2.5 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isEditing ? "Save Changes" : "Save Receipt"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
