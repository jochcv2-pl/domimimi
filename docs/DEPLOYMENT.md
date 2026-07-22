# Domipack — Déploiement VPS

Guide de mise en production sur VPS Ubuntu/Docker (DEC-005).

## Prérequis VPS

- Ubuntu 22.04+ (ou Debian 12+)
- 2 vCPU / 4 Go RAM minimum
- Docker Engine + Docker Compose v2
- Nom de domaine pointant vers le VPS (A record)

## 1. Cloner le projet

```bash
sudo mkdir -p /opt/domipack
sudo chown $USER:$USER /opt/domipack
git clone <repo-url> /opt/domipack
cd /opt/domipack
```

## 2. Configurer l'environnement

```bash
cp .env.production.example .env
nano .env
```

Générer les secrets :
```bash
openssl rand -base64 32  # AUTH_SECRET
openssl rand -base64 32  # CRON_SECRET
```

Définir un mot de passe PostgreSQL fort (`POSTGRES_PASSWORD`).

**Important** : `DATABASE_URL` doit utiliser le **même mot de passe** que `POSTGRES_PASSWORD`.
Remplacez `CHANGER_MOT_DE_PASSE_FORT_ICI` dans les deux lignes.

## 3. Build et démarrage

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Vérifier que l'app répond :
```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok",...}}
```

## 4. SSL Let's Encrypt (premier certifica)

```bash
# Obtenir le certificat via certbot standalone
docker run -it --rm \
  -v $(pwd)/certbot-etc:/etc/letsencrypt \
  -v $(pwd)/certbot-web:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d domipack.fr -d www.domipack.fr \
  --email contact@domipack.fr --agree-tos --no-eff-email
```

Puis décommenter le bloc HTTPS dans `nginx/conf.d/domipack.conf`
et redémarrer nginx :

```bash
nano nginx/conf.d/domipack.conf  # décommenter lignes 60+
docker compose -f docker-compose.prod.yml restart nginx
```

## 5. Initialiser la base de données

Le conteneur app est un build standalone (pas de pnpm/prisma dedans).
Les commandes CLI se lancent depuis le host, via le port DB exposé en localhost.

```bash
# Démarrer uniquement la DB d'abord
docker compose -f docker-compose.prod.yml up -d db

# Patienter 5s que PostgreSQL soit prêt, puis :
pnpm install              # si pas déjà fait
pnpm db:generate          # génère le client Prisma
pnpm db:push              # crée les tables
pnpm db:seed              # insère settings, agents, candidatures démo
pnpm db:seed-admin        # crée le compte admin (admin@domipack.fr / Domipack2026!)

# Puis démarrer toute la stack
docker compose -f docker-compose.prod.yml up -d --build
```

> ⚠️ Vérifier que `DATABASE_URL` dans `.env` pointe bien vers `localhost:5433`
> (pas `db:5432` qui ne marche que depuis l'intérieur de Docker).

## 6. Cron pipeline email

Sur le VPS host, ajouter un cron qui appelle l'endpoint toutes les minutes :

```bash
crontab -e
# Pipeline email — toutes les minutes
* * * * * curl -s -X POST -H "x-cron-secret: VOTRE_CRON_SECRET" https://domipack.fr/api/cron/process-emails > /dev/null 2>&1
```

## 7. Backups automatiques

```bash
chmod +x scripts/backup-db.sh
crontab -e
# Backup DB quotidien à 3h du matin
0 3 * * * /opt/domipack/scripts/backup-db.sh >> /var/log/domipack-backup.log 2>&1
```

Retention : 7 jours (configurable dans le script).

## Commandes utiles

```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx

# Redémarrer l'app
docker compose -f docker-compose.prod.yml restart app

# Accéder à la DB
docker compose -f docker-compose.prod.yml exec db psql -U domipack

# Mettre à jour le code
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Stop complet
docker compose -f docker-compose.prod.yml down
```
