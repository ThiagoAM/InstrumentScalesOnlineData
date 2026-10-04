Leitura concluída; segue o parecer.

# Parecer final do conjunto — Opus 5.5

## Veredito

- **APP: código bloqueado.** Há um defeito de direito comercial: um usuário Free abre lição Premium sem paywall enquanto a autoridade do catálogo está pendente. Há mais dois defeitos médios na fence, e nenhuma rodada completa verde nos bytes atuais.
- **DATA: aprovado.** Os três deltas estão corretos e têm regressão. Pode seguir para record-publication-review, commit/push, Pages e reconcile-p0, sem depender do APP.
- **ADMIN e comercial:** não mudaram e não os reli; valem as aprovações anteriores.
- Revisão por IA, só leitura: não executei nada e não recalculei hashes.

## A base mudou durante a revisão

O pedido descreve o R19 em execução, mas o ledger e os logs mostram outra sequência:

| Rodada | Resultado |
|---|---|
| R19 | typecheck falhou em `V2CourseStore`, 0 testes |
| R20 | teste não compilou (`.notes` inexistente), 0 testes |
| R21 completa | 1393 testes, 1392 aprovados, 1 falha (`missingField("id")` na fixture nova) |
| R22 focada | faltou import, 0 testes |
| R23 focada | 10/10 de autoridade |

- Os SHAs do pedido (`8b6ed12f…`, `12aaf5b5…`) estão superados. O arquivo de teste mudou três vezes e hoje é `ae75fbfb…`.
- Pelos recibos, a produção não muda desde o R20.
- R21 mais R23 é evidência composta, não uma rodada verde.

## Achados do APP

Todos saem da leitura do código; nenhum foi reproduzido.

**A1 — Alta. Paywall e trava de progresso contornados.**
- `IOSV2SectionView.swift:204` abre o leitor para qualquer lição quando `isCatalogAuthorityUnavailable` é verdadeiro, antes do `switch` que trata `.premiumLocked` e `.locked`.
- O leitor não tem checagem de direito para renderizar (`IOSQuickLessonView.swift:67-107`) e carrega o documento de qualquer forma (`:154-175`). Só Finish é barrado.
- Quando a fence fecha, sozinha ou por "Try again", o conteúdo Premium aparece.
- A afirmação "nenhum direito comercial alterado" não vale para estes bytes.
- Correção mínima: tirar a cláusula de indisponibilidade da linha 204, ou pôr a checagem de acesso no leitor.
- Teste necessário: nó Premium tocado com autoridade pendente nunca renderiza o documento.

**A2 — Média. Cancelamento deixa a fence presa.**
- `observedOnlineResponse` é marcado antes da checagem de cancelamento (`V2CourseStore.swift:268-269`).
- Se a `.task` da home (`IOSCoursesView.swift:178-186`) for cancelada depois da primeira resposta e antes do primeiro par course/catalog, `finish` mantém a fence (`V2CatalogAuthorityLedger.swift:138-143`).
- `hasLoaded` continua verdadeiro (`V2CourseStore.swift:86-90`), então nada recarrega sozinho.
- A `.task` é cancelada quando a tela some, por troca de aba ou push; é exatamente o caminho que leva ao A1.
- `LearningPathStore.swift:94-99` já trata o mesmo caso restaurando o estado anterior.

**A3 — Média. "Pendente" vale como "indisponível" em todo refresh normal.**
- `begin()` marca pendente antes da rede (`V2CatalogAuthorityLedger.swift:110-114`, `V2CourseStore.swift:196`), em cada abertura do Aprender.
- Enquanto dura (cinco requisições em série; até cerca de 90 s em rede travada):
  - o cartão Review some (`IOSCoursesView+Daily.swift:243-245`);
  - a lição do dia some (`IOSCoursesView.swift:306`);
  - o cartão Max mostra "A saved review is unavailable";
  - uma lição aberta mostra "could not be verified" com botão desabilitado;
  - um Max Daily criado nessa janela fica congelado sem review pelo resto do dia (`IOSMaxDailyView.swift:485-486`).

**A4 — Média, decisão de produto.**
- Qualquer resposta não autoritativa de um só arquivo (5xx, portal cativo, JSON que a versão não decodifica) fecha os dois cursos (`V2CourseStore.swift:234-236`, `:252-254`, `:314`).
- O fechamento inclui lições do bundle e sobrevive a reinício e offline.
- Meu achado 4 era baixo; o ledger de negações por curso já o fechava. A fence global é mais ampla do que o risco pedia.
- Um catálogo futuro incompatível trava o curso legado inteiro nas versões antigas.

**A5 — Baixa.** Uma segunda janela recebe `.busy` (`V2CourseStore.swift:131-134`) e fica no catálogo do bundle com aviso de "salvo" até Try again ou reaparecer.

**A6 — Baixa, cobertura.** Não há teste de cancelamento, do estado indisponível na UI nem de paywall sob indisponibilidade. Os testes de UI usam o fixture em memória, que nunca fica pendente.

**A7 — Recibos.**
- `review-catalog-authority-files.sha256.json` ainda diz "R23 pending".
- `integration-runs.json` tem `currentRun` antigo.
- O preflight das 10:20Z antecede quatro mudanças de fonte.

Limite, não defeito: o ledger é excluído do backup, então um aparelho restaurado e offline não conhece as negações.

## Itens anteriores

| Item | Estado |
|---|---|
| 2 rótulos de cordas | Fechado; o teste de UI Drop D passou no R21 |
| 3 guided em Review/Max | Fechado; identidade exata em path aprovada, nos três call sites |
| 4 negações duráveis | Fechado no objetivo original; a correção trouxe A1–A5 |
| 5 assets | Contido; a recusa só ocorre depois que um documento com imagem é observado |
| 6 Continue com update | Fechado; `enroll` não regrava matrícula existente |
| 7 Max parcial/confirmação | Fechado |
| 8 Dm7/Am7 | Fechado; zero ocorrências em `editorial/` |
| 9/10 | Fechados no parecer anterior |

## DATA

| Delta | Leitura |
|---|---|
| `completedAt` no replay (`publishing-state.js:442-466`) | Correto no primeiro run, no replay após sucesso e após journal `prepared`; teste real Git/HTTP em `publishing-integration.test.js:604-707` |
| `restore-state` recusa `prepared` (`editorial-state.js:297-300`) | Correto, antes de qualquer rename |
| `dry-run` exige `assertState` (`editorial-pipeline.js:1099-1101`) | Correto; o CI não chama o comando fora dos testes |

O log completo mostra 117 aprovados, 0 falhas, 0 skips. Três observações, nenhuma bloqueia:

1. **Baixa.** Um journal que falha na validação (corrompido ou outro caminho absoluto) agora também impede `restore-state`. A saída passa a ser manual, e a mensagem não diz qual.
2. **Informativo.** O replay após queda em `prepared` pelo `reconcileP0` real segue validado só por leitura.
3. **Informativo.** Os três deltas são posteriores ao publication-closure; inclua este parecer em `reviewReferences`.

## Gates

**APP**
1. Corrigir A1, decidir A2–A4 e adicionar o teste do A1.
2. Gerar novo inventário e rodar o iOS 18 completo, verde em rodada única.
3. Rodar iOS 27, iPad, as duas `VisionLessonUITests` e Release macOS/vision com o checker nos bytes finais.
4. Corrigir os recibos do A7.
5. Restore StoreKit passou no R17, R18 e R21, ainda sem causa; continua risco antes de binário.

**DATA / ADMIN**
1. Antes do reconcile-p0, conferir que o state root só tem `builds`, inclusive arquivos ocultos.
2. No CI, esperar 111 aprovados, 6 skipped, 0 falhas; outra contagem não é verde.
3. Sequência: Pages com todos os bytes, `.nojekyll` e commit; reconcile-p0 com 21 `done`, 75 `blocked-human`, journal `complete` e espelho; dry-run; só então liberar o lock.

## Limites

- Do APP li: ledger, policy, `V2CourseStore`, `LearningPathStore`, os call sites de Review/Max/seção/leitor, os testes de autoridade e de closure, e os logs R20/R21/R23. Não reli o restante das 149 fontes de UI.
- Não reli P0, piloto, propostas, ADMIN nem comercial.
- Pages e Ubuntu nunca rodaram este código.
- Nada aqui vale como playthrough humano, aprovação de idiomas ou resultado de vendas.
