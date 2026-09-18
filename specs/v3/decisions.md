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

> **Emendada pela decisão §12:** superusuário também conta como coordenador.

**Isto emenda a decisão §4.** Continua não havendo RBAC por funcionalidade — qualquer
`is_staff` cria processo, move etapa e envia comunicado. Mas passa a existir **uma**
distinção de papel: `OrganizerProfile.is_coordinator`. O coordenador vê a identidade dos
candidatos e administra a distribuição; o avaliador comum vê códigos. Sem essa distinção,
correção anônima seria decorativa — bastaria abrir a ficha do candidato para ver quem é.

> **Emendado pela §19:** a parte de "só pontua quem lhe foi designado" caiu. A designação
> continua existindo para distribuir a correção, mas não é permissão.

---

## 11. Hackathon desativado na interface, não removido

**Decisão:** o módulo do hackathon sai da interface por uma chave,
`SHOW_HACKATHON` em `frontend/src/featureFlags.ts`, desligada. Nada é apagado.

**Motivo:** a Liga passou a usar a plataforma para o processo seletivo, e as telas de
equipe (equipes abertas, convites, prazo de formação, selo "Sem equipe") confundiam o
candidato. Mas o hackathon é recorrente e está em produção: apagar o código obrigaria a
reescrever ou garimpar o histórico do git na próxima edição.

Uma chave só, em um arquivo próprio, porque o hackathon aparece em quatro lugares
(dashboard, menu lateral, banner de prazo, perfil) — uma constante por arquivo deixaria
fácil religar três e esquecer o quarto.

**Consequências:**
- Religar é trocar `false` por `true`. Nenhum outro ajuste é necessário.
- Com a chave desligada, as consultas do hackathon (equipes, convites, `/info/`) não são
  disparadas. Esconder só o bloco manteria a tela do candidato dependendo desses
  endpoints. Por isso `useOpenTeams` e `useMyInvites` ganharam um parâmetro `enabled`,
  com padrão `true` para não alterar as páginas do hackathon.
- O backend do hackathon não foi tocado e continua respondendo.
- As rotas `/teams` e `/teams/:id` continuam acessíveis por URL — só a navegação saiu.
- Há teste de frontend que falha se a chave for religada sem querer.

**Pendente:** a landing page (`/`) ainda apresenta o hackathon e será tratada depois que o
resto estiver funcionando.

---

## 12. Superusuário conta como coordenador

**Decisão:** `is_coordinator()` devolve verdadeiro para `is_superuser`, além de para
`OrganizerProfile.is_coordinator`.

**Motivo:** encontrado usando o sistema de verdade, não por teste. O superusuário que
instala a plataforma não tinha `OrganizerProfile` e caía na correção anônima — via
`C-0001` no lugar de todos os nomes e não conseguia identificar ninguém. Não existe tela
para marcar `is_coordinator`, então ele não teria como sair disso sem o Django Admin.

**Isto emenda a decisão §10**, que dizia que só `is_coordinator` enxerga identidade.

**Consequência:** o seed de demonstração marca o "Diretor de Operações" como
coordenador e a "Diretora de Projetos" como avaliadora, espelhando o planejamento
(1 coordenador + avaliadores).

---

## 13. Datas exibidas no fuso da Liga

**Decisão:** toda data formatada no **backend** para leitura humana passa por
`timezone.localtime()` (`TIME_ZONE = 'America/Sao_Paulo'`). O frontend não precisa: o
navegador já converte.

**Motivo:** encontrado testando o envio do case. O banco guarda em UTC e a mensagem de
prazo encerrado mostrava **17:11** quando o prazo real era **14:11**. Nos e-mails era
pior: eles mostram só dia e mês, então um prazo às **23:59 de 25/08** sairia como
**"até 26/08"** — o candidato leria um dia inteiro a mais do que tem.

**Consequência:** `emails._date()` e a mensagem de prazo em `services/deliverables.py`
convertem antes de formatar. O teste usa de propósito um horário que cai no dia seguinte
em UTC, para travar exatamente esse caso.

---

## 14. Testes de frontend com Vitest

**Decisão:** Vitest + Testing Library + jsdom, com os testes em `frontend/src/test/` e
configuração própria em `vitest.config.ts`.

**Motivo:** o projeto não tinha nenhum teste de frontend nem infraestrutura para eles. O
frontend já usa Vite, e o Vitest reaproveita o pipeline de transformação dele — não
exige Babel, Jest nem configuração paralela de TypeScript.

A configuração é separada do `vite.config.ts` porque o de desenvolvimento aponta o proxy
para o serviço `backend` do Docker, o que não interessa aos testes.

**Consequências:**
- `npm test` roda a suíte; `npm run test:watch`, em modo contínuo.
- A API é simulada com `vi.mock` nos módulos de `src/api/`. MSW seria mais fiel, mas é
  mais uma dependência e mais configuração para o tamanho atual da suíte.
- Os testes foram conferidos por sabotagem: cada regra importante foi quebrada de
  propósito para confirmar que algum teste falha. Um deles passava mesmo com o bug — o
  cenário não chegava a exercitar a regra — e foi corrigido.
- Os arquivos de teste ficam dentro de `src/` e entram no `tsc` do build. Isso é
  proposital: teste que não compila é detectado antes do deploy.
- Versão **3.2.7**. A 2.1.x trazia um alerta crítico (leitura de arquivo pela interface
  web do Vitest). Resta um alerta moderado em `@vitest/mocker`, corrigido só na 4.x, que
  exige Vite 6 — atualizar o Vite mexe no build de produção e fica para decisão própria.
  Nenhum dos dois afeta produção: são dependências de desenvolvimento.

---

## 15. Rótulo associado ao campo nos inputs compartilhados

**Decisão:** `ui/Input.tsx` e `ui/PasswordInput.tsx` passam a gerar um `id` (via `useId`)
e ligar o `<label>` a ele com `htmlFor`, além de apontar o erro por `aria-describedby`.

**Motivo:** encontrado ao escrever teste da Fase 8 — a Testing Library não achava o campo
pelo rótulo. O motivo era real, não uma limitação do teste: sem a associação, o leitor de
tela não anuncia o rótulo ao focar o campo, e clicar no rótulo não foca o campo.

**Consequência:** corrige todos os formulários do projeto de uma vez, inclusive os do
hackathon, sem mudar aparência nem comportamento visível. Os `textarea` escritos na v3
seguem a mesma regra.

---

## 16. Um invólucro de modal para a v3, sem migrar os do hackathon

**Decisão:** `ui/Modal.tsx` concentra fundo, painel, título, botão de fechar e tecla Esc.
Os seis modais do organizador usam esse invólucro. `CreateTeamModal`,
`InviteMembersModal` e `TeamPreviewModal` continuam com o markup próprio.

**Motivo:** o mesmo bloco estava repetido em três arquivos, e a v3 acrescentaria mais
seis. Migrar os antigos daria consistência total, mas são telas do hackathon em produção,
e o ganho é estético — não justifica o risco. Ficam como estão até alguém precisar mexer
neles por outro motivo.

---

## 17. Publicar e editar o processo moram na tela do processo

**Decisão:** o card do dashboard do organizador leva a "Gerenciar processo" em qualquer
status, inclusive rascunho. "Editar processo", "Abrir inscrições" e "Encerrar processo"
ficam no cabeçalho de `/admin/processes/:id`. O dashboard só cria e lista. Um rascunho sem
etapa mostra um aviso apontando para a aba "Etapas". `ProcessFormModal` atende criação e
edição; a pergunta "visível para candidatos?" só aparece na criação.

**Motivo:** a versão anterior oferecia "Abrir inscrições" no card do rascunho e nenhum link
para a tela do processo. Como publicar exige ao menos uma etapa e etapa só se configura
dentro do processo, um rascunho recém-criado ficava sem saída: o único botão disponível
era justamente o que o backend recusava. Faltava também qualquer tela para
`PATCH /admin/processes/{id}/`, então as datas de início e fim das inscrições eram
definidas na criação e nunca mais podiam ser corrigidas.

**Consequência:** as datas do formulário são `datetime-local` — horário local na tela,
UTC no payload. Um fim de inscrição às 23:59 em Brasília chega ao backend como 02:59 UTC
do dia seguinte, coerente com a §13.

---

## 18. O processo seletivo nasce junto com o ambiente

**Decisão:** `manage.py ensure_selection_process` cria o processo da Liga com as quatro
etapas e o barema inteiro, e roda no `entrypoint.sh` logo depois das migrations, ao lado
do "garantir superusuário". O desenho (nomes, pesos, critérios, regras de arquivo) mora em
`apps/recruitment/blueprint.py`, lido também pelo `seed_recruitment_demo`.

O comando **não altera processo que já existe** — se achar um com o mesmo nome, não faz
nada. E o processo **nasce como rascunho**.

**Motivo:** o processo só existia no banco local, montado à mão. Um ambiente novo subia
com a tela do organizador vazia, e remontar 4 etapas e 19 critérios à mão é justamente
onde o barema sai errado — e barema errado só aparece na hora de fechar nota.

Os dois cuidados têm o mesmo pano de fundo: o comando roda a cada deploy.

- **Não sobrescrever** porque o organizador ajusta datas e pesos pela interface. Um deploy
  que resetasse isso desfaria o trabalho dele sem avisar.
- **Nascer rascunho** porque publicar abre inscrições para gente de verdade e passa a
  mostrar o processo na área do candidato. Isso é decisão de organizador, por "Abrir
  inscrições" (§17), não efeito colateral de um `git push`.

**Consequência:** as datas criadas são um ponto de partida (etapas em sequência a partir
de agora). Conferir em "Editar processo" antes de abrir as inscrições.

---

## 19. Designação distribui trabalho, não concede permissão

**Decisão:** qualquer organizador (`is_staff`) salva nota de qualquer candidato.
`StageAssignment`, o modelo e os endpoints de distribuição continuam de pé, mas deixaram
de ser pré-requisito para avaliar. **Isto emenda a §10.**

**Motivo:** a trava foi escrita junto com o modelo, e nunca houve tela para designar
ninguém — os endpoints existem só na API. Na prática, todo organizador que não fosse
coordenador preenchia as notas na ficha do candidato, clicava em salvar e recebia
403 "Você não foi designado para avaliar este candidato nesta etapa", sem nenhum caminho
na interface para resolver. A regra protegia a independência dos dois pareceres, mas
custava a correção inteira: só o coordenador conseguia avaliar.

Havia duas saídas — construir a tela de designação ou tirar a trava. A Liga escolheu tirar
a trava, que é o caminho que funciona hoje, com a comissão inteira corrigindo.

**O que se perde:** não há mais garantia, imposta pelo sistema, de que dois avaliadores
independentes corrigiram cada candidato, nem de que ninguém corrigiu quem não devia. A
divergência acima do limiar continua marcando `needs_third_review`, então o sinal de
"precisa de um terceiro olhar" permanece — o que sumiu é a barreira, não o indicador.

Se um dia a distribuição precisar valer de verdade, o caminho é construir a tela de
designação e reintroduzir a trava, não o contrário.

---

## 20. A landing vira do processo seletivo; a do hackathon fica atrás da chave

**Decisão:** `/` passa a apresentar o processo seletivo e a Liga. A landing do hackathon
foi preservada inteira em `pages/LandingPageHackathon.tsx`, e a rota escolhe entre as duas
por `SHOW_HACKATHON`. A empresa parceira daquela edição saiu de todo o projeto — landing,
telas de login e cadastro, CSS e o arquivo do logo.

A página ganhou uma seção de acesso com os **dois caminhos separados**: "Sou candidato"
(criar conta ou entrar) e "Sou organizador" (login da comissão). Antes havia só um "Entrar"
genérico apontando para a área do candidato, e o login de organizador não era alcançável
pela home — só por quem já soubesse a URL `/admin/login`.

**Motivo:** a Liga usa a plataforma para o seletivo, e a home ainda vendia um evento de
junho com equipes de quatro pessoas. Preservar a versão antiga em vez de reescrever por
cima segue a §11: religar o hackathon continua sendo trocar uma chave, sem ter que
reconstruir a home. O conteúdo novo vem do planejamento do processo seletivo (etapas,
pesos, escala 1–5, política de IA, correção anônima) e do manual de onboarding da Liga
(missão, valores, o que a pessoa ganha ao entrar).

**Consequência:** os pesos das etapas aparecem em dois lugares — em `blueprint.py`, que
cria o processo, e no texto da landing. São públicos por decisão da Liga ("nenhuma regra
usada para avaliar alguém aparece pela primeira vez no resultado"), mas mudar o barema
exige lembrar da landing. Um teste confere que os três pesos exibidos somam 100.

---

## 21. O prazo na landing vem da API, não do código

**Decisão:** `GET /api/v1/open-process/` é aberto (`AllowAny`, sem autenticação) e devolve
nome e janela de inscrições do processo publicado, ou `null` quando não há nenhum. A
landing lê dali para mostrar o período no hero e no FAQ.

O serializer é próprio (`OpenProcessSerializer`) com quatro campos escolhidos a dedo, em
vez de reaproveitar o do organizador: este endpoint é público, e o outro carrega escala de
nota, limiar de divergência e contadores que são assunto interno.

**Motivo:** escrever as datas no código criaria uma segunda fonte da verdade. O organizador
já define o período em "Editar processo" (§17); com data chumbada, mudar o prazo exigiria
editar arquivo e subir de novo, e esquecer um dos dois deixaria o site dizendo uma coisa e
o sistema outra — com candidato no meio.

**Consequência:** enquanto o processo está em `draft`, a landing não mostra data nenhuma.
É proposital: as datas de rascunho são provisórias (`ensure_selection_process` cria o
período a partir do dia do deploy, §18), e anunciá-las seria mentir. O prazo aparece
quando alguém clicar em "Abrir inscrições".
