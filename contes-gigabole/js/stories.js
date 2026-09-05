import { supabase } from './supabase.js';

const DELIVERY_COLUMNS = 'id,delivery_kind,occasion_day,granted_at,personalization,story_translations(id,story_id,language,title,text)';
const ASSET_COLUMNS = 'id,kind,language,storage_path,mime_type,width_px,height_px,created_at';
const SIGNED_URL_TTL_SECONDS = 120;

function storyFromDelivery(delivery) {
  const translation = Array.isArray(delivery.story_translations)
    ? delivery.story_translations[0]
    : delivery.story_translations;
  if (!translation?.id || !translation?.story_id) return null;
  return { ...delivery, translation };
}

export function storyRoute(deliveryId) {
  return `./connexion.html?conte=${encodeURIComponent(deliveryId)}`;
}

export function displayDeliveryTitle(delivery) {
  return delivery?.translation?.title || 'Conte sans titre';
}

export async function loadDeliveredStories() {
  const { data, error } = await supabase
    .from('deliveries')
    .select(DELIVERY_COLUMNS)
    .order('granted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(storyFromDelivery).filter(Boolean);
}

export async function loadDeliveredStory(deliveryId) {
  const { data, error } = await supabase
    .from('deliveries')
    .select(DELIVERY_COLUMNS)
    .eq('id', deliveryId)
    .maybeSingle();
  if (error) throw error;
  const story = storyFromDelivery(data);
  if (!story) throw new Error('Ce conte est introuvable ou votre accès a expiré.');
  return story;
}

export async function loadReaderCampaign(deliveryId) {
  const { data, error } = await supabase.rpc('resolve_reader_campaign', {
    p_delivery_id: deliveryId,
  });
  if (error) throw error;
  return data ?? null;
}

export async function signCampaignImage(campaign, expiresIn = SIGNED_URL_TTL_SECONDS) {
  if (!campaign?.image_path) return campaign;
  const { data, error } = await supabase.storage
    .from('campaign-assets')
    .createSignedUrl(campaign.image_path, expiresIn);
  if (error) throw error;
  return { ...campaign, imageUrl: data.signedUrl };
}

export async function loadStoryAssets(storyId, language) {
  const { data, error } = await supabase
    .from('story_assets')
    .select(ASSET_COLUMNS)
    .eq('story_id', storyId)
    .or(`language.is.null,language.eq.${language}`)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function signAssets(assets, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const signed = await Promise.all((assets ?? []).map(async (asset) => {
    const { data, error } = await supabase.storage.from('story-assets').createSignedUrl(asset.storage_path, expiresIn);
    if (error) throw error;
    return { ...asset, signedUrl: data.signedUrl, signedUntil: Date.now() + expiresIn * 1000 };
  }));
  return signed;
}

export function separateAssets(assets) {
  return {
    images: (assets ?? []).filter((asset) => asset.kind === 'image'),
    audio: (assets ?? []).find((asset) => asset.kind === 'audio') ?? null,
  };
}
