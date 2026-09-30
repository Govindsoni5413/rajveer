import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerByIdAction } from "@/app/actions/customers";
import { getBillsByCustomerAction, getUniqueItemNamesAction } from "@/app/actions/bills";
import { getReceiptsByCustomerAction } from "@/app/actions/receipts";
import { CustomerDetailClient } from "@/components/customer-detail/CustomerDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerByIdAction(id);
  if (!customer) {
    return { title: "Customer Not Found — Rajveer" };
  }
  return {
    title: `${customer.name} — Customer Ledger | Rajveer`,
    description: `Ledger details and balances for ${customer.name}`,
  };
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getCustomerByIdAction(id);

  if (!customer) {
    notFound();
  }

  const [bills, receipts, suggestedItems] = await Promise.all([
    getBillsByCustomerAction(id),
    getReceiptsByCustomerAction(id),
    getUniqueItemNamesAction(),
  ]);

  return (
    <div>
      <CustomerDetailClient
        customer={customer}
        initialBills={bills}
        initialReceipts={receipts}
        suggestedItems={suggestedItems}
      />
    </div>
  );
}
