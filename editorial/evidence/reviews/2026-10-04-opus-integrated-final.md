# Parecer integrado final — Opus 5.5

## Veredito

- **DATA (OPS + P0), ADMIN e comercial podem seguir** para record-publication-review, commit/push, Pages e reconcile-p0. Não encontrei defeito de código que invalide direitos, histórico, publicação ou medição.
- **APP: código aprovado por leitura, gate de execução não verde.** O R18 terminou vermelho e um arquivo de teste mudou depois do freeze. O commit do APP não deve ser descrito como validado antes do rerun.
- Este parecer é revisão por IA: não vale como aprovação humana, de idiomas ou de playthrough.

## O que mudou durante a leitura

1. **R18 terminou com falha:** 1378 testes, 1377 aprovados, 1 falha, 0 skips (`/tmp/instrumentscales-growth-learning-ios-r18.log:1273-1279`). Falhou `testPilotResumeIsReappliedAfterAcceptingRequiredSetupAndStudyDropDStaysSaved`.
2. **Causa confirmada na hierarquia exportada:** o seletor reabre como `Preset, Study setup`, não "Drop D". O editor reconstrói a afinação salva com nome genérico (`LessonInstrumentSession.swift:97-98`). Os seis pitches persistiram (D2 A2 D3 G3 B3 E4, MIDI 38/45/50/55/59/64), então não houve perda de estado.
3. **Fonte alterada após o freeze:** `InstrumentScalesUITests/LearningPathUITests.swift` (`3454…` → `83f8…`). A asserção agora confere label e MIDI das seis linhas (`:74-84`).
4. **Consequência:**
   - A verificação das 09:04Z e o `integrated-final-app.diff` não cobrem os bytes atuais desse arquivo.
   - O teste corrigido nunca rodou; pela hierarquia do R18 ele deve passar.
   - `integration-runs.json:344-347` não registra o R18.
   - iOS 27, iPad, macOS Release e visionOS seguem pendentes.

## Disposição dos achados

**APP**

| Item | Estado | Resíduo |
|---|---|---|
| N1 quarentena em Review/Max | Confirmado; os dois call sites de produção recebem a política | Achados 3 e 4 |
| N2 retomada após setup exigido | Confirmado; no R18 o cenário chegou ao fim com Experiment retomado | — |
| N3 home | Confirmado | Achado 6 |
| N4 carimbo constante, fence vence | Confirmado | — |
| N5 caminhos resolvidos | Confirmado; comportamento em aparelho segue inferência | — |
| N6, N7, N8, N9 | Confirmados | — |
| Sheet por item | Confirmado; Apply persiste, Cancel não | Achado 2 |
| Assets offline | Confirmado por leitura e pelos testes novos | Achado 5 |
| Max parcial | Confirmado; sem `completedAt`, crédito ou evento inventado | Achado 7 |
| Restore StoreKit (R15) | Causa não demonstrada; segundo o ledger passou no R17 e no R18 | Risco aberto antes de distribuir binário |

**Conteúdo**
- Recalculei `bass-backbeat-periscope` e `guitar-fourth-compass-lift` nota a nota: 16 tempos, mapas e alturas corretos, tempo 4 em pausa, retorno G3–C4–B3–A3 presente nos seis idiomas.
- Os 16 casos de espaçamento sumiram; resumos e títulos de dovetail, lighthouse, catapult e dorian conferem com os blocos.
- As 75 propostas estão prontas para avaliação física, com a ressalva do achado 8.
- P0 e piloto não foram relidos nesta rodada.

**OPS**
- M14, M16, M17 e M18 confirmados na fonte.
- M15 usa só identidades `synthetic-m15-<uuid>`.
- O log tem 108 pass, 0 fail, 0 skip.
- `legacy-repair.json` tem 96 mudanças, 75 delas musicais, então `reconcile-p0` deve devolver 21/75.

**Comercial**
- A→B→A e recuo de cutoff ficam registrados (`Tools/commercial_experiment.py:255-256`, `:275`).
- Statement futuro e tabelas idênticas são recusados; o CLI informa `changed`.
- O recibo do pai e a verificação integrada citam o mesmo inventário.

## Achados novos

1. **Gate do APP.** R18 vermelho, teste alterado depois, rerun pendente. Detalhes acima.
2. **Baixa, UX.** Quem salva Drop D vê "Study setup" ao reabrir, com "Drop D" ainda na lista. Foi declarado intencional depois da falha; trate como dívida. O mesmo editor numera cordas do grave ao agudo ("String 1, D2"), ao contrário das lições ("String 2, fret 1" = C4).
3. **Média-baixa, antes da primeira path.** A política de quarentena só conhece os cursos V2. Exercícios guardados de lições guiadas (`guided:…`) sempre passam (`IOSCoursesView+Daily.swift:239-243`). Uma path retirada continuaria no Review e no Max.
4. **Baixa.** A política depende do catálogo carregado, que fica em Caches (`V2CourseStore.swift:236-247`). Com cache purgado ou anterior à quarentena e sem rede, os exercícios guardados voltam.
5. **Limite, antes de path com imagens.** `LKPathApprovalRecord` só tem hash de documento. Os bytes de asset são fixados no download, não na aprovação, e o app aceita URL https absoluta.
6. **Baixa.** O cartão de atualização de matrícula substitui o Continue mesmo quando a espinha congelada ainda tem lição aberta (`IOSCoursesView+LearningPaths.swift:112-120`).
7. **Baixa.** Se a quarentena cair no mesmo dia após a prática parcial, a tela mostra 3/3 mas `completedAt` nunca é gravado (`IOSMaxDailyView.swift:517-521`). Um plano concluído antes da quarentena aparece como parcial enquanto ela durar.
8. **Baixa, conteúdo.** "Dm 7" e "Am 7" com espaço nas linhas 82 (ja) e 95 (zh-Hans) de 15 propostas, por exemplo `bass-beat-one-trapdoor`. Corrigir antes de entregar os bytes ao avaliador.
9. **Baixa, OPS.** Uma queda entre a escrita de `item-outcomes.json` e a de `identity.json` deixa um órfão que `initializeState` recusa (`scripts/editorial-state.js:95-119`). Falha fechado e exige limpeza manual.
10. **Recibos.**
    - `site-final-qa.json` tem o mesmo timestamp, ao microssegundo, do recibo comercial.
    - `repository-reconciliation.json:6-9` lista 7804a85 como não publicado, o que contradiz o log.

## Bloqueadores

- **DATA, ADMIN e comercial:** nenhum.
- **APP:** rerun focado do teste corrigido, novo recibo de hashes e as plataformas. Até lá o commit é "preparado, gate pendente".

## Riscos e limites

- **Pages nunca rodou este código.** Seguem sem prova: `.nojekyll` por HTTP, a suíte em Ubuntu sem identidade e a igualdade de inventário. Se o build falhar, o conteúdo de 448975f continua servido, com os 96 documentos que não abrem.
- **Identidade do coordenador não é segredo.** Está em `editorial/publisher.json:8`, em repositório público. É cerca de procedimento, não autenticação.
- **Primeira noite sem lock** é a primeira execução real da rotina com o código novo.
- **Restore StoreKit:** uma falha em quatro rodadas completas, sem causa. Repetir a suíte dentro do plano completo antes de qualquer binário.
- **Não existem ainda:** preço ativado, site habilitado, paths públicas, aprovação Apple dos metadados, playthrough humano, medição de 56/84 dias.

## Sequência de ativação

1. **APP:** regenerar recibo e diff, rodar o teste corrigido no iOS 18, depois iOS 27, iPad, macOS Release e visionOS. Registrar o R18 em `integration-runs.json`.
2. **Corrigir os recibos** do achado 10.
3. **DATA:** `record-publication-review` vinculado aos bytes do P0, como revisão independente por IA.
4. **Commit e push** de DATA e ADMIN com Git normal. O do APP entra após o passo 1.
5. **Pages:** build, deploy e smoke verdes, com todos os bytes comparados.
6. **`reconcile-p0` no Mac:** conferir 21 `done`, 75 `blocked-human`, `identity.json`, `p0-reconciled.json`, o espelho `.recovery` e o dry-run.
7. **Só então retirar o lock** e acompanhar a primeira noite.
8. **Antes da primeira path:** achados 3 e 5. **Antes do avaliador humano:** achado 8.

## Não verificado

- Não executei nada nem recalculei hashes.
- O xcresult do R18 é comprimido; usei o log e a hierarquia exportada.
- Dos 39 documentos de texto, fiz buscas dirigidas, não releitura integral.
- No ADMIN li só os recibos.
- Do diff OPS li as fontes de M14–M18, não as 11 mil linhas.
- Os logs finais de macOS e visionOS não mostravam resultado.
