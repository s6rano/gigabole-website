/**
 * Rendu sûr et partagé des contes Gigabole Kids.
 *
 * Ce module ne touche jamais au DOM : il produit uniquement des fragments HTML
 * déjà échappés, utilisables par l'aperçu local et plus tard par l'application.
 */

const ALLOWED_TOKEN = 'child_first_name';
const TOKEN_PATTERN = /{{[^{}]*}}/g;

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function validateStoryTokens(value) {
  const source = String(value ?? '');
  const tokens = source.match(TOKEN_PATTERN) ?? [];

  for (const token of tokens) {
    if (token !== `{{${ALLOWED_TOKEN}}}`) {
      throw new Error(`Jeton non autorisé : ${token}`);
    }
  }

  const withoutAllowedTokens = source.replaceAll(`{{${ALLOWED_TOKEN}}}`, '');
  if (withoutAllowedTokens.includes('{{') || withoutAllowedTokens.includes('}}')) {
    throw new Error('Jeton mal formé ou non autorisé.');
  }

  return tokens.includes(`{{${ALLOWED_TOKEN}}}`);
}

function normalizeText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n');
}

function personalize(value, personalization) {
  const normalized = normalizeText(value);
  const hasFirstNameToken = validateStoryTokens(normalized);

  if (!hasFirstNameToken) return normalized;

  const firstName = personalization?.childFirstName;
  if (typeof firstName !== 'string' || firstName.trim() === '') {
    throw new Error('Un prénom est obligatoire pour rendre {{child_first_name}}.');
  }

  return normalized.replaceAll(`{{${ALLOWED_TOKEN}}}`, firstName);
}

function renderNarrative(lines) {
  return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
}

function renderBody(text) {
  if (text.trim() === '') return '';

  const rendered = [];
  let narrativeLines = [];

  const flushNarrative = () => {
    if (narrativeLines.length > 0) {
      rendered.push(renderNarrative(narrativeLines));
      narrativeLines = [];
    }
  };

  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      flushNarrative();
      continue;
    }

    if (line.startsWith('—')) {
      flushNarrative();
      rendered.push(`<p class="story-dialogue">${escapeHtml(line)}</p>`);
      continue;
    }

    narrativeLines.push(line);
  }

  flushNarrative();
  return rendered.join('\n');
}

/**
 * @param {{ title?: string, text?: string }} story
 * @param {{ childFirstName?: string }} [personalization]
 * @returns {{ titleHtml: string, bodyHtml: string }}
 */
export function formatStory(story, personalization = undefined) {
  if (!story || typeof story !== 'object') {
    throw new TypeError('Un conte avec un titre et un texte est obligatoire.');
  }

  const title = personalize(story.title, personalization);
  const text = personalize(story.text, personalization);

  return {
    titleHtml: escapeHtml(title),
    bodyHtml: renderBody(text),
  };
}
