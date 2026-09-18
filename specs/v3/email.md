# Emails — v3 (Processo Seletivo)

Os e-mails do hackathon (v2) continuam existindo sem alteração. Os abaixo são adicionados
em `backend/apps/recruitment/emails.py`, seguindo o mesmo padrão do app `teams`.

Regra que permanece valendo: **notificação no banco e e-mail sempre são criados juntos**,
nunca um sem o outro.

## Gatilhos e destinatários

| Evento | Destinatário | Template | Tipo |
|--------|--------------|----------|------|
| Inscrição confirmada | Candidato que se inscreveu | `application_confirmed` | auto |
| Convocado para a próxima etapa | Candidato movido | `stage_advanced` | auto |
| Reprovado | Candidato reprovado | `application_rejected` | auto |
| Aprovado no processo | Candidato aprovado | `application_approved` | auto |
| Comunicado manual | Conforme destinatários escolhidos | `custom_communication` | manual |

Descarte (`discard`) não dispara e-mail — é ação administrativa, normalmente para
duplicidade ou desistência.

## Tipos de notificação

Adicionar a `NotificationType` em `apps/teams/models.py`:

```
application_confirmed   — Inscrição confirmada
stage_advanced          — Convocação para próxima etapa
application_approved    — Aprovado no processo seletivo
application_rejected    — Não aprovado no processo seletivo
custom_communication    — Comunicado do processo seletivo
```

`link_to` aponta para `/applications/{id}` em todos eles.

Acrescentar choices é a única alteração permitida em `apps/teams/models.py` — gera um
`AlterField` que é no-op no Postgres. Todos os valores acima cabem no `max_length=30`
do campo (o maior tem 20 caracteres).

> ### Atenção: não reaproveitar o `notify()` do hackathon
>
> `apps/teams/services/notifications.py` tem um `_TASK_DISPATCH` que mapeia cada tipo de
> notificação à sua task de e-mail. Quando o tipo **não está no dicionário**, a função
> cria a `Notification`, loga um warning e **retorna sem enviar e-mail nenhum**.
>
> Chamar esse `notify()` com um tipo do seletivo quebraria a regra de "nunca notificação
> sem e-mail" de forma silenciosa: sem exceção, sem teste vermelho, e o problema só
> apareceria quando um candidato reclamasse de não ter recebido o resultado.
>
> O app `recruitment` precisa do seu próprio `services/notifications.py`, com o dispatch
> dos tipos dele.

---

## Templates

### application_confirmed
Assunto: `[Liga de TI] Inscrição confirmada — {process.name}`

Corpo:
- {participant.full_name}, sua inscrição foi confirmada.
- Etapas do processo, na ordem, com as datas de cada uma.
- Primeira etapa e o que ela exige.
- Link para acompanhar a candidatura.

### stage_advanced
Assunto: `[Liga de TI] Você avançou para {stage.name} — {process.name}`

Corpo:
- Parabéns, {participant.full_name}! Você avançou para a etapa {stage.name}.
- Descrição da etapa.
- Prazo: de {stage.start_at} até {stage.end_at}.
- Se a etapa pede entrega: o que enviar, tipos aceitos e quantidade máxima.
- Link para a candidatura.

### application_approved
Assunto: `[Liga de TI] Você foi aprovado no processo seletivo!`

Corpo:
- Parabéns, {participant.full_name}! Você foi aprovado no {process.name}.
- Boas-vindas à Liga de TI.
- Próximos passos (placeholder — preencher com a organização).

### application_rejected
Assunto: `[Liga de TI] Resultado do processo seletivo — {process.name}`

Corpo:
- Agradecimento pela participação de {participant.full_name}.
- Comunicado de que a candidatura não seguiu adiante nesta edição.
- Incentivo para participar do próximo processo.

### custom_communication
Assunto: o que o organizador escreveu.

Corpo: a mensagem do organizador, com `{nome}` substituído pelo nome do candidato,
dentro do layout padrão de e-mail da Liga.

---

## Implementação

- Manter `EmailMultiAlternatives` (texto + HTML), como no app `teams`.
- Criar `backend/apps/recruitment/emails.py` com uma função por template.
- Criar `backend/apps/recruitment/services/notifications.py` com uma função que cria a
  `Notification` e dispara o e-mail na mesma operação, espelhando
  `apps/teams/services/notifications.py`.
- Desenvolvimento: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`.
- Produção: Resend via SMTP, configuração já existente.

## Comunicado automático x comunicado manual

O organizador nunca precisa escrever o aviso de avanço de etapa, aprovação ou reprovação:
mover, aprovar e reprovar já disparam sozinhos a `Notification` e o e-mail, e a aba
"Comunicações" ganha uma linha `type=auto` com os destinatários. O `NewCommunicationModal`
serve só para recado extra — mudança de local, lembrete de prazo, instruções de entrega.

O texto registrado no histórico repete o que o candidato recebeu. Um registro que só
dissesse "comunicação automática" deixaria o organizador sem saber o que foi comunicado
quando alguém perguntasse depois.

Cada aviso diz **o que aconteceu**, não que houve novidade:

| Ação | Notificação no sino | Assunto no histórico |
|---|---|---|
| Mover de etapa | "Você avançou para a etapa {etapa}." | Convocação para {etapa} |
| Aprovar | "Você foi aprovado no {processo}!" | Aprovados no processo seletivo |
| Reprovar | "Sua candidatura no {processo} não seguiu adiante." | Resultado: não aprovados |
| Descartar | nenhuma — ação administrativa | não aparece |

## Envio em massa

Ações em massa (mover etapa, aprovar, reprovar) e comunicados podem atingir mais de 100
candidatos de uma vez. Regras:

- O envio roda em background (o projeto já tem Celery configurado em `core/celery.py`),
  para a requisição não ficar presa esperando o SMTP.
- O envio é feito em lote, uma mensagem por destinatário — nunca todos em cópia, porque
  isso exporia o e-mail de todos os candidatos.
- Falha no envio para um destinatário não pode abortar os demais nem desfazer a mudança de
  status. A `Communication` guarda `status` para registrar o resultado.
- A `Notification` no banco é criada mesmo que o e-mail falhe — o candidato precisa ver a
  atualização na plataforma de qualquer forma.

## Comando de teste

Criar `backend/apps/recruitment/management/commands/test_recruitment_emails.py`, seguindo
o `test_all_emails.py` que já existe no app `teams`: dispara uma amostra de cada template
para um endereço informado, para conferir layout antes do processo real começar.
