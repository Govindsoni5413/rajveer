import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { format } from "date-fns";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { generateFullBackupWorkbook, generateExportWorkbook, sanitizeSheetName } from "@/lib/excel";
import { CustomerWithBalance, Bill, Receipt } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  try {
    // 1. Fetch all Customers and Balances separately
    const [custRes, balRes] = await Promise.all([
      db.from("customers").select("*").order("name", { ascending: true }),
      db.from("customer_balances").select("*"),
    ]);

    if (custRes.error) {
      throw new Error(`Failed to fetch customers: ${custRes.error.message}`);
    }

    const balanceMap = new Map<string, any>();
    for (const b of balRes.data || []) {
      balanceMap.set(b.customer_id, b);
    }

    const customers: CustomerWithBalance[] = (custRes.data || []).map((c) => {
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

    const custMap = new Map<string, { name: string; username: string }>();
    for (const c of customers) {
      custMap.set(c.id, { name: c.name, username: c.username });
    }

    // 2. Fetch all Bills
    const { data: rawBills, error: billsErr } = await db
      .from("bills")
      .select("*")
      .order("bill_date", { ascending: true })
      .order("bill_no", { ascending: true });

    if (billsErr) {
      throw new Error(`Failed to fetch bills: ${billsErr.message}`);
    }

    const allBills = (rawBills || []).map((b) => ({
      ...b,
      customer_name: custMap.get(b.customer_id)?.name || "Unknown",
      username: custMap.get(b.customer_id)?.username || "unknown",
    }));

    // 3. Fetch all Receipts
    const { data: rawReceipts, error: recsErr } = await db
      .from("receipts")
      .select("*")
      .order("receipt_date", { ascending: true });

    if (recsErr) {
      throw new Error(`Failed to fetch receipts: ${recsErr.message}`);
    }

    const allReceipts = (rawReceipts || []).map((r) => ({
      ...r,
      customer_name: custMap.get(r.customer_id)?.name || "Unknown",
      username: custMap.get(r.customer_id)?.username || "unknown",
    }));

    // 4. Initialize JSZip
    const zip = new JSZip();

    // 4a. Build Rajveer_All_Data.xlsx
    const allDataWb = await generateFullBackupWorkbook({
      customers,
      allBills,
      allReceipts,
      todayStr,
    });
    const allDataBuffer = await allDataWb.xlsx.writeBuffer();
    zip.file("Rajveer_All_Data.xlsx", allDataBuffer);

    // 4b. Build Customers/ folder with one separate .xlsx file per customer
    const customersFolder = zip.folder("Customers");
    if (customersFolder) {
      const billsByCust = new Map<string, Bill[]>();
      for (const b of allBills) {
        if (!billsByCust.has(b.customer_id)) billsByCust.set(b.customer_id, []);
        billsByCust.get(b.customer_id)!.push(b);
      }

      const recsByCust = new Map<string, Receipt[]>();
      for (const r of allReceipts) {
        if (!recsByCust.has(r.customer_id)) recsByCust.set(r.customer_id, []);
        recsByCust.get(r.customer_id)!.push(r);
      }

      for (const c of customers) {
        const singleWb = await generateExportWorkbook({
          customers: [c],
          billsByCustomer: billsByCust,
          receiptsByCustomer: recsByCust,
          periodLabel: `All Time (as of ${todayStr})`,
        });

        const singleBuffer = await singleWb.xlsx.writeBuffer();
        const safeCustName = c.name.replace(/[\\/:*?"<>|]/g, "_").trim();
        customersFolder.file(`${safeCustName}.xlsx`, singleBuffer);
      }
    }

    // 5. Generate ZIP buffer
    const zipContent = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // 6. Update backup state in settings
    await db
      .from("settings")
      .update({
        last_backup_at: new Date().toISOString(),
        backup_snoozed_until: null,
      })
      .eq("id", 1);

    const zipFilename = `Rajveer_Backup_${todayStr}.zip`;

    return new NextResponse(new Uint8Array(zipContent), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (err: any) {
    console.error("Backup export error:", err);
    return new NextResponse(`Backup failed: ${err.message}`, { status: 500 });
  }
}
