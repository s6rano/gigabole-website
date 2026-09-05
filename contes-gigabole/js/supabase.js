import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)) {
  throw new Error('Configuration Supabase invalide : URL manquante ou non sécurisée.');
}

// Supabase nettoie le fragment de l'URL après avoir échangé le jeton. Il faut donc
// conserver l'intention « recovery » avant l'initialisation automatique du client.
const recoveryLinkAtLoad = (() => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return hash.get('type') === 'recovery' || query.get('type') === 'recovery';
})();
const isActivationRoute = window.location.pathname.endsWith('/activation.html');

export function isPasswordRecoveryUrl() {
  return recoveryLinkAtLoad;
}

const REMEMBER_SESSION_KEY = 'gigabole-reader-remember-session';
let rememberSession = true;
try { rememberSession = localStorage.getItem(REMEMBER_SESSION_KEY) !== 'false'; } catch { /* stockage indisponible */ }

function removeFrom(storage, key) {
  try { storage.removeItem(key); } catch { /* stockage indisponible : Supabase gère la session en mémoire */ }
}

const authStorage = {
  getItem(key) {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try {
      const selected = rememberSession ? localStorage : sessionStorage;
      const other = rememberSession ? sessionStorage : localStorage;
      selected.setItem(key, value);
      other.removeItem(key);
    } catch { /* stockage indisponible : Supabase garde la session en mémoire */ }
  },
  removeItem(key) {
    removeFrom(localStorage, key);
    removeFrom(sessionStorage, key);
  },
};

export function setRememberSession(enabled) {
  rememberSession = Boolean(enabled);
  try { localStorage.setItem(REMEMBER_SESSION_KEY, String(rememberSession)); } catch { /* sans effet */ }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // activation.html échange explicitement ses liens afin qu'un ancien état local ne puisse
    // jamais être confondu avec un lien d'invitation invalide. Les autres parcours Auth gardent
    // le traitement automatique existant, notamment PASSWORD_RECOVERY.
    detectSessionInUrl: !isActivationRoute,
    storage: authStorage,
  },
});
