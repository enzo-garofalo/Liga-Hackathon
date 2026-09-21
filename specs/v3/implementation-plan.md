# Plano de Implementação — v3

**Versão:** 3.0
**Referência:** [`scope-and-requirements.md`](./scope-and-requirements.md)
**Estratégia:** 6 PRs pequenos e incrementais, cada um mergeable independentemente.

---

## Visão geral da sequência

| PR  | Título                                    | Escopo               | Risco  | Testes |
|-----|-------------------------------------------|----------------------|--------|--------|
| 1   | Reorganização de apps + Accounts          | Backend              | Baixo  | Refactor de fixtures |
| 2   | Notifications + Content genéricos         | Backend              | Médio  | Novos testes de registry |
| 3   | Módulo Events                             | Backend + API        | Alto   | Novos testes + refactor hackathon |
| 4   | Admin dashboard modular                   | Frontend             | Médio  | Manual + build |
| 5   | Módulo Recruitment                        | Backend + Frontend   | Alto   | Novos testes completos |
| 6   | Landing pública + navegação de eventos    | Frontend             | Baixo  | Manual |

**Duração estimada:** 4-6 semanas em ritmo constante (1 PR / semana em média, PR 5 pode consumir 2 semanas).

---

## PR 1 — Reorganização de apps + Accounts

### Objetivo
Preparar o terreno separando identidade (Participant, auth) do hackathon.

### Mudanças no backend

**Estrutura:**
```
backend/apps/
  accounts/          ← NOVO (Participant + auth movidos pra cá)
    models.py        ← Participant + is_league_member + league_role
    serializers.py   ← Register, Login, Me, Profile
    services/
      auth.py
      membership.py  ← promote_to_member, change_role
    views.py
    urls.py
    admin.py
    tests/
  hackathon/         ← RENOMEADO de apps/teams/
    models.py        ← Team, TeamMembership, TeamInvite, JoinRequest, HackathonInfo (temporário)
    services/teams.py
    views.py
    urls.py
    emails.py
    tasks.py
    admin.py
    management/commands/
    tests/
```

**Modelo `Participant` (em accounts/models.py):**
```python
class LeagueRole(models.TextChoices):
    MEMBER = 'member', 'Membro'
    COORDINATOR = 'coordinator', 'Coordenador'
    ADMIN = 'admin', 'Administrador'

class Participant(models.Model):
    # ... campos existentes ...
    is_league_member = models.BooleanField(default=False)
    league_role = models.CharField(
        max_length=20, choices=LeagueRole.choices,
        blank=True, null=True
    )
    joined_league_at = models.DateTimeField(null=True, blank=True)
```

**Auth admin:** `AdminTokenObtainPairSerializer` agora valida `is_staff=True OR (is_league_member AND league_role in ['coordinator', 'admin'])`.

### Endpoints movidos (sem mudança de contrato)
- `/api/v1/auth/*` → tratados por `apps.accounts.urls`
- `/api/v1/me/*` → `apps.accounts.urls`
- `/api/v1/participants/` → `apps.accounts.urls`
- `/api/v1/teams/*` → continuam em `apps.hackathon.urls`
- `/api/v1/admin/participants/` → `apps.accounts.urls`
- `/api/v1/admin/teams/*` → `apps.hackathon.urls`

### Migration
Drop tudo, recreate limpo (não há dados em prod).

### Frontend
- Zero mudança. Só ajustar imports em `api/*` se algum path mudar (não deve).

### Testes
- Mover `test_views_auth.py` → `apps/accounts/tests/`
- Ajustar `factories.py`: importar de `apps.accounts` ao invés de `apps.teams`
- Rodar suite completa

### Critério de aceite
- [ ] `python manage.py check` sem erros
- [ ] `pytest` verde
- [ ] `python manage.py runserver` sobe
- [ ] Frontend continua funcionando (build + login manual)
- [ ] `is_league_member` visível no Django admin

---

## PR 2 — Notifications + Content genéricos

### Objetivo
Desacoplar sistema de notificações do hackathon para que outros módulos possam usá-lo.

### Novo módulo `apps/notifications/`

**Modelos** (movidos e refatorados):
```python
class Notification(models.Model):
    id = UUIDField(...)
    participant = FK → Participant
    type = CharField(max_length=50)  # ← sem choices, livre
    message = TextField()
    read = BooleanField(default=False)
    link_to = CharField(max_length=255, blank=True)
    metadata = JSONField(default=dict, blank=True)  # ← contexto adicional
    created_at, read_at
```

**Registry** (`apps/notifications/registry.py`):
```python
_REGISTRY: dict[str, callable] = {}

def register(notification_type: str, *, email_task):
    """Registra qual Celery task envia o email para este tipo."""
    _REGISTRY[notification_type] = email_task

def get_email_task(notification_type: str):
    return _REGISTRY.get(notification_type)
```

**Service `notify()`** (`apps/notifications/services.py`):
```python
def notify(participant, notification_type, message, *, link_to='', metadata=None, **email_kwargs):
    notification = Notification.objects.create(...)
    task = get_email_task(notification_type)
    if task:
        transaction.on_commit(lambda: task.delay(participant_id=participant.pk, **email_kwargs))
    return notification
```

**Registro em cada módulo** (via `apps.py`):
```python
# apps/hackathon/apps.py
class HackathonConfig(AppConfig):
    def ready(self):
        from apps.notifications.registry import register
        from apps.hackathon import tasks
        register('hackathon.team_invite', email_task=tasks.send_invite_received)
        # ... etc
```

**Constantes** (em cada módulo):
```python
# apps/hackathon/notifications.py
TEAM_INVITE = 'hackathon.team_invite'
TEAM_APPROVED = 'hackathon.team_approved'
# ...
```

### Novo módulo `apps/content/`

**Modelo:**
```python
class SiteContent(models.Model):
    key = CharField(max_length=100)
    value = TextField()
    event = FK → Event (null=True, blank=True)  # criado no PR 3
    updated_at, updated_by

    class Meta:
        constraints = [UniqueConstraint(fields=['key', 'event'], name='unique_content_key_per_event')]
```

**No PR 2** ainda não temos Event, então:
- Criar `SiteContent` sem o FK de event
- FK de event adicionado no PR 3

### Migração
- Migrar `Notification` de `apps.hackathon` → `apps.notifications` (drop+recreate)
- Migrar dados de `HackathonInfo` → `SiteContent(key='hackathon.info')` (via seed, não migration — não tem dados prod)

### Critério de aceite
- [ ] Testes de notification passam com o registry novo
- [ ] Email do hackathon (`team_approved`) continua sendo enviado corretamente
- [ ] `SiteContent` editável no Django admin
- [ ] `HackathonInfoView` continua respondendo (agora lê de `SiteContent`)

---

## PR 3 — Módulo Events

### Objetivo
Introduzir `Event` como entidade central. Hackathon vira uma instância de Event.

### Novo módulo `apps/events/`

**Modelo `Event`:**
```python
class EventKind(models.TextChoices):
    HACKATHON = 'hackathon'
    SELECTION = 'selection'
    WORKSHOP = 'workshop'
    MEETUP = 'meetup'
    OTHER = 'other'

class EventStatus(models.TextChoices):
    DRAFT = 'draft'
    PUBLISHED = 'published'
    REGISTRATION_OPEN = 'registration_open'
    IN_PROGRESS = 'in_progress'
    CLOSED = 'closed'
    ARCHIVED = 'archived'

class Event(models.Model):
    id = UUIDField(primary_key=True)
    slug = SlugField(unique=True)
    name = CharField(max_length=255)
    description = TextField(blank=True)
    kind = CharField(max_length=20, choices=EventKind.choices)
    status = CharField(max_length=30, choices=EventStatus.choices, default='draft')
    starts_at = DateTimeField(null=True, blank=True)
    ends_at = DateTimeField(null=True, blank=True)
    registration_deadline = DateTimeField(null=True, blank=True)
    location = CharField(max_length=255, blank=True)
    is_online = BooleanField(default=False)
    cover_image_url = URLField(blank=True)
    config = JSONField(default=dict)
    created_by = FK → Participant (on_delete=PROTECT)
    created_at, updated_at
```

**Config validation** (`apps/events/config_schemas.py`):
```python
HACKATHON_CONFIG_SCHEMA = {
    'team_size': {'type': 'int', 'default': 4, 'min': 2, 'max': 10},
    'max_approved_teams': {'type': 'int', 'default': 10, 'min': 1},
    'allow_open_teams': {'type': 'bool', 'default': True},
}

SELECTION_CONFIG_SCHEMA = {
    'positions_available': {'type': 'int', 'required': True},
    'stages_enabled': {'type': 'bool', 'default': True},
}

def validate_config(kind: str, config: dict) -> dict:
    """Retorna config validada e com defaults preenchidos."""
```

### Mudanças em `apps/hackathon/`

**Model:**
```python
class Team(models.Model):
    # ...
    event = FK → Event (on_delete=PROTECT)  # ← NOVO
    # remover nada
```

**Services:**
- `submit_team`: valida `member_count == team.event.config['team_size']`
- `approve_team`: valida `approved_count < team.event.config['max_approved_teams']`
- `assert_deadline_not_passed(event)`: usa `event.registration_deadline`
- Remover `APPROVED_TEAMS_LIMIT` constante

**Management command:**
- `disband_incomplete_teams --event-id=<uuid>` (opcional; default: todos eventos hackathon com `registration_deadline` passado)

### Novos endpoints

```
GET    /api/v1/events/                          Lista eventos públicos
GET    /api/v1/events/:slug/                    Detalhe público
POST   /api/v1/events/:slug/register/           Inscrição (validação por kind)

GET    /api/v1/admin/events/                    Lista todos (staff)
POST   /api/v1/admin/events/                    Cria
PATCH  /api/v1/admin/events/:id/                Edita
POST   /api/v1/admin/events/:id/publish/        Muda status
POST   /api/v1/admin/events/:id/archive/
POST   /api/v1/admin/events/:id/duplicate/      Cria novo evento clone
```

### Rotas antigas (compatibilidade)
- `/api/v1/teams/` → precisa receber `event_id` no query (ou default para hackathon ativo)
- `/api/v1/admin/teams/?event_id=<uuid>` — se omitido, usa hackathon ativo mais recente

**Regra:** se existir só 1 evento hackathon ativo, endpoints antigos continuam funcionando sem query param.

### Frontend (mínimo neste PR)
- Adicionar `EventContext` que resolve o hackathon ativo
- Passar `event_id` nas requests admin de teams
- Sem UI nova ainda (fica pro PR 4)

### Migration
Drop + recreate. Seed cria:
```python
Event(
    slug='hackathon-2026',
    name='Hackathon 2026',
    kind='hackathon',
    status='registration_open',
    registration_deadline=date(2026, 5, 30),
    config={'team_size': 4, 'max_approved_teams': 10, 'allow_open_teams': True},
)
```

### Critério de aceite
- [ ] `python manage.py shell` consegue criar 2 eventos hackathon
- [ ] Aprovar equipes em cada evento respeita limite próprio
- [ ] Frontend do participante continua funcionando (usa evento ativo)
- [ ] Django admin lista/edita Event
- [ ] Testes: `test_event_config_validation.py`, `test_team_event_relation.py`

---

## PR 4 — Admin dashboard modular (frontend)

### Objetivo
Refatorar `/admin/*` para suportar múltiplos módulos e wizard de criação de eventos.

### Nova estrutura de rotas

```
/admin/dashboard              → Overview (contadores por módulo)
/admin/events                 → Lista de todos eventos
/admin/events/new             → Wizard de criação
/admin/events/:id             → Detalhe do evento (abas contextuais)
/admin/events/:id/teams       → (kind=hackathon) equipes
/admin/events/:id/applications → (kind=selection) candidatos
/admin/participants           → Todos os participantes
/admin/members                → Membros da Liga
/admin/content                → Editor de SiteContent
/admin/notifications          → Broadcasts manuais
```

### Componentes

**`AdminLayout.tsx`** (novo)
- Sidebar fixa com navegação por módulo
- Header com user + logout
- `<Outlet />` para conteúdo

**`AdminSidebar.tsx`** (novo)
- Links: Eventos, Participantes, Membros, Conteúdo, Notificações
- Highlight na rota ativa

**`EventsListPage.tsx`** (novo)
- Filtros: kind, status
- Cards de evento com CTA "Gerenciar"

**`EventWizardPage.tsx`** (novo)
- Step 1: kind (radio grande visual)
- Step 2: dados básicos (name, dates, description)
- Step 3: config específica (schema dinâmico por kind)
- Step 4: preview + confirmar

**`EventDetailPage.tsx`** (novo)
- Header com nome, status, ações (publicar, arquivar, duplicar)
- Tabs dinâmicas por kind:
  - Hackathon: Equipes | Estatísticas | Configurações
  - Selection: Candidatos | Etapas | Estatísticas | Configurações

**Refactor de hooks:**
- Deletar `useAdminDashboard.ts`
- Criar `useEvents.ts`, `useEvent.ts`, `useEventTeams.ts`, `useEventApplications.ts`, `useAdminParticipants.ts`, `useAdminMembers.ts`

### Design system
- Reusar `Button`, `Badge`, `Input`, `Select` existentes
- Novo componente `<Wizard>` para os steps
- Novo componente `<EventStatusBadge>` (mapeia status → cor)

### Critério de aceite
- [ ] Admin consegue navegar entre módulos sem reload
- [ ] Wizard cria novo hackathon end-to-end
- [ ] Wizard cria novo processo seletivo (mesmo sem UI de candidatos ainda)
- [ ] Duplicar evento gera clone editável
- [ ] Build passa: `npm run build`

---

## PR 5 — Módulo Recruitment

### Objetivo
Implementar processo seletivo completo (backend + frontend do candidato + frontend do avaliador).

### Backend `apps/recruitment/`

**Modelos:**
```python
class SelectionProcess(models.Model):
    id = UUIDField(primary_key=True)
    event = OneToOne → Event (kind=selection, on_delete=CASCADE)
    positions_available = PositiveIntegerField()
    evaluation_criteria = TextField(blank=True)

class ApplicationStatus(TextChoices):
    PENDING = 'pending'
    IN_REVIEW = 'in_review'
    ADVANCED = 'advanced'
    REJECTED = 'rejected'
    APPROVED = 'approved'
    CANCELLED = 'cancelled'

class Application(models.Model):
    id = UUIDField(primary_key=True)
    process = FK → SelectionProcess
    applicant = FK → Participant
    status = CharField(choices=ApplicationStatus.choices, default='pending')
    current_stage = FK → SelectionStage (null=True)
    motivation_text = TextField()
    resume_url = URLField(blank=True)
    submitted_at = DateTimeField(auto_now_add=True)
    finalized_at = DateTimeField(null=True)

    class Meta:
        constraints = [UniqueConstraint(fields=['process', 'applicant'], name='unique_application')]

class StageKind(TextChoices):
    FORM = 'form'
    INTERVIEW = 'interview'
    TECHNICAL_TEST = 'technical_test'
    GROUP_DYNAMIC = 'group_dynamic'

class SelectionStage(models.Model):
    id = UUIDField(primary_key=True)
    process = FK → SelectionProcess
    order = PositiveSmallIntegerField()
    name = CharField(max_length=100)
    description = TextField(blank=True)
    kind = CharField(choices=StageKind.choices)
    starts_at, ends_at = DateTimeField(null=True)

    class Meta:
        ordering = ['order']
        constraints = [UniqueConstraint(fields=['process', 'order'], name='unique_stage_order')]

class EvaluationVerdict(TextChoices):
    PASSED = 'passed'
    FAILED = 'failed'
    PENDING = 'pending'

class StageEvaluation(models.Model):
    id = UUIDField(primary_key=True)
    application = FK → Application
    stage = FK → SelectionStage
    evaluator = FK → Participant
    verdict = CharField(choices=EvaluationVerdict.choices, default='pending')
    score = PositiveSmallIntegerField(null=True, blank=True)
    notes = TextField(blank=True)  # privado
    created_at, updated_at
```

**Services (`apps/recruitment/services/applications.py`):**
- `submit_application(process, applicant, ...)`
- `cancel_application(application, actor)` (só se pending)
- `advance_to_next_stage(application, evaluator)`
- `reject_application(application, evaluator, reason)`
- `approve_finalist(application, evaluator)` → `participant.is_league_member = True`

**Endpoints:**
```
# Público / participante
GET    /api/v1/selections/                          Lista processos ativos
GET    /api/v1/selections/:event_slug/              Detalhe (incl. stages)
POST   /api/v1/selections/:event_slug/apply/        Inscrição
GET    /api/v1/me/applications/                     Minhas candidaturas
POST   /api/v1/me/applications/:id/cancel/

# Admin
GET    /api/v1/admin/selections/:event_id/applications/          List (com filtros)
GET    /api/v1/admin/selections/:event_id/applications/:id/      Detalhe + evaluations
POST   /api/v1/admin/selections/:event_id/applications/:id/advance/
POST   /api/v1/admin/selections/:event_id/applications/:id/reject/
POST   /api/v1/admin/selections/:event_id/applications/:id/approve/
POST   /api/v1/admin/selections/:event_id/applications/:id/evaluate/  Cria/atualiza StageEvaluation
GET    /api/v1/admin/selections/:event_id/applications/export/       CSV

POST   /api/v1/admin/selections/:event_id/stages/                Cria etapa
PATCH  /api/v1/admin/selections/:event_id/stages/:id/
DELETE /api/v1/admin/selections/:event_id/stages/:id/
```

### Emails
- `send_application_received` → participante
- `send_application_advanced` → participante
- `send_application_rejected` → participante
- `send_application_approved` → participante (welcome to Liga!)
- `send_new_application_alert` → coordenadores (opcional, se `notify_on_new_application` na config)

### Frontend

**Novo — Participante:**
- `SelectionsListPage` (`/selecoes`)
- `SelectionDetailPage` (`/selecoes/:slug`) com botão "Candidatar-se"
- `ApplicationFormPage` (`/selecoes/:slug/candidatar`)
- `MyApplicationsPage` (adicionar tab no dashboard)

**Novo — Admin (dentro de `/admin/events/:id`):**
- `ApplicationsTab` — tabela com filtros, busca
- `ApplicationDetailModal` — histórico de etapas + form de avaliação
- `StagesConfigTab` — CRUD de etapas

### Testes
- `test_application_flow.py`: submeter → avaliar → aprovar
- `test_stage_ordering.py`
- `test_approval_promotes_to_member.py`
- `test_permissions.py`: só evaluator autorizado

### Critério de aceite
- [ ] Candidato consegue se inscrever e ver status
- [ ] Admin configura 3 etapas
- [ ] Admin avalia candidato em cada etapa
- [ ] Aprovação final define `participant.is_league_member=True`
- [ ] Emails disparam em cada mudança
- [ ] Export CSV funciona

---

## PR 6 — Landing pública + navegação de eventos

### Objetivo
Atualizar frontend público para refletir o ecossistema (não só o hackathon).

### Mudanças

**Landing (`/`)**
- Hero configurável via `SiteContent(key='landing.hero_*')`
- Seção "Eventos Ativos" — cards de eventos com `status in [published, registration_open]`
- Seção "Sobre a Liga" — de `SiteContent(key='landing.about')`
- Footer com links institucionais

**Página de evento (`/events/:slug`)**
- Header com cover_image, nome, datas, location
- Descrição rica
- Botão de ação contextual por kind:
  - hackathon aberto: "Criar equipe" ou "Ver equipes abertas"
  - selection aberto: "Candidatar-se"
  - workshop: "Inscrever-se"
- Se participante já inscrito, mostra status

**Menu público**
- Home | Hackathon (link direto pro ativo, ou lista) | Processo Seletivo | Sobre | Entrar

### Componentes novos
- `EventCard` (público)
- `EventCTAButton` (resolve label + action por kind + status)
- `PublicHeader` (diferente do `Header` autenticado)
- `PublicFooter`

### Critério de aceite
- [ ] Landing mostra eventos ativos dinamicamente
- [ ] Cada evento tem página pública funcional
- [ ] Navegação pública clara entre módulos
- [ ] Responsivo mobile
- [ ] Build passa

---

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Refatoração quebra JWT existente | Login para de funcionar | PR 1: manter mesma URL do endpoint, mesmo serializer, só mover de módulo |
| Config JSON de Event divergir do esperado | Bugs silenciosos | Schema validator obrigatório no serializer + testes |
| `is_league_member` bypass em endpoints admin | Acesso indevido | Custom permission class + testes de autorização em todos endpoints admin |
| Frontend admin fica quebrado durante PR 4 | Admin não consegue operar | Manter rota `/admin/dashboard` antiga funcional até PR 4 completar |
| Registry de notifications não carregar tasks | Emails não disparam | Test que verifica `_REGISTRY` populado após `django.setup()` |
| Suite de testes fica lenta com múltiplos módulos | Feedback lento | Marcar testes de integração com `@pytest.mark.slow` |
| Migração de rotas antigas quebra frontend | Regressão silenciosa | Manter compat layer com `event_id` opcional (usa hackathon ativo) |

---

## Ordem de execução recomendada

1. Criar branch `refactor/v3-ecosystem-base`
2. **PR 1** → merge em `main`
3. Deploy staging, testar login/dashboard
4. **PR 2** → merge
5. **PR 3** → merge (marco importante: multi-eventos funcional)
6. **PR 4** → merge (admin modular)
7. **PR 5** → merge (recruitment completo)
8. **PR 6** → merge (landing pública)
9. Deploy produção
10. Retrospectiva + docs finais

**Não pular ordem.** Cada PR assume os anteriores mergeados.

---

## Convenções

- Commits: seguir padrão atual (`feat:`, `fix:`, `refactor:`, `docs:`)
- Um PR = um escopo. Se precisar dividir, criar sub-PR.
- Sempre atualizar specs em `specs/v3/` conforme decisões forem tomadas
- Testes antes de merge: `pytest && npm run build`
- Migrations sempre com `makemigrations --dry-run` + review manual
- Comentários em pt-BR quando necessário (raro, código deve ser autoexplicativo)

---

## Checklist final de conclusão

Depois dos 6 PRs, verificar:

- [ ] `python manage.py check` sem warnings
- [ ] `pytest` cobertura mínima nos services novos
- [ ] `npm run build` sem erros
- [ ] Django admin lista todos os novos modelos
- [ ] Deploy Railway sobe sem intervenção
- [ ] README atualizado com nova estrutura
- [ ] Specs v3 marcadas como "current"
- [ ] `CLAUDE.md` atualizado apontando para v3
- [ ] Seed demo cria: 1 hackathon + 1 processo seletivo + participantes de teste

---

## Referências

- Escopo funcional: [`scope-and-requirements.md`](./scope-and-requirements.md)
- Specs v2 (referência histórica): [`../v2/`](../v2/)
- Design system: [`../v1/design.md`](../v1/design.md)
