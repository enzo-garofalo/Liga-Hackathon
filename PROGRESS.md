# PROGRESS — v3 Processo Seletivo

Estado do trabalho na branch `feature/v3-processo-seletivo`, atualizado em 18/09/2026.
Este arquivo é o ponto de partida de quem retomar a v3: o que está pronto, o que foi
decidido e por quê, e o que falta.

As fases 8 e 9 já estão commitadas e no GitHub, na branch. A `main` segue intocada, com o
hackathon em produção.

---

## Onde estamos

Fases 1 a 9 do [roadmap](specs/v3/roadmap.md) entregues. Falta a **fase 10 (produção)**.

| Fase | O que é | Situação |
|---|---|---|
| 1 | Fundação do domínio (modelos, migrations) | pronta, commitada |
| 2 | API do organizador | pronta, commitada |
| 3 | API do candidato | pronta, commitada |
| 4 | Entregáveis (upload e download autenticado) | pronta, commitada |
| 5 | Avaliações, baremas e fluxo entre etapas | pronta, commitada |
| 6 | Comunicações | pronta, commitada |
| 7 | Frontend do candidato | pronta, commitada |
| 8 | Frontend do organizador | pronta, commitada |
| 9 | Landing page do processo seletivo | pronta, commitada |
| 10 | Produção (deploy, storage, revisão de permissões) | não começou |

Suítes: **260 testes de backend** e **132 de frontend (17 arquivos)**, todos passando.
`tsc --noEmit` limpo e `npm run build` ok. A suíte do hackathon continua inteira.

---

## O que existe hoje

### Backend — `backend/apps/recruitment/`

Nove modelos: `Process`, `Stage`, `EvaluationCriterion`, `Application`, `Deliverable`,
`Evaluation`, `Communication`, `OrganizerProfile`, `StageAssignment`. Nenhuma tabela do
hackathon foi alterada.

Services, que é onde mora a regra de negócio:

- `scoring.py` — média do critério (entre avaliadores) → média ponderada da etapa → nota
  final ponderada pelas etapas. Nunca persistida. `final_scores()` resolve o lote em uma
  query só. Também calcula divergência e `needs_third_review`.
- `evaluations.py` — `is_coordinator()`, `assert_can_evaluate()` (designação),
  `save_evaluation()` com validação de escala.
- `applications.py` — `apply_to_process`, `move_to_stage`, `approve`, `reject`,
  `discard`, `run_bulk_action` (atômico: aplica em todos ou em nenhum).
- `deliverables.py` — validações de upload (tipo, quantidade, prazo, tamanho).
- `communications.py` — resolve destinatários, envia e registra no histórico.
- `notifications.py` — dispatch próprio do seletivo. **Não usar o do `teams`**: ele ignora
  em silêncio os tipos que não conhece.

Management commands: `ensure_selection_process` (cria o processo real no deploy,
idempotente, nasce rascunho), `seed_recruitment_demo`, `export_deliverables`,
`check_email_pipeline`. O desenho das etapas e o barema moram em `blueprint.py`, lido
pelo comando e pelo seed.

### Frontend — `frontend/src/`

Área do candidato: `DashboardPage`, `ProcessDetailPage`, `ApplicationDetailPage`,
`ProcessCard`, `StageTimeline`, `DeliverableUpload`, `QueryError`.

Área do organizador: `AdminDashboardPage`, `ManageProcessPage` (tiles e as abas Candidatos
/ Etapas / Comunicações), `ProcessFormModal`, `OpenApplicationsModal`, `CandidatesTab`,
`CandidatesTable`, `CandidateProfileModal`, `EvaluationDetailModal`, `StagesTab`,
`StageConfigModal`, `CommunicationsTab`, `NewCommunicationModal`,
`CommunicationDetailModal`, `OrganizerProfileModal`.

Compartilhado: `ui/Modal`, `ui/ConfirmDialog`, `ui/ScoreInput`, `utils/errors.ts`
(`getApiError`, `isNotFound`, `retryUnlessClientError`), `utils/download.ts`.

---

## Decisões tomadas

As 21 decisões estão em [specs/v3/decisions.md](specs/v3/decisions.md) com o motivo de
cada uma. As que mais afetam quem for mexer no código:

- **§2 — domínios paralelos.** Hackathon e seletivo não têm FK entre si. A v3 não migra nem
  altera nenhuma tabela existente; os dados de produção do hackathon ficam intactos.
- **§9 — médias calculadas, nunca persistidas.** Guardar a média em campo criaria um valor
  que envelhece sozinho quando um avaliador corrige a nota.
- **§10 — barema ponderado, escala 1–5, correção anônima, avaliador designado.** O 0 é
  sempre aceito e significa ausência de entrega, fora da escala.
- **§11 — hackathon desligado na interface, não removido.** `SHOW_HACKATHON = false` em
  `frontend/src/featureFlags.ts`. Religar é trocar a chave. As consultas do hackathon
  também não são disparadas (parâmetro `enabled` nos hooks) — esconder só o JSX deixaria a
  tela dependendo de endpoints desligados.
- **§12 — superusuário conta como coordenador.** Sem isso o dono do sistema via só códigos
  anônimos e não conseguia administrar designações.
- **§13 — datas no fuso da Liga.** O banco guarda UTC. Sem `timezone.localtime()`, um prazo
  às 23:59 aparecia como o dia seguinte no e-mail.
- **§17 — publicar e editar moram na tela do processo.** O dashboard só cria e lista.
- **§18 — o processo nasce junto com o ambiente.** `ensure_selection_process` roda no
  `entrypoint.sh`, é idempotente, não altera processo existente e cria em `draft`.
- **§19 — designação distribui trabalho, não dá permissão.** Qualquer organizador avalia
  qualquer candidato; `StageAssignment` só organiza quem corrige o quê.
- **§20 — a landing é do seletivo.** A do hackathon ficou em `LandingPageHackathon.tsx`,
  atrás da chave. A empresa parceira daquela edição saiu do projeto inteiro.
- **§21 — o prazo na landing vem da API.** `GET /open-process/` é aberto e devolve a janela
  de inscrições do processo publicado, ou `null`. Data escrita no código criaria uma segunda
  fonte da verdade.

### Decisões de processo com o Pedro

- **Nenhum commit sem pedido explícito.**
- Push só na branch `feature/v3-processo-seletivo`, nunca na `main`.
- Os alertas do `npm audit` ficam como estão: não quebram nada.
- Travessão (`—`) não entra em texto que o candidato lê.

---

## Correções que vieram de usar a plataforma

**1. Rascunho ficava sem saída.** O card do rascunho só oferecia "Abrir inscrições", e
publicar exige ao menos uma etapa — mas etapa só se configura dentro do processo, e não
havia link para lá. O único botão disponível era justamente o que o backend recusava. Agora
todo card leva a "Gerenciar processo", e publicar/editar/encerrar ficam no cabeçalho de
`ManageProcessPage`. Um rascunho sem etapa mostra um aviso apontando a aba "Etapas".

**2. Não dava para corrigir as datas do processo.** Não existia tela nenhuma para o
`PATCH /admin/processes/{id}/`: início e fim das inscrições eram definidos na criação e
nunca mais. `ProcessFormModal` agora serve criação e edição. Os campos são
`datetime-local` — horário local na tela, UTC no payload.

**3. Comunicado automático dizia pouco.** A notificação de reprovação era só "Resultado do
{processo}", e o histórico registrava "Comunicação automática disparada pela ação do
organizador" no lugar do texto real. Agora cada aviso diz o que aconteceu e o histórico
repete o que o candidato recebeu. Mover, aprovar e reprovar sempre foram automáticos:
notificação, e-mail e linha `type=auto` no histórico. Descarte é a única ação que não
comunica, de propósito.

---

## Próximos passos

1. **Fase 10 — produção:**
   - `MEDIA_ROOT` apontando para o volume do Railway ([decisions.md](specs/v3/decisions.md) §5)
   - `MAX_UPLOAD_BYTES` configurado
   - o processo já sobe criado pelo `entrypoint.sh`; falta só conferir as datas e publicar
   - revisão de permissões de todos os endpoints `/admin/`
   - **worker do Celery rodando** — sem ele o e-mail nunca sai e ninguém percebe. Rodar
     `manage.py check_email_pipeline` antes de abrir inscrições.
   - teste do fluxo completo com dados reais antes de abrir para os candidatos
2. **Front de login e telas de conta** — próximo assunto combinado com o Pedro.
3. **Conferir o hackathon com `SHOW_HACKATHON = true`** antes de considerar a v3 fechada,
   para garantir que os arquivos compartilhados não quebraram o fluxo antigo.

---

## Armadilhas que já custaram tempo

- **E-mail sem worker falha em silêncio.** A requisição responde 200, a task fica na fila e
  ninguém recebe nada. Em desenvolvimento sem Redis, `CELERY_TASK_ALWAYS_EAGER=True`.
- **`apps.teams.services.notifications.notify()` com tipo do seletivo** cria a notificação,
  loga um warning e não manda e-mail. O `recruitment` tem o dispatch dele.
- **O `vitest.config` reseta mocks entre testes.** `mockResolvedValue` na factory do
  `vi.mock` some; defina no `beforeEach`.
- **Teste de "X não aparece" pode ser vazio.** Um já passou despercebido aqui. Sempre
  quebrar a regra de propósito e confirmar que o teste acusa — a tabela de sabotagens está
  em [specs/v3/tests.md](specs/v3/tests.md).
- **Datas no frontend.** 23:59 em Brasília chega ao backend como 02:59 UTC do dia seguinte.
  Isso está certo; não "corrigir".
- **Opacidade de 5 em 5 no Tailwind.** `text-ink/68` não existe: a escala padrão vai de 5 em
  5, a classe some do CSS e o elemento herda a cor do ancestral. Em painel claro isso vira
  texto invisível — foi o que aconteceu com a data no pop-up de notificação. Usar múltiplo de
  5 (`text-ink/70`) ou colchetes (`text-ink/[0.68]`).
  **Fundo e borda foram arredondados** e `src/test/tailwindOpacity.test.ts` impede que
  voltem: ali fora da escala não é tom errado, é estilo que não pinta, e por isso o item ativo
  do menu não tinha realce e os selos verdes não tinham preenchimento.
  **Cor de texto ficou como estava, de propósito.** As 135 classes de texto foram
  arredondadas uma vez e a interface ficou visivelmente mais clara: elas vinham renderizando a
  100% ao herdar a cor do ancestral, e o Pedro preferiu o que já estava na tela. O commit foi
  desfeito. Elas continuam mortas e continuam sendo armadilha em painel claro dentro de casca
  escura — se aparecer texto branco onde não devia, é isto. Para achar:
  `grep -roh "text-ink/[0-9]*" frontend/src --include=*.tsx | awk -F/ '{if ($2%5!=0) print}'`.
