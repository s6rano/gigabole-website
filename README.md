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

Le mode `--remote-inventory` réalise uniquement un inventaire SFTP en lecture seule. Le mode
`--remote-dry-run` simule le miroir complet avec `lftp`. Le mode `--apply` reste verrouillé par une
confirmation exacte. Le script ne propose ni `--delete` ni nettoyage distant ; il peut seulement
ajouter les fichiers du snapshot ou remplacer leur version bêta antérieure.

Après un upload explicitement autorisé, `node tools/verify-remote-snapshot.mjs` compare par HTTPS
les tailles et SHA-256 des 31 fichiers Web et du manifeste de snapshot.
