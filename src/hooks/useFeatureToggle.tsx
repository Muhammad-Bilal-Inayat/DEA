import React, { useState, useEffect, useCallback } from 'react';
import { PlatformFeatureSettings, DEFAULT_PLATFORM_FEATURES } from '../types';
import { PlatformSettingsService } from '../lib/platformSettingsService';

export function useFeatureToggle(featureKey?: keyof PlatformFeatureSettings) {
  const [features, setFeatures] = useState<PlatformFeatureSettings>(() => {
    try {
      const cached = localStorage.getItem('mbi_platform_global_settings_v3');
      if (cached) {
        return JSON.parse(cached).features || DEFAULT_PLATFORM_FEATURES;
      }
    } catch {}
    return DEFAULT_PLATFORM_FEATURES;
  });

  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await PlatformSettingsService.getSettings();
      setFeatures(settings.features || DEFAULT_PLATFORM_FEATURES);
      setMaintenanceMode(!!settings.maintenanceMode);
    } catch (e) {
      console.warn('Failed to load feature settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // 1. Listen for local window events
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.features) {
        setFeatures(customEvent.detail.features);
        setMaintenanceMode(!!customEvent.detail.maintenanceMode);
      }
    };
    window.addEventListener('platform-features-updated', handleLocalUpdate);

    // 2. Realtime Cloud Firestore subscription
    const unsubscribe = PlatformSettingsService.subscribeToPlatformSettings((doc) => {
      if (doc?.features) {
        setFeatures(doc.features);
        setMaintenanceMode(!!doc.maintenanceMode);
      }
    });

    return () => {
      window.removeEventListener('platform-features-updated', handleLocalUpdate);
      unsubscribe();
    };
  }, [loadSettings]);

  const toggleFeature = async (key: keyof PlatformFeatureSettings, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: enabled }));
    await PlatformSettingsService.updateFeatureToggle(key, enabled);
  };

  const isEnabled = featureKey ? !!features[featureKey] : true;

  return {
    isEnabled,
    features,
    allFeatures: features,
    loading,
    maintenanceMode,
    toggleFeature,
    refreshFeatures: loadSettings,
  };
}

interface FeatureGateProps {
  feature: keyof PlatformFeatureSettings;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = null,
}) => {
  const { isEnabled, loading } = useFeatureToggle(feature);

  if (loading) return null;
  if (!isEnabled) return <>{fallback}</>;
  return <>{children}</>;
};
