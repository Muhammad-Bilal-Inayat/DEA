import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { getMultiCurrencySettings } from './currencyManager';

export function formatCurrency(amount: number, currencyCode?: string) {
  try {
    const config = getMultiCurrencySettings();
    const targetCode = (currencyCode || config.baseCurrency || 'PKR').toUpperCase();
    const curr = config.currencies.find(c => c.code.toUpperCase() === targetCode);
    const symbol = curr?.symbol || (targetCode === 'PKR' ? 'Rs.' : targetCode);
    
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

    return `${symbol} ${formatted}`;
  } catch {
    return `Rs. ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

