import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerWithBalance, Bill, Receipt, Settings } from "./types";
import { formatCurrency, formatGold, formatDate, formatBillNo } from "./format";

export function generateCustomerPdfStatement({
  customer,
  bills,
  receipts,
  settings,
  periodLabel = "All Time",
}: {
  customer: CustomerWithBalance;
  bills: Bill[];
  receipts: Receipt[];
  settings: Settings | null;
  periodLabel?: string;
}): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner (Black & Gold)
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Gold accent line under header
  doc.setFillColor(245, 180, 0); // #F5B400
  doc.rect(0, 32, pageWidth, 2, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(245, 180, 0);
  doc.text(settings?.business_name || "RAJVEER JEWELLERS", 14, 16);

  // Business Subtext
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(230, 230, 230);
  const addressLine = [settings?.business_address, settings?.business_phone].filter(Boolean).join(" • ");
  doc.text(addressLine || "Gold & Jewellery Ledger Statement", 14, 23);

  // Statement title on right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("CUSTOMER STATEMENT", pageWidth - 14, 16, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth - 14, 22, { align: "right" });

  // 2. Customer Profile & Period Block
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(customer.name.toUpperCase(), 14, 44);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Username: @${customer.username}  |  Phone: ${customer.phone || "N/A"}`, 14, 49);
  doc.text(`Statement Period: ${periodLabel}`, 14, 54);

  // 3. Balance Summary Box (Soft Yellow & Gold)
  doc.setFillColor(255, 251, 235); // #FFFBEB
  doc.setDrawColor(239, 231, 200); // #EFE7C8
  doc.roundedRect(14, 59, pageWidth - 28, 22, 3, 3, "FD");

  // Summary Metrics
  const boxWidth = (pageWidth - 28) / 3;

  // Billed
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("TOTAL BILLED", 18, 65);
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text(formatCurrency(customer.billed_amount), 18, 71);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gold: ${formatGold(customer.billed_gold)}`, 18, 76);

  // Received
  doc.setFontSize(8);
  doc.text("TOTAL RECEIVED", 18 + boxWidth, 65);
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61); // Green
  doc.text(formatCurrency(customer.received_cash), 18 + boxWidth, 71);
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text(`Gold: ${formatGold(customer.received_gold)}`, 18 + boxWidth, 76);

  // Pending
  const isAdvance = customer.pending_amount < 0;
  doc.setFontSize(8);
  doc.setTextColor(isAdvance ? 21 : 185, isAdvance ? 128 : 28, isAdvance ? 61 : 28);
  doc.text(isAdvance ? "ADVANCE BALANCE" : "PENDING BALANCE", 18 + boxWidth * 2, 65);
  doc.setFontSize(11);
  doc.text(
    isAdvance
      ? `${formatCurrency(Math.abs(customer.pending_amount))} (Adv)`
      : formatCurrency(customer.pending_amount),
    18 + boxWidth * 2,
    71
  );
  doc.setFontSize(8);
  doc.text(
    customer.pending_gold < 0
      ? `Gold Adv: ${formatGold(Math.abs(customer.pending_gold))}`
      : `Gold Pend: ${formatGold(customer.pending_gold)}`,
    18 + boxWidth * 2,
    76
  );

  // 4. Table 1: Work Done (Bills)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("1. WORK DONE (BILLS)", 14, 90);

  const billRows = bills.map((b) => [
    formatBillNo(b.bill_no),
    formatDate(b.bill_date),
    b.item + (b.note ? ` (${b.note})` : ""),
    b.gold_weight > 0 ? formatGold(b.gold_weight) : "-",
    formatCurrency(b.amount),
  ]);

  if (billRows.length === 0) {
    billRows.push(["-", "-", "No bills recorded", "-", "₹0.00"]);
  }

  autoTable(doc, {
    startY: 93,
    head: [["Bill No.", "Date", "Item Description", "Gold (g)", "Amount (₹)"]],
    body: billRows,
    theme: "grid",
    headStyles: {
      fillColor: [10, 10, 10],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [10, 10, 10],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 26 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 32, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Table 2: Payments Received
  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("2. PAYMENTS RECEIVED", 14, finalY + 10);

  const receiptRows = receipts.map((r) => [
    formatDate(r.receipt_date),
    r.gold_weight > 0 ? formatGold(r.gold_weight) : "-",
    formatCurrency(r.cash_amount),
    r.note || "-",
  ]);

  if (receiptRows.length === 0) {
    receiptRows.push(["-", "-", "₹0.00", "No receipts recorded"]);
  }

  autoTable(doc, {
    startY: finalY + 13,
    head: [["Receipt Date", "Gold Received (g)", "Cash Received (₹)", "Note / Reference"]],
    body: receiptRows,
    theme: "grid",
    headStyles: {
      fillColor: [21, 128, 61], // Green
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [10, 10, 10],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: "right", cellWidth: 32 },
      2: { halign: "right", cellWidth: 36, fontStyle: "bold", textColor: [21, 128, 61] },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer text
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is a computer-generated customer ledger statement from Rajveer. For queries, contact store owner.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
