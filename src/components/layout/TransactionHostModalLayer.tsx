import React, { useCallback } from 'react';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { AddSaleModal } from '../sales/AddSaleModal';
import { AddPurchaseModal } from '../purchases/AddPurchaseModal';
import { Invoice, PurchaseOrder } from '../../types';

export const TransactionHostModalLayer: React.FC = () => {
  const { 
    drafts, 
    minimizeTransaction, 
    restoreTransaction, 
    closeTransaction, 
    updateDraftSummary 
  } = useTransactionDock();

  const handleSaleSaved = useCallback((draftId: string, savedInvoice: Invoice) => {
    closeTransaction(draftId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mbi-local-db-change'));
      window.dispatchEvent(new CustomEvent('mbi-transaction-saved', { detail: { type: 'sale', invoice: savedInvoice } }));
    }
  }, [closeTransaction]);

  const handlePurchaseSaved = useCallback((draftId: string, savedOrder?: PurchaseOrder) => {
    closeTransaction(draftId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mbi-local-db-change'));
      window.dispatchEvent(new CustomEvent('mbi-transaction-saved', { detail: { type: 'purchase', order: savedOrder } }));
    }
  }, [closeTransaction]);

  const handleMinimizeToggle = useCallback((draftId: string, minimized: boolean) => {
    if (minimized) {
      minimizeTransaction(draftId);
    } else {
      restoreTransaction(draftId);
    }
  }, [minimizeTransaction, restoreTransaction]);

  const handleSummaryUpdate = useCallback((draftId: string, summary: any) => {
    updateDraftSummary(draftId, summary);
  }, [updateDraftSummary]);

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div id="mbi-transaction-host-modals" className="pointer-events-auto">
      {drafts.map((draft) => {
        const isSaleCategory = 
          draft.category === 'Sale' || 
          draft.category === 'Sale Return' || 
          draft.category === 'Estimate' || 
          draft.category === 'Sale Order' || 
          draft.category === 'Delivery Challan';

        const isPurchaseCategory = 
          draft.category === 'Purchase' || 
          draft.category === 'Purchase Return' || 
          draft.category === 'Purchase Order';

        if (isSaleCategory) {
          return (
            <AddSaleModal
              key={draft.id}
              isOpen={draft.isOpen}
              isDockMinimized={draft.isMinimized}
              dockDraftId={draft.id}
              defaultTransactionType={draft.category as any}
              initialInvoice={draft.initialData as Invoice || null}
              onClose={() => closeTransaction(draft.id)}
              onSaveSuccess={(inv) => handleSaleSaved(draft.id, inv)}
              onMinimizeChange={(minimized) => handleMinimizeToggle(draft.id, minimized)}
              onSummaryChange={(summary) => handleSummaryUpdate(draft.id, summary)}
            />
          );
        }

        if (isPurchaseCategory) {
          return (
            <AddPurchaseModal
              key={draft.id}
              isOpen={draft.isOpen}
              isDockMinimized={draft.isMinimized}
              dockDraftId={draft.id}
              transactionType={draft.category as any}
              initialOrder={draft.initialData as PurchaseOrder || null}
              onClose={() => closeTransaction(draft.id)}
              onSaved={(ord) => handlePurchaseSaved(draft.id, ord)}
              onMinimizeChange={(minimized) => handleMinimizeToggle(draft.id, minimized)}
              onSummaryChange={(summary) => handleSummaryUpdate(draft.id, summary)}
            />
          );
        }

        return null;
      })}
    </div>
  );
};
