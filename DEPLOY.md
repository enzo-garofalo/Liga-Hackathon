# DEPLOY — Liga de TI v2

Playbook de cutover da v1 para a v2 em produção (Railway).

> A v2 reescreve o schema da app `teams`. **Os dados existentes em
> `teams_team` e `teams_participant` da v1 serão perdidos** — não há
> data migration. Faça `pg_dump` antes se algo for relevante.

---

## 1. Variáveis de ambiente

### Backend (Railway → backend service → Variables)

| Variável | Valor | Notas |
|---|---|---|
| `DJANGO_SECRET_KEY` | (já existe) | Mantém |
| `DATABASE_URL` | (já existe) | Mantém — apontando para o Postgres do Railway |
| `DJANGO_ADMIN_USERNAME` | e-mail do admin | **Importante:** deve ser o e-mail. Login admin é por e-mail em v2 |
| `DJANGO_ADMIN_PASSWORD` | senha forte | |
| `DJANGO_ADMIN_EMAIL` | mesmo do `USERNAME` | |
| `ALLOWED_HOSTS` | `<seu-backend>.up.railway.app` | Comma-separated se múltiplos |
| `CORS_ALLOWED_ORIGINS` | `https://<seu-frontend>.up.railway.app` | URL do frontend |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` | Para Resend |
| `EMAIL_HOST` | `smtp.resend.com` | |
| `EMAIL_PORT` | `587` | |
| `EMAIL_HOST_USER` | `resend` | |
| `EMAIL_HOST_PASSWORD` | API key do Resend | |
| `DEFAULT_FROM_EMAIL` | `noreply@<dominio-verificado>` | |
| **`TEAM_DEADLINE`** | `2026-05-30` | **Novo em v2.** Formato `YYYY-MM-DD` |

### Frontend (Railway → frontend service → Variables)

| Variável | Valor | Notas |
|---|---|---|
| `VITE_API_URL` | `https://<seu-backend>.up.railway.app` | Sem trailing slash. `client.ts` normaliza |
| **`VITE_WHATSAPP_LINK`** | `https://chat.whatsapp.com/...` | **Novo em v2.** Se vazio, o botão "quero formar equipe" some |

---

## 2. Cutover

Janela alvo: ~5 minutos de downtime (aceito — decisão §7.5).

```bash
# 1. (Opcional, recomendado) Backup
railway run --service postgres pg_dump $DATABASE_URL > backup-pre-v2.sql

# 2. Drop das tabelas v1 + reset das migrations da app teams
#    Railway → Postgres service → Connect → Query, e cole:
DROP TABLE IF EXISTS teams_participant CASCADE;
DROP TABLE IF EXISTS teams_team CASCADE;
DELETE FROM django_migrations WHERE app = 'teams';

# 3. Setar as novas variáveis no Railway (item 1 acima)
#    - Backend: TEAM_DEADLINE
#    - Frontend: VITE_WHATSAPP_LINK

# 4. Disparar o deploy (push para main → Railway auto-builda)
#    O entrypoint.sh roda migrate (criando o schema v2 do zero)
#    e ensure_superuser (preservando o admin via DJANGO_ADMIN_USERNAME)
```

Tabelas do `django.contrib.auth` (incluindo `auth_user`) **não** são
tocadas. O superuser pré-existente continua válido, mas o login dele
agora passa por `/api/v1/auth/admin/token/` com payload `{email, password}`.

---

## 3. Validação pós-deploy

```bash
BASE=https://<seu-backend>.up.railway.app/api/v1

# 1. Healthcheck
curl -fsS $BASE/health/
# → {"status":"ok"}

# 2. /me/ sem auth → 401
curl -o /dev/null -w '%{http_code}\n' $BASE/me/
# → 401

# 3. /info/ público
curl $BASE/info/
# → {"content":"...","team_deadline":"2026-05-30","updated_at":"..."}

# 4. Admin login
curl -X POST $BASE/auth/admin/token/ -H 'Content-Type: application/json' \
  -d '{"email":"<DJANGO_ADMIN_USERNAME>","password":"<DJANGO_ADMIN_PASSWORD>"}'
# → {"access":"...","refresh":"..."}

# 5. Smoke pelo frontend
#    - /register cria conta
#    - /login autentica e redireciona /dashboard
#    - /teams/new cria equipe e redireciona /teams/:id
#    - /teams/:id/invites busca + convida outro participante de teste
```

---

## 4. Cron job — `disband_incomplete_teams`

Descarta equipes com `status=forming` após `TEAM_DEADLINE`. Idempotente,
pode rodar 2x sem dano. Recusa-se a rodar antes da deadline sem `--force`.

### Setup no Railway

1. Dashboard → projeto → "+ New" → "Empty Service"
2. Settings → Service Type → **Cron**
3. Source: mesmo repo do backend
4. Build: `backend/Dockerfile.prod` (igual ao backend service)
5. Variables: copiar as mesmas do backend (especialmente `DATABASE_URL`,
   `DJANGO_SECRET_KEY`, `TEAM_DEADLINE`, `EMAIL_*`, `DEFAULT_FROM_EMAIL`)
6. Cron Schedule: `0 0 31 5 *` (00:00 de 31/05 — meia-noite após a deadline)
7. Start Command: `python manage.py disband_incomplete_teams`

### Teste manual

Em staging ou em prod **após** a deadline:

```bash
railway run --service backend python manage.py disband_incomplete_teams --dry-run --force
# Lista as equipes que seriam descartadas, sem alterar nada

railway run --service backend python manage.py disband_incomplete_teams --force
# Descarta de fato + envia e-mails team_disbanded
```

---

## 5. Rollback

Disparar se:
- 5xx > 10% das requests por > 5 minutos
- Falha em envio de e-mail crítico (approval/rejection)
- Perda de dados confirmada

### Procedimento

1. **Backend + frontend:** Railway → Deployments → "Rollback" para o
   deploy imediatamente anterior à v2 (ambos os serviços precisam voltar
   juntos — frontend v2 é incompatível com backend v1 e vice-versa).

2. **Schema:** o schema v2 não é compatível com código v1. Restaurar
   o backup:
   ```bash
   railway run --service postgres psql $DATABASE_URL < backup-pre-v2.sql
   ```

3. **Cron:** se o cron tiver rodado e descartado equipes por engano,
   restaurar do backup (passo 2 já cobre).

---

## 6. Observações operacionais

- **Cota Resend:** 3000 e-mails/mês. Estimativa para a edição: 10
  templates × média de 50 equipes ≈ 2000 e-mails. Margem ok, mas
  monitorar a partir da semana da deadline.
- **Notificações vs e-mails:** sempre criadas em par (helper `notify()`
  em `apps/teams/services/notifications.py`). Falha de e-mail é logada
  via `logger.exception` mas não derruba a request — a notificação
  no app continua chegando.
- **DeadlineBanner:** aparece automaticamente nas páginas autenticadas
  do participante quando faltarem ≤ 7 dias para `TEAM_DEADLINE`. Lê
  o valor via `GET /api/v1/info/`.
