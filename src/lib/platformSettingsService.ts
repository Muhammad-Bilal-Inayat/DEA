import { PlatformFeatureSettings, PlatformSettingsDocument, DEFAULT_PLATFORM_FEATURES } from '../types';
import { saveRecordToFirestore, fetchCollectionFromFirestore, getFirebaseFirestore } from './firebase';
import { logMasterAudit } from './masterServerService';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const SETTINGS_COLLECTION = 'platformSettings';
const SETTINGS_DOC_ID = 'global';
const LOCAL_SETTINGS_KEY = 'mbi_platform_global_settings_v3';

export class PlatformSettingsService {
  /**
   * Get current platform feature settings (local cache first, then cloud)
   */
  public static async getSettings(): Promise<PlatformSettingsDocument> {
    // 1. Check local storage
    try {
      const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (cached) {
        const parsed: PlatformSettingsDocument = JSON.parse(cached);
        return parsed;
      }
    } catch {}

    // 2. Fetch from Firestore
    if (navigator.onLine) {
      try {
        const db = getFirebaseFirestore();
        if (db) {
          const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as PlatformSettingsDocument;
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data));
            return data;
          }
        }
      } catch (e) {
        console.warn('Could not fetch cloud platformSettings:', e);
      }
    }

    // 3. Fallback to default platform settings
    const defaultDoc: PlatformSettingsDocument = {
      id: SETTINGS_DOC_ID,
      features: { ...DEFAULT_PLATFORM_FEATURES },
      maintenanceMode: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM_BOOTSTRAP',
    };
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(defaultDoc));

    if (navigator.onLine) {
      saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, defaultDoc).catch(() => {});
    }

    return defaultDoc;
  }

  /**
   * Update a specific feature toggle in Firestore and local state
   */
  public static async updateFeatureToggle(
    featureKey: keyof PlatformFeatureSettings,
    enabled: boolean,
    updatedBy: string = 'Master Admin'
  ): Promise<PlatformSettingsDocument> {
    const current = await this.getSettings();
    const updatedFeatures: PlatformFeatureSettings = {
      ...current.features,
      [featureKey]: enabled,
    };

    const updatedDoc: PlatformSettingsDocument = {
      ...current,
      features: updatedFeatures,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // Save locally
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedDoc));

    // Save to Firestore
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, updatedDoc);
    }

    // Dispatch global event for instantaneous React re-renders across components
    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: updatedDoc }));

    // Master Audit Log
    logMasterAudit(
      'Feature Toggle Changed',
      'COMMAND',
      `Feature "${String(featureKey)}" switched to ${enabled ? 'ENABLED' : 'DISABLED'} by ${updatedBy}`
    );

    return updatedDoc;
  }

  /**
   * Toggle system-wide maintenance mode
   */
  public static async setMaintenanceMode(
    enabled: boolean,
    bannerText?: string,
    updatedBy: string = 'Master Admin'
  ): Promise<PlatformSettingsDocument> {
    const current = await this.getSettings();
    const updatedDoc: PlatformSettingsDocument = {
      ...current,
      maintenanceMode: enabled,
      announcementBanner: bannerText || current.announcementBanner,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedDoc));
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, updatedDoc);
    }

    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: updatedDoc }));
    logMasterAudit(
      'Maintenance Mode Updated',
      'SECURITY',
      `Platform maintenance mode set to ${enabled ? 'ACTIVE' : 'OFF'}`
    );

    return updatedDoc;
  }

  /**
   * Reset all platform features to factory recommended defaults
   */
  public static async resetToDefaults(updatedBy: string = 'Master Admin'): Promise<PlatformSettingsDocument> {
    const docData: PlatformSettingsDocument = {
      id: SETTINGS_DOC_ID,
      features: { ...DEFAULT_PLATFORM_FEATURES },
      maintenanceMode: false,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(docData));
    if (navigator.onLine) {
      await saveRecordToFirestore(SETTINGS_COLLECTION, SETTINGS_DOC_ID, docData);
    }

    window.dispatchEvent(new CustomEvent('platform-features-updated', { detail: docData }));
    logMasterAudit('Feature Flags Reset', 'COMMAND', 'Reset all platform features to factory default configuration');

    return docData;
  }

  /**
   * Realtime Firestore listener for platformSettings
   */
  public static subscribeToPlatformSettings(
    onUpdate: (doc: PlatformSettingsDocument) => void
  ): () => void {
    try {
      const db = getFirebaseFirestore();
      if (!db) return () => {};

      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PlatformSettingsDocument;
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data));
          onUpdate(data);
        }
      }, () => {});

      return unsubscribe;
    } catch {
      return () => {};
    }
  }
}
