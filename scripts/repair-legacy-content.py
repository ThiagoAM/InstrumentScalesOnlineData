#!/usr/bin/env python3
"""Concentrated repair of the pinned parser audit. Never regenerate the library."""
import json, re, pathlib, hashlib, os, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACTIVE = (
    pathlib.Path.home()
    / "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json"
)
if ACTIVE.exists():
    raise SystemExit(ACTIVE.read_text())
AUDIT = json.loads((ROOT / "editorial/evidence/swift-parser-before.json").read_text())
LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"]
TUNINGS = {
    "guitar": ["E2", "A2", "D3", "G3", "B3", "E4"],
    "bass": ["E1", "A1", "D2", "G2"],
}
EXPLICIT = {
    "bass-root-fifth-signal-grid": ["A1 E2 -/2 D2 A1 -/2 G1 D2 -/2 C2 G1 -/2"],
    "guitar-third-shift-signal": [
        "G2 A2 B2 D3/2 E3 F#3 G3 A3/2 A3 G3 F#3 E3 D3 B2 A2 G2/2"
    ],
    "guitar-shift-signal": [
        "G2 A2 B2 D3/2 -/2 E3 F#3 G3 A3/2 -/2 A3 G3 F#3 E3 D3 B2 A2 G2"
    ],
    "bass-pocket-switch": [
        "D2/0.5 -/0.5 A1 E2/0.5 -/0.5 F#2 D2 A2 B2 D3 D2/0.5 -/0.5 A1 E2/0.5 -/0.5 F#2 D2 A2 B2 D3"
    ],
    "piano-lane-cross": [
        "[G2,B3] [D3,C4] [G3,D4]/2 [G2,B4] [D3,C5] [G3,D5]/2 [G3,B3] [D4,C4] [G4,D4]/2 [G2,D4] [D3,C4] [G3,B3] [G2,G4]"
    ],
    "guitar-shift-echo": ["G2 A2 B2 A2/2 -/2 G3 A3 B3 A3/2 -/2"],
    "bass-syncopation-bridge": ["D2/0.5 -/0.5 A1/0.5 -/0.5 F#2 A2/0.5 -/0.5 D2/2"],
    "piano-handoff-lantern": ["G4 A4 B4 C5 C5 B4 A4 G4 D3 E3 F#3 G3 G3 F#3 E3 D3 G3/2"],
    "guitar-dovetail-shift": ["G2 A2 B2 D3/2 -/2 G3 A3 B3 D4/2 -/2"],
    "bass-pocket-handoff": [
        "G1/0.5 -/0.5 D2/0.5 -/0.5 E2/0.5 -/0.5 D2/0.5 -/0.5 G2/0.5 -/0.5 D3/0.5 -/0.5 E3/0.5 -/0.5 D3/0.5 -/0.5 G1/2"
    ],
    "piano-hands-crossing": ["G4 A4 B4 A4 G3 A3 B3 A3 G4 A4 B4 A4 G3 A3 B3 G3"],
}


def midi(note):
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d+)", note)
    if not m:
        raise ValueError("Invalid pitch " + note)
    n, a, o = m.groups()
    return (
        (int(o) + 1) * 12
        + dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)[n]
        + ({"#": 1, "b": -1}.get(a, 0))
    )


def fields(src):
    return dict(re.findall(r"^([^:\n]+):\s*(.*)$", src, re.M))


def events(seq, defaultBeat=1):
    return [
        (
            (
                [
                    midi(n)
                    for n in (
                        pitch[1:-1].split(",") if pitch.startswith("[") else [pitch]
                    )
                ],
                float(beat or defaultBeat),
            )
            if pitch != "-"
            else ([], float(beat or defaultBeat))
        )
        for pitch, _, beat in [tok.partition("/") for tok in seq.split()]
    ]


def locate(pitch, tuning, preferred):
    choices = [
        (abs(fret - preferred), fret, -idx, len(tuning) - idx)
        for idx, open_note in enumerate(tuning)
        if 0 <= (fret := pitch - open_note) <= 20
    ]
    if not choices:
        raise ValueError(f"Pitch {pitch} outside instrument range")
    _, fret, _, string = min(choices)
    return f"{string}:{fret}"


changes = []
previous = (
    json.loads((ROOT / "editorial/evidence/legacy-repair.json").read_text())
    if (ROOT / "editorial/evidence/legacy-repair.json").exists()
    else {"changes": []}
)
allowed = {x["path"]: x.get("afterSHA256") for x in previous["changes"]}


def guarded_write(file, original, result):
    current = file.read_text()
    rel = str(file.relative_to(ROOT))
    if current not in [original, result] and hashlib.sha256(
        current.encode()
    ).hexdigest() != allowed.get(rel):
        raise ValueError("Unexpected current blob; preserve and reconcile " + rel)
    if ACTIVE.exists():
        raise SystemExit(ACTIVE.read_text())
    file.write_text(result)


for row in AUDIT["rows"]:
    if row["source"] != "legacy" or row["valid"]:
        continue
    file = ROOT / row["file"]
    original = subprocess.check_output(
        ["git", "show", "448975f:" + row["file"]], cwd=ROOT, text=True
    )
    header = fields(original.split("---")[1])
    instrument = header["instrument"]
    fences = list(
        re.finditer(r"```(notes|fretboard|keyboard)\n(.*?)```", original, re.S)
    )
    note_sources = []
    note_beats = []
    replacements = []
    note_index = 0
    for fence in fences:
        kind, source = fence.groups()
        if kind != "notes":
            continue
        f = fields(source)
        note_index += 1
        if row["id"] in EXPLICIT:
            seq = EXPLICIT[row["id"]][note_index - 1]
        else:
            seq = f.get("sequence", "")
            # Commas are chord separators. Bar lines do not create events.
            seq = re.sub(
                r"\[([^]]+)\]",
                lambda m: "[" + ",".join(m[1].replace(",", " ").split()) + "]",
                seq,
            )
            seq = " ".join(seq.replace("|", " ").split())
            if row["id"] == "bass-ghost-note-lifeline":
                seq = re.sub(r"\bX\b", "-", seq)
            if not seq:
                raise ValueError(f'Needs authored sequence: {row["id"]}')
        if row["id"] == "guitar-target-echo-run":
            # Am7's third is C, not B. Each bar resolves C–F#–B–E, eight beats at 0.5 beat/event.
            seq = "B3/0.5 A3/0.5 G3/0.5 C4/0.5 -/2 E4/0.5 G4/0.5 A4/0.5 F#4/0.5 -/2 A3/0.5 G3/0.5 A3/0.5 B3/0.5 -/2 D4/0.5 C4/0.5 G4/0.5 E4/0.5 -/2"
        if row["id"] == "bass-fifth-echo-lock":
            seq = "A1/1.5 E2/0.5 -/1 G1/0.5 A1/0.5 D2/1.5 A1/0.5 -/1 C2/0.5 D2/0.5 G1/1.5 D2/0.5 -/1 B1/0.5 D2/0.5 C2/1.5 G1/0.5 -/1 A1/0.5 C2/0.5"
        f["id"] = f.get("id", f'{row["id"]}-notes-{note_index}')
        f["instrument"] = instrument
        f["tempo"] = re.search(r"\d+", f.get("tempo", "60"))[0]
        f["sequence"] = seq
        f.pop("key", None)
        for unknown in ["left hand", "right hand", "return"]:
            f.pop(unknown, None)
        note_sources.append(seq)
        note_beats.append(float(f.get("beat", 1)))
        replacements.append(
            (
                fence.span(),
                "```notes\n" + "\n".join(f"{k}: {v}" for k, v in f.items()) + "\n```",
            )
        )
    for fence in fences:
        kind, source = fence.groups()
        if kind == "keyboard":
            # Unsupported diagrams were rendered as raw code by the old client. The translated body already states hand roles.
            replacements.append((fence.span(), "```text\n" + source + "```"))
            continue
        if kind != "fretboard":
            continue
        f = fields(source)
        tuning = TUNINGS[instrument]
        tmidi = list(map(midi, tuning))
        pos = f.get("positions", "")
        oldrange = f.get("frets", f.get("fretRange", "0-12"))
        preferred = sum(map(int, oldrange.split("-"))) / 2
        physicalCorrections = {
            "guitar-harmonic-third-switchback": "[5:10,4:9]@2 [5:12,4:10]@2 [4:9,3:7]@2 [4:10,3:9]@2",
            "guitar-sixth-ladder-flare": "[6:8,4:7]@2 [6:10,4:9]@2 [5:7,3:5]@2 [5:8,3:7]@2",
            "guitar-fourth-compass-lift": "5:5 4:5 4:4 4:2 4:2 3:2 4:5 4:4 4:4 3:4 3:2 4:5",
        }
        if row["id"] in physicalCorrections:
            pos = physicalCorrections[row["id"]]
        elif re.search(r"\d+:\d+ [A-G]", pos) or "id" not in f:
            # The old labelled maps used bass string numbers inconsistently. Build exact locations from the authored notes, preserving pitches/durations.
            sequence = (
                note_sources[0]
                if note_sources
                else {
                    "guitar-third-shift-cipher": "B3/0.5 C4/3.5 E4/0.5 F#4/3.5 D4/0.5 B3/3.5 G4/0.5 E4/3.5",
                    "guitar-ninth-color-compass": "B3 D4 C4 E4 F#4 E4 A4 B4 A4 D4 E4 D4",
                }[row["id"]]
            )
            output = []
            for pitches, duration in events(
                sequence, note_beats[0] if note_beats else 1
            ):
                locations = [locate(p, tmidi, preferred) for p in pitches]
                token = (
                    "[" + ",".join(locations) + "]"
                    if len(locations) > 1
                    else (locations[0] if locations else "-")
                )
                output.append(token + (f"@{duration:g}" if duration != 1 else ""))
            pos = " ".join(output)
        elif not pos and f.get("sequence"):
            pos = re.sub(r"(\d+)/(\d+)", r"\1:\2", f["sequence"]).replace("|", " ")
        else:
            pos = pos.replace(" x", " -")
            # A fifth finger is not a valid fretting-hand instruction.
            pos = re.sub(r"/[5-9](?=\s|$)", "", pos)
        coordinates = [tuple(map(int, m)) for m in re.findall(r"(\d+):(\d+)", pos)]
        if not coordinates:
            raise ValueError("Missing positions " + row["id"])
        frets = [fr for st, fr in coordinates]
        f = {k: v for k, v in f.items() if k not in ["sequence", "rhythm", "fretRange"]}
        f.update(
            id=f.get("id", row["id"] + "-map"),
            instrument=instrument,
            tuning=" ".join(tuning),
            frets=f"{min(frets)}-{max(frets)}",
            tempo=re.search(r"\d+", f.get("tempo", "60"))[0],
            positions=" ".join(pos.split()),
        )
        replacements.append(
            (
                fence.span(),
                "```fretboard\n"
                + "\n".join(f"{k}: {v}" for k, v in f.items())
                + "\n```",
            )
        )
    text = original
    for (start, end), replacement in sorted(replacements, reverse=True):
        text = text[:start] + replacement + text[end:]
    if row["id"] == "bass-ghost-note-lifeline":
        explanations = [
            "The demo leaves the muted strokes silent. Make these short, unpitched strokes on your bass; the app does not model or assess them.",
            "A demonstração deixa os golpes abafados em silêncio. Execute esses golpes curtos e sem altura no baixo; o app não os reproduz nem avalia.",
            "La demostración deja en silencio los golpes apagados. Haz esos golpes breves y sin altura en el bajo; la app no los reproduce ni evalúa.",
            "Die Demo lässt die gedämpften Anschläge stumm. Spiele diese kurzen Anschläge ohne Tonhöhe auf deinem Bass; die App bildet sie nicht ab und bewertet sie nicht.",
            "デモではミュート音の位置を無音にしています。短く音程のない打音は実際のベースで行います。アプリはこの奏法を再現・評価しません。",
            "示范将闷音位置留为空白。请在真实贝斯上弹奏这些短促、无音高的击弦；应用不会模拟或评估这一奏法。",
        ]
        for locale, explanation in zip(LOCALES, explanations):
            text = re.sub(
                r"(:::locale " + re.escape(locale) + r"\n[\s\S]*?)(:::checkpoint)",
                lambda m: m[1] + explanation + "\n\n" + m[2],
                text,
                count=1,
            )
    if row["id"] in ["guitar-target-echo-run", "guitar-third-shift-cipher"]:
        bodies = [
            "Loop Am7–D7–Gmaj7–Cmaj7, one four-beat bar per chord. The thirds are C–F#–B–E: B is the ninth of Am7, so it is an approach, never its third. Listen to the written example and name the target before each bar.\n\nPractise one bar at 48–60 BPM before returning to the written tempo. Move the hand between regions rather than keeping a wide span. Keep the target longer than its approach; stop and repeat one transition if the change loses the pulse.\n\nCreate another opening that reaches the same third, then play without the demonstration. A correct note on screen does not certify your instrumental execution.\n\n:::checkpoint Play four bars ending their cells on C, F#, B and E; describe one transition to revisit.",
            "Faça Am7–D7–Gmaj7–Cmaj7, um compasso de quatro tempos por acorde. As terças são C–F#–B–E: B é a nona de Am7, portanto aproximação, nunca sua terça. Ouça o exemplo e nomeie o alvo antes de cada compasso.\n\nPratique um compasso a 48–60 BPM antes de retomar o andamento indicado. Desloque a mão entre regiões sem sustentar abertura ampla. Deixe o alvo durar mais que a aproximação; pare e repita uma troca se perder o pulso.\n\nCrie outra abertura que alcance a mesma terça e toque sem demonstração. Acertar a nota na tela não certifica execução instrumental.\n\n:::checkpoint Toque quatro compassos cujas células terminem em C, F#, B e E; descreva uma troca a revisar.",
            "Haz Am7–D7–Gmaj7–Cmaj7, un compás de cuatro pulsos por acorde. Las terceras son C–F#–B–E: B es la novena de Am7, una aproximación y nunca su tercera. Escucha el ejemplo y nombra el objetivo antes de cada compás.\n\nPractica un compás a 48–60 BPM antes del tempo indicado. Desplaza la mano entre regiones sin sostener una abertura amplia. El objetivo dura más que la aproximación; para y repite un cambio si pierdes el pulso.\n\nCrea otra entrada que llegue a la misma tercera y toca sin demostración. Acertar en pantalla no certifica ejecución instrumental.\n\n:::checkpoint Toca cuatro compases cuyas células terminen en C, F#, B y E; describe un cambio que revisar.",
            "Spiele Am7–D7–Gmaj7–Cmaj7 mit einem Vierschlagtakt pro Akkord. Die Terzen sind C–F#–B–E; B ist die None von Am7, also eine Annäherung und nie dessen Terz. Höre das Beispiel und benenne das Ziel vor jedem Takt.\n\nÜbe einen Takt bei 48–60 BPM vor dem angegebenen Tempo. Verschiebe die Hand zwischen Lagen, ohne eine weite Spanne zu halten. Der Zielton klingt länger als seine Annäherung; verliere nicht den Puls beim Übergang.\n\nErfinde einen anderen Anfang zur selben Terz und spiele ohne Demo. Richtige Bildschirmtöne bestätigen kein Instrumentalspiel.\n\n:::checkpoint Spiele vier Takte mit C, F#, B und E als Zellenden; nenne einen Übergang zum Wiederholen.",
            "Am7–D7–Gmaj7–Cmaj7を各和音4拍の1小節で弾きます。3度はC–F#–B–Eです。BはAm7の9度なので近づく音であり、3度ではありません。例を聴き、小節の前に目標を名前で言います。\n\n指定テンポへ戻す前に1小節を48–60 BPMで練習します。広い開きを保持せず、音域間で手を移動します。目標音を前の音より長くし、拍を失ったら止めて移動だけを繰り返します。\n\n同じ3度へ向かう別の出だしを作り、デモなしで弾きます。画面上の正解は実演の認定ではありません。\n\n:::checkpoint 各セルがC、F#、B、Eで終わる4小節を弾き、再確認する移動を1つ説明します。",
            "Am7–D7–Gmaj7–Cmaj7每个和弦一小节四拍。三音是C–F#–B–E；B是Am7的九音，可以接近目标，但绝不是三音。听范例，每小节前说出目标音。\n\n先以48–60 BPM练一小节，再回到指定速度。换音区时移动手掌，不一直保持大跨度。目标音比接近音长；若转换丢拍，停下，只练转换。\n\n写另一个开头到达相同三音，然后不听示范弹奏。屏幕答对不认证实体乐器演奏。\n\n:::checkpoint 弹四小节，各单元结尾为C、F#、B、E，并描述一个需复习的转换。",
        ]
        if row["id"] == "guitar-third-shift-cipher":
            bodies = [
                "Use four slow bars over Am7–D7–Gmaj7–Cmaj7. Find the thirds C4, F#4, B3 and E4 on the written map. Each cell starts with a brief approach and holds its target for the remaining three and a half beats.\n\nB3 approaches C4; E4 approaches F#4; D4 returns to B3; G4 returns to E4. These are different intervals, so do not slide one unchanged shape to every chord. Practise each pair alone before linking them. If the hand arrives late, shorten the fragment and lower the tempo.\n\nFor your own answer, replace the approach note in one cell while keeping its third. Name that third and play once without playback.\n\n:::checkpoint Play the four pairs with targets C4, F#4, B3 and E4; explain why B is not the third of Am7.",
                "Use quatro compassos lentos sobre Am7–D7–Gmaj7–Cmaj7. Localize as terças C4, F#4, B3 e E4 no mapa escrito. Cada célula começa com aproximação breve e sustenta o alvo pelos três tempos e meio restantes.\n\nB3 aproxima C4; E4 aproxima F#4; D4 volta a B3; G4 volta a E4. Os intervalos diferem: não deslize um único desenho para todos os acordes. Pratique cada par antes de juntar. Se a mão atrasar, reduza o fragmento e o andamento.\n\nNa sua resposta, substitua a aproximação de uma célula preservando sua terça. Nomeie essa terça e toque sem reprodução.\n\n:::checkpoint Toque os quatro pares com alvos C4, F#4, B3 e E4; explique por que B não é a terça de Am7.",
                "Usa cuatro compases lentos sobre Am7–D7–Gmaj7–Cmaj7. Encuentra las terceras C4, F#4, B3 y E4 en el mapa. Cada célula empieza con una aproximación breve y mantiene el objetivo tres pulsos y medio.\n\nB3 aproxima C4; E4 aproxima F#4; D4 vuelve a B3; G4 vuelve a E4. Son intervalos distintos: no desplaces la misma figura para todos los acordes. Practica cada pareja antes de unir. Si la mano llega tarde, reduce fragmento y tempo.\n\nEn tu respuesta cambia una aproximación conservando su tercera. Nombra esa tercera y toca sin reproducción.\n\n:::checkpoint Toca las cuatro parejas con objetivos C4, F#4, B3 y E4; explica por qué B no es la tercera de Am7.",
                "Nutze vier langsame Takte über Am7–D7–Gmaj7–Cmaj7. Finde C4, F#4, B3 und E4 als Terzen auf der Karte. Jede Zelle beginnt kurz vor dem Ziel, das dreieinhalb Schläge klingt.\n\nB3 führt zu C4, E4 zu F#4, D4 zu B3 und G4 zu E4. Diese Intervalle unterscheiden sich: verschiebe keine unveränderte Form über alle Akkorde. Übe jedes Paar vor dem Verbinden. Kommt die Hand spät, verkürze den Ausschnitt und senke das Tempo.\n\nErsetze in deiner Antwort einen Annäherungston und behalte die Terz. Benenne sie und spiele ohne Wiedergabe.\n\n:::checkpoint Spiele die vier Paare bis C4, F#4, B3 und E4; erkläre, warum B nicht die Terz von Am7 ist.",
                "Am7–D7–Gmaj7–Cmaj7をゆっくり4小節で弾きます。マップで3度C4、F#4、B3、E4を探します。各セルは短い近接音で始め、目標を残り3拍半伸ばします。\n\nB3はC4、E4はF#4、D4はB3、G4はE4へ向かいます。音程は同一ではないため、同じ形を全和音へスライドしません。つなぐ前に各ペアを練習します。手が遅れたら短い部分でテンポを下げます。\n\n自分の答えでは1セルの近接音を変え、3度は保ちます。その3度を名前で言い、再生なしで弾きます。\n\n:::checkpoint C4、F#4、B3、E4へ向かう4ペアを弾き、BがAm7の3度ではない理由を説明します。",
                "在Am7–D7–Gmaj7–Cmaj7上慢弹四小节，在谱图中找到三音C4、F#4、B3、E4。每个单元以短接近音开始，目标持续余下三拍半。\n\nB3走向C4，E4走向F#4，D4回B3，G4回E4。这些音程不同，不要把同一手型滑到所有和弦上。先分别练各对再连接；若手迟到，缩短片段、放慢速度。\n\n自己的回答中替换一个接近音，保留三音。说出三音名字，不播放示范弹一次。\n\n:::checkpoint 弹四对音，目标为C4、F#4、B3、E4；解释B为何不是Am7的三音。",
            ]
        for locale, body in zip(LOCALES, bodies):
            title = header["title." + locale]
            text = re.sub(
                r"(:::\s*locale "
                + re.escape(locale)
                + r"\n)[\s\S]*?(?=:::locale |:::endlocalized)",
                lambda m: m[1] + "# " + title + "\n\n" + body + "\n\n",
                text,
                count=1,
            )
    if text != original:
        text = re.sub(
            r"^revision: (\d+)$",
            lambda m: f"revision: {int(m[1])+1}",
            text,
            count=1,
            flags=re.M,
        )
        if ACTIVE.exists():
            raise SystemExit(ACTIVE.read_text())
        guarded_write(file, original, text)
        changes.append(
            {
                "id": row["id"],
                "path": row["file"],
                "beforeSHA256": hashlib.sha256(original.encode()).hexdigest(),
                "afterSHA256": hashlib.sha256(text.encode()).hexdigest(),
                "revisionBefore": int(header["revision"]),
                "revisionAfter": int(header["revision"]) + 1,
                "musicReview": "source consistency checked; physical playthrough not represented as completed",
            }
        )
# A separate confirmed musical mismatch: the thirds line promised tonic but ended on degree 7.
for file in ROOT.glob(
    "v2/education/courses/**/scale-advanced-wide-interval-lines-thirds/lesson.md"
):
    old = subprocess.check_output(
        ["git", "show", "448975f:" + str(file.relative_to(ROOT))], cwd=ROOT, text=True
    )
    new = re.sub(r"^(degrees: .*\b7)\s*$", r"\1 1", old, flags=re.M)
    if new != old:
        new = re.sub(
            r"^revision: (\d+)$",
            lambda m: f"revision: {int(m[1])+1}",
            new,
            count=1,
            flags=re.M,
        )
        guarded_write(file, old, new)
        changes.append(
            {
                "id": "scale-advanced-wide-interval-lines-thirds",
                "path": str(file.relative_to(ROOT)),
                "reason": "append tonic to match checkpoint",
                "revisionIncremented": True,
                "beforeSHA256": hashlib.sha256(old.encode()).hexdigest(),
                "afterSHA256": hashlib.sha256(new.encode()).hexdigest(),
            }
        )
# Preserve exact legacy identities, hierarchy and sample access. No content moves.
required = []
free = {}
for catalog in sorted(ROOT.glob("v2/education/courses/*/catalog.json")):
    c = json.loads(
        subprocess.check_output(
            ["git", "show", "448975f:" + str(catalog.relative_to(ROOT))],
            cwd=ROOT,
            text=True,
        )
    )
    mutated = False
    free[c["course"]] = [l["id"] for l in c["sections"][0]["units"][0]["lessons"][:2]]
    for section in c["sections"]:
        for unit in section["units"]:
            for lesson in unit["lessons"]:
                if not lesson["optional"]:
                    after = lesson["instrument"] != "adaptive"
                    required.append(
                        {
                            "course": c["course"],
                            "section": section["id"],
                            "unit": unit["id"],
                            "id": lesson["id"],
                            "path": lesson["path"],
                            "instrument": lesson["instrument"],
                            "optionalBefore": False,
                            "optionalAfter": after,
                            "reason": (
                                "physical prerequisite in mixed-instrument archive"
                                if after
                                else "retained shared harmonic prerequisite"
                            ),
                        }
                    )
                    if after:
                        lesson["optional"] = True
                        mutated = True
    if mutated or any(
        x["path"].startswith(str(catalog.parent.relative_to(ROOT)) + "/")
        for x in changes
    ):
        c["revision"] += 1
        guarded_write(
            catalog,
            subprocess.check_output(
                ["git", "show", "448975f:" + str(catalog.relative_to(ROOT))],
                cwd=ROOT,
                text=True,
            ),
            json.dumps(c, ensure_ascii=False, indent=2) + "\n",
        )
(ROOT / "editorial/legacy-required-audit.json").write_text(
    json.dumps(
        {
            "schema": 1,
            "baselineCommit": "448975f",
            "priorResearchCommit": "b4757ad",
            "requiredBefore": 30,
            "requiredAfter": 6,
            "freeLessonIDs": free,
            "lessons": required,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
(ROOT / "editorial/evidence/legacy-repair.json").write_text(
    json.dumps(
        {
            "schema": 1,
            "method": "Targeted repair of actual Swift failures and known musical mismatch; URLs and IDs retained. No library regeneration.",
            "changes": changes,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
print(
    f"Repaired {len(changes)} lesson documents; audited {len(required)} required placements."
)
