import React, { useState, useEffect } from 'react';
import { 
  X, Package, TrendingUp, TrendingDown, DollarSign, Calendar, 
  Layers, ShoppingCart, Truck, AlertTriangle, CheckCircle2, 
  Eye, Globe, Barcode, ShieldAlert, FileText, ArrowUpRight, 
  Tag, Clock, RefreshCw, Sparkles, Building2, ChevronRight
} from 'lucide-react';
import { Medicine, Invoice, PurchaseOrder, MedicineBatch } from '../../types';
import { dbInvoices, dbPurchaseOrders, dbMedicines } from '../../lib/db';

interface Product360ModalProps {
  product: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProduct?: (product: Medicine) => void;
}

export const Product360Modal: React.FC<Product360ModalProps> = ({
  product,
  isOpen,
  onClose,
  onEditProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BATCHES' | 'SALES' | 'PURCHASES' | 'ONLINE'>('OVERVIEW');
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadHistory();
    }
  }, [isOpen, product]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [invList, purList] = await Promise.all([
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll(),
      ]);
      setAllInvoices(invList || []);
      setAllPurchases(purList || []);
    } catch (err) {
      console.error('Failed to load 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  // Filter sales involving this product
  const productSales = allInvoices
    .filter(inv => inv.items && inv.items.some(it => it.medicineId === product.id || it.name.toLowerCase() === product.name.toLowerCase()))
    .map(inv => {
      const item = inv.items.find(it => it.medicineId === product.id || it.name.toLowerCase() === product.name.toLowerCase());
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        customerName: inv.customerName,
        quantity: item?.quantity || 0,
        unitPrice: item?.sellingPrice || 0,
        total: item?.total || 0,
        batchNumber: item?.batchNumber || '-',
      };
    });

  // Filter purchases involving this product
  const productPurchases = allPurchases
    .filter(po => po.items && po.items.some(it => it.medicineId === product.id || it.name.toLowerCase() === product.name.toLowerCase()))
    .map(po => {
      const item = po.items.find(it => it.medicineId === product.id || it.name.toLowerCase() === product.name.toLowerCase());
      return {
        poId: po.id,
        poNumber: po.poNumber || po.billNumber || 'PO',
        date: po.date,
        supplierName: po.supplierName || po.partyName || 'Supplier',
        quantity: item?.quantity || 0,
        purchasePrice: item?.purchasePrice || 0,
        total: item?.total || 0,
        batchNumber: item?.batchNumber || '-',
      };
    });

  const totalSoldQty = productSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalSalesRevenue = productSales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchasedQty = productPurchases.reduce((sum, p) => sum + p.quantity, 0);

  // Financial margin calculations
  const costPrice = product.purchasePrice || 0;
  const sellPrice = product.sellingPrice || product.mrp || 0;
  const grossProfitPerUnit = sellPrice - costPrice;
  const profitMarginPercent = sellPrice > 0 ? ((grossProfitPerUnit / sellPrice) * 100).toFixed(1) : '0';
  const markupPercent = costPrice > 0 ? ((grossProfitPerUnit / costPrice) * 100).toFixed(1) : '0';

  // Batches
  const batches: MedicineBatch[] = product.batches && product.batches.length > 0 
    ? product.batches 
    : [{
        id: 'primary-batch',
        medicineId: product.id,
        batchNumber: product.batchNumber || 'MAIN',
        expiryDate: product.expiryDate || 'N/A',
        quantity: product.quantity,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        status: product.stockStatus || 'Available',
      }];

  const isLowStock = product.quantity <= (product.lowStockThreshold || 10);
  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="h-16 bg-slate-900 text-white px-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{product.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOutOfStock 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : isLowStock 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                </span>
                {product.showOnline && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> Online
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Product 360° Intelligence • Barcode: <span className="font-mono text-slate-300">{product.barcode || 'N/A'}</span> • Category: <span className="text-slate-300">{product.category || 'General'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditProduct && (
              <button
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              >
                Edit Item
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center gap-2 shrink-0">
          {[
            { key: 'OVERVIEW', label: '360° Overview', icon: Sparkles },
            { key: 'BATCHES', label: `Batches & Stock (${batches.length})`, icon: Layers },
            { key: 'SALES', label: `Sales History (${productSales.length})`, icon: ShoppingCart },
            { key: 'PURCHASES', label: `Purchase History (${productPurchases.length})`, icon: Truck },
            { key: 'ONLINE', label: 'Online Store Setup', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Quick KPI Stat Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Stock</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{product.quantity}</span>
                    <span className="text-xs font-semibold text-slate-500">{product.unit || 'Units'}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Reorder at:</span>
                    <span className="font-bold text-slate-700">{product.lowStockThreshold || 10}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Margin</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">+{profitMarginPercent}%</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Profit/Unit:</span>
                    <span className="font-bold text-emerald-700">Rs {grossProfitPerUnit.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lifetime Sales</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-600">{totalSoldQty}</span>
                    <span className="text-xs font-semibold text-slate-500">sold</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Revenue:</span>
                    <span className="font-bold text-blue-700">Rs {totalSalesRevenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stock Valuation</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      Rs {((product.quantity || 0) * (product.purchasePrice || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <span>Retail Value:</span>
                    <span className="font-bold text-slate-700">
                      Rs {((product.quantity || 0) * (product.sellingPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Specifications & Pricing Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Core Specifications */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Product Specifications</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Generic Formula</span>
                      <p className="font-bold text-slate-800 truncate">{product.genericName || 'N/A'}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Manufacturer</span>
                      <p className="font-bold text-slate-800 truncate">{product.manufacturer || 'N/A'}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Rack / Shelf / Bin</span>
                      <p className="font-bold text-slate-800">
                        {[product.rackLocation, product.shelfLocation, product.binLocation].filter(Boolean).join(' • ') || 'Unassigned'}
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">HSN / Tax Code</span>
                      <p className="font-bold text-slate-800">{product.hsnCode || 'N/A'} (GST {product.gstPercentage || 0}%)</p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Pricing Economics */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Pricing & Unit Economics</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Cost Price</span>
                      <p className="text-sm font-black text-slate-800 mt-0.5">Rs {product.purchasePrice}</p>
                    </div>
                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-600 uppercase font-semibold">Selling Price</span>
                      <p className="text-sm font-black text-blue-700 mt-0.5">Rs {product.sellingPrice}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">MRP</span>
                      <p className="text-sm font-black text-slate-800 mt-0.5">Rs {product.mrp || product.sellingPrice}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-800">Markup on Cost:</span>
                    <span className="font-black text-emerald-900">{markupPercent}% (Markup) / {profitMarginPercent}% (Gross Margin)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'BATCHES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Inventory Batches</h3>
                  <p className="text-[11px] text-slate-500">FEFO (First-Expiry, First-Out) picking prioritized batches</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Batch No</th>
                      <th className="px-4 py-2.5">Expiry Date</th>
                      <th className="px-4 py-2.5">Quantity</th>
                      <th className="px-4 py-2.5">Cost Price</th>
                      <th className="px-4 py-2.5">Sale Price</th>
                      <th className="px-4 py-2.5">Location</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((batch, idx) => (
                      <tr key={batch.id || idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{batch.batchNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{batch.expiryDate}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{batch.quantity} {product.unit || 'Units'}</td>
                        <td className="px-4 py-3 text-slate-600">Rs {batch.purchasePrice}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">Rs {batch.sellingPrice}</td>
                        <td className="px-4 py-3 text-slate-500">{batch.rackLocation || product.rackLocation || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {batch.status || 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'SALES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Invoices & Outflow</h3>
                  <p className="text-[11px] text-slate-500">Historical customer sales containing this item</p>
                </div>
                <span className="text-xs font-bold text-blue-600">{productSales.length} Total Sales</span>
              </div>

              {productSales.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No sales invoices recorded yet for this product.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Batch</th>
                        <th className="px-4 py-2.5">Quantity</th>
                        <th className="px-4 py-2.5">Unit Rate</th>
                        <th className="px-4 py-2.5">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productSales.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono font-bold text-blue-600">{s.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{s.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{s.customerName}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{s.batchNumber}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{s.quantity}</td>
                          <td className="px-4 py-3 text-slate-700">Rs {s.unitPrice}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">Rs {s.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'PURCHASES' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Purchase Orders & Inflow</h3>
                  <p className="text-[11px] text-slate-500">Historical supplier shipments containing this item</p>
                </div>
                <span className="text-xs font-bold text-purple-600">{productPurchases.length} Total Purchases</span>
              </div>

              {productPurchases.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No supplier purchase bills recorded yet for this product.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">PO / Bill #</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Supplier</th>
                        <th className="px-4 py-2.5">Batch</th>
                        <th className="px-4 py-2.5">Quantity</th>
                        <th className="px-4 py-2.5">Cost Rate</th>
                        <th className="px-4 py-2.5">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productPurchases.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono font-bold text-purple-600">{p.poNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{p.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.supplierName}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{p.batchNumber}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{p.quantity}</td>
                          <td className="px-4 py-3 text-slate-700">Rs {p.purchasePrice}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">Rs {p.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ONLINE' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">E-Commerce & Online Store Status</h3>
                  <p className="text-[11px] text-slate-500">Settings governing online catalog listing and safety rules</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  product.showOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {product.showOnline ? 'Published on Store' : 'Hidden from Online Store'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Online Sale Regulatory Allowed</span>
                  <p className="font-bold text-slate-800 mt-0.5">{product.onlineSaleAllowed !== false ? 'Yes (Permitted)' : 'No (Regulatory Restricted)'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Prescription (Rx) Requirement</span>
                  <p className="font-bold text-slate-800 mt-0.5">{product.requiresPrescription ? 'Required (Upload Rx upon checkout)' : 'Over-the-Counter (OTC)'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cold Chain Storage (2-8°C)</span>
                  <p className="font-bold text-slate-800 mt-0.5">{product.coldChain ? 'Yes (Insulated Courier Only)' : 'Standard Ambient'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Online Price</span>
                  <p className="font-bold text-slate-800 mt-0.5">Rs {product.onlinePrice || product.sellingPrice}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            System ID: <span className="font-mono text-slate-700">{product.id}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Close 360° View
          </button>
        </div>

      </div>
    </div>
  );
};
