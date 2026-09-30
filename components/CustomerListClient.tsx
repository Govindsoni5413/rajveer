"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ArrowUpDown,
  User,
  KeyRound,
  Link as LinkIcon,
  Clock,
  Coins,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { CustomerWithBalance } from "@/lib/types";
import { formatCurrency, formatGold, formatDate } from "@/lib/format";
import { AddCustomerDialog } from "./AddCustomerDialog";

interface CustomerListClientProps {
  initialCustomers: CustomerWithBalance[];
  openNewDialog?: boolean;
}

type SortOption = "name" | "pending_desc" | "activity_desc";

export function CustomerListClient({
  initialCustomers,
  openNewDialog = false,
}: CustomerListClientProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithBalance[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("pending_desc");
  const [isAddOpen, setIsAddOpen] = useState(openNewDialog);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "pending_desc") {
        return b.pending_amount - a.pending_amount;
      } else if (sortBy === "activity_desc") {
        const dateA = new Date(a.last_activity_date || a.created_at).getTime();
        const dateB = new Date(b.last_activity_date || b.created_at).getTime();
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [customers, search, sortBy]);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#0A0A0A] tracking-tight">
            Customer Ledgers
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            {customers.length} total customer{customers.length === 1 ? "" : "s"} registered
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="touch-target px-4 py-2.5 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-[#EFE7C8] shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username or phone..."
            className="w-full pl-10 pr-4 py-2 bg-[#FFFBEB]/40 rounded-xl border border-[#EFE7C8] text-sm text-[#0A0A0A] placeholder-[#6B6B6B]/70 focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[#6B6B6B] shrink-0 hidden sm:block" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="touch-target w-full sm:w-auto px-3 py-2 bg-[#FFFBEB]/40 rounded-xl border border-[#EFE7C8] text-xs font-semibold text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#F5B400]"
          >
            <option value="pending_desc">Pending: High to Low</option>
            <option value="name">Name: A to Z</option>
            <option value="activity_desc">Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Customer List / Table / Stacked Cards */}
      {customers.length === 0 ? (
        /* Empty State: 0 Customers */
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-[#EFE7C8] shadow-xs max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-[#FFF3C4] text-[#D99A00] flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-heading font-bold text-[#0A0A0A] mb-2">
            No Customers Yet
          </h3>
          <p className="text-xs text-[#6B6B6B] leading-relaxed mb-6">
            Get started by adding your first customer. You can assign a 4-digit PIN or a direct access link, and share it straight to their WhatsApp.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="touch-target inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-[#F5B400] text-[#0A0A0A] hover:bg-[#D99A00] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Customer</span>
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        /* Search Empty State */
        <div className="bg-white rounded-2xl p-8 text-center border border-[#EFE7C8] shadow-xs">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            No customers match &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => setSearch("")}
            className="mt-3 text-xs text-[#D99A00] font-bold hover:underline"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards (visible below 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredCustomers.map((cust) => {
              const isAdvance = cust.pending_amount < 0;
              return (
                <Link
                  key={cust.id}
                  href={`/customers/${cust.id}`}
                  className="block bg-white p-4 rounded-2xl border border-[#EFE7C8] shadow-xs active:bg-[#FFFBEB]/50 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="text-base font-bold text-[#0A0A0A] flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        {!cust.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B6B6B]">@{cust.username}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cust.access_mode === "pin"
                            ? "bg-[#FFF3C4] text-[#0A0A0A]"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {cust.access_mode === "pin" ? (
                          <KeyRound className="w-3 h-3" />
                        ) : (
                          <LinkIcon className="w-3 h-3" />
                        )}
                        <span>{cust.access_mode === "pin" ? "PIN" : "Link"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#FFFBEB]/40 p-2.5 rounded-xl border border-[#EFE7C8]/70 mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#6B6B6B] block">
                        {isAdvance ? "Advance Amount" : "Pending Amount"}
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          isAdvance
                            ? "text-[#15803D]"
                            : cust.pending_amount > 0
                            ? "text-[#B91C1C]"
                            : "text-[#0A0A0A]"
                        }`}
                      >
                        {isAdvance
                          ? `${formatCurrency(Math.abs(cust.pending_amount))} (Adv)`
                          : formatCurrency(cust.pending_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#6B6B6B] block">
                        Pending Gold
                      </span>
                      <span className="text-sm font-bold text-[#0A0A0A]">
                        {formatGold(cust.pending_gold)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Activity: {formatDate(cust.last_activity_date)}
                    </span>
                    <span className="font-semibold text-[#D99A00] flex items-center">
                      View Ledger <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table View (visible on 640px and up) */}
          <div className="hidden sm:block bg-white rounded-2xl border border-[#EFE7C8] shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] text-white text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Access</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Pending Gold</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Pending Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Last Activity</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE7C8] text-sm">
                {filteredCustomers.map((cust) => {
                  const isAdvance = cust.pending_amount < 0;
                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-[#FFFBEB]/40 transition group cursor-pointer"
                      onClick={() => router.push(`/customers/${cust.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0A0A0A] group-hover:text-[#D99A00] flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          {!cust.is_active && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6B6B6B]">
                          @{cust.username} {cust.phone && `• ${cust.phone}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            cust.access_mode === "pin"
                              ? "bg-[#FFF3C4] text-[#0A0A0A]"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {cust.access_mode === "pin" ? (
                            <KeyRound className="w-3 h-3" />
                          ) : (
                            <LinkIcon className="w-3 h-3" />
                          )}
                          <span>{cust.access_mode === "pin" ? "PIN" : "Link"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#0A0A0A]">
                        {formatGold(cust.pending_gold)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-heading font-extrabold ${
                            isAdvance
                              ? "text-[#15803D]"
                              : cust.pending_amount > 0
                              ? "text-[#B91C1C]"
                              : "text-[#0A0A0A]"
                          }`}
                        >
                          {isAdvance
                            ? `${formatCurrency(Math.abs(cust.pending_amount))} (Advance)`
                            : formatCurrency(cust.pending_amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs text-[#6B6B6B]">
                        {formatDate(cust.last_activity_date)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/customers/${cust.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="touch-target inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFF3C4] text-[#0A0A0A] hover:bg-[#F5B400] transition"
                        >
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Floating Action Button (+) for Mobile */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="touch-target md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#F5B400] text-black shadow-xl flex items-center justify-center hover:bg-[#D99A00] active:scale-95 transition-all border-2 border-black cursor-pointer"
        aria-label="Add Customer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Add Customer Modal */}
      <AddCustomerDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
