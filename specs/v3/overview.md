# Visão geral — v3 (Processo Seletivo)

## O que é a v3

A v3 adiciona ao projeto um **módulo de processo seletivo** para entrada na Liga de TI,
sem remover nada do hackathon já existente.

Hoje o processo seletivo da Liga é conduzido em Google Forms + Notion + planilhas +
WhatsApp. A v3 centraliza inscrição, etapas, avaliações e comunicação em um lugar só.

## Escopo

**Dentro do escopo (MVP):**
- Candidato cria conta, se inscreve em um processo seletivo e acompanha sua evolução.
- Organizador cria processos, configura etapas, avalia candidatos, move candidatos entre
  etapas e envia comunicados.
- Comunicação automática por e-mail em cada mudança de status.

**Fora do escopo (v3):**
- Multi-organização / multi-tenant (a Liga é a única organização; ver [decisions.md](decisions.md)).
- RBAC granular entre organizadores.
- Entrevistas por vídeo, integração com calendário, Discord, app mobile.
- Dashboard analítico avançado e relatórios.
- IA para decidir aprovações.

## Relação com v1 e v2

| Versão | Domínio | Situação |
|--------|---------|----------|
| v1 | Hackathon (inscrição de equipe em formulário único) | Histórico — não usar como referência |
| v2 | Hackathon (equipes de 4, convites, pedidos de entrada, aprovação) | **Em produção, permanece funcionando** |
| v3 | Processo seletivo individual com etapas e avaliações | **Novo — objeto destes specs** |

A v3 **não altera** os modelos, endpoints ou telas do hackathon. Os dois domínios
convivem em paralelo dentro do mesmo projeto. Ver [decisions.md](decisions.md) §2.

## Atores

### Candidato
Usuário comum (`User` + `Participant`, sem `is_staff`).
Se inscreve, envia entregáveis, acompanha em qual etapa está e recebe comunicações.

### Organizador
Usuário com `is_staff=True` + `OrganizerProfile`.
Cria e publica processos, configura etapas e critérios, avalia candidatos, move
candidatos entre etapas, envia comunicados.

No MVP **todo organizador pode tudo** — `role_title` ("Diretor de Operações") é apenas
informativo na interface. Ver [decisions.md](decisions.md) §4.

## Fluxo completo do produto

```text
ORGANIZADOR                              CANDIDATO
-----------                              ---------
Cria processo (draft)
Configura etapas + critérios
Abre inscrições (published)  ────────>   Vê processo em "Processos disponíveis"
                                         Vê detalhes e se inscreve
                             <────────   Candidatura criada (in_progress)
                                         Recebe e-mail de confirmação
Vê candidato na aba Candidatos
Avalia (notas por critério)
Move para próxima etapa      ────────>   Recebe e-mail de convocação
                                         Envia entregáveis da etapa
Avalia / reprova / aprova    ────────>   Recebe e-mail de resultado
Envia comunicados            ────────>   Recebe e-mail
Encerra processo (closed)
```

## Ciclo de vida

**Processo:** `draft` -> `published` -> `closed`
- `draft` — só organizadores veem. Pode ser editado e excluído livremente.
- `published` — visível para candidatos. Inscrições abertas dentro do período configurado.
- `closed` — encerrado. Nenhuma inscrição nova, nenhuma avaliação nova.

<<<<<<< HEAD
**Candidatura:** `in_progress` -> `approved` | `rejected` | `discarded`
- `in_progress` — participando; `current_stage` indica onde está.
- `approved` — aprovado na última etapa; entra na Liga.
- `rejected` — reprovado em alguma etapa pelo organizador.
- `discarded` — desistência ou descarte administrativo.
=======
**Candidatura:** `in_progress` -> `approved` | `rejected` | `discarded` | `withdrawn`
- `in_progress` — participando; `current_stage` indica onde está.
- `approved` — aprovado na última etapa; entra na Liga.
- `rejected` — reprovado em alguma etapa pelo organizador.
- `discarded` — descarte administrativo, decidido pela organização.
- `withdrawn` — o próprio candidato cancelou a inscrição, dentro do prazo de
  inscrição. É o único estado do qual se volta: inscrever de novo devolve a
  candidatura para `in_progress` (decisions.md §28).
>>>>>>> feature/v3-processo-seletivo

## Stack

Sem mudança em relação ao que já está em produção: Django 5 + DRF + SimpleJWT +
PostgreSQL no backend; React 18 + TypeScript + Vite + Tailwind + React Query no frontend;
Docker Compose em desenvolvimento e Railway em produção. E-mail via console em
desenvolvimento e Resend em produção.

A única dependência nova é armazenamento de arquivos para os entregáveis dos candidatos.
Ver [decisions.md](decisions.md) §5.

## Organização dos specs

| Arquivo | Conteúdo |
|---------|----------|
| [overview.md](overview.md) | Este arquivo — escopo, atores, fluxo, ciclo de vida |
| [decisions.md](decisions.md) | Decisões tomadas e suas justificativas (ADR) |
| [models.md](models.md) | Modelos de dados e regras de validação |
| [api.md](api.md) | Endpoints REST |
| [frontend.md](frontend.md) | Rotas, páginas, componentes e hooks |
| [email.md](email.md) | Comunicações automáticas e manuais |
| [tests.md](tests.md) | Cobertura de testes esperada |
| [roadmap.md](roadmap.md) | Ordem de implementação em fatias verticais |

O [design system da v1](../v1/design.md) continua valendo para toda a interface da v3.
