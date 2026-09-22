import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 TOTP secret key
 */
export function generateTOTPSecret(byteLength: number = 20): string {
  const randomBytes = new Uint8Array(byteLength);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let bits = '';
  for (let i = 0; i < randomBytes.length; i++) {
    bits += randomBytes[i].toString(2).padStart(8, '0');
  }

  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    const index = parseInt(chunk, 2);
    secret += BASE32_CHARS[index];
  }

  return secret;
}

/**
 * Decode Base32 string to Uint8Array (words for CryptoJS)
 */
function base32ToUint8Array(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes[i / 8] = parseInt(bits.substring(i, i + 8), 2);
  }
  return bytes;
}

/**
 * Generate 6-digit TOTP code for a given secret at timestamp
 */
export function generateTOTPCode(secret: string, timestampMs: number = Date.now(), timeStepSec: number = 30): string {
  try {
    const timeStep = Math.floor(timestampMs / 1000 / timeStepSec);
    const keyBytes = base32ToUint8Array(secret);
    
    // Convert time step to 8-byte big endian array
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(0, 0, false); // High 32 bits
    timeView.setUint32(4, timeStep, false); // Low 32 bits
    const timeUint8 = new Uint8Array(timeBuffer);

    // Convert Uint8Array to CryptoJS WordArray
    const keyWords = CryptoJS.lib.WordArray.create(keyBytes as any);
    const timeWords = CryptoJS.lib.WordArray.create(timeUint8 as any);

    // Compute HMAC-SHA1
    const hmac = CryptoJS.HmacSHA1(timeWords, keyWords);
    const hmacBytes: number[] = [];
    for (let i = 0; i < hmac.sigBytes; i++) {
      const byte = (hmac.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      hmacBytes.push(byte);
    }

    // Dynamic Truncation
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (err) {
    console.error('TOTP generation error:', err);
    return '000000';
  }
}

/**
 * Verify a 6-digit user-entered token against TOTP secret
 * Allows +/- window (default 1 step = 30 seconds before/after) to account for clock skew
 */
export function verifyTOTPToken(secret: string, token: string, windowSteps: number = 1): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const now = Date.now();
  const timeStepSec = 30;

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const checkTime = now + step * timeStepSec * 1000;
    const expected = generateTOTPCode(secret, checkTime, timeStepSec);
    if (expected === cleanToken) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard otpauth:// URI for authenticator apps (Google Authenticator, Microsoft Authenticator, Authy, etc.)
 */
export function generateTOTPUri(secret: string, accountName: string = 'mbi786', issuer: string = 'MBI Inventra Server'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code as Base64 Data URL
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    return '';
  }
}

/**
 * Generate 6 emergency one-time recovery backup codes
 */
export function generateEmergencyBackupCodes(count: number = 6): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // format as XXXX-XXXX
    codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
  }
  return codes;
}

/**
 * Helper to hash password with SHA-256
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}
