import { supabase } from './supabase.js';
import { activePlans, deliveryDays, publicPlanColumns } from './registration-core.js';

export { deliveryDays };

/**
 * Lecture publique des formules actives, pour la vitrine et l'inscription.
 * Ne sélectionne que les colonnes publiques : aucun identifiant Stripe, aucun
 * taux interne, aucune donnée abonné.
 */
export async function loadActivePlans() {
  const { data, error } = await supabase.from('plans').select(publicPlanColumns()).eq('active', true);
  if (error) throw error;
  return activePlans(data);
}

export function formatMonthlyPrice(plan) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: plan.currency, minimumFractionDigits: 0 }).format(plan.monthly_price_cents / 100);
}
