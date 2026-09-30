"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { Bill } from "@/lib/types";

const billSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  bill_date: z.string().min(1, "Date is required"),
  item: z.string().min(1, "Item description is required").trim(),
  gold_weight: z.number().min(0, "Gold weight cannot be negative").default(0),
  amount: z.number().min(0, "Amount cannot be negative").default(0),
  note: z.string().optional().nullable(),
});

/**
 * Fetch bills for a customer with optional date range filter
 */
export async function getBillsByCustomerAction(
  customerId: string,
  dateRange?: { from?: string; to?: string }
): Promise<Bill[]> {
  await requireOwner();
  const db = getDb();

  let query = db
    .from("bills")
    .select("*")
    .eq("customer_id", customerId)
    .order("bill_date", { ascending: false })
    .order("bill_no", { ascending: false });

  if (dateRange?.from) {
    query = query.gte("bill_date", dateRange.from);
  }
  if (dateRange?.to) {
    query = query.lte("bill_date", dateRange.to);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching bills:", error);
    return [];
  }
  return data || [];
}

/**
 * Get distinct previously used item names for autosuggest
 */
export async function getUniqueItemNamesAction(): Promise<string[]> {
  await requireOwner();
  const db = getDb();

  const { data, error } = await db
    .from("bills")
    .select("item")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const unique = Array.from(new Set(data.map((b) => b.item.trim()).filter(Boolean)));
  return unique.slice(0, 20);
}

/**
 * Create a new bill (bill_no is automatically assigned by Postgres sequence)
 */
export async function createBillAction(data: {
  customer_id: string;
  bill_date?: string;
  item: string;
  gold_weight?: number;
  amount?: number;
  note?: string | null;
}) {
  await requireOwner();

  const parsed = billSchema.safeParse({
    customer_id: data.customer_id,
    bill_date: data.bill_date || new Date().toISOString().split("T")[0],
    item: data.item,
    gold_weight: Number(data.gold_weight) || 0,
    amount: Number(data.amount) || 0,
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
    .from("bills")
    .insert({
      customer_id: parsed.data.customer_id,
      bill_date: parsed.data.bill_date,
      item: parsed.data.item,
      gold_weight: parsed.data.gold_weight,
      amount: parsed.data.amount,
      note: parsed.data.note,
    })
    .select()
    .single();

  if (error || !created) {
    console.error("Create bill error:", error);
    return { success: false, error: error?.message || "Failed to create bill" };
  }

  revalidatePath(`/customers/${data.customer_id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true, bill: created };
}

/**
 * Update an existing bill (bill_no remains unchanged)
 */
export async function updateBillAction(
  id: string,
  customerId: string,
  data: {
    bill_date: string;
    item: string;
    gold_weight: number;
    amount: number;
    note?: string | null;
  }
) {
  await requireOwner();

  const parsed = billSchema.safeParse({
    customer_id: customerId,
    bill_date: data.bill_date,
    item: data.item,
    gold_weight: Number(data.gold_weight) || 0,
    amount: Number(data.amount) || 0,
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
    .from("bills")
    .update({
      bill_date: parsed.data.bill_date,
      item: parsed.data.item,
      gold_weight: parsed.data.gold_weight,
      amount: parsed.data.amount,
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
 * Delete a bill
 */
export async function deleteBillAction(id: string, customerId: string) {
  await requireOwner();
  const db = getDb();

  const { error } = await db
    .from("bills")
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
