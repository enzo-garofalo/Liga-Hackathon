#!/bin/bash
set -e

export DJANGO_SETTINGS_MODULE=config.settings.production

echo "==> Waiting for database..."
until python - <<'PY' 2>/dev/null
import os, dj_database_url, psycopg2
c = dj_database_url.config(env='DATABASE_URL')
psycopg2.connect(
    dbname=c['NAME'], user=c['USER'], password=c['PASSWORD'],
    host=c['HOST'], port=int(c.get('PORT') or 5432)
).close()
PY
do
    echo "    Database not ready — retrying in 2s..."
    sleep 2
done
echo "==> Database ready."

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

echo "==> Starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 2 \
    --log-file -
