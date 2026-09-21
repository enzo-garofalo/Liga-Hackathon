#!/bin/bash
set -e

export DJANGO_SETTINGS_MODULE=config.settings.production

# ── Validate required env vars ────────────────────────────────────
MISSING=""
for var in DJANGO_SECRET_KEY DATABASE_URL DJANGO_ADMIN_USERNAME DJANGO_ADMIN_PASSWORD; do
    if [ -z "${!var}" ]; then
        MISSING="$MISSING $var"
    fi
done
if [ -n "$MISSING" ]; then
    echo "ERROR: missing required environment variables:$MISSING" >&2
    exit 1
fi

# ── Wait for database (max 60 s) ──────────────────────────────────
echo "==> Waiting for database..."
RETRIES=30
until python - <<'PY' 2>/dev/null
import os, dj_database_url, psycopg2
c = dj_database_url.config(env='DATABASE_URL')
psycopg2.connect(
    dbname=c['NAME'], user=c['USER'], password=c['PASSWORD'],
    host=c['HOST'], port=int(c.get('PORT') or 5432)
).close()
PY
do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo "ERROR: database did not become ready in time." >&2
        exit 1
    fi
    echo "    Database not ready — retrying in 2s... ($RETRIES attempts left)"
    sleep 2
done
echo "==> Database ready."

# ── Django setup ──────────────────────────────────────────────────
echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Ensuring superuser exists..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
username = os.environ['DJANGO_ADMIN_USERNAME']
password = os.environ['DJANGO_ADMIN_PASSWORD']
email    = os.environ.get('DJANGO_ADMIN_EMAIL', '')
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Superuser {username} criado.')
else:
    print(f'Superuser {username} ja existe.')
"

# ── Processo seletivo padrão ──────────────────────────────────────
# Idempotente e não mexe em processo existente: rodar a cada deploy é seguro.
# Nasce como rascunho — abrir inscrições é decisão do organizador.
echo "==> Ensuring the selection process exists..."
python manage.py ensure_selection_process

python manage.py check_email_pipeline


# ── Start server ──────────────────────────────────────────────────
echo "==> Starting gunicorn on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 2 \
    --log-file -
