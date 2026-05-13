# API Endpoints

## Base URL
`/api/v1/`

## Público (sem autenticação)

### POST /api/v1/teams/
Cria uma equipe com seus participantes (nested write).
Body:
```json
{
  "name": "DevSquad",
  "title": "App de gestão de saúde",
  "proposal": "Texto descrevendo a proposta...",
  "participants": [
    {
      "full_name": "Ana Lima",
      "email": "ana@email.com",
      "phone": "19999999999",
      "ra": "23.00001-1",
      "github": "https://github.com/analima",
      "is_leader": true
    },
    { "full_name": "Bruno", "email": "b@x.com", "phone": "...", "ra": "...", "is_leader": false },
    { "full_name": "Carla", ... },
    { "full_name": "Diego", ... }
  ]
}
```
Resposta 201: equipe criada com status `pending`.
Resposta 400: validação falhou (< 4 participantes, > 1 líder, etc.).

### GET /api/v1/teams/{id}/
Retorna dados públicos de uma equipe (para página de confirmação).

## Admin (JWT obrigatório)

### POST /api/v1/auth/token/
Login. Body: `{ "username": "...", "password": "..." }`
Resposta: `{ "access": "...", "refresh": "..." }`

### POST /api/v1/auth/token/refresh/
Renova o access token.

### GET /api/v1/admin/teams/
Lista todas as equipes. Suporta filtro `?status=pending`.

### PATCH /api/v1/admin/teams/{id}/approve/
Aprova a equipe. Dispara e-mail. Retorna 400 se já houver 10 aprovadas.

### PATCH /api/v1/admin/teams/{id}/reject/
Recusa a equipe. Dispara e-mail.

## Permissões
- Endpoints `/admin/*` usam `IsAuthenticated` + grupo `Admin` ou `is_staff=True`.
- Endpoints públicos: sem autenticação, mas com rate limiting básico.