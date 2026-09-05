# Claude Code — publication Gigabole Kids

Ce dépôt est le dépôt de publication du site `gigabole.com`. Pour Gigabole Kids, il contient un
snapshot généré sous `contes-gigabole/` ; la source applicative reste le dépôt frère
`../gigabole-kids-V2-202609/`.

## Démarrage obligatoire

1. Utiliser les deux worktrees existants. Ne pas cloner, tirer, rebaser, réinitialiser ou pousser.
2. Lire d'abord, dans le dépôt Kids :
   - `CLAUDE.md` ;
   - `docs/OPUS-REPRISE.md` ;
   - `docs/PHASE-10-P10-4-REPORT.md` ;
   - `docs/PHASE-10-P10-5-RECETTE.md`.
3. Exécuter `git status --short --branch` dans les deux dépôts et préserver les changements de
   Tanguy. Ici, `.agents/`, `.claude/`, `skills-lock.json` et toute modification non liée ne
   doivent être ni modifiés ni ajoutés à un commit.

## État actif

- P10-4 est réussi : la bêta est publiée sous
  `https://gigabole.com/contes-gigabole/`, toujours `noindex`.
- Les 31 fichiers Web et `snapshot-manifest.json` ont été vérifiés par HTTPS.
- Les dossiers et fichiers historiques du serveur ont été conservés.
- La prochaine porte est P10-5, recette technique par URL directe.
- n8n et son CRON restent désactivés ; Stripe reste en sandbox ; Stripe Live est interdit.
- Les commits Phase 9/10 sont locaux et non poussés. Un push exige un feu vert distinct de Tanguy.

## Règles du snapshot

- Ne jamais modifier `contes-gigabole/` manuellement.
- Corriger dans le dépôt Kids, exécuter ses tests, puis seulement si une nouvelle publication est
  autorisée générer le snapshot avec `npm run phase10:snapshot:write` depuis Kids.
- Une modification documentaire dans Kids ne justifie ni régénération ni upload du snapshot.
- Ne jamais publier `.git`, documentation, tests, sauvegardes, logs, fichiers `.env` ou secrets.

Contrôles locaux sûrs dans ce dépôt :

```sh
git status --short --branch
node tools/verify-contes-snapshot.mjs
node --test tests/phase10-deploy.test.mjs
```

Le script `deploy.sh` est en lecture locale par défaut. Tout mode distant nécessite les accès
approuvés ; `--apply` écrit réellement sur le serveur et exige une autorisation explicite nouvelle.
Le déploiement est SFTP, chrooté et sans suppression distante — jamais FTP.

## Interdictions sans feu vert explicite

- aucun upload SFTP ni modification serveur ;
- aucun push Git ;
- aucune opération Supabase distante, n8n, Brevo ou Stripe ;
- aucune activation n8n, aucune utilisation de Stripe Live, aucun retrait de `noindex` ;
- aucun affichage, déplacement ou commit d'un secret.

En cas de contradiction, les commandes Git locales et les preuves récentes du dépôt Kids priment
sur les journaux historiques. Une ancienne autorisation ne vaut jamais autorisation actuelle.
