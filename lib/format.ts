import { format, parseISO } from "date-fns";

/**
 * Format currency in Indian numbering system (e.g. ₹3,80,372.00)
 */
export function formatCurrency(amount: number | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format currency with advance tag if negative
 */
export function formatCurrencyBalance(amount: number | null | undefined): {
  text: string;
  isAdvance: boolean;
  raw: number;
} {
  const num = Number(amount) || 0;
  if (num < 0) {
    return {
      text: `${formatCurrency(Math.abs(num))} (Advance)`,
      isAdvance: true,
      raw: num,
    };
  }
  return {
    text: formatCurrency(num),
    isAdvance: false,
    raw: num,
  };
}

/**
 * Format gold weight with 2 decimal places and 'g' suffix (e.g. 35.17 g)
 */
export function formatGold(weight: number | null | undefined): string {
  const num = Number(weight) || 0;
  return `${num.toFixed(2)} g`;
}

/**
 * Format gold balance with advance tag if negative
 */
export function formatGoldBalance(weight: number | null | undefined): {
  text: string;
  isAdvance: boolean;
  raw: number;
} {
  const num = Number(weight) || 0;
  if (num < 0) {
    return {
      text: `${Math.abs(num).toFixed(2)} g (Advance)`,
      isAdvance: true,
      raw: num,
    };
  }
  return {
    text: `${num.toFixed(2)} g`,
    isAdvance: false,
    raw: num,
  };
}

/**
 * Format date string (YYYY-MM-DD or ISO) to '07 Aug 2026'
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const cleanDate = dateString.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return format(d, "dd MMM yyyy");
    }
    return format(parseISO(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

/**
 * Format bill number with zero-padding (e.g. #0001)
 */
export function formatBillNo(billNo: number | string | null | undefined): string {
  if (!billNo) return "#0000";
  const num = Number(billNo);
  return `#${num.toString().padStart(4, "0")}`;
}

/**
 * Clean phone number for WhatsApp link
 * If 10 digits, prepends Indian country code 91.
 */
export function cleanWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Build WhatsApp share link
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const cleanedPhone = cleanWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  if (cleanedPhone) {
    return `https://wa.me/${cleanedPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
