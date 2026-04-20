import fpPromise from '@fingerprintjs/fingerprintjs';

export const getDeviceFingerprint = async () => {
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error("Error generating fingerprint:", error);
    // Fallback: Use a unique ID stored in localStorage if fingerprinting fails
    // This is less secure but prevents the app from breaking
    let fallbackId = localStorage.getItem('absen_device_fallback_id');
    if (!fallbackId) {
      fallbackId = 'fallback_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('absen_device_fallback_id', fallbackId);
    }
    return fallbackId;
  }
};
