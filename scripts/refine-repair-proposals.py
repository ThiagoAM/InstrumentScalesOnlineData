#!/usr/bin/env python3
"""Directed response to the independent musical audit; pending proposals stay isolated."""
import pathlib, json, re, subprocess, hashlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACTIVE = (
    pathlib.Path.home()
    / "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json"
)
if ACTIVE.exists():
    raise SystemExit(ACTIVE.read_text())
reportFile = ROOT / "editorial/evidence/legacy-repair.json"
report = json.loads(reportFile.read_text())


def fields(src):
    return dict(re.findall(r"^([^:\n]+):\s*(.*)$", src, re.M))


def midi(note):
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d+)", note)
    n, a, o = m.groups()
    return (
        (int(o) + 1) * 12
        + dict(C=0, D=2, E=4, F=5, G=7, A=9, B=11)[n]
        + {"": 0, "#": 1, "b": -1}[a]
    )


def events(src):
    f = fields(src)
    result = []
    for token in f["sequence"].split():
        pitch, _, beat = token.partition("/")
        notes = [] if pitch == "-" else pitch.strip("[]").split(",")
        result.append((notes, float(beat or f.get("beat", 1))))
    return f, result


def location(pitch, tuning, preferred, used):
    choices = [
        (abs(fret - preferred), fret, len(tuning) - i)
        for i, open_note in enumerate(tuning)
        if 0 <= (fret := pitch - open_note) <= 24 and len(tuning) - i not in used
    ]
    if not choices:
        raise ValueError("No physical location for " + str(pitch))
    _, fret, string = min(choices)
    used.add(string)
    return f"{string}:{fret}"


R2_LOCALIZED = {
 'guitar-call-response-shift': [
 ('Play an eight-bar call and response in A minor pentatonic at 72 BPM. The question is A2–C3–D3–A2 in fifth position; the answer is E3–G3–C4–A3 in seventh position. These are different routes, not one shape moved two frets. All notes belong to A–C–D–E–G.',
  'In each two-bar cell, play the first three notes as eighths and hold the final A for two and a half beats to finish bar one. Count a whole silent second bar. Play question and answer twice: eight bars total. Move the hand during the counted silence, release unused strings and avoid holding a wide stretch.',
  'Start at 60 BPM if the shift blurs. Practise each cell alone, then link them without changing its rhythm. For your own answer, replace one middle note with another pentatonic tone and keep the final A.',
  'Play two question–answer rounds, eight bars total, with equal rhythm, counted rests and every answer ending on A3.'),
 ('Toque oito compassos de pergunta e resposta em A pentatônica menor a 72 BPM. A pergunta é A2–C3–D3–A2 na quinta posição; a resposta é E3–G3–C4–A3 na sétima. São rotas diferentes, não um desenho deslocado duas casas. Todas as notas pertencem a A–C–D–E–G.',
  'Em cada célula de dois compassos, toque as três primeiras notas como colcheias e sustente o A final por dois tempos e meio para completar o primeiro compasso. Conte um segundo compasso inteiro em silêncio. Faça pergunta e resposta duas vezes: oito compassos. Mova a mão na pausa contada, abafe cordas não usadas e não sustente uma abertura ampla.',
  'Comece em 60 BPM se a mudança ficar imprecisa. Pratique cada célula isolada e depois ligue-as sem mudar o ritmo. Na sua resposta, substitua uma nota do meio por outra da pentatônica e preserve o A final.',
  'Toque duas rodadas de pergunta e resposta, oito compassos, com ritmo igual, pausas contadas e cada resposta terminando em A3.'),
 ('Toca ocho compases de pregunta y respuesta en A pentatónica menor a 72 BPM. La pregunta A2–C3–D3–A2 usa quinta posición; la respuesta E3–G3–C4–A3 usa séptima. Son rutas distintas, no una figura desplazada dos trastes. Todas las notas pertenecen a A–C–D–E–G.',
  'En cada célula de dos compases, toca las tres primeras notas como corcheas y sostén el A final dos pulsos y medio para completar el primero. Cuenta un segundo compás entero de silencio. Repite pregunta y respuesta dos veces: ocho compases. Mueve la mano durante el silencio, apaga las cuerdas libres y no mantengas una abertura amplia.',
  'Empieza a 60 BPM si el cambio se borra. Practica cada célula aislada y después enlázalas sin cambiar el ritmo. En tu respuesta, sustituye una nota central por otra pentatónica y conserva el A final.',
  'Toca dos rondas de pregunta y respuesta, ocho compases, con ritmo igual, silencios contados y cada respuesta terminando en A3.'),
 ('Spiele acht Takte Frage und Antwort in A-Moll-Pentatonik bei 72 BPM. Die Frage A2–C3–D3–A2 liegt in fünfter, die Antwort E3–G3–C4–A3 in siebter Lage. Das sind verschiedene Wege, keine um zwei Bünde verschobene Form. Alle Töne gehören zu A–C–D–E–G.',
  'Spiele in jeder zweitaktigen Zelle die ersten drei Töne als Achtel und halte das letzte A zweieinhalb Schläge bis zum Ende des ersten Taktes. Zähle einen ganzen zweiten Takt Pause. Frage und Antwort zweimal ergeben acht Takte. Verschiebe die Hand in der gezählten Pause, dämpfe freie Saiten und halte keine weite Dehnung.',
  'Beginne bei 60 BPM, wenn der Wechsel unscharf wird. Übe jede Zelle allein und verbinde sie ohne Rhythmusänderung. Ersetze für deine Antwort einen mittleren Ton durch einen anderen Pentatonikton und behalte das letzte A.',
  'Spiele zwei Frage-Antwort-Runden, acht Takte, mit gleichem Rhythmus, gezählten Pausen und A3 am Ende jeder Antwort.'),
 ('72 BPMのAマイナーペンタトニックで8小節の問いと答えを弾きます。問いは5ポジションのA2–C3–D3–A2、答えは7ポジションのE3–G3–C4–A3です。同じ形を2フレット移すのではなく別の経路です。すべてA–C–D–E–Gの音です。',
  '2小節の各セルで最初の3音は8分音符、最後のAは2拍半伸ばして1小節目を終えます。2小節目は全休符として数えます。問答を2回行うと8小節です。数えた休符で手を移動し、使わない弦を止め、広い開きを保ちません。',
  '移動が不明瞭なら60 BPMから始めます。各セルを別々に練習して同じリズムでつなぎます。自分の答えでは中間の1音を別のペンタトニック音に替え、最後のAを保ちます。',
  '同じリズムと数えた休符で問答を2周、計8小節弾き、各答えをA3で終えます。'),
 ('以72 BPM用A小调五声音阶弹八小节问答。问句A2–C3–D3–A2在第五把位，答句E3–G3–C4–A3在第七把位。这是不同路径，不是同一指型移高两品。所有音均属于A–C–D–E–G。',
  '每个两小节单元的前三音为八分音符，最后的A保持两拍半，完成第一小节。第二小节整小节休止并数拍。问答重复两次，共八小节。在数拍的休止中移手、止住不用的弦，不持续撑开大跨度。',
  '若换把不清楚，从60 BPM开始。分别练每个单元，再以相同节奏连接。自创答句时只把中间一个音换成另一五声音阶音，保留末尾A。',
  '以相同节奏和数拍休止弹两轮问答，共八小节，每个答句都落在A3。')
 ],
}


R2_NEW_SCORES = {
 'piano-contrary-mode-lantern': {
   'notes': ['[D3,D5]/0.5 [E3,C5]/0.5 [F3,B4]/0.5 [G3,A4]/0.5 [A3,G4]/0.5 [B3,F4]/0.5 [A3,G4]/0.5 [G3,A4]/0.5 [F3,B4]/0.5 [E3,C5]/0.5 [D3,D5]/3 D4/0.5 E4/0.5 F4/0.5 G4/0.5 A4/0.5 B4/0.5 -/1 D4/4'],
   'text': {'hands':'LH D3-B3 ascending / RH D5-F4 descending, then reverse; RH answer alone','registers':'D3-D5','pattern':'2 bars paired contrary motion + 1 bar RH answer and rest + 1 bar D resolution'}},
 'piano-fourth-compass-drift': {
   'notes': ['D3 A2 D3 A2',
    '[D4,G4]/0.5 [E4,A4]/0.5 [F4,B4]/0.5 [G4,C5]/0.5 [D4,G4]/0.5 [E4,A4]/0.5 [F4,B4]/0.5 [G4,C5]/0.5',
    '[D4,G4]/0.5 F4/0.5 [E4,A4]/0.5 G4/0.5 [F4,B4]/0.5 A4/0.5 [G4,C5]/0.5 F4/0.5',
    '[D3,D4] [A2,F4] [D3,E4] [A2,D4] [D3,D4,G4]/0.5 [E4,A4]/0.5 [A2,F4,B4]/0.5 [G4,C5]/0.5 [D3,D4,G4]/0.5 [E4,A4]/0.5 [A2,F4,B4]/0.5 [G4,C5]/0.5 [D3,G3,D4] [E3,A3,A4] [F3,B3,D4] [G3,C4,A4] [D3,D4,G4] [A2,F4] [D3,D4,F4] [A2,D4,F4]']},
 'bass-pocket-magnet': {'notes':['D2 F2 - A2/0.5 F#1/0.5 G1 B1 - D2/0.5 B1/0.5 C2 E2 - G2/0.5 G#1/0.5 A1 C#2 - E2/0.5 C#2/0.5']},
 'bass-backbeat-detour-beacon': {'notes':['E2 B2 E2 -/0.5 F#1/0.25 G1/0.25 A1 E2 A1 -/0.5 C#2/0.25 D2/0.25 D2 A2 D2 -/0.5 C#2/0.25 D2/0.25 D2 A2 D2 -/0.5 C#2/0.25 D2/0.25']},
 'piano-sixth-handoff-switch': {'notes':['C4 D4 E4 F4 E4 F#4 G4 B4 G4 A4 B4 E5 F4 G4 A4 A4']},
 'piano-seventh-landing-weave': {'notes':['A2 B3/0.5 A3/0.5 G3/0.5 A3/0.5 G3 D3 B3/0.5 A3/0.5 G3/0.5 A3/0.5 C4 G2 B3/0.5 A3/0.5 G3/0.5 A3/0.5 F#3 C3 B3/0.5 A3/0.5 G3/0.5 A3/0.5 B3'],
   'text':{'range':'G2-C4','rightHand':'B3-A3-G3-A3 on beats 2-3; G3/C4/F#3/B3 on beat 4','leftHand':'A2/D3/G2/C3 on beat 1','sequence':'A2 | D3 | G2 | C3; RH targets G3 | C4 | F#3 | B3'}},
 'bass-fifth-pocket-lock': {'notes':['A2/0.5 E3 A2/0.5 -/2 D2/0.5 A2 D2/0.5 -/2 G2/0.5 D3 G2/0.5 -/2 C2/0.5 G2 C2/0.5 -/2']},
 'piano-seventh-landing-mirror': {'notes':['[G3,G4] [A3,A4] [B3,B4] [G3,G4] [C3,C4] [D3,D4] [F#3,F#4] [C3,C4] [F#3,F#4] [G3,G4] [A3,A4] [F#3,F#4] [B2,B3] [C3,C4] [D3,D4] [B2,B3]']},
 'bass-seventh-underlight-relay': {'notes':['A2 -/0.5 G2/0.5 A2 - D2 -/0.5 C3/0.5 D2 - G1 -/0.5 F#2/0.5 G1 - C2 -/0.5 B2/0.5 C2 -']},
 'piano-ninth-window-switch': {'notes':['A2/2 [A2,B4] [A2,C5] D3/2 [D3,E4] [D3,F#4] G2/2 [G2,A4] [G2,B4] C3/2 [C3,D4] [C3,E4]']},
}

# Unique musical tasks and exact reference interpretation, authored in every locale.
R2_NEW_TEXT = {
 'piano-contrary-mode-lantern': [
 ('At 76 BPM in D Dorian, play two bars of simultaneous contrary motion. LH rises D3–E3–F3–G3–A3–B3 while RH descends D5–C5–B4–A4–G4–F4; then both reverse. The final D3/D5 pair lasts three beats, completing eight beats.', 'RH alone answers D4–E4–F4–G4–A4–B4 in eighths. Count a full beat of silence, then hold D4 for four beats. The written reference is four bars: two contrary, one answer/rest, one resolution. Repeat it four times; B is the Dorian sixth.', 'Play four four-bar rounds with both voices moving oppositely, an answer ending on B4, one beat of silence and a clear D4 resolution.'),
 ('Em ré dórico a 76 BPM, toque dois compassos de movimento contrário simultâneo. A esquerda sobe D3–E3–F3–G3–A3–B3 enquanto a direita desce D5–C5–B4–A4–G4–F4; depois ambas invertem. O par D3/D5 final dura três tempos, completando oito.', 'Só a direita responde D4–E4–F4–G4–A4–B4 em colcheias. Conte um tempo inteiro de silêncio e sustente D4 por quatro tempos. A referência tem quatro compassos: dois contrários, resposta/pausa e resolução. Repita quatro vezes; B é a sexta dórica.', 'Toque quatro rodadas de quatro compassos, com vozes em sentidos opostos, resposta em B4, um tempo de silêncio e resolução clara em D4.'),
 ('En re dórico a 76 BPM, toca dos compases de movimiento contrario simultáneo. La izquierda sube D3–E3–F3–G3–A3–B3 mientras la derecha baja D5–C5–B4–A4–G4–F4; luego invierten. El par final D3/D5 dura tres pulsos y completa ocho.', 'La derecha sola responde D4–E4–F4–G4–A4–B4 en corcheas. Cuenta un pulso entero de silencio y sostiene D4 cuatro pulsos. La referencia tiene cuatro compases: dos contrarios, respuesta/silencio y resolución. Repite cuatro veces; B es la sexta dórica.', 'Toca cuatro rondas de cuatro compases con voces opuestas, respuesta en B4, un pulso de silencio y resolución clara en D4.'),
 ('Spiele in D-Dorisch bei 76 BPM zwei Takte gleichzeitige Gegenbewegung. Links steigt D3–E3–F3–G3–A3–B3, rechts fällt D5–C5–B4–A4–G4–F4; dann kehren beide um. Das letzte D3/D5-Paar dauert drei Schläge und schließt acht Schläge ab. Internationale Notennamen: B bedeutet H.', 'Rechts allein antwortet D4–E4–F4–G4–A4–B4 in Achteln. Zähle einen ganzen Schlag Pause und halte D4 vier Schläge. Die Vorlage hat vier Takte: zwei gegenläufige, Antwort/Pause und Auflösung. Wiederhole viermal; B ist die dorische Sexte.', 'Spiele vier viertaktige Runden mit Gegenbewegung, Antwort auf B4, einer Schlagpause und klarer D4-Auflösung.'),
 ('76 BPMのDドリアンで2小節の同時反行を弾きます。左手はD3–E3–F3–G3–A3–B3へ上がり、右手はD5–C5–B4–A4–G4–F4へ下がって両手が戻ります。最後のD3/D5は3拍で、合計8拍になります。', '右手だけでD4–E4–F4–G4–A4–B4を8分音符で答えます。1拍休み、D4を4拍伸ばします。例は反行2小節、答えと休符1小節、解決1小節の計4小節です。4回繰り返し、ドリアンの6度Bを聴きます。', '反行、B4で終わる答え、1拍休符、D4への解決を含む4小節を4回弾きます。'),
 ('以76 BPM在D多利亚调式弹两小节同时反向进行。左手上行D3–E3–F3–G3–A3–B3，右手下行D5–C5–B4–A4–G4–F4，再同时反转。末尾D3/D5保持三拍，完成八拍。', '右手单独以八分音符回答D4–E4–F4–G4–A4–B4。休止整整一拍，再把D4保持四拍。范例共四小节：反行两小节，回答和休止一小节，解决一小节。重复四次，听清多利亚六音B。', '弹四轮四小节，含双声部反行、B4结尾、一拍休止和清楚的D4解决。')],
 'piano-fourth-compass-drift': [
 ('At 80 BPM in D Dorian, practise D–G, E–A, F–B and G–C. These are diatonic fourths; F–B is augmented. Play the written RH pairs twice in eighths for one bar. Separately tap LH D3–A2–D3–A2 in quarters; the rebound cell alternates pairs and single notes in eighths.', 'The boss reference has exactly four bars: paired quarter-note voices; RH eighth-note fourths with LH quarter attacks; LH fourths with RH D4/A4 quarter pulse; then the original roles with D4/F4 in the final two quarter chords. Release the LH between its short attacks. Follow the written dyads, rather than turning every fourth into a perfect fourth.', 'Play the sixteen-beat boss with its quarter/eighth subdivisions, clear hand-role change and final RH D4/F4.'),
 ('Em ré dórico a 80 BPM, pratique D–G, E–A, F–B e G–C. São quartas diatônicas; F–B é aumentada. Toque os pares escritos da direita duas vezes em colcheias para um compasso. Separadamente, faça D3–A2–D3–A2 na esquerda em semínimas; a célula de retorno alterna pares e notas em colcheias.', 'A referência final tem quatro compassos: vozes juntas em semínimas; quartas na direita em colcheias com ataques da esquerda nos tempos; quartas na esquerda e pulso D4/A4 à direita; depois os papéis originais, com D4/F4 nos dois últimos acordes de um tempo. Solte a esquerda entre seus ataques curtos. Respeite os pares escritos, sem transformar toda quarta em justa.', 'Toque os dezesseis tempos finais com semínimas/colcheias, troca clara de mãos e D4/F4 à direita no final.'),
 ('En re dórico a 80 BPM, practica D–G, E–A, F–B y G–C. Son cuartas diatónicas; F–B es aumentada. Toca dos veces los pares derechos escritos en corcheas para un compás. Por separado, toca D3–A2–D3–A2 a negras con la izquierda; la célula de retorno alterna pares y notas en corcheas.', 'La referencia final tiene cuatro compases: voces juntas a negras; cuartas derechas en corcheas con ataques izquierdos en cada pulso; cuartas izquierdas y pulso D4/A4 derecho; después los roles originales, con D4/F4 en los dos últimos acordes de un pulso. Suelta la izquierda entre ataques cortos. Conserva los pares escritos, sin convertir todas las cuartas en justas.', 'Toca los dieciséis pulsos con negras/corcheas, cambio claro de roles y D4/F4 derecho al final.'),
 ('Übe bei 80 BPM in D-Dorisch D–G, E–A, F–B und G–C. Das sind diatonische Quarten; F–B ist übermäßig. Spiele die rechten Paare zweimal in Achteln für einen Takt. Übe links D3–A2–D3–A2 getrennt in Vierteln; die Rückkehrzelle wechselt Paare und Einzeltöne in Achteln. Internationale Namen: B bedeutet H.', 'Die Boss-Vorlage hat vier Takte: gemeinsame Viertelstimmen; rechte Achtelquarten mit linken Viertelanschlägen; linke Quarten mit rechtem D4/A4-Viertelpuls; dann die ursprünglichen Rollen mit D4/F4 in den letzten zwei Viertelakkorden. Löse links zwischen kurzen Anschlägen. Halte dich an die notierten Paare, statt jede Quarte rein zu machen.', 'Spiele sechzehn Schläge mit Vierteln/Achteln, klarem Rollenwechsel und D4/F4 rechts am Schluss.'),
 ('80 BPMのDドリアンでD–G、E–A、F–B、G–Cを練習します。調式内の4度で、F–Bは増4度です。右手のペアを8分音符で2回弾くと1小節です。左手D3–A2–D3–A2は別に4分音符で練習し、戻りのセルはペアと単音を8分音符で交互に弾きます。', '最終例は4小節です。両声部の4分音符、右手の8分音符4度と左手の拍のアタック、左手の4度と右手D4/A4の4分音符、元の役割へ戻って最後の2つの4分和音でD4/F4です。左手の短いアタック間は離します。書かれた音程をすべて完全4度に変えません。', '16拍を正しい4分・8分音符で弾き、手の役割を替えて右手D4/F4で終えます。'),
 ('以80 BPM在D多利亚练D–G、E–A、F–B、G–C。它们是调式内四度，F–B为增四度。右手所写双音以八分音符弹两遍为一小节。左手D3–A2–D3–A2另练四分音符；回弹单元以八分音符交替双音和单音。', '终局范例恰好四小节：双声部四分音符；右手八分音符四度与左手拍上起音；左手四度与右手D4/A4四分脉冲；恢复原角色，最后两个四分和弦为D4/F4。左手短音之间松开。按所写双音，不要把所有四度改成纯四度。', '弹准十六拍的四分与八分细分，清楚换手，并以右手D4/F4结束。')],
 'bass-pocket-magnet': [
 ('At 88 BPM over Dm7–G7–Cmaj7–A7, each bar has root on 1, third on 2, a full rest on 3, fifth on 4 and a chromatic eighth pickup on the and of 4.', 'The pickups F#1, B1, G#1 and C#2 approach the NEXT roots G1, C2, A1 and D2 from a semitone below. Each five-event cell sums to four beats; the four bars total sixteen. When moving a root up an octave, also move its approach into the new octave.', 'Play four bars with beat-1 roots, full beat-3 rests and half-step pickups landing on the next roots.'),
 ('A 88 BPM sobre Dm7–G7–Cmaj7–A7, cada compasso tem fundamental no 1, terça no 2, pausa inteira no 3, quinta no 4 e preparação cromática em colcheia no contratempo do 4.', 'F#1, B1, G#1 e C#2 preparam as PRÓXIMAS fundamentais G1, C2, A1 e D2 por um semitom abaixo. Cada célula de cinco eventos soma quatro tempos; o ciclo tem dezesseis. Ao subir a fundamental uma oitava, leve sua preparação à nova oitava também.', 'Toque quatro compassos com fundamentais no 1, pausas inteiras no 3 e preparações por semitom para as próximas fundamentais.'),
 ('A 88 BPM sobre Dm7–G7–Cmaj7–A7, cada compás tiene raíz en 1, tercera en 2, silencio completo en 3, quinta en 4 y entrada cromática de corchea en el contratiempo de 4.', 'F#1, B1, G#1 y C#2 preparan las SIGUIENTES raíces G1, C2, A1 y D2 desde un semitono abajo. Cada célula de cinco eventos suma cuatro pulsos; el ciclo suma dieciséis. Si subes una raíz de octava, sube también su aproximación.', 'Toca cuatro compases con raíces en 1, silencios completos en 3 y aproximaciones de semitono a las siguientes raíces.'),
 ('Bei 88 BPM über Dm7–G7–Cmaj7–A7 hat jeder Takt Grundton auf 1, Terz auf 2, ganze Pause auf 3, Quinte auf 4 und einen chromatischen Achtelauftakt auf der Und von 4.', 'F#1, B1, G#1 und C#2 führen einen Halbton unter die NÄCHSTEN Grundtöne G1, C2, A1 und D2. Fünf Ereignisse ergeben vier Schläge, der Zyklus sechzehn. Verschiebst du einen Grundton um eine Oktave, verschiebe auch seinen Annäherungston. Internationale Namen: B bedeutet H.', 'Spiele vier Takte mit Grundtönen auf 1, ganzen Pausen auf 3 und Halbtonauftakten zu den nächsten Grundtönen.'),
 ('88 BPMでDm7–G7–Cmaj7–A7を弾き、各小節で1拍目ルート、2拍目3度、3拍目全休符、4拍目5度、4拍目裏に半音下から8分音符で入ります。', 'F#1、B1、G#1、C#2は次のルートG1、C2、A1、D2の半音下です。5イベントで4拍、4小節で16拍です。ルートを1オクターブ上げる時はアプローチ音も同じ音域に移します。', '1拍目のルート、3拍目の全休符、次のルートへ半音下から入る4小節を弾きます。'),
 ('以88 BPM弹Dm7–G7–Cmaj7–A7，每小节第一拍根音，第二拍三音，第三拍整拍休止，第四拍五音，第四拍后半拍用低半音的八分音符引入。', 'F#1、B1、G#1、C#2从低半音接向下个根音G1、C2、A1、D2。每组五事件共四拍，四小节十六拍。根音升八度时，接近音也移到新八度。', '弹四小节，保持第一拍根音、第三拍整拍休止及半音接近下个根音。')],
 'bass-backbeat-detour-beacon': [
 ('At 92 BPM over Em7–A7–Dmaj7–Dmaj7, put root on beats 1 and 3 and fifth on 2. Leave the first half of beat 4 silent. The two detour notes are SIXTEENTHS on 4-and and its last subdivision, not two whole beats.', 'Use F#1–G1 before A1, then C#2–D2 before D2, D2 and the loop-return E2. Each cell is 1+1+1+0.5+0.25+0.25 beats. Hear the two quick attacks before the next downbeat. A variation may mute beat 3, but restore it for the checkpoint.', 'Play four four-beat bars with roots on 1/3, fifth on 2, two sixteenth pickups and the next root on 1.'),
 ('A 92 BPM sobre Em7–A7–Dmaj7–Dmaj7, toque fundamental nos tempos 1 e 3 e quinta no 2. Deixe a primeira metade do 4 silenciosa. As duas notas do desvio são SEMICOLCHEIAS no contratempo do 4 e na última subdivisão, não dois tempos inteiros.', 'Use F#1–G1 antes de A1 e C#2–D2 antes de D2, D2 e E2 na volta do ciclo. Cada célula soma 1+1+1+0,5+0,25+0,25 tempos. Ouça os dois ataques rápidos antes do próximo tempo 1. Pode abafar o 3 numa variação, mas restaure-o na verificação.', 'Toque quatro compassos de quatro tempos com fundamentais no 1/3, quinta no 2, duas semicolcheias de preparação e próxima fundamental no 1.'),
 ('A 92 BPM sobre Em7–A7–Dmaj7–Dmaj7, toca raíz en 1 y 3 y quinta en 2. Deja silenciosa la primera mitad de 4. El desvío usa dos SEMICORCHEAS en el contratiempo de 4 y su última subdivisión, no dos pulsos enteros.', 'Usa F#1–G1 antes de A1 y C#2–D2 antes de D2, D2 y E2 al volver al ciclo. Cada célula suma 1+1+1+0,5+0,25+0,25 pulsos. Oye los dos ataques rápidos antes del siguiente 1. Puedes omitir el 3 como variante, pero recupéralo para comprobar.', 'Toca cuatro compases de cuatro pulsos con raíces en 1/3, quinta en 2, dos semicorcheas de entrada y la siguiente raíz en 1.'),
 ('Spiele bei 92 BPM über Em7–A7–Dmaj7–Dmaj7 Grundtöne auf 1 und 3, die Quinte auf 2. Die erste Hälfte von 4 bleibt still. Der Umweg sind zwei SECHZEHNTEL auf der Und von 4 und ihrer letzten Unterteilung, keine zwei ganzen Schläge.', 'F#1–G1 führt zu A1; C#2–D2 führt danach zu D2, D2 und E2 beim Loopanfang. Jede Zelle dauert 1+1+1+0,5+0,25+0,25 Schläge. Höre zwei kurze Anschläge vor der nächsten Eins. Lasse 3 nur als Variante aus, stelle sie für die Prüfung wieder her. Internationale Namen: B bedeutet H.', 'Spiele vier Vierschlagtakte mit Grundtönen auf 1/3, Quinte auf 2, zwei Sechzehntelauftakten und dem nächsten Grundton auf 1.'),
 ('92 BPMのEm7–A7–Dmaj7–Dmaj7で1・3拍目にルート、2拍目に5度を置き、4拍目の前半を休みます。寄り道の2音は4拍目の裏と最後の細分に置く16分音符で、2拍分ではありません。', 'F#1–G1からA1へ、C#2–D2からD2、D2、ループ先頭のE2へ進みます。各セルは1+1+1+0.5+0.25+0.25拍です。次の1拍目前の2回の短いアタックを聴きます。3拍目を省くのは変奏だけで、確認時には戻します。', 'ルート1・3、5度2、16分音符2音の先取り、次の1拍目のルートを4小節で弾きます。'),
 ('以92 BPM弹Em7–A7–Dmaj7–Dmaj7，第一和第三拍根音，第二拍五音，第四拍前半休止。绕行两音为第四拍后半及最后细分的十六分音符，不是两个整拍。', 'F#1–G1接A1，再用C#2–D2接D2、D2及循环首音E2。每单元为1+1+1+0.5+0.25+0.25拍。听清下个第一拍前两次短起音。省略第三拍仅作变奏，检查时恢复。', '弹四个四拍小节，根音在1/3、五音在2、两音十六分引入及下个根音在1。')],
 'piano-sixth-handoff-switch': [
 ('At 70 BPM over Am7–D7–Gmaj7–Cmaj7, alternate RH/LH/RH/LH, four quarter notes per bar. The cells are C4–D4–E4–F4, E4–F#4–G4–B4, G4–A4–B4–E5 and F4–G4–A4–A4.', 'F, B, E and A are the sixth-color landings. The second cell deliberately skips A: G4 moves directly to B4. Release the old hand before the next enters. Reverse hands on another pass; keep the same notes and sixteen-beat length.', 'Play a four-bar loop with clean hand switches, four notes per bar and landings F4, B4, E5 and A4.'),
 ('A 70 BPM sobre Am7–D7–Gmaj7–Cmaj7, alterne direita/esquerda/direita/esquerda, quatro semínimas por compasso. As células são C4–D4–E4–F4, E4–F#4–G4–B4, G4–A4–B4–E5 e F4–G4–A4–A4.', 'F, B, E e A são chegadas de sexta. A segunda célula omite A de propósito: G4 vai diretamente a B4. Solte a mão anterior antes da próxima entrar. Inverta as mãos em outra passagem, mantendo notas e dezesseis tempos.', 'Toque um ciclo de quatro compassos com trocas limpas de mão, quatro notas por compasso e chegadas em F4, B4, E5 e A4.'),
 ('A 70 BPM sobre Am7–D7–Gmaj7–Cmaj7, alterna derecha/izquierda/derecha/izquierda con cuatro negras por compás. Las células son C4–D4–E4–F4, E4–F#4–G4–B4, G4–A4–B4–E5 y F4–G4–A4–A4.', 'F, B, E y A son llegadas de sexta. La segunda célula omite A a propósito: G4 va directamente a B4. Suelta la mano anterior antes de entrar la siguiente. Invierte las manos en otra pasada y conserva notas y dieciséis pulsos.', 'Toca cuatro compases con cambios limpios de mano, cuatro notas por compás y finales F4, B4, E5 y A4.'),
 ('Wechsle bei 70 BPM über Am7–D7–Gmaj7–Cmaj7 rechts/links/rechts/links mit vier Vierteln pro Takt. Die Zellen sind C4–D4–E4–F4, E4–F#4–G4–B4, G4–A4–B4–E5 und F4–G4–A4–A4. Internationale Namen: B bedeutet H.', 'F, B, E und A sind die Sextfarben am Ende. Die zweite Zelle lässt A absichtlich aus: G4 geht direkt zu B4. Löse die alte Hand vor dem nächsten Einsatz. Kehre die Hände beim nächsten Durchgang um, behalte Töne und sechzehn Schläge.', 'Spiele vier Takte mit sauberem Handwechsel, vier Tönen pro Takt und F4, B4, E5, A4 am Ende.'),
 ('70 BPMのAm7–D7–Gmaj7–Cmaj7で右・左・右・左を交替し、各小節4つの4分音符です。セルはC4–D4–E4–F4、E4–F#4–G4–B4、G4–A4–B4–E5、F4–G4–A4–A4です。', 'F、B、E、Aが6度の着地点です。2つ目はAを省き、G4からB4へ直接進みます。次の手が入る前に前の手を離します。別の通しでは手を逆にして音と16拍を保ちます。', '手を明瞭に交替し、各小節4音、F4・B4・E5・A4で終わる4小節を弾きます。'),
 ('以70 BPM弹Am7–D7–Gmaj7–Cmaj7，按右/左/右/左交替，每小节四个四分音符。单元为C4–D4–E4–F4、E4–F#4–G4–B4、G4–A4–B4–E5、F4–G4–A4–A4。', 'F、B、E、A为六音着落。第二单元有意省A，G4直接到B4。下一只手进入前松开上一只手。另一遍交换手，但保留音符和十六拍。', '弹四小节，清楚交接手，每小节四音，落在F4、B4、E5、A4。')],
}
R2_NEW_TEXT.update({
 'piano-seventh-landing-weave': [
 ('At 72 BPM over Am7–D7–Gmaj7–Cmaj7, LH plays A2, D3, G2 and C3 on beat 1. RH plays B3–A3–G3–A3 as four eighths across beats 2–3, then holds the current seventh for the whole beat 4: G3, C4, F#3, B3.', 'Release that seventh when the next LH root begins. Each cell is one root beat, two beats of eighths and one seventh beat: four beats, sixteen per loop. On a later pass reverse the middle fragment, retaining the seventh on 4. The written reference models the base loop; a final two-beat G/B coda is an optional addition after it.', 'Play a four-bar loop with sevenths G3, C4, F#3 and B3 held through beat 4 and released into the next roots.'),
 ('A 72 BPM sobre Am7–D7–Gmaj7–Cmaj7, a esquerda toca A2, D3, G2 e C3 no tempo 1. A direita toca B3–A3–G3–A3 como quatro colcheias nos tempos 2–3, depois sustenta a sétima por todo o tempo 4: G3, C4, F#3, B3.', 'Solte a sétima quando entrar a próxima fundamental da esquerda. A célula soma um tempo de fundamental, dois de colcheias e um de sétima: quatro tempos, dezesseis no ciclo. Depois inverta o fragmento central, preservando a sétima no 4. A referência mostra o ciclo básico; a coda G/B de dois tempos é uma adição opcional depois dele.', 'Toque quatro compassos com G3, C4, F#3 e B3 sustentadas no tempo 4 e soltas na entrada das próximas fundamentais.'),
 ('A 72 BPM sobre Am7–D7–Gmaj7–Cmaj7, la izquierda toca A2, D3, G2 y C3 en 1. La derecha toca B3–A3–G3–A3 en cuatro corcheas durante 2–3 y sostiene la séptima todo el pulso 4: G3, C4, F#3, B3.', 'Suelta la séptima al entrar la siguiente raíz izquierda. Cada célula suma un pulso de raíz, dos de corcheas y uno de séptima: cuatro, dieciséis por ciclo. En otra pasada invierte el fragmento central y conserva la séptima en 4. La referencia es el ciclo básico; la coda G/B de dos pulsos es una adición opcional posterior.', 'Toca cuatro compases con G3, C4, F#3 y B3 sostenidas en 4 y soltadas al entrar las siguientes raíces.'),
 ('Spiele bei 72 BPM über Am7–D7–Gmaj7–Cmaj7 links A2, D3, G2, C3 auf 1. Rechts spielt B3–A3–G3–A3 als vier Achtel auf 2–3 und hält auf 4 die jeweilige Septime G3, C4, F#3, B3. Internationale Namen: B bedeutet H.', 'Löse die Septime beim nächsten linken Grundton. Ein Grundtonschlag, zwei Achtelschläge und ein Septimenschlag ergeben vier, ein Loop sechzehn Schläge. Kehre später das mittlere Fragment um, behalte die Septime auf 4. Die Vorlage ist der Grundloop; eine zweischlägige G/B-Coda ist erst danach eine optionale Ergänzung.', 'Spiele vier Takte mit G3, C4, F#3 und B3 durch Schlag 4 und löse sie beim nächsten Grundton.'),
 ('72 BPMのAm7–D7–Gmaj7–Cmaj7で左手A2、D3、G2、C3を1拍目に置きます。右手B3–A3–G3–A3を2～3拍目の4つの8分音符で弾き、4拍目全体に7度G3、C4、F#3、B3を伸ばします。', '次の左手ルートで7度を離します。ルート1拍、8分音符2拍、7度1拍で各小節4拍、全体16拍です。別の通しでは中間を逆にし、7度は4拍目に残します。例は基本ループで、2拍のG/B終結はその後の任意追加です。', 'G3、C4、F#3、B3を4拍目まで保ち、次のルートで離す4小節を弾きます。'),
 ('以72 BPM弹Am7–D7–Gmaj7–Cmaj7，左手A2、D3、G2、C3在第一拍。右手B3–A3–G3–A3为第二至第三拍的四个八分音符，再把七音G3、C4、F#3、B3保持整个第四拍。', '下个左手根音进入时放开七音。一拍根音、两拍八分音符、一拍七音共四拍，循环十六拍。另一遍可倒转中间单元，但七音仍在第四拍。范例为基本循环；两拍G/B尾声仅作之后的可选添加。', '弹四小节，把G3、C4、F#3、B3保持整个第四拍，在下个根音进入时放开。')],
 'bass-fifth-pocket-lock': [
 ('At 84 BPM over Am7–D7–Gmaj7–Cmaj7, put the root on 1 for half a beat, fifth on 1-and for one beat, return root on 2-and for half a beat, then rest through beats 3–4.', 'Use A2–E3–A2, D2–A2–D2, G2–D3–G2 and C2–G2–C2. Each cell sums to four beats. A muted first root is a separate variation; restore every beat-1 root for the final eight-loop checkpoint. Keep unused strings quiet during the two-beat rest.', 'Play eight four-bar loops with roots on 1, fifths on 1-and, return roots on 2-and and full rests on 3–4.'),
 ('A 84 BPM sobre Am7–D7–Gmaj7–Cmaj7, toque a fundamental no 1 por meio tempo, quinta no contratempo do 1 por um tempo, fundamental no contratempo do 2 por meio tempo e pausa nos tempos 3–4.', 'Use A2–E3–A2, D2–A2–D2, G2–D3–G2 e C2–G2–C2. Cada célula soma quatro tempos. Abafar a primeira fundamental é uma variação separada; restaure todas no tempo 1 para a verificação final de oito ciclos. Abafe cordas não usadas durante os dois tempos de pausa.', 'Toque oito ciclos de quatro compassos com fundamentais no 1, quintas no contratempo do 1, retorno no contratempo do 2 e pausas inteiras em 3–4.'),
 ('A 84 BPM sobre Am7–D7–Gmaj7–Cmaj7, toca raíz en 1 durante medio pulso, quinta en el contratiempo de 1 durante uno, raíz en el contratiempo de 2 durante medio y silencio en 3–4.', 'Usa A2–E3–A2, D2–A2–D2, G2–D3–G2 y C2–G2–C2. Cada célula suma cuatro pulsos. Omitir la primera raíz es una variante aparte; recupérala en cada 1 para la comprobación final de ocho ciclos. Apaga cuerdas libres durante los dos pulsos de silencio.', 'Toca ocho ciclos de cuatro compases con raíces en 1, quintas en el contratiempo de 1, retorno en el de 2 y silencios completos en 3–4.'),
 ('Spiele bei 84 BPM über Am7–D7–Gmaj7–Cmaj7 den Grundton auf 1 einen halben Schlag, die Quinte auf 1-und einen Schlag, den Grundton auf 2-und einen halben und Pause auf 3–4.', 'Nutze A2–E3–A2, D2–A2–D2, G2–D3–G2 und C2–G2–C2. Jede Zelle dauert vier Schläge. Ein ausgelassener erster Grundton ist nur eine getrennte Variante; stelle jede Eins für die abschließenden acht Loops wieder her. Dämpfe freie Saiten in den zwei Pausenschlägen.', 'Spiele acht Viertaktloops mit Grundtönen auf 1, Quinten auf 1-und, Rückkehr auf 2-und und ganzen Pausen auf 3–4.'),
 ('84 BPMのAm7–D7–Gmaj7–Cmaj7でルートを1拍目に半拍、5度を1拍目裏に1拍、戻るルートを2拍目裏に半拍、3～4拍目に休符を置きます。', 'A2–E3–A2、D2–A2–D2、G2–D3–G2、C2–G2–C2を使います。各セル4拍です。最初のルートを省くのは別の変奏で、最後の8ループ確認では各1拍目に戻します。2拍の休符中に不要な弦を止めます。', 'ルート1、5度1拍目裏、戻り2拍目裏、3～4拍目休符を保ち、4小節を8周弾きます。'),
 ('以84 BPM弹Am7–D7–Gmaj7–Cmaj7，根音在第一拍保持半拍，五音在第一拍后半保持一拍，根音在第二拍后半保持半拍，第三至第四拍休止。', '用A2–E3–A2、D2–A2–D2、G2–D3–G2、C2–G2–C2。各单元四拍。省略首个根音只作独立变奏；最终八轮检查恢复每小节第一拍根音。两拍休止中止住不用的弦。', '弹八轮四小节，根音在1、五音在1的后半、返回根音在2的后半，3～4整拍休止。')],
 'piano-seventh-landing-mirror': [
 ('At 66 BPM over Am7–D7–Gmaj7–Cmaj7, RH plays G4–A4–B4–G4, C4–D4–F#4–C4, F#4–G4–A4–F#4 and B3–C4–D4–B3 in quarters. Every last note is its chord seventh.', 'LH doubles each RH note exactly one octave lower, simultaneously: this is octave parallel motion, not contrary motion. The written reference has four bars, ending on G, C, F# and B. For a variation count one silent pickup beat before the whole loop, or try one hand at a time; do not change the four-beat bars.', 'Play five four-bar loops with simultaneous octave pairs and seventh landings G4, C4, F#4 and B3 on beat 4.'),
 ('A 66 BPM sobre Am7–D7–Gmaj7–Cmaj7, a direita toca G4–A4–B4–G4, C4–D4–F#4–C4, F#4–G4–A4–F#4 e B3–C4–D4–B3 em semínimas. Cada última nota é a sétima do acorde.', 'A esquerda dobra simultaneamente cada nota uma oitava abaixo: é movimento paralelo de oitavas, não contrário. A referência tem quatro compassos, terminando em G, C, F# e B. Numa variação, conte um tempo de preparação silencioso antes do ciclo inteiro ou experimente uma mão por vez, sem mudar os compassos de quatro tempos.', 'Toque cinco ciclos de quatro compassos com pares simultâneos de oitava e sétimas G4, C4, F#4 e B3 no tempo 4.'),
 ('A 66 BPM sobre Am7–D7–Gmaj7–Cmaj7, la derecha toca G4–A4–B4–G4, C4–D4–F#4–C4, F#4–G4–A4–F#4 y B3–C4–D4–B3 en negras. Cada última nota es la séptima del acorde.', 'La izquierda dobla simultáneamente cada nota una octava abajo: es movimiento paralelo, no contrario. La referencia tiene cuatro compases y termina en G, C, F# y B. Como variante cuenta un pulso de preparación silencioso antes del ciclo entero o prueba una mano sola; conserva los compases de cuatro pulsos.', 'Toca cinco ciclos de cuatro compases con octavas simultáneas y séptimas G4, C4, F#4 y B3 en el pulso 4.'),
 ('Spiele bei 66 BPM über Am7–D7–Gmaj7–Cmaj7 rechts G4–A4–B4–G4, C4–D4–F#4–C4, F#4–G4–A4–F#4, B3–C4–D4–B3 in Vierteln. Jeder letzte Ton ist die Akkordseptime. Internationale Namen: B bedeutet H.', 'Links verdoppelt jeden rechten Ton gleichzeitig eine Oktave tiefer: parallele Oktaven, keine Gegenbewegung. Die vier Takte enden auf G, C, F# und B. Zähle als Variante einen stillen Vorbereitungsschlag vor dem ganzen Loop oder übe eine Hand allein; behalte die Vierschlagtakte.', 'Spiele fünf Viertaktloops mit gleichzeitigen Oktavpaaren und G4, C4, F#4, B3 auf Schlag 4.'),
 ('66 BPMのAm7–D7–Gmaj7–Cmaj7で右手G4–A4–B4–G4、C4–D4–F#4–C4、F#4–G4–A4–F#4、B3–C4–D4–B3を4分音符で弾きます。各最後の音が和音の7度です。', '左手は同時に各右手音を1オクターブ下で重ねます。これは平行オクターブで反行ではありません。例はG、C、F#、Bで終わる4小節です。変奏ではループ全体の前に1拍の無音準備を数えるか片手ずつ練習し、4拍の小節は変えません。', '同時のオクターブと4拍目のG4、C4、F#4、B3を保ち、4小節を5周弾きます。'),
 ('以66 BPM弹Am7–D7–Gmaj7–Cmaj7，右手为G4–A4–B4–G4、C4–D4–F#4–C4、F#4–G4–A4–F#4、B3–C4–D4–B3，均为四分音符。各末音为和弦七音。', '左手同时在低一八度重叠每个右手音：是平行八度，不是反向进行。范例四小节落在G、C、F#、B。变奏可在整轮之前数一拍无声预备，或单手练，但不改变每小节四拍。', '弹五轮四小节，保持同时八度，并在第四拍落到G4、C4、F#4、B3。')],
 'bass-seventh-underlight-relay': [
 ('At 78 BPM over Am7–D7–Gmaj7–Cmaj7, play root on 1, rest for the first half of 2, seventh on 2-and, return root on 3 and rest on 4.', 'Use A2–G2–A2, D2–C3–D2, G1–F#2–G1 and C2–B2–C2. Each cell lasts four beats; the sevenths G, C, F# and B are eighth-note answers. If the answer misses, loop only the root/rest/seventh fragment before restoring the return and full loop.', 'Play six four-bar loops with sevenths on 2-and, roots on 1/3 and the next chord root exactly on the next 1.'),
 ('A 78 BPM sobre Am7–D7–Gmaj7–Cmaj7, toque fundamental no 1, pause na primeira metade do 2, sétima no contratempo do 2, fundamental no 3 e pausa no 4.', 'Use A2–G2–A2, D2–C3–D2, G1–F#2–G1 e C2–B2–C2. Cada célula dura quatro tempos; G, C, F# e B respondem como colcheias. Se a resposta falhar, repita só fundamental/pausa/sétima antes de recolocar o retorno e o ciclo inteiro.', 'Toque seis ciclos de quatro compassos com sétimas no contratempo do 2, fundamentais no 1/3 e próxima fundamental exatamente no próximo 1.'),
 ('A 78 BPM sobre Am7–D7–Gmaj7–Cmaj7, toca raíz en 1, silencio en la primera mitad de 2, séptima en su contratiempo, raíz en 3 y silencio en 4.', 'Usa A2–G2–A2, D2–C3–D2, G1–F#2–G1 y C2–B2–C2. Cada célula dura cuatro pulsos; G, C, F# y B responden como corcheas. Si falla la respuesta, repite solo raíz/silencio/séptima antes de recuperar el retorno y el ciclo.', 'Toca seis ciclos de cuatro compases con séptimas en el contratiempo de 2, raíces en 1/3 y la siguiente raíz exactamente en el próximo 1.'),
 ('Spiele bei 78 BPM über Am7–D7–Gmaj7–Cmaj7 Grundton auf 1, Pause auf der ersten Hälfte von 2, Septime auf 2-und, Grundton auf 3 und Pause auf 4.', 'Nutze A2–G2–A2, D2–C3–D2, G1–F#2–G1, C2–B2–C2. Jede Zelle dauert vier Schläge; G, C, F# und B antworten als Achtel. Verfehlt die Antwort den Puls, übe erst Grundton/Pause/Septime und ergänze danach Rückkehr und Loop. Internationale Namen: B bedeutet H.', 'Spiele sechs Viertaktloops mit Septimen auf 2-und, Grundtönen auf 1/3 und nächstem Akkordgrundton auf der nächsten Eins.'),
 ('78 BPMのAm7–D7–Gmaj7–Cmaj7でルートを1拍目、2拍目前半に休符、裏に7度、3拍目にルート、4拍目に休符を置きます。', 'A2–G2–A2、D2–C3–D2、G1–F#2–G1、C2–B2–C2を使います。各セル4拍で、G、C、F#、Bが8分音符の答えです。ずれたらルート・休符・7度だけを練習してから戻りと全体を加えます。', '7度を2拍目裏、ルートを1・3拍目、次のルートを次の1拍目に置き、4小節を6周弾きます。'),
 ('以78 BPM弹Am7–D7–Gmaj7–Cmaj7，第一拍根音，第二拍前半休止、后半七音，第三拍根音，第四拍休止。', '用A2–G2–A2、D2–C3–D2、G1–F#2–G1、C2–B2–C2。各单元四拍；G、C、F#、B为八分音符回答。若回答不准，先练根音/休止/七音，再恢复返回及整轮。', '弹六轮四小节，七音在2的后半、根音在1/3，下个和弦根音准时落在下个第一拍。')],
 'piano-ninth-window-switch': [
 ('At 60 BPM over Am7–D7–Gmaj7–Cmaj7, hold LH roots A2, D3, G2 and C3 for four beats on the instrument. RH enters with ninths B4/E4/A4/D4 on 3 and thirds C5/F#4/B4/E4 on 4.', 'The reference first gives each root two beats, then pairs it with the ninth and third. Playback REARTICULATES the root on 3/4 because this event grammar has no individual-voice ties. On the instrument keep that LH root held and change only RH; the audio demonstrates pitches and attack times, not the sustained-hand technique. Each cell is four beats.', 'Play six four-bar loops with a held LH root, RH ninth on 3 and third on 4; release LH only for the next chord.'),
 ('A 60 BPM sobre Am7–D7–Gmaj7–Cmaj7, sustente na esquerda A2, D3, G2 e C3 por quatro tempos no instrumento. A direita entra com nonas B4/E4/A4/D4 no 3 e terças C5/F#4/B4/E4 no 4.', 'A referência dá dois tempos a cada fundamental e depois a combina com nona e terça. A reprodução REARTICULA a fundamental no 3/4 porque esta gramática não tem ligaduras de duração por voz. No instrumento, mantenha a esquerda sustentada e mude só a direita; o áudio demonstra alturas e ataques, não a técnica de sustentação. Cada célula tem quatro tempos.', 'Toque seis ciclos de quatro compassos com fundamental esquerda sustentada, nona direita no 3 e terça no 4; solte a esquerda somente na próxima troca.'),
 ('A 60 BPM sobre Am7–D7–Gmaj7–Cmaj7, sostiene las raíces izquierdas A2, D3, G2 y C3 cuatro pulsos en el instrumento. La derecha entra con novenas B4/E4/A4/D4 en 3 y terceras C5/F#4/B4/E4 en 4.', 'La referencia da dos pulsos a la raíz y después la combina con novena y tercera. La reproducción REARTICULA la raíz en 3/4 porque la gramática no tiene ligaduras de duración por voz. En el instrumento sostén la izquierda y mueve solo la derecha; el audio muestra alturas y ataques, no la técnica de sostener. Cada célula suma cuatro pulsos.', 'Toca seis ciclos de cuatro compases con raíz izquierda sostenida, novena derecha en 3 y tercera en 4; suelta la izquierda solo al siguiente acorde.'),
 ('Halte bei 60 BPM über Am7–D7–Gmaj7–Cmaj7 links A2, D3, G2, C3 am Instrument vier Schläge. Rechts kommen Nonen B4/E4/A4/D4 auf 3 und Terzen C5/F#4/B4/E4 auf 4. Internationale Namen: B bedeutet H.', 'Die Vorlage gibt dem Grundton zwei Schläge und paart ihn dann mit None und Terz. Die Wiedergabe schlägt den Grundton auf 3/4 NEU AN, denn die Ereignisgrammatik hat keine Haltebögen für Einzelstimmen. Halte am Instrument links und wechsle nur rechts; Audio zeigt Höhen und Einsätze, keine Haltetechnik. Jede Zelle dauert vier Schläge.', 'Spiele sechs Viertaktloops mit gehaltenem linken Grundton, rechter None auf 3 und Terz auf 4; löse links erst beim nächsten Akkord.'),
 ('60 BPMのAm7–D7–Gmaj7–Cmaj7で左手A2、D3、G2、C3を楽器上で4拍保ちます。右手は3拍目に9度B4/E4/A4/D4、4拍目に3度C5/F#4/B4/E4です。', '例はルート2拍の後、9度と3度に重ねます。個別声部のタイを表す文法がないので、再生ではルートを3・4拍目に再アタックします。楽器では左手を保って右手だけ変えます。音源は高さとタイミングを示し、保持の手の技術は示しません。各セル4拍です。', '左手ルートを保ち、右手9度を3拍目、3度を4拍目に置く4小節を6周弾き、次の和音だけで左手を離します。'),
 ('以60 BPM弹Am7–D7–Gmaj7–Cmaj7，在乐器上把左手根音A2、D3、G2、C3保持四拍。右手九音B4/E4/A4/D4在第三拍，三音C5/F#4/B4/E4在第四拍。', '范例先给根音两拍，再与九音和三音叠合。由于事件文法不支持单声部延音线，播放在第三及第四拍重新起根音。在乐器上保持左手，仅改变右手；音源示范音高和起音时间，不示范手的持续技巧。各单元四拍。', '弹六轮四小节，左手保持根音，右手九音在3、三音在4，只在下个和弦时放开左手。')],
})

R2_PRACTICE_FEEDBACK = [
 'Practise the smallest cell slowly, name its target and count through every rest. If timing or balance fails, isolate one bar and reduce the tempo before reconnecting. Record your own attempt and describe one correction; playback is not evidence that your hands performed the task.',
 'Pratique devagar a menor célula, nomeie o alvo e conte todas as pausas. Se o tempo ou equilíbrio falhar, isole um compasso e reduza o andamento antes de voltar ao ciclo. Registre sua execução e descreva uma correção; reprodução não prova que suas mãos realizaram a tarefa.',
 'Practica despacio la célula mínima, nombra el objetivo y cuenta los silencios. Si falla tiempo o equilibrio, aísla un compás y baja el tempo antes de enlazarlo. Registra tu intento y describe una corrección; reproducir audio no demuestra que tus manos hicieron la tarea.',
 'Übe die kleinste Zelle langsam, benenne das Ziel und zähle alle Pausen. Scheitern Puls oder Balance, übe einen Takt allein und senke das Tempo vor dem Verbinden. Dokumentiere deinen Versuch und eine Korrektur; Wiedergabe belegt keine Ausführung deiner Hände.',
 '最小のセルをゆっくり弾き、目標音を言って休符も数えます。拍やバランスが崩れたら1小節を切り出し、テンポを下げてからつなぎます。自分の試行と修正点を記録します。再生は手が課題を実行した証拠ではありません。',
 '慢练最小单元，说出目标，休止也数拍。节奏或平衡不稳时单练一小节并降低速度，再接回整体。记录自己的尝试和一个修正；播放音源不能证明手完成了任务。',
]
for _lesson_id, _rows in R2_NEW_TEXT.items():
    R2_LOCALIZED[_lesson_id] = [(intro,detail,feedback,checkpoint) for (intro,detail,checkpoint),feedback in zip(_rows,R2_PRACTICE_FEEDBACK)]


def replace_candidate_localized(text, lessons):
    locales = ['en','pt-BR','es','de','ja','zh-Hans']
    titles = {}
    for locale in locales:
        body = text.split(':::locale '+locale+'\n',1)[1].split(':::locale ',1)[0].split(':::endlocalized',1)[0]
        title = re.search(r'^# (.+)$',body,re.M)
        if not title: raise ValueError('Missing localized heading: '+locale)
        titles[locale]=title[1]
    sections=[]
    for locale,paragraphs in zip(locales,lessons):
        sections.append(':::locale '+locale+'\n# '+titles[locale]+'\n\n'+'\n\n'.join(paragraphs[:-1])+'\n\n:::checkpoint '+paragraphs[-1]+'\n')
    return re.sub(r':::localized\n.*?:::endlocalized',':::localized\n'+'\n'.join(sections)+'\n:::endlocalized',text,count=1,flags=re.S)


def refine_candidate_text(lesson_id, text):
    """Idempotent candidate-only musical corrections. Never grants approval.

    Expected pitches come from the independently written notes line, or from
    explicit prose targets for the few map-only lessons. They are never inferred
    from the map being checked. Full notes/map equality is separately audited;
    Swift lessonlint remains the parser gate.
    """
    if lesson_id == 'bass-fifth-pocket-detour':
        return text  # reserved for the operational/content owner

    def set_fields(kind, updates, occurrence=0):
        nonlocal text
        index = 0
        def update(match):
            nonlocal index
            current = index; index += 1
            if current != occurrence: return match[0]
            f = fields(match[1]); f.update(updates)
            return '```' + kind + '\n' + '\n'.join(f'{key}: {value}' for key,value in f.items()) + '\n```'
        text = re.sub(r'```' + kind + r'\n(.*?)```', update, text, flags=re.S)

    if lesson_id == 'guitar-late-launch-switch':
        positions = '5:7 5:10 4:7 4:9 4:9 4:7 5:10 5:7 5:7 5:10 4:7 4:9 4:9 4:7 - 3:7 3:9'
        set_fields('fretboard', {'positions':' '.join(token+'@0.5' for token in positions.split()[:-1])+' 3:9@2'})
    elif lesson_id == 'guitar-half-step-landing-bridge':
        set_fields('fretboard', {'positions':'3:4 3:5 2:5 2:8 2:6 2:7 1:5 1:8 4:8 4:9 3:7 2:7 2:8 2:9 1:7 1:10','frets':'4-10'})
    elif lesson_id == 'guitar-guide-tone-switchback':
        score='E4/0.5 F#4/0.5 G4/0.5 A4/0.5 G4/2 B3/0.5 C#4/0.5 E4/0.5 D4/0.5 C#4/2 A3/0.5 B3/0.5 C#4/0.5 G4/0.5 F#4/2 F#4/0.5 E4/1.5 D#4/0.5 F#4/0.5 B4'
        set_fields('notes',{'sequence':score})
        set_fields('fretboard',{'positions':'3:9 2:7 2:8 2:10 2:8 4:9 4:11 3:9 3:7 4:11 4:7 4:9 4:11 2:8 2:7 2:7 3:9 3:8 2:7 1:7'})
    elif lesson_id == 'guitar-position-comet-lift':
        set_fields('fretboard',{'positions':'6:3@0.5 6:5@0.5 5:2@0.5 5:5@0.5 5:7@0.5 5:9@0.5 5:10@0.5 4:7@0.5 5:10@0.5 5:9@0.5 5:7@0.5 5:5@0.5 5:2@0.5 6:5@0.5 6:3@0.5','frets':'2-10'})
    elif lesson_id == 'bass-seventh-target-lock':
        set_fields('notes',{'sequence':'A1 - - G1 - - - - D2 - - C2 - - - -'})
        set_fields('fretboard',{'positions':' '.join(token+'@0.5' for token in '3:0 - - 4:3 - - - - 2:0 - - 3:3 - - - -'.split())})
    elif lesson_id == 'bass-backbeat-periscope':
        set_fields('notes',{'sequence':'D2 -/0.5 F2/0.5 A2 C2 G1 -/0.5 B1/0.5 D2 F2 C2 -/0.5 E2/0.5 G2 B1 A1 -/0.5 C#2/0.5 E2 G2'})
        set_fields('fretboard',{'positions':'3:5 -@0.5 3:8@0.5 2:7 4:8 4:3 -@0.5 4:7@0.5 3:5 3:8 4:8 -@0.5 3:7@0.5 2:5 4:7 4:5 -@0.5 3:4@0.5 3:7 2:5'})
    elif lesson_id == 'bass-fifth-pocket-switch':
        text = text.replace('on beat 1','on beat 3').replace('no tempo 1','no tempo 3').replace('en el tiempo 1','en el tiempo 3').replace('auf Schlag 1','auf Schlag 3').replace('1拍目','3拍目').replace('第1拍','第3拍')
    elif lesson_id == 'scale-advanced-wide-interval-lines-thirds':
        text = re.sub(r':::localized\n.*?:::endlocalized',lambda match: re.sub(r'(?<!\d)10(?!\d)', '11', match[0]),text,count=1,flags=re.S)
        for old,new in [('1 to 7','1 to 8'),('1 a 7','1 a 8'),('1 zu 7','1 zu 8'),('1から7','1から8'),('从1走到7','从1走到8')]:text=text.replace(old,new)
        set_fields('scale',{'expectedFinalDegree':'8'})
    elif lesson_id == 'guitar-call-response-shift':
        question='6:5@0.5 6:8@0.5 5:5@0.5 6:5@2.5 -@4'
        answer='5:7@0.5 5:10@0.5 4:10@0.5 4:7@2.5 -@4'
        set_fields('fretboard',{'positions':f'{question} {answer} {question} {answer}','frets':'5-10','expectedFinalNote':'A3'})

    if lesson_id == 'guitar-late-launch-switch':
        for old,new in [
          ('silence on beat 4','silence on the first half of beat 4'),
          ('**beat 4 completely silent**','**the first half of beat 4 silent**'),
          ('leaving beat 4 silent','leaving the first half of beat 4 silent'),
          ('silêncio no tempo 4','silêncio na primeira metade do tempo 4'),
          ('**tempo 4 totalmente em silêncio**','**primeira metade do tempo 4 em silêncio**'),
          ('deixando o tempo 4 em silêncio','deixando a primeira metade do tempo 4 em silêncio'),
          ('silencio del tiempo 4','silencio de la primera mitad del tiempo 4'),
          ('**tiempo 4 completamente en silencio**','**primera mitad del tiempo 4 en silencio**'),
          ('dejando en silencio el tiempo 4','dejando en silencio la primera mitad del tiempo 4'),
          ('Stille auf Schlag 4','Stille auf der ersten Hälfte von Schlag 4'),
          ('**Schlag 4 völlig leer**','**erste Hälfte von Schlag 4 leer**'),
          ('lasse Schlag 4 vor','lasse die erste Hälfte von Schlag 4 vor'),
          ('4拍目の沈黙','4拍目前半の沈黙'),('**4拍目を完全に空け**','**4拍目前半を空け**'),('4拍目を空けたあと','4拍目前半を空けたあと'),
          ('第4拍的安静','第4拍前半拍的安静'),('**第4拍完全留空**','**第4拍前半拍留空**'),('先把第4拍留空','先把第4拍前半拍留空')]:
            text=text.replace(old,new)
    if lesson_id == 'bass-seventh-target-lock':
        set_fields('notes',{'title':'A1 · G1 · D2 · C2'})
        additions=[
          'The written reference is Round 1: root on 1, seventh on 2-and and no beat-4 resolution. For Round 2 add A1 or D2 on beat 4 yourself, then keep the next chord root on 1.',
          'A referência escrita é a Rodada 1: fundamental no 1, sétima no contratempo do 2 e sem resolução no 4. Na Rodada 2, acrescente você A1 ou D2 no tempo 4 e mantenha a próxima fundamental no 1.',
          'La referencia escrita es la Ronda 1: raíz en 1, séptima en el contratiempo de 2 y sin resolución en 4. En la Ronda 2 añade tú A1 o D2 en 4 y conserva la siguiente raíz en 1.',
          'Die notierte Vorlage ist Runde 1: Grundton auf 1, Septime auf 2-und, keine Auflösung auf 4. Ergänze in Runde 2 selbst A1 oder D2 auf 4 und behalte den nächsten Grundton auf 1.',
          '書かれた例はラウンド1で、1拍目ルート、2拍目裏の7度、4拍目の解決なしです。ラウンド2では自分でA1またはD2を4拍目に加え、次のルートは1拍目に保ちます。',
          '书写范例为第一轮：根音在1、七音在2的后半，没有第四拍解决。第二轮请自己在第四拍加A1或D2，并保留下个第一拍的根音。',
        ]
        for locale,addition in zip(['en','pt-BR','es','de','ja','zh-Hans'],additions):
            pattern=r'(:::\s*locale '+re.escape(locale)+r'\n)(.*?)(?=:::locale |:::endlocalized)'
            def append_note(match,addition=addition):
                body=match[2]
                if addition in body:return match[0]
                return match[1]+body.rstrip()+'\n\n'+addition+'\n\n'
            text=re.sub(pattern,append_note,text,count=1,flags=re.S)

    if lesson_id in R2_NEW_SCORES:
        authored = R2_NEW_SCORES[lesson_id]
        for index, score in enumerate(authored['notes']):
            set_fields('notes', {'sequence':score, 'beat':'1'}, occurrence=index)
        if 'text' in authored: set_fields('text',authored['text'])
    if lesson_id in R2_LOCALIZED:
        text=replace_candidate_localized(text,R2_LOCALIZED[lesson_id])

    maps=re.findall(r'```fretboard\n(.*?)```',text,re.S)
    if maps:
        note_sources=re.findall(r'```notes\n(.*?)```',text,re.S)
        if lesson_id == 'guitar-half-step-fret-hunt-20261002':
            reference=[event for source in note_sources for event in events(source)[1]]
            note_tempo='56'
        elif note_sources:
            nf,reference=events(note_sources[0]);note_tempo=nf.get('tempo','80')
        else:
            explicit={
              'guitar-ninth-color-compass':(['B3','D4','C4','E4','F#4','E4','A4','B4','A4','D4','E4','D4'],[2,.5,1.5]*4),
              'guitar-third-shift-cipher':(['B3','C4','E4','F#4','D4','B3','G4','E4'],[.5,3.5]*4),
              'guitar-call-response-shift':(['A2','C3','D3','A2','-','E3','G3','C4','A3','-']*2,[.5,.5,.5,2.5,4]*4),
            }
            pitches,durations=explicit[lesson_id]
            reference=[([] if pitch=='-' else [pitch],duration) for pitch,duration in zip(pitches,durations)]
            note_tempo=fields(maps[0]).get('tempo','72')
        f=fields(maps[0]);tokens=re.findall(r'\[[^]]+\](?:@[^ ]+)?|[^\s]+',f['positions'])
        if len(tokens)!=len(reference):raise ValueError('Map/reference event count: '+lesson_id)
        positions=[]
        for token,(_,duration) in zip(tokens,reference):
            coordinate=token.partition('@')[0]
            positions.append(coordinate+(f'@{duration:g}' if duration!=1 else ''))
        expectation=' '.join('['+','.join(notes)+']' if len(notes)>1 else notes[0] if notes else '-' for notes,_ in reference)
        updates={'positions':' '.join(positions),'tempo':note_tempo,'expectedNotes':expectation}
        if lesson_id=='guitar-half-step-fret-hunt-20261002':updates['title']='B3–C4 · E4–F4'
        set_fields('fretboard',updates)
    return text


# Final directed musical audit: all data below remain candidate-only.
R3_SCORES = {
'guitar-sixth-ladder-flare': [
 '[C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 -/2',
 '[F3,D4]/0.5 [E3,C4] [D3,B3]/0.5 [C3,A3] -',
 '[C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 [C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 [C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 [C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 [C3,A3]/2 -/2 [C3,A3]/0.5 [D3,B3]/0.5 [E3,C4]/0.5 [F3,D4]/0.5 [E3,C4]/2'],
'guitar-harmonic-third-switchback': [
 '[G3,B3]/0.5 [A3,C4]/0.5 [B3,D4]/0.5 [C4,E4]/0.5 -/2',
 '[C4,E4]/0.5 [B3,D4]/0.5 [A3,C4]/0.5 [G3,B3]/0.5 -/2',
 '[G3,B3]/0.5 [A3,C4]/0.5 [B3,D4]/0.5 [C4,E4]/1.5 - [C4,E4]/0.5 [B3,D4]/0.5 [A3,C4]/0.5 [G3,B3]/0.5 [C4,E4]/0.5 [B3,D4]/0.5 [A3,C4]/0.5 [G3,B3]/0.5 [G3,B3] [C4,E4] [B3,D4] [A3,C4] [G3,B3]/4'],
'guitar-chromatic-third-bridge': ['C4/2 E4/0.5 G4/0.5 -/0.5 F4/0.5 F#4/2 A4/0.5 C5/0.5 -/0.5 A#3/0.5 B3/2 D4/0.5 F#4/0.5 -/0.5 D#4/0.5 E4/2 G4/0.5 B4/0.5 -/0.5 B3/0.5'],
'bass-backbeat-decoy': ['D2 F2 E2 -/0.5 D2/0.5 G1 B1 A1 -/0.5 G1/0.5 C2 E2 D2 -/0.5 E2/0.5 A1 C#2 B1 -/0.5 A1/0.5'],
'bass-beat-one-trapdoor': ['F1/2 -/1.5 C2/0.5 B1/2 -/1.5 D2/0.5 E2/2 -/1.5 D2/0.5 C#2/2 -/1.5 E1/0.5'],
'bass-root-fifth-signal-grid': ['A1 -/0.5 E2/0.5 -/2 D2 -/0.5 A1/0.5 -/2 G1 -/0.5 D2/0.5 -/2 C2 -/0.5 G1/0.5 -/2'],
'bass-syncopation-bridge': ['D2/0.5 - A1/0.5 -/0.5 F#2/0.5 A2 D2/0.5 - A1/0.5 -/0.5 F#2/0.5 A1'],
'bass-pocket-handoff': ['G1/0.5 - D2/0.5 E2/0.5 - D2/0.5 G2/0.5 - D3/0.5 E3/0.5 - D3/0.5'],
'bass-ghost-note-lifeline': ['G2/0.5 - -/0.5 G2/0.5 - -/0.5 G2/0.5 - -/0.5 G2/0.5 -/0.5 Bb2/0.25 C3/0.25 D3/0.5 G2/0.5 - -/0.5 G2/0.5 -/1.5 G2/2 G2/0.5 - -/0.5'],
'piano-handoff-lantern': ['G4 A4 B4 C5 D3 E3 F#3 G3 C5 B4 A4 G4 G4/4'],
'guitar-anticipation-zipline': ['-/2 A3/0.5 C4/0.5 A#3/0.5 B3/2.5 D4/0.5 F4/0.5 D#4/0.5 E4/2.5 B3/0.5 D4/0.5 C4/0.5 C#4/2.5 E4/0.5 G4/0.5 E4/0.5 F4/2.5'],
'guitar-seventh-target-laser': ['G3/2 - A3/0.5 B3/0.5 C4/2 - D4/0.5 E4/0.5 F#4/2 - G3/0.5 A3/0.5 B3/2 - A3/0.5 B3/0.5'],
'guitar-pivot-flare-ladder': ['F4/2 - G4/0.5 A4/0.5 B4/2 - G4/0.5 F4/0.5 E4/2 - G4/0.5 D4/0.5 C#4/2 - G4/0.5 A4/0.5'],
'guitar-resolution-catapult': ['A4/2 - B4/0.5 C5/0.5 D5/2 - E4/0.5 F4/0.5 G4/2 - C4/0.5 D4/0.5 E4/2 - F4/0.5 G4/0.5'],
'guitar-dorian-target-ladder': ['D3/0.5 E3/0.5 F3/0.5 G3/0.5 - F3 F3/0.5 G3/0.5 A3/0.5 G3/0.5 - B3 B3/0.5 A3/0.5 G3/0.5 F3/0.5 - D3 D4/0.5 B3/0.5 F3/0.5 D3/0.5 - D3'],
'guitar-target-triple-jump': ['D3/0.5 E3/0.5 G3/2 - F#3/0.5 G3/0.5 B3/2 - A3/0.5 B3/0.5 D4/2 -'],
'guitar-fourth-target-laser': ['G4/2 -/0.5 G4/0.5 A4/0.5 B4/0.5 C5/2 -/0.5 C5/0.5 D5/0.5 E5/0.5 F5/2 -/0.5 F4/0.5 E4/0.5 C#4/0.5 D4/2 -/0.5 E4/0.5 F4/0.5 F#4/0.5'],
'guitar-shift-signal': ['G2 A2 B2 D3/2 -/3 E3 F#3 G3 A3/2 -/3 A3 G3 F#3 E3 D3 B2 A2 G2'],
'guitar-shift-echo': ['G2 A2/0.5 B2/0.5 A2 - G3 A3/0.5 B3/0.5 A3 -'],
'guitar-dovetail-shift': ['G2 A2 B2 D3/2 -/3 G3 A3 B3 D4/2 -/3'],
'guitar-third-shift-signal': ['G2 A2 B2/2 C3 D3/2 - E3 F#3 G3 A3 G3 A3 B3/2'],
# Minor duration and prose contradictions found while reading the full corpus.
'guitar-target-echo-run': ['B3/0.5 A3/0.5 G3/0.5 C4/1.5 - E4/0.5 G4/0.5 A4/0.5 F#4/1.5 - A3/0.5 G3/0.5 A3/0.5 B3/1.5 - D4/0.5 C4/0.5 G4/0.5 E4/1.5 -'],
'bass-octave-feint-drop': ['D2 D3 F2/0.5 A2/0.5 - G2 G3 B2/0.5 D3/0.5 - C3 C4 E3/0.5 G3/0.5 - A2 A3 C#3/0.5 E3/0.5 -'],
'bass-third-echo-brake': ['F2 - D2 -/0.5 A2/0.5 B1 - G1 -/0.5 D2/0.5 E2 - C2 -/0.5 G2/0.5 C#2 - A1 -/0.5 E2/0.5'],
'bass-pocket-switch': [('D2/0.5 -/0.5 A1 E2/0.5 -/0.5 F#2 ')*4+'D2 A2 B2 D3 D2/0.5 -/0.5 A1 E2 -/0.5 D2/0.5 D2 A2 B2 D3 D2/0.5 -/0.5 A1 E2 -/0.5 D2/0.5'],
}
R3_POSITIONS = {
'guitar-shift-signal':'6:3 6:5 5:2 5:5 - 5:7 5:9 5:10 4:7 - 4:7 5:10 5:9 5:7 5:5 5:2 6:5 6:3',
'guitar-shift-echo':'6:3 6:5 6:7 6:5 - 5:10 4:7 4:9 4:7 -',
'guitar-dovetail-shift':'6:3 6:5 5:2 5:5 - 4:5 4:7 4:9 3:7 -',
'guitar-third-shift-signal':'6:3 6:5 5:2 5:3 5:5 - 5:7 5:9 5:10 4:7 5:10 4:7 4:9',
'guitar-fourth-compass-lift':'5:5 4:5 5:9 5:7 5:7 4:7 4:5 5:9 5:9 4:9 4:7 4:5',
'guitar-motif-password-20260913':'2:1 2:3 2:5 2:3',
'guitar-unison-string-detective-20260915':'2:5 2:8 2:5',
'guitar-string-skip-triangle-20260917':'5:3 4:2 2:8 4:2',
'bass-pentatonic-seventh-answer-20260925':'3:5 3:8 2:5 1:5',
'guitar-offbeat-motif-relay-20260927':'3:4 3:5 3:7 3:5',
}
# Locale order: en, pt-BR, es, de, ja, zh-Hans. These describe the exact new references.
R3_DETAILS = {
'guitar-sixth-ladder-flare': [
 'In C major at 82 BPM, climb C–A, D–B, E–C, F–D as eighth-note dyads, then rest two beats. Descend with durations 0.5, 1, 0.5, 1 and one beat of rest: every second PAIR lasts one extra eighth. In the four-bar boss, bars 1–2 repeat the eighth-note climb twice each; bar 3 holds C–A two beats then rests two; bar 4 climbs once and holds E–C two beats. Balance the upper voice while sustaining both notes together.',
 'Em dó maior a 82 BPM, suba C–A, D–B, E–C, F–D em díades de colcheia e pause dois tempos. Desça com durações 0.5, 1, 0.5, 1 e um tempo de pausa: cada segundo PAR dura uma colcheia extra. No final de quatro compassos, 1–2 repetem a subida duas vezes cada;3 sustenta C–A dois tempos e pausa dois;4 sobe uma vez e sustenta E–C dois. Equilibre a voz superior sustentando juntas as duas notas.',
 'En do mayor a 82 BPM, sube C–A, D–B, E–C, F–D en díadas simultáneas de corchea y descansa dos pulsos. Baja con duraciones 0.5, 1, 0.5, 1 y un pulso de silencio: cada segundo PAR dura una corchea extra. En los cuatro compases finales, 1–2 suben dos veces cada uno;3 sostiene C–A dos pulsos y descansa dos;4 sube una vez y sostiene E–C dos. Equilibra la voz superior sosteniendo ambas notas juntas.',
 'Steige in C-Dur bei 82 BPM mit C–A, D–B, E–C, F–D als Achtel-Doppelgriffen, dann zwei Schläge Pause. Abwärts dauern sie 0.5, 1, 0.5, 1 Schläge, danach eine Schlagpause: jedes zweite PAAR erhält ein zusätzliches Achtel. Im viertaktigen Schluss steigen Takte 1–2 jeweils zweimal; Takt 3 hält C–A zwei Schläge und pausiert zwei; Takt 4 steigt einmal und hält E–C zwei. Beide Töne bleiben gemeinsam gehalten; balanciere die Oberstimme. International B bedeutet H.',
 'Cメジャー、82 BPMでC–A、D–B、E–C、F–Dの重音を8分音符で上行し2拍休みます。下行の長さは0.5、1、0.5、1拍、続いて1拍休符。2番目ごとのペア全体を8分音符1つ分長くします。最終4小節の1～2小節は各2回上行、3小節はC–Aを2拍と休符2拍、4小節は1回上行とE–Cの2拍です。両音を同時に保ち、上声を整えます。',
 'C大调82 BPM，以八分双音上行C–A、D–B、E–C、F–D，再休止两拍。下行时长为0.5、1、0.5、1拍，再休止一拍；每第二组整个双音多保持半拍。终局四小节：第1–2小节各上行两遍，第3小节C–A两拍加休止两拍，第4小节上行一遍再保持E–C两拍。两音同时保持，平衡高声部。'],
'guitar-harmonic-third-switchback': [
 'At 84 BPM in G major, G–B, A–C, B–D, C–E ascend and reverse as eighth-note dyads, followed by two beats of silence in each reference. The four-bar boss starts with three eighth pairs, holds C–E for 1.5 beats (one extra beat), then rests one. Bar 2 reverses twice in eighths; bar 3 plays G–B, C–E, B–D, A–C in quarters; bar 4 holds G–B for four beats. Sustain the PAIR together and balance its upper note.',
 'A 84 BPM em sol maior, G–B, A–C, B–D, C–E sobem e voltam em díades de colcheia, com dois tempos de silêncio após cada célula. O final tem quatro compassos: três pares de colcheia, C–E por 1.5 tempo (um extra) e pausa de um; descida duas vezes em colcheias; G–B, C–E, B–D, A–C em semínimas; G–B por quatro tempos. Sustente o PAR junto e equilibre a nota superior.',
 'A 84 BPM en sol mayor, G–B, A–C, B–D, C–E suben y vuelven en díadas simultáneas de corchea, seguidas de dos pulsos de silencio. El final tiene cuatro compases: tres pares de corchea, C–E durante 1.5 pulsos (uno extra) y un silencio; dos bajadas en corcheas; G–B, C–E, B–D, A–C a negras; G–B cuatro pulsos. Sostén el PAR junto y equilibra su voz superior.',
 'Bei 84 BPM in G-Dur steigen G–B, A–C, B–D, C–E als Achtelpaare und kehren um; jede Zelle endet mit zwei Schlägen Pause. Der viertaktige Schluss: drei Achtelpaare, C–E für 1.5 Schläge (ein zusätzlicher) und eine Schlagpause; zweimal Achtelabstieg; G–B, C–E, B–D, A–C als Viertel; G–B vier Schläge. Halte das PAAR gemeinsam und balanciere oben. International B bedeutet H.',
 'Gメジャー、84 BPMでG–B、A–C、B–D、C–Eを8分重音で上下行し、各セル後に2拍休みます。最終4小節は8分ペア3つ、C–Eを1.5拍（1拍追加）、休符1拍／8分下行2回／G–B、C–E、B–D、A–Cの4分音符／G–Bを4拍です。ペア全体を同時に保ち、上声を整えます。',
 'G大调84 BPM，G–B、A–C、B–D、C–E以八分双音上下行，每个单元后休止两拍。终局四小节：三个八分双音、C–E保持1.5拍（多一拍）及一拍休止；八分下行两遍；G–B、C–E、B–D、A–C四分音符；G–B保持四拍。整个双音同时保持，平衡高声部。'],
'guitar-chromatic-third-bridge': [
 'Over Am7–D7–Gmaj7–Cmaj7 at 76 BPM, C4, F#4, B3, E4 start their bars and last two beats. Two scale eighths occupy beat 3; rest the first half of 4 and play F4, A#3, D#4, B3 on 4-and. Each pickup is one semitone BELOW the NEXT target. F, A# and D# are deliberate chromatic exceptions to G major. Repeat the four-bar loop to hear B3 lead into the opening C4.',
 'Sobre Am7–D7–Gmaj7–Cmaj7 a 76 BPM, C4, F#4, B3, E4 iniciam seus compassos por dois tempos. Duas colcheias da escala ocupam o compasso 3; pause a primeira metade do 4 e toque F4, A#3, D#4, B3 no contratempo do 4. Cada preparação fica um semitom ABAIXO do PRÓXIMO alvo. F, A# e D# são exceções cromáticas intencionais a sol maior. Repita os quatro compassos para ouvir B3 preparar o C4 inicial.',
 'Sobre Am7–D7–Gmaj7–Cmaj7 a 76 BPM, C4, F#4, B3, E4 inician sus compases y duran dos pulsos. Dos corcheas de escala ocupan 3; calla la primera mitad de 4 y toca F4, A#3, D#4, B3 en 4-y. Cada entrada está un semitono DEBAJO del SIGUIENTE objetivo. F, A# y D# son excepciones cromáticas deliberadas a sol mayor. Repite cuatro compases para oír B3 conducir al C4 inicial.',
 'Über Am7–D7–Gmaj7–Cmaj7 bei 76 BPM beginnen C4, F#4, B3, E4 ihre Takte mit zwei Schlägen. Zwei Skalenachtel liegen auf 3; pausiere auf der ersten Hälfte von 4, spiele F4, A#3, D#4, B3 auf 4-und. Jeder Auftakt liegt einen Halbton UNTER dem NÄCHSTEN Ziel. F, A# und D# sind bewusste chromatische Ausnahmen von G-Dur. Wiederhole vier Takte, damit B3 zum anfänglichen C4 führt. International B bedeutet H.',
 '76 BPMのAm7–D7–Gmaj7–Cmaj7でC4、F#4、B3、E4を各小節頭に2拍保ちます。3拍目に音階の8分音符2つ、4拍目前半は休符、裏はF4、A#3、D#4、B3です。各準備音は次の目標より半音下。F、A#、D#はGメジャーへの意図的な半音階例外です。4小節を繰り返して末尾B3から冒頭C4への進行を聴きます。',
 '76 BPM的Am7–D7–Gmaj7–Cmaj7中，C4、F#4、B3、E4在各小节第一拍保持两拍。第三拍是两个音阶八分音符，第四拍前半休止、后半为F4、A#3、D#4、B3。每个准备音比下一个目标低半音。F、A#、D#是对G大调刻意加入的半音阶例外。重复四小节，听末尾B3进入开头C4。'],
'bass-backbeat-decoy': [
 'At 100 BPM over Dm7–G7–Cmaj7–A7, roots D2/G1/C2/A1 land on 1; third on 2, passing tone on 3, silence on 4, and pickup on 4-and. Pickups D2/G1/E2/A1 lead to the NEXT roots G1/C2/A1/D2. Each five-event bar lasts four beats. Repeat the loop; a short pickup must not displace the following root.',
 'A 100 BPM sobre Dm7–G7–Cmaj7–A7, fundamentais D2/G1/C2/A1 caem no 1; terça no 2, passagem no 3, silêncio no 4 e preparação no contratempo do 4. D2/G1/E2/A1 preparam as PRÓXIMAS fundamentais G1/C2/A1/D2. Cada compasso de cinco eventos dura quatro tempos. Repita o ciclo sem a preparação deslocar a próxima fundamental.',
 'A 100 BPM sobre Dm7–G7–Cmaj7–A7, raíces D2/G1/C2/A1 en 1, tercera en 2, paso en 3, silencio en 4 y entrada en 4-y. D2/G1/E2/A1 preparan las SIGUIENTES raíces G1/C2/A1/D2. Cada compás de cinco eventos dura cuatro pulsos. Repite sin que la entrada desplace la próxima raíz.',
 'Bei 100 BPM über Dm7–G7–Cmaj7–A7 liegen Grundtöne D2/G1/C2/A1 auf 1, Terz auf 2, Durchgang auf 3, Pause auf 4, Auftakt auf 4-und. D2/G1/E2/A1 führen zu den NÄCHSTEN Grundtönen G1/C2/A1/D2. Jeder Fünfereignistakt dauert vier Schläge. Der Auftakt darf den folgenden Grundton nicht verschieben. International B bedeutet H.',
 '100 BPMのDm7–G7–Cmaj7–A7でD2/G1/C2/A1のルートを1、3度を2、経過音を3、休符を4拍目前半、準備音を4拍目裏に置きます。D2/G1/E2/A1は次のG1/C2/A1/D2を準備します。5イベントで各4拍。繰り返しても次のルートを遅らせません。',
 '100 BPM弹Dm7–G7–Cmaj7–A7：根音D2/G1/C2/A1在1，三音在2，经过音在3，第四拍前半休止、后半准备。D2/G1/E2/A1进入下个根音G1/C2/A1/D2。每个五事件小节四拍，重复时不让准备音推迟下个根音。'],
'bass-beat-one-trapdoor': [
 'At 94 BPM over Dm7–G7–Cmaj7–A7, targets F1/B1/E2/C#2 start each bar and last two beats; rest 1.5 beats, then play the next pickup on 4-and. The reference mixes approaches: C2 descends a semitone to B1, D2 rises a tone to E2, D2 descends a semitone to C#2, E1 rises a semitone to F1 at the loop boundary. Keep the held target stronger than the pickup.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, alvos F1/B1/E2/C#2 iniciam cada compasso por dois tempos; pause 1.5 e faça a próxima preparação no contratempo do 4. A referência mistura direções: C2 desce um semitom a B1, D2 sobe um tom a E2, D2 desce um semitom a C#2, E1 sobe um semitom a F1 ao reiniciar. O alvo sustentado deve ser mais forte que a preparação.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, F1/B1/E2/C#2 inician cada compás durante dos pulsos; calla 1.5 y entra en 4-y. La referencia mezcla direcciones: C2 baja un semitono a B1, D2 sube un tono a E2, D2 baja un semitono a C#2 y E1 sube un semitono a F1 al reiniciar. El objetivo sostenido debe pesar más que la entrada.',
 'Bei 94 BPM über Dm7–G7–Cmaj7–A7 beginnen F1/B1/E2/C#2 jeden Takt mit zwei Schlägen, dann 1.5 Schläge Pause und Auftakt auf 4-und. Gemischte Richtungen: C2 sinkt einen Halbton zu B1, D2 steigt einen Ganzton zu E2, D2 sinkt einen Halbton zu C#2, E1 steigt am Loopende einen Halbton zu F1. Das gehaltene Ziel trägt mehr Gewicht. International B bedeutet H.',
 '94 BPMのDm7–G7–Cmaj7–A7でF1/B1/E2/C#2を小節頭に2拍、休符1.5拍、4拍目裏に次の準備音です。C2からB1は半音下降、D2からE2は全音上行、D2からC#2は半音下降、末尾E1からF1は半音上行です。準備より保持する目標を強くします。',
 '94 BPM弹Dm7–G7–Cmaj7–A7，F1/B1/E2/C#2在小节头保持两拍，休止1.5拍，第四拍后半准备下个目标。C2到B1降半音，D2到E2升全音，D2到C#2降半音，末尾E1到F1升半音。持续目标的重音强于准备音。'],
'bass-root-fifth-signal-grid': [
 'At 84 BPM over Am7–D7–Gmaj7–Cmaj7, play root on 1 for one beat, rest the first half of 2, fifth on 2-and for half a beat, then rest through 3–4. Use A1–E2, D2–A1, G1–D2, C2–G1: two fifths lie BELOW their roots. Keep these registers in the reference; try upper fifths only in a separate pass.',
 'A 84 BPM sobre Am7–D7–Gmaj7–Cmaj7, fundamental no 1 por um tempo, pausa na primeira metade do 2, quinta no contratempo do 2 por meio tempo e pausa em 3–4. Use A1–E2, D2–A1, G1–D2, C2–G1: duas quintas ficam ABAIXO da fundamental. Preserve esses registros na referência; experimente quintas agudas só em outra rodada.',
 'A 84 BPM sobre Am7–D7–Gmaj7–Cmaj7, raíz en 1 un pulso, silencio en la primera mitad de 2, quinta en 2-y medio pulso y silencio en 3–4. Usa A1–E2, D2–A1, G1–D2, C2–G1: dos quintas están DEBAJO de la raíz. Conserva esos registros; prueba quintas superiores en otra pasada.',
 'Bei 84 BPM über Am7–D7–Gmaj7–Cmaj7: Grundton auf 1 einen Schlag, Pause auf der ersten Hälfte von 2, Quinte auf 2-und einen halben, Pause auf 3–4. Nutze A1–E2, D2–A1, G1–D2, C2–G1: zwei Quinten liegen UNTER dem Grundton. Behalte diese Register; höhere Quinten sind eine getrennte Variante.',
 '84 BPMのAm7–D7–Gmaj7–Cmaj7でルートを1拍、2拍目前半休符、裏に5度半拍、3～4拍目休符。A1–E2、D2–A1、G1–D2、C2–G1を使います。2つの5度はルートより下です。例の音域を保ち、高い5度は別の通しで試します。',
 '84 BPM弹Am7–D7–Gmaj7–Cmaj7：第一拍根音一拍，第二拍前半休止、后半五音半拍，第三至第四拍休止。用A1–E2、D2–A1、G1–D2、C2–G1，其中两组五音在根音下方。保留范例音域，高八度五音另练。'],
'bass-syncopation-bridge': [
 'At 88 BPM in D major, each bar has D2 on 1 for half a beat, A1 on 2-and, silence on the FIRST HALF of 3, F#2 on 3-and and A on 4. The written two-bar cell ends high A2, then low A1. Each bar is four beats; repeat four times for eight bars. Prepare the register change during the counted silence.',
 'A 88 BPM em ré maior, cada compasso tem D2 no 1 por meio tempo, A1 no contratempo do 2, silêncio na PRIMEIRA METADE do 3, F#2 no contratempo do 3 e A no 4. A célula de dois compassos termina em A2 agudo e depois A1 grave. Cada compasso dura quatro tempos; repita quatro vezes para oito. Prepare a mudança durante a pausa contada.',
 'A 88 BPM en re mayor, D2 en 1 medio pulso, A1 en 2-y, silencio en la PRIMERA MITAD de 3, F#2 en 3-y y A en 4. La célula de dos compases termina en A2 alto y después A1 bajo. Cada compás dura cuatro pulsos; repite cuatro veces para ocho. Prepara el cambio durante el silencio contado.',
 'Bei 88 BPM in D-Dur: D2 auf 1 einen halben Schlag, A1 auf 2-und, Pause auf der ERSTEN HÄLFTE von 3, F#2 auf 3-und und A auf 4. Die Zweitaktzelle endet erst auf hohem A2, dann tiefem A1. Vier Schläge je Takt; vier Wiederholungen ergeben acht Takte. Bereite den Registerwechsel in der gezählten Pause vor.',
 'Dメジャー88 BPMで各小節はD2を1拍目に半拍、A1を2拍目裏、3拍目前半休符、F#2を3拍目裏、Aを4拍目に置きます。2小節セルは高いA2、次は低いA1で終わります。各4拍、4回繰り返して8小節。数える休符で移動を準備します。',
 'D大调88 BPM，各小节D2在第一拍半拍，A1在第二拍后半，第三拍前半休止、后半F#2，第四拍A。两小节单元先以高A2、再低A1结束。每小节四拍，重复四次为八小节，数休止时准备移位。'],
'bass-pocket-handoff': [
 'At 84 BPM, G–D–E–D attack on 1, 2-and, 3, 4-and. Their durations are half a beat; the two gaps each last one beat. The two-bar reference alternates G1–D2–E2–D2 and G2–D3–E3–D3, exactly one octave apart. Repeat four times for eight bars. A two-beat pause AFTER bar 4 is an optional interlude outside those eight full bars; restart the next section on low G.',
 'A 84 BPM, G–D–E–D atacam no 1, contratempo do 2, 3 e contratempo do 4. Cada nota dura meio tempo e cada intervalo de silêncio dura um. A referência de dois compassos alterna G1–D2–E2–D2 e G2–D3–E3–D3, uma oitava acima. Repita quatro vezes para oito compassos. Uma pausa de dois tempos APÓS o compasso 4 é interlúdio opcional fora dos oito compassos completos; retome a seção em G grave.',
 'A 84 BPM, G–D–E–D entran en 1, 2-y, 3, 4-y. Cada nota dura medio pulso; cada hueco dura uno. La referencia de dos compases alterna G1–D2–E2–D2 y G2–D3–E3–D3, a una octava. Repite cuatro veces para ocho compases. Dos pulsos de pausa DESPUÉS del 4 son interludio opcional fuera de esos ocho compases completos; vuelve en G bajo.',
 'Bei 84 BPM greifen G–D–E–D auf 1, 2-und, 3, 4-und an. Jeder Ton dauert einen halben, jede der beiden Pausen einen Schlag. Die Zweitaktvorlage wechselt G1–D2–E2–D2 und G2–D3–E3–D3 genau eine Oktave höher. Vier Wiederholungen ergeben acht Takte. Zwei Schläge Pause NACH Takt 4 sind ein optionales Zwischenspiel außerhalb der acht vollständigen Takte; beginne danach auf tiefem G.',
 '84 BPMでG–D–E–Dを1、2拍目裏、3、4拍目裏に半拍ずつ置き、間の2つの休符は各1拍です。2小節の例はG1–D2–E2–D2と1オクターブ上のG2–D3–E3–D3。4回で8小節。4小節後の2拍休符は8小節の外に加える任意の間奏です。次の区間は低いGから始めます。',
 '84 BPM下G–D–E–D在1、2的后半、3、4的后半起音，各半拍，两段间隔各休止一拍。两小节范例交替G1–D2–E2–D2及高一八度G2–D3–E3–D3，重复四次为八小节。第四小节后的两拍休止是八个完整小节之外可选间奏；下段从低G开始。'],
'bass-ghost-note-lifeline': [
 'At 90 BPM in G minor pentatonic, the four-bar reference keeps G2 on 1/3. Bar 1 has muted-stroke slots on 2-and/4-and; bar 2 keeps 2-and and replaces the WHOLE beat 4 with Bb2/C3 sixteenths and D3 eighth, leading to G2. Bar 3 keeps only 2-and and silences beat 4. Bar 4 holds G2 through 1–2, adds G2 on 3 and a muted stroke on 4-and. The marked ghost slots are silent in playback: make the unpitched strokes on your bass yourself.',
 'A 90 BPM em sol pentatônica menor, os quatro compassos mantêm G2 no 1/3. O compasso 1 tem espaços de batida abafada nos contratempos 2/4; o compasso 2 mantém o do 2 e substitui TODO o tempo 4 por Bb2/C3 em semicolcheias e D3 em colcheia, voltando a G2. O compasso 3 mantém só o contratempo 2 e silencia 4. O compasso 4 sustenta G2 em 1–2, toca G2 no 3 e batida abafada no contratempo 4. Esses espaços ficam silenciosos no áudio; faça você as batidas sem altura no baixo.',
 'A 90 BPM en sol pentatónica menor, cuatro compases mantienen G2 en 1/3. El 1 tiene golpes apagados en 2-y/4-y; el 2 conserva 2-y y sustituye TODO 4 por Bb2/C3 semicorcheas y D3 corchea hacia G2. El 3 conserva solo 2-y y calla 4. El 4 sostiene G2 en 1–2, añade G2 en 3 y golpe apagado en 4-y. Esos huecos no suenan en la reproducción; haz tú los golpes sin altura en el bajo.',
 'Bei 90 BPM in G-Moll-Pentatonik hält die Viertaktvorlage G2 auf 1/3. Takt 1 hat gedämpfte Schläge auf 2-und/4-und; Takt 2 behält 2-und und ersetzt den GANZEN Schlag 4 durch Bb2/C3-Sechzehntel und D3-Achtel zurück nach G2. Takt 3 behält nur 2-und und pausiert auf 4. Takt 4 hält G2 auf 1–2, spielt G2 auf 3 und einen gedämpften Schlag auf 4-und. Die Ghost-Slots bleiben in der Wiedergabe stumm; spiele die tonlosen Schläge selbst. International Bb bedeutet B.',
 'Gマイナーペンタトニック90 BPMの4小節でG2を1・3拍目に置きます。1小節は2・4拍目裏にミュート、2小節は2拍目裏を残し4拍目全体をBb 2/C3の16分とD3の8分でG2へ、3小節は2拍目裏のみで4拍目休み、4小節はG2を1～2拍保ち3拍目G2と4拍目裏ミュートです。ミュート位置は再生で無音。無音程の打音は自分のベースで行います。',
 'G小调五声90 BPM，四小节G2在1/3。第一小节2及4的后半为闷击；第二保留2的后半，以Bb 2/C3十六分和D3八分替换整个第四拍并进入G2；第三只留2的后半、第四拍休止；第四G2保持1–2、第三拍G2、4的后半闷击。闷击位置在播放中静音，请在贝斯上自己完成无音高打击。'],
'piano-handoff-lantern': [
 'At 76 BPM in G major, RH ascends G4–A4–B4–C5 in bar 1; LH answers D3–E3–F#3–G3 in bar 2; RH returns C5–B4–A4–G4 in bar 3; RH holds G4 for all of bar 4. All moving notes are quarters. There are two handoffs, no simultaneous hands and exactly 16 beats. Prepare the next hand without reattacking early.',
 'A 76 BPM em sol maior, direita sobe G4–A4–B4–C5 no compasso 1; esquerda responde D3–E3–F#3–G3 no 2; direita volta C5–B4–A4–G4 no 3; direita sustenta G4 por todo o compasso 4. Notas em movimento são semínimas. Há duas trocas, sem mãos simultâneas, e16 tempos. Prepare a próxima mão sem antecipar seu ataque.',
 'A 76 BPM en sol mayor, derecha sube G4–A4–B4–C5 en 1; izquierda responde D3–E3–F#3–G3 en 2; derecha vuelve C5–B4–A4–G4 en 3; derecha sostiene G4 durante todo 4. Las notas móviles son negras. Hay dos relevos, sin manos simultáneas y16 pulsos. Prepara la próxima mano sin adelantar su ataque.',
 'Bei 76 BPM in G-Dur steigt rechts G4–A4–B4–C5 in Takt 1; links antwortet D3–E3–F#3–G3 in 2; rechts kehrt C5–B4–A4–G4 in 3 zurück und hält G4 den ganzen Takt 4. Bewegte Töne sind Viertel. Zwei Handwechsel, keine Gleichzeitigkeit, genau 16 Schläge. Bereite die nächste Hand ohne frühen Anschlag vor. International B bedeutet H.',
 'Gメジャー76 BPMの1小節は右手G4–A4–B4–C5、2小節は左手D3–E3–F#3–G3、3小節は右手C5–B4–A4–G4、4小節は右手G4を全小節保ちます。動く音は4分音符です。手の交代2回、同時演奏なし、計16拍。次の手を早く鳴らさず準備します。',
 'G大调76 BPM，第一小节右手G4–A4–B4–C5，第二左手D3–E3–F#3–G3，第三右手C5–B4–A4–G4，第四右手G4保持整小节。移动音均四分音符，两次换手、没有同时双手，共16拍。准备下一只手但不提前起音。'],
'guitar-anticipation-zipline': [
 'At 94 BPM over Dm7–G7–Cmaj7–A7, anticipate the NEXT chord with B3/E4/C#4/F4 on 4-and. Begin with two silent beats. Each bar has three setup eighths on 3/3-and/4, then a target lasting 2.5 beats across the barline through the next beat 2. The written excerpt is FOUR bars PLUS a two-beat Dm7 tail, 18 beats, not a looping 18-beat chorus. Setups A3–C4–A#3, D4–F4–D#4, B3–D4–C4, E4–G4–E4 include intentional chromatic neighbors before B/E/C#. In continued playing, resume the next setup on 3 instead of inserting another count-in.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, antecipe o PRÓXIMO acorde com B3/E4/C#4/F4 no contratempo 4. Comece com dois tempos silenciosos. Cada compasso prepara três colcheias em 3/contratempo 3/4 e sustenta o alvo 2.5 tempos através da barra até o próximo 2. O trecho escrito tem QUATRO compassos MAIS cauda de Dm7 de dois tempos, 18 tempos, não um ciclo de 18. A3–C4–A#3, D4–F4–D#4, B3–D4–C4, E4–G4–E4 incluem vizinhos cromáticos intencionais antes de B/E/C#. Ao continuar, retome no 3 sem nova contagem inicial.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, anticipa el SIGUIENTE acorde con B3/E4/C#4/F4 en 4-y. Empieza con dos pulsos silenciosos. Cada compás prepara tres corcheas en 3/3-y/4 y sostiene el objetivo 2.5 pulsos cruzando la barra hasta el próximo 2. El fragmento tiene CUATRO compases MÁS dos pulsos de cola Dm7, 18 pulsos, no un ciclo de 18. A3–C4–A#3, D4–F4–D#4, B3–D4–C4, E4–G4–E4 incluyen vecinos cromáticos deliberados antes de B/E/C#. Continúa en 3 sin otro conteo inicial.',
 'Bei 94 BPM über Dm7–G7–Cmaj7–A7 antizipieren B3/E4/C#4/F4 den NÄCHSTEN Akkord auf 4-und. Beginne mit zwei stillen Schlägen. Drei Vorbereitungsachtel auf 3/3-und/4 führen zum 2.5 Schläge gehaltenen Ziel über den Taktstrich bis zur nächsten 2. Die Vorlage hat VIER Takte PLUS zwei Schläge Dm7-Nachlauf, 18 Schläge, keinen 18-Schlag-Loop. A3–C4–A#3, D4–F4–D#4, B3–D4–C4, E4–G4–E4 enthalten bewusste chromatische Nachbarn vor B/E/C#. Spiele anschließend auf 3 weiter, ohne neuen Einzähler. International B bedeutet H.',
 '94 BPMのDm7–G7–Cmaj7–A7で次の和音をB3/E4/C#4/F4で4拍目裏に先取りします。冒頭2拍無音。3・3拍目裏・4拍目の8分音符3つから目標を2.5拍、次小節2拍目終わりまで保ちます。例は4小節とDm7の終結2拍、計18拍で、18拍のループではありません。準備A3–C4–A#3、D4–F4–D#4、B3–D4–C4、E4–G4–E4はB/E/C#直前の意図的な半音階隣接音を含みます。続ける時は新たなカウントなしに3拍目から準備します。',
 '94 BPM弹Dm7–G7–Cmaj7–A7，B3/E4/C#4/F4在第四拍后半预示下个和弦。开头静两拍，3、3后半、4上三个八分准备音，目标持续2.5拍越过小节线至下小节第二拍结束。范例是四小节加Dm7两拍尾声，共18拍，不是18拍循环。A3–C4–A#3、D4–F4–D#4、B3–D4–C4、E4–G4–E4在B/E/C#前含刻意的半音阶邻音。继续弹时在第三拍恢复准备，不再另加预数。'],
'guitar-seventh-target-laser': [
 'At 72 BPM over Am7–D7–Gmaj7–Cmaj7, sevenths G3/C4/F#4/B3 start each bar for two beats; beat 3 is silent, while beat 4 contains two eighth-note pickups. The pickups A3–B3, D4–E4, G3–A3, A3–B3 lead to NEXT targets C4/F#4/B3/G3. Start on G3 after the count-in; repeat four bars to join the final pickup to it. Beat 4 is not empty.',
 'A 72 BPM sobre Am7–D7–Gmaj7–Cmaj7, sétimas G3/C4/F#4/B3 iniciam cada compasso por dois tempos; o compasso 3 é silencioso e o compasso 4 tem duas colcheias de preparação. A3–B3, D4–E4, G3–A3, A3–B3 levam aos PRÓXIMOS alvos C4/F#4/B3/G3. Comece em G3 após a contagem; repita quatro compassos para ligá-lo à última preparação. O tempo 4 não fica vazio.',
 'A 72 BPM sobre Am7–D7–Gmaj7–Cmaj7, séptimas G3/C4/F#4/B3 inician cada compás dos pulsos;3 calla y4 contiene dos corcheas de entrada. A3–B3, D4–E4, G3–A3, A3–B3 conducen a los SIGUIENTES objetivos C4/F#4/B3/G3. Empieza en G3 tras contar; repite cuatro compases para unir la última entrada. El 4 no está vacío.',
 'Bei 72 BPM über Am7–D7–Gmaj7–Cmaj7 beginnen Septimen G3/C4/F#4/B3 jeden Takt zwei Schläge lang;3 pausiert, 4 enthält zwei Auftaktachtel. A3–B3, D4–E4, G3–A3, A3–B3 führen zu den NÄCHSTEN Zielen C4/F#4/B3/G3. Beginne nach dem Einzähler auf G3 und verbinde im Viertaktloop den letzten Auftakt damit. Schlag 4 ist nicht leer. International B bedeutet H.',
 '72 BPMのAm7–D7–Gmaj7–Cmaj7で7度G3/C4/F#4/B3を小節頭に2拍保ち、3拍目休符、4拍目に8分音符2つです。A3–B3、D4–E4、G3–A3、A3–B3は次のC4/F#4/B3/G3へ進みます。カウント後G3で始め、4小節を繰り返して最後の準備を結びます。4拍目は休みません。',
 '72 BPM弹Am7–D7–Gmaj7–Cmaj7，七音G3/C4/F#4/B3在小节头保持两拍，第三拍休止，第四拍两个八分准备音。A3–B3、D4–E4、G3–A3、A3–B3进入下个C4/F#4/B3/G3。预数后从G3开始，重复四小节把最后准备接回；第四拍不留空。'],
'guitar-pivot-flare-ladder': [
 'At 96 BPM over Dm7–G7–Cmaj7–A7, thirds F4/B4/E4/C#4 land on 1 and last two beats. Rest 3; G4 is the launch on 4 and a passing A4/F4/D4/A4 on 4-and leads to the NEXT target. The G pivot starts at the END of the bar, not at its beginning. Keep all four bars equal; C# belongs to A7.',
 'A 96 BPM sobre Dm7–G7–Cmaj7–A7, terças F4/B4/E4/C#4 caem no 1 por dois tempos. Pause 3; G4 lança no 4 e a passagem A4/F4/D4/A4 no contratempo 4 leva ao PRÓXIMO alvo. O pivô G começa no FINAL do compasso, não no início. Mantenha os quatro compassos iguais; C# pertence a A7.',
 'A 96 BPM sobre Dm7–G7–Cmaj7–A7, terceras F4/B4/E4/C#4 entran en 1 dos pulsos. Calla 3; G4 lanza en 4 y A4/F4/D4/A4 en 4-y lleva al SIGUIENTE objetivo. El pivote G está al FINAL del compás, no al inicio. Mantén cuatro compases iguales; C# pertenece a A7.',
 'Bei 96 BPM über Dm7–G7–Cmaj7–A7 landen Terzen F4/B4/E4/C#4 auf 1 und dauern zwei Schläge. Pause auf 3; G4 startet auf 4, A4/F4/D4/A4 auf 4-und führt zum NÄCHSTEN Ziel. Der G-Pivot liegt am ENDE, nicht am Anfang des Taktes. Alle vier Takte bleiben gleich lang; C# gehört zu A7. International B bedeutet H.',
 '96 BPMのDm7–G7–Cmaj7–A7で3度F4/B4/E4/C#4を1拍目に2拍保ち、3休符、4拍目G4と裏のA4/F4/D4/A4から次の目標へ進みます。Gの軸は小節頭ではなく末尾です。4小節とも同じ長さにし、C#はA7の音です。',
 '96 BPM弹Dm7–G7–Cmaj7–A7，三音F4/B4/E4/C#4在第一拍保持两拍，第三拍休止，第四拍G4及后半A4/F4/D4/A4准备下个目标。G支点在小节末，不在开头。四小节同长，C#属于A7。'],
'guitar-resolution-catapult': [
 'At 94 BPM over Dm7–G7–Cmaj7–A7, fifths A4/D5/G4/E4 land on 1 for two beats. Rest 3, then play two eighth-note approaches on 4/4-and: B4–C5, E4–F4, C4–D4, F4–G4 into the NEXT target. Thus approach–approach–target spans the barline; the target is not the third eighth of the same bar. Loop four bars, keeping the fifth longer than both approaches.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, quintas A4/D5/G4/E4 caem no 1 por dois tempos. Pause 3 e faça duas preparações em colcheias no 4/contratempo 4: B4–C5, E4–F4, C4–D4, F4–G4 para o PRÓXIMO alvo. Preparação–preparação–alvo cruza a barra; o alvo não é a terceira colcheia do mesmo compasso. Repita quatro compassos mantendo a quinta mais longa.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, quintas A4/D5/G4/E4 entran en 1 dos pulsos. Calla 3 y prepara en dos corcheas de 4/4-y: B4–C5, E4–F4, C4–D4, F4–G4 hacia el SIGUIENTE objetivo. Entrada–entrada–objetivo cruza la barra; el objetivo no es la tercera corchea del mismo compás. Repite cuatro compases y sostén más la quinta.',
 'Bei 94 BPM über Dm7–G7–Cmaj7–A7 landen Quinten A4/D5/G4/E4 auf 1 zwei Schläge lang. Pause 3, dann zwei Auftaktachtel auf 4/4-und: B4–C5, E4–F4, C4–D4, F4–G4 zum NÄCHSTEN Ziel. Auftakt–Auftakt–Ziel überschreitet den Taktstrich; das Ziel ist nicht das dritte Achtel desselben Taktes. Wiederhole vier Takte und halte die Quinte länger. International B bedeutet H.',
 '94 BPMのDm7–G7–Cmaj7–A7で5度A4/D5/G4/E4を1拍目に2拍、3休符、4・4拍目裏のB4–C5、E4–F4、C4–D4、F4–G4から次の目標へ進みます。準備2音と目標は小節線をまたぎ、目標は同小節の3つ目の8分音符ではありません。4小節を繰り返し5度を長く保ちます。',
 '94 BPM弹Dm7–G7–Cmaj7–A7，五音A4/D5/G4/E4在第一拍两拍，第三拍休止，第四拍及后半B4–C5、E4–F4、C4–D4、F4–G4进入下个目标。两个准备音加目标跨越小节线，目标不是同小节第三个八分音符。重复四小节，五音比准备音长。'],
'guitar-dorian-target-ladder': [
 'At 78 BPM in D Dorian, each bar begins with four eighths (two beats), rests beat 3, and lands a target on 4. The first three targets are F3, B3, D3, climbing from D toward F/B before returning. Bar 4 explicitly descends D4–B3–F3–D3 in eighths, rests 3 and returns D3 on 4. The natural B is the bright sixth, not Bb. Play the four-bar reference before varying its rhythm or shifting position.',
 'A 78 BPM em ré dórico, cada compasso começa com quatro colcheias (dois tempos), pausa 3 e chega ao alvo no 4. Os três primeiros alvos são F3, B3, D3, subindo de D para F/B antes de voltar. O compasso 4 desce explicitamente D4–B3–F3–D3 em colcheias, pausa 3 e retorna D3 no 4. B natural é a sexta clara, não Bb. Toque a referência de quatro compassos antes de variar ritmo ou posição.',
 'A 78 BPM en re dórico, cada compás empieza con cuatro corcheas (dos pulsos), calla 3 y llega al objetivo en 4. Los primeros tres son F3, B3, D3, subiendo de D hacia F/B antes de volver. El 4 baja D4–B3–F3–D3 en corcheas, calla 3 y vuelve a D3 en 4. B natural es la sexta brillante, no Bb. Toca cuatro compases antes de variar ritmo o posición.',
 'Bei 78 BPM in D-Dorisch beginnt jeder Takt mit vier Achteln (zwei Schlägen), pausiert auf 3 und landet auf 4. Die ersten drei Ziele sind F3, B3, D3: von D zu F/B und zurück. Takt 4 steigt ausdrücklich D4–B3–F3–D3 in Achteln ab, pausiert auf 3 und endet D3 auf 4. Natürliches internationales B (H), nicht Bb (B), ist die helle Sexte. Spiele vier Takte vor Rhythmus- oder Lagenvariationen.',
 'Dドリアン78 BPM、各小節は8分音符4つで2拍、3拍目休符、4拍目目標です。最初の目標F3、B3、D3はDからF/Bへ上がって戻ります。4小節はD4–B3–F3–D3を8分で下降、3休符、4拍目D3。Bナチュラルが明るい6度でBbではありません。4小節の例を弾いてからリズムやポジションを変えます。',
 'D多利亚78 BPM，各小节先四个八分音符共两拍，第三拍休止、第四拍目标。前三目标F3、B3、D3从D向F/B上行再回。第四小节明确以D4–B3–F3–D3八分下降，第三拍休止、第四拍D3。B自然是明亮六音，不是Bb。先弹四小节范例再变节奏或把位。'],
'guitar-target-triple-jump': [
 'At 76 BPM in G major, play a THREE-bar cycle: D3–E3 eighths leap to G3 on 2 held through 3, then rest 4; F#3–G3 leap to B3 with the same rhythm; A3–B3 leap to D4 likewise. Each bar lasts four beats, 12 per cycle, ending on D4 and a counted rest, never A. Use frets 5–9, move the hand without holding a wide stretch, and repeat four cycles before trying another string set.',
 'A 76 BPM em sol maior, toque um ciclo de TRÊS compassos: D3–E3 em colcheias saltam a G3 no 2 sustentado até 3 e pause 4; F#3–G3 saltam a B3 no mesmo ritmo; A3–B3 a D4. Cada compasso dura quatro tempos, 12 por ciclo, terminando em D4 e pausa contada, nunca A. Use casas 5–9, mova a mão sem sustentar abertura ampla e repita quatro ciclos antes de trocar de cordas.',
 'A 76 BPM en sol mayor, ciclo de TRES compases: D3–E3 corcheas saltan a G3 en 2 sostenido hasta 3 y silencio 4; F#3–G3 a B3 con igual ritmo; A3–B3 a D4. Cada compás dura cuatro pulsos, 12 por ciclo, termina en D4 y silencio contado, nunca A. Usa trastes 5–9, mueve la mano sin mantener abertura amplia y repite cuatro ciclos antes de cambiar cuerdas.',
 'Bei 76 BPM in G-Dur ein DREItaktzyklus: D3–E3 als Achtel springen zu G3 auf 2, gehalten bis Ende 3, Pause 4; F#3–G3 springen gleich zu B3; A3–B3 zu D4. Vier Schläge je Takt, 12 je Zyklus, Schluss auf D4 mit gezählter Pause, nie A. Nutze Bünde 5–9 und verschiebe ohne weite Haltedehnung. Vier Zyklen vor einem anderen Saitensatz. International B bedeutet H.',
 'Gメジャー76 BPMで3小節セルです。D3–E3を8分で弾きG3へ跳躍、2～3拍保ち4休符。F#3–G3からB3、A3–B3からD4も同じです。各4拍、計12拍、D4と数える休符で終わりAでは終わりません。5～9フレットで広い開きを保たず手を動かします。4周後に別の弦で試します。',
 'G大调76 BPM，三小节循环：D3–E3八分跳至G3，在第二至第三拍保持、第四拍休止；F#3–G3同样跳B3；A3–B3跳D4。各四拍，每轮12拍，以D4及数拍休止结束，不以A结束。使用5–9品，移手而不撑开宽距，四轮后再换弦组。'],
'guitar-fourth-target-laser': [
 'At 84 BPM over Dm7–G7–Cmaj7–A7, fourths G4/C5/F5/D4 start each bar for two beats. Rest the first half of 3, then three approach eighths on 3-and/4/4-and lead to the NEXT target. Last neighbors B4→C5 and E5→F5 use string 1 frets 7→8 and 12→13; C#4→D4 uses string 3 frets 6→7; F#4→G4 uses string 2 frets 7→8. Each final approach is exactly one fret below on the SAME string. Repeat to connect the last F#4 to opening G4; count the first target after a count-in. Try above-neighbor C#5→C5 and D#4→D4 only in a separate pass.',
 'A 84 BPM sobre Dm7–G7–Cmaj7–A7, quartas G4/C5/F5/D4 começam cada compasso por dois tempos. Pause a primeira metade do 3 e prepare três colcheias no contratempo 3/4/contratempo 4 para o PRÓXIMO alvo. B4→C5 e E5→F5 usam corda 1 casas 7→8 e12→13; C#4→D4 usa corda 3 casas 6→7; F#4→G4 usa corda 2 casas 7→8. Cada vizinho final fica uma casa abaixo na MESMA corda. Repita para ligar F#4 ao G4 inicial após contagem. C#5→C5 e D#4→D4 por cima ficam em outra rodada.',
 'A 84 BPM sobre Dm7–G7–Cmaj7–A7, cuartas G4/C5/F5/D4 inician cada compás dos pulsos. Calla la primera mitad de 3 y prepara tres corcheas en 3-y/4/4-y hacia el SIGUIENTE objetivo. B4→C5 y E5→F5 usan cuerda 1 trastes 7→8 y12→13; C#4→D4 cuerda 3 trastes 6→7; F#4→G4 cuerda 2 trastes 7→8. El último vecino está un traste abajo en la MISMA cuerda. Repite para unir F#4 al G4 inicial tras contar. C#5→C5 y D#4→D4 desde arriba son otra pasada.',
 'Bei 84 BPM über Dm7–G7–Cmaj7–A7 beginnen Quarten G4/C5/F5/D4 zwei Schläge lang. Pause auf der ersten Hälfte von 3, drei Auftaktachtel auf 3-und/4/4-und zum NÄCHSTEN Ziel. B4→C5 und E5→F5 liegen auf Saite 1, Bünde 7→8 und 12→13; C#4→D4 auf Saite 3, 6→7; F#4→G4 auf Saite 2, 7→8. Der letzte Nachbar liegt genau einen Bund tiefer auf DERSELBEN Saite. Verbinde im Loop F#4 mit G4 nach dem Einzähler. C#5→C5 und D#4→D4 von oben sind eine getrennte Variante. International B bedeutet H.',
 '84 BPMのDm7–G7–Cmaj7–A7で4度G4/C5/F5/D4を小節頭に2拍、3拍目前半休符、3拍目裏・4・4拍目裏の8分3つで次を準備します。B4→C5とE5→F5は第1弦7→8と12→13、C#4→D4は第3弦6→7、F#4→G4は第2弦7→8。最後の隣音は同じ弦でちょうど1フレット下です。カウント後G4で始め、末尾F#4から繰り返しにつなぎます。上からC#5→C5、D#4→D4は別の通しで試します。',
 '84 BPM弹Dm7–G7–Cmaj7–A7，四音G4/C5/F5/D4在小节头两拍，第三拍前半休止，3后半/4/4后半三个八分准备下个目标。B4→C5及E5→F5在第1弦7→8及12→13，C#4→D4在第3弦6→7，F#4→G4在第2弦7→8。最后邻音恰好同弦低一品。预数后从G4开始，循环连接末尾F#4。上方C#5→C5及D#4→D4另练。'],
}
R3_POSITIONS.update({
'bass-pentatonic-seventh-answer-20260925':'3:0 3:3 3:5 2:2 3:0 -',
'guitar-offbeat-motif-relay-20260927':'4:2 3:0 3:4 - 4:2 -',
})
R3_DETAILS.update({
'guitar-shift-signal':[
 'At 86 BPM in G major, the written route has THREE two-bar cells, six bars total. Low G2–A2–B2–D3 uses strings 6/5, durations 1+1+1+2 and a three-beat rest. Shift from D3 (string 5 fret 5) to E3 (same string fret 7); E3–F#3–G3–A3 uses strings 5/4 and frets 7–10 with the same rhythm and rest. The last eight quarter notes return A3–G3–F#3–E3–D3–B2–A2–G2. Move the hand during silence; never hold a wide stretch. After learning the six-bar route, compose a shorter four-bar sentence using its shift.',
 'A 86 BPM em sol maior, a rota escrita tem TRÊS células de dois compassos, seis no total. G2–A2–B2–D3 grave usa cordas 6/5, durações 1+1+1+2 e pausa de três tempos. Mude de D3 (corda 5 casa 5) a E3 (mesma corda casa 7); E3–F#3–G3–A3 usa cordas 5/4 e casas 7–10 no mesmo ritmo e pausa. As oito semínimas finais voltam A3–G3–F#3–E3–D3–B2–A2–G2. Mova a mão no silêncio sem sustentar abertura ampla. Após aprender seis compassos, componha frase menor de quatro com essa mudança.',
 'A 86 BPM en sol mayor, la ruta tiene TRES células de dos compases, seis en total. G2–A2–B2–D3 grave usa cuerdas 6/5, duraciones 1+1+1+2 y silencio de tres pulsos. Cambia de D3 (cuerda 5 traste 5) a E3 (misma cuerda traste 7); E3–F#3–G3–A3 usa cuerdas 5/4 y trastes 7–10 con igual ritmo y silencio. Las ocho negras finales vuelven A3–G3–F#3–E3–D3–B2–A2–G2. Mueve la mano en silencio sin abertura sostenida. Tras aprender seis compases, compón cuatro usando ese cambio.',
 'Bei 86 BPM in G-Dur hat die Route DREI Zweitaktzellen, sechs Takte. Tiefes G2–A2–B2–D3 nutzt Saiten 6/5, Dauern 1+1+1+2 und drei Schläge Pause. Wechsle von D3 (Saite 5 Bund 5) zu E3 (gleiche Saite Bund 7); E3–F#3–G3–A3 nutzt Saiten 5/4, Bünde 7–10 mit gleichem Rhythmus und Pause. Acht Schlussviertel führen A3–G3–F#3–E3–D3–B2–A2–G2 zurück. Bewege die Hand in Pausen ohne Haltedehnung. Komponiere danach vier Takte mit diesem Wechsel. International B bedeutet H.',
 'Gメジャー86 BPMの経路は2小節セル3つ、計6小節。低いG2–A2–B2–D3は第6/5弦、長さ1+1+1+2と休符3拍。D3の第5弦5フレットから同弦7のE3へ移り、E3–F#3–G3–A3は第5/4弦7～10で同じリズムと休符。最後の4分8音はA3–G3–F#3–E3–D3–B2–A2–G2です。休符で手を動かし広く開いたままにしません。6小節を学んだ後、移動を使う4小節を作ります。',
 'G大调86 BPM，路线为三个两小节单元，共六小节。低G2–A2–B2–D3用第6/5弦，时长1+1+1+2及三拍休止。D3第5弦5品移至同弦7品E3；E3–F#3–G3–A3用第5/4弦7–10品，同样节奏及休止。末尾八个四分音符返回A3–G3–F#3–E3–D3–B2–A2–G2。休止时移手，不持续撑宽。学会六小节后另写含此换把的四小节。'],
'guitar-shift-echo':[
 'At 80 BPM in G major, play one low bar and one high bar: G on 1, A on 2, B on 2-and, A on 3, and a full rest on 4. Low G2–A2–B2–A2 uses string 6 frets 3–5–7–5; high G3–A3–B3–A3 uses 5:10, 4:7, 4:9, 4:7. The high route is the seventh-position region (frets 7–10), an octave echo. Prepare the shift in beat 4; do not slide between different strings as if they were one string. Repeat the two-bar cell four times.',
 'A 80 BPM em sol maior, toque um compasso grave e outro agudo: G no 1, A no 2, B no contratempo 2, A no 3 e pausa inteira no 4. G2–A2–B2–A2 usa corda 6 casas 3–5–7–5; G3–A3–B3–A3 usa 5:10, 4:7, 4:9, 4:7. A rota aguda ocupa a região da sétima posição (casas 7–10), uma oitava acima. Prepare a mudança no 4 sem tratar cordas diferentes como um slide único. Repita a célula de dois compassos quatro vezes.',
 'A 80 BPM en sol mayor, un compás bajo y otro alto: G en 1, A en 2, B en 2-y, A en 3 y silencio completo 4. G2–A2–B2–A2 usa cuerda 6 trastes 3–5–7–5; G3–A3–B3–A3 usa 5:10, 4:7, 4:9, 4:7. La ruta alta ocupa región séptima (trastes 7–10), una octava arriba. Prepara el cambio en 4, sin tratar distintas cuerdas como un solo deslizamiento. Repite dos compases cuatro veces.',
 'Bei 80 BPM in G-Dur ein tiefer und ein hoher Takt: G auf 1, A auf 2, B auf 2-und, A auf 3, ganze Pause 4. G2–A2–B2–A2 nutzt Saite 6 Bünde 3–5–7–5; G3–A3–B3–A3 nutzt 5:10, 4:7, 4:9, 4:7. Die hohe Route liegt in der siebten Lagenregion (7–10), eine Oktave höher. Bereite auf 4 vor, ohne verschiedene Saiten als einen Slide zu behandeln. Wiederhole die Zweitaktzelle viermal. International B bedeutet H.',
 'Gメジャー80 BPM、低い小節と高い小節を1つずつ。Gは1、Aは2、Bは2拍目裏、Aは3、4は全休符です。低いG2–A2–B2–A2は第6弦3–5–7–5、高いG3–A3–B3–A3は5:10、4:7、4:9、4:7。高い経路は7ポジション付近7～10で1オクターブ上。4拍目で移動し、別弦を連続スライドと考えません。2小節を4回繰り返します。',
 'G大调80 BPM，一小节低、一小节高：G在1、A在2、B在2后半、A在3、4整拍休止。低G2–A2–B2–A2用第6弦3–5–7–5，高G3–A3–B3–A3用5:10、4:7、4:9、4:7。高路线是第七把位区域7–10品、高八度。在第四拍准备换把，别把不同弦当作同一个滑音。两小节重复四次。'],
'guitar-dovetail-shift':[
 'At 76 BPM in G major, each call/answer lasts two bars: G–A–B in quarters, D for two beats, then three beats of silence. Low G2–A2–B2–D3 uses 6:3, 6:5, 5:2, 5:5; high G3–A3–B3–D4 uses 4:5, 4:7, 4:9, 3:7. The four-bar reference preserves the same rhythm in both registers. Release D and move the hand in the counted pause. A D-to-G return changes strings, so use a quiet handoff, not an impossible continuous slide.',
 'A 76 BPM em sol maior, pergunta/resposta dura dois compassos cada: G–A–B em semínimas, D por dois tempos e silêncio de três. G2–A2–B2–D3 usa 6:3, 6:5, 5:2, 5:5; G3–A3–B3–D4 usa 4:5, 4:7, 4:9, 3:7. Os quatro compassos conservam o ritmo nos dois registros. Solte D e mova a mão na pausa contada. D para G troca de corda: faça passagem silenciosa, não slide contínuo impossível.',
 'A 76 BPM en sol mayor, pregunta/respuesta dura dos compases cada una: G–A–B a negras, D dos pulsos y silencio tres. G2–A2–B2–D3 usa 6:3, 6:5, 5:2, 5:5; G3–A3–B3–D4 usa 4:5, 4:7, 4:9, 3:7. Los cuatro compases conservan igual ritmo en ambos registros. Suelta D y mueve la mano durante el silencio contado. D a G cambia cuerda: relevo silencioso, no un deslizamiento continuo imposible.',
 'Bei 76 BPM in G-Dur dauern Frage und Antwort je zwei Takte: G–A–B als Viertel, D zwei Schläge, dann drei Schläge Pause. G2–A2–B2–D3 nutzt 6:3, 6:5, 5:2, 5:5; G3–A3–B3–D4 nutzt 4:5, 4:7, 4:9, 3:7. Die Viertaktvorlage hat in beiden Registern denselben Rhythmus. Löse D und bewege in der gezählten Pause. D nach G wechselt die Saite: leiser Übergang, kein unmöglicher durchgehender Slide. International B bedeutet H.',
 'Gメジャー76 BPMで問いと答えは各2小節。G–A–Bは4分、Dを2拍、休符3拍。低G2–A2–B2–D3は6:3、6:5、5:2、5:5、高G3–A3–B3–D4は4:5、4:7、4:9、3:7。計4小節の両音域で同じリズムです。Dを離して数える休符で移動。DからGは弦が変わるので、連続スライドでなく静かに受け渡します。',
 'G大调76 BPM，问答各两小节：G–A–B四分、D两拍、休止三拍。低G2–A2–B2–D3用6:3、6:5、5:2、5:5，高G3–A3–B3–D4用4:5、4:7、4:9、3:7。四小节两音域节奏相同。松开D，在数拍休止中移手。D到G换弦，应安静交接而非不可能的连续滑音。'],
'guitar-third-shift-signal':[
 'At 86 BPM in G major, the four-bar route stays low for two bars, then shifts. Bar 1 G2–A2 are quarters and B2 lasts two beats. Bar 2 C3 is a quarter, D3 lasts two and beat 4 rests. After D3 on 5:5, shift to E3 on 5:7. Bar 3 E3–F#3–G3–A3 uses frets 7–10 in quarters. Bar 4 G3–A3 are quarters and B3 on 4:9 is the two-beat THIRD arrival. For a second take, shorten G3/A3 to eighths and hold B3 three beats: the arrival moves from 3 to 2 without changing bar length.',
 'A 86 BPM em sol maior, a rota de quatro compassos fica grave nos dois primeiros e depois muda. No 1 G2–A2 são semínimas e B2 dura dois tempos. No 2 C3 dura um, D3 dois e4 pausa. Após D3 em 5:5, mude a E3 em 5:7. O compasso 3 toca E3–F#3–G3–A3 em casas 7–10 como semínimas. No 4 G3–A3 duram um e B3 em 4:9 chega como TERÇA por dois. Em outra tomada, G3/A3 viram colcheias e B3 dura três: a chegada passa do 3 ao 2 sem mudar o compasso.',
 'A 86 BPM en sol mayor, cuatro compases: dos bajos y luego cambio. En 1 G2–A2 son negras y B2 dura dos. En 2 C3 dura uno, D3 dos y4 calla. Tras D3 en 5:5 cambia a E3 en 5:7. El 3 toca E3–F#3–G3–A3 en trastes 7–10 a negras. En 4 G3–A3 duran uno y B3 en 4:9 llega como TERCERA dos pulsos. En otra toma G3/A3 son corcheas y B3 dura tres: llegada de 3 a 2 sin cambiar la longitud.',
 'Bei 86 BPM in G-Dur bleibt die Viertaktroute zwei Takte tief, dann wechselt sie. Takt 1: G2–A2 Viertel, B2 zwei Schläge. Takt 2: C3 einen, D3 zwei, Pause 4. Nach D3 auf 5:5 wechsle zu E3 auf 5:7. Takt 3 E3–F#3–G3–A3 in Bünden 7–10 als Viertel. Takt 4 G3–A3 Viertel und B3 auf 4:9 als zwei Schläge gehaltene TERZ. Zweite Aufnahme: G3/A3 Achtel, B3 drei Schläge; Ankunft von 3 auf 2 bei gleicher Taktlänge. International B bedeutet H.',
 'Gメジャー86 BPMの4小節、初め2小節は低く、その後移動。1小節G2–A2は4分、B2は2拍。2小節C3は1拍、D3は2拍、4休符。D3の5:5からE3の5:7へ移動。3小節E3–F#3–G3–A3は7～10フレットで4分。4小節G3–A3は1拍ずつ、4:9のB3を3度の着地として2拍保ちます。次の録音ではG3/A3を8分、B3を3拍にし、長さを変えず着地を3拍目から2拍目へ移します。',
 'G大调86 BPM四小节，前两小节低音后换把。第一G2–A2四分、B2两拍；第二C3一拍、D3两拍、第四拍休止。D3在5:5后换E3的5:7。第三E3–F#3–G3–A3在7–10品四分。第四G3–A3各一拍，4:9的B3作为三音目标保持两拍。第二次录音把G3/A3改八分、B3三拍，目标从第三拍提前至第二拍而小节等长。'],
'guitar-target-echo-run':[
 'At 78 BPM over Am7–D7–Gmaj7–Cmaj7, each four-beat bar has three approach eighths, then its third C4/F#4/B3/E4 on 2-and for 1.5 beats, followed by one full beat of rest. Each target is three times as long as an approach. Move the hand rather than holding a span. Keep B as an approach to Am7, never label it the third.',
 'A 78 BPM sobre Am7–D7–Gmaj7–Cmaj7, cada compasso de quatro tempos tem três colcheias de preparação e terça C4/F#4/B3/E4 no contratempo 2 por 1.5 tempo, seguida de pausa inteira de um. Cada alvo dura três vezes uma preparação. Mova a mão sem sustentar abertura. B é preparação em Am7, nunca sua terça.',
 'A 78 BPM sobre Am7–D7–Gmaj7–Cmaj7, cada compás tiene tres corcheas y tercera C4/F#4/B3/E4 en 2-y durante 1.5 pulsos, luego silencio completo de uno. Cada objetivo dura tres veces una entrada. Mueve la mano sin mantener abertura. B es aproximación de Am7, nunca su tercera.',
 'Bei 78 BPM über Am7–D7–Gmaj7–Cmaj7 hat jeder Takt drei Auftaktachtel, dann Terz C4/F#4/B3/E4 auf 2-und für 1.5 Schläge und eine ganze Schlagpause. Jedes Ziel dauert dreimal so lang wie ein Auftakt. Verschiebe ohne Haltedehnung. B ist bei Am7 ein Durchgang, nie seine Terz. International B bedeutet H.',
 '78 BPMのAm7–D7–Gmaj7–Cmaj7で各4拍小節は準備8分3音、2拍目裏の3度C4/F#4/B3/E4を1.5拍、休符1拍。目標は準備の3倍の長さです。広い開きを保たず移動し、Am7のBは準備であり3度ではありません。',
 '78 BPM弹Am7–D7–Gmaj7–Cmaj7，每四拍小节先三个八分准备音，三音C4/F#4/B3/E4在2后半保持1.5拍，再休止整拍。目标时长为准备音三倍。移手不撑宽，Am7的B是经过音，绝非三音。'],
'bass-octave-feint-drop':[
 'At 98 BPM over Dm7–G7–Cmaj7–A7, root on 1, upper octave on 2, third F2/B2/E3/C#3 on 3 for half a beat, passing A2/D3/G3/E3 on 3-and for half a beat, and full rest 4. These four bars each total four beats. Move to frets 12–17 as needed without holding the leap. The reference includes the passing-note variation; keep root and octave on their numbered beats.',
 'A 98 BPM sobre Dm7–G7–Cmaj7–A7, fundamental no 1, oitava aguda no 2, terça F2/B2/E3/C#3 no 3 por meio tempo, passagem A2/D3/G3/E3 no contratempo 3 por meio e pausa inteira no 4. Cada um dos quatro compassos soma quatro tempos. Desloque até casas 12–17 sem sustentar o salto. A referência inclui a variação de passagem, preservando os tempos da fundamental e oitava.',
 'A 98 BPM sobre Dm7–G7–Cmaj7–A7, raíz en 1, octava alta en 2, tercera F2/B2/E3/C#3 en 3 medio pulso, paso A2/D3/G3/E3 en 3-y medio y silencio completo 4. Cada uno de cuatro compases suma cuatro pulsos. Desplázate a trastes 12–17 sin sostener el salto. La referencia incluye la variante de paso y mantiene raíz y octava en sus pulsos.',
 'Bei 98 BPM über Dm7–G7–Cmaj7–A7: Grundton 1, obere Oktave 2, Terz F2/B2/E3/C#3 auf 3 einen halben, Durchgang A2/D3/G3/E3 auf 3-und einen halben, volle Pause 4. Jeder der vier Takte dauert vier Schläge. Wechsle bei Bedarf zu Bünden 12–17 ohne Haltedehnung. Die Vorlage enthält die Durchgangsvariante; Grundton und Oktave bleiben auf ihren Schlägen. International B bedeutet H.',
 '98 BPMのDm7–G7–Cmaj7–A7で1ルート、2高いオクターブ、3に3度F2/B2/E3/C#3を半拍、裏にA2/D3/G3/E3を半拍、4全休符。各4拍の4小節です。必要なら12～17フレットへ手を動かし幅を保ちません。例は経過音を加えた変奏で、ルートとオクターブの拍を保ちます。',
 '98 BPM弹Dm7–G7–Cmaj7–A7，1根音、2高八度、3三音F2/B2/E3/C#3半拍、3后半A2/D3/G3/E3半拍、4整拍休止。四小节各四拍，必要时移至12–17品，不持续撑开。范例含经过音变奏，根音和八度仍在对应拍。'],
'bass-third-echo-brake':[
 'At 94 BPM over Dm7–G7–Cmaj7–A7, thirds F2/B1/E2/C#2 land on 1, rest 2, roots D2/G1/C2/A1 land on 3, rest the first half of 4, and fifths A2/D2/G2/E2 attack on 4-and. Every bar totals four beats. The eighth pickup is on 4-and, not on 4. For a shorter first target release before 2, while preserving all following attacks.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, terças F2/B1/E2/C#2 no 1, pausa 2, fundamentais D2/G1/C2/A1 no 3, pausa na primeira metade do 4 e quintas A2/D2/G2/E2 no contratempo 4. Cada compasso soma quatro tempos. A colcheia de preparação cai no contratempo 4, não no 4. Para encurtar o primeiro alvo, solte antes do 2 sem deslocar os ataques seguintes.',
 'A 94 BPM sobre Dm7–G7–Cmaj7–A7, terceras F2/B1/E2/C#2 en 1, silencio 2, raíces D2/G1/C2/A1 en 3, silencio en primera mitad de 4 y quintas A2/D2/G2/E2 en 4-y. Cada compás suma cuatro pulsos. La entrada de corchea está en 4-y, no en 4. Para acortar el objetivo inicial, suéltalo antes de 2 sin mover los siguientes ataques.',
 'Bei 94 BPM über Dm7–G7–Cmaj7–A7: Terzen F2/B1/E2/C#2 auf 1, Pause 2, Grundtöne D2/G1/C2/A1 auf 3, Pause erste Hälfte 4, Quinten A2/D2/G2/E2 auf 4-und. Vier Schläge je Takt. Das Auftaktachtel liegt auf 4-und, nicht 4. Löse für ein kürzeres erstes Ziel vor 2, ohne folgende Einsätze zu verschieben. International B bedeutet H.',
 '94 BPMのDm7–G7–Cmaj7–A7で1に3度F2/B1/E2/C#2、2休符、3にルートD2/G1/C2/A1、4拍目前半休符、裏に5度A2/D2/G2/E2です。各4拍。準備8分は4拍目でなく裏。最初の目標を短くする時も2の前で離し、後続のアタックを動かしません。',
 '94 BPM弹Dm7–G7–Cmaj7–A7，第一拍三音F2/B1/E2/C#2，第二休止，第三根音D2/G1/C2/A1，第四前半休止、后半五音A2/D2/G2/E2。各四拍，八分准备在4后半而非4。首目标可在2前放开，但后续起音不移动。'],
'bass-pocket-switch':[
 'At 94 BPM in D major, the reference has eight full bars. Bars 1–4 repeat low D2–A1–E2–F#2 with D/E half-beat attacks on 1/3 and following eighth rests. Bar 5 changes from D2 to upper A2/B2/D3 on D/G strings. Bar 6 returns low: D2 eighth, eighth rest, A1 quarter, E2 quarter, eighth rest, final D2 eighth on 4-and. Bars 7–8 repeat those high/return bars. The silence before the final D is the FIRST HALF of 4, not before 4; keep all barlines steady.',
 'A 94 BPM em ré maior, a referência tem oito compassos completos. 1–4 repetem D2–A1–E2–F#2 grave, com D/E por meio tempo no 1/3 seguidos de pausas de colcheia. O compasso 5 passa de D2 a A2/B2/D3 agudos nas cordas D/G. O compasso 6 retorna: D2 colcheia, pausa colcheia, A1 semínima, E2 semínima, pausa colcheia e D2 final no contratempo 4. Os compassos 7–8 repetem agudo/retorno. A pausa é a PRIMEIRA METADE do 4, não antes do 4; mantenha as barras.',
 'A 94 BPM en re mayor, ocho compases completos. 1–4 repiten D2–A1–E2–F#2 bajo, D/E medios pulsos en 1/3 y silencios de corchea. El 5 pasa de D2 a A2/B2/D3 altos en cuerdas D/G. El 6 vuelve: D2 corchea, silencio corchea, A1 negra, E2 negra, silencio corchea y D2 final en 4-y. 7–8 repiten alto/vuelta. El silencio es la PRIMERA MITAD de 4, no antes de 4; conserva las barras.',
 'Bei 94 BPM in D-Dur acht volle Takte. 1–4 wiederholen tiefes D2–A1–E2–F#2, D/E halb auf 1/3 mit folgenden Achtelpausen. Takt 5 geht von D2 zu hohem A2/B2/D3 auf D/G-Saiten. Takt 6 kehrt zurück: D2 Achtel, Achtelpause, A1 Viertel, E2 Viertel, Achtelpause, D2 auf 4-und. 7–8 wiederholen hoch/zurück. Die Pause liegt auf der ERSTEN HÄLFTE von 4, nicht vor 4; behalte feste Taktgrenzen. International B bedeutet H.',
 'Dメジャー94 BPMの例は8小節。1～4は低D2–A1–E2–F#2を繰り返し、D/Eは1・3拍目半拍と続く8分休符。5はD2からD/G弦の高いA2/B2/D3。6は低く戻り、D2の8分、8分休符、A1の4分、E2の4分、8分休符、裏のD2です。7～8は高い小節と戻りを再度。最後D前の休符は4の前でなく4拍目前半です。小節線を保ちます。',
 'D大调94 BPM，范例八个完整小节。1–4重复低D2–A1–E2–F#2，D/E在1/3半拍、随后八分休止。第五D2转至D/G弦高A2/B2/D3，第六返回：D2八分、八分休止、A1四分、E2四分、八分休止、4后半D2。7–8再高/返回。末D之前休止是第四拍前半而非第四拍前，保持小节线。'],
})
# Further concrete issues from the complete English/score audit, not review approvals.
R3_SCORES.update({
'bass-fifth-echo-lock':['A1 -/0.5 E2/0.5 - G1/0.5 A1/0.5 D2 -/0.5 A2/0.5 - C2/0.5 D2/0.5 G1 -/0.5 D2/0.5 - B1/0.5 D2/0.5 C2 -/0.5 G2/0.5 - A1/0.5 C2/0.5'],
'guitar-target-lighthouse':['C4/2 -/0.5 D4/0.5 E4/0.5 G4/0.5 F#4/2 -/0.5 A3/0.5 C4/0.5 D4/0.5 B3/2 -/0.5 C4/0.5 D4/0.5 F#4/0.5 E4/2 -/0.5 G3/0.5 A3/0.5 B3/0.5'],
'piano-hands-crossing':['G4/0.5 A4/0.5 B4/0.5 A4/0.5 D5/2 G3/0.5 A3/0.5 B3/0.5 A3/0.5 D4/2 G4/0.5 A4/0.5 B4/0.5 A4/0.5 D5/2 G3/0.5 A3/0.5 B3/0.5 A3/0.5 D4/2'],
'piano-lane-cross':['[G2,B3] [D3,C4] [G3,D4]/2 [G2,B4] [D3,C5] [G3,D5]/2 [G3,B3] [D4,C4] [G4,D4]/2 [G2,D4] [D3,C4] [G3,B3] [G2,G4]'],
'guitar-position-comet-lift':['G2/0.5 A2/0.5 B2/0.5 D3/0.5 E3/0.5 F#3/0.5 G3/0.5 A3/0.5 G3/0.5 F#3/0.5 E3/0.5 D3/0.5 B2/0.5 A2/0.5 G2'],
'bass-fifth-pocket-switch':['A1 C2 E2 - D2 F#2 A2 - G1 B1 D2 - C2 E2 G2 -'],
})
R3_POSITIONS['guitar-position-comet-lift']='6:3 6:5 5:2 5:5 5:7 5:9 5:10 4:7 5:10 5:9 5:7 5:5 5:2 6:5 6:3'
R3_DETAILS.update({
'bass-fifth-echo-lock':[
 'At 88 BPM over Am7–D7–Gmaj7–Cmaj7, root lasts beat 1, rest the FIRST HALF of 2, fifth attacks 2-and, rest 3, and two eighth answers occupy 4/4-and. Fifths E2/A2/D2/G2 include the upper-octave change in bars 2/4. Every bar lasts four beats. A muted-stroke variation REPLACES the second answer on 4-and; do not add an extra attack or displace the next root.',
 'A 88 BPM sobre Am7–D7–Gmaj7–Cmaj7, fundamental dura 1, pausa a PRIMEIRA METADE do 2, quinta no contratempo 2, pausa 3 e duas colcheias respondem em 4/contratempo 4. Quintas E2/A2/D2/G2 incluem a mudança de oitava nos compassos 2/4. Cada compasso dura quatro tempos. A variação abafada SUBSTITUI a segunda resposta no contratempo 4; não acrescente ataque nem desloque a próxima fundamental.',
 'A 88 BPM sobre Am7–D7–Gmaj7–Cmaj7, raíz dura 1, calla la PRIMERA MITAD de 2, quinta en 2-y, silencio 3 y dos corcheas responden en 4/4-y. Quintas E2/A2/D2/G2 incluyen cambio de octava en compases 2/4. Cuatro pulsos por compás. La variante apagada SUSTITUYE la segunda respuesta en 4-y; no añadas un ataque ni muevas la próxima raíz.',
 'Bei 88 BPM über Am7–D7–Gmaj7–Cmaj7: Grundton 1, Pause ERSTE HÄLFTE 2, Quinte 2-und, Pause 3, zwei Antwortachtel 4/4-und. Quinten E2/A2/D2/G2 enthalten den Oktavwechsel in Takten 2/4. Vier Schläge je Takt. Eine gedämpfte Variante ERSETZT die zweite Antwort auf 4-und; kein zusätzlicher Anschlag und kein verschobener Grundton. International B bedeutet H.',
 '88 BPMのAm7–D7–Gmaj7–Cmaj7でルート1拍、2拍目前半休符、裏5度、3休符、4・4拍目裏に8分2音。E2/A2/D2/G2の5度には2・4小節の高いオクターブを含みます。各4拍。ミュート変奏は4拍目裏の2つ目の答えを置き換え、追加の音や次のルートのずれを作りません。',
 '88 BPM弹Am7–D7–Gmaj7–Cmaj7：根音第一拍、第二前半休止后半五音、第三休止、第四及后半两个八分回答。E2/A2/D2/G2五音含第二及第四小节高八度变化。各四拍，闷击变奏替换4后半第二个回答，不额外加入起音或移动下个根音。'],
'guitar-target-lighthouse':[
 'At 86 BPM over Am7–D7–Gmaj7–Cmaj7, thirds C4/F#4/B3/E4 start each four-beat bar and last two beats. Rest the first half of 3, then three G-major eighths on 3-and/4/4-and lead to the NEXT third: D4–E4–G4, A3–C4–D4, C4–D4–F#4, G3–A3–B3. The final B3 leads to opening C4 when the loop repeats. Start after a count-in; keep each third longer than every approach.',
 'A 86 BPM sobre Am7–D7–Gmaj7–Cmaj7, terças C4/F#4/B3/E4 iniciam cada compasso de quatro tempos por dois. Pause a primeira metade do 3; três colcheias de sol maior em contratempo 3/4/contratempo 4 levam à PRÓXIMA terça: D4–E4–G4, A3–C4–D4, C4–D4–F#4, G3–A3–B3. B3 final leva ao C4 inicial ao repetir. Comece após contagem, mantendo cada terça mais longa que as preparações.',
 'A 86 BPM sobre Am7–D7–Gmaj7–Cmaj7, terceras C4/F#4/B3/E4 inician cada compás de cuatro pulsos durante dos. Calla primera mitad de 3; tres corcheas de sol mayor en 3-y/4/4-y llevan a la SIGUIENTE tercera: D4–E4–G4, A3–C4–D4, C4–D4–F#4, G3–A3–B3. B3 final lleva al C4 inicial al repetir. Empieza tras contar y sostén cada tercera más que sus entradas.',
 'Bei 86 BPM über Am7–D7–Gmaj7–Cmaj7 beginnen Terzen C4/F#4/B3/E4 jeden Vierschlagtakt zwei Schläge lang. Pause erste Hälfte 3; drei G-Dur-Achtel auf 3-und/4/4-und zur NÄCHSTEN Terz: D4–E4–G4, A3–C4–D4, C4–D4–F#4, G3–A3–B3. Letztes B3 führt im Loop zum ersten C4. Beginne nach dem Einzähler und halte jede Terz länger als den Auftakt. International B bedeutet H.',
 '86 BPMのAm7–D7–Gmaj7–Cmaj7で3度C4/F#4/B3/E4を各4拍小節頭に2拍保ちます。3拍目前半休符、裏・4・4拍目裏のGメジャー8分3音D4–E4–G4、A3–C4–D4、C4–D4–F#4、G3–A3–B3で次の3度へ。末尾B3は繰り返しのC4へ進みます。カウント後始め、3度を準備音より長く保ちます。',
 '86 BPM弹Am7–D7–Gmaj7–Cmaj7，三音C4/F#4/B3/E4在各四拍小节头两拍。第三前半休止，3后半/4/4后半三个G大调八分音D4–E4–G4、A3–C4–D4、C4–D4–F#4、G3–A3–B3进入下个三音。末B3在循环时接开头C4，预数后开始，三音比准备音长。'],
'piano-hands-crossing':[
 'At 72 BPM in G major, alternate RH/LH/RH/LH across four bars. RH uses G4–A4–B4–A4 as four eighths, then holds D5 through 3–4; LH answers G3–A3–B3–A3 in eighths, holding D4 through 3–4. The reference is 16 beats, with matching A endings before each held D. These are handoffs in separate registers, not simultaneous contrary motion. Release the old hand when the next starts; repeat twice for eight bars.',
 'A 72 BPM em sol maior, alterne direita/esquerda/direita/esquerda em quatro compassos. Direita usa G4–A4–B4–A4 em quatro colcheias e sustenta D5 em 3–4; esquerda responde G3–A3–B3–A3 em colcheias e sustenta D4 em 3–4. São 16 tempos, A igual antes de cada D longo. É troca em registros separados, não movimento contrário simultâneo. Solte a mão anterior na entrada da próxima e repita duas vezes para oito compassos.',
 'A 72 BPM en sol mayor, alterna derecha/izquierda/derecha/izquierda cuatro compases. Derecha G4–A4–B4–A4 en cuatro corcheas y D5 sostenido en 3–4; izquierda G3–A3–B3–A3 en corcheas y D4 en 3–4. Son 16 pulsos, mismo final A antes del D largo. Relevos en registros separados, no movimiento contrario simultáneo. Suelta la mano anterior al entrar la siguiente y repite dos veces para ocho compases.',
 'Bei 72 BPM in G-Dur rechts/links/rechts/links über vier Takte. Rechts G4–A4–B4–A4 als vier Achtel, D5 auf 3–4 gehalten; links G3–A3–B3–A3 als Achtel, D4 auf 3–4 gehalten. 16 Schläge mit gleichem A vor jedem langen D. Handwechsel in getrennten Registern, keine gleichzeitige Gegenbewegung. Löse die vorige Hand beim nächsten Einsatz; zweimal ergibt acht Takte. International B bedeutet H.',
 'Gメジャー72 BPMで右/左/右/左の4小節。右G4–A4–B4–A4は8分4つ、D5を3～4拍保ちます。左G3–A3–B3–A3も8分でD4を3～4拍。計16拍で各長いD直前のAも一致します。別音域での交代で同時の反行ではありません。次の手の開始で前を離し、2回で8小節です。',
 'G大调72 BPM，四小节右/左/右/左。右G4–A4–B4–A4四个八分、D5保持3–4；左G3–A3–B3–A3八分、D4保持3–4。共16拍，每个长D前A一致。是独立音域换手，不是同时反向。下一手起音时松前手，重复两遍为八小节。'],
'piano-lane-cross':[
 'At 72 BPM in G major, bar 1 pairs LH G2–D3–G3 with RH B3–C4–D4 for 1+1+2 beats. Bar 2 keeps LH and moves RH to B4–C5–D5 for 1+1+2. Bar 3 returns RH B3–C4–D4 while LH rises to G3–D4–G4, still 1+1+2: the hands cross in register on beats 2–4, so rehearse this slowly and release before each new pair. Bar 4 plays four quarter pairs [G2,D4], [D3,C4], [G3,B3], [G2,G4], resolving both voices to G. It is 16 beats; LH does NOT play four independent quarters in bars 1–3.',
 'A 72 BPM em sol maior, o compasso 1 junta esquerda G2–D3–G3 e direita B3–C4–D4 por 1+1+2 tempos. O compasso 2 mantém esquerda e sobe direita a B4–C5–D5 por 1+1+2. O compasso 3 volta direita B3–C4–D4 e sobe esquerda G3–D4–G4 no mesmo ritmo: mãos cruzam o registro em 2–4; ensaie devagar e solte antes do próximo par. O compasso 4 toca quatro pares de semínima [G2,D4], [D3,C4], [G3,B3], [G2,G4], resolvendo ambas em G. São 16 tempos; esquerda NÃO faz quatro semínimas independentes em 1–3.',
 'A 72 BPM en sol mayor, el 1 une izquierda G2–D3–G3 y derecha B3–C4–D4 durante 1+1+2 pulsos. El 2 mantiene izquierda y sube derecha a B4–C5–D5, 1+1+2. El 3 devuelve derecha B3–C4–D4 y sube izquierda G3–D4–G4 con igual ritmo: manos cruzan registro en 2–4; ensaya lento y suelta antes del próximo par. El 4 toca cuatro pares de negra [G2,D4], [D3,C4], [G3,B3], [G2,G4], ambas a G. Son 16 pulsos; izquierda NO toca cuatro negras independientes en 1–3.',
 'Bei 72 BPM in G-Dur paart Takt 1 links G2–D3–G3 und rechts B3–C4–D4 für 1+1+2 Schläge. Takt 2 behält links und hebt rechts zu B4–C5–D5, 1+1+2. Takt 3 kehrt rechts zurück und hebt links zu G3–D4–G4 bei gleichem Rhythmus: Registerkreuzung auf 2–4; übe langsam und löse vor jedem Paar. Takt 4 hat vier Viertelpaare [G2,D4], [D3,C4], [G3,B3], [G2,G4], beide Stimmen auf G. 16 Schläge; links spielt in 1–3 NICHT vier unabhängige Viertel. International B bedeutet H.',
 'Gメジャー72 BPMの1小節は左G2–D3–G3、右B3–C4–D4を1+1+2拍。2小節は左を保ち右B4–C5–D5へ同リズム。3小節は右を戻し左G3–D4–G4へ、2～4拍で手の音域が交差します。ゆっくり各ペア前に離します。4小節は[G2,D4]、[D3,C4]、[G3,B3]、[G2,G4]の4分ペアで両声Gへ解決。計16拍で、左は1～3小節で独立した4分4つではありません。',
 'G大调72 BPM，第一左G2–D3–G3与右B3–C4–D4配对1+1+2拍；第二左不变、右高B4–C5–D5同节奏；第三右回、左高G3–D4–G4，2–4拍手的音域交叉，慢练并在新双音前松开。第四四分双音[G2,D4]、[D3,C4]、[G3,B3]、[G2,G4]双声解决G。共16拍，前三小节左手并非四个独立四分音符。'],
'guitar-position-comet-lift':[
 'At 86 BPM in G major, the two-bar reference starts low G2–A2–B2–D3 on strings 6/5. Slide D3 at 5:5 to E3 at 5:7, then F#3/G3/A3 in the seventh-position region 7–10 on strings 5/4. Return G3–F#3–E3–D3–B2–A2–G2. All notes are eighths EXCEPT final G2 held one beat, completing eight beats. Do not add a second A3 at the peak. Repeat twice for four bars; prepare hand movement without sustaining a wide stretch.',
 'A 86 BPM em sol maior, a referência de dois compassos começa G2–A2–B2–D3 grave nas cordas 6/5. Deslize D3 em 5:5 a E3 em 5:7 e siga F#3/G3/A3 na região 7–10 das cordas 5/4. Volte G3–F#3–E3–D3–B2–A2–G2. Tudo é colcheia EXCETO G2 final por um tempo, completando oito. Não repita A3 no topo. Repita duas vezes para quatro compassos e mova a mão sem sustentar abertura ampla.',
 'A 86 BPM en sol mayor, la referencia de dos compases empieza G2–A2–B2–D3 bajo en cuerdas 6/5. Desliza D3 en 5:5 a E3 en 5:7 y sigue F#3/G3/A3 en región 7–10 de cuerdas 5/4. Vuelve G3–F#3–E3–D3–B2–A2–G2. Todo corcheas EXCEPTO G2 final un pulso, completando ocho. No repitas A3 arriba. Dos repeticiones son cuatro compases; mueve la mano sin abertura sostenida.',
 'Bei 86 BPM in G-Dur beginnt die Zweitaktvorlage tief G2–A2–B2–D3 auf Saiten 6/5. Slide D3 auf 5:5 zu E3 auf 5:7, dann F#3/G3/A3 in Region 7–10 auf Saiten 5/4. Zurück G3–F#3–E3–D3–B2–A2–G2. Alles Achtel AUSSER letztem G2 einen Schlag, insgesamt acht. Verdopple A3 am Gipfel nicht. Zweimal ergibt vier Takte; verschiebe ohne Haltedehnung. International B bedeutet H.',
 'Gメジャー86 BPMの2小節例は第6/5弦の低G2–A2–B2–D3。5:5のD3から5:7のE3へスライド、第5/4弦7～10でF#3/G3/A3。G3–F#3–E3–D3–B2–A2–G2へ戻ります。全て8分、ただし最後G2は1拍で計8拍。頂点A3を二度鳴らしません。2回で4小節、広い開きを保たず移動します。',
 'G大调86 BPM两小节，从第6/5弦低G2–A2–B2–D3开始。5:5的D3滑至5:7的E3，再第5/4弦7–10品F#3/G3/A3。返回G3–F#3–E3–D3–B2–A2–G2。均八分，只有末G2一拍，共八拍。顶点A3不重复，两遍为四小节，移手而非持续撑宽。'],
'bass-fifth-pocket-switch':[
 'At 82 BPM over Am7–D7–Gmaj7–Cmaj7, play root/third/fifth on 1/2/3, all ONE beat, followed by a full beat 4 rest. Fifth targets are E2/A2/D2/G2. The reference has four equal four-beat bars; warm tone does not mean a longer written duration. On another pass replace only the last half of the rest with an upper-root eighth on 4-and; keep the fifth on 3 and next root on 1.',
 'A 82 BPM sobre Am7–D7–Gmaj7–Cmaj7, fundamental/terça/quinta em 1/2/3, todas de UM tempo, e pausa inteira 4. Quintas-alvo E2/A2/D2/G2. A referência tem quatro compassos iguais de quatro tempos; som quente não significa duração escrita maior. Em outra rodada, substitua só a metade final da pausa por fundamental aguda em colcheia no contratempo 4, preservando quinta 3 e próxima fundamental 1.',
 'A 82 BPM sobre Am7–D7–Gmaj7–Cmaj7, raíz/tercera/quinta en 1/2/3, todas UN pulso y silencio completo 4. Quintas E2/A2/D2/G2. Cuatro compases iguales; tono cálido no significa más duración escrita. En otra pasada sustituye solo mitad final del silencio con raíz alta de corchea en 4-y, conservando quinta 3 y próxima raíz 1.',
 'Bei 82 BPM über Am7–D7–Gmaj7–Cmaj7 Grundton/Terz/Quinte auf 1/2/3 je EINEN Schlag, volle Pause 4. Quintenziele E2/A2/D2/G2. Vier gleich lange Vierschlagtakte; warmer Klang bedeutet keine längere notierte Dauer. Ersetze später nur die letzte Pausenhälfte mit einer oberen Grundtonachtel auf 4-und; Quinte 3 und nächster Grundton 1 bleiben. International B bedeutet H.',
 '82 BPMのAm7–D7–Gmaj7–Cmaj7でルート/3度/5度を1/2/3に各1拍、4全休符。目標5度E2/A2/D2/G2の4拍小節4つです。暖かな音色は長さを増やすことではありません。別の通しで休符後半のみを裏の高いルート8分に替え、5度3、次ルート1を保ちます。',
 '82 BPM弹Am7–D7–Gmaj7–Cmaj7，根音/三音/五音在1/2/3各一拍，4整拍休止。五音目标E2/A2/D2/G2，四个等长四拍小节。温暖音色不代表延长书写时值，另遍只将休止后半换高根音八分于4后半，五音3和下根音1不变。'],
})

R3_EXTRA_TEXT={
'piano-hands-crossing':{'range':'G3-D5','rightHand':'G4-A4-B4-A4 eighths then D5 for 2 beats','leftHand':'G3-A3-B3-A3 eighths then D4 for 2 beats','passNote':'Release held D5/D4 when next G3/G4 begins','sequence':'RH/LH/RH/LH, four beats per bar'},
'piano-lane-cross':{'hands':'LH/RH simultaneous pairs; actual register crossing in bar 3','registers':'LH G2-D3-G3 then G3-D4-G4; RH B3-C4-D4 then B4-C5-D5','pattern':'bars 1–3: 1+1+2 beats per pair; bar 4: four quarter-note pairs'},
'piano-sixth-handoff-switch':{'hands':'RH/LH/RH/LH; reverse on next pass','registers':'C4-E5','pattern':'four quarter notes per bar; release before handoff'},
}
R3_ADDITIONS={
'piano-sixth-handoff-switch':[
 'F natural is the MINOR sixth (flat 13) over Am7, an Aeolian color. The later F# belongs to D7 as its major third; it is not an instruction to play F# over Am7. B, E and A are major sixths over D, G and C respectively. The reference intentionally changes harmonic context.',
 'F natural é a sexta MENOR (bemol 13) sobre Am7, cor eólia. F# depois pertence a D7 como terça maior; não manda tocar F# em Am7. B, E e A são sextas maiores de D, G e C. A referência muda o contexto harmônico de propósito.',
 'F natural es sexta MENOR (bemol 13) sobre Am7, color eólico. El F# posterior es tercera mayor de D7, no una indicación de F# sobre Am7. B, E y A son sextas mayores de D, G y C. La referencia cambia contexto armónico deliberadamente.',
 'F natürlich ist die KLEINE Sexte (b13) über Am7, eine äolische Farbe. Das spätere F# ist die große Terz von D7, keine Anweisung für F# über Am7. Internationales B, E, A sind große Sexten über D, G, C. Die Vorlage wechselt bewusst den harmonischen Kontext.',
 'Am7のFナチュラルは短6度（b13）のエオリアン色です。後のF#はD7の長3度で、Am7でF#を弾く指示ではありません。B、E、AはD、G、C上の長6度です。例は和声の文脈を意図的に変えています。',
 'Am7的F自然是小六度（b13）伊奥利亚色彩。后面的F#是D7大三度，不是让Am7弹F#。B、E、A分别是D、G、C上的大六度。范例有意改变和声语境。'],
'guitar-third-step-staircase-20260926':[
 'The three pair/rest cells take six beats. The written card adds TWO more silent beats at the end to complete two 4/4 bars. Count beats 3–4 of that second bar before repeating C–E on the next 1; do not loop a six-beat fragment as if it were two full bars.',
 'As três células de par/pausa duram seis tempos. O cartão acrescenta MAIS DOIS tempos silenciosos no final para fechar dois compassos 4/4. Conte 3–4 do segundo antes de voltar a C–E no próximo 1; não trate o fragmento de seis tempos como dois compassos completos.',
 'Las tres células de par/silencio duran seis pulsos. La tarjeta añade DOS silencios más al final para completar dos compases 4/4. Cuenta 3–4 del segundo antes de repetir C–E en el próximo 1; el fragmento de seis no son dos compases completos.',
 'Die drei Paar/Pausen-Zellen dauern sechs Schläge. Die Karte fügt am Ende ZWEI weitere Pausenschläge für zwei 4/4-Takte hinzu. Zähle 3–4 des zweiten Taktes, bevor C–E auf der nächsten 1 beginnt; sechs Schläge sind keine zwei vollen Takte.',
 '3つのペア・休符セルは6拍。書かれたカードは末尾にさらに2拍休み、4/4の2小節を完成します。2小節目の3～4拍目を数えて次の1でC–Eを再開し、6拍だけを2つの完全小節としてループしません。',
 '三个双音/休止单元共六拍，卡片末尾另加两拍休止补满两个4/4小节。数第二小节3–4，再下一1重复C–E，不把六拍片段当两个完整小节循环。'],
'guitar-late-launch-switch':[
 'The written excerpt is two full bars plus a two-beat E4 landing, ten beats. D4 is the single eighth pickup on bar 2 beat 4-and; E4 starts bar 3 on 1. Repeat this excerpt as separate attempts, or continue your eight-bar composition without restarting its count-in.',
 'O trecho escrito tem dois compassos completos e chegada E4 de dois tempos, dez no total. D4 é a única colcheia de preparação no contratempo 4 do compasso 2; E4 começa o compasso 3 no 1. Repita como tentativas separadas ou continue a composição de oito compassos sem reiniciar a contagem.',
 'El fragmento tiene dos compases completos y llegada E4 de dos pulsos, diez en total. D4 es la única entrada de corchea en 4-y del compás 2; E4 inicia 3 en 1. Repite como intentos separados o sigue la composición de ocho sin reiniciar la cuenta.',
 'Der Ausschnitt hat zwei vollständige Takte plus zwei Schläge E4-Ankunft, insgesamt zehn. D4 ist das einzige Auftaktachtel auf 4-und von Takt 2; E4 beginnt Takt 3 auf 1. Wiederhole getrennte Versuche oder führe deine Achttaktkomposition ohne neuen Einzähler fort.',
 '例は完全な2小節とE4の着地2拍、計10拍。D4は2小節目4拍目裏の8分準備音1つ、E4は3小節目1拍目開始です。別々の試行として繰り返すか、カウントをやり直さず8小節の自作を続けます。',
 '片段为两个完整小节加E4两拍着陆，共十拍。D4是第二小节4后半唯一八分准备，E4在第三小节1开始。按独立尝试重复，或继续八小节自作而不重新预数。'],
}
R3_NINTH_BOSS=[
 'Boss round: complete six written loops with each ninth starting on beat 1 for two beats, middle note for half a beat and final note for 1.5. After that checkpoint, try an offbeat variation: add a half-beat opening rest and shorten ONLY the first ninth to 1.5 beats, preserving the other durations and four-beat bar. Drop to 56 BPM if needed.',
 'Rodada chefão: complete seis ciclos escritos, nona no 1 por dois tempos, nota central por meio e final por 1.5. Depois da verificação, tente variação em contratempo: acrescente meia pausa inicial e encurte SÓ a nona inicial para 1.5, preservando as outras durações e quatro tempos. Reduza a 56 BPM se necessário.',
 'Ronda jefe: seis ciclos escritos, novena en 1 dos pulsos, nota central medio y final 1.5. Tras comprobar, variante a contratiempo: medio silencio inicial y acorta SOLO la novena inicial a 1.5, manteniendo otras duraciones y cuatro pulsos. Baja a 56 BPM si hace falta.',
 'Boss-Runde: sechs notierte Loops mit None auf 1 zwei Schläge, mittlerem Ton einen halben und letztem 1.5. Nach der Prüfung Offbeatvariante: halbe Anfangspause und NUR die erste None auf 1.5 kürzen; andere Dauern und vier Schläge bleiben. Bei Bedarf 56 BPM.',
 'ボスでは9度を1拍目に2拍、中間半拍、最後1.5拍で例を6周します。確認後の裏拍変奏は冒頭半拍休符を加え、最初の9度だけ1.5拍へ短縮。他の長さと各4拍を保ち、必要なら56 BPMです。',
 '挑战先按范例六轮：九音第一拍两拍，中音半拍、末音1.5拍。检查后试反拍变奏，开头加半拍休止，只把首九音缩至1.5拍，其余时长及四拍小节不变。必要时56 BPM。',
]

# Directed closure review. Only periscope and the missing G-C cell change music.
R3_SCORES['bass-backbeat-periscope']=['D2 -/0.5 F2/0.5 A2 - G1 -/0.5 B1/0.5 D2 - C2 -/0.5 E2/0.5 G2 - A1 -/0.5 C#2/0.5 E2 -']
R3_POSITIONS['bass-backbeat-periscope']='3:5 - 3:8 2:7 - 4:3 - 4:7 3:5 - 4:8 - 3:7 2:5 - 4:5 - 3:4 3:7 -'
R3_SCORES['guitar-fourth-compass-lift']=[
 'D3 G3 F#3 E3 E3 A3 G3 F#3 F#3 B3 A3 G3 G3 C4 B3 A3',
 'D3 G3 F#3 E3 A3 G3 F#3 E3 F#3 B3 A3 G3 A3 G3 F#3 D3',
]
R3_POSITIONS['guitar-fourth-compass-lift']='5:5 4:5 5:9 5:7 5:7 4:7 4:5 5:9 5:9 4:9 4:7 4:5 4:5 3:5 4:9 4:7'
R4_B_H={
 'guitar-chromatic-third-doors-20260925','guitar-third-shift-cipher',
 'guitar-offbeat-motif-relay-20260927','guitar-fourth-compass-lift',
 'bass-backbeat-periscope','bass-beat-two-scout','guitar-guide-tone-switchback',
 'guitar-half-step-landing-bridge','guitar-late-launch-switch','guitar-open-string-cutoff-20260929',
}
R4_SUMMARIES={
 'guitar-dovetail-shift':[
  'Connect two octave-separated G-major routes with matching rhythm and a counted silent handoff.',
  'Conecte duas rotas de sol maior separadas por oitava, com ritmo igual e troca durante a pausa contada.',
  'Conecta dos rutas de sol mayor separadas por una octava, con igual ritmo y relevo durante el silencio contado.',
  'Verbinde zwei um eine Oktave getrennte G-Dur-Wege mit gleichem Rhythmus und Übergang in der gezählten Pause.',
  '1オクターブ離れた2つのGメジャーの経路を、同じリズムと数える休符での受け渡しでつなぎます。',
  '连接相隔一八度的两条G大调路线，保持相同节奏，并在数拍休止中交接。'],
 'guitar-target-lighthouse':[
  'Hold each chord third on beat 1, then prepare the next target with three eighth notes.',
  'Sustente a terça de cada acorde no tempo 1 e prepare o próximo alvo com três colcheias.',
  'Sostén la tercera de cada acorde en el pulso 1 y prepara el siguiente objetivo con tres corcheas.',
  'Halte jede Akkordterz auf Schlag 1 und bereite das nächste Ziel mit drei Achteln vor.',
  '各コードの3度を1拍目に保ち、3つの8分音符で次の目標を準備します。',
  '把各和弦三音保持在第一拍，再用三个八分音符准备下个目标。'],
}
R4_SUMMARIES['guitar-resolution-catapult']=[
 'Prepare each chord fifth with two eighth notes and land on beat 1 for two beats.',
 'Prepare a quinta de cada acorde com duas colcheias e chegue no tempo 1 por dois tempos.',
 'Prepara la quinta de cada acorde con dos corcheas y llega al pulso 1 durante dos pulsos.',
 'Bereite jede Akkordquinte mit zwei Achteln vor und lande auf Schlag 1 für zwei Schläge.',
 '2つの8分音符で各コードの5度を準備し、1拍目に2拍保ちます。',
 '以两个八分音符准备各和弦五音，在第一拍保持两拍。',
]
R3_ADDITIONS['bass-backbeat-periscope']=[
 'The written reference is Round 1: each four-beat bar leaves ALL of beat 4 silent. In Round 3 only, replace the last half of that rest with an eighth pickup on 4-and, using F1, B1, G1 or C#2 below the NEXT roots G1, C2, A1 or D2. Keep the first half of 4 silent and the next root on 1; the optional pickup never adds a beat.',
 'A referência escrita é a Rodada 1: cada compasso de quatro tempos deixa TODO o tempo 4 em silêncio. Só na Rodada 3, substitua a última metade da pausa por uma colcheia no contratempo do 4, usando F1, B1, G1 ou C#2 abaixo das PRÓXIMAS fundamentais G1, C2, A1 ou D2. Mantenha a primeira metade do 4 silenciosa e a próxima fundamental no 1; a preparação opcional não acrescenta tempo.',
 'La referencia escrita es la Ronda 1: cada compás de cuatro pulsos deja TODO el pulso 4 en silencio. Solo en Ronda 3 sustituye su última mitad por una corchea en 4-y, con F1, B1, G1 o C#2 debajo de las SIGUIENTES raíces G1, C2, A1 o D2. La primera mitad de 4 sigue callada y la próxima raíz en 1; la entrada opcional no añade un pulso.',
 'Die notierte Vorlage ist Runde 1: jeder Vierschlagtakt lässt den GANZEN Schlag 4 frei. Ersetze nur in Runde 3 die letzte Pausenhälfte durch ein Achtel auf 4-und: F1, B1, G1 oder C#2 unter den NÄCHSTEN Grundtönen G1, C2, A1 oder D2. Die erste Hälfte von 4 bleibt Pause, der nächste Grundton auf 1; der optionale Auftakt fügt keinen Schlag hinzu.',
 '書かれた例はラウンド1で、各4拍小節の4拍目全体を休みます。ラウンド3だけで休符後半を裏の8分準備音に替え、次のG1、C2、A1、D2より下のF1、B1、G1、C#2を使います。4拍目前半は休み、次のルートは1拍目のまま。任意の準備音で拍を追加しません。',
 '书写范例是第一轮，每个四拍小节的第四拍整拍休止。只在第三轮把休止后半换成第四拍后半的八分准备音，F1、B1、G1、C#2位于下个根音G1、C2、A1、D2下方。第四拍前半仍休止，下个根音仍在第一拍；可选准备不增加拍数。',
]
R4_SIXTH_CMAJ=[
 ' In the fourth cell over Cmaj7, opening F4 is the natural 11 (perfect fourth), NOT a sixth or a Cmaj7 chord tone. It is diatonic passing tension in the real F4–G4–A4 walk; A is the major sixth/13 landing. F is a semitone above the chord third E, so hear its tension and continue to G and A rather than treating F as a settled chord target.',
 ' Na quarta célula sobre Cmaj7, o F4 inicial é a 11 natural (quarta justa), NÃO uma sexta nem nota do acorde Cmaj7. É tensão diatônica de passagem na caminhada real F4–G4–A4; A é a chegada de sexta maior/13. F fica um semitom acima da terça E: ouça a tensão e siga para G e A, sem tratá-lo como alvo estável do acorde.',
 ' En la cuarta célula sobre Cmaj7, F4 inicial es la 11 natural (cuarta justa), NO una sexta ni nota del acorde Cmaj7. Es tensión diatónica de paso en el recorrido F4–G4–A4; A es la llegada de sexta mayor/13. F está un semitono sobre la tercera E: escucha esa tensión y sigue a G y A, sin tratar F como objetivo estable.',
 ' In der vierten Zelle über Cmaj7 ist das erste F4 die natürliche 11 (reine Quarte), KEINE Sexte und kein Cmaj7-Akkordton. Es ist diatonische Durchgangsspannung im wirklichen Weg F4–G4–A4; A ist das Ziel als große Sexte/13. F liegt einen Halbton über der Akkordterz E: höre die Spannung und gehe zu G und A, statt F als ruhenden Akkordzielton zu behandeln.',
 ' Cmaj7の4つ目のセルの冒頭F4はナチュラル11（完全4度）で、6度でもCmaj7の和声音でもありません。実際のF4–G4–A4の進行で全音階の経過緊張となり、Aが長6度/13の着地です。Fは和音の3度Eより半音上。緊張を聴いてGとAへ進み、Fを安定した和音目標と考えません。',
 ' Cmaj7上的第四单元开头F4是自然11（纯四度），不是六音，也不是Cmaj7和弦音。它在实际F4–G4–A4路线中作自然音阶经过张力，A才是大六度/13目标。F比和弦三音E高半音，应听其张力并继续G及A，不把F当稳定和弦目标。',
]
R3_ADDITIONS['piano-sixth-handoff-switch']=[body+tail for body,tail in zip(R3_ADDITIONS['piano-sixth-handoff-switch'],R4_SIXTH_CMAJ)]
R4_ADDITION_PREFIX={
 'piano-sixth-handoff-switch':['F natural is the MINOR sixth','F natural é a sexta MENOR','F natural es sexta MENOR','F natürlich ist die KLEINE Sexte','Am7のFナチュラルは短6度','Am7的F自然是小六度'],
 'guitar-late-launch-switch':['The written excerpt is','O trecho escrito tem','El fragmento tiene','Der Ausschnitt hat','例は完全な2小節','片段为两个完整小节'],
 'guitar-third-step-staircase-20260926':['The three pair/rest cells','As três células de par/pausa','Las tres células de par/silencio','Die drei Paar/Pausen-Zellen','3つのペア・休符セル','三个双音/休止单元'],
 'bass-backbeat-periscope':['The written reference is Round 1','A referência escrita é a Rodada 1','La referencia escrita es la Ronda 1','Die notierte Vorlage ist Runde 1','書かれた例はラウンド1','书写范例是第一轮'],
}

def final_closure_text(lesson_id,text):
    if lesson_id=='bass-fifth-pocket-detour':return text
    locales=['en','pt-BR','es','de','ja','zh-Hans']
    if lesson_id in R4_SUMMARIES:
        for locale,value in zip(locales,R4_SUMMARIES[lesson_id]):
            text=re.sub(r'^summary\.'+re.escape(locale)+r':.*$',lambda _:f'summary.{locale}: {value}',text,count=1,flags=re.M)
    if lesson_id=='guitar-chromatic-third-bridge':
        text=re.sub(r'^summary\.ja:.*$', 'summary.ja: 半音下の隣接音を使い、各コードの3度へスケールフレーズを着地させます。',text,count=1,flags=re.M)
        text=text.replace('summary.pt-BR: Use a vizinho cromático inferior','summary.pt-BR: Use um vizinho cromático inferior')
    if lesson_id=='guitar-resolution-catapult':text=text.replace('title: Seventh-position target lane','title: Fifth-target route · frets 5–10')
    if lesson_id=='guitar-dorian-target-ladder':text=text.replace('title: Two-position ladder','title: One-position Dorian ladder')
    # Only exact known corruptions in existing prose; no broad numeric-spacing
    # heuristic may split accidentals, ordinals, chord names or decimal values.
    for locale in locales:
        pattern=r'(:::locale '+re.escape(locale)+r'\n)(.*?)(?=:::locale |:::endlocalized)'
        def repair(match,locale=locale):
            body=match[2]
            for old,new in [('7 th position','7th position'),('Bb 2','Bb2'),('C–E1.5 Schläge','C–E für 1.5 Schläge')]:body=body.replace(old,new)
            if lesson_id=='guitar-fourth-compass-lift':
                separator='、' if locale in ['ja','zh-Hans'] else ', '
                body=body.replace('F#-B-A-G**','F#-B-A-G'+separator+'G-C-B-A**')
            if locale=='de' and lesson_id in R4_B_H:
                note='Internationale Notennamen: B bedeutet H; Bb bedeutet B.'
                if note not in body:
                    checkpoint=re.search(r'^:::checkpoint ',body,re.M)
                    if checkpoint:body=body[:checkpoint.start()].rstrip()+'\n\n'+note+'\n\n'+body[checkpoint.start():]
                    else:body=body.rstrip()+'\n\n'+note+'\n\n'
            return match[1]+body
        text=re.sub(pattern,repair,text,count=1,flags=re.S)
    return text

def normalize_final_prose(value, locale):
    """Prose literals are authored with spaces; preserve pitch tokens and ordinals."""
    return value

def final_minor_prose(lesson_id,text):
    if lesson_id in R3_ADDITIONS or lesson_id in ['guitar-ninth-color-compass','bass-backbeat-periscope']:
        for locale in ['en','pt-BR','es','de']:
            pattern=r'(:::locale '+re.escape(locale)+r'\n)(.*?)(?=:::locale |:::endlocalized)'
            text=re.sub(pattern,lambda m,locale=locale:m[1]+normalize_final_prose(m[2],locale),text,count=1,flags=re.S)
    if lesson_id in R3_ADDITIONS:
        for locale,addition in zip(['en','pt-BR','es','de','ja','zh-Hans'],R3_ADDITIONS[lesson_id]):
            addition=normalize_final_prose(addition,locale)
            pattern=r'(:::locale '+re.escape(locale)+r'\n)(.*?)(?=:::locale |:::endlocalized)'
            def append(match,addition=addition):
                body=match[2]
                index=['en','pt-BR','es','de','ja','zh-Hans'].index(locale)
                prefix=R4_ADDITION_PREFIX.get(lesson_id,[None]*6)[index]
                if prefix:
                    body='\n\n'.join(p for p in body.split('\n\n') if not p.lstrip().startswith(prefix))
                elif addition in body:return match[0]
                return match[1]+body.rstrip()+'\n\n'+addition+'\n\n'
            text=re.sub(pattern,append,text,count=1,flags=re.S)
    if lesson_id=='guitar-ninth-color-compass':
        for locale,paragraph in zip(['en','pt-BR','es','de','ja','zh-Hans'],R3_NINTH_BOSS):
            pattern=r'(:::locale '+re.escape(locale)+r'\n)(.*?)(?=:::locale |:::endlocalized)'
            def replace(match,paragraph=paragraph,locale=locale):
                body=match[2]
                old=next((p for p in body.split('\n\n') if any(p.startswith(x) for x in ['Boss round:','Rodada chefão:','Ronda jefe:','Boss-Runde:','ボスラウンド','挑战轮：','ボスでは','挑战先'])),None)
                if old is None:raise ValueError('Missing ninth boss '+locale)
                paragraph=normalize_final_prose(paragraph,locale)
                return match[1]+body.replace(old,paragraph,1)
            text=re.sub(pattern,replace,text,count=1,flags=re.S)
    if lesson_id=='bass-backbeat-periscope':
        for old,new in [('leave beat 2 empty','leave the first half of beat 2 empty'),('deixe o tempo 2 vazio','deixe a primeira metade do tempo 2 vazia'),('deixe o tempo 2 em silêncio','deixe a primeira metade do tempo 2 em silêncio'),('deja el tiempo 2 vacío','deja la primera mitad del tiempo 2 vacía'),('lasse Schlag 2 leer','lasse die erste Hälfte von Schlag 2 leer'),('2拍目を空け','2拍目前半を空け'),('2拍目は空け','2拍目前半は空け'),('第2拍留空','第2拍前半留空')]:text=text.replace(old,new)
    return text

R3_NOTATION = [
 'Read the written reference in quarter-note beats: /0.5 is an eighth, /2 holds two beats, “-” is silence and brackets mean simultaneous notes. Count every rest at the same pulse. The total below includes the specified counted silence.',
 'Leia a referência em tempos de semínima: /0.5 é colcheia, /2 sustenta dois tempos, “-” é silêncio e colchetes são notas simultâneas. Conte cada pausa no mesmo pulso. O total abaixo inclui o silêncio contado indicado.',
 'Lee la referencia en pulsos de negra: /0.5 es corchea, /2 sostiene dos pulsos, “-” es silencio y corchetes son notas simultáneas. Cuenta cada silencio al mismo pulso. El total incluye el silencio contado indicado.',
 'Lies die Vorlage in Viertelschlägen: /0.5 ist ein Achtel, /2 hält zwei Schläge, “-” ist Pause, Klammern sind gleichzeitige Töne. Zähle jede Pause im gleichen Puls. Die Summe enthält die angegebenen gezählten Pausen.',
 '例は4分音符を1拍とし、/0.5は8分音符、/2は2拍、-は休符、角括弧は同時の音です。休符も同じ拍で数えます。下の合計には指定された休符を含みます。',
 '范例以四分音符为一拍，/0.5是八分音符，/2保持两拍，-是休止，方括号表示同时音。休止也按同一脉冲数拍。下列合计包含指定的数拍休止。',
]
R3_LABELS = ['Written reference {index}: {beats} beats.','Referência escrita {index}: {beats} tempos.','Referencia escrita {index}: {beats} pulsos.','Notierte Vorlage {index}: {beats} Schläge.','例{index}：{beats}拍。','书写范例{index}：{beats}拍。']
R3_CHECKPOINT = [
 'Perform the specified reference twice without the demonstration, preserving its target notes, durations, rests and route. Record the result and name one transition that needs another slow attempt.',
 'Toque a referência indicada duas vezes sem demonstração, mantendo alvos, durações, pausas e rota. Registre o resultado e nomeie uma transição que precise de outra tentativa lenta.',
 'Toca la referencia dos veces sin demostración, conservando objetivos, duraciones, silencios y ruta. Registra el resultado y nombra una transición que necesite otro intento lento.',
 'Spiele die angegebene Vorlage zweimal ohne Demo, mit ihren Zieltönen, Dauern, Pausen und Wegen. Dokumentiere das Ergebnis und einen Übergang für einen weiteren langsamen Versuch.',
 '指定の例をデモなしで2回弾き、目標音・長さ・休符・経路を保ちます。結果と、もう一度ゆっくり試す移動を記録します。',
 '不听示范弹指定范例两遍，保留目标、时长、休止及路线。记录结果，指出一个需再次慢练的衔接。',
]

def refine_final_candidate(lesson_id, text):
    """Pure final directed candidate repair; sources/evidence/approval untouched."""
    if lesson_id == 'bass-fifth-pocket-detour': return text
    def update(kind, values, occurrence=0):
        nonlocal text
        index=0
        def body(match):
            nonlocal index
            at=index; index+=1
            if at!=occurrence:return match[0]
            f=fields(match[1]);f.update(values)
            return '```'+kind+'\n'+'\n'.join(f'{k}: {v}' for k,v in f.items())+'\n```'
        text=re.sub(r'```'+kind+r'\n(.*?)```',body,text,flags=re.S)
    if lesson_id in R3_SCORES:
        for index,score in enumerate(R3_SCORES[lesson_id]):update('notes',{'sequence':score,'beat':'1'},index)
    if lesson_id in R3_DETAILS:
        scores=R3_SCORES[lesson_id]
        paragraphs=[]
        for locale_index,detail in enumerate(R3_DETAILS[lesson_id]):
            # Normal spaces in Latin-script prose; preserve pitch/register tokens.
            detail=normalize_final_prose(detail,['en','pt-BR','es','de','ja','zh-Hans'][locale_index])
            references=[]
            for score_index,score in enumerate(scores,1):
                beats=sum(float(t.partition('/')[2] or 1) for t in score.split())
                references.append(R3_LABELS[locale_index].format(index=score_index,beats=f'{beats:g}')+' '+score)
            paragraphs.append((detail,R3_NOTATION[locale_index]+'\n\n'+'\n\n'.join(references),R2_PRACTICE_FEEDBACK[locale_index],R3_CHECKPOINT[locale_index]))
        text=replace_candidate_localized(text,paragraphs)
    maps=re.findall(r'```fretboard\n(.*?)```',text,re.S)
    if maps and (lesson_id in R3_SCORES or lesson_id in R3_POSITIONS):
        note= re.search(r'```notes\n(.*?)```',text,re.S)
        nf,reference=events(note[1])
        mf=fields(maps[0]); tuning=list(map(midi,mf['tuning'].split()))
        if lesson_id in R3_POSITIONS:
            route=R3_POSITIONS[lesson_id].split()
        else:
            preferred=7 if len(tuning)==6 else 4
            # New maps locate independently authored pitches; the validator checks
            # each resulting location against notes. Routes with named strings
            # or semitone slides below override this neutral position choice.
            named={}
            if lesson_id=='guitar-harmonic-third-switchback': named={'G3':'5:10','B3':'4:9','A3':'5:12','C4':'4:10','D4':'3:7','E4':'3:9'}
            if lesson_id=='guitar-sixth-ladder-flare': named={'C3':'6:8','A3':'4:7','D3':'6:10','B3':'4:9','E3':'5:7','C4':'3:5','F3':'5:8','D4':'3:7'}
            if lesson_id=='guitar-fourth-target-laser':
                named=dict(G4='2:8',A4='1:5',B4='1:7',C5='1:8',D5='1:10',E5='1:12',F5='1:13',F4='2:6',E4='3:9',Csharp4='3:6',D4='3:7',Fsharp4='2:7')
                named['C#4']=named.pop('Csharp4');named['F#4']=named.pop('Fsharp4')
            if lesson_id=='bass-pocket-switch':named={'D2':'3:5','A1':'4:5','E2':'2:2','F#2':'2:4','A2':'2:7','B2':'1:4','D3':'1:7'}
            route=[]
            for pitches,duration in reference:
                used=set(); coords=[named.get(pitch) or location(midi(pitch),tuning,preferred,used) for pitch in pitches]
                route.append('['+','.join(coords)+']' if len(coords)>1 else coords[0] if coords else '-')
        if len(route)!=len(reference):raise ValueError('Final route/event count: '+lesson_id)
        positions=[]; frets=[]
        for token,(pitches,duration) in zip(route,reference):
            if (token=='-')!= (not pitches):raise ValueError('Final rest mismatch: '+lesson_id)
            frets.extend(int(x.split(':')[1]) for x in token.strip('[]').split(',') if x!='-')
            positions.append(token+(f'@{duration:g}' if duration!=1 else ''))
        update('fretboard',{'positions':' '.join(positions),'frets':f'{min(frets)}-{max(frets)}','tempo':nf['tempo'],'expectedNotes':' '.join('['+','.join(n)+']' if len(n)>1 else n[0] if n else '-' for n,d in reference)})
    if lesson_id in R3_EXTRA_TEXT:update('text',R3_EXTRA_TEXT[lesson_id])
    text=final_minor_prose(lesson_id,text)
    # Small prose fixes preserve the task; no warning is used to excuse bad data.
    if lesson_id=='guitar-late-launch-switch':
        for old,new in [('o primeira metade','a primeira metade'),('o **primeira metade','a **primeira metade'),('el primera mitad','la primera mitad'),('el **primera mitad','la **primera mitad'),('lässt du erste Hälfte','lässt du die erste Hälfte'),('lässt du **erste Hälfte','lässt du **die erste Hälfte')]:text=text.replace(old,new)
    if lesson_id=='guitar-position-comet-lift':
        for old,new in [('strings 6, 5, and 4','strings 6 and 5'),('cordas 6, 5 e 4','cordas 6 e 5'),('cuerdas 6, 5 y 4','cuerdas 6 y 5'),('Saiten 6, 5 und 4','Saiten 6 und 5'),('6・5・4弦','6・5弦'),('6弦・5弦・4弦','6弦・5弦'),('第6、5、4弦','第6、5弦'),('6弦、5弦和4弦','6弦和5弦')]:text=text.replace(old,new)
    if lesson_id=='bass-seventh-target-lock':
        for old,new in [('fall one step','rise one step'),('descer um grau','subir um grau'),('cair um grau','subir um grau'),('bajar un grado','subir un grado'),('falle einen Schritt','steige einen Schritt'),('einen Schritt fallen','einen Schritt steigen'),('zum Akkordgrundton fallen','zum Akkordgrundton steigen'),('1音下が','1音上が'),('順次下降','順次上行'),('下降一级','上升一级'),('级进下行','级进上行')]:text=text.replace(old,new)
    if lesson_id=='bass-pentatonic-seventh-answer-20260925':text=text.replace('the open G answer','the unresolved G answer')
    return text

# Extend the earlier idempotent helper without changing its legacy-main workflow.
_refine_before_final = refine_candidate_text

def refine_candidate_text(lesson_id,text):
    # Final corrections supersede old R2 maps whose event count has changed.
    if lesson_id in R3_SCORES:
        return final_closure_text(lesson_id,refine_final_candidate(lesson_id,text))
    return final_closure_text(lesson_id,refine_final_candidate(lesson_id,_refine_before_final(lesson_id,text)))


for c in report["changes"]:
    original = subprocess.check_output(
        ["git", "show", "448975f:" + c["path"]], cwd=ROOT, text=True
    )
    archive = ROOT / "editorial/originals/legacy" / c["path"]
    archive.parent.mkdir(parents=True, exist_ok=True)
    archive.write_text(original)
    c["originalPath"] = str(archive.relative_to(ROOT))
    c["beforeSHA256"] = hashlib.sha256(original.encode()).hexdigest()
    mustReclassify = c["classification"] == "syntactic" and any(
        b["beforeType"] == "fretboard" for b in c["blockProof"]
    )
    if mustReclassify:
        source = ROOT / c["path"]
        text = source.read_text()
        c["classification"] = "musical"
        c["physicalReview"] = "pending"
        c["classificationReason"] = (
            "Enabling a previously unrenderable physical map is not a published pattern approval. Source event equality did not prove the map matched the lesson or instrument string numbering."
        )
        proposal = ROOT / "editorial/candidates/legacy-repairs" / c["path"]
        proposal.parent.mkdir(parents=True, exist_ok=True)
        notes = re.search(r"```notes\n(.*?)```", text, re.S)
        if not notes:
            raise ValueError(
                "Expected a fully specified original notes reference for " + c["id"]
            )
        nf, es = events(notes[1])
        instrument = fields(text.split("---")[1])["instrument"]
        tuning = list(
            map(
                midi,
                (
                    ["E2", "A2", "D3", "G3", "B3", "E4"]
                    if instrument == "guitar"
                    else ["E1", "A1", "D2", "G2"]
                ),
            )
        )

        def fix_map(match):
            f = fields(match[1])
            bounds = list(map(int, f["frets"].split("-")))
            preferred = sum(bounds) / 2
            positions = []
            frets = []
            for pitches, duration in es:
                used = set()
                locations = [
                    location(midi(n), tuning, preferred, used) for n in pitches
                ]
                frets.extend(int(x.split(":")[1]) for x in locations)
                token = (
                    "[" + ",".join(locations) + "]"
                    if len(locations) > 1
                    else locations[0] if locations else "-"
                )
                positions.append(token + (f"@{duration:g}" if duration != 1 else ""))
            f.update(
                positions=" ".join(positions),
                frets=f"{min(frets)}-{max(frets)}",
                tempo=nf.get("tempo", "80"),
                expectedNotes=" ".join(
                    "[" + ",".join(n) + "]" if len(n) > 1 else n[0] if n else "-"
                    for n, d in es
                ),
            )
            return (
                "```fretboard\n"
                + "\n".join(f"{key}: {value}" for key, value in f.items())
                + "\n```"
            )

        text = re.sub(r"```fretboard\n(.*?)```", fix_map, text, flags=re.S)
        if c["id"] == "guitar-target-lighthouse":
            text = re.sub(
                r"^positions:.*$", "positions: 3:5 2:7 3:4 2:5", text, flags=re.M
            )
            text = re.sub(r"^frets:.*$", "frets: 4-7", text, flags=re.M)
        proposal.write_text(text)
    elif c["classification"] == "musical":
        proposal = ROOT / "editorial/candidates/legacy-repairs" / c["path"]
        text = proposal.read_text()
    else:
        c["servedSHA256"] = hashlib.sha256((ROOT / c["path"]).read_bytes()).hexdigest()
        continue
    if c["id"] == "guitar-half-step-fret-hunt-20261002":

        def half_map(match):
            f = fields(match[1])
            f.update(
                positions="2:0 2:1 2:3 2:1 2:5 2:6 2:5 2:3",
                frets="0-6",
                tempo="56",
                expectedNotes="B3 C4 D4 C4 E4 F4 E4 D4",
            )
            return (
                "```fretboard\n"
                + "\n".join(f"{k}: {v}" for k, v in f.items())
                + "\n```"
            )

        text = re.sub(r"```fretboard\n(.*?)```", half_map, text, flags=re.S)
    if c["id"] == "scale-advanced-wide-interval-lines-thirds":
        text = re.sub(r"^(degrees: .*\b7) [18]\s*$", r"\1 8", text, flags=re.M)
    text = refine_candidate_text(c["id"], text)
    proposal.write_text(text)
    c["afterSHA256"] = hashlib.sha256(text.encode()).hexdigest()
    c["proposalSHA256"] = c["afterSHA256"]
    c["proposalPath"] = str(proposal.relative_to(ROOT))
    # Compute the proposal's actual map signature and its reference equality. This does not certify hand motion.
    if mustReclassify:
        sources = re.findall(r"```([^\n]+)\n(.*?)```", text, re.S)
        for proof, (kind, src) in zip(c["blockProof"], sources):
            if kind == "fretboard":
                f = fields(src)
                tm = list(map(midi, f["tuning"].split()))
                signature = []
                for token in re.findall(r"\[[^]]+\](?:@[^ ]+)?|[^\s]+", f["positions"]):
                    loc, _, duration = token.partition("@")
                    ps = (
                        []
                        if loc == "-"
                        else [
                            tm[len(tm) - int(x.split(":")[0])] + int(x.split(":")[1])
                            for x in loc.strip("[]").split(",")
                        ]
                    )
                    signature.append([ps, float(duration or 1)])
                proof.update(
                    classification="musical",
                    reason=c["classificationReason"],
                    after={"tempo": float(f["tempo"]), "events": signature},
                    eventIntentEqual=False,
                    proposalMatchesWrittenNotes=True,
                )
report["summary"] = {
    k: sum(c["classification"] == k for c in report["changes"])
    for k in ["syntactic", "musical"]
}
reportFile.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(report["summary"])
