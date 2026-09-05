import assert from 'node:assert/strict';
import {
  mkdtemp, mkdir, readFile, rm, writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';

const repositoryDir = new URL('..', import.meta.url).pathname;
const deployScript = path.join(repositoryDir, 'deploy.sh');
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function run(args, env = {}) {
  return spawnSync('bash', [deployScript, ...args], {
    cwd: repositoryDir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

async function remoteEnvironment() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'gigabole-deploy-test-'));
  temporaryDirectories.push(directory);
  const bin = path.join(directory, 'bin');
  const identity = path.join(directory, 'identity');
  const knownHosts = path.join(directory, 'known_hosts');
  const capture = path.join(directory, 'capture');
  await mkdir(bin);
  await writeFile(identity, 'fixture\n', { mode: 0o600 });
  await writeFile(knownHosts, 'gigabole.com fixture\n', { mode: 0o600 });
  await writeFile(path.join(bin, 'lftp'), '#!/usr/bin/env bash\nprintf "%s\\n" "$*" > "$GIGABOLE_TEST_CAPTURE"\n', { mode: 0o755 });
  return {
    PATH: `${bin}:${process.env.PATH}`,
    GIGABOLE_TEST_CAPTURE: capture,
    GIGABOLE_SFTP_REMOTE_DIR: '/gigabole.com/public_html/contes-gigabole/',
    GIGABOLE_SFTP_USER: 'fixture-user',
    GIGABOLE_SFTP_IDENTITY_FILE: identity,
    GIGABOLE_SFTP_KNOWN_HOSTS_FILE: knownHosts,
    capture,
  };
}

test('le mode par défaut valide le snapshot sans réseau ni configuration SFTP', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Aucune connexion réseau/);
});

test('le prévol refuse les options et cibles dangereuses', async () => {
  assert.notEqual(run(['--delete']).status, 0);
  const env = await remoteEnvironment();
  for (const target of ['/', '/public_html/', '../contes-gigabole/', '/public_html/../contes-gigabole/']) {
    const result = run(['--remote-dry-run'], { ...env, GIGABOLE_SFTP_REMOTE_DIR: target });
    assert.notEqual(result.status, 0, target);
  }
});

test('le dry-run distant explicite conserve la suppression absente', async () => {
  const env = await remoteEnvironment();
  const result = run(['--remote-dry-run'], env);
  assert.equal(result.status, 0, result.stderr);
  const invocation = await readFile(env.capture, 'utf8');
  assert.match(invocation, /--dry-run/);
  assert.doesNotMatch(invocation, /--delete|mirror-delete|Remove-source-files/i);
  assert.match(invocation, /StrictHostKeyChecking=yes/);
});

test('le téléversement est refusé sans confirmation exacte', async () => {
  const env = await remoteEnvironment();
  const result = run(['--apply'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /confirmation explicite absente/);
});
