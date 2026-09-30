import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/session";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function DirectLinkPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return <InvalidLinkCard />;
  }

  let customer = null;
  try {
    const db = getDb();
    const { data, error } = await db
      .from("customers")
      .select("id, name, username, access_mode, is_active")
      .eq("link_token", token)
      .maybeSingle();

    if (error || !data) {
      return <InvalidLinkCard />;
    }
    customer = data;
  } catch (err) {
    console.error("Direct link error:", err);
    return <InvalidLinkCard />;
  }

  if (!customer.is_active) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-[#EFE7C8] text-center">
          <Logo size="md" className="justify-center mb-6" />
          <h2 className="text-xl font-heading font-bold text-[#B91C1C] mb-2">Account Inactive</h2>
          <p className="text-sm text-[#6B6B6B] mb-6">
            This customer account is currently deactivated. Please contact the store owner.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold bg-[#F5B400] text-black hover:bg-[#D99A00] transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // If customer is in PIN mode, redirect to login page with username prefilled
  if (customer.access_mode === "pin") {
    redirect(`/login?tab=customer&username=${encodeURIComponent(customer.username)}`);
  }

  // If customer is in Link mode, log them in directly
  const sessionToken = await signSession(
    {
      role: "customer",
      customerId: customer.id,
      username: customer.username,
      name: customer.name,
      isDirectLink: true,
    },
    30 * 24 * 60 * 60
  );

  await setSessionCookie(sessionToken, 30 * 24 * 60 * 60);
  redirect("/portal");
}

function InvalidLinkCard() {
  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-[#EFE7C8] text-center">
        <Logo size="md" className="justify-center mb-6" />
        <div className="w-12 h-12 bg-red-50 text-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-heading font-bold text-[#0A0A0A] mb-2">Invalid or Expired Link</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">
          This direct link is no longer valid. Please ask the store owner for an updated link or use your username & PIN.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold bg-[#F5B400] text-black hover:bg-[#D99A00] transition"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
