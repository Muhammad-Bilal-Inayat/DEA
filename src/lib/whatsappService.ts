/**
 * WhatsApp Integration Service for MBI Inventra
 * 100% Free Direct DeepLink & Web Share
 * Generates formatted text messages for Invoices, Shortage Orders, and Receipts.
 */

export interface WhatsAppInvoiceData {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  grandTotal: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface WhatsAppShortageData {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  distributorName?: string;
  distributorPhone?: string;
  date: string;
  items: Array<{
    name: string;
    generic?: string;
    quantity: number;
    unit?: string;
    estimatedPrice?: number;
    urgency?: string;
  }>;
  notes?: string;
}

/**
 * Clean and format phone number for WhatsApp wa.me link
 * Handles Pakistan (0300 -> 92300) and international numbers
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleaned = phone.replace(/[^0-9]/g, '');

  // If starts with 00, replace with nothing
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  // If starts with 0 and length is 11 (e.g. 03001234567 in Pakistan)
  else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '92' + cleaned.substring(1);
  }
  // If length is 10 and starts with 3 (e.g. 3001234567)
  else if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '92' + cleaned;
  }

  return cleaned;
}

/**
 * Format an invoice into an attractive WhatsApp message
 */
export function buildInvoiceWhatsAppMessage(data: WhatsAppInvoiceData): string {
  const lines: string[] = [];

  lines.push(`🏥 *${data.storeName.toUpperCase()}*`);
  if (data.storeAddress) lines.push(`📍 _${data.storeAddress}_`);
  if (data.storePhone) lines.push(`📞 ${data.storePhone}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🧾 *TAX INVOICE / CASH RECEIPT*`);
  lines.push(`*Invoice #:* ${data.invoiceNumber}`);
  lines.push(`*Date:* ${data.date}`);
  if (data.customerName && data.customerName.trim() && data.customerName !== 'Walk-in Customer') {
    lines.push(`*Customer:* ${data.customerName}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*ITEMS PURCHASED:*`);

  data.items.forEach((item, index) => {
    const unitText = item.unit ? ` ${item.unit}` : '';
    lines.push(
      `${index + 1}. *${item.name}*\n   ${item.quantity}${unitText} × Rs ${item.price.toLocaleString()} = *Rs ${item.total.toLocaleString()}*`
    );
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Subtotal:* Rs ${data.subtotal.toLocaleString()}`);

  if (data.discount && data.discount > 0) {
    lines.push(`*Discount:* -Rs ${data.discount.toLocaleString()}`);
  }
  if (data.tax && data.tax > 0) {
    lines.push(`*Tax:* +Rs ${data.tax.toLocaleString()}`);
  }

  lines.push(`*GRAND TOTAL:* 💰 *Rs ${data.grandTotal.toLocaleString()}*`);

  if (data.paidAmount !== undefined && data.paidAmount > 0) {
    lines.push(`*Paid Amount:* Rs ${data.paidAmount.toLocaleString()} (${data.paymentMethod || 'Cash'})`);
    if (data.changeAmount && data.changeAmount > 0) {
      lines.push(`*Change Returned:* Rs ${data.changeAmount.toLocaleString()}`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✨ *Thank you for choosing ${data.storeName}!*`);
  lines.push(`_Get well soon. Please store medicines in a cool & dry place._`);

  return lines.join('\n');
}

/**
 * Format a multi-item shortage order sheet for market distributor
 */
export function buildShortageWhatsAppMessage(data: WhatsAppShortageData): string {
  const lines: string[] = [];

  lines.push(`📋 *MARKET SHORTAGE ORDER SHEET*`);
  lines.push(`🏥 *Pharmacy:* ${data.storeName}`);
  if (data.storePhone) lines.push(`📞 *Contact:* ${data.storePhone}`);
  if (data.distributorName) lines.push(`🏢 *Distributor / Vendor:* ${data.distributorName}`);
  lines.push(`📅 *Date:* ${data.date}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*MEDICINES REQUIRED (${data.items.length} ITEMS):*`);

  let totalQty = 0;
  let estimatedTotal = 0;

  data.items.forEach((item, index) => {
    totalQty += item.quantity;
    const est = (item.estimatedPrice || 0) * item.quantity;
    estimatedTotal += est;

    const generic = item.generic ? ` (${item.generic})` : '';
    const urgency = item.urgency === 'Emergency' ? ' 🚨 *[URGENT]*' : '';
    const rateText = item.estimatedPrice ? ` @ Rs ${item.estimatedPrice}` : '';

    lines.push(
      `${index + 1}. *${item.name}*${generic}${urgency}\n   ➔ *Required Qty:* ${item.quantity} ${item.unit || 'Units'}${rateText}`
    );
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Total Items:* ${data.items.length} | *Total Quantity:* ${totalQty}`);
  if (estimatedTotal > 0) {
    lines.push(`*Estimated Order Value:* Rs ${estimatedTotal.toLocaleString()}`);
  }

  if (data.notes) {
    lines.push(`\n📝 *Notes:* ${data.notes}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚠️ *Please check stock availability & dispatch ASAP.*`);

  return lines.join('\n');
}

/**
 * Open WhatsApp directly with pre-filled text
 */
export function sendToWhatsApp(phone: string, message: string): void {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  
  let url = '';
  if (formattedPhone) {
    url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedText}`;
  }

  // Open in new tab/popup
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Native Web Share or fallback to clipboard
 */
export async function shareOrCopy(title: string, text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return true;
    } catch {
      // Fallback to clipboard if cancelled or failed
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard', e);
    return false;
  }
}
