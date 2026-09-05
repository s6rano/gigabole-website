#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="${REPOSITORY_DIR}/contes-gigabole"
MODE="check"

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [--check | --remote-dry-run | --apply]

  --check           Vérifie localement le snapshot, sans réseau (mode par défaut).
  --remote-dry-run  Compare par SFTP sans écrire ; exige la configuration opérateur.
  --apply           Téléverse sans suppression ; exige une confirmation explicite.

Variables des modes distants :
  GIGABOLE_SFTP_REMOTE_DIR        cible absolue finissant par /contes-gigabole/
  GIGABOLE_SFTP_USER              utilisateur SFTP (lettres, chiffres, point, tiret, underscore)
  GIGABOLE_SFTP_IDENTITY_FILE     clé SSH privée dédiée, chemin absolu sans espace
  GIGABOLE_SFTP_KNOWN_HOSTS_FILE  fichier épinglant l'empreinte, chemin absolu sans espace

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

REMOTE_DIR="${GIGABOLE_SFTP_REMOTE_DIR:-}"
SFTP_USER="${GIGABOLE_SFTP_USER:-}"
IDENTITY_FILE="${GIGABOLE_SFTP_IDENTITY_FILE:-}"
KNOWN_HOSTS_FILE="${GIGABOLE_SFTP_KNOWN_HOSTS_FILE:-}"

[[ "$REMOTE_DIR" =~ ^(/[A-Za-z0-9._-]+)*/contes-gigabole/$ ]] || \
  fail "la cible doit être absolue et finir exactement par /contes-gigabole/"
[[ "$REMOTE_DIR" != *".."* ]] || fail "la cible ne peut pas contenir .."
[[ "$SFTP_USER" =~ ^[A-Za-z0-9._-]+$ ]] || fail "utilisateur SFTP absent ou invalide"

for file in "$IDENTITY_FILE" "$KNOWN_HOSTS_FILE"; do
  [[ "$file" == /* && "$file" != *".."* && "$file" != *[[:space:]]* ]] || \
    fail "les fichiers SSH doivent utiliser un chemin absolu sûr sans espace"
  [[ -f "$file" && ! -L "$file" ]] || fail "fichier SSH absent ou symbolique : $file"
done

if [[ "$MODE" == "apply" ]]; then
  [[ "${GIGABOLE_DEPLOY_CONFIRM:-}" == "DEPLOY_GIGABOLE_CONTES_GIGABOLE" ]] || \
    fail "déploiement refusé : confirmation explicite absente"
fi

command -v lftp >/dev/null 2>&1 || fail "lftp est absent"

MIRROR_OPTIONS="-R --verbose"
if [[ "$MODE" == "remote-dry-run" ]]; then
  MIRROR_OPTIONS+=" --dry-run"
  printf 'Simulation SFTP sans écriture vers %s\n' "$REMOTE_DIR"
else
  printf 'Téléversement SFTP autorisé vers %s\n' "$REMOTE_DIR"
fi

CONNECT_PROGRAM="ssh -a -x -p 2224 -i ${IDENTITY_FILE} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${KNOWN_HOSTS_FILE}"
lftp -u "$SFTP_USER" "sftp://gigabole.com" \
  -e "set cmd:fail-exit yes; set sftp:connect-program \"${CONNECT_PROGRAM}\"; mirror ${MIRROR_OPTIONS} \"${LOCAL_DIR}/\" \"${REMOTE_DIR}\"; bye"
