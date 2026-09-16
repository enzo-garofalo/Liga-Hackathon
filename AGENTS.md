# Liga de TI — Hackathon + Processo Seletivo

## Stack
- Backend: Python 3.12, Django 5, DRF, djangorestframework-simplejwt, PostgreSQL
- Frontend: React 18, TypeScript, Tailwind CSS, React Query, padrão MVVM
- Infra: Docker Compose (nginx, gunicorn, postgres) + Railway em produção

## Princípios
- Código simples e que funciona. Sem over-engineering.
- Backend expõe apenas JSON via DRF. Nenhum template Django para o site principal.
- Frontend consome a API REST. Estado gerenciado por React Query + ViewModels.
- Migrações sempre geradas e nunca editadas manualmente.

## Versão atual: v3 — Processo Seletivo
Toda implementação nova deve seguir as specs em `specs/v3/`.

O projeto tem **dois domínios que convivem**:
- **Hackathon (v2)** — equipes de 4, convites, aprovação. **Em produção e funcionando.**
  Vive em `backend/apps/teams/`. As specs em `specs/v2/` continuam válidas como
  documentação desse domínio. Não alterar sem necessidade explícita.
- **Processo Seletivo (v3)** — candidatura individual com etapas e avaliações.
  Vive em `backend/apps/recruitment/`. É onde toda feature nova é implementada.

Os arquivos em `specs/v1/` são histórico — não usar como referência (exceto `design.md`).

## Specs da v3 (leia antes de implementar qualquer feature)
- [Visão geral](specs/v3/overview.md) — escopo, atores, fluxo, ciclo de vida
- [Decisões](specs/v3/decisions.md) — o que já foi decidido e por quê
- [Modelos de dados](specs/v3/models.md)
- [API endpoints](specs/v3/api.md)
- [Frontend](specs/v3/frontend.md)
- [Emails](specs/v3/email.md)
- [Testes](specs/v3/tests.md)
- [Roadmap](specs/v3/roadmap.md) — ordem de implementação
- [Design system](specs/v1/design.md)  ← mantido da v1, ainda válido

## Regras de negócio — Processo Seletivo (v3)
- Candidatura é individual. Não há equipes no seletivo.
- Um candidato tem no máximo uma candidatura por processo.
- Processo segue `draft` → `published` → `closed`. Só `published` aparece ao candidato.
- Processo só pode ser publicado se tiver pelo menos uma etapa.
- Processo só pode ser excluído enquanto estiver em `draft`.
- Etapas são ordenadas. Cada etapa tem seus próprios critérios de avaliação.
- Cada etapa tem barema com peso por critério; a nota da etapa é média ponderada.
- A nota final é a média ponderada das etapas, pelo peso de cada uma.
- Pesos configurados precisam somar 100%. Peso zero em tudo significa peso igual.
- A escala de notas é configurável por processo (padrão 1 a 5). O 0 é sempre aceito e
  significa ausência de entrega, não faz parte da escala.
- Vários organizadores avaliam o mesmo candidato; a nota do critério é a média entre eles.
- Médias são calculadas em service, nunca persistidas em campo.
- Correção é anônima por padrão: o avaliador vê o código da candidatura, não a pessoa.
- Avaliador só pontua candidato que lhe foi designado (`StageAssignment`).
- Divergência acima do limiar do processo marca `needs_third_review`.
- Aprovação final só é permitida para candidatos na última etapa.
- Candidato nunca vê nota nem observação de avaliador.
- Sem teto de aprovados no seletivo (o limite de 10 é regra só do hackathon).
- Notificações são criadas no banco junto com o disparo de e-mail — nunca um sem o outro.
- Todo organizador (`is_staff=True`) cria processo, move etapa e envia comunicado.
  `role_title` é informativo. A única distinção de papel é `is_coordinator`: coordenador
  vê a identidade na correção anônima e administra as designações de avaliador.

## Regras de negócio — Hackathon (v2, em produção)
- Participantes têm cadastro próprio (e-mail + senha) e fazem login via JWT.
- Admins fazem login em endpoint separado (validação is_staff=True).
- Equipe deve ter exatamente 4 membros para ser submetida.
- Uma vez `submitted`, a equipe não pode mais ser alterada (sem add/remove/leave).
- Máximo de 10 equipes com status `approved`. Enforce no backend.
- Ao aprovar/recusar/descartar uma equipe, disparar e-mail para todos os membros.
- Se o líder sair (equipe em formação), liderança passa para o membro mais antigo.
- Após `TEAM_DEADLINE`, equipes incompletas são descartadas via management command.
- O command `disband_incomplete_teams` deve ser idempotente.

## Variáveis de ambiente
Existentes (v2):
- `TEAM_DEADLINE=2026-05-30` — data de corte para formação de equipes
- `VITE_WHATSAPP_LINK=https://chat.whatsapp.com/...` — link fixo do grupo

Para a v3 (entregáveis, Fase 4):
- `MEDIA_ROOT` deve apontar para um volume do Railway em produção. Ver
  `specs/v3/decisions.md` §5.

## Fronteira entre hackathon e processo seletivo
A v3 **não migra nem altera nenhuma tabela existente** — só cria tabelas novas no app
`recruitment`. Os dados de produção do hackathon ficam intactos.

Ao implementar:
1. Não alterar a **estrutura** dos modelos em `apps/teams/` (campos, constraints,
   relacionamentos) para acomodar o seletivo. Acrescentar entradas em
   `NotificationType.CHOICES` é permitido — gera um `AlterField` que é no-op no Postgres,
   já que `choices` é validação do Django e não constraint de banco. Conferir que o valor
   novo cabe em `max_length=30`.
2. `Participant` e `Notification` são importados de `apps.teams` e reaproveitados.
3. **Não chamar `apps.teams.services.notifications.notify()` com tipos do seletivo.**
   Essa função tem um `_TASK_DISPATCH` que só conhece os tipos do hackathon: com um tipo
   não registrado ela cria a notificação, loga um warning e **retorna sem enviar e-mail**,
   silenciosamente. O `recruitment` precisa do seu próprio
   `services/notifications.py` com o dispatch dos tipos dele.
4. A suíte de testes do hackathon precisa continuar passando inteira a cada fase.
5. Ao mexer em página compartilhada do frontend (`DashboardPage`, `AdminDashboardPage`,
   `NotificationBell`), conferir que o fluxo do hackathon continua funcionando — são
   telas em produção.
