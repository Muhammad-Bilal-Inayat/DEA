import { ExpenseCategory, ExpenseItemMaster } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-petrol', name: 'Petrol', type: 'Direct Expense', isDefault: true, description: 'Fuel for delivery bikes, staff conveyance, generator' },
  { id: 'cat-rent', name: 'Rent', type: 'Indirect Expense', isDefault: true, description: 'Shop and godown monthly rent' },
  { id: 'cat-salary', name: 'Salary', type: 'Indirect Expense', isDefault: true, description: 'Staff, pharmacist, and helper monthly salaries' },
  { id: 'cat-tea', name: 'Tea', type: 'Direct Expense', isDefault: true, description: 'Daily tea, biscuits, snacks for staff and visitors' },
  { id: 'cat-transport', name: 'Transport', type: 'Direct Expense', isDefault: true, description: 'Medicine cartage, rickshaw fare, courier shipping' },
  { id: 'cat-electricity', name: 'Electricity', type: 'Indirect Expense', isDefault: true, description: 'Monthly electricity and power utility bills' },
  { id: 'cat-stationery', name: 'Printing & Stationery', type: 'Direct Expense', isDefault: true, description: 'POS thermal rolls, invoice books, markers, packaging tape' },
  { id: 'cat-staff-welfare', name: 'Staff Welfare', type: 'Indirect Expense', isDefault: true, description: 'Medical aid, staff food, incentives & bonuses' },
  { id: 'cat-maintenance', name: 'Maintenance & Repairs', type: 'Indirect Expense', isDefault: true, description: 'AC servicing, electrical, fridge & shop repair' },
  { id: 'cat-marketing', name: 'Marketing & Promo', type: 'Indirect Expense', isDefault: true, description: 'Doctor gifts, pharmacy promotional flyers, branding' },
  { id: 'cat-packaging', name: 'Packaging Bags', type: 'Direct Expense', isDefault: true, description: 'Printed pharmacy shopper bags and medicine envelopes' },
  { id: 'cat-misc', name: 'Miscellaneous', type: 'Indirect Expense', isDefault: true, description: 'General sundry and petty cash expenses' },
];

export const DEFAULT_EXPENSE_ITEMS: ExpenseItemMaster[] = [
  { id: 'item-petrol-bike', name: 'Petrol - Delivery Bike', category: 'Petrol', defaultPrice: 280, unit: 'LTR' },
  { id: 'item-petrol-gen', name: 'Generator Petrol / Fuel', category: 'Petrol', defaultPrice: 280, unit: 'LTR' },
  { id: 'item-tea-daily', name: 'Daily Chai & Biscuits', category: 'Tea', defaultPrice: 60, unit: 'CUP' },
  { id: 'item-mineral-water', name: 'Mineral Water Can 19L', category: 'Tea', defaultPrice: 150, unit: 'CAN' },
  { id: 'item-rent-shop', name: 'Pharmacy Shop Monthly Rent', category: 'Rent', defaultPrice: 50000, unit: 'MONTH' },
  { id: 'item-rent-godown', name: 'Medicine Godown Rent', category: 'Rent', defaultPrice: 25000, unit: 'MONTH' },
  { id: 'item-sal-pharmacist', name: 'Pharmacist Salary', category: 'Salary', defaultPrice: 35000, unit: 'MONTH' },
  { id: 'item-sal-salesman', name: 'Counter Salesman Salary', category: 'Salary', defaultPrice: 25000, unit: 'MONTH' },
  { id: 'item-sal-helper', name: 'Helper / Cleaner Wages', category: 'Salary', defaultPrice: 18000, unit: 'MONTH' },
  { id: 'item-trans-rickshaw', name: 'Medicine Delivery Rickshaw Fare', category: 'Transport', defaultPrice: 300, unit: 'TRIP' },
  { id: 'item-trans-courier', name: 'TCS / Leopards Courier Charges', category: 'Transport', defaultPrice: 450, unit: 'PARCEL' },
  { id: 'item-elec-bill', name: 'Shop Electricity Bill', category: 'Electricity', defaultPrice: 12000, unit: 'BILL' },
  { id: 'item-paper-roll', name: '80mm Thermal Receipt Rolls (Pack of 10)', category: 'Printing & Stationery', defaultPrice: 1200, unit: 'PACK' },
  { id: 'item-shopper-bags', name: 'Pharmacy Printed Plastic Bags (10 KG)', category: 'Packaging Bags', defaultPrice: 3500, unit: 'BAG' },
];

const CATEGORIES_KEY = 'pharma_custom_expense_categories';
const ITEMS_KEY = 'pharma_custom_expense_items';

export function getStoredCategories(): ExpenseCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
      return DEFAULT_EXPENSE_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

export function saveStoredCategories(categories: ExpenseCategory[]) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

export function getStoredExpenseItems(): ExpenseItemMaster[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(DEFAULT_EXPENSE_ITEMS));
      return DEFAULT_EXPENSE_ITEMS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_EXPENSE_ITEMS;
  }
}

export function saveStoredExpenseItems(items: ExpenseItemMaster[]) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save expense items', e);
  }
}
