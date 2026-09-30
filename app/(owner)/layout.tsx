import React from "react";
import { requireOwner } from "@/lib/session";
import { getBackupStatus } from "@/lib/backup";
import { OwnerHeader, OwnerSidebar, OwnerBottomNav } from "@/components/OwnerNavigation";
import { BackupBanner } from "@/components/BackupBanner";
import { BackupDailyModal } from "@/components/BackupDailyModal";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOwner();
  const backupStatus = await getBackupStatus();

  return (
    <div className="min-h-screen bg-[#FFFBEB]/30 flex flex-col">
      {/* 6-monthly backup reminder banner if due */}
      {backupStatus.showBanner && (
        <BackupBanner intervalMonths={backupStatus.intervalMonths} />
      )}

      {/* Daily reminder modal on first login of the day */}
      <BackupDailyModal
        isDue={backupStatus.isDue}
        intervalMonths={backupStatus.intervalMonths}
      />

      {/* Top Black Header Bar with Gold Wordmark */}
      <OwnerHeader username={session.username} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Left Sidebar */}
        <OwnerSidebar />

        {/* Main Content Area (extra bottom padding on mobile for bottom navigation) */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <OwnerBottomNav />
    </div>
  );
}
