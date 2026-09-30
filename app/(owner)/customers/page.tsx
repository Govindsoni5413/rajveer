import type { Metadata } from "next";
import { getCustomersAction } from "@/app/actions/customers";
import { CustomerListClient } from "@/components/CustomerListClient";

export const metadata: Metadata = {
  title: "Customers — Rajveer Ledger",
  description: "Customer Ledgers Directory",
};

interface PageProps {
  searchParams: Promise<{ action?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const customers = await getCustomersAction();

  return (
    <div>
      <CustomerListClient
        initialCustomers={customers}
        openNewDialog={resolved?.action === "new"}
      />
    </div>
  );
}
