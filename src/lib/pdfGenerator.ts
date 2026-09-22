/**
 * MBI Inventra - Professional jsPDF Invoice & Purchase Bill Generator
 * Uses jsPDF and jspdf-autotable to produce crisp, vector-standard, multi-page PDF documents.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, PurchaseOrder } from '../types';

export interface BusinessProfile {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  taxNumber?: string;
  drugLicenseNo?: string;
  terms?: string;
}

const DEFAULT_BUSINESS: BusinessProfile = {
  name: 'MBI INVENTRA PHARMACY',
  tagline: 'Complete Pharmacy & Healthcare Solutions',
  address: 'Sargodha',
  phone: '0336-4585863',
  mobile: '0328-1302636',
  email: 'support@mbismmpanel.com',
  taxNumber: 'NTN-7864321-9',
  drugLicenseNo: 'DRUG-LIC-042/2026',
  terms: '1. Medicines once sold cannot be returned without original cash receipt.\n2. Refrigerated & cold-chain items are non-returnable.\n3. Check expiry and batch at the time of purchase.',
};

function getStoredBusinessProfile(): BusinessProfile {
  try {
    const raw = localStorage.getItem('company_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        name: parsed.companyName || parsed.businessName || DEFAULT_BUSINESS.name,
        tagline: parsed.tagline || DEFAULT_BUSINESS.tagline,
        address: parsed.address || DEFAULT_BUSINESS.address,
        phone: parsed.phone || DEFAULT_BUSINESS.phone,
        mobile: parsed.mobile || DEFAULT_BUSINESS.mobile,
        email: parsed.email || DEFAULT_BUSINESS.email,
        taxNumber: parsed.gstin || parsed.taxNumber || DEFAULT_BUSINESS.taxNumber,
        drugLicenseNo: parsed.drugLicenseNo || parsed.pan || DEFAULT_BUSINESS.drugLicenseNo,
        terms: parsed.terms || DEFAULT_BUSINESS.terms,
      };
    }
  } catch {}
  return DEFAULT_BUSINESS;
}

/**
 * Generate and return a professional Sale Invoice PDF
 */
export function generateSaleInvoicePDF(invoice: Invoice, customProfile?: BusinessProfile): jsPDF {
  const profile = { ...getStoredBusinessProfile(), ...(customProfile || {}) };
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- Top Header Banner ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Business Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(profile.name || 'MBI INVENTRA PHARMACY', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(profile.tagline || 'Pharmacy & Health Management ERP', 14, 18);
  doc.text(`Lic #: ${profile.drugLicenseNo || 'N/A'}  |  NTN: ${profile.taxNumber || 'N/A'}`, 14, 23);

  // Document Title Header (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - 14, 12, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Doc #: ${invoice.invoiceNumber || 'INV-000'}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Date: ${invoice.date || new Date().toISOString().split('T')[0]}`, pageWidth - 14, 23, { align: 'right' });

  // --- Info Boxes (Customer & Invoice Metadata) ---
  const startY = 33;

  // Left Box: Billed To / Patient
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 88, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO (CUSTOMER / PARTY)', 18, startY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName || 'Walk-in Customer', 18, startY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${invoice.customerPhone || 'N/A'}`, 18, startY + 16.5);
  doc.text(`Address: ${invoice.customerAddress || 'Local Counter Sale'}`, 18, startY + 21.5);

  // Right Box: Payment & Dispatch Details
  doc.roundedRect(108, startY, 88, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE & PAYMENT DETAILS', 112, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode:`, 112, startY + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${(invoice.paymentType || 'CASH').toUpperCase()}`, 142, startY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Status:`, 112, startY + 16.5);
  doc.setFont('helvetica', 'bold');
  const isPaid = (invoice.balanceDue || 0) <= 0 || (invoice.receivedAmount || 0) >= (invoice.grandTotal || 0);
  doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9); // Emerald vs Amber
  doc.text(isPaid ? 'PAID' : 'UNPAID / PENDING', 142, startY + 16.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Due Date:`, 112, startY + 21.5);
  doc.text(invoice.deliveryDueDate || invoice.date || 'Upon Receipt', 142, startY + 21.5);

  // --- Items Table with jspdf-autotable ---
  const tableRows = (invoice.items || []).map((item, idx) => {
    const unitPrice = item.pricePerUnit !== undefined ? item.pricePerUnit : (item.sellingPrice || 0);
    const qty = item.quantity || 1;
    const disc = item.discountAmount || 0;
    const net = item.total || (qty * unitPrice - disc);
    return [
      idx + 1,
      item.name || 'Medicine Item',
      item.batchNumber || '-',
      item.expiryDate || '-',
      qty,
      `Rs ${unitPrice.toFixed(2)}`,
      disc > 0 ? `Rs ${disc.toFixed(2)}` : '0%',
      `Rs ${net.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [['#', 'Item / Medicine Description', 'Batch', 'Expiry', 'Qty', 'Unit Price', 'Disc', 'Net Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 26 },
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // --- Financial Summary Box ---
  const subtotal = invoice.subTotal || invoice.grandTotal;
  const discountTotal = invoice.discountAmount || 0;
  const taxTotal = invoice.taxAmount || 0;
  const grandTotal = invoice.grandTotal || 0;
  const paidAmount = invoice.receivedAmount !== undefined ? invoice.receivedAmount : (isPaid ? grandTotal : 0);
  const balanceDue = invoice.balanceDue !== undefined ? invoice.balanceDue : (grandTotal - paidAmount);

  const summaryX = 118;
  const summaryWidth = 78;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, finalY, summaryWidth, 36, 1.5, 1.5, 'FD');

  const printSummaryRow = (label: string, value: string, yOffset: number, isBold: boolean = false, color?: number[]) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9.5 : 8.5);
    doc.setTextColor(color ? color[0] : 71, color ? color[1] : 85, color ? color[2] : 105);
    doc.text(label, summaryX + 4, finalY + yOffset);
    doc.text(value, summaryX + summaryWidth - 4, finalY + yOffset, { align: 'right' });
  };

  printSummaryRow('Subtotal:', `Rs ${subtotal.toFixed(2)}`, 6);
  printSummaryRow('Total Discount:', `- Rs ${discountTotal.toFixed(2)}`, 11.5);
  printSummaryRow('Tax / GST:', `+ Rs ${taxTotal.toFixed(2)}`, 17);
  
  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 4, finalY + 19.5, summaryX + summaryWidth - 4, finalY + 19.5);

  printSummaryRow('Grand Total:', `Rs ${grandTotal.toFixed(2)}`, 24.5, true, [15, 23, 42]);
  printSummaryRow('Amount Paid:', `Rs ${paidAmount.toFixed(2)}`, 29.5, false, [22, 101, 52]);
  printSummaryRow('Balance Due:', `Rs ${balanceDue.toFixed(2)}`, 34.5, true, balanceDue > 0 ? [180, 83, 9] : [71, 85, 105]);

  // --- Left: Terms & Conditions & Pharmacy Contact ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TERMS & RETURN POLICY', 14, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const splitTerms = doc.splitTextToSize(profile.terms || DEFAULT_BUSINESS.terms!, 95);
  doc.text(splitTerms, 14, finalY + 10);

  // --- Signature Block ---
  const signY = finalY + 46;
  if (signY < pageHeight - 20) {
    doc.setDrawColor(203, 213, 225);
    doc.line(140, signY + 10, 190, signY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature & Stamp', 165, signY + 14, { align: 'center' });
  }

  // --- Bottom Permanent Mandatory Developer Branding Footer ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('THANKS FOR SHOPPING!', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text('DEVELOPED BY MBI INVENTRA', pageWidth / 2, pageHeight - 8.5, { align: 'center' });
  doc.text('M BILAL INAYAT 0328-1302636', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc;
}

/**
 * Generate and return a professional Purchase Bill PDF
 */
export function generatePurchaseBillPDF(purchase: PurchaseOrder, customProfile?: BusinessProfile): jsPDF {
  const profile = { ...getStoredBusinessProfile(), ...(customProfile || {}) };
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(profile.name || 'MBI INVENTRA PHARMACY', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(profile.address || 'Sargodha', 14, 18);
  doc.text(`Phone: ${profile.phone || ''}  |  Lic: ${profile.drugLicenseNo || ''}`, 14, 23);

  // Document Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('PURCHASE BILL', pageWidth - 14, 12, { align: 'right' });

  const billNumberStr = purchase.billNumber || purchase.poNumber || 'BILL-000';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Bill #: ${billNumberStr}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Date: ${purchase.date || new Date().toISOString().split('T')[0]}`, pageWidth - 14, 23, { align: 'right' });

  const startY = 33;

  // Supplier Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 88, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VENDOR / DISTRIBUTOR', 18, startY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(purchase.supplierName || purchase.partyName || 'Distributor / Pharma Supplier', 18, startY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mode: ${(purchase.paymentType || 'Cash').toUpperCase()}`, 18, startY + 16.5);
  doc.text(`Status: ${(purchase.status || 'Received').toUpperCase()}`, 18, startY + 21.5);

  // Purchase Details Box
  doc.roundedRect(108, startY, 88, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLING / STOCK IN DETAILS', 112, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Status:`, 112, startY + 11.5);
  doc.setFont('helvetica', 'bold');
  const isPaid = purchase.status === 'Paid' || (purchase.balanceDue || 0) <= 0;
  doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9);
  doc.text(isPaid ? 'PAID' : 'UNPAID / OUTSTANDING', 142, startY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Stock Status:`, 112, startY + 16.5);
  doc.text(purchase.status || 'Stock Inward Completed', 142, startY + 16.5);

  // Table
  const tableRows = (purchase.items || []).map((item, idx) => {
    const cost = item.purchasePrice || 0;
    const qty = item.quantity || 1;
    const total = item.total || (qty * cost);
    return [
      idx + 1,
      item.name || 'Medicine Item',
      item.batchNumber || '-',
      item.expiryDate || '-',
      qty,
      `Rs ${cost.toFixed(2)}`,
      `Rs ${total.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [['#', 'Item Description / Formulation', 'Batch #', 'Expiry', 'Qty In', 'Purchase Cost', 'Total Cost']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 15 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 32 },
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const grandTotal = purchase.totalAmount || 0;
  const paid = purchase.paidAmount || (isPaid ? grandTotal : 0);
  const due = purchase.balanceDue !== undefined ? purchase.balanceDue : (grandTotal - paid);

  const summaryX = 118;
  const summaryWidth = 78;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, finalY, summaryWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bill Total:', summaryX + 4, finalY + 6.5);
  doc.text(`Rs ${grandTotal.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text('Amount Paid:', summaryX + 4, finalY + 13);
  doc.text(`Rs ${paid.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(due > 0 ? 180 : 71, due > 0 ? 83 : 85, due > 0 ? 9 : 105);
  doc.text('Payable Balance:', summaryX + 4, finalY + 19.5);
  doc.text(`Rs ${due.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 19.5, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'MBI Inventra Purchase Management System - Automated Stock Inward Ledger',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  return doc;
}

/**
 * Trigger direct download of a generated PDF
 */
export function downloadSaleInvoicePDF(invoice: Invoice, customProfile?: BusinessProfile) {
  const doc = generateSaleInvoicePDF(invoice, customProfile);
  const cleanNum = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`${cleanNum}.pdf`);
}

export function downloadPurchaseBillPDF(purchase: PurchaseOrder, customProfile?: BusinessProfile) {
  const doc = generatePurchaseBillPDF(purchase, customProfile);
  const cleanNum = (purchase.billNumber || purchase.poNumber || 'PurchaseBill').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`${cleanNum}.pdf`);
}

export interface ReportPDFOptions {
  title: string;
  subtitle?: string;
  dateRangeStr?: string;
  summaryMetrics?: { label: string; value: string; color?: string }[];
  headers: string[];
  rows: (string | number)[][];
  fileName?: string;
  columnStyles?: Record<number, any>;
  customProfile?: BusinessProfile;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate and download a high-quality standardized report PDF for any financial/inventory report
 */
export function downloadReportPDF(options: ReportPDFOptions) {
  const profile = { ...getStoredBusinessProfile(), ...(options.customProfile || {}) };
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(profile.name || 'MBI INVENTRA PHARMACY', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${profile.address || 'Sargodha'} | Tel: ${profile.phone || '0336-4585863'}`, 14, 16);
  doc.text(`Drug Lic: ${profile.drugLicenseNo || 'DRUG-LIC-042'} | NTN: ${profile.taxNumber || 'NTN-7864321-9'}`, 14, 21);

  // Right Side: Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(options.title.toUpperCase(), pageWidth - 14, 11, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  if (options.dateRangeStr) {
    doc.text(`Period: ${options.dateRangeStr}`, pageWidth - 14, 16, { align: 'right' });
  }
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 21, { align: 'right' });

  let currentY = 30;

  // 2. Summary Metric Cards (if any)
  if (options.summaryMetrics && options.summaryMetrics.length > 0) {
    const cardGap = 3;
    const totalWidth = pageWidth - 28;
    const cardWidth = (totalWidth - (options.summaryMetrics.length - 1) * cardGap) / options.summaryMetrics.length;
    const cardHeight = 14;

    options.summaryMetrics.forEach((m, idx) => {
      const cardX = 14 + idx * (cardWidth + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(m.label.toUpperCase(), cardX + 3, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(m.value, cardX + 3, currentY + 11);
    });

    currentY += cardHeight + 5;
  }

  // 3. Subtitle / Note (if any)
  if (options.subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 14, currentY);
    currentY += 4;
  }

  // 4. Data Table with AutoTable
  autoTable(doc, {
    startY: currentY,
    head: [options.headers],
    body: options.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: options.columnStyles || {},
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `MBI Inventra Pharmacy ERP • Official Report • Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }
  });

  const file = options.fileName || `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(file);
}

