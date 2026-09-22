import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Plus, Search, CheckCircle2, Clock, 
  Send, Trash2, ShoppingCart, ShoppingBag, Filter, Phone, User, 
  Sparkles, Download, FileText, ArrowRight
} from 'lucide-react';
import { ShortageItemRecord, Supplier, PurchaseOrder, Invoice, Medicine } from '../../types';
import { dbShortageItems, dbSuppliers, dbMedicines } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';
import { sendShortageOrderViaWhatsApp } from '../common/WhatsAppReminders';
import { cn } from '../../lib/utils';
import { AddPurchaseModal } from '../purchases/AddPurchaseModal';
import { AddSaleModal } from '../sales/AddSaleModal';
import { MultiItemShortageBillModal } from '../shortage/MultiItemShortageBillModal';

export const ShortageBookTab: React.FC = () => {
  const { business, activeRole } = useAuth();
  const [items, setItems] = useState<ShortageItemRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Ordered' | 'Fulfilled'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMultiRowModalOpen, setIsMultiRowModalOpen] = useState(false);
  
  // Conversion Modal States
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [initialPurchaseOrder, setInitialPurchaseOrder] = useState<Partial<PurchaseOrder> | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [initialSaleInvoice, setInitialSaleInvoice] = useState<Partial<Invoice> | null>(null);

  const [selectedItemsForOrder, setSelectedItemsForOrder] = useState<string[]>([]);
  const [selectedDistributorPhone, setSelectedDistributorPhone] = useState('');
  const [selectedDistributorName, setSelectedDistributorName] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<ShortageItemRecord>>({
    medicineName: '',
    genericName: '',
    companyName: '',
    requestedQty: 1,
    customerName: '',
    customerPhone: '',
    urgency: 'Normal',
    estimatedPrice: 0,
    distributorName: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allShortages, allSupps, allMeds] = await Promise.all([
        dbShortageItems.getAll(),
        dbSuppliers.getAll(),
        dbMedicines.getAll()
      ]);
      setItems(allShortages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSuppliers(allSupps.filter(s => s.partyType === 'Supplier'));
      setMedicines(allMeds);
    } catch (e) {
      console.error('Error loading shortages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToPurchase = (itemsToConvert: ShortageItemRecord[]) => {
    if (itemsToConvert.length === 0) return;
    const firstSupplierName = itemsToConvert[0]?.distributorName || suppliers[0]?.name || 'Direct Wholesale';
    const supplierObj = suppliers.find(s => s.name.toLowerCase() === firstSupplierName.toLowerCase()) || suppliers[0];

    const draftOrderItems = itemsToConvert.map(item => {
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

  const handlePurchaseSaved = async (po: PurchaseOrder) => {
    try {
      const targetIds = items.filter(i => po.description?.includes(i.medicineName)).map(i => i.id);
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
      await loadData();
    } catch (err) {
      console.error('Error updating shortage items:', err);
    }
  };

  const handleConvertToSale = (itemsToConvert: ShortageItemRecord[]) => {
    if (itemsToConvert.length === 0) return;
    const firstCustName = itemsToConvert[0]?.customerName || 'Walk-in Customer';

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
      customerPhone: itemsToConvert[0]?.customerPhone || '',
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
      const targetIds = items.filter(i => inv.description?.includes(i.medicineName)).map(i => i.id);
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
      await loadData();
    } catch (err) {
      console.error('Error updating shortage items:', err);
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
      recordedBy: 'Admin',
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
      recordedBy: 'Admin',
      createdAt: now,
    }));

    await Promise.all(itemsToConvert.map(rec => dbShortageItems.save(rec)));

    setIsMultiRowModalOpen(false);
    await loadData();
    handleConvertToSale(itemsToConvert);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName?.trim()) {
      alert('Please enter medicine name');
      return;
    }

    const newRecord: ShortageItemRecord = {
      id: `short-${Date.now()}`,
      medicineName: formData.medicineName.trim(),
      genericName: formData.genericName?.trim() || '',
      companyName: formData.companyName?.trim() || '',
      requestedQty: Number(formData.requestedQty) || 1,
      customerName: formData.customerName?.trim() || 'Walk-in Customer',
      customerPhone: formData.customerPhone?.trim() || '',
      urgency: formData.urgency || 'Normal',
      status: 'Pending',
      estimatedPrice: Number(formData.estimatedPrice) || 0,
      distributorName: formData.distributorName || '',
      notes: formData.notes?.trim() || '',
      recordedBy: activeRole,
      createdAt: new Date().toISOString()
    };

    await dbShortageItems.save(newRecord);
    setIsAddModalOpen(false);
    setFormData({
      medicineName: '',
      genericName: '',
      companyName: '',
      requestedQty: 1,
      customerName: '',
      customerPhone: '',
      urgency: 'Normal',
      estimatedPrice: 0,
      distributorName: '',
      notes: ''
    });
    await loadData();
  };

  const handleUpdateStatus = async (item: ShortageItemRecord, newStatus: ShortageItemRecord['status']) => {
    const updated: ShortageItemRecord = {
      ...item,
      status: newStatus,
      fulfilledAt: newStatus === 'Fulfilled' ? new Date().toISOString() : item.fulfilledAt
    };
    await dbShortageItems.save(updated);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this shortage entry?')) {
      await dbShortageItems.delete(id);
      await loadData();
    }
  };

  const toggleSelectForOrder = (id: string) => {
    setSelectedItemsForOrder(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSendWhatsAppOrder = () => {
    const orderItems = items.filter(it => selectedItemsForOrder.includes(it.id));
    if (orderItems.length === 0) {
      alert('Please select at least one item to send to distributor.');
      return;
    }

    sendShortageOrderViaWhatsApp({
      distributorName: selectedDistributorName || 'Distributor / Supplier',
      distributorPhone: selectedDistributorPhone,
      pharmacyName: business?.name || '3 Pharma',
      items: orderItems.map(it => ({
        name: `${it.medicineName} ${it.companyName ? `(${it.companyName})` : ''}`,
        qty: it.requestedQty,
        urgency: it.urgency
      }))
    });
  };

  // Filtered Items
  const filteredItems = items.filter(it => {
    const matchesSearch = 
      it.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.genericName && it.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (it.customerName && it.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (it.companyName && it.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || it.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingItems = items.filter(i => i.status === 'Pending');
  const emergencyItems = items.filter(i => i.urgency === 'Emergency' && i.status === 'Pending');
  const totalLostSalesValue = items
    .filter(i => i.status !== 'Fulfilled' && i.estimatedPrice)
    .reduce((sum, i) => sum + ((i.estimatedPrice || 0) * i.requestedQty), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Demands</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{items.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendingItems.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">🚨 Emergency Short</p>
            <p className="text-2xl font-black text-red-700 mt-1">{emergencyItems.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lost Demand Value</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">Rs. {totalLostSalesValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicine, customer name, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['All', 'Pending', 'Ordered', 'Fulfilled'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer",
                  statusFilter === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMultiRowModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>+ Multi-Item Shortage Bill (20+ Items)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Short Medicine</span>
            </button>
          </div>
        </div>

        {/* Bulk WhatsApp Order To Distributor Tool */}
        {selectedItemsForOrder.length > 0 && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                {selectedItemsForOrder.length}
              </span>
              <span className="text-xs font-bold text-emerald-900">
                Items selected to dispatch as Purchase Order
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDistributorPhone}
                onChange={(e) => {
                  setSelectedDistributorPhone(e.target.value);
                  const supp = suppliers.find(s => s.phone === e.target.value);
                  setSelectedDistributorName(supp ? supp.name : '');
                }}
                className="text-xs bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 sm:flex-initial"
              >
                <option value="">-- Choose Distributor --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.phone}>
                    {s.name} ({s.phone || 'No phone'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSendWhatsAppOrder}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send via WhatsApp (Free)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table of Shortage Items */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedItemsForOrder.length > 0 && selectedItemsForOrder.length === filteredItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItemsForOrder(filteredItems.map(i => i.id));
                      } else {
                        setSelectedItemsForOrder([]);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-3">Medicine & Salt</th>
                <th className="p-3">Qty Demanded</th>
                <th className="p-3">Customer / Phone</th>
                <th className="p-3">Urgency</th>
                <th className="p-3">Distributor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading shortage items...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <p className="font-bold text-slate-600">No shortage records found</p>
                    <p className="text-[11px] mt-1">When customers demand medicines out-of-stock, add them here to track lost demand!</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedItemsForOrder.includes(item.id)}
                        onChange={() => toggleSelectForOrder(item.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.medicineName}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.genericName ? `Salt: ${item.genericName}` : ''} {item.companyName ? `• ${item.companyName}` : ''}
                      </p>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {item.requestedQty} Packs
                      {item.estimatedPrice ? (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ~Rs. {(item.estimatedPrice * item.requestedQty).toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{item.customerName || 'Walk-in'}</p>
                      {item.customerPhone ? (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {item.customerPhone}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        item.urgency === 'Emergency' ? "bg-red-100 text-red-700 animate-pulse" :
                        item.urgency === 'High' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {item.urgency}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.distributorName || 'Any Vendor'}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                        item.status === 'Fulfilled' ? "bg-emerald-100 text-emerald-800" :
                        item.status === 'Ordered' ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConvertToPurchase([item])}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="Convert to Purchase Order / Bill"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Purchase</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConvertToSale([item])}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="Convert to Sale Invoice"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Sale</span>
                        </button>

                        {item.status !== 'Fulfilled' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'Fulfilled')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-1"
                            title="Mark as Arrived / Fulfilled"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Fulfilled</span>
                          </button>
                        ) : null}

                        {item.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item, 'Ordered')}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold"
                            title="Mark as Ordered"
                          >
                            Ordered
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
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

      {/* Add Shortage Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Out-of-Stock Demand</h3>
                  <p className="text-[11px] text-slate-500">Add medicine customer requested that is short in stock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Augmentin 625mg, Panadol CF, Xanax 0.5mg"
                  value={formData.medicineName}
                  onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic / Formula</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin + Clavulanic"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. GSK, Getz, Searle"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity Needed (Packs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requestedQty}
                    onChange={(e) => setFormData({ ...formData, requestedQty: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency Level</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="Normal">Normal Demand</option>
                    <option value="High">High Demand</option>
                    <option value="Emergency">🚨 Emergency (Patient waiting)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer name (optional)"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="03001234567"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Unit Price (Rs.)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={formData.estimatedPrice || ''}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Distributor</label>
                  <select
                    value={formData.distributorName}
                    onChange={(e) => setFormData({ ...formData, distributorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Any Vendor / Distributor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Customer needs this by evening"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Short Item</span>
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
