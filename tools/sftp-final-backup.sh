#!/usr/bin/env bash

set -euo pipefail

SFTP_HOST="caberdouche.be"
SFTP_PORT="2224"
SFTP_USER="deploygigabolekids@gigabole.com"
KEYCHAIN_SERVICE="Gigabole Kids SFTP"
KEYCHAIN_FILE="/Library/Keychains/System.keychain"
EXPECTED_HOST_FINGERPRINT="SHA256:o1UqQiTrG7ITnyCTe5JKof1jUAZlxCFHir46iwIuA0U"

fail() {
  printf 'Erreur : %s\n' "$1" >&2
  exit 1
}

[[ $# == 1 ]] || fail "usage : sftp-final-backup.sh /chemin/absolu/nouveau-dossier"
DESTINATION="$1"
[[ "$DESTINATION" == /* && "$DESTINATION" != *".."* ]] || fail "destination absolue sûre requise"
[[ ! -e "$DESTINATION" && ! -L "$DESTINATION" ]] || fail "la destination existe déjà"
[[ "${GIGABOLE_BACKUP_CONFIRM:-}" == "BACKUP_GIGABOLE_CONTES_GIGABOLE" ]] || \
  fail "sauvegarde refusée : confirmation exacte absente"

KNOWN_HOSTS_FILE="${GIGABOLE_SFTP_KNOWN_HOSTS_FILE:-}"
[[ "$KNOWN_HOSTS_FILE" == /* && "$KNOWN_HOSTS_FILE" != *".."* ]] || fail "known_hosts absolu sûr requis"
[[ -f "$KNOWN_HOSTS_FILE" && ! -L "$KNOWN_HOSTS_FILE" ]] || fail "known_hosts absent ou symbolique"

HOST_KEY_LINE="$(ssh-keygen -F "[${SFTP_HOST}]:${SFTP_PORT}" -f "$KNOWN_HOSTS_FILE" 2>/dev/null | tail -1)"
[[ -n "$HOST_KEY_LINE" ]] || fail "clé d'hôte absente"
ACTUAL_FINGERPRINT="$(printf '%s\n' "$HOST_KEY_LINE" | ssh-keygen -lf - -E sha256 | awk '{print $2}')"
[[ "$ACTUAL_FINGERPRINT" == "$EXPECTED_HOST_FINGERPRINT" ]] || fail "empreinte SSH inattendue"

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

WORKING_DESTINATION="${DESTINATION}.incomplete"
[[ ! -e "$WORKING_DESTINATION" && ! -L "$WORKING_DESTINATION" ]] || fail "destination temporaire existante"
mkdir -m 700 "$WORKING_DESTINATION"
COMMAND_FILE="$(mktemp -t gigabole-kids-backup.XXXXXX)"
PINNED_HOSTS_FILE="$(mktemp -t gigabole-kids-hostkey.XXXXXX)"
chmod 600 "$COMMAND_FILE"
chmod 600 "$PINNED_HOSTS_FILE"
printf '%s\n' "$HOST_KEY_LINE" > "$PINNED_HOSTS_FILE"
cleanup() {
  SFTP_PASSWORD=""
  rm -f "$COMMAND_FILE" "$PINNED_HOSTS_FILE"
}
trap cleanup EXIT HUP INT TERM

CONNECT_PROGRAM="ssh -a -x -p ${SFTP_PORT} -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=+ssh-rsa -o UserKnownHostsFile=${PINNED_HOSTS_FILE}"
{
  printf 'set cmd:fail-exit yes\n'
  printf 'set sftp:connect-program "%s"\n' "$(lftp_escape "$CONNECT_PROGRAM")"
  printf 'open sftp://%s\n' "$SFTP_HOST"
  printf 'user "%s" "%s"\n' "$SFTP_USER" "$(lftp_escape "$SFTP_PASSWORD")"
  printf 'mirror --verbose "/" "%s/"\n' "$(lftp_escape "$WORKING_DESTINATION")"
  printf 'bye\n'
} > "$COMMAND_FILE"

lftp -f "$COMMAND_FILE" 2>&1 | \
  sed -E 's#sftp://[^/@[:space:]]*@#sftp://[IDENTIFIANTS-MASQUES]@#g'
(
  cd "$WORKING_DESTINATION"
  find . -type f ! -name SHA256SUMS.txt -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 > SHA256SUMS.txt
)
mv "$WORKING_DESTINATION" "$DESTINATION"
printf 'Sauvegarde finale terminée : %s\n' "$DESTINATION"
