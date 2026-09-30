import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { generateCustomerPdfStatement } from "@/lib/pdf";
import { CustomerWithBalance, Bill, Receipt } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  let targetCustomerId: string;
  if (session.role === "customer") {
    // Strictly force customer's own ID
    targetCustomerId = session.customerId;
  } else if (session.role === "owner") {
    const queryCustId = searchParams.get("customerId");
    if (!queryCustId) {
      return new NextResponse("Customer ID is required for owner PDF export", { status: 400 });
    }
    targetCustomerId = queryCustId;
  } else {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();

  const [customerRes, balanceRes, billsRes, receiptsRes, settingsRes] = await Promise.all([
    db.from("customers").select("*").eq("id", targetCustomerId).single(),
    db.from("customer_balances").select("*").eq("customer_id", targetCustomerId).maybeSingle(),
    db.from("bills").select("*").eq("customer_id", targetCustomerId).order("bill_date", { ascending: true }),
    db.from("receipts").select("*").eq("customer_id", targetCustomerId).order("receipt_date", { ascending: true }),
    db.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (customerRes.error || !customerRes.data) {
    return new NextResponse("Customer not found", { status: 404 });
  }

  const customer = customerRes.data;
  const balance = balanceRes.data;

  const customerWithBalance: CustomerWithBalance = {
    ...customer,
    billed_gold: Number(balance?.billed_gold || 0),
    billed_amount: Number(balance?.billed_amount || 0),
    received_gold: Number(balance?.received_gold || 0),
    received_cash: Number(balance?.received_cash || 0),
    pending_gold: Number(balance?.pending_gold || 0),
    pending_amount: Number(balance?.pending_amount || 0),
    bill_count: Number(balance?.bill_count || 0),
  };

  const bills = billsRes.data || [];
  const receipts = receiptsRes.data || [];
  const settings = settingsRes.data || null;

  const pdfBytes = generateCustomerPdfStatement({
    customer: customerWithBalance,
    bills,
    receipts,
    settings,
    periodLabel: "All Time Statement",
  });

  const cleanName = customer.name.replace(/\s+/g, "_");
  const fileName = `Rajveer_Statement_${cleanName}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
