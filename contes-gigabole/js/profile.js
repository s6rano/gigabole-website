import { supabase } from './supabase.js';

const PROFILE_COLUMNS = 'id,first_name,last_name,gender,birth_date,country,created_at';
const CHILD_COLUMNS = 'id,first_name,last_name,gender,birth_date,position,created_at';
const SUBSCRIPTION_COLUMNS = 'id,status,source,activated_at,current_period_end,cancel_at_period_end,ended_at,scheduled_plan_change_at,plans!subscriptions_plan_id_fkey(name,slug,monthly_price_cents,currency),pending_plans:plans!subscriptions_pending_plan_id_fkey(name,slug,monthly_price_cents,currency)';

function requireUserId(userId) {
  if (!userId) throw new Error('Connexion requise.');
}

export async function loadProfile(userId) {
  requireUserId(userId);
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Votre profil est introuvable. Contactez Gigabole.');
  return data;
}

export async function saveProfile(userId, values) {
  requireUserId(userId);
  const payload = {
    first_name: String(values.first_name || '').trim() || null,
    last_name: String(values.last_name || '').trim() || null,
    country: String(values.country || '').trim() || null,
  };
  const { data, error } = await supabase
    .from('profiles').update(payload).eq('id', userId).select(PROFILE_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Enregistrement du profil refusé.');
  return data;
}

export async function loadChildren(userId) {
  requireUserId(userId);
  const { data, error } = await supabase.from('children').select(CHILD_COLUMNS).order('position').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function saveChild(userId, values) {
  requireUserId(userId);
  const payload = {
    first_name: String(values.first_name || '').trim(),
    last_name: String(values.last_name || '').trim(),
    gender: values.gender,
    birth_date: values.birth_date,
    position: Number(values.position || 1),
  };
  if (!payload.first_name || !payload.last_name || !payload.gender || !payload.birth_date) {
    throw new Error("Prénom, nom, genre et date de naissance sont obligatoires.");
  }
  const query = values.id
    ? supabase.from('children').update(payload).eq('id', values.id)
    : supabase.from('children').insert({ ...payload, subscriber_id: userId });
  const { data, error } = await query.select(CHILD_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Enregistrement de l'enfant refusé.");
  return data;
}

export async function deleteChild(userId, childId) {
  requireUserId(userId);
  const { error } = await supabase.from('children').delete().eq('id', childId);
  if (error) throw error;
}

export async function loadSubscriptions(userId) {
  requireUserId(userId);
  const { data, error } = await supabase.from('subscriptions').select(SUBSCRIPTION_COLUMNS).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadCurrentPromotion(userId) {
  requireUserId(userId);
  const { data, error } = await supabase.rpc('get_my_current_promotion');
  if (error) throw error;
  return data?.[0] ?? null;
}

export function currentSubscription(subscriptions) {
  return (subscriptions ?? []).find((subscription) => subscription.status !== 'canceled') ?? null;
}

export function subscriptionState(subscription) {
  if (!subscription) return { tone: 'inactive', label: 'Aucun abonnement actif' };
  if (subscription.status === 'active' && subscription.cancel_at_period_end) {
    return { tone: 'warning', label: 'Résiliation prévue en fin de période' };
  }
  if (subscription.status === 'active') return { tone: 'active', label: 'Abonnement actif' };
  return { tone: 'inactive', label: 'Abonnement inactif' };
}
