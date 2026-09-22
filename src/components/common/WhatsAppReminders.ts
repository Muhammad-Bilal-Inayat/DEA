/**
 * Free WhatsApp Dispatcher & Template Utility (100% Free - uses direct wa.me URL scheme)
 */

export interface WhatsAppInvoiceData {
  businessName: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; qty: number; price: number; total: number }[];
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  phone?: string;
}

export interface WhatsAppUdhaarReminderData {
  businessName: string;
  customerName: string;
  customerPhone: string;
  currentBalance: number;
  lastPaymentDate?: string;
  businessPhone?: string;
}

export interface WhatsAppShortageOrderData {
  distributorName: string;
  distributorPhone?: string;
  pharmacyName: string;
  items: { name: string; generic?: string; qty: number; urgency: string }[];
}

export interface WhatsAppRefillReminderData {
  patientName: string;
  patientPhone: string;
  pharmacyName: string;
  medicinesList: string;
  dueDate: string;
}

export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.startsWith('+92')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export function openWhatsAppLink(phone: string, text: string) {
  const cleanedPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanedPhone 
    ? `https://wa.me/${cleanedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * 1. Generates 1-click free WhatsApp Digital Bill
 */
export function sendInvoiceViaWhatsApp(data: WhatsAppInvoiceData) {
  const itemsText = data.items
    .map((item, idx) => `${idx + 1}. *${item.name}* (Qty: ${item.qty}) - Rs. ${item.total.toLocaleString()}`)
    .join('\n');

  const message = 
`🧾 *${data.businessName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice #:* ${data.invoiceNumber}
📅 *Date:* ${data.date}
👤 *Customer:* ${data.customerName}

*ITEMS PURCHASED:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* Rs. ${data.grandTotal.toLocaleString()}
💵 *Paid Amount:* Rs. ${data.paidAmount.toLocaleString()}
${data.balanceDue > 0 ? `⚠️ *Remaining Balance (Udhaar):* Rs. ${data.balanceDue.toLocaleString()}` : `✅ *Status:* FULLY PAID`}

_Thank you for choosing ${data.businessName}!_
📞 Contact: ${data.phone || 'Our Store'}`;

  openWhatsAppLink(data.customerPhone || '', message);
}

/**
 * 2. Generates 1-click free WhatsApp Udhaar Reminder
 */
export function sendUdhaarReminderViaWhatsApp(data: WhatsAppUdhaarReminderData) {
  const message =
`Assalam-o-Alaikum *${data.customerName}*,

Umeed hai aap kheriyat se honge. Yeh ek polite reminder hai ke *${data.businessName}* par aapka baqaya hisaab (Pending Balance):

💰 *Baqaya Rakam:* Rs. ${data.currentBalance.toLocaleString()}

Baraye meharbani apni sahulat ke mutabiq yeh payment clear kar dein ya counter par visit karein.

Shukriya!
*${data.businessName}*
📞 ${data.businessPhone || ''}`;

  openWhatsAppLink(data.customerPhone, message);
}

/**
 * 3. Generates 1-click free WhatsApp Shortage / Purchase Order to Distributor
 */
export function sendShortageOrderViaWhatsApp(data: WhatsAppShortageOrderData) {
  const itemsText = data.items
    .map((item, idx) => `${idx + 1}. *${item.name}* - Qty: ${item.qty} ${item.urgency === 'Emergency' ? '🚨 [EMERGENCY]' : ''}`)
    .join('\n');

  const message =
`📦 *URGENT MEDICINE ORDER / SHORT LIST*
To: *${data.distributorName || 'Distributor / Vendor'}*
From: *${data.pharmacyName}*
📅 Date: ${new Date().toLocaleDateString('en-PK')}

Please supply the following medicines on priority:

${itemsText}

Baraye meharbani order confirm karein aur delivery time bata dein.
Shukriya!`;

  openWhatsAppLink(data.distributorPhone || '', message);
}

/**
 * 4. Generates 1-click free WhatsApp Chronic Refill Reminder
 */
export function sendRefillReminderViaWhatsApp(data: WhatsAppRefillReminderData) {
  const message =
`Assalam-o-Alaikum *${data.patientName}*,

*${data.pharmacyName}* ki taraf se health check!
Aapki monthly regular medicine ka schedule:

💊 *Dawa:* ${data.medicinesList}
📅 *Refill Due Date:* ${data.dueDate}

Agar aapko fresh medicines ya free home delivery chahiye to isi WhatsApp par reply karein ya call karein.

Apni sehat ka khayal rakhein!
*${data.pharmacyName}*`;

  openWhatsAppLink(data.patientPhone, message);
}
