#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDir = path.join(repositoryDir, 'contes-gigabole');
const manifestPath = path.join(snapshotDir, 'snapshot-manifest.json');
const publicBase = 'https://gigabole.com/contes-gigabole/';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const expected = [
  ...manifest.files,
  { path: 'snapshot-manifest.json', size: manifestBytes.length, sha256: sha256(manifestBytes) },
];

for (const file of expected) {
  const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${publicBase}${encodedPath}?p10=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${file.path} : HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== file.size) throw new Error(`${file.path} : taille distante inattendue`);
  if (sha256(bytes) !== file.sha256) throw new Error(`${file.path} : empreinte distante inattendue`);
}

console.log(`Snapshot distant valide : ${expected.length} fichiers identiques sur ${publicBase}`);
