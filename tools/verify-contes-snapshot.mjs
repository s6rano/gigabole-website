#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDir = path.join(repositoryDir, 'contes-gigabole');
const manifestPath = path.join(snapshotDir, 'snapshot-manifest.json');
const forbiddenName = /(^|\/)(\.env(?:\.|$)|config\.local\.js$|\.git(?:\/|$)|.*\.(?:pem|key|log|bak|sql|dump)$)/i;
const forbiddenContent = /(sb_secret_|service_role|sk_live_|rk_live_|whsec_|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeRelative(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || forbiddenName.test(normalized)) {
    fail(`chemin interdit : ${relativePath}`);
  }
  return normalized;
}

async function walk(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = normalizeRelative(path.join(prefix, entry.name));
    const absolutePath = path.join(directory, entry.name);
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink()) fail(`lien symbolique interdit : ${relativePath}`);
    if (stats.isDirectory()) files.push(...await walk(absolutePath, relativePath));
    else if (stats.isFile()) files.push(relativePath);
    else fail(`type de fichier interdit : ${relativePath}`);
  }
  return files.sort();
}

function validateManifest(manifest) {
  if (manifest.schema_version !== 1) fail('version de manifeste inconnue');
  if (manifest.source_repository !== 'gigabole-kids-V2-202609') fail('dépôt source inattendu');
  if (!/^[a-f0-9]{40}$/.test(manifest.source_commit || '')) fail('commit source invalide');
  if (!/^[a-f0-9]{40}$/.test(manifest.source_tree || '')) fail('arbre source invalide');
  if (manifest.public_route !== '/contes-gigabole/') fail('route publique inattendue');
  if (!Array.isArray(manifest.files) || !manifest.files.length) fail('liste de fichiers vide');

  const seen = new Set();
  for (const file of manifest.files) {
    const relativePath = normalizeRelative(file.path);
    if (seen.has(relativePath)) fail(`fichier dupliqué : ${relativePath}`);
    if (!/^[a-f0-9]{64}$/.test(file.sha256 || '')) fail(`somme invalide : ${relativePath}`);
    if (!Number.isInteger(file.size) || file.size <= 0) fail(`taille invalide : ${relativePath}`);
    seen.add(relativePath);
  }
  return seen;
}

function localReferences(source) {
  return [...source.matchAll(/(?:from\s+|src=|href=)["'](\.\.?\/[^"'#?]+)["']/g)]
    .map((match) => match[1]);
}

export async function verifySnapshot(directory = snapshotDir) {
  if (path.resolve(directory) !== snapshotDir) fail('la cible doit être exactement contes-gigabole/');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const expected = validateManifest(manifest);
  const actual = await walk(directory);
  const allowed = new Set([...expected, 'snapshot-manifest.json']);

  const extras = actual.filter((file) => !allowed.has(file));
  const missing = [...allowed].filter((file) => !actual.includes(file));
  if (extras.length) fail(`fichiers hors manifeste : ${extras.join(', ')}`);
  if (missing.length) fail(`fichiers manquants : ${missing.join(', ')}`);

  for (const file of manifest.files) {
    const absolutePath = path.join(directory, file.path);
    const bytes = await readFile(absolutePath);
    if (bytes.length !== file.size || sha256(bytes) !== file.sha256) fail(`contenu altéré : ${file.path}`);
    const source = bytes.toString('utf8');
    if (forbiddenContent.test(source)) fail(`secret ou autorité serveur détecté : ${file.path}`);
    if (file.path.endsWith('.html') && !/<meta\s+name=["']robots["']\s+content=["']noindex, nofollow["']/.test(source)) {
      fail(`garde noindex absente : ${file.path}`);
    }
    for (const reference of localReferences(source)) {
      const resolved = normalizeRelative(path.posix.normalize(path.posix.join(path.posix.dirname(file.path), reference)));
      if (!expected.has(resolved)) fail(`référence locale absente : ${file.path} -> ${reference}`);
    }
  }

  return { fileCount: manifest.files.length, sourceCommit: manifest.source_commit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifySnapshot().then((result) => {
    console.log(`Snapshot valide : ${result.fileCount} fichiers, source ${result.sourceCommit}.`);
  }).catch((error) => {
    console.error(`Erreur : ${error.message}`);
    process.exitCode = 1;
  });
}
