# CLAUDE.md — gigabole-website

## Contexte projet
Site vitrine de gigabole.com, maison d'édition belge.
Stack : HTML statique / CSS / JS vanilla — pas de framework, pas de build tool.
Style éditorial : minimaliste, typographique, sobre.

## Structure du projet
- `index.html` — page d'accueil
- `css/` — feuilles de style
- `js/` — scripts
- `assets/` ou `images/` — médias
(adapter selon la vraie arborescence après clonage)

## Règles de travail

### Git
- Ne jamais pusher sans confirmation explicite de Tanguy.
- Messages de commit en français, format : `type: description courte`
  - types : `feat`, `fix`, `style`, `content`, `refactor`
  - ex : `content: ajout page auteurs`, `style: correction espacement footer`
- Travailler sur `main` sauf si une branche de feature est explicitement demandée.

### Code
- HTML sémantique strict (pas de div inutiles).
- CSS : pas de framework externe, pas de Tailwind. Variables CSS natives si besoin.
- JS : vanilla uniquement, pas de dépendances npm.
- Encodage : UTF-8, balises meta lang="fr".
- Pas de commentaires en anglais dans le code.

### Déploiement FTP
- Script de déploiement : `deploy.sh` (à configurer lors de la première session).
- Ne jamais lancer `deploy.sh` sans confirmation explicite de Tanguy.
- L'ordre de validation est toujours : modification → test local → commit GitHub → deploy FTP.

### Contenu
- Langue : français (conventions belges).
- Ton : éditorial, sobre, sans excès de marketing.
- Pas de Lorem ipsum — demander le vrai contenu si manquant.

## Ce que Claude Code NE fait PAS sans demande
- Modifier la structure des dossiers
- Installer des packages npm
- Changer les polices ou la palette de couleurs existantes
- Pusher ou déployer
```

---

## Prompt d'amorçage — à coller dans Claude Code au lancement
```
Bonjour Claude. Nous démarrons le projet gigabole-website.

Commence par cette séquence d'initialisation :

1. Clone le repo si ce n'est pas déjà fait :
   git clone https://github.com/s6rano/gigabole-website.git
   Sinon, fais un `git pull` pour être à jour.

2. Fais un inventaire complet du projet :
   - Liste tous les fichiers et dossiers avec leur rôle probable
   - Identifie le fichier CSS principal et les variables de style utilisées
   - Repère s'il y a déjà des scripts JS et lesquels
   - Vérifie s'il existe un .gitignore et ce qu'il exclut

3. Après l'inventaire, propose-moi :
   - Les 3 premières choses à améliorer ou clarifier dans le projet
   - Si le script deploy.sh de déploiement FTP est à créer

4. Attends mes instructions avant toute modification.

Les règles permanentes de travail sont dans CLAUDE.md à la racine.