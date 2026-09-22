import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  MessageSquare, 
  ShieldCheck, 
  Trash2, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Key, 
  FileText, 
  Image as ImageIcon,
  ExternalLink,
  DollarSign,
  Copy,
  Check,
  PlusCircle,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { 
  getCheckoutOrders, 
  updateOrderStatus, 
  deleteCheckoutOrder, 
  removeOrderScreenshot,
  createTestCheckoutOrder,
  resetCheckoutOrdersToDefault,
  clearAllCheckoutOrders,
  CheckoutOrder,
  PAYMENT_ACCOUNTS 
} from '../../lib/checkoutOrderService';

export const CheckoutOrdersManagerPanel: React.FC = () => {
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-app modal confirmation states (replaces iframe-blocked window.confirm)
  const [orderToDelete, setOrderToDelete] = useState<CheckoutOrder | null>(null);
  const [orderToApprove, setOrderToApprove] = useState<CheckoutOrder | null>(null);
  const [orderToReject, setOrderToReject] = useState<CheckoutOrder | null>(null);
  const [orderToRemoveSS, setOrderToRemoveSS] = useState<CheckoutOrder | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const refreshOrders = () => {
    setOrders(getCheckoutOrders());
  };

  useEffect(() => {
    refreshOrders();

    const handleUpdated = () => refreshOrders();
    window.addEventListener('mbi_checkout_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('mbi_checkout_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const executeApprove = (order: CheckoutOrder) => {
    const updated = updateOrderStatus(order.id, 'approved');
    refreshOrders();
    setOrderToApprove(null);
    if (updated) {
      showToast(`Order approved! License generated: ${updated.licenseKeyGenerated}`);
      
      // Open WhatsApp confirmation with details pre-filled
      const text = encodeURIComponent(
        `🎉 *MBI Inventra Software Order Approved!*\n\n` +
        `Dear *${order.ownerName}*,\n` +
        `Your subscription payment for *${order.businessName}* has been verified!\n\n` +
        `*Plan:* ${order.planName}\n` +
        `*License Key:* ${updated.licenseKeyGenerated}\n` +
        `*Login Username:* ${order.username}\n\n` +
        `You can now sign in to your workspace at: ${window.location.origin}/login\n\n` +
        `Need help? Contact M.Bilal Inayat support on WhatsApp anytime.`
      );
      try {
        window.open(`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
      } catch {}
    }
  };

  const executeReject = (order: CheckoutOrder) => {
    updateOrderStatus(order.id, 'rejected');
    refreshOrders();
    setOrderToReject(null);
    showToast(`Order ${order.id} marked as Rejected.`);
  };

  const executeDelete = (order: CheckoutOrder) => {
    const success = deleteCheckoutOrder(order.id);
    refreshOrders();
    setOrderToDelete(null);
    if (success) {
      showToast(`Order ${order.id} for "${order.businessName}" deleted successfully.`);
    } else {
      showToast(`Order record deleted.`);
    }
  };

  const executeRemoveScreenshot = (order: CheckoutOrder) => {
    removeOrderScreenshot(order.id);
    refreshOrders();
    setOrderToRemoveSS(null);
    showToast(`Payment screenshot removed for order ${order.id}.`);
  };

  const handleCreateTestOrder = () => {
    const newOrd = createTestCheckoutOrder();
    refreshOrders();
    showToast(`Sample test checkout order created: ${newOrd.id}`);
  };

  const handleResetDemo = () => {
    resetCheckoutOrdersToDefault();
    refreshOrders();
    showToast('Reset sample checkout orders to default demo data.');
  };

  const handleClearAll = () => {
    clearAllCheckoutOrders();
    refreshOrders();
    setShowClearAllModal(false);
    showToast('All checkout orders deleted.');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.whatsapp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.trxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const approvedCount = orders.filter(o => o.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">Software Checkout Orders & Payments</h2>
          </div>
          <p className="text-xs text-slate-400">
            Review incoming software subscription purchases, verify uploaded payment screenshots (SS), and auto-activate customer licenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCreateTestOrder}
            className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Create a sample checkout order with mock payment proof to test"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Test Order</span>
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Reset to default orders"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClearAllModal(true)}
            className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Clear all orders"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <a
            href="/checkout"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Preview Live /checkout Page</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Pending Verification</div>
            <div className="text-2xl font-black text-amber-400 font-mono">{pendingCount} Orders</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Approved Subscriptions</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{approvedCount} Orders</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Total Revenue Collected</div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              Rs. {orders.filter(o => o.status === 'approved').reduce((acc, curr) => acc + curr.amountRupees, 0).toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by business, owner, TRX ID or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-slate-600" />
            <div className="font-bold text-sm text-slate-300">No Checkout Orders Found</div>
            <p className="text-xs">Incoming software subscription purchases will appear here for review.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id}
              className={`p-6 rounded-3xl border transition-all space-y-4 ${
                order.status === 'pending'
                  ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : order.status === 'approved'
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-950/60 border-rose-900/40 opacity-75'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {order.id}
                    </span>

                    {order.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        Pending SS Verification
                      </span>
                    )}

                    {order.status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved & Active
                      </span>
                    )}

                    {order.status === 'rejected' && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white flex items-center gap-2 pt-1">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span>{order.businessName}</span>
                    <span className="text-xs font-bold text-slate-400">({order.city})</span>
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      Rs. {order.amountRupees.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {order.planName} ({order.billingInterval})
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Customer Details */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Customer Details</span>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{order.ownerName}</div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <a href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300 font-mono">
                        {order.whatsapp}
                      </a>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{order.email}</span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Requested User: <strong className="text-white font-mono">{order.username}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Payment & TRX Details */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payment Information</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-300 font-bold">Method: <span className="text-emerald-400">{order.paymentMethod}</span></div>
                    <div className="text-slate-400 font-mono">TRX ID: <strong className="text-white">{order.trxId}</strong></div>
                    {order.notes && (
                      <div className="text-[11px] text-slate-400 italic bg-slate-900 p-2 rounded-lg border border-slate-800 mt-1">
                        "{order.notes}"
                      </div>
                    )}
                    {order.licenseKeyGenerated && (
                      <div className="pt-2 text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>License: {order.licenseKeyGenerated}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screenshot (SS) Proof Preview */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Payment Screenshot (SS)</span>
                  </div>

                  {order.paymentScreenshot ? (
                    <div className="flex items-center gap-3">
                      <img 
                        src={order.paymentScreenshot} 
                        alt="Payment Proof Screenshot" 
                        className="w-20 h-16 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0 cursor-pointer hover:scale-105 transition-all shadow-md"
                        onClick={() => setSelectedScreenshot(order.paymentScreenshot)}
                      />
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshot(order.paymentScreenshot)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full SS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderToRemoveSS(order)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                          title="Remove attached payment screenshot"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete SS</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-[11px]">No screenshot attached</div>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${order.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.ownerName}, regarding your MBI Inventra checkout order ${order.id}...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contact via WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setOrderToReject(order)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                      >
                        Reject Order
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderToApprove(order)}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>APPROVE & ACTIVATE SOFTWARE</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setOrderToDelete(order)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 transition-all cursor-pointer"
                    title="Delete order record permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 1. Modal: Confirm Delete Order */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Order Record</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Order ID:</span>
                <span className="font-mono text-white font-bold">{orderToDelete.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Business Name:</span>
                <span className="text-white font-bold">{orderToDelete.businessName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Plan & Amount:</span>
                <span className="text-emerald-400 font-bold">{orderToDelete.planName} • Rs. {orderToDelete.amountRupees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Trx ID:</span>
                <span className="font-mono text-amber-300">{orderToDelete.trxId}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(orderToDelete)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Confirm Approve Order */}
      {orderToApprove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Approve Subscription Order</h3>
                <p className="text-xs text-slate-400">Generate valid license key & activate tenant.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Client Store:</span>
                <span className="text-white font-bold">{orderToApprove.businessName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Owner:</span>
                <span className="text-white font-bold">{orderToApprove.ownerName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Selected Plan:</span>
                <span className="text-emerald-400 font-bold">{orderToApprove.planName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method & TRX:</span>
                <span className="text-amber-300 font-mono">{orderToApprove.paymentMethod} • {orderToApprove.trxId}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToApprove(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeApprove(orderToApprove)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Activate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Confirm Reject Order */}
      {orderToReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reject Payment Proof</h3>
                <p className="text-xs text-slate-400">Mark this transaction as rejected/unverified.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to mark order <strong className="text-white">{orderToReject.id}</strong> ({orderToReject.businessName}) as rejected?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeReject(orderToReject)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-all cursor-pointer"
              >
                Mark as Rejected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Confirm Remove Screenshot (SS) */}
      {orderToRemoveSS && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Remove Payment Screenshot</h3>
                <p className="text-xs text-slate-400">Detaches the uploaded image proof from order.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Remove the payment proof screenshot from order <strong className="text-white">{orderToRemoveSS.id}</strong> ({orderToRemoveSS.businessName})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToRemoveSS(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRemoveScreenshot(orderToRemoveSS)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete SS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Confirm Clear All Orders */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Clear All Checkout Orders</h3>
                <p className="text-xs text-slate-400">Permanently remove all order records.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              This will remove all <strong className="text-white">{orders.length} order records</strong> from the local database. You can restore sample demo orders at any time using the &quot;Reset Demo&quot; button.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Clear All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-black text-white text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <span>Payment Screenshot (SS) Proof</span>
              </div>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black border border-slate-800 flex items-center justify-center p-2">
              <img 
                src={selectedScreenshot} 
                alt="Enlarged Payment Proof" 
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
