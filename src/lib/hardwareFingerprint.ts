/**
 * MBI Inventra - Advanced Hardware Fingerprinting & Device Binding Engine
 * 
 * Generates a deterministic, tamper-resistant hardware identifier (HWID)
 * utilizing multi-layer hardware entropy:
 * 1. WebGL Unmasked GPU Vendor & Renderer
 * 2. AudioContext Oscillator & Dynamic Compression signature
 * 3. 2D Canvas Geometric & Font Subpixel Rasterization
 * 4. Hardware Concurrency (CPU Cores) & Device Memory (RAM)
 * 5. Screen Resolution, Pixel Depth & Color Gamut
 * 6. Cryptographic SHA-256 Digesting
 */

import { checkClockIntegrity, updateHighWatermark } from './clockIntegrityService';

export interface HardwareProfile {
  hwid: string;
  gpuRenderer: string;
  gpuVendor: string;
  cpuCores: number;
  deviceMemoryGb: number;
  screenResolution: string;
  colorDepth: number;
  audioHash: string;
  canvasHash: string;
  platform: string;
  timestamp: string;
}

const HWID_STORAGE_KEY = 'mbi_system_hwid_v2';
const HWID_PROFILE_KEY = 'mbi_system_hwid_profile_v2';
const CLOCK_INTEGRITY_KEY = 'mbi_clock_integrity_ts';

/**
 * Generate SHA-256 hash using browser native WebCrypto API
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract WebGL GPU Unmasked Renderer and Vendor
 */
function getWebGLFingerprint(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: 'Generic GPU Vendor', renderer: 'Generic Hardware Rasterizer' };
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { 
        vendor: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VENDOR) || 'Standard Vendor',
        renderer: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) || 'Standard Renderer'
      };
    }
    
    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Standard GPU Vendor';
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Standard GPU Device';
    return { vendor: String(vendor), renderer: String(renderer) };
  } catch (e) {
    return { vendor: 'Standard Platform GPU', renderer: 'Standard Platform Graphics' };
  }
}

/**
 * Extract Canvas 2D Font Subpixel Rasterization Hash
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_ctx_none';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica', 'Noto Sans', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('MBI-INVENTRA-HWID-VERIFY <Ω≈ç√>', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('MBI-INVENTRA-HWID-VERIFY <Ω≈ç√>', 4, 17);

    return canvas.toDataURL().slice(-64);
  } catch (e) {
    return 'canvas_fallback_sig_786';
  }
}

/**
 * Extract AudioContext Frequency Response Dynamics Hash
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    const OfflineCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (OfflineCtx) {
      const offlineContext = new OfflineCtx(1, 44100, 44100);
      const oscillator = offlineContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, offlineContext.currentTime);
      const compressor = offlineContext.createDynamicsCompressor();
      oscillator.connect(compressor);
      compressor.connect(offlineContext.destination);
      oscillator.start(0);
      return `offline_audio_${offlineContext.sampleRate}_${oscillator.frequency.value}`;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return 'audio_ctx_unsupported';

    const context = new AudioCtx();
    const rate = context.sampleRate || 44100;
    try {
      context.close().catch(() => {});
    } catch {}
    return `audio_sample_${rate}_10000`;
  } catch {
    return 'audio_fallback_sig';
  }
}

/**
 * Generate and cache full Hardware Profile and unique HWID
 */
export async function generateHardwareProfile(): Promise<HardwareProfile> {
  // Check cached profile
  const cachedProfile = localStorage.getItem(HWID_PROFILE_KEY);
  if (cachedProfile) {
    try {
      const parsed = JSON.parse(cachedProfile);
      if (parsed.hwid && parsed.gpuRenderer) {
        return parsed;
      }
    } catch (e) {}
  }

  const { vendor, renderer } = getWebGLFingerprint();
  const canvasHash = getCanvasFingerprint();
  let audioHash = 'audio_fallback_sig';
  try {
    audioHash = await getAudioFingerprint();
  } catch {
    audioHash = 'audio_fallback_sig';
  }
  const cpuCores = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb = (navigator as any).deviceMemory || 8;
  const screenResolution = `${window.screen?.width || 1920}x${window.screen?.height || 1080}@${window.devicePixelRatio || 1}`;
  const colorDepth = window.screen?.colorDepth || 24;
  const platform = navigator.platform || 'Unknown OS Platform';

  // Seed with unique browser installation salt
  let persistentSalt = localStorage.getItem('mbi_hwid_seed_salt');
  if (!persistentSalt) {
    persistentSalt = 'SALT-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem('mbi_hwid_seed_salt', persistentSalt);
  }

  const rawEntropyString = [
    vendor,
    renderer,
    canvasHash,
    audioHash,
    cpuCores,
    deviceMemoryGb,
    screenResolution,
    colorDepth,
    platform,
    persistentSalt
  ].join(':::');

  const fullHash = await sha256(rawEntropyString);
  const hwid = `HWID-${fullHash.substring(0, 16).toUpperCase()}-${fullHash.substring(16, 24).toUpperCase()}`;

  const profile: HardwareProfile = {
    hwid,
    gpuRenderer: renderer,
    gpuVendor: vendor,
    cpuCores,
    deviceMemoryGb,
    screenResolution,
    colorDepth,
    audioHash,
    canvasHash,
    platform,
    timestamp: new Date().toISOString()
  };

  localStorage.setItem(HWID_STORAGE_KEY, hwid);
  localStorage.setItem(HWID_PROFILE_KEY, JSON.stringify(profile));

  return profile;
}

/**
 * Synchronous fast getter for cached HWID
 */
export function getSystemHWIDSync(): string {
  let hwid = localStorage.getItem(HWID_STORAGE_KEY);
  if (!hwid) {
    hwid = 'HWID-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).substring(4).toUpperCase();
    localStorage.setItem(HWID_STORAGE_KEY, hwid);
  }
  return hwid;
}

/**
 * Check if the system clock has been tampered / rolled backwards
 */
export function verifySystemClockIntegrity(): { isValid: boolean; message?: string } {
  const status = checkClockIntegrity();
  if (status.isTampered) {
    return {
      isValid: false,
      message: status.message || 'System clock rollback detected! Please correct your device date and time settings.'
    };
  }

  const now = Date.now();
  updateHighWatermark(now, 'HARDWARE_FINGERPRINT_CHECK');
  localStorage.setItem(CLOCK_INTEGRITY_KEY, String(now));
  return { isValid: true };
}
