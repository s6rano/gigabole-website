import { authMessage, clearInvalidLocalSession, isInvalidStoredSession, onAuthChange, resolveSession, signOut } from './auth.js';
import { deleteChild, loadChildren, loadProfile, saveChild, saveProfile } from './profile.js';

const $ = (selector) => document.querySelector(selector);
const state = { session: null, children: [] };

function setNotice(message = '', kind = '') {
  const node = $('#profile-notice');
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', kind === 'error');
}

function setBusy(form, busy) {
  for (const control of form.querySelectorAll('input, select, button')) control.disabled = busy;
  form.setAttribute('aria-busy', String(busy));
}

function showScreen(name) {
  $('#profile-boot').hidden = name !== 'boot';
  $('#profile-screen').hidden = name !== 'screen';
  $('#profile-sign-out').hidden = name !== 'screen';
}

function childPosition() {
  return Math.max(0, ...state.children.map((child) => Number(child.position) || 0)) + 1;
}

async function confirmChildRemoval() {
  const dialog = $('#remove-child-dialog');
  if (typeof dialog.showModal !== 'function') {
    return window.confirm('Êtes-vous sûr de vouloir retirer cet enfant de l’abonnement ?');
  }
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}

function renderChild(child = {}) {
  const fragment = $('#child-template').content.cloneNode(true);
  const form = fragment.querySelector('form');
  const feedback = form.querySelector('.child-feedback');
  for (const [key, value] of Object.entries(child)) {
    const input = form.elements[key];
    if (input && value !== null && value !== undefined) input.value = value;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Les champs `disabled` sont exclus de FormData. Il faut donc prendre
    // l'instantané du formulaire avant de le verrouiller pendant la requête.
    const values = Object.fromEntries(new FormData(form));
    feedback.hidden = true;
    feedback.textContent = '';
    setBusy(form, true);
    try {
      await saveChild(state.session.user.id, values);
      await refreshProfilePage();
      setNotice('Profil enfant enregistré.');
    } catch (error) {
      const message = authMessage(error);
      feedback.textContent = message;
      feedback.hidden = false;
      setNotice(message, 'error');
    } finally { setBusy(form, false); }
  });
  form.querySelector('.delete-child').addEventListener('click', async () => {
    if (!await confirmChildRemoval()) return;
    if (!form.elements.id.value) { form.remove(); return; }
    try {
      await deleteChild(state.session.user.id, form.elements.id.value);
      await refreshProfilePage();
      setNotice('Profil enfant supprimé.');
    } catch (error) { setNotice(authMessage(error), 'error'); }
  });
  $('#children-list').append(fragment);
}

async function refreshProfilePage() {
  const [profile, children] = await Promise.all([loadProfile(state.session.user.id), loadChildren(state.session.user.id)]);
  $('#first-name').value = profile.first_name || '';
  $('#last-name').value = profile.last_name || '';
  $('#country').value = profile.country || '';
  state.children = children;
  $('#children-list').replaceChildren();
  children.forEach(renderChild);
}

function updateNetworkStatus() {
  const offline = !navigator.onLine;
  const node = $('#profile-network-status');
  node.textContent = offline ? 'Hors ligne' : 'Connecté';
  node.dataset.offline = String(offline);
}

async function showProfilePage(session) {
  state.session = session;
  showScreen('boot');
  try {
    await refreshProfilePage();
    showScreen('screen');
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

$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await saveProfile(state.session.user.id, Object.fromEntries(new FormData(event.currentTarget)));
    await refreshProfilePage();
    setNotice('Profil du responsable enregistré.');
  } catch (error) { setNotice(authMessage(error), 'error'); }
});
$('#add-child').addEventListener('click', () => renderChild({ position: childPosition() }));
$('#profile-sign-out').addEventListener('click', async () => { await signOut().catch(() => {}); window.location.replace('./connexion.html'); });
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();
onAuthChange((_event, session) => { if (session) showProfilePage(session); });
resolveSession().then((session) => { if (session) return showProfilePage(session); window.location.replace('./connexion.html'); }).catch(async (error) => {
  if (isInvalidStoredSession(error)) await clearInvalidLocalSession().catch(() => {});
  window.location.replace('./connexion.html');
});
