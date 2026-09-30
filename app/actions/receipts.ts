"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { Receipt } from "@/lib/types";

const receiptSchema = z
  .object({
    customer_id: z.string().uuid("Invalid customer ID"),
    receipt_date: z.string().min(1, "Date is required"),
    gold_weight: z.number().min(0, "Gold weight cannot be negative").default(0),
    cash_amount: z.number().min(0, "Cash amount cannot be negative").default(0),
    note: z.string().optional().nullable(),
  })
  .refine(
    (data) => (Number(data.gold_weight) || 0) > 0 || (Number(data.cash_amount) || 0) > 0,
    {
      message: "At least one of Gold Weight or Cash Amount must be greater than zero",
      path: ["cash_amount"],
    }
  );

/**
 * Fetch receipts for a customer with optional date range filter
 */
export async function getReceiptsByCustomerAction(
  customerId: string,
  dateRange?: { from?: string; to?: string }
): Promise<Receipt[]> {
  await requireOwner();
  const db = getDb();

  let query = db
    .from("receipts")
    .select("*")
    .eq("customer_id", customerId)
    .order("receipt_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (dateRange?.from) {
    query = query.gte("receipt_date", dateRange.from);
  }
  if (dateRange?.to) {
    query = query.lte("receipt_date", dateRange.to);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }
  return data || [];
}

/**
 * Create a new receipt
 */
export async function createReceiptAction(data: {
  customer_id: string;
  receipt_date?: string;
  gold_weight?: number;
  cash_amount?: number;
  note?: string | null;
}) {
  await requireOwner();

  const parsed = receiptSchema.safeParse({
    customer_id: data.customer_id,
    receipt_date: data.receipt_date || new Date().toISOString().split("T")[0],
    gold_weight: Number(data.gold_weight) || 0,
    cash_amount: Number(data.cash_amount) || 0,
    note: data.note || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const db = getDb();
  const { data: created, error } = await db
    .from("receipts")
    .insert({
      customer_id: parsed.data.customer_id,
      receipt_date: parsed.data.receipt_date,
      gold_weight: parsed.data.gold_weight,
      cash_amount: parsed.data.cash_amount,
      note: parsed.data.note,
    })
    .select()
    .single();

  if (error || !created) {
    console.error("Create receipt error:", error);
    return { success: false, error: error?.message || "Failed to create receipt" };
  }

  revalidatePath(`/customers/${data.customer_id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true, receipt: created };
}

/**
 * Update an existing receipt
 */
export async function updateReceiptAction(
  id: string,
  customerId: string,
  data: {
    receipt_date: string;
    gold_weight: number;
    cash_amount: number;
    note?: string | null;
  }
) {
  await requireOwner();

  const parsed = receiptSchema.safeParse({
    customer_id: customerId,
    receipt_date: data.receipt_date,
    gold_weight: Number(data.gold_weight) || 0,
    cash_amount: Number(data.cash_amount) || 0,
    note: data.note || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const db = getDb();
  const { error } = await db
    .from("receipts")
    .update({
      receipt_date: parsed.data.receipt_date,
      gold_weight: parsed.data.gold_weight,
      cash_amount: parsed.data.cash_amount,
      note: parsed.data.note,
    })
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Delete a receipt
 */
export async function deleteReceiptAction(id: string, customerId: string) {
  await requireOwner();
  const db = getDb();

  const { error } = await db
    .from("receipts")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}
