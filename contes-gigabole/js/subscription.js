import { authMessage, clearInvalidLocalSession, isInvalidStoredSession, onAuthChange, resolveSession, signOut } from './auth.js';
import { currentSubscription, loadCurrentPromotion, loadSubscriptions, subscriptionState } from './profile.js';
import { activePlans, publicPlanColumns } from './registration-core.js';
import { supabase } from './supabase.js';

const $ = (selector) => document.querySelector(selector);
const PLAN_CHANGE_KEY = 'gigabole:pending-plan-change';
const RETURN_REFRESH_DELAYS = [800, 1_500, 2_500, 4_000];
const state = { subscription: null, plans: [], targetPlan: null, busy: false, refreshRun: 0 };

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function rememberPendingPlanChange(plan) {
  sessionStorage.setItem(PLAN_CHANGE_KEY, JSON.stringify({ slug: plan.slug, startedAt: Date.now() }));
}

function pendingPlanChange() {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PLAN_CHANGE_KEY) || 'null');
    if (!pending?.slug || Date.now() - pending.startedAt > 5 * 60_000) {
      sessionStorage.removeItem(PLAN_CHANGE_KEY);
      return null;
    }
    return pending;
  } catch {
    sessionStorage.removeItem(PLAN_CHANGE_KEY);
    return null;
  }
}

function formatDate(value) {
  if (!value) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long', timeZone: 'Europe/Brussels' }).format(new Date(value));
}

function showScreen(name) {
  $('#subscription-boot').hidden = name !== 'boot';
  $('#subscription-screen').hidden = name !== 'screen';
  $('#subscription-sign-out').hidden = name !== 'screen';
}

function setNotice(message = '', kind = '') {
  const node = $('#subscription-notice');
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', kind === 'error');
}

function billingErrorMessage(code) {
  const messages = {
    AUTH_REQUIRED: 'Votre session a expiré. Reconnectez-vous.',
    BILLING_NOT_FOUND: 'Les informations de facturation sont momentanément indisponibles.',
    PLAN_UNCHANGED: 'Cette formule est déjà active.',
    PLAN_INACTIVE: 'Cette formule n’est plus disponible.',
    PLAN_UNAVAILABLE: 'Cette formule n’est plus disponible.',
  };
  return messages[code] || 'La gestion de l’abonnement est momentanément indisponible. Réessayez plus tard.';
}

async function edgeErrorCode(error) {
  if (error?.code) return error.code;
  if (error?.context && typeof error.context.json === 'function') {
    try { return (await error.context.json())?.error; } catch { /* réponse non JSON */ }
  }
  return null;
}

function setBillingBusy(busy) {
  state.busy = busy;
  for (const control of $('#billing-actions').querySelectorAll('button, select')) control.disabled = busy;
  $('#billing-actions').setAttribute('aria-busy', String(busy));
}

function formatPrice(plan) {
  if (!plan) return '—';
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency', currency: plan.currency, minimumFractionDigits: 0,
  }).format(plan.monthly_price_cents / 100);
}

function renderPromotion(promotion, subscription) {
  const node = $('#subscription-promotion');
  if (!promotion || promotion.subscription_id !== subscription?.id) {
    node.hidden = true;
    return;
  }
  const percent = new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 2 }).format(promotion.percent_off);
  $('#subscription-promotion-percent').textContent = `−${percent} %`;
  $('#subscription-promotion-code').textContent = promotion.code_label;
  $('#subscription-promotion-periods').textContent = `${promotion.billing_periods} mois`;
  $('#subscription-promotion-end').textContent = formatDate(promotion.discount_ends_at);
  $('#subscription-promotion-normal-price').textContent = `${formatPrice(subscription.plans)} par mois`;
  node.hidden = false;
}

function renderScheduledPlanChange(subscription) {
  const node = $('#scheduled-plan-change');
  const pendingPlan = Array.isArray(subscription?.pending_plans)
    ? subscription.pending_plans[0] : subscription?.pending_plans;
  if (!pendingPlan || !subscription.scheduled_plan_change_at) {
    node.hidden = true;
    return;
  }
  $('#scheduled-plan-name').textContent = `« ${pendingPlan.name} »`;
  $('#scheduled-plan-date').textContent = formatDate(subscription.scheduled_plan_change_at);
  $('#scheduled-plan-price').textContent = formatPrice(pendingPlan);
  node.hidden = false;
}

function renderSubscription(subscriptions, promotion) {
  const subscription = currentSubscription(subscriptions);
  state.subscription = subscription;
  const status = subscriptionState(subscription);
  const plan = subscription?.plans;
  $('#subscription-name').textContent = plan?.name || status.label;
  $('#subscription-price').textContent = plan ? `${formatPrice(plan)} par mois` : '—';
  $('#subscription-status').textContent = status.label;
  $('#subscription-start').textContent = formatDate(subscription?.activated_at);
  $('#subscription-renewal').textContent = formatDate(subscription?.current_period_end);
  const badge = $('#subscription-page-state');
  badge.textContent = status.label;
  badge.dataset.tone = status.tone;
  renderPromotion(promotion, subscription);
  renderScheduledPlanChange(subscription);
  const stripeManaged = subscription?.source === 'stripe' && subscription.status === 'active';
  $('#billing-actions').hidden = !stripeManaged;
  $('#manual-subscription-help').hidden = Boolean(stripeManaged);
}

function renderPlanChoices() {
  const select = $('#target-plan');
  select.replaceChildren(new Option('Choisir une formule', ''));
  for (const plan of state.plans) {
    const current = plan.slug === state.subscription?.plans?.slug;
    const label = `${plan.name} — ${formatPrice(plan)} par mois${current ? ' (formule actuelle)' : ''}`;
    const option = new Option(label, plan.slug);
    option.disabled = current;
    select.add(option);
  }
}

async function loadPlanChoices() {
  const { data, error } = await supabase.from('plans').select(publicPlanColumns()).eq('active', true);
  if (error) throw error;
  state.plans = activePlans(data);
  renderPlanChoices();
}

async function openBillingPortal() {
  if (state.busy) return;
  setBillingBusy(true);
  setNotice('Ouverture sécurisée du portail Stripe…');
  try {
    const { data, error } = await supabase.functions.invoke('create-customer-portal-session', { body: {} });
    if (error) throw error;
    if (!data?.url || !/^https:\/\//.test(data.url)) throw new Error('Réponse portail invalide.');
    window.location.assign(data.url);
  } catch (error) {
    setNotice(billingErrorMessage(await edgeErrorCode(error)), 'error');
    setBillingBusy(false);
  }
}

function askToChangePlan(plan) {
  state.targetPlan = plan;
  const currentPrice = Number(state.subscription?.plans?.monthly_price_cents);
  const direction = plan.monthly_price_cents > currentPrice ? 'upgrade' : 'downgrade';
  $('#change-plan-dialog-message').textContent = direction === 'upgrade'
    ? `Passer à « ${plan.name} » ouvre Stripe pour confirmer le prorata et le changement immédiat.`
    : `Passer à « ${plan.name} » programmera le changement à votre prochaine échéance, sans prorata immédiat.`;
  $('#change-plan-dialog').showModal();
}

async function changePlan(plan) {
  if (state.busy || !plan) return;
  setBillingBusy(true);
  setNotice('Préparation du changement de formule…');
  try {
    const { data, error } = await supabase.functions.invoke('change-subscription-plan', {
      body: { planSlug: plan.slug },
    });
    if (error) throw error;
    if (data?.url) {
      if (!/^https:\/\//.test(data.url)) throw new Error('Réponse Stripe invalide.');
      rememberPendingPlanChange(plan);
      window.location.assign(data.url);
      return;
    }
    if (!data?.scheduled || !data?.effectiveAt) throw new Error('Réponse de programmation invalide.');
    setNotice(`Le passage à « ${plan.name} » est programmé pour le ${formatDate(data.effectiveAt)}.`);
    $('#target-plan').value = '';
  } catch (error) {
    setNotice(billingErrorMessage(await edgeErrorCode(error)), 'error');
  } finally {
    setBillingBusy(false);
  }
}

function updateNetworkStatus() {
  const offline = !navigator.onLine;
  const node = $('#subscription-network-status');
  node.textContent = offline ? 'Hors ligne' : 'Connecté';
  node.dataset.offline = String(offline);
}

async function showSubscription(session) {
  showScreen('boot');
  try {
    const [subscriptions, promotion] = await Promise.all([
      loadSubscriptions(session.user.id),
      loadCurrentPromotion(session.user.id).catch(() => null),
    ]);
    renderSubscription(subscriptions, promotion);
    if (state.subscription?.source === 'stripe') await loadPlanChoices();
    showScreen('screen');
    const pending = pendingPlanChange();
    if (pending?.slug === state.subscription?.plans?.slug) {
      sessionStorage.removeItem(PLAN_CHANGE_KEY);
      setNotice('Votre nouvelle formule est maintenant active.');
    } else if (pending) {
      void refreshPendingPlanChange(session);
    }
  } catch (error) {
    if (isInvalidStoredSession(error)) {
      await clearInvalidLocalSession().catch(() => {});
      window.location.replace('./connexion.html');
      return;
    }
    showScreen('screen');
    setNotice(authMessage(error), 'error');
  }
}

async function refreshPendingPlanChange(session) {
  const run = ++state.refreshRun;
  for (const delay of RETURN_REFRESH_DELAYS) {
    await wait(delay);
    if (run !== state.refreshRun) return;
    const pending = pendingPlanChange();
    if (!pending) return;
    try {
      const [subscriptions, promotion] = await Promise.all([
        loadSubscriptions(session.user.id),
        loadCurrentPromotion(session.user.id).catch(() => null),
      ]);
      if (run !== state.refreshRun) return;
      renderSubscription(subscriptions, promotion);
      renderPlanChoices();
      if (state.subscription?.plans?.slug === pending.slug) {
        sessionStorage.removeItem(PLAN_CHANGE_KEY);
        state.refreshRun += 1;
        setNotice('Votre nouvelle formule est maintenant active.');
        return;
      }
      setNotice('Vérification de votre nouvelle formule…');
    } catch {
      // La page reste utilisable ; une prochaine tentative ou actualisation reprendra la synchronisation.
    }
  }
  setNotice('La nouvelle formule n’est pas encore visible. La synchronisation peut prendre quelques instants.');
}

$('#open-billing-portal').addEventListener('click', openBillingPortal);
$('#change-plan-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.busy) return;
  const plan = state.plans.find((item) => item.slug === $('#target-plan').value);
  if (!plan) { setNotice('Choisissez une nouvelle formule.', 'error'); return; }
  askToChangePlan(plan);
});
$('#change-plan-dialog').addEventListener('close', () => {
  const plan = state.targetPlan;
  const confirmed = $('#change-plan-dialog').returnValue === 'confirm';
  state.targetPlan = null;
  if (confirmed) changePlan(plan);
});

$('#subscription-sign-out').addEventListener('click', async () => {
  await signOut().catch(() => {});
  window.location.replace('./connexion.html');
});
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('pageshow', (event) => {
  if (!event.persisted || state.busy) return;
  resolveSession().then((session) => { if (session) showSubscription(session); }).catch(() => {});
});
updateNetworkStatus();
onAuthChange((_event, session) => { if (session) showSubscription(session); });
resolveSession().then((session) => {
  if (session) return showSubscription(session);
  window.location.replace('./connexion.html');
}).catch(async (error) => {
  if (isInvalidStoredSession(error)) await clearInvalidLocalSession().catch(() => {});
  window.location.replace('./connexion.html');
});
