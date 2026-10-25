#!/usr/bin/env bash
# Nightly SQLite backup with 14-day rotation. Crontab (as the deploy user):
#   15 3 * * * /path/to/wedding_planning/deploy/backup.sh >> /path/to/wedding_planning/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
# .backup is safe while the app is writing (WAL mode); a plain cp is not.
docker compose exec -T app sqlite3 /app/data/wedding.db ".backup /app/data/backup-tmp.db"
mv data/backup-tmp.db "backups/wedding-$(date +%F).db"
find backups -name 'wedding-*.db' -mtime +14 -delete
echo "$(date -Is) backup ok"
