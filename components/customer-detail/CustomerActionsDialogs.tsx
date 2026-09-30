"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  KeyRound,
  Link as LinkIcon,
  Trash2,
  AlertTriangle,
  Sparkles,
  Edit,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { CustomerWithBalance } from "@/lib/types";
import {
  updateCustomerAction,
  resetCustomerPinAction,
  switchCustomerAccessModeAction,
  regenerateCustomerLinkAction,
  deleteCustomerAction,
} from "@/app/actions/customers";

// 1. Edit Customer Details Dialog
export function EditCustomerDialog({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithBalance;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [isActive, setIsActive] = useState(customer.is_active);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, {
        name,
        phone,
        notes,
        is_active: isActive,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update customer");
        return;
      }

      toast.success("Customer details updated!");
      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#EFE7C8] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-heading font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
          <Edit className="w-5 h-5 text-[#D99A00]" />
          <span>Edit Customer</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Customer Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
              Owner Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A]"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#F5B400] rounded accent-[#F5B400]"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-semibold text-[#0A0A0A] cursor-pointer">
              Account Active (customer can log in)
            </label>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="touch-target flex-1 py-2.5 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Reset PIN Dialog
export function ResetPinDialog({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithBalance;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    startTransition(async () => {
      const res = await resetCustomerPinAction(customer.id, pin);
      if (!res.success) {
        toast.error(res.error || "Failed to reset PIN");
        return;
      }
      toast.success(`PIN reset successfully to: ${pin}`);
      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#EFE7C8] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-heading font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#D99A00]" />
          <span>Reset Customer PIN</span>
        </h3>
        <p className="text-xs text-[#6B6B6B] mb-4">
          Set a new 4-digit PIN for <strong>{customer.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-[#0A0A0A]">New 4-Digit PIN</label>
              <button
                type="button"
                onClick={handleGeneratePin}
                className="text-xs text-[#D99A00] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Generate
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 9812"
              className="w-full px-3 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-center font-heading text-xl font-bold tracking-widest text-[#0A0A0A]"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || pin.length !== 4}
              className="touch-target flex-1 py-2 px-3 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] disabled:opacity-50"
            >
              Update PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Switch Mode Dialog
export function SwitchModeDialog({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithBalance;
  onSuccess: () => void;
}) {
  const currentMode = customer.access_mode;
  const targetMode = currentMode === "pin" ? "link" : "pin";
  const [pin, setPin] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMode === "pin" && pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    startTransition(async () => {
      const res = await switchCustomerAccessModeAction(customer.id, targetMode, pin);
      if (!res.success) {
        toast.error(res.error || "Failed to switch access mode");
        return;
      }
      toast.success(`Access mode switched to ${targetMode.toUpperCase()} mode!`);
      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#EFE7C8] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-heading font-bold text-[#0A0A0A] mb-2">
          Switch to {targetMode === "pin" ? "PIN Access" : "Direct Link"}
        </h3>
        <p className="text-xs text-[#6B6B6B] mb-4 leading-relaxed">
          {targetMode === "link"
            ? "Customer will no longer need a PIN to view their ledger. They can open their personal random link directly."
            : "Customer will now be prompted for their username and 4-digit PIN."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {targetMode === "pin" && (
            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                Enter 4-Digit PIN for Customer
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 5623"
                className="w-full px-3 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-center font-heading text-lg font-bold tracking-widest text-[#0A0A0A]"
              />
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="touch-target flex-1 py-2 px-3 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00]"
            >
              Switch Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. Delete Customer Confirmation Modal (Requires typing customer name)
export function DeleteCustomerModal({
  isOpen,
  onClose,
  customer,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWithBalance;
}) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const isMatch = confirmName.trim().toLowerCase() === customer.name.trim().toLowerCase();

  const handleDelete = () => {
    if (!isMatch) return;

    startTransition(async () => {
      const res = await deleteCustomerAction(customer.id, confirmName);
      if (!res.success) {
        toast.error(res.error || "Failed to delete customer");
        return;
      }

      toast.success("Customer and all associated records deleted.");
      router.push("/customers");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border-2 border-red-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3 text-[#B91C1C]">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="text-lg font-heading font-bold">Delete Customer</h3>
        </div>

        <p className="text-xs text-[#6B6B6B] mb-4 leading-relaxed">
          This will permanently delete <strong>{customer.name}</strong> along with all{" "}
          <strong>{customer.bill_count} bills</strong> and payment records. This action cannot be undone.
        </p>

        <div className="p-3 bg-red-50 rounded-2xl border border-red-100 mb-4">
          <label className="block text-xs font-semibold text-[#B91C1C] mb-1">
            Type <span className="underline font-bold select-all">{customer.name}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={customer.name}
            className="w-full px-3 py-2 bg-white rounded-xl border border-red-200 text-sm text-[#0A0A0A] font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || isPending}
            className="touch-target flex-1 py-2.5 px-4 rounded-xl font-bold bg-[#B91C1C] text-white hover:bg-red-800 disabled:opacity-40 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Customer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Generic Delete Confirmation Dialog (for Bills and Receipts)
export function DeleteItemDialog({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#EFE7C8] relative">
        <h4 className="text-base font-heading font-bold text-[#0A0A0A] mb-2">{title}</h4>
        <p className="text-xs text-[#6B6B6B] mb-5">{description}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="touch-target flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-[#EFE7C8] text-[#6B6B6B]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="touch-target flex-1 py-2 px-3 rounded-xl font-bold bg-[#B91C1C] text-white hover:bg-red-800 disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
