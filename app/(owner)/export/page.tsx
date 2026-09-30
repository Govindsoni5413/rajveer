import type { Metadata } from "next";
import { getCustomersAction } from "@/app/actions/customers";
import { ExportFormClient } from "@/components/ExportFormClient";

export const metadata: Metadata = {
  title: "Export Ledger — Rajveer",
  description: "Export Customer Ledgers to Excel and Full System Backup",
};

export default async function ExportPage() {
  const customers = await getCustomersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-[#0A0A0A] tracking-tight">
          Export Data & Backups
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-1">
          Export custom periods to Excel or generate a comprehensive full backup.
        </p>
      </div>

      <ExportFormClient customers={customers} />
    </div>
  );
}
