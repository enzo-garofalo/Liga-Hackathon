# API Endpoints — v3 (Processo Seletivo)

## Base URL
`/api/v1/`

Endpoints do hackathon (v2) continuam existindo sem alteração. Os endpoints abaixo são
adicionados pelo app `recruitment` e registrados em `core/urls.py` com
`path('api/v1/', include('apps.recruitment.urls'))`.

## Autenticação

Reaproveitada da v2 sem mudanças:
- `POST /api/v1/auth/register/` — cadastro (cria User + Participant)
- `POST /api/v1/auth/token/` — login do candidato
- `POST /api/v1/auth/token/refresh/` — renova access token
- `POST /api/v1/auth/admin/token/` — login do organizador (valida `is_staff=True`)

Candidato usa os endpoints em `/processes/` e `/me/`; organizador usa `/admin/`.
Todo endpoint sob `/admin/` exige `is_staff=True`.

---

# Área do candidato

## GET /api/v1/open-process/
**Aberto, sem autenticação.** Alimenta a landing com o período de inscrições do processo
publicado. Devolve `{ name, registration_start, registration_end, registration_open }`,
ou `null` quando não há processo publicado — a landing então omite as datas em vez de
tratar erro. Serializer próprio: não expõe escala de nota, limiar de divergência nem
contadores (decisions.md §21).

## GET /api/v1/processes/
Lista processos com `status=published`. Usado em "Processos disponíveis".

Resposta 200:
```json
[
  {
    "id": "uuid",
    "name": "Processo Seletivo Liga de TI 2026.2",
    "short_description": "Venha fazer parte da Liga de TI...",
    "banner": "https://.../banner.png",
    "registration_start": "2026-08-01T00:00:00Z",
    "registration_end": "2026-08-15T23:59:00Z",
    "registration_open": true,
    "stage_count": 3,
    "already_applied": false
  }
]
```

`registration_open` é calculado: `status=published` e agora dentro do período.
`already_applied` indica se o candidato autenticado já tem candidatura neste processo.

## GET /api/v1/processes/{id}/
Detalhe público do processo ("Ver detalhes do processo"). Inclui `description` completa e
a lista de etapas (nome, descrição e ordem — sem critérios de avaliação, que são internos).

Resposta 404 se `status=draft`.

## POST /api/v1/processes/{id}/apply/
Cria a candidatura do participante autenticado. Sem body. Resposta 201 com a candidatura.

Validações:
- `process.status == published` — senão 400.
- Agora dentro de `registration_start`..`registration_end` — senão 400 "inscrições encerradas".
- Participante ainda não tem candidatura neste processo — senão 400.

Efeitos: `status=in_progress`, `current_stage` = etapa de menor `order`,
`submitted_at=now`. Dispara e-mail + notificação `application_confirmed`.

## GET /api/v1/me/applications/
Lista as candidaturas do participante autenticado ("Meus processos").
Campos: processo (nome, datas), `status`, `current_stage`, `updated_at`.

## GET /api/v1/me/applications/{id}/
Detalhe da candidatura ("Ver candidatura"). Inclui a linha do tempo das etapas, marcando
qual já passou, qual é a atual e quais faltam, além dos entregáveis enviados por etapa.

**Não retorna notas nem observações dos avaliadores** — avaliação é interna. O candidato vê
apenas status e etapa.

## POST /api/v1/me/applications/{id}/deliverables/
Upload de entregável da etapa atual. `multipart/form-data` com `file`.

Validações:
- Candidatura pertence ao participante autenticado — senão 403.
- `current_stage.allows_file_upload=True` — senão 400.
- Extensão em `stage.allowed_file_types` — senão 400.
- Quantidade de arquivos da etapa < `stage.max_files` — senão 400.
- Agora <= `stage.end_at`, exceto se `stage.accepts_late_submission=True` — senão 400.

Validação adicional: tamanho do arquivo até `MAX_UPLOAD_BYTES` (padrão 10 MB) — o
endpoint é aberto a qualquer candidato autenticado.

Resposta 201 traz `filename`, `size` e `download_url`.

## DELETE /api/v1/me/applications/{id}/deliverables/{deliverable_id}/
Remove um entregável. Só antes de `stage.end_at` e só o dono.

## GET /api/v1/deliverables/{id}/download/
Baixa o arquivo. Permitido ao dono da candidatura e a qualquer organizador
(`is_staff`) — 403 para os demais, 401 sem autenticação.

Os arquivos **não são servidos por URL pública**: são material de candidatura e o caminho
em `/media/` seria adivinhável. Todo acesso passa por este endpoint.

## GET /api/v1/me/notifications/
Reaproveita o endpoint da v2. Ganha os tipos novos listados em [email.md](email.md).

---

# Área do organizador

## Processos

### GET /api/v1/admin/processes/
Lista todos os processos (draft, published e closed) para o dashboard do organizador.
Cada item traz os contadores que aparecem no card: `application_count`, `current_stage`,
`status`, período de inscrições.

### POST /api/v1/admin/processes/
Cria processo (modal "Novo Processo").

Body:
```json
{
  "name": "Processo Seletivo Liga de TI 2026.2",
  "description": "Buscamos pessoas comprometidas, curiosas...",
  "banner": null,
  "registration_start": "2026-08-01T00:00:00Z",
  "registration_end": "2026-08-15T23:59:00Z",
  "status": "draft"
}
```

O modal tem a opção "Processo visível para candidatos?" — "Sim" cria com
`status=published` e `published_at=now`; "Não (rascunho)" cria com `status=draft`.

### GET /api/v1/admin/processes/{id}/
Detalhe + estatísticas usadas nos tiles da tela "Gerenciar Processo":
```json
{
  "id": "uuid",
  "name": "...",
  "status": "published",
  "published_at": "2026-08-01T00:00:00Z",
  "registration_start": "...",
  "registration_end": "...",
  "stats": { "total": 150, "in_progress": 84, "approved": 26, "rejected": 18 }
}
```

### PATCH /api/v1/admin/processes/{id}/
Edita nome, descrição, banner e período de inscrições.
Processo `closed` não pode ser editado — 400.

### DELETE /api/v1/admin/processes/{id}/
Exclui o processo. **Permitido apenas com `status=draft`** — 400 caso contrário.
Processo publicado que precisa ser cancelado deve ser encerrado, não excluído.

### POST /api/v1/admin/processes/{id}/publish/
"Abrir inscrições". Body opcional permite ajustar o período e um texto de destaque:
```json
{
  "registration_start": "2027-08-01T09:00:00Z",
  "registration_end": "2027-08-15T23:59:00Z",
  "highlight_message": "As inscrições para o Processo Seletivo da Liga de TI estão abertas!"
}
```

Validações: `status == draft` e processo tem pelo menos uma etapa — senão 400.
Efeitos: `status=published`, `published_at=now`.

### POST /api/v1/admin/processes/{id}/close/
Encerra o processo (`status=closed`). Bloqueia novas inscrições e avaliações.
Candidaturas ainda `in_progress` permanecem como estão — encerrar não reprova ninguém
automaticamente.

## Etapas

### GET /api/v1/admin/processes/{id}/stages/
Lista as etapas do processo com critérios e contagem de participantes por etapa
(aba "Etapas").

### POST /api/v1/admin/processes/{id}/stages/
Cria etapa (modal de configuração de etapa). Critérios vão aninhados:
```json
{
  "name": "Resolução do Case",
  "description": "Entrega do case prático",
  "start_at": "2026-08-18T00:00:00Z",
  "end_at": "2026-08-25T23:59:00Z",
  "accepts_late_submission": false,
  "allows_file_upload": true,
  "max_files": 3,
  "allowed_file_types": ["pdf", "zip", "pptx"],
  "weight": 35,
  "criteria": [
    { "name": "Pensamento crítico", "order": 1, "weight": 20 },
    { "name": "Clareza da solução", "order": 2, "weight": 15 },
    { "name": "Criatividade", "order": 3, "weight": 10 },
    { "name": "Viabilidade", "order": 4, "weight": 55 }
  ]
}
```

`order` da etapa é atribuído automaticamente (última posição) se não enviado.

`weight` é o peso na nota final e os `weight` dos critérios são o barema da etapa.
Quando algum peso é informado, a soma precisa dar 100 — senão 400. Todos zerados
significa peso igual.

### PATCH /api/v1/admin/stages/{id}/
Edita a etapa e seus critérios.

Restrição: **não é possível remover um critério que já tem avaliação registrada** — 400.
Permitir isso apagaria nota já dada. Renomear é permitido.

### DELETE /api/v1/admin/stages/{id}/
Exclui a etapa. Bloqueado (400) se houver candidatura com `current_stage` nela ou
avaliação registrada.

### PATCH /api/v1/admin/processes/{id}/stages/reorder/
Reordena as etapas. Body: `{ "order": ["stage_uuid_1", "stage_uuid_2"] }`.
Bloqueado se o processo já tem candidaturas em andamento — 400.

## Candidatos

### GET /api/v1/admin/processes/{id}/applications/
Tabela da aba "Candidatos". Cada linha: id da candidatura, id do participante, nome,
curso, etapa atual, média final, status e última atualização.

O id do participante existe porque o comunicado dirigido é endereçado por participante, e
a seleção da tabela é de candidaturas.

Filtros (todos combináveis):
- `?search=` — nome ou e-mail do candidato
- `?stage=` — uuid da etapa atual
- `?status=` — `in_progress` | `approved` | `rejected` | `discarded`
- `?course=` — curso
- `?ordering=` — `name`, `-score`, `-updated_at` (padrão: `name`)

Paginado.

### GET /api/v1/admin/applications/{id}/
Ficha completa do candidato (modal "Ver"): dados pessoais do `Participant`, status, etapa
atual, entregáveis por etapa e notas já registradas pelo organizador autenticado.

### GET /api/v1/admin/applications/{id}/evaluations/
Avaliação detalhada (modal de nota): por etapa, nota de cada avaliador em cada critério,
observações e as médias calculadas.

```json
[
  {
    "stage": { "id": "uuid", "name": "Case" },
    "criteria": [
      {
        "name": "Pensamento crítico",
        "scores": [
          { "evaluator": "Ana", "score": 9.0 },
          { "evaluator": "Bruno", "score": 7.0 }
        ],
        "average": 8.0
      }
    ],
    "notes": [
      { "evaluator": "Ana", "text": "Boa estruturação do problema." }
    ],
    "stage_average": 8.4,
    "needs_third_review": false
  }
]
```

`needs_third_review` fica `true` quando a diferença entre as notas de etapa de dois
avaliadores passa de `process.divergence_threshold` (padrão 1,5).

### POST /api/v1/admin/applications/{id}/evaluations/
Salva a avaliação do organizador autenticado para uma etapa (botão "Salvar Avaliação").

```json
{
  "stage": "uuid",
  "scores": [
    { "criterion": "uuid", "score": 9.0 },
    { "criterion": "uuid", "score": 8.0 }
  ],
  "notes": "Mandou bem na apresentação."
}
```

Comportamento: upsert por (application, criterion, evaluator) — reenviar sobrescreve a
nota do mesmo avaliador em vez de duplicar.

Validações: `score` dentro de `score_min`..`score_max` do processo (padrão 1 a 5), com 0
sempre aceito para ausência de entrega; critérios pertencem à etapa informada; processo
não está `closed`. **Não exige designação**: qualquer organizador avalia qualquer
candidato (decisions.md §19). O endpoint continua restrito a `is_staff`.

### POST /api/v1/admin/processes/{id}/applications/bulk-action/
Ações em massa da tabela de candidatos.

```json
{
  "applications": ["uuid", "uuid"],
  "action": "move_stage",
  "target_stage": "uuid"
}
```

| action | Efeito | E-mail disparado |
|--------|--------|------------------|
| `move_stage` | move para `target_stage` | `stage_advanced` |
| `reject` | `status=rejected` | `application_rejected` |
| `approve` | `status=approved` | `application_approved` |
| `discard` | `status=discarded` | nenhum |

Validações:
- `approve` só é permitido para candidaturas na **última etapa** — senão 400.
- Candidatura já finalizada (`approved`/`rejected`/`discarded`) não pode ser movida — 400.
- Toda ação que dispara e-mail cria também a notificação correspondente.

## Comunicações

### GET /api/v1/admin/processes/{id}/communications/
Histórico da aba "Comunicações": data, tipo (`auto`/`manual`), assunto, nº de
destinatários, status. Filtros: `?type=`, `?stage=`, `?status=`.

### POST /api/v1/admin/processes/{id}/communications/
Envia comunicado manual (modal "Nova comunicação").

```json
{
  "audience": "stage",
  "audience_stage": "uuid",
  "subject": "Mudança de horário",
  "message": "A entrevista foi remarcada para..."
}
```

`audience`: `all` | `stage` | `approved` | `rejected` | `specific`.
Quando `specific`, enviar `recipients: ["participant_uuid", ...]`.
Quando `stage`, `audience_stage` é obrigatório.

Efeito: resolve os destinatários, cria `Communication`, dispara e-mail + notificação para
cada um. A mensagem sai como foi escrita, sem substituição de variável.

### GET /api/v1/admin/communications/{id}/
Detalhe do comunicado enviado (modal): tipo, data, assunto, mensagem, destinatários, status.

## Perfil do organizador

### GET /api/v1/admin/me/
Perfil do organizador autenticado: nome, e-mail, cargo, telefone, github, linkedin e
`is_coordinator`.

O perfil é criado na primeira visita: nem todo `is_staff` tem um — o superusuário criado
pelo `entrypoint.sh`, por exemplo, nunca passou por aqui.

### PATCH /api/v1/admin/me/
Atualiza os campos editáveis do perfil. `is_coordinator` é somente leitura — concede
acesso à identidade dos candidatos, então não pode ser autoatribuído.
`role_title` é informativo — não concede nem restringe permissão (ver
[decisions.md](decisions.md) §4).

## Designação de avaliadores

O planejamento prevê dois corretores independentes por case, distribuídos entre
candidatos diferentes. A designação **organiza quem corrige o quê — não dá nem tira
permissão**: avaliador sem designação pontua normalmente (decisions.md §19).

### GET /api/v1/admin/stages/{id}/assignments/
Distribuição atual da etapa: a carga de cada avaliador e a lista de designações
(candidatura, código e avaliador).

### POST /api/v1/admin/stages/{id}/assignments/
Designa avaliadores para uma candidatura específica.
```json
{ "application": "uuid", "evaluators": ["user_id", "user_id"] }
```

### DELETE /api/v1/admin/stages/{id}/assignments/
Remove uma designação. Body: `{ "application": "uuid", "evaluator": "user_id" }`.

### POST /api/v1/admin/stages/{id}/assignments/auto/
Distribui automaticamente, em rodízio, equilibrando a carga.
```json
{ "evaluators": ["user_id", "user_id", "user_id"], "per_application": 2 }
```

Cada candidatura recebe `per_application` avaliadores **distintos**, e o rodízio evita
que a mesma dupla se repita em todos os candidatos. Redistribuir substitui a distribuição
anterior da etapa, mas **não apaga avaliação já registrada** — as notas permanecem no
banco.

Validação: são necessários ao menos `per_application` avaliadores — senão 400.

## Correção anônima

**Desligada nesta edição** (decisions.md §23): `ensure_selection_process` cria o processo
com `anonymous_evaluation=False`, e todo organizador vê a identidade. O mecanismo abaixo
continua no código e volta a valer marcando o campo no processo.

Quando `process.anonymous_evaluation` é `true`, os endpoints
`/admin/applications/` e `/admin/processes/{id}/applications/` devolvem `null` nos campos
de identidade (e-mail, telefone, GitHub, LinkedIn, bio) e substituem `participant_name`
pelo `code` da candidatura (`C-0001`).

O coordenador (`OrganizerProfile.is_coordinator=True`) enxerga a identidade normalmente,
porque é quem distribui as correções e revisa divergências.
