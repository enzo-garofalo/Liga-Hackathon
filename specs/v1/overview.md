# Visão geral do sistema

## Objetivo
Site de inscrições para o Hackathon da Liga de TI. Equipes se cadastram,
aguardam aprovação dos administradores e recebem notificação por e-mail.

## Personas
1. **Participante** — estudante que se inscreve em uma equipe. Sem login.
2. **Administrador** — membro da Liga de TI. Faz login via JWT e gerencia equipes.

## Fluxo principal
1. Líder preenche formulário com dados da equipe + 4 participantes.
2. Equipe é criada com status `pending`.
3. Admin acessa dashboard, visualiza equipes pendentes.
4. Admin aprova (máx. 10) ou recusa uma equipe.
5. Sistema dispara e-mail para todos os membros com resultado.

## Restrições de negócio
- Máximo de 10 equipes com status `approved` simultaneamente.
- Tentativa de aprovar a 11ª equipe retorna erro 400.
- Uma equipe recusada pode ser visualizada mas não pode ser reaberta.
- Cada participante é único por e-mail dentro da mesma equipe.
  (Não impede o mesmo e-mail em equipes diferentes — regra de negócio a definir.)

## Fora do escopo (não implementar)
- Pagamento, planos ou assinaturas.
- Upload de arquivos ou anexos na proposta.
- Login para participantes.
- Edição da inscrição após submissão.