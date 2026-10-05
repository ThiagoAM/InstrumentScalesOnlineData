## Veredito

Não encontrei bloqueador concreto para o commit/push da main nem para a publicação do snapshot. Os três achados da minha revisão anterior estão fechados no código final.

- **APP (fonte):** aprovado para commit/push, **sem validação funcional**. Os 101 casos unitários e os 3 de UI não executaram.
- **DATA (código + snapshot de 887 arquivos, SHA declarado `6494a96c…144a`):** aprovado para publicação.
- **ADMIN/comercial:** aprovado.

Revisão de IA, só leitura (Read/Glob/Grep), modelo `claude-opus-5-5` segundo o ambiente. Não executei nada, não recalculei nenhum SHA-256 e não tive relógio (data da sessão: 2026-10-05). Toda igualdade de hash abaixo é comparação de valores declarados; o pai precisa recalcular antes de vincular.

## Fechamento dos achados anteriores

| Achado | Estado | Evidência no código final |
|---|---|---|
| P1 — proveniência da aprovação | Fechado pela alternativa aceita | `editorial/approvals/2026-10-04-guided-pilot-owner-release.json:8` e `:179-310`: 7 documentos e 5 manifestos (avaliado → liberado), aprovação original 00:29:31Z, correção 01:11:39Z, re-revisão 01:30:33Z, `not-claimed`. Os 7 hashes liberados batem com `documentSHA256`, com o registro de promoção e com o inventário v2. Nada disso vaza para o índice público (`v2/education/paths.json:264-292` … `:1608-1636`). |
| P2 — validação Swift só depois de gravar | Fechado | `scripts/promote-guided-gap.js:158` roda o `--paths` real sobre o índice completo encenado antes do diário (`:166`). A recuperação exige a prova e revalida (`:182-186`) antes de qualquer escrita (`:193-203`); a repetição de um promovido também revalida (`:122`). |
| P2 — timestamps frouxos | Fechado | `scripts/path-release-approval.js:6-18` é compartilhado (`:24`, `:51`, `guided-variation.js:78`) e barra no gate (`editorial-pipeline.js:532-534`), antes de parser ou escrita. |
| P2 — chaves de `releaseApproval` | Fechado | `path-release-approval.js:21,25` exige exatamente as seis do `LKPathReleaseApproval`; o validador de publicação aplica o mesmo ao índice público (`validate-editorial.js:51-52`). |

Os testes correspondentes passaram no run completo com o runtime `f5dfc7c` e zero skips:
- **#26 e #27:** chave aninhada extra, data sem hora, sem fuso e 29/02 inválido são recusados.
- **#76:** recusa sem diário e sem tocar `v2` nem a fila.
- **#77:** `--paths` real sobre o delta produzido pelo JS, inclusive após recuperação de `prepared`.

## Cobertura real

**Li por inteiro:**
- DATA, scripts: `path-release-approval.js`, `promote-guided-gap.js`, `guided-variation.js`, `promote-approved.js`, `coordinated-publication.js`, `validate-editorial.js`, `publishing-state.js`, `parser-runtime.js`, `source-inventory.js`, `daily-content-policy.js`, `create-guided-lesson.js`.
- DATA, testes e dados: `guided-daily`, `coordinated-promotions`, `build-pages`, `path-asset-contract`, o registro de aprovação, `guided-gaps.json`, `README.md`, `pages.yml`.
- APP: os quatro arquivos de produção/DEBUG, os quatro modelos do LessonsKit, `LKOwnerReleaseApprovalTests` e o diff final.
- ADMIN: o prompt e o diff.
- Evidências: os JSON de recibo, as duas auditorias Sol (apoio, não conclusão minha) e a re-revisão de conteúdo.

**Li em parte ou por Grep:** `editorial-pipeline.js` (seleção, gate, `record-review`), o e2e (linhas 1-383), o registro de promoção, o `paths.json` público (cabeçalho e os cinco blocos de aprovação), o recibo Swift, a fila, os logs brutos e o gerador Python (final e escritas).

**Snapshot de 887:**
- `pilot-snapshot-delta.json` lista 850 inalterados (`:17-866`, 838 deles `lesson.md` legados), 1 alterado (`paths.json`, `7de6b0d5…` → `06713d3f…`), 36 adicionados e `removed: {}`.
- A projeção de produção tem 887 entradas, sem site, `snapshot.json` ou `editorial/`.
- No disco: `v1` tem 4 arquivos, `v2` tem 882 e `guided` tem 36; com `.nojekyll`, 887.
- Os 850 vêm do baseline `e2dde4a`: o registro independente anterior tem `servedSHA256 56e1a7e3…`, igual ao baseline do delta. Não reli esse conteúdo nem comparei as 850 linhas uma a uma; conferi contagem, estrutura e amostras.
- O site está desativado (`editorial/site-publication.json:4`); os nove arquivos só entram com `--review-snapshot`.

**Conteúdo:** a aprovação das 36 lições é da revisão dedicada e da re-revisão, não desta. Aqui conferi nos bytes publicados: zero imagens, zero texto de piloto, nenhuma capacidade `listen` (o leitor do app não a suporta), F01 e F04 presentes.

**Não fiz:** não abri os zips de preços, os dois recibos `*-auth-error`/`*-refresh-error`, os `automation-before*.json` nem recibos privados fora dos três repositórios. Não comparei byte a byte os três deltas de teste; li as versões finais.

## APP

A mudança de produção é pequena:
- `LearningReviewContentPolicy.swift:32-34` passa a delegar ao validador completo.
- `LearningPathStore.swift:38-55` se comporta como antes em Release.
- O transporte de teste é inteiro `#if DEBUG` e exige as duas flags (`LearningPublishedUITestFixture.swift:1,10`).
- O botão de prévia é DEBUG e some com percursos aprovados (`IOSCoursesView+LearningPaths.swift:183-196`).
- Nada toca StoreKit, direitos ou SwiftData.

**Comprovado:**
- LessonsKit 54/54.
- Cinco validadores com saída 0.
- O app e os alvos de teste compilaram: o log chega a "Testing started" (`app-targeted-ios27.log:1818`), sem erro de compilação Swift.
- Build Debug 4.2.0 (35) assinado, instalado e aberto no iPhone, sem flags de teste.

**Não comprovado:**
- Nenhum caso de teste executou. O runner falhou ao instalar (`:1995`, "server died") e o run terminou em `** TEST INTERRUPTED **` (`:2714`): 0 aprovados, 2 falhas sintéticas.
- A abertura no telefone não é validação de UI.
- Não há build em configuração Release.
- Os dois testes unitários novos e o de UI novo nunca rodaram e podem estar vermelhos.

**Risco de commitar: baixo.** A lógica que decide a aprovação é a do pacote, coberta pelos 54 testes e exercitada pelo CLI Swift no índice real. O que falta bloqueia qualquer binário (TestFlight/App Store) e qualquer afirmação de "validado", não o commit da fonte. Nenhum binário novo foi enviado.

## DATA

**Código:** aprovado.

**Promoção agrupada:**
- Registro `promoted`, com prova Swift `f5dfc7c` às 01:40:01Z, antes do diário (01:40:02Z).
- 36 destinos novos (`beforeFiles` nulos), mais índice e fila.
- Os cinco percursos estão `approved`/`not-claimed`, base `owner-release`, com os cinco IDs exatos.

**Recibo Swift:** válido, 838/72/75/35, zero falhas, contratos `public-paths` e `candidate-paths` válidos, runtime de pacotes commitados.

**Node:** 126 casos, 121 aprovados e 5 falhas no único run completo.
- Duas eram fixtures defasadas: #24 esperava `approved` e #85 parava num gate anterior ao pretendido.
- Três eram `ETIMEDOUT` de e2e.
- Cada uma tem um caso homônimo aprovado depois. O e2e legado precisou de 613 s e de um orçamento externo de 1.200 s.
- No e2e, a única mudança de prazo é o override limitado a 600 s (`:19-23`); os defaults 30/90/300/90 s permanecem.
- Não houve segundo run completo verde. O caso de identidade do e2e não foi reexecutado no arquivo final.

**Risco de publicar: baixo para quem usa a versão da loja.** Os 850 arquivos servidos ficam iguais. Pelo histórico, o 4.1.0 (34) é anterior aos percursos e não deve consumir o índice alterado; isso é inferência minha, não li aquela fonte. Os testes não executados do APP, portanto, não bloqueiam esta publicação. O risco real é editorial: conteúdo sem playthrough físico, revisado por IA, com confiança média em ja e zh-Hans. O proprietário assumiu isso.

## ADMIN/comercial

**Prompt diário:** coerente com o CLI.
- Autoria antes do `select` (`instrument-lessons.md:15`).
- Timestamps estritos (`:21`).
- `--runtime-config` e validação antecipada (`:25`).
- Sem legado novo, sem playthrough inventado.
- A aprovação do proprietário fica limitada ao piloto (`:23`).
- Agenda mensal continua removida (`:29`).

**Aplicação nativa:** o registro declara ACTIVE, 21h, Sol medium, prompt igual à fonte e nenhum outro campo alterado. Não li o cadastro nativo.

**Preços:** mesmo SKU; 8 linhas manuais (BRL 59,90 e as outras sete) mais 167 automáticas com base USD 19,99, total 175. US/BR públicos conferidos, Max registrado como inalterado, `baseline: null`. 41 testes comerciais e os dois verificadores passaram.

## Condições e observações (nenhuma bloqueia)

1. **Recalcular hashes.** Qualquer divergência invalida esta revisão para aquele arquivo.
2. **Manter `f5dfc7c` como ancestral da main publicada do APP**, sem amend, squash ou rebase. O recibo (`swift-parser.json:21005`), a promoção (`:1032`) e os 36 itens da fila citam esse SHA.
3. **Substituir `editorial/evidence/independent-review.json`.** Hoje é o registro anterior (`:2-4`, `:1749`); sem a troca, `validate-editorial.js --publication` (`:326-349`) falha fechado.
4. **O CI do Pages é a primeira execução dos testes novos nessa configuração.** Usa Node 22, Linux, sem runtime Swift, em paralelo (`pages.yml:26,33`); as evidências locais são Node 26.8.2, serial, com runtime. Pela leitura, os casos dependentes têm `skip` e o único sem guarda (`guided-daily.test.js:92`) falha no gate antes de usar o runtime. Se falhar, não publica.
5. **Carimbo defasado na proveniência.** `editorialProvenance.recordedAt` (`:181`, 01:27:01Z) é anterior à re-revisão que o bloco contém (`:301`), gravada às 01:39:41Z. É privado e não afeta nenhum gate. Não corrija o arquivo: mudaria o `approvalSHA256` (`promotions:1026`) e o lote; registre a nota no fechamento.
6. **O índice servido expõe nome, declaração literal e referência da thread** (`paths.json:265,289-290`, cinco vezes). Depois de publicado, alterar isso invalida a origem dos extras. É decisão do proprietário.
7. **Fração de segundos acima de 3 dígitos.** O JS aceita de 1 a 9 (`path-release-approval.js:8`); só `.123Z` foi exercitado no Swift. Uma divergência viraria recusa antes de gravar. Prefira milissegundos com `Z`.
8. **Não reexecutar `scripts/author-guided-pilot.py`.** Ele regrava os candidatos (`:1257`, `:1307`); o recibo falharia fechado.
9. **Antes de enviar o diretório de evidências**, se o repositório do APP for público, confira os dois recibos de erro de autenticação e os zips. Minha busca por padrões de token nos arquivos de texto não achou nada.
10. **Menores:**
    - "Riff novo como extra guiado" (`instrument-lessons.md:17`) não tem raia além das cinco lacunas.
    - A independência do revisor diário é só nominal (rótulos diferentes).
    - A nota em `historical-draft.json` trata o currículo como intervenção concorrente, embora ele não chegue ao binário da loja.

Depois do deploy, abrir Aprender no iPhone e uma lição daria a primeira observação real de ponta a ponta. Registre-a como observação manual, não como teste.
