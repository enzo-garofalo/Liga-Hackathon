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

**Status:** confirmada. A preferência inicial era "domínio generalizado", mas o critério
que a Liga colocou foi reaproveitar o máximo possível **sem risco de quebrar o hackathon**
— e é justamente unificar que exigiria alterar a tabela `Team`, que tem dados em produção.
Domínios paralelos só criam tabelas novas.

Reaproveitar não depende de unificar: `Participant`, `Notification`, os endpoints de
autenticação, Celery, o backend de e-mail, o `client.ts`, `ProtectedRoute`, `AppLayout`,
`NotificationBell` e o design system são todos usados pelo seletivo sem reescrita. O que é
código novo (etapas, critérios, avaliações, entregáveis, comunicação em massa) não tem
equivalente no hackathon para reaproveitar.

---

## 3. Sem teto de aprovados no seletivo

**Decisão:** o processo seletivo não tem limite de candidatos aprovados.

**Motivo:** confirmado com a Liga. O limite de 10 equipes aprovadas é regra específica do
hackathon (capacidade do evento) e continua valendo lá, sem relação com o seletivo.

**Consequência:** nenhum campo `max_approved` no modelo da v3. A regra das 10 equipes
permanece intocada no domínio do hackathon.

---

## 4. Sem RBAC entre organizadores no MVP

> **Emendada pela decisão §10:** existe uma distinção de papel (`is_coordinator`) para
> correção anônima e designação de avaliadores. O resto desta decisão continua valendo.

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

## 5. Entregáveis usam `FileField` com volume do Railway em produção

**Decisão:** `Deliverable.file` é um `FileField` padrão do Django, gravando em
`MEDIA_ROOT`. Em produção, `MEDIA_ROOT` aponta para um **volume do Railway** montado no
serviço do backend.

**Motivo:** o arquivo não pode viver no sistema de arquivos comum do container, que é
recriado a cada deploy — o candidato envia o case na semana 2 e os avaliadores precisam
abri-lo na semana 3. O [Railway oferece volumes](https://docs.railway.com/volumes) que
persistem entre deploys e restarts, o que resolve isso sem dependência nova.

Bucket externo (S3, Cloudflare R2, Supabase Storage) resolveria o mesmo problema ao custo
de mais uma conta, mais credenciais e `django-storages`. O volume de dados é de centenas
de megabytes no pior caso — não justifica.

**Correção de rumo:** as versões anteriores deste documento afirmavam que o Railway não
tem disco persistente. Era informação errada, e ela superdimensionou esta decisão durante
várias fases do projeto.

**Ressalvas do volume:** liga-se a um único serviço, e o backup é responsabilidade da
Liga. Como os cases são a entrega que não pode ser perdida, vale um management command
que baixe uma cópia ao fim de cada etapa.

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

---

## 10. Baremas ponderados, escala 1–5, correção anônima e designação

**Decisão:** implementar as quatro regras que o *Planejamento do Processo Seletivo* da
Liga define e que a implementação inicial contrariava.

**Motivo:** o documento de planejamento chegou depois das fases 1 a 6, e a comparação
apontou cinco divergências. Três delas mudavam a **nota do candidato**:

1. **Peso por critério.** O barema dá 20% a "Pensamento crítico" e 10% a "Estrutura e
   clareza"; o código fazia média simples. Agora `EvaluationCriterion.weight` e média
   ponderada.
2. **Peso por etapa.** `Case 35% + Pitch 30% + Entrevista 35%`; o código fazia média das
   médias. Agora `Stage.weight`.
3. **Escala 1–5.** O planejamento argumenta explicitamente contra "falsa precisão como
   7,3"; o código aceitava 0–10 com duas casas. Agora `Process.score_min/score_max`,
   configurável por processo, com 0 reservado para ausência de entrega.

As outras duas são estruturais:

4. **Correção anônima.** "O avaliador verá apenas um identificador do candidato." A ficha
   mostrava nome, e-mail, telefone e redes na mesma tela da nota. Agora `Application.code`
   e anonimização automática, ligável por processo.
5. **Designação de avaliadores.** "Cada entrega avaliada por dois corretores", "avaliadores
   distribuídos entre diferentes candidatos", terceiro avaliador quando a diferença passa
   de 1,5. Agora `StageAssignment`, distribuição automática em rodízio e
   `needs_third_review` no resumo.

**Consequência:** peso zero em tudo mantém o comportamento antigo (peso igual), então um
processo montado sem barema continua funcionando. Pesos configurados precisam somar 100% —
somar 90 produziria nota diferente da comunicada aos candidatos, e o erro passaria
despercebido porque a média ponderada continua devolvendo um número plausível.

**Isto emenda a decisão §4.** Continua não havendo RBAC por funcionalidade — qualquer
`is_staff` cria processo, move etapa e envia comunicado. Mas passa a existir **uma**
distinção de papel: `OrganizerProfile.is_coordinator`. O coordenador vê a identidade dos
candidatos e administra as designações; o avaliador comum vê códigos e só pontua quem lhe
foi designado. Sem essa distinção, correção anônima seria decorativa — bastaria abrir a
ficha do candidato para ver quem é.
