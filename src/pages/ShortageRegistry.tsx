import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, Plus, Search, Filter, ShoppingBag, 
  CheckCircle2, Clock, Trash2, Edit3, ArrowRight,
  FileSpreadsheet, ExternalLink, RefreshCw, X,
  Building2, User, Phone, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { dbShortageItems, dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../lib/db';
import { ShortageItemRecord, Medicine, Supplier, PurchaseOrder, Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AddPurchaseModal } from '../components/purchases/AddPurchaseModal';
import { AddSaleModal } from '../components/sales/AddSaleModal';
import { MultiItemShortageBillModal } from '../components/shortage/MultiItemShortageBillModal';
import { SmartReorderModal } from '../components/purchases/SmartReorderModal';
import { buildShortageWhatsAppMessage, sendToWhatsApp } from '../lib/whatsappService';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export const ShortageRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, business } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<ShortageItemRecord[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'Emergency' | 'High' | 'Normal'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Ordered' | 'Fulfilled' | 'Cancelled'>('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');

  // Selection for bulk purchase conversion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal States
  const [isSmartReorderModalOpen, setIsSmartReorderModalOpen] = useState(false);
  const [isMultiRowModalOpen, setIsMultiRowModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShortageItemRecord | null>(null);

  // Convert to Purchase Modal state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [initialPurchaseOrder, setInitialPurchaseOrder] = useState<Partial<PurchaseOrder> | null>(null);

  // Convert to Sale Modal state
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [initialSaleInvoice, setInitialSaleInvoice] = useState<Partial<Invoice> | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<ShortageItemRecord>>({
    medicineName: '',
    genericName: '',
    companyName: '',
    requestedQty: 10,
    customerName: '',
    customerPhone: '',
    urgency: 'High',
    status: 'Pending',
    estimatedPrice: 0,
    distributorName: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    const act = searchParams.get('action');
    if (act === 'add_single' || act === 'single') {
      resetForm();
      setEditingItem(null);
      setIsAddModalOpen(true);
    } else if (act === 'add' || act === 'multi') {
      setIsMultiRowModalOpen(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storedItems, storedMeds, storedSupps] = await Promise.all([
        dbShortageItems.getAll(),
        dbMedicines.getAll(),
        dbSuppliers.getAll(),
      ]);

      setItems(storedItems || []);
      setMedicines(storedMeds || []);
      setSuppliers(storedSupps || []);
    } catch (err) {
      console.error('Error loading shortage registry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.genericName && item.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.distributorName && item.distributorName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchUrgency = urgencyFilter === 'ALL' || item.urgency === urgencyFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchSupplier = selectedSupplierFilter === 'ALL' || item.distributorName === selectedSupplierFilter;

      return matchSearch && matchUrgency && matchStatus && matchSupplier;
    }).sort((a, b) => {
      // Emergency first, then High, then Normal
      const urgencyRank: Record<string, number> = { Emergency: 3, High: 2, Normal: 1 };
      const rankA = urgencyRank[a.urgency] || 0;
      const rankB = urgencyRank[b.urgency] || 0;
      if (rankB !== rankA) return rankB - rankA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, searchQuery, urgencyFilter, statusFilter, selectedSupplierFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalRequests = items.length;
    const pendingRequests = items.filter(i => i.status === 'Pending').length;
    const emergencyRequests = items.filter(i => i.urgency === 'Emergency' && i.status === 'Pending').length;
    const convertedFulfilled = items.filter(i => i.status === 'Fulfilled' || i.status === 'Ordered').length;
    const totalEstimatedProcurementCost = items
      .filter(i => i.status === 'Pending')
      .reduce((sum, i) => sum + (i.requestedQty * (i.estimatedPrice || 0)), 0);

    return {
      totalRequests,
      pendingRequests,
      emergencyRequests,
      convertedFulfilled,
      totalEstimatedProcurementCost,
    };
  }, [items]);

  // Handle Save
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName?.trim()) {
      showToast('Please enter a medicine name', 'error');
      return;
    }

    try {
      const recordToSave: ShortageItemRecord = {
        id: editingItem ? editingItem.id : `shortage-${uuidv4().slice(0, 8)}`,
        medicineName: formData.medicineName.trim(),
        genericName: formData.genericName?.trim() || '',
        companyName: formData.companyName?.trim() || '',
        requestedQty: Number(formData.requestedQty) || 1,
        customerName: formData.customerName?.trim() || '',
        customerPhone: formData.customerPhone?.trim() || '',
        urgency: formData.urgency || 'Normal',
        status: formData.status || 'Pending',
        estimatedPrice: Number(formData.estimatedPrice) || 0,
        distributorName: formData.distributorName?.trim() || '',
        notes: formData.notes?.trim() || '',
        recordedBy: editingItem ? editingItem.recordedBy : (currentUser?.name || 'Admin'),
        createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
        fulfilledAt: formData.status === 'Fulfilled' ? new Date().toISOString() : undefined,
      };

      await dbShortageItems.save(recordToSave);
      await loadData();

      // Audit Log (safely handled)
      try {
        await dbAuditLogs.save({
          id: `audit-${uuidv4().slice(0, 8)}`,
          date: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          action: editingItem ? 'UPDATE' : 'CREATE',
          details: `${editingItem ? 'Updated' : 'Added'} Shortage Registry item: ${recordToSave.medicineName} (Qty: ${recordToSave.requestedQty})`,
          userId: currentUser?.id || 'admin',
          notes: `Shortage item: ${recordToSave.medicineName}`,
        });
      } catch (auditErr) {
        console.warn('Non-blocking audit log error:', auditErr);
      }

      setIsAddModalOpen(false);
      setEditingItem(null);
      resetForm();
      showToast(editingItem ? 'Shortage item updated' : 'Medicine added to Shortage Registry', 'success');
    } catch (err) {
      console.error('Error saving shortage item:', err);
      showToast('Failed to save shortage item', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      medicineName: '',
      genericName: '',
      companyName: '',
      requestedQty: 10,
      customerName: '',
      customerPhone: '',
      urgency: 'High',
      status: 'Pending',
      estimatedPrice: 0,
      distributorName: '',
      notes: '',
    });
  };

  const handleEditClick = (item: ShortageItemRecord) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsAddModalOpen(true);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the Shortage Registry?`)) return;
    try {
      await dbShortageItems.delete(id);
      await loadData();
      showToast('Item removed from registry', 'info');
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  // Convert Single or Selected Shortage Items to Purchase Order
  const handleConvertToPurchase = (itemsToConvert: ShortageItemRecord[]) => {
    if (itemsToConvert.length === 0) return;

    // Pick first distributor or default supplier
    const firstSupplierName = itemsToConvert[0]?.distributorName || suppliers[0]?.name || 'Direct Wholesale';
    const supplierObj = suppliers.find(s => s.name.toLowerCase() === firstSupplierName.toLowerCase()) || suppliers[0];

    const draftOrderItems = itemsToConvert.map(item => {
      // Look up matching existing catalog item if any
      const matchedMed = medicines.find(m => m.name.toLowerCase() === item.medicineName.toLowerCase());
      return {
        medicineId: matchedMed?.id || `med-ext-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.medicineName,
        batchNumber: 'NEW',
        expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        quantity: item.requestedQty,
        purchasePrice: item.estimatedPrice || matchedMed?.purchasePrice || 100,
        mrp: (item.estimatedPrice ? item.estimatedPrice * 1.25 : matchedMed?.mrp || 125),
        sellingPrice: (item.estimatedPrice ? item.estimatedPrice * 1.2 : matchedMed?.sellingPrice || 120),
        discountPct: 0,
        taxRate: 0,
        total: (item.requestedQty * (item.estimatedPrice || matchedMed?.purchasePrice || 100)),
      };
    });

    const subTotal = draftOrderItems.reduce((s, i) => s + i.total, 0);

    const draftPO: Partial<PurchaseOrder> = {
      poNumber: `PO-SHORTAGE-${Date.now().toString().slice(-4)}`,
      orderNumber: `PO-SHORTAGE-${Date.now().toString().slice(-4)}`,
      supplierId: supplierObj?.id || 'sup-direct',
      supplierName: supplierObj?.name || firstSupplierName,
      date: new Date().toISOString().slice(0, 10),
      items: draftOrderItems as any,
      subTotal: subTotal,
      totalAmount: subTotal,
      status: 'Pending',
      description: `Generated from Shortage Registry for: ${itemsToConvert.map(i => i.medicineName).join(', ')}`,
      createdAt: new Date().toISOString(),
    };

    setInitialPurchaseOrder(draftPO);
    setPurchaseModalOpen(true);
  };

  // Callback when Purchase is saved successfully
  const handlePurchaseSaved = async (po: PurchaseOrder) => {
    try {
      // Mark converted shortage items as 'Fulfilled' / 'Ordered'
      const targetIds = selectedIds.length > 0 ? selectedIds : items.filter(i => po.description?.includes(i.medicineName)).map(i => i.id);

      for (const id of targetIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          await dbShortageItems.save({
            ...item,
            status: 'Fulfilled',
            fulfilledAt: new Date().toISOString(),
            notes: `${item.notes || ''} [Converted to Purchase #${po.orderNumber || po.poNumber}]`.trim(),
          });
        }
      }

      setPurchaseModalOpen(false);
      setSelectedIds([]);
      await loadData();
      showToast(`Converted to Purchase #${po.orderNumber} and synced with inventory workflow!`, 'success');
    } catch (err) {
      console.error('Error updating shortage items after purchase conversion:', err);
    }
  };

  // Convert Single or Selected Shortage Items to Sale Invoice
  const handleConvertToSale = (itemsToConvert: ShortageItemRecord[]) => {
    if (itemsToConvert.length === 0) return;

    const firstCustName = itemsToConvert[0]?.customerName || 'Walk-in Customer';
    const firstCustPhone = itemsToConvert[0]?.customerPhone || '';

    const draftInvoiceItems = itemsToConvert.map((item, idx) => {
      const matchedMed = medicines.find(m => m.name.toLowerCase() === item.medicineName.toLowerCase());
      const qty = Number(item.requestedQty) || 1;
      const rate = item.estimatedPrice ? Math.round(item.estimatedPrice * 1.2) : (matchedMed?.sellingPrice || 120);

      return {
        id: `inv-item-${idx + 1}`,
        medicineId: matchedMed?.id || `med-ext-${Date.now()}-${idx}`,
        name: item.medicineName,
        genericName: item.genericName || matchedMed?.saltComposition || '',
        batchNumber: matchedMed?.batchNumber || 'MKT-01',
        expiryDate: matchedMed?.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        quantity: qty,
        unit: 'Box',
        pricePerUnit: rate,
        sellingPrice: rate,
        mrp: Math.round(rate * 1.1),
        costPrice: item.estimatedPrice || matchedMed?.purchasePrice || 100,
        discountPercentage: 0,
        taxPercentage: 0,
        total: qty * rate,
      };
    });

    const subTotal = draftInvoiceItems.reduce((s, i) => s + i.total, 0);

    const draftInv: Partial<Invoice> = {
      id: `inv-short-${Date.now()}`,
      invoiceNumber: `INV-SHORT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      customerName: firstCustName,
      customerPhone: firstCustPhone,
      transactionType: 'Sale',
      paymentType: 'Cash',
      items: draftInvoiceItems as any,
      subTotal,
      grandTotal: subTotal,
      receivedAmount: subTotal,
      balanceDue: 0,
      description: `Converted from Shortage Registry for: ${itemsToConvert.map(i => i.medicineName).join(', ')}`,
    };

    setInitialSaleInvoice(draftInv);
    setSaleModalOpen(true);
  };

  const handleSaleSaved = async (inv: Invoice) => {
    try {
      const targetIds = selectedIds.length > 0 ? selectedIds : items.filter(i => inv.description?.includes(i.medicineName)).map(i => i.id);

      for (const id of targetIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          await dbShortageItems.save({
            ...item,
            status: 'Fulfilled',
            fulfilledAt: new Date().toISOString(),
            notes: `${item.notes || ''} [Converted to Sale #${inv.invoiceNumber}]`.trim(),
          });
        }
      }

      setSaleModalOpen(false);
      setSelectedIds([]);
      await loadData();
      showToast(`Converted to Sale Invoice #${inv.invoiceNumber}!`, 'success');
    } catch (err) {
      console.error('Error updating shortage items after sale conversion:', err);
    }
  };

  const handleConvertModalRowsToPurchase = async (rows: any[], distributorName: string, notes: string) => {
    const now = new Date().toISOString();
    const itemsToConvert: ShortageItemRecord[] = rows.map(r => ({
      id: r.id && String(r.id).startsWith('shortage-') ? r.id : `shortage-${uuidv4().slice(0, 8)}`,
      medicineName: r.medicineName.trim(),
      genericName: r.genericName?.trim() || '',
      companyName: '',
      requestedQty: Number(r.requestedQty) || 1,
      customerName: r.customerName?.trim() || '',
      customerPhone: r.customerPhone?.trim() || '',
      urgency: r.urgency || 'High',
      status: 'Pending',
      estimatedPrice: Number(r.estimatedPrice) || 0,
      distributorName: r.distributorName || distributorName || '',
      notes: r.notes || notes,
      recordedBy: currentUser?.name || 'Admin',
      createdAt: now,
    }));

    await Promise.all(itemsToConvert.map(rec => dbShortageItems.save(rec)));

    setIsMultiRowModalOpen(false);
    await loadData();
    handleConvertToPurchase(itemsToConvert);
  };

  const handleConvertModalRowsToSale = async (rows: any[], customerName: string, notes: string) => {
    const now = new Date().toISOString();
    const itemsToConvert: ShortageItemRecord[] = rows.map(r => ({
      id: r.id && String(r.id).startsWith('shortage-') ? r.id : `shortage-${uuidv4().slice(0, 8)}`,
      medicineName: r.medicineName.trim(),
      genericName: r.genericName?.trim() || '',
      companyName: '',
      requestedQty: Number(r.requestedQty) || 1,
      customerName: r.customerName?.trim() || customerName || '',
      customerPhone: r.customerPhone?.trim() || '',
      urgency: r.urgency || 'High',
      status: 'Pending',
      estimatedPrice: Number(r.estimatedPrice) || 0,
      distributorName: r.distributorName || '',
      notes: r.notes || notes,
      recordedBy: currentUser?.name || 'Admin',
      createdAt: now,
    }));

    await Promise.all(itemsToConvert.map(rec => dbShortageItems.save(rec)));

    setIsMultiRowModalOpen(false);
    await loadData();
    handleConvertToSale(itemsToConvert);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      'Sr #': idx + 1,
      'Medicine / Product Name': item.medicineName,
      'Generic Salt Formula': item.genericName || 'N/A',
      'Manufacturer / Brand': item.companyName || 'N/A',
      'Required Qty': item.requestedQty,
      'Urgency': item.urgency,
      'Status': item.status,
      'Est. Unit Cost (Rs)': item.estimatedPrice || 0,
      'Est. Total Cost (Rs)': (item.requestedQty * (item.estimatedPrice || 0)),
      'Distributor / Supplier': item.distributorName || 'Unassigned',
      'Patient / Prescriber': item.customerName || 'N/A',
      'Contact Phone': item.customerPhone || 'N/A',
      'Date Logged': formatDate(item.createdAt),
      'Procurement Notes': item.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shortage_Registry');
    XLSX.writeFile(wb, `Shortage_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Shortage registry exported to Excel', 'success');
  };

  // Toggle Item Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Shortage Registry & Procurement Demands</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Standalone Outside Sourcing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Log unfulfilled patient inquiries, out-of-stock medicines, and outside purchase requests without polluting current stock until converted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={() => {
                  const selectedItemsList = items.filter(i => selectedIds.includes(i.id));
                  const msg = buildShortageWhatsAppMessage({
                    storeName: business?.name || 'MBI Pharmacy',
                    storePhone: business?.phone || '',
                    storeAddress: business?.address || '',
                    date: new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
                    items: selectedItemsList.map(it => ({
                      name: it.medicineName,
                      generic: it.genericName,
                      quantity: it.requestedQty,
                      estimatedPrice: it.estimatedPrice,
                      urgency: it.urgency
                    })),
                    notes: 'Selected urgent shortage list from counter'
                  });
                  sendToWhatsApp('', msg);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer animate-in fade-in"
              >
                <span>WhatsApp Selected ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => handleConvertToPurchase(items.filter(i => selectedIds.includes(i.id)))}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer animate-in fade-in"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Convert Selected ({selectedIds.length}) to Purchase</span>
              </button>
              <button
                onClick={() => handleConvertToSale(items.filter(i => selectedIds.includes(i.id)))}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer animate-in fade-in"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Convert Selected ({selectedIds.length}) to Sale</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsSmartReorderModalOpen(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer animate-pulse"
            title="AI 30-Day Sales Velocity Forecast: 1-Click Auto Re-Order to Supplier"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>⚡ 1-Click Smart Re-Order</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsMultiRowModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>+ Multi-Item Shortage Bill (20+ Items)</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Single Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shortage Requests */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Shortages</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.pendingRequests}</div>
            <span className="text-[11px] text-slate-400">Total logged: {stats.totalRequests} items</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Emergency / Critical Shortages */}
        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Emergency / Critical</span>
            <div className="text-2xl font-black text-rose-800 mt-1">{stats.emergencyRequests}</div>
            <span className="text-[11px] text-rose-600 font-medium">Immediate vendor RFQ required</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Est. Procurement Budget */}
        <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Est. Procurement Cost</span>
            <div className="text-2xl font-black text-amber-900 mt-1">Rs {stats.totalEstimatedProcurementCost.toLocaleString()}</div>
            <span className="text-[11px] text-amber-700">Estimated outside capital</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Converted to Purchase Orders */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Converted to PO</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.convertedFulfilled}</div>
            <span className="text-[11px] text-emerald-600">Integrated with inventory flow</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by medicine name, generic formula, doctor/patient name, distributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Urgencies</option>
            <option value="Emergency">🚨 Emergency Only</option>
            <option value="High">⚠️ High Priority</option>
            <option value="Normal">Normal</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Procurement</option>
            <option value="Ordered">Ordered from Vendor</option>
            <option value="Fulfilled">Fulfilled / Converted</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Supplier / Distributor Filter */}
          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Distributors</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">MEDICINE & GENERIC SALT</th>
                <th className="py-3 px-3">MANUFACTURER / BRAND</th>
                <th className="py-3 px-3 text-center">REQUIRED QTY</th>
                <th className="py-3 px-3 text-center">URGENCY</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-right">EST. UNIT COST</th>
                <th className="py-3 px-3 text-right">TOTAL EST. (RS)</th>
                <th className="py-3 px-3">CUSTOMER / PRESCRIBER</th>
                <th className="py-3 px-3">DISTRIBUTOR</th>
                <th className="py-3 px-3 text-center w-40">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading shortage registry...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No shortage items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50/70 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="py-3 px-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 min-w-[200px]">
                      <span className="font-bold text-slate-900 block text-sm">{item.medicineName}</span>
                      {item.genericName && (
                        <span className="text-[11px] text-purple-700 font-medium block">
                          {item.genericName}
                        </span>
                      )}
                      {item.notes && (
                        <span className="text-[10px] text-slate-400 italic block mt-0.5 line-clamp-1" title={item.notes}>
                          Note: {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.companyName || '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-900 border border-slate-200">
                        {item.requestedQty} Units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {item.urgency === 'Emergency' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-black text-[10px] border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          Emergency
                        </span>
                      )}
                      {item.urgency === 'High' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[10px] border border-amber-300">
                          High Priority
                        </span>
                      )}
                      {item.urgency === 'Normal' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[10px]">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                        item.status === 'Fulfilled' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : item.status === 'Ordered'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : item.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                      Rs {(item.estimatedPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      Rs {(item.requestedQty * (item.estimatedPrice || 0)).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 min-w-[140px]">
                      <span className="font-bold text-slate-800 block">{item.customerName || 'Walk-in Demand'}</span>
                      {item.customerPhone && (
                        <span className="text-[10px] text-slate-400 block font-mono">{item.customerPhone}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 min-w-[140px]">
                      <span className="font-semibold text-slate-700 block">{item.distributorName || 'Unassigned'}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status !== 'Fulfilled' && (
                          <>
                            <button
                              onClick={() => handleConvertToPurchase([item])}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Convert into Purchase Order / Bill"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Purchase</span>
                            </button>
                            <button
                              onClick={() => handleConvertToSale([item])}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Convert into Sale Invoice"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Sale</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit shortage item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.medicineName)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Shortage Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingItem ? 'Edit Shortage Item' : 'Add Medicine to Shortage Registry'}
                </h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Medicine / Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inj. Meropenem 1g / Tab. Jardiance 25mg"
                  value={formData.medicineName || ''}
                  onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Generic Formula (Salt)</label>
                  <input
                    type="text"
                    placeholder="e.g. Meropenem Trihydrate"
                    value={formData.genericName || ''}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Manufacturer / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Pfizer / GSK / Sanofi"
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Required Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requestedQty || 1}
                    onChange={(e) => setFormData({ ...formData, requestedQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Urgency Level</label>
                  <select
                    value={formData.urgency || 'Normal'}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Emergency">🚨 Emergency (OT / ICU)</option>
                    <option value="High">⚠️ High Priority</option>
                    <option value="Normal">Normal Demand</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Est. Unit Price (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={formData.estimatedPrice || 0}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Doctor / Patient / Requester</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Ahmed / ICU Bed 4 / Walk-in"
                    value={formData.customerName || ''}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Requester Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={formData.customerPhone || ''}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Preferred Supplier / Distributor</label>
                  <select
                    value={formData.distributorName || ''}
                    onChange={(e) => setFormData({ ...formData, distributorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">-- Select Distributor --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.category || 'Distributor'})</option>
                    ))}
                    <option value="Direct Wholesale Market">Direct Wholesale Market</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status || 'Pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Pending">Pending Procurement</option>
                    <option value="Ordered">Ordered from Vendor</option>
                    <option value="Fulfilled">Fulfilled / Converted</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Procurement Notes / Specific Packaging</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cold-chain storage required, patient waiting on call."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingItem ? 'Update Shortage Item' : 'Add to Shortage Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Item Shortage Bill Sheet Modal */}
      {isMultiRowModalOpen && (
        <MultiItemShortageBillModal
          isOpen={isMultiRowModalOpen}
          onClose={() => setIsMultiRowModalOpen(false)}
          onSaved={loadData}
          onConvertToPurchase={handleConvertModalRowsToPurchase}
          onConvertToSale={handleConvertModalRowsToSale}
        />
      )}

      {/* 1-Click Smart Auto Re-Order Modal */}
      {isSmartReorderModalOpen && (
        <SmartReorderModal
          isOpen={isSmartReorderModalOpen}
          onClose={() => setIsSmartReorderModalOpen(false)}
          onConvertToPurchaseOrder={(orderDraft) => {
            setInitialPurchaseOrder(orderDraft as any);
            setPurchaseModalOpen(true);
          }}
        />
      )}

      {/* Convert to Purchase Modal */}
      {purchaseModalOpen && initialPurchaseOrder && (
        <AddPurchaseModal
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          initialOrder={initialPurchaseOrder as any}
          transactionType="Purchase Order"
          onSaved={handlePurchaseSaved}
        />
      )}

      {/* Convert to Sale Modal */}
      {saleModalOpen && initialSaleInvoice && (
        <AddSaleModal
          isOpen={saleModalOpen}
          onClose={() => setSaleModalOpen(false)}
          initialInvoice={initialSaleInvoice as any}
          onSaveSuccess={handleSaleSaved}
        />
      )}
    </div>
  );
};
