"use server";

import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
  subDays,
} from "date-fns";
import { getDb } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { getBackupStatus } from "@/lib/backup";
import { TransactionActivity } from "@/lib/types";

export type PeriodFilter = "this_month" | "last_month" | "this_year" | "all_time" | "custom";

export interface DashboardData {
  stats: {
    revenue: number; // received cash
    totalBilled: number;
    pendingAmount: number;
    billCount: number;
    billedGold: number;
    receivedGold: number;
    pendingGold: number;
    totalCustomers: number;
    activeCustomers: number;
  };
  recentActivity: TransactionActivity[];
  topPendingCustomers: Array<{
    id: string;
    name: string;
    username: string;
    pending_amount: number;
    pending_gold: number;
  }>;
  monthlyChartData: Array<{
    month: string;
    billed: number;
    received: number;
  }>;
  backupStatus: {
    isDue: boolean;
    lastBackupDate: string | null;
    nextDueDate: string;
    intervalMonths: number;
  };
}

export async function getDashboardDataAction(
  period: PeriodFilter = "this_month",
  customRange?: { from?: string; to?: string }
): Promise<DashboardData> {
  await requireOwner();
  const db = getDb();
  const now = new Date();

  let fromDate: string | null = null;
  let toDate: string | null = null;

  if (period === "this_month") {
    fromDate = format(startOfMonth(now), "yyyy-MM-dd");
    toDate = format(endOfMonth(now), "yyyy-MM-dd");
  } else if (period === "last_month") {
    const lastM = subMonths(now, 1);
    fromDate = format(startOfMonth(lastM), "yyyy-MM-dd");
    toDate = format(endOfMonth(lastM), "yyyy-MM-dd");
  } else if (period === "this_year") {
    fromDate = format(startOfYear(now), "yyyy-MM-dd");
    toDate = format(endOfYear(now), "yyyy-MM-dd");
  } else if (period === "custom" && customRange?.from && customRange?.to) {
    fromDate = customRange.from;
    toDate = customRange.to;
  }

  // 1. Fetch bills within period (or all)
  let billsQuery = db.from("bills").select("id, bill_no, customer_id, bill_date, item, gold_weight, amount, note, created_at");
  if (fromDate) billsQuery = billsQuery.gte("bill_date", fromDate);
  if (toDate) billsQuery = billsQuery.lte("bill_date", toDate);

  // 2. Fetch receipts within period (or all)
  let receiptsQuery = db.from("receipts").select("id, customer_id, receipt_date, gold_weight, cash_amount, note, created_at");
  if (fromDate) receiptsQuery = receiptsQuery.gte("receipt_date", fromDate);
  if (toDate) receiptsQuery = receiptsQuery.lte("receipt_date", toDate);

  // 3. Customers and customer balances
  const [
    billsRes,
    receiptsRes,
    customersRes,
    balancesRes,
    backupStatus,
  ] = await Promise.all([
    billsQuery,
    receiptsQuery,
    db.from("customers").select("id, name, username, is_active"),
    db.from("customer_balances").select("*"),
    getBackupStatus(),
  ]);

  const bills = billsRes.data || [];
  const receipts = receiptsRes.data || [];
  const customers = customersRes.data || [];
  const balances = balancesRes.data || [];

  const customerMap = new Map<string, { name: string; username: string }>();
  for (const c of customers) {
    customerMap.set(c.id, { name: c.name, username: c.username });
  }

  // Aggregate stats
  let totalBilled = 0;
  let billedGold = 0;
  for (const b of bills) {
    totalBilled += Number(b.amount) || 0;
    billedGold += Number(b.gold_weight) || 0;
  }

  let revenue = 0; // cash received
  let receivedGold = 0;
  for (const r of receipts) {
    revenue += Number(r.cash_amount) || 0;
    receivedGold += Number(r.gold_weight) || 0;
  }

  const pendingAmount = totalBilled - revenue;
  const pendingGold = billedGold - receivedGold;

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active).length;

  // Recent activity: combine latest 10 bills & receipts across all customers
  const billActivities: TransactionActivity[] = bills.map((b) => ({
    id: b.id,
    type: "bill",
    date: b.bill_date,
    customer_id: b.customer_id,
    customer_name: customerMap.get(b.customer_id)?.name || "Customer",
    bill_no: b.bill_no,
    item: b.item,
    gold_weight: Number(b.gold_weight) || 0,
    amount: Number(b.amount) || 0,
    note: b.note,
    created_at: b.created_at,
  }));

  const receiptActivities: TransactionActivity[] = receipts.map((r) => ({
    id: r.id,
    type: "receipt",
    date: r.receipt_date,
    customer_id: r.customer_id,
    customer_name: customerMap.get(r.customer_id)?.name || "Customer",
    gold_weight: Number(r.gold_weight) || 0,
    amount: 0,
    cash_amount: Number(r.cash_amount) || 0,
    note: r.note,
    created_at: r.created_at,
  }));

  const allActivities = [...billActivities, ...receiptActivities].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const recentActivity = allActivities.slice(0, 8);

  // Top pending customers (from balances view)
  const topPendingCustomers = balances
    .map((b) => {
      const cust = customerMap.get(b.customer_id);
      return {
        id: b.customer_id,
        name: cust?.name || "Customer",
        username: cust?.username || "",
        pending_amount: Number(b.pending_amount) || 0,
        pending_gold: Number(b.pending_gold) || 0,
      };
    })
    .filter((c) => c.pending_amount > 0)
    .sort((a, b) => b.pending_amount - a.pending_amount)
    .slice(0, 5);

  // Monthly billed vs received for last 6 months
  const monthlyChartData: Array<{ month: string; billed: number; received: number }> = [];
  const sixMonthsAgo = subMonths(startOfMonth(now), 5);
  const sixMonthsAgoStr = format(sixMonthsAgo, "yyyy-MM-dd");

  const [allBillsRecent, allReceiptsRecent] = await Promise.all([
    db.from("bills").select("bill_date, amount").gte("bill_date", sixMonthsAgoStr),
    db.from("receipts").select("receipt_date, cash_amount").gte("receipt_date", sixMonthsAgoStr),
  ]);

  const monthBuckets = new Map<string, { billed: number; received: number }>();
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i);
    const key = format(m, "MMM yyyy");
    monthBuckets.set(key, { billed: 0, received: 0 });
  }

  if (allBillsRecent.data) {
    for (const b of allBillsRecent.data) {
      const key = format(new Date(b.bill_date), "MMM yyyy");
      if (monthBuckets.has(key)) {
        monthBuckets.get(key)!.billed += Number(b.amount) || 0;
      }
    }
  }

  if (allReceiptsRecent.data) {
    for (const r of allReceiptsRecent.data) {
      const key = format(new Date(r.receipt_date), "MMM yyyy");
      if (monthBuckets.has(key)) {
        monthBuckets.get(key)!.received += Number(r.cash_amount) || 0;
      }
    }
  }

  monthBuckets.forEach((val, key) => {
    monthlyChartData.push({
      month: key,
      billed: Math.round(val.billed),
      received: Math.round(val.received),
    });
  });

  return {
    stats: {
      revenue,
      totalBilled,
      pendingAmount,
      billCount: bills.length,
      billedGold,
      receivedGold,
      pendingGold,
      totalCustomers,
      activeCustomers,
    },
    recentActivity,
    topPendingCustomers,
    monthlyChartData,
    backupStatus: {
      isDue: backupStatus.isDue,
      lastBackupDate: backupStatus.lastBackupDate,
      nextDueDate: backupStatus.nextDueDate,
      intervalMonths: backupStatus.intervalMonths,
    },
  };
}
