#!/usr/bin/env python3
"""Quarantine unreviewed physical proposals while serving honest legacy-compatible references."""
import pathlib, json, re, subprocess, hashlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACTIVE = (
    pathlib.Path.home()
    / "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json"
)
if ACTIVE.exists():
    raise SystemExit(ACTIVE.read_text())
subprocess.run(
    ["node", "-e", 'require("./scripts/maintenance-guard").assertWritesAllowed()'],
    cwd=ROOT,
    check=True,
)
REPORT = json.loads((ROOT / "editorial/evidence/legacy-repair.json").read_text())
L = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"]
NOTICE = [
    "The physical exercise is under review. This version is a reference, so it asks for no instrumental execution. Read the archived goal below as context, rather than as an approved physical instruction. Any audio here preserves only pitches and durations fully specified in the original source; it does not validate its string map, fingering, hand coordination or technique. If audio is absent, use the concept question instead of imagining an unwritten performance. Listening, answering a question and declaring practice are different kinds of evidence. You can choose another reviewed lesson for physical practice and return when this proposal has passed its required review.",
    "O exercício físico está em revisão. Esta versão é uma referência e não solicita execução instrumental. Leia o objetivo arquivado abaixo como contexto, sem tratá-lo como instrução física aprovada. O áudio preserva apenas alturas e durações completamente determinadas na fonte original; não valida o mapa de cordas, a digitação, a coordenação das mãos ou a técnica. Se não houver áudio, use a pergunta conceitual sem imaginar uma execução não escrita. Ouvir, responder e declarar prática são evidências distintas. Escolha outra aula revisada para praticar fisicamente e volte quando esta proposta passar pela revisão necessária.",
    "El ejercicio físico está en revisión. Esta versión es una referencia y no pide ejecución instrumental. Lee el objetivo archivado como contexto, sin tratarlo como instrucción física aprobada. El audio conserva solo alturas y duraciones completamente determinadas en la fuente original; no valida mapa de cuerdas, digitación, coordinación ni técnica. Si no hay audio, usa la pregunta conceptual sin imaginar una ejecución no escrita. Escuchar, responder y declarar práctica son evidencias diferentes. Elige otra lección revisada para practicar físicamente y vuelve cuando esta propuesta supere la revisión necesaria.",
    "Die praktische Übung wird geprüft. Diese Fassung ist eine Referenz und verlangt kein Instrumentalspiel. Lies das archivierte Ziel als Kontext, nicht als freigegebene Spielanweisung. Audio bewahrt ausschließlich vollständig bestimmte Tonhöhen und Dauern aus der ursprünglichen Quelle; es bestätigt weder Saitenkarte, Fingersatz, Handkoordination noch Technik. Fehlt Audio, nutze die Konzeptfrage statt eine ungeschriebene Ausführung anzunehmen. Zuhören, Antworten und berichtete Praxis sind verschiedene Belege. Wähle eine geprüfte Lektion für die praktische Übung und kehre nach der nötigen Prüfung dieser Vorlage zurück.",
    "この実技課題は確認中です。この版は参照用で、実際の演奏は求めません。下の元の目標は背景として読み、承認済みの奏法指示と考えないでください。音声がある場合は元の資料で完全に指定された音高と長さだけを保ち、弦の位置、指使い、両手の動きや奏法を保証しません。音声がない場合は書かれていない演奏を想像せず、概念の質問を使います。聴くこと、質問に答えること、練習を申告することは異なる証拠です。実技には確認済みの別の課題を選び、この案の必要な確認が終わってから戻ってください。",
    "此实体演奏练习正在审核。本版本仅供参考，不要求实际演奏。下面的原目标作为背景阅读，不能当作已批准的奏法指示。若有音频，仅保留原资料中完全确定的音高和时值，不认可弦位、指法、双手协调或技术。若没有音频，请使用概念问题，不要想象未写明的演奏。聆听、回答问题和自报练习是不同证据。实体练习可选择另一项已审核课程，待本提案完成所需检查后再回来。",
]
ARCHIVE = [
    "Archived goal awaiting review: ",
    "Objetivo arquivado aguardando revisão: ",
    "Objetivo archivado pendiente de revisión: ",
    "Archiviertes Ziel zur Prüfung: ",
    "確認待ちの元の目標：",
    "等待审核的原目标：",
]
CHECK = [
    "State whether this activity is a listening/concept reference or an approved physical exercise.",
    "Diga se esta atividade é referência auditiva/conceitual ou exercício físico aprovado.",
    "Indica si esta actividad es referencia auditiva/conceptual o ejercicio físico aprobado.",
    "Nenne, ob dies eine Hör-/Konzeptreferenz oder eine freigegebene praktische Übung ist.",
    "この活動が聴く・概念の参照か、承認済み実技かを説明します。",
    "说明此活动是聆听/概念参考，还是已批准的实体演奏练习。",
]
PROMPTS = [
    "Does finishing this reference prove playing the instrument?",
    "Terminar esta referência comprova tocar o instrumento?",
    "¿Terminar esta referencia demuestra tocar el instrumento?",
    "Belegt das Abschließen dieser Referenz Instrumentalspiel?",
    "この参照を終えたことは実演を証明しますか。",
    "完成此参考能证明实际演奏吗？",
]
NO = [
    "No: it records only the activity actually done.",
    "Não: registra apenas a atividade realizada.",
    "No: registra solo la actividad realizada.",
    "Nein: nur die tatsächlich ausgeführte Aktivität.",
    "いいえ。行った活動だけを記録します。",
    "不能：只记录实际完成的活动。",
]
YES = [
    "Yes: any completion proves performance.",
    "Sim: qualquer conclusão comprova execução.",
    "Sí: cualquier finalización demuestra ejecución.",
    "Ja: jeder Abschluss belegt Instrumentalspiel.",
    "はい。完了は必ず実演を証明します。",
    "能：任何完成都证明演奏。",
]
fallbacks = []
priorFile = ROOT / "editorial/evidence/legacy-fallbacks.json"
prior = json.loads(priorFile.read_text()) if priorFile.exists() else {"lessons": []}
priorHashes = {x["path"]: x["fallbackSHA256"] for x in prior["lessons"]}
selected = set(sys.argv[2:]) if len(sys.argv) > 1 and sys.argv[1] == "--ids" else None
if selected is not None:
    fallbacks = [x for x in prior["lessons"] if x["id"] not in selected]


def fields(src):
    return dict(re.findall(r"^([^:\n]+):\s*(.*)$", src, re.M))


for change in REPORT["changes"]:
    if selected is not None and change["id"] not in selected:
        continue
    if change["classification"] != "musical":
        continue
    file = ROOT / change["path"]
    proposal = file.read_text()
    original = subprocess.check_output(
        ["git", "show", "448975f:" + change["path"]], cwd=ROOT, text=True
    )
    currentHash = hashlib.sha256(proposal.encode()).hexdigest()
    permitted = {
        hashlib.sha256(original.encode()).hexdigest(),
        change["afterSHA256"],
        change.get("servedSHA256"),
        priorHashes.get(change["path"]),
    }
    if currentHash not in permitted:
        raise ValueError(
            "Current published blob is neither baseline nor recorded own output; preserve it: "
            + change["path"]
        )
    proposed = ROOT / "editorial/candidates/legacy-repairs" / change["path"]
    archived = ROOT / "editorial/originals/legacy" / change["path"]
    proposed.parent.mkdir(parents=True, exist_ok=True)
    archived.parent.mkdir(parents=True, exist_ok=True)
    if proposed.exists():
        proposal = proposed.read_text()
    if hashlib.sha256(proposal.encode()).hexdigest() != change["afterSHA256"]:
        raise ValueError("Unexpected proposal bytes: " + change["path"])
    proposed.write_text(proposal)
    archived.write_text(original)
    header = original.split("---")[1]
    meta = fields(header)
    header = re.sub(
        r"^revision: (\d+)$",
        lambda m: "revision: " + str(int(m[1]) + 1),
        header,
        flags=re.M,
    )
    prefixes = [
        "Reference in review · ",
        "Referência em revisão · ",
        "Referencia en revisión · ",
        "Referenz in Prüfung · ",
        "確認中の参照 · ",
        "审核中的参考 · ",
    ]
    summaryPrefixes = [
        "Original goal, physical practice under review: ",
        "Objetivo original, prática física em revisão: ",
        "Objetivo original, práctica física en revisión: ",
        "Ursprüngliches Ziel, praktische Ausführung in Prüfung: ",
        "元の目標（実技確認中）：",
        "原目标（实体演奏待审）：",
    ]
    for locale, prefix, summaryPrefix in zip(L, prefixes, summaryPrefixes):
        title = prefix + meta["title." + locale]
        summary = summaryPrefix + meta["summary." + locale]
        header = re.sub(
            r"^title\." + re.escape(locale) + r": .*$",
            lambda m: "title." + locale + ": " + title,
            header,
            flags=re.M,
        )
        header = re.sub(
            r"^summary\." + re.escape(locale) + r": .*$",
            lambda m: "summary." + locale + ": " + summary,
            header,
            flags=re.M,
        )
        meta["title." + locale] = title
    header = re.sub(
        r"^estimatedMinutes: \d+$", "estimatedMinutes: 3", header, flags=re.M
    )
    header += "\ncontentStatus: quarantined\n"
    body = ":::localized\n"
    for locale, notice, prefix, checkpoint in zip(L, NOTICE, ARCHIVE, CHECK):
        region = re.search(
            r":::locale "
            + re.escape(locale)
            + r"\n([\s\S]*?)(?=:::locale |:::endlocalized)",
            original,
        )[1]
        archivedGoal = re.search(r"^:::checkpoint\s+(.+)$", region, re.M)[1]
        musicalContext = ""
        if change["id"] == "scale-advanced-wide-interval-lines-thirds":
            contexts = [
                "The written thirds start on C and finish on B, degree 7 of C major. Hear that open ending before imagining a tonic resolution; adding C remains a separate proposed correction.",
                "As terças escritas começam em dó e terminam em si, grau 7 de dó maior. Ouça esse final aberto antes de imaginar a resolução na tônica; acrescentar dó continua sendo uma correção proposta.",
                "Las terceras escritas empiezan en do y terminan en si, grado 7 de do mayor. Escucha ese final abierto antes de imaginar la resolución en la tónica; añadir do sigue siendo una corrección propuesta pendiente.",
                "Die notierten Terzen beginnen auf C und enden auf B, der siebten Stufe in C-Dur. Höre zuerst dieses offene Ende, bevor du eine Grundtonauflösung erwartest; ein zusätzliches C bleibt eine getrennte vorgeschlagene Korrektur zur Prüfung.",
                "元の3度の列はCで始まり、Cメジャーの第7音Bで終わります。主音への解決を想像する前に、この開いた終わりを聴きます。Cの追加は別の修正案として確認待ちです。",
                "原来写出的三度序列从C开始，在C大调第七级B结束。先听这个未回主音的开放结尾，不能把原音频当作已解决到C。补上C属于另一个等待审核的修正提案；此处只保留原来指定的音，不要求实际弹奏或认证技巧。",
            ]
            musicalContext = contexts[L.index(locale)] + " "
        body += f':::locale {locale}\n# {meta["title."+locale]}\n\n{notice} {musicalContext}{prefix}{archivedGoal}\n\n:::checkpoint {checkpoint}\n\n'
    body += ":::endlocalized\n\n"
    audible = []
    proof = []
    fences = re.findall(r"```([^\n]+)\n(.*?)```", original, re.S)
    for index, (kind, source) in enumerate(fences):
        # Only original fully specified musical intent is exposed; no authored octave/timing/physical map.
        p = change["blockProof"][index]
        if (
            kind == "notes"
            and p.get("before")
            and (
                p.get("eventIntentEqual") is True
                or p.get("before") == p.get("after")
                or p.get("originalFullyDetermined") is True
            )
        ):
            f = fields(source)
            seq = re.sub(
                r"\[([^]]+)\]",
                lambda m: "[" + ",".join(m[1].replace(",", " ").split()) + "]",
                f["sequence"],
            )
            seq = " ".join(seq.replace("|", " ").split())
            f.update(
                sequence=seq,
                id=f.get("id", change["id"] + f"-reference-{index+1}"),
                instrument=meta["instrument"],
                tempo=re.search(r"\d+(?:\.\d+)?", f.get("tempo", "80"))[0],
            )
            f.pop("key", None)
            audible.append(
                "```notes\n" + "\n".join(f"{k}: {v}" for k, v in f.items()) + "\n```\n"
            )
            proof.append(
                {
                    "originalBlock": index + 1,
                    "eventIntent": p["before"],
                    "equivalent": True,
                }
            )
        if kind == "scale" and p.get("before"):
            audible.append("```scale\n" + source + "```\n")
            proof.append(
                {
                    "originalBlock": index + 1,
                    "eventIntent": p["before"],
                    "equivalent": True,
                }
            )
    if not audible:
        quiz = f'```quiz\nid: {change["id"]}-quarantine-concept\ncorrect: no\nshuffle: true\n'
        quiz += "\n".join(f"prompt.{l}: {v}" for l, v in zip(L, PROMPTS)) + "\n"
        quiz += "\n".join(f"explanation.{l}: {v}" for l, v in zip(L, NO)) + "\n"
        quiz += (
            "option: no | "
            + " | ".join(f"label.{l}: {v}" for l, v in zip(L, NO))
            + "\n"
        )
        quiz += (
            "option: yes | "
            + " | ".join(f"label.{l}: {v}" for l, v in zip(L, YES))
            + "\n```\n"
        )
        audible = [quiz]
    fallback = "---" + header + "---\n\n" + body + "\n".join(audible)
    if ACTIVE.exists():
        raise SystemExit(ACTIVE.read_text())
    file.write_text(fallback)
    fallbacks.append(
        dict(
            id=change["id"],
            path=change["path"],
            classification="quarantine-fallback",
            originalSHA256=hashlib.sha256(original.encode()).hexdigest(),
            proposalSHA256=change["afterSHA256"],
            fallbackSHA256=hashlib.sha256(fallback.encode()).hexdigest(),
            proposalPath=str(proposed.relative_to(ROOT)),
            originalPath=str(archived.relative_to(ROOT)),
            originalAudioProof=proof,
            fallbackKind=(
                "original-listening-reference"
                if proof
                else "concept-only-no-invented-audio"
            ),
            physicalReview="pending",
            progress="existing completion identities retained; no instrumental evidence granted",
        )
    )
for file in ROOT.glob("v2/education/courses/*/catalog.json"):
    catalog = json.loads(file.read_text())
    ids = {f["id"] for f in fallbacks}
    for section in catalog["sections"]:
        for unit in section["units"]:
            for lesson in unit["lessons"]:
                if lesson["id"] in ids:
                    lesson["contentStatus"] = "quarantined"
                    lesson["estimatedMinutes"] = 3
                    originalMetadata = fields(
                        subprocess.check_output(
                            [
                                "git",
                                "show",
                                "448975f:v2/education/courses/"
                                + catalog["course"]
                                + "/"
                                + lesson["path"],
                            ],
                            cwd=ROOT,
                            text=True,
                        ).split("---")[1]
                    )
                    for locale, prefix, summaryPrefix in zip(
                        L, prefixes, summaryPrefixes
                    ):
                        lesson["titles"][locale] = (
                            prefix + originalMetadata["title." + locale]
                        )
                        lesson["summaries"][locale] = (
                            summaryPrefix + originalMetadata["summary." + locale]
                        )
    file.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
priorFile.write_text(
    json.dumps(
        {
            "schema": 1,
            "policy": "Pending physical proposals are never served. Fallback audio is limited to fully specified original musical events. Concept-only fallback invents no reference music. Complete original instructions remain traceable outside production.",
            "lessons": fallbacks,
            "counts": {
                kind: sum(f["fallbackKind"] == kind for f in fallbacks)
                for kind in [
                    "original-listening-reference",
                    "concept-only-no-invented-audio",
                ]
            },
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
print(len(fallbacks), json.loads(priorFile.read_text())["counts"])
