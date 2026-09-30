import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login — Rajveer",
  description: "Sign in to Rajveer Gold & Jewellery Ledger",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; username?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (session?.role === "owner") {
    redirect("/dashboard");
  } else if (session?.role === "customer") {
    redirect("/portal");
  }

  const resolved = await searchParams;
  const initialTab = resolved?.tab === "customer" ? "customer" : "owner";
  const initialUsername = resolved?.username || "";

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col justify-center items-center p-4 py-8">
      <LoginForm initialTab={initialTab} initialUsername={initialUsername} />
    </div>
  );
}
