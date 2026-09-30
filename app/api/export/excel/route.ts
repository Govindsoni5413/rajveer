import { NextRequest, NextResponse } from "next/server";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { generateExportWorkbook } from "@/lib/excel";
import { CustomerWithBalance, Bill, Receipt } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const period = searchParams.get("period") || "all";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const monthParam = searchParams.get("month"); // 1 - 12
  const yearParam = searchParams.get("year");

  const db = getDb();
  const now = new Date();

  let fromDate: string | null = null;
  let toDate: string | null = null;
  let periodLabel = "All Time";

  if (period === "this_year") {
    fromDate = format(startOfYear(now), "yyyy-MM-dd");
    toDate = format(endOfYear(now), "yyyy-MM-dd");
    periodLabel = `Year ${now.getFullYear()}`;
  } else if (period === "month" && monthParam && yearParam) {
    const targetDate = new Date(parseInt(yearParam, 10), parseInt(monthParam, 10) - 1, 1);
    fromDate = format(startOfMonth(targetDate), "yyyy-MM-dd");
    toDate = format(endOfMonth(targetDate), "yyyy-MM-dd");
    periodLabel = format(targetDate, "MMMM yyyy");
  } else if (period === "year" && yearParam) {
    const y = parseInt(yearParam, 10);
    fromDate = `${y}-01-01`;
    toDate = `${y}-12-31`;
    periodLabel = `Year ${y}`;
  } else if (period === "custom" && fromParam && toParam) {
    fromDate = fromParam;
    toDate = toParam;
    periodLabel = `${fromParam} to ${toParam}`;
  }

  // Fetch Customers and Balances separately
  let custQuery = db.from("customers").select("*");
  let balQuery = db.from("customer_balances").select("*");

  if (customerId) {
    custQuery = custQuery.eq("id", customerId);
    balQuery = balQuery.eq("customer_id", customerId);
  } else {
    custQuery = custQuery.order("name", { ascending: true });
  }

  const [custRes, balRes] = await Promise.all([custQuery, balQuery]);

  if (custRes.error || !custRes.data || custRes.data.length === 0) {
    return new NextResponse("No customer records found", { status: 404 });
  }

  const balanceMap = new Map<string, any>();
  for (const b of balRes.data || []) {
    balanceMap.set(b.customer_id, b);
  }

  const customers: CustomerWithBalance[] = custRes.data.map((c) => {
    const b = balanceMap.get(c.id);
    return {
      ...c,
      billed_gold: Number(b?.billed_gold || 0),
      billed_amount: Number(b?.billed_amount || 0),
      received_gold: Number(b?.received_gold || 0),
      received_cash: Number(b?.received_cash || 0),
      pending_gold: Number(b?.pending_gold || 0),
      pending_amount: Number(b?.pending_amount || 0),
      bill_count: Number(b?.bill_count || 0),
    };
  });

  // Fetch Bills
  let billsQuery = db.from("bills").select("*").order("bill_date", { ascending: true });
  if (customerId) billsQuery = billsQuery.eq("customer_id", customerId);
  if (fromDate) billsQuery = billsQuery.gte("bill_date", fromDate);
  if (toDate) billsQuery = billsQuery.lte("bill_date", toDate);

  // Fetch Receipts
  let recsQuery = db.from("receipts").select("*").order("receipt_date", { ascending: true });
  if (customerId) recsQuery = recsQuery.eq("customer_id", customerId);
  if (fromDate) recsQuery = recsQuery.gte("receipt_date", fromDate);
  if (toDate) recsQuery = recsQuery.lte("receipt_date", toDate);

  const [billsRes, recsRes] = await Promise.all([billsQuery, recsQuery]);
  const bills = billsRes.data || [];
  const receipts = recsRes.data || [];

  const billsByCust = new Map<string, Bill[]>();
  for (const b of bills) {
    if (!billsByCust.has(b.customer_id)) billsByCust.set(b.customer_id, []);
    billsByCust.get(b.customer_id)!.push(b);
  }

  const recsByCust = new Map<string, Receipt[]>();
  for (const r of receipts) {
    if (!recsByCust.has(r.customer_id)) recsByCust.set(r.customer_id, []);
    recsByCust.get(r.customer_id)!.push(r);
  }

  const workbook = await generateExportWorkbook({
    customers,
    billsByCustomer: billsByCust,
    receiptsByCustomer: recsByCust,
    periodLabel,
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const customerPart = customerId && customers.length === 1 ? customers[0].name.replace(/\s+/g, "_") : "All";
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Rajveer_${customerPart}_${cleanPeriod}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
