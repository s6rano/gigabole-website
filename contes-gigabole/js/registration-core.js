export const TERMS_VERSION = 'cgv-2026-09';
export const PRIVACY_VERSION = 'privacy-2026-09';

const PLAN_COLUMNS = ['slug', 'name', 'monthly_price_cents', 'currency', 'sends_monday', 'sends_tuesday', 'sends_wednesday', 'sends_thursday', 'sends_friday', 'sends_saturday', 'sends_sunday'];
const GENDERS = new Set(['fille', 'garcon', 'autre']);

function text(value) {
  return String(value ?? '').trim();
}

export function publicPlanColumns() {
  return PLAN_COLUMNS.join(',');
}

export function activePlans(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((plan) => plan && typeof plan.slug === 'string' && text(plan.name) && Number.isInteger(plan.monthly_price_cents) && plan.monthly_price_cents > 0 && plan.currency === 'EUR')
    .sort((left, right) => left.monthly_price_cents - right.monthly_price_cents);
}

export function normalisePromotionCode(value) {
  return text(value).toUpperCase();
}

export function connectedRegistrationMismatch(connectedEmail, registrationEmail) {
  const connected = text(connectedEmail).toLowerCase();
  if (!connected) return false;
  return connected !== text(registrationEmail).toLowerCase();
}

export function deliveryDays(plan) {
  const days = [
    ['sends_monday', 'lundi'], ['sends_tuesday', 'mardi'], ['sends_wednesday', 'mercredi'], ['sends_thursday', 'jeudi'],
    ['sends_friday', 'vendredi'], ['sends_saturday', 'samedi'], ['sends_sunday', 'dimanche'],
  ].filter(([key]) => plan?.[key]).map(([, label]) => label);
  return new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' }).format(days);
}

export function newChild() {
  return { firstName: '', lastName: '', gender: '', birthDate: '' };
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= new Date().toISOString().slice(0, 10);
}

export function validateRegistrationStep(step, state) {
  if (step === 1) return activePlans(state.plans).some((plan) => plan.slug === state.planSlug) ? '' : 'Choisissez une formule disponible.';
  if (step === 2) {
    if (!text(state.firstName) || !text(state.lastName)) return 'Indiquez le prénom et le nom du responsable.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(state.email))) return 'Indiquez une adresse e-mail valide.';
    return '';
  }
  if (step === 3) {
    if (!state.children.length) return 'Ajoutez au moins un enfant.';
    const invalid = state.children.some((child) => !text(child.firstName) || !text(child.lastName) || !GENDERS.has(child.gender) || !validDate(child.birthDate));
    return invalid ? 'Complétez le prénom, le nom, le genre et une date de naissance passée pour chaque enfant.' : '';
  }
  if (step === 4 && (!state.acceptTerms || !state.acceptPrivacy)) return 'Veuillez accepter les conditions et la politique de confidentialité.';
  return '';
}

export function checkoutPayload(state, idempotencyKey) {
  return {
    planSlug: state.planSlug,
    firstName: text(state.firstName),
    lastName: text(state.lastName),
    email: text(state.email),
    children: state.children.map((child) => ({
      firstName: text(child.firstName), lastName: text(child.lastName), gender: child.gender, birthDate: child.birthDate,
    })),
    promoCode: normalisePromotionCode(state.promoCode),
    acceptTerms: state.acceptTerms === true,
    acceptPrivacy: state.acceptPrivacy === true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    idempotencyKey,
  };
}

export function checkoutFingerprint(state) {
  return JSON.stringify(checkoutPayload(state, ''));
}

export function createAttemptKey(random = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (random) return random();
  const bytes = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(8, '0')).join('');
}

export function checkoutErrorMessage(code) {
  const messages = {
    ACCOUNT_LOGIN_REQUIRED: 'Cette adresse est déjà liée à un compte. Connectez-vous pour poursuivre.',
    SUBSCRIPTION_EXISTS: 'Un abonnement est déjà en cours pour ce compte.',
    IDENTITY_MISMATCH: 'Le compte connecté ne correspond pas à cette adresse e-mail.',
    INVALID_PROMOTION: 'Ce code promotionnel n’est pas disponible.',
    PROMOTION_MISCONFIGURED: 'Cette offre promotionnelle est momentanément indisponible.',
    RATE_LIMITED: 'Trop de tentatives ont été effectuées. Réessayez dans quelques minutes.',
    CHECKOUT_CONFLICT: 'Une tentative de paiement est déjà en cours. Réessayez dans un instant.',
    INVALID_PLAN: 'Cette formule n’est plus disponible. Choisissez-en une autre.',
    PLAN_INACTIVE: 'Cette formule n’est plus disponible. Choisissez-en une autre.',
    PLAN_UNAVAILABLE: 'Cette formule n’est plus disponible. Choisissez-en une autre.',
    INVALID_CHILDREN: 'Ajoutez au moins un enfant avant de continuer.',
    INVALID_CHILD: 'Vérifiez les informations de chaque enfant.',
    INVALID_EMAIL: 'Vérifiez votre adresse e-mail.',
    LEGAL_ACCEPTANCE_REQUIRED: 'Veuillez accepter les conditions et la politique de confidentialité.',
  };
  return messages[code] || 'Le service de paiement est momentanément indisponible. Réessayez plus tard.';
}

export function returnPageMessage() {
  return 'Votre paiement est en cours de confirmation. L’activation de votre compte arrive par e-mail dès que celle-ci est terminée.';
}

export function activationErrorMessage(code) {
  if (code === 'expired') return 'Ce lien a expiré. Demandez un nouveau lien depuis la connexion.';
  if (code === 'invalid') return 'Ce lien d’activation est invalide ou a déjà été utilisé.';
  if (code === 'network') return 'Connexion au service impossible. Vérifiez le réseau puis réessayez.';
  return 'Votre session d’activation est absente. Utilisez le lien reçu par e-mail.';
}
