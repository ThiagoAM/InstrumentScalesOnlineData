#!/usr/bin/env python3
"""Compare event intent, not prose interpretation. Swift receipts are the parser gate."""
import pathlib, subprocess, re, json, hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACTIVE = (
    pathlib.Path.home()
    / "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json"
)
if ACTIVE.exists():
    raise SystemExit(ACTIVE.read_text())


def fields(src):
    return dict(re.findall(r"^([^:\n]+):\s*(.*)$", src, re.M))


def midi(token):
    token = token.replace("♯", "#").replace("♭", "b")
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d+)", token)
    if not m:
        raise ValueError("Original musical meaning is not fully specified: " + token)
    n, a, o = m.groups()
    return (
        (int(o) + 1) * 12
        + dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)[n]
        + {"": 0, "#": 1, "b": -1}[a]
    )


def intent(kind, src):
    f = fields(src)
    tempo = float(re.search(r"\d+(?:\.\d+)?", f.get("tempo", "80"))[0])
    if kind == "notes":
        seq = f.get("sequence", "").replace("|", " ")
        seq = re.sub(
            r"\[([^]]+)\]",
            lambda m: "[" + ",".join(m[1].replace(",", " ").split()) + "]",
            seq,
        )
        if not seq:
            raise ValueError(
                "No original sequence; hand-role diagram requires editorial review"
            )
        result = []
        for token in seq.split():
            pitch, _, duration = token.partition("/")
            duration = float(duration or f.get("beat", 1))
            tones = (
                [] if pitch == "-" else list(map(midi, pitch.strip("[]").split(",")))
            )
            result.append([tones, duration])
        return dict(tempo=tempo, events=result)
    if kind == "fretboard":
        tuning = list(map(midi, f["tuning"].split()))
        seq = f.get("positions", "")
        if re.search(r"\d+:\d+ [A-G]", seq):
            raise ValueError(
                "Labelled map has no executable event grammar; claimed pitches require review"
            )
        if not seq:
            raise ValueError("No original positions field")
        tokens = re.findall(r"\[[^]]+\](?:@[^ ]+)?|[^\s]+", seq)
        result = []
        fingers = []
        for token in tokens:
            location, _, duration = token.partition("@")
            duration = float(duration or 1)
            tones = []
            eventfingers = []
            if location != "-":
                for position in location.strip("[]").split(","):
                    coordinate, _, finger = position.partition("/")
                    string, fret = map(int, coordinate.split(":"))
                    tones.append(tuning[len(tuning) - string] + fret)
                    eventfingers.append(finger)
            result.append([tones, duration])
            fingers.append(eventfingers)
        return dict(tempo=tempo, events=result, fingers=fingers)
    if kind in ["keyboard", "text"]:
        return dict(referenceText=src.strip())
    if kind == "scale":
        return {
            k: f[k] for k in ["root", "scale", "degrees", "tempo", "beat"] if k in f
        }
    return dict(raw=src.strip())


report = json.loads((ROOT / "editorial/evidence/legacy-repair.json").read_text())
for change in report["changes"]:
    file = ROOT / change["path"]
    old = subprocess.check_output(
        ["git", "show", "448975f:" + change["path"]], cwd=ROOT, text=True
    )
    new = file.read_text()
    before = re.findall(r"```([^\n]+)\n(.*?)```", old, re.S)
    after = re.findall(r"```([^\n]+)\n(.*?)```", new, re.S)
    proof = []
    for index, (oldkind, oldsource) in enumerate(before):
        if index >= len(after):
            proof.append(
                dict(block=index + 1, classification="musical", reason="removed block")
            )
            continue
        newkind, newsource = after[index]
        record = dict(
            block=index + 1,
            beforeType=oldkind,
            afterType=newkind,
            beforeSHA256=hashlib.sha256(oldsource.encode()).hexdigest(),
            afterSHA256=hashlib.sha256(newsource.encode()).hexdigest(),
        )
        try:
            a = intent(oldkind, oldsource)
            b = intent(newkind, newsource)
            same = a == b
            record.update(
                classification="syntactic" if same else "musical",
                eventIntentEqual=same,
                before=a,
                after=b,
            )
            if oldkind == "keyboard" and newkind == "text":
                record["reason"] = (
                    "Preserved verbatim hand-role/register diagram as an explicit text reference; no unsupported keyboard renderer is claimed."
                )
        except (ValueError, KeyError, AttributeError, IndexError) as error:
            record.update(
                classification="musical", eventIntentEqual=False, reason=str(error)
            )
        proof.append(record)
    oldprose = re.sub(r"```[^\n]+\n.*?```", "", old, flags=re.S)
    newprose = re.sub(r"```[^\n]+\n.*?```", "", new, flags=re.S)
    oldprose = re.sub(r"^revision: \d+$", "revision: _", oldprose, flags=re.M)
    newprose = re.sub(r"^revision: \d+$", "revision: _", newprose, flags=re.M)
    proseEqual = oldprose == newprose
    classification = (
        "syntactic"
        if proseEqual and all(p["classification"] == "syntactic" for p in proof)
        else "musical"
    )
    change.update(
        beforeSHA256=hashlib.sha256(old.encode()).hexdigest(),
        afterSHA256=hashlib.sha256(new.encode()).hexdigest(),
        classification=classification,
        blockProof=proof,
        proseEquivalent=proseEqual,
        physicalReview="pending" if classification == "musical" else "not-new-pattern",
        publicationReview="pending-independent-review",
        assessmentEffect="Legacy revision bump resets revision-scoped answers/checkpoints; existing completion identities remain unchanged.",
    )
report["classificationMethod"] = (
    "Syntactic means normalized source event intent (MIDI pitches, duration, tempo and fingering) is identical per block and prose is unchanged. It is not execution of the broken old grammar. Missing octave, missing timing, changed geometry, ghost timbre, or changed objective are musical and require explicit review."
)
report["summary"] = {
    kind: sum(c["classification"] == kind for c in report["changes"])
    for kind in ["syntactic", "musical"]
}
(ROOT / "editorial/evidence/legacy-repair.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
)
print(report["summary"])
