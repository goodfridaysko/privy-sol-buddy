// Ensure Node globals exist in the browser bundle
import { Buffer } from 'buffer';

declare global {
  interface Window { 
    Buffer?: typeof Buffer; 
    process?: any; 
  }
}

// Buffer (needed by many crypto libs)
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// Minimal process polyfill (some deps check it)
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

// Helper: base64 -> bytes without Buffer
export const b64ToBytes = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Helper: bytes -> base64 without Buffer
export const bytesToB64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));
