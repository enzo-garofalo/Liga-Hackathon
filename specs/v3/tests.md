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
```python
test_evaluator_sees_code_instead_of_name
test_coordinator_sees_identity
test_candidate_list_is_anonymous_for_evaluator
test_identity_is_visible_when_anonymity_is_off
test_application_gets_sequential_code_on_apply
test_superuser_sees_identity
```

### tests/test_assignments.py
```python
test_evaluator_cannot_grade_without_assignment
test_evaluator_can_grade_when_assigned
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

A segunda sabotagem **passou despercebida** na primeira versão do teste: o cenário
simulava erro só em `/processes/`, mas a candidata ainda tinha uma candidatura, então o
estado vazio nunca apareceria com ou sem a proteção. O cenário foi corrigido para uma
candidata sem inscrição. Ao escrever teste de "X não aparece", conferir que sem a regra X
apareceria.

### Pendentes (Fase 8 — organizador)

```typescript
// CandidatesTable
renderiza a coluna de média
menu de ações só com seleção
opção "Aprovar" oculta fora da última etapa

// CandidateProfileModal
critérios vêm da configuração da etapa
salvar avaliação envia notas e observações
avaliador vê código, não nome, na correção anônima

// NewCommunicationModal
seletor de etapa só para destinatário "etapa"
busca de candidatos só para destinatário "específicos"

// ProcessCard (organizador)
mostra "Abrir inscrições" para rascunho
```

## Regressão do hackathon

A v3 não pode quebrar o que está em produção. A suíte existente em
`backend/apps/teams/tests/` precisa continuar passando inteira a cada fase do roadmap —
é o critério de que os domínios realmente estão isolados.
