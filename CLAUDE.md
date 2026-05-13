# Hackathon — Liga de TI

## Stack
- Backend: Python 3.12, Django 5, DRF, djangorestframework-simplejwt, PostgreSQL
- Frontend: React 18, TypeScript, Tailwind CSS, React Query, padrão MVVM
- Infra: Docker Compose (nginx, gunicorn, postgres)

## Princípios
- Código simples e que funciona. Sem over-engineering.
- Backend expõe apenas JSON via DRF. Nenhum template Django para o site principal.
- Frontend consome a API REST. Estado gerenciado por React Query + ViewModels.
- Migrações sempre geradas e nunca editadas manualmente.

## Specs (leia antes de implementar qualquer feature)
- [Visão geral](specs/overview.md)
- [Modelos de dados](specs/models.md)
- [API endpoints](specs/api.md)
- [Frontend](specs/frontend.md)
- [Emails](specs/email.md)

## Regras importantes
- Máximo de 10 equipes aprovadas. Enforce no backend, não só no frontend.
- Ao aprovar ou recusar uma equipe, disparar e-mail para TODOS os membros.
- Admin autentica via JWT. Participantes NÃO têm login.
- Equipe só pode ser submetida com exatamente 4 participantes e 1 líder.