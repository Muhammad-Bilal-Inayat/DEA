import { Medicine, Invoice } from '../types';

/**
 * Escapes a single cell for RFC 4180 compliant CSV
 */
function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If string contains comma, double-quote, or newline, enclose in double quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts headers and row arrays into a formatted CSV string with UTF-8 BOM
 */
export function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVCell).join(','));
  // \uFEFF is UTF-8 Byte Order Mark, critical for Excel to correctly recognize UTF-8 encoding
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Downloads a CSV string as a file in the browser
 */
export function downloadCSVFile(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports complete pharmacy inventory to CSV for record keeping and tax compliance
 */
export function exportInventoryToCSV(medicines: Medicine[], customFileName?: string): void {
  const headers = [
    'S.No',
    'Item / Medicine Name',
    'Barcode / SKU',
    'Batch Number',
    'Manufacturer / Company',
    'Category',
    'Expiry Date',
    'Stock Quantity',
    'Unit',
    'Purchase Cost (PKR)',
    'MRP (PKR)',
    'Sale Price (PKR)',
    'Tax / GST Rate (%)',
    'Total Valuation - Cost (PKR)',
    'Total Valuation - Retail (PKR)',
    'Min Reorder Alert Level',
    'Stock Status'
  ];

  const now = new Date();
  const rows = medicines.map((med, index) => {
    const isExpired = med.expiryDate ? new Date(med.expiryDate) < now : false;
    const isLowStock = med.quantity <= (med.lowStockThreshold || 20);
    let status = 'In Stock';
    if (isExpired) status = 'EXPIRED';
    else if (med.quantity <= 0) status = 'Out of Stock';
    else if (isLowStock) status = 'Low Stock';

    const costValuation = (med.quantity || 0) * (med.purchasePrice || 0);
    const retailValuation = (med.quantity || 0) * (med.sellingPrice || 0);

    return [
      index + 1,
      med.name,
      med.barcode || '',
      med.batchNumber || '',
      med.manufacturer || 'General Pharma',
      med.category || 'Medicines',
      med.expiryDate ? med.expiryDate.slice(0, 10) : '',
      med.quantity,
      med.unit || 'Box',
      med.purchasePrice || 0,
      med.mrp || med.sellingPrice || 0,
      med.sellingPrice || 0,
      med.gstPercentage || 0,
      costValuation.toFixed(2),
      retailValuation.toFixed(2),
      med.lowStockThreshold || 20,
      status
    ];
  });

  const dateStr = now.toISOString().slice(0, 10);
  const fileName = customFileName || `Pharma_Inventory_Report_${dateStr}.csv`;
  const csv = buildCSV(headers, rows);
  downloadCSVFile(csv, fileName);
}

/**
 * Exports sales report to CSV for accounting, audits, and tax compliance (FBR / GST)
 */
export function exportSalesToCSV(invoices: Invoice[], customFileName?: string): void {
  const headers = [
    'S.No',
    'Invoice Date',
    'Invoice #',
    'Customer / Patient Name',
    'Phone / Contact',
    'Transaction Type',
    'Payment Method',
    'Subtotal (PKR)',
    'Discount (PKR)',
    'Tax / GST (PKR)',
    'Grand Total (PKR)',
    'Amount Received (PKR)',
    'Balance Due (PKR)',
    'Payment Status'
  ];

  const rows = invoices.map((inv, index) => {
    const subtotal = inv.subTotal || inv.grandTotal || 0;
    const discount = inv.discountAmount || 0;
    const tax = inv.taxAmount || 0;
    const grandTotal = inv.grandTotal || 0;
    const received = inv.receivedAmount !== undefined ? inv.receivedAmount : 0;
    const balance = inv.balanceDue !== undefined ? inv.balanceDue : (grandTotal - received);

    return [
      index + 1,
      inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '',
      inv.invoiceNumber,
      inv.customerName || 'Walk-in Customer',
      inv.customerPhone || '-',
      inv.transactionType || 'Sales Invoice',
      inv.paymentMethod || inv.paymentType || 'Cash',
      subtotal.toFixed(2),
      discount.toFixed(2),
      tax.toFixed(2),
      grandTotal.toFixed(2),
      received.toFixed(2),
      balance.toFixed(2),
      inv.status || (balance <= 0 ? 'Paid' : 'Unpaid')
    ];
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = customFileName || `Pharma_Sales_Report_${dateStr}.csv`;
  const csv = buildCSV(headers, rows);
  downloadCSVFile(csv, fileName);
}

/**
 * Universal table exporter to CSV with UTF-8 BOM encoding for any tabular report
 */
export function exportTableToCSV(headers: string[], rows: (string | number)[][], fileName: string): void {
  const csv = buildCSV(headers, rows);
  downloadCSVFile(csv, fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
}

