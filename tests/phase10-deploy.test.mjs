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
const hostKey = '[caberdouche.be]:2224 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCo79ho5BHaXBQ8QjEhn0twbK5eo0ujKKF1LxiabVvQXlu0vvHzC0zLwVcdibcdebVaLLOGg7O2WXBJy52qTl7xDcdx7AmiOC1ckEk3ZCMkl5mvwJ0vCV5TQiyRalmnSsDL7k+6mUULMsO9YhgHQNzCHHnqfIjSRVScHG3o/zMm8NJUpSTgfHS6nkv0qjA3BCsTxuGc+zxfUrPufXpx0ZNfyVEFrl7sPnAy4T1p45JKnlFAl9XQSaBNsSPCsK9A0rlpelZOwn9HhXFY0mZJ55Eh/XQiAXa+s/3abFreCtml87tVEaBgr5wSq1u5xW1rHuQdf3n8EaxYv5PQh4kypU/F';

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

async function remoteEnvironment({ fingerprintValid = true } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'gigabole-deploy-test-'));
  temporaryDirectories.push(directory);
  const bin = path.join(directory, 'bin');
  const sshDirectory = path.join(directory, 'Gigabole Kids SFTP');
  const knownHosts = path.join(sshDirectory, 'known_hosts');
  const capture = path.join(directory, 'capture');
  const argumentCapture = path.join(directory, 'arguments');
  const securityCallCapture = path.join(directory, 'security-calls');
  const lftpCallCapture = path.join(directory, 'lftp-calls');
  await Promise.all([mkdir(bin), mkdir(sshDirectory)]);
  await writeFile(knownHosts, fingerprintValid ? `${hostKey}\n` : '[caberdouche.be]:2224 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7fixture\n');
  await Promise.all([writeFile(securityCallCapture, '0\n'), writeFile(lftpCallCapture, '0\n')]);
  await writeFile(
    path.join(bin, 'security'),
    '#!/usr/bin/env bash\ncount="$(tr -d "\\n" < "$GIGABOLE_TEST_SECURITY_CALLS")"\nprintf "%s\\n" "$((count + 1))" > "$GIGABOLE_TEST_SECURITY_CALLS"\nprintf "%s" "fixture-password"\n',
    { mode: 0o755 },
  );
  await writeFile(
    path.join(bin, 'expect'),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$*" > "$GIGABOLE_TEST_ARGUMENTS"\nprintf "Remote working directory: /\\ndrwxr-xr-x images\\nls: js: No such file or directory\\n" > "$GIGABOLE_TEST_CAPTURE"\n',
    { mode: 0o755 },
  );
  await writeFile(
    path.join(bin, 'lftp'),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$*" > "$GIGABOLE_TEST_ARGUMENTS"\ncp "$2" "$GIGABOLE_TEST_CAPTURE"\ncount="$(tr -d "\\n" < "$GIGABOLE_TEST_LFTP_CALLS")"\nprintf "%s\\n" "$((count + 1))" > "$GIGABOLE_TEST_LFTP_CALLS"\nif grep -q -- "--dry-run" "$2"; then\n  printf "%b" "${GIGABOLE_TEST_DRY_RUN_OUTPUT:-Removing old file \\`index.html\\047\\nTransferring file \\`index.html\\047\\nRemoving old file \\`snapshot-manifest.json\\047\\nTransferring file \\`snapshot-manifest.json\\047\\nmkdir -p sftp://fixture-user:fixture-password@caberdouche.be/\\n}"\nelse\n  printf "put sftp://fixture-user:fixture-password@caberdouche.be/example\\n"\nfi\n',
    { mode: 0o755 },
  );
  await writeFile(
    path.join(bin, 'node'),
    '#!/usr/bin/env bash\nif [[ "$1" == *"verify-remote-snapshot.mjs" ]]; then\n  printf "Snapshot distant simulé valide.\\n"\n  exit 0\nfi\nexec "$GIGABOLE_TEST_REAL_NODE" "$@"\n',
    { mode: 0o755 },
  );
  return {
    PATH: `${bin}:${process.env.PATH}`,
    GIGABOLE_TEST_CAPTURE: capture,
    GIGABOLE_TEST_ARGUMENTS: argumentCapture,
    GIGABOLE_TEST_SECURITY_CALLS: securityCallCapture,
    GIGABOLE_TEST_LFTP_CALLS: lftpCallCapture,
    GIGABOLE_TEST_REAL_NODE: process.execPath,
    GIGABOLE_SFTP_KNOWN_HOSTS_FILE: knownHosts,
    capture,
    argumentCapture,
    securityCallCapture,
    lftpCallCapture,
  };
}

test('le mode par défaut valide le snapshot sans réseau ni accès au Trousseau', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Aucune connexion réseau/);
});

test('le prévol refuse une option inconnue et une empreinte différente', async () => {
  assert.notEqual(run(['--delete']).status, 0);
  const env = await remoteEnvironment({ fingerprintValid: false });
  const result = run(['--remote-dry-run'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /empreinte SSH inattendue|not a public key file/);
});

test('l’inventaire distant est borné au compte chrooté et strictement en lecture seule', async () => {
  const env = await remoteEnvironment();
  const result = run(['--remote-inventory'], {
    ...env,
    GIGABOLE_SFTP_REMOTE_DIR: '/domains/gigabole.com/public_html/',
  });
  assert.equal(result.status, 0, result.stderr);
  const [output, args] = await Promise.all([
    readFile(env.capture, 'utf8'), readFile(env.argumentCapture, 'utf8'),
  ]);
  assert.match(output, /Remote working directory: \//);
  assert.match(output, /No such file or directory/);
  assert.match(args, /sftp-readonly-preflight\.exp/);
  assert.doesNotMatch(args, /fixture-password/);
  assert.doesNotMatch(args, /--delete|mirror-delete|Remove-source-files/i);
});

test('le dry-run lftp simule le miroir sans suppression ni secret dans les arguments', async () => {
  const env = await remoteEnvironment();
  const result = run(['--remote-dry-run'], env);
  assert.equal(result.status, 0, result.stderr);
  const [commands, args] = await Promise.all([
    readFile(env.capture, 'utf8'), readFile(env.argumentCapture, 'utf8'),
  ]);
  assert.match(commands, /mirror -R --verbose --dry-run [^\n]+ "\/"/);
  assert.doesNotMatch(commands, /--delete|mirror-delete|Remove-source-files/i);
  assert.doesNotMatch(args, /fixture-password/);
  assert.doesNotMatch(result.stdout, /fixture-password/);
  assert.match(result.stdout, /IDENTIFIANTS-MASQUES/);
});

test('le téléversement est refusé sans confirmation exacte', async () => {
  const env = await remoteEnvironment();
  const result = run(['--apply'], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /confirmation explicite absente/);
});

test('un apply confirmé conserve la cible chrootée et n’active aucun nettoyage distant', async () => {
  const env = await remoteEnvironment();
  const result = run(['--apply'], {
    ...env,
    GIGABOLE_DEPLOY_CONFIRM: 'DEPLOY_GIGABOLE_CONTES_GIGABOLE',
  });
  assert.equal(result.status, 0, result.stderr);
  const [commands, args] = await Promise.all([
    readFile(env.capture, 'utf8'), readFile(env.argumentCapture, 'utf8'),
  ]);
  assert.match(commands, /open sftp:\/\/caberdouche\.be/);
  assert.match(commands, /user "deploygigabolekids@gigabole\.com"/);
  assert.match(commands, /mirror -R --verbose [^\n]+ "\/"/);
  assert.match(commands, /HostKeyAlgorithms=\+ssh-rsa/);
  assert.match(commands, /UserKnownHostsFile=\/[^\n"]*gigabole-kids-hostkey/);
  assert.doesNotMatch(commands, /--delete|mirror-delete|Remove-source-files/i);
  assert.doesNotMatch(args, /fixture-password/);
  assert.doesNotMatch(result.stdout, /fixture-password/);
  assert.match(result.stdout, /IDENTIFIANTS-MASQUES/);
});

test('la voie éditoriale simule puis publie une liste HTML bornée avec une seule lecture du Trousseau', async () => {
  const env = await remoteEnvironment();
  const result = run(['--publish-editorial'], {
    ...env,
    GIGABOLE_EDITORIAL_PUBLISH_CONFIRM: 'PUBLISH_GIGABOLE_EDITORIAL_BETA',
  });
  assert.equal(result.status, 0, result.stderr);
  const [commands, securityCalls, lftpCalls] = await Promise.all([
    readFile(env.capture, 'utf8'),
    readFile(env.securityCallCapture, 'utf8'),
    readFile(env.lftpCallCapture, 'utf8'),
  ]);
  assert.match(commands, /put -O "\/" "[^"]+\/index\.html"/);
  assert.match(commands, /put -O "\/" "[^"]+\/snapshot-manifest\.json"/);
  assert.ok(commands.indexOf('/index.html') < commands.indexOf('/snapshot-manifest.json'));
  assert.doesNotMatch(commands, /mirror|--delete|Remove-source-files/i);
  assert.equal(securityCalls.trim(), '1');
  assert.equal(lftpCalls.trim(), '2');
  assert.match(result.stdout, /Périmètre éditorial validé/);
  assert.match(result.stdout, /Publication éditoriale terminée et vérifiée/);
  assert.doesNotMatch(result.stdout, /fixture-password/);
});

test('la voie éditoriale refuse un fichier non HTML avant tout téléversement', async () => {
  const env = await remoteEnvironment();
  const result = run(['--publish-editorial'], {
    ...env,
    GIGABOLE_EDITORIAL_PUBLISH_CONFIRM: 'PUBLISH_GIGABOLE_EDITORIAL_BETA',
    GIGABOLE_TEST_DRY_RUN_OUTPUT: 'Transferring file `styles.css\'\nTransferring file `snapshot-manifest.json\'\n',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fichier hors voie éditoriale/);
  assert.equal((await readFile(env.lftpCallCapture, 'utf8')).trim(), '1');
});

test('la voie éditoriale exige sa confirmation et le manifeste', async () => {
  const env = await remoteEnvironment();
  const missingConfirmation = run(['--publish-editorial'], env);
  assert.notEqual(missingConfirmation.status, 0);
  assert.match(missingConfirmation.stderr, /confirmation explicite absente/);
  assert.equal((await readFile(env.securityCallCapture, 'utf8')).trim(), '0');

  const missingManifest = run(['--publish-editorial'], {
    ...env,
    GIGABOLE_EDITORIAL_PUBLISH_CONFIRM: 'PUBLISH_GIGABOLE_EDITORIAL_BETA',
    GIGABOLE_TEST_DRY_RUN_OUTPUT: 'Transferring file `index.html\'\n',
  });
  assert.notEqual(missingManifest.status, 0);
  assert.match(missingManifest.stderr, /manifeste doit accompagner/);
});
