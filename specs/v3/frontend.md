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
| /dashboard | DashboardPage | Existente — ganha as seções "Meus processos" e "Processos disponíveis" |
| /processes/:id | ProcessDetailPage | Detalhes do processo + botão "Inscrever-se" |
| /applications/:id | ApplicationDetailPage | Acompanhamento da candidatura: etapas, status, entregáveis |
| /profile | ProfilePage | Existente, sem alteração |

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
- Candidato: nome, status das inscrições, nº de etapas, data limite, botão "Ver Detalhes"
  (processos disponíveis) ou "Ver Candidatura" (meus processos).
- Organizador: nome, nº de inscritos, etapa atual, status; botão "Gerenciar Processo"
  (published/closed) ou "Abrir inscrições" (draft).

### StageTimeline
Linha do tempo das etapas na página da candidatura.
Cada etapa aparece como concluída, atual ou futura, com nome, descrição e datas.
Na etapa atual mostra o que precisa ser entregue e o prazo.

### DeliverableUpload
Área de upload da etapa atual (só quando `allows_file_upload=True`).
- Mostra tipos permitidos e quantidade máxima.
- Lista os arquivos já enviados com opção de remover antes do prazo.
- Bloqueia upload após `end_at` (a menos que a etapa aceite entrega atrasada).

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
├── useProcess.ts            ← detalhe do processo + apply
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

## Arquivos do hackathon que a v3 encosta

Nenhuma página, hook ou componente do hackathon é **removido**, mas alguns arquivos em
produção são alterados (quatro, contando a tipagem). Cada um precisa ser conferido no
fluxo do hackathon depois de mexido:

| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `pages/DashboardPage.tsx` | Ganha as seções "Meus processos" e "Processos disponíveis" | Regressão no `StatusBanner` e no fluxo de equipe, que vivem nessa mesma página |
| `pages/AdminDashboardPage.tsx` | Ganha a lista de processos seletivos e "+ Novo Processo" | Regressão na tabela de equipes submetidas e nas ações de aprovar/recusar |
| `types/notification.ts` | Union `NotificationType` ganha os 5 tipos novos | Baixo — só tipagem |
| `components/NotificationBell.tsx` | `notificationTone()` precisa cobrir os tipos novos | **Sem isso a bolinha renderiza sem cor**: a função retorna `undefined` para tipo desconhecido e o `className` fica vazio |

`TeamsPage`, `TeamDetailPage`, `StatusBanner`, `DeadlineBanner` e todos os hooks de equipe
continuam exatamente como estão.

Fora esses quatro arquivos, a v3 só adiciona páginas, componentes, hooks e tipos novos.
