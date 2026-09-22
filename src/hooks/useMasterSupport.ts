import { useState, useEffect } from 'react';
import { MasterSupportConfig, getMasterSupportConfig } from '../lib/masterServerService';

export function useMasterSupport(): MasterSupportConfig {
  const [supportConfig, setSupportConfig] = useState<MasterSupportConfig>(getMasterSupportConfig());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setSupportConfig(e.detail);
      } else {
        setSupportConfig(getMasterSupportConfig());
      }
    };

    window.addEventListener('master-support-updated', handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'mbi_master_support_helpline_config') {
        setSupportConfig(getMasterSupportConfig());
      }
    });

    return () => {
      window.removeEventListener('master-support-updated', handleUpdate);
    };
  }, []);

  return supportConfig;
}
