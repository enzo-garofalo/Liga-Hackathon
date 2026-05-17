# Modelos de dados — v2

## Participant (substitui o modelo anterior)
| Campo        | Tipo          | Observação                              |
|--------------|---------------|-----------------------------------------|
| id           | UUID PK       | auto                                    |
| user         | OneToOne → User | on_delete=CASCADE                     |
| full_name    | CharField     |                                         |
| github       | URLField      | blank=True, null=True                   |
| linkedin     | URLField      | blank=True, null=True                   |
| course       | CharField     | nome do curso                           |
| semester     | PositiveSmallIntegerField |                               |
| bio          | TextField     | resumo de habilidades e experiências    |
| created_at   | DateTimeField | auto_now_add                            |
| updated_at   | DateTimeField | auto_now                                |

Propriedade derivada (não campo):
- `has_team` → bool: verifica se existe TeamMembership ativa para este participante

## Team
| Campo        | Tipo          | Observação                              |
|--------------|---------------|-----------------------------------------|
| id           | UUID PK       | auto                                    |
| name         | CharField     | único                                   |
| leader       | FK → Participant | on_delete=PROTECT                    |
| is_open      | BooleanField  | default=False — aceita pedidos de entrada |
| status       | CharField     | choices: forming / submitted / approved / rejected |
| submitted_at | DateTimeField | null=True — preenchido ao submeter      |
| created_at   | DateTimeField | auto_now_add                            |
| updated_at   | DateTimeField | auto_now                                |

Status possíveis:
- `forming` — equipe em formação (< 4 membros ou ainda não submetida)
- `submitted` — submetida para análise (exatamente 4 membros, bloqueada)
- `approved` — aprovada pelo admin
- `rejected` — recusada pelo admin

## TeamMembership
| Campo        | Tipo          | Observação                              |
|--------------|---------------|-----------------------------------------|
| id           | UUID PK       | auto                                    |
| team         | FK → Team     | on_delete=CASCADE                       |
| participant  | FK → Participant | on_delete=CASCADE                    |
| joined_at    | DateTimeField | auto_now_add                            |

Constraint: unique_together(team, participant)
Constraint: um participante não pode ter mais de uma TeamMembership ativa

## TeamInvite (convite do líder para um participante)
| Campo        | Tipo          | Observação                              |
|--------------|---------------|-----------------------------------------|
| id           | UUID PK       | auto                                    |
| team         | FK → Team     | on_delete=CASCADE                       |
| invitee      | FK → Participant | participante convidado                |
| invited_by   | FK → Participant | deve ser o líder da equipe            |
| status       | CharField     | choices: pending / accepted / declined  |
| created_at   | DateTimeField | auto_now_add                            |

## JoinRequest (pedido de entrada em equipe aberta)
| Campo        | Tipo          | Observação                              |
|--------------|---------------|-----------------------------------------|
| id           | UUID PK       | auto                                    |
| team         | FK → Team     | on_delete=CASCADE — team.is_open=True   |
| requester    | FK → Participant |                                       |
| status       | CharField     | choices: pending / accepted / declined  |
| created_at   | DateTimeField | auto_now_add                            |

## Validações importantes
- TeamMembership: participante só pode ter uma membership ativa por vez.
- TeamInvite: não criar convite se participante já tem equipe.
- JoinRequest: só permitir se team.is_open=True e team.status=forming.
- Submissão: team deve ter exatamente 4 memberships para mudar para submitted.
- Uma vez submitted, nenhuma operação de membership é permitida (add, remove, leave).
- Se líder sair (status forming), a liderança passa para o membro mais antigo (menor joined_at).
- Se equipe ficar com 0 membros além do líder e líder sair, equipe é deletada.
- Após 30/05 (TEAM_DEADLINE no settings), equipes com status forming são automaticamente
  descartadas via management command — membros recebem e-mail.