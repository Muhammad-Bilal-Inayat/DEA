import { Business, User, AppUserRecord, UserRole } from '../types';
import { logMasterAudit } from './masterServerService';

export interface ImpersonationSessionState {
  isImpersonating: boolean;
  originalAdminSession: {
    user: any;
    userProfile: User | null;
    business: Business | null;
    activeRole: UserRole;
    activeUser: AppUserRecord | null;
    masterToken?: string;
  };
  targetClient: {
    licenseKey: string;
    clientName: string;
    ownerName: string;
    phone?: string;
    city?: string;
    businessProfile?: Business;
  };
  startedAt: string;
  stealthMode: boolean; // Silent, unnotified access
}

const IMPERSONATION_KEY = 'mbi_master_shadow_session_v1';

/**
 * Check if Master Admin is currently in Shadow / Remote Switch Mode
 */
export function getActiveImpersonation(): ImpersonationSessionState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Start Shadow Switch to a client account
 */
export function startImpersonationSession(
  currentState: {
    currentUser: any;
    userProfile: User | null;
    business: Business | null;
    activeRole: UserRole;
    activeUser: AppUserRecord | null;
  },
  target: {
    licenseKey: string;
    clientName: string;
    ownerName: string;
    phone?: string;
    city?: string;
    businessProfile?: Business;
  }
): ImpersonationSessionState {
  const session: ImpersonationSessionState = {
    isImpersonating: true,
    originalAdminSession: {
      user: currentState.currentUser,
      userProfile: currentState.userProfile,
      business: currentState.business,
      activeRole: currentState.activeRole,
      activeUser: currentState.activeUser,
    },
    targetClient: target,
    startedAt: new Date().toISOString(),
    stealthMode: true,
  };

  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(session));

  // Log on Master server audit trail
  logMasterAudit(
    'Stealth Shadow Switch Initiated',
    'SECURITY',
    `Master Admin switched into tenant account for ${target.clientName} (${target.licenseKey}) in stealth shadow mode`,
    target.clientName
  );

  return session;
}

/**
 * Terminate shadow session and return to Master Server
 */
export function exitImpersonationSession(): ImpersonationSessionState | null {
  const session = getActiveImpersonation();
  if (session) {
    logMasterAudit(
      'Stealth Shadow Switch Terminated',
      'SECURITY',
      `Master Admin returned to Master Server Hub from ${session.targetClient.clientName}`,
      session.targetClient.clientName
    );
  }
  localStorage.removeItem(IMPERSONATION_KEY);
  return session;
}
