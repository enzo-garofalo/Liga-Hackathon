# Emails — v2

## Gatilhos e destinatários

| Evento | Destinatário | Template |
|--------|-------------|----------|
| Convite recebido | Participante convidado | invite_received |
| Pedido de entrada recebido | Líder da equipe | join_request_received |
| Convite aceito | Líder (informativo) | invite_accepted |
| Convite recusado | Líder (informativo) | invite_declined |
| Pedido aceito | Participante que pediu | join_accepted |
| Pedido recusado | Participante que pediu | join_declined |
| Equipe submetida | Todos os membros | team_submitted |
| Equipe aprovada | Todos os membros | team_approved |
| Equipe recusada | Todos os membros | team_rejected |
| Equipe descartada (deadline) | Todos os membros | team_disbanded |

---

## Templates

### invite_received
Assunto: `[Liga de TI] Você foi convidado para a equipe {team.name}`
Corpo:
- {invitee.full_name}, o líder {leader.full_name} te convidou para a equipe {team.name}.
- Link direto para aceitar/recusar (redireciona para /dashboard).
- Prazo lembrete: as inscrições encerram em 30/05.

### join_request_received
Assunto: `[Liga de TI] Nova solicitação de entrada na equipe {team.name}`
Corpo:
- {requester.full_name} quer entrar na sua equipe.
- Link para o dashboard do líder para aceitar/recusar.

### team_submitted
Assunto: `[Liga de TI] Equipe {team.name} submetida para análise`
Corpo:
- Confirmação de que a equipe foi submetida.
- Membros: lista dos 4 participantes.
- Próximos passos: aguardar aprovação até 06/06.

### team_approved
Assunto: `[Liga de TI] Equipe {team.name} aprovada para o Hackathon!`
Corpo:
- Parabéns! A equipe foi selecionada.
- Data do hackathon: 06/06.
- Próximos passos (placeholder — preencher com organização).

### team_rejected
Assunto: `[Liga de TI] Resultado da análise — equipe {team.name}`
Corpo:
- Agradecimento pela participação.
- A equipe não foi selecionada nesta edição.
- Incentivo para próximas edições.

### team_disbanded
Assunto: `[Liga de TI] Inscrições encerradas — equipe incompleta`
Corpo:
- O prazo de formação de equipes encerrou em 30/05.
- A equipe {team.name} não atingiu 4 membros e foi descartada automaticamente.
- Incentivo para próximas edições.

---

## Implementação

- Manter `EmailMultiAlternatives` (texto + HTML).
- Criar `backend/apps/teams/emails.py` com uma função por template.
- Em desenvolvimento: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`.
- Em produção: Resend via SMTP (configurado nas variáveis de ambiente).

## Management command para deadline

Criar `backend/apps/teams/management/commands/disband_incomplete_teams.py`:
- Busca equipes com status=forming após TEAM_DEADLINE.
- Para cada equipe: envia e-mail `team_disbanded` para todos os membros.
- Deleta as equipes (CASCADE remove memberships, invites e join requests).
- Logar quantas equipes foram descartadas.

Configurar no Railway como Cron Job:
- Schedule: `0 0 31 5 *` (meia-noite de 31/05, logo após o deadline de 30/05)
- Command: `python manage.py disband_incomplete_teams`