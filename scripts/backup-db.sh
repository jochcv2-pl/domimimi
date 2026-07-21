#!/bin/bash
# ============================================================
# Domipack — Backup PostgreSQL quotidien
# ============================================================
# À exécuter via cron sur le VPS host (pas dans un container) :
#
#   crontab -e
#   0 3 * * * /opt/domipack/scripts/backup-db.sh >> /var/log/domipack-backup.log 2>&1
#
# Sauvegarde à 3h du matin, retention 7 jours.
# ============================================================

set -euo pipefail

BACKUP_DIR="/opt/domipack/backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="domipack-db"

DB_USER=$(docker exec "$CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo "domipack")
DB_NAME=$(docker exec "$CONTAINER" printenv POSTGRES_DB 2>/dev/null || echo "domipack")

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

# Dump via docker exec (pg_dump dans le container)
BACKUP_FILE="$BACKUP_DIR/domipack_${DATE}.sql.gz"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$DATE] Backup OK: $BACKUP_FILE ($SIZE)"
else
    echo "[$DATE] ERROR: Backup failed!"
    exit 1
fi

# Nettoyage des backups anciens (retention)
find "$BACKUP_DIR" -name "domipack_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date +%Y%m%d_%H%M%S)] Cleaned backups older than ${RETENTION_DAYS} days"

echo "---"
