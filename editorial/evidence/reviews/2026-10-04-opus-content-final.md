## Veredito

**Servido (P0): apto a commit.** Não encontrei bloqueador musical nem editorial nos 21 equivalentes nem nos 75 fallbacks. O bloqueador de `bass-fifth-pocket-detour` foi resolvido como recomendado. Restam três acertos em evidência fora do freeze e duas ressalvas de redação.

**Piloto (36): pronto para revisão e playthrough humanos.** Os 5 pontos do R2 estão corrigidos e as 36 lições fecham na aritmética.

**Propostas legadas (75): seguras como candidatas isoladas, mas o conjunto ainda não está pronto para playthrough.** Os 20 casos dirigidos e os 15 andamentos estão corrigidos. Nas 55 não dirigidas, que nenhuma rodada anterior tinha lido contra o texto, encontrei 27 com contradição texto↔referência das classes já conhecidas.

Esta é revisão editorial por IA. Não assino playthrough, não certifico traduções e não recalculei hashes: sem shell, conferi apenas igualdade entre documentos. Tratei os recibos `reviewOnly` como build de revisão, não como runtime de fonte commitada.

Caminhos relativos a DATA. `S/` = `v2/education/courses/instrument-scales/`, `G/` = `editorial/candidates/guided/`. Propostas são citadas por ID (único sob `editorial/candidates/legacy-repairs/`), no formato texto × bloco.

## Achados dirigidos

| Item | Estado |
|---|---|
| Detour servido | **Resolvido.** `S/sections/intermediate/units/scale-build-eight-bar-solo/lessons/bass-fifth-pocket-detour/lesson.md:73–80` reproduz o original sem barras; aviso nos seis idiomas; `legacy-repair.json:9760` = `musical`. A proposta tem quatro compassos de 4 tempos com D2 no tempo 4. |
| 10 casos da auditoria Sol | **Resolvidos.** Servidos tocam só os eventos do original. As dez propostas fecham texto↔bloco nos seis idiomas (16 tempos cada). |
| `piano-raised-sixth-compass-20260922` | **Correto** como `editorial-equivalent` (`legacy-repair.json:25557, 25705–25711`). Eventos idênticos; o inglês agora diz C; pt-BR, es e de já diziam. |
| 5 pontos do piloto | **Resolvidos:** uníssono e finais em 8 tempos; transferência sem G4 com aviso de dinâmica ×6; B/H no resumo, texto e quiz; "quinta" no feedback ×6. |
| 9 propostas do R2 | **Resolvidas** (aritmética refeita): late-launch, half-step bridge, guide-tone, comet lift, seventh lock, periscope, fifth-pocket switch, terças (11 eventos, 1–8) e call-response (32 tempos, só A–C–D–E–G, final A3). |
| 15 andamentos | **Resolvidos.** Nos 75 arquivos, todos os `tempo:` de cada lição coincidem. |
| `expectedNotes` | 58/58. Recalculei as 58 posições: altura do mapa = `expectedNotes` = linha escrita (ou prosa, nos 3 só-mapa). Valida altura, não corda/casa (ver tabela de posição). |
| Piano ninth | Limitação de ties declarada nos seis idiomas; o objetivo de sustentar continua explícito. |
| Títulos sem BPM, rotação | Confirmados. `riff-rotation-review.json:4–8` atribui a decisão ao coordenador e diz "Opus did not approve rotation". |

## Servido

Conferido sem problemas:
- **Classificação:** 20 `syntactic` + 1 `editorial-equivalent` + 75 `musical`; os 20 são exatamente os "sem contradição" do Sol.
- **Hashes:** freeze, `legacy-repair.json`, `legacy-fallbacks.json` e recibo do parser coincidem nos 12 casos dirigidos (original, proposta, servido) e no catálogo.
- **Recibo do parser:** baseline e atual em 838 + 35, atual em 36 + 75, zero inválidos.
- **Estado dos arquivos:** 96 com `revision: 2`; 75 com `contentStatus: quarantined`; 75 entradas de catálogo com título, resumo e 3 min; aviso e checkpoint de referência nos seis idiomas (450/450).
- **Blocos dos fallbacks:** 57 `notes`, 1 `scale`, 17 `quiz`; nenhum mapa.
- **Áudio = original** em 19 fallbacks comparados (11 reclassificados, terças, 7 do R2); `guitar-call-response-shift` é só conceito, sem áudio, como esperado.
- **21 equivalentes:** reli todos os blocos e a prosa inglesa completa; sem contradição de ritmo, altura, posição ou soma.
- **Isolamento:** `paths: []`; nada guiado sob `v2/`; 6 `optional: false`, todos em Harmonia; 832 + 6 = 838; quatro IDs gratuitos presentes; 5 trilhas e 7 riffs candidatos pendentes.

Pendências (nenhuma altera os bytes congelados de `v2/`):

1. **`editorial/queue.json`, 11 itens reclassificados.** Têm `classification: musical`, mas mantêm `publicationPolicy: proved-equivalent-…-no-new-human-pattern-gate` e `stage: review-pending`.
   - Linhas da policy: `:2088, :2125, :2294, :3112, :3198, :3321, :3444, :3530, :3567, :3653, :3690`; o `stage` fica 6 linhas acima.
   - Correção: `human-playthrough-required` e `physical-review-pending`, como nos outros 64.
   - O gate atual decide por `classification` (`scripts/editorial-pipeline.js:504–520`), então ainda exige playthrough humano. Corrigir antes de commitar a fila, porque os scripts estão em revisão.
2. **`editorial/queue.json:3869`:** hash do parser (`bc7698…`) diferente do conteúdo em `:3864` (`418118…`) no item raised-sixth. Falha para o lado seguro.
3. **`editorial/evidence/independent-review.json:8`:** escopo ainda diz "49 … and 47 …"; o final é 21 e 75.
4. **Aviso dos 58 fallbacks de áudio (não bloqueante).** O texto diz que o áudio preserva a fonte, mas não que ele pode não realizar o objetivo arquivado. Isso é sabido nos 11 reclassificados; o detour ainda toca D1, abaixo do E1 do baixo (`…/bass-fifth-pocket-detour/lesson.md:79`). Sugiro uma frase no modelo, nos seis idiomas. Mantenho o juízo do R2: nenhuma execução é pedida.
5. **Alemão nas terças (não bloqueante).** `S/levels/advanced/sections/advanced/units/scale-wide-interval-lines/lessons/scale-advanced-wide-interval-lines-thirds/lesson.md:53` diz "enden auf B"; na convenção alemã seria H.

## Piloto

As 36 lições fecham: escuta, mapa e transferência somam 8 ou 16 tempos; mapa = `expectedNotes` = linha; os 6 quizzes e os 2 taps estão corretos. Observações menores:
- `G/piano/melody-and-support/piano-swap-a-small-role/lesson.md:141, :177`: célula de prática de 7 tempos. Está rotulada, mas é a mesma classe do ponto corrigido no ukulele; `C4/2` no fim fecha em 8.
- A nota B/H em alemão só existe em `guitar-hear-the-distance`. B3 aparece antes, em `guitar-one-string-landmarks:22` (ordem 1) e na linha de afinação de toda lição de guitarra.
- Os pré-requisitos de viabilidade do R2 seguem iguais (`2:5 → 1:3 → 2:8`, casas 2–17 no baixo, casa 12 para iniciante, `4:8 → 3:4`).

## Propostas legadas: contradições remanescentes

O recibo matemático compara mapa com linha, não com a prosa; ele mesmo registra somas de 6, 10, 12,5, 14, 15, 19 e 22 tempos.

**Ritmo e duração (17)**

| Proposta (texto × bloco) | Contradição | Correção |
|---|---|---|
| `guitar-sixth-ladder-flare` `:31–35` × `:113, :122, :130, :138` | Texto pede colcheias e "uma colcheia a mais"; díades duram 2 e 3 tempos; blocos somam 10 e 19. | `/0.5` e `/1`; estudo final em 16 tempos. |
| `guitar-harmonic-third-switchback` `:31, :35` × `:125, :134, :142` | "Even eighth notes"; díades de 2 tempos. | Idem. |
| `guitar-chromatic-third-bridge` `:30–38` × `:112, :122` | 8 eventos de 1 tempo por acorde; o alvo é o último. Texto: alvo no tempo 1 por dois tempos, vizinho na última colcheia. | Células de 4 tempos com alvo`/2` no início e vizinho`/0.5` no fim. |
| `bass-backbeat-decoy` `:30–32` × `:112, :122` | 16 semínimas; D, G, C, A caem no tempo 2. Texto: fundamental no 1, pickup no "e do 4". | `D2 F2 E2 -/0.5 D2/0.5 G1 B1 A1 -/0.5 G1/0.5 C2 E2 D2 -/0.5 E2/0.5 A1 C#2 B1 -/0.5 A1/0.5` |
| `bass-beat-one-trapdoor` `:32` × `:112, :122` | 8 semínimas iguais. Texto: pickup no "e do 4", alvo no 1 por dois tempos. | `F1/2 -/1.5 A1/0.5 B1/2 -/1.5 D2/0.5 E2/2 -/1.5 C2/0.5 C#2/2 -/1.5 E1/0.5` |
| `bass-root-fifth-signal-grid` `:32` × `:112, :120` | Quinta no tempo 2; texto diz "and of two". | `A1 -/0.5 E2/0.5 -/2` por compasso. |
| `bass-syncopation-bridge` `:32–40` × `:121, :128` | A no tempo 2 e F# no 3. Texto: "e do 2", pausa no 3, "e do 3". Célula de 6 tempos. | `D2/0.5 -/1 A1/0.5 -/0.5 F#2/0.5 A2/1` |
| `bass-pocket-handoff` `:30, :40` × `:121` | Ataques em 1–2–3–4. Texto: 1, "e do 2", 3, "e do 4". | `G1/0.5 -/1 D2/0.5 E2/0.5 -/1 D2/0.5` |
| `bass-ghost-note-lifeline` `:32–34` × `:149` | 12,5 tempos; D3 no tempo 3 onde o texto pede a fundamental; compasso 2 sem fundamental no 1. | Reescrever em compassos de 4. |
| `piano-handoff-lantern` `:32–40` × `:123` | Bloco: direita sobe e desce, depois esquerda (18 tempos). Texto: direita sobe, esquerda responde, direita volta. | `G4 A4 B4 C5 D3 E3 F#3 G3 C5 B4 A4 G4 G4/4` |
| `guitar-anticipation-zipline` `:30–32` × `:112, :122` | 12 semínimas. Texto: preparo nos tempos 3–4, antecipação no "e do 4". | Compassos de 4 com o alvo`/0.5` no fim. |
| `guitar-seventh-target-laser` `:30–34` × `:112, :120` | Pickup em duas semínimas, alvo no tempo 3. Texto: duas últimas colcheias, alvo no 1; `:30` contradiz `:32`. | Alvo`/2` no 1, pickup no fim; rever `:30`. |
| `guitar-pivot-flare-ladder` `:32` × `:125, :135` | 12 colcheias iguais. Texto: alvo no tempo 1 e mais longo. | Alongar o alvo; fechar em 4. |
| `guitar-resolution-catapult` `:32` × `:125, :135` | Idem. | Idem. |
| `guitar-dorian-target-ladder` `:32–34` × `:112, :122` | Texto: quatro colcheias e pausa; desce B–F–D. Bloco: três semínimas; desce A–F–D. | Alinhar ao texto. |
| `guitar-target-triple-jump` `:32` × `:112, :122` | Texto: duas colcheias, salto, alvo por dois tempos. Bloco: semínimas por grau; termina em A, que não é alvo. | Idem. |
| `guitar-fourth-target-laser` `:30–32` × `:112, :122` | Alvo é o 4º evento, não o tempo 1; G e D não chegam de um traste abaixo. | Iniciar em anacruse; ajustar vizinhos. |

**Posição e corda (10)**

| Proposta (texto × mapa) | Contradição | Correção |
|---|---|---|
| `guitar-shift-signal` `:32–36` × `:121` | Texto: E na 7ª posição, E–F#–G–A nas cordas 4–2. Mapa: `5:7 4:4 4:5 4:7`. Células de 7 tempos × "two-bar phrase". | Miolo `5:7 5:9 5:10 4:7`; pausa de 3 tempos. |
| `guitar-shift-echo` `:32–34` × `:121` | Eco "in 7th position" em `4:5 4:7 3:4`; "leave beat four empty" com A soando no 4. | Eco em `5:10 4:7 4:9 4:7`; ritmo a decidir pelo autor. |
| `guitar-dovetail-shift` `:30–34` × `:122` | Resposta "in 5th position" mapeada na 2ª (`4:5 3:2 3:4 2:3`); slide impossível. | P.ex. `4:5 4:7 4:9 3:7`. |
| `guitar-third-shift-signal` `:30–32` × `:109, :123` | Mapa inteiro nas casas 2–5, sem mudança; B dura meio tempo e não "soa como chegada". | Redesenho. |
| `guitar-fourth-compass-lift` `:30` × `:112–114` | Texto: casas 5–9. Mapa: casas 2–5. | `5:5 4:5 5:9 5:7 5:7 4:7 4:5 5:9 5:9 4:9 4:7 4:5` |
| `guitar-motif-password-20260913` `:32` × `:137` | Texto: corda 2, casas 1–3–5–3. Mapa usa `1:0`. | `2:1 2:3 2:5 2:3` |
| `guitar-unison-string-detective-20260915` `:32` × `:129` | Texto: duas rotas. Mapa híbrido `2:5 1:3 2:5`. | `2:5 2:8 2:5@2` |
| `guitar-string-skip-triangle-20260917` `:32` × `:137` | Texto: `5:3`, `4:2`, `2:8`, pulando a corda 3. Mapa: `5:3 5:7 1:3 5:7`. | `5:3 4:2 2:8 4:2` |
| `bass-pentatonic-seventh-answer-20260925` `:32` × `:137` | D2 na corda A, casa 5. Mapa: `2:0`. | `3:5` |
| `guitar-offbeat-motif-relay-20260927` `:32` × `:125` | B3 na corda 3, casa 4. Mapa: `2:0`. | `3:4` |

Menores, sem contradição material:
- `guitar-late-launch-switch:51, :68, :85`: concordância ("o primeira metade", "el primera mitad", "lässt du erste Hälfte").
- `guitar-position-comet-lift:32` diz "strings 6, 5, and 4"; o mapa usa só 6 e 5.
- `bass-seventh-target-lock:30` diz "fall one step"; G→A e C→D sobem.
- `piano-sixth-handoff-switch:30–32`: F natural como "sexta" de Am7 ao lado de F# no compasso seguinte; decisão do professor.
- `bass-octave-feint-drop`, `guitar-target-echo-run`, `bass-third-echo-brake` e `bass-pocket-switch`: divergências leves de duração ou corda.

Antes do playthrough, recomendo corrigir as 27 ou declarar nos seis idiomas que a referência mostra só a ordem das alturas. Recomendo também uma leitura no estilo Sol das 13 datadas que só conferi em blocos e localização.

## Cobertura exata

- **Relatórios e recibos:** os quatro `.md` e o log por inteiro; do freeze, estrutura, contagens e hashes dirigidos; recibos Swift (111 `valid`); recibo matemático por amostra e por soma de tempos.
- **Evidência DATA:** campos de topo dos 96 em `legacy-repair.json`, com 4 entradas completas; hashes e tipos em `legacy-fallbacks.json`; `queue.json` (status, stage, policy e classificação de todos os itens).
- **Servido:**
  - 21 equivalentes: blocos e inglês completo; seis idiomas em 2 e quatro em 1.
  - 75 fallbacks: front matter, aviso e tipo de bloco por busca.
  - 3 arquivos completos nos seis idiomas.
  - 19 fallbacks comparados com o original.
- **Piloto:** 5 lições dirigidas completas nos seis idiomas; todos os blocos das 36; quizzes e taps em inglês.
- **Propostas:**
  - 20 dirigidas completas nos seis idiomas.
  - 58 mapas recalculados.
  - Inglês completo de outras 39.
  - Nas 16 restantes, blocos e frase de localização (3 com divergência, 13 sem).
- **Não feito:**
  - recálculo de hashes e diff contra o baseline;
  - execução do lessonlint;
  - as 742 lições legadas inalteradas;
  - prosa não inglesa, fora das amostras;
  - scripts JS (li só o trecho do gate) e código do app;
  - qualquer execução ao instrumento.

Este relatório não deve ser registrado como aprovação de `languages` nem de `playthrough` na fila.
