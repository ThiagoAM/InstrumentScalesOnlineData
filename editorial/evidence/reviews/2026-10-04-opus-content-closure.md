## Veredito

- **P0 servido: aprovado.** O delta (aviso nos 58 áudios em seis idiomas e B/H na aula de terças) é honesto e claro, e não encontrei alteração nos blocos musicais.
- **Piloto 36: pronto para avaliação física.** As três correções declaradas estão nos fontes.
- **Propostas 75: 74 prontas para avaliação física; 1 não.** `bass-backbeat-periscope` ainda tem contradição prosa × bloco. Como a aprovação humana é vinculada a hash, recomendo corrigir no mesmo lote as pendências textuais abaixo antes de entregar os bytes ao avaliador.

Esta é revisão editorial por IA. Não toquei instrumento, não certifico idiomas e não recalculei hashes (sem shell); comparei apenas valores registrados. Não registre este parecer como `languages` nem `playthrough`.

Caminhos relativos a DATA. Propostas são citadas por ID (único sob `editorial/candidates/legacy-repairs/`) e linha.

## Propostas 75

**Achados anteriores: resolvidos.** Refiz a aritmética e recalculei as posições dos 17 rítmicos, das 10 rotas, dos 4 menores e dos extras (lighthouse, fifth-echo, hands-crossing, lane-cross, comet, fifth-pocket-switch, ninth, staircase, piano sixth, seventh-lock, late-launch). Os comprimentos atípicos (24, 12, 18 e 10 tempos) estão declarados nos seis idiomas. Nenhum exercício foi trocado por disclaimer.

**Discrepância concreta: `bass-backbeat-periscope`**
- Prosa (en `:32`; pt `:47`, es `:62`, de `:77`, ja `:92`, zh `:107`): fundamental no 1, pausa, alvo no "e do 2", quinta no 3 — "D - F A". Nada no tempo 4.
- Bloco (`:124`, mapa `:134–135`): há uma quarta nota no tempo 4 (C2, F2, B1, G2, as sétimas), nunca descrita. Ela também ocupa o lugar do pickup da Rodada 3.
- O auditor não tem asserção para este ID; a cobertura o marca como sem contradição.
- Correção sugerida (16 tempos, tempo 4 livre):
  - notas: `D2 -/0.5 F2/0.5 A2 - G1 -/0.5 B1/0.5 D2 - C2 -/0.5 E2/0.5 G2 - A1 -/0.5 C#2/0.5 E2 -`
  - mapa: `3:5 -@0.5 3:8@0.5 2:7 - 4:3 -@0.5 4:7@0.5 3:5 - 4:8 -@0.5 3:7@0.5 2:5 - 4:5 -@0.5 3:4@0.5 3:7 -`
  - Alternativa: descrever a sétima no tempo 4 nos seis idiomas e ajustar a Rodada 3.

**Pendências textuais (não alteram notas)**

1. **Espaçamento quebrado em 16 arquivos, pelo menos 31 linhas.** A origem é `scripts/refine-repair-proposals.py:651–658` somada às frases-fonte sem espaço. Casos que geram ambiguidade:
   - `bass-pocket-handoff:43`: "contratempo do 2,3 e contratempo do 4".
   - `bass-pocket-switch:43`: "contratempo 4.7–8 repetem", "completos.1–4", "O5", "O6".
   - `bass-ghost-note-lifeline:30, :43, :56, :69`: "Bb 2/C3"; pt "O1… o2… O3… O4".
   - `guitar-late-launch-switch:30`: "7 th position".
   - `guitar-harmonic-third-switchback:80`: "C–E1.5 Schläge".
   - Blocos `text`: `piano-hands-crossing:117–118` ("for2 beats") e `piano-lane-cross:116–118` ("bar3", "bar4:four").
   - Demais arquivos: third-shift-signal, sixth-ladder-flare, handoff-lantern, seventh-target-laser, chromatic-third-bridge, target-triple-jump, anticipation-zipline, dorian-target-ladder, fourth-target-laser.
   - Piloto e servido: zero ocorrências.
2. **Alemão com B internacional sem a nota B/H em 10 propostas** (44 já têm):
   - `guitar-chromatic-third-doors-20260925:75–85`
   - `guitar-third-shift-cipher:63–69`
   - `guitar-offbeat-motif-relay-20260927:69–77`
   - `guitar-fourth-compass-lift:71, :73`
   - `bass-backbeat-periscope:75–85`
   - `bass-beat-two-scout:75–85`
   - `guitar-guide-tone-switchback:75`
   - `guitar-half-step-landing-bridge:71`
   - `guitar-late-launch-switch:89`
   - `guitar-open-string-cutoff-20260929:75`
3. **Resumo ou título de bloco que não corresponde ao exercício:**
   - `guitar-dovetail-shift:18–23` (seis idiomas): "nota comum como dobradiça", mas as duas formas não têm nota em comum.
   - `guitar-target-lighthouse:18`: "clean position shift", mas o mapa fica inteiro nas casas 5–9.
   - `guitar-resolution-catapult:118`: "Seventh-position", mas a rota parte da casa 5.
   - `guitar-dorian-target-ladder:18` diz "one position"; o título do mapa (`:118`) diz "Two-position".
4. **Para o gate de idiomas:**
   - es "dobles corcheas" (`guitar-sixth-ladder-flare:63`, `guitar-harmonic-third-switchback:63`) pode ser lido como semicolcheias.
   - ja `guitar-chromatic-third-bridge:22` diz "下行半音" onde o sentido é vizinho inferior.
   - `guitar-fourth-compass-lift`: a Rodada 1 cita o par G–C, que não aparece em nenhum bloco.

**Pontos para o avaliador físico** (coerentes no texto; só a execução decide):
- `bass-octave-feint-drop`: saltos de 12 casas na corda G em semínimas a 98 BPM.
- `guitar-fourth-target-laser`: de 1:13 para 2:6 em meia pausa a 84 BPM.
- `guitar-string-skip-triangle-20260917`: de 4:2 para 2:8 sem pausa.
- `guitar-shift-signal` e `guitar-position-comet-lift`: a descida exige mudança da 7ª para a 2ª posição sem silêncio.
- `guitar-sixth-ladder-flare`: díades em cordas não adjacentes, em colcheias.
- `piano-lane-cross`: mãos sobrepostas no compasso 3.
- `bass-second-third-ear-choice-20260929`: casas 12–15 para iniciante.
- `piano-sixth-handoff-switch`: F natural também abre a célula 4 sobre Cmaj7, sem explicação.

## P0 servido

- O aviso novo aparece em 58 arquivos em cada um dos seis idiomas e vem logo após o objetivo arquivado. Os 17 conceituais não o têm.
- Nos três fallbacks lidos por inteiro, os blocos estão nas mesmas linhas que citei antes; o detour segue em `:73–80`.
- B/H de terças corrigido em `…/scale-advanced-wide-interval-lines-thirds/lesson.md:53`.
- Os hashes dos 21 equivalentes na fila coincidem com um snapshot das 05:15Z (20) e com o `418118…` do meu parecer anterior (raised-sixth). Meu parecer anterior vale para os mesmos bytes.
- `v2/education/paths.json` continua com `paths: []`; nada guiado sob `v2/`.

Ressalvas não bloqueantes:
- O aviso fala de "ritmo ou técnica", não de altura. O detour ainda soa D1, abaixo do E1 do baixo; acrescentar "altura" é opcional.
- Os objetivos arquivados em alemão misturam convenções ("F, B, E und C#" em uns, "Fis und H" em outros). É texto legado, fora do delta.

## Piloto 36

- `piano-swap-a-small-role:177`: `C4 D4 E4 F4 E4 D4 C4/2` soma 8; a prosa diz 8 nos seis idiomas.
- A nota B/H está nos 12 arquivos de guitarra (setup e primeira tarefa em `guitar-one-string-landmarks:55–57, :119`).
- "detente" aparece nos 36.
- A cópia DEBUG do APP tem 36 lições e `paths.json`; as contagens batem nas amostras.
- Menor: `title.en` é "An extra role swap", enquanto os outros cinco idiomas dizem "pequena".

## Proveniência no momento observado

- **Ainda errado:** em `editorial/queue.json` (rev. 10), os 11 reclassificados já têm `stage: physical-review-pending`, mas mantêm `publicationPolicy: proved-equivalent-…-no-new-human-pattern-gate` (`:2132, :2170, :2343, :3180, :3268, :3394, :3520, :3608, :3646, :3734, :3772`). O gate decide por `classification`, então falha para o lado seguro.
- **Estágio à frente da evidência:** os 21 equivalentes têm `stage: independent-review-approved` com `independent.status: pending` (ex.: `:80/:93`, `:3947/:3963`); um deles tem parser `pending` (`:86`).
- **Recibo do piloto:** `guided-corrections-final.md` cita o binário `9754edf7…`, não o `534376f8…` do e55. `data-guided-freeze.json` registra só o commit.
- **Resolvidos:** hash de raised-sixth (`:3950` igual a `:3957`) e escopo 21/75 em `independent-review.json:8`.
- `data-content-freeze.json` foi regenerado durante minha leitura (07:40:32Z). Depois disso, coincide com o inventário de fechamento e com as evidências nas amostras.

## Cobertura e limites

- **Propostas:**
  - Inglês completo e todos os blocos das 75; 58 mapas recalculados corda por corda.
  - Parágrafo musical nos outros cinco idiomas das 43 alteradas; cinco arquivos inteiros nos seis idiomas.
  - Localizações em seis idiomas nas cinco datadas corrigidas.
  - Nas 32 inalteradas, só inglês e blocos, mais o alemão onde havia B.
  - Linhas de referência não inglesas: conferidas em cinco arquivos; nas demais, são iguais por construção (`refine-repair-proposals.py:723–731`).
- **P0:** quatro fallbacks completos nos seis idiomas; o restante por contagem e por hash registrado. Não reli os 21 equivalentes nem as 742 legadas.
- **Piloto:** uma lição completa nos seis idiomas e blocos de outras seis; o resto por busca. Não reli as 36 inteiras nesta rodada.
- **Não feito:** recálculo de hashes, execução do lessonlint, do auditor ou da suíte Node, qualquer execução ao instrumento.
