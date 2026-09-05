export const CONSENT_STORAGE_KEY = 'gigabole:privacy-consent';
export const CONSENT_VERSION = 'analytics-2026-09-v1';
export const ANALYTICS_GRANTED = 'granted';
export const ANALYTICS_DENIED = 'denied';

export function readConsent(serialized, version = CONSENT_VERSION) {
  if (!serialized) return null;
  try {
    const consent = JSON.parse(serialized);
    if (consent?.version !== version) return null;
    if (![ANALYTICS_GRANTED, ANALYTICS_DENIED].includes(consent.analytics)) return null;
    return { version: consent.version, analytics: consent.analytics };
  } catch {
    return null;
  }
}

export function createConsent(analytics, version = CONSENT_VERSION) {
  if (![ANALYTICS_GRANTED, ANALYTICS_DENIED].includes(analytics)) {
    throw new TypeError('Choix Analytics invalide');
  }
  return { version, analytics };
}

export function serializeConsent(analytics, version = CONSENT_VERSION) {
  return JSON.stringify(createConsent(analytics, version));
}

export function mayLoadAnalytics(consent) {
  return consent?.version === CONSENT_VERSION && consent.analytics === ANALYTICS_GRANTED;
}

export function validAnalyticsMeasurementId(value) {
  return /^G-[A-Z0-9]{6,}$/.test(String(value ?? '').trim());
}

export function mayLoadConfiguredAnalytics(consent, measurementId, pageAllowed) {
  return pageAllowed === true && mayLoadAnalytics(consent) && validAnalyticsMeasurementId(measurementId);
}
