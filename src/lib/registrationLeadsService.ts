import { v4 as uuidv4 } from 'uuid';
import { saveRecordToFirestore, fetchCollectionFromFirestore, deleteRecordFromFirestore } from './firebase';
import { generateNewLicenseKey, saveClientLicense, saveTenant, getAllTenants, DEFAULT_TENANT_FEATURE_TOGGLES } from './masterServerService';
import { formatWhatsAppPhone } from './whatsappService';
import { dbAppUsers } from './db';
import { AppUserRecord } from '../types';

export type SoftwareCategoryPlan = 
  | '3 Days Trial'
  | '7 Days Trial'
  | '15 Days Trial'
  | '30 Days Monthly'
  | 'Standard POS'
  | 'Pharmacy Pro'
  | 'Enterprise Multi-Branch'
  | 'Lifetime License'
  | string;

export interface RegistrationLead {
  id: string;
  storeName: string;
  ownerName: string;
  username?: string;
  password?: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  drugLicenseNo?: string;
  ntnNumber?: string;
  requestedPlan: SoftwareCategoryPlan;
  status: 'pending_activation' | 'contacted' | 'activated' | 'rejected';
  isApproved: boolean;
  activationKey?: string;
  submittedAt: string;
  activatedAt?: string;
  notes?: string;
  ipAddress?: string;
}

const LEADS_STORAGE_KEY = 'mbi_registration_leads_v2';
const DELETED_LEADS_KEY = 'mbi_deleted_registration_lead_ids_v2';
export const ADMIN_PRIMARY_WHATSAPP = '03281302636';
export const ADMIN_SECONDARY_WHATSAPP = '03364585863';
export const ADMIN_SUPPORT_PHONE = '03364585863';

function getDeletedLeadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_LEADS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function recordDeletedLeadId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedLeadIds();
    set.add(id);
    localStorage.setItem(DELETED_LEADS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getAllRegistrationLeads(): RegistrationLead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: RegistrationLead[] = JSON.parse(raw);
    const deleted = getDeletedLeadIds();
    return parsed.filter(l => l && l.id && !deleted.has(l.id));
  } catch (e) {
    console.error('Failed to parse registration leads:', e);
    return [];
  }
}

export async function syncRegistrationLeadsFromFirestore(): Promise<RegistrationLead[]> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return getAllRegistrationLeads();
    }
    const cloudLeads = await fetchCollectionFromFirestore('registration_leads');
    const localLeads = getAllRegistrationLeads();
    const deletedIds = getDeletedLeadIds();
    const leadMap = new Map<string, RegistrationLead>();

    // Load local non-deleted leads
    localLeads.forEach(l => {
      if (l && l.id && !deletedIds.has(l.id)) leadMap.set(l.id, l);
    });

    // Merge cloud leads
    if (cloudLeads && Array.isArray(cloudLeads)) {
      cloudLeads.forEach((cl: any) => {
        if (cl && cl.id) {
          if (deletedIds.has(cl.id)) {
            // Delete from Cloud Firestore permanently if found in tombstone
            deleteRecordFromFirestore('registration_leads', cl.id).catch(() => {});
            return;
          }
          const existing = leadMap.get(cl.id);
          if (!existing || new Date(cl.submittedAt || 0) >= new Date(existing.submittedAt || 0)) {
            leadMap.set(cl.id, cl);
          }
        }
      });
    }

    const mergedList = Array.from(leadMap.values()).sort((a, b) => 
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );

    if (typeof window !== 'undefined') {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(mergedList));
      window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated', { detail: mergedList }));
    }
    return mergedList;
  } catch (err) {
    console.warn('Notice: Firestore lead sync deferred:', err);
    return getAllRegistrationLeads();
  }
}

export function checkRegistrationUniqueness(params: {
  email: string;
  username: string;
  password?: string;
  excludeLeadId?: string;
}): { valid: boolean; error?: string; field?: 'email' | 'username' } {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanUsername = (params.username || '').trim().toLowerCase();

  // 1. Check existing registration leads
  const allLeads = getAllRegistrationLeads();
  for (const lead of allLeads) {
    if (params.excludeLeadId && lead.id === params.excludeLeadId) continue;
    
    if (cleanEmail && lead.email && lead.email.toLowerCase() === cleanEmail) {
      return {
        valid: false,
        field: 'email',
        error: `Already exists: The email address "${params.email}" is already registered. Please use another email or sign in.`
      };
    }
    if (cleanUsername && lead.username && lead.username.toLowerCase() === cleanUsername) {
      return {
        valid: false,
        field: 'username',
        error: `Already exists: The username "${params.username}" is already taken. Please choose another username.`
      };
    }
  }

  // 2. Check tenants registry
  const allTenants = getAllTenants();
  for (const t of allTenants) {
    if (cleanEmail && ((t.ownerEmail && t.ownerEmail.toLowerCase() === cleanEmail) || (t.primaryAdminEmail && t.primaryAdminEmail.toLowerCase() === cleanEmail))) {
      return {
        valid: false,
        field: 'email',
        error: `Already exists: The email address "${params.email}" belongs to an active pharmacy tenant. Please choose another email.`
      };
    }
    if (cleanUsername && ((t.licenseId && t.licenseId.toLowerCase() === cleanUsername) || (t.tenantId && t.tenantId.toLowerCase() === cleanUsername))) {
      return {
        valid: false,
        field: 'username',
        error: `Already exists: The username "${params.username}" is reserved. Please choose another username.`
      };
    }
  }

  // 3. Check App Users stored in local cache
  try {
    const rawUsers = localStorage.getItem('mbi_app_users');
    if (rawUsers) {
      const users: AppUserRecord[] = JSON.parse(rawUsers);
      for (const u of users) {
        if (cleanEmail && ((u.email && u.email.toLowerCase() === cleanEmail) || (u.emailOrPhone && u.emailOrPhone.toLowerCase() === cleanEmail))) {
          return {
            valid: false,
            field: 'email',
            error: `Already exists: The email address "${params.email}" is assigned to staff user "${u.name}".`
          };
        }
        if (cleanUsername && u.username && u.username.toLowerCase() === cleanUsername) {
          return {
            valid: false,
            field: 'username',
            error: `Already exists: The username "${params.username}" is already used by staff member "${u.name}".`
          };
        }
      }
    }
  } catch (e) {}

  // 4. Master Admin reserved check
  const reservedUsernames = ['admin', 'master', 'root', 'mbi', 'vip123', 'owner'];
  if (reservedUsernames.includes(cleanUsername)) {
    return {
      valid: false,
      field: 'username',
      error: `Already exists: The username "${params.username}" is a reserved system identifier. Please choose another username.`
    };
  }

  const reservedEmails = ['vip123@admin.com', 'm.bilalinayat786@gmail.com', 'support@mbinventra.com'];
  if (reservedEmails.includes(cleanEmail)) {
    return {
      valid: false,
      field: 'email',
      error: `Already exists: The email "${params.email}" is reserved for Master Administration.`
    };
  }

  return { valid: true };
}

export function saveRegistrationLeadLocal(lead: RegistrationLead): RegistrationLead[] {
  const existing = getAllRegistrationLeads();
  const index = existing.findIndex(l => l.id === lead.id);
  let updated: RegistrationLead[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = lead;
  } else {
    updated = [lead, ...existing];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated', { detail: lead }));
  }
  return updated;
}

export async function submitRegistrationLead(params: {
  storeName: string;
  ownerName: string;
  phone: string;
  username?: string;
  password?: string;
  email?: string;
  city?: string;
  address?: string;
  drugLicenseNo?: string;
  ntnNumber?: string;
  requestedPlan?: SoftwareCategoryPlan;
  notes?: string;
}): Promise<{ lead: RegistrationLead; licenseKey?: string; whatsappUrl: string }> {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanUsername = (params.username || '').trim().toLowerCase();
  const cleanPassword = (params.password || '').trim();
  const cleanStoreName = (params.storeName || '').trim();
  const cleanAddress = (params.address || '').trim();

  if (!cleanEmail) {
    throw new Error('Email address is mandatory. Please provide a valid email.');
  }

  if (!cleanStoreName) {
    throw new Error('Store Name is mandatory.');
  }

  if (!cleanAddress) {
    throw new Error('Store Address is mandatory. Please enter your full pharmacy / store address.');
  }

  // Validate uniqueness for email, username, and password
  const check = checkRegistrationUniqueness({
    email: cleanEmail,
    username: cleanUsername,
    password: cleanPassword
  });

  if (!check.valid) {
    throw new Error(check.error || 'Duplicate account details detected. Please ensure your email, username, and password are unique.');
  }

  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const finalUsername = cleanUsername || (cleanEmail ? cleanEmail.split('@')[0] : params.ownerName.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const finalPassword = cleanPassword || '1234';

  const selectedPlan = params.requestedPlan || 'Basic (3-Day Free Trial)';
  const is3DayFreeTrial = selectedPlan === 'Basic (3-Day Free Trial)' || selectedPlan.includes('3-Day') || selectedPlan.includes('10-Day');

  // 3-Day Free Trial (Strict 72 Hours): Auto-activation without manual approval
  // Other plans (Standard POS, Pharmacy Pro, Enterprise): Status is pending_activation, needs Master Admin approval
  const trialDays = 3; // Exactly 72 Hours
  const expiryDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const expiryDateStr = expiryDate.toISOString().slice(0, 10);
  const expiryIso = expiryDate.toISOString();
  const licenseKey = is3DayFreeTrial 
    ? `TRIAL-3D-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    : undefined;

  const targetTenantId = `t-${cleanStoreName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-${Date.now().toString().slice(-4)}`;

  const newLead: RegistrationLead = {
    id: leadId,
    storeName: cleanStoreName,
    ownerName: params.ownerName.trim(),
    username: finalUsername,
    password: finalPassword,
    phone: params.phone.trim(),
    email: cleanEmail,
    city: params.city?.trim() || 'Lahore',
    address: cleanAddress,
    drugLicenseNo: params.drugLicenseNo?.trim() || undefined,
    ntnNumber: params.ntnNumber?.trim() || undefined,
    requestedPlan: selectedPlan,
    status: is3DayFreeTrial ? 'activated' : 'pending_activation',
    isApproved: is3DayFreeTrial, // Direct activation for 3 days (72h) free trial, admin permission required for other plans
    activationKey: licenseKey,
    activatedAt: is3DayFreeTrial ? nowIso : undefined,
    notes: is3DayFreeTrial 
      ? '3-Day Free Trial (72 Hours, Basic Plan) automatically activated upon registration without manual approval'
      : `${selectedPlan} registration submitted. Waiting for Master Admin approval & WhatsApp confirmation.`,
    submittedAt: nowIso,
  };

  // 1. Save Lead Locally
  saveRegistrationLeadLocal(newLead);

  let newAppUser: AppUserRecord | null = null;

  if (is3DayFreeTrial && licenseKey) {
    // 2. Generate and save Client License (3-Day Free Trial / 72 Hours)
    saveClientLicense({
      id: `lic_${Date.now()}`,
      licenseKey,
      clientName: cleanStoreName,
      ownerName: params.ownerName.trim(),
      phone: params.phone.trim(),
      city: params.city?.trim() || 'Lahore',
      plan: 'Basic' as any,
      status: 'Active',
      issueDate: nowIso.slice(0, 10),
      expiryDate: expiryDateStr,
      maxDevices: 5,
      strictHardwareLock: false,
      maxOfflineDays: 30,
      boundHardwareIds: [],
      allowedModules: {
        sales: true,
        purchases: true,
        pharmacy: true,
        inventory: true,
        reports: true,
        cloudSync: true,
        multiBranch: false,
        aiVoice: true,
        cashierShifts: true,
        customPrint: true,
        accountsLedger: true,
        narcoticsSchedule: true,
        customerLoyalty: true,
        bulkExcel: true,
        barcodeLabels: true,
      },
      salePrice: 0,
      amountPaid: 0,
      amountDue: 0,
      saleStatus: 'Complimentary / Trial',
      paymentMethod: 'Other',
      notes: `3-Day Free Trial (72 Hours, Basic Plan) activated on registration (${newLead.id})`,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 3. Create Tenant
    saveTenant({
      id: `ten_${Date.now()}`,
      tenantId: targetTenantId,
      organizationId: `org_${Date.now()}`,
      licenseId: licenseKey,
      name: cleanStoreName,
      ownerName: params.ownerName.trim(),
      ownerPhone: params.phone.trim(),
      ownerEmail: cleanEmail,
      city: params.city?.trim() || 'Lahore',
      address: cleanAddress,
      plan: 'Basic' as any,
      status: 'Active',
      primaryAdminId: `usr_admin_${Date.now()}`,
      primaryAdminEmail: cleanEmail,
      trialStartDate: nowIso,
      trialExpiryDate: expiryIso,
      isTrialActive: true,
      trialExpired: false,
      paidLicenseActive: false,
      maxDevices: 5,
      featureToggles: {
        ...DEFAULT_TENANT_FEATURE_TOGGLES,
        multipleWarehouses: false,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 4. Provision Primary Admin AppUser account for 3-day (72h) trial
    newAppUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: targetTenantId,
      name: params.ownerName.trim(),
      username: finalUsername,
      emailOrPhone: cleanEmail || params.phone.trim(),
      email: cleanEmail,
      role: 'Primary Admin',
      status: 'Joined',
      isApproved: true,
      passcode: finalPassword,
      notes: `Primary Admin created via 3-Day Free Trial (72 Hours, Basic Plan) registration for ${cleanStoreName}`,
      canEditInvoices: true,
      canDeleteInvoices: true,
      canReprintInvoices: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save to IndexedDB & local cache for instantaneous login
    dbAppUsers.save(newAppUser).catch(e => console.warn('Could not save user locally:', e));
    try {
      const rawUsers = localStorage.getItem('mbi_app_users');
      const usersList: AppUserRecord[] = rawUsers ? JSON.parse(rawUsers) : [];
      const existingIndex = usersList.findIndex(u => u.username === finalUsername || u.id === newAppUser!.id);
      if (existingIndex >= 0) {
        usersList[existingIndex] = newAppUser;
      } else {
        usersList.push(newAppUser);
      }
      localStorage.setItem('mbi_app_users', JSON.stringify(usersList));

      // Create isolated business profile without inheriting default admin or existing firm records
      const isolatedBiz = {
        id: targetTenantId,
        tenantId: targetTenantId,
        ownerUid: newAppUser.id,
        members: [newAppUser.id],
        name: cleanStoreName,
        phone: params.phone.trim(),
        mobile: params.phone.trim(),
        email: cleanEmail,
        city: params.city?.trim() || 'Lahore',
        address: cleanAddress,
        drugLicenseNo: params.drugLicenseNo?.trim() || undefined,
        ntnNumber: params.ntnNumber?.trim() || undefined,
        currency: 'PKR',
        vatPercentage: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      localStorage.setItem('mock_business', JSON.stringify(isolatedBiz));
      localStorage.setItem('mbi_user_businesses', JSON.stringify([isolatedBiz]));
      localStorage.setItem('active_firm_id', targetTenantId);
      localStorage.setItem('mbi_active_tenant_cache', JSON.stringify({
        tenantId: targetTenantId,
        businessId: targetTenantId,
        name: cleanStoreName,
      }));

      const newProfile = {
        uid: newAppUser.id,
        email: cleanEmail,
        displayName: params.ownerName.trim(),
        name: params.ownerName.trim(),
        role: 'Primary Admin',
        businessId: targetTenantId,
        tenantId: targetTenantId,
        phone: params.phone.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      localStorage.setItem('mock_user_profile', JSON.stringify(newProfile));
    } catch (e) {}
  }

  // 5. Sync to Cloud Firestore in background (Non-blocking: registration resolves in < 50ms)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const firestoreTasks: Promise<any>[] = [
      saveRecordToFirestore('registration_leads', newLead.id, newLead),
    ];
    if (newAppUser) {
      firestoreTasks.push(saveRecordToFirestore('appUsers', newAppUser.id, newAppUser));
    }
    Promise.race([
      Promise.all(firestoreTasks),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 1200))
    ]).catch((err) => {
      console.warn('Notice: Background Firestore lead sync deferred (local lead safe).', err);
    });
  }

  // 6. Generate WhatsApp inquiry/confirmation link
  const whatsappUrl = buildLeadWhatsAppInquiryUrl(newLead);

  return { lead: newLead, licenseKey, whatsappUrl };
}

export function buildLeadWhatsAppInquiryUrl(lead: RegistrationLead, adminNumber = ADMIN_PRIMARY_WHATSAPP): string {
  const formattedAdmin = formatWhatsAppPhone(adminNumber);
  const dateStr = new Date(lead.submittedAt).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [
    `🏥 *MBI INVENTRA — NEW REGISTRATION INQUIRY*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏪 *Store Name:* ${lead.storeName}`,
    `👤 *Owner / Admin:* ${lead.ownerName}`,
    `🆔 *Requested Username:* ${lead.username || lead.email.split('@')[0]}`,
    `🔒 *Password Chosen:* ${lead.password ? '****** (Secured in request)' : 'Default (1234)'}`,
    `📱 *WhatsApp / Phone:* ${lead.phone}`,
    `📍 *City:* ${lead.city}`,
    `🏠 *Address:* ${lead.address}`,
    `📧 *Email:* ${lead.email}`,
  ];

  if (lead.drugLicenseNo) {
    lines.push(`📜 *Drug License:* ${lead.drugLicenseNo}`);
  }
  if (lead.ntnNumber) {
    lines.push(`💼 *NTN Number:* ${lead.ntnNumber}`);
  }

  lines.push(`📦 *Requested Plan:* ${lead.requestedPlan}`);
  lines.push(`🚦 *Account Status:* ${lead.isApproved ? '✅ Active (10-Day Free Trial)' : '⏳ PENDING APPROVAL (Permission Required)'}`);
  lines.push(`🕒 *Submitted:* ${dateStr}`);
  lines.push(`🆔 *Ref ID:* \`${lead.id}\``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (lead.isApproved) {
    lines.push(`_Salam Admin sb, I have registered my pharmacy on MBI Inventra with an automatic 10-Day Free Trial on the Basic Plan. My account is active with username: ${lead.username || lead.email.split('@')[0]}._`);
  } else {
    lines.push(`_Salam Admin sb! I want to subscribe to *${lead.requestedPlan}* for *${lead.storeName}*. Please review and approve my account registration. My username is: ${lead.username || lead.email.split('@')[0]}._`);
  }

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${formattedAdmin}?text=${encodedText}`;
}

export function buildCustomerReplyWhatsAppUrl(lead: RegistrationLead, activationKey?: string): string {
  const formattedPhone = formatWhatsAppPhone(lead.phone);
  const keyToUse = activationKey || lead.activationKey || generateNewLicenseKey(lead.requestedPlan as any);
  const userToUse = lead.username || lead.email || lead.phone;
  const passToUse = lead.password || '1234';

  const lines: string[] = [
    `👋 *Salam ${lead.ownerName} sb!*`,
    `Welcome to *MBI Inventra — Enterprise Pharmacy POS & ERP*.`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Your application for *${lead.storeName}* (${lead.city}) has been approved by Master Admin!`,
    ``,
    `🔑 *YOUR OFFICIAL ACTIVATION KEY:*`,
    `*${keyToUse}*`,
    ``,
    `👤 *YOUR LOGIN CREDENTIALS:*`,
    `• *Username / ID:* ${userToUse}`,
    `• *Password:* ${passToUse}`,
    ``,
    `📋 *Quick Login Steps:*`,
    `1. Open MBI Inventra Login screen (/login).`,
    `2. Enter your Username (*${userToUse}*) and Password.`,
    `3. Click Sign In — your store workspace will unlock immediately!`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📞 *MBI Helpline:* 0328-1302636 / 0336-4585863`,
    `_Thank you for choosing MBI Inventra!_`
  ];

  const encodedText = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export function approveAndActivateLead(leadId: string, assignedPlan?: SoftwareCategoryPlan): {
  lead: RegistrationLead;
  licenseKey: string;
} {
  const leads = getAllRegistrationLeads();
  const lead = leads.find(l => l.id === leadId);
  if (!lead) throw new Error('Lead not found.');

  const plan = assignedPlan || lead.requestedPlan || 'Standard POS';
  const licenseKey = lead.activationKey || generateNewLicenseKey(plan as any);

  // Determine duration and pricing
  let expiryStr = 'Lifetime';
  let isTrial = false;
  let dealPrice = 19990;

  if (plan === '3 Days Trial' || plan === '3 Days') {
    expiryStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    isTrial = true;
    dealPrice = 0;
  } else if (plan === '7 Days Trial' || plan === '7 Days') {
    expiryStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    isTrial = true;
    dealPrice = 0;
  } else if (plan === '15 Days Trial' || plan === '15 Days') {
    expiryStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    isTrial = true;
    dealPrice = 0;
  } else if (plan === '30 Days Monthly' || plan === '30 Days') {
    expiryStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dealPrice = 1999;
  } else if (plan === 'Pharmacy Pro') {
    dealPrice = 39990;
  } else if (plan === 'Enterprise Multi-Branch') {
    dealPrice = 69990;
  }

  // 1. Create / update client license
  saveClientLicense({
    id: `lic_${Date.now()}`,
    licenseKey,
    clientName: lead.storeName,
    ownerName: lead.ownerName,
    phone: lead.phone,
    city: lead.city,
    plan: plan as any,
    status: 'Active',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: expiryStr,
    maxDevices: plan.includes('Enterprise') ? 10 : 3,
    strictHardwareLock: false,
    maxOfflineDays: 30,
    boundHardwareIds: [],
    allowedModules: {
      sales: true,
      purchases: true,
      pharmacy: true,
      inventory: true,
      reports: true,
      cloudSync: true,
      multiBranch: plan.includes('Enterprise'),
      aiVoice: true,
      cashierShifts: true,
      customPrint: true,
      accountsLedger: true,
      narcoticsSchedule: true,
      customerLoyalty: true,
      bulkExcel: true,
      barcodeLabels: true,
    },
    salePrice: dealPrice,
    amountPaid: dealPrice,
    amountDue: 0,
    saleStatus: isTrial ? 'Complimentary / Trial' : 'Paid',
    paymentMethod: isTrial ? 'Other' : 'Cash',
    notes: `Lead activated via WhatsApp Registry (${lead.id}) - Plan: ${plan}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Resilient composite identity linking for Tenant:
  const allTenants = getAllTenants();
  const existingTenant = allTenants.find(t => 
    (lead.phone && t.ownerPhone && t.ownerPhone.replace(/\D/g, '') === lead.phone.replace(/\D/g, '')) ||
    (lead.email && t.ownerEmail && t.ownerEmail.toLowerCase() === lead.email.toLowerCase()) ||
    (lead.storeName && t.name && t.name.toLowerCase() === lead.storeName.toLowerCase()) ||
    (t.licenseId === licenseKey)
  );

  let targetTenantId: string;

  if (existingTenant) {
    targetTenantId = existingTenant.tenantId;
    existingTenant.licenseId = licenseKey;
    existingTenant.plan = plan as any;
    existingTenant.status = 'Active';
    existingTenant.paidLicenseActive = !isTrial;
    existingTenant.isTrialActive = isTrial;
    existingTenant.trialExpiryDate = expiryStr;
    existingTenant.updatedAt = new Date().toISOString();
    saveTenant(existingTenant);
  } else {
    targetTenantId = `t-${lead.storeName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-${Date.now().toString().slice(-4)}`;
    saveTenant({
      id: `ten_${Date.now()}`,
      tenantId: targetTenantId,
      organizationId: `org_${Date.now()}`,
      licenseId: licenseKey,
      name: lead.storeName,
      ownerName: lead.ownerName,
      ownerPhone: lead.phone,
      ownerEmail: lead.email,
      city: lead.city,
      address: lead.address,
      plan: plan as any,
      status: 'Active',
      primaryAdminId: `usr_admin_${Date.now()}`,
      primaryAdminEmail: lead.email,
      trialStartDate: new Date().toISOString(),
      trialExpiryDate: expiryStr,
      isTrialActive: isTrial,
      trialExpired: false,
      paidLicenseActive: !isTrial,
      maxDevices: 5,
      featureToggles: {
        ...DEFAULT_TENANT_FEATURE_TOGGLES,
        multipleWarehouses: plan.includes('Enterprise'),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Provision Admin App User account with the chosen Username & Password
  const finalUsername = (lead.username || '').trim().toLowerCase() || (lead.email ? lead.email.toLowerCase().split('@')[0] : `user_${Date.now()}`);
  const finalPassword = lead.password || '1234';
  const newAppUser: AppUserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId: targetTenantId,
    name: lead.ownerName,
    username: finalUsername,
    emailOrPhone: lead.email || lead.phone,
    email: lead.email,
    role: 'Primary Admin',
    status: 'Joined',
    isApproved: true,
    passcode: finalPassword,
    notes: `Primary Admin created upon approval for ${lead.storeName}`,
    canEditInvoices: true,
    canDeleteInvoices: true,
    canReprintInvoices: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to IndexedDB & Firestore
  dbAppUsers.save(newAppUser).catch(e => console.warn('Could not save user locally:', e));
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('appUsers', newAppUser.id, newAppUser).catch(() => {});
  }

  // 4. Update Lead Status
  const updatedLead: RegistrationLead = {
    ...lead,
    status: 'activated',
    isApproved: true,
    activationKey: licenseKey,
    activatedAt: new Date().toISOString(),
  };
  saveRegistrationLeadLocal(updatedLead);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('registration_leads', updatedLead.id, updatedLead).catch(() => {});
  }

  return { lead: updatedLead, licenseKey };
}

export function updateLeadStatus(leadId: string, status: RegistrationLead['status'], notes?: string): RegistrationLead[] {
  const leads = getAllRegistrationLeads();
  const index = leads.findIndex(l => l.id === leadId);
  if (index >= 0) {
    leads[index].status = status;
    if (notes !== undefined) leads[index].notes = notes;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
      window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated', { detail: leads[index] }));
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      saveRecordToFirestore('registration_leads', leadId, leads[index]).catch(() => {});
    }
  }
  return leads;
}

export function deleteRegistrationLead(leadId: string): RegistrationLead[] {
  recordDeletedLeadId(leadId);
  const leads = getAllRegistrationLeads().filter(l => l.id !== leadId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated'));
  }
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    deleteRecordFromFirestore('registration_leads', leadId).catch(err => {
      console.warn('Notice: Background Firestore lead deletion deferred:', err);
    });
  }
  return leads;
}
