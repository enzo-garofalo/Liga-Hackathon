# Hackathon — Liga de TI

## Stack
- Backend: Python 3.12, Django 5, DRF, djangorestframework-simplejwt, PostgreSQL
- Frontend: React 18, TypeScript, Tailwind CSS, React Query, padrão MVVM
- Infra: Docker Compose (nginx, gunicorn, postgres) + Railway em produção

## Princípios
- Código simples e que funciona. Sem over-engineering.
- Backend expõe apenas JSON via DRF. Nenhum template Django para o site principal.
- Frontend consome a API REST. Estado gerenciado por React Query + ViewModels.
- Migrações sempre geradas e nunca editadas manualmente.

## Versão atual: v2
Toda implementação nova deve seguir as specs em `specs/v2/`.
Os arquivos em `specs/v1/` são histórico — não usar como referência.

## Specs (leia antes de implementar qualquer feature)
- [Modelos de dados](specs/v2/models.md)
- [API endpoints](specs/v2/api.md)
- [Frontend](specs/v2/frontend.md)
- [Emails](specs/v2/email.md)
- [Testes](specs/v2/tests.md)
- [Design system](specs/v1/design.md)  ← mantido da v1, ainda válido

## Regras de negócio
- Participantes têm cadastro próprio (e-mail + senha) e fazem login via JWT.
- Admins fazem login em endpoint separado (validação is_staff=True).
- Equipe deve ter exatamente 4 membros para ser submetida.
- Uma vez `submitted`, a equipe não pode mais ser alterada (sem add/remove/leave).
- Máximo de 10 equipes com status `approved`. Enforce no backend.
- Ao aprovar/recusar/descartar uma equipe, disparar e-mail para todos os membros.
- Notificações são criadas no banco junto com o disparo de e-mail — nunca um sem o outro.
- Se o líder sair (equipe em formação), liderança passa para o membro mais antigo.
- Após `TEAM_DEADLINE`, equipes incompletas são descartadas via management command.
- O command `disband_incomplete_teams` deve ser idempotente.

## Variáveis de ambiente novas (v2)
- `TEAM_DEADLINE=2026-05-30` — data de corte para formação de equipes
- `VITE_WHATSAPP_LINK=https://chat.whatsapp.com/...` — link fixo do grupo

## Migração v1 → v2
O modelo `Participant` da v1 muda completamente. Antes de implementar:
1. Apresentar plano de migração de schema.
2. Confirmar se há dados em produção que precisam ser preservados.
3. Se sim: criar data migration. Se não: drop + recreate é aceitável.