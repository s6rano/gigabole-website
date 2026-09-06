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

### Voie rapide pour un changement de texte HTML

Après modification et commit de la source Kids, génération du snapshot, contrôle puis commit des
fichiers Website exacts, une autorisation de publication unique permet de lancer :

```sh
GIGABOLE_EDITORIAL_PUBLISH_CONFIRM=PUBLISH_GIGABOLE_EDITORIAL_BETA ./deploy.sh --publish-editorial
```

Cette commande utilise le fichier d'hôte public épinglé `tools/caberdouche-known-hosts`, lit une
seule fois le mot de passe dans le Trousseau Système, exécute le dry-run, refuse tout fichier autre
qu'un HTML de racine accompagné de `snapshot-manifest.json`, téléverse uniquement cette liste puis
vérifie les 32 fichiers par HTTPS. Elle n'exécute aucune suppression distante et place le manifeste
en dernier. Elle refuse aussi une source Kids ou un snapshot Website non committé ou divergent.

Une modification CSS, JavaScript, configuration, média ou backend n'est pas éligible : utiliser la
procédure complète et ses validations distinctes. Ne jamais modifier le snapshot ou le serveur à
la main. Le runbook faisant autorité est
`../gigabole-kids-V2-202609/docs/PHASE-10-PUBLICATION-EDITORIALE.md`.

Après un upload explicitement autorisé, `node tools/verify-remote-snapshot.mjs` compare par HTTPS
les tailles et SHA-256 des 31 fichiers Web et du manifeste de snapshot.
