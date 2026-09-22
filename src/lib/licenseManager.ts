import { generateHardwareProfile, getSystemHWIDSync, verifySystemClockIntegrity } from './hardwareFingerprint';
import { getAllClientLicenses, recordClientHeartbeat, ClientInstanceHeartbeat } from './masterServerService';

export interface LicenseInfo {
  installationId: string;
  licenseKey: string;
  status: 'Active' | 'Expiring' | 'Expired' | 'Deactivated' | 'Hardware_Locked';
  expiryDate: string;
  plan: string;
  lastCheck: string;
  customerName?: string;
  boundHwid?: string;
  currentHwid?: string;
  isHardwareLocked?: boolean;
  lockReason?: string;
  sessionStartTime?: string;
  totalActiveMinutes?: number;
}

const INSTALLATION_ID_KEY = 'mbi_installation_id';
const LICENSE_STATE_KEY = 'mbi_license_state';
const LAST_BACKUP_TIME_KEY = 'mbi_last_local_backup_time';
const SESSION_MINUTES_KEY = 'mbi_total_active_minutes';

export function getInstallationId(): string {
  let id = localStorage.getItem(INSTALLATION_ID_KEY);
  if (!id) {
    id = 'MBI-INST-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem(INSTALLATION_ID_KEY, id);
  }
  return id;
}

/**
 * Get current system active usage minutes
 */
export function getTotalActiveMinutes(): number {
  return Number(localStorage.getItem(SESSION_MINUTES_KEY) || '120');
}

/**
 * Increment total active usage minutes
 */
export function incrementActiveMinutes(minutes: number = 1): number {
  const current = getTotalActiveMinutes() + minutes;
  localStorage.setItem(SESSION_MINUTES_KEY, String(current));
  return current;
}

/**
 * Validate hardware binding & signature integrity
 */
export async function verifyLicenseWithHardware(): Promise<{
  isValid: boolean;
  status: LicenseInfo['status'];
  message?: string;
  hwid: string;
}> {
  // 1. Check Clock Rollback Integrity
  const clockCheck = verifySystemClockIntegrity();
  if (!clockCheck.isValid) {
    return {
      isValid: false,
      status: 'Hardware_Locked',
      message: clockCheck.message,
      hwid: getSystemHWIDSync()
    };
  }

  // 2. Compute true multi-entropy HWID
  const profile = await generateHardwareProfile();
  const currentHwid = profile.hwid;
  const license = getLicenseInfo();

  // 3. Find matching Master Registry license to check hardware binding
  const masterLicenses = getAllClientLicenses();
  const matchedMasterLicense = masterLicenses.find(l => l.licenseKey === license.licenseKey);

  if (matchedMasterLicense) {
    // If strict hardware lock is enabled on this license
    if (matchedMasterLicense.strictHardwareLock) {
      if (matchedMasterLicense.boundHardwareIds.length === 0) {
        // Auto-bind this first device!
        matchedMasterLicense.boundHardwareIds = [currentHwid];
        matchedMasterLicense.updatedAt = new Date().toISOString();
        localStorage.setItem('mbi_master_licenses_v2', JSON.stringify(masterLicenses));
      } else if (!matchedMasterLicense.boundHardwareIds.includes(currentHwid)) {
        // Hardware Mismatch! Different machine detected!
        return {
          isValid: false,
          status: 'Hardware_Locked',
          message: `License is locked to another authorized computer (Bound: ${matchedMasterLicense.boundHardwareIds[0].substring(0, 14)}...). Please contact administrator (0336-4585863) to transfer hardware.`,
          hwid: currentHwid
        };
      }
    }

    // Check expiry
    if (matchedMasterLicense.expiryDate !== 'Lifetime') {
      const expDate = new Date(matchedMasterLicense.expiryDate);
      if (expDate.getTime() < Date.now()) {
        return {
          isValid: false,
          status: 'Expired',
          message: `Your license key has expired on ${matchedMasterLicense.expiryDate}. Please renew subscription.`,
          hwid: currentHwid
        };
      }
    }

    if (matchedMasterLicense.status === 'Suspended') {
      return {
        isValid: false,
        status: 'Deactivated',
        message: 'This license has been suspended by the central server administration.',
        hwid: currentHwid
      };
    }
  }

  return {
    isValid: true,
    status: 'Active',
    hwid: currentHwid
  };
}

export function getLicenseInfo(): LicenseInfo {
  const installationId = getInstallationId();
  const currentHwid = getSystemHWIDSync();
  const stored = localStorage.getItem(LICENSE_STATE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { 
        ...parsed, 
        installationId,
        currentHwid,
        totalActiveMinutes: getTotalActiveMinutes()
      };
    } catch (e) {
      console.error(e);
    }
  }

  // Default active trial/license for fresh standalone installation
  const defaultLicense: LicenseInfo = {
    installationId,
    licenseKey: 'MBI-PRO-2026-8812',
    status: 'Active',
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    plan: 'Enterprise Business Local Plan',
    lastCheck: new Date().toISOString(),
    customerName: 'Al-Madina Pharmacy & Health Care',
    boundHwid: currentHwid,
    currentHwid,
    sessionStartTime: new Date().toISOString(),
    totalActiveMinutes: getTotalActiveMinutes()
  };
  localStorage.setItem(LICENSE_STATE_KEY, JSON.stringify(defaultLicense));
  return defaultLicense;
}

export function saveLicenseInfo(info: LicenseInfo) {
  const currentHwid = getSystemHWIDSync();
  const toSave = { ...info, currentHwid };
  localStorage.setItem(LICENSE_STATE_KEY, JSON.stringify(toSave));

  // Also register in master admin simulated registry if stored
  const registry = getMasterRegistry();
  const existingIdx = registry.findIndex(r => r.installationId === info.installationId);
  if (existingIdx >= 0) {
    registry[existingIdx] = toSave;
  } else {
    registry.push(toSave);
  }
  localStorage.setItem('mbi_master_installations_registry', JSON.stringify(registry));
}

export function getMasterRegistry(): LicenseInfo[] {
  const stored = localStorage.getItem('mbi_master_installations_registry');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  const current = getLicenseInfo();
  const initial = [current];
  localStorage.setItem('mbi_master_installations_registry', JSON.stringify(initial));
  return initial;
}

export function setLastLocalBackupTime() {
  const now = new Date().toISOString();
  localStorage.setItem(LAST_BACKUP_TIME_KEY, now);
  return now;
}

export function getLastLocalBackupTime(): string {
  return localStorage.getItem(LAST_BACKUP_TIME_KEY) || 'No backup yet';
}

export function activateLicenseKey(rawKey: string): { success: boolean; message?: string } {
  const cleanKey = (rawKey || '').trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, message: 'Please enter a valid license key' };
  }

  const allLicenses = getAllClientLicenses();
  const matched = allLicenses.find(l => l.licenseKey.toUpperCase() === cleanKey);

  const hwid = getSystemHWIDSync();
  const installationId = getInstallationId();

  if (matched) {
    if (matched.status === 'Suspended' || matched.status === 'Expired') {
      return { success: false, message: `License is currently ${matched.status}. Contact Master Admin for renewal.` };
    }

    const customer = (matched as any).customerName || matched.clientName || 'Pharmacy Client';
    const updated: LicenseInfo = {
      installationId,
      licenseKey: matched.licenseKey,
      status: 'Active',
      expiryDate: matched.expiryDate,
      plan: matched.plan,
      lastCheck: new Date().toISOString(),
      customerName: customer,
      boundHwid: hwid,
      currentHwid: hwid,
      sessionStartTime: new Date().toISOString(),
      totalActiveMinutes: getTotalActiveMinutes()
    };
    saveLicenseInfo(updated);
    return { success: true, message: `License successfully activated for ${customer}!` };
  }

  // If format matches standard MBI key prefix, allow activation and register
  if (cleanKey.startsWith('MBI-') && cleanKey.length >= 10) {
    const dynamicLicense: LicenseInfo = {
      installationId,
      licenseKey: cleanKey,
      status: 'Active',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      plan: cleanKey.includes('ENT') ? 'Enterprise Multi-Branch' : cleanKey.includes('PRO') ? 'Pharmacy Pro' : 'Standard POS',
      lastCheck: new Date().toISOString(),
      customerName: 'Activated Store License',
      boundHwid: hwid,
      currentHwid: hwid,
      sessionStartTime: new Date().toISOString(),
      totalActiveMinutes: getTotalActiveMinutes()
    };
    saveLicenseInfo(dynamicLicense);
    return { success: true, message: 'License key activated successfully!' };
  }

  return { success: false, message: 'Invalid or unregistered License Key. Please contact Master Admin on WhatsApp.' };
}
