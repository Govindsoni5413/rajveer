"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { CustomerWithBalance } from "@/lib/types";

function generateLinkToken(): string {
  return crypto.randomBytes(18).toString("base64url"); // 24 URL-safe chars
}

const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_]+$/, "Username must be lowercase letters, numbers, or underscore only (no spaces)")
    .trim()
    .toLowerCase(),
  phone: z.string().optional().nullable(),
  access_mode: z.enum(["pin", "link"]),
  pin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Fetch all customers with their computed balances and activity date
 */
export async function getCustomersAction(): Promise<CustomerWithBalance[]> {
  await requireOwner();
  const db = getDb();

  // Query customers and balances view separately to avoid view relation issues in PostgREST
  const [customersRes, balancesRes, billsRes, receiptsRes] = await Promise.all([
    db.from("customers").select("*").order("created_at", { ascending: false }),
    db.from("customer_balances").select("*"),
    db.from("bills").select("customer_id, bill_date").order("bill_date", { ascending: false }),
    db.from("receipts").select("customer_id, receipt_date").order("receipt_date", { ascending: false }),
  ]);

  if (customersRes.error) {
    console.error("Error fetching customers:", customersRes.error);
    return [];
  }

  const balanceMap = new Map<string, any>();
  if (balancesRes.data) {
    for (const b of balancesRes.data) {
      balanceMap.set(b.customer_id, b);
    }
  }

  const latestActivityMap = new Map<string, string>();

  if (billsRes.data) {
    for (const b of billsRes.data) {
      const cur = latestActivityMap.get(b.customer_id);
      if (!cur || new Date(b.bill_date) > new Date(cur)) {
        latestActivityMap.set(b.customer_id, b.bill_date);
      }
    }
  }

  if (receiptsRes.data) {
    for (const r of receiptsRes.data) {
      const cur = latestActivityMap.get(r.customer_id);
      if (!cur || new Date(r.receipt_date) > new Date(cur)) {
        latestActivityMap.set(r.customer_id, r.receipt_date);
      }
    }
  }

  return (customersRes.data || []).map((c) => {
    const bal = balanceMap.get(c.id);
    return {
      ...c,
      billed_gold: Number(bal?.billed_gold || 0),
      billed_amount: Number(bal?.billed_amount || 0),
      received_gold: Number(bal?.received_gold || 0),
      received_cash: Number(bal?.received_cash || 0),
      pending_gold: Number(bal?.pending_gold || 0),
      pending_amount: Number(bal?.pending_amount || 0),
      bill_count: Number(bal?.bill_count || 0),
      last_activity_date: latestActivityMap.get(c.id) || c.created_at,
    };
  });
}

/**
 * Fetch a single customer with details and balances
 */
export async function getCustomerByIdAction(id: string): Promise<CustomerWithBalance | null> {
  await requireOwner();
  const db = getDb();

  const [customerRes, balanceRes] = await Promise.all([
    db.from("customers").select("*").eq("id", id).maybeSingle(),
    db.from("customer_balances").select("*").eq("customer_id", id).maybeSingle(),
  ]);

  if (customerRes.error || !customerRes.data) {
    return null;
  }

  const customer = customerRes.data;
  const bal = balanceRes.data;

  return {
    ...customer,
    billed_gold: Number(bal?.billed_gold || 0),
    billed_amount: Number(bal?.billed_amount || 0),
    received_gold: Number(bal?.received_gold || 0),
    received_cash: Number(bal?.received_cash || 0),
    pending_gold: Number(bal?.pending_gold || 0),
    pending_amount: Number(bal?.pending_amount || 0),
    bill_count: Number(bal?.bill_count || 0),
  };
}

/**
 * Create a new customer
 */
export async function createCustomerAction(data: {
  name: string;
  username: string;
  phone?: string | null;
  access_mode: "pin" | "link";
  pin?: string | null;
  notes?: string | null;
}) {
  await requireOwner();
  const parsed = createCustomerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const { name, username, phone, access_mode, pin, notes } = parsed.data;

  if (access_mode === "pin") {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { success: false, error: "4-digit PIN is required for PIN mode" };
    }
  }

  const db = getDb();

  // Check username uniqueness
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Username '${username}' is already taken. Please choose another.` };
  }

  const linkToken = generateLinkToken();
  let pinHash = null;
  if (access_mode === "pin" && pin) {
    pinHash = await bcrypt.hash(pin, 10);
  }

  const { data: created, error } = await db
    .from("customers")
    .insert({
      name,
      username,
      phone: phone || null,
      access_mode,
      pin_hash: pinHash,
      link_token: linkToken,
      notes: notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error || !created) {
    console.error("Create customer error:", error);
    return { success: false, error: error?.message || "Failed to create customer" };
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");

  return {
    success: true,
    customer: created,
    plainPin: access_mode === "pin" ? pin : null,
    linkToken,
  };
}

/**
 * Update basic customer details
 */
export async function updateCustomerAction(
  id: string,
  data: {
    name: string;
    phone?: string | null;
    notes?: string | null;
    is_active?: boolean;
  }
) {
  await requireOwner();
  const db = getDb();

  const { error } = await db
    .from("customers")
    .update({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      is_active: data.is_active ?? true,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Switch customer access mode
 */
export async function switchCustomerAccessModeAction(
  id: string,
  newMode: "pin" | "link",
  newPin?: string
) {
  await requireOwner();
  const db = getDb();

  const updatePayload: Record<string, any> = {
    access_mode: newMode,
  };

  if (newMode === "pin") {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { success: false, error: "A valid 4-digit PIN is required when enabling PIN mode" };
    }
    updatePayload.pin_hash = await bcrypt.hash(newPin, 10);
  }

  const { error } = await db.from("customers").update(updatePayload).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { success: true };
}

/**
 * Reset customer PIN
 */
export async function resetCustomerPinAction(id: string, newPin: string) {
  await requireOwner();
  if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    return { success: false, error: "PIN must be exactly 4 digits" };
  }

  const db = getDb();
  const pinHash = await bcrypt.hash(newPin, 10);

  const { error } = await db
    .from("customers")
    .update({
      pin_hash: pinHash,
      access_mode: "pin",
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/customers/${id}`);
  return { success: true };
}

/**
 * Regenerate customer direct link
 */
export async function regenerateCustomerLinkAction(id: string) {
  await requireOwner();
  const db = getDb();
  const newLinkToken = generateLinkToken();

  const { error } = await db
    .from("customers")
    .update({ link_token: newLinkToken })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/customers/${id}`);
  return { success: true, linkToken: newLinkToken };
}

/**
 * Toggle customer active status
 */
export async function toggleCustomerActiveAction(id: string, currentStatus: boolean) {
  await requireOwner();
  const db = getDb();

  const { error } = await db
    .from("customers")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { success: true };
}

/**
 * Delete customer (Cascade deletes all bills and receipts)
 */
export async function deleteCustomerAction(id: string, confirmationName: string) {
  await requireOwner();
  const db = getDb();

  // Verify customer name matches confirmation
  const { data: customer, error: fetchErr } = await db
    .from("customers")
    .select("name")
    .eq("id", id)
    .single();

  if (fetchErr || !customer) {
    return { success: false, error: "Customer not found" };
  }

  if (customer.name.trim().toLowerCase() !== confirmationName.trim().toLowerCase()) {
    return {
      success: false,
      error: "Confirmation name does not match customer's exact name.",
    };
  }

  const { error } = await db.from("customers").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}
