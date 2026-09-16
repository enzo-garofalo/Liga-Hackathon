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
- Vários organizadores podem avaliar o mesmo candidato; a nota exibida é a média.
- Médias são calculadas em service, nunca persistidas em campo.
- Aprovação final só é permitida para candidatos na última etapa.
- Candidato nunca vê nota nem observação de avaliador.
- Sem teto de aprovados no seletivo (o limite de 10 é regra só do hackathon).
- Notificações são criadas no banco junto com o disparo de e-mail — nunca um sem o outro.
- Todo organizador (`is_staff=True`) pode tudo. `role_title` é informativo, sem RBAC.

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

Pendente para a v3:
- Storage de arquivos em produção (entregáveis dos candidatos). Railway não tem disco
  persistente — precisa de bucket externo. Ver `specs/v3/decisions.md` §5.

## Migração v2 → v3
A v3 **não migra nem altera nenhuma tabela existente** — só cria tabelas novas no app
`recruitment`. Os dados de produção do hackathon ficam intactos.

Ao implementar:
1. Nunca alterar modelos em `apps/teams/` para acomodar o seletivo.
2. `Participant` e `Notification` são importados de `apps.teams` e reaproveitados.
3. A suíte de testes do hackathon precisa continuar passando inteira a cada fase.
