# Decisões — v3

Registro das decisões tomadas antes da implementação da v3, com o motivo de cada uma.
Serve para não reabrir discussão já resolvida e para deixar claro o que foi assumido.

---

## 1. Processo seletivo é individual, não por equipes

**Decisão:** a candidatura é de uma pessoa. Não há formação de equipe no seletivo.

**Motivo:** o hackathon (v2) é por equipes de 4 porque o evento é em equipe. O processo
seletivo avalia pessoas para entrar na Liga — cada candidato é avaliado individualmente.

**Consequência:** `Team`, `TeamMembership`, `TeamInvite` e `JoinRequest` não são usados
pelo domínio da v3.

---

## 2. Hackathon e seletivo ficam como domínios paralelos

**Decisão:** criar o app `apps/recruitment/` com os modelos novos. Não alterar os modelos
do hackathon. Não criar FK entre os dois domínios.

**Motivo:** a conversa inicial considerou generalizar `Team` para servir aos dois casos
(um `Process` com `type: hackathon | selective`). Depois que o material de produto e os
wireframes chegaram, ficou claro que o seletivo tem forma bem diferente do hackathon —
etapas ordenadas, critérios por etapa, múltiplos avaliadores, entregáveis, comunicação em
massa. Forçar os dois no mesmo modelo geraria campos nulos em metade das linhas e regras
condicionais por `type` em quase todo service.

Como existem dados reais do hackathon em produção, domínios paralelos também é a opção de
menor risco: a v3 só cria tabelas novas, não migra nem altera nada existente.

**Consequência:** se no futuro a Liga quiser rodar o hackathon como um "tipo" de processo
seletivo, isso vira uma v4 com unificação explícita. Não é objetivo agora.

**Status:** assumida com base no material novo. Contraria a preferência inicial por
"domínio generalizado" — se o time quiser reverter, é melhor decidir antes de gerar as
migrations.

---

## 3. Sem teto de aprovados no seletivo

**Decisão:** o processo seletivo não tem limite de candidatos aprovados.

**Motivo:** confirmado com a Liga. O limite de 10 equipes aprovadas é regra específica do
hackathon (capacidade do evento) e continua valendo lá, sem relação com o seletivo.

**Consequência:** nenhum campo `max_approved` no modelo da v3. A regra das 10 equipes
permanece intocada no domínio do hackathon.

---

## 4. Sem RBAC entre organizadores no MVP

**Decisão:** qualquer usuário com `is_staff=True` pode criar processo, configurar etapas,
avaliar candidatos, mover entre etapas e enviar comunicados. `OrganizerProfile.role_title`
("Diretor de Operações") é apenas exibido na interface.

**Motivo:** confirmado com a Liga, considerando o prazo. Os wireframes mostram "Cargo" e
"Permissão" no perfil do organizador, mas diferenciar avaliador de administrador exigiria
um modelo de permissões por etapa e checagens em todos os endpoints — trabalho que não
cabe agora e que não bloqueia o uso real.

**Consequência:** o campo de permissão na tela de perfil é informativo. Quando houver
necessidade real (ex.: avaliadores convidados de fora da diretoria), isso vira uma
evolução com modelo próprio.

---

## 5. Entregáveis usam `FileField` com storage local em desenvolvimento

**Decisão:** `Deliverable.file` é um `FileField` padrão do Django. Em desenvolvimento,
storage local em `MEDIA_ROOT`. Em produção, é preciso um bucket externo.

**Motivo:** o Railway não garante disco persistente entre deploys — arquivo salvo em disco
some no próximo deploy. Como o candidato envia PDF/ZIP/PPTX que o organizador precisa
abrir semanas depois, isso não pode ficar em disco efêmero.

**Pendência:** escolher o storage de produção (S3, Cloudflare R2 ou Supabase Storage) e
adicionar `django-storages`. **Isto bloqueia a Fase 4 do roadmap**, não as anteriores.

---

## 6. `Participant` continua morando em `apps/teams/`

**Decisão:** o app `recruitment` importa `Participant` e `Notification` de `apps.teams`.

**Motivo:** `Participant` já tem exatamente os campos que o perfil do candidato precisa
(`full_name`, `course`, `semester`, `phone`, `github`, `linkedin`, `bio`) e já tem dados em
produção. Mover um model entre apps no Django exige `SeparateDatabaseAndState` e mexe em
tabela com dados reais — risco sem retorno agora.

**Consequência:** o nome do app fica semanticamente estranho (candidato importado de
`teams`). Aceitável. Um refactor futuro pode mover `Participant` e `Notification` para um
app `accounts/`, e é mais seguro fazer isso quando não houver prazo em cima.

---

## 7. Um app só (`recruitment`), não quatro

**Decisão:** todos os modelos novos ficam em `apps/recruitment/`, seguindo a organização
interna que o app `teams` já usa (`models.py`, `serializers.py`, `services/`, `views.py`,
`urls.py`, `emails.py`, `tests/`).

**Motivo:** o documento de arquitetura previa `users/`, `recruitment/`, `evaluation/` e
`notifications/` separados. Para o tamanho do MVP isso são quatro apps que se importam
mutuamente o tempo todo (avaliação não existe sem candidatura, notificação não existe sem
processo). O princípio do projeto é código simples, sem over-engineering.

**Consequência:** se `recruitment` crescer demais, separar `evaluation` depois é um
refactor localizado — os modelos de avaliação quase não são referenciados fora dele.

---

## 8. Um candidato participa de um processo por vez

**Decisão:** `unique_together(process, participant)` — uma candidatura por processo.

**Motivo:** premissa do documento de MVP. Não impede o mesmo candidato de se inscrever em
um processo futuro (2026.2 e depois 2027.1), apenas impede candidatura duplicada no mesmo.

---

## 9. Médias são calculadas, não persistidas

**Decisão:** média por critério, média da etapa e nota final são calculadas em service a
partir das linhas de `Evaluation`. Não existem campos `average` no banco.

**Motivo:** nota persistida desatualiza quando um avaliador edita a nota depois. O volume
é pequeno (centenas de candidatos, poucos critérios), então calcular na hora não é problema
de performance.

**Consequência:** se a listagem de candidatos ficar lenta com volume real, a saída é
anotar a média na query (`annotate`), não criar campo desnormalizado.
