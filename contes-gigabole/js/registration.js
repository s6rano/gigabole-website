import { supabase } from './supabase.js';
import { activePlans, checkoutErrorMessage, checkoutFingerprint, checkoutPayload, connectedRegistrationMismatch, createAttemptKey, deliveryDays, newChild, normalisePromotionCode, publicPlanColumns, validateRegistrationStep } from './registration-core.js';

const $ = (selector) => document.querySelector(selector);
const state = { plans: [], planSlug: '', firstName: '', lastName: '', email: '', connectedEmail: '', children: [newChild()], promoCode: '', acceptTerms: false, acceptPrivacy: false, step: 1, attemptKey: null, attemptFingerprint: null, submitting: false, removingIndex: null };

function setNotice(message = '', kind = '') {
  const node = $('#registration-notice');
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', kind === 'error');
}

function setBusy(busy) {
  state.submitting = busy;
  for (const control of $('#registration-form').querySelectorAll('button, input, select')) control.disabled = busy;
  $('#registration-form').setAttribute('aria-busy', String(busy));
}

function renderSessionContext(email = '') {
  state.connectedEmail = String(email || '').trim().toLowerCase();
  const notice = $('#registration-session-notice');
  notice.hidden = !state.connectedEmail;
  $('#registration-session-email').textContent = state.connectedEmail;
}

async function loadSessionContext() {
  const { data, error } = await supabase.auth.getSession();
  if (!error) renderSessionContext(data.session?.user?.email);
}

function checkConnectedIdentity() {
  if (!connectedRegistrationMismatch(state.connectedEmail, state.email)) return true;
  setNotice(`Vous êtes actuellement connecté avec ${state.connectedEmail}. Utilisez cette adresse ou déconnectez-vous avant d’inscrire une autre personne.`, 'error');
  $('#registration-session-notice').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#registration-sign-out').focus();
  return false;
}

function readState() {
  const form = $('#registration-form');
  state.planSlug = form.plan_slug.value;
  state.firstName = form.first_name.value;
  state.lastName = form.last_name.value;
  state.email = form.email.value;
  state.promoCode = normalisePromotionCode(form.promo_code.value);
  state.acceptTerms = form.accept_terms.checked;
  state.acceptPrivacy = form.accept_privacy.checked;
  state.children = [...document.querySelectorAll('.registration-child')].map((card) => ({
    firstName: card.querySelector('[name="child_first_name"]').value,
    lastName: card.querySelector('[name="child_last_name"]').value,
    gender: card.querySelector('[name="child_gender"]').value,
    birthDate: card.querySelector('[name="child_birth_date"]').value,
  }));
}

function renderPlans() {
  const box = $('#plan-list');
  box.replaceChildren();
  const template = $('#plan-template');
  for (const plan of state.plans) {
    const item = template.content.cloneNode(true);
    const input = item.querySelector('input');
    input.value = plan.slug;
    input.checked = state.planSlug === plan.slug;
    input.id = `plan-${plan.slug}`;
    const label = item.querySelector('label');
    label.htmlFor = input.id;
    item.querySelector('.plan-name').textContent = plan.name;
    item.querySelector('.plan-price').textContent = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: plan.currency, minimumFractionDigits: 0 }).format(plan.monthly_price_cents / 100);
    item.querySelector('.plan-days').textContent = `Contes déposés le ${deliveryDays(plan)}.`;
    box.append(item);
  }
  $('#plans-loading').hidden = true;
  $('#plans-empty').hidden = state.plans.length !== 0;
}

function renderChildren() {
  const list = $('#children-list');
  list.replaceChildren();
  const template = $('#registration-child-template');
  state.children.forEach((child, index) => {
    const item = template.content.cloneNode(true);
    const card = item.querySelector('.registration-child');
    card.querySelector('.child-number').textContent = `Enfant ${index + 1}`;
    card.querySelector('[name="child_first_name"]').value = child.firstName;
    card.querySelector('[name="child_last_name"]').value = child.lastName;
    card.querySelector('[name="child_gender"]').value = child.gender;
    card.querySelector('[name="child_birth_date"]').value = child.birthDate;
    card.querySelector('.remove-child').addEventListener('click', () => askToRemoveChild(index));
    list.append(item);
  });
}

function renderSummary() {
  readState();
  const plan = state.plans.find((item) => item.slug === state.planSlug);
  $('#summary-plan').textContent = plan ? `${plan.name} — ${new Intl.NumberFormat('fr-BE', { style: 'currency', currency: plan.currency, minimumFractionDigits: 0 }).format(plan.monthly_price_cents / 100)} par mois` : '—';
  $('#summary-adult').textContent = `${state.firstName.trim()} ${state.lastName.trim()} — ${state.email.trim()}`.trim();
  $('#summary-children').textContent = state.children.map((child) => `${child.firstName.trim()} ${child.lastName.trim()}`.trim()).filter(Boolean).join(', ');
}

function showStep(step) {
  state.step = step;
  for (const section of document.querySelectorAll('[data-step]')) section.hidden = Number(section.dataset.step) !== step;
  for (const node of document.querySelectorAll('[data-step-label]')) {
    const number = Number(node.dataset.stepLabel);
    node.setAttribute('aria-current', number === step ? 'step' : 'false');
    node.classList.toggle('is-current', number === step);
  }
  $('#previous-step').hidden = step === 1;
  $('#next-step').hidden = step === 4;
  $('#checkout-submit').hidden = step !== 4;
  if (step === 4) renderSummary();
  const heading = document.querySelector(`[data-step="${step}"] h2`);
  heading?.focus();
}

function checkStep(step) {
  readState();
  if ((step === 2 || step === 4) && !checkConnectedIdentity()) return false;
  const message = validateRegistrationStep(step, state);
  if (message) {
    setNotice(message, 'error');
    const first = document.querySelector(`[data-step="${step}"] input:invalid, [data-step="${step}"] select:invalid`);
    first?.focus();
    return false;
  }
  setNotice();
  return true;
}

function askToRemoveChild(index) {
  readState();
  state.removingIndex = index;
  $('#remove-child-dialog').showModal();
}

async function loadPlans() {
  try {
    const { data, error } = await supabase.from('plans').select(publicPlanColumns()).eq('active', true);
    if (error) throw error;
    state.plans = activePlans(data);
    renderPlans();
    if (!state.plans.length) setNotice('Aucune formule n’est disponible pour le moment. Réessayez plus tard.', 'error');
  } catch {
    $('#plans-loading').hidden = true;
    setNotice('Impossible de charger les formules. Vérifiez le réseau puis réessayez.', 'error');
  }
}

function checkoutTimeout() {
  return new Promise((_, reject) => window.setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), 25_000));
}

async function startCheckout() {
  if (state.submitting || !checkStep(4)) return;
  const freshPlans = await supabase.from('plans').select(publicPlanColumns()).eq('active', true);
  if (freshPlans.error) { setNotice('Impossible de vérifier la formule. Vérifiez le réseau puis réessayez.', 'error'); return; }
  state.plans = activePlans(freshPlans.data);
  if (validateRegistrationStep(1, state)) { showStep(1); setNotice('Cette formule n’est plus disponible. Choisissez-en une autre.', 'error'); return; }
  const fingerprint = checkoutFingerprint(state);
  if (!state.attemptKey || state.attemptFingerprint !== fingerprint) {
    state.attemptKey = createAttemptKey();
    state.attemptFingerprint = fingerprint;
  }
  setBusy(true);
  setNotice('Redirection sécurisée vers le paiement…');
  try {
    const request = supabase.functions.invoke('create-checkout-session', { body: checkoutPayload(state, state.attemptKey) });
    const { data, error } = await Promise.race([request, checkoutTimeout()]);
    if (error) throw error;
    if (!data?.checkoutUrl || !/^https:\/\//.test(data.checkoutUrl)) throw new Error('Réponse Checkout invalide.');
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    let code = error?.code;
    if (!code && error?.context && typeof error.context.json === 'function') {
      try { code = (await error.context.json())?.error; } catch { /* réponse non JSON : message neutre */ }
    }
    const message = code === 'TIMEOUT' ? 'La demande prend trop de temps. Vérifiez le réseau puis réessayez.' : checkoutErrorMessage(code);
    setNotice(message, 'error');
    setBusy(false);
  }
}

$('#registration-form').addEventListener('submit', (event) => { event.preventDefault(); startCheckout(); });
$('#next-step').addEventListener('click', () => { if (checkStep(state.step)) showStep(state.step + 1); });
$('#previous-step').addEventListener('click', () => { readState(); showStep(state.step - 1); });
$('#add-child').addEventListener('click', () => { readState(); state.children.push(newChild()); renderChildren(); });
$('#use-connected-account').addEventListener('click', () => {
  $('#registration-email').value = state.connectedEmail;
  state.email = state.connectedEmail;
  state.attemptKey = null;
  state.attemptFingerprint = null;
  setNotice('Cette inscription utilisera l’adresse du compte connecté.');
  $('#registration-email').focus();
});
$('#registration-sign-out').addEventListener('click', async () => {
  const button = $('#registration-sign-out');
  button.disabled = true;
  const previousEmail = state.connectedEmail;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  button.disabled = false;
  if (error) {
    setNotice('La déconnexion a échoué. Réessayez avant de poursuivre.', 'error');
    return;
  }
  renderSessionContext();
  if ($('#registration-email').value.trim().toLowerCase() === previousEmail) $('#registration-email').value = '';
  state.email = $('#registration-email').value;
  state.attemptKey = null;
  state.attemptFingerprint = null;
  setNotice('Vous êtes déconnecté. Vous pouvez inscrire une autre personne.');
  $('#registration-email').focus();
});
$('#remove-child-dialog').addEventListener('close', () => {
  if ($('#remove-child-dialog').returnValue === 'confirm' && Number.isInteger(state.removingIndex)) {
    state.children.splice(state.removingIndex, 1); renderChildren();
  }
  state.removingIndex = null;
});

if (new URLSearchParams(window.location.search).get('paiement') === 'annule') {
  setNotice('Le paiement n’a pas été finalisé. Vous pouvez reprendre votre inscription.', 'error');
  window.history.replaceState({}, '', './inscription.html');
}
renderChildren();
showStep(1);
loadPlans();
loadSessionContext();
