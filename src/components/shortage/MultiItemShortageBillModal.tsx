import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Send, ShoppingBag, Printer, 
  FileSpreadsheet, Sparkles, AlertTriangle, Building2,
  Phone, CheckCircle2, RefreshCw, Copy, Check, Download, FileText
} from 'lucide-react';
import { Medicine, Supplier, ShortageItemRecord, PurchaseOrder } from '../../types';
import { dbShortageItems, dbMedicines, dbSuppliers, dbPurchaseOrders, dbInvoices } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { buildShortageWhatsAppMessage, sendToWhatsApp, shareOrCopy } from '../../lib/whatsappService';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export interface ShortageRow {
  id: string;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  currentStock: number;
  requestedQty: number;
  unit: string;
  supplierId?: string;
  distributorName: string;
  distributorPhone?: string;
  estimatedPrice: number;
  urgency: 'Normal' | 'High' | 'Emergency';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

interface MultiItemShortageBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialItems?: ShortageItemRecord[];
  onConvertToPurchase?: (validRows: ShortageRow[], distributorName: string, notes: string) => void;
  onConvertToSale?: (validRows: ShortageRow[], customerName: string, notes: string) => void;
}

export const MultiItemShortageBillModal: React.FC<MultiItemShortageBillModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialItems = [],
  onConvertToPurchase,
  onConvertToSale,
}) => {
  const { business, activeUser, currentUser } = useAuth();
  const { showToast } = useToast();

  const [rows, setRows] = useState<ShortageRow[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributorPhoneInput, setDistributorPhoneInput] = useState('');
  const [sharedDistributorName, setSharedDistributorName] = useState('');
  const [batchNotes, setBatchNotes] = useState('Market urgent procurement required for stock replenishment.');

  // Bulk Paste State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const isInitializedRef = useRef(false);

  // Load existing medicines & suppliers once on open
  useEffect(() => {
    if (isOpen) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        const loadData = async () => {
          try {
            const [meds, supps] = await Promise.all([
              dbMedicines.getAll(),
              dbSuppliers.getAll(),
            ]);
            setAllMedicines(meds || []);
            setSuppliers(supps || []);

            if (initialItems && initialItems.length > 0) {
              const mapped: ShortageRow[] = initialItems.map(item => ({
                id: item.id || uuidv4(),
                medicineId: item.medicineId,
                medicineName: item.medicineName,
                genericName: item.genericName,
                currentStock: 0,
                requestedQty: item.requestedQty || 10,
                unit: 'Packs',
                supplierId: item.supplierId,
                distributorName: item.distributorName || '',
                distributorPhone: item.distributorPhone || '',
                estimatedPrice: item.estimatedPrice || 0,
                urgency: (item.urgency as any) || 'High',
                customerName: item.customerName || '',
                customerPhone: item.customerPhone || '',
                notes: item.notes || ''
              }));
              setRows(mapped);
            } else {
              // Initialize with 5 clean rows ready for fast typing
              const initRows: ShortageRow[] = Array.from({ length: 5 }).map(() => ({
                id: uuidv4(),
                medicineName: '',
                genericName: '',
                currentStock: 0,
                requestedQty: 10,
                unit: 'Packs',
                distributorName: '',
                estimatedPrice: 0,
                urgency: 'High',
                notes: ''
              }));
              setRows(initRows);
            }
          } catch (err) {
            console.error('Failed to load modal data:', err);
          }
        };

        loadData();
      }
    } else {
      isInitializedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Add 1 or multiple empty rows
  const handleAddRows = (count = 1) => {
    const newRows: ShortageRow[] = Array.from({ length: count }).map(() => ({
      id: uuidv4(),
      medicineName: '',
      genericName: '',
      currentStock: 0,
      requestedQty: 10,
      unit: 'Packs',
      distributorName: sharedDistributorName || '',
      distributorPhone: distributorPhoneInput || '',
      estimatedPrice: 0,
      urgency: 'High',
      notes: ''
    }));
    setRows(prev => [...prev, ...newRows]);
  };

  // Auto-import low stock items into shortage sheet
  const handleImportLowStock = () => {
    const lowStockMeds = allMedicines.filter(m => (m.quantity || 0) <= (m.lowStockThreshold || 10));
    if (lowStockMeds.length === 0) {
      showToast('No low stock medicines found in inventory.', 'info');
      return;
    }

    const lowStockRows: ShortageRow[] = lowStockMeds.map(med => ({
      id: uuidv4(),
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.saltComposition || med.genericName || '',
      currentStock: med.quantity || 0,
      requestedQty: Math.max(10, (med.lowStockThreshold || 10) * 2 - (med.quantity || 0)),
      unit: med.unit || 'Packs',
      distributorName: med.supplierName || sharedDistributorName || '',
      distributorPhone: distributorPhoneInput || '',
      estimatedPrice: med.purchasePrice || med.mrp || 0,
      urgency: med.quantity === 0 ? 'Emergency' : 'High',
      notes: med.quantity === 0 ? 'Out of stock' : 'Low stock buffer'
    }));

    setRows(prev => {
      const valid = prev.filter(r => (r?.medicineName || '').trim().length > 0);
      return [...valid, ...lowStockRows];
    });

    showToast(`Imported ${lowStockRows.length} low stock medicines!`, 'success');
  };

  // Bulk Paste List Handler (20+ Items Fast Entry)
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      showToast('Please paste a text list of medicines.', 'info');
      return;
    }

    const lines = pastedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const parsedRows: ShortageRow[] = lines.map(line => {
      const words = line.split(/\s+/);
      let qty = 10;
      let medName = line;

      if (words.length > 1) {
        const lastWord = words[words.length - 1];
        if (/^\d+$/.test(lastWord)) {
          qty = parseInt(lastWord, 10);
          medName = words.slice(0, -1).join(' ');
        }
      }

      const foundMed = allMedicines.find(m => m.name.toLowerCase() === medName.toLowerCase());

      return {
        id: uuidv4(),
        medicineId: foundMed?.id,
        medicineName: medName,
        genericName: foundMed?.saltComposition || foundMed?.genericName || '',
        currentStock: foundMed?.quantity || 0,
        requestedQty: qty,
        unit: foundMed?.unit || 'Packs',
        distributorName: foundMed?.supplierName || sharedDistributorName || '',
        distributorPhone: distributorPhoneInput || '',
        estimatedPrice: foundMed?.purchasePrice || foundMed?.mrp || 0,
        urgency: 'High',
        notes: batchNotes
      };
    });

    setRows(prev => {
      const validExisting = prev.filter(r => (r?.medicineName || '').trim().length > 0);
      return [...validExisting, ...parsedRows];
    });

    setPastedText('');
    setIsPasteModalOpen(false);
    showToast(`Successfully imported ${parsedRows.length} items from pasted list!`, 'success');
  };

  // Update a single cell
  const handleRowChange = (id: string, field: keyof ShortageRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;

      const updated = { ...row, [field]: value };

      // If selecting medicine name from suggestions
      if (field === 'medicineName') {
        const found = allMedicines.find(m => m.name.toLowerCase() === String(value).toLowerCase());
        if (found) {
          updated.medicineId = found.id;
          updated.genericName = found.saltComposition || found.genericName || '';
          updated.currentStock = found.quantity || 0;
          updated.unit = found.unit || 'Packs';
          updated.estimatedPrice = found.purchasePrice || found.mrp || 0;
          if (found.supplierName) {
            updated.distributorName = found.supplierName;
          }
        }
      }

      // If selecting distributor
      if (field === 'supplierId') {
        const supp = suppliers.find(s => s.id === value);
        if (supp) {
          updated.distributorName = supp.name;
          updated.distributorPhone = supp.phone;
        }
      }

      return updated;
    }));
  };

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Calculations
  const validRows = (rows || []).filter(r => (r?.medicineName || '').trim().length > 0);
  const totalItemsCount = validRows.length;
  const totalQtyCount = validRows.reduce((acc, r) => acc + (Number(r.requestedQty) || 0), 0);
  const totalEstimatedCost = validRows.reduce((acc, r) => acc + ((Number(r.estimatedPrice) || 0) * (Number(r.requestedQty) || 0)), 0);

  // Save all items to Shortage Database
  const handleSaveToDatabase = async () => {
    if (validRows.length === 0) {
      showToast('Please enter at least 1 medicine name.', 'error');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const userName = activeUser?.name || currentUser?.displayName || 'Pharmacist Admin';

      const itemsToSave: ShortageItemRecord[] = validRows.map(r => ({
        id: (r.id && typeof r.id === 'string' && r.id.startsWith('shortage-')) ? r.id : `shortage-${uuidv4().slice(0, 8)}`,
        medicineId: r.medicineId,
        medicineName: (r.medicineName || '').trim(),
        genericName: (r.genericName || '').trim(),
        companyName: '',
        requestedQty: Number(r.requestedQty) || 10,
        customerName: (r.customerName || '').trim(),
        customerPhone: (r.customerPhone || '').trim(),
        urgency: r.urgency,
        status: 'Pending',
        estimatedPrice: Number(r.estimatedPrice) || 0,
        distributorName: r.distributorName || sharedDistributorName || 'Market Distributor',
        distributorPhone: r.distributorPhone || distributorPhoneInput || '',
        notes: r.notes || batchNotes,
        recordedBy: userName,
        createdAt: now
      }));

      await Promise.all(itemsToSave.map(item => dbShortageItems.save(item)));

      showToast(`Successfully saved ${itemsToSave.length} shortage items!`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save shortage bill.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate & Send WhatsApp Order Sheet
  const handleWhatsAppSend = () => {
    if (validRows.length === 0) {
      showToast('Please add medicines to send on WhatsApp.', 'error');
      return;
    }

    const pharmacyName = business?.name || 'MBI Pharmacy';
    const storePhone = business?.phone || '';

    const message = buildShortageWhatsAppMessage({
      storeName: pharmacyName,
      storePhone,
      storeAddress: business?.address || '',
      distributorName: sharedDistributorName || 'Market Distributor',
      distributorPhone: distributorPhoneInput,
      date: new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: validRows.map(r => ({
        name: r.medicineName,
        generic: r.genericName,
        quantity: Number(r.requestedQty) || 1,
        unit: r.unit || 'Packs',
        estimatedPrice: Number(r.estimatedPrice) || 0,
        urgency: r.urgency
      })),
      notes: batchNotes
    });

    sendToWhatsApp(distributorPhoneInput, message);
    showToast('WhatsApp opened with formatted shortage order!', 'success');
  };

  // Convert to Purchase
  const handleConvertToPurchaseClick = () => {
    if (validRows.length === 0) {
      showToast('Please add medicines to convert to purchase.', 'error');
      return;
    }
    if (onConvertToPurchase) {
      onConvertToPurchase(validRows, sharedDistributorName, batchNotes);
    } else {
      handleDirectConvertToPurchase();
    }
  };

  // Convert to Sale
  const handleConvertToSaleClick = () => {
    if (validRows.length === 0) {
      showToast('Please add medicines to convert to sale.', 'error');
      return;
    }
    if (onConvertToSale) {
      onConvertToSale(validRows, validRows[0]?.customerName || 'Walk-in Customer', batchNotes);
    } else {
      handleDirectConvertToSale();
    }
  };

  // Convert all items directly to a registered Sale Invoice
  const handleDirectConvertToSale = async () => {
    if (validRows.length === 0) {
      showToast('Please add medicines to convert to sale.', 'error');
      return;
    }

    const confirmConvert = window.confirm(
      `Do you want to convert these ${validRows.length} shortage items directly into a registered Sale Invoice?`
    );
    if (!confirmConvert) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const invoiceNumber = `INV-SHORT-${Date.now().toString().slice(-6)}`;
      const customerName = validRows[0]?.customerName || 'Walk-in Customer';

      const saleItems = validRows.map((r, idx) => {
        const qty = Number(r.requestedQty) || 1;
        const rate = Number(r.estimatedPrice) ? Math.round(Number(r.estimatedPrice) * 1.2) : 120;
        return {
          id: `item-${idx + 1}`,
          medicineId: r.medicineId || `med-${uuidv4().slice(0, 8)}`,
          name: r.medicineName,
          genericName: r.genericName || '',
          batchNumber: 'MKT-01',
          expiryDate: `${new Date().getFullYear() + 2}-12-31`,
          quantity: qty,
          unit: r.unit || 'Packs',
          pricePerUnit: rate,
          sellingPrice: rate,
          mrp: Math.round(rate * 1.1),
          costPrice: Number(r.estimatedPrice) || 100,
          discountPercentage: 0,
          taxPercentage: 0,
          total: qty * rate,
        };
      });

      const grandTotal = saleItems.reduce((sum, item) => sum + item.total, 0);

      const invoiceRecord: any = {
        id: `inv-${uuidv4().slice(0, 8)}`,
        invoiceNumber,
        customerName,
        customerPhone: validRows[0]?.customerPhone || distributorPhoneInput || '',
        date: now,
        items: saleItems,
        subTotal: grandTotal,
        grandTotal,
        receivedAmount: grandTotal,
        balanceDue: 0,
        transactionType: 'Sale',
        paymentType: 'Cash',
        status: 'Completed',
        description: `Converted from Shortage Order Sheet (${validRows.length} items)`,
        createdAt: now,
        updatedAt: now
      };

      await dbInvoices.save(invoiceRecord);

      // Save fulfilled shortage items to dbShortageItems as well
      const userName = activeUser?.name || currentUser?.displayName || 'Pharmacist Admin';
      const shortageRecordsToSave = validRows.map(r => ({
        id: (r.id && typeof r.id === 'string' && r.id.startsWith('shortage-')) ? r.id : `shortage-${uuidv4().slice(0, 8)}`,
        medicineId: r.medicineId,
        medicineName: (r.medicineName || '').trim(),
        genericName: (r.genericName || '').trim(),
        companyName: '',
        requestedQty: Number(r.requestedQty) || 1,
        customerName: r.customerName?.trim() || '',
        customerPhone: r.customerPhone?.trim() || '',
        urgency: r.urgency,
        status: 'Fulfilled' as const,
        fulfilledAt: now,
        estimatedPrice: Number(r.estimatedPrice) || 0,
        distributorName: r.distributorName || sharedDistributorName || '',
        notes: `${r.notes || batchNotes} [Converted to Sale #${invoiceNumber}]`.trim(),
        recordedBy: userName,
        createdAt: now
      }));

      await Promise.all(shortageRecordsToSave.map(item => dbShortageItems.save(item)));

      showToast(`Converted to Sale Invoice #${invoiceNumber} successfully!`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to convert to sale invoice.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Convert all items directly to a confirmed Purchase Voucher
  const handleDirectConvertToPurchase = async () => {
    if (validRows.length === 0) {
      showToast('Please add medicines to convert to purchase.', 'error');
      return;
    }

    const confirmConvert = window.confirm(
      `Do you want to convert these ${validRows.length} shortage medicines directly into a registered Purchase Bill and update your live inventory stock?`
    );
    if (!confirmConvert) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const invoiceNumber = `PUR-${Date.now().toString().slice(-6)}`;
      const supplierName = sharedDistributorName || 'Market Wholesale Suppliers';

      // 1. Create Purchase Items
      const purchaseItems = validRows.map((r, idx) => {
        const qty = Number(r.requestedQty) || 10;
        const rate = Number(r.estimatedPrice) || 100;
        return {
          id: `item-${idx + 1}`,
          medicineId: r.medicineId || `med-${uuidv4().slice(0, 8)}`,
          medicineName: r.medicineName,
          genericName: r.genericName || '',
          batchNumber: `MKT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          expiryDate: `${new Date().getFullYear() + 2}-12-31`,
          quantity: qty,
          unit: r.unit || 'Packs',
          purchasePrice: rate,
          salePrice: Math.round(rate * 1.2),
          mrp: Math.round(rate * 1.25),
          total: qty * rate,
          taxPercent: 0,
          discountPercent: 0
        };
      });

      const totalAmount = purchaseItems.reduce((sum, item) => sum + item.total, 0);

      const purchaseRecord: any = {
        id: `pur-${uuidv4().slice(0, 8)}`,
        invoiceNumber,
        supplierId: 'supp-market',
        supplierName,
        date: now.split('T')[0],
        dueDate: now.split('T')[0],
        items: purchaseItems,
        subtotal: totalAmount,
        totalAmount,
        paidAmount: totalAmount,
        balanceAmount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        notes: `Converted from Shortage Order Sheet (${validRows.length} items)`,
        createdAt: now,
        updatedAt: now
      };

      await dbPurchaseOrders.save(purchaseRecord);

      // 2. Update / Upsert live medicines inventory in parallel
      await Promise.all(
        purchaseItems.map(async (pItem) => {
          const existing = allMedicines.find(m => m.name.toLowerCase() === pItem.medicineName.toLowerCase());
          if (existing) {
            return dbMedicines.save({
              ...existing,
              quantity: (existing.quantity || 0) + pItem.quantity,
              purchasePrice: pItem.purchasePrice,
              sellingPrice: pItem.salePrice,
              batchNumber: pItem.batchNumber,
              updatedAt: now
            });
          } else {
            return dbMedicines.save({
              id: pItem.medicineId,
              barcode: `890${Math.floor(10000000 + Math.random() * 90000000)}`,
              name: pItem.medicineName,
              saltComposition: pItem.genericName,
              manufacturer: 'General Pharma',
              gstPercentage: 0,
              quantity: pItem.quantity,
              unit: pItem.unit,
              purchasePrice: pItem.purchasePrice,
              sellingPrice: pItem.salePrice,
              mrp: pItem.mrp,
              batchNumber: pItem.batchNumber,
              expiryDate: pItem.expiryDate,
              supplierName,
              lowStockThreshold: 10,
              category: 'General Medicines',
              createdAt: now,
              updatedAt: now
            });
          }
        })
      );

      showToast(`Converted to Purchase #${invoiceNumber} & Stock updated successfully!`, 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to convert to purchase bill.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel sheet
  const handleExportExcel = () => {
    if (validRows.length === 0) {
      showToast('No medicines to export.', 'info');
      return;
    }

    const data = validRows.map((r, i) => ({
      'Sr #': i + 1,
      'Medicine Name': r.medicineName,
      'Generic / Formula': r.genericName || '-',
      'Required Qty': r.requestedQty,
      'Unit': r.unit,
      'Distributor / Supplier': r.distributorName || sharedDistributorName || 'Market',
      'Est. Unit Rate (PKR)': r.estimatedPrice || 0,
      'Total Est. Amount (PKR)': (r.estimatedPrice || 0) * (r.requestedQty || 0),
      'Urgency': r.urgency,
      'Customer / Reference': r.customerName ? `${r.customerName} (${r.customerPhone || ''})` : '-',
      'Notes': r.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shortage List');
    XLSX.writeFile(wb, `Market_Shortage_Order_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel order sheet downloaded!', 'success');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[96vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Multi-Item Shortage Order Bill</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                  Bulk Sheet Mode
                </span>
              </div>
              <p className="text-xs text-amber-100/80">
                Quickly draft 20–50 market shortage medicines at once, send via WhatsApp, or convert directly to a Purchase Bill.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
              title="Paste text list of 20+ medicines to auto-import"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>Paste Bulk List (20+)</span>
            </button>
            <button
              onClick={handleImportLowStock}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
              title="Auto-fill with all low stock items from inventory"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Import Low Stock</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Distributor & Order Info Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Market Distributor / Wholesale Vendor:
            </label>
            <input
              type="text"
              placeholder="e.g. Metro Pharma / City Distributors"
              value={sharedDistributorName}
              onChange={(e) => setSharedDistributorName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Distributor WhatsApp / Phone Number:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 03001234567"
                value={distributorPhoneInput}
                onChange={(e) => setDistributorPhoneInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              General Note / Market Instruction:
            </label>
            <input
              type="text"
              placeholder="Urgent stock replenishment needed for counter..."
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Multi-Row Grid Table */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100/50 dark:bg-slate-950/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200/80 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="py-2.5 px-3 rounded-l-lg w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Medicine / Item Name *</th>
                <th className="py-2.5 px-3 min-w-[160px]">Generic / Formula</th>
                <th className="py-2.5 px-3 w-20 text-center">In Stock</th>
                <th className="py-2.5 px-3 w-24 text-center">Qty Needed *</th>
                <th className="py-2.5 px-3 w-20">Unit</th>
                <th className="py-2.5 px-3 w-28 text-right">Est. Rate (Rs)</th>
                <th className="py-2.5 px-3 w-28 text-right">Total (Rs)</th>
                <th className="py-2.5 px-3 w-28">Urgency</th>
                <th className="py-2.5 px-3 min-w-[140px]">Customer / Note</th>
                <th className="py-2.5 px-3 rounded-r-lg w-10 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {rows.map((row, index) => {
                const lineTotal = (Number(row.estimatedPrice) || 0) * (Number(row.requestedQty) || 0);
                return (
                  <tr key={row.id} className="hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors">
                    {/* Index */}
                    <td className="py-2 px-3 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>

                    {/* Medicine Name with Datalist Suggestions */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        list="med-suggestions"
                        placeholder="Search or type medicine..."
                        value={row.medicineName}
                        onChange={(e) => handleRowChange(row.id, 'medicineName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                      />
                    </td>

                    {/* Generic Formula */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        placeholder="e.g. Paracetamol"
                        value={row.genericName || ''}
                        onChange={(e) => handleRowChange(row.id, 'genericName', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs"
                      />
                    </td>

                    {/* In Stock */}
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        row.currentStock <= 0 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}>
                        {row.currentStock}
                      </span>
                    </td>

                    {/* Required Qty */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={row.requestedQty}
                        onChange={(e) => handleRowChange(row.id, 'requestedQty', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2 py-1.5 rounded-md border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-slate-100 font-black text-center text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-1.5 px-2">
                      <select
                        value={row.unit || 'Packs'}
                        onChange={(e) => handleRowChange(row.id, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        <option value="Packs">Packs</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Strips">Strips</option>
                        <option value="Bottles">Bottles</option>
                        <option value="Vials">Vials</option>
                        <option value="Units">Units</option>
                      </select>
                    </td>

                    {/* Estimated Unit Rate */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.estimatedPrice || ''}
                        onChange={(e) => handleRowChange(row.id, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-right text-xs"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      Rs {lineTotal.toLocaleString()}
                    </td>

                    {/* Urgency */}
                    <td className="py-1.5 px-2">
                      <select
                        value={row.urgency}
                        onChange={(e) => handleRowChange(row.id, 'urgency', e.target.value)}
                        className={`w-full px-1.5 py-1.5 rounded-md font-bold text-[11px] border ${
                          row.urgency === 'Emergency'
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                            : row.urgency === 'High'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Emergency">🚨 Emergency</option>
                      </select>
                    </td>

                    {/* Customer / Note */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        placeholder="Patient / Shelf note..."
                        value={row.notes || row.customerName || ''}
                        onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[11px]"
                      />
                    </td>

                    {/* Remove button */}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Datalist for Medicine Search Suggestions */}
          <datalist id="med-suggestions">
            {allMedicines.map((m) => (
              <option key={m.id} value={m.name}>
                {m.saltComposition ? `${m.name} (${m.saltComposition})` : m.name}
              </option>
            ))}
          </datalist>

          {/* Add Rows Button Row */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => handleAddRows(1)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ Add 1 Row</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRows(5)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ Add 5 Rows</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRows(10)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ Add 10 Rows (Fast Entry)</span>
            </button>
          </div>
        </div>

        {/* Footer Summary & Action Controls */}
        <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          
          {/* Stats Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-black mr-1.5">Total Items:</span>
              <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{totalItemsCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <span className="text-[10px] uppercase font-black mr-1.5">Required Qty:</span>
              <span className="font-black text-sm">{totalQtyCount} Units</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono">
              <span className="text-[10px] uppercase font-black mr-1.5">Est. Total:</span>
              <span className="font-black text-sm">Rs {totalEstimatedCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Download Excel Sheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppSend}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              title="Send directly to Distributor on WhatsApp"
            >
              <Send className="w-4 h-4 fill-white" />
              <span>WhatsApp Order</span>
            </button>

            <button
              type="button"
              onClick={handleConvertToPurchaseClick}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Convert items to Purchase Order / Bill"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Convert to Purchase</span>
            </button>

            <button
              type="button"
              onClick={handleConvertToSaleClick}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Convert items to Sale Invoice"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Convert to Sale</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Save in Shortage Registry without converting anywhere"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Shortage List Only'}</span>
            </button>
          </div>
        </div>

        {/* Bulk Paste Text Sub-Modal */}
        {isPasteModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[100000] animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Paste Bulk Shortage List (20+ Items)</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Paste medicine names line by line (e.g. "Panadol 10" or "Augmentin 625mg 5")</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <textarea
                  rows={10}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Panadol 10\nArinac 20\nAugmentin 625mg 5\nFlygy 400mg 15\nDisprin 50\nRisek 20mg 10\nBrufen 400mg 30\nCalpol 120mg 8`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Import All Items to Sheet</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
