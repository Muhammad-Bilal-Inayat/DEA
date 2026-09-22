import { GenericMaster, Medicine } from '../types';

export const DEFAULT_GENERIC_MASTERS: GenericMaster[] = [
  {
    id: 'GEN-000102',
    genericName: 'Paracetamol',
    alternateNames: ['Acetaminophen', 'APAP', 'Para'],
    status: 'Active',
    strength: '500mg / 650mg / 120mg per 5ml',
    dosageForm: 'Tablet / Syrup / Suspension / Infusion',
    therapeuticClass: 'Analgesic & Antipyretic',
    isControlled: false,
    description: 'Widely used for fever relief, mild-to-moderate analgesia, headache, and body aches.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000245',
    genericName: 'Pregabalin',
    alternateNames: ['Lyrica Salt', 'PGB', 'Isobutyl GABA'],
    status: 'Active',
    strength: '50mg / 75mg / 100mg / 150mg / 300mg',
    dosageForm: 'Capsule / Oral Solution',
    therapeuticClass: 'Anticonvulsant & Neuropathic Pain Agent',
    isControlled: true,
    description: 'Controlled substance indicated for neuropathic pain associated with diabetic peripheral neuropathy, postherpetic neuralgia, and fibromyalgia.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000318',
    genericName: 'Amoxicillin + Clavulanic Acid',
    alternateNames: ['Co-Amoxiclav', 'Amox-Clav', 'Augmentin Salt'],
    status: 'Active',
    strength: '375mg / 625mg / 1g / 156.25mg/5ml / 312.5mg/5ml',
    dosageForm: 'Tablet / Dry Syrup / IV Injection',
    therapeuticClass: 'Broad-Spectrum Penicillin Antibiotic',
    isControlled: false,
    description: 'Beta-lactamase inhibitor combination for respiratory, skin, and urinary tract bacterial infections.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000412',
    genericName: 'Omeprazole',
    alternateNames: ['Losec Salt', 'OMP', 'Prilosec Salt'],
    status: 'Active',
    strength: '20mg / 40mg',
    dosageForm: 'Capsule / IV Infusion',
    therapeuticClass: 'Proton Pump Inhibitor (PPI)',
    isControlled: false,
    description: 'Reduces stomach acid production for GERD, peptic ulcers, and Zollinger-Ellison syndrome.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000509',
    genericName: 'Ciprofloxacin',
    alternateNames: ['Cipro', 'Ciproflo'],
    status: 'Active',
    strength: '250mg / 500mg / 750mg / 200mg/100ml',
    dosageForm: 'Tablet / IV Infusion / Eye-Ear Drops',
    therapeuticClass: 'Fluoroquinolone Antibiotic',
    isControlled: false,
    description: 'Bactericidal antibiotic for typhoid, bone/joint, urinary, and gastrointestinal infections.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000620',
    genericName: 'Tramadol HCl',
    alternateNames: ['Tramal Salt', 'Ultram', 'Tramadol Hydrochloride'],
    status: 'Active',
    strength: '50mg / 100mg / 100mg/2ml',
    dosageForm: 'Capsule / SR Tablet / Injection',
    therapeuticClass: 'Centrally Acting Opioid Analgesic',
    isControlled: true,
    description: 'Restricted opioid analgesic for moderate-to-severe post-operative and chronic pain. Strictly controlled register item.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000731',
    genericName: 'Alprazolam',
    alternateNames: ['Xanax Salt', 'Alpra'],
    status: 'Active',
    strength: '0.25mg / 0.5mg / 1mg',
    dosageForm: 'Tablet',
    therapeuticClass: 'Benzodiazepine Anxiolytic',
    isControlled: true,
    description: 'Controlled Schedule psychotropic medicine prescribed for anxiety disorders, panic attacks, and depression with anxiety.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000844',
    genericName: 'Metformin HCl',
    alternateNames: ['Glucophage Salt', 'Metformin Hydrochloride'],
    status: 'Active',
    strength: '500mg / 850mg / 1000mg',
    dosageForm: 'Tablet / XR Tablet',
    therapeuticClass: 'Biguanide Antidiabetic Agent',
    isControlled: false,
    description: 'First-line anti-hyperglycemic oral therapy for Type 2 Diabetes Mellitus.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-000955',
    genericName: 'Ceftriaxone',
    alternateNames: ['Rocephin Salt', 'Ceftri'],
    status: 'Active',
    strength: '250mg / 500mg / 1g / 2g',
    dosageForm: 'IV/IM Injection',
    therapeuticClass: '3rd-Generation Cephalosporin Antibiotic',
    isControlled: false,
    description: 'Broad-spectrum antibiotic for meningitis, sepsis, surgical prophylaxis, and gonorrhea.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'GEN-001066',
    genericName: 'Esomeprazole',
    alternateNames: ['Nexium Salt', 'S-Omeprazole'],
    status: 'Active',
    strength: '20mg / 40mg',
    dosageForm: 'Capsule / IV Infusion / Sachet',
    therapeuticClass: 'Proton Pump Inhibitor (PPI)',
    isControlled: false,
    description: 'S-isomer of omeprazole with higher bioavailability for severe erosive esophagitis and acid peptic disease.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export interface GenericGroupSummary {
  genericId: string;
  genericName: string;
  alternateNames: string[];
  therapeuticClass?: string;
  isControlled: boolean;
  totalBrands: number;
  totalCompanies: number;
  totalStock: number;
  availableProductsCount: number;
  controlledProductsCount: number;
  products: Medicine[];
  companies: string[];
  brands: string[];
}

export interface GenericFilterOptions {
  company?: string;
  brand?: string;
  strength?: string;
  dosageForm?: string;
  inStockOnly?: boolean;
  onlineOnly?: boolean;
  controlledStatus?: 'ALL' | 'CONTROLLED' | 'NON_CONTROLLED';
  includeHiddenControlled?: boolean; // True when searching in Special Controlled Sale mode
}

/**
 * Searches items and returns intelligent Generic groupings with all matching companies and brands
 */
export function searchGroupedByGeneric(
  medicines: Medicine[],
  query: string = '',
  filters: GenericFilterOptions = {}
): GenericGroupSummary[] {
  const cleanQ = query.trim().toLowerCase();

  // 1. Group medicines by Generic
  const genericGroupsMap = new Map<string, Medicine[]>();
  const unassignedKey = 'UNASSIGNED_GENERIC';

  medicines.forEach(med => {
    // Check hidden controlled filter
    if (med.isControlled && med.showInNormalSearch === false && !filters.includeHiddenControlled) {
      return;
    }

    // Determine generic key
    const genName = med.genericName?.trim() || '';
    const genId = med.genericId?.trim() || '';
    const groupKey = genId ? genId : (genName ? genName.toUpperCase() : unassignedKey);

    if (!genericGroupsMap.has(groupKey)) {
      genericGroupsMap.set(groupKey, []);
    }
    genericGroupsMap.get(groupKey)!.push(med);
  });

  const summaries: GenericGroupSummary[] = [];

  genericGroupsMap.forEach((meds, groupKey) => {
    const firstMed = meds[0];
    const matchedMaster = DEFAULT_GENERIC_MASTERS.find(g => 
      g.id.toLowerCase() === (firstMed.genericId || '').toLowerCase() ||
      g.genericName.toLowerCase() === (firstMed.genericName || '').toLowerCase()
    );

    const genericId = firstMed.genericId || matchedMaster?.id || (groupKey !== unassignedKey ? `GEN-${groupKey.slice(0, 6)}` : 'GEN-MISC');
    const genericName = firstMed.genericName || matchedMaster?.genericName || (groupKey !== unassignedKey ? groupKey : 'Other / Non-Generic Formulations');
    const alternateNames = matchedMaster?.alternateNames || firstMed.alternateGenericNames || [];
    const isControlled = meds.some(m => m.isControlled) || matchedMaster?.isControlled || false;

    // Filter products within group based on query and filters
    const matchingProducts = meds.filter(med => {
      // Query filter
      if (cleanQ) {
        const nameMatch = (med.name || '').toLowerCase().includes(cleanQ);
        const barcodeMatch = (med.barcode || '').toLowerCase().includes(cleanQ);
        const batchMatch = (med.batchNumber || '').toLowerCase().includes(cleanQ);
        const mfgMatch = (med.manufacturer || '').toLowerCase().includes(cleanQ);
        const genNameMatch = (med.genericName || '').toLowerCase().includes(cleanQ);
        const genIdMatch = (med.genericId || '').toLowerCase().includes(cleanQ);
        const strengthMatch = (med.strength || '').toLowerCase().includes(cleanQ);
        const dosageMatch = (med.dosageForm || '').toLowerCase().includes(cleanQ);
        const catMatch = (med.category || '').toLowerCase().includes(cleanQ);
        const altMatch = alternateNames.some(a => a.toLowerCase().includes(cleanQ));
        const masterGenMatch = genericName.toLowerCase().includes(cleanQ) || genericId.toLowerCase().includes(cleanQ);

        const anyMatch = nameMatch || barcodeMatch || batchMatch || mfgMatch || genNameMatch || 
                         genIdMatch || strengthMatch || dosageMatch || catMatch || altMatch || masterGenMatch;
        if (!anyMatch) return false;
      }

      // Advanced filters
      if (filters.company && filters.company !== 'All' && med.manufacturer !== filters.company) {
        return false;
      }
      if (filters.brand && filters.brand !== 'All' && !med.name.toLowerCase().includes(filters.brand.toLowerCase())) {
        return false;
      }
      if (filters.strength && filters.strength !== 'All' && med.strength !== filters.strength) {
        return false;
      }
      if (filters.dosageForm && filters.dosageForm !== 'All' && med.dosageForm !== filters.dosageForm) {
        return false;
      }
      if (filters.inStockOnly && med.quantity <= 0) {
        return false;
      }
      if (filters.onlineOnly && !med.showOnline && !med.showInOnlineStore) {
        return false;
      }
      if (filters.controlledStatus === 'CONTROLLED' && !med.isControlled) {
        return false;
      }
      if (filters.controlledStatus === 'NON_CONTROLLED' && med.isControlled) {
        return false;
      }

      return true;
    });

    if (matchingProducts.length > 0) {
      const companies = Array.from(new Set(matchingProducts.map(m => m.manufacturer).filter(Boolean)));
      const brands = Array.from(new Set(matchingProducts.map(m => m.name).filter(Boolean)));
      const totalStock = matchingProducts.reduce((sum, m) => sum + (m.quantity || 0), 0);
      const availableProductsCount = matchingProducts.filter(m => m.quantity > 0).length;
      const controlledProductsCount = matchingProducts.filter(m => m.isControlled).length;

      summaries.push({
        genericId,
        genericName,
        alternateNames,
        therapeuticClass: matchedMaster?.therapeuticClass,
        isControlled,
        totalBrands: brands.length,
        totalCompanies: companies.length,
        totalStock,
        availableProductsCount,
        controlledProductsCount,
        products: matchingProducts,
        companies,
        brands
      });
    }
  });

  // Sort: controlled first if searching controlled, else alphabetical or largest stock
  return summaries.sort((a, b) => {
    if (a.genericName.startsWith('Other')) return 1;
    if (b.genericName.startsWith('Other')) return -1;
    return a.genericName.localeCompare(b.genericName);
  });
}

export function getGenericMasterById(id: string): GenericMaster | undefined {
  return DEFAULT_GENERIC_MASTERS.find(g => g.id.toLowerCase() === id.toLowerCase() || g.genericName.toLowerCase() === id.toLowerCase());
}

export function buildGenericSummaries(medicines: Medicine[]): GenericGroupSummary[] {
  return searchGroupedByGeneric(medicines, '', { includeHiddenControlled: true });
}

export function getGenericQuickSummary(genericIdOrName: string, medicines: Medicine[]): GenericGroupSummary | null {
  if (!genericIdOrName) return null;
  const groups = searchGroupedByGeneric(medicines, '', { includeHiddenControlled: true });
  const clean = genericIdOrName.trim().toLowerCase();
  return groups.find(g => 
    g.genericId.toLowerCase() === clean || 
    g.genericName.toLowerCase() === clean
  ) || null;
}
