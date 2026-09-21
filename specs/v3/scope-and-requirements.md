# Escopo e Requisitos Funcionais — v3

**Versão:** 3.0 (Ecossistema Liga de TI)
**Status:** Draft — aguardando validação
**Autor:** Refatoração planejada em 2026-08

---

## 1. Visão

A plataforma da Liga de TI deixa de ser um site de Hackathon único e passa a ser um **ecossistema modular** capaz de suportar:

- Múltiplas edições do Hackathon
- Processo seletivo de novos membros da Liga
- Publicação e gestão de eventos diversos (workshops, meetups, palestras)
- Comunicação centralizada com participantes e membros
- Painel administrativo unificado para operar tudo acima

A v2 atendia a **1 evento único e hardcoded**. A v3 abstrai a noção de "evento" e permite ao admin criar/publicar novos eventos e processos seletivos sem intervenção de dev.

---

## 2. Atores

| Ator | Descrição | Autenticação |
|------|-----------|--------------|
| **Visitante** | Não autenticado. Consome landing pública e páginas de eventos abertos. | — |
| **Participante** | Cadastrado com e-mail + senha. Pode se inscrever em eventos e processos seletivos. | JWT via `/auth/token/` |
| **Membro da Liga** | Participante com `is_league_member=True`. Acesso a áreas internas. | Mesmo JWT, permissão adicional |
| **Coordenador** | Membro com `league_role='coordinator'`. Gere eventos e conteúdo. | JWT + validação de role |
| **Admin** | `league_role='admin'` + `is_staff=True`. Acesso total. | `/auth/admin/token/` |

**Decisão de modelagem:** um único modelo `Participant` (renomeado ou mantido) serve para todos. Diferenças resolvidas por flag e role.

---

## 3. Módulos

### 3.1 Accounts (`apps/accounts/`)
Base de identidade compartilhada por todos os módulos.

**Responsabilidades:**
- Cadastro público de participante (e-mail + senha)
- Login participante / login admin
- Perfil (dados pessoais, curso, bio, links)
- Gestão de membros da Liga (promover, rebaixar, listar)

**Novos campos em `Participant`:**
- `is_league_member: bool` — pertence à Liga (default False)
- `league_role: str` — `member | coordinator | admin` (nullable se não é membro)
- `joined_league_at: datetime` — quando entrou na Liga

### 3.2 Events (`apps/events/`)
Guarda-chuva de qualquer atividade organizada pela Liga.

**Modelo `Event`:**
- `id, slug, name, description`
- `kind: str` — `hackathon | selection | workshop | meetup | other`
- `status: str` — `draft | published | registration_open | in_progress | closed | archived`
- `starts_at, ends_at, registration_deadline`
- `location, is_online`
- `cover_image` (URL ou upload)
- `config: JSONField` — parâmetros específicos por kind
- `created_by: FK → Participant`
- `created_at, updated_at`

**Config por kind (validado por schema no serializer):**
- `hackathon`: `{team_size: 4, max_approved_teams: 10, allow_open_teams: true}`
- `selection`: `{max_applications: null, stages_enabled: true}`
- `workshop`: `{max_attendees, requires_registration}`

### 3.3 Hackathon (`apps/hackathon/`)
Renomeado de `apps/teams/`. Continua com toda a lógica de equipes, mas agora vinculado a um `Event`.

**Mudanças:**
- `Team.event: FK → Event` (obrigatório)
- `TEAM_DEADLINE` global some — substituído por `event.registration_deadline`
- `APPROVED_TEAMS_LIMIT` some — substituído por `event.config['max_approved_teams']`
- `HackathonInfo` removido — substituído por `Event.description` + `SiteContent`
- Admin pode ter múltiplos hackathons ativos simultaneamente

**Regras preservadas da v2:**
- Equipe com exatamente 4 membros (configurável via `event.config['team_size']`)
- Uma vez `submitted`, bloqueada
- Se líder sai (equipe em formação), liderança passa para membro mais antigo
- Notificação + e-mail sempre juntos
- `disband_incomplete_teams` — agora por evento e idempotente

### 3.4 Recruitment (`apps/recruitment/`) — **novo**
Processo seletivo de novos membros da Liga.

**Modelos:**

`SelectionProcess` (aponta pra `Event(kind=selection)`)
- `event: OneToOne → Event`
- `positions_available: int`
- `evaluation_criteria: text` (público)

`Application`
- `id, process, applicant, status` — `pending | in_review | advanced | rejected | approved`
- `submitted_at`
- `motivation_text, resume_url`

`SelectionStage`
- `id, process, order, name, description`
- `kind` — `form | interview | technical_test | group_dynamic`
- `starts_at, ends_at`

`StageEvaluation`
- `application, stage, evaluator (Participant)`
- `score` (opcional), `verdict` — `passed | failed | pending`
- `notes` (privado)

**Fluxo participante:**
1. Ver processo aberto na landing
2. Se inscrever (motivation + resume opcional)
3. Acompanhar status por etapa no dashboard
4. Receber notificação/e-mail em cada mudança

**Fluxo admin:**
1. Criar processo seletivo (define etapas)
2. Listar aplicações por status/etapa
3. Registrar avaliações
4. Avançar/reprovar candidatos
5. Aprovação final promove Participant → `is_league_member=True`

### 3.5 Notifications (`apps/notifications/`)
Sistema genérico de notificações in-app + e-mail.

**Refatoração:**
- `Notification.type` vira CharField livre (sem enum)
- Registry Python para associar tipo → email task:
  ```python
  # apps/notifications/registry.py
  notifications.register(
      'hackathon.team_approved',
      email_task=hackathon.emails.send_team_approved,
  )
  ```
- Emails específicos ficam no módulo que os originou (`apps/hackathon/emails.py`, `apps/recruitment/emails.py`)
- `notify()` continua criando Notification + enfileirando task via `on_commit`

### 3.6 Content (`apps/content/`)
Conteúdo público editável pelo admin.

**Modelo `SiteContent`:**
- `key: str` — `landing.hero_title`, `about.mission`, etc
- `value: text` (HTML seguro ou markdown)
- `event: FK → Event` (nullable — se null, é conteúdo global)
- `updated_at, updated_by`

Substitui `HackathonInfo` (que era singleton) por chave/valor arbitrário.

---

## 4. Requisitos Funcionais

### RF-01 — Público
- RF-01.1 Landing lista eventos e processos seletivos ativos
- RF-01.2 Página pública de cada evento (`/events/:slug`) com descrição, datas, botão de inscrição
- RF-01.3 Filtro de eventos por kind na landing
- RF-01.4 Página "Sobre a Liga" com conteúdo editável

### RF-02 — Participante
- RF-02.1 Cadastro (e-mail + senha + dados básicos)
- RF-02.2 Login por JWT com refresh
- RF-02.3 Edição de perfil
- RF-02.4 Dashboard mostra: eventos inscritos, notificações, ações pendentes
- RF-02.5 Ver histórico de eventos participados

### RF-03 — Hackathon (participante)
- RF-03.1 Criar equipe em hackathon ativo
- RF-03.2 Convidar participantes
- RF-03.3 Solicitar entrada em equipe aberta
- RF-03.4 Submeter equipe (bloqueia após submissão)
- RF-03.5 Sair de equipe (herdando liderança)

### RF-04 — Processo Seletivo (participante)
- RF-04.1 Se inscrever em processo aberto (motivation + resume)
- RF-04.2 Ver status atual da candidatura
- RF-04.3 Ver etapas do processo e progresso
- RF-04.4 Cancelar inscrição (antes de ser avaliado)

### RF-05 — Admin: Eventos
- RF-05.1 Listar todos os eventos (filtros: kind, status, período)
- RF-05.2 Criar evento via wizard (escolhe kind → form específico)
- RF-05.3 Editar evento (bloqueado se `in_progress` ou `closed`)
- RF-05.4 Publicar / despublicar
- RF-05.5 Arquivar evento antigo
- RF-05.6 Duplicar evento (útil pra próxima edição)

### RF-06 — Admin: Hackathon (por evento)
- RF-06.1 Listar equipes do evento (filtro por status)
- RF-06.2 Aprovar / recusar equipes submetidas
- RF-06.3 Ver detalhes de participantes
- RF-06.4 Executar `disband_incomplete_teams` manualmente
- RF-06.5 Ver estatísticas (# equipes por status, # participantes)

### RF-07 — Admin: Processo Seletivo (por evento)
- RF-07.1 Configurar etapas do processo
- RF-07.2 Listar aplicações (filtros: status, etapa atual)
- RF-07.3 Ver detalhes de candidato + histórico de avaliações
- RF-07.4 Registrar avaliação por etapa
- RF-07.5 Avançar candidato para próxima etapa
- RF-07.6 Reprovar candidato (com motivo opcional)
- RF-07.7 Aprovar candidato final → promove para membro da Liga
- RF-07.8 Exportar aplicações em CSV

### RF-08 — Admin: Participantes / Membros
- RF-08.1 Listar todos os participantes (busca por nome/curso/e-mail)
- RF-08.2 Listar apenas membros da Liga
- RF-08.3 Promover participante a membro (manual, além do fluxo do seletivo)
- RF-08.4 Alterar role de membro (member ↔ coordinator ↔ admin)
- RF-08.5 Remover membro da Liga

### RF-09 — Admin: Conteúdo
- RF-09.1 Editar conteúdo do site (chave/valor)
- RF-09.2 Preview antes de publicar

### RF-10 — Notificações
- RF-10.1 Notificação in-app criada em toda mudança relevante
- RF-10.2 E-mail transacional disparado junto (nunca um sem o outro)
- RF-10.3 Participante marca como lida
- RF-10.4 Admin pode disparar notificação manual (broadcast por evento)

---

## 5. Requisitos Não-Funcionais

- **RNF-01** Stack mantida: Django 5 + DRF + PostgreSQL / React 18 + TS + Vite
- **RNF-02** Autenticação continua JWT (Simple JWT)
- **RNF-03** E-mails via Resend em produção, console em dev
- **RNF-04** Celery para envio de e-mail (já existe)
- **RNF-05** Deploy Railway continua funcional (backend + frontend + Postgres)
- **RNF-06** Testes automatizados: pytest no backend, cobertura mínima 70% dos services
- **RNF-07** Migrations sempre geradas, nunca editadas manualmente
- **RNF-08** Sem quebra de contrato de API: rotas antigas do hackathon podem ser mantidas com aliases temporários
- **RNF-09** Componentes UI reutilizados do design system existente (v1/design.md)
- **RNF-10** Acessibilidade WCAG AA nos formulários novos
- **RNF-11** Frontend suporta mobile (breakpoint md como hoje)

---

## 6. Fora de escopo (v3)

Explicitamente **não** incluídos:

- Sistema de certificados de participação
- Módulo financeiro / sponsors / pagamentos
- Sistema de mentoria peer-to-peer
- Gamificação (badges, pontuação)
- App mobile nativo
- Integração com Discord/Slack para notificações
- Analytics / dashboards de métricas complexos
- Multi-tenant (outras ligas usando a plataforma)
- Internacionalização (fica só pt-BR)

---

## 7. Migração da v2

- **Dados em produção:** não existem (confirmado). Drop + recreate aceitável.
- **Specs v2:** mantidas em `specs/v2/` como histórico. Novo trabalho segue `specs/v3/`.
- **Rotas antigas:** `/api/v1/teams/`, `/api/v1/admin/teams/` etc. permanecem funcionando durante a transição, mas apontam para a estrutura nova (via aliases ou wrappers).
- **Frontend:** telas atuais do participante do hackathon continuam iguais para o usuário final — mudança é interna (contexto de evento).

---

## 8. Critérios de sucesso

Refatoração está pronta quando:

1. Admin consegue criar um novo evento Hackathon "Hackathon 2027" via UI sem tocar código
2. Admin consegue abrir um processo seletivo com 3 etapas via UI
3. Um participante consegue estar inscrito simultaneamente em hackathon + processo seletivo
4. Aprovação no seletivo promove automaticamente para membro da Liga
5. Suite de testes verde (`pytest` + `npm run build`)
6. Deploy Railway sobe sem intervenção manual
7. `disband_incomplete_teams --event-id=<id>` roda idempotente

---

## 9. Referências

- Plano de implementação: [`implementation-plan.md`](./implementation-plan.md)
- Design system (mantido): [`../v1/design.md`](../v1/design.md)
- Specs v2 (histórico): [`../v2/`](../v2/)
