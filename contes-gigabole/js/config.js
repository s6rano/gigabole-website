import config from './config.public.js';

function requireValue(value, label) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('COLLER_ICI')) {
    throw new Error(`Configuration Supabase publique absente : ${label}.`);
  }
  return value.trim();
}

export const SUPABASE_URL = requireValue(config?.supabaseUrl, 'supabaseUrl');
export const SUPABASE_PUBLISHABLE_KEY = requireValue(config?.publishableKey, 'publishableKey');
