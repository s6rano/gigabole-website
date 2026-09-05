import { supabase } from './supabase.js';

const AUTH_MESSAGES = Object.freeze({
  'Invalid login credentials': 'Adresse e-mail ou mot de passe incorrect.',
  'Email not confirmed': "Cette adresse e-mail n'est pas encore confirmée.",
  'User not found': "Ce compte n'existe pas.",
});

export function authMessage(error) {
  if (!error) return 'Une erreur inconnue est survenue.';
  if (AUTH_MESSAGES[error.message]) return AUTH_MESSAGES[error.message];
  const message = String(error.message || '');
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(message)) {
    return 'Connexion au service impossible. Vérifiez le réseau puis réessayez.';
  }
  return message || 'Une erreur inconnue est survenue.';
}

export function isInvalidStoredSession(error) {
  return /JWT issued at future|JWT expired|invalid jwt/i.test(String(error?.message || ''));
}

export async function resolveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function requestPasswordReset(email) {
  const redirectTo = new URL('./connexion.html', window.location.href).href;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function clearInvalidLocalSession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(() => callback(event, session), 0);
  });
}
