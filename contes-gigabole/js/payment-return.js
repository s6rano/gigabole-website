import { returnPageMessage } from './registration-core.js';

const notice = document.querySelector('#payment-return-notice');
notice.textContent = returnPageMessage();

// session_id est un paramètre de retour Stripe, jamais une preuve de paiement. La page ne le
// lit pas, ne le journalise pas et n'effectue aucune requête vers Stripe ou Supabase.
window.history.replaceState({}, '', './paiement-retour.html');
