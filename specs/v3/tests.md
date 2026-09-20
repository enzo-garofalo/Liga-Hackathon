# Testes — v3 (Processo Seletivo)

Os testes do hackathon continuam em `backend/apps/teams/tests/` e não são alterados.
Os novos ficam em `backend/apps/recruitment/tests/`, com `conftest.py` e `factories.py`
próprios, seguindo o padrão já usado no app `teams`.

## Backend

### tests/test_models.py
```python
test_process_default_status_is_draft
test_stage_order_unique_per_process
test_application_unique_per_process_and_participant
test_application_final_score_is_none_without_evaluations
test_application_final_score_averages_stage_averages
test_evaluation_unique_per_criterion_and_evaluator
```

### tests/test_views_processes.py
```python
test_list_processes_returns_only_published
test_list_processes_marks_already_applied
test_detail_returns_404_for_draft_process
test_detail_does_not_expose_evaluation_criteria
test_apply_creates_application_in_first_stage
test_apply_fails_when_process_is_draft
test_apply_fails_before_registration_start
test_apply_fails_after_registration_end
test_apply_fails_when_already_applied
test_apply_sends_email_and_creates_notification
```

### tests/test_views_applications.py
```python
test_my_applications_lists_only_own_applications
test_application_detail_returns_stage_timeline
test_application_detail_does_not_expose_scores_to_candidate
test_application_detail_returns_403_for_other_participant
```

### tests/test_views_deliverables.py
```python
test_upload_succeeds_within_deadline
test_upload_fails_when_stage_does_not_allow_files
test_upload_fails_with_disallowed_extension
test_upload_fails_when_max_files_reached
test_upload_fails_after_stage_end
test_upload_succeeds_after_end_when_late_submission_allowed
test_upload_fails_when_file_too_large
test_upload_requires_a_file
test_upload_fails_for_other_participant
test_upload_blocked_for_finished_application
test_delete_deliverable_by_owner
test_delete_deliverable_only_by_owner
test_delete_deliverable_fails_after_deadline
test_owner_can_download_own_file
test_organizer_can_download_candidate_file
test_other_candidate_cannot_download
test_anonymous_cannot_download
test_deliverable_appears_in_application_timeline
test_deliverable_appears_in_admin_application_detail
```

### tests/test_export_command.py
```python
test_export_writes_files_named_by_code
test_export_groups_by_stage
test_export_requires_process
test_export_reports_unknown_process
test_export_warns_when_nothing_to_export
```

### tests/test_views_admin_processes.py
```python
test_list_requires_staff
test_create_process_as_draft
test_create_process_published_sets_published_at
test_publish_fails_without_stages
test_publish_fails_when_not_draft
test_delete_allowed_only_for_draft
test_close_blocks_new_applications
test_detail_returns_correct_stats
```

### tests/test_views_stages.py
```python
test_create_stage_assigns_next_order
test_create_stage_with_nested_criteria
test_patch_stage_cannot_remove_criterion_with_evaluations
test_patch_stage_can_rename_criterion
test_delete_stage_fails_with_applications_in_it
test_reorder_fails_with_applications_in_progress
```

### tests/test_views_evaluations.py
```python
test_save_evaluation_creates_scores_for_each_criterion
test_save_evaluation_twice_updates_instead_of_duplicating
test_two_evaluators_scores_are_averaged
test_stage_average_is_mean_of_criteria_averages
test_evaluation_fails_when_criterion_not_in_stage
test_evaluation_fails_with_score_out_of_range
test_evaluation_fails_when_process_closed
test_candidate_cannot_access_evaluation_endpoints
```

### tests/test_views_bulk_actions.py
```python
test_move_stage_updates_current_stage
test_move_stage_sends_email_to_each_candidate
test_approve_fails_when_not_in_last_stage
test_approve_succeeds_in_last_stage
test_reject_sets_status_and_sends_email
test_discard_does_not_send_email
test_bulk_action_fails_on_finished_application
test_bulk_action_creates_notification_for_each_candidate
```

### tests/test_views_communications.py
```python
test_send_to_all_resolves_every_applicant
test_send_to_stage_resolves_only_that_stage
test_send_to_approved_resolves_only_approved
test_send_to_specific_resolves_listed_participants
test_stage_audience_requires_stage_id
test_message_placeholder_replaced_with_candidate_name
test_communication_creates_notification_per_recipient
test_communication_appears_in_history
test_auto_communication_is_recorded_on_bulk_action
```

### tests/test_filters.py
```python
test_search_filters_by_name
test_filter_by_stage
test_filter_by_status
test_filter_by_course
test_ordering_by_score_desc
test_filters_combine
```

### tests/test_weighted_scoring.py
```python
test_stage_average_uses_criterion_weights
test_final_score_uses_stage_weights
test_zero_weights_fall_back_to_equal_weight
test_criterion_average_still_means_across_evaluators
test_weights_must_sum_to_100
test_weights_summing_100_are_accepted
test_criteria_without_weights_are_accepted
```

### tests/test_score_scale.py
```python
test_default_scale_is_one_to_five
test_score_above_scale_is_rejected
test_score_inside_scale_is_accepted
test_zero_is_always_accepted
test_scale_is_configurable_per_process
test_negative_score_is_rejected
```

### tests/test_anonymous_evaluation.py
O anonimato é marca da **etapa** (decisions.md §29).
```python
test_evaluator_sees_code_instead_of_name
test_coordinator_sees_identity
test_candidate_list_is_anonymous_for_evaluator
test_identity_is_visible_when_the_stage_is_not_anonymous
test_identity_appears_once_the_candidate_leaves_the_anonymous_stage
test_application_gets_sequential_code_on_apply
test_superuser_sees_identity
test_the_filename_does_not_give_the_candidate_away
test_the_coordinator_sees_the_real_filename
test_the_candidate_still_sees_their_own_filename
test_course_and_semester_are_hidden_too
test_the_coordinator_still_sees_course_and_semester
test_the_sheet_says_it_is_anonymous
test_the_sheet_is_not_anonymous_for_the_coordinator
```

### tests/test_organizer_roles.py
O que o avaliador não faz, e o que ele enxerga.
```python
test_evaluator_cannot_publish_the_process
test_evaluator_cannot_close_the_process
test_evaluator_cannot_edit_the_process
test_evaluator_cannot_create_a_process
test_evaluator_cannot_create_a_stage
test_evaluator_cannot_edit_a_stage
test_evaluator_cannot_approve_or_move
test_evaluator_cannot_send_a_communication
test_evaluator_cannot_distribute_work
test_evaluator_cannot_invite_another_organizer
test_coordinator_still_edits_the_process
test_coordinator_still_moves_candidates
test_evaluator_only_sees_processes_they_were_called_to
test_evaluator_cannot_open_a_process_they_are_not_in
test_coordinator_sees_every_process
test_evaluator_list_shows_only_their_queue
test_coordinator_list_shows_everyone
test_evaluator_cannot_open_an_application_outside_their_queue
test_evaluator_opens_their_own_queue
test_evaluator_scores_what_was_distributed_to_them
test_evaluator_cannot_score_outside_their_queue
test_coordinator_scores_anyone
test_assignment_removed_takes_the_access_with_it
```

### tests/test_assignment_board.py
O quadro por fase e a escolha manual de avaliadores.
```python
test_the_board_groups_candidates_by_stage
test_the_coordinator_sees_names_even_in_the_anonymous_stage
test_an_empty_stage_comes_back_empty_not_missing
test_someone_who_withdrew_is_not_in_the_board
test_the_board_shows_who_corrects_each_candidate
test_the_board_is_only_for_the_coordinator
test_choosing_evaluators_for_one_stage
test_choosing_evaluators_for_every_stage
test_choosing_replaces_instead_of_adding
test_removing_everyone_keeps_the_scores
test_choosing_without_a_stage_is_refused
test_cannot_choose_someone_outside_the_process
test_a_stage_from_another_process_is_refused
test_an_application_from_another_process_is_refused
test_a_closed_process_does_not_accept_new_distribution
test_choosing_is_only_for_the_coordinator
test_the_answer_already_brings_the_board_back
```

### tests/test_organizer_invite.py
Convite, remoção e a distribuição restrita a quem está no processo.
```python
test_invite_creates_the_account_as_organizer
test_the_invited_account_has_no_password_yet
test_the_invited_person_never_becomes_a_coordinator
test_the_invite_email_carries_a_link_to_create_the_password
test_the_invite_link_lets_the_person_set_a_password
test_inviting_someone_who_already_has_an_account_keeps_their_password
test_inviting_the_same_person_twice_is_refused
test_a_candidate_of_the_process_cannot_be_invited
test_the_list_shows_who_is_still_pending
test_someone_who_already_logged_in_is_not_pending
test_removing_takes_the_assignments_but_keeps_the_scores
test_removed_organizer_loses_access_to_the_process
test_the_coordinator_cannot_remove_themselves
test_removing_someone_who_is_not_in_the_process_is_refused
test_resending_sends_the_email_again
test_resending_to_someone_outside_the_process_is_refused
test_the_list_includes_the_coordination
test_nobody_appears_twice
test_the_coordinator_can_be_given_corrections
test_cannot_distribute_to_someone_outside_the_process
test_distribution_only_covers_candidates_in_that_stage
```

### tests/test_assignments.py
A designação voltou a ser trava para quem não coordena.
```python
test_evaluator_cannot_grade_without_assignment
test_the_service_refuses_an_undistributed_correction
test_coordinator_grades_without_assignment
test_auto_distribute_gives_two_evaluators_per_candidate
test_auto_distribute_balances_workload
test_auto_distribute_requires_enough_evaluators
test_redistributing_replaces_previous_assignments
test_assignment_list_shows_workload
test_divergence_between_evaluators
test_small_difference_does_not_need_third_review
test_single_evaluator_never_needs_third_review
test_summary_flags_divergence
```

### tests/test_notifications.py
```python
test_every_recruitment_notification_type_has_an_email_task
test_notify_creates_notification_and_queues_email
test_notification_is_created_even_when_email_fails
test_recruitment_types_are_not_dispatched_by_teams_notify
```

`test_every_recruitment_notification_type_has_an_email_task` é o teste que impede a
regressão silenciosa descrita em [email.md](email.md): ele varre os tipos de notificação
do seletivo e falha se algum não estiver registrado no dispatch de e-mail. Sem ele, um
tipo esquecido só apareceria quando um candidato não recebesse o resultado.

### tests/test_permissions.py
```python
test_the_sweep_actually_found_the_admin_routes
test_candidate_cannot_reach_any_admin_endpoint      # varre o URLconf
test_anonymous_cannot_reach_any_admin_endpoint      # varre o URLconf
test_candidate_cannot_open_someone_elses_application
test_candidate_cannot_download_someone_elses_file
test_candidate_cannot_delete_someone_elses_file
test_candidate_cannot_upload_into_someone_elses_application
test_organizer_can_download_any_file
```

### apps/teams/tests/test_views_auth.py (acrescentados)
```python
test_admin_login_rejects_who_is_not_staff
test_admin_login_accepts_staff
```

### tests/test_views_open_process.py
```python
test_anonymous_sees_the_registration_window
test_returns_null_without_a_published_process
test_closed_process_is_not_announced
test_exposes_only_name_and_dates
test_registration_open_reflects_the_window
test_picks_the_process_that_starts_first
```

### tests/test_views_organizer_profile.py
```python
test_returns_profile_of_authenticated_organizer
test_creates_profile_on_first_visit
test_updates_editable_fields
test_cannot_promote_itself_to_coordinator
test_candidate_cannot_access
```

### tests/test_notifications.py (conteúdo do aviso automático)
```python
test_advancing_stage_tells_the_candidate_they_advanced
test_rejecting_tells_the_candidate_they_were_not_approved
test_approving_tells_the_candidate_they_were_approved
test_auto_communication_records_what_the_candidate_was_told
```

### tests/test_timezone.py
```python
test_email_date_uses_local_day
test_email_date_handles_missing_value
test_deadline_message_uses_local_time
```

Usa de propósito 26/08 02:59 UTC, que é 25/08 23:59 em Brasília — o caso em que exibir UTC
mostraria o dia errado. Ver [decisions.md](decisions.md) §13.

### tests/test_seed_command.py
```python
test_seed_creates_full_process
test_seed_is_idempotent
test_seed_clear_recreates_without_duplicating
test_seed_does_not_send_email
test_seed_case_stage_is_open_for_uploads
```

### tests/test_ensure_selection_process.py
```python
test_creates_the_process_with_every_stage_and_criterion
test_process_is_born_as_draft
test_running_again_changes_nothing
test_does_not_overwrite_what_the_organizer_changed
test_stages_run_in_sequence_without_gaps
test_weights_add_up_to_one_hundred
test_file_upload_only_on_the_case_stage
test_custom_name_creates_a_separate_process
```

### tests/test_check_email_pipeline.py
```python
test_fails_when_no_worker_responds
test_passes_when_worker_responds
test_reports_unreachable_broker
test_warns_about_eager_mode
test_lists_registered_notification_types
```

## Frontend

Vitest + Testing Library + jsdom. Rodar com `npm test` dentro de `frontend/`.

Estrutura em `frontend/src/test/`:

| Arquivo | Papel |
|---------|-------|
| `setup.ts` | matchers do jest-dom e limpeza entre testes |
| `render.tsx` | `renderWithProviders` — QueryClient sem novas tentativas + MemoryRouter |
| `http.ts` | `httpError(status, data)` — erro no formato que o axios produz |

A API é simulada com `vi.mock` nos módulos de `src/api/`.

### Implementados (Fase 7 — candidato)

```typescript
// errors.test.ts
getApiError: lê o detail do DRF
getApiError: lê a lista que o ValidationError do DRF devolve
getApiError: cai na mensagem genérica sem resposta do servidor
isNotFound: reconhece 404 / não confunde 500 com 404
retryUnlessClientError: não repete 4xx / repete 5xx até duas vezes / repete falha de rede

// QueryError.test.tsx
mostra título e mensagem
chama onRetry ao clicar em tentar novamente
sem onRetry não mostra botão

// ProcessCard.test.tsx
processo disponível mostra "Ver detalhes" e período de inscrição
inscrições encerradas aparecem como tal
candidatura mostra status, etapa atual e "Ver candidatura"
cada status aparece com o rótulo certo

// StageTimeline.test.tsx
lista as etapas na ordem
marca só a etapa atual
renderiza o conteúdo extra apenas dentro da etapa atual
mostra a descrição da etapa

// DeliverableUpload.test.tsx
mostra formatos aceitos e limite de arquivos
escolher o arquivo não envia nada
só envia ao clicar em "Enviar"
o × troca o arquivo sem enviar
mostra o erro devolvido pela API
com o limite atingido, esconde a escolha de arquivo
baixa pelo client autenticado, não por link direto
remove um arquivo enviado

// DashboardPage.test.tsx
cumprimenta pelo primeiro nome
mostra "Meus processos" com a candidatura
"Processos disponíveis" não repete processo em que já se inscreveu
pílulas refletem a candidatura ativa
estado vazio quando não há candidatura nem processo aberto
erro da API mostra aviso — e não o estado vazio
"Tentar novamente" refaz as consultas
hackathon desativado: nada de equipe na tela
hackathon desativado: nenhuma consulta de equipe, convite ou prazo

// ProcessDetailPage.test.tsx
mostra descrição e etapas
inscrever-se leva à página da candidatura
mostra o motivo quando a inscrição é recusada
já inscrito não vê o botão
inscrições encerradas desabilitam o botão
404 mostra "não encontrado"
erro de servidor NÃO diz "não encontrado"
404 não é repetido antes de mostrar a tela

// ApplicationDetailPage.test.tsx
mostra o status e a área de entrega na etapa atual
etapa atual sem upload não mostra área de entrega
candidatura finalizada não oferece entrega
404 mostra "não encontrada"
erro de servidor NÃO diz "não encontrada"
```

### Verificação por sabotagem

Teste que nunca falha não protege nada. Cada regra abaixo foi quebrada de propósito no
código para confirmar que algum teste acusa:

| Sabotagem | Teste que pegou |
|-----------|-----------------|
| religar `SHOW_HACKATHON` | os dois testes "hackathon desativado" |
| mostrar "nenhum processo aberto" mesmo com erro | "erro da API mostra aviso" |
| pílulas afirmando "Sem inscrição" durante erro | "erro da API mostra aviso" |
| enviar assim que o arquivo é escolhido | "escolher o arquivo não envia nada", "o × troca o arquivo" |
| tratar qualquer erro como "não encontrado" | "erro de servidor NÃO diz não encontrado" |
| pedido de senha revelando quais e-mails têm conta | backend: `test_pedido_de_email_desconhecido_responde_igual_e_nao_envia` |
| endpoint aberto de senha sem teto de pedidos | backend: `test_pedido_em_excesso_e_barrado` |
| senha nova sem as regras do Django | backend: `test_senha_fraca_e_recusada_e_a_antiga_continua` |
| token do link de senha não conferido | backend: `test_token_adulterado_e_recusado` |
| conta desativada recebendo link de senha | backend: `test_conta_desativada_nao_recebe_link` |
| link do e-mail apontando para o backend, não para o site | backend: `test_link_usa_o_endereco_do_frontend` |
| tela de login sem o link de senha esquecida | "a tela de entrar do candidato oferece Esqueci minha senha" |
| tela de senha sem conferir se as duas batem | "senhas diferentes nem chegam a gastar o link" |
| organizador mandado para a entrada do candidato | "o organizador vai para a entrada da organização" |
| `ui/PasswordInput` sem aplicar o `id` no campo | "o campo de senha de %s é associado ao rótulo" |
| link do e-mail sem dizer de qual porta é a conta | backend: `test_link_do_organizador_diz_que_a_porta_e_a_da_organizacao` |
| cancelar inscrição valendo depois do prazo | backend: `test_candidate_cannot_withdraw_after_registration_closes` |
| quem desistiu sem conseguir se inscrever de novo | backend: `test_candidate_can_apply_again_after_withdrawing` |
| tela seguindo "já inscrito" depois de cancelar | backend: `test_the_process_offers_to_apply_again` |
| quem desistiu contando como inscrito nos tiles | backend: `test_withdrawn_does_not_count_as_enrolled` |
| organizador movendo de etapa quem desistiu | backend: `test_organizer_cannot_move_someone_who_withdrew` |
| cancelar inscrição sem pedir confirmação | "não pergunta nada antes de abrir a confirmação" |
| opção de cancelar aparecendo fora do prazo | "fora do prazo a opção some" |
| cartão do dashboard sem a opção de cancelar | "o cartão oferece cancelar embaixo de Ver candidatura" |
| `can_withdraw` prometendo o que o endpoint recusa | backend: `test_can_withdraw_matches_what_the_endpoint_does` |
| alerta de "não se inscreveu" escondido por candidatura cancelada | "quem cancelou a inscrição volta a ver o aviso" |
| caminho de volta fixo em `/login` nas telas de senha | "quem veio como organizador volta para a entrada dele", "na tela de trocar a senha, o organizador volta pela porta que veio no link" |
| aprovar liberado em qualquer etapa | "aprovar fica desabilitado fora da última etapa" |
| religar `SHOW_HACKATHON` no painel do organizador | "hackathon desativado: sem abas de equipe" |
| comunicado dirigido perdendo os destinatários | "Enviar comunicado endereça os selecionados" |
| agir sem pedir confirmação | "ação em massa de reprovar também confirma" |
| aprovar sempre finalizando, sem avançar de etapa | "aprovar fora da última etapa avança para a próxima" |
| aceitar nota fora da escala | "recusa fora da escala", "avisa quando a nota sai da escala" |
| aviso de reprovação dizendo só "Resultado do processo" | backend: `test_rejecting_tells_the_candidate_they_were_not_approved` |
| histórico registrando "comunicação automática" no lugar do texto | backend: `test_auto_communication_records_what_the_candidate_was_told` |
| deploy sobrescrevendo o processo existente | backend: `test_running_again_changes_nothing`, `test_does_not_overwrite_what_the_organizer_changed` |
| processo padrão nascendo publicado | backend: `test_process_is_born_as_draft` |
| landing voltando a falar de hackathon/equipes | "apresenta o processo seletivo, não o hackathon" |
| prazo escrito no código em vez de vir da API | "sem processo publicado, não inventa data" |
| endpoint `/admin/` sem `IsAdminUser` | backend: `test_candidate_cannot_reach_any_admin_endpoint` |
| download liberado para qualquer logado | backend: `test_candidate_cannot_download_someone_elses_file` |
| chave ligada sem trazer o hackathon de volta | "o dashboard do candidato volta a mostrar o bloco de equipes" |
| `ui/Select` sem htmlFor no rótulo | "o formulário de cadastro continua pedindo o perfil do candidato" |
| telas de conta voltando a falar de equipe | "não falam mais do hackathon" |
| landing prometendo mentoria de novo | "só promete o que a Liga faz de verdade" |
| landing sem o acesso de organizador | "oferece entrar como candidato e como organizador" |
| etapas sem os nomes | "mostra o nome de quem está em cada etapa" |
| rascunho sem link para a tela do processo | "todo processo leva à tela de gerenciamento, inclusive rascunho" |
| tela do processo sem editar/publicar | "rascunho pode publicar por aqui", "edita nome e datas do processo", "publicar pela tela do processo confirma antes" |

A segunda sabotagem **passou despercebida** na primeira versão do teste: o cenário
simulava erro só em `/processes/`, mas a candidata ainda tinha uma candidatura, então o
estado vazio nunca apareceria com ou sem a proteção. O cenário foi corrigido para uma
candidata sem inscrição. Ao escrever teste de "X não aparece", conferir que sem a regra X
apareceria.

### Implementados (Fase 8 — organizador)

```typescript
// AdminDashboardPage.test.tsx
lista os processos com inscritos e etapas
todo processo leva à tela de gerenciamento, inclusive rascunho
o dashboard não publica: isso acontece dentro do processo
cria processo como rascunho por padrão
estado vazio quando não há processo
erro de API mostra aviso em vez de estado vazio
hackathon desativado: sem abas de equipe e sem consultá-las

// ManageProcessPage.test.tsx
mostra nome, estatísticas e as três abas
rascunho pode publicar por aqui — senão fica sem saída
rascunho sem etapa avisa o que falta
edita nome e datas do processo
publicar pela tela do processo confirma antes
processo encerrado não oferece edição
trocar de aba troca o conteúdo

// HackathonFlag.test.tsx
o dashboard do candidato volta a mostrar o bloco de equipes
o dashboard volta a consultar os endpoints do hackathon
o perfil volta a mostrar o selo de equipe
a rota / passa a servir a landing do hackathon

// AuthPages.test.tsx
criação de conta / entrar como candidato / entrar como organizador: não falam mais do hackathon
as três telas falam da Liga e do processo seletivo
o formulário de cadastro continua pedindo o perfil do candidato
a bio tem rótulo associado ao campo
a tela do organizador é separada da do candidato

// LandingPage.test.tsx
apresenta o processo seletivo, não o hackathon
não menciona a empresa parceira da edição anterior
oferece entrar como candidato e como organizador
explica as três etapas com o peso de cada uma
mostra os critérios de avaliação antes da inscrição
responde as dúvidas que afastam candidato de outra área
a primeira pergunta do FAQ já vem aberta
LandingPageHackathon: continua inteira para a próxima edição
LandingPageHackathon: também não cita mais a empresa parceira

// CandidatesTab.test.tsx
mostra a nota final de quem foi avaliado
o menu de ações só aparece com alguém selecionado
aprovar fica desabilitado fora da última etapa
aprovar libera para quem está na última etapa
mover etapa exige escolher o destino antes de aplicar
aplica a ação em massa nos selecionados
mostra o motivo quando o backend recusa a ação
"Enviar comunicado" endereça os selecionados por participante
erro de API mostra aviso em vez de tabela vazia

// CandidateProfileModal.test.tsx
os critérios vêm da configuração da etapa
envia as notas e a observação
pré-carrega as notas que o avaliador já deu
não envia sem nenhuma nota preenchida
na correção anônima, mostra código e esconde identidade
mostra o motivo quando o backend recusa a nota
etapa sem critérios não oferece avaliação

// StagesTab.test.tsx
mostra a etapa com participantes, peso e critérios
avisa quando não há etapa, porque publicar exige uma
cria etapa com critérios e pesos
avisa quando os pesos não somam 100
tipos de arquivo só aparecem com upload ligado
mostra o motivo quando o backend recusa a exclusão

// CommunicationsTab.test.tsx
lista o histórico com tipo e destinatários
o seletor de etapa só aparece para o destinatário "etapa"
envia o comunicado com o destinatário escolhido
não envia sem assunto e mensagem
mostra o motivo quando o backend recusa o envio
erro de API mostra aviso em vez de histórico vazio

// Decisions.test.tsx
a ficha oferece aprovar e reprovar
aprovar pede confirmação antes de agir
cancelar a confirmação não muda nada
aprovar fora da última etapa avança para a próxima
aprovar na última etapa aprova no processo
reprovar pela ficha encerra a candidatura
ação em massa de reprovar também confirma
candidatura finalizada não oferece decisão

// ScoreInput.test.tsx
parseScore aceita vírgula como separador decimal
isValidScore aceita inteiros e quebrados dentro da escala
isValidScore recusa fora da escala
isValidScore aceita 0: ausência de entrega
campo vazio não é inválido — é só não preenchido
não deixa digitar letra nem sinal negativo
avisa quando a nota sai da escala

// StagesTab.test.tsx (quem está em cada etapa)
mostra o nome de quem está em cada etapa, não só o total
pede a lista inteira, não só a primeira página
etapa vazia não lista ninguém
```

### Implementados (cargos do organizador)
```
// OrganizersTab.test.tsx
mostra quem coordena, quem avalia e quem ainda não entrou
convida pelo e-mail e avisa que o convite saiu
mostra o motivo quando a API recusa o convite
reenviar convite só aparece para quem ainda não criou a senha
tirar do processo pergunta antes
não oferece tirar o coordenador do próprio processo

// DistribuicaoTab.test.tsx (o quadro por fase)
mostra os candidatos agrupados por fase
diz quem corrige cada um, e quem está sem ninguém
a fase vazia diz que está vazia, em vez de sumir
não oferece distribuir automaticamente uma fase sem ninguém
o modal do candidato já vem com quem corrige ele marcado
começa marcando só a etapa em que o candidato está
"todas as etapas" marca todas de uma vez
salva os avaliadores nas etapas marcadas
deixa tirar todo mundo de um candidato
sem etapa marcada não deixa salvar
mostra o motivo quando a API recusa
o automático abre já dizendo quantos candidatos a fase tem
distribui a fase entre quem foi marcado
não distribui mais correções do que há gente para fazer

// OrganizerRoles.test.tsx
o coordenador vê as quatro abas
o avaliador vê só a aba de candidatos
o avaliador não pode editar, publicar nem encerrar o processo
o coordenador continua podendo editar o processo
o avaliador lê que aquilo ali é a fila dele, não o processo inteiro
a aba pedida pelo endereço não dá a volta na regra
o avaliador não seleciona candidato, porque não há ação em massa
o coordenador continua selecionando
diz que escondeu, em vez de mostrar campos vazios
e continua deixando o avaliador salvar a nota
```

O nome de cada organizador aparece duas vezes na aba (na lista e no rodízio da
distribuição), então as buscas são escopadas pela lista, que tem
`aria-label="Organizadores deste processo"`. Uma busca solta acharia as duas e o teste
quebraria por ambiguidade, não por regra errada.

Fixtures compartilhadas em `src/test/fixtures.ts`.

## Regressão do hackathon

A v3 não pode quebrar o que está em produção. A suíte existente em
`backend/apps/teams/tests/` precisa continuar passando inteira a cada fase do roadmap —
é o critério de que os domínios realmente estão isolados.
