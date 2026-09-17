# Frontend — v3 (Processo Seletivo)

## Páginas e rotas

As rotas do hackathon (v2) continuam existindo. As rotas abaixo são adicionadas.

### Públicas (sem autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| / | LandingPage | Existente — ganha CTA para o processo seletivo aberto, quando houver |
| /login | LoginPage | Existente, sem alteração |
| /register | RegisterPage | Existente, sem alteração |

### Candidato (autenticado)

| Rota | Página | Descrição |
|------|--------|-----------|
| /dashboard | DashboardPage | Existente — pílulas e seções do processo seletivo; bloco do hackathon desativado (ver abaixo) |
| /processes/:id | ProcessDetailPage | Detalhes do processo + botão "Inscrever-se" |
| /applications/:id | ApplicationDetailPage | Acompanhamento da candidatura: etapas, status, entregáveis |
| /profile | ProfilePage | Existente — selo de equipe desativado junto com o hackathon |

### Organizador

| Rota | Página | Descrição |
|------|--------|-----------|
| /admin/login | AdminLoginPage | Existente, sem alteração |
| /admin/dashboard | AdminDashboardPage | Existente — ganha a lista de processos seletivos e "+ Novo Processo" |
| /admin/processes/:id | ManageProcessPage | Gerenciar processo: tiles de estatísticas + abas Candidatos / Etapas / Comunicações |

`ManageProcessPage` controla a aba ativa por query string (`?tab=candidates`) para que
recarregar a página ou compartilhar o link mantenha o contexto.

---

## Componentes novos

### ProcessCard
Card de processo, usado nas duas dashboards.
- Candidato: nome, status das inscrições, nº de etapas, período, botão "Ver detalhes"
  (processos disponíveis) ou "Ver candidatura" (meus processos).
- Na candidatura, as datas de inscrição são **opcionais**: `/me/applications/` não as
  devolve, então o card mostra "Inscrito em" e a etapa atual no lugar.
- Organizador: nome, nº de inscritos, etapa atual, status; botão "Gerenciar Processo"
  (published/closed) ou "Abrir inscrições" (draft).

### StageTimeline
Linha do tempo das etapas na página da candidatura.
Cada etapa aparece como concluída, atual ou futura, com nome, descrição e datas.
Na etapa atual mostra o que precisa ser entregue e o prazo.

### DeliverableUpload
Área de entrega da etapa atual (só quando `allows_file_upload=True` e a candidatura está
em andamento).

- Mostra formatos aceitos e quantidade máxima.
- **Envio em dois passos.** "Escolher arquivo" só seleciona; aparece o nome e o tamanho do
  arquivo, um × para trocar, e só o botão **"Enviar"** manda. Como o case aceita um único
  arquivo, envio imediato ao selecionar faria um clique errado ocupar a vaga.
- Arquivos já enviados aparecem com a etiqueta "Enviado", botão de baixar e de remover.
  Com o limite atingido, a escolha de arquivo some até o candidato remover um.
- **Download autenticado.** O botão baixa pelo `client` com token
  (`downloadDeliverable` + `saveBlob`). Um `<a href>` não envia o token e o backend
  responde 401 — os arquivos não ficam em URL pública.
- Regras de prazo, formato, tamanho e quantidade são do backend; o componente mostra a
  mensagem que ele devolver, via `getApiError`.

### QueryError
Falha ao carregar dados. Título, mensagem da API e botão "Tentar novamente".

Existe porque uma consulta que falha deixava a seção vazia, e o candidato não conseguia
distinguir "não há processo aberto" de "o servidor está fora do ar". Usado no dashboard e
nas páginas de detalhe.

### ProcessStats
Os quatro tiles de "Gerenciar Processo": Inscritos, Em análise, Aprovados, Reprovados.

### CandidatesTable
Tabela da aba Candidatos.
- Colunas: seleção, nome, curso, etapa, nota (média final), status, última atualização, ações.
- Busca por nome e filtros de etapa, status, curso e ordenação.
- Seleção múltipla habilita o menu "Ações": mover para etapa, reprovar, enviar comunicado
  e aprovar (esta última só quando os selecionados estão na última etapa).
- Clique no ícone de nota abre `EvaluationDetailModal`; "Ver" abre `CandidateProfileModal`.

### CandidateProfileModal
Ficha do candidato: foto, nome, e-mail, curso, semestre, GitHub, LinkedIn, telefone,
status e etapa atual, entregáveis, campos de nota por critério da etapa, observações e
botão "Salvar Avaliação".

Os critérios exibidos vêm da configuração da etapa — não são fixos.

### EvaluationDetailModal
Avaliação consolidada: por etapa, nota de cada avaliador em cada critério, observações e
média automática final.

### StageConfigModal
Criação/edição de etapa: nome, descrição, datas, aceitar entrega após prazo, permitir envio
de arquivos, nº máximo de arquivos, tipos permitidos e lista editável de critérios.

### NewProcessModal
Criação de processo: nome, descrição, banner opcional, período de inscrições e a opção
"Processo visível para candidatos?" (Sim / Não — rascunho).

### OpenApplicationsModal
Confirmação de publicação de um rascunho, listando o que vai acontecer (processo fica
visível, inscrições abertas, candidatos podem se inscrever), com período e mensagem de
destaque opcional.

### NewCommunicationModal
Envio de comunicado: seleção de destinatários (todos, de uma etapa, aprovados, reprovados
ou específicos), assunto e mensagem. O seletor de etapa e a busca de candidatos aparecem
conforme o destinatário escolhido.

### CommunicationDetailModal
Comunicado já enviado, em modo leitura: tipo, data, assunto, destinatários, status e mensagem.

### OrganizerProfileModal
Perfil do organizador: foto, nome, e-mail, cargo, permissão, telefone, GitHub e LinkedIn.
Cargo e permissão são exibidos como informação — não alteram o que o organizador pode fazer.

---

## Fluxos principais

### Inscrição no processo
1. /dashboard → seção "Processos disponíveis" → "Ver Detalhes"
2. /processes/:id → lê a descrição → "Inscrever-se"
3. POST /processes/:id/apply/ → redireciona para /applications/:id
4. Candidato recebe e-mail de confirmação

### Acompanhamento da candidatura
1. /dashboard → "Meus processos" → "Ver Candidatura"
2. /applications/:id → StageTimeline mostra etapa atual e próximas
3. Se a etapa pede entrega: DeliverableUpload dentro do prazo

### Criação e publicação de processo (organizador)
1. /admin/dashboard → "+ Novo Processo" → NewProcessModal
2. Criado como rascunho → card mostra "Abrir inscrições"
3. /admin/processes/:id → aba Etapas → "+ Nova Etapa" → StageConfigModal (repete por etapa)
4. Voltar ao dashboard → "Abrir inscrições" → OpenApplicationsModal → confirma
5. Processo passa a aparecer para os candidatos

### Avaliação de candidato
1. /admin/processes/:id?tab=candidates
2. "Ver" na linha do candidato → CandidateProfileModal
3. Preenche nota por critério + observações → "Salvar Avaliação"
4. POST /admin/applications/:id/evaluations/ → a média na tabela atualiza

### Movimentação entre etapas
1. Seleciona candidatos na tabela
2. Menu "Ações" → "Mover para etapa" → escolhe a etapa de destino
3. POST /admin/processes/:id/applications/bulk-action/
4. Cada candidato recebe e-mail de convocação

### Resultado final
1. Filtra candidatos na última etapa
2. Seleciona → "Aprovar" (só habilitado na última etapa) ou "Reprovar"
3. Candidatos recebem o e-mail de resultado

### Comunicado manual
1. /admin/processes/:id?tab=communications → "+ Enviar comunicado"
2. Escolhe destinatários, assunto e mensagem → "Enviar"
3. Comunicado aparece no histórico com nº de destinatários e status

---

## ViewModels (hooks) novos

```
src/hooks/
├── useProcesses.ts          ← lista processos publicados (candidato)
├── useProcess.ts            ← detalhe do processo + useApplyToProcess
├── useMyApplications.ts     ← "Meus processos"
├── useApplication.ts        ← detalhe da candidatura + etapas
├── useDeliverables.ts       ← upload e remoção de entregáveis
├── useAdminProcesses.ts     ← lista, cria, publica, encerra processos
├── useAdminProcess.ts       ← detalhe + estatísticas
├── useStages.ts             ← CRUD de etapas e critérios
├── useApplications.ts       ← tabela de candidatos (busca, filtros, ordenação)
├── useEvaluations.ts        ← salvar e consultar avaliações
├── useBulkActions.ts        ← mover, aprovar, reprovar, descartar em massa
├── useCommunications.ts     ← histórico e envio de comunicados
└── useOrganizerProfile.ts   ← GET/PATCH /admin/me/
```

## Camada de API

```
src/api/
├── processes.ts
├── applications.ts
├── stages.ts
├── evaluations.ts
└── communications.ts
```

Reaproveitam `client.ts` (instância axios com interceptor de JWT) sem alteração.

`applications.ts` inclui `downloadDeliverable`, que pede o arquivo como `Blob` pelo
client autenticado. `utils/download.ts` (`saveBlob`) entrega o Blob ao navegador.

### Tratamento de erro

Reaproveita `utils/errors.ts`, que o projeto já tinha (`getApiError`), e acrescenta:

- `isNotFound(error)` — separa 404 de falha real. As páginas de detalhe só dizem "não
  encontrado" em 404; erro de servidor mostra `QueryError` com "Tentar novamente".
- `retryUnlessClientError` — política de nova tentativa dos hooks da v3. Erro 4xx não se
  resolve tentando de novo, então não repete; rede e 5xx têm até duas novas tentativas.
  Aplicada só nos hooks da v3: mudar o `QueryClient` global alteraria as telas do
  hackathon.

## Tipos

```
src/types/
├── process.ts        ← Process, ProcessStatus, ProcessStats
├── stage.ts          ← Stage, EvaluationCriterion
├── application.ts    ← Application, ApplicationStatus, Deliverable
├── evaluation.ts     ← Evaluation, StageEvaluationSummary
└── communication.ts  ← Communication, Audience
```

## Regras de interface

- **Candidato nunca vê nota nem observação.** A API não devolve esses campos para ele —
  a interface não deve tentar exibi-los.
- **Aprovar só na última etapa.** O botão fica desabilitado, com explicação no title,
  quando a seleção inclui candidato fora da última etapa.
- **Processo encerrado é somente leitura.** Abas continuam navegáveis, ações ficam ocultas.
- **Estados vazios:** "nenhum processo disponível", "nenhum candidato neste filtro" e
  "nenhum comunicado enviado" precisam de mensagem própria, não tabela vazia.
- **Upload fora do prazo** mostra o motivo (prazo encerrado, tipo não permitido, limite de
  arquivos atingido) em vez de falhar silenciosamente.
- **Falha de API nunca vira estado vazio.** Com erro, o dashboard mostra `QueryError`, não
  "nenhum processo aberto", e as pílulas mostram "-" em vez de "Sem inscrição".
- **Horários vêm do navegador.** O frontend recebe datas em ISO com fuso e usa
  `toLocaleDateString('pt-BR')`, que converte para o fuso local. Quem formata data no
  backend (mensagens de erro, e-mails) precisa de `timezone.localtime()` — ver
  [decisions.md](decisions.md) §13.

## Hackathon desativado (`SHOW_HACKATHON`)

A Liga usa a plataforma para o processo seletivo, então o módulo do hackathon está
**desativado na interface** por uma chave em [`src/featureFlags.ts`](../../frontend/src/featureFlags.ts).

**Nada foi removido.** Páginas, componentes, hooks, rotas e todo o backend do hackathon
continuam no projeto e funcionando. Trocar `SHOW_HACKATHON` para `true` devolve, de uma vez:

| Onde | O que volta |
|------|-------------|
| Dashboard | pílulas Status / Equipes abertas / Convites / Prazo, convites pendentes, `StatusBanner`, bloco "Você ainda não está em uma equipe", contagem do evento |
| Menu lateral (`AppLayout`) | "Equipes abertas" e "Minha equipe" |
| Topo (`DeadlineBanner`) | aviso de prazo de formação de equipe |
| Perfil | selo "Equipe: X" / "Sem equipe" |

Com a chave desligada, as consultas de equipes, convites e `/info/` **não são
disparadas** — não basta esconder o bloco, senão a tela do candidato continuaria
dependendo de endpoints do hackathon.

As rotas `/teams` e `/teams/:id` seguem acessíveis por URL direta; só a navegação foi
desativada.

Decisão registrada em [decisions.md](decisions.md) §11.

## Arquivos do hackathon que a v3 encosta

Nenhuma página, hook ou componente do hackathon é **removido**. Estes arquivos em produção
foram alterados, e cada um precisa ser conferido no fluxo do hackathon quando a chave for
religada:

| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `pages/DashboardPage.tsx` | Pílulas e seções do seletivo; bloco do hackathon atrás de `SHOW_HACKATHON` | Religar a chave e conferir `StatusBanner`, convites e criação de equipe |
| `components/AppLayout.tsx` | Itens de equipe do menu atrás de `SHOW_HACKATHON` | Baixo |
| `components/DeadlineBanner.tsx` | Atrás de `SHOW_HACKATHON`, sem consultar `/info/` quando desligado | Baixo |
| `pages/ProfilePage.tsx` | Selo de equipe atrás de `SHOW_HACKATHON` | Baixo |
| `hooks/useTeams.ts` | `useOpenTeams(enabled = true)` | Baixo — padrão `true`, páginas do hackathon não mudam |
| `hooks/useInvites.ts` | `useMyInvites(enabled = true)` | Baixo — idem |
| `components/NotificationBell.tsx` | Cores dos 5 tipos novos | Baixo |
| `types/notification.ts` | Union `NotificationType` ganha os 5 tipos novos | Baixo — só tipagem |
| `utils/errors.ts` | Ganha `isNotFound` e `retryUnlessClientError`; `getApiError` intocado | Baixo |
| `App.tsx` | Rotas `/processes/:id` e `/applications/:id` | Baixo |
| `pages/AdminDashboardPage.tsx` | *(Fase 8)* lista de processos seletivos | Regressão na tabela de equipes submetidas |

> **Correção:** uma versão anterior deste documento afirmava que `notificationTone()`
> retornava `undefined` para tipo desconhecido, deixando a bolinha sem cor. Estava errado:
> a função tem fallback `bg-ink/30`, então um tipo novo apareceria cinza. As cores
> próprias foram adicionadas de qualquer forma.

`TeamsPage`, `TeamDetailPage`, `StatusBanner` e os demais componentes de equipe não foram
alterados.

## Testes

Vitest + Testing Library, em `src/test/`. Ver [tests.md](tests.md).
