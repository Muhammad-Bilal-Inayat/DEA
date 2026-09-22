import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, Phone, Mail, MapPin, Search, Plus, Trash2, Edit, 
  ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Download, Upload, 
  MessageCircle, Printer, BookOpen, ChevronRight, CheckCircle2, 
  AlertTriangle, ShieldCheck, Wallet, RefreshCw, ShoppingCart, 
  Receipt, Landmark, CreditCard, Clock, Filter, Eye, ArrowUpDown, 
  UserCheck, ExternalLink, Copy, Check, Sparkles, ShoppingBag
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Party, Invoice, PurchaseOrder, PartyPayment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { dbSuppliers, dbInvoices, dbPurchaseOrders, dbPartyPayments, dbMedicines } from '../lib/db';
import { AddPartyModal } from '../components/parties/AddPartyModal';
import { ImportPartiesModal } from '../components/parties/ImportPartiesModal';
import { RecordPaymentModal } from '../components/parties/RecordPaymentModal';
import { StatementPrintModal } from '../components/parties/StatementPrintModal';
import { WhatsAppReminderModal } from '../components/parties/WhatsAppReminderModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { InvoicePrintModal } from '../components/sales/InvoicePrintModal';
import { AddSaleModal } from '../components/sales/AddSaleModal';
import { PurchasePrintModal } from '../components/purchases/PurchasePrintModal';
import { AddPurchaseModal } from '../components/purchases/AddPurchaseModal';
import { PaymentVoucherPrintModal } from '../components/common/PaymentVoucherPrintModal';
import { EditPaymentModal } from '../components/parties/EditPaymentModal';
import { BulkEditPartiesModal } from '../components/parties/BulkEditPartiesModal';
import { Layers, CheckSquare, Square } from 'lucide-react';

// Initial Rich Sample Parties for Kot Momin / Sargodha Region
const initialPartiesData: Party[] = [
  {
    id: 'p-1',
    name: 'Saleem Medical Store',
    partyType: 'Customer',
    contactPerson: 'Muhammad Saleem',
    phone: '03216549608',
    email: 'saleemmedstore@gmail.com',
    address: 'Main Bazar, Kot Momin',
    city: 'Kot Momin',
    openingBalance: 45200,
    balance: 109040,
    creditLimit: 200000,
    taxNumber: '4012398-7',
    paymentTerms: 'Net 15',
    bankName: 'Meezan Bank',
    bankAccountTitle: 'Saleem Medical Store',
    bankAccountNumber: 'PK36MEZN0001092837461902',
    notes: 'Regular wholesale buyer for Kot Momin clinics. Prefers Tuesday delivery.',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'p-2',
    name: 'Al-Madina Pharmacy & Surgical',
    partyType: 'Customer',
    contactPerson: 'Hafiz Tariq Mehmood',
    phone: '03009605412',
    email: 'almadinapharmacykm@gmail.com',
    address: 'Station Road, Bhalwal',
    city: 'Bhalwal',
    openingBalance: 12500,
    balance: 38400,
    creditLimit: 100000,
    taxNumber: '3128945-1',
    paymentTerms: 'Due on Receipt',
    bankName: 'Habib Bank Limited',
    bankAccountTitle: 'Al-Madina Pharmacy',
    bankAccountNumber: 'PK09HABB0019283746501928',
    notes: 'Orders antibiotics and surgical gloves every week.',
    createdAt: '2026-08-05T14:20:00Z',
  },
  {
    id: 'p-3',
    name: 'GSK Pakistan Distribution',
    partyType: 'Supplier',
    contactPerson: 'Zubair Qureshi (Area Sales Mgr)',
    phone: '03335128940',
    email: 'orders@gskdistributors.pk',
    address: 'Regional Depot, Industrial Estate, Sargodha',
    city: 'Sargodha',
    openingBalance: -85000,
    balance: -20800,
    creditLimit: 500000,
    taxNumber: '0712948-5',
    paymentTerms: 'Net 30',
    bankName: 'Standard Chartered',
    bankAccountTitle: 'GlaxoSmithKline Dist PK',
    bankAccountNumber: 'PK12SCBL0000982736192837',
    notes: 'Official distributor for Augmentin, Panadol, and Seroxat.',
    createdAt: '2026-08-08T09:15:00Z',
  },
  {
    id: 'p-4',
    name: 'Getz Pharma Distributor',
    partyType: 'Supplier',
    contactPerson: 'Khurram Shehzad',
    phone: '03017482910',
    email: 'khurram@getzpharma.pk',
    address: 'Medicine Market, Katchery Bazar, Sargodha',
    city: 'Sargodha',
    openingBalance: 0,
    balance: -45000,
    creditLimit: 400000,
    taxNumber: '1928374-9',
    paymentTerms: 'Net 15',
    bankName: 'Bank Alfalah',
    bankAccountTitle: 'Getz Distribution Sargodha',
    bankAccountNumber: 'PK45ALFH0001827364519283',
    notes: 'Supplies Risek, Rovista, and Getryl ranges.',
    createdAt: '2026-08-10T11:00:00Z',
  },
  {
    id: 'p-5',
    name: 'Shifa Clinic & Maternity Home',
    partyType: 'Customer',
    contactPerson: 'Dr. Ayesha Siddiqa',
    phone: '03459182736',
    email: 'shifaclinic.km@gmail.com',
    address: 'Hospital Road, Kot Momin',
    city: 'Kot Momin',
    openingBalance: 0,
    balance: 18500,
    creditLimit: 80000,
    taxNumber: '',
    paymentTerms: 'Net 15',
    bankName: '',
    bankAccountTitle: '',
    bankAccountNumber: '',
    notes: 'Clinic orders injectables, IV cannulas, and surgical sutures.',
    createdAt: '2026-08-12T16:45:00Z',
  },
  {
    id: 'p-6',
    name: 'Bayer Pakistan Pharmaceuticals',
    partyType: 'Supplier',
    contactPerson: 'Adnan Liaquat',
    phone: '03126789012',
    email: 'orders@bayerpk.com',
    address: 'Depot #4, Small Industrial Estate, Faisalabad Road, Sargodha',
    city: 'Sargodha',
    openingBalance: 0,
    balance: 0,
    creditLimit: 600000,
    taxNumber: '2847192-3',
    paymentTerms: 'Net 30',
    bankName: 'MCB Bank',
    bankAccountTitle: 'Bayer Pharma Direct',
    bankAccountNumber: 'PK88MUCB0001928374651920',
    notes: 'Direct supplier for Levitra, Ciproxin, and Aspirin Protect.',
    createdAt: '2026-08-15T08:30:00Z',
  },
  {
    id: 'p-7',
    name: 'Rehman Hospital & Surgery',
    partyType: 'Customer',
    contactPerson: 'Dr. Abdul Rehman',
    phone: '03024567890',
    email: 'rehmanhospital@gmail.com',
    address: 'Civil Hospital Road, Sargodha',
    city: 'Sargodha',
    openingBalance: 2500,
    balance: 2500,
    creditLimit: 30000,
    taxNumber: '',
    paymentTerms: 'Due on Receipt',
    notes: 'Surgical supplies, gauze, cotton rolls, and IV sets.',
    createdAt: '2026-08-20T16:00:00Z',
  },
  {
    id: 'p-8',
    name: 'Fateh Pharmacy',
    partyType: 'Customer',
    contactPerson: 'Fateh Ullah',
    phone: '03007654123',
    email: '',
    address: 'Main Bazar, Kot Momin',
    city: 'Kot Momin',
    openingBalance: 0,
    balance: 0,
    creditLimit: 40000,
    taxNumber: '',
    paymentTerms: 'Due on Receipt',
    notes: 'Counter sales, prompt payer.',
    createdAt: '2026-08-25T11:00:00Z',
  },
  {
    id: 'p-9',
    name: 'Fazal Din Pharmacy',
    partyType: 'Customer',
    contactPerson: 'Fazal Din',
    phone: '03224455667',
    email: '',
    address: 'Club Road, Sargodha',
    city: 'Sargodha',
    openingBalance: 0,
    balance: 0,
    creditLimit: 150000,
    taxNumber: '',
    paymentTerms: 'Due on Receipt',
    notes: 'Retail chain customer.',
    createdAt: '2026-08-26T14:30:00Z',
  },
  {
    id: 'p-10',
    name: 'Hamza Hospital & Trauma Center',
    partyType: 'Customer',
    contactPerson: 'Dr. Hamza Ali',
    phone: '03348899001',
    email: 'hamzahospital@gmail.com',
    address: 'University Road, Sargodha',
    city: 'Sargodha',
    openingBalance: 45000,
    balance: 45000,
    creditLimit: 300000,
    taxNumber: '7829103-2',
    paymentTerms: 'Net 30',
    notes: 'Emergency and trauma surgical supplies.',
    createdAt: '2026-08-28T10:00:00Z',
  }
];

// Excel Export Functions
const exportPartiesToExcel = (parties: Party[]) => {
  const data = parties.map(p => ({
    'Party Name': p.name,
    'Party Type': p.partyType || 'Customer',
    'Contact Person': p.contactPerson || '',
    'Phone Number': p.phone || '',
    'Email': p.email || '',
    'City': p.city || '',
    'Full Address': p.address || '',
    'Opening Balance (PKR)': p.openingBalance || 0,
    'Current Balance (PKR)': p.balance ?? p.openingBalance ?? 0,
    'Balance Status': (p.balance ?? p.openingBalance ?? 0) > 0 ? 'To Receive' : (p.balance ?? p.openingBalance ?? 0) < 0 ? 'To Pay' : 'Settled',
    'Credit Limit (PKR)': p.creditLimit || 0,
    'Payment Terms': p.paymentTerms || 'Due on Receipt',
    'GST / NTN': p.taxNumber || '',
    'Bank Name': p.bankName || '',
    'Bank Account Title': p.bankAccountTitle || '',
    'Bank Account / IBAN': p.bankAccountNumber || '',
    'Notes': p.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parties Directory');
  
  worksheet['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 24 },
    { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
    { wch: 28 }, { wch: 30 }
  ];

  XLSX.writeFile(workbook, `MBI_Inventra_Parties_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const downloadPartyTemplateExcel = () => {
  const templateRows = [
    {
      'Party Name': 'Saleem Medical Store (Sample)',
      'Party Type': 'Customer',
      'Contact Person': 'Muhammad Saleem',
      'Phone Number': '03216549608',
      'Email': 'saleem@gmail.com',
      'City': 'Kot Momin',
      'Full Address': 'Main Bazar, Kot Momin',
      'Opening Balance': 45000,
      'Credit Limit': 200000,
      'Payment Terms': 'Net 15',
      'GST / NTN': '4012398-7',
      'Bank Name': 'Meezan Bank',
      'Bank Account Number': 'PK36MEZN0001092837461902',
      'Notes': 'Regular weekly customer'
    },
    {
      'Party Name': 'GSK Distributors (Sample)',
      'Party Type': 'Supplier',
      'Contact Person': 'Zubair Qureshi',
      'Phone Number': '03335128940',
      'Email': 'orders@gsk.pk',
      'City': 'Sargodha',
      'Full Address': 'Depot 12, Industrial Estate',
      'Opening Balance': -20000,
      'Credit Limit': 500000,
      'Payment Terms': 'Net 30',
      'GST / NTN': '0712948-5',
      'Bank Name': 'Standard Chartered',
      'Bank Account Number': 'PK12SCBL0000982736192837',
      'Notes': 'Supplier for Augmentin'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parties Template');
  XLSX.writeFile(workbook, 'Parties_Import_Template.xlsx');
};

export const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { business } = useAuth();
  
  const [parties, setParties] = useState<Party[]>([]);
  const [activePartyId, setActivePartyId] = useState<string>('p-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Customer' | 'Supplier' | 'Receivable' | 'Payable' | 'Settled'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'balance-desc' | 'balance-asc' | 'recent'>('name');
  
  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  // Bulk Edit State
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  const selectedParties = useMemo(() => {
    return parties.filter(p => selectedPartyIds.includes(p.id));
  }, [parties, selectedPartyIds]);

  const handleToggleSelectParty = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPartyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllParties = () => {
    if (selectedPartyIds.length === filteredParties.length) {
      setSelectedPartyIds([]);
    } else {
      setSelectedPartyIds(filteredParties.map(p => p.id));
    }
  };

  // Check URL query parameters (e.g. /parties?action=add or action=transfer)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setEditingParty(null);
      setIsAddModalOpen(true);
    } else if (params.get('action') === 'transfer' || params.get('action') === 'record-payment') {
      setIsRecordPaymentModalOpen(true);
    }
  }, [location.search]);
  
  // Right Workspace Tab
  const [activeRightTab, setActiveRightTab] = useState<'ledger' | 'timeline' | 'sales-returns' | 'payments' | 'items' | 'reminders' | 'bank'>('ledger');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'All' | 'Sale Invoice' | 'Purchase Bill' | 'Payment'>('All');

  // Inlines & Notifications
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);

  // Invoice Actions & Modals
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState<Invoice | null>(null);
  const [isPrintInvoiceModalOpen, setIsPrintInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<Invoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Purchase Order Actions & Modals
  const [selectedPrintPO, setSelectedPrintPO] = useState<PurchaseOrder | null>(null);
  const [isPrintPOModalOpen, setIsPrintPOModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isEditPOModalOpen, setIsEditPOModalOpen] = useState(false);
  const [deleteTargetPO, setDeleteTargetPO] = useState<PurchaseOrder | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);

  // Payment Actions & Modals
  const [selectedPrintPayment, setSelectedPrintPayment] = useState<PartyPayment | null>(null);
  const [isPrintPaymentModalOpen, setIsPrintPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PartyPayment | null>(null);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<PartyPayment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // Inline editing for email & credit limit
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isEditingCreditLimit, setIsEditingCreditLimit] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState('');

  useEffect(() => {
    loadParties();
    const handleSync = () => loadParties();
    window.addEventListener('mbi-data-synced', handleSync);
    window.addEventListener('mbi-local-db-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mbi-data-synced', handleSync);
      window.removeEventListener('mbi-local-db-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const loadParties = async () => {
    try {
      const [storedSuppliers, invData, poData, payData] = await Promise.all([
        dbSuppliers.getAll(),
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll(),
        dbPartyPayments.getAll(),
      ]);

      setInvoices(invData || []);
      setPurchaseOrders(poData || []);
      setPayments(payData || []);

      if (storedSuppliers && storedSuppliers.length > 0) {
        setParties(storedSuppliers as Party[]);
        if (!activePartyId || !storedSuppliers.find(p => p.id === activePartyId)) {
          setActivePartyId(storedSuppliers[0].id);
        }
      } else {
        setParties([]);
        setActivePartyId(null);
      }
    } catch (err) {
      console.error('Failed to load parties:', err);
      setParties([]);
      setActivePartyId(null);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Save Single Party
  const handleSaveParty = async (party: Party) => {
    await dbSuppliers.save(party as any);
    await loadParties();
    setActivePartyId(party.id);
    showToast(`Party "${party.name}" saved successfully.`);
  };

  // Bulk Save from Import
  const handleBulkSaveParties = async (newParties: Party[]) => {
    for (const p of newParties) {
      await dbSuppliers.save(p as any);
    }
    await loadParties();
    if (newParties.length > 0) {
      setActivePartyId(newParties[0].id);
    }
  };

  // Delete Party State
  const [deleteTargetParty, setDeleteTargetParty] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingParty, setIsDeletingParty] = useState(false);

  // Delete Party Trigger
  const handleDeleteParty = (id: string, name: string) => {
    setDeleteTargetParty({ id, name });
  };

  // Confirm Delete Party
  const handleConfirmDeleteParty = async () => {
    if (!deleteTargetParty) return;
    setIsDeletingParty(true);
    try {
      await dbSuppliers.delete(deleteTargetParty.id);
      await loadParties();
      showToast(`Party "${deleteTargetParty.name}" deleted.`);
      setDeleteTargetParty(null);
    } catch (err) {
      console.error('Failed to delete party:', err);
      showToast('Error deleting party.');
    } finally {
      setIsDeletingParty(false);
    }
  };

  // Payment Saved Handler
  const handlePaymentSaved = (payment: PartyPayment, updatedParty: Party) => {
    setPayments(prev => [payment, ...prev]);
    setParties(prev => prev.map(p => p.id === updatedParty.id ? updatedParty : p));
    showToast(`Payment of PKR ${payment.amount.toLocaleString()} recorded for ${updatedParty.name}.`);
  };

  // --- Party-Wise Invoice Action Handlers ---
  const handleViewInvoice = (inv: Invoice) => {
    setSelectedPrintInvoice(inv);
    setIsPrintInvoiceModalOpen(true);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setIsEditInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    setDeleteTargetInvoice(inv);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeletingInvoice(true);
    try {
      // 1. Restore medicine stock if items exist
      if (deleteTargetInvoice.items && deleteTargetInvoice.items.length > 0) {
        const storedMeds = await dbMedicines.getAll();
        for (const item of deleteTargetInvoice.items) {
          const med = storedMeds.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
          if (med) {
            await dbMedicines.save({
              ...med,
              quantity: (med.quantity || 0) + item.quantity,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // 2. Adjust party balance
      const party = parties.find(p => p.id === (deleteTargetInvoice.partyId || activeParty.id) || p.name.toLowerCase() === (deleteTargetInvoice.customerName || '').toLowerCase());
      if (party) {
        const currentBal = party.balance ?? party.openingBalance ?? 0;
        const balanceToDeduct = deleteTargetInvoice.balanceDue ?? (deleteTargetInvoice.grandTotal - (deleteTargetInvoice.receivedAmount || 0));
        await dbSuppliers.save({
          ...party,
          balance: currentBal - balanceToDeduct,
        } as any);
      }

      // 3. Delete from DB
      await dbInvoices.delete(deleteTargetInvoice.id);
      window.dispatchEvent(new Event('mbi-local-db-change'));
      await loadParties();
      showToast(`${deleteTargetInvoice.transactionType || 'Invoice'} #${deleteTargetInvoice.invoiceNumber} deleted successfully.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      showToast('Error deleting invoice.');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  // --- Purchase Order Action Handlers ---
  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPrintPO(po);
    setIsPrintPOModalOpen(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setIsEditPOModalOpen(true);
  };

  const handleDeletePO = (po: PurchaseOrder) => {
    setDeleteTargetPO(po);
  };

  const handleConfirmDeletePO = async () => {
    if (!deleteTargetPO) return;
    setIsDeletingPO(true);
    try {
      // 1. Revert medicine inventory stock
      if (deleteTargetPO.items && deleteTargetPO.items.length > 0) {
        const storedMeds = await dbMedicines.getAll();
        for (const item of deleteTargetPO.items) {
          const med = storedMeds.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
          if (med) {
            await dbMedicines.save({
              ...med,
              quantity: Math.max(0, (med.quantity || 0) - item.quantity),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // 2. Adjust supplier party balance
      const party = parties.find(p => p.id === (deleteTargetPO.supplierId || activeParty.id) || p.name.toLowerCase() === (deleteTargetPO.supplierName || '').toLowerCase());
      if (party) {
        const currentBal = party.balance ?? party.openingBalance ?? 0;
        const balanceToAdjust = deleteTargetPO.balanceDue ?? (deleteTargetPO.totalAmount - (deleteTargetPO.paidAmount || 0));
        await dbSuppliers.save({
          ...party,
          balance: currentBal + balanceToAdjust,
        } as any);
      }

      // 3. Delete from DB
      await dbPurchaseOrders.delete(deleteTargetPO.id);
      window.dispatchEvent(new Event('mbi-local-db-change'));
      await loadParties();
      showToast(`Purchase bill #${deleteTargetPO.billNumber || deleteTargetPO.poNumber} deleted successfully.`);
      setDeleteTargetPO(null);
    } catch (err) {
      console.error('Failed to delete purchase order:', err);
      showToast('Error deleting purchase bill.');
    } finally {
      setIsDeletingPO(false);
    }
  };

  // --- Payment Action Handlers ---
  const handleViewPayment = (payment: PartyPayment) => {
    setSelectedPrintPayment(payment);
    setIsPrintPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: PartyPayment) => {
    setEditingPayment(payment);
    setIsEditPaymentModalOpen(true);
  };

  const handlePaymentUpdated = (updatedPayment: PartyPayment, updatedParty?: Party) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    if (updatedParty) {
      setParties(prev => prev.map(p => p.id === updatedParty.id ? updatedParty : p));
    }
    window.dispatchEvent(new Event('mbi-local-db-change'));
    showToast(`Payment voucher #${updatedPayment.referenceNumber || 'PAY'} updated successfully.`);
  };

  const handleDeletePayment = (payment: PartyPayment) => {
    setDeleteTargetPayment(payment);
  };

  const handleConfirmDeletePayment = async () => {
    if (!deleteTargetPayment) return;
    setIsDeletingPayment(true);
    try {
      const party = parties.find(p => p.id === deleteTargetPayment.partyId);
      if (party) {
        const currentBal = party.balance ?? party.openingBalance ?? 0;
        const newBal = deleteTargetPayment.type === 'PAYMENT_IN'
          ? currentBal + deleteTargetPayment.amount
          : currentBal - deleteTargetPayment.amount;
        await dbSuppliers.save({
          ...party,
          balance: newBal,
        } as any);
      }

      await dbPartyPayments.delete(deleteTargetPayment.id);
      window.dispatchEvent(new Event('mbi-local-db-change'));
      await loadParties();
      showToast(`Payment voucher #${deleteTargetPayment.referenceNumber || 'PAY'} deleted.`);
      setDeleteTargetPayment(null);
    } catch (err) {
      console.error('Failed to delete payment:', err);
      showToast('Error deleting payment.');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  // KPI Calculations across entire roster
  const stats = useMemo(() => {
    let totalReceivables = 0;
    let totalPayables = 0;
    let receivableCount = 0;
    let payableCount = 0;
    let customersCount = 0;
    let suppliersCount = 0;

    parties.forEach(p => {
      const bal = p.balance ?? p.openingBalance ?? 0;
      if (bal > 0) {
        totalReceivables += bal;
        receivableCount++;
      } else if (bal < 0) {
        totalPayables += Math.abs(bal);
        payableCount++;
      }

      if (p.partyType === 'Supplier') {
        suppliersCount++;
      } else {
        customersCount++;
      }
    });

    return {
      totalReceivables,
      totalPayables,
      netBalance: totalReceivables - totalPayables,
      receivableCount,
      payableCount,
      customersCount,
      suppliersCount,
      totalCount: parties.length,
    };
  }, [parties]);

  // Filtered & Sorted Parties List
  const filteredParties = useMemo(() => {
    return parties
      .filter(party => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query || 
          (party.name || '').toLowerCase().includes(query) ||
          (party.phone || '').includes(query) ||
          (party.address || '').toLowerCase().includes(query) ||
          (party.city || '').toLowerCase().includes(query) ||
          (party.contactPerson || '').toLowerCase().includes(query) ||
          (party.taxNumber || '').toLowerCase().includes(query);

        const bal = party.balance ?? party.openingBalance ?? 0;
        let matchesType = true;

        if (typeFilter === 'Customer') matchesType = party.partyType !== 'Supplier';
        else if (typeFilter === 'Supplier') matchesType = party.partyType === 'Supplier';
        else if (typeFilter === 'Receivable') matchesType = bal > 0;
        else if (typeFilter === 'Payable') matchesType = bal < 0;
        else if (typeFilter === 'Settled') matchesType = bal === 0;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const balA = a.balance ?? a.openingBalance ?? 0;
        const balB = b.balance ?? b.openingBalance ?? 0;

        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'balance-desc') return balB - balA;
        if (sortBy === 'balance-asc') return balA - balB;
        if (sortBy === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return 0;
      });
  }, [parties, searchQuery, typeFilter, sortBy]);

  // Infinite/Unlimited Party Capacity Slicing for fast 60fps rendering
  const [partyDisplayLimit, setPartyDisplayLimit] = useState(100);

  useEffect(() => {
    setPartyDisplayLimit(100);
  }, [searchQuery, typeFilter, sortBy]);

  const displayedParties = useMemo(() => {
    return filteredParties.slice(0, partyDisplayLimit);
  }, [filteredParties, partyDisplayLimit]);

  const activeParty = useMemo(() => {
    const foundInFiltered = filteredParties.find(p => p.id === activePartyId);
    if (foundInFiltered) return foundInFiltered;
    if (filteredParties.length > 0) return filteredParties[0];
    return parties.find(p => p.id === activePartyId) || parties[0] || null;
  }, [parties, activePartyId, filteredParties]);

  // Calculate Party transactions (Invoices, POs, Payments)
  const partyInvoices = useMemo(() => {
    if (!activeParty) return [];
    return invoices.filter(inv => 
      inv.partyId === activeParty.id ||
      inv.customerName?.toLowerCase().trim() === activeParty.name?.toLowerCase().trim() ||
      (activeParty.phone && inv.customerPhone === activeParty.phone)
    );
  }, [invoices, activeParty]);

  const partyPOs = useMemo(() => {
    if (!activeParty) return [];
    return purchaseOrders.filter(po =>
      po.supplierId === activeParty.id || po.supplierName?.toLowerCase().trim() === activeParty.name?.toLowerCase().trim()
    );
  }, [purchaseOrders, activeParty]);

  const partyPayments = useMemo(() => {
    if (!activeParty) return [];
    return payments.filter(pay => pay.partyId === activeParty.id);
  }, [payments, activeParty]);

  // Unified Chronological Ledger Entries for Active Party
  interface LedgerEntry {
    id: string;
    date: string;
    type: 'Sale Invoice' | 'Purchase Bill' | 'Payment Received' | 'Payment Paid' | 'Opening Balance';
    refNo: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance?: number;
    rawObj?: any;
  }

  const partyLedger = useMemo(() => {
    if (!activeParty) return [];

    const entries: LedgerEntry[] = [];

    // Opening Balance
    entries.push({
      id: 'opening',
      date: activeParty.createdAt || '2026-08-01T00:00:00Z',
      type: 'Opening Balance',
      refNo: 'OPENING',
      description: 'Initial balance brought forward',
      debit: (activeParty.openingBalance || 0) > 0 ? (activeParty.openingBalance || 0) : 0,
      credit: (activeParty.openingBalance || 0) < 0 ? Math.abs(activeParty.openingBalance || 0) : 0,
    });

    // Invoices
    partyInvoices.forEach(inv => {
      entries.push({
        id: inv.id,
        date: inv.date,
        type: 'Sale Invoice',
        refNo: inv.invoiceNumber,
        description: `${inv.items?.length || 0} product(s) sold via ${inv.paymentMethod}`,
        debit: inv.grandTotal,
        credit: 0,
        rawObj: inv,
      });
    });

    // POs
    partyPOs.forEach(po => {
      entries.push({
        id: po.id,
        date: po.date,
        type: 'Purchase Bill',
        refNo: po.poNumber,
        description: `Purchase order (${po.status})`,
        debit: 0,
        credit: po.totalAmount,
        rawObj: po,
      });
    });

    // Payments
    partyPayments.forEach(pay => {
      if (pay.type === 'PAYMENT_IN') {
        entries.push({
          id: pay.id,
          date: pay.date,
          type: 'Payment Received',
          refNo: pay.referenceNumber || 'PAY-IN',
          description: `${pay.paymentMode}${pay.notes ? ` - ${pay.notes}` : ''}`,
          debit: 0,
          credit: pay.amount,
          rawObj: pay,
        });
      } else {
        entries.push({
          id: pay.id,
          date: pay.date,
          type: 'Payment Paid',
          refNo: pay.referenceNumber || 'PAY-OUT',
          description: `${pay.paymentMode}${pay.notes ? ` - ${pay.notes}` : ''}`,
          debit: pay.amount,
          credit: 0,
          rawObj: pay,
        });
      }
    });

    // Sort chronologically ascending to calculate running balance
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return entries.map(e => {
      running = running + e.debit - e.credit;
      return {
        ...e,
        runningBalance: running,
      };
    }).reverse(); // Display newest first in UI
  }, [activeParty, partyInvoices, partyPOs, partyPayments]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return partyLedger.filter(entry => {
      const matchesSearch = !ledgerSearch || 
        entry.refNo.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        entry.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        entry.type.toLowerCase().includes(ledgerSearch.toLowerCase());

      let matchesType = true;
      if (ledgerTypeFilter === 'Sale Invoice') matchesType = entry.type === 'Sale Invoice';
      else if (ledgerTypeFilter === 'Purchase Bill') matchesType = entry.type === 'Purchase Bill';
      else if (ledgerTypeFilter === 'Payment') matchesType = entry.type === 'Payment Received' || entry.type === 'Payment Paid';

      return matchesSearch && matchesType;
    });
  }, [partyLedger, ledgerSearch, ledgerTypeFilter]);

  // Aggregate Items Transacted for Tab 2
  const transactedItems = useMemo(() => {
    const itemsMap: { [key: string]: { name: string; batch: string; totalQty: number; lastPrice: number; lastDate: string; txCount: number } } = {};

    partyInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const key = item.name.toLowerCase();
        if (!itemsMap[key]) {
          itemsMap[key] = {
            name: item.name,
            batch: item.batchNumber || 'N/A',
            totalQty: item.quantity,
            lastPrice: item.sellingPrice,
            lastDate: inv.date,
            txCount: 1,
          };
        } else {
          itemsMap[key].totalQty += item.quantity;
          itemsMap[key].txCount += 1;
          if (new Date(inv.date) > new Date(itemsMap[key].lastDate)) {
            itemsMap[key].lastDate = inv.date;
            itemsMap[key].lastPrice = item.sellingPrice;
          }
        }
      });
    });

    return Object.values(itemsMap);
  }, [partyInvoices]);

  // Copy phone helper
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Inline update email
  const handleUpdateEmail = async () => {
    if (!activeParty) return;
    const updated = { ...activeParty, email: emailInput.trim() };
    await dbSuppliers.save(updated as any);
    await loadParties();
    setIsEditingEmail(false);
    showToast('Email address updated.');
  };

  // Inline update credit limit
  const handleUpdateCreditLimit = async () => {
    if (!activeParty) return;
    const limit = parseFloat(creditLimitInput) || 0;
    const updated = { ...activeParty, creditLimit: limit };
    await dbSuppliers.save(updated as any);
    await loadParties();
    setIsEditingCreditLimit(false);
    showToast(`Credit limit updated to Rs ${limit.toLocaleString()}`);
  };

  // Credit Limit Calculations for Active Party
  const activeBal = activeParty ? (activeParty.balance ?? activeParty.openingBalance ?? 0) : 0;
  const creditLimit = activeParty?.creditLimit || 0;
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, activeBal) / creditLimit) * 100)) : 0;
  const isCreditExceeded = creditLimit > 0 && activeBal > creditLimit;
  const isCreditWarning = creditLimit > 0 && activeBal >= creditLimit * 0.8 && !isCreditExceeded;

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-full overflow-x-hidden">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header & Fast Action Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Parties & Account Ledgers
            </h1>
            <span className="text-xs font-black bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
              {stats.totalCount} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage Customers, Suppliers, Ledgers (کھاتہ), Credit Limits & Excel / Phone Imports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <button
            onClick={downloadPartyTemplateExcel}
            title="Download blank Excel template for parties"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 px-3 py-2 rounded-xl transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            Template
          </button>

          {/* Export to Excel */}
          <button
            onClick={() => exportPartiesToExcel(parties)}
            title="Export all parties to Excel spreadsheet"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>

          {/* Import Parties */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-800 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Import Contacts
          </button>

          {/* Bulk Edit Parties Button */}
          {selectedPartyIds.length > 0 && (
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 border border-indigo-700 px-3.5 py-2 rounded-xl transition-all shadow-md animate-in fade-in cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedPartyIds.length})</span>
            </button>
          )}

          {/* + Add Party */}
          <button
            onClick={() => { setEditingParty(null); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Party</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Receivables */}
        <div 
          onClick={() => setTypeFilter(typeFilter === 'Receivable' ? 'All' : 'Receivable')}
          className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            typeFilter === 'Receivable' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/30' 
              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Receivables (آپ نے لینا ہے)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              Rs {stats.totalReceivables.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>{stats.receivableCount} parties owe money</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold underline text-[10px]">Filter View →</span>
          </div>
        </div>

        {/* Total Payables */}
        <div 
          onClick={() => setTypeFilter(typeFilter === 'Payable' ? 'All' : 'Payable')}
          className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
            typeFilter === 'Payable' 
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/30' 
              : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Payables (آپ نے دینا ہے)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-400">
              Rs {stats.totalPayables.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>{stats.payableCount} parties to pay</span>
            <span className="text-rose-700 dark:text-rose-400 font-bold underline text-[10px]">Filter View →</span>
          </div>
        </div>

        {/* Net Market Balance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Market Position (نیٹ رقم)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-black font-mono ${
              stats.netBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}>
              Rs {Math.abs(stats.netBalance).toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {stats.netBalance >= 0 ? '(Net Inflow)' : '(Net Outflow)'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Audited against all active accounts</span>
          </div>
        </div>

        {/* Roster Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Roster Composition
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div 
              onClick={() => setTypeFilter('Customer')}
              className="bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 p-1.5 rounded-lg text-center cursor-pointer transition-colors"
            >
              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Customers</span>
              <span className="text-sm font-black text-blue-900 dark:text-blue-100">{stats.customersCount}</span>
            </div>
            <div 
              onClick={() => setTypeFilter('Supplier')}
              className="bg-purple-50/70 dark:bg-purple-950/50 hover:bg-purple-100/70 dark:hover:bg-purple-900/50 p-1.5 rounded-lg text-center cursor-pointer transition-colors"
            >
              <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Suppliers</span>
              <span className="text-sm font-black text-purple-900 dark:text-purple-100">{stats.suppliersCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Dual-Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[660px] w-full max-w-full">
        
        {/* LEFT PANE - PARTIES DIRECTORY */}
        <div className="w-full lg:w-[350px] xl:w-[380px] flex flex-col gap-3 flex-shrink-0 min-w-0">
          
          {/* Prominent Import Box */}
          <div 
            onClick={() => setIsImportModalOpen(true)}
            className="group bg-gradient-to-r from-orange-50/90 to-amber-50/80 dark:from-slate-800 dark:to-slate-850 rounded-2xl border border-orange-200 dark:border-slate-700 p-3.5 shadow-2xs flex items-center justify-between cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-xs transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-amber-600 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  Import Parties
                  <span className="text-[10px] bg-orange-200/90 dark:bg-orange-950/80 text-orange-950 dark:text-orange-300 font-bold px-1.5 py-0.2 rounded">
                    Phone / Excel
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5">
                  Use contacts from your Phone, Gmail or Excel file.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
            {(['All', 'Customer', 'Supplier', 'Receivable', 'Payable', 'Settled'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                  typeFilter === t 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                }`}
              >
                {t === 'All' ? 'All' : t === 'Customer' ? 'Customers' : t === 'Supplier' ? 'Suppliers' : t}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, city..."
                className="w-full pl-9 pr-7 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-2xs" 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
            >
              <option value="name">Sort A-Z</option>
              <option value="balance-desc">Highest Bal</option>
              <option value="balance-asc">Lowest Bal</option>
              <option value="recent">Recent</option>
            </select>
          </div>

          {/* List Header Bar */}
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filteredParties.length > 0 && selectedPartyIds.length === filteredParties.length}
                onChange={handleSelectAllParties}
                className="w-3.5 h-3.5 text-orange-600 rounded border-slate-300 dark:border-slate-600 focus:ring-orange-500 cursor-pointer"
                title="Select All / Deselect All"
              />
              <span>PARTY DIRECTORY ({filteredParties.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedPartyIds.length > 0 && (
                <span className="text-orange-600 dark:text-orange-400 font-bold normal-case text-[10px] bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">
                  {selectedPartyIds.length} selected
                </span>
              )}
              <span className="text-right">BALANCE (PKR)</span>
            </div>
          </div>

          {/* Scrollable Party Cards List */}
          <div 
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) {
                setPartyDisplayLimit(prev => Math.min(filteredParties.length, prev + 100));
              }
            }}
            className="flex-1 overflow-y-auto bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-b-xl shadow-xs max-h-[500px] divide-y divide-slate-100 dark:divide-slate-800"
          >
            {filteredParties.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                No parties match your search or filter criteria.
              </div>
            ) : (
              <>
                {displayedParties.map((party) => {
                  const bal = party.balance ?? party.openingBalance ?? 0;
                  const isSelected = activeParty?.id === party.id;
                  const isChecked = selectedPartyIds.includes(party.id);
                  const initials = party.name.slice(0, 2).toUpperCase();

                  return (
                    <div 
                      key={party.id}
                      onClick={() => setActivePartyId(party.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-all border-l-4 ${
                        isSelected 
                          ? 'bg-orange-50/70 dark:bg-orange-950/40 border-l-orange-500 text-slate-900 dark:text-white shadow-2xs' 
                          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {/* Checkbox for batch operations */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => handleToggleSelectParty(party.id, e)}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-orange-600 rounded border-slate-300 dark:border-slate-600 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                        />

                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] flex-shrink-0 shadow-2xs ${
                          party.partyType === 'Supplier'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {party.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              party.partyType === 'Supplier' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            }`}>
                              {party.partyType || 'Customer'}
                            </span>
                            {party.city && <span className="text-slate-400 dark:text-slate-500">• {party.city}</span>}
                            {party.phone && <span className="font-mono text-slate-400 dark:text-slate-500">• {party.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-black font-mono text-xs ${
                          bal > 0 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : bal < 0 
                              ? 'text-rose-700 dark:text-rose-400' 
                              : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          Rs {Math.abs(bal).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          {bal > 0 ? "You'll Receive" : bal < 0 ? "You'll Pay" : 'Settled'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredParties.length > displayedParties.length && (
                  <div className="p-2.5 text-center bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPartyDisplayLimit(prev => Math.min(filteredParties.length, prev + 100))}
                      className="px-3 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded text-xs font-bold transition cursor-pointer"
                    >
                      Load More (+100)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartyDisplayLimit(filteredParties.length)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                    >
                      All ({filteredParties.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* RIGHT PANE - DEEP ACCOUNT WORKSPACE */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 w-full max-w-full">
          
          {activeParty ? (
            <>
              {/* Executive Top Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 transition-all space-y-4">
                
                {/* Header Row: Party Name & Slider details (Logo removed) */}
                <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {activeParty.name}
                    </h2>
                    {isCreditExceeded && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> Credit Exceeded
                      </span>
                    )}
                  </div>

                  {/* Horizontal Slider Bar for Party Metadata */}
                  <div className="flex items-center gap-2.5 overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin scrollbar-thumb-slate-300">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 flex-shrink-0 shadow-2xs ${
                      activeParty.partyType === 'Supplier' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {activeParty.partyType || 'Customer'}
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 flex-shrink-0 shadow-2xs ${
                      activeBal > 0 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : activeBal < 0 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {activeBal > 0 ? '● To Receive' : activeBal < 0 ? '● To Pay' : '✓ Settled'}
                    </span>

                    {activeParty.contactPerson && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg text-slate-700 text-xs font-semibold flex-shrink-0 border border-slate-200 shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        {activeParty.contactPerson}
                      </span>
                    )}

                    {activeParty.phone && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg font-mono text-slate-700 text-xs font-bold flex-shrink-0 border border-slate-200 shadow-2xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {activeParty.phone}
                      </span>
                    )}

                    {activeParty.city && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg text-slate-600 text-xs font-medium flex-shrink-0 border border-slate-200 shadow-2xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {activeParty.city}
                      </span>
                    )}

                    {activeParty.paymentTerms && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg text-slate-600 text-xs font-medium flex-shrink-0 border border-slate-200 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Terms: <strong className="text-slate-800 font-bold">{activeParty.paymentTerms}</strong>
                      </span>
                    )}

                    {activeParty.ntn && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg text-slate-600 font-mono text-xs flex-shrink-0 border border-slate-200 shadow-2xs">
                        NTN: {activeParty.ntn}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Modern Unified Action Toolbar */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* Primary Action Button: New Sale (Customer) or Create PO (Supplier) */}
                    <button
                      onClick={() => navigate(activeParty.partyType === 'Supplier' ? '/purchase' : '/sale')}
                      className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all active:scale-98 ${
                        activeParty.partyType === 'Supplier'
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
                          : 'bg-[#f97316] hover:bg-orange-600 shadow-orange-100'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> 
                      {activeParty.partyType === 'Supplier' ? 'Create PO' : 'New Sale'}
                    </button>

                    {/* Record Payment Button */}
                    <button
                      onClick={() => setIsRecordPaymentModalOpen(true)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-98 shadow-emerald-100"
                    >
                      <Wallet className="w-4 h-4" />
                      Record Payment
                    </button>

                    {/* WhatsApp Reminder Button */}
                    <button
                      onClick={() => setIsWhatsAppModalOpen(true)}
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                      title="Send automated WhatsApp payment reminder in English & Urdu"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp
                    </button>

                    {/* Print Statement Button */}
                    <button
                      onClick={() => setIsStatementModalOpen(true)}
                      className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                      title="Generate official printable account statement (کھاتہ)"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      Statement
                    </button>
                  </div>

                  {/* Action Icon Group: Edit & Delete */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-2xs">
                    <button
                      onClick={() => { setEditingParty(activeParty); setIsAddModalOpen(true); }}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                      title="Edit party profile"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteParty(activeParty.id, activeParty.name)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete party"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3-Up Executive Financial Health Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
                  
                  {/* Card 1: Balance Status */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-850 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400" />
                        Net Ledger Balance (کھاتہ)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeBal > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : activeBal < 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {activeBal > 0 ? "You'll Receive" : activeBal < 0 ? "You'll Pay" : 'Settled (Nil)'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`font-mono font-black text-2xl ${
                        activeBal > 0 ? 'text-emerald-700 dark:text-emerald-400' : activeBal < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        Rs {Math.abs(activeBal).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Opening: <strong className="text-slate-700 dark:text-slate-200">Rs {Math.abs(activeParty.openingBalance || 0).toLocaleString()}</strong></span>
                      <span className="bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {partyLedger.length - 1} Vouchers
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Credit Utilization Meter */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-850 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        Credit Limit & Risk
                      </span>
                      {creditLimit > 0 ? (
                        <span className="font-mono text-slate-800 dark:text-slate-100 font-black">
                          Rs {creditLimit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">No Limit Set</span>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            isCreditExceeded ? 'bg-rose-600' : isCreditWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${creditLimit > 0 ? creditUsagePercent : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {creditLimit > 0 ? `${creditUsagePercent}% utilized` : 'Set limit to monitor risk'}
                      </span>
                      {isEditingCreditLimit ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={creditLimitInput} 
                            onChange={(e) => setCreditLimitInput(e.target.value)} 
                            placeholder="100000"
                            className="px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded text-xs w-20 font-mono font-bold"
                          />
                          <button onClick={handleUpdateCreditLimit} className="text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 px-1 rounded">✓</button>
                          <button onClick={() => setIsEditingCreditLimit(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded">✕</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setCreditLimitInput(String(activeParty.creditLimit || '')); setIsEditingCreditLimit(true); }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline text-[11px] cursor-pointer"
                        >
                          {creditLimit > 0 ? 'Edit Limit' : '+ Set Limit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Contact & Identifiers */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-850 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between text-xs space-y-2 shadow-2xs">
                    
                    {/* Phone */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{activeParty.phone || 'N/A'}</span>
                        {activeParty.phone && (
                          <button 
                            onClick={() => handleCopyPhone(activeParty.phone!)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                            title="Copy Phone Number"
                          >
                            {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                      </span>
                      {isEditingEmail ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="email" 
                            value={emailInput} 
                            onChange={(e) => setEmailInput(e.target.value)} 
                            placeholder="mail@domain.com"
                            className="px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded text-xs w-32 text-[11px]"
                          />
                          <button onClick={handleUpdateEmail} className="text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 px-1 rounded">✓</button>
                          <button onClick={() => setIsEditingEmail(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded">✕</button>
                        </div>
                      ) : activeParty.email ? (
                        <span 
                          title={activeParty.email}
                          className="text-slate-800 dark:text-slate-100 font-medium truncate max-w-[170px] cursor-help"
                        >
                          {activeParty.email}
                        </span>
                      ) : (
                        <button 
                          onClick={() => { setEmailInput(''); setIsEditingEmail(true); }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline text-[11px] cursor-pointer"
                        >
                          + Add Email
                        </button>
                      )}
                    </div>

                    {/* NTN / GST */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" /> NTN / GST:
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-100 font-bold bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                        {activeParty.taxNumber || 'Unregistered'}
                      </span>
                    </div>

                  </div>

                </div>

              </div>

              {/* Workspace Navigation Tabs */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col overflow-hidden">
                
                {/* Tab Strip */}
                <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850 overflow-x-auto">
                  <div className="flex gap-2 min-w-max pb-1">
                    <button
                      onClick={() => setActiveRightTab('ledger')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'ledger'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-orange-500 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Receipt className="w-4 h-4 text-orange-500" />
                      Ledger ({partyLedger.length})
                    </button>

                    <button
                      onClick={() => setActiveRightTab('timeline')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'timeline'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Timeline
                    </button>

                    <button
                      onClick={() => setActiveRightTab('sales-returns')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'sales-returns'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 text-blue-500" />
                      Sales & Returns ({partyInvoices.length})
                    </button>

                    <button
                      onClick={() => setActiveRightTab('payments')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'payments'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-500" />
                      Payments ({partyPayments.length})
                    </button>

                    <button
                      onClick={() => setActiveRightTab('items')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'items'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-purple-500" />
                      Items ({transactedItems.length})
                    </button>

                    <button
                      onClick={() => setActiveRightTab('reminders')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'reminders'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                      WhatsApp
                    </button>

                    <button
                      onClick={() => setActiveRightTab('bank')}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                        activeRightTab === 'bank'
                          ? 'bg-white text-slate-900 border-orange-500 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900'
                      }`}
                    >
                      <Landmark className="w-4 h-4 text-purple-500" />
                      Bank & Notes
                    </button>
                  </div>

                  {activeRightTab === 'ledger' && (
                    <div className="flex items-center gap-2 pb-2">
                      <button
                        onClick={() => {
                          setEditingInvoice(null);
                          setIsEditInvoiceModalOpen(true);
                        }}
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Create new invoice for this party"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Invoice
                      </button>
                      <button
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB 1 CONTENT: FINANCIAL LEDGER */}
                {activeRightTab === 'ledger' && (
                  <div className="p-4 space-y-3">
                    
                    {/* Filter Ribbon within Ledger */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {(['All', 'Sale Invoice', 'Purchase Bill', 'Payment'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setLedgerTypeFilter(t)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              ledgerTypeFilter === t
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter voucher or ref..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <div className="min-w-[720px]">
                        <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5 px-4 bg-slate-100/90 border-b border-slate-200">
                          <div className="col-span-2">DATE</div>
                          <div className="col-span-3">TYPE & VOUCHER</div>
                          <div className="col-span-2">DESCRIPTION</div>
                          <div className="col-span-2 text-right">DEBIT (+)</div>
                          <div className="col-span-1 text-right">CREDIT (-)</div>
                          <div className="col-span-2 text-center">ACTIONS</div>
                        </div>

                      <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                        {filteredLedger.map((entry) => (
                          <div 
                            key={entry.id} 
                            onDoubleClick={() => {
                              if (entry.type === 'Sale Invoice' && entry.rawObj) {
                                handleViewInvoice(entry.rawObj);
                              } else if (entry.type === 'Purchase Bill' && entry.rawObj) {
                                handleViewPO(entry.rawObj);
                              } else if ((entry.type === 'Payment Received' || entry.type === 'Payment Paid') && entry.rawObj) {
                                handleViewPayment(entry.rawObj);
                              }
                            }}
                            className={`grid grid-cols-12 text-xs py-3 px-4 items-center hover:bg-slate-50 transition-colors ${
                              entry.type === 'Opening Balance' ? 'bg-amber-50/40 font-semibold' : ''
                            } ${entry.rawObj ? 'cursor-pointer' : ''}`}
                            title={entry.type === 'Sale Invoice' || entry.type === 'Purchase Bill' || entry.type === 'Payment Received' || entry.type === 'Payment Paid' ? 'Double-click to preview voucher' : undefined}
                          >
                            {/* Date */}
                            <div className="col-span-2 font-mono text-[11px] text-slate-600">
                              {new Date(entry.date).toLocaleDateString('en-GB')}
                            </div>

                            {/* Type & Voucher */}
                            <div className="col-span-3">
                              <div className="flex items-center gap-1.5">
                                {entry.type === 'Sale Invoice' && <Receipt className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                                {entry.type === 'Purchase Bill' && <ShoppingCart className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                                {entry.type === 'Payment Received' && <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                                {entry.type === 'Payment Paid' && <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                                {entry.type === 'Opening Balance' && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>}
                                <span className={`font-bold ${
                                  entry.type === 'Sale Invoice' ? 'text-blue-700' :
                                  entry.type === 'Purchase Bill' ? 'text-purple-700' :
                                  entry.type === 'Payment Received' ? 'text-emerald-700' :
                                  entry.type === 'Payment Paid' ? 'text-indigo-700' : 'text-amber-900'
                                }`}>
                                  {entry.type}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-500 font-medium">
                                #{entry.refNo}
                              </span>
                            </div>

                            {/* Description */}
                            <div className="col-span-2 text-slate-600 truncate text-[11px]" title={entry.description}>
                              {entry.description}
                            </div>

                            {/* Debit (+) */}
                            <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                              {entry.debit > 0 ? `Rs ${entry.debit.toLocaleString()}` : '-'}
                            </div>

                            {/* Credit (-) */}
                            <div className="col-span-1 text-right font-mono font-bold text-emerald-700">
                              {entry.credit > 0 ? `Rs ${entry.credit.toLocaleString()}` : '-'}
                            </div>

                            {/* Action Buttons */}
                            <div className="col-span-2 flex items-center justify-center gap-1">
                              {entry.type === 'Sale Invoice' && entry.rawObj && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewInvoice(entry.rawObj);
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Preview / Print Invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditInvoice(entry.rawObj);
                                    }}
                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Invoice"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteInvoice(entry.rawObj);
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {entry.type === 'Purchase Bill' && entry.rawObj && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPO(entry.rawObj);
                                    }}
                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                    title="Preview / Print Purchase Bill"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPO(entry.rawObj);
                                    }}
                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Purchase Bill"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePO(entry.rawObj);
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Purchase Bill"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {(entry.type === 'Payment Received' || entry.type === 'Payment Paid') && entry.rawObj && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPayment(entry.rawObj);
                                    }}
                                    className={`p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                                      entry.type === 'Payment Received' ? 'text-emerald-600' : 'text-indigo-600'
                                    }`}
                                    title="Preview / Print Payment Receipt"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPayment(entry.rawObj);
                                    }}
                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Payment Voucher"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePayment(entry.rawObj);
                                    }}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Payment Voucher"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {entry.type === 'Opening Balance' && (
                                <span className="text-[10px] text-slate-400 font-medium">Opening</span>
                              )}
                            </div>

                          </div>
                        ))}

                        {filteredLedger.length === 0 && (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            No ledger entries found matching your filter criteria.
                          </div>
                        )}
                      </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* TAB CONTENT: TRANSACTION TIMELINE */}
                {activeRightTab === 'timeline' && (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Activity & Transaction Timeline</h4>
                        <p className="text-[11px] text-slate-500">Chronological history of invoices, purchases, and payments.</p>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {partyLedger.length} Total Events
                      </span>
                    </div>

                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
                      {partyLedger.map((entry, idx) => (
                        <div key={idx} className="relative group">
                          <span className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs ${
                            entry.type === 'Sale Invoice' ? 'bg-blue-600' :
                            entry.type === 'Purchase Bill' ? 'bg-purple-600' :
                            entry.type === 'Payment Received' ? 'bg-emerald-600' :
                            entry.type === 'Payment Paid' ? 'bg-indigo-600' : 'bg-amber-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div 
                            onDoubleClick={() => {
                              if (entry.type === 'Sale Invoice' && entry.rawObj) handleViewInvoice(entry.rawObj);
                              else if (entry.type === 'Purchase Bill' && entry.rawObj) handleViewPO(entry.rawObj);
                            }}
                            className="bg-slate-50/70 hover:bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
                            title={entry.rawObj ? 'Double-click to view voucher' : undefined}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                {entry.type} <span className="font-mono text-slate-500">#{entry.refNo}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-slate-500">
                                  {new Date(entry.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                {entry.type === 'Sale Invoice' && entry.rawObj && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleViewInvoice(entry.rawObj); }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                      title="Preview Invoice"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleEditInvoice(entry.rawObj); }}
                                      className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                      title="Edit Invoice"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(entry.rawObj); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                      title="Delete Invoice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                {entry.type === 'Purchase Bill' && entry.rawObj && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleViewPO(entry.rawObj); }}
                                      className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                      title="Preview Purchase Bill"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleEditPO(entry.rawObj); }}
                                      className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                      title="Edit Purchase Bill"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeletePO(entry.rawObj); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                      title="Delete Purchase Bill"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                {(entry.type === 'Payment Received' || entry.type === 'Payment Paid') && entry.rawObj && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleViewPayment(entry.rawObj); }}
                                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                        entry.type === 'Payment Received' ? 'text-emerald-600' : 'text-indigo-600'
                                      }`}
                                      title="Preview Payment Voucher"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleEditPayment(entry.rawObj); }}
                                      className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                      title="Edit Payment Voucher"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeletePayment(entry.rawObj); }}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                      title="Delete Payment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{entry.description}</p>
                            <div className="mt-2 flex items-center gap-3 text-[11px] font-mono font-bold">
                              {entry.debit > 0 && <span className="text-slate-900">Debit: Rs {entry.debit.toLocaleString()}</span>}
                              {entry.credit > 0 && <span className="text-emerald-700">Credit: Rs {entry.credit.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: SALES & RETURNS */}
                {activeRightTab === 'sales-returns' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Sales History & Invoices</h4>
                        <p className="text-[11px] text-slate-500">All invoices and orders issued to this party.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                          {partyInvoices.length} Invoices
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInvoice(null);
                            setIsEditInvoiceModalOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Create new invoice for this party"
                        >
                          <Plus className="w-3.5 h-3.5" /> New Invoice
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <div className="min-w-[680px]">
                        <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5 px-4 bg-slate-100/90 border-b border-slate-200">
                          <div className="col-span-2">INVOICE #</div>
                          <div className="col-span-2">DATE</div>
                          <div className="col-span-2 text-center">ITEMS</div>
                          <div className="col-span-2 text-right">AMOUNT</div>
                          <div className="col-span-2 text-center">STATUS</div>
                          <div className="col-span-2 text-center">ACTIONS</div>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                          {partyInvoices.map((inv) => (
                            <div 
                              key={inv.id} 
                              onDoubleClick={() => handleViewInvoice(inv)}
                              className="grid grid-cols-12 text-xs py-3 px-4 items-center hover:bg-blue-50/40 cursor-pointer transition-colors"
                              title="Double-click to preview / print invoice"
                            >
                              <div className="col-span-2 font-mono font-bold text-blue-700">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewInvoice(inv);
                                  }}
                                  className="hover:underline text-left truncate cursor-pointer"
                                >
                                  #{inv.invoiceNumber}
                                </button>
                              </div>
                              <div className="col-span-2 font-mono text-slate-600 text-[11px]">
                                {new Date(inv.date).toLocaleDateString('en-GB')}
                              </div>
                              <div className="col-span-2 text-center font-bold text-slate-800">
                                {inv.items?.length || 0} items
                              </div>
                              <div className="col-span-2 text-right font-mono font-black text-slate-900">
                                Rs {inv.grandTotal.toLocaleString()}
                              </div>
                              <div className="col-span-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  (inv.status === 'Completed' || inv.balanceDue <= 0) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {inv.balanceDue <= 0 ? 'Paid' : (inv.status || 'Pending')}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewInvoice(inv);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                  title="Preview / Print Invoice"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditInvoice(inv);
                                  }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Invoice"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInvoice(inv);
                                  }}
                                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {partyInvoices.length === 0 && (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No sales invoices recorded for this party.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: DEDICATED PAYMENTS */}
                {activeRightTab === 'payments' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">Payment History</h4>
                        <p className="text-[11px] text-slate-500">All cash, bank transfer, and cheque receipts/payments.</p>
                      </div>
                      <button
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <div className="min-w-[650px]">
                        <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5 px-4 bg-slate-100/90 border-b border-slate-200">
                          <div className="col-span-3">DATE & REF</div>
                          <div className="col-span-2">METHOD</div>
                          <div className="col-span-3">NOTES</div>
                          <div className="col-span-2 text-right">AMOUNT</div>
                          <div className="col-span-2 text-center">ACTIONS</div>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                          {partyPayments.map((pay) => (
                            <div key={pay.id} className="grid grid-cols-12 text-xs py-3 px-4 items-center hover:bg-slate-50">
                              <div className="col-span-3">
                                <div className="font-mono font-bold text-slate-900">#{pay.referenceNumber || 'PAY'}</div>
                                <div className="text-[11px] font-mono text-slate-500">{new Date(pay.date).toLocaleDateString('en-GB')}</div>
                              </div>
                              <div className="col-span-2">
                                <span className="bg-slate-200/70 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                                  {pay.method}
                                </span>
                              </div>
                              <div className="col-span-3 text-slate-600 text-[11px] truncate">
                                {pay.notes || 'No notes'}
                              </div>
                              <div className="col-span-2 text-right font-mono font-black text-emerald-700">
                                Rs {pay.amount.toLocaleString()}
                              </div>
                              <div className="col-span-2 flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewPayment(pay)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Preview / Print Payment Receipt"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditPayment(pay)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Payment Voucher"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(pay)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Payment Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {partyPayments.length === 0 && (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No payment vouchers recorded for this party yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2 CONTENT: ITEMS TRANSACTED */}
                {activeRightTab === 'items' && (
                  <div className="p-4 space-y-3">
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-500 py-2.5 px-4 bg-slate-100/90 border-b border-slate-200">
                          <div className="col-span-5">PRODUCT / MEDICINE</div>
                          <div className="col-span-2">BATCH #</div>
                          <div className="col-span-2 text-center">TOTAL UNITS</div>
                          <div className="col-span-3 text-right">LAST UNIT PRICE</div>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                          {transactedItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 text-xs py-3 px-4 items-center hover:bg-slate-50">
                              <div className="col-span-5 font-bold text-slate-900">
                                {item.name}
                              </div>
                              <div className="col-span-2 font-mono text-[11px] text-slate-600">
                                {item.batch}
                              </div>
                              <div className="col-span-2 text-center font-mono font-bold text-slate-800">
                                {item.totalQty} units
                              </div>
                              <div className="col-span-3 text-right font-mono font-bold text-emerald-700">
                                Rs {item.lastPrice.toLocaleString()}
                              </div>
                            </div>
                          ))}

                          {transactedItems.length === 0 && (
                            <div className="py-12 text-center text-slate-400 text-xs">
                              No specific items recorded in sales for this party yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3 CONTENT: WHATSAPP REMINDER */}
                {activeRightTab === 'reminders' && (
                  <div className="p-5 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-700" />
                          Automated WhatsApp Recovery Notice
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Send instant English & Urdu balance reminder to <strong className="font-bold">{activeParty.name}</strong> ({activeParty.phone || 'No phone'})
                        </p>
                      </div>
                      <button
                        onClick={() => setIsWhatsAppModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Template Builder
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* English Preview */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">English Template:</span>
                        <div className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200">
                          Dear {activeParty.contactPerson || activeParty.name},<br/><br/>
                          This is a friendly reminder from {business?.name || 'MBI Inventra'}. Your outstanding ledger balance is <strong className="text-emerald-700">Rs. {Math.abs(activeBal).toLocaleString()}</strong>.<br/><br/>
                          Kindly arrange for payment at your earliest convenience.<br/>
                          Thank you!
                        </div>
                      </div>

                      {/* Urdu Preview */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Urdu Template:</span>
                        <div className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200 text-right" dir="rtl">
                          محترم {activeParty.contactPerson || activeParty.name} صاحب،<br/><br/>
                          {business?.name || 'MBI Inventra'} کی طرف سے آپ کے کھاتے کی بقایا رقم <strong className="text-emerald-700">Rs. {Math.abs(activeBal).toLocaleString()}</strong> ہے۔<br/><br/>
                          برائے مہربانی یہ رقم جلد از جلد ادا فرما دیں۔ شکریہ!
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 4 CONTENT: BANK & NOTES */}
                {activeRightTab === 'bank' && (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Bank Account Info Card */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Landmark className="w-4 h-4 text-purple-600" /> Bank Transfer Details
                        </h4>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bank Name:</span>
                            <span className="font-bold text-slate-900">{activeParty.bankName || 'Not Set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Account Title:</span>
                            <span className="font-bold text-slate-900">{activeParty.bankAccountTitle || 'Not Set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Account / IBAN:</span>
                            <span className="font-mono font-bold text-slate-900">{activeParty.bankAccountNumber || 'Not Set'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes Card */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-amber-600" /> Account Remarks & Notes
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                          {activeParty.notes || 'No custom notes recorded for this party.'}
                        </p>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-base">Select a party to view details</h3>
              <p className="text-xs text-slate-400 mt-1">Or click "+ Add New Party" to register a new account.</p>
            </div>
          )}

        </div>

      </div>

      {/* MODALS */}
      {/* 1. Import Parties Modal */}
      <ImportPartiesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(count) => showToast(`Successfully imported ${count} parties.`)}
        onSaveParties={handleBulkSaveParties}
      />

      {/* 2. Add / Edit Party Modal */}
      <AddPartyModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingParty(null); }}
        onSave={handleSaveParty}
        editingParty={editingParty}
      />

      {/* 3. Record Payment In / Out Modal */}
      {activeParty && (
        <RecordPaymentModal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => setIsRecordPaymentModalOpen(false)}
          party={activeParty}
          onPaymentSaved={handlePaymentSaved}
        />
      )}

      {/* 4. Statement Print Modal */}
      {activeParty && (
        <StatementPrintModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          party={activeParty}
          invoices={partyInvoices}
          purchaseOrders={partyPOs}
          payments={partyPayments}
        />
      )}

      {/* 5. WhatsApp Reminder Generator Modal */}
      {activeParty && (
        <WhatsAppReminderModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          party={activeParty}
        />
      )}

      {/* Confirm Delete Party Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetParty)}
        title="Delete Party Account?"
        message="Are you sure you want to permanently delete this party? All associated ledger data will be archived and this action cannot be undone."
        itemName={deleteTargetParty?.name}
        confirmLabel="Yes, Delete Party"
        isDeleting={isDeletingParty}
        onConfirm={handleConfirmDeleteParty}
        onClose={() => setDeleteTargetParty(null)}
      />

      {/* 6. Invoice Print / Preview Modal */}
      <InvoicePrintModal
        isOpen={isPrintInvoiceModalOpen}
        onClose={() => {
          setIsPrintInvoiceModalOpen(false);
          setSelectedPrintInvoice(null);
        }}
        invoice={selectedPrintInvoice}
      />

      {/* 7. Add / Edit Sale Invoice Modal */}
      <AddSaleModal
        isOpen={isEditInvoiceModalOpen}
        onClose={() => {
          setIsEditInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        initialInvoice={editingInvoice}
        defaultTransactionType={editingInvoice?.transactionType || 'Sale'}
        onSaveSuccess={async (saved) => {
          setIsEditInvoiceModalOpen(false);
          setEditingInvoice(null);
          await loadParties();
          window.dispatchEvent(new Event('mbi-local-db-change'));
          showToast(`Invoice #${saved.invoiceNumber} saved successfully!`);
        }}
      />

      {/* 8. Purchase Order Print / Preview Modal */}
      {selectedPrintPO && (
        <PurchasePrintModal
          isOpen={isPrintPOModalOpen}
          onClose={() => {
            setIsPrintPOModalOpen(false);
            setSelectedPrintPO(null);
          }}
          order={selectedPrintPO}
        />
      )}

      {/* 9. Add / Edit Purchase Order Modal */}
      <AddPurchaseModal
        isOpen={isEditPOModalOpen}
        onClose={() => {
          setIsEditPOModalOpen(false);
          setEditingPO(null);
        }}
        initialOrder={editingPO}
        transactionType="Purchase"
        onSaved={async () => {
          setIsEditPOModalOpen(false);
          setEditingPO(null);
          await loadParties();
          window.dispatchEvent(new Event('mbi-local-db-change'));
          showToast('Purchase bill updated successfully!');
        }}
      />

      {/* Payment Voucher Print Modal */}
      {selectedPrintPayment && (
        <PaymentVoucherPrintModal
          isOpen={isPrintPaymentModalOpen}
          onClose={() => {
            setIsPrintPaymentModalOpen(false);
            setSelectedPrintPayment(null);
          }}
          payment={selectedPrintPayment}
          partyPhone={activeParty?.phone}
          partyAddress={activeParty?.address}
        />
      )}

      {/* Edit Payment Voucher Modal */}
      {editingPayment && (
        <EditPaymentModal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          payment={editingPayment}
          party={activeParty}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      {/* Confirm Delete Invoice Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetInvoice)}
        title="Delete Sale Invoice?"
        message={`Are you sure you want to permanently delete ${deleteTargetInvoice?.transactionType || 'Invoice'} #${deleteTargetInvoice?.invoiceNumber}? Amount: Rs ${deleteTargetInvoice?.grandTotal?.toLocaleString()}. This will restore medicine stock and adjust the party ledger.`}
        itemName={`Invoice #${deleteTargetInvoice?.invoiceNumber}`}
        confirmLabel="Yes, Delete Invoice"
        isDeleting={isDeletingInvoice}
        onConfirm={handleConfirmDeleteInvoice}
        onClose={() => setDeleteTargetInvoice(null)}
      />

      {/* Confirm Delete Purchase Order Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetPO)}
        title="Delete Purchase Bill?"
        message={`Are you sure you want to permanently delete Purchase Bill #${deleteTargetPO?.billNumber || deleteTargetPO?.poNumber}? Amount: Rs ${deleteTargetPO?.totalAmount?.toLocaleString()}. This will revert medicine stock and adjust the supplier ledger.`}
        itemName={`Bill #${deleteTargetPO?.billNumber || deleteTargetPO?.poNumber}`}
        confirmLabel="Yes, Delete Bill"
        isDeleting={isDeletingPO}
        onConfirm={handleConfirmDeletePO}
        onClose={() => setDeleteTargetPO(null)}
      />

      {/* Confirm Delete Payment Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetPayment)}
        title="Delete Payment Voucher?"
        message={`Are you sure you want to delete payment voucher #${deleteTargetPayment?.referenceNumber || 'PAY'} of Rs ${deleteTargetPayment?.amount?.toLocaleString()}? This will update the party balance.`}
        itemName={`Voucher #${deleteTargetPayment?.referenceNumber || 'PAY'}`}
        confirmLabel="Yes, Delete Voucher"
        isDeleting={isDeletingPayment}
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setDeleteTargetPayment(null)}
      />

      {/* Bulk Edit Parties Modal */}
      {isBulkEditModalOpen && selectedParties.length > 0 && (
        <BulkEditPartiesModal
          isOpen={isBulkEditModalOpen}
          onClose={() => {
            setIsBulkEditModalOpen(false);
          }}
          selectedParties={selectedParties}
          onUpdated={async () => {
            await loadParties();
            setSelectedPartyIds([]);
            showToast(`Successfully updated ${selectedParties.length} parties in batch.`);
          }}
        />
      )}

    </div>
  );
};
