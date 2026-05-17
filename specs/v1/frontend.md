# Frontend — React + TypeScript + MVVM

## Páginas

### / — Página de inscrição (pública)
- Formulário multi-step ou single-page para cadastro da equipe.
- Step 1: dados da equipe (nome, título, proposta).
- Step 2: dados dos 4 participantes. Campo GitHub opcional.
- Marcar qual é o líder com radio button.
- Submit → POST /api/v1/teams/ → redirecionar para /confirmacao/{id}.

### /confirmacao/:id — Confirmação (pública)
- Exibe os dados da equipe cadastrada.
- Mensagem: "Sua inscrição foi recebida e está aguardando aprovação."

### /admin/login — Login do admin
- Formulário simples: usuário e senha.
- Chama POST /api/v1/auth/token/.
- Guarda tokens no sessionStorage (não localStorage).
- Redireciona para /admin/dashboard.

### /admin/dashboard — Dashboard (protegida)
- Tabela de equipes com filtro por status.
- Colunas: nome, título, líder, status, data.
- Botões de ação: Aprovar / Recusar (só visíveis para equipes pending).
- Contador: "X de 10 vagas preenchidas".
- Confirmação antes de aprovar/recusar.

## Padrão MVVM
- `Model`: tipos TypeScript + funções de API (React Query hooks).
- `ViewModel`: hooks customizados (ex: `useTeamRegistration`, `useAdminDashboard`).
- `View`: componentes React que só consomem o ViewModel, sem lógica.

## Tecnologias
- React Query para cache e mutações.
- React Hook Form para formulários.
- Tailwind CSS para estilos.
- React Router v6 para navegação.
- Axios para HTTP.

## O que NÃO fazer
- Não duplicar lógica de validação no frontend que já existe no backend.
- Não gerenciar estado global com Redux. React Query é suficiente.
- Não usar any no TypeScript. Tipar todos os responses da API.