# Roadmap de implementação — v3

Implementação em fatias verticais: cada fase termina com algo que funciona de ponta a
ponta e com a suíte de testes do hackathon ainda passando.

Branch: `feature/v3-processo-seletivo`.

---

## Fase 1 — Fundação do domínio

**Objetivo:** modelos e admin funcionando, sem API ainda.

- Criar o app `apps/recruitment/`
- Modelos: `Process`, `Stage`, `EvaluationCriterion`, `Application`, `Deliverable`,
  `Evaluation`, `Communication`, `OrganizerProfile`
- Migrations (geradas, nunca editadas à mão)
- Registro no Django Admin, para operar antes do frontend existir
- `tests/test_models.py`

**Pronto quando:** dá para criar um processo com etapas e critérios pelo Django Admin,
e os testes do hackathon continuam passando.

---

## Fase 2 — API do organizador

**Objetivo:** montar e conduzir um processo inteiro via API.

- Endpoints de processo (CRUD, publish, close)
- Endpoints de etapas e critérios (CRUD, reorder)
- Listagem de candidatos com busca, filtros e ordenação
- Estatísticas do processo
- `tests/test_views_admin_processes.py`, `tests/test_views_stages.py`, `tests/test_filters.py`

**Pronto quando:** um processo pode ser criado, ter etapas configuradas e ser publicado
por requisições autenticadas como organizador.

---

## Fase 3 — API do candidato

**Objetivo:** fechar o ciclo inscrição → acompanhamento.

- Listagem e detalhe de processos publicados
- Inscrição (`apply`)
- "Meus processos" e detalhe da candidatura
- E-mail + notificação de inscrição confirmada
- `tests/test_views_processes.py`, `tests/test_views_applications.py`

**Pronto quando:** um candidato se inscreve, recebe e-mail e consegue consultar em qual
etapa está.

---

## Fase 4 — Entregáveis

**Objetivo:** candidato envia arquivos nas etapas que exigem.

- `Deliverable` com upload, validação de tipo, quantidade e prazo
- Remoção antes do prazo
- Exibição dos arquivos na ficha do candidato
- `tests/test_views_deliverables.py`

**Bloqueio:** exige a decisão de storage de produção
([decisions.md](decisions.md) §5). Em desenvolvimento, storage local resolve.

---

## Fase 5 — Avaliações e fluxo entre etapas

**Objetivo:** o organizador consegue conduzir a seleção inteira.

- Salvar avaliação (notas por critério + observações), com upsert por avaliador
- Cálculo de médias por critério, por etapa e final
- Avaliação consolidada com múltiplos avaliadores
- Ações em massa: mover etapa, aprovar, reprovar, descartar
- E-mails de convocação e resultado
- `tests/test_views_evaluations.py`, `tests/test_views_bulk_actions.py`

**Pronto quando:** dá para levar um candidato da inscrição até aprovado ou reprovado,
com e-mail em cada transição.

---

## Fase 6 — Comunicações

**Objetivo:** substituir o WhatsApp e o e-mail manual da organização.

- Envio de comunicado com os cinco tipos de destinatário
- Histórico com filtros
- Registro automático das comunicações disparadas pelas ações em massa
- Envio em background via Celery
- `tests/test_views_communications.py`

---

## Fase 7 — Frontend do candidato

**Objetivo:** primeira tela real usável.

- Seções "Meus processos" e "Processos disponíveis" no dashboard
- `ProcessDetailPage` com inscrição
- `ApplicationDetailPage` com `StageTimeline` e `DeliverableUpload`
- Hooks e camada de API correspondentes
- Testes de hooks e componentes

---

## Fase 8 — Frontend do organizador

**Objetivo:** tirar a operação do Django Admin.

- Lista de processos no dashboard admin + `NewProcessModal` + `OpenApplicationsModal`
- `ManageProcessPage` com tiles e as três abas
- `CandidatesTable` com filtros, seleção e ações em massa
- `CandidateProfileModal` e `EvaluationDetailModal`
- `StageConfigModal`
- `NewCommunicationModal` e `CommunicationDetailModal`
- `OrganizerProfileModal`

---

## Fase 9 — Produção

- Storage de arquivos configurado
- Revisão de permissões em todos os endpoints `/admin/`
- Suíte completa passando (hackathon + seletivo)
- Deploy no Railway
- Teste do fluxo completo com dados reais antes de abrir para os candidatos

---

## Critério de conclusão da v3

- Um processo seletivo completo roda só na plataforma, sem Google Forms nem Notion.
- Candidato acompanha todas as etapas e recebe comunicação automática em cada mudança.
- Avaliações ficam centralizadas, com mais de um avaliador por etapa.
- O hackathon continua funcionando exatamente como antes.

---

## Pendências que precisam de decisão antes das fases indicadas

| Pendência | Bloqueia | Onde está registrada |
|-----------|----------|----------------------|
| Storage de arquivos em produção | Fase 4 | [decisions.md](decisions.md) §5 |
| Quem pode avaliar (qualquer organizador vs. designado) | Fase 5 | [models.md](models.md) |
