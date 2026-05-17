# Frontend — v2

## Páginas e rotas

### Públicas (sem autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| / | LandingPage | Apresentação do hackathon + CTAs: "Cadastrar" e "Entrar" |
| /info | InfoPage | Aba de informações sobre o hackathon (conteúdo via API) |
| /register | RegisterPage | Formulário de cadastro do participante |
| /login | LoginPage | Login com e-mail e senha |

### Autenticadas (participante logado)

| Rota | Página | Descrição |
|------|--------|-----------|
| /dashboard | DashboardPage | Hub principal: perfil resumido, status de equipe, notificações |
| /profile | ProfilePage | Editar perfil (todos os campos) |
| /teams | TeamsPage | Explorar equipes abertas + botão "quero formar equipe" |
| /teams/new | CreateTeamPage | Criar nova equipe |
| /teams/:id | TeamDetailPage | Página da equipe: membros, ações de líder, submissão |
| /teams/:id/invites | InvitePage | Líder convida membros (busca participantes sem equipe) |

### Admin

| Rota | Página | Descrição |
|------|--------|-----------|
| /admin/login | AdminLoginPage | Login exclusivo admin |
| /admin/dashboard | AdminDashboardPage | Tabela de equipes submetidas, aprovar/recusar |

---

## Componentes novos necessários

### NotificationBell
- Ícone no header com badge de contagem de não lidas.
- Dropdown com lista das notificações recentes.
- Clique na notificação marca como lida e navega para contexto relevante.

### TeamCard
- Card de equipe para listagem em TeamsPage.
- Exibe: nome, líder, nº de membros/4, badge is_open.
- Botão "Solicitar entrada" se participante não tem equipe.

### ParticipantCard
- Card de participante para busca de convites.
- Exibe: nome, curso, semestre, bio resumida, links GitHub/LinkedIn.
- Botão "Convidar" (apenas para líder).

### StatusBanner
- Banner no DashboardPage mostrando status da equipe.
- Sem equipe: opções "Criar equipe" e "Explorar equipes abertas".
- Em formação: progresso de membros (ex: 2/4), botão submeter (se 4 membros).
- Submetida: aguardando análise — ações bloqueadas.
- Aprovada/Recusada: resultado com destaque visual.

### DeadlineBanner
- Banner global (visível em todas as páginas autenticadas) quando
  faltarem ≤ 7 dias para 30/05. Exibe contagem regressiva.
- Desaparece após o deadline.

---

## Fluxos principais

### Cadastro e login
1. /register → preenche dados → POST /auth/register/ → redireciona para /dashboard
2. /login → credenciais → POST /auth/token/ → redireciona para /dashboard

### Criar equipe
1. /dashboard → "Criar equipe" → /teams/new
2. Preenche nome, define is_open → POST /teams/ → redireciona para /teams/:id

### Convidar membro
1. /teams/:id → "Convidar membro" → /teams/:id/invites
2. Busca participante por nome → clica "Convidar" → POST /teams/:id/invites/
3. Participante recebe e-mail + notificação na plataforma

### Aceitar/recusar convite
1. Notificação no dashboard ou e-mail → /dashboard
2. NotificationBell mostra convite pendente
3. Clica "Aceitar" ou "Recusar" → POST /me/invites/:id/accept/ ou /decline/

### Solicitar entrada em equipe aberta
1. /teams → explora lista de equipes abertas → clica TeamCard
2. "Solicitar entrada" → POST /teams/:id/join-requests/
3. Líder recebe notificação + e-mail

### Submeter equipe
1. /teams/:id → StatusBanner mostra 4/4 membros
2. Botão "Submeter para análise" → confirmação modal
3. POST /teams/:id/submit/ → status muda para submitted
4. Ações de membership bloqueadas visualmente

### Botão "não tenho equipe, mas quero formar uma"
- Visível em TeamsPage para participantes sem equipe.
- Redireciona para link fixo do WhatsApp (VITE_WHATSAPP_LINK no .env).

---

## ViewModels (hooks) novos/alterados

```
src/hooks/
├── useAuth.ts              ← register, login, logout, me
├── useProfile.ts           ← GET/PATCH /me/
├── useTeams.ts             ← lista equipes abertas
├── useTeam.ts              ← detalhe, submit, leave, remove member
├── useCreateTeam.ts        ← POST /teams/
├── useInvites.ts           ← lista convites, aceitar, recusar
├── useJoinRequests.ts      ← lista pedidos (líder), aceitar, recusar
├── useSendInvite.ts        ← busca participantes, envia convite
├── useNotifications.ts     ← lista, mark as read, polling a cada 30s
└── useAdminDashboard.ts    ← igual v1, agora só equipes submitted
```

---

## Variáveis de ambiente adicionais

```
VITE_WHATSAPP_LINK=https://chat.whatsapp.com/...
```

---

## O que remover da v1
- RegistrationPage (formulário multi-step de inscrição de equipe)
- ConfirmationPage
- useTeamRegistration.ts
- useTeamConfirmation.ts
- Rota /confirmacao/:id