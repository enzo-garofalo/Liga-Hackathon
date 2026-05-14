# MIGRATION_PLAN — Liga de TI (v1 → v2)

> Documento de planejamento. Nenhuma linha de código deve ser tocada antes da
> aprovação explícita do usuário. Decisões marcadas com **[REQUER APROVAÇÃO]**
> bloqueiam o início da fase correspondente.

---

## 1. Análise do estado atual

### 1.1 Backend (`backend/`)

**Estrutura atual**
- App única: `apps.teams`
- Settings duplo: `core/settings.py` (dev) + `config/settings/production.py` (sobrescreve via `core.settings import *`)
- WSGI prod: `backend/config/wsgi.py` aponta para `config.settings.production`
- Migrations existentes: apenas `apps/teams/migrations/0001_initial.py`
- Sem testes, sem management commands, sem app de notificações.

**Modelos atuais (v1)**
- `Team(id UUID, name unique, title, proposal, status, created_at, updated_at)`
- `Participant(id UUID, team FK CASCADE, full_name, email, phone, ra, github, is_leader)`

**Endpoints atuais (v1)**
- `POST /api/v1/teams/` — nested write (cria equipe + 4 participants)
- `GET /api/v1/teams/{id}/` — detalhe público
- `GET /api/v1/admin/teams/?status=` — lista (JWT)
- `PATCH /api/v1/admin/teams/{id}/approve/` — aprova (limite 10)
- `PATCH /api/v1/admin/teams/{id}/reject/` — recusa
- `POST /api/v1/auth/token/` — JWT padrão (username/password)
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/health/`

**Auth atual:** `TokenObtainPairView` padrão do SimpleJWT — autentica via `username`. Admin é criado pelo `entrypoint.sh` a partir de `DJANGO_ADMIN_USERNAME`/`DJANGO_ADMIN_PASSWORD`.

**E-mail atual:** `apps/teams/emails.py` com `send_approval_email` e `send_rejection_email` (HTML + texto).

### 1.2 Frontend (`frontend/`)

**Stack:** React 18 + TS + Tailwind + React Query + react-hook-form + react-router v6 + axios.

**Rotas atuais**
| Rota | Página | Hook |
|------|--------|------|
| `/` | `RegistrationPage` | `useTeamRegistration` |
| `/confirmacao/:id` | `ConfirmationPage` | `useTeamConfirmation` |
| `/admin/login` | `AdminLoginPage` | `useAdminLogin` |
| `/admin/dashboard` | `AdminDashboardPage` (`ProtectedRoute`) | `useAdminDashboard` |

**Infra de cliente:** `src/api/client.ts` com axios + interceptor lendo `sessionStorage.access_token`. Em dev, `VITE_API_URL` vazia → `/api/v1` via proxy do Vite (`vite.config.ts` → `http://backend:8000`).

**UI:** `Button`, `Badge`, `Input` em `src/components/ui/`. Tailwind já tem `brand`, `near-black`, `silver-blue`, `brand-green`, `font-display`, `font-ui`, `shadow-whisper`. Logo em `src/assets/logo.svg`.

### 1.3 O que será preservado, modificado e removido

**Preservar (sem alteração)**
- Stack e dependências base (Django 5.2, DRF, SimpleJWT; React 18, RQ, RHF, Vite).
- `core/settings.py` + `config/settings/production.py` como base — apenas adicionar config nova.
- `entrypoint.sh` (lógica de wait-for-db, migrate, collectstatic, superuser, gunicorn) — sem alterações.
- WhiteNoise, CORS, dj-database-url, gunicorn.
- Componentes UI (`Button`, `Badge`, `Input`), tema Tailwind, logo, design system.
- Helper `frontend/src/utils/errors.ts`.
- `health_check` view e endpoint `/api/v1/health/` (Railway healthcheck depende dele).
- Dockerfiles, `docker-compose*.yml`, `railway.toml` (frontend/backend).

**Modificar**
- Modelos: `Team` ganha campos novos e perde `title`/`proposal`; `Participant` é completamente refeito (vira FK com User, perde `team`, `phone`, `ra`, `is_leader`).
- `serializers.py`/`views.py`/`urls.py`/`emails.py` da app `teams` — reescritos.
- `core/urls.py`: adicionar rotas de auth de participante e admin separadas.
- `core/settings.py`: novos vars (`TEAM_DEADLINE`), `AUTH_USER_MODEL` continua `auth.User` (decisão abaixo), serializer de auth customizado para login por e-mail, `DEFAULT_PERMISSION_CLASSES` provavelmente `IsAuthenticated`.
- Frontend: `api/teams.ts` e `types/index.ts` viram `api/*.ts` por domínio; `App.tsx` ganha rotas novas; `ProtectedRoute` precisa atender ao papel (participante vs admin).
- `entrypoint.sh`: nenhuma mudança obrigatória, mas validar se ainda queremos criar superuser via env (sim — admins continuam fora do fluxo de cadastro de participante).

**Remover**
- Backend: nada é deletado fisicamente até o passo final, mas os campos `Team.title`, `Team.proposal`, `Participant.email/phone/ra/is_leader/team` saem via migration.
- Frontend: `pages/RegistrationPage.tsx`, `pages/ConfirmationPage.tsx`, `hooks/useTeamRegistration.ts`, `hooks/useTeamConfirmation.ts`, rota `/confirmacao/:id`. O nome `RegistrationPage` será reaproveitado para o cadastro de participante? **[REQUER APROVAÇÃO]** — a spec usa `RegisterPage`. Recomendação: deletar o arquivo antigo e criar `RegisterPage.tsx` novo.

---

## 2. Estratégia de migração de banco

### 2.1 Pergunta-chave **[REQUER APROVAÇÃO]**

> Existem dados em produção que precisam ser preservados?

A v1 está deployada no Railway, então pode haver inscrições reais. Três cenários:

**Cenário A — Sem dados relevantes (recomendado):**
Drop + recreate é aceitável. Estratégia: deletar `0001_initial.py`, gerar `0001_initial.py` novo já com o schema v2, e em produção rodar `python manage.py migrate teams zero` antes do deploy (ou dropar a tabela manualmente). Mais simples, sem risco de migration mal-feita.

**Cenário B — Dados existem mas podem ser descartados:**
Igual ao A, com aviso explícito ao usuário antes de aplicar.

**Cenário C — Dados precisam ser preservados:**
Caminho complexo. Participants v1 não têm `User`, `course`, `semester`, `bio` — não é possível convertê-los em participantes v2 sem coletar essas infos. Equipes v1 têm `title`/`proposal` que somem na v2 e ganham `leader FK` que não existia. Recomendação: exportar para CSV/JSON antes do drop e re-criar manualmente se necessário.

**Recomendação:** se o ambiente de produção tem ≤ 5 inscrições reais ou apenas dados de teste, Cenário A. Caso contrário, exportar antes.

### 2.2 Estratégia recomendada (assumindo Cenário A)

1. **Apagar** `apps/teams/migrations/0001_initial.py`.
2. **Reescrever** `models.py` inteiro com os 5 modelos novos (`Participant`, `Team`, `TeamMembership`, `TeamInvite`, `JoinRequest`) + `Notification` + `HackathonInfo`.
3. **Gerar** uma `0001_initial.py` nova com `python manage.py makemigrations teams`.
4. **Em prod (uma vez):**
   ```sql
   -- via Railway DB shell
   DROP TABLE IF EXISTS teams_participant CASCADE;
   DROP TABLE IF EXISTS teams_team CASCADE;
   DELETE FROM django_migrations WHERE app = 'teams';
   ```
   Em seguida o próximo deploy roda `migrate` e cria o schema novo.
5. **Ordem de criação dos modelos** (Django resolve sozinho via dependências, mas para conferência manual):
   - `Participant` (depende de `auth.User`)
   - `Team` (depende de `Participant` para `leader`)
   - `TeamMembership` (depende de `Team` e `Participant`)
   - `TeamInvite` (depende de `Team` e `Participant`)
   - `JoinRequest` (depende de `Team` e `Participant`)
   - `Notification` (depende de `Participant`)
   - `HackathonInfo` (independente)

### 2.3 Proteção contra FK em ordem errada

Tudo em uma única migration `0001_initial.py` resolve naturalmente. Se em algum momento futuro `Participant` for movido para outra app, separar em duas migrations.

### 2.4 Decisão de modelo de usuário **[REQUER APROVAÇÃO]**

A spec diz `Participant.user = OneToOne → User`. Duas opções:

- **Opção 1 (recomendada):** manter `django.contrib.auth.User` padrão. Login por e-mail é resolvido com `authentication_backend` customizado ou serializer JWT customizado que aceita `email` e copia para `username`. **Vantagem:** menos mudança, sem `AUTH_USER_MODEL` (que exige migration nova de toda autenticação se mudado tarde).
- **Opção 2:** criar `apps.accounts.User` com `email` como `USERNAME_FIELD`. **Vantagem:** mais limpo. **Desvantagem:** se houver superuser já criado em prod, a migration vai precisar ser manual.

Recomendação: **Opção 1**. Username pode ser preenchido com o e-mail no `register/`.

---

## 3. Fases de implementação

> Cada fase tem objetivo único, é deployável e testável isoladamente.
> O backend deve ficar 100% pronto e testado **antes** de tocar no frontend
> (frontend v1 continua funcional contra a API antiga até o cutover, ou
> entendemos que o site sai do ar durante o switch — ver §5).

---

### Fase 1 — Backend: modelos, migrations e admin

**Objetivo:** schema novo no banco + admin Django funcional para inspeção.

**Arquivos**
- Reescrever: `backend/apps/teams/models.py`
- Reescrever: `backend/apps/teams/admin.py`
- Apagar: `backend/apps/teams/migrations/0001_initial.py`
- Gerar: nova `0001_initial.py` via `makemigrations`
- Editar: `backend/core/settings.py` — adicionar `TEAM_DEADLINE = os.environ.get('TEAM_DEADLINE', '2026-05-30')` parseado como `date`.

**Critério de pronto**
- `python manage.py migrate` sem erros num banco zerado.
- `python manage.py createsuperuser` + login no `/admin/` mostra todos os modelos novos.
- `Participant.has_team` retorna bool correto em shell.

**Riscos**
- Se a Opção 2 (custom User) for escolhida, esta fase precisa rodar em DB virgem.
- Constraint "uma TeamMembership ativa por participante" não é trivial em SQL puro — implementar via `clean()` + `UniqueConstraint(fields=['participant'], name='unique_active_membership')` (não há "ativa" porque só existem ativas — quando sai, deletamos a row). Confirmar essa interpretação.

**Complexidade:** Média.

---

### Fase 2 — Backend: autenticação de participantes e admins

**Objetivo:** endpoints de cadastro/login funcionais com JWT.

**Arquivos**
- Criar: `backend/apps/teams/serializers/auth.py` (ou seção em `serializers.py`)
  - `RegisterSerializer` (cria User + Participant atomicamente)
  - `EmailTokenObtainPairSerializer` (login por e-mail; herda de `TokenObtainPairSerializer`)
  - `AdminTokenObtainPairSerializer` (idem mas valida `is_staff=True`)
- Criar: `backend/apps/teams/views/auth.py`
  - `RegisterView`, `EmailTokenObtainPairView`, `AdminTokenObtainPairView`
- Editar: `backend/core/urls.py` — substituir `/api/v1/auth/token/` (TokenObtainPairView padrão) por `EmailTokenObtainPairView`; adicionar `/api/v1/auth/register/` e `/api/v1/auth/admin/token/`.
- Editar: `backend/core/settings.py` — `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = ['rest_framework_simplejwt.authentication.JWTAuthentication']`, `DEFAULT_PERMISSION_CLASSES = ['rest_framework.permissions.IsAuthenticated']`.

**Critério de pronto**
- `POST /api/v1/auth/register/` com body válido retorna 201 e participante criado.
- `POST /api/v1/auth/token/` com e-mail/senha retorna `{access, refresh}`.
- `POST /api/v1/auth/admin/token/` recusa usuário não-staff com 401.

**Riscos**
- Mudar `DEFAULT_PERMISSION_CLASSES` para `IsAuthenticated` quebra todos os endpoints v1 que dependiam de `AllowAny` — só seguro fazer junto com a substituição completa dos endpoints (Fase 3 em diante). Alternativa: manter `AllowAny` como default e definir `permission_classes = [IsAuthenticated]` view por view.

**Complexidade:** Média.

---

### Fase 3 — Backend: perfil e listagem de participantes

**Objetivo:** `/me/` e `/participants/` funcionais.

**Arquivos**
- Criar: `backend/apps/teams/views/participants.py` — `MeView` (GET/PATCH), `ParticipantListView` (lista sem equipe, suporta `?search=`).
- Criar: serializer `ParticipantSerializer` (perfil completo) e `ParticipantPublicSerializer` (campos públicos para busca de convite).
- Editar: `urls.py`.

**Critério de pronto**
- `GET /api/v1/me/` autenticado retorna perfil + `has_team`.
- `PATCH /api/v1/me/` atualiza campos editáveis.
- `GET /api/v1/participants/?search=ana` lista apenas sem equipe.

**Complexidade:** Baixa.

---

### Fase 4 — Backend: CRUD de equipes + memberships

**Objetivo:** criar, listar, detalhar, atualizar, sair, remover membro, submeter.

**Arquivos**
- Criar: `backend/apps/teams/views/teams.py` — `TeamCreateView`, `TeamListView` (abertas), `TeamDetailView`, `TeamUpdateView`, `TeamSubmitView`, `TeamLeaveView`, `TeamRemoveMemberView`.
- Criar: `TeamSerializer`, `TeamCreateSerializer` com regras (criador vira líder/membro, valida que criador não tem equipe).
- Criar: helper `backend/apps/teams/services/team.py` para encapsular regras (transferência de liderança, deleção de equipe vazia, bloqueio pós-submitted, validação de deadline).
- Editar: `urls.py`.

**Regras a codificar (reusar em Fase 5+)**
- Bloquear todas as operações de membership/leave/remove se `team.status != 'forming'`.
- Após `TEAM_DEADLINE`, bloquear `POST /teams/` e `POST /teams/{id}/submit/`.
- Em `leave`: se líder sair, transferir para `TeamMembership.objects.filter(team=t).order_by('joined_at').first()`. Se equipe ficar vazia, deletar.
- Em `submit`: validar exatamente 4 memberships, setar `status='submitted'`, `is_open=False`, `submitted_at=now()`.

**Critério de pronto**
- Todos os endpoints retornam status corretos para casos felizes e validações.
- Testes manuais via `httpie`/Postman cobrem: criar, transferir liderança, deletar equipe, submeter, bloquear ações pós-submit.

**Riscos**
- Race condition em `submit` (dois leaders submetendo ao mesmo tempo) — usar `select_for_update()`.
- Race condition em `leave` se vários membros saírem simultaneamente — `select_for_update` na equipe.

**Complexidade:** Alta.

---

### Fase 5 — Backend: convites e join requests

**Objetivo:** fluxos completos de TeamInvite e JoinRequest.

**Arquivos**
- Criar: `backend/apps/teams/views/invites.py`, `views/join_requests.py`.
- Criar: `TeamInviteSerializer`, `JoinRequestSerializer`.
- Editar: `urls.py`.

**Regras-chave**
- `POST /teams/{id}/invites/` — só líder; valida invitee sem equipe, equipe `< 4`, status=`forming`, sem convite duplicado.
- `accept` de convite cria membership e cancela todos os outros pending desse participante.
- `JoinRequest` requer `team.is_open=True` + `status=forming` + `< 4` membros.

**Critério de pronto**
- Endpoints de aceitar/recusar funcionam.
- Aceite de convite invalida outros pending.
- Notificação e e-mail são acionados (mockados nesta fase, integrados na Fase 6).

**Complexidade:** Média.

---

### Fase 6 — Backend: notificações + e-mails

**Objetivo:** modelo `Notification` + 10 templates de e-mail + invariante "nunca um sem o outro".

**Arquivos**
- Reescrever: `backend/apps/teams/emails.py` — uma função por template (10 templates listados em `specs/v2/email.md`).
- Criar: `backend/apps/teams/services/notifications.py` com helper `notify(participant, type, message)` que cria `Notification` **e** dispara o e-mail correspondente em uma única transação.
- Criar: `NotificationListView`, `NotificationMarkReadView`.
- Atualizar Fases 4 e 5 para usar `notify()` em vez de chamar e-mail/notification soltos.

**Critério de pronto**
- Toda ação que dispara e-mail também cria notificação.
- `GET /api/v1/me/notifications/` retorna lista ordenada.
- `PATCH .../{id}/read/` marca como lida.
- Em dev, e-mails caem no console (`EMAIL_BACKEND=console`).

**Riscos**
- Exceção no envio de e-mail não pode deixar a notificação criada e a request 500ar — usar `transaction.atomic` + log de falha de e-mail (igual lógica atual de approve/reject).
- Cota Resend (3000/mês): 10 templates × ~50 equipes = volume baixo, sem risco. Mas validar cota antes do dia do hackathon.

**Complexidade:** Média.

---

### Fase 7 — Backend: management command + cron

**Objetivo:** `disband_incomplete_teams` idempotente.

**Arquivos**
- Criar: `backend/apps/teams/management/__init__.py`
- Criar: `backend/apps/teams/management/commands/__init__.py`
- Criar: `backend/apps/teams/management/commands/disband_incomplete_teams.py`

**Lógica**
1. Filtrar `Team.objects.filter(status='forming')`.
2. Para cada equipe: enviar `team_disbanded` para todos os membros (e criar notificações).
3. Deletar a equipe (CASCADE limpa membership/invites/join_requests).
4. Logar contagem.

**Idempotência**
- Após a primeira execução, não há mais equipes `forming` → segunda execução é no-op.
- O command **não** depende da data — quem garante o agendamento é o cron. Mas adicionar guard `if date.today() < TEAM_DEADLINE: log warning + abort` para evitar disparo manual prematuro.

**Critério de pronto**
- `python manage.py disband_incomplete_teams --dry-run` lista as equipes que seriam descartadas.
- Sem `--dry-run`: descarta de fato e envia e-mails.
- Rodar duas vezes seguidas é seguro.

**Complexidade:** Baixa.

---

### Fase 8 — Backend: endpoints admin + `HackathonInfo`

**Objetivo:** ajustes finais no admin para refletir v2 (lista só `submitted`, e-mail vai para todos os 4 membros) + endpoint `/info/`.

**Arquivos**
- Criar/editar: `views/admin.py`
- Criar: model `HackathonInfo` (singleton-style) + admin Django para edição.
- Criar: `views/info.py` (GET público).

**Critério de pronto**
- `GET /api/v1/admin/teams/` por padrão lista apenas `submitted`.
- `approve` valida limite 10 e dispara `team_approved` para os 4.
- `reject` dispara `team_rejected` para os 4.
- `GET /api/v1/info/` retorna conteúdo editável.

**Complexidade:** Baixa.

---

### Fase 9 — Backend: testes automatizados

**Objetivo:** cobrir todas as suítes listadas em `specs/v2/tests.md`.

**Arquivos**
- Criar: `backend/apps/teams/tests/__init__.py`
- Criar: `backend/apps/teams/tests/conftest.py` (factories)
- Criar: `tests/test_models.py`, `test_serializers.py`, `test_views_auth.py`, `test_views_teams.py`, `test_views_invites.py`, `test_views_join_requests.py`, `test_deadline.py`, `test_views_admin.py`
- Adicionar `pytest`, `pytest-django`, `factory-boy` em `requirements.txt`. **[REQUER APROVAÇÃO]** — alternativa é usar `django.test.TestCase` puro sem novas deps.

**Critério de pronto**
- `pytest` (ou `python manage.py test`) verde com 100% das funções listadas em `specs/v2/tests.md`.

**Complexidade:** Alta (volume).

---

### Fase 10 — Frontend: limpeza da v1 + infra de auth

**Objetivo:** remover páginas/hooks/rotas v1 e preparar infra de auth de participante.

**Arquivos a deletar**
- `frontend/src/pages/RegistrationPage.tsx`
- `frontend/src/pages/ConfirmationPage.tsx`
- `frontend/src/hooks/useTeamRegistration.ts`
- `frontend/src/hooks/useTeamConfirmation.ts`
- `frontend/src/api/teams.ts` (vai virar vários arquivos por domínio)
- `frontend/src/types/index.ts` (vai virar `types/team.ts`, `types/participant.ts`, etc.)

**Arquivos a criar/modificar**
- `frontend/src/api/auth.ts`, `api/me.ts`, `api/teams.ts` (novo), `api/invites.ts`, `api/joinRequests.ts`, `api/notifications.ts`, `api/admin.ts`, `api/info.ts`.
- `frontend/src/types/*.ts` por domínio.
- `frontend/src/hooks/useAuth.ts` — registrar/login/logout/me.
- `frontend/src/components/ProtectedRoute.tsx` — passar a aceitar `requireAdmin?: boolean`.
- `frontend/src/App.tsx` — apenas `LandingPage` + `LoginPage` + `RegisterPage` por enquanto, restantes virão nas fases seguintes.

**Critério de pronto**
- `npm run build` sem erros TS.
- Site sobe e mostra landing/login/register placeholders.

**Complexidade:** Média.

---

### Fase 11 — Frontend: páginas públicas + dashboard básico

**Objetivo:** `/`, `/info`, `/login`, `/register`, `/dashboard`, `/profile` funcionando.

**Arquivos**
- Criar: `pages/LandingPage.tsx`, `pages/InfoPage.tsx`, `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`, `pages/DashboardPage.tsx`, `pages/ProfilePage.tsx`.
- Criar: `hooks/useProfile.ts`.
- Criar: `components/Header.tsx` (com logo e link para perfil).
- Criar: `components/StatusBanner.tsx` (no-team variant).

**Critério de pronto**
- Fluxo: register → login → /dashboard renderiza perfil + StatusBanner "sem equipe".
- /info chama API e renderiza markdown/HTML retornado.

**Complexidade:** Média.

---

### Fase 12 — Frontend: equipes (criar, listar, detalhe, sair, submeter)

**Objetivo:** `/teams`, `/teams/new`, `/teams/:id` completos.

**Arquivos**
- Criar: `pages/TeamsPage.tsx`, `pages/CreateTeamPage.tsx`, `pages/TeamDetailPage.tsx`.
- Criar: `hooks/useTeams.ts`, `hooks/useTeam.ts`, `hooks/useCreateTeam.ts`.
- Criar: `components/TeamCard.tsx`, `components/StatusBanner.tsx` (todas as variantes).
- Adicionar `VITE_WHATSAPP_LINK` e usar no botão "quero formar equipe".

**Critério de pronto**
- Criar equipe → vai para `/teams/:id`, mostra criador como líder/membro 1/4.
- Submit desabilitado se membros != 4.
- Leave: líder vê transferência de liderança refletida no UI.

**Complexidade:** Alta.

---

### Fase 13 — Frontend: convites e join requests

**Objetivo:** `/teams/:id/invites` + ações de aceitar/recusar.

**Arquivos**
- Criar: `pages/InvitePage.tsx`.
- Criar: `hooks/useInvites.ts`, `hooks/useJoinRequests.ts`, `hooks/useSendInvite.ts`.
- Criar: `components/ParticipantCard.tsx`.

**Critério de pronto**
- Líder convida participante por busca → invitee vê convite no dashboard.
- Solicitação de entrada chega ao líder com botões accept/decline.

**Complexidade:** Média.

---

### Fase 14 — Frontend: notificações com polling

**Objetivo:** `NotificationBell` no header + polling a cada 30s.

**Arquivos**
- Criar: `components/NotificationBell.tsx`.
- Criar: `hooks/useNotifications.ts` com `refetchInterval: 30_000`.

**Critério de pronto**
- Badge mostra contagem de não-lidas.
- Click marca como lida e navega para contexto (ex: invite → /dashboard).

**Complexidade:** Média.

---

### Fase 15 — Frontend: admin dashboard + DeadlineBanner

**Objetivo:** `/admin/login` e `/admin/dashboard` ajustados; banner global de deadline.

**Arquivos**
- Editar: `pages/AdminLoginPage.tsx` (passa a usar `/auth/admin/token/` e e-mail).
- Editar: `pages/AdminDashboardPage.tsx` (lista só `submitted` por padrão; mostra membros como lista).
- Editar: `hooks/useAdminLogin.ts`, `hooks/useAdminDashboard.ts`.
- Criar: `components/DeadlineBanner.tsx`.

**Critério de pronto**
- Admin loga, vê equipes submitted, aprova/recusa, contagem de aprovadas atualiza.
- Banner aparece quando faltarem ≤ 7 dias para `TEAM_DEADLINE`.

**Complexidade:** Média.

---

### Fase 16 — Deploy e operação

**Objetivo:** subir v2 em produção sem deixar buracos.

**Atividades**
1. Configurar variáveis no Railway:
   - Backend: `TEAM_DEADLINE=2026-05-30`, manter `DJANGO_SECRET_KEY`, `DATABASE_URL`, `EMAIL_*`, `DEFAULT_FROM_EMAIL`, `CORS_ALLOWED_ORIGINS`.
   - Frontend: adicionar `VITE_WHATSAPP_LINK=https://chat.whatsapp.com/...`.
2. Drop das tabelas v1 no banco prod (ver §2.2).
3. Deploy backend → confirmar healthcheck verde + `/api/v1/me/` 401 em chamada anônima.
4. Deploy frontend → smoke test: register → login → criar equipe.
5. Criar Cron Job no Railway: `0 0 31 5 *` rodando `python manage.py disband_incomplete_teams` (após `TEAM_DEADLINE=2026-05-30`, a primeira execução cai em 31/05 00:00).
6. Confirmar Resend SMTP recebendo e-mails reais (enviar invite de teste).
7. Validar que admin antigo continua acessível (criado por `entrypoint.sh`).

**Critério de pronto**
- Smoke test ponta-a-ponta passando em produção.
- Cron job aparece na lista de routines do Railway.

**Complexidade:** Média.

---

## 4. Checklist de validação por fase

| Fase | Manual | Automatizado |
|------|--------|--------------|
| 1 | Migration aplica em DB zerado; `/admin/` acessível | (n/a — modelos puros) |
| 2 | `register` 201, `token` 200, `admin/token` 401 para não-staff | `test_register_*`, `test_login_*` |
| 3 | `me` GET/PATCH; `participants?search=` filtra | `test_me_*` |
| 4 | Criar/sair/submit/transferir liderança | `test_views_teams.py` completo |
| 5 | Convites accept invalida outros pending | `test_views_invites.py`, `test_views_join_requests.py` |
| 6 | Console mostra e-mail; `notifications` lista | `test_invite_creates_notification_for_invitee`, etc |
| 7 | `disband_incomplete_teams --dry-run` + execução real + idempotência | `test_deadline.py` |
| 8 | `admin/teams` lista só submitted; aprovar 11ª retorna 400 | `test_views_admin.py` |
| 9 | (n/a) | `pytest` 100% verde |
| 10 | `npm run build` sem erros; rotas placeholders carregam | TS check |
| 11 | Register → login → /dashboard fluxo end-to-end | `test_register_calls_api`, `test_login_*` |
| 12 | Criar equipe, sair como líder, submeter com 4 | `test_submit_disabled_*`, `test_leave_*` |
| 13 | Convite chega + aceita | (testes de hook) |
| 14 | Polling 30s atualiza badge | `test_polling_*` |
| 15 | Admin login + dashboard novo | `test_unread_count_*` |
| 16 | Smoke test prod + cron criado | (monitorar Resend) |

---

## 5. Plano de rollback

### 5.1 Durante o desenvolvimento
- Trabalhar em branch `v2-migration` (ou múltiplas branches por fase). `main` fica intacto até o cutover.
- Tag `pre-v2` no último commit antes da migração — `git tag pre-v2 <sha>`.

### 5.2 Janela de cutover (estratégia recomendada: cutover seco)
1. Pôr o site em modo manutenção (página estática no frontend ou retornar 503 na API).
2. Backup do banco prod: `pg_dump $DATABASE_URL > backup-pre-v2.sql`.
3. Drop das tabelas v1 + deploy v2.
4. Smoke test.
5. Tirar manutenção.

### 5.3 Se algo quebrar em prod após o cutover
- **Backend não sobe:** rollback para a tag `pre-v2` no Railway (deploy anterior) — restaura código v1. Banco já está em schema v2; restaurar o `pg_dump` se precisar voltar para v1 funcional.
- **E-mail não dispara:** já há `try/except + log` no padrão atual; replicar. Notificação na plataforma continua funcionando.
- **Cron descarta equipes erradas:** revogar o cron, restaurar do backup.
- **Frontend quebrado:** rollback do serviço frontend no Railway (mantém backend v2 — frontend antigo bate em endpoints que não existem mais, mas o admin antigo continuava funcionando? Não — `/auth/token/` mudou de username para email. Logo, frontend antigo + backend v2 está quebrado por padrão. Rollback precisa ser dos dois).

### 5.4 Critério para rollback
- Erro 5xx > 10% das requests por > 5 minutos.
- Falha em dispatch de e-mail crítico (approval/rejection).
- Perda de dados confirmada.

---

## 6. Riscos transversais

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados de produção v1 perdidos no drop | Média | Alto se houver inscrições reais | Pergunta **[REQUER APROVAÇÃO]** em §2.1 + `pg_dump` antes do cutover |
| Auth quebra durante o cutover (admin antigo desloga) | Alta | Médio | Cutover em janela curta, comunicar admins. Como `User` é preservado, basta logar de novo via novo endpoint |
| CORS bloqueia frontend após mudança de URL | Média | Alto | Conferir `CORS_ALLOWED_ORIGINS` no Railway antes do deploy |
| Cota Resend (3000/mês) | Baixa | Alto se acontecer | 10 templates × 4 membros × ~50 equipes ≈ 2000 e-mails. Margem ok, mas monitorar |
| Cron job não dispara no horário | Baixa | Alto (equipes incompletas não somem) | Testar com `TEAM_DEADLINE` falso em staging; rodar manual se cron falhar |
| `is_staff=True` esquecido na validação admin | Média | Alto (privilege escalation) | Test `test_login_fails_for_non_staff` obrigatório em Fase 2 |
| Rota `/api/v1/teams/` mantém URL mas muda semântica completamente | Alta | Médio | Frontend antigo deve sair do ar antes do backend v2 ir pro ar (cutover atômico) |
| Notificação criada mas e-mail falha (ou vice-versa) | Média | Baixo | Helper `notify()` em `transaction.atomic` + log de falha |
| `TEAM_DEADLINE` interpretado em timezone errado | Baixa | Médio | `TIME_ZONE='America/Sao_Paulo'` já está. Parsear como `date` (não `datetime`) e comparar com `timezone.localdate()` |

---

## 7. Decisões que precisam de aprovação antes de prosseguir

1. **Dados em produção:** Cenário A (drop limpo) ou Cenário C (preservar)? — §2.1
2. **Modelo de usuário:** manter `auth.User` (recomendado) ou criar custom `User` por e-mail? — §2.4
3. **Stack de testes:** adicionar `pytest`/`factory-boy` ou ficar com `django.test.TestCase` puro? — Fase 9
4. **Estratégia de branch:** uma branch única `v2-migration` ou uma por fase com PRs separados?
5. **Cutover:** janela de manutenção formal ou deploy direto aceitando ~5min de downtime?
6. **Reaproveitamento de nome:** `RegistrationPage` (v1) renomeada para `RegisterPage` (v2) ou criada como arquivo novo (recomendado)?

---

## 8. Perguntas/ambiguidades nas specs

1. **`Participant.has_team`** (specs/v2/models.md:18): "verifica se existe TeamMembership ativa". A spec não define "ativa" — o modelo `TeamMembership` não tem campo `active`. Interpretação assumida: existe linha em `TeamMembership` para esse participante. Confirmar.
2. **`TeamMembership` — uma membership ativa por participante** (specs/v2/models.md:47): tratar como `UniqueConstraint(fields=['participant'])`? Significa que sair da equipe deve `delete()` (não soft-delete).
3. **`HackathonInfo`** (specs/v2/api.md:154 e specs/v2/models.md): mencionado no endpoint `/info/` mas não está em `models.md`. Assumi schema simples: `(id, content, updated_at)` com singleton. Confirmar campos desejados (markdown? blocos estruturados?).
4. **`Notification`** (specs/v2/api.md:124-131): mencionado em endpoints e no email spec ("nunca um sem o outro") mas não está em `models.md`. Assumi schema: `(id, participant FK, type, message, read bool, created_at, link_to?)`. Confirmar se há campo de payload/contexto.
5. **`leave` quando líder é único membro:** specs/v2/models.md:75 diz "Se equipe ficar com 0 membros além do líder e líder sair, equipe é deletada". Ambíguo — se o líder é o único e sai, a equipe é deletada (ok) mas a frase fala de "0 membros além do líder" o que sugere que com 1 não-líder a liderança transfere e o líder sai. Confirmar lógica.
6. **DeadlineBanner** (specs/v2/frontend.md:59): "≤ 7 dias para 30/05" — calcular com base em `TEAM_DEADLINE` (vindo da API ou hardcoded no frontend?). Recomendo expor via `/api/v1/info/` ou em `/me/` para evitar duplicar no frontend.
7. **Bloqueio pós-deadline na criação de equipe:** specs/v2/tests.md:74-75 menciona `test_teams_cannot_be_created_after_deadline` mas a spec de API não fala disso explicitamente. Confirmo que deve bloquear `POST /teams/` após `TEAM_DEADLINE`.
8. **Idioma dos e-mails admin:** spec não explicita se há e-mail para o admin quando recebe notificação de equipe submitted. Assumi que não (admin vê via dashboard).
9. **Refresh token storage:** v1 usa `sessionStorage`. Manter? Para participantes, `localStorage` faz mais sentido (não querem deslogar ao fechar a aba). Decisão **[REQUER APROVAÇÃO]**.

---

**Próximo passo:** aguardo respostas das 6 decisões em §7 e das 9 ambiguidades em §8 antes de tocar em código.
