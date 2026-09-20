# Modelos de dados — v3 (Processo Seletivo)

> Baseado nos wireframes de frontend (dashboard candidato/organizador, gerenciar processo,
> modais de avaliação/comunicação) e no material de produto da Liga (visão, MVP, arquitetura,
> database, roadmap) resumido em [overview.md](overview.md).
> Reaproveita ao máximo o que já existe em `backend/apps/teams/`.
>
> Decisões que sustentam este modelo estão registradas em [decisions.md](decisions.md).

## Reaproveitado sem alteração de estrutura
- **`Participant`** — já cobre os campos do modal "Perfil do candidato" (full_name, github,
  linkedin, course, semester, phone). Passa a ser também o "candidato" do seletivo.
- **`Notification`** + pipeline de e-mail (notificação e e-mail sempre disparados juntos) —
  reaproveitado para comunicações automáticas do seletivo.
- **`Team`, `TeamMembership`, `TeamInvite`, `JoinRequest`, `HackathonInfo`** — intocados.
  O seletivo é individual (sem equipes), então esse fluxo não é usado por ele.

## Modelos novos (app novo: `apps/recruitment/`)

### Process (Processo Seletivo)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| name | CharField | ex.: "Processo Seletivo Liga de TI 2026.2" |
| description | TextField | texto livre ("Sobre o processo") |
| banner | FileField | opcional — `FileField` e não `ImageField` para não exigir Pillow |
| status | CharField | `draft / published / closed` |
| registration_start | DateTimeField | |
| registration_end | DateTimeField | |
| published_at | DateTimeField | null=True, preenchido ao publicar |
| highlight_message | CharField | blank=True — mensagem opcional do modal "Abrir inscrições" |
| score_min | PositiveSmallIntegerField | default=1 — menor nota da escala |
| score_max | PositiveSmallIntegerField | default=5 — maior nota da escala |
| divergence_threshold | DecimalField | default=1.5 — diferença entre avaliadores que aciona terceiro |
| anonymous_evaluation | BooleanField | default=True — avaliador vê só o código do candidato |
| created_at / updated_at | | |

Regras:
- Só processo `published` aparece para candidatos (tela "Processos disponíveis").
- Publicar (`draft → published`) é ação explícita ("Abrir Inscrições"), preenche `published_at`.
- Sem teto de aprovados (diferente do hackathon) — decisão confirmada com a Liga.
- `short_description` em [api.md](api.md) não é campo: é `description` truncada para o card.

### Stage (Etapa)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| process | FK → Process | |
| name | CharField | ex.: "Inscrição", "Resolução do Caso", "Pitch", "Entrevista" |
| description | TextField | |
| order | PositiveSmallIntegerField | define a sequência |
| start_at / end_at | DateTimeField | |
| weight | DecimalField | peso da etapa na nota final, em % (ex.: 35). Zero em todas = peso igual |
| accepts_late_submission | BooleanField | default=False |
| allows_file_upload | BooleanField | default=False |
| max_files | PositiveSmallIntegerField | null=True |
| allowed_file_types | ArrayField(CharField) | Postgres; ex.: `["pdf", "zip", "pptx"]` |
| created_at / updated_at | | |

Constraint: `unique_together(process, order)`.

### EvaluationCriterion (Critério de avaliação da etapa)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| stage | FK → Stage | |
| name | CharField | ex.: "Pensamento crítico", "Comunicação" |
| order | PositiveSmallIntegerField | |
| weight | DecimalField | peso do critério na etapa, em % (ex.: 20). Zero em todos = peso igual |

### Application (Candidatura)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| process | FK → Process | |
| participant | FK → Participant | |
| current_stage | FK → Stage | null=True (null antes da 1ª etapa iniciar) |
| status | CharField | `in_progress / approved / rejected / discarded / withdrawn` |
| code | CharField | identificador anônimo sequencial (C-0001) mostrado ao avaliador |
| submitted_at | DateTimeField | |
| created_at / updated_at | | |

Constraint: `unique_together(process, participant)` — um participante tem só uma
candidatura ativa por processo (equivalente à "uma membership ativa" do Team).

Propriedade derivada:
- `final_score` → média das médias de etapa (calculado a partir de `Evaluation`).

### Deliverable (Entregável)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| application | FK → Application | |
| stage | FK → Stage | |
| file | FileField | |
| uploaded_at | DateTimeField | auto_now_add |

Validação: só aceita upload se `stage.allows_file_upload=True`, tipo em
`allowed_file_types`, e dentro de `stage.end_at` (a menos que
`accepts_late_submission=True`).

### Evaluation (Avaliação — nota por avaliador × critério)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| application | FK → Application | |
| stage | FK → Stage | |
| criterion | FK → EvaluationCriterion | |
| evaluator | FK → User (`is_staff=True`) | organizador não tem `Participant` — ver nota abaixo |
| score | DecimalField | dentro de `process.score_min`..`score_max` (padrão 1–5). O 0 é sempre aceito: ausência de entrega |
| notes | TextField | blank=True — "Observações" do avaliador |
| created_at / updated_at | | |

> `evaluator` aponta para `User`, não para `Participant`: organizador é um usuário com
> `is_staff=True` e pode não ter cadastro de participante (que é o perfil de candidato do
> hackathon). Usar `Participant` impediria um diretor sem inscrição de avaliar.

Constraint: `unique_together(application, criterion, evaluator)` — um avaliador dá
uma nota por critério (pode editar, não duplicar).

Cálculo (feito em service, nunca persistido — ver `services/scoring.py`):
- Nota do critério = média de `score` entre os avaliadores.
- Nota da etapa = **média ponderada** dos critérios, pelo `weight` de cada um.
- Nota final = **média ponderada** das etapas, pelo `weight` de cada uma.
- Peso zero em tudo significa peso igual — processo sem barema continua funcionando.

Divergência entre corretores: quando a diferença entre as notas de etapa de dois
avaliadores passa de `process.divergence_threshold`, o resumo marca
`needs_third_review`. O planejamento da Liga pede revisão de um terceiro nesse caso.

### Communication (Comunicação em massa do processo)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| process | FK → Process | |
| type | CharField | `auto / manual` |
| subject | CharField | |
| message | TextField | |
| audience | CharField | `all / stage / approved / rejected / specific` |
| audience_stage | FK → Stage | null=True, usado quando audience=`stage` |
| recipients | M2M → Participant | resolvido no envio (specific) ou calculado (all/stage/approved/rejected) |
| status | CharField | `sent / failed` |
| sent_at | DateTimeField | |

Toda `Communication` dispara `Notification` + e-mail para cada destinatário
resolvido, seguindo a regra existente de "nunca um sem o outro".

### OrganizerProfile (perfil de organizador)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| user | OneToOne → User | organizadores continuam sendo `is_staff=True` |
| full_name | CharField | blank=True |
| role_title | CharField | ex.: "Diretor de Operações" — informativo |
| is_coordinator | BooleanField | default=False — vê identidade e administra designações |
| phone / github / linkedin | | mesmos campos do modal "Perfil organizador" |

> `role_title` é informativo e não concede permissão. `is_coordinator` marca quem
> administra a distribuição de avaliadores. Ver [decisions.md](decisions.md) §10.
>
> Com a correção anônima desligada (§23), todo organizador enxerga a identidade, então a
> distinção perde metade do efeito. O campo continua porque o anonimato pode voltar.

### StageAssignment (designação de avaliador)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | |
| stage | FK → Stage | |
| application | FK → Application | |
| evaluator | FK → User (`is_staff=True`) | |
| created_at | DateTimeField | auto_now_add |

Constraint: `unique_together(stage, application, evaluator)`.

O planejamento prevê dois corretores independentes por case, distribuídos entre
candidatos diferentes. A designação registra essa distribuição, mas **não é permissão**:
qualquer organizador avalia qualquer candidato (decisions.md §19).

## Reconciliação com o hackathon existente
`Team`/`TeamMembership` continuam existindo do jeito que estão — não fazem parte do
domínio `recruitment`. Não há FK entre os dois domínios nesta v3; se no futuro a Liga
quiser rodar hackathon como um "tipo" de processo seletivo, isso vira uma v4 com o
`Process` genérico proposto na conversa anterior (`type: hackathon | selective`). Por
ora, manter os dois domínios paralelos e independentes é a opção mais simples e sem
risco para os dados de produção do hackathon.

## Pendências antes de gerar migrations
Os enums de `Process.status` e `Application.status` estão definidos em [overview.md](overview.md) — ciclo de vida.

Resolvido: `StageAssignment` existe para distribuir a correção entre dois avaliadores,
sem ser trava de permissão (decisions.md §19).
