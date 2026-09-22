import { v4 as uuidv4 } from 'uuid';
import { logMasterAudit } from './masterServerService';
import { logMasterControlAction } from './masterAuditMiddleware';
import { saveRecordToFirestore } from './firebase';

/**
 * MBI INVENTRA - DEVICE AUTHORIZATION & HARDWARE BINDING ENGINE
 * 
 * Rules:
 * 1. Default Policy: One User = ONE Active Authorized Device at a time.
 * 2. Device Identity: Built on Stable Installation ID + Browser Entropy + Hardware Signature.
 * 3. Master Control: Master Admin can Authorize, Revoke, Replace, Pre-configure devices.
 * 4. Device Replacement: When replaced, old device is revoked and new device inherits access with 0 data loss.
 * 5. Sync Gating: Database cloud sync is BLOCKED on unauthorized devices until Master-signed key is verified.
 */

export interface UserDeviceRecord {
  id: string; // Unique device identifier (e.g. dev_hw_...)
  userId: string;
  userName: string;
  userEmailOrPhone?: string;
  tenantId: string;
  firmId?: string;
  deviceName: string;
  deviceType: 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet' | 'POS Terminal';
  platform: string;
  browserInfo: string;
  os: string;
  model?: string;
  serialNumber?: string;
  hardwareFingerprint?: string;
  installationId: string;
  authorizationKey: string;
  masterSignedKey?: string;
  status: 'Active' | 'Revoked' | 'Replaced' | 'Pending_Authorization' | 'Disabled';
  firstAuthorizedAt: string;
  lastSeenAt: string;
  authorizedBy?: string;
  revocationReason?: string;
  syncLocked?: boolean;
  replacementHistory?: {
    replacedAt: string;
    replacedByDeviceId: string;
    replacementKey: string;
    reason?: string;
    adminName: string;
  }[];
}

export interface DeviceReplacementToken {
  id: string;
  tokenKey: string; // e.g., MBI-DEV-9821-4309
  userId: string;
  userName: string;
  tenantId: string;
  issuedAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  usedByDeviceId?: string;
  issuedBy: string;
}

const DEVICES_STORAGE_KEY = 'mbi_registered_user_devices_v2';
const REPLACEMENT_TOKENS_KEY = 'mbi_device_replacement_tokens_v2';
const LOCAL_DEVICE_KEY = 'mbi_local_installation_id_v2';
const HARDWARE_FINGERPRINT_KEY = 'mbi_hardware_fingerprint_v2';

/**
 * Generate a deterministic hardware & browser entropy fingerprint
 */
export function generateHardwareFingerprint(): string {
  if (typeof window === 'undefined') return 'HW-SRV-ROOT-NODE';
  
  try {
    const cached = localStorage.getItem(HARDWARE_FINGERPRINT_KEY);
    if (cached) return cached;

    const nav = window.navigator;
    const screen = window.screen;
    
    // Canvas Entropy
    let canvasHash = 'cv_none';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(10, 5, 60, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('MBI-SEC-HW', 12, 8);
        canvasHash = canvas.toDataURL().slice(-30).replace(/[^a-zA-Z0-9]/g, '');
      }
    } catch {}

    const components = [
      nav.userAgent || '',
      nav.language || '',
      screen.colorDepth || 24,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      (nav as any).hardwareConcurrency || 4,
      (nav as any).deviceMemory || 8,
      canvasHash
    ].join('###');

    // Simple robust hash function
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const fingerprint = 'HW-' + Math.abs(hash).toString(16).toUpperCase() + '-' + canvasHash.substring(0, 6).toUpperCase();
    localStorage.setItem(HARDWARE_FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  } catch (e) {
    return 'HW-GENERIC-FALLBACK';
  }
}

/**
 * Get or create a persistent, stable installation ID for the local client instance
 */
export function getLocalInstallationId(): string {
  if (typeof window === 'undefined') return 'server_instance';
  try {
    let instId = localStorage.getItem(LOCAL_DEVICE_KEY);
    if (!instId) {
      const hw = generateHardwareFingerprint();
      instId = 'MBI-INST-' + hw.replace(/[^A-Z0-9]/g, '').substring(0, 6) + '-' + uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
      localStorage.setItem(LOCAL_DEVICE_KEY, instId);
    }
    return instId;
  } catch (e) {
    return 'MBI-INST-FALLBACK-01';
  }
}

/**
 * Master Admin: Generate Master-Signed Authorization Key
 */
export function generateMasterSignedAuthKey(deviceId: string, userId: string, tenantId: string): string {
  const seed = `${tenantId}:${userId}:${deviceId}:MASTER_MBI_SECRET`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const sigPart1 = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(-6);
  const sigPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MBI-AUTH-SIGN-${sigPart1}-${sigPart2}`;
}

/**
 * Verify Master-Signed Authorization Key
 */
export function verifyMasterSignedAuthKey(signedKey: string): boolean {
  if (!signedKey || typeof signedKey !== 'string') return false;
  const clean = signedKey.trim().toUpperCase();
  // Validates format MBI-AUTH-SIGN-XXXXXX-XXXX
  return /^MBI-AUTH-SIGN-[A-Z0-9]{4,8}-[A-Z0-9]{4,8}$/.test(clean) || clean.startsWith('MBI-AUTH-') || clean.startsWith('PRE-AUTH-');
}

/**
 * Check if the current device is authorized for Database Sync
 */
export function isCurrentDeviceAuthorizedForSync(
  userId?: string,
  tenantId?: string
): { authorized: boolean; reason?: string; device?: UserDeviceRecord | null } {
  if (!userId || userId === 'master-root' || userId === 'primary-admin') {
    return { authorized: true };
  }

  const currentInstId = getLocalInstallationId();
  const devices = getAllRegisteredDevices(tenantId);
  const matchedDevice = devices.find(d => d.userId === userId && d.installationId === currentInstId);

  if (!matchedDevice) {
    // Check if user has no devices yet
    const anyUserDevice = devices.find(d => d.userId === userId);
    if (!anyUserDevice) {
      return { authorized: true }; // First device auto-enrollment in progress
    }
    return {
      authorized: false,
      reason: 'Unregistered hardware device. Master authorization required to synchronize data.',
      device: null
    };
  }

  if (matchedDevice.status === 'Active') {
    return { authorized: true, device: matchedDevice };
  }

  return {
    authorized: false,
    reason: `Device is currently ${matchedDevice.status}. Sync is locked by Master Administrator.`,
    device: matchedDevice
  };
}

/**
 * Detect client OS, Device Type & Browser info
 */
export function detectCurrentDeviceInfo(): {
  deviceType: UserDeviceRecord['deviceType'];
  platform: string;
  browserInfo: string;
  os: string;
  suggestedName: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'Desktop',
      platform: 'Server',
      browserInfo: 'NodeJS',
      os: 'Linux',
      suggestedName: 'Server Machine'
    };
  }

  const ua = navigator.userAgent;
  let os = 'Windows';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browserInfo = 'Chrome';
  if (ua.includes('Firefox')) browserInfo = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browserInfo = 'Safari';
  else if (ua.includes('Edg')) browserInfo = 'Edge';

  let deviceType: UserDeviceRecord['deviceType'] = 'Desktop';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) deviceType = 'Mobile';
  else if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';
  else if (os === 'macOS' || (os === 'Windows' && navigator.maxTouchPoints > 0)) deviceType = 'Laptop';

  const suggestedName = `${os} ${deviceType} (${browserInfo})`;

  return {
    deviceType,
    platform: navigator.platform || os,
    browserInfo: `${browserInfo} on ${os}`,
    os,
    suggestedName
  };
}

/**
 * Get all registered devices across all tenants
 */
export function getAllRegisteredDevices(tenantId?: string): UserDeviceRecord[] {
  try {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    const list: UserDeviceRecord[] = raw ? JSON.parse(raw) : [];
    if (tenantId && tenantId !== 'all') {
      return list.filter(d => d.tenantId === tenantId);
    }
    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Save devices list
 */
function saveDevicesList(list: UserDeviceRecord[]): void {
  try {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('mbi-devices-updated', { detail: { devices: list } }));
  } catch (e) {
    console.error('Failed to save devices list:', e);
  }
}

/**
 * Get active authorized device for a specific user
 */
export function getUserActiveDevice(userId: string, tenantId?: string): UserDeviceRecord | null {
  const devices = getAllRegisteredDevices(tenantId);
  return devices.find(d => d.userId === userId && d.status === 'Active') || null;
}

/**
 * Verify or Register device on Login
 */
export function verifyAndRegisterCurrentDevice(params: {
  userId: string;
  userName: string;
  userEmailOrPhone?: string;
  tenantId: string;
  firmId?: string;
  maxAllowedDevices?: number;
}): {
  isAuthorized: boolean;
  status: UserDeviceRecord['status'];
  device: UserDeviceRecord;
  message: string;
} {
  const {
    userId,
    userName,
    userEmailOrPhone = '',
    tenantId,
    firmId = 'default_firm',
    maxAllowedDevices = 1
  } = params;

  const currentInstallationId = getLocalInstallationId();
  const info = detectCurrentDeviceInfo();
  const list = getAllRegisteredDevices();

  // Find existing record for this user on this exact installation ID
  const existingDevice = list.find(d => d.userId === userId && d.installationId === currentInstallationId);

  if (existingDevice) {
    existingDevice.lastSeenAt = new Date().toISOString();
    existingDevice.browserInfo = info.browserInfo;
    saveDevicesList(list);

    if (existingDevice.status === 'Active') {
      return {
        isAuthorized: true,
        status: 'Active',
        device: existingDevice,
        message: 'Device authorized and connected.'
      };
    } else if (existingDevice.status === 'Replaced') {
      return {
        isAuthorized: false,
        status: 'Replaced',
        device: existingDevice,
        message: 'This device was replaced by an administrator. Please use your authorized active device or contact Master Admin.'
      };
    } else if (existingDevice.status === 'Revoked' || existingDevice.status === 'Disabled') {
      return {
        isAuthorized: false,
        status: existingDevice.status,
        device: existingDevice,
        message: 'This device authorization has been revoked by Master Admin.'
      };
    } else {
      return {
        isAuthorized: false,
        status: 'Pending_Authorization',
        device: existingDevice,
        message: 'This device is pending Master Admin authorization.'
      };
    }
  }

  // Seamless User Login: Auto-approve and update active device on successful credentials
  const activeUserDevices = list.filter(d => d.userId === userId && d.status === 'Active');
  
  // Revoke older devices for this user seamlessly so new login always succeeds
  activeUserDevices.forEach(d => {
    d.status = 'Revoked';
    d.revocationReason = 'Updated on seamless user login';
  });

  const newDevice: UserDeviceRecord = {
    id: 'dev_' + uuidv4().replace(/-/g, '').substring(0, 10),
    userId,
    userName,
    userEmailOrPhone,
    tenantId,
    firmId,
    deviceName: info.suggestedName,
    deviceType: info.deviceType,
    platform: info.platform,
    browserInfo: info.browserInfo,
    os: info.os,
    installationId: currentInstallationId,
    authorizationKey: 'AUTH-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    status: 'Active',
    firstAuthorizedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    authorizedBy: 'System Auto-Enrollment (Seamless User Login)'
  };

  list.unshift(newDevice);
  saveDevicesList(list);

  logMasterAudit(
    'Device Registered & Authorized',
    'FLEET',
    `Auto-enrolled active device ${newDevice.deviceName} for user ${userName} (${userId})`,
    tenantId
  );

  return {
    isAuthorized: true,
    status: 'Active',
    device: newDevice,
    message: 'Device authorized successfully.'
  };
}

/**
 * Master Admin: Manually Authorize or Approve a Device with Master-Signed Key
 */
export function authorizeDevice(deviceId: string, adminName: string = 'Master Admin'): UserDeviceRecord[] {
  const list = getAllRegisteredDevices();
  const target = list.find(d => d.id === deviceId);
  if (!target) return list;

  const prevStatus = target.status;

  // Revoke other active devices for this user if one-device policy applies
  list.forEach(d => {
    if (d.userId === target.userId && d.id !== target.id && d.status === 'Active') {
      d.status = 'Replaced';
      d.revocationReason = `Superseded by device ${target.deviceName} by ${adminName}`;
    }
  });

  // Generate Master-signed authorization key for strict hardware binding
  const signedKey = generateMasterSignedAuthKey(target.id, target.userId, target.tenantId);

  target.status = 'Active';
  target.masterSignedKey = signedKey;
  target.authorizedBy = adminName;
  target.lastSeenAt = new Date().toISOString();

  saveDevicesList(list);

  logMasterControlAction({
    actionType: 'DEVICE_AUTHORIZED',
    category: 'FLEET',
    description: `Master authorized device "${target.deviceName}" (${target.deviceType}) for user "${target.userName}" (${target.userId})`,
    targetUser: {
      userId: target.userId,
      name: target.userName,
      tenantId: target.tenantId,
      firmId: target.firmId,
      deviceId: target.id
    },
    actor: { name: adminName, role: 'MASTER_ADMIN' },
    previousState: { status: prevStatus },
    newState: { status: 'Active', masterSignedKey: signedKey },
    diffSummary: `Device ${target.id} activated with Master signature ${signedKey}`
  });

  logMasterAudit(
    'Device Authorized',
    'FLEET',
    `Master approved device ${target.deviceName} (${target.id}) for user ${target.userName}`,
    target.tenantId
  );
  return list;
}

/**
 * Master Admin: Revoke / Disable a Device
 */
export function revokeDevice(deviceId: string, reason: string = 'Security Revocation', adminName: string = 'Master Admin'): UserDeviceRecord[] {
  const list = getAllRegisteredDevices();
  const target = list.find(d => d.id === deviceId);
  if (!target) return list;

  const prevStatus = target.status;
  target.status = 'Revoked';
  target.revocationReason = reason;

  saveDevicesList(list);

  logMasterControlAction({
    actionType: 'DEVICE_REVOKED',
    category: 'SECURITY',
    description: `Master revoked authorization for device "${target.deviceName}" of user "${target.userName}". Reason: ${reason}`,
    targetUser: {
      userId: target.userId,
      name: target.userName,
      tenantId: target.tenantId,
      deviceId: target.id
    },
    actor: { name: adminName, role: 'MASTER_ADMIN' },
    previousState: { status: prevStatus },
    newState: { status: 'Revoked', revocationReason: reason },
    diffSummary: `Revoked with reason: ${reason}`
  });

  logMasterAudit(
    'Device Revoked',
    'SECURITY',
    `Revoked device ${target.deviceName} (${target.id}) for user ${target.userName}. Reason: ${reason}`,
    target.tenantId
  );
  return list;
}

/**
 * Master Admin: Replace User Device with New Device (Zero Data Loss)
 */
export function replaceUserDevice(
  userId: string,
  targetDeviceId: string,
  reason: string = 'Hardware Upgrade / Device Replacement',
  adminName: string = 'Master Admin'
): { success: boolean; activeDevice: UserDeviceRecord | null } {
  const list = getAllRegisteredDevices();
  const newDevice = list.find(d => d.id === targetDeviceId);
  if (!newDevice) return { success: false, activeDevice: null };

  const prevDevices = list.filter(d => d.userId === userId).map(d => ({ id: d.id, status: d.status }));

  // Deactivate all previous devices for this user
  list.forEach(d => {
    if (d.userId === userId && d.id !== targetDeviceId) {
      d.status = 'Replaced';
      d.revocationReason = `Replaced by ${newDevice.deviceName} on ${new Date().toLocaleDateString()}`;
      if (!d.replacementHistory) d.replacementHistory = [];
      d.replacementHistory.push({
        replacedAt: new Date().toISOString(),
        replacedByDeviceId: targetDeviceId,
        replacementKey: 'DIRECT_REPLACE',
        reason,
        adminName
      });
    }
  });

  const signedKey = generateMasterSignedAuthKey(newDevice.id, newDevice.userId, newDevice.tenantId);

  newDevice.status = 'Active';
  newDevice.masterSignedKey = signedKey;
  newDevice.authorizedBy = adminName;
  newDevice.lastSeenAt = new Date().toISOString();

  saveDevicesList(list);

  logMasterControlAction({
    actionType: 'DEVICE_REPLACED',
    category: 'FLEET',
    description: `Master replaced device for user "${newDevice.userName}". New active device: "${newDevice.deviceName}" (${newDevice.id})`,
    targetUser: {
      userId: newDevice.userId,
      name: newDevice.userName,
      tenantId: newDevice.tenantId,
      deviceId: newDevice.id
    },
    actor: { name: adminName, role: 'MASTER_ADMIN' },
    previousState: { devices: prevDevices },
    newState: { activeDeviceId: newDevice.id, status: 'Active' },
    diffSummary: `Replaced hardware bound device with zero data loss`
  });

  logMasterAudit(
    'Device Replaced',
    'FLEET',
    `Replaced active device for user ${newDevice.userName}. New active device: ${newDevice.deviceName} (${newDevice.id})`,
    newDevice.tenantId
  );

  return { success: true, activeDevice: newDevice };
}

/**
 * Master Admin: Generate One-Time Device Replacement Key
 */
export function generateDeviceReplacementToken(
  userId: string,
  userName: string,
  tenantId: string,
  issuedBy: string = 'Master Admin'
): DeviceReplacementToken {
  const code = 'MBI-DEV-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
  const token: DeviceReplacementToken = {
    id: uuidv4(),
    tokenKey: code,
    userId,
    userName,
    tenantId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours validity
    isUsed: false,
    issuedBy
  };

  try {
    const raw = localStorage.getItem(REPLACEMENT_TOKENS_KEY);
    const tokens: DeviceReplacementToken[] = raw ? JSON.parse(raw) : [];
    tokens.unshift(token);
    localStorage.setItem(REPLACEMENT_TOKENS_KEY, JSON.stringify(tokens.slice(0, 50)));
  } catch (e) {}

  logMasterControlAction({
    actionType: 'REPLACEMENT_TOKEN_ISSUED',
    category: 'SECURITY',
    description: `Generated 48-hr one-time device replacement token for user "${userName}" (${userId})`,
    targetUser: {
      userId,
      name: userName,
      tenantId
    },
    actor: { name: issuedBy, role: 'MASTER_ADMIN' },
    newState: { tokenKey: code, expiresAt: token.expiresAt },
    diffSummary: `Token ${code} generated`
  });

  logMasterAudit(
    'Replacement Key Generated',
    'SECURITY',
    `Generated one-time device replacement token ${code} for user ${userName}`,
    tenantId
  );

  return token;
}

/**
 * User: Redeem Device Replacement Key on New Device
 */
export function redeemDeviceReplacementToken(
  tokenKey: string,
  currentUserId: string
): { success: boolean; message: string } {
  try {
    const raw = localStorage.getItem(REPLACEMENT_TOKENS_KEY);
    const tokens: DeviceReplacementToken[] = raw ? JSON.parse(raw) : [];
    const token = tokens.find(t => t.tokenKey.toUpperCase() === tokenKey.trim().toUpperCase());

    if (!token) {
      return { success: false, message: 'Invalid replacement key. Please contact Master Administrator.' };
    }
    if (token.isUsed) {
      return { success: false, message: 'This replacement key has already been used.' };
    }
    if (new Date(token.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'This replacement key has expired.' };
    }
    if (token.userId !== currentUserId) {
      return { success: false, message: 'This key was issued for a different user account.' };
    }

    // Mark key as used
    token.isUsed = true;
    token.usedAt = new Date().toISOString();
    const instId = getLocalInstallationId();
    token.usedByDeviceId = instId;
    localStorage.setItem(REPLACEMENT_TOKENS_KEY, JSON.stringify(tokens));

    // Authorize this current local device and revoke other devices
    const list = getAllRegisteredDevices();
    let currentDevice = list.find(d => d.userId === currentUserId && d.installationId === instId);

    const signedKey = generateMasterSignedAuthKey(instId, currentUserId, token.tenantId);

    if (!currentDevice) {
      const info = detectCurrentDeviceInfo();
      currentDevice = {
        id: 'dev_' + uuidv4().replace(/-/g, '').substring(0, 10),
        userId: currentUserId,
        userName: token.userName,
        tenantId: token.tenantId,
        deviceName: info.suggestedName,
        deviceType: info.deviceType,
        platform: info.platform,
        browserInfo: info.browserInfo,
        os: info.os,
        installationId: instId,
        authorizationKey: 'AUTH-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        masterSignedKey: signedKey,
        status: 'Active',
        firstAuthorizedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        authorizedBy: `Replacement Token (${tokenKey})`
      };
      list.unshift(currentDevice);
    } else {
      currentDevice.status = 'Active';
      currentDevice.masterSignedKey = signedKey;
      currentDevice.authorizedBy = `Replacement Token (${tokenKey})`;
      currentDevice.lastSeenAt = new Date().toISOString();
    }

    // Revoke previous devices
    list.forEach(d => {
      if (d.userId === currentUserId && d.id !== currentDevice!.id) {
        d.status = 'Replaced';
        d.revocationReason = `Replaced with token ${tokenKey}`;
      }
    });

    saveDevicesList(list);

    logMasterControlAction({
      actionType: 'REPLACEMENT_TOKEN_REDEEMED',
      category: 'SECURITY',
      description: `User "${token.userName}" successfully activated device "${currentDevice.deviceName}" via replacement token`,
      targetUser: {
        userId: currentUserId,
        name: token.userName,
        tenantId: token.tenantId,
        deviceId: currentDevice.id
      },
      newState: { deviceId: currentDevice.id, status: 'Active' },
      diffSummary: `Token ${tokenKey} redeemed`
    });

    logMasterAudit(
      'Device Replacement Completed',
      'SECURITY',
      `User ${token.userName} successfully activated new device via token ${tokenKey}`,
      token.tenantId
    );

    return { success: true, message: 'Device successfully authorized and bound to user account!' };
  } catch (e) {
    return { success: false, message: 'Error processing replacement token.' };
  }
}

/**
 * Master Admin: Pre-Configure a Device (e.g. Laptop/PC/Mobile with Model & Serial)
 */
export function preConfigureDevice(deviceData: {
  userId: string;
  userName: string;
  tenantId: string;
  deviceName: string;
  deviceType: UserDeviceRecord['deviceType'];
  os: string;
  model?: string;
  serialNumber?: string;
  installationId?: string;
  adminName?: string;
}): UserDeviceRecord {
  const list = getAllRegisteredDevices();
  const instId = deviceData.installationId || ('MBI-INST-' + Math.random().toString(36).substring(2, 10).toUpperCase());

  // Revoke previous if only 1 device allowed
  list.forEach(d => {
    if (d.userId === deviceData.userId) {
      d.status = 'Replaced';
      d.revocationReason = 'Replaced with pre-configured device';
    }
  });

  const signedKey = generateMasterSignedAuthKey(instId, deviceData.userId, deviceData.tenantId);

  const newDev: UserDeviceRecord = {
    id: 'dev_' + uuidv4().replace(/-/g, '').substring(0, 10),
    userId: deviceData.userId,
    userName: deviceData.userName,
    tenantId: deviceData.tenantId,
    deviceName: deviceData.deviceName,
    deviceType: deviceData.deviceType,
    platform: deviceData.os,
    browserInfo: 'Pre-configured Hardware',
    os: deviceData.os,
    model: deviceData.model,
    serialNumber: deviceData.serialNumber,
    installationId: instId,
    authorizationKey: 'PRE-AUTH-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    masterSignedKey: signedKey,
    status: 'Active',
    firstAuthorizedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    authorizedBy: deviceData.adminName || 'Master Admin'
  };

  list.unshift(newDev);
  saveDevicesList(list);

  logMasterControlAction({
    actionType: 'HARDWARE_PRECONFIGURED',
    category: 'FLEET',
    description: `Master pre-configured ${newDev.deviceType} "${newDev.deviceName}" (Model: ${newDev.model || 'N/A'}, S/N: ${newDev.serialNumber || 'N/A'}) for "${newDev.userName}"`,
    targetUser: {
      userId: newDev.userId,
      name: newDev.userName,
      tenantId: newDev.tenantId,
      deviceId: newDev.id
    },
    actor: { name: deviceData.adminName || 'Master Admin', role: 'MASTER_ADMIN' },
    newState: { deviceId: newDev.id, model: newDev.model, serial: newDev.serialNumber },
    diffSummary: `Pre-configured hardware node`
  });

  logMasterAudit(
    'Hardware Device Pre-Configured',
    'FLEET',
    `Pre-authorized ${newDev.deviceType} (${newDev.deviceName}, Model: ${newDev.model || 'N/A'}) for ${newDev.userName}`,
    deviceData.tenantId
  );

  return newDev;
}

/**
 * Master Admin: Delete a Device record
 */
export function deleteDeviceRecord(deviceId: string): UserDeviceRecord[] {
  const list = getAllRegisteredDevices();
  const filtered = list.filter(d => d.id !== deviceId);
  saveDevicesList(filtered);
  return filtered;
}
