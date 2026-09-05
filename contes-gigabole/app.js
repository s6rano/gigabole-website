import { authMessage, clearInvalidLocalSession, isInvalidStoredSession, onAuthChange, requestPasswordReset, resolveSession, signInWithPassword, signOut, updatePassword } from './js/auth.js';
import { loadChildren, loadSubscriptions } from './js/profile.js';
import { displayDeliveryTitle, loadDeliveredStories, loadDeliveredStory, loadReaderCampaign, loadStoryAssets, separateAssets, signAssets, signCampaignImage, storyRoute } from './js/stories.js';
import { formatStory } from './js/story-format.js';
import { isPasswordRecoveryUrl, setRememberSession } from './js/supabase.js';

const $ = (selector) => document.querySelector(selector);
const screens = { boot: $('#boot-screen'), auth: $('#auth-screen'), recovery: $('#recovery-screen'), app: $('#app-screen') };
const state = { session: null, recovery: false, children: [], hasReadingAccess: false, stories: [], activeStory: null };

function showScreen(name) {
  for (const [key, element] of Object.entries(screens)) element.hidden = key !== name;
  $('#sign-out').hidden = name !== 'app';
}

function setNotice(id, message = '', kind = '') {
  const node = $(id);
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', kind === 'error');
}

function setBusy(form, busy) {
  for (const control of form.querySelectorAll('input, select, button')) control.disabled = busy;
  form.setAttribute('aria-busy', String(busy));
}

function brusselsDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long', timeZone: 'Europe/Brussels' }).format(new Date(value));
}

function deliveryLabel(delivery) {
  return delivery.delivery_kind === 'birthday' ? 'Conte d’anniversaire' : 'Conte du jour';
}

function updateNetworkStatus() {
  const offline = !navigator.onLine;
  const node = $('#network-status');
  node.textContent = offline ? 'Hors ligne : vos contes restent protégés.' : 'Connecté';
  node.dataset.offline = String(offline);
}

function renderStories() {
  const list = $('#stories-list');
  list.replaceChildren();
  $('#stories-loading').hidden = true;
  const empty = $('#stories-empty');
  empty.hidden = state.stories.length !== 0;
  if (!state.stories.length) {
    empty.querySelector('h3').textContent = state.hasReadingAccess
      ? 'Votre boîte est encore vide.'
      : 'Votre boîte à lecture est en pause.';
    empty.querySelector('p').textContent = state.hasReadingAccess
      ? 'Le premier conte apparaîtra ici après sa publication.'
      : 'Un adulte responsable peut vérifier l’accès depuis le lien « Mon abonnement ».';
  }
  const template = $('#story-card-template');
  for (const story of state.stories) {
    const card = template.content.cloneNode(true);
    card.querySelector('.story-card-kind').textContent = deliveryLabel(story);
    card.querySelector('.story-card-title').textContent = displayDeliveryTitle(story);
    card.querySelector('.story-card-date').textContent = `Disponible depuis le ${brusselsDate(story.granted_at)}`;
    card.querySelector('.story-card-open').addEventListener('click', () => openStory(story.id));
    list.append(card);
  }
}

async function refreshStories() {
  $('#stories-loading').hidden = false;
  $('#stories-loading').textContent = 'Chargement de vos contes…';
  try {
    state.stories = await loadDeliveredStories();
    renderStories();
  } catch (error) {
    $('#stories-loading').textContent = 'Impossible de charger vos contes.';
    setNotice('#app-notice', authMessage(error), 'error');
  }
}

function renderMedia(signedAssets) {
  const { images, audio } = separateAssets(signedAssets);
  const imageBox = $('#reader-images');
  imageBox.replaceChildren();
  for (const image of images) {
    const element = new Image();
    element.src = image.signedUrl;
    element.alt = '';
    element.addEventListener('error', () => showMediaRefresh('Cette illustration doit être rechargée.'));
    imageBox.append(element);
  }
  const player = $('#reader-audio');
  player.hidden = !audio;
  player.removeAttribute('src');
  if (audio) {
    player.src = audio.signedUrl;
    player.onerror = () => showMediaRefresh('La narration a expiré. Rechargez les médias.');
  }
}

function showMediaRefresh(message) {
  setNotice('#reader-media-notice', message);
  $('#refresh-media').hidden = false;
}

function renderCampaign(campaign) {
  const box = $('#reader-campaign');
  box.hidden = !campaign;
  box.replaceChildren();
  if (!campaign) return;
  if (campaign.imageUrl) {
    const image = new Image();
    image.src = campaign.imageUrl;
    image.alt = campaign.image_alt;
    box.append(image);
  }
  const title = document.createElement('h3');
  title.textContent = campaign.title;
  const body = document.createElement('div');
  body.className = 'campaign-body';
  body.textContent = campaign.body;
  box.append(title, body);
  if (campaign.cta_label && campaign.cta_url) {
    const link = document.createElement('a');
    link.className = 'button campaign-cta';
    link.href = campaign.cta_url;
    link.textContent = campaign.cta_label;
    box.append(link);
  }
}

async function loadCurrentStoryMedia() {
  if (!state.activeStory) return;
  setNotice('#reader-media-notice', 'Chargement sécurisé des illustrations et de la narration…');
  $('#refresh-media').hidden = true;
  try {
    const assets = await loadStoryAssets(state.activeStory.translation.story_id, state.activeStory.translation.language);
    renderMedia(await signAssets(assets));
    setNotice('#reader-media-notice');
  } catch (error) {
    showMediaRefresh(authMessage(error));
  }
}

async function openStory(deliveryId) {
  $('#reader-section').hidden = false;
  $('#stories-section').hidden = true;
  window.history.replaceState({}, '', storyRoute(deliveryId));
  try {
    const story = await loadDeliveredStory(deliveryId);
    state.activeStory = story;
    $('#reader-kind').textContent = deliveryLabel(story);
    $('#reader-title').textContent = displayDeliveryTitle(story);
    $('#reader-date').textContent = `Déposé le ${brusselsDate(story.granted_at)}`;
    const rendered = formatStory(story.translation);
    $('#reader-body').innerHTML = rendered.bodyHtml;
    const campaign = await loadReaderCampaign(deliveryId);
    renderCampaign(await signCampaignImage(campaign));
    await loadCurrentStoryMedia();
  } catch (error) {
    $('#reader-title').textContent = 'Conte indisponible';
    setNotice('#reader-media-notice', authMessage(error), 'error');
    $('#refresh-media').hidden = true;
  }
}

function closeReader() {
  state.activeStory = null;
  $('#reader-section').hidden = true;
  $('#stories-section').hidden = false;
  renderCampaign(null);
  window.history.replaceState({}, '', './connexion.html');
}

function greetingForChildren(children) {
  const names = children.map((child) => String(child.first_name || '').trim()).filter(Boolean);
  if (!names.length) return 'Bienvenue';
  return `Bonjour ${new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' }).format(names)}`;
}

async function refreshReaderContext() {
  const [children, subscriptions] = await Promise.all([
    loadChildren(state.session.user.id), loadSubscriptions(state.session.user.id),
  ]);
  state.children = children;
  state.hasReadingAccess = subscriptions.some((subscription) => subscription.status === 'active');
  $('#welcome-title').textContent = greetingForChildren(children);
}

async function showApplication(session) {
  state.recovery = false;
  state.session = session;
  showScreen('boot');
  try {
    await refreshReaderContext();
    if (state.recovery) return;
    await refreshStories();
    if (state.recovery) return;
    showScreen('app');
    const requested = new URLSearchParams(window.location.search).get('conte');
    if (requested) await openStory(requested);
  } catch (error) {
    if (isInvalidStoredSession(error)) {
      await clearInvalidLocalSession().catch(() => {});
      state.session = null;
      showScreen('auth');
      setNotice('#auth-error', 'Votre ancienne session a expiré. Connectez-vous à nouveau.');
      return;
    }
    showScreen('auth');
    setNotice('#auth-error', authMessage(error), 'error');
  }
}

function showPasswordRecovery(session) {
  state.session = session;
  state.recovery = true;
  setNotice('#recovery-error');
  $('#recovery-form').reset();
  showScreen('recovery');
}

$('#sign-in-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setBusy(form, true); setNotice('#auth-error');
  try {
    setRememberSession(form.remember_session.checked);
    await showApplication(await signInWithPassword(form.email.value.trim(), form.password.value));
  }
  catch (error) { setNotice('#auth-error', authMessage(error), 'error'); }
  finally { setBusy(form, false); }
});
$('#reset-password').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  if (!email) { setNotice('#auth-error', 'Indiquez votre adresse e-mail avant de demander un lien.', 'error'); return; }
  try { await requestPasswordReset(email); setNotice('#auth-error', 'Un e-mail de réinitialisation vient d’être envoyé.'); }
  catch (error) { setNotice('#auth-error', authMessage(error), 'error'); }
});
$('#recovery-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.password.value;
  if (password !== form.confirmation.value) {
    setNotice('#recovery-error', 'Les deux mots de passe ne correspondent pas.', 'error');
    return;
  }
  setBusy(form, true);
  try {
    await updatePassword(password);
    window.history.replaceState({}, '', './connexion.html');
    await showApplication(state.session);
    setNotice('#app-notice', 'Votre mot de passe a été modifié.');
  } catch (error) { setNotice('#recovery-error', authMessage(error), 'error'); }
  finally { setBusy(form, false); }
});
$('#sign-out').addEventListener('click', async () => { await signOut().catch(() => {}); state.session = null; showScreen('auth'); });
$('#stories-refresh').addEventListener('click', refreshStories);
$('#reader-back').addEventListener('click', closeReader);
$('#refresh-media').addEventListener('click', loadCurrentStoryMedia);
window.addEventListener('online', updateNetworkStatus); window.addEventListener('offline', updateNetworkStatus); updateNetworkStatus();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
onAuthChange((event, session) => {
  if ((event === 'PASSWORD_RECOVERY' || isPasswordRecoveryUrl()) && session) { showPasswordRecovery(session); return; }
  if (session && !state.session && !state.recovery) showApplication(session);
  if (!session && state.session) { state.session = null; state.recovery = false; showScreen('auth'); }
});
resolveSession().then((session) => session ? (isPasswordRecoveryUrl() ? showPasswordRecovery(session) : showApplication(session)) : showScreen('auth')).catch(async (error) => {
  if (isInvalidStoredSession(error)) {
    await clearInvalidLocalSession().catch(() => {});
    setNotice('#auth-error', 'Votre ancienne session a expiré. Connectez-vous à nouveau.');
  } else {
    setNotice('#auth-error', authMessage(error), 'error');
  }
  showScreen('auth');
});
