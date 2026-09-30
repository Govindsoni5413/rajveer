import type { Metadata } from "next";
import { requireOwner } from "@/lib/session";
import { getSettingsAction } from "@/app/actions/settings";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = {
  title: "Settings — Rajveer",
  description: "Manage business profile, passwords, and backup preferences",
};

export default async function SettingsPage() {
  const session = await requireOwner();
  const settings = await getSettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-[#0A0A0A] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-1">
          Configure business details, owner password, and 6-monthly automated backup alerts.
        </p>
      </div>

      <SettingsClient initialSettings={settings} ownerUsername={session.username} />
    </div>
  );
}
