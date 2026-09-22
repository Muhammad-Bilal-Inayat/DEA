import { v4 as uuidv4 } from 'uuid';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';

export interface LoginAttemptRecord {
  id: string;
  timestamp: string;
  username: string;
  targetSystem: 'Central Server Command Center' | 'Store POS Terminal' | 'Client Web Portal' | 'Direct Key Activation' | string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ipAddress: string;
  deviceId: string;
  deviceInfo: string;
  failureReason?: string;
  location?: string;
}

export interface BlockedIpRecord {
  ip: string;
  blockedAt: string;
  reason: string;
  blockedBy: string;
  attemptsCount: number;
  lastAttemptAt?: string;
}

const LOGIN_AUDIT_KEY = 'mbi_security_login_audit_logs_v1';
const BLOCKED_IPS_KEY = 'mbi_security_blocked_ips_v1';
const CLIENT_IP_KEY = 'mbi_client_current_ip_v1';

/**
 * Get or determine current client IP
 */
export function getCurrentClientIp(): string {
  if (typeof window === 'undefined') return '127.0.0.1';
  let cached = localStorage.getItem(CLIENT_IP_KEY);
  if (!cached) {
    // Generate a consistent local IP address for this browser instance
    const octet3 = Math.floor(1 + Math.random() * 5);
    const octet4 = Math.floor(10 + Math.random() * 240);
    cached = `192.168.${octet3}.${octet4}`;
    localStorage.setItem(CLIENT_IP_KEY, cached);
  }
  return cached;
}

/**
 * Get all Blocked IPs
 */
export function getBlockedIps(): BlockedIpRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKED_IPS_KEY);
    if (!raw) {
      // Seed sample blocked malicious IPs for demonstration
      const initialBlocked: BlockedIpRecord[] = [
        {
          ip: '198.51.100.44',
          blockedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          reason: 'Automated brute-force password guessing detected (5 consecutive failures)',
          blockedBy: 'Automated Master Firewall',
          attemptsCount: 8,
          lastAttemptAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          ip: '203.0.113.195',
          blockedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          reason: 'Unregistered unauthorized foreign subnet port scan on port 3000',
          blockedBy: 'Master Admin (mbi786)',
          attemptsCount: 14,
          lastAttemptAt: new Date(Date.now() - 86400000 * 3).toISOString()
        }
      ];
      localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(initialBlocked));
      return initialBlocked;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse blocked IPs:', e);
    return [];
  }
}

/**
 * Check if an IP is currently blocked
 */
export function isIpBlocked(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim().toLowerCase();
  const list = getBlockedIps();
  return list.some(item => item.ip.toLowerCase() === cleanIp);
}

/**
 * Block an IP Address
 */
export function blockIpAddress(ip: string, reason: string = 'Blocked by Master Admin', blockedBy: string = 'Master Admin'): BlockedIpRecord[] {
  if (!ip || !ip.trim()) return getBlockedIps();
  const cleanIp = ip.trim();
  const current = getBlockedIps();
  const existingIdx = current.findIndex(item => item.ip.toLowerCase() === cleanIp.toLowerCase());

  let updated: BlockedIpRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx].reason = reason;
    updated[existingIdx].blockedAt = new Date().toISOString();
    updated[existingIdx].blockedBy = blockedBy;
    updated[existingIdx].attemptsCount += 1;
  } else {
    const newEntry: BlockedIpRecord = {
      ip: cleanIp,
      blockedAt: new Date().toISOString(),
      reason,
      blockedBy,
      attemptsCount: 1,
      lastAttemptAt: new Date().toISOString()
    };
    updated = [newEntry, ...current];
  }

  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(updated));

  // Sync to Firestore if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('security_blocked_ips', cleanIp.replace(/[^a-zA-Z0-9_-]/g, '_'), {
      ip: cleanIp,
      blockedAt: new Date().toISOString(),
      reason,
      blockedBy
    }).catch(() => {});
  }

  // Dispatch event for live UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-blocked-ips-updated', { detail: updated }));
  }

  return updated;
}

/**
 * Unblock an IP Address
 */
export function unblockIpAddress(ip: string): BlockedIpRecord[] {
  if (!ip) return getBlockedIps();
  const cleanIp = ip.trim().toLowerCase();
  const current = getBlockedIps();
  const filtered = current.filter(item => item.ip.toLowerCase() !== cleanIp);
  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(filtered));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-blocked-ips-updated', { detail: filtered }));
  }
  return filtered;
}

/**
 * Get all Login Audit Logs
 */
export function getLoginAuditLogs(): LoginAttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGIN_AUDIT_KEY);
    if (!raw) {
      const now = Date.now();
      const seedLogs: LoginAttemptRecord[] = [
        {
          id: 'LOG-88192',
          timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
          username: 'mastermindbyali@gmail.com',
          targetSystem: 'Central Server Command Center',
          status: 'SUCCESS',
          ipAddress: '192.168.1.104',
          deviceId: 'MBI-LP-B44B46B9',
          deviceInfo: 'Laptop MBI-LP (Windows 11 / Chrome 124)',
          location: 'Lahore, Pakistan'
        },
        {
          id: 'LOG-88191',
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
          username: 'vivo_admin_v2310',
          targetSystem: 'Central Server Command Center',
          status: 'SUCCESS',
          ipAddress: '172.16.4.88',
          deviceId: 'VIVO-V2310-10FDCU07',
          deviceInfo: 'Vivo V2310 (Android 15 / Funtouch OS)',
          location: 'Lahore, Pakistan'
        },
        {
          id: 'LOG-88190',
          timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
          username: 'root_admin_unauth',
          targetSystem: 'Central Server Command Center',
          status: 'FAILED',
          ipAddress: '198.51.100.44',
          deviceId: 'UNKNOWN-HWID-9921',
          deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64) Unknown Bot',
          failureReason: 'Invalid credentials & hardware token not whitelisted',
          location: 'Foreign Subnet (Untrusted)'
        },
        {
          id: 'LOG-88189',
          timestamp: new Date(now - 1000 * 60 * 80).toISOString(),
          username: 'cashier_usman',
          targetSystem: 'Store POS Terminal',
          status: 'SUCCESS',
          ipAddress: '192.168.1.112',
          deviceId: 'POS-TERM-LAHORE-01',
          deviceInfo: 'Win10 POS Terminal / Edge 124',
          location: 'Model Town Branch, Lahore'
        },
        {
          id: 'LOG-88188',
          timestamp: new Date(now - 1000 * 60 * 140).toISOString(),
          username: 'hacker_brute_77',
          targetSystem: 'Central Server Command Center',
          status: 'BLOCKED',
          ipAddress: '198.51.100.44',
          deviceId: 'BOT-NET-SCANNER-404',
          deviceInfo: 'Python-urllib/3.11 Automated Scanner',
          failureReason: 'Access rejected: IP address is in Master Firewall Blocklist',
          location: 'Blocked Threat Vector'
        },
        {
          id: 'LOG-88187',
          timestamp: new Date(now - 1000 * 60 * 220).toISOString(),
          username: 'dr_tariq_karachi',
          targetSystem: 'Client Web Portal',
          status: 'SUCCESS',
          ipAddress: '10.0.12.14',
          deviceId: 'TAB-ANDROID-SAMSUNG',
          deviceInfo: 'Android 14 Chrome / Galaxy Tab',
          location: 'Clifton Pharmacy, Karachi'
        }
      ];
      localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify(seedLogs));
      return seedLogs;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse login audit logs:', e);
    return [];
  }
}

/**
 * Record a login attempt (Success, Failed, or Blocked)
 */
export function recordLoginAttempt(entry: {
  username: string;
  targetSystem: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  ipAddress?: string;
  deviceId?: string;
  deviceInfo?: string;
  failureReason?: string;
  location?: string;
}): LoginAttemptRecord {
  const currentLogs = getLoginAuditLogs();
  const clientIp = entry.ipAddress || getCurrentClientIp();
  
  // If IP is blocked, elevate status to BLOCKED automatically
  let effectiveStatus = entry.status;
  let effectiveReason = entry.failureReason;
  if (isIpBlocked(clientIp)) {
    effectiveStatus = 'BLOCKED';
    effectiveReason = effectiveReason || 'Access forbidden: IP address is in Firewall Blocklist';
  }

  const newRecord: LoginAttemptRecord = {
    id: 'LOG-' + Math.floor(10000 + Math.random() * 90000),
    timestamp: new Date().toISOString(),
    username: entry.username || 'Anonymous',
    targetSystem: entry.targetSystem || 'Central Server Command Center',
    status: effectiveStatus,
    ipAddress: clientIp,
    deviceId: entry.deviceId || (typeof navigator !== 'undefined' ? `${navigator.platform || 'WEB'}-${navigator.userAgent.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}` : 'DEV-UNSPECIFIED'),
    deviceInfo: entry.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client'),
    failureReason: effectiveReason,
    location: entry.location || 'Local Network / Cloud Host'
  };

  const updatedLogs = [newRecord, ...currentLogs].slice(0, 500);
  localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify(updatedLogs));

  // Sync to Firestore if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    saveRecordToFirestore('security_login_audits', newRecord.id, newRecord).catch(() => {});
  }

  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-security-audit-updated', { detail: newRecord }));
  }

  return newRecord;
}

/**
 * Purge or clear login audit logs
 */
export function clearLoginAuditLogs(): void {
  localStorage.setItem(LOGIN_AUDIT_KEY, JSON.stringify([]));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-security-audit-updated', { detail: null }));
  }
}
