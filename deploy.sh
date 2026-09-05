#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="${REPOSITORY_DIR}/contes-gigabole"
SFTP_HOST="caberdouche.be"
SFTP_PORT="2224"
SFTP_USER="deploygigabolekids@gigabole.com"
REMOTE_DIR="/"
KEYCHAIN_SERVICE="Gigabole Kids SFTP"
KEYCHAIN_FILE="/Library/Keychains/System.keychain"
EXPECTED_HOST_FINGERPRINT="SHA256:o1UqQiTrG7ITnyCTe5JKof1jUAZlxCFHir46iwIuA0U"
MODE="check"

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [--check | --remote-inventory | --remote-dry-run | --apply]

  --check           Vérifie localement le snapshot, sans réseau (mode par défaut).
  --remote-inventory Inventorie la cible avec le client SFTP système, sans écrire.
  --remote-dry-run  Simule le miroir lftp complet, sans écrire.
  --apply           Téléverse sans suppression ; exige une confirmation explicite.

Variable des modes distants :
  GIGABOLE_SFTP_KNOWN_HOSTS_FILE  fichier borné contenant la clé de caberdouche.be:2224

Le mot de passe est lu dans le Trousseau macOS :
  trousseau : Système
  service : Gigabole Kids SFTP
  compte  : deploygigabolekids@gigabole.com

Confirmation supplémentaire de --apply :
  GIGABOLE_DEPLOY_CONFIRM=DEPLOY_GIGABOLE_CONTES_GIGABOLE
EOF
}

fail() {
  printf 'Erreur : %s\n' "$1" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --check) MODE="check" ;;
    --remote-inventory) MODE="remote-inventory" ;;
    --remote-dry-run) MODE="remote-dry-run" ;;
    --apply) MODE="apply" ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail "option inconnue : $1" ;;
  esac
  shift
done

node "${REPOSITORY_DIR}/tools/verify-contes-snapshot.mjs"

if [[ "$MODE" == "check" ]]; then
  printf 'Prévol local réussi. Aucune connexion réseau.\n'
  exit 0
fi

KNOWN_HOSTS_FILE="${GIGABOLE_SFTP_KNOWN_HOSTS_FILE:-}"
[[ "$KNOWN_HOSTS_FILE" == /* && "$KNOWN_HOSTS_FILE" != *".."* ]] || \
  fail "GIGABOLE_SFTP_KNOWN_HOSTS_FILE doit être un chemin absolu sûr"
[[ -f "$KNOWN_HOSTS_FILE" && ! -L "$KNOWN_HOSTS_FILE" ]] || \
  fail "fichier known_hosts absent ou symbolique"

command -v ssh-keygen >/dev/null 2>&1 || fail "ssh-keygen est absent"
HOST_KEY_LINE="$(ssh-keygen -F "[${SFTP_HOST}]:${SFTP_PORT}" -f "$KNOWN_HOSTS_FILE" 2>/dev/null | tail -1)"
[[ -n "$HOST_KEY_LINE" ]] || fail "clé d'hôte absente du known_hosts dédié"
ACTUAL_FINGERPRINT="$(printf '%s\n' "$HOST_KEY_LINE" | ssh-keygen -lf - -E sha256 | awk '{print $2}')"
[[ "$ACTUAL_FINGERPRINT" == "$EXPECTED_HOST_FINGERPRINT" ]] || \
  fail "empreinte SSH inattendue"

if [[ "$MODE" == "apply" ]]; then
  [[ "${GIGABOLE_DEPLOY_CONFIRM:-}" == "DEPLOY_GIGABOLE_CONTES_GIGABOLE" ]] || \
    fail "déploiement refusé : confirmation explicite absente"
fi

if [[ "$MODE" == "remote-inventory" ]]; then
  command -v expect >/dev/null 2>&1 || fail "expect est absent"
  printf 'Prévol SFTP connecté en lecture seule vers le compte chrooté.\n'
  expect "${REPOSITORY_DIR}/tools/sftp-readonly-preflight.exp" "$KNOWN_HOSTS_FILE"
  printf 'Prévol SFTP connecté terminé. Aucune écriture distante.\n'
  exit 0
fi

command -v security >/dev/null 2>&1 || fail "outil Trousseau macOS absent"
command -v lftp >/dev/null 2>&1 || fail "lftp est absent"

SFTP_PASSWORD="$(security find-generic-password -w -s "$KEYCHAIN_SERVICE" -a "$SFTP_USER" "$KEYCHAIN_FILE")" || \
  fail "mot de passe SFTP absent du Trousseau"
[[ -n "$SFTP_PASSWORD" && "$SFTP_PASSWORD" != *$'\n'* && "$SFTP_PASSWORD" != *$'\r'* ]] || \
  fail "mot de passe SFTP vide ou invalide"

lftp_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s' "$value"
}

COMMAND_FILE="$(mktemp -t gigabole-kids-lftp.XXXXXX)"
PINNED_HOSTS_FILE="$(mktemp -t gigabole-kids-hostkey.XXXXXX)"
chmod 600 "$COMMAND_FILE"
chmod 600 "$PINNED_HOSTS_FILE"
printf '%s\n' "$HOST_KEY_LINE" > "$PINNED_HOSTS_FILE"
cleanup() {
  SFTP_PASSWORD=""
  rm -f "$COMMAND_FILE" "$PINNED_HOSTS_FILE"
}
trap cleanup EXIT HUP INT TERM

MIRROR_OPTIONS="-R --verbose"
if [[ "$MODE" == "remote-dry-run" ]]; then
  MIRROR_OPTIONS+=" --dry-run"
  printf 'Simulation lftp sans écriture vers le compte chrooté.\n'
else
  printf 'Téléversement SFTP autorisé vers le compte chrooté.\n'
fi

CONNECT_PROGRAM="ssh -a -x -p ${SFTP_PORT} -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=+ssh-rsa -o UserKnownHostsFile=${PINNED_HOSTS_FILE}"
{
  printf 'set cmd:fail-exit yes\n'
  printf 'set sftp:connect-program "%s"\n' "$(lftp_escape "$CONNECT_PROGRAM")"
  printf 'open sftp://%s\n' "$SFTP_HOST"
  printf 'user "%s" "%s"\n' "$SFTP_USER" "$(lftp_escape "$SFTP_PASSWORD")"
  printf 'mirror %s "%s/" "%s"\n' "$MIRROR_OPTIONS" "$LOCAL_DIR" "$REMOTE_DIR"
  printf 'bye\n'
} > "$COMMAND_FILE"

lftp -f "$COMMAND_FILE" 2>&1 | \
  sed -E 's#sftp://[^/@[:space:]]*@#sftp://[IDENTIFIANTS-MASQUES]@#g'
