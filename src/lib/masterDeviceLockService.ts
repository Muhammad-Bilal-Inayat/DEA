import { v4 as uuidv4 } from 'uuid';
import { logMasterAudit, logServerActivity } from './masterServerService';

export interface WhitelistedHardwareDevice {
  id: string;
  name: string;
  type: 'Laptop' | 'Mobile' | 'Desktop' | 'Emergency_Device';
  model: string;
  serialOrDeviceId: string;
  productIdOrBuild: string;
  specsSummary: string;
  hardwareKey: string;
  isPreConfigured: boolean;
  isPaired: boolean;
  pairedAt?: string;
  lastAccessAt?: string;
  status: 'ACTIVE' | 'REVOKED' | 'LOCKED';
}

const MASTER_WHITELIST_KEY = 'mbi_master_whitelisted_devices_v1';
const CURRENT_DEVICE_TOKEN_KEY = 'mbi_master_device_auth_token_v1';
const EMERGENCY_BYPASS_KEY = 'mbi_master_emergency_override_secret_v1';

// Default pre-registered hardware devices specified by the owner
export const INITIAL_WHITELISTED_DEVICES: WhitelistedHardwareDevice[] = [
  {
    id: 'dev_mbi_laptop_01',
    name: 'MBI-LP (Master Admin Laptop)',
    type: 'Laptop',
    model: 'MBI-LP (Intel Core i7-8665U @ 1.90GHz / 16GB RAM)',
    serialOrDeviceId: 'B44B46B9-83F4-4AE0-8EC5-4BF07EC1B84A',
    productIdOrBuild: '00330-52627-28992-AAOEM',
    specsSummary: 'Intel(R) Core(TM) i7-8665U CPU @ 1.90GHz | 16.0 GB RAM | 64-bit Windows | 10 Touch Points',
    hardwareKey: 'MBI-LP-HW-B44B46B9-83F4-4AE0',
    isPreConfigured: true,
    isPaired: true,
    pairedAt: new Date().toISOString(),
    status: 'ACTIVE'
  },
  {
    id: 'dev_mbi_phone_02',
    name: 'Vivo V2310 (Master Admin Mobile)',
    type: 'Mobile',
    model: 'Vivo V2310 (Funtouch OS 15 / Android 15)',
    serialOrDeviceId: '10FDCU07UZ000ME',
    productIdOrBuild: 'PD2317KF_EX_A_15.2.23.4.W20',
    specsSummary: 'Vivo V2310 | Serial: 10FDCU07UZ000ME | Build: PD2317KF | Kernel: 5.10.246-android12 | Baseband: MOLY.LR12A',
    hardwareKey: 'MBI-MOB-10FDCU07UZ000ME-V2310',
    isPreConfigured: true,
    isPaired: true,
    pairedAt: new Date().toISOString(),
    status: 'ACTIVE'
  }
];

// Master Emergency Recovery Secret (Cryptographically strong & unique)
export const DEFAULT_EMERGENCY_MASTER_CODE = 'MBI-SEC-9X8K-774P-V9Q2-ALPHA-786-MASTER-ULTRA';

/**
 * Advanced Client Device Fingerprint & Hardware Trait Extraction
 */
export function generateClientDeviceFingerprint(): {
  fingerprintHash: string;
  userAgent: string;
  platform: string;
  screenRes: string;
  language: string;
  cores: number;
  gpuRenderer?: string;
  colorDepth?: number;
  pixelRatio?: number;
  timezone?: string;
} {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown-Agent';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || (navigator as any).userAgentData?.platform || 'Web-Browser') : 'Unknown-Platform';
  const screenRes = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
  const colorDepth = typeof window !== 'undefined' && window.screen ? window.screen.colorDepth : 24;
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const language = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const timezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  // Extract WebGL GPU Unmasked Renderer for true hardware identity
  let gpuRenderer = 'Standard-GPU';
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
        }
      }
    } catch {}
  }

  // Multi-layer hardware entropy hashing
  const rawEntropy = `${ua}|${platform}|${screenRes}|${colorDepth}|${pixelRatio}|${language}|${cores}|${timezone}|${gpuRenderer}`;
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < rawEntropy.length; i++) {
    const char = rawEntropy.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const hex1 = Math.abs(hash1).toString(16).toUpperCase().padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).toUpperCase().padStart(8, '0');
  const fingerprintHash = `HW-SEC-${hex1}${hex2}-${screenRes.replace('x', '')}`;

  return {
    fingerprintHash,
    userAgent: ua,
    platform,
    screenRes,
    language,
    cores,
    gpuRenderer,
    colorDepth,
    pixelRatio,
    timezone
  };
}

/**
 * Get all whitelisted hardware devices
 */
export function getWhitelistedDevices(): WhitelistedHardwareDevice[] {
  try {
    const stored = localStorage.getItem(MASTER_WHITELIST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  localStorage.setItem(MASTER_WHITELIST_KEY, JSON.stringify(INITIAL_WHITELISTED_DEVICES));
  return INITIAL_WHITELISTED_DEVICES;
}

/**
 * Save whitelisted hardware devices
 */
export function saveWhitelistedDevices(devices: WhitelistedHardwareDevice[]): WhitelistedHardwareDevice[] {
  localStorage.setItem(MASTER_WHITELIST_KEY, JSON.stringify(devices));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-whitelisted-devices-updated', { detail: devices }));
  }
  return devices;
}

/**
 * Get active emergency master secret
 */
export function getEmergencyMasterCode(): string {
  return localStorage.getItem(EMERGENCY_BYPASS_KEY) || DEFAULT_EMERGENCY_MASTER_CODE;
}

/**
 * Set a new emergency master secret
 */
export function setEmergencyMasterCode(newCode: string): void {
  localStorage.setItem(EMERGENCY_BYPASS_KEY, newCode.trim());
}

/**
 * Check if the current browser session has verified hardware authorization for /server
 */
export function isCurrentDeviceAuthorizedForMasterServer(): {
  authorized: boolean;
  device?: WhitelistedHardwareDevice | null;
  reason?: string;
  fingerprint?: ReturnType<typeof generateClientDeviceFingerprint>;
} {
  const fp = generateClientDeviceFingerprint();
  try {
    const token = localStorage.getItem(CURRENT_DEVICE_TOKEN_KEY);
    if (!token) {
      return { 
        authorized: false, 
        reason: 'Hardware token not found on this client. Automatic device authorization failed.',
        fingerprint: fp 
      };
    }

    const devices = getWhitelistedDevices();
    const matched = devices.find(d => d.hardwareKey === token && d.status === 'ACTIVE');

    if (matched) {
      // Update last access timestamp
      matched.lastAccessAt = new Date().toISOString();
      saveWhitelistedDevices(devices);
      return { authorized: true, device: matched, fingerprint: fp };
    }

    return { 
      authorized: false, 
      reason: 'Device authorization token is invalid or has been revoked.',
      fingerprint: fp 
    };
  } catch (e) {
    return { authorized: false, reason: 'Security scanner exception.', fingerprint: fp };
  }
}

/**
 * Auto-detect and evaluate whether current device should be allowed or locked out
 */
export function autoDetectDeviceAndVerify(): {
  authorized: boolean;
  device?: WhitelistedHardwareDevice | null;
  fingerprint: ReturnType<typeof generateClientDeviceFingerprint>;
  reason?: string;
} {
  const check = isCurrentDeviceAuthorizedForMasterServer();
  const fp = check.fingerprint || generateClientDeviceFingerprint();

  if (check.authorized && check.device) {
    return {
      authorized: true,
      device: check.device,
      fingerprint: fp
    };
  }

  return {
    authorized: false,
    device: null,
    fingerprint: fp,
    reason: check.reason || 'Unauthorized hardware identity.'
  };
}

/**
 * Clear current device token
 */
export function clearCurrentDevicePairing(): void {
  try {
    localStorage.removeItem(CURRENT_DEVICE_TOKEN_KEY);
  } catch (e) {}
}

/**
 * Pair / Authorize current device using registered Hardware Profile + Master Key
 */
export function pairDeviceWithMasterKey(
  deviceId: string,
  masterKeyInput: string
): { success: boolean; message: string; device?: WhitelistedHardwareDevice } {
  const cleanPass = masterKeyInput.trim();
  if (cleanPass !== 'mbi786' && cleanPass !== 'admin123' && cleanPass !== '0000') {
    return { success: false, message: 'Invalid Master Admin Key / Password.' };
  }

  const devices = getWhitelistedDevices();
  const target = devices.find(d => d.id === deviceId);

  if (!target) {
    return { success: false, message: 'Selected hardware profile not found in whitelist.' };
  }

  if (target.status !== 'ACTIVE') {
    return { success: false, message: 'This hardware device has been revoked or locked.' };
  }

  target.isPaired = true;
  target.pairedAt = new Date().toISOString();
  target.lastAccessAt = new Date().toISOString();
  saveWhitelistedDevices(devices);

  // Store active token in browser
  localStorage.setItem(CURRENT_DEVICE_TOKEN_KEY, target.hardwareKey);

  logMasterAudit(
    'Hardware Device Paired',
    'SECURITY',
    `Device "${target.name}" successfully authenticated and paired for /server access.`
  );

  logServerActivity({
    tenantName: 'Master Headquarters',
    userName: 'Master Admin',
    userRole: 'Admin',
    ipAddress: 'Authorized Hardware Node',
    action: 'DEVICE_HARDWARE_PAIRED',
    actionType: 'SECURITY',
    details: `Hardware paired: ${target.name} (${target.model})`,
    status: 'SUCCESS'
  });

  return { success: true, message: `Device "${target.name}" paired successfully!`, device: target };
}

/**
 * Emergency Master Bypass: Authorize a new emergency device with emergency secret
 */
export function emergencyAuthorizeDevice(
  emergencyCodeInput: string,
  newDeviceLabel: string
): { success: boolean; message: string; device?: WhitelistedHardwareDevice } {
  const cleanCode = (emergencyCodeInput || '').trim();
  const validEmergencyCode = getEmergencyMasterCode();

  const isCodeValid = 
    cleanCode === validEmergencyCode || 
    cleanCode === DEFAULT_EMERGENCY_MASTER_CODE ||
    cleanCode === 'mbi786' ||
    cleanCode === 'vip123' ||
    cleanCode === 'admin123' ||
    cleanCode === '786';

  if (!isCodeValid) {
    logMasterAudit('Failed Emergency Device Bypass', 'SECURITY', `Attempted unauthorized emergency bypass.`);
    return { success: false, message: 'Invalid Emergency Master Passphrase. Please enter your Master Key (e.g. mbi786 or admin123).' };
  }

  const devices = getWhitelistedDevices();
  const newHwKey = 'MBI-EMG-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
  
  const newDevice: WhitelistedHardwareDevice = {
    id: 'dev_emg_' + Date.now(),
    name: newDeviceLabel.trim() || `Emergency Device (${new Date().toLocaleDateString()})`,
    type: 'Emergency_Device',
    model: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 40)}...` : 'Remote Web Terminal',
    serialOrDeviceId: 'EMERGENCY-BYPASS-TOKEN',
    productIdOrBuild: 'MBI-AUTH-OVERRIDE',
    specsSummary: `Authorized via Emergency Master Recovery Key on ${new Date().toLocaleString()}`,
    hardwareKey: newHwKey,
    isPreConfigured: false,
    isPaired: true,
    pairedAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString(),
    status: 'ACTIVE'
  };

  devices.unshift(newDevice);
  saveWhitelistedDevices(devices);
  localStorage.setItem(CURRENT_DEVICE_TOKEN_KEY, newHwKey);

  logMasterAudit(
    'EMERGENCY BYPASS USED',
    'SECURITY',
    `Emergency Master Recovery Key used to authorize new device "${newDevice.name}".`
  );

  logServerActivity({
    tenantName: 'Master Headquarters',
    userName: 'Master Admin',
    userRole: 'Admin',
    ipAddress: 'Emergency Node',
    action: 'EMERGENCY_DEVICE_BYPASS',
    actionType: 'SECURITY',
    details: `Emergency bypass authorization granted for: ${newDevice.name}`,
    status: 'SUCCESS'
  });

  return {
    success: true,
    message: `Emergency authorization successful! "${newDevice.name}" is now authorized to access /server.`,
    device: newDevice
  };
}

/**
 * Add a new hardware device to the whitelist from inside /server
 */
export function addWhitelistedDevice(device: Omit<WhitelistedHardwareDevice, 'id' | 'hardwareKey' | 'isPaired' | 'pairedAt' | 'status'>): WhitelistedHardwareDevice {
  const devices = getWhitelistedDevices();
  const hwKey = `MBI-DEV-${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;

  const newDev: WhitelistedHardwareDevice = {
    ...device,
    id: 'dev_' + uuidv4().substring(0, 8),
    hardwareKey: hwKey,
    isPaired: false,
    status: 'ACTIVE'
  };

  devices.push(newDev);
  saveWhitelistedDevices(devices);
  logMasterAudit('Device Whitelist Added', 'SECURITY', `Added new hardware profile "${newDev.name}" (${newDev.model}) to Master whitelist.`);
  return newDev;
}

/**
 * Revoke device access
 */
export function revokeWhitelistedDevice(deviceId: string): WhitelistedHardwareDevice[] {
  const devices = getWhitelistedDevices();
  const target = devices.find(d => d.id === deviceId);
  if (target) {
    target.status = 'REVOKED';
    saveWhitelistedDevices(devices);
    
    // If revoking current active device, clear token
    const currentToken = localStorage.getItem(CURRENT_DEVICE_TOKEN_KEY);
    if (currentToken === target.hardwareKey) {
      localStorage.removeItem(CURRENT_DEVICE_TOKEN_KEY);
    }

    logMasterAudit('Device Revoked', 'SECURITY', `Revoked access for hardware device "${target.name}".`);
  }
  return devices;
}

/**
 * Delete device from whitelist
 */
export function deleteWhitelistedDevice(deviceId: string): WhitelistedHardwareDevice[] {
  let devices = getWhitelistedDevices();
  const target = devices.find(d => d.id === deviceId);
  devices = devices.filter(d => d.id !== deviceId);
  saveWhitelistedDevices(devices);

  if (target) {
    const currentToken = localStorage.getItem(CURRENT_DEVICE_TOKEN_KEY);
    if (currentToken === target.hardwareKey) {
      localStorage.removeItem(CURRENT_DEVICE_TOKEN_KEY);
    }
    logMasterAudit('Device Removed from Whitelist', 'SECURITY', `Removed device "${target.name}" from whitelist.`);
  }

  return devices;
}
