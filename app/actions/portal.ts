"use server";

import { getDb } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import { Customer, Bill, Receipt, CustomerBalance, Settings } from "@/lib/types";

export interface PortalData {
  customer: Customer & CustomerBalance;
  bills: Bill[];
  receipts: Receipt[];
  settings: Settings | null;
  isDirectLink?: boolean;
}

/**
 * Fetch customer's own ledger data strictly scoped by session customerId
 */
export async function getCustomerPortalDataAction(): Promise<PortalData> {
  const session = await requireCustomer();
  const db = getDb();
  const customerId = session.customerId;

  const [customerRes, balanceRes, billsRes, receiptsRes, settingsRes] = await Promise.all([
    db.from("customers").select("*").eq("id", customerId).single(),
    db.from("customer_balances").select("*").eq("customer_id", customerId).maybeSingle(),
    db.from("bills").select("*").eq("customer_id", customerId).order("bill_date", { ascending: false }).order("bill_no", { ascending: false }),
    db.from("receipts").select("*").eq("customer_id", customerId).order("receipt_date", { ascending: false }),
    db.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (customerRes.error || !customerRes.data) {
    throw new Error("Customer profile not found");
  }

  const customer = customerRes.data;
  const balance = balanceRes.data || {
    customer_id: customerId,
    billed_gold: 0,
    billed_amount: 0,
    received_gold: 0,
    received_cash: 0,
    pending_gold: 0,
    pending_amount: 0,
    bill_count: 0,
  };

  return {
    customer: {
      ...customer,
      billed_gold: Number(balance.billed_gold) || 0,
      billed_amount: Number(balance.billed_amount) || 0,
      received_gold: Number(balance.received_gold) || 0,
      received_cash: Number(balance.received_cash) || 0,
      pending_gold: Number(balance.pending_gold) || 0,
      pending_amount: Number(balance.pending_amount) || 0,
      bill_count: Number(balance.bill_count) || 0,
    },
    bills: billsRes.data || [],
    receipts: receiptsRes.data || [],
    settings: settingsRes.data || null,
    isDirectLink: session.isDirectLink,
  };
}
