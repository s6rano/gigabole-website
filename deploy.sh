#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="${REPOSITORY_DIR}/contes-gigabole"
KIDS_REPOSITORY_DIR="${REPOSITORY_DIR}/../gigabole-kids-V2-202609"
SFTP_HOST="caberdouche.be"
SFTP_PORT="2224"
SFTP_USER="deploygigabolekids@gigabole.com"
REMOTE_DIR="/"
KEYCHAIN_SERVICE="Gigabole Kids SFTP"
KEYCHAIN_FILE="/Library/Keychains/System.keychain"
EXPECTED_HOST_FINGERPRINT="SHA256:o1UqQiTrG7ITnyCTe5JKof1jUAZlxCFHir46iwIuA0U"
DEFAULT_KNOWN_HOSTS_FILE="${REPOSITORY_DIR}/tools/caberdouche-known-hosts"
MODE="check"

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [--check | --remote-inventory | --remote-dry-run | --apply | --publish-editorial]

  --check           Vérifie localement le snapshot, sans réseau (mode par défaut).
  --remote-inventory Inventorie la cible avec le client SFTP système, sans écrire.
  --remote-dry-run  Simule le miroir lftp complet, sans écrire.
  --apply           Téléverse sans suppression ; exige une confirmation explicite.
  --publish-editorial Valide, simule et publie uniquement HTML + manifeste, puis vérifie HTTPS.

Le fichier d'hôte épinglé est versionné dans tools/caberdouche-known-hosts. Pour une reprise
exceptionnelle seulement, GIGABOLE_SFTP_KNOWN_HOSTS_FILE peut désigner un autre fichier borné.

Le mot de passe est lu dans le Trousseau macOS :
  trousseau : Système
  service : Gigabole Kids SFTP
  compte  : deploygigabolekids@gigabole.com

Confirmation supplémentaire de --apply :
  GIGABOLE_DEPLOY_CONFIRM=DEPLOY_GIGABOLE_CONTES_GIGABOLE

Confirmation de la voie rapide éditoriale :
  GIGABOLE_EDITORIAL_PUBLISH_CONFIRM=PUBLISH_GIGABOLE_EDITORIAL_BETA
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
    --publish-editorial) MODE="publish-editorial" ;;
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

KNOWN_HOSTS_FILE="${GIGABOLE_SFTP_KNOWN_HOSTS_FILE:-${DEFAULT_KNOWN_HOSTS_FILE}}"
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

if [[ "$MODE" == "publish-editorial" ]]; then
  [[ "${GIGABOLE_EDITORIAL_PUBLISH_CONFIRM:-}" == "PUBLISH_GIGABOLE_EDITORIAL_BETA" ]] || \
    fail "publication éditoriale refusée : confirmation explicite absente"
  [[ -d "${KIDS_REPOSITORY_DIR}/.git" ]] || fail "dépôt Kids frère absent"
  [[ -z "$(git -C "$REPOSITORY_DIR" status --porcelain=v1 --untracked-files=all -- contes-gigabole)" ]] || \
    fail "le snapshot Website doit être committé avant publication"
  [[ -z "$(git -C "$KIDS_REPOSITORY_DIR" status --porcelain=v1 --untracked-files=all -- contes)" ]] || \
    fail "la source Kids contes doit être committée avant publication"
  SOURCE_COMMIT="$(node -e 'const fs=require("fs"); const value=JSON.parse(fs.readFileSync(process.argv[1], "utf8")).source_commit; process.stdout.write(value || "")' "${LOCAL_DIR}/snapshot-manifest.json")"
  [[ "$SOURCE_COMMIT" =~ ^[a-f0-9]{40}$ ]] || fail "commit source du manifeste invalide"
  git -C "$KIDS_REPOSITORY_DIR" cat-file -e "${SOURCE_COMMIT}^{commit}" 2>/dev/null || \
    fail "commit source du manifeste absent du dépôt Kids"
  git -C "$KIDS_REPOSITORY_DIR" diff --quiet "$SOURCE_COMMIT" -- contes || \
    fail "la source Kids actuelle diverge du commit du manifeste"
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
LFTP_OUTPUT_FILE="$(mktemp -t gigabole-kids-lftp-output.XXXXXX)"
TRANSFER_LIST_FILE="$(mktemp -t gigabole-kids-transfer-list.XXXXXX)"
chmod 600 "$COMMAND_FILE"
chmod 600 "$PINNED_HOSTS_FILE"
chmod 600 "$LFTP_OUTPUT_FILE"
chmod 600 "$TRANSFER_LIST_FILE"
printf '%s\n' "$HOST_KEY_LINE" > "$PINNED_HOSTS_FILE"
cleanup() {
  SFTP_PASSWORD=""
  rm -f "$COMMAND_FILE" "$PINNED_HOSTS_FILE" "$LFTP_OUTPUT_FILE" "$TRANSFER_LIST_FILE"
}
trap cleanup EXIT HUP INT TERM

CONNECT_PROGRAM="ssh -a -x -p ${SFTP_PORT} -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=+ssh-rsa -o UserKnownHostsFile=${PINNED_HOSTS_FILE}"

write_lftp_header() {
  printf 'set cmd:fail-exit yes\n'
  printf 'set sftp:connect-program "%s"\n' "$(lftp_escape "$CONNECT_PROGRAM")"
  printf 'open sftp://%s\n' "$SFTP_HOST"
  printf 'user "%s" "%s"\n' "$SFTP_USER" "$(lftp_escape "$SFTP_PASSWORD")"
}

write_mirror_command() {
  local mirror_options="$1"
  {
    write_lftp_header
    printf 'mirror %s "%s/" "%s"\n' "$mirror_options" "$LOCAL_DIR" "$REMOTE_DIR"
    printf 'bye\n'
  } > "$COMMAND_FILE"
}

print_sanitized_output() {
  sed -E 's#sftp://[^/@[:space:]]*@#sftp://[IDENTIFIANTS-MASQUES]@#g' "$1"
}

run_lftp() {
  if ! lftp -f "$COMMAND_FILE" > "$LFTP_OUTPUT_FILE" 2>&1; then
    print_sanitized_output "$LFTP_OUTPUT_FILE"
    fail "échec lftp"
  fi
  print_sanitized_output "$LFTP_OUTPUT_FILE"
}

if [[ "$MODE" == "remote-dry-run" ]]; then
  printf 'Simulation lftp sans écriture vers le compte chrooté.\n'
  write_mirror_command '-R --verbose --dry-run'
  run_lftp
  exit 0
fi

if [[ "$MODE" == "apply" ]]; then
  printf 'Téléversement SFTP autorisé vers le compte chrooté.\n'
  write_mirror_command '-R --verbose'
  run_lftp
  exit 0
fi

printf 'Voie rapide éditoriale : simulation, contrôle, téléversement borné et vérification HTTPS.\n'
write_mirror_command '-R --verbose --dry-run'
run_lftp
node "${REPOSITORY_DIR}/tools/validate-editorial-dry-run.mjs" "$LFTP_OUTPUT_FILE" > "$TRANSFER_LIST_FILE"
printf 'Périmètre éditorial validé :\n'
sed 's/^/- /' "$TRANSFER_LIST_FILE"

{
  write_lftp_header
  while IFS= read -r relative_path; do
    [[ -n "$relative_path" ]] || continue
    printf 'put -O "%s" "%s"\n' "$REMOTE_DIR" "$(lftp_escape "${LOCAL_DIR}/${relative_path}")"
    printf 'chmod 644 "/%s"\n' "$(lftp_escape "$relative_path")"
  done < "$TRANSFER_LIST_FILE"
  printf 'bye\n'
} > "$COMMAND_FILE"

printf 'Téléversement des seuls fichiers autorisés.\n'
run_lftp
node "${REPOSITORY_DIR}/tools/verify-remote-snapshot.mjs"
printf 'Publication éditoriale terminée et vérifiée.\n'
