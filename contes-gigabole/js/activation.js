import { activationErrorMessage } from './registration-core.js';
import { authMessage, resolveSession, updatePassword } from './auth.js';
import { supabase } from './supabase.js';

const $ = (selector) => document.querySelector(selector);
const original = new URL(window.location.href);
const hash = new URLSearchParams(original.hash.slice(1));
const hasActivationMaterial = Boolean(original.searchParams.get('code') || original.searchParams.get('token_hash') || hash.get('access_token') || hash.get('error_code') || original.searchParams.get('error_code'));
let session = null;

function setNotice(message = '', kind = '') {
  const node = $('#activation-notice');
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', kind === 'error');
}

function clearSensitiveUrl() {
  window.history.replaceState({}, '', './activation.html');
}

function isExpired(error) {
  return /expired|otp_expired|token has expired/i.test(String(error?.message || error?.code || ''));
}

function setBusy(busy) {
  for (const control of $('#activation-form').querySelectorAll('input, button')) control.disabled = busy;
  $('#activation-form').setAttribute('aria-busy', String(busy));
}

function passwordMessage(password) {
  if (password.length < 12) return 'Choisissez au moins 12 caractères.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return 'Utilisez au moins une minuscule, une majuscule et un chiffre.';
  return '';
}

async function consumeActivationLink() {
  const code = original.searchParams.get('code');
  const tokenHash = original.searchParams.get('token_hash');
  const type = original.searchParams.get('type') || hash.get('type');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  if (hash.get('access_token') && hash.get('refresh_token')) {
    const { data, error } = await supabase.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') });
    if (error) throw error;
    return data.session;
  }
  if (tokenHash && ['invite', 'recovery'].includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) throw error;
    return data.session;
  }
  return null;
}

async function initialise() {
  const suppliedError = original.searchParams.get('error_code') || hash.get('error_code');
  if (suppliedError) {
    clearSensitiveUrl();
    setNotice(activationErrorMessage(/expired/i.test(suppliedError) ? 'expired' : 'invalid'), 'error');
    return;
  }
  try {
    if (!hasActivationMaterial) {
      session = await resolveSession();
      if (session) {
        window.location.replace('./connexion.html');
        return;
      }
      setNotice(activationErrorMessage('absent'), 'error');
      return;
    }
    session = await consumeActivationLink();
    if (hasActivationMaterial) clearSensitiveUrl();
    if (!session) {
      setNotice(activationErrorMessage('absent'), 'error');
      return;
    }
    $('#activation-form').hidden = false;
    $('#activation-password').focus();
  } catch (error) {
    if (hasActivationMaterial) clearSensitiveUrl();
    setNotice(activationErrorMessage(!navigator.onLine ? 'network' : isExpired(error) ? 'expired' : 'invalid'), 'error');
  }
}

$('#activation-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = $('#activation-password').value;
  const confirmation = $('#activation-confirmation').value;
  const issue = passwordMessage(password);
  if (issue) { setNotice(issue, 'error'); return; }
  if (password !== confirmation) { setNotice('Les deux mots de passe ne correspondent pas.', 'error'); return; }
  setBusy(true);
  try {
    await updatePassword(password);
    clearSensitiveUrl();
    const { data } = await supabase.auth.getSession();
    session = data.session;
    setNotice('Votre mot de passe est enregistré. Vous pouvez ouvrir votre boîte à lecture.');
    $('#activation-form').hidden = true;
    $('#activation-success').hidden = false;
  } catch (error) {
    setNotice(!navigator.onLine ? activationErrorMessage('network') : authMessage(error), 'error');
  } finally {
    setBusy(false);
  }
});

initialise();
