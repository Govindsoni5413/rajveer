import type { Metadata } from "next";
import { getCustomerPortalDataAction } from "@/app/actions/portal";
import { PortalClient } from "@/components/PortalClient";

export const metadata: Metadata = {
  title: "Customer Ledger Portal — Rajveer",
  description: "View your gold and jewellery ledger balance and transaction statements",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CustomerPortalPage() {
  const data = await getCustomerPortalDataAction();

  return <PortalClient initialData={data} />;
}
