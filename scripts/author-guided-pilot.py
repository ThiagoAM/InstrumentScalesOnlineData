#!/usr/bin/env python3
"""Render the finite, authored pilot below. This does not invent lessons or touch legacy courses."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
ACTIVE = (
    pathlib.Path.home()
    / "Library/Application Support/MacMiniServer/scheduled-jobs/disk-maintenance/active.json"
)
if ACTIVE.exists():
    raise SystemExit(ACTIVE.read_text())
L = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"]
CAP = ["guided-steps", "localized-regions", "instrument-setup", "notes", "fretboard"]


def loc(values):
    return dict(zip(L, values))


# Each row has an authored musical task, a plausible error and correction, and a distinct transfer.
# Symbols name exact pitches consistently across translations; they are never translated by an LLM at run time.
ROWS = []


def row(instrument, unit, slug, sequence, position, values):
    assert len(values) == 6 and all(len(v.split("~")) == 4 for v in values)
    ROWS.append(
        dict(
            instrument=instrument,
            unit=unit,
            slug=slug,
            sequence=sequence,
            position=position,
            values=values,
        )
    )


row(
    "guitar",
    "notes-and-pulse",
    "one-string-landmarks",
    "B3 C4 D4 C4 B3/2 -/2",
    "2:0 2:1 2:3 2:1 2:0@2 -@2",
    [
        "One string, three landmarks~Find B3, C4 and D4 on string 2, frets 0, 1 and 3.~If D sounds like C, release the previous finger and check fret 3 before repeating.~Reverse D–C–B while keeping the same pulse.",
        "Uma corda, três referências~Localize B3, C4 e D4 na corda 2, casas 0, 1 e 3.~Se ré soar como dó, solte o dedo anterior e confira a casa 3 antes de repetir.~Inverta D–C–B mantendo o mesmo pulso.",
        "Una cuerda, tres referencias~Localiza B3, C4 y D4 en la cuerda 2, trastes 0, 1 y 3.~Si re suena como do, suelta el dedo anterior y comprueba el traste 3 antes de repetir.~Invierte D–C–B conservando el pulso.",
        "Eine Saite, drei Anker~Finde B3, C4 und D4 auf Saite 2, Bünden 0, 1 und 3. Internationale Notennamen: B bedeutet H.~Klingt D wie C, löse den vorherigen Finger und prüfe Bund 3 vor der Wiederholung.~Kehre D–C–B bei gleichem Puls um.",
        "1本の弦、3つの目印~第2弦の開放、1、3フレットでB3、C4、D4を見つけます。~DがCに聞こえたら前の指を離し、3フレットを確認して再試行します。~同じ拍でD–C–Bへ順序を逆にします。",
        "一根弦，三个路标~在第2弦的空弦、第1和第3品找到B3、C4、D4。~若D听起来像C，先松开前一个手指，确认第3品再试。~保持节拍，反向弹奏D–C–B。",
    ],
)
row(
    "guitar",
    "notes-and-pulse",
    "hear-the-distance",
    "B3 C4 - B3 C#4 - B3 C4",
    "2:0 2:1 - 2:0 2:2 - 2:0 2:1",
    [
        "Hear the small step~Compare B3–C4 with B3–C#4: one fret and two frets from the same starting note.~If the louder pair seems wider, replay both with equal attack and volume.~Find the semitone E4–F4 on string 1, frets 0 and 1.",
        "Ouça o passo pequeno~Compare B3–C4 com B3–C#4: uma casa e duas casas desde a mesma nota.~Se o par mais forte parecer maior, repita os dois com ataque e volume iguais.~Encontre o semitom E4–F4 na corda 1, casas 0 e 1.",
        "Escucha el paso pequeño~Compara B3–C4 con B3–C#4: uno y dos trastes desde la misma nota.~Si el par más fuerte parece mayor, repite ambos con ataque y volumen iguales.~Encuentra E4–F4 en la cuerda 1, trastes 0 y 1.",
        "Höre den kleinen Schritt~Vergleiche B3–C4 mit B3–C#4: ein und zwei Bünde vom selben Anfangston. Internationale Notennamen: B bedeutet H.~Wirkt das lautere Paar weiter, spiele beide mit gleichem Anschlag und Pegel.~Finde E4–F4 auf Saite 1, Bünden 0 und 1.",
        "小さい音程を聴く~同じB3からB3–C4の1フレットとB3–C#4の2フレットを比べます。~大きな音が広く感じられたら、同じ強さで両方を弾き直します。~第1弦の開放と1フレットでE4–F4を探します。",
        "听见小音程~从同一个B3比较B3–C4的一品距离与B3–C#4的两品距离。~若较响的一组显得更宽，用相同力度和音量重弹两组。~在第1弦空弦与第1品找到E4–F4。",
    ],
)
row(
    "guitar",
    "notes-and-pulse",
    "three-note-question",
    "C4 D4 E4 D4 C4/2 -/2",
    "2:1 2:3 2:5 2:3 2:1@2 -@2",
    [
        "A three-note question~Play C4–D4–E4–D4–C4 on string 2, frets 1–3–5–3–1, shifting the hand gently.~If fret 5 feels stretched, move the whole hand during the transition instead of holding the span.~Repeat with the first C held for two beats.",
        "Uma pergunta de três notas~Toque C4–D4–E4–D4–C4 na corda 2, casas 1–3–5–3–1, deslocando a mão suavemente.~Se a casa 5 exigir abertura, mova a mão na transição sem sustentar o alcance.~Repita segurando o primeiro dó por dois tempos.",
        "Una pregunta de tres notas~Toca C4–D4–E4–D4–C4 en la cuerda 2, trastes 1–3–5–3–1, moviendo suavemente la mano.~Si el traste 5 exige estirar, desplaza la mano durante la transición.~Repite sosteniendo el primer do dos pulsos.",
        "Eine Frage aus drei Tönen~Spiele C4–D4–E4–D4–C4 auf Saite 2, Bünden 1–3–5–3–1, mit sanftem Lagenwechsel.~Ist Bund 5 zu weit, verschiebe die Hand statt die Spanne zu halten.~Halte beim Wiederholen das erste C zwei Schläge.",
        "3音の問いかけ~第2弦の1–3–5–3–1フレットでC4–D4–E4–D4–C4を弾き、手を軽く移動します。~5フレットが遠ければ指を開き続けず、切り替え時に手全体を動かします。~最初のCを2拍伸ばして繰り返します。",
        "三个音的问句~在第2弦第1–3–5–3–1品弹C4–D4–E4–D4–C4，轻轻移动手掌。~若第5品太远，在换音时移动整只手，不要一直撑开。~再试一次，将第一个C保持两拍。",
    ],
)
row(
    "guitar",
    "notes-and-pulse",
    "count-the-silence",
    "C4 D4 - E4 D4 - C4/2",
    "2:1 2:3 - 2:5 2:3 - 2:1@2",
    [
        "Count the silence~Place a silent beat after D4; count through it before E4, then return to C4.~If the rest disappears, mute the string on the silent beat and keep counting aloud.~Move the rest before D4 without changing the eight-beat length.",
        "Conte o silêncio~Deixe um tempo silencioso após D4; conte até E4 e volte a C4.~Se a pausa desaparecer, abafe a corda no tempo silencioso e conte em voz alta.~Mova a pausa para antes de D4 mantendo oito tempos.",
        "Cuenta el silencio~Deja un pulso silencioso después de D4; cuenta hasta E4 y vuelve a C4.~Si el silencio desaparece, apaga la cuerda en ese pulso y cuenta en voz alta.~Mueve el silencio antes de D4 conservando ocho pulsos.",
        "Zähle die Stille~Lass nach D4 einen Schlag frei, zähle bis E4 weiter und kehre zu C4 zurück.~Fehlt die Pause, dämpfe die Saite im freien Schlag und zähle laut.~Setze die Pause vor D4 bei insgesamt acht Schlägen.",
        "休符も数える~D4の後に1拍の休符を置き、数え続けてE4からC4に戻ります。~休符が消えたら、その拍で弦を止めて声で数えます。~全体の8拍を保ち、休符をD4の前へ移します。",
        "把休止也数出来~在D4后留一拍安静，继续数拍，弹E4后回到C4。~若休止消失，在空拍处止住琴弦并大声数拍。~保持总共八拍，把休止移到D4之前。",
    ],
)
row(
    "guitar",
    "notes-and-pulse",
    "two-bar-answer",
    "C4 D4 E4 - D4 C4 -/2",
    "2:1 2:3 2:5 - 2:3 2:1 -@2",
    [
        "Your two-bar answer~Play the eight-beat phrase, then make another with C4, D4, E4, one rest and a final C4.~If the answer loses its shape, keep the opening two notes and change only the middle.~Play your new phrase without the demonstration and describe the change.",
        "Sua resposta de dois compassos~Toque a frase de oito tempos e crie outra com C4, D4, E4, uma pausa e C4 final.~Se a resposta perder a forma, preserve as duas notas iniciais e altere apenas o meio.~Toque sua frase sem demonstração e descreva a mudança.",
        "Tu respuesta de dos compases~Toca la frase de ocho pulsos y crea otra con C4, D4, E4, un silencio y C4 final.~Si pierde forma, conserva las dos primeras notas y cambia solo el centro.~Tócala sin demostración y explica el cambio.",
        "Deine Antwort in zwei Takten~Spiele die acht Schläge und erfinde eine Antwort mit C4, D4, E4, einer Pause und C4 am Ende.~Verliert sie die Form, behalte die ersten zwei Töne und ändere nur die Mitte.~Spiele ohne Demo und beschreibe die Änderung.",
        "2小節の自分の答え~8拍のフレーズを弾き、C4、D4、E4と休符を使いC4で終わる別のフレーズを作ります。~形が崩れたら最初の2音を保ち、中間だけを変えます。~デモなしで自作を弾き、変えた点を説明します。",
        "你的两小节回答~先弹八拍乐句，再用C4、D4、E4、一个休止和末尾C4写一句回答。~若形状混乱，保留开头两音，只改中间。~不听示范弹出新乐句，并描述改动。",
    ],
)
row(
    "guitar",
    "notes-and-pulse",
    "move-the-question",
    "G3 A3 B3 A3 G3/2 -/2",
    "3:0 3:2 3:4 3:2 3:0@2 -@2",
    [
        "An extra starting point~Move the question to G3–A3–B3 on string 3, frets 0–2–4.~If the new string rings against string 2, stop the old string before starting.~Compare the same rhythm starting on C4 and G3.",
        "Um ponto de partida extra~Mova a pergunta para G3–A3–B3 na corda 3, casas 0–2–4.~Se a corda nova soar junto da corda 2, pare a anterior antes de começar.~Compare o mesmo ritmo começando em C4 e G3.",
        "Otro punto de partida~Mueve la pregunta a G3–A3–B3 en la cuerda 3, trastes 0–2–4.~Si ambas cuerdas suenan juntas, detén la anterior antes de empezar.~Compara el mismo ritmo desde C4 y desde G3.",
        "Ein weiterer Anfang~Versetze die Frage nach G3–A3–B3 auf Saite 3, Bünden 0–2–4.~Klingen beide Saiten zusammen, stoppe zuerst die vorige Saite.~Vergleiche denselben Rhythmus ab C4 und G3.",
        "別の出発点~第3弦の開放–2–4フレットでG3–A3–B3へ問いを移します。~第2弦が一緒に鳴ったら、始める前に前の弦を止めます。~C4始まりとG3始まりを同じリズムで比べます。",
        "另一个起点~把问句移到第3弦空弦–第2–第4品的G3–A3–B3。~若第2弦一起响，开始前先止住旧琴弦。~比较从C4与G3开始的相同节奏。",
    ],
)
row(
    "guitar",
    "two-places",
    "same-pitch-two-strings",
    "E4 E4 G4 G4 E4/2 -/2",
    "1:0 2:5 1:3 2:8 1:0@2 -@2",
    [
        "The same pitch twice~Compare E4 on string 1 open and string 2 fret 5, then G4 at 1:3 and 2:8.~If one sounds lower, check the octave and string number; these are unisons.~Choose the easier route for E4–G4–E4 and explain your choice.",
        "A mesma altura duas vezes~Compare E4 na corda 1 solta e corda 2 casa 5; depois G4 em 1:3 e 2:8.~Se uma soar mais grave, confira oitava e corda; são uníssonos.~Escolha a rota mais confortável para E4–G4–E4 e explique.",
        "La misma altura dos veces~Compara E4 en cuerda 1 abierta y cuerda 2 traste 5; luego G4 en 1:3 y 2:8.~Si una suena más grave, comprueba octava y cuerda: son unísonos.~Elige la ruta más cómoda para E4–G4–E4 y explica.",
        "Dieselbe Tonhöhe zweimal~Vergleiche E4 auf leerer Saite 1 und Saite 2 Bund 5; dann G4 bei 1:3 und 2:8.~Klingt ein Ton tiefer, prüfe Oktave und Saite: es sind Unisoni.~Wähle den bequemeren Weg für E4–G4–E4 und begründe.",
        "同じ高さを2本で~第1弦開放と第2弦5フレットのE4、続いて1:3と2:8のG4を比べます。~片方が低ければ弦とオクターブを確認します。同じ音高です。~E4–G4–E4を弾きやすい経路で弾き、理由を説明します。",
        "两根弦上的同音~比较第1弦空弦与第2弦第5品的E4，再比较1:3与2:8的G4。~若某个音更低，核对弦号和八度；这些应是同度。~为E4–G4–E4选舒适的路径并说明原因。",
    ],
)
row(
    "guitar",
    "two-places",
    "cross-two-strings",
    "C4 D4 E4 F4 E4 D4 C4 -",
    "2:1 2:3 1:0 1:1 1:0 2:3 2:1 -",
    [
        "Cross two strings~Play C4–D4 on string 2 and E4–F4 on string 1, then return.~If both strings ring, stop the previous note gently at the crossing.~Repeat with a one-beat rest before changing strings.",
        "Cruze duas cordas~Toque C4–D4 na corda 2 e E4–F4 na corda 1, depois volte.~Se as duas soarem juntas, interrompa suavemente a nota anterior na troca.~Repita com uma pausa de um tempo antes da troca.",
        "Cruza dos cuerdas~Toca C4–D4 en cuerda 2 y E4–F4 en cuerda 1, luego vuelve.~Si suenan juntas, detén suavemente la nota anterior al cruzar.~Repite con un silencio de un pulso antes del cruce.",
        "Wechsle zwischen zwei Saiten~Spiele C4–D4 auf Saite 2 und E4–F4 auf Saite 1, dann zurück.~Klingen beide zusammen, stoppe beim Wechsel sanft den vorherigen Ton.~Wiederhole mit einer Schlagpause vor dem Wechsel.",
        "2本の弦を渡る~第2弦でC4–D4、第1弦でE4–F4を弾いて戻ります。~両弦が鳴ったら、渡る瞬間に前の音を軽く止めます。~弦を渡る前に1拍の休符を入れて再試行します。",
        "跨过两根弦~第2弦弹C4–D4，第1弦弹E4–F4，再返回。~若两弦同时响，在跨弦时轻轻止住前音。~跨弦前加一拍休止，再试一次。",
    ],
)
row(
    "guitar",
    "two-places",
    "hear-a-triad",
    "C4 E4 G4 E4 C4/2 -/2",
    "2:1 1:0 1:3 1:0 2:1@2 -@2",
    [
        "Connect to a triad~Play the single notes C4–E4–G4; these outline C major without a sustained stretch.~If D slips in, compare it with E: the chord needs the third E.~Use C–D–E as a lead-in, then land on G4.",
        "Conecte a uma tríade~Toque separadamente C4–E4–G4; elas delineiam dó maior sem sustentar uma abertura.~Se entrar D, compare com E: o acorde precisa da terça E.~Use C–D–E como preparação e chegue a G4.",
        "Conecta con una tríada~Toca C4–E4–G4 por separado: dibujan do mayor sin mantener una abertura.~Si aparece D, compáralo con E: el acorde necesita la tercera E.~Usa C–D–E como entrada y llega a G4.",
        "Verbinde mit einem Dreiklang~Spiele C4–E4–G4 einzeln: C-Dur ohne gehaltene Dehnung.~Rutscht D hinein, vergleiche mit E: der Akkord braucht die Terz E.~Beginne mit C–D–E und lande auf G4.",
        "三和音へつなぐ~C4–E4–G4を1音ずつ弾き、手を開き続けずCメジャーを示します。~Dが入ったらEと比べます。この和音の3度はEです。~C–D–Eで入り、G4へ着地します。",
        "连接到三和弦~逐个弹C4–E4–G4，勾勒C大调，不要持续撑开手指。~若混入D，与E比较；和弦需要三音E。~用C–D–E引入，落在G4。",
    ],
)
row(
    "guitar",
    "two-places",
    "choose-the-ending",
    "C4 D4 E4 C4/2 -/3 C4 D4 E4 G4/2 -/3",
    "2:1 2:3 1:0 2:1@2 -@3 2:1 2:3 1:0 1:3@2 -@3",
    [
        "Choose a final note~Compare the same opening ending on C4 or G4 over an imagined C chord.~If the comparison is unclear, hold both endings equally long and sing them after playback.~Choose one ending for a calm answer and explain what you hear.",
        "Escolha a nota final~Compare a mesma abertura terminando em C4 ou G4 sobre um acorde de dó imaginado.~Se a comparação ficar incerta, sustente os finais igualmente e cante depois da reprodução.~Escolha um final tranquilo e explique o que ouve.",
        "Elige la nota final~Compara la misma apertura terminando en C4 o G4 sobre un acorde de do imaginado.~Si no está claro, sostén ambos finales igual y cántalos tras escucharlos.~Elige un final tranquilo y explica lo que oyes.",
        "Wähle den Schlusston~Vergleiche denselben Anfang mit C4 oder G4 als Ende über einem gedachten C-Akkord.~Ist der Unterschied unklar, halte beide Enden gleich lang und singe sie nach.~Wähle ein ruhiges Ende und beschreibe deinen Höreindruck.",
        "終わりの音を選ぶ~同じ出だしをC和音の上でC4またはG4に終わらせて比べます。~迷ったら両方を同じ長さに伸ばし、再生後に歌います。~落ち着く終わりを選び、聴こえ方を説明します。",
        "选择结束音~想象C和弦，比较同一个开头落在C4或G4。~若区别不清，两种结尾保持相同长度，听完后唱出来。~选一个平静的结尾，说明听到的感觉。",
    ],
)
row(
    "guitar",
    "two-places",
    "four-bar-story",
    "C4 D4 E4 - G4 E4 D4 - C4 E4 G4 E4 D4 - C4/2",
    "2:1 2:3 1:0 - 1:3 1:0 2:3 - 2:1 1:0 1:3 1:0 2:3 - 2:1@2",
    [
        "A four-bar story~Build sixteen beats with an opening, a counted rest and a final C4, using both strings.~If every note runs together, keep bar two as a deliberate breath before the answer.~Change only bar three and keep your chosen ending.",
        "Uma história de quatro compassos~Monte dezesseis tempos com abertura, pausa contada e C4 final usando duas cordas.~Se tudo emendar, faça do segundo compasso uma respiração antes da resposta.~Altere apenas o terceiro compasso e preserve o final escolhido.",
        "Una historia de cuatro compases~Crea dieciséis pulsos con inicio, silencio contado y C4 final usando dos cuerdas.~Si todo se junta, usa el segundo compás como respiración antes de responder.~Cambia solo el tercer compás y conserva el final.",
        "Eine Geschichte in vier Takten~Gestalte sechzehn Schläge mit Anfang, gezählter Pause und C4 am Ende auf zwei Saiten.~Fließt alles zusammen, nutze Takt zwei als Atemzug vor der Antwort.~Ändere nur Takt drei und behalte dein Ende.",
        "4小節の物語~2本の弦で出だし、数えた休符、最後のC4を含む16拍を作ります。~音がつながり過ぎたら2小節目を答えの前の呼吸にします。~選んだ終わりを保ち、3小節目だけを変えます。",
        "四小节的故事~用两根弦写十六拍，包含开头、数拍的休止及末尾C4。~若所有音挤在一起，让第二小节成为回答前的呼吸。~保留选定结尾，只修改第三小节。",
    ],
)
row(
    "guitar",
    "two-places",
    "change-the-touch",
    "C4 D4 E4 D4 C4/2 -/2",
    "2:1 2:3 1:0 2:3 2:1@2 -@2",
    [
        "An extra change of touch~Play the same phrase once connected and once with gently separated notes.~If separation changes the tempo, release earlier while keeping each attack on its beat.~Use connected notes for the question and separated notes for the answer.",
        "Um toque diferente~Toque a frase uma vez ligada e outra com notas suavemente separadas.~Se separar alterar o andamento, solte antes mantendo cada ataque no tempo.~Use notas ligadas na pergunta e separadas na resposta.",
        "Otro tipo de ataque~Toca la frase una vez ligada y otra con notas suavemente separadas.~Si separar cambia el tempo, suelta antes manteniendo cada ataque en su pulso.~Liga la pregunta y separa la respuesta.",
        "Eine andere Artikulation~Spiele dieselbe Phrase einmal verbunden und einmal sanft getrennt.~Ändert das Trennen das Tempo, löse früher und behalte die Anschläge auf dem Schlag.~Verbinde die Frage und trenne die Antwort.",
        "タッチを変える追加練習~同じフレーズをつなげて1回、軽く切って1回弾きます。~切るとテンポが変わるなら、音を早く離し、弾き始める拍は保ちます。~問いをつなげ、答えを切って弾きます。",
        "换一种触弦方式~同一乐句先连贯弹一次，再轻轻分开各音弹一次。~若断开改变速度，提早放音，起音仍在原拍。~问句连贯，答句分开。",
    ],
)
row(
    "bass",
    "supporting-line",
    "root-on-one",
    "A1/2 -/2 A1/2 -/2",
    "3:0@2 -@2 3:0@2 -@2",
    [
        "A root on beat one~Place A1 on beat one of each four-beat bar, then count the silence.~If the open A continues too long, stop it at beat three with a relaxed hand.~Move the same two-bar rhythm to D2 on open string 2.",
        "Tônica no primeiro tempo~Coloque A1 no primeiro tempo de cada compasso de quatro e conte o silêncio.~Se o lá solto durar demais, pare no tempo três com a mão relaxada.~Mova o mesmo ritmo de dois compassos para D2 na corda 2 solta.",
        "Fundamental en el primer pulso~Pon A1 en el primer pulso de cada compás de cuatro y cuenta el silencio.~Si la cuerda abierta sigue sonando, deténla en el tercer pulso con la mano relajada.~Mueve el ritmo a D2 en cuerda 2 abierta.",
        "Grundton auf Schlag eins~Setze A1 auf den ersten Schlag jedes Vierertakts und zähle die Stille.~Klingt das offene A zu lange, stoppe auf Schlag drei mit entspannter Hand.~Übertrage den Zweitaktrhythmus auf die leere Saite 2, D2.",
        "1拍目のルート~4拍の各小節の1拍目にA1を置き、休符も数えます。~開放Aが長すぎたら、力を抜いて3拍目で止めます。~同じ2小節のリズムを第2弦開放のD2へ移します。",
        "第一拍的根音~每个四拍小节第一拍弹A1，然后数出安静的拍子。~若空弦A持续太久，放松手掌，在第三拍止音。~把同样的两小节节奏移到第2弦空弦D2。",
    ],
)
row(
    "bass",
    "supporting-line",
    "root-and-fifth",
    "A1/2 E2/2 A1/2 E2/2",
    "3:0@2 2:2@2 3:0@2 2:2@2",
    [
        "Root and fifth support~Alternate A1 and E2, two beats each, keeping the fifth quieter than the root.~If E2 sounds like D2, check string 2 fret 2 and listen again.~Try D2–A2 at 2:0 and 1:2 without accelerating.",
        "Apoio de tônica e quinta~Alterne A1 e E2 por dois tempos cada, deixando a quinta mais leve que a tônica.~Se E2 soar como D2, confira corda 2 casa 2 e ouça novamente.~Tente D2–A2 em 2:0 e 1:2 sem acelerar.",
        "Apoyo de fundamental y quinta~Alterna A1 y E2 durante dos pulsos cada uno, con la quinta más suave.~Si E2 parece D2, comprueba cuerda 2 traste 2 y escucha.~Prueba D2–A2 en 2:0 y 1:2 sin acelerar.",
        "Grundton und Quinte tragen~Wechsle A1 und E2 mit je zwei Schlägen; die Quinte bleibt leiser.~Klingt E2 wie D2, prüfe Saite 2 Bund 2 und höre erneut.~Probiere D2–A2 bei 2:0 und 1:2 ohne Beschleunigung.",
        "ルートと5度で支える~A1とE2を2拍ずつ交互に弾き、5度をルートより軽くします。~E2がD2に聞こえたら第2弦2フレットを確認します。~2:0と1:2でD2–A2を速度を変えずに試します。",
        "根音与五音的支撑~A1与E2各两拍交替，五音比根音轻。~若E2像D2，确认第2弦第2品，再听一次。~在2:0和1:2尝试D2–A2，不要加速。",
    ],
)
row(
    "bass",
    "supporting-line",
    "length-and-release",
    "A1 - A1/2 A1 - E2/2",
    "3:0 - 3:0@2 3:0 - 2:2@2",
    [
        "Length and release~Compare one-beat A1 with two-beat A1, stopping precisely when the rest begins.~If string noise fills the rest, slow down and practise only the release.~Give E2 the short length and A1 the long length.",
        "Duração e soltura~Compare A1 de um tempo com A1 de dois, parando exatamente no início da pausa.~Se ruído ocupar a pausa, reduza e pratique apenas a soltura.~Dê a E2 a duração curta e a A1 a longa.",
        "Duración y soltura~Compara A1 de un pulso con A1 de dos y deténlo al comenzar el silencio.~Si hay ruido en la pausa, baja el tempo y practica solo la soltura.~Haz E2 corto y A1 largo.",
        "Dauer und Loslassen~Vergleiche A1 für einen und zwei Schläge und stoppe genau am Pausenbeginn.~Füllt Geräusch die Pause, verlangsame und übe nur das Loslassen.~Spiele E2 kurz und A1 lang.",
        "長さと止め方~1拍のA1と2拍のA1を比べ、休符が始まる瞬間に止めます。~休符に雑音が残れば遅くして、止める動作だけを練習します。~E2を短く、A1を長くします。",
        "时值与放音~比较一拍和两拍的A1，在休止开始时准确止音。~若空拍被杂音填满，放慢，只练止音动作。~让E2短、A1长。",
    ],
)
row(
    "bass",
    "supporting-line",
    "arrive-at-the-change",
    "A1/2 E2/2 D2/2 A2/2",
    "3:0@2 2:2@2 2:0@2 1:2@2",
    [
        "Arrive at the change~Support one bar of A minor then one bar of D minor: roots A1 and D2 start each bar.~If A carries into D, mute before the change and practise the roots alone.~Repeat the two bars with only roots and compare the clarity.",
        "Chegue à troca~Sustente um compasso de lá menor e outro de ré menor: A1 e D2 começam os compassos.~Se o lá invadir o ré, abafe antes da troca e pratique só as tônicas.~Repita os dois compassos apenas com tônicas e compare a clareza.",
        "Llega al cambio~Acompaña un compás de la menor y otro de re menor: A1 y D2 abren cada compás.~Si A invade D, apaga antes del cambio y practica solo las fundamentales.~Repite solo con fundamentales y compara la claridad.",
        "Komme zum Wechsel an~Trage einen Takt a-Moll und einen Takt d-Moll; A1 und D2 eröffnen die Takte.~Klingt A in D hinein, dämpfe vor dem Wechsel und übe nur Grundtöne.~Wiederhole mit Grundtönen und vergleiche die Klarheit.",
        "和音の変わり目へ~Aマイナー1小節とDマイナー1小節を支え、各小節をA1とD2で始めます。~AがDへ残ったら変わる前に止め、ルートだけを練習します。~2小節をルートだけで繰り返し、明瞭さを比べます。",
        "到达和弦变化处~伴奏一小节A小调和一小节D小调，各自从A1和D2开始。~若A拖进D，换音前止音，只练根音。~两小节只弹根音，比较变化是否清楚。",
    ],
)
row(
    "bass",
    "supporting-line",
    "four-bars-of-support",
    "A1/2 E2/2 D2/2 A2/2 G1/2 D2/2 A1/2 -/2",
    "3:0@2 2:2@2 2:0@2 1:2@2 4:3@2 2:0@2 3:0@2 -@2",
    [
        "Four bars of support~Accompany Am–Dm–G–Am with roots on beat one and fifths on beat three; finish with a rest.~If the fifth hides a chord change, shorten it and restore the root first.~Play another four bars with a shorter final A1 and explain the effect.",
        "Quatro compassos de apoio~Acompanhe Am–Dm–G–Am com tônicas no tempo um e quintas no três; termine com pausa.~Se a quinta esconder a troca, encurte-a e recupere primeiro a tônica.~Toque mais quatro compassos com A1 final mais curto e explique o efeito.",
        "Cuatro compases de apoyo~Acompaña Am–Dm–G–Am con fundamentales en uno y quintas en tres; termina con silencio.~Si la quinta tapa el cambio, acórtala y recupera la fundamental.~Haz otros cuatro compases con A1 final más corto y explica.",
        "Vier Takte Unterstützung~Begleite Am–Dm–G–Am mit Grundtönen auf eins und Quinten auf drei; ende mit einer Pause.~Verdeckt die Quinte den Wechsel, verkürze sie und sichere zuerst den Grundton.~Spiele vier weitere Takte mit kürzerem letzten A1 und beschreibe die Wirkung.",
        "支える4小節~Am–Dm–G–Amを1拍目のルートと3拍目の5度で伴奏し、休符で終えます。~5度が和音の変わり目を隠したら短くし、まずルートを戻します。~最後のA1を短くした4小節を弾き、効果を説明します。",
        "四小节的支撑~为Am–Dm–G–Am伴奏，第一拍根音、第三拍五音，最后留休止。~若五音遮住换和弦，缩短五音，先恢复根音。~再弹四小节，将末尾A1缩短并说明效果。",
    ],
)
row(
    "bass",
    "supporting-line",
    "a-small-anticipation",
    "A1/2 E2/1.5 D2/0.5 D2/2 A2/2",
    "3:0@2 2:2@1.5 2:0@0.5 2:0@2 1:2@2",
    [
        "A small anticipation~Try D2 on the and of beat four before repeating it on the next downbeat.~If the early D feels like a new tempo, count the full bar and repeat only the change.~Compare the anticipated change with D2 arriving only on beat one.",
        "Uma antecipação pequena~Experimente D2 no contratempo do quatro e repita no primeiro tempo seguinte.~Se o ré adiantado mudar o pulso, conte o compasso inteiro e repita apenas a troca.~Compare com D2 chegando somente no tempo um.",
        "Una anticipación pequeña~Prueba D2 en el contratiempo de cuatro y repítelo en el siguiente primer pulso.~Si el D temprano cambia el tempo, cuenta el compás completo y repite solo el cambio.~Compara con D2 llegando únicamente en uno.",
        "Eine kleine Vorwegnahme~Spiele D2 auf der Und von vier und nochmals auf der nächsten eins.~Wirkt das frühe D wie ein Tempowechsel, zähle den ganzen Takt und übe nur den Übergang.~Vergleiche mit D2 erst auf eins.",
        "小さな先取り~4拍目の裏でD2を弾き、次の1拍目で再び弾きます。~早いDでテンポが変わったら、小節全体を数え、変わり目だけを繰り返します。~1拍目だけにD2を置く場合と比べます。",
        "小幅提前~在第四拍后半拍弹D2，下个第一拍再弹一次。~若提前的D像换了速度，数完整小节，只重复转换处。~与D2仅在第一拍出现的版本比较。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "find-the-region",
    "C4 D4 E4 F4 G4 F4 E4 C4",
    "",
    [
        "Find the five-note region~Find C4 next to the pair of black keys; place right-hand fingers 1–5 on C4–G4.~If the hand feels stretched, release and let curved fingers rest naturally over adjacent keys.~Find C5 and compare its octave with C4 without moving the whole exercise.",
        "Encontre a região de cinco notas~Localize C4 ao lado do par de teclas pretas; coloque dedos 1–5 da direita sobre C4–G4.~Se houver tensão, solte e apoie dedos curvos naturalmente nas teclas vizinhas.~Encontre C5 e compare sua oitava com C4 sem mover o exercício inteiro.",
        "Encuentra cinco notas~Localiza C4 junto al par de teclas negras; pon dedos 1–5 de la derecha sobre C4–G4.~Si hay tensión, suelta y deja los dedos curvos sobre teclas vecinas.~Busca C5 y compara la octava con C4 sin trasladar todo.",
        "Finde den Fünftonraum~Finde C4 neben zwei schwarzen Tasten; lege rechts Finger 1–5 auf C4–G4.~Bei Spannung löse die Hand und lege gekrümmte Finger locker auf Nachbartasten.~Finde C5 und vergleiche die Oktave mit C4, ohne alles zu versetzen.",
        "5音の場所を探す~黒鍵2つの隣でC4を見つけ、右手の1–5指をC4–G4に置きます。~手が緊張したら離し、丸い指を隣り合う鍵盤へ自然に置きます。~練習全体を動かさずC5を探し、C4とのオクターブを比べます。",
        "找到五音区域~在两枚黑键旁找到C4，右手1–5指放在C4–G4上。~若手紧张，先松开，让弯曲的手指自然落在相邻键上。~找到C5，与C4比较八度，不搬动整个练习。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "five-finger-phrase",
    "C4 D4 E4 G4 F4 E4 D4 C4",
    "",
    [
        "A five-finger phrase~Play C4–D4–E4–G4–F4–E4–D4–C4 with right-hand fingers 1–2–3–5–4–3–2–1.~If finger 4 lands late, isolate G4–F4–E4 slowly without pressing harder.~Begin on E4 and create an answer ending on C4.",
        "Uma frase com cinco dedos~Toque C4–D4–E4–G4–F4–E4–D4–C4 com dedos 1–2–3–5–4–3–2–1 da direita.~Se o dedo 4 atrasar, isole G4–F4–E4 devagar sem apertar mais.~Comece em E4 e crie uma resposta terminando em C4.",
        "Una frase de cinco dedos~Toca C4–D4–E4–G4–F4–E4–D4–C4 con dedos derechos 1–2–3–5–4–3–2–1.~Si el dedo 4 llega tarde, aísla G4–F4–E4 lentamente sin apretar más.~Empieza en E4 y crea una respuesta que termine en C4.",
        "Eine Fünffingerphrase~Spiele C4–D4–E4–G4–F4–E4–D4–C4 rechts mit 1–2–3–5–4–3–2–1.~Kommt Finger 4 spät, übe G4–F4–E4 langsam ohne stärker zu drücken.~Beginne auf E4 und erfinde eine Antwort bis C4.",
        "5本の指のフレーズ~右手1–2–3–5–4–3–2–1でC4–D4–E4–G4–F4–E4–D4–C4を弾きます。~4指が遅れたら強く押さずG4–F4–E4だけをゆっくり弾きます。~E4から始め、C4で終わる答えを作ります。",
        "五指乐句~右手用1–2–3–5–4–3–2–1弹C4–D4–E4–G4–F4–E4–D4–C4。~若4指落后，不要更用力，慢练G4–F4–E4。~从E4开始，写一个以C4结束的回答。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "breath-and-articulation",
    "C4 D4 - E4 G4 - C4/2",
    "",
    [
        "A breath in the melody~Leave a beat of silence after D4 and after G4, releasing the keys without pedal.~If the pause still sounds, lift the previous finger at the start of the silent beat.~Make the first pair connected and the second pair gently separated.",
        "Uma respiração na melodia~Deixe um tempo silencioso após D4 e G4, soltando as teclas sem pedal.~Se a pausa ainda soar, levante o dedo anterior no início do tempo silencioso.~Ligue o primeiro par e separe suavemente o segundo.",
        "Una respiración en la melodía~Deja un pulso de silencio después de D4 y G4, soltando las teclas sin pedal.~Si el silencio aún suena, levanta el dedo anterior al comenzar la pausa.~Liga el primer par y separa suavemente el segundo.",
        "Ein Atemzug in der Melodie~Lass nach D4 und G4 einen Schlag frei; löse die Tasten ohne Pedal.~Klingt die Pause noch, hebe den vorherigen Finger am Pausenbeginn.~Verbinde das erste Paar und trenne das zweite sanft.",
        "メロディーの呼吸~ペダルなしで鍵盤を離し、D4とG4の後に1拍の休符を入れます。~音が残れば休符の始まりで前の指を上げます。~最初の2音をつなげ、次の2音を軽く切ります。",
        "旋律中的呼吸~不用踏板，D4与G4后各留一拍休止并松键。~若空拍仍有音，在休止开始时抬起前一个手指。~第一对音连贯，第二对轻轻分开。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "left-hand-anchor",
    "[C3,C4] D4 E4 G4 [G3,F4] E4 D4 C4",
    "",
    [
        "A left-hand anchor~Add left-hand C3 under the first C4 and G3 under F4 in bar two; let the right hand carry the melody.~If the left hand covers the tune, play its note softer before adding the melody again.~Remove the support once, then restore it and compare the harmony.",
        "Um apoio da esquerda~Acrescente C3 da esquerda sob o primeiro C4 e G3 sob F4 no segundo compasso; a direita conduz a melodia.~Se a esquerda encobrir a frase, toque seu apoio mais suave antes de juntar.~Retire o apoio uma vez, recoloque e compare a harmonia.",
        "Un apoyo de la izquierda~Añade C3 izquierdo bajo el primer C4 y G3 bajo F4 en el segundo compás; la derecha lleva la melodía.~Si tapa la frase, toca el apoyo más suave antes de unir.~Quita el apoyo una vez, recupéralo y compara la armonía.",
        "Ein Anker links~Setze links C3 unter das erste C4 und G3 unter F4 in Takt zwei; rechts führt die Melodie.~Verdeckt links die Melodie, spiele den Stützton erst leiser, dann gemeinsam.~Lass den Stützton einmal weg und vergleiche beim Zurückholen die Harmonie.",
        "左手の支え~最初のC4に左手C3、2小節目のF4にG3を加え、右手で旋律を導きます。~左手が旋律を隠したら、支える音を弱くしてから合わせます。~支えを一度外し、戻して和声を比べます。",
        "左手的支点~第一个C4下加左手C3，第二小节F4下加G3，右手带旋律。~若左手盖住旋律，先单独把支撑音弹轻，再合起来。~去掉一次支撑，再恢复，比较和声。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "melody-with-roots",
    "[C3,C4] D4 E4 - [F3,F4] E4 D4 - [G3,G4] F4 E4 D4 [C3,C4]/2 -/2",
    "",
    [
        "Melody with roots~Play four bars with left-hand roots C3–F3–G3–C3 and a right-hand melody that ends on C4.~If the hands lose the change, practise the roots alone while speaking the melody rhythm.~Change bar two of the melody while keeping all four roots.",
        "Melodia com fundamentais~Toque quatro compassos com C3–F3–G3–C3 na esquerda e melodia da direita terminando em C4.~Se perderem a troca, pratique só fundamentais falando o ritmo da melodia.~Altere o segundo compasso melódico e mantenha as quatro fundamentais.",
        "Melodía con fundamentales~Toca cuatro compases con C3–F3–G3–C3 en la izquierda y melodía derecha que termine en C4.~Si pierden el cambio, practica fundamentales recitando el ritmo melódico.~Cambia el segundo compás melódico conservando las cuatro fundamentales.",
        "Melodie mit Grundtönen~Spiele vier Takte mit C3–F3–G3–C3 links und einer rechten Melodie bis C4.~Verlieren die Hände den Wechsel, übe Grundtöne und sprich den Melodierhythmus.~Ändere den zweiten Melodietakt, behalte alle vier Grundtöne.",
        "ルートとメロディー~左手C3–F3–G3–C3と、C4で終わる右手旋律を4小節弾きます。~変わり目が崩れたらルートだけを弾き、旋律のリズムを声で数えます。~4つのルートを保ち、旋律の2小節目を変えます。",
        "根音与旋律~左手C3–F3–G3–C3，右手旋律最后到C4，共四小节。~若双手丢失转换，只练根音，同时念旋律节奏。~保持四个根音，修改旋律第二小节。",
    ],
)
row(
    "piano",
    "melody-and-support",
    "swap-a-small-role",
    "[C4,C5] D4 E4 - [F4,C5] E4 D4 C4",
    "",
    [
        "An extra role swap~Let the left hand play C4–D4–E4 while the right adds C5, then G4, as light support.~If the left melody feels heavy, practise it alone with fingers 3–2–1 before combining.~Return the melody to the right hand and describe the change in balance.",
        "Uma pequena troca de papéis~Deixe a esquerda tocar C4–D4–E4 enquanto a direita apoia levemente com C5 e depois G4.~Se a melodia pesar, pratique só a esquerda com dedos 3–2–1 antes de juntar.~Devolva a melodia à direita e descreva a mudança de equilíbrio.",
        "Un pequeño cambio de papeles~La izquierda toca C4–D4–E4 y la derecha apoya suavemente con C5 y luego G4.~Si pesa la melodía, practica izquierda sola con dedos 3–2–1 antes de unir.~Devuelve la melodía a la derecha y describe el equilibrio.",
        "Ein kleiner Rollenwechsel~Spiele links C4–D4–E4; rechts stützen C5 und dann G4 leise.~Wirkt die linke Melodie schwer, übe sie allein mit 3–2–1 vor dem Zusammenspiel.~Gib die Melodie wieder nach rechts und beschreibe die Balance.",
        "小さな役割交換~左手でC4–D4–E4を弾き、右手はC5、次にG4で軽く支えます。~左の旋律が重ければ3–2–1指で片手ずつ練習してから合わせます。~旋律を右に戻し、バランスの変化を説明します。",
        "小范围交换角色~左手弹C4–D4–E4，右手先C5后G4轻轻支撑。~若左手旋律沉重，先用3–2–1指单练，再合奏。~将旋律交还右手，描述平衡变化。",
    ],
)
# Expansion phase: explicitly authored physical setups, not transpositions of the guitar pilot.
row(
    "ukulele",
    "reentrant-foundation",
    "know-the-four-strings",
    "G4 C4 E4 A4 A4 E4 C4 G4",
    "4:0 3:0 2:0 1:0 1:0 2:0 3:0 4:0",
    [
        "Hear re-entrant tuning~Play open strings G4–C4–E4–A4 in course order: the fourth string is higher than C4.~If you expect a descending scale, compare G4 and C4 separately; string order is not pitch order.~Find the highest and lowest open pitches without assuming the outer strings.",
        "Ouça a afinação reentrante~Toque cordas soltas G4–C4–E4–A4 na ordem física; a quarta é mais aguda que C4.~Se esperar uma escala descendente, compare G4 e C4; ordem de corda não é ordem de altura.~Ache a maior e menor altura sem presumir cordas externas.",
        "Escucha la afinación reentrante~Toca G4–C4–E4–A4 abiertas en orden físico: la cuarta está por encima de C4.~Si esperas una escala descendente, compara G4 y C4; orden de cuerda no es altura.~Encuentra la nota abierta más alta y más baja.",
        "Höre die re-entrante Stimmung~Spiele offene G4–C4–E4–A4 in Saitenfolge: Saite vier liegt höher als C4.~Erwartest du eine fallende Skala, vergleiche G4 und C4 einzeln; Saitenfolge ist keine Tonhöhenfolge.~Finde den höchsten und tiefsten offenen Ton.",
        "リエントラント調弦を聴く~弦の順番で開放G4–C4–E4–A4を弾きます。第4弦はC4より高い音です。~下降音階を期待したらG4とC4を個別に比べます。弦順と高さの順は異なります。~外側の弦と思い込まず、最も高い開放音と低い音を探します。",
        "听见回入式调弦~按物理弦序弹空弦G4–C4–E4–A4，第4弦高于C4。~若以为会一路下降，单独比较G4与C4；弦序不等于音高顺序。~不要假设外侧弦，找最高和最低空弦音。",
    ],
)
row(
    "ukulele",
    "reentrant-foundation",
    "a-clean-c-chord",
    "G4 C4 E4 C5 [G4,C4,E4,C5]/2 -/2",
    "4:0 3:0 2:0 1:3 [4:0,3:0,2:0,1:3]@2 -@2",
    [
        "A clean C chord~Fret string 1 at fret 3 and play each course before a gentle C strum.~If one string buzzes, test that course alone and place the finger close behind its fret.~Play only strings 3–2–1 and compare the lighter C voicing.",
        "Um acorde de dó limpo~Prenda corda 1 casa 3 e toque cada corda antes de uma batida suave de C.~Se houver trastejo, teste só essa corda e aproxime o dedo por trás do traste.~Toque apenas cordas 3–2–1 e compare a voz mais leve de C.",
        "Un do limpio~Pisa cuerda 1 traste 3 y escucha cada cuerda antes de rasguear C suavemente.~Si zumba una cuerda, pruébala sola y acerca el dedo por detrás del traste.~Toca solo cuerdas 3–2–1 y compara la voz ligera de C.",
        "Ein sauberer C-Akkord~Greife Saite 1 Bund 3 und spiele jede Saite vor einem sanften C-Anschlag.~Schnarrt eine Saite, prüfe sie allein und setze den Finger knapp hinter den Bund.~Spiele nur Saiten 3–2–1 und vergleiche den leichteren C-Klang.",
        "澄んだCコード~第1弦3フレットを押さえ、軽くCをストロークする前に各弦を弾きます。~1本がビビるならその弦だけを試し、フレットのすぐ手前へ指を置きます。~第3–2–1弦だけで弾き、軽いCの響きを比べます。",
        "清楚的C和弦~按第1弦第3品，先逐弦听，再轻扫C。~若一根弦有杂音，单独试它，手指靠近品丝后侧。~只弹第3–2–1弦，比较较轻的C排列。",
    ],
)
row(
    "ukulele",
    "reentrant-foundation",
    "strum-and-rest",
    "[G4,C4,E4,C5] - [G4,C4,E4,C5] - [G4,C4,E4,C5]/2 -/2",
    "[4:0,3:0,2:0,1:3] - [4:0,3:0,2:0,1:3] - [4:0,3:0,2:0,1:3]@2 -@2",
    [
        "Strum and rest~Use gentle downstrokes on C and leave counted silent beats between them.~If stopping makes the wrist tense, reduce movement and mute softly after the stroke.~Keep the rest but try a quieter second stroke.",
        "Batida e pausa~Use batidas suaves para baixo em C e conte tempos silenciosos entre elas.~Se parar tensionar o pulso, reduza o movimento e abafe suavemente após a batida.~Preserve a pausa e deixe a segunda batida mais leve.",
        "Rasgueo y silencio~Usa golpes suaves hacia abajo en C y cuenta los silencios entre ellos.~Si parar tensa la muñeca, reduce el gesto y apaga suavemente tras el golpe.~Conserva el silencio y suaviza el segundo golpe.",
        "Anschlag und Pause~Spiele sanfte Abschläge auf C und zähle die freien Schläge dazwischen.~Verspannt das Stoppen das Handgelenk, verkleinere die Bewegung und dämpfe weich.~Behalte die Pause und spiele den zweiten Schlag leiser.",
        "ストロークと休符~Cを軽くダウンストロークし、その間の無音の拍も数えます。~止めると手首が固まるなら動きを小さくし、弾いた後に軽くミュートします。~休符を保ち、2回目を弱くします。",
        "扫弦与休止~C用轻柔下扫，两次之间数出安静的拍。~若止音让手腕紧张，缩小动作，扫后轻轻闷音。~保留休止，第二次扫得更轻。",
    ],
)
row(
    "ukulele",
    "reentrant-foundation",
    "melody-on-two-strings",
    "E4 F4 G4 A4 G4 F4 E4 -",
    "2:0 2:1 2:3 1:0 2:3 2:1 2:0 -",
    [
        "A compact melody~Play E4–F4–G4 on string 2, then open A4 on string 1 and return.~If open G4 distracts you, stop string 4 and work only the two melody strings.~Begin at A4 and descend to E4 with the same fingers.",
        "Uma melodia compacta~Toque E4–F4–G4 na corda 2, depois A4 solto na corda 1 e volte.~Se G4 solto distrair, abafe a corda 4 e trabalhe só as duas melódicas.~Comece em A4 e desça a E4 com os mesmos dedos.",
        "Una melodía compacta~Toca E4–F4–G4 en cuerda 2, después A4 abierta en cuerda 1 y vuelve.~Si distrae G4 abierto, apaga cuerda 4 y usa solo las dos melódicas.~Empieza en A4 y baja a E4 con los mismos dedos.",
        "Eine kompakte Melodie~Spiele E4–F4–G4 auf Saite 2, dann offenes A4 auf Saite 1 und zurück.~Lenkt offenes G4 ab, dämpfe Saite 4 und nutze nur die Melodiesaiten.~Beginne bei A4 und steige mit denselben Fingern nach E4 ab.",
        "コンパクトな旋律~第2弦でE4–F4–G4、次に第1弦開放A4を弾き、戻ります。~開放G4が紛れたら第4弦を止め、旋律の2本だけを使います。~同じ指でA4からE4へ下ります。",
        "紧凑的旋律~第2弦弹E4–F4–G4，再弹第1弦空弦A4并返回。~若空弦G4干扰，止住第4弦，只练两根旋律弦。~用相同指法从A4下行到E4。",
    ],
)
row(
    "ukulele",
    "reentrant-foundation",
    "melody-and-chord-answer",
    "E4 F4 G4 - [G4,C4,E4,C5]/2 -/2 E4 G4 A4 - [G4,C4,E4,C5]/2 -/2",
    "2:0 2:1 2:3 - [4:0,3:0,2:0,1:3]@2 -@2 2:0 2:3 1:0 - [4:0,3:0,2:0,1:3]@2 -@2",
    [
        "Melody, then a chord answer~Alternate a short melody with one C chord; use the pause to prepare string 1 fret 3.~If the chord arrives late, practise only the silent preparation and chord attack.~Create a new three-note opening while keeping the C answer.",
        "Melodia e resposta de acorde~Alterne melodia curta e acorde C; use a pausa para preparar corda 1 casa 3.~Se o acorde atrasar, pratique só a preparação silenciosa e seu ataque.~Crie outra abertura de três notas e mantenha a resposta C.",
        "Melodía y respuesta de acorde~Alterna una melodía corta con C; usa la pausa para preparar cuerda 1 traste 3.~Si el acorde llega tarde, practica solo preparación silenciosa y ataque.~Crea otra entrada de tres notas y conserva la respuesta C.",
        "Melodie und Akkordantwort~Wechsle kurze Melodie und C-Akkord; bereite Saite 1 Bund 3 in der Pause vor.~Kommt der Akkord spät, übe nur stille Vorbereitung und Anschlag.~Erfinde drei neue Anfangstöne, behalte die C-Antwort.",
        "旋律とコードの答え~短い旋律とCコードを交互に弾き、休符で第1弦3フレットを準備します。~コードが遅れたら無音の準備と弾く瞬間だけを練習します。~Cの答えを保ち、3音の出だしを新しく作ります。",
        "旋律与和弦回答~短旋律和C和弦交替，利用休止准备第1弦第3品。~若和弦迟到，只练无声准备与起音。~换一个三音开头，保留C回答。",
    ],
)
row(
    "ukulele",
    "reentrant-foundation",
    "reentrant-unison",
    "G4 G4 A4 G4/2 -/3",
    "4:0 2:3 1:0 4:0@2 -@3",
    [
        "An extra re-entrant unison~Compare open string 4 G4 with string 2 fret 3 G4; both have the same pitch.~If they sound an octave apart, your ukulele may have low G and needs a different setup.~For high G only, choose either G4 to answer open A4.",
        "Um uníssono reentrante extra~Compare G4 da corda 4 solta com G4 na corda 2 casa 3; são a mesma altura.~Se houver uma oitava, seu ukulele pode ter sol grave e precisa de outro setup.~Somente em sol agudo, escolha um G4 para responder a A4 solto.",
        "Un unísono reentrante extra~Compara G4 de cuerda 4 abierta con G4 de cuerda 2 traste 3: misma altura.~Si hay una octava, quizá tienes sol grave y necesitas otra configuración.~Solo con sol agudo, elige un G4 para responder a A4 abierta.",
        "Ein zusätzliches Unisono~Vergleiche G4 auf leerer Saite 4 mit Saite 2 Bund 3: gleiche Höhe.~Liegt eine Oktave dazwischen, hat dein Ukulele vielleicht tiefes G und braucht ein anderes Setup.~Nur bei hohem G: wähle einen G4-Weg als Antwort auf A4.",
        "リエントラントの同音~第4弦開放G4と第2弦3フレットG4を比べます。同じ高さです。~1オクターブ違うなら低いGの調弦かもしれず、別の設定が必要です。~高いGの場合だけ、開放A4に答えるG4の弦を選びます。",
        "回入式同音的加练~比较第4弦空弦G4与第2弦第3品G4，应是相同高度。~若相差八度，可能装了低G弦，需要另一个设置。~仅高G调弦时，任选一个G4回答空弦A4。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "hear-paired-courses",
    "G3 D4 A4 E5 E5 A4 D4 G3",
    "4:0 3:0 2:0 1:0 1:0 2:0 3:0 4:0",
    [
        "Hear the paired courses~Play open G3–D4–A4–E5; each displayed course represents two physical strings tuned together.~If a course beats or sounds rough, tune both strings separately before continuing.~Compare one course with its neighbour and name the fifth.",
        "Ouça os cursos duplos~Toque G3–D4–A4–E5 soltos; cada curso exibido representa duas cordas físicas afinadas juntas.~Se um curso pulsar ou soar áspero, afine suas duas cordas separadamente.~Compare cursos vizinhos e nomeie a quinta.",
        "Escucha los órdenes dobles~Toca G3–D4–A4–E5 abiertos; cada orden mostrado representa dos cuerdas físicas afinadas juntas.~Si vibra irregularmente, afina ambas cuerdas por separado.~Compara órdenes vecinos y nombra la quinta.",
        "Höre die Doppelsaitenchöre~Spiele offene G3–D4–A4–E5; jeder dargestellte Chor steht für zwei gleich gestimmte Saiten.~Schwebt oder rauht ein Chor, stimme beide Saiten einzeln.~Vergleiche benachbarte Chöre und benenne die Quinte.",
        "複弦のコースを聴く~開放G3–D4–A4–E5を弾きます。表示の各コースは同じ音に合わせた2本の弦です。~うなりや濁りが出たら2本を別々に調弦します。~隣のコースを比べ、5度を確認します。",
        "听成对的弦组~弹空弦G3–D4–A4–E5，屏幕每个弦组代表两根同调实体弦。~若弦组有拍频或粗糙感，先分别调准两根弦。~比较相邻弦组，指出五度。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "alternate-on-one-course",
    "D4 E4 F#4 G4 F#4 E4 D4 -",
    "3:0 3:2 3:4 3:5 3:4 3:2 3:0 -",
    [
        "Alternate on one course~On the D course play frets 0–2–4–5 with alternating down and up strokes, then return.~If the pick catches one string, reduce depth and cross both strings evenly.~Start the return with the opposite stroke and preserve the pulse.",
        "Alterne em um curso~No curso ré toque casas 0–2–4–5 alternando palhetadas para baixo e cima, depois volte.~Se a palheta prender em uma corda, reduza a profundidade e cruze ambas por igual.~Comece a volta com a palhetada oposta e preserve o pulso.",
        "Alterna en un orden~En el orden re toca trastes 0–2–4–5 alternando púa abajo y arriba, luego vuelve.~Si la púa atrapa una cuerda, reduce profundidad y cruza ambas por igual.~Empieza el regreso con el golpe opuesto y conserva el pulso.",
        "Wechselschlag auf einem Chor~Spiele auf dem D-Chor Bünde 0–2–4–5 mit Ab- und Aufschlägen, dann zurück.~Bleibt das Plektrum hängen, spiele flacher und streiche beide Saiten gleichmäßig.~Beginne den Rückweg mit dem anderen Schlag bei gleichem Puls.",
        "1コースで交互に弾く~Dコースの0–2–4–5フレットをダウンとアップで交互に弾いて戻ります。~片方にピックが引っ掛かるなら浅く入れ、2本を均等に通ります。~反対の方向から帰りを始め、拍を保ちます。",
        "在一个弦组交替拨弦~D弦组弹0–2–4–5品，下上交替，再返回。~若拨片卡住一根弦，减少入弦深度，均匀经过两根弦。~回程从相反拨向开始，保持节拍。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "cross-the-fifth",
    "D4 F#4 A4 B4 A4 F#4 D4 -",
    "3:0 3:4 2:0 2:2 2:0 3:4 3:0 -",
    [
        "Cross to the next course~Play D4–F#4 on the D course and A4–B4 on the A course, then return.~If the crossing rushes, place a counted rest before A4 and keep the pick movement small.~Change B4 to A4 held for two beats.",
        "Cruze ao próximo curso~Toque D4–F#4 no curso ré e A4–B4 no curso lá, depois volte.~Se a troca acelerar, ponha pausa contada antes de A4 e reduza o gesto da palheta.~Troque B4 por A4 sustentado por dois tempos.",
        "Cruza al orden vecino~Toca D4–F#4 en el orden re y A4–B4 en el orden la, luego vuelve.~Si el cruce acelera, cuenta una pausa antes de A4 y reduce el gesto.~Cambia B4 por A4 sostenido dos pulsos.",
        "Wechsle zum Nachbarchor~Spiele D4–F#4 auf D und A4–B4 auf A, dann zurück. Internationale Notennamen: B bedeutet H.~Beschleunigt der Wechsel, zähle vor A4 eine Pause und halte den Weg klein.~Ersetze B4 durch A4 für zwei Schläge.",
        "隣のコースへ~DコースでD4–F#4、AコースでA4–B4を弾いて戻ります。~渡る時に急いだらA4の前に数えた休符を置き、ピックの動きを小さくします。~B4を2拍のA4へ変えます。",
        "跨到相邻弦组~D弦组弹D4–F#4，A弦组弹A4–B4，再返回。~若跨弦加速，在A4前数一个休止，缩小拨片动作。~把B4换成保持两拍的A4。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "a-small-d-triad",
    "D4 F#4 A4 [D4,A4,F#5]/2 -/3",
    "3:0 3:4 2:0 [3:0,2:0,1:2]@2 -@3",
    [
        "A small D triad~First hear D4–F#4–A4 separately; for the chord use open D, F#4 at A-course fret 9 and A4 at E-course fret 5.~If the chord stretch is uncomfortable, keep the single-note version and ask for a fingering review.~Compare the arpeggio with a comfortable chord voicing; speed is unnecessary.",
        "Uma tríade pequena de ré~Ouça D4–F#4–A4 separados; o acorde usa ré solto, F#4 no curso lá casa 9 e A4 no mi casa 5.~Se a abertura incomodar, fique nas notas separadas e peça revisão de digitação.~Compare arpejo e uma disposição confortável; velocidade não é necessária.",
        "Una tríada pequeña de re~Escucha D4–F#4–A4 separados; el acorde usa re abierto, F#4 en la casa 9 del orden la y A4 en la 5 del mi.~Si la abertura molesta, usa notas separadas y pide revisión.~Compara arpegio y disposición cómoda sin buscar velocidad.",
        "Ein kleiner D-Dreiklang~Höre D4–F#4–A4 einzeln; der Akkord nutzt offenes D, F#4 auf A Bund 9 und A4 auf E Bund 5.~Ist die Spanne unbequem, bleibe bei Einzeltönen und lass den Fingersatz prüfen.~Vergleiche Arpeggio und bequeme Akkordlage ohne Tempoziel.",
        "小さなDの三和音~D4–F#4–A4を別々に聴き、和音は開放D、Aコース9フレットF#4、Eコース5フレットA4を使います。~開きが不快なら単音で続け、指使いの確認を求めます。~速さを求めず、分散和音と無理のない配置を比べます。",
        "小型D三和弦~先逐音听D4–F#4–A4；和弦用空弦D、A弦组第9品F#4及E弦组第5品A4。~若跨度不适，保留单音版本，请人检查指法。~比较分解和弦与舒适排列，不追求速度。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "a-four-bar-phrase",
    "D4 E4 F#4 - A4 B4 A4 - G4 F#4 E4 D4 F#4 - D4/2",
    "3:0 3:2 3:4 - 2:0 2:2 2:0 - 3:5 3:4 3:2 3:0 3:4 - 3:0@2",
    [
        "A phrase between courses~Make sixteen beats with a D4 opening, one crossing to the A course, counted silence and a final D4.~If the two strings of a course separate in time, reduce picking depth before repeating.~Change the middle two notes and preserve the final D4.",
        "Uma frase entre cursos~Monte dezesseis tempos com D4 inicial, uma troca ao curso lá, silêncio contado e D4 final.~Se as duas cordas do curso desencontrarem, reduza a profundidade da palheta.~Altere as duas notas do meio e preserve D4 final.",
        "Una frase entre órdenes~Crea dieciséis pulsos con D4 inicial, cruce al orden la, silencio contado y D4 final.~Si las dos cuerdas no coinciden, reduce profundidad de púa.~Cambia las dos notas centrales y conserva D4 final.",
        "Eine Phrase zwischen Chören~Gestalte sechzehn Schläge ab D4, einen Wechsel zum A-Chor, gezählte Stille und D4 am Ende.~Klingen die Chorsaiten zeitversetzt, verringere die Plektrumtiefe.~Ändere die mittleren zwei Töne, behalte das letzte D4.",
        "コースをつなぐフレーズ~D4で始め、Aコースへの移動、数えた休符、最後のD4を含む16拍を作ります。~2本が同時に鳴らないならピックを浅くして再試行します。~最後のD4を保ち、中間の2音を変えます。",
        "连接弦组的乐句~写十六拍，D4开头，跨到A弦组，含数拍休止，D4结束。~若同组两弦起音错开，减少拨片入弦深度再试。~保留末尾D4，改变中间两音。",
    ],
)
row(
    "mandolin",
    "paired-courses",
    "two-attacks-one-note",
    "D4/0.5 D4/0.5 E4 F#4 G4 F#4 E4 D4/2",
    "3:0@0.5 3:0@0.5 3:2 3:4 3:5 3:4 3:2 3:0@2",
    [
        "An extra repeated attack~Give D4 two even eighth-note attacks before the phrase; use a relaxed down-up pair.~If the second attack is louder, shorten the pick path rather than gripping harder.~Place the repeated pair on the final D4 instead; this is not yet tremolo.",
        "Um ataque repetido extra~Dê dois ataques iguais de colcheia em D4 antes da frase, com par baixo-cima relaxado.~Se o segundo for forte, encurte o caminho da palheta sem apertar.~Ponha o par no D4 final; ainda não é tremolo.",
        "Un ataque repetido extra~Da dos ataques de corchea iguales a D4 antes de la frase, con abajo-arriba relajado.~Si el segundo es más fuerte, acorta el recorrido sin apretar más.~Pon la pareja en D4 final; aún no es trémolo.",
        "Ein zusätzlicher Doppelanschlag~Spiele vor der Phrase zwei gleiche Achtel auf D4 mit lockerem Ab-Auf-Paar.~Ist der zweite lauter, verkürze den Weg statt fester zu greifen.~Setze das Paar ans letzte D4; dies ist noch kein Tremolo.",
        "繰り返すアタックの追加~フレーズの前にD4を均等な8分音符2つで、力を抜いたダウン・アップで弾きます。~2回目が強ければ握りを強めず、ピックの経路を短くします。~最後のD4に2音を置きます。まだトレモロではありません。",
        "重复起音的加练~乐句前D4弹两个均匀八分音符，放松地下上交替。~若第二音更响，不握更紧，而缩短拨片路线。~把两次起音移到末尾D4；这还不是轮指。",
    ],
)

# Correct the octave/register explanation for the comfortable open D voicing.
triad = next(r for r in ROWS if r["slug"] == "a-small-d-triad")
triad["values"] = [
    "A small D triad~Hear D4–F#4–A4 separately; then play open D4, open A4 and F#5 at E-course fret 2 as a D chord.~If one course rings poorly, practise it alone, then add the other open courses with a light attack.~Compare the low F#4 in the arpeggio with F#5 in this comfortable voicing.",
    "Uma tríade pequena de ré~Ouça D4–F#4–A4 separados; depois toque D4 e A4 soltos com F#5 no curso mi casa 2 como acorde D.~Se um curso não soar limpo, pratique-o sozinho e acrescente os soltos com ataque leve.~Compare F#4 do arpejo com F#5 dessa disposição confortável.",
    "Una tríada pequeña de re~Escucha D4–F#4–A4 separados; después toca D4 y A4 abiertos con F#5 en el orden mi traste 2 como acorde D.~Si un orden suena mal, practícalo solo y añade los abiertos con ataque ligero.~Compara F#4 del arpegio con F#5 de esta disposición cómoda.",
    "Ein kleiner D-Dreiklang~Höre D4–F#4–A4 einzeln; spiele dann offenes D4 und A4 mit F#5 auf E Bund 2 als D-Akkord.~Klingt ein Chor unsauber, übe ihn allein und füge die offenen Chöre leise hinzu.~Vergleiche F#4 im Arpeggio mit F#5 in dieser bequemen Lage.",
    "小さなDの三和音~D4–F#4–A4を別々に聴き、次に開放D4とA4、Eコース2フレットのF#5でD和音を弾きます。~濁るコースがあれば単独で練習し、軽いアタックで開放音を加えます。~分散和音のF#4と、この無理のない配置のF#5を比べます。",
    "小型D三和弦~先逐音听D4–F#4–A4，再用空弦D4、A4及E弦组第2品F#5弹D和弦。~若某组不清楚，先单练，再轻轻加入空弦组。~比较分解和弦中的F#4与舒适排列中的F#5。",
]

swap = next(r for r in ROWS if r["slug"] == "swap-a-small-role")
swap["values"] = [
    "An extra role swap~Let the left hand play C4–D4–E4–F4 with fingers 5–4–3–2; the right supports with C5 twice.~If the left melody feels heavy, practise those four notes alone before adding the light right-hand C5.~Return the melody to the right and the roots to the left, then compare the balance.",
    "Uma pequena troca de papéis~A esquerda toca C4–D4–E4–F4 com dedos 5–4–3–2; a direita apoia com C5 duas vezes.~Se a melodia pesar, pratique essas quatro notas sozinhas antes de acrescentar C5 leve da direita.~Devolva a melodia à direita e as fundamentais à esquerda; compare o equilíbrio.",
    "Un pequeño cambio de papeles~La izquierda toca C4–D4–E4–F4 con dedos 5–4–3–2; la derecha apoya con C5 dos veces.~Si pesa la melodía, practica esas cuatro notas solas antes de añadir C5 suave de la derecha.~Devuelve melodía a la derecha y fundamentales a la izquierda; compara el equilibrio.",
    "Ein kleiner Rollenwechsel~Spiele links C4–D4–E4–F4 mit 5–4–3–2; rechts stützt zweimal C5.~Wirkt die linke Melodie schwer, übe diese vier Töne allein vor dem leisen rechten C5.~Gib die Melodie nach rechts und die Grundtöne nach links zurück; vergleiche die Balance.",
    "小さな役割交換~左手5–4–3–2でC4–D4–E4–F4を弾き、右手はC5で2回支えます。~左の旋律が重ければこの4音を単独で練習し、弱い右手C5を加えます。~旋律を右、ルートを左に戻してバランスを比べます。",
    "小范围交换角色~左手5–4–3–2弹C4–D4–E4–F4，右手两次用C5支撑。~若左手旋律沉重，先单练这四音，再加轻柔的右手C5。~旋律交还右手，根音交还左手，比较平衡。",
]
UNIT_SUMMARIES = {
    "notes-and-pulse": [
        "Find notes on one string, hear a small interval, phrase three pitches and count silence before creating a two-bar answer.",
        "Localize notas em uma corda, ouça um intervalo pequeno, fraseie três alturas e conte o silêncio antes de criar uma resposta de dois compassos.",
        "Localiza notas en una cuerda, escucha un intervalo pequeño, frasea tres alturas y cuenta el silencio antes de crear una respuesta de dos compases.",
        "Finde Töne auf einer Saite, höre kleine Intervalle, forme drei Tonhöhen und zähle Stille für eine Antwort in zwei Takten.",
        "1本の弦で音を探し、小さい音程と3音のフレーズ、休符を学んで2小節の答えを作ります。",
        "在一根弦找音，听小音程，组织三音乐句并数休止，最后创造两小节回答。",
    ],
    "two-places": [
        "Choose unison routes, cross strings and use a triad to shape a four-bar phrase with an intentional ending.",
        "Escolha rotas em uníssono, cruze cordas e use uma tríade numa frase de quatro compassos com final intencional.",
        "Elige rutas al unísono, cruza cuerdas y usa una tríada en una frase de cuatro compases con final elegido.",
        "Wähle Unisonowege, wechsle Saiten und gestalte mit einem Dreiklang vier Takte mit bewusstem Ende.",
        "同じ音の経路を選び、弦を渡り、三和音を使って終わりを決めた4小節を作ります。",
        "选择同音路径、跨弦，以三和弦组织四小节及有意选择的结尾。",
    ],
    "supporting-line": [
        "Make roots, fifths, release and harmonic arrivals support a four-bar accompaniment.",
        "Faça tônicas, quintas, soltura e chegadas harmônicas sustentarem um acompanhamento de quatro compassos.",
        "Usa fundamentales, quintas, soltura y llegadas armónicas para sostener cuatro compases de acompañamiento.",
        "Trage vier Begleittakte mit Grundtönen, Quinten, klaren Abschlüssen und harmonischen Ankünften.",
        "ルート、5度、止め方、和音への着地で4小節の伴奏を支えます。",
        "用根音、五音、止音和和声到达支撑四小节伴奏。",
    ],
    "melody-and-support": [
        "Shape a five-finger melody, count rests and balance changing roots underneath it.",
        "Modele uma melodia de cinco dedos, conte pausas e equilibre as fundamentais que mudam sob ela.",
        "Da forma a una melodía de cinco dedos, cuenta silencios y equilibra fundamentales cambiantes debajo.",
        "Forme eine Fünffinger-Melodie, zähle Pausen und balanciere wechselnde Grundtöne darunter.",
        "5本の指の旋律と休符を整え、下の変わるルートとバランスを取ります。",
        "塑造五指旋律、数休止，并平衡下方变化的根音。",
    ],
    "reentrant-foundation": [
        "Understand high-G string order, hear each C-chord course and alternate a compact melody with chord answers.",
        "Entenda a ordem com sol agudo, ouça cada corda de C e alterne melodia compacta com respostas de acorde.",
        "Entiende el orden con sol agudo, escucha cada cuerda de C y alterna melodía compacta con respuestas de acorde.",
        "Verstehe die hohe-G-Saitenfolge, höre jede C-Akkordsaite und wechsle kompakte Melodie und Akkordantwort.",
        "高いGの弦順とCコードの各弦を聴き、短い旋律とコードの答えを交互に弾きます。",
        "理解高G弦序，逐弦听C和弦，交替紧凑旋律与和弦回答。",
    ],
    "paired-courses": [
        "Hear paired courses in fifths, control alternate picking and connect melody with an open D voicing.",
        "Ouça cursos duplos em quintas, controle palhetada alternada e conecte melodia a uma disposição aberta de D.",
        "Escucha órdenes dobles en quintas, controla púa alternada y conecta melodía con una disposición abierta de D.",
        "Höre Doppelchöre in Quinten, kontrolliere Wechselschlag und verbinde Melodie mit einer offenen D-Lage.",
        "5度の複弦を聴き、交互のピッキングを整え、旋律と開放Dの配置をつなぎます。",
        "听五度双弦组、控制交替拨弦，将旋律连接到开放D排列。",
    ],
}
TRANSFER_SCORES = {
    "one-string-landmarks": "D4 C4 B3/2 -/4",
    "hear-the-distance": "E4 F4 - E4 F4 - E4/2",
    "three-note-question": "C4/2 D4 E4 D4 C4/2 -",
    "count-the-silence": "C4 - D4 E4 D4 C4/2 -",
    "two-bar-answer": "C4 D4 - E4 E4 D4 C4 -",
    "move-the-question": "C4 D4 E4 D4 C4/2 -/2 G3 A3 B3 A3 G3/2 -/2",
    "same-pitch-two-strings": "E4 G4 E4/2 -/4",
    "cross-two-strings": "C4 D4 - E4 F4 E4 D4 C4",
    "hear-a-triad": "C4 D4 E4 G4/2 E4 C4/2",
    "choose-the-ending": "C4 D4 E4 G4 E4 D4 C4/2",
    "four-bar-story": "C4 D4 E4 - G4 E4 D4 - E4 G4 E4 D4 D4 - C4/2",
    "change-the-touch": "C4 D4 E4 D4 C4/2 -/2 C4/0.5 -/0.5 D4/0.5 -/0.5 E4/0.5 -/0.5 D4/0.5 -/0.5 C4 - -/2",
    "root-on-one": "D2/2 -/2 D2/2 -/2",
    "root-and-fifth": "D2/2 A2/2 D2/2 A2/2",
    "length-and-release": "E2 - A1/2 E2 - A1/2",
    "arrive-at-the-change": "A1/2 -/2 D2/2 -/2",
    "four-bars-of-support": "A1/2 E2/2 D2/2 A2/2 G1/2 D2/2 A1 -/3",
    "a-small-anticipation": "A1/2 E2/2 D2/2 A2/2",
    "find-the-region": "C4/2 C5/2 C4/2 -/2",
    "five-finger-phrase": "E4 F4 G4 F4 E4 D4 C4/2",
    "breath-and-articulation": "C4 D4 E4/0.5 -/0.5 G4/0.5 -/0.5 C4/2 -/2",
    "left-hand-anchor": "C4 D4 E4 G4 F4 E4 D4 C4",
    "melody-with-roots": "[C3,C4] D4 E4 - [F3,F4] G4 F4 - [G3,G4] F4 E4 D4 [C3,C4]/2 -/2",
    "swap-a-small-role": "[C3,C4] D4 E4 G4 [G3,F4] E4 D4 C4",
    "know-the-four-strings": "C4 G4 C4 A4 - E4 C4/2",
    "a-clean-c-chord": "[C4,E4,C5]/2 -/2 [C4,E4,C5]/2 -/2",
    "strum-and-rest": "[G4,C4,E4,C5] - [C4,E4,C5] - [G4,C4,E4,C5]/2 -/2",
    "melody-on-two-strings": "A4 G4 F4 E4/2 -/3",
    "melody-and-chord-answer": "G4 F4 E4 - [G4,C4,E4,C5]/2 -/2 G4 E4 A4 - [G4,C4,E4,C5]/2 -/2",
    "reentrant-unison": "G4 A4 G4 A4 G4/2 -/2",
    "hear-paired-courses": "G3 D4 G3 D4 - A4 E5 -",
    "alternate-on-one-course": "G4 F#4 E4 D4/2 -/3",
    "cross-the-fifth": "D4 F#4 A4/2 F#4 D4/2 -",
    "a-small-d-triad": "D4 F#4 A4 - [D4,A4,F#5]/2 -/2",
    "a-four-bar-phrase": "D4 E4 F#4 - A4 B4 A4 - F#4 E4 E4 D4 F#4 - D4/2",
    "two-attacks-one-note": "D4 E4 F#4 G4 F#4 E4 D4/0.5 D4/0.5 -",
}
DRILL_SCORES = {
    "one-string-landmarks": "B3 C4 D4 C4",
    "hear-the-distance": "B3 C4 - B3 C#4 -",
    "three-note-question": "D4 E4 D4 C4",
    "count-the-silence": "D4 - E4 D4",
    "two-bar-answer": "C4 D4 - E4",
    "move-the-question": "G3 A3 B3 A3",
    "same-pitch-two-strings": "E4 E4 G4 G4",
    "cross-two-strings": "D4 E4 F4 E4",
    "hear-a-triad": "C4 E4 G4 E4",
    "choose-the-ending": "E4 C4/2 - E4 G4/2 -",
    "four-bar-story": "D4 - C4/2",
    "change-the-touch": "C4 D4 E4 D4",
    "root-on-one": "A1/2 -/2",
    "root-and-fifth": "A1/2 E2/2",
    "length-and-release": "A1 - A1/2",
    "arrive-at-the-change": "E2/2 D2/2",
    "four-bars-of-support": "G1/2 D2/2 A1/2 -/2",
    "a-small-anticipation": "A1/2 E2/1.5 D2/0.5 D2/2 A2/2",
    "find-the-region": "C4 D4 E4 F4 G4",
    "five-finger-phrase": "G4 F4 E4",
    "breath-and-articulation": "D4 - E4 G4 -",
    "left-hand-anchor": "[C3,C4] D4 E4 G4",
    "melody-with-roots": "[F3,F4] E4 D4 - [G3,G4] F4 E4 D4",
    "swap-a-small-role": "C4 D4 E4 F4 E4 D4 C4/2",
    "know-the-four-strings": "G4 C4 G4 C4",
    "a-clean-c-chord": "G4 C4 E4 C5",
    "strum-and-rest": "[G4,C4,E4,C5] - [G4,C4,E4,C5] -",
    "melody-on-two-strings": "F4 G4 A4 G4",
    "melody-and-chord-answer": "G4 - [G4,C4,E4,C5]/2",
    "reentrant-unison": "G4 G4 A4 G4",
    "hear-paired-courses": "G3 D4 A4 E5",
    "alternate-on-one-course": "D4 E4 F#4 G4",
    "cross-the-fifth": "F#4 A4 B4 A4",
    "a-small-d-triad": "D4 F#4 A4 - [D4,A4,F#5]/2",
    "a-four-bar-phrase": "F#4 E4 D4 - D4/2",
    "two-attacks-one-note": "D4/0.5 D4/0.5 E4 F#4",
}
FAMILIES = {
    "guitar": (
        [
            "Guitar / acoustic guitar",
            "Guitarra / violão",
            "Guitarra",
            "Gitarre",
            "ギター",
            "吉他",
        ],
        [40, 45, 50, 55, 59, 64],
        1,
        40,
        76,
        "E2 A2 D3 G3 B3 E4",
    ),
    "bass": (
        ["Bass", "Baixo", "Bajo", "Bass", "ベース", "贝斯"],
        [28, 33, 38, 43],
        1,
        28,
        55,
        "E1 A1 D2 G2",
    ),
    "piano": (
        ["Piano", "Piano", "Piano", "Klavier", "ピアノ", "钢琴"],
        [],
        1,
        48,
        84,
        "",
    ),
    "ukulele": (
        [
            "High-G ukulele",
            "Ukulele com sol agudo",
            "Ukelele con sol agudo",
            "Ukulele mit hohem G",
            "高いGのウクレレ",
            "高G尤克里里",
        ],
        [67, 60, 64, 69],
        1,
        60,
        81,
        "G4 C4 E4 A4",
    ),
    "mandolin": (
        ["Mandolin", "Bandolim", "Mandolina", "Mandoline", "マンドリン", "曼陀林"],
        [55, 62, 69, 76],
        2,
        55,
        88,
        "G3 D4 A4 E5",
    ),
}
UNIT_TITLES = {
    "notes-and-pulse": [
        "Notes and pulse",
        "Notas e pulso",
        "Notas y pulso",
        "Töne und Puls",
        "音と拍",
        "音与节拍",
    ],
    "two-places": [
        "One idea, two places",
        "Uma ideia, dois lugares",
        "Una idea, dos lugares",
        "Eine Idee, zwei Orte",
        "1つのアイデア、2つの場所",
        "一个想法，两处位置",
    ],
    "supporting-line": [
        "A line that supports",
        "Uma linha que sustenta",
        "Una línea que sostiene",
        "Eine tragende Linie",
        "支えるライン",
        "支撑的低音线",
    ],
    "melody-and-support": [
        "Melody and support",
        "Melodia e apoio",
        "Melodía y apoyo",
        "Melodie und Begleitung",
        "旋律と支え",
        "旋律与支撑",
    ],
    "reentrant-foundation": [
        "A compact musical space",
        "Um espaço musical compacto",
        "Un espacio musical compacto",
        "Ein kompakter Klangraum",
        "コンパクトな音楽空間",
        "紧凑的音乐空间",
    ],
    "paired-courses": [
        "A voice across paired courses",
        "Uma voz entre cursos duplos",
        "Una voz entre órdenes dobles",
        "Eine Stimme auf Doppelsaiten",
        "複弦をつなぐ声",
        "双弦组之间的声音",
    ],
}
PATH_SUMMARIES = {
    "guitar": [
        "Foundations: find notes, count rests and shape short phrases across two strings.",
        "Fundamentos: localize notas, conte pausas e construa frases curtas em duas cordas.",
        "Fundamentos: localiza notas, cuenta silencios y crea frases cortas en dos cuerdas.",
        "Grundlagen: Töne finden, Pausen zählen und kurze Phrasen auf zwei Saiten gestalten.",
        "基礎：音を見つけ、休符を数え、2本の弦で短いフレーズを作ります。",
        "基础：找音、数休止，并在两根弦上组织短乐句。"
    ],
    "bass": [
        "Foundations: roots, fifths, note length and chord arrivals that support a four-bar accompaniment.",
        "Fundamentos: tônicas, quintas, duração das notas e chegadas que sustentam quatro compassos de acompanhamento.",
        "Fundamentos: fundamentales, quintas, duración de las notas y llegadas que sostienen cuatro compases de acompañamiento.",
        "Grundlagen: Grundtöne, Quinten, Tondauer und Ankünfte, die vier Begleittakte tragen.",
        "基礎：ルート、5度、音の長さ、和音の変わり目への着地で4小節の伴奏を支えます。",
        "基础：用根音、五音、时值与和弦到达支撑四小节伴奏。"
    ],
    "piano": [
        "Foundations: a five-finger melody, counted rests and simple left-hand roots.",
        "Fundamentos: melodia de cinco dedos, pausas contadas e fundamentais simples na mão esquerda.",
        "Fundamentos: melodía de cinco dedos, silencios contados y fundamentales sencillas en la mano izquierda.",
        "Grundlagen: Fünffinger-Melodie, gezählte Pausen und einfache Grundtöne in der linken Hand.",
        "基礎：5本の指の旋律、休符の数え方、左手のシンプルなルートを学びます。",
        "基础：五指旋律、数休止，以及左手的简单根音。"
    ],
    "ukulele": [
        "Foundations for high-G (re-entrant) tuning: string order, a C chord, strumming with rests and a short melody.",
        "Fundamentos para afinação com sol agudo (reentrante): ordem das cordas, acorde C, batida com pausas e uma melodia curta.",
        "Fundamentos para afinación con sol agudo (reentrante): orden de las cuerdas, acorde C, rasgueo con silencios y una melodía corta.",
        "Grundlagen für die Stimmung mit hohem G (re-entrant): Saitenfolge, C-Akkord, Anschlag mit Pausen und eine kurze Melodie.",
        "高いG（リエントラント）調弦の基礎：弦の順番、Cコード、休符を入れたストローク、短い旋律を学びます。",
        "高G（回入式）调弦基础：弦序、C和弦、带休止的扫弦和一段短旋律。"
    ],
    "mandolin": [
        "Foundations: paired courses tuned in fifths, alternate picking and a short phrase with an open D voicing.",
        "Fundamentos: pares de cordas afinados em quintas, palhetada alternada e uma frase curta com uma disposição aberta de D.",
        "Fundamentos: órdenes dobles afinados en quintas, púa alternada y una frase corta con una disposición abierta de D.",
        "Grundlagen: Doppelchöre in Quinten, Wechselschlag und eine kurze Phrase mit offener D-Lage.",
        "基礎：5度に調弦した複弦、ダウンとアップの交互ピッキング、開放Dの配置を使った短いフレーズを学びます。",
        "基础：五度定弦的双弦组、交替拨弦，以及带开放D排列的短乐句。"
    ]
}

SETUP_TEXT = {
    "guitar": [
        "Use a six-string guitar in E2–A2–D3–G3–B3–E4, without capo. String 1 is high E. Move the hand when needed; do not hold a wide stretch.",
        "Use guitarra ou violão de seis cordas em E2–A2–D3–G3–B3–E4, sem capo. Corda 1 é mi agudo. Desloque a mão quando necessário; não sustente aberturas amplas.",
        "Usa guitarra de seis cuerdas E2–A2–D3–G3–B3–E4, sin cejilla. La cuerda 1 es mi agudo. Mueve la mano cuando haga falta; no sostengas aberturas amplias.",
        "Nutze sechs Saiten in E2–A2–D3–G3–B3–E4 ohne Kapodaster. Internationale Notennamen: B bedeutet H. Saite 1 ist das hohe E. Verschiebe die Hand bei Bedarf; halte keine weite Dehnung.",
        "6弦、E2–A2–D3–G3–B3–E4、カポなしです。第1弦は高いEです。必要なら手を移動し、広い開きを保ち続けません。",
        "使用六弦E2–A2–D3–G3–B3–E4，不用变调夹。第1弦为高E。需要时移动手掌，不持续撑开大跨度。",
    ],
    "bass": [
        "Use four strings E1–A1–D2–G2. String 1 is G. Keep unused strings quiet and let the note duration support the pulse.",
        "Use quatro cordas E1–A1–D2–G2. Corda 1 é sol. Abafe cordas não usadas e faça a duração apoiar o pulso.",
        "Usa cuatro cuerdas E1–A1–D2–G2. La cuerda 1 es sol. Apaga las cuerdas libres y usa la duración para sostener el pulso.",
        "Nutze vier Saiten E1–A1–D2–G2. Saite 1 ist G. Dämpfe ungenutzte Saiten und stütze den Puls mit klaren Dauern.",
        "4弦のE1–A1–D2–G2です。第1弦はGです。使わない弦を止め、音の長さで拍を支えます。",
        "使用四弦E1–A1–D2–G2，第1弦为G。止住不用的弦，让音长支撑节拍。",
    ],
    "piano": [
        "Use a keyboard with C3 through C6 available; these examples stay within that region. C4 is middle C. Start without pedal and release any tension before continuing.",
        "Use teclado com C3 até C6; os exemplos ficam nessa região. C4 é dó central. Comece sem pedal e solte qualquer tensão antes de continuar.",
        "Usa teclado con C3 a C6; los ejemplos quedan en esa región. C4 es do central. Empieza sin pedal y suelta cualquier tensión.",
        "Nutze eine Tastatur mit C3 bis C6; die Beispiele bleiben dort. C4 ist mittleres C. Beginne ohne Pedal und löse Spannung vor dem Weiterüben.",
        "C3からC6まである鍵盤を使います。C4は中央Cです。例はこの範囲内です。ペダルなしで始め、緊張を解いてから続けます。",
        "键盘需有C3到C6，示例在此范围。C4是中央C。不用踏板开始，先放松紧张再继续。",
    ],
    "ukulele": [
        "Use four strings G4–C4–E4–A4 with high G. String 1 is A. These lessons do not cover low-G tuning; check the octave before practising.",
        "Use quatro cordas G4–C4–E4–A4 com sol agudo. Corda 1 é lá. Estas lições não abordam a afinação com sol grave; confira a oitava antes de praticar.",
        "Usa cuatro cuerdas G4–C4–E4–A4 con sol agudo. La cuerda 1 es la. Estas lecciones no cubren la afinación con sol grave; comprueba la octava.",
        "Nutze G4–C4–E4–A4 mit hohem G. Saite 1 ist A. Diese Lektionen gelten nicht für tiefes G; prüfe vorher die Oktave.",
        "高いGのG4–C4–E4–A4です。第1弦はAです。これらのレッスンは低いGの調弦用ではありません。練習前にオクターブを確認します。",
        "使用高G的G4–C4–E4–A4，第1弦为A。这些课程不涉及低G调弦，练习前核对八度。",
    ],
    "mandolin": [
        "Use eight strings in four paired courses G3–D4–A4–E5. Course 1 is E. A displayed course means two unison strings, not two independently fretted voices.",
        "Use oito cordas em quatro cursos duplos G3–D4–A4–E5. Curso 1 é mi. Um curso exibido representa duas cordas em uníssono, não vozes com digitação independente.",
        "Usa ocho cuerdas en cuatro órdenes G3–D4–A4–E5. El orden 1 es mi. Cada orden mostrado representa dos cuerdas al unísono, no voces digitadas independientemente.",
        "Nutze acht Saiten in vier Chören G3–D4–A4–E5. Chor 1 ist E. Ein dargestellter Chor meint zwei Unisonosaiten, keine unabhängig gegriffenen Stimmen.",
        "8本の弦を4コースG3–D4–A4–E5に調弦します。第1コースはEです。表示の1コースは同音の2弦で、別々の運指の声部ではありません。",
        "八根弦组成四组G3–D4–A4–E5，第1组为E。显示一个弦组代表两根同音弦，不是各自按弦的两个声部。",
    ],
}
LISTEN = [
    "Listen once at 56 BPM and count each beat, including rests. Then stop playback and sing or name the notes you remember.",
    "Ouça uma vez a 56 BPM e conte cada tempo, inclusive pausas. Pare a reprodução e cante ou nomeie as notas que lembrar.",
    "Escucha una vez a 56 BPM y cuenta cada pulso, incluidos silencios. Detén la reproducción y canta o nombra las notas que recuerdes.",
    "Höre einmal bei 56 BPM und zähle jeden Schlag, auch Pausen. Stoppe danach und singe oder nenne die erinnerten Töne.",
    "56 BPMで1回聴き、休符も含めて拍を数えます。再生を止めて、覚えた音を歌うか名前で言います。",
    "以56 BPM听一次，休止也数拍。停止播放，唱出或说出记住的音。",
]
PRACTICE = [
    "Choose 48–60 BPM or slower. Count four beats, play the smallest useful fragment twice, then the whole phrase without the demo. Pause if tension appears; accuracy and a calm pulse come before speed.",
    "Escolha 48–60 BPM ou menos. Conte quatro tempos, toque o menor fragmento útil duas vezes e depois a frase sem demonstração. Pare se aparecer tensão; precisão e pulso tranquilo vêm antes da velocidade.",
    "Elige 48–60 BPM o menos. Cuenta cuatro pulsos, toca el fragmento útil más pequeño dos veces y luego la frase sin demostración. Para si hay tensión; precisión y pulso tranquilo preceden a velocidad.",
    "Wähle 48–60 BPM oder langsamer. Zähle vier Schläge, übe den kleinsten sinnvollen Ausschnitt zweimal und spiele dann ohne Demo. Pausiere bei Spannung; Genauigkeit und ruhiger Puls kommen vor Tempo.",
    "48–60 BPMまたはさらに遅くします。4拍数え、必要な最小部分を2回弾いてから、デモなしで全体を弾きます。緊張したら止めます。速さより正確さと落ち着いた拍を優先します。",
    "选择48–60 BPM或更慢。数四拍，将最小有用片段练两次，再不听示范弹全句。出现紧张就停；准确和平稳节拍优先于速度。",
]
VERIFY = [
    "Describe your attempt: still locating, playing with help, or playing without the demo. Name one specific improvement for next time. Playback completion is listening evidence; this report does not certify instrumental execution. In a later session, try the transfer again before revealing the example.",
    "Descreva a tentativa: ainda localizo, toco com ajuda ou toco sem demonstração. Nomeie uma melhoria específica para a próxima vez. Terminar a reprodução registra escuta; este relato não certifica execução instrumental. Em outra sessão, tente a transferência antes de revelar o exemplo.",
    "Describe el intento: aún localizo, toco con ayuda o toco sin demostración. Nombra una mejora concreta para la próxima vez. Acabar la reproducción evidencia escucha; el relato no certifica ejecución instrumental. En otra sesión, intenta la transferencia antes de ver el ejemplo.",
    "Beschreibe deinen Versuch: noch suchen, mit Hilfe spielen oder ohne Demo spielen. Nenne eine konkrete Verbesserung fürs nächste Mal. Abgespieltes Audio belegt Zuhören; der Bericht bestätigt keine Instrumentalausführung. Probiere in einer späteren Sitzung zuerst den Transfer ohne Vorlage.",
    "試行を「まだ位置を探す」「助けがあれば弾ける」「デモなしで弾ける」と説明し、次回の具体的な改善点を1つ挙げます。再生終了は聴いた証拠で、演奏の認定ではありません。別の日には例を見る前に応用を試します。",
    "描述本次尝试：仍在找位置、借助提示弹奏、或不用示范弹奏。指出下次一个具体改进。播放完成只能说明听过，报告不认证实际演奏。下一次练习先尝试迁移，再看范例。",
]


def localized(text):
    return (
        ":::localized\n"
        + "\n\n".join(
            ":::locale " + locale + "\n" + value for locale, value in zip(L, text)
        )
        + "\n:::endlocalized\n"
    )


def step(id, phase, values, fence=""):
    return (
        f":::step id={id} phase={phase}\n"
        + localized(values)
        + "\n"
        + fence
        + "\n:::endstep\n"
    )


candidate = ROOT / "editorial/candidates"
candidate.mkdir(parents=True, exist_ok=True)
QUIZZES = {
    "hear-the-distance": (
        "B3–C4",
        "B3–C#4",
        [
            "Which pair spans one semitone?",
            "Qual par tem um semitom?",
            "¿Qué pareja tiene un semitono?",
            "Welches Paar umfasst einen Halbton?",
            "半音のペアはどれですか。",
            "哪一对相差半音？",
        ],
        [
            "B–C is one semitone; B–C# is two. Compare the same B before retrying.",
            "B–C tem um semitom; B–C# tem dois. Compare o mesmo B antes de tentar de novo.",
            "B–C tiene un semitono; B–C# tiene dos. Compara el mismo B antes de reintentar.",
            "Internationale Notennamen: B bedeutet H. B–C ist ein Halbton, B–C# sind zwei. Vergleiche denselben B-Ausgangston vor dem nächsten Versuch.",
            "B–Cは半音、B–C#は全音です。同じBを起点にして聴き直します。",
            "B–C相差半音，B–C#相差全音。再试前从同一个B比较。",
        ],
    ),
    "hear-a-triad": (
        "E4",
        "D4",
        [
            "Which note is the third of C major?",
            "Qual nota é a terça de dó maior?",
            "¿Qué nota es la tercera de do mayor?",
            "Welcher Ton ist die Terz von C-Dur?",
            "Cメジャーの3度はどれですか。",
            "哪个音是C大调三和弦的三音？",
        ],
        [
            "C–E–G contains E as its third. D is the second; listen to C–D then C–E.",
            "C–E–G contém E como terça. D é a segunda; ouça C–D e depois C–E.",
            "C–E–G contiene E como tercera. D es la segunda; escucha C–D y luego C–E.",
            "C–E–G enthält E als Terz. D ist die Sekunde; höre C–D und dann C–E.",
            "C–E–Gの3度はEです。Dは2度なのでC–DとC–Eを比べます。",
            "C–E–G的三音是E，D是二音。听C–D，再听C–E。",
        ],
    ),
    "arrive-at-the-change": (
        "D2",
        "A1",
        [
            "Which root begins the D minor bar?",
            "Qual fundamental inicia o compasso de ré menor?",
            "¿Qué fundamental inicia el compás de re menor?",
            "Welcher Grundton beginnt den d-Moll-Takt?",
            "Dマイナーの小節を始めるルートはどれですか。",
            "D小调小节从哪个根音开始？",
        ],
        [
            "D is the root of D minor; A is its fifth. Stop A before practising the arrival on D.",
            "D é fundamental de ré menor; A é sua quinta. Pare A antes de praticar a chegada em D.",
            "D es fundamental de re menor; A es su quinta. Apaga A antes de llegar a D.",
            "D ist Grundton von d-Moll, A dessen Quinte. Stoppe A vor der Ankunft auf D.",
            "DマイナーのルートはD、5度はAです。Dへの着地を練習する前にAを止めます。",
            "D小调根音是D，A是五音。练习到达D前先止住A。",
        ],
    ),
    "find-the-region": (
        "C4",
        "F4",
        [
            "Which note is immediately left of the pair of black keys?",
            "Qual nota fica logo à esquerda do par de teclas pretas?",
            "¿Qué nota está justo a la izquierda del par de teclas negras?",
            "Welcher Ton liegt direkt links von zwei schwarzen Tasten?",
            "黒鍵2つのすぐ左はどの音ですか。",
            "两枚黑键紧邻左侧是哪个音？",
        ],
        [
            "C lies left of two black keys; F lies left of three. Find the black-key group before naming the white key.",
            "C fica à esquerda de duas pretas; F, de três. Encontre o grupo preto antes de nomear a branca.",
            "C está a la izquierda de dos negras; F, de tres. Encuentra el grupo antes de nombrar la blanca.",
            "C liegt links von zwei, F links von drei schwarzen Tasten. Finde erst die Gruppe, dann die weiße Taste.",
            "黒鍵2つの左はC、3つの左はFです。白鍵の名前を言う前に黒鍵の組を探します。",
            "两枚黑键左侧为C，三枚左侧为F。先找黑键组，再说白键名称。",
        ],
    ),
    "know-the-four-strings": (
        "C4",
        "G4",
        [
            "Which open pitch is lowest in this high-G setup?",
            "Qual corda solta é mais grave neste setup com sol agudo?",
            "¿Qué nota abierta es más grave con sol agudo?",
            "Welcher offene Ton ist bei hohem G am tiefsten?",
            "高いGの設定で最も低い開放音はどれですか。",
            "高G设置里最低空弦音是哪一个？",
        ],
        [
            "C4 is below G4. Physical string order is not pitch order in this re-entrant tuning.",
            "C4 fica abaixo de G4. Ordem física de cordas não é ordem de altura nesta afinação reentrante.",
            "C4 está debajo de G4. El orden físico no es el de altura en esta afinación reentrante.",
            "C4 liegt unter G4. In dieser re-entranten Stimmung entspricht Saitenfolge nicht Tonhöhenfolge.",
            "C4はG4より低い音です。この調弦では弦の順と高さの順は異なります。",
            "C4低于G4。这种回入式调弦中，物理弦序不等于音高顺序。",
        ],
    ),
    "hear-paired-courses": (
        "8",
        "4",
        [
            "How many physical strings do these four paired courses contain?",
            "Quantas cordas físicas há nestes quatro cursos duplos?",
            "¿Cuántas cuerdas físicas tienen estos cuatro órdenes dobles?",
            "Wie viele einzelne Saiten enthalten diese vier Doppelchöre?",
            "4つの複弦コースには何本の弦がありますか。",
            "四个双弦组共有几根实体弦？",
        ],
        [
            "Four courses times two strings equals eight. Each pair sounds one shared pitch, not an extra harmony voice.",
            "Quatro cursos com duas cordas somam oito. Cada par soa uma altura compartilhada, não outra voz harmônica.",
            "Cuatro órdenes con dos cuerdas suman ocho. Cada pareja suena a una altura, no como voz armónica adicional.",
            "Vier Chöre mit je zwei Saiten ergeben acht. Jedes Paar hat eine gemeinsame Höhe, keine zusätzliche Harmoniestimme.",
            "4コースに2本ずつで8本です。各ペアは同じ高さを鳴らし、別の和声声部ではありません。",
            "四组每组两根，共八根。每对发出共同音高，不是额外和声声部。",
        ],
    ),
}


def quiz_fence(slug, lessonID):
    if slug not in QUIZZES:
        return ""
    correct, wrong, prompts, explanations = QUIZZES[slug]
    source = f"```quiz\nid: {lessonID}-concept\ncorrect: a\nshuffle: true\n"
    source += (
        "\n".join("prompt." + locale + ": " + text for locale, text in zip(L, prompts))
        + "\n"
    )
    source += (
        "\n".join(
            "explanation." + locale + ": " + text
            for locale, text in zip(L, explanations)
        )
        + "\n"
    )
    source += (
        "option: a | "
        + " | ".join("label." + locale + ": " + correct for locale in L)
        + "\n"
    )
    source += (
        "option: b | "
        + " | ".join("label." + locale + ": " + wrong for locale in L)
        + "\n```\n"
    )
    return source


paths = []
for family, (titles, tuning, courses, low, high, tuningtext) in FAMILIES.items():
    setup = dict(
        instrument=family,
        tuningMIDINotes=tuning,
        stringsPerCourse=courses,
        minimumFret=0,
        maximumFret=0 if family == "piano" else 12,
        minimumMIDINote=low,
        maximumMIDINote=high,
        leftHanded=False,
    )
    units = []
    for unitID in dict.fromkeys(r["unit"] for r in ROWS if r["instrument"] == family):
        unitrows = [
            r for r in ROWS if r["instrument"] == family and r["unit"] == unitID
        ]
        placements = []
        for order, r in enumerate(unitrows, 1):
            lessonID = f'{family}-{r["slug"]}'
            titles, objectives, feedback, transfer = map(
                list, zip(*(v.split("~") for v in r["values"]))
            )
            role = "core" if order <= 4 else "transfer" if order == 5 else "extra"
            placementID = f"{lessonID}-placement"
            prerequisites = [placements[-1]["id"]] if order <= 5 and placements else []
            relative = f"guided/{family}/{unitID}/{lessonID}/lesson.md"
            file = candidate / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            lessonCaps = [c for c in CAP if family != "piano" or c != "fretboard"]
            if r["slug"] in QUIZZES:
                lessonCaps.append("quiz")
            if r["slug"] in ["count-the-silence", "breath-and-articulation"]:
                lessonCaps.append("tap")
            front = dict(
                schema=2,
                format=2,
                id=lessonID,
                course=family + "-foundation",
                level="beginner",
                section="beginner",
                unit=unitID,
                order=order,
                revision=1,
                assessmentVersion=1,
                estimatedMinutes=8 if role != "extra" else 5,
                instrument=family,
                requiredCapabilities=",".join(lessonCaps),
            )
            for locale, title, objective in zip(L, titles, objectives):
                front["title." + locale] = title
                front["summary." + locale] = objective
            notes = f'```notes\nid: {lessonID}-listening\ntitle: {r['sequence'].split()[0].split('/')[0]} → {r['sequence'].split()[-1].split('/')[0]}\ninstrument: {family}\ntempo: 56\nbeat: 1\nsequence: {r["sequence"]}\n```\n'
            if r["position"]:
                expected = " ".join(
                    re.sub(r"/[^ ]+", "", token) for token in r["sequence"].split()
                )
                exercise = f'```fretboard\nid: {lessonID}-exploration\ntitle: {r['position'].split()[0].split('@')[0]} → {r['position'].split()[-1].split('@')[0]}\ninstrument: {family}\ntuning: {tuningtext}\nfrets: 0-12\ntempo: 56\npositions: {r["position"]}\nexpectedNotes: {expected}\n```\n'
            else:
                exercise = notes.replace("-listening", "-exploration")
            body = step(
                "orientation",
                "orient",
                [
                    f"# {title}\n\n{objective}\n\n{setuptext}"
                    for title, objective, setuptext in zip(
                        titles, objectives, SETUP_TEXT[family]
                    )
                ],
            )
            body += step("listen-example", "listen", LISTEN, notes)
            body += step("try-the-gesture", "experiment", objectives, exercise)
            drill = DRILL_SCORES[r["slug"]]
            variation = TRANSFER_SCORES[r["slug"]]
            drillBeats = sum(
                float(token.partition("/")[2] or 1) for token in drill.split()
            )
            prompts = [
                f"Practise this {drillBeats:g}-beat cell twice at 48 BPM. First play without the demonstration; then compare the note order, rests and arrival with the written reference. If either attempt changes the pulse, stop and isolate its difficult transition.",
                f"Pratique esta célula de {drillBeats:g} tempos duas vezes a 48 BPM. Primeiro toque sem demonstração; compare depois ordem das notas, pausas e chegada com a referência escrita. Se uma tentativa mudar o pulso, pare e isole a transição difícil.",
                f"Practica esta célula de {drillBeats:g} pulsos dos veces a 48 BPM. Toca primero sin demostración; compara luego notas, silencios y llegada con la referencia. Si cambia el pulso, detente y aísla la transición difícil.",
                f"Übe diese Zelle mit {drillBeats:g} Schlägen zweimal bei 48 BPM. Spiele zuerst ohne Demo und vergleiche dann Tonfolge, Pausen und Ankunft mit der Vorlage. Ändert sich der Puls, stoppe und übe den schwierigen Übergang allein.",
                f"{drillBeats:g}拍のこのセルを48 BPMで2回練習します。先にデモなしで弾き、次に音順、休符、着地を例と比べます。拍が変われば止めて難しい移動だけを試します。",
                f"以48 BPM将这个{drillBeats:g}拍单元练两遍。先不听示范弹奏，再比较音序、休止和到达。若节拍改变，停下，单练困难转换。",
            ]
            drillFence = f'```notes\nid: {lessonID}-focused-practice\ntitle: {drill.split()[0].split("/")[0]} → {drill.split()[-1].split("/")[0]} · {drillBeats:g}\ninstrument: {family}\ntempo: 48\nbeat: 1\nsequence: {drill}\n```\n'
            transferFence = f'```notes\nid: {lessonID}-transfer-reference\ntitle: {variation.split()[0].split("/")[0]} → {variation.split()[-1].split("/")[0]}\ninstrument: {family}\ntempo: 56\nbeat: 1\nsequence: {variation}\n```\n'
            transferCues = [
                "Try the change before hearing the reference below. Then compare the changed cell with your first attempt and choose one musical difference to keep. The reference is one possible answer, not a required composition.",
                "Tente a mudança antes de ouvir a referência abaixo. Compare a célula alterada com a primeira tentativa e escolha uma diferença musical para manter. A referência é uma resposta possível, não uma composição obrigatória.",
                "Intenta el cambio antes de escuchar la referencia. Compara la célula modificada con tu primer intento y elige una diferencia musical que conservar. La referencia es una respuesta posible, no una composición obligatoria.",
                "Probiere die Änderung vor dem Hören der Vorlage. Vergleiche die geänderte Zelle mit deinem ersten Versuch und wähle einen musikalischen Unterschied zum Behalten. Die Vorlage ist eine mögliche Antwort, keine Pflichtkomposition.",
                "下の例を聴く前に変更を試します。最初の試行と変えたセルを比べ、残したい音楽的な違いを1つ選びます。例は答えの1つであり、同じ曲を作る義務はありません。",
                "先尝试改动，再听下面范例。比较改动单元与第一次尝试，选择一个想保留的音乐差异。范例是一种可能的回答，不是必须照抄的作品。",
            ]
            if r["slug"] == "strum-and-rest":
                timbreCues = [
                    "The reference omits G4 in the second chord. It does not encode your stroke dynamics; try a lighter second stroke yourself.",
                    "A referência omite G4 no segundo acorde. Ela não codifica a dinâmica da sua batida; experimente você uma segunda batida mais leve.",
                    "La referencia omite G4 en el segundo acorde. No codifica la dinámica del rasgueo; prueba tú un segundo golpe más suave.",
                    "Die Vorlage lässt G4 im zweiten Akkord weg. Sie codiert keine Anschlagsdynamik; probiere selbst einen leichteren zweiten Schlag.",
                    "例の2つ目の和音にはG4がありません。ストロークの強弱は再生に記録されていないので、自分で2回目を弱く弾きます。",
                    "范例的第二个和弦省去G4。播放并未编码扫弦力度；请自己尝试更轻的第二次扫弦。",
                ]
                transferCues = [cue + " " + timbre for cue, timbre in zip(transferCues, timbreCues)]
            body += step(
                "practice-and-feedback",
                "practice",
                [p + "\n\n" + f for p, f in zip(prompts, feedback)],
                drillFence,
            )
            body += step(
                "small-transfer",
                "transfer",
                [t + "\n\n" + c for t, c in zip(transfer, transferCues)],
                transferFence,
            )
            checkFence = quiz_fence(r["slug"], lessonID)
            if r["slug"] in ["count-the-silence", "breath-and-articulation"]:
                checkFence += (
                    "```tap\nid: "
                    + lessonID
                    + "-screen-rhythm\ntitle: 1 2 - 4 1 - 3—4\ntempo: 56\ncountIn: 4\npattern: x x - x x - x/2\n```\n"
                )
            body += step(
                "reflect-and-revisit",
                "verify",
                [v + "\n\n:::checkpoint " + t for v, t in zip(VERIFY, transfer)],
                checkFence,
            )
            content = (
                "---\n"
                + "\n".join(f"{key}: {value}" for key, value in front.items())
                + "\n---\n\n"
                + body
            )
            if ACTIVE.exists():
                raise SystemExit(ACTIVE.read_text())
            file.write_text(content)
            placements.append(
                dict(
                    id=placementID,
                    contentKey="guided:" + lessonID,
                    lessonID=lessonID,
                    source="guided",
                    path=relative,
                    revision=1,
                    assessmentVersion=1,
                    role=role,
                    skillID=family + ":" + r["slug"],
                    prerequisites=prerequisites,
                    titles=loc(titles),
                    summaries=loc(objectives),
                    estimatedMinutes=front["estimatedMinutes"],
                )
            )
        units.append(
            dict(
                id=unitID,
                order=len(units) + 1,
                level="beginner",
                titles=loc(UNIT_TITLES[unitID]),
                summaries=loc(UNIT_SUMMARIES[unitID]),
                prerequisites=[units[-1]["id"]] if units else [],
                placements=placements,
            )
        )
    titleValues = FAMILIES[family][0]
    familyCaps = [c for c in CAP if family != "piano" or c != "fretboard"] + ["quiz"]
    if family in ["guitar", "piano"]:
        familyCaps.append("tap")
    paths.append(
        dict(
            id=family + "-foundation",
            spineVersion=1,
            instrument=family,
            titles=loc(titleValues),
            summaries=loc(PATH_SUMMARIES[family]),
            requiredCapabilities=familyCaps,
            setup=setup,
            units=units,
            publicationStatus="review-pending",
            humanPlaythrough="pending",
        )
    )
manifest = dict(
    schema=2, format=2, revision=1, requiredCapabilities=CAP[:3], paths=paths
)
(candidate / "paths.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
)
published = dict(schema=2, format=2, revision=1, requiredCapabilities=CAP[:3], paths=[])
publicfile = ROOT / "v2/education/paths.json"
if not publicfile.exists():
    publicfile.write_text(json.dumps(published, ensure_ascii=False, indent=2) + "\n")
print(
    f"Authored {len(ROWS)} six-locale candidate lessons; zero unreviewed paths promoted."
)
