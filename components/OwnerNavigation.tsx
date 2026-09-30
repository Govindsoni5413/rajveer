"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/auth";

interface OwnerNavigationProps {
  username: string;
}

export function OwnerHeader({ username }: OwnerNavigationProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <header className="bg-[#0A0A0A] text-white border-b border-[#222] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" inverted />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#333]">
            <span className="w-2 h-2 rounded-full bg-[#15803D]" />
            <span className="text-xs text-[#FFF3C4] font-medium">Owner: {username}</span>
          </div>

          <button
            onClick={handleLogout}
            disabled={isPending}
            className="touch-target px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FFF3C4] hover:text-white hover:bg-[#222] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Log out"
          >
            <LogOut className="w-4 h-4 text-[#F5B400]" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function OwnerSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Export", href: "/export", icon: FileSpreadsheet },
    { label: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#EFE7C8] shrink-0 min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#FFF3C4] text-[#0A0A0A] font-bold shadow-xs border border-[#EFE7C8]"
                  : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#FFFBEB]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#D99A00]" : "text-[#6B6B6B]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function OwnerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Export", href: "/export", icon: FileSpreadsheet },
    { label: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EFE7C8] px-2 py-1 shadow-lg flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`touch-target flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
              isActive
                ? "text-[#0A0A0A] font-bold"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <div className={`p-1 rounded-xl ${isActive ? "bg-[#FFF3C4]" : ""}`}>
              <Icon className={`w-5 h-5 ${isActive ? "text-[#D99A00]" : "text-[#6B6B6B]"}`} />
            </div>
            <span className="text-[11px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
