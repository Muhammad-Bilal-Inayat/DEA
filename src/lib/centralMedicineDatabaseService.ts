import { v4 as uuidv4 } from 'uuid';
import { CentralMedicine, MedicineAssignmentRecord, CentralMedicineAuditLog, Medicine } from '../types';
import { INITIAL_CENTRAL_MEDICINE_CATALOG } from '../data/centralMedicinePresets';
import { dbMedicines, getCurrentBusinessContext } from './db';
import { getAllTenants, getMasterActiveUsers } from './masterServerService';

const CENTRAL_MEDICINE_DB_STORAGE_KEY = 'mbi_central_medicine_database_v3';
const CENTRAL_ASSIGNMENTS_STORAGE_KEY = 'mbi_central_medicine_assignments_v3';
const CENTRAL_AUDIT_STORAGE_KEY = 'mbi_central_medicine_audit_v3';

// Clean string normalizer for duplicate prevention
export function normalizeMedicineKey(name: string, brandOrCompany?: string): string {
  const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanBrand = (brandOrCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}__${cleanBrand}`;
}

/**
 * Fetch all Central Medicine Catalog records
 */
export function getCentralMedicines(): CentralMedicine[] {
  try {
    const raw = localStorage.getItem(CENTRAL_MEDICINE_DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load central medicine database from storage:', e);
  }

  // Seed default presets
  localStorage.setItem(CENTRAL_MEDICINE_DB_STORAGE_KEY, JSON.stringify(INITIAL_CENTRAL_MEDICINE_CATALOG));
  return INITIAL_CENTRAL_MEDICINE_CATALOG;
}

/**
 * Save updated list of central medicines
 */
export function saveCentralMedicinesList(list: CentralMedicine[]): void {
  try {
    localStorage.setItem(CENTRAL_MEDICINE_DB_STORAGE_KEY, JSON.stringify(list));
    // Trigger sync with server backend
    fetch('/api/central-medicines/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicines: list })
    }).catch(() => {
      // Offline / server detached fallback
    });
    window.dispatchEvent(new CustomEvent('mbi-central-medicines-updated', { detail: { count: list.length } }));
  } catch (e) {
    console.error('Error saving central medicines list:', e);
  }
}

/**
 * Fetch all Central Medicine Assignment Records
 */
export function getCentralMedicineAssignments(): MedicineAssignmentRecord[] {
  try {
    const raw = localStorage.getItem(CENTRAL_ASSIGNMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * Save assignments
 */
export function saveCentralAssignmentsList(list: MedicineAssignmentRecord[]): void {
  try {
    localStorage.setItem(CENTRAL_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('mbi-central-assignments-updated', { detail: { count: list.length } }));
  } catch (e) {}
}

/**
 * Log an audit event for Central Medicine operations
 */
export function logCentralMedicineAudit(params: {
  action: CentralMedicineAuditLog['action'];
  description: string;
  performedBy?: string;
  affectedCount?: number;
  tenantId?: string;
  tenantName?: string;
  details?: Record<string, any>;
}): void {
  try {
    const raw = localStorage.getItem(CENTRAL_AUDIT_STORAGE_KEY);
    const logs: CentralMedicineAuditLog[] = raw ? JSON.parse(raw) : [];

    const newLog: CentralMedicineAuditLog = {
      id: 'cmed_aud_' + uuidv4().replace(/-/g, '').substring(0, 10),
      timestamp: new Date().toISOString(),
      action: params.action,
      description: params.description,
      performedBy: params.performedBy || 'Master Admin',
      affectedCount: params.affectedCount || 1,
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      details: params.details
    };

    logs.unshift(newLog);
    // Keep last 500 audit logs
    const trimmed = logs.slice(0, 500);
    localStorage.setItem(CENTRAL_AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('mbi-central-audit-updated', { detail: newLog }));
  } catch (e) {}
}

/**
 * Get all audit logs
 */
export function getCentralMedicineAuditLogs(): CentralMedicineAuditLog[] {
  try {
    const raw = localStorage.getItem(CENTRAL_AUDIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Extract distinct categories with statistics
 */
export function getCentralCategoriesSummary(): {
  category: string;
  totalItems: number;
  assignedItems: number;
  unassignedItems: number;
  companiesCount: number;
}[] {
  const list = getCentralMedicines();
  const map = new Map<string, { total: number; assigned: number; companies: Set<string> }>();

  for (const item of list) {
    const cat = item.category?.trim() || 'General Pharmacy';
    if (!map.has(cat)) {
      map.set(cat, { total: 0, assigned: 0, companies: new Set() });
    }
    const stat = map.get(cat)!;
    stat.total++;
    if (item.assignedTenantIds && item.assignedTenantIds.length > 0) {
      stat.assigned++;
    }
    if (item.company || item.brandName) {
      stat.companies.add(item.company || item.brandName || '');
    }
  }

  return Array.from(map.entries())
    .map(([category, data]) => ({
      category,
      totalItems: data.total,
      assignedItems: data.assigned,
      unassignedItems: data.total - data.assigned,
      companiesCount: data.companies.size
    }))
    .sort((a, b) => b.totalItems - a.totalItems);
}

/**
 * Get all customers/tenants with their assigned medicine summary
 */
export function getCustomerAssignmentSummaries(): {
  tenantId: string;
  name: string;
  businessName: string;
  phone?: string;
  assignedCount: number;
  assignedCategories: string[];
}[] {
  const tenants = getAllTenants();
  const allAssignments = getCentralMedicineAssignments();
  const centralMeds = getCentralMedicines();
  const medMap = new Map<string, CentralMedicine>(centralMeds.map(m => [m.id, m]));

  return tenants.map(t => {
    const tenantId = t.tenantId || t.id;
    const tenantAssignments = allAssignments.filter(a => a.tenantId === tenantId);
    
    // Also check direct assignedTenantIds in central meds
    const directAssigned = centralMeds.filter(m => m.assignedTenantIds?.includes(tenantId));
    const allAssignedIds = new Set([
      ...tenantAssignments.map(a => a.medicineId),
      ...directAssigned.map(m => m.id)
    ]);

    const categories = new Set<string>();
    for (const id of allAssignedIds) {
      const med = medMap.get(id);
      if (med?.category) categories.add(med.category);
    }

    return {
      tenantId,
      name: t.name || (t as any).storeName || 'Pharmacy Client',
      businessName: (t as any).businessName || (t as any).storeName || t.name || 'Store',
      phone: (t as any).phone || (t as any).ownerPhone,
      assignedCount: allAssignedIds.size,
      assignedCategories: Array.from(categories)
    };
  });
}

/**
 * Add or Update Central Medicine (Master Only)
 */
export function saveCentralMedicineRecord(data: Partial<CentralMedicine> & { name: string; category: string }): {
  success: boolean;
  item: CentralMedicine;
  isNew: boolean;
  message: string;
} {
  const list = getCentralMedicines();
  const now = new Date().toISOString();
  const key = normalizeMedicineKey(data.name, data.company || data.brandName);

  const existingIdx = data.id 
    ? list.findIndex(m => m.id === data.id)
    : list.findIndex(m => normalizeMedicineKey(m.name, m.company || m.brandName) === key);

  if (existingIdx >= 0) {
    const updated: CentralMedicine = {
      ...list[existingIdx],
      ...data,
      updatedAt: now
    };
    list[existingIdx] = updated;
    saveCentralMedicinesList(list);

    logCentralMedicineAudit({
      action: 'EDIT_RECORD',
      description: `Updated central medicine: ${updated.name} (${updated.category})`,
      details: { id: updated.id, name: updated.name }
    });

    return {
      success: true,
      item: updated,
      isNew: false,
      message: `Medicine "${updated.name}" successfully updated.`
    };
  }

  // Create new
  const newItem: CentralMedicine = {
    id: data.id || ('cmed_' + uuidv4().replace(/-/g, '').substring(0, 10)),
    name: data.name.trim(),
    brandName: data.brandName?.trim(),
    genericName: data.genericName?.trim(),
    company: data.company?.trim(),
    category: data.category?.trim() || 'General Pharmacy',
    dosageForm: data.dosageForm || 'Tablet',
    strength: data.strength || '',
    unit: data.unit || 'Strip',
    source: data.source || 'MASTER_MANUAL',
    assignedTenantIds: data.assignedTenantIds || [],
    assignedCustomerNames: data.assignedCustomerNames || [],
    createdAt: now,
    updatedAt: now
  };

  list.unshift(newItem);
  saveCentralMedicinesList(list);

  logCentralMedicineAudit({
    action: 'ADD_RECORD',
    description: `Added new central medicine: ${newItem.name} (${newItem.category})`,
    details: { id: newItem.id, name: newItem.name }
  });

  return {
    success: true,
    item: newItem,
    isNew: true,
    message: `Medicine "${newItem.name}" added to centralized database.`
  };
}

/**
 * Delete Central Medicine (Master Only with double confirmation)
 */
export function deleteCentralMedicineRecord(id: string, confirmedName: string): {
  success: boolean;
  message: string;
} {
  const list = getCentralMedicines();
  const target = list.find(m => m.id === id);

  if (!target) {
    return { success: false, message: 'Record not found.' };
  }

  if (confirmedName.trim().toLowerCase() !== target.name.trim().toLowerCase()) {
    return { success: false, message: 'Confirmation name does not match medicine name.' };
  }

  const updatedList = list.filter(m => m.id !== id);
  saveCentralMedicinesList(updatedList);

  // Clean up assignments
  const assignments = getCentralMedicineAssignments().filter(a => a.medicineId !== id);
  saveCentralAssignmentsList(assignments);

  logCentralMedicineAudit({
    action: 'DELETE_RECORD',
    description: `Deleted central medicine: ${target.name} [ID: ${id}]`,
    details: { id, name: target.name, category: target.category }
  });

  return {
    success: true,
    message: `Medicine "${target.name}" has been permanently deleted from central database.`
  };
}

/**
 * Shift/Move medicines between categories
 */
export function shiftMedicinesCategory(medicineIds: string[], targetCategory: string): {
  success: boolean;
  movedCount: number;
  message: string;
} {
  if (!targetCategory || medicineIds.length === 0) {
    return { success: false, movedCount: 0, message: 'Target category and medicine IDs required.' };
  }

  const list = getCentralMedicines();
  let count = 0;
  const now = new Date().toISOString();

  const updatedList = list.map(item => {
    if (medicineIds.includes(item.id)) {
      count++;
      return {
        ...item,
        category: targetCategory.trim(),
        updatedAt: now
      };
    }
    return item;
  });

  saveCentralMedicinesList(updatedList);

  logCentralMedicineAudit({
    action: 'SHIFT_CATEGORY',
    description: `Moved ${count} medicines to category "${targetCategory}"`,
    affectedCount: count,
    details: { targetCategory, medicineIds }
  });

  return {
    success: true,
    movedCount: count,
    message: `Successfully shifted ${count} medicines to category "${targetCategory}".`
  };
}

/**
 * Assign individual medicines to a customer/tenant
 */
export async function assignMedicinesToCustomer(params: {
  tenantId: string;
  tenantName: string;
  medicineIds: string[];
  initialStock?: number;
  adminName?: string;
}): Promise<{
  success: boolean;
  assignedCount: number;
  message: string;
}> {
  const { tenantId, tenantName, medicineIds, initialStock = 20, adminName = 'Master Admin' } = params;

  if (!tenantId || medicineIds.length === 0) {
    return { success: false, assignedCount: 0, message: 'Tenant and medicine selections are required.' };
  }

  const list = getCentralMedicines();
  const assignments = getCentralMedicineAssignments();
  const now = new Date().toISOString();
  let assignedCount = 0;

  const targetMeds = list.filter(m => medicineIds.includes(m.id));

  // Update central medicine assignedTenantIds
  const updatedCentralList = list.map(item => {
    if (medicineIds.includes(item.id)) {
      const assigned = item.assignedTenantIds || [];
      const names = item.assignedCustomerNames || [];
      if (!assigned.includes(tenantId)) {
        assignedCount++;
        return {
          ...item,
          assignedTenantIds: [...assigned, tenantId],
          assignedCustomerNames: names.includes(tenantName) ? names : [...names, tenantName],
          updatedAt: now
        };
      }
    }
    return item;
  });

  saveCentralMedicinesList(updatedCentralList);

  // Record assignments
  const newAssignments: MedicineAssignmentRecord[] = [];
  for (const med of targetMeds) {
    const exists = assignments.some(a => a.tenantId === tenantId && a.medicineId === med.id);
    if (!exists) {
      newAssignments.push({
        id: 'cassign_' + uuidv4().replace(/-/g, '').substring(0, 10),
        tenantId,
        tenantName,
        medicineId: med.id,
        medicineName: med.name,
        category: med.category,
        brandName: med.brandName,
        company: med.company,
        assignedAt: now,
        assignedBy: adminName,
        initialStock
      });
    }
  }

  if (newAssignments.length > 0) {
    saveCentralAssignmentsList([...newAssignments, ...assignments]);
  }

  // Provision into client inventory database if initial stock is requested
  try {
    for (const med of targetMeds) {
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2);
      const batchNumber = 'BAT-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

      const clientMedicine: Medicine = {
        id: 'med_' + uuidv4().replace(/-/g, '').substring(0, 10),
        tenantId,
        name: med.name,
        genericName: med.genericName || med.name,
        brandName: med.brandName || med.company,
        dosageForm: (med.dosageForm as any) || 'Tablet',
        strength: med.strength || '',
        category: med.category,
        manufacturer: med.company || med.brandName || 'Standard Pharma',
        salePrice: 100,
        purchasePrice: 80,
        mrp: 100,
        sellingPrice: 100,
        quantity: initialStock,
        lowStockThreshold: 10,
        minStock: 10,
        unit: med.unit || 'Strip',
        barcode: '896' + Math.floor(1000000000 + Math.random() * 9000000000),
        batchNumber,
        gstPercentage: 0,
        expiryDate: expDate.toISOString().slice(0, 10),
        batches: [
          {
            batchNumber,
            expiryDate: expDate.toISOString().slice(0, 10),
            purchasePrice: 80,
            mrp: 100,
            quantity: initialStock
          }
        ],
        createdAt: now,
        updatedAt: now
      } as unknown as Medicine;

      await dbMedicines.save(clientMedicine);
    }
    window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: { tenantId } }));
  } catch (e) {
    console.warn('Note: Direct local db save fallback was handled.', e);
  }

  logCentralMedicineAudit({
    action: 'ASSIGN',
    description: `Assigned ${targetMeds.length} medicines to customer "${tenantName}" (${tenantId})`,
    performedBy: adminName,
    affectedCount: targetMeds.length,
    tenantId,
    tenantName,
    details: { medicineIds }
  });

  return {
    success: true,
    assignedCount: targetMeds.length,
    message: `Successfully assigned ${targetMeds.length} medicines to "${tenantName}".`
  };
}

/**
 * Assign entire Category to a customer/tenant
 */
export async function assignCategoryToCustomer(params: {
  tenantId: string;
  tenantName: string;
  category: string;
  initialStock?: number;
  adminName?: string;
}): Promise<{
  success: boolean;
  assignedCount: number;
  message: string;
}> {
  const { tenantId, tenantName, category, initialStock = 20, adminName = 'Master Admin' } = params;
  const list = getCentralMedicines();
  const categoryMedIds = list
    .filter(m => m.category?.trim().toLowerCase() === category.trim().toLowerCase())
    .map(m => m.id);

  if (categoryMedIds.length === 0) {
    return { success: false, assignedCount: 0, message: `No medicines found in category "${category}".` };
  }

  return assignMedicinesToCustomer({
    tenantId,
    tenantName,
    medicineIds: categoryMedIds,
    initialStock,
    adminName
  });
}

/**
 * Bulk Assign Medicines & Categories to Multiple Customers
 */
export async function bulkAssignMedicines(params: {
  tenantIds: string[];
  medicineIds?: string[];
  categories?: string[];
  initialStock?: number;
  adminName?: string;
}): Promise<{
  success: boolean;
  totalAssignments: number;
  message: string;
}> {
  const { tenantIds, medicineIds = [], categories = [], initialStock = 20, adminName = 'Master Admin' } = params;
  const tenants = getAllTenants();
  const allCentralMeds = getCentralMedicines();

  // Consolidate target medicine IDs
  const targetIdSet = new Set<string>(medicineIds);
  if (categories.length > 0) {
    const cleanCats = categories.map(c => c.trim().toLowerCase());
    for (const med of allCentralMeds) {
      if (med.category && cleanCats.includes(med.category.trim().toLowerCase())) {
        targetIdSet.add(med.id);
      }
    }
  }

  const finalMedIds = Array.from(targetIdSet);
  if (tenantIds.length === 0 || finalMedIds.length === 0) {
    return { success: false, totalAssignments: 0, message: 'Please select at least one customer and one medicine/category.' };
  }

  let grandCount = 0;
  for (const tid of tenantIds) {
    const targetTenant = tenants.find(t => (t.tenantId || t.id) === tid);
    const tName = targetTenant?.name || (targetTenant as any)?.storeName || tid;

    const res = await assignMedicinesToCustomer({
      tenantId: tid,
      tenantName: tName,
      medicineIds: finalMedIds,
      initialStock,
      adminName
    });

    if (res.success) {
      grandCount += res.assignedCount;
    }
  }

  logCentralMedicineAudit({
    action: 'BULK_ASSIGN',
    description: `Bulk assigned ${finalMedIds.length} items to ${tenantIds.length} customer accounts. Total operations: ${grandCount}`,
    performedBy: adminName,
    affectedCount: grandCount,
    details: { tenantIds, medicineCount: finalMedIds.length, categories }
  });

  return {
    success: true,
    totalAssignments: grandCount,
    message: `Bulk assignment complete: ${finalMedIds.length} items assigned to ${tenantIds.length} customer accounts.`
  };
}

/**
 * Bulk Remove / Unassign medicines from customer accounts
 */
export function bulkRemoveAssignments(params: {
  tenantIds: string[];
  medicineIds: string[];
  adminName?: string;
}): {
  success: boolean;
  removedCount: number;
  message: string;
} {
  const { tenantIds, medicineIds, adminName = 'Master Admin' } = params;
  const list = getCentralMedicines();
  const assignments = getCentralMedicineAssignments();

  // 1. Update central medicine records
  const updatedList = list.map(item => {
    if (medicineIds.includes(item.id)) {
      const remainingTenants = (item.assignedTenantIds || []).filter(tid => !tenantIds.includes(tid));
      return {
        ...item,
        assignedTenantIds: remainingTenants,
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });

  saveCentralMedicinesList(updatedList);

  // 2. Remove from assignment table
  const updatedAssignments = assignments.filter(
    a => !(tenantIds.includes(a.tenantId) && medicineIds.includes(a.medicineId))
  );
  saveCentralAssignmentsList(updatedAssignments);

  logCentralMedicineAudit({
    action: 'REMOVE_ASSIGNMENT',
    description: `Removed assignment of ${medicineIds.length} medicines from ${tenantIds.length} customers.`,
    performedBy: adminName,
    affectedCount: medicineIds.length,
    details: { tenantIds, medicineIds }
  });

  return {
    success: true,
    removedCount: medicineIds.length * tenantIds.length,
    message: `Assignments removed successfully.`
  };
}

/**
 * Import CSV / Excel text into Central Medicine Database with deduplication
 */
export function importCentralMedicinesFromCsv(csvText: string, sourceName = 'EXCEL_IMPORT'): {
  success: boolean;
  totalParsed: number;
  addedCount: number;
  duplicateCount: number;
  message: string;
  errors: string[];
} {
  if (!csvText || !csvText.trim()) {
    return { success: false, totalParsed: 0, addedCount: 0, duplicateCount: 0, message: 'Empty CSV content.', errors: [] };
  }

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { success: false, totalParsed: 0, addedCount: 0, duplicateCount: 0, message: 'CSV must contain a header and at least one row.', errors: [] };
  }

  // Parse header
  const headerTokens = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  // Find column indexes
  const nameIdx = headerTokens.findIndex(h => h.includes('item') || h.includes('medicine') || h.includes('product') || h.includes('brand') || h.includes('name'));
  const brandIdx = headerTokens.findIndex(h => h.includes('brand') || h.includes('product'));
  const genericIdx = headerTokens.findIndex(h => h.includes('generic') || h.includes('salt') || h.includes('formula'));
  const companyIdx = headerTokens.findIndex(h => h.includes('company') || h.includes('manufacturer') || h.includes('supplier'));
  const categoryIdx = headerTokens.findIndex(h => h.includes('category') || h.includes('type') || h.includes('group') || h.includes('class'));

  if (nameIdx === -1 && genericIdx === -1) {
    return { 
      success: false, 
      totalParsed: 0, 
      addedCount: 0, 
      duplicateCount: 0, 
      message: 'Could not detect Item Name / Product Name column in header.', 
      errors: [`Header received: ${lines[0]}`] 
    };
  }

  const existingList = getCentralMedicines();
  const existingKeySet = new Set<string>();
  for (const item of existingList) {
    existingKeySet.add(normalizeMedicineKey(item.name, item.company || item.brandName));
  }

  const newItems: CentralMedicine[] = [];
  let duplicateCount = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  // Helper for CSV line parser handling quotes
  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const itemName = (nameIdx >= 0 ? row[nameIdx] : '') || (genericIdx >= 0 ? row[genericIdx] : '') || '';
    if (!itemName || !itemName.trim() || itemName.toLowerCase() === 'item name') continue;

    const brandName = (brandIdx >= 0 && brandIdx !== nameIdx ? row[brandIdx] : '') || '';
    const genericName = (genericIdx >= 0 && genericIdx !== nameIdx ? row[genericIdx] : '') || '';
    const company = (companyIdx >= 0 ? row[companyIdx] : '') || brandName || 'Standard Pharma';
    const category = (categoryIdx >= 0 ? row[categoryIdx] : '') || 'General Pharmacy';

    const itemKey = normalizeMedicineKey(itemName, company || brandName);

    if (existingKeySet.has(itemKey)) {
      duplicateCount++;
      continue;
    }

    existingKeySet.add(itemKey);

    newItems.push({
      id: 'cmed_' + uuidv4().replace(/-/g, '').substring(0, 10),
      name: itemName.trim(),
      brandName: brandName.trim(),
      genericName: genericName.trim(),
      company: company.trim(),
      category: category.trim(),
      dosageForm: 'Tablet',
      unit: 'Strip',
      source: (sourceName as any) || 'CSV_IMPORT',
      assignedTenantIds: [],
      createdAt: now,
      updatedAt: now
    });
  }

  if (newItems.length > 0) {
    const merged = [...newItems, ...existingList];
    saveCentralMedicinesList(merged);

    logCentralMedicineAudit({
      action: 'IMPORT',
      description: `Imported ${newItems.length} medicines from file (${duplicateCount} duplicates prevented).`,
      affectedCount: newItems.length,
      details: { totalLines: lines.length, added: newItems.length, duplicates: duplicateCount }
    });
  }

  return {
    success: true,
    totalParsed: lines.length - 1,
    addedCount: newItems.length,
    duplicateCount,
    message: `Import completed: ${newItems.length} new medicines added. ${duplicateCount} duplicate records skipped.`,
    errors
  };
}

/**
 * Requirement 4: Customer-Added Items Sync
 * Automatically syncs ONLY Name + Brand + Company + Category back to central /server database.
 * Strictly ignores stock, purchase price, sale price, batch, expiry, financial data.
 */
export function syncCustomerCreatedItem(
  item: Partial<Medicine>,
  context?: { tenantId?: string; tenantName?: string; userId?: string }
): {
  synced: boolean;
  centralItem?: CentralMedicine;
  reason?: string;
} {
  if (!item || !item.name || !item.name.trim()) {
    return { synced: false, reason: 'Item name is required.' };
  }

  const ctx = context || getCurrentBusinessContext();
  const list = getCentralMedicines();
  const itemName = item.name.trim();
  const company = item.manufacturer || (item as any).brandName || '';
  const itemKey = normalizeMedicineKey(itemName, company);

  // Check if it already exists in Central Database
  const existing = list.find(m => normalizeMedicineKey(m.name, m.company || m.brandName) === itemKey);
  const now = new Date().toISOString();

  if (existing) {
    // If it exists, ensure this customer's tenantId is included in assignedTenantIds
    if (ctx.tenantId && !existing.assignedTenantIds?.includes(ctx.tenantId)) {
      existing.assignedTenantIds = [...(existing.assignedTenantIds || []), ctx.tenantId];
      existing.updatedAt = now;
      saveCentralMedicinesList(list);
    }
    return { synced: true, centralItem: existing, reason: 'Already in central catalog (tenant linked).' };
  }

  // Create sanitized Central Medicine Record (NO stock, NO financial, NO batch)
  const newCentralItem: CentralMedicine = {
    id: 'cmed_sync_' + uuidv4().replace(/-/g, '').substring(0, 10),
    name: itemName,
    brandName: ((item as any).brandName || item.manufacturer || '').trim(),
    genericName: (item.genericName || '').trim(),
    company: company.trim(),
    category: (item.category || 'General Pharmacy').trim(),
    dosageForm: (item.dosageForm as any) || 'Tablet',
    strength: item.strength || '',
    unit: item.unit || 'Strip',
    source: 'CUSTOMER_SYNC',
    sourceTenantId: ctx.tenantId,
    sourceTenantName: (ctx as any).tenantName || ctx.tenantId,
    assignedTenantIds: ctx.tenantId ? [ctx.tenantId] : [],
    isCustomerSynced: true,
    createdAt: now,
    updatedAt: now
  };

  list.unshift(newCentralItem);
  saveCentralMedicinesList(list);

  logCentralMedicineAudit({
    action: 'CUSTOMER_SYNC',
    description: `Auto-synced item "${newCentralItem.name}" from customer/tenant ${ctx.tenantId || 'Unknown'} to Central Database (sanitized template only).`,
    tenantId: ctx.tenantId,
    details: { name: newCentralItem.name, category: newCentralItem.category }
  });

  return { synced: true, centralItem: newCentralItem };
}

/**
 * Strict Tenant Isolation Query:
 * Returns ONLY medicines assigned to this customer/tenant or created by this customer.
 */
export function getAssignedMedicinesForCustomer(tenantId: string): CentralMedicine[] {
  if (!tenantId) return [];
  const list = getCentralMedicines();
  return list.filter(m => 
    m.assignedTenantIds?.includes(tenantId) || 
    m.sourceTenantId === tenantId
  );
}

/**
 * Export Central Medicines as CSV
 */
export function exportCentralMedicinesToCsv(filterCategory?: string): string {
  const list = getCentralMedicines();
  const filtered = filterCategory && filterCategory !== 'ALL'
    ? list.filter(m => m.category?.toLowerCase() === filterCategory.toLowerCase())
    : list;

  const header = ['No.', 'Item / Medicine Name', 'Generic Name', 'Brand / Product', 'Company / Manufacturer', 'Category', 'Source', 'Assigned Customers Count'];
  const rows = filtered.map((m, idx) => [
    idx + 1,
    `"${(m.name || '').replace(/"/g, '""')}"`,
    `"${(m.genericName || '').replace(/"/g, '""')}"`,
    `"${(m.brandName || '').replace(/"/g, '""')}"`,
    `"${(m.company || '').replace(/"/g, '""')}"`,
    `"${(m.category || '').replace(/"/g, '""')}"`,
    `"${m.source}"`,
    m.assignedTenantIds ? m.assignedTenantIds.length : 0
  ]);

  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}
