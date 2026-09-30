"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Bill } from "@/lib/types";
import { createBillAction, updateBillAction } from "@/app/actions/bills";

interface AddEditBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  billToEdit?: Bill | null;
  suggestedItems: string[];
}

export function AddEditBillDialog({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  billToEdit,
  suggestedItems,
}: AddEditBillDialogProps) {
  const isEditing = Boolean(billToEdit);

  const [billDate, setBillDate] = useState("");
  const [item, setItem] = useState("");
  const [goldWeight, setGoldWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (billToEdit) {
      setBillDate(billToEdit.bill_date);
      setItem(billToEdit.item);
      setGoldWeight(billToEdit.gold_weight > 0 ? String(billToEdit.gold_weight) : "");
      setAmount(billToEdit.amount > 0 ? String(billToEdit.amount) : "");
      setNote(billToEdit.note || "");
    } else {
      setBillDate(new Date().toISOString().split("T")[0]);
      setItem("");
      setGoldWeight("");
      setAmount("");
      setNote("");
    }
  }, [billToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!item.trim()) {
      toast.error("Please enter item description");
      return;
    }

    startTransition(async () => {
      if (isEditing && billToEdit) {
        const res = await updateBillAction(billToEdit.id, customerId, {
          bill_date: billDate,
          item,
          gold_weight: Number(goldWeight) || 0,
          amount: Number(amount) || 0,
          note,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to update bill");
          return;
        }
        toast.success("Bill updated successfully!");
      } else {
        const res = await createBillAction({
          customer_id: customerId,
          bill_date: billDate,
          item,
          gold_weight: Number(goldWeight) || 0,
          amount: Number(amount) || 0,
          note,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to add bill");
          return;
        }
        toast.success("Bill recorded successfully!");
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
          <div className="w-10 h-10 rounded-2xl bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-[#0A0A0A]">
              {isEditing ? `Edit Bill #${billToEdit?.bill_no}` : "Record Work Done (Bill)"}
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              {isEditing ? "Modify bill details" : "Bill number is assigned automatically"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Item Description *
            </label>
            <input
              type="text"
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Gold Ring 22k, Necklace repair, Bangles"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
            />

            {/* Autosuggest chips from previous items */}
            {suggestedItems.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-[#6B6B6B] flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-[#D99A00]" /> Suggestions:
                </span>
                {suggestedItems.slice(0, 5).map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setItem(sugg)}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#EFE7C8] text-[#0A0A0A] hover:bg-[#FFF3C4] transition cursor-pointer"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Gold Weight (g)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                inputMode="decimal"
                value={goldWeight}
                onChange={(e) => setGoldWeight(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Making charges included"
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
                <span>{isEditing ? "Save Changes" : "Save Bill"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
