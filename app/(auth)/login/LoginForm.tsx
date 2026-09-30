"use client";

import React, { useState, useTransition, useRef } from "react";
import { Eye, EyeOff, Lock, User, ShieldAlert, Sparkles, KeyRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { loginOwnerAction, loginCustomerAction } from "@/app/actions/auth";

interface LoginFormProps {
  initialTab: "owner" | "customer";
  initialUsername?: string;
}

export function LoginForm({ initialTab, initialUsername = "" }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<"owner" | "customer">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Owner form state
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Customer form state
  const [customerUsername, setCustomerUsername] = useState(initialUsername);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTabChange = (tab: "owner" | "customer") => {
    setActiveTab(tab);
    setErrorMessage(null);
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("username", ownerUsername);
    formData.append("password", ownerPassword);

    startTransition(async () => {
      const res = await loginOwnerAction(null, formData);
      if (res && !res.success) {
        setErrorMessage(res.error || "Login failed");
      }
    });
  };

  const handlePinChange = (index: number, val: string) => {
    // Only accept numeric digits
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...pinDigits];
      next[index] = "";
      setPinDigits(next);
      return;
    }

    // If user pasted multi-digit pin
    if (cleaned.length > 1) {
      const next = [...pinDigits];
      for (let i = 0; i < 4 && i < cleaned.length; i++) {
        next[i] = cleaned[i];
      }
      setPinDigits(next);
      const targetIdx = Math.min(3, cleaned.length);
      pinInputRefs[targetIdx]?.current?.focus();
      return;
    }

    const next = [...pinDigits];
    next[index] = cleaned[0];
    setPinDigits(next);

    // Auto-focus next input
    if (index < 3 && cleaned[0]) {
      pinInputRefs[index + 1]?.current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1]?.current?.focus();
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pin = pinDigits.join("");
    if (pin.length !== 4) {
      setErrorMessage("Please enter all 4 digits of your PIN");
      return;
    }

    const formData = new FormData();
    formData.append("username", customerUsername);
    formData.append("pin", pin);

    startTransition(async () => {
      const res = await loginCustomerAction(null, formData);
      if (res && !res.success) {
        setErrorMessage(res.error || "Login failed");
      }
    });
  };

  return (
    <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#EFE7C8] transition-all">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <Logo size="lg" className="justify-center mb-2" />
        <p className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium">
          Customer Ledger Dashboard
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-[#FFFBEB] p-1.5 rounded-2xl border border-[#EFE7C8] mb-6">
        <button
          type="button"
          onClick={() => handleTabChange("owner")}
          className={`touch-target py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "owner"
              ? "bg-[#F5B400] text-[#0A0A0A] shadow-sm font-bold"
              : "text-[#6B6B6B] hover:text-[#0A0A0A]"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Owner</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("customer")}
          className={`touch-target py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "customer"
              ? "bg-[#F5B400] text-[#0A0A0A] shadow-sm font-bold"
              : "text-[#6B6B6B] hover:text-[#0A0A0A]"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Customer</span>
        </button>
      </div>

      {/* Error / Lockout Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-[#B91C1C]">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Owner Form */}
      {activeTab === "owner" && (
        <form onSubmit={handleOwnerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1.5">
              Owner Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoCapitalize="none"
                autoComplete="username"
                value={ownerUsername}
                onChange={(e) => setOwnerUsername(e.target.value)}
                placeholder="e.g. gauravsoni"
                className="w-full px-4 py-3 bg-[#FFFBEB]/40 rounded-xl border border-[#EFE7C8] text-[#0A0A0A] placeholder-[#6B6B6B]/60 focus:outline-none focus:ring-2 focus:ring-[#F5B400] focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0A0A0A]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] flex items-center gap-1"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Show
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Enter owner password"
                className="w-full px-4 py-3 bg-[#FFFBEB]/40 rounded-xl border border-[#EFE7C8] text-[#0A0A0A] placeholder-[#6B6B6B]/60 focus:outline-none focus:ring-2 focus:ring-[#F5B400] focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="touch-target w-full mt-2 py-3 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign in as Owner</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Customer Form */}
      {activeTab === "customer" && (
        <form onSubmit={handleCustomerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1.5">
              Your Customer Username
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoComplete="username"
              value={customerUsername}
              onChange={(e) => setCustomerUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="e.g. rameshkumar"
              className="w-full px-4 py-3 bg-[#FFFBEB]/40 rounded-xl border border-[#EFE7C8] text-[#0A0A0A] placeholder-[#6B6B6B]/60 focus:outline-none focus:ring-2 focus:ring-[#F5B400] focus:border-transparent transition"
            />
            <p className="text-[11px] text-[#6B6B6B] mt-1">Provided by your jeweller</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] mb-2 text-center">
              Enter 4-Digit PIN
            </label>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={pinInputRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pinDigits[idx]}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  className="w-14 h-14 text-center font-heading text-2xl font-bold rounded-2xl bg-[#FFFBEB]/50 border-2 border-[#EFE7C8] focus:border-[#F5B400] focus:bg-white focus:outline-none transition shadow-inner"
                />
              ))}
            </div>
            <p className="text-[11px] text-[#6B6B6B] text-center mt-2">
              For direct access links, open the link sent to your WhatsApp
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="touch-target w-full mt-3 py-3 px-4 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Open My Ledger</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer subtle text */}
      <div className="mt-6 pt-5 border-t border-[#EFE7C8]/70 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B]">
          <Sparkles className="w-3.5 h-3.5 text-[#F5B400]" />
          <span>Secure Gold & Jewellery Management</span>
        </div>
      </div>
    </div>
  );
}
