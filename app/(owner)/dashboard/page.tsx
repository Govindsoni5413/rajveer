import type { Metadata } from "next";
import { getDashboardDataAction } from "@/app/actions/dashboard";
import { DashboardClient } from "@/components/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — Rajveer Ledger",
  description: "Jewellery and Goldsmith Ledger Overview",
};

export default async function DashboardPage() {
  const initialData = await getDashboardDataAction("this_month");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-[#0A0A0A] tracking-tight">
          Business Overview
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-1">
          Monitor your customer balances, work billed, and cash received in real-time.
        </p>
      </div>

      <DashboardClient initialData={initialData} />
    </div>
  );
}
