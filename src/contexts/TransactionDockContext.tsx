import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Invoice, PurchaseOrder } from '../types';

export type TransactionCategory = 
  | 'Sale' 
  | 'Purchase' 
  | 'Sale Return' 
  | 'Purchase Return' 
  | 'Estimate' 
  | 'Sale Order' 
  | 'Delivery Challan' 
  | 'Purchase Order';

export interface TransactionDraftWindow {
  id: string; // unique draft id e.g. 'sale-draft-1'
  category: TransactionCategory;
  title: string;
  partyName: string;
  amount: number;
  itemCount: number;
  isOpen: boolean;
  isMinimized: boolean;
  createdAt: number;
  initialData?: Invoice | PurchaseOrder | null;
}

interface TransactionDockContextType {
  drafts: TransactionDraftWindow[];
  activeDraftId: string | null;
  openTransaction: (category: TransactionCategory, initialData?: Invoice | PurchaseOrder | null) => string;
  minimizeTransaction: (id: string) => void;
  restoreTransaction: (id: string) => void;
  closeTransaction: (id: string) => void;
  updateDraftSummary: (id: string, summary: { partyName?: string; amount?: number; itemCount?: number; title?: string }) => void;
  isModalOpen: (category: TransactionCategory) => boolean;
}

const TransactionDockContext = createContext<TransactionDockContextType | undefined>(undefined);

export const TransactionDockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [drafts, setDrafts] = useState<TransactionDraftWindow[]>(() => {
    try {
      const saved = sessionStorage.getItem('mbi_minimized_dock_drafts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Sync drafts metadata to sessionStorage
  useEffect(() => {
    try {
      const metadata = drafts.map(d => ({
        id: d.id,
        category: d.category,
        title: d.title,
        partyName: d.partyName,
        amount: d.amount,
        itemCount: d.itemCount,
        isOpen: d.isOpen,
        isMinimized: d.isMinimized,
        createdAt: d.createdAt
      }));
      sessionStorage.setItem('mbi_minimized_dock_drafts', JSON.stringify(metadata));
    } catch {}
  }, [drafts]);

  const openTransaction = useCallback((category: TransactionCategory, initialData?: Invoice | PurchaseOrder | null): string => {
    // Check if there is already an open (unminimized) draft of this exact type
    const existingIndex = drafts.findIndex(d => d.category === category && !d.isMinimized);
    
    if (existingIndex >= 0) {
      const existing = drafts[existingIndex];
      setActiveDraftId(existing.id);
      return existing.id;
    }

    // Check if there is a minimized draft of this type that can be restored, or create new
    const draftId = `${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newDraft: TransactionDraftWindow = {
      id: draftId,
      category,
      title: `${category}`,
      partyName: '',
      amount: 0,
      itemCount: 0,
      isOpen: true,
      isMinimized: false,
      createdAt: Date.now(),
      initialData
    };

    setDrafts(prev => [
      // Minimize any other currently active window so they don't overlap awkwardly
      ...prev.map(d => ({ ...d, isMinimized: true })),
      newDraft
    ]);
    setActiveDraftId(draftId);

    // Broadcast event for audio/visual feedback
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-dock-window-opened', { detail: { id: draftId, category } }));
    }

    return draftId;
  }, [drafts]);

  const minimizeTransaction = useCallback((id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, isMinimized: true } : d));
    setActiveDraftId(prev => prev === id ? null : prev);
  }, []);

  const restoreTransaction = useCallback((id: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, isMinimized: false, isOpen: true };
      }
      // Minimize any other unminimized window to bring selected one to full focus
      return { ...d, isMinimized: true };
    }));
    setActiveDraftId(id);
  }, []);

  const closeTransaction = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    setActiveDraftId(prev => prev === id ? null : prev);
  }, []);

  const updateDraftSummary = useCallback((id: string, summary: { partyName?: string; amount?: number; itemCount?: number; title?: string }) => {
    setDrafts(prev => {
      const target = prev.find(d => d.id === id);
      if (!target) return prev;

      const partySame = summary.partyName === undefined || target.partyName === summary.partyName;
      const amountSame = summary.amount === undefined || target.amount === summary.amount;
      const countSame = summary.itemCount === undefined || target.itemCount === summary.itemCount;
      const titleSame = summary.title === undefined || target.title === summary.title;

      if (partySame && amountSame && countSame && titleSame) {
        return prev;
      }

      return prev.map(d => {
        if (d.id !== id) return d;
        return {
          ...d,
          ...(summary.partyName !== undefined ? { partyName: summary.partyName } : {}),
          ...(summary.amount !== undefined ? { amount: summary.amount } : {}),
          ...(summary.itemCount !== undefined ? { itemCount: summary.itemCount } : {}),
          ...(summary.title !== undefined ? { title: summary.title } : {})
        };
      });
    });
  }, []);

  const isModalOpen = useCallback((category: TransactionCategory): boolean => {
    return drafts.some(d => d.category === category && d.isOpen && !d.isMinimized);
  }, [drafts]);

  return (
    <TransactionDockContext.Provider
      value={{
        drafts,
        activeDraftId,
        openTransaction,
        minimizeTransaction,
        restoreTransaction,
        closeTransaction,
        updateDraftSummary,
        isModalOpen
      }}
    >
      {children}
    </TransactionDockContext.Provider>
  );
};

export const useTransactionDock = () => {
  const context = useContext(TransactionDockContext);
  if (!context) {
    throw new Error('useTransactionDock must be used within a TransactionDockProvider');
  }
  return context;
};
