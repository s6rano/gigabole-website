import {
  ANALYTICS_DENIED,
  ANALYTICS_GRANTED,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  mayLoadConfiguredAnalytics,
  readConsent,
  serializeConsent,
} from './cookie-consent-core.js';
import { ANALYTICS_MEASUREMENT_ID } from './analytics-config.js';

const analyticsAllowedOnPage = document.body.dataset.analyticsEnabled === 'true';
let analyticsLoaded = false;

function loadStoredConsent() {
  try {
    return readConsent(localStorage.getItem(CONSENT_STORAGE_KEY), CONSENT_VERSION);
  } catch {
    return null;
  }
}

function storeConsent(analytics) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(analytics));
  } catch {
    /* stockage indisponible : le bandeau réapparaîtra à la prochaine visite */
  }
}

function maybeLoadAnalytics(consent) {
  if (!mayLoadConfiguredAnalytics(consent, ANALYTICS_MEASUREMENT_ID, analyticsAllowedOnPage)) return;
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window[`ga-disable-${ANALYTICS_MEASUREMENT_ID}`] = false;
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', ANALYTICS_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_MEASUREMENT_ID)}`;
  document.head.append(script);
}

function disableAnalytics() {
  if (!ANALYTICS_MEASUREMENT_ID) return;
  window[`ga-disable-${ANALYTICS_MEASUREMENT_ID}`] = true;
  window.gtag?.('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  for (const name of document.cookie.split(';').map((part) => part.trim().split('=')[0])) {
    if (name === '_ga' || name.startsWith('_ga_')) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
  }
}

let bannerElement = null;

function buildBanner(onChoice) {
  const banner = document.createElement('aside');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-labelledby', 'cookie-banner-title');
  banner.setAttribute('aria-describedby', 'cookie-banner-text');
  banner.innerHTML = `
    <div class="cookie-banner-panel panel">
      <p class="eyebrow" id="cookie-banner-title">Vos préférences de mesure d’audience</p>
      <p id="cookie-banner-text">Gigabole Kids fonctionne entièrement sans mesure d’audience. Avec votre accord, nous
        pouvons mesurer la fréquentation du site sans transmettre de donnée d’adulte, d’enfant, de paiement ou
        de conte.</p>
      <div class="cookie-banner-actions">
        <button type="button" class="button" data-consent-choice="denied">Tout refuser</button>
        <button type="button" class="button" data-consent-choice="granted">Accepter les statistiques</button>
      </div>
    </div>`;
  banner.querySelector('[data-consent-choice="denied"]').addEventListener('click', () => onChoice(ANALYTICS_DENIED));
  banner.querySelector('[data-consent-choice="granted"]').addEventListener('click', () => onChoice(ANALYTICS_GRANTED));
  return banner;
}

function hideBanner() {
  bannerElement?.remove();
  bannerElement = null;
}

function applyChoice(analytics) {
  storeConsent(analytics);
  if (analytics === ANALYTICS_DENIED) disableAnalytics();
  else maybeLoadAnalytics(loadStoredConsent());
  hideBanner();
}

function showBanner() {
  if (bannerElement) return;
  bannerElement = buildBanner(applyChoice);
  document.body.append(bannerElement);
  bannerElement.querySelector('[data-consent-choice="denied"]').focus();
}

function wireSettingsLinks() {
  for (const link of document.querySelectorAll('[data-cookie-settings]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showBanner();
    });
  }
}

export function initCookieConsent() {
  wireSettingsLinks();
  const consent = loadStoredConsent();
  if (consent) {
    maybeLoadAnalytics(consent);
    return;
  }
  if (document.body.dataset.consentPrompt === 'true') showBanner();
}

if (typeof document !== 'undefined') initCookieConsent();
