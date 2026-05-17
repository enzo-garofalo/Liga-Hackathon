# API Endpoints — v2

## Base URL
`/api/v1/`

---

## Autenticação de participantes

### POST /api/v1/auth/register/
Cadastro de novo participante. Cria User + Participant em uma operação.
Body:
```json
{
  "email": "ana@email.com",
  "password": "...",
  "full_name": "Ana Lima",
  "course": "Ciência da Computação",
  "semester": 4,
  "github": "https://github.com/ana",
  "linkedin": "https://linkedin.com/in/ana",
  "bio": "Experiência com Python e React..."
}
```
Resposta 201: dados do participante criado (sem senha).
Resposta 400: e-mail já cadastrado, campos obrigatórios faltando.

### POST /api/v1/auth/token/
Login do participante. Body: `{ "email": "...", "password": "..." }`
Resposta: `{ "access": "...", "refresh": "..." }`

### POST /api/v1/auth/token/refresh/
Renova o access token.

### POST /api/v1/auth/admin/token/
Login exclusivo para admins. Mesmo formato, mas valida is_staff=True.

---

## Participante (autenticado)

### GET /api/v1/me/
Retorna perfil do participante autenticado + has_team.

### PATCH /api/v1/me/
Atualiza perfil (todos os campos exceto email e senha).

### GET /api/v1/participants/
Lista participantes sem equipe (para líder convidar).
Suporta ?search= por nome.

---

## Equipes

### POST /api/v1/teams/
Cria equipe. O criador vira líder automaticamente e entra como membro.
Body: `{ "name": "DevSquad", "is_open": false }`
Resposta 400: participante já tem equipe.

### GET /api/v1/teams/
Lista equipes com is_open=True e status=forming (para participantes sem equipe explorarem).

### GET /api/v1/teams/{id}/
Detalhe público da equipe: nome, líder, membros, status, is_open.

### PATCH /api/v1/teams/{id}/
Atualiza nome e is_open. Apenas o líder pode alterar.

### POST /api/v1/teams/{id}/submit/
Submete equipe para análise. Apenas líder. Valida exatamente 4 membros.
Após submissão: status → submitted, is_open → False, membership bloqueada.
Resposta 400: membros != 4 ou status != forming.

### DELETE /api/v1/teams/{id}/leave/
Participante sai da equipe. Proibido se status=submitted.
Se for o líder saindo: liderança passa para membro com menor joined_at.
Se equipe ficar vazia: equipe é deletada.

### DELETE /api/v1/teams/{id}/members/{participant_id}/
Líder remove um membro. Proibido se status=submitted.

---

## Convites (TeamInvite)

### POST /api/v1/teams/{id}/invites/
Líder convida um participante.
Body: `{ "invitee_id": "uuid" }`
Valida: invitee não tem equipe, equipe tem < 4 membros, status=forming.
Dispara: e-mail para o convidado + notificação na plataforma.
Resposta 400: participante já tem equipe ou convite já existe.

### GET /api/v1/me/invites/
Lista convites pendentes do participante autenticado.

### POST /api/v1/me/invites/{id}/accept/
Aceita o convite. Cria TeamMembership. Cancela outros convites pendentes do mesmo participante.

### POST /api/v1/me/invites/{id}/decline/
Recusa o convite.

---

## Pedidos de entrada (JoinRequest)

### POST /api/v1/teams/{id}/join-requests/
Participante sem equipe solicita entrada em equipe aberta.
Valida: team.is_open=True, team.status=forming, equipe com < 4 membros.
Dispara: notificação na plataforma para o líder + e-mail para o líder.

### GET /api/v1/teams/{id}/join-requests/
Lista pedidos pendentes da equipe. Apenas líder.

### POST /api/v1/teams/{id}/join-requests/{id}/accept/
Líder aceita. Cria TeamMembership.

### POST /api/v1/teams/{id}/join-requests/{id}/decline/
Líder recusa.

---

## Notificações

### GET /api/v1/me/notifications/
Lista notificações do participante. Campos: id, type, message, read, created_at.
Types: team_invite, join_request (para líder), invite_accepted, invite_declined,
       join_accepted, join_declined, team_submitted, team_approved, team_rejected.

### PATCH /api/v1/me/notifications/{id}/read/
Marca notificação como lida.

---

## Admin (is_staff=True)

### GET /api/v1/admin/teams/
Lista equipes com status=submitted. Suporta ?status= para outros filtros.

### PATCH /api/v1/admin/teams/{id}/approve/
Aprova. Máximo 10 equipes aprovadas. Dispara e-mail para todos os membros.

### PATCH /api/v1/admin/teams/{id}/reject/
Recusa. Dispara e-mail para todos os membros.

### GET /api/v1/admin/participants/
Lista todos os participantes.

---

## Informações do hackathon

### GET /api/v1/info/
Retorna objeto configurável com textos da aba de informações.
Conteúdo gerenciado via Django Admin (model HackathonInfo).