# Liga Hackathon

Plataforma oficial do Hackathon da Liga de TI.

O sistema cobre o fluxo completo do evento: cadastro de participantes, login por JWT,
formacao de equipes, convites, pedidos de entrada, submissao para analise, painel
administrativo, notificacoes e disparos de email.

## Stack

- Backend: Python 3.12, Django 5, Django REST Framework, Simple JWT, PostgreSQL
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Query, React Router
- Infra: Docker Compose para desenvolvimento; Railway para producao
- Email: console backend em desenvolvimento; Resend backend em producao

## Estrutura

```text
backend/
  apps/teams/              API, regras de negocio, emails, tests e commands
  core/                    settings locais, urls, wsgi e email backend
  config/settings/         settings de producao
frontend/
  src/api/                 clients REST
  src/hooks/               ViewModels com React Query
  src/pages/               paginas publicas, autenticadas e admin
  src/components/          componentes compartilhados
specs/
  v2/                      especificacao atual do produto
  v1/                      historico; nao usar para novas features, exceto design.md
```

Antes de implementar features novas, leia as specs em `specs/v2/`.

## Regras principais

- Participantes tem cadastro proprio por email e senha.
- Participantes autenticam em `/api/v1/auth/token/`.
- Admins autenticam em `/api/v1/auth/admin/token/` e precisam ter `is_staff=True`.
- Cada equipe deve ter exatamente 4 membros para ser submetida.
- Depois de `submitted`, a equipe nao pode mais ser alterada.
- O backend limita a 10 equipes com status `approved`.
- Aprovacao, recusa e descarte de equipe disparam email e notificacao.
- Email e notificacao devem ser criados juntos; nunca um sem o outro.
- Se o lider sair enquanto a equipe ainda esta em formacao, a lideranca passa para o membro mais antigo.
- Depois de `TEAM_DEADLINE`, equipes incompletas sao descartadas pelo command `disband_incomplete_teams`.
- `disband_incomplete_teams` deve ser idempotente.

## Requisitos

Para rodar com Docker:

- Docker Desktop
- Docker Compose

Para rodar sem Docker:

- Python 3.12
- Node.js 20+
- PostgreSQL 16+

## Variaveis de ambiente

Copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

Variaveis importantes:

```env
POSTGRES_DB=hackathon
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

DJANGO_SECRET_KEY=change-me-in-production
DEBUG=True
TEAM_DEADLINE=2026-05-30

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
RESEND_API_KEY=re_xxxxxxxxxxxx
DEFAULT_FROM_EMAIL=Liga de TI <noreply@ligadeti.com.br>

VITE_WHATSAPP_LINK=https://chat.whatsapp.com/seu-link-aqui
```

Em producao, configure tambem:

```env
DJANGO_SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=
CORS_ALLOWED_ORIGINS=
DATABASE_URL=
DJANGO_ADMIN_USERNAME=
DJANGO_ADMIN_PASSWORD=
DJANGO_ADMIN_EMAIL=
```

## Rodando com Docker

Subir tudo:

```powershell
docker compose up -d --build
```

Ou pelo Makefile:

```powershell
make up
```

Servicos:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1/
- Django Admin: http://localhost:8000/admin/
- Health check: http://localhost:8000/api/v1/health/

Rodar migracoes:

```powershell
docker compose exec backend python manage.py migrate
```

Criar superusuario:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Parar:

```powershell
docker compose down
```

## Rodando localmente sem Docker

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Se o banco estiver fora do Docker, ajuste `POSTGRES_HOST`, `POSTGRES_PORT`,
usuario, senha e database no `.env`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

O Vite roda em http://localhost:5173.

## E-mail, Celery e Redis

Todo e-mail do sistema (convites do hackathon, confirmacoes e resultados do
processo seletivo) e enfileirado no Celery e enviado por um **worker**, nunca
pela requisicao web.

Isso significa que sao necessarios **tres** processos, nao dois:

| Processo | Papel |
|----------|-------|
| `backend` | responde a API e enfileira as tarefas de e-mail |
| `redis`   | guarda a fila |
| `worker`  | consome a fila e envia os e-mails |

### A falha que nao da erro

Se o Redis estiver acessivel mas **nenhum worker estiver rodando**, as tarefas
entram na fila e ficam la. A requisicao responde 200, a notificacao aparece no
banco e o e-mail nunca sai. Nao ha excecao, nao ha log de erro, e o problema so
aparece quando um candidato reclama de nao ter recebido o resultado.

Para nao descobrir isso no dia do processo, rode:

```bash
docker compose exec backend python manage.py check_email_pipeline
```

O comando checa broker, workers respondendo, backend de e-mail e tipos de
notificacao registrados. **Rode antes de abrir as inscricoes e antes de cada
envio em massa.**

### Desenvolvimento sem Redis

Se voce nao quiser subir o Redis localmente, ligue o modo eager: as tarefas
rodam no proprio processo web e o e-mail sai direto no console.

```
CELERY_TASK_ALWAYS_EAGER=True
```

Isso e aceitavel em desenvolvimento e **nunca** em producao — o envio passa a
bloquear a requisicao.

### Producao

O worker precisa existir como processo separado. No `docker-compose.prod.yml`
ele e o servico `worker`. No Railway, precisa ser um **servico proprio** no
mesmo projeto, apontando para o mesmo repositorio, com:

```
Start command: celery -A core worker --loglevel=info
```

e as mesmas variaveis de ambiente do backend (`DATABASE_URL`, `REDIS_URL`,
`DJANGO_SECRET_KEY`, credenciais do Resend). O `entrypoint.sh` sobe apenas o
gunicorn: ele nao inicia worker nenhum.

---

## Scripts e comandos uteis

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run preview
```

Backend:

```powershell
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python -m pytest
```

Commands de suporte:

```powershell
python manage.py seed_demo_data
python manage.py test_email
python manage.py test_all_emails
python manage.py disband_incomplete_teams
python manage.py disband_incomplete_teams --force
```

## API principal

Base URL:

```text
/api/v1/
```

Autenticacao:

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`
- `POST /api/v1/auth/admin/token/`

Participante:

- `GET /api/v1/me/`
- `PATCH /api/v1/me/`
- `GET /api/v1/participants/?search=nome`

Equipes:

- `GET /api/v1/teams/`
- `POST /api/v1/teams/`
- `GET /api/v1/teams/{id}/`
- `PATCH /api/v1/teams/{id}/`
- `POST /api/v1/teams/{id}/submit/`
- `DELETE /api/v1/teams/{id}/leave/`
- `DELETE /api/v1/teams/{id}/members/{participant_id}/`

Convites:

- `POST /api/v1/teams/{id}/invites/`
- `GET /api/v1/me/invites/`
- `POST /api/v1/me/invites/{id}/accept/`
- `POST /api/v1/me/invites/{id}/decline/`

Pedidos de entrada:

- `POST /api/v1/teams/{id}/join-requests/`
- `GET /api/v1/teams/{id}/join-requests/`
- `POST /api/v1/teams/{id}/join-requests/{request_id}/accept/`
- `POST /api/v1/teams/{id}/join-requests/{request_id}/decline/`

Notificacoes:

- `GET /api/v1/me/notifications/`
- `PATCH /api/v1/me/notifications/{id}/read/`

Admin:

- `GET /api/v1/admin/teams/`
- `PATCH /api/v1/admin/teams/{id}/approve/`
- `PATCH /api/v1/admin/teams/{id}/reject/`
- `GET /api/v1/admin/participants/`

Informacoes:

- `GET /api/v1/info/`

## Fluxo do produto

1. Participante cria conta em `/register`.
2. Participante entra no dashboard autenticado.
3. Participante cria equipe ou entra em uma equipe aberta.
4. Lider convida participantes ou aceita pedidos de entrada.
5. Com 4 membros, o lider submete a equipe.
6. Admin aprova ou recusa equipes submetidas.
7. Emails e notificacoes acompanham os eventos importantes.
8. Depois do deadline, o command descarta equipes incompletas.

## Testes

A suite backend usa `pytest` e `pytest-django`.

```powershell
cd backend
python -m pytest
```

Checks recomendados antes de merge:

```powershell
git diff --check
cd frontend
npm run build
cd ..\backend
python manage.py check
python manage.py makemigrations --check --dry-run
python -m pytest
```

Observacao: no momento, o frontend nao possui scripts `test` ou `lint` no
`package.json`; o check principal disponivel e `npm run build`.

## Deploy

> **Antes de qualquer processo seletivo real:** confirme que existe um servico de
> worker rodando (`celery -A core worker`) e rode
> `python manage.py check_email_pipeline`. Sem worker, nenhum e-mail e enviado e
> nada acusa o erro. Ver a secao "E-mail, Celery e Redis".


O projeto possui arquivos `railway.toml` para backend e frontend.

Backend em producao:

- usa `backend/entrypoint.sh`
- valida variaveis obrigatorias
- espera o banco ficar disponivel
- roda migracoes
- roda `collectstatic`
- garante superusuario inicial
- inicia Gunicorn

Frontend em producao:

- build Vite
- servido por Nginx conforme `frontend/nginx.conf`

## Referencias internas

- Modelos: `specs/v2/models.md`
- API: `specs/v2/api.md`
- Frontend: `specs/v2/frontend.md`
- Emails: `specs/v2/email.md`
- Testes: `specs/v2/tests.md`
- Design system: `specs/v1/design.md`
