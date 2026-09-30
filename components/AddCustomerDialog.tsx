"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  UserPlus,
  KeyRound,
  Link as LinkIcon,
  Sparkles,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { createCustomerAction } from "@/app/actions/customers";
import { buildWhatsAppLink } from "@/lib/format";

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCustomerDialog({ isOpen, onClose, onSuccess }: AddCustomerDialogProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [accessMode, setAccessMode] = useState<"pin" | "link">("pin");
  const [pin, setPin] = useState("");
  const [notes, setNotes] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success credential modal state
  const [createdInfo, setCreatedInfo] = useState<{
    name: string;
    username: string;
    pin: string | null;
    linkToken: string;
    phone: string | null;
    accessMode: "pin" | "link";
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!username) {
      // Suggest a clean username from name
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      setUsername(clean);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createCustomerAction({
        name,
        username,
        phone,
        access_mode: accessMode,
        pin: accessMode === "pin" ? pin : null,
        notes,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create customer");
        return;
      }

      setCreatedInfo({
        name,
        username,
        pin: res.plainPin || null,
        linkToken: res.linkToken || "",
        phone,
        accessMode,
      });

      toast.success("Customer created successfully!");
      onSuccess();
    });
  };

  const getPortalUrl = () => {
    if (!createdInfo || typeof window === "undefined") return "";
    const siteUrl = window.location.origin;
    if (createdInfo.accessMode === "link") {
      return `${siteUrl}/c/${createdInfo.linkToken}`;
    }
    return `${siteUrl}/login?tab=customer&username=${createdInfo.username}`;
  };

  const handleCopyLink = () => {
    const url = getPortalUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Login link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!createdInfo) return;
    const url = getPortalUrl();
    const text = `Namaste ${createdInfo.name},\n\nHere are your access details for your jewellery ledger with Rajveer:\n\n• Username: ${createdInfo.username}${
      createdInfo.pin ? `\n• 4-Digit PIN: ${createdInfo.pin}` : ""
    }\n• Access Link: ${url}\n\nYou can view all your bills and payments anytime.`;
    const waUrl = buildWhatsAppLink(createdInfo.phone, text);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyPin = () => {
    if (createdInfo?.pin) {
      navigator.clipboard.writeText(createdInfo.pin);
      setCopiedPin(true);
      toast.success("PIN copied to clipboard!");
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleCloseAll = () => {
    setName("");
    setUsername("");
    setPhone("");
    setPin("");
    setNotes("");
    setCreatedInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#EFE7C8] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleCloseAll}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-black rounded-full hover:bg-[#FFFBEB] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        {!createdInfo ? (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-[#0A0A0A]">
                  Add New Customer
                </h3>
                <p className="text-xs text-[#6B6B6B]">Create a private customer ledger</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#B91C1C] rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Private Username (unique, lowercase, no spaces) *
                </label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. rameshkumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Phone Number (optional, for WhatsApp share)
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>

              {/* Access Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1.5">
                  Customer Access Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#FFFBEB] p-1.5 rounded-2xl border border-[#EFE7C8]">
                  <button
                    type="button"
                    onClick={() => setAccessMode("pin")}
                    className={`touch-target py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      accessMode === "pin"
                        ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                        : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>PIN Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessMode("link")}
                    className={`touch-target py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      accessMode === "link"
                        ? "bg-[#F5B400] text-[#0A0A0A] font-bold shadow-xs"
                        : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Direct Link</span>
                  </button>
                </div>
              </div>

              {/* PIN Field if PIN mode */}
              {accessMode === "pin" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#0A0A0A]">
                      4-Digit Secret PIN *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-xs text-[#D99A00] hover:text-black font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 4821"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] font-mono font-bold tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">
                  Notes (optional, private to owner)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Referred by Suresh, works in sector 14"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EFE7C8] bg-[#FFFBEB]/40 text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="touch-target w-full py-3 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isPending ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Credentials Share Modal (Shown once upon creation) */
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-green-50 text-[#15803D] rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-heading font-bold text-[#0A0A0A] mb-1">
              Customer Created!
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-5">
              Share login credentials with <strong>{createdInfo.name}</strong> now.
            </p>

            <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#EFE7C8] text-left space-y-3 mb-5">
              <div>
                <span className="text-[11px] uppercase font-semibold text-[#6B6B6B] block">Username</span>
                <span className="text-sm font-bold text-[#0A0A0A]">@{createdInfo.username}</span>
              </div>

              {createdInfo.pin && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#6B6B6B] block">4-Digit PIN</span>
                    <span className="text-base font-heading font-extrabold text-[#0A0A0A] tracking-widest">
                      {createdInfo.pin}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyPin}
                    className="touch-target p-2 rounded-xl border border-[#EFE7C8] bg-white text-xs font-semibold flex items-center gap-1 hover:bg-[#FFF3C4]"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}

              <div>
                <span className="text-[11px] uppercase font-semibold text-[#6B6B6B] block mb-1">
                  {createdInfo.accessMode === "link" ? "Direct Login Link" : "Customer Portal Link"}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPortalUrl()}
                    className="flex-1 text-xs px-2.5 py-2 bg-white rounded-lg border border-[#EFE7C8] font-mono text-[#0A0A0A] truncate select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="touch-target p-2 rounded-xl border border-[#EFE7C8] bg-white text-xs font-semibold flex items-center gap-1 hover:bg-[#FFF3C4]"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="touch-target w-full py-3 px-4 rounded-xl font-bold bg-[#15803D] text-white hover:bg-[#126832] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={handleCloseAll}
                className="touch-target w-full py-2.5 px-4 rounded-xl font-semibold border border-[#EFE7C8] text-[#0A0A0A] hover:bg-[#FFFBEB] transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
