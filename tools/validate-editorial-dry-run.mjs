#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const [, , outputPath] = process.argv;

function fail(message) {
  throw new Error(message);
}

if (!outputPath) fail('sortie lftp absente');

const output = await readFile(outputPath, 'utf8');
const transfers = [...output.matchAll(/^Transferring file `([^']+)'$/gm)].map((match) => match[1]);
const removals = [...output.matchAll(/^Removing old file `([^']+)'$/gm)].map((match) => match[1]);

if (/^Removing old (?:directory|link) /m.test(output)) {
  fail('suppression distante non éditoriale détectée');
}
if (!transfers.length) fail('aucun fichier à publier');
if (new Set(transfers).size !== transfers.length) fail('transfert dupliqué détecté');

const allowedHtml = /^[a-z0-9][a-z0-9._-]*\.html$/i;
for (const relativePath of transfers) {
  if (relativePath !== 'snapshot-manifest.json' && !allowedHtml.test(relativePath)) {
    fail(`fichier hors voie éditoriale : ${relativePath}`);
  }
}
if (!transfers.includes('snapshot-manifest.json')) {
  fail('le manifeste doit accompagner toute publication éditoriale');
}
for (const relativePath of removals) {
  if (!transfers.includes(relativePath)) fail(`suppression sans remplacement : ${relativePath}`);
}

const ordered = [
  ...transfers.filter((relativePath) => relativePath !== 'snapshot-manifest.json').sort(),
  'snapshot-manifest.json',
];
process.stdout.write(`${ordered.join('\n')}\n`);
