## Veredito

**DATA pode prosseguir** para record-publication-review, commit/push, Pages e reconcile-p0. Não encontrei bloqueador no journal/replay, no guard de imagens nem no delta de texto. O gate do APP segue fora deste parecer. É revisão por IA: não vale como playthrough humano nem aprovação linguística.

O que sustenta o veredito:

- **Journal:** o replay exige o mesmo motivo, o mesmo intent (tudo menos `completedAt`) e arquivos/espelhos idênticos ao journal. Órfão, corrupção e ambiguidade são recusados antes de qualquer escrita, e `assertState` recusa `prepared`.
- **Integração com reconcile-p0:** nada chama `assertState` antes de `initializeState`, então o replay é alcançável pelo comando real. `snapshot.json` não tem timestamp (`build-pages.js:39-45`), logo a mesma prova se reproduz para o mesmo commit.
- **Estado privado real** (`…/InstrumentScalesEditorial/state/edfc62ef7cd1281e/`): só `builds/`. Não há identity, ledger, journal, recovery nem lock, então a primeira inicialização real cabe na allow-list.
- **Assets:** o guard é superconjunto do que o parser fixado e55 trata como asset. `assetSources` só nasce de `![` (`LKPathUnitSnapshot.swift:55-87`, `LKLessonDocument.swift:576-584`). O guard roda antes de qualquer staging (`promote-approved.js:231-234`) e no validador (`validate-editorial.js:135-146`), sem parâmetro de bypass. Nenhum `.md` de `editorial/` ou `v2/` contém `![`, `<img` ou fence image.
- **Texto:** zero "Dm 7"/"Am 7" em DATA; `bass-beat-one-trapdoor` tem "Dm7" nas seis regiões. O inventário `7765b7bd…` coincide em três recibos. O recibo do parser mostra 838/36/75/35, 0 falhas, `reviewOnly: false`.
- **Testes:** o log tem 115 aprovados, 0 falhas, 0 skips, com os três exit 86 e os sete casos negativos.
- **Recibos:** `site-final-qa.json` e `repository-reconciliation.json` estão corrigidos, com o histórico preservado.

Dos meus achados anteriores: o 8 e o 10 estão fechados, o 9 foi reduzido às janelas do achado 2 abaixo, e o 5 está contido no lado DATA; o contrato no APP segue pendente.

## Achados (nenhum bloqueia)

1. **Baixa — o timestamp original não chega ao ledger num replay real.**
   - Depois que `initializeState` regrava o ledger do journal, `publishing-state.js:442-446` grava por cima o ledger reobservado.
   - Resultado: journal e `.recovery/previous` ficam com o horário original; `item-outcomes.json` e `.recovery/current` ficam com o novo.
   - Só `completedAt` difere, nenhum script o lê e nenhum item reabre. A preservação vale para `initializeState` isolado (`editorial-recovery.test.js:199-202`), não de ponta a ponta.

2. **Baixa — OPS9 reduzido, não eliminado.**
   - `atomicJSON` cria `<arquivo>.<uuid>.tmp` e depois renomeia (`editorial-pipeline.js:69-71`). Uma morte entre os dois passos deixa um temp que o replay recusa como estado ambíguo (`editorial-state.js:151-153`, `:190-192`, `:238-243`).
   - A cópia para `previous` (`:86`) não é atômica; se truncada, o erro é um `SyntaxError` cru em `:174`.
   - Não há fsync, então queda de energia não está coberta.
   - Tudo falha fechado, mas ainda exige limpeza manual.

3. **Baixa — `restore-state` ignora journal `prepared`** (`editorial-state.js:295-342`).
   - Após a fronteira identity, o espelho só tem `identity.json`. Um restore cria estado com identity e sem ledger e move o journal para `.preserved-<uuid>`.
   - Daí nem replay nem restore concluem; é preciso devolver o diretório à mão. Nada se perde.
   - O lock remanescente e a mensagem em `:10` reduzem a chance.

4. **Baixa — o journal amarra o caminho absoluto para sempre** (`editorial-state.js:118`, lido em todo `assertState`). Se a rotina noturna resolver o state root por outra string (alias em `EDITORIAL_STATE_ROOT`, symlink, outro HOME), ela para com "corrupted initialization journal" sobre um estado íntegro. A saída é `restore-state`.

5. **Informativo — `dry-run` não prova inicialização concluída.** Ele lê o ledger sem `assertState` (`editorial-pipeline.js:216-219`, `:1099-1125`) e imprime seleção normal sobre um estado `prepared`.

6. **Informativo — cobertura dos testes de crash.** Eles chamam `initializeState` direto, sem lock. Não há crash dentro de `reconcileP0`, nem nas fronteiras journal→ledger e espelho→estado; essas eu validei só por leitura.

7. **Informativo — referência do template.** `data-publication-review.input.template.json:5` cita `opus-integrated-final.json`, que não releu o P0 (`opus-integrated-final.md:41`) e antecede este delta.

8. **Informativo — o bloqueio de imagens vale só para paths.** `promoteLegacy` ainda aceita imagem com hash na aprovação (`promote-approved.js:164-169`, `:205-211`). Hoje não há nenhuma, e uma lição legada com imagem não pode ser reutilizada por path.

## Condições de publicação

1. **Antes do reconcile-p0:** listar o state root real com arquivos ocultos. Só `builds` pode existir; um `.DS_Store` já faz a inicialização recusar, e minha listagem não mostra ocultos.
2. **CI:** exigir `audit-swift-parser --verify` e `validate-editorial --publication` verdes. Pela leitura, seis testes têm guarda de runtime, então espere 109 aprovados, 6 skipped, 0 falhas. Qualquer outra contagem não é verde, e o conteúdo de 448975f continua servido.
3. **Depois do reconcile-p0:** conferir direto `initialization.json` com `status: complete`, `identity.json`, 21 `done`, 75 `blocked-human`, `p0-reconciled.json` e o espelho. Só então rodar o dry-run.
4. **Se o reconcile-p0 for interrompido:**
   - reconciliar o `publisher.lock` e repetir o mesmo commit e URL;
   - não rodar `restore-state`;
   - não empurrar outro commit DATA antes do replay — o intent fixa `publishedCommit`, e com HEAD ou Pages adiante o journal não conclui por nenhum comando.
5. **`reviewReference`:** citar a cadeia real — `opus-content-final` (onde o P0 foi lido), o parecer integrado e este. Manter `physicalPlaythrough` e `languagesApproval` como `not-claimed`.
6. **Antes de remover o lock:** confirmar que a rotina noturna usa o mesmo caminho absoluto do state root, sem override.
7. **Antes da primeira path com imagem:** entregar o contrato conjunto de hash de assets.

## Limites

- Não executei nada nem recalculei hashes; cruzei recibos entre si.
- Não reli o conteúdo do P0. Nas três gerações do freeze, conferi três arquivos servidos, mais `paths.json` e `riffs.json`, todos idênticos.
- Dos 16 documentos de texto fiz buscas dirigidas; não comparei fences nem o inglês byte a byte.
- Do APP li só o Package LessonsKit, declarado inalterado em e55, para alinhar o guard.
- Reutilizo o parecer anterior para M14–M18 e para os testes que não reli. Nesta rodada li por inteiro os scripts do fluxo de estado/publicação, `pages.yml` e os dois arquivos de teste novos.
- Pages e Ubuntu nunca rodaram este código; os testes novos só rodaram no Mac.
