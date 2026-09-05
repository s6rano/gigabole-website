# gigabole-website

Site statique de Gigabole et dépôt de publication du snapshot Kids.

## Préparation locale Kids

Le dossier `contes-gigabole/` est généré depuis le dépôt source Kids. Son
`snapshot-manifest.json` fixe le commit source et les sommes SHA-256. Ne pas modifier le snapshot
directement : corriger Kids, committer, puis le régénérer.

Contrôles sans réseau :

```sh
node tools/verify-contes-snapshot.mjs
bash deploy.sh --check
node --test tests/phase10-deploy.test.mjs
```

`deploy.sh` ne se connecte jamais dans son mode par défaut. Les modes distants restent soumis à la
checklist et aux autorisations de `docs/PHASE-10-BASCULE.md` dans le dépôt Kids.

Le mode `--remote-dry-run` réalise uniquement un inventaire SFTP en lecture seule. Le mode
`--apply` reste verrouillé par une confirmation exacte et nécessite `lftp` ; il ne propose aucune
suppression distante.
