import ExcelJS from "exceljs";
import { format } from "date-fns";
import { CustomerWithBalance, Bill, Receipt } from "./types";

/**
 * Sanitize Excel sheet name:
 * Max 31 characters, cannot contain : \ / ? * [ ]
 */
export function sanitizeSheetName(name: string): string {
  const sanitized = name.replace(/[:\\/?*\[\]]/g, "_").trim();
  return (sanitized.substring(0, 31) || "Sheet").trim();
}

const RUPEE_FORMAT = '"₹"#,##,##0.00;[Red]-"₹"#,##,##0.00;"₹"0.00';
const GOLD_FORMAT = '#,##0.00" g"';
const DATE_FORMAT = 'DD-MMM-YYYY';

/**
 * Apply auto-column widths to an Excel worksheet
 */
function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLength) {
        maxLength = Math.min(45, valStr.length);
      }
    });
    column.width = maxLength + 3;
  });
}

/**
 * Generate Excel workbook for one or all customers
 */
export async function generateExportWorkbook({
  customers,
  billsByCustomer,
  receiptsByCustomer,
  periodLabel,
}: {
  customers: CustomerWithBalance[];
  billsByCustomer: Map<string, Bill[]>;
  receiptsByCustomer: Map<string, Receipt[]>;
  periodLabel: string;
}): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rajveer Ledger";
  wb.created = new Date();

  // 1. Summary Sheet (always Sheet 1)
  const summarySheet = wb.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  // Title Row
  summarySheet.mergeCells("A1:G1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `RAJVEER — Ledger Summary (${periodLabel})`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summarySheet.getRow(1).height = 28;

  // Header Row
  const headerRow = summarySheet.addRow([
    "Customer Name",
    "Billed Gold (g)",
    "Billed Amount (₹)",
    "Received Gold (g)",
    "Received Cash (₹)",
    "Pending Gold (g)",
    "Pending Amount (₹)",
  ]);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF222222" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF444444" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
    };
  });

  let grandBilledGold = 0;
  let grandBilledAmount = 0;
  let grandReceivedGold = 0;
  let grandReceivedCash = 0;

  for (const c of customers) {
    const cBills = billsByCustomer.get(c.id) || [];
    const cReceipts = receiptsByCustomer.get(c.id) || [];

    const bGold = cBills.reduce((acc, b) => acc + (Number(b.gold_weight) || 0), 0);
    const bAmt = cBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const rGold = cReceipts.reduce((acc, r) => acc + (Number(r.gold_weight) || 0), 0);
    const rCash = cReceipts.reduce((acc, r) => acc + (Number(r.cash_amount) || 0), 0);

    const pGold = bGold - rGold;
    const pAmt = bAmt - rCash;

    grandBilledGold += bGold;
    grandBilledAmount += bAmt;
    grandReceivedGold += rGold;
    grandReceivedCash += rCash;

    const row = summarySheet.addRow([c.name, bGold, bAmt, rGold, rCash, pGold, pAmt]);
    row.height = 20;

    // Formatting
    row.getCell(2).numFmt = GOLD_FORMAT;
    row.getCell(3).numFmt = RUPEE_FORMAT;
    row.getCell(4).numFmt = GOLD_FORMAT;
    row.getCell(5).numFmt = RUPEE_FORMAT;
    row.getCell(6).numFmt = GOLD_FORMAT;
    row.getCell(7).numFmt = RUPEE_FORMAT;

    row.getCell(1).alignment = { horizontal: "left" };
    row.getCell(2).alignment = { horizontal: "right" };
    row.getCell(3).alignment = { horizontal: "right" };
    row.getCell(4).alignment = { horizontal: "right" };
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(7).alignment = { horizontal: "right" };
  }

  // Grand Total Row (Gold Yellow Background)
  const grandPendingGold = grandBilledGold - grandReceivedGold;
  const grandPendingAmount = grandBilledAmount - grandReceivedCash;

  const totalRow = summarySheet.addRow([
    "GRAND TOTAL",
    grandBilledGold,
    grandBilledAmount,
    grandReceivedGold,
    grandReceivedCash,
    grandPendingGold,
    grandPendingAmount,
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0A0A0A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5B400" } };
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "double", color: { argb: "FF000000" } },
    };
  });
  totalRow.getCell(2).numFmt = GOLD_FORMAT;
  totalRow.getCell(3).numFmt = RUPEE_FORMAT;
  totalRow.getCell(4).numFmt = GOLD_FORMAT;
  totalRow.getCell(5).numFmt = RUPEE_FORMAT;
  totalRow.getCell(6).numFmt = GOLD_FORMAT;
  totalRow.getCell(7).numFmt = RUPEE_FORMAT;

  autoFitColumns(summarySheet);

  // 2. Individual Sheets per Customer
  const usedSheetNames = new Set<string>(["Summary"]);

  for (const c of customers) {
    let sheetName = sanitizeSheetName(c.name);
    let counter = 1;
    while (usedSheetNames.has(sheetName)) {
      sheetName = sanitizeSheetName(`${c.name}_${counter++}`);
    }
    usedSheetNames.add(sheetName);

    const custSheet = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 5 }],
    });

    const cBills = billsByCustomer.get(c.id) || [];
    const cReceipts = receiptsByCustomer.get(c.id) || [];

    const bGold = cBills.reduce((acc, b) => acc + (Number(b.gold_weight) || 0), 0);
    const bAmt = cBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const rGold = cReceipts.reduce((acc, r) => acc + (Number(r.gold_weight) || 0), 0);
    const rCash = cReceipts.reduce((acc, r) => acc + (Number(r.cash_amount) || 0), 0);

    const pGold = bGold - rGold;
    const pAmt = bAmt - rCash;

    // Header block
    custSheet.mergeCells("A1:E1");
    const h1 = custSheet.getCell("A1");
    h1.value = `CUSTOMER: ${c.name.toUpperCase()} (@${c.username})`;
    h1.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
    h1.alignment = { horizontal: "center", vertical: "middle" };
    custSheet.getRow(1).height = 28;

    custSheet.mergeCells("A2:E2");
    const h2 = custSheet.getCell("A2");
    h2.value = `Period: ${periodLabel} | Phone: ${c.phone || "N/A"}`;
    h2.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF666666" } };
    h2.alignment = { horizontal: "center", vertical: "middle" };

    // Balance Block
    custSheet.addRow([]);
    const balHeader = custSheet.addRow([
      "STATUS",
      "BILLED",
      "RECEIVED",
      pAmt < 0 ? "ADVANCE (CASH)" : "PENDING (CASH)",
      pGold < 0 ? "ADVANCE (GOLD)" : "PENDING (GOLD)",
    ]);
    balHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF222222" } };
      cell.alignment = { horizontal: "center" };
    });

    const balRow = custSheet.addRow([
      "BALANCE",
      bAmt,
      rCash,
      Math.abs(pAmt),
      Math.abs(pGold),
    ]);
    balRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5B400" } };
    });
    balRow.getCell(2).numFmt = RUPEE_FORMAT;
    balRow.getCell(3).numFmt = RUPEE_FORMAT;
    balRow.getCell(4).numFmt = RUPEE_FORMAT;
    balRow.getCell(5).numFmt = GOLD_FORMAT;

    // Bills Section
    custSheet.addRow([]);
    custSheet.addRow(["WORK DONE (BILLS)"]).font = { bold: true, size: 11 };
    const billTableHead = custSheet.addRow(["Bill No.", "Date", "Item Description", "Gold (g)", "Amount (₹)"]);
    billTableHead.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
    });

    for (const b of cBills) {
      const bRow = custSheet.addRow([
        `#${String(b.bill_no).padStart(4, "0")}`,
        b.bill_date ? new Date(b.bill_date) : null,
        b.item + (b.note ? ` (${b.note})` : ""),
        Number(b.gold_weight) || 0,
        Number(b.amount) || 0,
      ]);
      bRow.getCell(2).numFmt = DATE_FORMAT;
      bRow.getCell(4).numFmt = GOLD_FORMAT;
      bRow.getCell(5).numFmt = RUPEE_FORMAT;
    }

    const billTotalRow = custSheet.addRow(["Total Bills", "", "", bGold, bAmt]);
    billTotalRow.font = { bold: true };
    billTotalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3C4" } };
    billTotalRow.getCell(4).numFmt = GOLD_FORMAT;
    billTotalRow.getCell(5).numFmt = RUPEE_FORMAT;

    // Receipts Section
    custSheet.addRow([]);
    custSheet.addRow(["PAYMENTS RECEIVED"]).font = { bold: true, size: 11 };
    const recTableHead = custSheet.addRow(["Date", "Gold (g)", "Cash (₹)", "Note / Reference", ""]);
    recTableHead.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
    });

    for (const r of cReceipts) {
      const rRow = custSheet.addRow([
        r.receipt_date ? new Date(r.receipt_date) : null,
        Number(r.gold_weight) || 0,
        Number(r.cash_amount) || 0,
        r.note || "-",
        "",
      ]);
      rRow.getCell(1).numFmt = DATE_FORMAT;
      rRow.getCell(2).numFmt = GOLD_FORMAT;
      rRow.getCell(3).numFmt = RUPEE_FORMAT;
    }

    const recTotalRow = custSheet.addRow(["Total Received", rGold, rCash, "", ""]);
    recTotalRow.font = { bold: true };
    recTotalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    recTotalRow.getCell(2).numFmt = GOLD_FORMAT;
    recTotalRow.getCell(3).numFmt = RUPEE_FORMAT;

    autoFitColumns(custSheet);
  }

  return wb;
}

/**
 * Generate full backup Excel workbook with Summary, Flat tables, Customers, and Customer sheets
 */
export async function generateFullBackupWorkbook({
  customers,
  allBills,
  allReceipts,
  todayStr,
}: {
  customers: CustomerWithBalance[];
  allBills: (Bill & { customer_name: string; username: string })[];
  allReceipts: (Receipt & { customer_name: string; username: string })[];
  todayStr: string;
}): Promise<ExcelJS.Workbook> {
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

  const wb = await generateExportWorkbook({
    customers,
    billsByCustomer: billsByCust,
    receiptsByCustomer: recsByCust,
    periodLabel: `Full Backup As Of ${todayStr}`,
  });

  // Add Flat Table Sheets: "All Bills", "All Receipts", "Customers"
  // Sheet: All Bills
  const billsSheet = wb.addWorksheet("All Bills", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const bHeader = billsSheet.addRow([
    "Bill No.",
    "Customer",
    "Username",
    "Date",
    "Item",
    "Gold (g)",
    "Amount (₹)",
    "Note",
  ]);
  bHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
  });
  for (const b of allBills) {
    const row = billsSheet.addRow([
      `#${String(b.bill_no).padStart(4, "0")}`,
      b.customer_name,
      b.username,
      b.bill_date ? new Date(b.bill_date) : null,
      b.item,
      Number(b.gold_weight) || 0,
      Number(b.amount) || 0,
      b.note || "",
    ]);
    row.getCell(4).numFmt = DATE_FORMAT;
    row.getCell(6).numFmt = GOLD_FORMAT;
    row.getCell(7).numFmt = RUPEE_FORMAT;
  }
  autoFitColumns(billsSheet);

  // Sheet: All Receipts
  const receiptsSheet = wb.addWorksheet("All Receipts", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const rHeader = receiptsSheet.addRow([
    "Customer",
    "Username",
    "Date",
    "Gold (g)",
    "Cash Amount (₹)",
    "Note",
  ]);
  rHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  });
  for (const r of allReceipts) {
    const row = receiptsSheet.addRow([
      r.customer_name,
      r.username,
      r.receipt_date ? new Date(r.receipt_date) : null,
      Number(r.gold_weight) || 0,
      Number(r.cash_amount) || 0,
      r.note || "",
    ]);
    row.getCell(3).numFmt = DATE_FORMAT;
    row.getCell(4).numFmt = GOLD_FORMAT;
    row.getCell(5).numFmt = RUPEE_FORMAT;
  }
  autoFitColumns(receiptsSheet);

  // Sheet: Customers (Strictly omitting pin_hash and link_token)
  const custSheet = wb.addWorksheet("Customers", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const cHeader = custSheet.addRow([
    "Customer Name",
    "Username",
    "Phone",
    "Access Mode",
    "Active Status",
    "Created Date",
  ]);
  cHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF333333" } };
  });
  for (const c of customers) {
    const row = custSheet.addRow([
      c.name,
      c.username,
      c.phone || "N/A",
      c.access_mode.toUpperCase(),
      c.is_active ? "Active" : "Inactive",
      c.created_at ? new Date(c.created_at) : null,
    ]);
    row.getCell(6).numFmt = DATE_FORMAT;
  }
  autoFitColumns(custSheet);

  return wb;
}
