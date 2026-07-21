# Domipack — Plateforme de recrutement d'emballeurs à domicile

Plateforme web de recrutement : **landing page publique** (présentation, simulateur de salaire, formulaire de candidature) + **back-office CRM** (gestion candidatures, pipeline de relance automatique par email, CMS du site public, configuration des agents IA).

> Stack : Next.js 16 · TypeScript · Tailwind v4 · Prisma v7 · PostgreSQL · NextAuth v5 · Docker

---

## Sommaire

1. [Pré-requis](#1-pré-requis)
2. [Installation locale](#2-installation-locale)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Démarrage en développement](#4-démarrage-en-développement)
5. [Accès à l'interface admin](#5-accès-à-linterface-admin)
6. [Configuration du pipeline email](#6-configuration-du-pipeline-email)
7. [Configuration du modèle IA](#7-configuration-du-modèle-ia)
8. [Déploiement en production (VPS)](#8-déploiement-en-production-vps)
9. [Maintenance et sauvegardes](#9-maintenance-et-sauvegardes)
10. [Résolution de problèmes](#10-résolution-de-problèmes)

---

## 1. Pré-requis

| Outil | Version minimum | Vérification |
|-------|-----------------|--------------|
| **Node.js** | 20.x LTS | `node --version` |
| **pnpm** | 11.x | `pnpm --version` |
| **Docker Desktop** | récent | `docker --version` |
| **Git** | 2.x | `git --version` |

Sur Windows : PowerShell 5.1+ ou Windows Terminal. Sur Linux/macOS : bash.

---

## 2. Installation locale

### 2.1. Cloner le dépôt

```bash
git clone <URL-DU-DEPOT-GITHUB> domipack
cd domipack
```

> ⚠️ Le nom du dossier doit être **exactement** `Domipack` (D majuscule) sur Windows. Un mismatch de casse provoque des bugs Turbopack (workspace root inference).

### 2.2. Installer les dépendances

```bash
pnpm install
```

La première installation télécharge environ 350 Mo de paquets.

### 2.3. Lancer la base de données PostgreSQL (Docker)

Une base PostgreSQL 17 conteneurisée est configurée dans `docker-compose.yml`. Elle écoute sur le port **5433** (distinct de tout PostgreSQL local) :

```bash
docker compose up -d
```

Vérifier que la base est saine :

```bash
docker compose ps
# domipack-db-1   Up   (healthy)   0.0.0.0:5433->5432/tcp
```

### 2.4. Configurer les variables d'environnement

Copier `.env.example` en `.env` et remplir les valeurs (voir [§3](#3-variables-denvironnement)) :

```bash
cp .env.example .env
# Windows PowerShell : Copy-Item .env.example .env
```

### 2.5. Initialiser la base de données

```bash
pnpm prisma:generate   # génère le client Prisma
pnpm db:push           # crée les tables depuis schema.prisma
pnpm db:seed           # insère données de démonstration (paramètres, agents, candidatures)
```

---

## 3. Variables d'environnement

Le fichier `.env` contient toutes les variables sensibles. **Il ne doit jamais être commité** (déjà dans `.gitignore`).

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public` |
| `AUTH_SECRET` | ✅ | Secret pour signer les sessions NextAuth. Générer via `pnpm exec auth secret` ou `openssl rand -base64 32`. |
| `CRON_SECRET` | ✅ | Secret partagé pour le cron du pipeline email. Doit être unique et long. |
| `ADMIN_API_KEY` | option | Clé API legacy pour routes admin sans session (à déprécier). |
| `NOTIFY_EMAIL_TO` | option | Adresse email recevant les notifications internes. |
| `EMAIL_RESEND_API_KEY` | option | Clé API Resend (si provider actif). |
| `EMAIL_BREVO_API_KEY` | option | Clé API Brevo (si provider actif). |
| `EMAIL_SMTP_HOST` | option | Hôte SMTP (si provider actif). |
| `EMAIL_SMTP_PORT` | option | Port SMTP (587 STARTTLS, 465 SSL, 25 plain). |
| `EMAIL_SMTP_USER` | option | Utilisateur SMTP. |
| `EMAIL_SMTP_PASS` | option | Mot de passe SMTP. |
| `AI_API_KEY` | option | Clé API modèle IA distant (si provider ollama/vllm/lmstudio local, non requis). |

Les valeurs utilisées par l'admin CMS (provider email actif, modèle IA, cadence, etc.) sont stockées en base via la vue **Configuration** — pas dans le `.env`.

---

## 4. Démarrage en développement

```bash
pnpm dev
# équivalent à : next dev --port 3100
```

Le serveur démarre sur **http://localhost:3100** (jamais 3000, pour éviter les conflits).

- **Landing publique** : http://localhost:3100
- **Admin CRM** : http://localhost:3100/admin (redirige vers login si non authentifié)
- **Page de connexion** : http://localhost:3100/login

Le mode dev recharge automatiquement les pages modifiées (Hot Module Replacement via Turbopack).

---

## 5. Accès à l'interface admin

### 5.1. Premier compte admin

Le premier compte super-admin doit être créé via script dédié :

```bash
node --env-file=.env scripts/create-admin.mjs admin@votre-domaine.fr "MotDePasseFort2026!"
# Rôle par défaut : super_admin. Pour un admin simple :
# node --env-file=.env scripts/create-admin.mjs admin2@votre-domaine.fr "MotDePasseFort2026!" admin
```

> ⚠️ **À faire en production** : le compte de démonstration (`admin@domipack.fr / Domipack2026!`) ne doit JAMAIS rester en production. Créez un compte à vous, puis supprimez le compte démo.

### 5.2. Vue d'ensemble du CRM

L'admin comporte **12 vues** organisées en 3 groupes dans la sidebar :

- **Pilotage** : Dashboard · Candidats · Missions · Rémunération · Modèles d'emails
- **Site web** : CMS · SEO
- **Intelligence** : Agents IA · Pipeline d'emails · Configuration

Toutes les données sont persistées en PostgreSQL. Aucune donnée n'est codée en dur côté client.

---

## 6. Configuration du pipeline email

Le pipeline envoie automatiquement des emails aux candidats selon un séquence déterminée :
- **T+5 min** : Agent Accueil accuse réception
- **T+4 h** : Agent Mission propose une offre
- **J+3 / J+6 / J+9** : Agent Relance (max 3 relances)

### 6.1. Choisir un provider email

Dans la vue **Configuration** → section « Passerelles d'envoi », sélectionner l'un des 3 providers :
- **Resend** (recommandé pour démarrer) — clé API à mettre dans `EMAIL_RESEND_API_KEY`
- **Brevo** (Sendinblue) — clé API dans `EMAIL_BREVO_API_KEY`
- **SMTP** (hébergé sur votre propre VPS) — configurer les 4 variables `EMAIL_SMTP_*`

### 6.2. Configurer le cron externe

Le pipeline ne s'exécute **pas en continu** : un appel HTTP déclenche un cycle (lecture file + envoi + écriture log). Planifier un cron toutes les 60 secondes :

**Linux (systemd timer)** — `/etc/systemd/system/domipack-cron.service` :

```ini
[Unit]
Description=Domipack email pipeline cycle

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s -X POST -H "x-cron-secret: VOTRE_CRON_SECRET" https://votre-domaine.fr/api/cron/process-emails
```

`/etc/systemd/system/domipack-cron.timer` :

```ini
[Unit]
Description=Run Domipack pipeline every minute

[Timer]
OnBootSec=1min
OnUnitActiveSec=60s
AccuracySec=1s
Unit=domipack-cron.service

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now domipack-cron.timer
sudo systemctl list-timers | grep domipack
```

**Windows (Task Scheduler)** :

```powershell
schtasks /create /tn "Domipack Pipeline" /tr "curl -s -X POST -H \"x-cron-secret: VOTRE_CRON_SECRET\" http://localhost:3100/api/cron/process-emails" /sc minute /mo 1
```

**Vercel Cron** (si déployé sur Vercel — non recommandé hors dev) : ajouter dans `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/cron/process-emails",
    "schedule": "* * * * *"
  }]
}
```

> ⚠️ Le header `x-cron-secret` est **obligatoire**. Sans lui, l'endpoint renvoie 401.

### 6.3. Bouton pause d'urgence

Dans la vue **Pipeline d'emails** de l'admin, un bouton « ⏸ Mettre en pause » stoppe immédiatement tout envoi (le cron continue de tourner mais ses cycles retournent sans rien faire). Utile en cas de problème provider, audit, ou migration.

### 6.4. Cadence et garde-fous anti-spam

Configurables dans **Configuration** → « Cadence » :
- `daily_cap` : plafond absolu d'envois par jour (défaut 200)
- `send_interval_min` / `send_interval_max` : intervalle aléatoire entre 2 envois (défaut 30–90 s)
- `warmup_enabled` : warm-up progressif sur 4 semaines (à activer sur IP neuve)

Pour une IP neuve ou partagée, prévoir un warm-up sur 4 semaines avant la pleine cadence.

---

## 7. Configuration du modèle IA

Les 5 agents IA (Accueil, Mission, Relance, Tri, SEO) sont pilotés par un modèle de langage local ou distant.

### 7.1. Modèle local recommandé : Ollama + Qwen3-8B

1. Installer [Ollama](https://ollama.com/) sur le serveur (ou en local pour dev).
2. Télécharger le modèle : `ollama pull qwen3:8b`
3. Lancer le serveur Ollama : `ollama serve` (port 11434)
4. Dans l'admin → **Configuration** → « Modèle d'IA », vérifier :
   - Provider : `ollama`
   - Endpoint : `http://localhost:11434/v1`
   - Model : `qwen3:8b`

### 7.2. Modèle distant (vLLM, LM Studio, OpenAI-compatible)

Même configuration mais avec un endpoint distant et une clé API (`AI_API_KEY` dans `.env`).

---

## 8. Déploiement en production (VPS)

> Architecture cible : **VPS Ubuntu 22.04+ mono-serveur** avec Docker Compose. Conforme à la stack open-source auto-hébergée (décision DEC-005). Pour un usage critique, un mono-VPS n'est PAS suffisant : prévoir cluster multi-VPS + PRA.

### 8.1. Préparer le VPS

```bash
# Sur le VPS Ubuntu
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git ufw fail2ban
sudo usermod -aG docker $USER
# Re-login pour prise en compte du groupe docker

# Pare-feu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8.2. Cloner et configurer

```bash
git clone <URL-DU-DEPOT> /opt/domipack
cd /opt/domipack
cp .env.example .env
nano .env  # éditer toutes les valeurs (DATABASE_URL, AUTH_SECRET, CRON_SECRET, providers)
```

### 8.3. Démarrer les conteneurs

Le fichier `docker-compose.prod.yml` (à créer selon vos besoins) doit contenir :
- Service PostgreSQL (avec volume persistant)
- Service Caddy (reverse proxy avec HTTPS automatique Let's Encrypt)
- Service application Next.js (build de production)

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose exec app pnpm db:push
docker compose exec app pnpm db:seed  # seulement la première fois
```

### 8.4. Reverse proxy HTTPS avec Caddy

`Caddyfile` minimal :

```caddy
votre-domaine.fr {
    reverse_proxy localhost:3100
}

admin.votre-domaine.fr {
    reverse_proxy localhost:3200
    # Optionnel : restreindre par IP
    # @blocked not remote_ip 1.2.3.0/24
    # abort @blocked
}
```

```bash
sudo systemctl reload caddy
```

Caddy renouvelle automatiquement les certificats Let's Encrypt tous les 90 jours.

### 8.5. Activer le cron pipeline

Voir [§6.2](#62-configurer-le-cron-externe) — systemd timer recommandé.

### 8.6. Vérifications post-déploiement

- [ ] Landing publique : `curl -I https://votre-domaine.fr` → HTTP 200
- [ ] Admin : `curl -I https://admin.votre-domaine.fr` → HTTP 200 ou 307 (redirect login)
- [ ] Cron : `curl -X POST -H "x-cron-secret: VOTRE_CRON_SECRET" https://votre-domaine.fr/api/cron/process-emails?dryRun=1` → HTTP 200 + JSON récap
- [ ] DB backups : voir [§9](#9-maintenance-et-sauvegardes)

---

## 9. Maintenance et sauvegardes

### 9.1. Sauvegarde PostgreSQL (quotidienne)

Script `/opt/backups/domipack-pg.sh` :

```bash
#!/bin/bash
set -euo pipefail
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/opt/backups/domipack
mkdir -p "$BACKUP_DIR"

docker compose -f /opt/domipack/docker-compose.prod.yml exec -T db \
  pg_dump -U domipack domipack | gzip > "$BACKUP_DIR/domipack-$DATE.sql.gz"

# Garder 30 jours
find "$BACKUP_DIR" -name "domipack-*.sql.gz" -mtime +30 -delete
```

cron quotidien (2h du matin) :

```bash
sudo crontab -e
# ajouter :
0 2 * * * /opt/backups/domipack-pg.sh >> /var/log/domipack-backup.log 2>&1
```

**Test de restauration mensuel obligatoire** : restaurer le dernier backup sur un VPS de test pour vérifier l'intégrité.

### 9.2. Surveillance

- Logs application : `docker compose logs -f app`
- Logs DB : `docker compose logs -f db`
- Logs cron : `journalctl -u domipack-cron.service -f`
- Espace disque : `df -h`
- Charge : `htop`

### 9.3. Mises à jour

```bash
cd /opt/domipack
git pull
docker compose -f docker-compose.prod.yml up -d --build
# Si migration Prisma :
docker compose exec app pnpm db:push
```

---

## 10. Résolution de problèmes

### Le serveur dev démarre mais les pages retournent 500

Sur Windows, vérifier le binding IPv4/IPv6 : `localhost` peut résoudre en `::1`. Ne pas forcer `--hostname 127.0.0.1`.

### Le pipeline ne déclenche aucun envoi

1. Vérifier `paused=false` dans la vue Pipeline admin
2. Vérifier que le cron tourne : `journalctl -u domipack-cron.service -n 50`
3. Vérifier que le provider email est configuré (`.env` + vue Configuration → « Tester la passerelle »)
4. Vérifier le quota : `sentToday < daily_cap` (vue Pipeline admin)
5. Lancer un dry-run : `curl -X POST -H "x-cron-secret: SECRET" https://domaine.fr/api/cron/process-emails?dryRun=1`

### Un candidat ne reçoit pas d'email

Causes possibles (vérifiables dans la vue Pipeline admin → « Envois récents ») :
- `status=failed` : erreur provider (timeout, auth, quota)
- `status=bounced` : adresse invalide — le candidat est marqué `relanceStop=bounce`
- `status=skipped` : template inactif ou variable manquante
- Stop condition : `pipe=client/perdu`, `relanceStop=stop/exclusion`, `relanceCount >= relanceMax`

### Oubli du mot de passe admin

```bash
node --env-file=.env scripts/reset-admin-password.mjs admin@votre-domaine.fr "NouveauMotDePasseFort!"
```

---

## Structure du projet

```
Domipack/
├── app/
│   ├── (public)/          # Landing page (sections serveur)
│   ├── admin/             # CRM (page unique + dispatch Zustand)
│   ├── api/               # 22 routes API
│   └── auth/              # Pages NextAuth (login, signup)
├── components/
│   ├── admin/views/       # 12 vues CRM
│   ├── sections/          # Sections de la landing
│   └── ui/                # Composants réutilisables
├── lib/
│   ├── email/             # Pipeline email (providers, render, engine)
│   ├── api.ts             # Helpers réponses API
│   ├── prisma.ts          # Client Prisma singleton
│   └── store.ts           # Store Zustand admin
├── prisma/
│   ├── schema.prisma      # 12 modèles
│   └── seed.mjs           # Données de démonstration
├── types/                 # Types TypeScript partagés
├── auth.ts / auth.config.ts  # NextAuth v5 (Edge-safe split)
├── docker-compose.yml     # PostgreSQL dev
├── next.config.ts         # Config Next.js (serverExternalPackages)
└── .env / .env.example    # Variables d'environnement
```

---

## Licence et confidentialité

Ce projet est livré sous alias « Domipack ». Tous les noms réels (client, marque, adresses) sont confidentiels. Les données de démonstration (candidatures, témoignages, prix) sont fictives.

---

## Support

Pour toute question technique sur ce livrable, contactez votre référent développement.
