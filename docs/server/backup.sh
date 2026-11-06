#!/bin/sh
set -eu
umask 077

cd "$(dirname "$0")"

BACKUP_DIR=${BACKUP_DIR:-/opt/ekklesia/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

save() {
	file="$BACKUP_DIR/$1-$STAMP.$2"
	shift 2
	"$@" > "$file.part"
	mv "$file.part" "$file"
}

save dashboard-db dump docker compose exec -T dashboard-db pg_dump -U dashboard -Fc dashboard
save checkin-db dump docker compose exec -T checkin-db pg_dump -U ekklesia -Fc ekklesia
save dashboard-files tar.gz docker compose exec -T dashboard tar -C /app/backend/storage/app -czf - .

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
	rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" --max-age 2d
	rclone delete "$RCLONE_REMOTE" --min-age 30d
fi

echo "$STAMP backup done"
