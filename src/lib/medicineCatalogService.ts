import { v4 as uuidv4 } from 'uuid';
import { Medicine } from '../types';
import { dbMedicines } from './db';
import { logMasterAudit } from './masterServerService';

export interface MasterMedicineItem {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  dosageForm: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Suspension' | 'Cream' | 'Ointment' | 'Drops' | 'Inhaler';
  category: string;
  manufacturer: string;
  defaultSalePrice: number;
  defaultPurchasePrice: number;
  mrp: number;
  barcode?: string;
  unit: string;
  conversionRate?: number;
  isControlledDrug?: boolean;
  requiresPrescription?: boolean;
  minStockLevel?: number;
  isNarcotic?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const MASTER_MEDICINE_CATALOG_KEY = 'mbi_master_medicine_catalog_v2';

export const DEFAULT_MASTER_MEDICINES: MasterMedicineItem[] = [
  {
    id: 'med_panadol_500',
    name: 'Panadol 500mg Tablets',
    genericName: 'Paracetamol',
    brandName: 'GSK',
    strength: '500mg',
    dosageForm: 'Tablet',
    category: 'Analgesics / Antipyretics',
    manufacturer: 'GlaxoSmithKline Pakistan',
    defaultSalePrice: 35.00,
    defaultPurchasePrice: 28.50,
    mrp: 35.00,
    barcode: '8964000100101',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_panadol_cf',
    name: 'Panadol CF (Cold & Flu)',
    genericName: 'Paracetamol + Pseudoephedrine + Chlorpheniramine',
    brandName: 'GSK',
    strength: '500mg/30mg/2mg',
    dosageForm: 'Tablet',
    category: 'Respiratory / Anti-Cold',
    manufacturer: 'GlaxoSmithKline Pakistan',
    defaultSalePrice: 48.00,
    defaultPurchasePrice: 40.00,
    mrp: 48.00,
    barcode: '8964000100102',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_augmentin_625',
    name: 'Augmentin 625mg Tablets',
    genericName: 'Co-Amoxiclav (Amoxicillin + Clavulanic Acid)',
    brandName: 'GSK',
    strength: '625mg',
    dosageForm: 'Tablet',
    category: 'Antibiotics',
    manufacturer: 'GlaxoSmithKline Pakistan',
    defaultSalePrice: 285.00,
    defaultPurchasePrice: 242.00,
    mrp: 285.00,
    barcode: '8964000100201',
    unit: 'Box (6 Tab)',
    conversionRate: 6,
    isControlledDrug: false,
    requiresPrescription: true,
    minStockLevel: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_brufen_400',
    name: 'Brufen 400mg Tablets',
    genericName: 'Ibuprofen',
    brandName: 'Abbott',
    strength: '400mg',
    dosageForm: 'Tablet',
    category: 'NSAIDs / Anti-Inflammatory',
    manufacturer: 'Abbott Laboratories',
    defaultSalePrice: 65.00,
    defaultPurchasePrice: 54.00,
    mrp: 65.00,
    barcode: '8964000100301',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 40,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_risek_20',
    name: 'Risek 20mg Capsules',
    genericName: 'Omeprazole',
    brandName: 'Getz',
    strength: '20mg',
    dosageForm: 'Capsule',
    category: 'Gastrointestinal / PPI',
    manufacturer: 'Getz Pharma',
    defaultSalePrice: 195.00,
    defaultPurchasePrice: 165.00,
    mrp: 195.00,
    barcode: '8964000100401',
    unit: 'Box (14 Cap)',
    conversionRate: 14,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_flagyl_400',
    name: 'Flagyl 400mg Tablets',
    genericName: 'Metronidazole',
    brandName: 'Sanofi',
    strength: '400mg',
    dosageForm: 'Tablet',
    category: 'Antiprotozoal / Antibacterial',
    manufacturer: 'Sanofi-Aventis',
    defaultSalePrice: 55.00,
    defaultPurchasePrice: 44.00,
    mrp: 55.00,
    barcode: '8964000100501',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: true,
    minStockLevel: 35,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_surbex_z',
    name: 'Surbex-Z High Potency Tablets',
    genericName: 'Zinc + Vitamin B-Complex + Vitamin C & E',
    brandName: 'Abbott',
    strength: 'Multi-nutrient',
    dosageForm: 'Tablet',
    category: 'Nutritional / Multivitamins',
    manufacturer: 'Abbott Laboratories',
    defaultSalePrice: 320.00,
    defaultPurchasePrice: 272.00,
    mrp: 320.00,
    barcode: '8964000100601',
    unit: 'Bottle (30 Tab)',
    conversionRate: 30,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_softin_10',
    name: 'Softin 10mg Tablets',
    genericName: 'Loratadine',
    brandName: 'SAMI',
    strength: '10mg',
    dosageForm: 'Tablet',
    category: 'Antihistamines / Anti-Allergic',
    manufacturer: 'Sami Pharmaceuticals',
    defaultSalePrice: 85.00,
    defaultPurchasePrice: 70.00,
    mrp: 85.00,
    barcode: '8964000100701',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_arinac_forte',
    name: 'Arinac Forte Tablets',
    genericName: 'Ibuprofen + Pseudoephedrine HCl',
    brandName: 'Abbott',
    strength: '400mg/60mg',
    dosageForm: 'Tablet',
    category: 'Respiratory / Decongestant',
    manufacturer: 'Abbott Laboratories',
    defaultSalePrice: 110.00,
    defaultPurchasePrice: 92.00,
    mrp: 110.00,
    barcode: '8964000100801',
    unit: 'Strip (10 Tab)',
    conversionRate: 10,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med_calpol_susp',
    name: 'Calpol 120mg/5ml Paediatric Suspension 60ml',
    genericName: 'Paracetamol',
    brandName: 'GSK',
    strength: '120mg/5ml',
    dosageForm: 'Suspension',
    category: 'Pediatric Analgesics',
    manufacturer: 'GlaxoSmithKline Pakistan',
    defaultSalePrice: 78.00,
    defaultPurchasePrice: 65.00,
    mrp: 78.00,
    barcode: '8964000100901',
    unit: 'Bottle',
    conversionRate: 1,
    isControlledDrug: false,
    requiresPrescription: false,
    minStockLevel: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

/**
 * Get all Master Medicine Catalog items
 */
export function getMasterMedicineCatalog(): MasterMedicineItem[] {
  try {
    const raw = localStorage.getItem(MASTER_MEDICINE_CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  localStorage.setItem(MASTER_MEDICINE_CATALOG_KEY, JSON.stringify(DEFAULT_MASTER_MEDICINES));
  return DEFAULT_MASTER_MEDICINES;
}

/**
 * Save / Update a Master Medicine Catalog item
 */
export function saveMasterMedicine(item: Partial<MasterMedicineItem> & { name: string; genericName: string }): MasterMedicineItem[] {
  const list = getMasterMedicineCatalog();
  const existingIdx = list.findIndex(m => m.id === item.id);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    list[existingIdx] = {
      ...list[existingIdx],
      ...item,
      updatedAt: now
    } as MasterMedicineItem;
    logMasterAudit('Master Medicine Updated', 'SECURITY', `Updated medicine template: ${item.name} (${item.genericName})`);
  } else {
    const newItem: MasterMedicineItem = {
      id: item.id || ('med_' + uuidv4().replace(/-/g, '').substring(0, 8)),
      name: item.name,
      genericName: item.genericName,
      brandName: item.brandName || '',
      strength: item.strength || '',
      dosageForm: item.dosageForm || 'Tablet',
      category: item.category || 'General Pharmacy',
      manufacturer: item.manufacturer || 'Standard Pharma',
      defaultSalePrice: Number(item.defaultSalePrice) || 0,
      defaultPurchasePrice: Number(item.defaultPurchasePrice) || 0,
      mrp: Number(item.mrp) || Number(item.defaultSalePrice) || 0,
      barcode: item.barcode || '',
      unit: item.unit || 'Strip',
      conversionRate: item.conversionRate || 1,
      isControlledDrug: !!item.isControlledDrug,
      requiresPrescription: !!item.requiresPrescription,
      minStockLevel: item.minStockLevel || 10,
      isNarcotic: !!item.isNarcotic,
      tags: item.tags || [],
      createdAt: now,
      updatedAt: now
    };
    list.unshift(newItem);
    logMasterAudit('Master Medicine Created', 'SECURITY', `Added new medicine template: ${newItem.name} (${newItem.genericName})`);
  }

  localStorage.setItem(MASTER_MEDICINE_CATALOG_KEY, JSON.stringify(list));
  return list;
}

/**
 * Delete a Master Medicine Catalog item
 */
export function deleteMasterMedicine(id: string): MasterMedicineItem[] {
  const list = getMasterMedicineCatalog();
  const target = list.find(m => m.id === id);
  const filtered = list.filter(m => m.id !== id);
  if (target) {
    logMasterAudit('Master Medicine Deleted', 'SECURITY', `Removed master medicine: ${target.name}`);
  }
  localStorage.setItem(MASTER_MEDICINE_CATALOG_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Initialize / Inject Medicine Database for a specific tenant / user
 * 
 * Modes:
 * - 'blank': Sets 0 items for this user/tenant (clean database).
 * - 'full': Provisions the entire Master Medicine Catalog to this user/tenant.
 * - 'selected': Provisions only specifically selected medicine IDs.
 */
export async function initializeTenantMedicineDatabase(params: {
  tenantId: string;
  userName: string;
  mode: 'blank' | 'full' | 'selected';
  selectedMedicineIds?: string[];
  initialStockPerItem?: number;
  adminName?: string;
}): Promise<{ success: boolean; itemsCount: number; message: string }> {
  const {
    tenantId,
    userName,
    mode,
    selectedMedicineIds = [],
    initialStockPerItem = 20,
    adminName = 'Master Admin'
  } = params;

  try {
    if (mode === 'blank') {
      // Clear medicines for this tenant
      const existingMeds = await dbMedicines.getAll();
      for (const item of existingMeds) {
        if (!item.id) continue;
        const itemTenant = (item as any).tenantId;
        if (itemTenant === tenantId || !itemTenant) {
          await dbMedicines.delete(item.id);
        }
      }

      logMasterAudit(
        'Medicine DB Initialized (Zero Clean)',
        'SECURITY',
        `Cleared all medicine records for user/tenant ${userName} (${tenantId}). Item count = 0.`,
        tenantId
      );

      window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: { tenantId } }));

      return {
        success: true,
        itemsCount: 0,
        message: `Database for "${userName}" successfully initialized with 0 items (Clean Blank Slate).`
      };
    }

    const masterCatalog = getMasterMedicineCatalog();
    const medicinesToInject = mode === 'full' 
      ? masterCatalog 
      : masterCatalog.filter(m => selectedMedicineIds.includes(m.id));

    const existingMeds = await dbMedicines.getAll();
    const otherMeds = existingMeds.filter(i => (i as any).tenantId && (i as any).tenantId !== tenantId);

    const newTenantMeds: Medicine[] = medicinesToInject.map((med, idx) => {
      const batchNumber = 'BAT-' + new Date().getFullYear() + '-' + (100 + idx);
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2); // 2 years expiry

      return {
        id: 'med_' + uuidv4().replace(/-/g, '').substring(0, 10),
        tenantId,
        name: med.name,
        genericName: med.genericName,
        brandName: med.brandName,
        dosageForm: med.dosageForm,
        strength: med.strength,
        category: med.category,
        manufacturer: med.manufacturer,
        salePrice: med.defaultSalePrice,
        purchasePrice: med.defaultPurchasePrice,
        mrp: med.mrp,
        sellingPrice: med.defaultSalePrice,
        quantity: initialStockPerItem,
        lowStockThreshold: med.minStockLevel || 10,
        minStock: med.minStockLevel || 10,
        unit: med.unit || 'Strip',
        barcode: med.barcode || '896' + Math.floor(1000000000 + Math.random() * 9000000000),
        batchNumber,
        gstPercentage: 0,
        expiryDate: expDate.toISOString().slice(0, 10),
        batches: [
          {
            batchNumber,
            expiryDate: expDate.toISOString().slice(0, 10),
            purchasePrice: med.defaultPurchasePrice,
            mrp: med.mrp,
            quantity: initialStockPerItem
          }
        ],
        isControlled: med.isControlledDrug,
        isNarcotic: med.isNarcotic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as unknown as Medicine;
    });

    // Save newly provisioned medicines
    for (const item of newTenantMeds) {
      await dbMedicines.save(item);
    }

    logMasterAudit(
      'Medicine DB Initialized',
      'FLEET',
      `Provisioned ${newTenantMeds.length} curated medicine items with ${initialStockPerItem} stock each for user/tenant ${userName} (${tenantId}) by ${adminName}`,
      tenantId
    );

    window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: { tenantId } }));

    return {
      success: true,
      itemsCount: newTenantMeds.length,
      message: `Successfully provisioned ${newTenantMeds.length} medicines into "${userName}" inventory database.`
    };
  } catch (e: any) {
    console.error('Error initializing medicine database:', e);
    return {
      success: false,
      itemsCount: 0,
      message: e.message || 'Failed to initialize medicine database.'
    };
  }
}
