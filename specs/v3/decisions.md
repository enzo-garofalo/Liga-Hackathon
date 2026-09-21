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

> **Superada pela decisão §29:** existem dois cargos com poderes diferentes, coordenador e
> avaliador, e a distinção vale em todos os endpoints. O registro fica pelo histórico: a
> evolução prevista no último parágrafo é exatamente a que aconteceu.

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
>
> **Emendado pela §23:** a correção anônima foi desligada nesta edição. O mecanismo
> continua no código, atrás de `Process.anonymous_evaluation`.

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

> **Superada pela decisão §29:** a tela de designação foi construída e a trava voltou, que é
> a saída que o último parágrafo desta decisão já apontava.

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

---

## 22. Permissão e a chave do hackathon viram teste, não conferência manual

**Decisão:** a revisão de permissões e a checagem do fluxo antigo com
`SHOW_HACKATHON = true` deixaram de ser tarefas de checklist e viraram suíte.

`tests/test_permissions.py` percorre o URLconf e exige que **toda** rota `/admin/`
recuse candidato (403) e anônimo (401). Endpoint novo entra no teste sozinho, sem
ninguém lembrar de acrescentá-lo. Um teste extra confere que a varredura achou as
rotas: varredura vazia passaria em tudo sem testar nada.

`src/test/HackathonFlag.test.tsx` simula a chave ligada com `vi.mock` e renderiza o
dashboard, o perfil e a rota `/`, conferindo que o bloco de equipes, o selo e a
landing antiga voltam.

**Motivo:** o `CLAUDE.md` manda conferir o hackathon a cada mexida em arquivo
compartilhado, e mexemos em vários. Conferência manual só acontece enquanto alguém
lembra; a suíte roda os dois estados a cada commit.

**O que a revisão encontrou:** as permissões estavam corretas — todas as views
`Admin*` com `IsAdminUser`, padrão do DRF em `IsAuthenticated`, dono verificado no
download e na exclusão de entregável. O buraco era de cobertura, não de código: o
login de organizador recusa quem não é `is_staff`, mas nada testava isso. Se a
validação caísse, um candidato entraria pela tela da comissão e cairia num painel
que recusa tudo. Agora tem teste, com contraprova de que organizador continua entrando.

---

## 23. Correção sem anonimato nesta edição

> **Superada pela decisão §29:** o anonimato voltou, agora marcado na etapa (só o case) em
> vez de no processo inteiro.

**Decisão:** o processo nasce com `anonymous_evaluation=False`. Todo organizador vê nome,
e-mail e bio do candidato ao corrigir. **Isto emenda a §10**, que definia correção anônima
por padrão.

O mecanismo continua inteiro no código: `hide_identity`, `anonymize`, `IDENTITY_FIELDS` e
os testes de anonimato seguem funcionando e cobertos. Religar é marcar o campo do processo
no Django Admin — nada precisa ser reescrito.

**Motivo:** decisão da Liga. A comissão é pequena e conhece boa parte dos candidatos de
vista; o anonimato dava trabalho de operação sem resolver o que pretendia.

**O que se perde:** o planejamento do processo seletivo (seção 8) pede correção anônima
justamente para a nota não ser influenciada por quem escreveu. Sem ela, essa proteção passa
a depender da disciplina de quem corrige. A observação fica registrada aqui porque a decisão
contraria um documento da própria Liga, e quem reabrir o assunto merece saber disso.

**Consequência prática:** `is_coordinator` perde metade da sua razão de existir. Continua
marcando quem administra a distribuição de avaliadores, mas a diferença de enxergar a
identidade some — todos enxergam.
\n

## 24. A notificação guarda resumo e detalhe no mesmo campo

**Decisão:** `Notification.message` passa a carregar o aviso inteiro, com uma convenção de
formato: a primeira linha é o resumo, e o que vem depois de uma linha em branco é o detalhe.
O sino lista o resumo; o pop-up da notificação mostra o texto completo.

**Motivo:** o comunicado manual guardava só o assunto na notificação. O corpo que o
organizador escreveu ia apenas para o e-mail. Quem não abriu o e-mail, ou usou um endereço
que joga a Liga no spam, via "Prazo do case prorrogado" no sino e não tinha onde ler o
resto dentro da plataforma. Os avisos automáticos tinham o mesmo problema em menor grau:
uma frase só, sem prazo nem o que é pedido.

**Por que não uma coluna nova:** `Notification` mora em `apps/teams`, que está em produção
com o hackathon, e a fronteira entre os domínios proíbe mexer na estrutura desses modelos.
O campo já é `TextField`, então a convenção resolve sem migração e sem tocar na tabela.

**Consequência:** quem escrever uma notificação nova precisa respeitar o formato. Um texto
de linha única continua funcionando: o resumo é a própria linha e o pop-up fica só com ela.
O rótulo humano do tipo vai junto no JSON, como `type_display`, para o frontend não manter
uma segunda cópia da lista de tipos.


## 25. O enunciado da etapa também pode ser um PDF

**Decisão:** `Stage` ganha `instructions_file`. Quando a etapa tem arquivo anexado, o
candidato vê "Baixar o enunciado" no lugar de "O que preciso fazer", e o botão passa para a
direita da etapa na linha do tempo.

**Motivo:** o enunciado do case não cabe bem em caixa de texto. Ele tem formatação, às vezes
anexo, e muda a cada edição. O organizador escrevia num campo que não preserva nada disso.

**A regra que importa:** o arquivo segue exatamente a trava do texto, e as duas passam pela
mesma função, `services/applications.has_reached`. Antes de o candidato chegar na etapa, a
API não devolve o texto, não devolve o arquivo e **não devolve nem o nome do arquivo** — um
nome como `case-fintech-2026.pdf` entrega o tema, e a aba de rede do navegador daria dias de
vantagem a quem soubesse olhar. O download é endpoint autenticado, pela mesma razão dos
entregáveis: nada de mídia em URL pública.

**Na tela do organizador, um substitui o outro.** O campo "O que o candidato precisa fazer"
tem duas opções, Escrever e Anexar PDF, e mostra uma de cada vez — é o que o candidato vê.
Com o PDF anexado o organizador baixa, troca e remove ali mesmo. Se sobrar texto salvo
embaixo de um PDF, a tela avisa e oferece apagar: texto que fica no banco e some da tela é
armadilha para a próxima edição.

**Por que não no payload da etapa:** o resto da configuração é JSON e o arquivo é multipart.
Misturar obrigaria a converter o endpoint inteiro. O arquivo entra e sai por
`admin/stages/<id>/instructions-file/`, e a tela de configuração o trata como uma ação à
parte, que vale na hora. Consequência: etapa nova precisa ser salva antes de receber o PDF,
porque o upload precisa de um id.

**Anexar por cima apaga o anterior.** Sem isso, cada troca de enunciado deixaria uma cópia
órfã no volume, que ninguém alcança e ninguém apaga.


## 26. Processo publicado não perde etapa

**Decisão:** excluir etapa só vale enquanto o processo está em `draft`. Publicado ou
encerrado, a etapa pode ser editada, mas não removida. A tela do organizador some com o
botão de excluir e diz por quê.

**Isto aperta a regra anterior**, que deixava excluir etapa de processo publicado desde que
ela estivesse vazia de candidatos e de avaliações.

**Motivo:** o candidato lê as etapas antes de decidir se se inscreve, e o e-mail de
confirmação lista todas. Sumir com uma no meio muda o combinado depois do aceite. "Vazia
agora" também não quer dizer vazia depois: numa etapa futura ninguém chegou ainda, e é
justamente a que dá mais vontade de apagar.

**O que continua podendo:** editar nome, descrição, datas, peso, critérios e enunciado de
qualquer etapa, publicado ou não. Corrigir o que foi combinado é diferente de trocar por
outra coisa.

**O que se perde:** errar uma etapa a mais no rascunho agora custa republicar o processo.
É de propósito: publicar é o momento em que o desenho vira promessa.


## 27. Esqueci minha senha

**Decisão:** quem perde a senha pede um link por e-mail e escolhe outra em
`/reset-password`. Vale para as duas portas de entrada, candidato e organizador: a conta é a
mesma `User`, só muda a tela em que a pessoa entra depois. O link aparece sublinhado nas duas
telas de login.

**O token é o `default_token_generator` do Django, sem tabela nova.** Ele é assinado com o
hash da senha atual e o `last_login`, então deixa de valer sozinho no instante em que a senha
muda: o link serve uma vez e não sobra registro para limpar depois. Tabela nova em
`apps.teams` também esbarraria na fronteira entre os domínios, que está em produção com o
hackathon.

**O pedido responde igual para e-mail com conta e sem conta.** Um "não encontrei este
e-mail" transformaria a tela num consultor de quem é da Liga, aberto, sem login. Quem digitou
errado descobre pela caixa de entrada vazia, e a tela avisa que é para conferir o endereço.

**Teto de pedidos por IP.** É o único endpoint aberto que dispara e-mail para um endereço
escolhido por quem chama: sem teto dá para encher a caixa de qualquer pessoa e torrar a cota
do Resend de fora. O teto é generoso (20/hora) porque o campus sai todo pelo mesmo IP.

**A senha nova passa pelas mesmas regras do cadastro** (`validate_password`), senão a
redefinição viraria a porta dos fundos para uma senha fraca.

**`FRONTEND_URL` é o endereço que vai dentro do link.** O backend não tem como adivinhar em
que domínio o site está, e quem recebe o e-mail abre o navegador, não a API. Sem a variável,
cai no primeiro `CORS_ALLOWED_ORIGINS`, que em produção já é o endereço do site: é uma
herança de propósito, para o link não sair quebrado por causa de mais uma variável esquecida
no Railway.

**Sem notificação no sino.** A regra de "notificação junto com e-mail" vale para o que
acontece com a candidatura. Aqui quem esqueceu a senha não consegue entrar para ver o sino,
e o aviso tem que chegar por fora.

**A resposta diz por qual porta entrar.** Candidato e organizador têm telas de entrada
diferentes; mandar o organizador para `/login` o deixaria com a senha nova e sem conseguir
usar. A escolha é pelo perfil, não por `is_staff`, igual ao login.

**A porta acompanha a pessoa o caminho inteiro**, e não só no fim. O link da tela do
organizador vai com `?area=organizador`, e o link do e-mail sai com `&area=...` montado a
partir do mesmo `area_de`. Sem isso, todo caminho de volta ("Voltar para o login", a seta do
topo, "Lembrou a senha? Entrar") devolvia o organizador no login de candidato, que recusa a
conta dele por não ter `Participant`: a pessoa saía de uma tela de recuperar acesso para uma
mensagem de erro. Quem chega ao fim da troca não depende disso, porque aí vale o `area` da
resposta da API.


## 28. Desistir da inscrição, enquanto ela está aberta

**Decisão:** o candidato cancela a própria inscrição em `processes/{id}/withdraw/`, com
confirmação na tela, e pode se inscrever de novo depois. As duas coisas valem **até o fim do
período de inscrição**. Fechado o prazo, nem uma nem outra: sair vira assunto com a
organização.

**Por que o prazo é o limite:** dentro dele, entrar e sair não custa nada a ninguém, e
desistir é informação boa (a vaga volta para a lista). Depois dele, o processo já contou com
aquela pessoa para montar etapas, distribuir correção e planejar entrevista. Sumir no meio
disso não é uma caixa de diálogo, é uma conversa.

**A candidatura não é apagada, vira `withdrawn`.** Apagar levaria junto o código do
candidato (`C-0007`) e as entregas já feitas, e o gerador de código, que conta as
candidaturas do processo, passaria a repetir códigos de gente que saiu. `withdrawn` entra em
`FINISHED`: o organizador não move, não avalia e não aprova quem desistiu.

**Separado de `discarded` de propósito.** Descarte é decisão da organização, desistência é do
candidato. O mesmo estado para as duas faria o histórico mentir sobre quem decidiu, e é
justamente o que o organizador precisa distinguir na lista.

**Voltar atrás reaproveita a mesma linha.** Inscrever de novo devolve `status=in_progress` e
a primeira etapa, mantendo o código. Código novo a cada ida e volta bagunçaria a correção
anônima, e uma segunda candidatura esbarraria na regra de uma por processo.

**Quem desistiu some de onde "inscrito" é o que importa:** `already_applied` volta a ser
`false` (senão cancelar seria porta só de ida, com a tela recusando nova inscrição), o tile
"Inscritos" não conta essa pessoa, e o alerta "você ainda não se inscreveu" volta a aparecer
no dashboard. Descartado continua contando como inscrito: essa pessoa se inscreveu, quem a
tirou foi a organização.

**A ação mora nos dois lugares em que a pessoa procura:** o cartão do processo no
dashboard, logo abaixo de "Ver candidatura", e a página do processo. O dashboard é onde ela
cai ao entrar; para achar a página do processo é preciso saber que ela existe. Os dois
passam pela mesma confirmação, e quem diz se o botão aparece é o `can_withdraw` da API.

**Sem e-mail e sem notificação.** A regra de "notificação junto com e-mail" existe para o que
a plataforma decide sobre a candidatura, e aqui quem decidiu foi a própria pessoa, que está
olhando a tela e acabou de confirmar num diálogo. O histórico de comunicações também não
registra: ele guarda o que foi dito ao candidato, e nada foi dito.

---

## 29. Dois cargos de organizador, e o anonimato volta na etapa do case

**Decisão:** o organizador tem dois cargos de verdade, com poderes diferentes. Isto emenda a
§4 (sem RBAC), a §19 (designação não é permissão) e a §23 (sem anonimato nesta edição).

- **Coordenador** (`OrganizerProfile.is_coordinator`, ou superusuário): monta o processo,
  chama quem vai ajudar, distribui as correções, decide resultado. É o cargo do Bruno, e
  nada muda para ele.
- **Avaliador**: entra num processo a convite do coordenador e faz uma coisa só, dar nota
  no que lhe foi distribuído. Não aprova, não reprova, não move de etapa, não descarta, não
  escreve comunicado, não cria nem edita processo ou etapa, não publica e não encerra.

**Por que a linha de corte é essa.** Tudo que dispara e-mail para candidato ou muda o rumo
de uma pessoa é do coordenador. O avaliador opina; quem decide é quem organiza o processo e
responde por ele. Não é desconfiança de quem foi chamado, é que a Liga precisa saber de
quem partiu cada decisão, e "qualquer um podia ter feito" não responde isso.

**A entrada é por processo, não global.** `ProcessOrganizer` diz em qual processo cada
pessoa trabalha. Ser `is_staff` deixa entrar na área do organizador; ser membro daqui é o
que mostra um processo. Sem isso, quem fosse chamado para corrigir um case enxergaria a
edição inteira de outro ano, com nome e nota de gente que não tem nada com ele.

**O avaliador vê só a própria fila.** A lista de candidatos do processo devolve, para quem
não coordena, apenas as candidaturas distribuídas a ele; a ficha e as notas seguem a mesma
regra, e a resposta é 404, não 403: a candidatura dos outros não existe para ele. Fechar só
a lista não adiantaria nada, bastava trocar o id na barra de endereços.

**A designação volta a ser trava.** A §19 tirou a trava porque não havia tela para designar
ninguém, e o avaliador ficava preso: preenchia a nota, clicava em salvar e levava 403 sem
caminho nenhum para resolver. A §19 já dizia qual era a saída, "construir a tela de
designação e reintroduzir a trava", e é o que esta decisão faz. A garantia de dois pareceres
independentes por case volta a valer.

**A distribuição cobre só quem está naquela etapa.** Distribuir o case é repartir quem tem
case para corrigir; quem já passou para o pitch não tem o que ser corrigido ali, e quem
ficou pelo caminho muito menos. Redistribuir substitui a distribuição da etapa e **nunca**
apaga nota: as notas ficam no banco e voltam a valer se a pessoa cair no mesmo candidato.

**O anonimato volta, mas na etapa, não no processo.** `Stage.anonymous_evaluation` substitui
o campo que estava no processo. Só o case nasce marcado: é onde a proposta deveria pesar
sozinha. No pitch e na entrevista o avaliador está diante da pessoa, e esconder o nome ali
seria teatro. Quem manda é a etapa em que o candidato **está**: passada a etapa anônima, o
avaliador volta a ver quem é, e a correção do case já acabou.

Dois switches que podem discordar são um convite a perder uma tarde, então o campo do
processo foi removido em vez de virar chave-mestra. Uma migração de dados liga a marca no
case dos processos que já existiam, porque `ensure_selection_process` não altera processo
existente e a caixa ficaria desmarcada sem ninguém saber que precisava marcá-la.

**O nome do arquivo entregue também é identidade.** Numa etapa anônima, `case-pedro-xavier.pdf`
derruba o anonimato antes de o avaliador abrir o PDF, e ninguém pensa no nome do arquivo
como dado de identificação. O avaliador recebe `C-0042.pdf`, e só baixa o que lhe coube. O
candidato lendo a própria entrega continua vendo o nome que ele escolheu: o anonimato é
regra entre organizadores.

**O convite não cria tabela de convite.** A conta nasce sem senha utilizável e a pessoa
recebe o link do "esqueci minha senha" com `convite=1`, que muda só o texto da tela. O
coordenador nunca inventa nem enxerga senha de ninguém, não sobra estado pendente para
alguém limpar, e "convite pendente" é lido de `has_usable_password()` em vez de um campo que
poderia discordar da realidade. Quem é convidado nunca vira coordenador: coordenação
continua sendo marcada à mão no Django Admin, porque não se delega por formulário.

**Distribuir começa mostrando gente, não formulário.** A primeira versão da tela pedia
etapa e quantos avaliadores por candidato antes de exibir um nome, e o coordenador
distribuía no escuro. Agora os candidatos aparecem agrupados por fase, cada um com quem o
corrige, e há dois caminhos porque são duas perguntas diferentes: repartir uma fase inteira
entre a comissão (automático, em rodízio) e decidir quem pega uma pessoa específica
(manual, candidato a candidato). O manual escolhe também **em quais etapas** aquilo vale,
com "Todas as etapas" ou uma a uma: designar numa etapa em que o candidato ainda não chegou
é adiantar trabalho. Salvar **substitui** o que havia naquelas etapas, senão não haveria
como tirar ninguém.

**A coordenação aparece na lista sem estar em `ProcessOrganizer`.** Ela não é chamada
para um processo, já coordena todos. Aparece ali porque a aba é também a lista de quem entra
no rodízio da correção, e sem isso o coordenador não conseguiria se incluir na própria
distribuição, que é exatamente como a Liga corrige hoje. Foi a verificação contra o servidor
que encontrou isso: nos testes, a distribuição sempre recebia os ids na mão.

**Candidato do processo não é convidado para corrigi-lo.** Ninguém corrige o próprio case. A
trava é só no processo em questão: ter se candidatado numa edição passada não impede de
ajudar nesta.

**Tirar alguém do processo leva as designações, não as notas.** As designações caem, senão a
pessoa continuaria na carga de trabalho da etapa e voltaria a enxergar candidatos se fosse
readmitida. As notas que ela deu ficam: foram trabalho feito e entram na média. Apagá-las
mudaria a nota de candidatos sem ninguém ter pedido.

**O que se perde:** o coordenador vira gargalo. Nada avança sem ele, e se o Bruno sumir numa
semana de correção o processo trava. O caminho, se isso doer, é marcar um segundo
coordenador no Django Admin, e não afrouxar a regra.
