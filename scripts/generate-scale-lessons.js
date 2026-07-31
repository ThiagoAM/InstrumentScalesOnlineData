#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const COURSE_ROOT = path.resolve(
  __dirname,
  "../v2/education/courses/instrument-scales"
);
const CATALOG_PATH = path.join(COURSE_ROOT, "catalog.json");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];
const LENGTH_WARNINGS = [];

function text(en, pt, es, de, ja, zh) {
  return { en, "pt-BR": pt, es, de, ja, "zh-Hans": zh };
}

const SCALE_NAMES = {
  Major: text("major", "maior", "mayor", "Dur", "メジャー", "大调"),
  "Natural Minor": text("natural minor", "menor natural", "menor natural", "natürlich Moll", "ナチュラルマイナー", "自然小调"),
  "Harmonic Minor": text("harmonic minor", "menor harmônica", "menor armónica", "harmonisch Moll", "ハーモニックマイナー", "和声小调"),
  "Melodic Minor": text("melodic minor", "menor melódica", "menor melódica", "melodisch Moll", "メロディックマイナー", "旋律小调"),
  "Pentatonic Major": text("major pentatonic", "pentatônica maior", "pentatónica mayor", "Dur-Pentatonik", "メジャーペンタトニック", "大调五声音阶"),
  "Pentatonic Minor": text("minor pentatonic", "pentatônica menor", "pentatónica menor", "Moll-Pentatonik", "マイナーペンタトニック", "小调五声音阶"),
  Blues: text("blues", "blues", "blues", "Blues", "ブルース", "布鲁斯"),
  Dorian: text("Dorian", "dórica", "dórica", "Dorisch", "ドリアン", "多利亚"),
  Phrygian: text("Phrygian", "frígia", "frigia", "Phrygisch", "フリジアン", "弗里几亚"),
  Lydian: text("Lydian", "lídia", "lidia", "Lydisch", "リディアン", "利底亚"),
  Mixolydian: text("Mixolydian", "mixolídia", "mixolidia", "Mixolydisch", "ミクソリディアン", "混合利底亚"),
  Locrian: text("Locrian", "lócria", "locria", "Lokrisch", "ロクリアン", "洛克里亚"),
  "Whole Tone": text("whole-tone", "tons inteiros", "tonos enteros", "Ganzton", "全音", "全音"),
  "Octatonic Diminished (Half‑Whole)": text("half-whole diminished", "diminuta semitom-tom", "disminuida semitono-tono", "Halbton-Ganzton vermindert", "半音–全音ディミニッシュ", "半音–全音减音阶"),
  "Octatonic Diminished (Whole‑Half)": text("whole-half diminished", "diminuta tom-semitom", "disminuida tono-semitono", "Ganzton-Halbton vermindert", "全音–半音ディミニッシュ", "全音–半音减音阶"),
  Chromatic: text("chromatic", "cromática", "cromática", "chromatisch", "クロマチック", "半音"),
  Hirajoshi: text("Hirajoshi", "Hirajoshi", "Hirajoshi", "Hirajoshi", "平調子", "Hirajoshi"),
  Iwato: text("Iwato", "Iwato", "Iwato", "Iwato", "岩戸", "Iwato"),
  Kumoi: text("Kumoi", "Kumoi", "Kumoi", "Kumoi", "雲井", "Kumoi"),
  Pelog: text("Pelog", "Pelog", "Pelog", "Pelog", "ペロッグ", "Pelog"),
  "Romanian Minor": text("Romanian minor", "menor romena", "menor rumana", "rumänisch Moll", "ルーマニアンマイナー", "罗马尼亚小调"),
  "Hungarian Major": text("Hungarian major", "maior húngara", "mayor húngara", "ungarisch Dur", "ハンガリアンメジャー", "匈牙利大调"),
  "Neapolitan Minor": text("Neapolitan minor", "menor napolitana", "menor napolitana", "neapolitanisch Moll", "ナポリタンマイナー", "那不勒斯小调"),
  Prometheus: text("Prometheus", "Prometheus", "Prometheus", "Prometheus", "プロメテウス", "普罗米修斯"),
  "Super Locrian": text("altered", "alterada", "alterada", "alteriert", "オルタード", "变化音"),
  "Half‑Diminished ♯2 (Locrian ♮2)": text("Locrian natural two", "lócria com segunda natural", "locria con segunda natural", "Lokrisch mit großer Sekunde", "ロクリアン♮2", "洛克里亚还原二级"),
  Javaneese: text("Dorian flat two", "dórica com segunda bemol", "dórica con segunda bemol", "Dorisch mit kleiner Sekunde", "ドリアン♭2", "多利亚降二级"),
  "Lydian Augmented": text("Lydian augmented", "lídia aumentada", "lidia aumentada", "Lydisch übermäßig", "リディアンオーギュメンテッド", "增利底亚"),
  "Lydian Dominant": text("Lydian dominant", "lídia dominante", "lidia dominante", "Lydisch dominant", "リディアンドミナント", "利底亚属调式"),
  Hindu: text("Mixolydian flat six", "mixolídia com sexta bemol", "mixolidia con sexta bemol", "Mixolydisch mit kleiner Sexte", "ミクソリディアン♭6", "混合利底亚降六级"),
};

const FOCUS = {
  scale: [
    ["hear-center", text("Hear the center", "Ouça o centro", "Escucha el centro", "Höre das Zentrum", "中心音を聴く", "听清中心音")],
    ["climb-evenly", text("Climb evenly", "Suba com regularidade", "Sube con regularidad", "Steige gleichmäßig auf", "均等に上がる", "均匀上行")],
    ["descend-evenly", text("Descend evenly", "Desça com regularidade", "Baja con regularidad", "Steige gleichmäßig ab", "均等に下がる", "均匀下行")],
    ["clean-turn", text("Make a clean turn", "Faça uma volta limpa", "Haz un giro limpio", "Wende sauber", "折り返しを整える", "干净转向")],
    ["thirds", text("Move in thirds", "Mova-se em terças", "Muévete por terceras", "Gehe in Terzen", "3度で進む", "按三度进行")],
    ["groups-three", text("Group three notes", "Agrupe três notas", "Agrupa tres notas", "Gruppiere drei Töne", "3音ずつまとめる", "三个音一组")],
    ["target-note", text("Aim for the color note", "Mire na nota de cor", "Apunta a la nota de color", "Ziele auf den Farbton", "特徴音を狙う", "瞄准色彩音")],
    ["measured-rest", text("Leave a measured rest", "Deixe uma pausa medida", "Deja un silencio medido", "Lass eine gemessene Pause", "休符の長さを保つ", "留出准确休止")],
    ["three-tempos", text("Keep three tempos steady", "Mantenha três andamentos firmes", "Mantén tres tempos firmes", "Halte drei Tempi stabil", "3つのテンポを保つ", "稳住三个速度")],
    ["full-study", text("Record the full study", "Grave o estudo completo", "Graba el estudio completo", "Nimm die ganze Studie auf", "練習全体を録音する", "录下完整练习")],
  ],
  rhythm: [
    ["beat-one", text("Find beat one", "Encontre o primeiro tempo", "Encuentra el primer pulso", "Finde die Eins", "1拍目を見つける", "找到第一拍")],
    ["even-attacks", text("Place four even attacks", "Faça quatro ataques regulares", "Coloca cuatro ataques regulares", "Setze vier gleichmäßige Anschläge", "4音を均等に置く", "均匀弹出四个音")],
    ["two-beat-hold", text("Hold for two beats", "Sustente por dois tempos", "Sostén durante dos pulsos", "Halte zwei Schläge", "2拍伸ばす", "保持两拍")],
    ["split-beat", text("Split the beat evenly", "Divida o tempo por igual", "Divide el pulso por igual", "Teile den Schlag gleichmäßig", "拍を均等に分ける", "均分一拍")],
    ["count-rest", text("Count through a rest", "Conte durante a pausa", "Cuenta durante el silencio", "Zähle durch die Pause", "休符でも数える", "休止时继续数拍")],
    ["return-silence", text("Return after silence", "Volte depois do silêncio", "Vuelve después del silencio", "Kehre nach der Stille zurück", "無音の後に戻る", "静默后准确返回")],
    ["offbeat", text("Place the offbeat", "Coloque o contratempo", "Coloca el contratiempo", "Setze den Offbeat", "裏拍を置く", "弹准反拍")],
    ["moving-accent", text("Move the accent", "Desloque o acento", "Desplaza el acento", "Verschiebe den Akzent", "アクセントを移す", "移动重音")],
    ["tempo-control", text("Keep three tempos steady", "Mantenha três andamentos firmes", "Mantén tres tempos firmes", "Halte drei Tempi stabil", "3つのテンポを保つ", "稳住三个速度")],
    ["no-drift", text("Record a drift-free pass", "Grave sem desviar o pulso", "Graba sin mover el pulso", "Nimm einen Durchgang ohne Drift auf", "揺れない演奏を録る", "录下不漂移的一遍")],
  ],
  ear: [
    ["tonic", text("Hear the tonic", "Ouça a tônica", "Escucha la tónica", "Höre den Grundton", "主音を聴く", "听出主音")],
    ["sing-first", text("Sing before you play", "Cante antes de tocar", "Canta antes de tocar", "Singe vor dem Spielen", "弾く前に歌う", "先唱后弹")],
    ["changed-note", text("Find the changed note", "Encontre a nota alterada", "Encuentra la nota cambiada", "Finde den veränderten Ton", "変わった音を探す", "找出变化的音")],
    ["contour", text("Match the contour", "Iguale o contorno", "Iguala el contorno", "Triff den Verlauf", "音形を合わせる", "匹配旋律轮廓")],
    ["target-degree", text("Name the target degree", "Nomeie o grau-alvo", "Nombra el grado objetivo", "Benenne die Zielstufe", "目標の音度を言う", "说出目标音级")],
    ["copy-rhythm", text("Copy the rhythm", "Copie o ritmo", "Copia el ritmo", "Kopiere den Rhythmus", "リズムを写す", "模仿节奏")],
    ["missing-ending", text("Fill the missing ending", "Complete o final ausente", "Completa el final que falta", "Ergänze den fehlenden Schluss", "欠けた終わりを補う", "补上缺少的结尾")],
    ["new-tonic", text("Move it to a new tonic", "Leve para outra tônica", "Llévalo a otra tónica", "Versetze es auf einen neuen Grundton", "別の主音へ移す", "移到新的主音")],
    ["screen-off", text("Check it without the screen", "Confira sem olhar a tela", "Compruébalo sin mirar la pantalla", "Prüfe es ohne Bildschirm", "画面を見ずに確かめる", "不看屏幕检查")],
    ["one-listen", text("Record one-listen recall", "Grave após uma audição", "Graba después de una escucha", "Nimm nach einmaligem Hören auf", "一度聴いて録音する", "听一遍后录下")],
  ],
  harmony: [
    ["hear-change", text("Hear the chord change", "Ouça a mudança de acorde", "Escucha el cambio de acorde", "Höre den Akkordwechsel", "コードの変化を聴く", "听清和弦变化")],
    ["land-root", text("Land on the root", "Chegue à fundamental", "Llega a la fundamental", "Lande auf dem Grundton", "ルートに着地する", "落在根音")],
    ["land-third", text("Land on the third", "Chegue à terça", "Llega a la tercera", "Lande auf der Terz", "3度に着地する", "落在三音")],
    ["land-fifth", text("Land on the fifth", "Chegue à quinta", "Llega a la quinta", "Lande auf der Quinte", "5度に着地する", "落在五音")],
    ["below", text("Approach from below", "Aproxime-se por baixo", "Acércate desde abajo", "Nähere dich von unten", "下から近づく", "从下方接近")],
    ["above", text("Approach from above", "Aproxime-se por cima", "Acércate desde arriba", "Nähere dich von oben", "上から近づく", "从上方接近")],
    ["common-tone", text("Hold the common tone", "Sustente a nota comum", "Mantén la nota común", "Halte den gemeinsamen Ton", "共通音を保つ", "保持共同音")],
    ["two-chords", text("Connect two chords", "Conecte dois acordes", "Conecta dos acordes", "Verbinde zwei Akkorde", "2つのコードをつなぐ", "连接两个和弦")],
    ["four-chords", text("Keep the line through four chords", "Mantenha a linha em quatro acordes", "Mantén la línea sobre cuatro acordes", "Führe die Linie durch vier Akkorde", "4コードを通して線を保つ", "用一条线连接四个和弦")],
    ["full-chorus", text("Record the full chorus", "Grave o chorus completo", "Graba el coro completo", "Nimm den ganzen Chorus auf", "1コーラスを録音する", "录下完整一轮")],
  ],
  phrase: [
    ["question", text("Play a two-note question", "Toque uma pergunta de duas notas", "Toca una pregunta de dos notas", "Spiele eine Frage mit zwei Tönen", "2音で問いかける", "用两个音提问")],
    ["answer", text("Give it a short answer", "Dê uma resposta curta", "Dale una respuesta breve", "Gib eine kurze Antwort", "短く答える", "给出简短回答")],
    ["repeat-rhythm", text("Repeat one rhythm", "Repita um ritmo", "Repite un ritmo", "Wiederhole einen Rhythmus", "一つのリズムを繰り返す", "重复一个节奏")],
    ["change-ending", text("Change only the ending", "Mude apenas o final", "Cambia solo el final", "Ändere nur den Schluss", "終わりだけ変える", "只改变结尾")],
    ["leave-space", text("Leave one beat empty", "Deixe um tempo vazio", "Deja un pulso vacío", "Lass einen Schlag frei", "1拍空ける", "留出一拍")],
    ["start-away", text("Start away from the tonic", "Comece longe da tônica", "Empieza lejos de la tónica", "Beginne fern vom Grundton", "主音以外から始める", "从主音之外开始")],
    ["high-point", text("Reach one clear high point", "Alcance um ponto alto claro", "Llega a un punto alto claro", "Erreiche einen klaren Höhepunkt", "頂点を一つ作る", "形成一个清晰高点")],
    ["lower-answer", text("Answer in a lower register", "Responda em registro mais grave", "Responde en un registro más grave", "Antworte in tieferer Lage", "低い音域で答える", "在低音区回答")],
    ["four-bars", text("Shape four bars", "Modele quatro compassos", "Da forma a cuatro compases", "Forme vier Takte", "4小節を形にする", "塑造四小节")],
    ["eight-bars", text("Record eight bars", "Grave oito compassos", "Graba ocho compases", "Nimm acht Takte auf", "8小節を録音する", "录下八小节")],
  ],
};

function unit(slug, level, titles, kind, scales, roots, options = {}) {
  return { slug, level, titles, kind, scales, roots, ...options };
}

const UNITS = [
  unit("steady-pulse", "beginner", text("Steady Pulse", "Pulso firme", "Pulso estable", "Sicherer Puls", "安定した拍", "稳定脉搏"), "rhythm", ["Major"], ["C"]),
  unit("degrees-at-work", "beginner", text("Degrees at Work", "Graus em ação", "Grados en acción", "Stufen in Aktion", "音度の働き", "音级的作用"), "scale", ["Major"], ["C"]),
  unit("whole-and-half-steps", "beginner", text("Whole Steps, Half Steps", "Tons e semitons", "Tonos y semitonos", "Ganz- und Halbtöne", "全音と半音", "全音与半音"), "ear", ["Chromatic", "Major"], ["C", "G"]),
  unit("major-keys-in-reach", "beginner", text("Major Keys in Reach", "Tonalidades maiores ao alcance", "Tonalidades mayores al alcance", "Greifbare Durtonarten", "身近なメジャーキー", "常用大调"), "scale", ["Major"], ["G", "D", "A", "E", "F", "Bb", "C"]),
  unit("natural-minor-groundwork", "beginner", text("Natural Minor Groundwork", "Base da menor natural", "Base de la menor natural", "Grundlage in natürlich Moll", "ナチュラルマイナーの土台", "自然小调基础"), "scale", ["Natural Minor"], ["A", "E", "D", "C", "G"]),
  unit("pentatonic-first-steps", "beginner", text("Pentatonic First Steps", "Primeiros passos pentatônicos", "Primeros pasos pentatónicos", "Erste pentatonische Schritte", "ペンタトニックの第一歩", "五声音阶第一步"), "scale", ["Pentatonic Major", "Pentatonic Minor"], ["C", "A", "G", "E"]),
  unit("interval-landmarks", "beginner", text("Interval Landmarks", "Referências de intervalos", "Referencias de intervalos", "Intervall-Wegmarken", "音程の目印", "音程地标"), "ear", ["Major", "Chromatic"], ["C"]),
  unit("clean-scale-movement", "beginner", text("Clean Scale Movement", "Movimento limpo na escala", "Movimiento limpio en la escala", "Saubere Skalenbewegung", "滑らかなスケール動作", "干净的音阶动作"), "scale", ["Major", "Natural Minor"], ["C", "G", "A", "D"]),
  unit("shape-the-phrase", "beginner", text("Shape the Phrase", "Dê forma à frase", "Da forma a la frase", "Forme die Phrase", "フレーズを形にする", "塑造乐句"), "phrase", ["Major", "Natural Minor"], ["C", "A"]),
  unit("first-improvised-lines", "beginner", text("First Improvised Lines", "Primeiras linhas improvisadas", "Primeras líneas improvisadas", "Erste improvisierte Linien", "初めての即興ライン", "第一组即兴乐句"), "phrase", ["Pentatonic Major", "Pentatonic Minor"], ["C", "A", "G", "E"]),

  unit("move-one-idea", "intermediate", text("Move One Idea", "Mova uma ideia", "Mueve una idea", "Versetze eine Idee", "一つの素材を移す", "移动一个动机"), "ear", ["Major"], ["C", "G", "D", "A", "F", "Bb", "Eb"]),
  unit("three-minor-colors", "intermediate", text("Three Minor Colors", "Três cores menores", "Tres colores menores", "Drei Mollfarben", "3つのマイナーの色", "三种小调色彩"), "ear", ["Natural Minor", "Harmonic Minor", "Melodic Minor"], ["A", "D", "E"], { comparisons: true }),
  unit("register-bridges", "intermediate", text("Register Bridges", "Pontes de registro", "Puentes de registro", "Registerbrücken", "音域の橋渡し", "音区桥梁"), "scale", ["Major", "Pentatonic Minor"], ["G", "A", "D", "E"], { octaves: 2 }),
  unit("sequence-workshop", "intermediate", text("Sequence Workshop", "Oficina de sequências", "Taller de secuencias", "Sequenz-Werkstatt", "シーケンス練習", "模进练习"), "scale", ["Major", "Natural Minor"], ["C", "G", "D", "A", "E"]),
  unit("rhythm-inside-the-scale", "intermediate", text("Rhythm Inside the Scale", "Ritmo dentro da escala", "Ritmo dentro de la escala", "Rhythmus in der Skala", "スケール内のリズム", "音阶中的节奏"), "rhythm", ["Major", "Natural Minor"], ["D", "A"]),
  unit("blues-in-short-sentences", "intermediate", text("Blues in Short Sentences", "Blues em frases curtas", "Blues en frases cortas", "Blues in kurzen Sätzen", "短いブルースフレーズ", "短句布鲁斯"), "phrase", ["Pentatonic Minor", "Blues", "Pentatonic Major"], ["A", "E", "G", "C"]),
  unit("modes-by-color-note", "intermediate", text("Modes by Their Color Note", "Modos pela nota de cor", "Modos por su nota de color", "Modi über ihren Farbton", "特徴音で聴くモード", "用色彩音辨认调式"), "ear", ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Natural Minor", "Locrian"], ["D", "E", "F", "G", "A", "B"]),
  unit("land-on-chord-tones", "intermediate", text("Land on Chord Tones", "Chegue às notas do acorde", "Llega a las notas del acorde", "Lande auf Akkordtönen", "コードトーンに着地する", "落在和弦音"), "harmony", ["Major", "Natural Minor"], ["C", "G", "A", "D"]),
  unit("hear-then-play", "intermediate", text("Hear It, Then Play It", "Ouça e depois toque", "Escúchalo y después tócalo", "Höre es, dann spiele es", "聴いてから弾く", "先听后弹"), "ear", ["Major", "Natural Minor", "Pentatonic Minor"], ["C", "A", "G", "E"]),
  unit("build-eight-bar-solo", "intermediate", text("Build an Eight-Bar Solo", "Construa um solo de oito compassos", "Construye un solo de ocho compases", "Baue ein Solo über acht Takte", "8小節のソロを作る", "构建八小节独奏"), "phrase", ["Pentatonic Minor", "Dorian", "Mixolydian"], ["A", "D", "G"]),

  unit("modes-in-motion", "advanced", text("Modes in Motion", "Modos em movimento", "Modos en movimiento", "Modi in Bewegung", "動きの中のモード", "运动中的调式"), "scale", ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"], ["D", "E", "F", "G", "B"]),
  unit("harmonic-minor-in-practice", "advanced", text("Harmonic Minor in Practice", "Menor harmônica na prática", "Menor armónica en práctica", "Harmonisch Moll in der Praxis", "実践ハーモニックマイナー", "和声小调实践"), "harmony", ["Harmonic Minor"], ["A", "D", "E", "G"]),
  unit("melodic-minor-map", "advanced", text("Melodic Minor Map", "Mapa da menor melódica", "Mapa de la menor melódica", "Landkarte für melodisch Moll", "メロディックマイナーの地図", "旋律小调地图"), "ear", ["Melodic Minor", "Javaneese", "Lydian Augmented", "Lydian Dominant", "Hindu", "Half‑Diminished ♯2 (Locrian ♮2)", "Super Locrian"], ["C", "D", "Eb", "F", "G", "A", "B"]),
  unit("symmetric-scales", "advanced", text("Symmetric Scales", "Escalas simétricas", "Escalas simétricas", "Symmetrische Skalen", "対称スケール", "对称音阶"), "scale", ["Whole Tone", "Octatonic Diminished (Half‑Whole)", "Octatonic Diminished (Whole‑Half)"], ["C", "Db", "D", "E"]),
  unit("wide-interval-lines", "advanced", text("Wide Interval Lines", "Linhas de intervalos amplos", "Líneas de intervalos amplios", "Linien mit weiten Intervallen", "広い音程のライン", "宽音程线条"), "scale", ["Major", "Melodic Minor"], ["C", "D", "F", "A"], { wide: true }),
  unit("rhythmic-displacement", "advanced", text("Rhythmic Displacement", "Deslocamento rítmico", "Desplazamiento rítmico", "Rhythmische Verschiebung", "リズムのずらし", "节奏移位"), "rhythm", ["Dorian", "Mixolydian"], ["D", "G"]),
  unit("voice-leading-through-changes", "advanced", text("Voice Leading Through Changes", "Condução de vozes nas mudanças", "Conducción de voces en los cambios", "Stimmführung durch Wechsel", "コード変化をつなぐ声部進行", "和弦变化中的声部连接"), "harmony", ["Major", "Natural Minor", "Harmonic Minor"], ["C", "G", "A", "D"]),
  unit("chromatic-approaches", "advanced", text("Chromatic Approaches", "Aproximações cromáticas", "Aproximaciones cromáticas", "Chromatische Annäherungen", "クロマチックアプローチ", "半音接近") , "harmony", ["Major"], ["C", "G", "D", "A"], { chromatic: true }),
  unit("distinct-pitch-collections", "advanced", text("Distinct Pitch Collections", "Coleções de alturas distintas", "Colecciones de alturas distintas", "Eigenständige Tonsammlungen", "異なる音集合", "不同的音高集合"), "ear", ["Hirajoshi", "Iwato", "Kumoi", "Pelog", "Romanian Minor", "Hungarian Major", "Neapolitan Minor", "Prometheus"], ["C", "D", "E", "F", "G", "A"]),
  unit("design-complete-take", "advanced", text("Design a Complete Take", "Planeje uma tomada completa", "Diseña una toma completa", "Gestalte einen vollständigen Take", "一つのテイクを設計する", "设计完整的一遍"), "phrase", ["Dorian", "Melodic Minor", "Mixolydian", "Blues", "Whole Tone"], ["D", "C", "G", "A", "F"]),
];

const SPECIAL_FOCUS = {
  "steady-pulse": [
    null,
    text("Place eight even attacks", "Faça oito ataques regulares", "Coloca ocho ataques regulares", "Setze acht gleichmäßige Anschläge", "8打点を均等に置く", "均匀弹出八次起音"),
  ],
  "degrees-at-work": [
    text("Make degree one sound final", "Faça o grau um soar final", "Haz que el grado uno suene final", "Lass Stufe eins endgültig klingen", "1度を終止として響かせる", "让一级听起来有终止感"),
    text("Hear degree two lean toward home", "Ouça o grau dois tender à tônica", "Escucha el grado dos tender a la tónica", "Höre Stufe zwei zum Grundton ziehen", "2度が主音へ傾く響きを聴く", "听二级如何倾向主音"),
    text("Settle through degree three", "Repouse passando pelo grau três", "Descansa pasando por el grado tres", "Finde über Stufe drei zur Ruhe", "3度を通って落ち着く", "经过三级获得稳定"),
    text("Turn back from degree four", "Volte a partir do grau quatro", "Regresa desde el grado cuatro", "Kehre von Stufe vier zurück", "4度から折り返す", "从四级转回"),
    text("Use degree five as a strong departure", "Use o grau cinco como saída forte", "Usa el grado cinco como salida firme", "Nutze Stufe fünf als kräftigen Ausgang", "5度を強い出発点にする", "把五级作为有力出发点"),
    text("Hear degree six soften the line", "Ouça o grau seis suavizar a linha", "Escucha cómo el grado seis suaviza la línea", "Höre, wie Stufe sechs die Linie mildert", "6度でラインを柔らげる", "听六级如何柔化线条"),
    text("Resolve degree seven to one", "Resolva o grau sete no um", "Resuelve el grado siete en el uno", "Löse Stufe sieben zur Eins", "7度を1度へ解決する", "把七级解决到一级"),
    text("Keep degree five across a rest", "Mantenha o grau cinco através da pausa", "Mantén el grado cinco a través del silencio", "Bewahre Stufe fünf über die Pause", "休符を越えて5度を保つ", "跨过休止保持五级"),
    text("Name every degree at three tempos", "Nomeie cada grau em três andamentos", "Nombra cada grado a tres tempos", "Benenne jede Stufe bei drei Tempi", "3つのテンポで全音度を言う", "用三个速度说出每个音级"),
    text("Connect every degree to the tonic", "Ligue cada grau à tônica", "Conecta cada grado con la tónica", "Verbinde jede Stufe mit dem Grundton", "全音度を主音へ結びつける", "把每个音级连接到主音"),
  ],
  "whole-and-half-steps": [
    text("Hear one semitone", "Ouça um semitom", "Escucha un semitono", "Höre einen Halbton", "半音を聴く", "听一个半音"),
    text("Hear one whole step", "Ouça um tom", "Escucha un tono", "Höre einen Ganzton", "全音を聴く", "听一个全音"),
    text("Half step or whole step?", "Semitom ou tom?", "¿Semitono o tono?", "Halbton oder Ganzton?", "半音か全音か", "半音还是全音？"),
    text("E to F: no note between", "Mi a fá: sem nota no meio", "Mi a fa: sin nota intermedia", "E nach F: kein Ton dazwischen", "EからF：間に音なし", "E到F：中间没有音"),
    text("B to C: the second half step", "Si a dó: o segundo semitom", "Si a do: el segundo semitono", "H nach C: der zweite Halbton", "BからC：もう一つの半音", "B到C：另一个半音"),
    text("Build whole-whole-half", "Monte tom-tom-semitom", "Construye tono-tono-semitono", "Baue Ganz-Ganz-Halb", "全・全・半を作る", "构建全全半"),
    text("Build half-whole-whole", "Monte semitom-tom-tom", "Construye semitono-tono-tono", "Baue Halb-Ganz-Ganz", "半・全・全を作る", "构建半全全"),
    text("Find the missing half step", "Encontre o semitom ausente", "Encuentra el semitono que falta", "Finde den fehlenden Halbton", "欠けた半音を探す", "找出缺少的半音"),
    text("Move the step pattern to G", "Leve o padrão para sol", "Mueve el patrón a sol", "Versetze das Muster nach G", "ステップ型をGへ移す", "把音程模式移到G"),
    text("Complete the major-step formula", "Complete a fórmula da escala maior", "Completa la fórmula de la escala mayor", "Vervollständige die Dur-Schrittformel", "メジャーの音程式を完成する", "完成大调音程公式"),
  ],
  "interval-landmarks": [
    text("Match a unison", "Iguale um uníssono", "Iguala un unísono", "Triff einen Einklang", "同度を合わせる", "对准同度"),
    text("Hear a minor second", "Ouça uma segunda menor", "Escucha una segunda menor", "Höre eine kleine Sekunde", "短2度を聴く", "听小二度"),
    text("Hear a major second", "Ouça uma segunda maior", "Escucha una segunda mayor", "Höre eine große Sekunde", "長2度を聴く", "听大二度"),
    text("Separate minor and major thirds", "Separe terças menores e maiores", "Separa terceras menores y mayores", "Trenne kleine und große Terzen", "短3度と長3度を分ける", "区分小三度与大三度"),
    text("Sing a major third", "Cante uma terça maior", "Canta una tercera mayor", "Singe eine große Terz", "長3度を歌う", "唱出大三度"),
    text("Place a perfect fourth", "Coloque uma quarta justa", "Coloca una cuarta justa", "Setze eine reine Quarte", "完全4度を置く", "弹准纯四度"),
    text("Recognize the tritone", "Reconheça o trítono", "Reconoce el tritono", "Erkenne den Tritonus", "トライトーンを判別する", "辨认三全音"),
    text("Place a perfect fifth", "Coloque uma quinta justa", "Coloca una quinta justa", "Setze eine reine Quinte", "完全5度を置く", "弹准纯五度"),
    text("Hear the octave as the same note", "Ouça a oitava como a mesma nota", "Escucha la octava como la misma nota", "Höre die Oktave als denselben Ton", "オクターブを同じ音として聴く", "把八度听成同一个音"),
    text("Name a mixed interval set", "Nomeie um conjunto misto de intervalos", "Nombra un grupo mixto de intervalos", "Benenne eine gemischte Intervallfolge", "混合した音程を答える", "说出一组混合音程"),
  ],
  "move-one-idea": [
    text("Move one motif from C to G", "Leve um motivo de dó a sol", "Mueve un motivo de do a sol", "Versetze ein Motiv von C nach G", "動機をCからGへ移す", "把动机从C移到G"),
    text("Keep the first interval intact", "Mantenha intacto o primeiro intervalo", "Mantén intacto el primer intervalo", "Bewahre das erste Intervall", "最初の音程を保つ", "保持第一个音程"),
    text("Preserve every scale degree", "Preserve todos os graus", "Conserva todos los grados", "Bewahre jede Skalenstufe", "すべての音度を保つ", "保持每个音级"),
    text("Carry the contour unchanged", "Leve o contorno sem mudar", "Lleva el contorno sin cambios", "Übertrage den Verlauf unverändert", "輪郭を変えずに移す", "保持轮廓不变"),
    text("Keep the long note in place", "Mantenha a nota longa no lugar", "Mantén la nota larga en su sitio", "Lass den langen Ton an seiner Stelle", "長い音の位置を保つ", "保持长音位置"),
    text("Keep every subdivision", "Mantenha todas as subdivisões", "Conserva cada subdivisión", "Bewahre jede Unterteilung", "細分をすべて保つ", "保持每个细分"),
    text("Carry the rest with the motif", "Leve a pausa junto com o motivo", "Lleva el silencio con el motivo", "Übertrage die Pause mit dem Motiv", "休符も動機と一緒に移す", "把休止与动机一起移动"),
    text("Transpose without looking at labels", "Transponha sem olhar os rótulos", "Transporta sin mirar las etiquetas", "Transponiere ohne Etiketten", "ラベルを見ずに移調する", "不看标签移调"),
    text("Check the motif in three keys", "Confira o motivo em três tonalidades", "Comprueba el motivo en tres tonalidades", "Prüfe das Motiv in drei Tonarten", "3つの調で動機を確認する", "在三个调中检查动机"),
    text("Recall and transpose after one listen", "Recorde e transponha após uma audição", "Recuerda y transporta tras una escucha", "Erinnere und transponiere nach einmaligem Hören", "一度聴いて記憶し移調する", "听一遍后记住并移调"),
  ],
  "three-minor-colors": [
    text("Natural minor as the baseline", "Menor natural como referência", "Menor natural como referencia", "Natürlich Moll als Ausgangspunkt", "ナチュラルマイナーを基準にする", "以自然小调为基准"),
    text("Harmonic minor raises seven", "A menor harmônica eleva o sete", "La menor armónica eleva el siete", "Harmonisch Moll erhöht die Sieben", "ハーモニックマイナーは7度を上げる", "和声小调升高七级"),
    text("Melodic minor raises six and seven", "A menor melódica eleva seis e sete", "La menor melódica eleva seis y siete", "Melodisch Moll erhöht Sechs und Sieben", "メロディックマイナーは6度と7度を上げる", "旋律小调升高六级和七级"),
    text("Natural versus harmonic minor", "Menor natural contra harmônica", "Menor natural frente a armónica", "Natürlich gegen harmonisch Moll", "ナチュラルとハーモニックを比べる", "自然小调与和声小调"),
    text("Natural versus melodic minor", "Menor natural contra melódica", "Menor natural frente a melódica", "Natürlich gegen melodisch Moll", "ナチュラルとメロディックを比べる", "自然小调与旋律小调"),
    text("Harmonic versus melodic minor", "Menor harmônica contra melódica", "Menor armónica frente a melódica", "Harmonisch gegen melodisch Moll", "ハーモニックとメロディックを比べる", "和声小调与旋律小调"),
    text("Hear six before seven", "Ouça o seis antes do sete", "Escucha el seis antes del siete", "Höre die Sechs vor der Sieben", "7度の前の6度を聴く", "听清七级之前的六级"),
    text("Hear seven resolve to one", "Ouça o sete resolver no um", "Escucha el siete resolver en uno", "Höre Sieben nach Eins lösen", "7度から1度への解決を聴く", "听七级解决到一级"),
    text("Choose natural or melodic minor without labels", "Escolha menor natural ou melódica sem rótulos", "Elige menor natural o melódica sin etiquetas", "Wähle natürlich oder melodisch Moll ohne Etiketten", "ラベルなしでナチュラルかメロディックを選ぶ", "隐藏标签选择自然小调或旋律小调"),
    text("Choose the minor color for the phrase", "Escolha a cor menor da frase", "Elige el color menor de la frase", "Wähle die Mollfarbe der Phrase", "フレーズに合うマイナーを選ぶ", "为乐句选择小调色彩"),
  ],
  "modes-by-color-note": [
    text("Dorian: natural six", "Dórico: sexta natural", "Dórico: sexta natural", "Dorisch: große Sexte", "ドリアン：ナチュラル6", "多利亚：还原六级"),
    text("Phrygian: flat two", "Frígio: segunda bemol", "Frigio: segunda bemol", "Phrygisch: kleine Sekunde", "フリジアン：フラット2", "弗里几亚：降二级"),
    text("Lydian: sharp four", "Lídio: quarta sustenida", "Lidio: cuarta sostenida", "Lydisch: übermäßige Quarte", "リディアン：シャープ4", "利底亚：升四级"),
    text("Mixolydian: flat seven", "Mixolídio: sétima bemol", "Mixolidio: séptima bemol", "Mixolydisch: kleine Septime", "ミクソリディアン：フラット7", "混合利底亚：降七级"),
    text("Aeolian: flat six", "Eólio: sexta bemol", "Eolio: sexta bemol", "Äolisch: kleine Sexte", "エオリアン：フラット6", "爱奥利亚：降六级"),
    text("Locrian: flat five", "Lócrio: quinta bemol", "Locrio: quinta bemol", "Lokrisch: verminderte Quinte", "ロクリアン：フラット5", "洛克里亚：降五级"),
    text("Dorian versus Aeolian", "Dórico contra eólio", "Dórico frente a eolio", "Dorisch gegen Äolisch", "ドリアンとエオリアン", "多利亚与爱奥利亚"),
    text("Lydian versus major", "Lídio contra maior", "Lidio frente a mayor", "Lydisch gegen Dur", "リディアンとメジャー", "利底亚与大调"),
    text("Mixolydian versus major", "Mixolídio contra maior", "Mixolidio frente a mayor", "Mixolydisch gegen Dur", "ミクソリディアンとメジャー", "混合利底亚与大调"),
    text("Name the mode from its color note", "Nomeie o modo pela nota de cor", "Nombra el modo por su nota de color", "Benenne den Modus am Farbton", "特徴音からモードを答える", "根据色彩音说出调式"),
  ],
  "melodic-minor-map": [
    text("C melodic minor: raised six and seven", "Dó menor melódica: sexta e sétima elevadas", "Do menor melódica: sexta y séptima elevadas", "C melodisch Moll: erhöhte Sechs und Sieben", "Cメロディックマイナー：上げた6度と7度", "C旋律小调：升六级和七级"),
    text("D Dorian flat two (Javaneese)", "Ré dórica com segunda bemol (Javaneese)", "Re dórica con segunda bemol (Javaneese)", "D Dorisch mit kleiner Sekunde (Javaneese)", "Dドリアン♭2（Javaneese）", "D多利亚降二级（Javaneese）"),
    text("Eb Lydian augmented", "Mi bemol lídia aumentada", "Mi bemol lidia aumentada", "Es Lydisch übermäßig", "E♭リディアンオーギュメンテッド", "E♭增利底亚"),
    text("F Lydian dominant: sharp four, flat seven", "Fá lídia dominante: quarta sustenida, sétima bemol", "Fa lidia dominante: cuarta sostenida, séptima bemol", "F Lydisch dominant: erhöhte Quarte, kleine Septime", "Fリディアンドミナント：♯4と♭7", "F利底亚属调式：升四级、降七级"),
    text("G Mixolydian flat six (Hindu)", "Sol mixolídia com sexta bemol (Hindu)", "Sol mixolidia con sexta bemol (Hindu)", "G Mixolydisch mit kleiner Sexte (Hindu)", "Gミクソリディアン♭6（Hindu）", "G混合利底亚降六级（Hindu）"),
    text("A Locrian natural two", "Lá lócria com segunda natural", "La locria con segunda natural", "A Lokrisch mit großer Sekunde", "Aロクリアン♮2", "A洛克里亚还原二级"),
    text("Complete the ending in B altered", "Complete o final em si alterada", "Completa el final en si alterada", "Ergänze den Schluss in B alteriert", "Bオルタードの終わりを補う", "补全B变化音阶的结尾"),
    text("Move C melodic minor to D", "Leve dó menor melódica para ré", "Lleva do menor melódica a re", "Versetze C melodisch Moll nach D", "CメロディックマイナーをDへ移す", "把C旋律小调移到D"),
    text("Resolve B altered to C without the screen", "Resolva si alterada em dó sem olhar a tela", "Resuelve si alterada en do sin mirar la pantalla", "Löse B alteriert ohne Bildschirm nach C", "画面を見ずにBオルタードをCへ解決する", "不看屏幕把B变化音阶解决到C"),
    text("Recall C melodic minor and B altered after one listen", "Recorde dó menor melódica e si alterada após uma audição", "Recuerda do menor melódica y si alterada tras una escucha", "Erinnere C melodisch Moll und B alteriert nach einmaligem Hören", "一度聴いてCメロディックマイナーとBオルタードを再現する", "听一遍后复现C旋律小调与B变化音阶"),
  ],
  "symmetric-scales": [
    text("Use repeated start and end as a temporary reference", "Use início e fim repetidos como referência temporária", "Usa inicio y final repetidos como referencia temporal", "Nutze wiederholten Anfang und Schluss als vorläufige Referenz", "反復する始点と終点を一時的な基準にする", "把重复的开头与结尾当作临时参照"),
    text("Climb through equal interval cells", "Suba por células intervalares iguais", "Sube por células interválicas iguales", "Steige durch gleiche Intervallzellen", "等しい音程セルで上行する", "沿相等音程单元上行"),
    text("Descend through equal interval cells", "Desça por células intervalares iguais", "Baja por células interválicas iguales", "Steige durch gleiche Intervallzellen ab", "等しい音程セルで下降する", "沿相等音程单元下行"),
    text("Turn without breaking the interval cycle", "Faça a volta sem quebrar o ciclo intervalar", "Gira sin romper el ciclo interválico", "Wende ohne Bruch im Intervallzyklus", "音程周期を崩さず折り返す", "不打断音程循环完成转向"),
    text("Trace the repeating two-note cell", "Percorra a célula repetida de duas notas", "Recorre la célula repetida de dos notas", "Verfolge die wiederkehrende Zweierzelle", "反復する2音セルをたどる", "追踪重复的两音单元"),
    text("Cycle one three-note interval cell", "Repita uma célula intervalar de três notas", "Repite una célula interválica de tres notas", "Zykliere eine dreitönige Intervallzelle", "3音の音程セルを循環させる", "循环一个三音音程单元"),
    text("Hear both augmented triads inside whole tone", "Ouça as duas tríades aumentadas nos tons inteiros", "Escucha las dos tríadas aumentadas en tonos enteros", "Höre beide übermäßigen Dreiklänge in der Ganztonskala", "全音音階内の2つの増三和音を聴く", "听出全音阶中的两个增三和弦"),
    text("Keep the rest inside the interval cycle", "Mantenha a pausa dentro do ciclo intervalar", "Mantén el silencio dentro del ciclo interválico", "Halte die Pause im Intervallzyklus", "音程周期の中で休符を保つ", "把休止保持在音程循环内"),
    text("Keep the interval cell at three tempos", "Mantenha a célula intervalar em três andamentos", "Mantén la célula interválica a tres tempos", "Halte die Intervallzelle bei drei Tempi", "3つのテンポで音程セルを保つ", "用三个速度保持音程单元"),
    text("Record one complete symmetric cycle", "Grave um ciclo simétrico completo", "Graba un ciclo simétrico completo", "Nimm einen ganzen symmetrischen Zyklus auf", "対称周期を一周録音する", "录下一个完整对称循环"),
  ],
  "sequence-workshop": [
    null, null, null,
    text("A natural minor · Connect two clean turns", "Lá menor natural · Ligue duas voltas limpas", "La menor natural · Conecta dos giros limpios", "A natürlich Moll · Verbinde zwei saubere Wenden", "Aナチュラルマイナー・2つの折り返しを滑らかにつなぐ", "A自然小调·连接两次干净转向"),
  ],
  "distinct-pitch-collections": [
    text("C Hirajoshi versus Iwato", "Dó Hirajoshi contra Iwato", "Do Hirajoshi frente a Iwato", "C Hirajoshi gegen Iwato", "C平調子と岩戸", "C Hirajoshi与Iwato"),
    text("D Iwato versus Kumoi", "Ré Iwato contra Kumoi", "Re Iwato frente a Kumoi", "D Iwato gegen Kumoi", "D岩戸と雲井", "D Iwato与Kumoi"),
    text("E Kumoi versus Hirajoshi", "Mi Kumoi contra Hirajoshi", "Mi Kumoi frente a Hirajoshi", "E Kumoi gegen Hirajoshi", "E雲井と平調子", "E Kumoi与Hirajoshi"),
    text("F Pelog versus Hirajoshi", "Fá Pelog contra Hirajoshi", "Fa Pelog frente a Hirajoshi", "F Pelog gegen Hirajoshi", "Fペロッグと平調子", "F Pelog与Hirajoshi"),
    text("G Romanian minor versus Hungarian major", "Sol menor romena contra maior húngara", "Sol menor rumana frente a mayor húngara", "G rumänisch Moll gegen ungarisch Dur", "Gルーマニアンマイナーとハンガリアンメジャー", "G罗马尼亚小调与匈牙利大调"),
    text("A Hungarian-major rhythm in Neapolitan minor", "Ritmo de lá maior húngara em menor napolitana", "Ritmo de la mayor húngara en menor napolitana", "Rhythmus aus A ungarisch Dur in neapolitanisch Moll", "Aハンガリアンメジャーのリズムをナポリタンマイナーへ", "把A匈牙利大调节奏用于那不勒斯小调"),
    text("Complete the missing C Neapolitan-minor ending", "Complete o final ausente em dó menor napolitana", "Completa el final ausente en do menor napolitana", "Ergänze den fehlenden Schluss in C neapolitanisch Moll", "Cナポリタンマイナーの欠けた終わりを補う", "补全C那不勒斯小调缺少的结尾"),
    text("Move D Prometheus to E", "Leve ré Prometheus para mi", "Lleva re Prometheus a mi", "Versetze D Prometheus nach E", "DプロメテウスをEへ移す", "把D普罗米修斯移到E"),
    text("Identify E Hirajoshi without the screen", "Identifique mi Hirajoshi sem olhar a tela", "Identifica mi Hirajoshi sin mirar la pantalla", "Erkenne E Hirajoshi ohne Bildschirm", "画面を見ずにE平調子を判別する", "不看屏幕辨认E Hirajoshi"),
    text("Recall F Iwato after one listen", "Recorde fá Iwato após uma audição", "Recuerda fa Iwato tras una escucha", "Erinnere F Iwato nach einmaligem Hören", "一度聴いてF岩戸を再現する", "听一遍后复现F Iwato"),
  ],
  "rhythmic-displacement": [
    text("Hear the motif on beat one", "Ouça o motivo no primeiro tempo", "Escucha el motivo en el primer pulso", "Höre das Motiv auf der Eins", "動機を1拍目から聴く", "听动机从第一拍开始"),
    text("Shift the motif by half a beat", "Desloque o motivo por meio tempo", "Desplaza el motivo medio pulso", "Verschiebe das Motiv um einen halben Schlag", "動機を半拍ずらす", "把动机移后半拍"),
    text("Shift the motif by one beat", "Desloque o motivo por um tempo", "Desplaza el motivo un pulso", "Verschiebe das Motiv um einen Schlag", "動機を1拍ずらす", "把动机移后一拍"),
    text("Keep the pickup subdivision exact", "Mantenha exata a subdivisão da anacruse", "Mantén exacta la subdivisión de anacrusa", "Halte die Auftakt-Unterteilung genau", "アウフタクトの細分を正確に保つ", "保持弱起细分准确"),
    text("Move the rest, not the notes", "Mova a pausa, não as notas", "Mueve el silencio, no las notas", "Verschiebe die Pause, nicht die Töne", "音ではなく休符を動かす", "移动休止而不改音符"),
    text("Preserve the long note after the shift", "Preserve a nota longa após o deslocamento", "Conserva la nota larga tras el desplazamiento", "Bewahre den langen Ton nach der Verschiebung", "ずらした後も長い音を保つ", "移位后保持长音"),
    text("Let the offbeat become the accent", "Deixe o contratempo virar acento", "Deja que el contratiempo sea el acento", "Lass den Offbeat zum Akzent werden", "裏拍をアクセントにする", "让反拍成为重音"),
    text("Compare two onset positions", "Compare duas posições de entrada", "Compara dos posiciones de entrada", "Vergleiche zwei Einsatzpositionen", "2つの開始位置を比べる", "比较两个起始位置"),
    text("Hold the displacement at three tempos", "Mantenha o deslocamento em três andamentos", "Mantén el desplazamiento a tres tempos", "Halte die Verschiebung bei drei Tempi", "3つのテンポでずれを保つ", "用三个速度保持移位"),
    text("Complete two bars without resetting", "Complete dois compassos sem reiniciar", "Completa dos compases sin reiniciar", "Spiele zwei Takte ohne Neustart", "リセットせず2小節を通す", "不中断完成两小节"),
  ],
};

const UNIT_FOCUS_KEYS = {
  "steady-pulse": ["beat-one", "even-attacks", "two-beat-hold", "split-beat", "count-rest", "return-silence", "offbeat", "moving-accent", "tempo-control", "no-drift"],
  "degrees-at-work": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "whole-and-half-steps": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "major-keys-in-reach": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "natural-minor-groundwork": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "pentatonic-first-steps": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "interval-landmarks": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "clean-scale-movement": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "shape-the-phrase": ["question", "answer", "repeat-rhythm", "change-ending", "leave-space", "start-away", "high-point", "lower-answer", "four-bars", "eight-bars"],
  "first-improvised-lines": ["question", "answer", "repeat-rhythm", "change-ending", "leave-space", "start-away", "high-point", "lower-answer", "four-bars", "eight-bars"],
  "move-one-idea": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "three-minor-colors": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "register-bridges": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "sequence-workshop": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "rhythm-inside-the-scale": ["beat-one", "even-attacks", "two-beat-hold", "split-beat", "count-rest", "return-silence", "offbeat", "moving-accent", "tempo-control", "no-drift"],
  "blues-in-short-sentences": ["question", "answer", "repeat-rhythm", "change-ending", "leave-space", "start-away", "high-point", "lower-answer", "four-bars", "eight-bars"],
  "modes-by-color-note": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "land-on-chord-tones": ["hear-change", "land-root", "land-third", "land-fifth", "below", "above", "common-tone", "two-chords", "four-chords", "full-chorus"],
  "hear-then-play": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "build-eight-bar-solo": ["question", "answer", "repeat-rhythm", "change-ending", "leave-space", "start-away", "high-point", "lower-answer", "four-bars", "eight-bars"],
  "modes-in-motion": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "harmonic-minor-in-practice": ["hear-change", "land-root", "land-third", "land-fifth", "below", "above", "common-tone", "two-chords", "four-chords", "full-chorus"],
  "melodic-minor-map": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "symmetric-scales": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "wide-interval-lines": ["hear-center", "climb-evenly", "descend-evenly", "clean-turn", "thirds", "groups-three", "target-note", "measured-rest", "three-tempos", "full-study"],
  "rhythmic-displacement": ["beat-one", "even-attacks", "two-beat-hold", "split-beat", "count-rest", "return-silence", "offbeat", "moving-accent", "tempo-control", "no-drift"],
  "voice-leading-through-changes": ["hear-change", "land-root", "land-third", "land-fifth", "below", "above", "common-tone", "two-chords", "four-chords", "full-chorus"],
  "chromatic-approaches": ["hear-change", "land-root", "land-third", "land-fifth", "below", "above", "common-tone", "two-chords", "four-chords", "full-chorus"],
  "distinct-pitch-collections": ["tonic", "sing-first", "changed-note", "contour", "target-degree", "copy-rhythm", "missing-ending", "new-tonic", "screen-off", "one-listen"],
  "design-complete-take": ["question", "answer", "repeat-rhythm", "change-ending", "leave-space", "start-away", "high-point", "lower-answer", "four-bars", "eight-bars"],
};

const PLAN_ASSIGNMENTS = {
  "melodic-minor-map": [
    ["Melodic Minor", "C"], ["Javaneese", "D"], ["Lydian Augmented", "Eb"],
    ["Melodic Minor", "C"], ["Hindu", "G"], ["Half‑Diminished ♯2 (Locrian ♮2)", "A"],
    ["Super Locrian", "B"], ["Melodic Minor", "C"], ["Super Locrian", "B"], ["Melodic Minor", "C"],
  ],
};

const FOCUS_BY_KEY = new Map(
  Object.values(FOCUS).flat().map(([key, titles]) => [key, titles])
);

for (const unitDefinition of UNITS) {
  const goalKeys = UNIT_FOCUS_KEYS[unitDefinition.slug];
  if (!goalKeys || goalKeys.length !== 10 || new Set(goalKeys).size !== 10) {
    throw new Error(`${unitDefinition.slug} needs ten owned, distinct goal keys.`);
  }
  unitDefinition.plans = goalKeys.map((goalKey, index) => {
    const assignment = PLAN_ASSIGNMENTS[unitDefinition.slug]?.[index];
    const scale = assignment?.[0] || unitDefinition.scales[index % unitDefinition.scales.length];
    const root = assignment?.[1] || unitDefinition.roots[index % unitDefinition.roots.length];
    const specialized = SPECIAL_FOCUS[unitDefinition.slug]?.[index];
    const baseTitle = FOCUS_BY_KEY.get(goalKey);
    if (!baseTitle) throw new Error(`Unknown goal key ${goalKey}.`);
    const contextual = specialized || Object.fromEntries(LOCALES.map((locale) => [
      locale,
      `${root} ${SCALE_NAMES[scale][locale]} · ${baseTitle[locale]}`,
    ]));
    return { slug: goalKey, titles: contextual, goalText: specialized || baseTitle, scale, root };
  });
}

const DEGREE_COUNTS = {
  "Pentatonic Major": 5,
  "Pentatonic Minor": 5,
  Blues: 6,
  "Whole Tone": 6,
  Prometheus: 6,
  Hirajoshi: 5,
  Iwato: 5,
  Kumoi: 5,
  Pelog: 5,
  Chromatic: 12,
  "Octatonic Diminished (Half‑Whole)": 8,
  "Octatonic Diminished (Whole‑Half)": 8,
};

const TAP_PATTERNS = [
  "x - - - x - - -",
  "x x x x x x x x",
  "x/2 -/2 x/2 -/2 x/2 -/2 x/2 -/2",
  "x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5",
  "x x - x x x - x",
  "x - - x x - - x",
  "- x - x - x - x",
  "x - x x - x x -",
  "x/0.5 x/0.5 x x/0.5 x/0.5 x x",
  "x - x - x x - x x - x - x x - x",
];

// Every non-listening unit owns its ten playable studies. These are kept as
// data rather than inferred from a generic lesson index, so the title, task,
// and card describe the same musical action.
const UNIT_EXERCISES = {
  "degrees-at-work": [
    { degrees: "1 -/1 1/2" }, { degrees: "1 2 1/2" },
    { degrees: "1 3 2 1/2" }, { degrees: "1 4 3 1/2" },
    { degrees: "1 5 4 3 2 1/2" }, { degrees: "1 6 5 3 1/2" },
    { degrees: "5 6 7 8/2" }, { degrees: "1 3 -/1 5 3 1/2" },
    { degrees: "1 2 3 4 5 6 7 8", ladder: true },
    { degrees: "1 3 2 4 3 5 4 6 5 7 6 8 7 5 3 1/2" },
  ],
  "major-keys-in-reach": [
    { degrees: "1 5 1/2" }, { direction: "ascending" },
    { direction: "descending" }, { direction: "upAndDown" },
    { pattern: "thirds" }, { pattern: "groupsOfThree" },
    { degrees: "1 3 5 7/2 8 7 5 3 1/2" },
    { degrees: "1 2 3 -/1 5 4 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { pattern: "groupsOfFour", direction: "upAndDown" },
  ],
  "natural-minor-groundwork": [
    { degrees: "1 3 1/2" }, { degrees: "1 2 3 4 5 6 7 8" },
    { degrees: "8 7 6 5 4 3 2 1" }, { degrees: "1 2 3 4 5 4 3 2 1/2" },
    { degrees: "1 3 5 3 1/2" }, { degrees: "1 2 3 2 3 4 5 4 5 6 7 8" },
    { degrees: "5 6/2 5 4 3 2 1/2" }, { degrees: "1 3 -/1 5 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { degrees: "1 3 2 4 3 5 4 6 5 7 6 8 7 5 3 1/2" },
  ],
  "pentatonic-first-steps": [
    { degrees: "1 3 1/2" }, { degrees: "1 2 3 4 5 6" },
    { degrees: "6 5 4 3 2 1" }, { degrees: "1 2 3 4 5 6 5 4 3 2 1" },
    { degrees: "1 3 2 4 3 5 4 6" }, { degrees: "1 2 3 2 3 4 5 4 5 6" },
    { degrees: "1 2 4/2 5 4 2 1/2" }, { degrees: "1 3 -/1 4 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { degrees: "1 2 3 5 4 2 1 -/1 3 4 5 3 2 1/2" },
  ],
  "clean-scale-movement": [
    { degrees: "1 5 1/2" }, { direction: "ascending" },
    { direction: "descending" }, { direction: "upAndDown" },
    { degrees: "1 3 2 4 3 5 4 6 5 7" },
    { degrees: "1 2 3 2 3 4 3 4 5 4 5 6" },
    { degrees: "1 2 3 4 5/2 4 3 2 1/2" },
    { degrees: "1 2 3 -/1 4 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { pattern: "groupsOfFour", direction: "upAndDown" },
  ],
  "shape-the-phrase": [
    { degrees: "1 2 -/2" }, { degrees: "5 3 2 1/2" },
    { degrees: "1 2 3 1 1 2 3 1" }, { degrees: "1 2 3 2 1 2 4 1/2" },
    { degrees: "1 3 -/1 2 1/2" }, { degrees: "3 2 4 3 5 2 1/2" },
    { degrees: "1 2 3 5/2 4 3 2 1/2" }, { degrees: "6 5 3 2 1 3 2 1/2" },
    { degrees: "1 2 3 5 3 2 4 6 5 3 2 1 1 2 3 1" },
    { degrees: "1 3 2 5 4 2 1 - 3 5 4 2 1 2 3 5 4 2 1 - 3 2 4 6 5 3 2 1 3 2 1 1" },
  ],
  "first-improvised-lines": [
    { degrees: "1 2 -/2" }, { degrees: "1 2 3 2 1/2" },
    { degrees: "1 2 3 1 1 2 3 1" }, { degrees: "1 2 3 2 1 2 4 1/2" },
    { degrees: "1 3 -/1 2 1/2" }, { degrees: "3 2 4 3 2 1/2" },
    { degrees: "1 2 3 5/2 4 3 2 1/2" }, { degrees: "5 4 3 2 1 3 2 1/2" },
    { degrees: "1 2 3 2 1 - 1 3 2 1 2 3 1 -/1" },
    { degrees: "1 2 3 2 1 - 1 3 2 1 2 4 3 1 1 2 3 5 3 2 1 - 3 2 4 3 2 1 - 2 3 2 1" },
  ],
  "register-bridges": [
    { degrees: "1 5 8 5 1/2" }, { pattern: "scale", direction: "ascending" },
    { pattern: "scale", direction: "descending" }, { pattern: "scale", direction: "upAndDown" },
    { degrees: "1 3 5 7 9 7 5 3 1/2" }, { degrees: "1 2 3 4 5 6 7 8 9 10" },
    { degrees: "5 6 7 8/2 9 8 7 6 5/2" }, { degrees: "1 3 5 -/1 8 6 4 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { degrees: "1 3 5 8 10 8 6 4 2 1/2" },
  ],
  "sequence-workshop": [
    { degrees: "1 2 3 2 3 4 3 4 5" }, { degrees: "1 2 3 4 2 3 4 5" },
    { degrees: "8 7 6 7 6 5 6 5 4" }, { degrees: "1 2 3 4 3 2 2 3 4 5 4 3" },
    { degrees: "1 3 2 4 3 5 4 6 5 7" }, { degrees: "1 2 3 2 3 4 3 4 5 4 5 6" },
    { degrees: "1 2 3 5 2 3 4 6 3 4 5 7" }, { degrees: "1 2 3 -/1 2 3 4 2 3 4 5" },
    { degrees: "1 2 3 2 3 4 3 4 5", ladder: true },
    { degrees: "1 2 3 4 2 3 4 5 3 4 5 6 4 5 6 7 5 6 7 8" },
  ],
  "rhythm-inside-the-scale": [
    { degrees: "1 - 2 - 3 - 4 -" }, { degrees: "1 2 3 4 5 6 7 8" },
    { degrees: "1/2 2 3/2 4 5/2" }, { degrees: "1/0.5 2/0.5 3/0.5 4/0.5 5 6" },
    { degrees: "1 2 - 3 4 - 5 4" }, { degrees: "1 2 3 - - 4 5 3" },
    { degrees: "-/0.5 1/0.5 -/0.5 2/0.5 -/0.5 3/0.5 4 5" },
    { degrees: "1 2 3/2 4 5 6/2 5 4" },
    { degrees: "1/0.5 2/0.5 3 4 5/0.5 6/0.5 7 8", ladder: true },
    { degrees: "1 2 - 3 4 5/0.5 6/0.5 5 - 3 2 1/2" },
  ],
  "blues-in-short-sentences": [
    { degrees: "1 3 -/2" }, { degrees: "5 4 3 1/2" },
    { degrees: "1 3 4 3 1 3 4 3" }, { degrees: "1 3 4 3 1 3 5 1/2" },
    { degrees: "1 3 -/1 4 3 1/2" }, { degrees: "3 4 5 4 3 1/2" },
    { degrees: "1 3 4 5/2 4 3 1/2" }, { degrees: "5 4 3 1 3 2 1/2" },
    { degrees: "1 3 4 5 4 3 1 - 3 4 5 6 5 4 3 1" },
    { degrees: "1 3 4 5 4 3 1 - 3 4 5 6 5 4 3 1 1 3 4 5 6 5 4 3 5 4 3 1 3 2 1 1" },
  ],
  "land-on-chord-tones": [
    { degrees: "1/4 4/4 5/4 1/4" }, { degrees: "1/4 4/4 5/4 1/4" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "5/4 1/4 2/4 5/4" },
    { degrees: "7 1/3 3 4/3 4 5/3 7 1/3" }, { degrees: "2 1/3 5 4/3 6 5/3 2 1/3" },
    { degrees: "1/8 2/4 1/4" }, { degrees: "3/4 4/4 5/4 1/4" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "1 2 3 1 4 5 6 4 5 6 7 5 1 2 3 1" },
  ],
  "build-eight-bar-solo": [
    { degrees: "1 3 -/2" }, { degrees: "5 3 2 1/2" },
    { degrees: "1 3 4 3 1 3 4 3" }, { degrees: "1 3 4 3 1 3 5 1/2" },
    { degrees: "1 3 -/1 4 3 1/2" }, { degrees: "3 2 4 3 5 2 1/2" },
    { degrees: "1 3 4 6/2 5 4 3 1/2" }, { degrees: "6 5 3 2 1 3 2 1/2" },
    { degrees: "1 3 4 5 3 2 4 6 5 3 2 1 1 3 4 1" },
    { degrees: "1 3 2 5 4 2 1 - 3 5 4 2 1 2 3 5 4 2 1 - 3 2 4 6 5 3 2 1 3 2 1 1" },
  ],
  "modes-in-motion": [
    { degrees: "1 5 1/2" }, { direction: "ascending" }, { direction: "descending" },
    { direction: "upAndDown" }, { pattern: "thirds" }, { pattern: "groupsOfThree" },
    { degrees: "1 2/2 3 2 1/2" }, { degrees: "1 2 3 -/1 4 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { degrees: "1 2 3 4 5 6 7 8 7 6 5 4 3 2 1/2" },
  ],
  "harmonic-minor-in-practice": [
    { degrees: "1/4 4/4 5/4 1/4" }, { degrees: "1/4 4/4 5/4 1/4" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "5/4 1/4 2/4 5/4" },
    { degrees: "7 1/3 3 4/3 4 5/3 7 1/3" }, { degrees: "2 1/3 5 4/3 6 5/3 2 1/3" },
    { degrees: "1/8 2/4 1/4" }, { degrees: "6 7/3 7 8/3 6 7/3 7 8/3" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "5 6 7 8 7 6 5 4 5 6 7 8 7 5 3 1" },
  ],
  "symmetric-scales": [
    { degrees: "1 4 1/2" }, { direction: "ascending" }, { direction: "descending" },
    { direction: "upAndDown" }, { degrees: "1 3 2 4 3 5 4 6" },
    { degrees: "1 2 3 2 3 4 3 4 5" }, { degrees: "1 3 5/2 2 4 6/2" },
    { degrees: "1 2 3 -/1 4 3 2 1/2" },
    { pattern: "scale", direction: "upAndDown", ladder: true },
    { pattern: "groupsOfFour", direction: "upAndDown" },
  ],
  "wide-interval-lines": [
    { degrees: "1 4 2 5 3 6 4 7 5 8 1/2" }, { degrees: "1 5 2 6 3 7 4 8" },
    { degrees: "8 4 7 3 6 2 5 1" }, { degrees: "1 5 2 6 3 7 4 8 7 3 6 2 5 1" },
    { degrees: "1 3 2 4 3 5 4 6 5 7" }, { degrees: "1 4 5 2 5 6 3 6 7 4 7 8" },
    { degrees: "8 6/2 7 5 6 4 5 3 4 2 3 1" }, { degrees: "1 5 -/1 2 6 -/1 3 7 -/1 4 8" },
    { pattern: "thirds", direction: "upAndDown", ladder: true },
    { degrees: "1 4 2 6 3 7 5 8 4 2 1/2" },
  ],
  "rhythmic-displacement": [
    { degrees: "1/0.5 3/0.5 2/0.5 5/0.5 3/0.5 1/0.5 -/0.5 -/0.5" }, { degrees: "-/0.5 1 2 3 5 3 2 1" },
    { degrees: "-/0.5 -/0.5 1/0.5 2/0.5 4/0.5 5/0.5 4/0.5 2/0.5 1/0.5" }, { degrees: "-/1.5 1 2 3 5 3 2 1" },
    { degrees: "1 2 - 3 5 3 2 1" }, { degrees: "- 1 2 - 3 5 3 2" },
    { degrees: "-/0.5 1/0.5 -/0.5 2/0.5 3 5 3 2 1" },
    { degrees: "1 2 3/2 -/1 5 3 2 1" },
    { degrees: "1 2 3 5 3 2 1 -", ladder: true },
    { degrees: "1 2 3 5 3 2 1 - - 1 2 3 5 3 2 1" },
  ],
  "voice-leading-through-changes": [
    { degrees: "1/4 4/4 5/4 1/4" }, { degrees: "1/4 4/4 5/4 1/4" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "5/4 1/4 2/4 5/4" },
    { degrees: "7 1/3 3 4/3 4 5/3 7 1/3" }, { degrees: "2 1/3 5 4/3 6 5/3 2 1/3" },
    { degrees: "1/8 2/4 1/4" }, { degrees: "3/4 4/4 5/4 1/4" },
    { degrees: "3/4 6/4 7/4 3/4" }, { degrees: "3 2 1 7 6 5 4 3 2 1 7 6 5 4 3 1" },
  ],
  "chromatic-approaches": [
    { degrees: "1 2 3 1 4 5 6 4 5 #4 5/2 1 2 b2 1/2" },
    { degrees: "1/3 3 4/3 #4 5/3 7 1/4" },
    { degrees: "2 b3 3/2 5 b6 6/2 6 b7 7/2 2 b3 3/2" },
    { degrees: "4 #4 5/2 7 #7 8/2 1 #1 2/2 4 #4 5/2" },
    { degrees: "3/3 b6 6/3 b7 7/3 b3 3/3 b3" },
    { degrees: "2 1/3 5 4/3 6 5/3 2 1/3" },
    { degrees: "1/8 2/4 1/4" }, { degrees: "1 b2 2/2 3 b3 3/2 4 #4 5/2 2 b2 1/2" },
    { degrees: "3 b3 3/2 6 b6 6/2 7 b7 7/2 3 b3 3/2" },
    { degrees: "1 b2 2 3 b3 3 4 #4 5 6 b6 5 4 3 b3 1" },
  ],
  "design-complete-take": [
    { degrees: "1 3 -/2" }, { degrees: "5 3 2 1/2" },
    { degrees: "1 2 3 1 1 2 3 1" }, { degrees: "1 2 3 2 1 2 4 1/2" },
    { degrees: "1 3 -/1 2 1/2" }, { degrees: "3 2 4 3 5 2 1/2" },
    { degrees: "1 2 3 6/2 5 4 3 1/2" }, { degrees: "6 5 3 2 1 3 2 1/2" },
    { degrees: "1 2 3 5 3 2 4 6 5 3 2 1 1 2 3 1" },
    { degrees: "1 3 2 5 4 2 1 - 3 5 4 2 1 2 3 5 4 2 1 - 3 2 4 6 5 3 2 1 3 2 1 1" },
  ],
};

const THEMES = [
  "metronome", "number", "arrow.up.arrow.down", "circle.grid.2x2", "moon",
  "circle.hexagongrid", "ruler", "hand.raised", "waveform.path", "pencil.and.outline",
];

function titleFor(unitDefinition, focus, locale) {
  if (unitDefinition.slug === "steady-pulse" && focus[0] === "even-attacks") {
    return `${unitDefinition.titles[locale]} · ${focus[1][locale]}`;
  }
  const separator = locale === "ja" || locale === "zh-Hans" ? "：" : ": ";
  return `${unitDefinition.titles[locale]}${separator}${focus[1][locale]}`;
}

function lowerFirst(value, locale) {
  if (locale === "ja" || locale === "zh-Hans") return value;
  return value.charAt(0).toLocaleLowerCase(locale) + value.slice(1);
}

function displayedComparisonSide(pair, side, locale) {
  const root = pair[`displayRoot${side}`] || pair[`root${side}`];
  const scaleKey = pair[`displayScale${side}`] || pair[`scale${side}`];
  return { root, scale: SCALE_NAMES[scaleKey]?.[locale] || scaleKey };
}

function localizedSummary(locale, context) {
  const focus = context.plan.goalText[locale];
  const goalSentence = /[.!?。！？]$/u.test(focus) ? focus : `${focus}${locale === "ja" || locale === "zh-Hans" ? "。" : "."}`;
  const outcomeSentence = UNIT_SUMMARIES[context.unit.slug][locale];
  if (!context.compare) return `${goalSentence} ${outcomeSentence}`;

  const pair = comparisonSpec(context);
  const sideA = displayedComparisonSide(pair, "A", locale);
  const sideB = displayedComparisonSide(pair, "B", locale);
  const comparisonSentence = {
    en: `A uses ${sideA.root} ${sideA.scale}; B uses ${sideB.root} ${sideB.scale} in the paired playback card.`,
    "pt-BR": `A usa ${sideA.root} ${sideA.scale}; B usa ${sideB.root} ${sideB.scale} no cartão comparativo.`,
    es: `A usa ${sideA.root} ${sideA.scale}; B usa ${sideB.root} ${sideB.scale} en la tarjeta comparativa.`,
    de: `A nutzt ${sideA.root} ${sideA.scale}; B nutzt ${sideB.root} ${sideB.scale} in der Vergleichskarte.`,
    ja: `比較カードではAに${sideA.root}${sideA.scale}、Bに${sideB.root}${sideB.scale}を使います。`,
    "zh-Hans": `对比卡片中A使用${sideA.root}${sideA.scale}，B使用${sideB.root}${sideB.scale}。`,
  }[locale];
  return `${goalSentence} ${outcomeSentence} ${comparisonSentence}`;
}

const UNIT_SUMMARIES = {
  "steady-pulse": text("Lock attacks, rests, and moving accents to an unbroken pulse.", "Prenda ataques, pausas e acentos móveis a uma pulsação contínua.", "Fija ataques, silencios y acentos móviles a un pulso continuo.", "Binde Anschläge, Pausen und wandernde Akzente an einen durchgehenden Puls.", "アタック、休符、動くアクセントを途切れない拍に合わせます。", "把起音、休止和移动重音锁定在连续节拍上。"),
  "degrees-at-work": text("Hear how each scale degree creates distance from home and finds its way back.", "Ouça como cada grau se afasta da tônica e encontra o caminho de volta.", "Escucha cómo cada grado se aleja de la tónica y encuentra el regreso.", "Höre, wie jede Skalenstufe Abstand zum Grundton schafft und zurückfindet.", "各音度が主音から離れ、戻るまでの働きを聴きます。", "听清每个音级如何离开主音并找到回程。"),
  "whole-and-half-steps": text("Distinguish semitones from whole steps and assemble the major-scale step pattern by ear.", "Diferencie semitons de tons e monte de ouvido o padrão da escala maior.", "Distingue semitonos de tonos y arma de oído el patrón de la escala mayor.", "Unterscheide Halb- und Ganztöne und setze das Dur-Schrittmuster nach Gehör zusammen.", "半音と全音を聴き分け、メジャースケールの並びを耳で組み立てます。", "分辨半音与全音，并凭听觉拼出大调音阶结构。"),
  "major-keys-in-reach": text("Carry one dependable major-scale movement through practical keys without losing the tonic.", "Leve um movimento confiável da escala maior por tonalidades práticas sem perder a tônica.", "Lleva un movimiento fiable de escala mayor por tonalidades útiles sin perder la tónica.", "Übertrage eine verlässliche Durbewegung auf gebräuchliche Tonarten, ohne den Grundton zu verlieren.", "安定したメジャーの動きを実用的な調へ移し、主音を見失わないようにします。", "把可靠的大调动作移到常用调，同时不丢失主音感。"),
  "natural-minor-groundwork": text("Build natural minor from its dark third, sixth, and seventh while keeping the tonic firm.", "Construa a menor natural a partir da terça, sexta e sétima menores, com a tônica firme.", "Construye la menor natural desde su tercera, sexta y séptima menores, con la tónica firme.", "Baue natürlich Moll aus kleiner Terz, Sexte und Septime bei festem Grundton auf.", "短3度、短6度、短7度からナチュラルマイナーを組み、主音を保ちます。", "用小三、降六和降七建立自然小调，并稳住主音。"),
  "pentatonic-first-steps": text("Use five-note major and minor collections to make clean shapes and complete short lines.", "Use coleções maiores e menores de cinco notas para formar desenhos limpos e frases completas.", "Usa colecciones mayores y menores de cinco notas para crear formas limpias y frases completas.", "Forme mit Dur- und Moll-Fünftonvorräten saubere Muster und vollständige kurze Linien.", "5音のメジャーとマイナーで、明瞭な形と短い完結したラインを作ります。", "用大调和小调五声音集做出清楚的形状与完整短句。"),
  "interval-landmarks": text("Recognize nine practical interval sizes from a fixed lower note and reproduce them accurately.", "Reconheça nove intervalos úteis a partir de uma nota grave fixa e reproduza-os com precisão.", "Reconoce nueve intervalos útiles desde una nota inferior fija y reprodúcelos con precisión.", "Erkenne neun praktische Intervallgrößen über einem festen unteren Ton und spiele sie genau nach.", "固定した低音から9つの実用的な音程を聴き分け、正確に再現します。", "从固定低音出发辨认九种常用音程，并准确复现。"),
  "clean-scale-movement": text("Remove gaps, clipped notes, and rushed turns from ascending and descending scale motion.", "Elimine lacunas, notas cortadas e voltas apressadas do movimento ascendente e descendente.", "Elimina huecos, notas cortadas y giros apresurados del movimiento ascendente y descendente.", "Beseitige Lücken, gekürzte Töne und hastige Wenden aus Auf- und Abwärtsbewegungen.", "上行と下行から隙間、短い音、急いだ折り返しを取り除きます。", "消除音阶上下行中的空隙、截短音和仓促转向。"),
  "shape-the-phrase": text("Turn small scale cells into questions, answers, peaks, rests, and convincing endings.", "Transforme pequenas células da escala em perguntas, respostas, picos, pausas e finais convincentes.", "Convierte pequeñas células de escala en preguntas, respuestas, cimas, silencios y finales convincentes.", "Forme aus kleinen Skalenzellen Fragen, Antworten, Höhepunkte, Pausen und klare Schlüsse.", "小さな音型を問い、答え、頂点、間、納得できる終わりへ形作ります。", "把小音阶动机塑造成提问、回答、高潮、留白与可信结尾。"),
  "first-improvised-lines": text("Improvise within a tight pentatonic note set, then make each variation easy to hear.", "Improvise dentro de um conjunto pentatônico reduzido e deixe cada variação fácil de ouvir.", "Improvisa dentro de un grupo pentatónico limitado y haz audible cada variación.", "Improvisiere in einem engen pentatonischen Tonvorrat und mache jede Variation deutlich hörbar.", "限られたペンタトニック音で即興し、変化を耳で分かる形にします。", "在受限的五声音组内即兴，让每次变化都清楚可听。"),
  "move-one-idea": text("Keep one motif intact as its tonic moves, preserving degrees, rhythm, and contour.", "Mantenha um motivo intacto ao mudar a tônica, preservando graus, ritmo e contorno.", "Mantén intacto un motivo al cambiar la tónica, conservando grados, ritmo y contorno.", "Bewahre ein Motiv beim Wechsel des Grundtons mit Stufen, Rhythmus und Verlauf vollständig.", "主音を変えても、動機の音度、リズム、輪郭を保ちます。", "移动主音时保持同一动机的音级、节奏与轮廓。"),
  "three-minor-colors": text("Compare natural, harmonic, and melodic minor on one tonic by isolating degrees six and seven.", "Compare menor natural, harmônica e melódica na mesma tônica, isolando os graus seis e sete.", "Compara menor natural, armónica y melódica sobre una tónica, aislando los grados seis y siete.", "Vergleiche natürlich, harmonisch und melodisch Moll auf einem Grundton über Stufe sechs und sieben.", "同じ主音で3種のマイナーを比べ、6度と7度の違いを分離します。", "在同一主音上比较三种小调，单独听六级和七级的差别。"),
  "register-bridges": text("Cross the octave without a bump and keep the same scale shape connected in both registers.", "Atravesse a oitava sem solavanco e mantenha o mesmo desenho ligado nos dois registros.", "Cruza la octava sin tropiezo y mantén conectada la misma forma en ambos registros.", "Überquere die Oktave ohne Unebenheit und verbinde dieselbe Form in beiden Registern.", "オクターブの境目を滑らかに越え、両音域で同じ形をつなぎます。", "平稳跨过八度分界，并在两个音区连接同一形状。"),
  "sequence-workshop": text("Practice named three-, four-, and interval-based sequences without blurring their repeating cell.", "Pratique sequências nomeadas de três, quatro e intervalos sem borrar a célula repetida.", "Practica secuencias de tres, cuatro e intervalos sin difuminar la célula repetida.", "Übe benannte Dreier-, Vierer- und Intervallsequenzen, ohne ihre Zelle zu verwischen.", "3音、4音、音程型のシーケンスを、反復セルを崩さず練習します。", "练习三音、四音与音程模进，保持重复单元清晰。"),
  "rhythm-inside-the-scale": text("Keep scale pitches clear while holds, rests, subdivisions, and offbeats reshape their timing.", "Mantenha as alturas claras enquanto sustentações, pausas, subdivisões e contratempos mudam o ritmo.", "Mantén claras las alturas mientras notas largas, silencios, subdivisiones y contratiempos cambian el ritmo.", "Halte Skalentöne klar, während Halten, Pausen, Unterteilungen und Offbeats ihr Timing formen.", "音価、休符、細分、裏拍でタイミングを変えても、音高を明瞭に保ちます。", "用延音、休止、细分和反拍改变时值，同时保持音高清楚。"),
  "blues-in-short-sentences": text("Make the blues scale’s flat five speak inside compact calls, replies, and endings.", "Faça a quinta bemol da escala blues falar em chamadas, respostas e finais compactos.", "Haz que la quinta bemol de la escala blues hable en llamadas, respuestas y finales breves.", "Lass die verminderte Quinte der Bluesskala in knappen Rufen, Antworten und Schlüssen sprechen.", "ブルーススケールの♭5を、短い呼びかけ、応答、終わりの中で響かせます。", "让布鲁斯音阶的降五级在短促呼句、答句和结尾中开口。"),
  "modes-by-color-note": text("Identify each diatonic mode by comparing one characteristic degree against a familiar neighbor.", "Identifique cada modo diatônico comparando um grau característico com um vizinho conhecido.", "Identifica cada modo diatónico comparando un grado característico con un vecino conocido.", "Erkenne jeden diatonischen Modus über den Vergleich einer charakteristischen Stufe.", "各ダイアトニックモードを、特徴音と近いモードの比較で判別します。", "通过色彩音与相邻调式的对比辨认每个自然调式。"),
  "land-on-chord-tones": text("Aim scale lines at roots, thirds, and fifths exactly where four-chord loops change.", "Mire linhas da escala em fundamentais, terças e quintas exatamente nas mudanças do ciclo.", "Dirige líneas de escala a fundamentales, terceras y quintas justo en los cambios del ciclo.", "Führe Skalenlinien genau an den Wechseln einer Viererfolge zu Grundton, Terz und Quinte.", "4コードの変化位置で、ラインをルート、3度、5度へ着地させます。", "在四和弦循环的切换点，让音阶线准确落到根音、三音和五音。"),
  "hear-then-play": text("Retain a short line after one hearing, then reproduce its pitches, rhythm, and ending.", "Guarde uma linha curta após uma audição e reproduza alturas, ritmo e final.", "Retén una línea corta tras una escucha y reproduce alturas, ritmo y final.", "Behalte eine kurze Linie nach einmaligem Hören und spiele Tonhöhen, Rhythmus und Schluss nach.", "短いラインを一度聴いて記憶し、音高、リズム、終わりを再現します。", "短句只听一遍后记住，并复现音高、节奏和结尾。"),
  "build-eight-bar-solo": text("Develop one motif across eight bars with repetition, contrast, space, and a returned opening.", "Desenvolva um motivo por oito compassos com repetição, contraste, espaço e retorno da abertura.", "Desarrolla un motivo durante ocho compases con repetición, contraste, espacio y regreso del inicio.", "Entwickle ein Motiv über acht Takte mit Wiederholung, Kontrast, Raum und wiederkehrendem Anfang.", "一つの動機を8小節で展開し、反復、対比、間、冒頭回帰を作ります。", "用一个动机发展八小节，包含重复、对比、留白和开头回归。"),
  "modes-in-motion": text("Keep each mode recognizable while its characteristic degree moves through practical lines.", "Mantenha cada modo reconhecível enquanto seu grau característico percorre linhas práticas.", "Mantén reconocible cada modo mientras su grado característico recorre líneas prácticas.", "Halte jeden Modus erkennbar, während seine charakteristische Stufe durch praktische Linien wandert.", "特徴音を実用的なラインの中で動かしながら、各モードの響きを保ちます。", "让色彩音在实际线条中移动，同时保持每个调式可辨。"),
  "harmonic-minor-in-practice": text("Use harmonic minor’s raised seventh and augmented second over minor-key chord motion.", "Use a sétima elevada e a segunda aumentada da menor harmônica sobre acordes em menor.", "Usa la séptima elevada y la segunda aumentada de la menor armónica sobre acordes menores.", "Nutze erhöhte Septime und übermäßige Sekunde von harmonisch Moll über Mollfolgen.", "ハーモニックマイナーの上げた7度と増2度を、マイナーのコード進行で使います。", "在小调和弦进行上运用和声小调的升七级与增二度。"),
  "melodic-minor-map": text("Trace one melodic-minor parent through its practical modes and their defining alterations.", "Percorra uma escala-mãe menor melódica por seus modos práticos e alterações características.", "Recorre una escala madre menor melódica por sus modos prácticos y alteraciones características.", "Verfolge eine melodisch-Moll-Ausgangsskala durch ihre praktischen Modi und Kennstufen.", "一つのメロディックマイナーから実用的なモードと特徴音をたどります。", "从一个旋律小调母音阶追踪实用调式及其特征变化音。"),
  "symmetric-scales": text("Hear and finger the repeating interval cells inside whole-tone and diminished scales.", "Ouça e digite as células intervalares repetidas das escalas de tons inteiros e diminutas.", "Escucha y digita las células interválicas repetidas de escalas de tonos enteros y disminuidas.", "Höre und greife die wiederkehrenden Intervallzellen in Ganzton- und verminderten Skalen.", "全音音階とディミニッシュの反復する音程セルを聴き、運指します。", "听出并弹稳全音与减音阶中的重复音程单元。"),
  "wide-interval-lines": text("Connect fourths, fifths, sixths, and octave crossings without breaking the melodic thread.", "Ligue quartas, quintas, sextas e travessias de oitava sem romper o fio melódico.", "Conecta cuartas, quintas, sextas y cruces de octava sin romper el hilo melódico.", "Verbinde Quarten, Quinten, Sexten und Oktavsprünge ohne Abriss der melodischen Linie.", "4度、5度、6度、オクターブ越えを、旋律の流れを切らずにつなぎます。", "连接四度、五度、六度和跨八度跳进，不切断旋律线。"),
  "rhythmic-displacement": text("Move one fixed motif across the beat and hear how its accents change without changing its notes.", "Desloque um motivo fixo pela pulsação e ouça os acentos mudarem sem trocar as notas.", "Desplaza un motivo fijo por el pulso y escucha cambiar sus acentos sin cambiar las notas.", "Verschiebe ein festes Motiv im Takt und höre neue Akzente bei unveränderten Tönen.", "同じ音の動機を拍の中でずらし、アクセントの変化を聴きます。", "把固定动机沿节拍移位，在音符不变时听重音如何变化。"),
  "voice-leading-through-changes": text("Choose nearby chord tones so one melodic voice crosses each harmonic boundary smoothly.", "Escolha notas de acorde próximas para uma voz melódica atravessar cada mudança com suavidade.", "Elige notas de acorde cercanas para que una voz melódica cruce cada cambio con suavidad.", "Wähle nahe Akkordtöne, damit eine melodische Stimme jede Harmoniegrenze glatt überquert.", "近いコードトーンを選び、一つの旋律声部で各変化を滑らかにつなぎます。", "选择邻近和弦音，让一条旋律声部平滑穿过每次和声变化。"),
  "chromatic-approaches": text("Place one chromatic neighbor immediately before a clear diatonic target at chord changes.", "Coloque uma vizinha cromática logo antes de um alvo diatônico claro nas mudanças de acorde.", "Coloca una vecina cromática justo antes de un objetivo diatónico claro en los cambios de acorde.", "Setze direkt vor ein klares diatonisches Ziel am Akkordwechsel einen chromatischen Nachbarton.", "コード変化の明確なダイアトニック目標音の直前に、半音の隣接音を置きます。", "在和弦切换的明确调内目标音之前，紧接一个半音邻音。"),
  "distinct-pitch-collections": text("Compare unfamiliar pitch collections on one root and describe the interval fingerprint of each.", "Compare coleções incomuns na mesma tônica e descreva a impressão intervalar de cada uma.", "Compara colecciones poco comunes sobre una raíz y describe la huella interválica de cada una.", "Vergleiche ungewohnte Tonvorräte auf einem Grundton und beschreibe ihren Intervall-Fingerabdruck.", "同じ主音で珍しい音集合を比べ、それぞれの音程的な指紋を説明します。", "在同一主音上比较陌生音集，并描述各自的音程指纹。"),
  "design-complete-take": text("Plan an eight-bar take with a motif, peak, silence, register contrast, and deliberate close.", "Planeje oito compassos com motivo, pico, silêncio, contraste de registro e final deliberado.", "Diseña ocho compases con motivo, cima, silencio, contraste de registro y cierre deliberado.", "Plane einen Achttakter mit Motiv, Höhepunkt, Stille, Registerkontrast und bewusstem Schluss.", "動機、頂点、間、音域対比、意図した終止を持つ8小節を設計します。", "设计八小节完整演奏，包含动机、高潮、静默、音区对比和明确收尾。"),
};

const UNIT_MATERIALS = {
  "steady-pulse": text("tap grid", "grade de pulsação", "cuadrícula de pulso", "Klopfraster", "タップグリッド", "点击网格"),
  "degrees-at-work": text("degree map", "mapa de graus", "mapa de grados", "Stufenkarte", "音度マップ", "音级图"),
  "whole-and-half-steps": text("step pair", "par de passos", "par de pasos", "Schrittpaar", "音程ペア", "音程对"),
  "major-keys-in-reach": text("transposed major line", "linha maior transposta", "línea mayor transportada", "transponierte Durlinie", "移調したメジャーライン", "移调大调线"),
  "natural-minor-groundwork": text("natural-minor line", "linha de menor natural", "línea de menor natural", "natürlich-Moll-Linie", "ナチュラルマイナーライン", "自然小调线"),
  "pentatonic-first-steps": text("five-note cell", "célula de cinco notas", "célula de cinco notas", "Fünftonzelle", "5音セル", "五音单元"),
  "interval-landmarks": text("fixed-note interval pair", "par de intervalos com nota fixa", "par de intervalos con nota fija", "Intervallpaar über festem Ton", "固定音の音程ペア", "固定音程对"),
  "clean-scale-movement": text("turning scale", "escala com volta", "escala con giro", "Wendeskala", "折り返すスケール", "转向音阶"),
  "shape-the-phrase": text("written phrase cell", "célula de frase escrita", "célula de frase escrita", "notierte Phrasenzelle", "記譜フレーズセル", "书写乐句单元"),
  "first-improvised-lines": text("bounded pentatonic motif", "motivo pentatônico limitado", "motivo pentatónico limitado", "begrenztes Pentatonikmotiv", "限定ペンタトニック動機", "受限五声音动机"),
  "move-one-idea": text("transposed motif pair", "par de motivos transpostos", "par de motivos transportados", "transponiertes Motivpaar", "移調した動機ペア", "移调动机对"),
  "three-minor-colors": text("minor-color pair", "par de cores menores", "par de colores menores", "Mollfarbenpaar", "マイナーカラーのペア", "小调色彩对"),
  "register-bridges": text("two-register line", "linha em dois registros", "línea en dos registros", "Zweiregisterlinie", "2音域ライン", "双音区线"),
  "sequence-workshop": text("moving sequence cell", "célula sequencial móvel", "célula secuencial móvil", "wandernde Sequenzzelle", "動くシーケンスセル", "移动模进单元"),
  "rhythm-inside-the-scale": text("pitched rhythm line", "linha rítmica com alturas", "línea rítmica con alturas", "tonale Rhythmuslinie", "音高付きリズムライン", "带音高节奏线"),
  "blues-in-short-sentences": text("blues call", "chamada de blues", "llamada de blues", "Bluesruf", "ブルースの呼びかけ", "布鲁斯呼句"),
  "modes-by-color-note": text("same-tonic mode pair", "par modal na mesma tônica", "par modal sobre la misma tónica", "Moduspaar auf einem Grundton", "同主音のモードペア", "同主音调式对"),
  "land-on-chord-tones": text("four-chord target line", "linha-alvo sobre quatro acordes", "línea objetivo sobre cuatro acordes", "Ziellinie über vier Akkorde", "4コードの目標ライン", "四和弦目标线"),
  "hear-then-play": text("recall pair", "par de memória", "par de memoria", "Gedächtnispaar", "記憶再現ペア", "记忆复现对"),
  "build-eight-bar-solo": text("eight-bar sketch", "esboço de oito compassos", "boceto de ocho compases", "Achttaktskizze", "8小節スケッチ", "八小节草图"),
  "modes-in-motion": text("modal line", "linha modal", "línea modal", "Modallinie", "モードライン", "调式线"),
  "harmonic-minor-in-practice": text("harmonic-minor chord line", "linha harmônica em menor harmônica", "línea armónica en menor armónica", "Akkordlinie in harmonisch Moll", "ハーモニックマイナーのコードライン", "和声小调和弦线"),
  "melodic-minor-map": text("parent-mode comparison", "comparação entre escala-mãe e modo", "comparación entre escala madre y modo", "Vergleich von Ausgangsskala und Modus", "親スケールとモードの比較", "母音阶与调式对比"),
  "symmetric-scales": text("repeating interval cell", "célula intervalar repetida", "célula interválica repetida", "wiederkehrende Intervallzelle", "反復音程セル", "重复音程单元"),
  "wide-interval-lines": text("wide-leap line", "linha de saltos amplos", "línea de saltos amplios", "Linie mit weiten Sprüngen", "広い跳躍ライン", "宽跳进线"),
  "rhythmic-displacement": text("shifted motif pair", "par de motivos deslocados", "par de motivos desplazados", "verschobenes Motivpaar", "ずらした動機ペア", "移位动机对"),
  "voice-leading-through-changes": text("four-boundary voice", "voz em quatro fronteiras", "voz en cuatro límites", "Stimme über vier Grenzen", "4つの境界を通る声部", "跨四个边界的声部"),
  "chromatic-approaches": text("chromatic target route", "rota cromática ao alvo", "ruta cromática al objetivo", "chromatischer Zielweg", "半音で目標へ向かう経路", "半音目标路径"),
  "distinct-pitch-collections": text("collection pair", "par de coleções", "par de colecciones", "Tonsammlungspaar", "音集合ペア", "音集对"),
  "design-complete-take": text("complete-take sketch", "esboço da tomada completa", "boceto de toma completa", "Skizze für den ganzen Take", "通し演奏のスケッチ", "完整演奏草图"),
};

const ENGLISH_UNIT_TAGS = {
  "steady-pulse": "pulse-led",
  "degrees-at-work": "degree-aware",
  "whole-and-half-steps": "step-focused",
  "major-keys-in-reach": "keywise",
  "natural-minor-groundwork": "minor-centered",
  "pentatonic-first-steps": "five-note",
  "interval-landmarks": "interval-led",
  "clean-scale-movement": "turn-aware",
  "shape-the-phrase": "phrase-shaped",
  "first-improvised-lines": "improv-ready",
  "move-one-idea": "motivic",
  "three-minor-colors": "color-matched",
  "register-bridges": "register-spanning",
  "sequence-workshop": "sequence-led",
  "rhythm-inside-the-scale": "rhythm-mapped",
  "blues-in-short-sentences": "blues-shaped",
  "modes-by-color-note": "mode-specific",
  "land-on-chord-tones": "chord-aware",
  "hear-then-play": "memory-led",
  "build-eight-bar-solo": "solo-forming",
  "modes-in-motion": "modal-moving",
  "harmonic-minor-in-practice": "cadence-aware",
  "melodic-minor-map": "parent-mode",
  "symmetric-scales": "symmetry-led",
  "wide-interval-lines": "leap-aware",
  "rhythmic-displacement": "offset-mapped",
  "voice-leading-through-changes": "voice-led",
  "chromatic-approaches": "chromatic-led",
  "distinct-pitch-collections": "collection-aware",
  "design-complete-take": "take-shaped",
};

const PLAN_STAGES = [
  text("opening pass", "passagem inicial", "pasada inicial", "Anfangsdurchgang", "最初の通し", "起始一遍"),
  text("measured pass", "passagem medida", "pasada medida", "Messdurchgang", "音価確認の通し", "时值检查"),
  text("return pass", "passagem de retorno", "pasada de regreso", "Rückkehrdurchgang", "戻りの通し", "回归检查"),
  text("turn pass", "passagem da volta", "pasada del giro", "Wendedurchgang", "折り返しの通し", "转向检查"),
  text("paired pass", "passagem em pares", "pasada por pares", "Paardurchgang", "ペアの通し", "成对检查"),
  text("grouped pass", "passagem agrupada", "pasada agrupada", "Gruppendurchgang", "グループの通し", "分组检查"),
  text("target pass", "passagem do alvo", "pasada del objetivo", "Zieldurchgang", "目標音の通し", "目标检查"),
  text("space pass", "passagem do espaço", "pasada del espacio", "Pausendurchgang", "間の通し", "留白检查"),
  text("tempo pass", "passagem de andamento", "pasada de tempo", "Tempodurchgang", "テンポの通し", "速度检查"),
  text("recorded pass", "passagem gravada", "pasada grabada", "Aufnahmedurchgang", "録音の通し", "录音检查"),
];

const PLAN_BODY_CUES = [
  {
    evidence: text("memory check", "checagem de memória", "comprobación de memoria", "Gedächtnisprüfung", "記憶確認", "记忆核对"),
    repair: text("opening-return mismatch", "divergência entre abertura e retorno", "diferencia entre inicio y regreso", "Abweichung zwischen Anfang und Rückkehr", "冒頭と戻りの不一致", "开头与回归不一致"),
    result: text("matched opening and return", "abertura e retorno coincidentes", "inicio y regreso coincidentes", "übereinstimmenden Anfang und Rückkehr", "一致した冒頭と戻り", "一致的开头与回归"),
  },
  {
    evidence: text("counted-pulse check", "checagem da pulsação contada", "comprobación del pulso contado", "Prüfung des gezählten Pulses", "カウント確認", "数拍核对"),
    repair: text("first lost pulse", "primeira pulsação perdida", "primer pulso perdido", "erster verlorener Puls", "最初に崩れた拍", "最早丢失的拍点"),
    result: text("three steady counts", "três contagens firmes", "tres cuentas estables", "drei stabile Zählweisen", "安定した3通りのカウント", "三种稳定数拍"),
  },
  {
    evidence: text("ending-value check", "checagem da duração final", "comprobación de la duración final", "Prüfung der Schlussdauer", "終音の長さ確認", "结尾时值核对"),
    repair: text("shortened ending", "final encurtado", "final acortado", "gekürzter Schluss", "短くなった終音", "被缩短的结尾"),
    result: text("full-value ending", "final com duração inteira", "final con duración completa", "vollständig gehaltenen Schluss", "音価どおりの終音", "完整时值的结尾"),
  },
  {
    evidence: text("turn check", "checagem da volta", "comprobación del giro", "Wendeprüfung", "折り返し確認", "转向核对"),
    repair: text("gap in the turn", "lacuna na volta", "hueco en el giro", "Lücke an der Wende", "折り返しの隙間", "转向处的空隙"),
    result: text("two clean turns", "duas voltas limpas", "dos giros limpios", "zwei sauberen Wenden", "2回の滑らかな折り返し", "两次干净转向"),
  },
  {
    evidence: text("grouping check", "checagem do agrupamento", "comprobación de la agrupación", "Gruppierungsprüfung", "グループ確認", "分组核对"),
    repair: text("accent mismatch", "desencontro de acentos", "desajuste de acentos", "abweichende Betonung", "アクセントの不一致", "重音不一致"),
    result: text("matching plain and accented takes", "tomadas neutra e acentuada coincidentes", "tomas neutra y acentuada coincidentes", "übereinstimmenden neutralen und betonten Take", "一致した平坦版と強調版", "一致的平直版与重音版"),
  },
  {
    evidence: text("overlap check", "checagem da sobreposição", "comprobación de la superposición", "Überlappungsprüfung", "重なり確認", "重叠核对"),
    repair: text("restarted group", "grupo reiniciado", "grupo reiniciado", "neu angesetzte Gruppe", "始め直したグループ", "被重新启动的分组"),
    result: text("audible overlap", "sobreposição audível", "superposición audible", "hörbaren Überlappung", "聴き取れる重なり", "清楚可听的重叠"),
  },
  {
    evidence: text("target-release check", "checagem da saída do alvo", "comprobación de la salida del objetivo", "Prüfung der Zielauflösung", "目標音の解放確認", "目标解决核对"),
    repair: text("blurred release", "saída borrada", "salida borrosa", "unklare Auflösung", "不明瞭な解放", "模糊的解决"),
    result: text("named release", "saída nomeada", "salida nombrada", "benannten Auflösung", "答えられた解放音", "能说出的解决音"),
  },
  {
    evidence: text("rest re-entry check", "checagem da volta após a pausa", "comprobación de la entrada tras el silencio", "Prüfung des Einsatzes nach der Pause", "休符後の再入確認", "休止后重入核对"),
    repair: text("crowded silence", "silêncio apertado", "silencio apretado", "verkürzte Stille", "詰まった無音", "被挤短的静默"),
    result: text("full silent gap", "espaço silencioso inteiro", "espacio silencioso completo", "vollständigen stillen Lücke", "完全な無音の間", "完整静默间隔"),
  },
  {
    evidence: text("tempo-ladder check", "checagem da escada de andamento", "comprobación de la escalera de tempo", "Prüfung der Tempoleiter", "テンポ段階の確認", "速度阶梯核对"),
    repair: text("unstable tempo rung", "degrau instável de andamento", "peldaño inestable de tempo", "instabile Tempostufe", "不安定なテンポ段階", "不稳定的速度档"),
    result: text("stable three-speed ladder", "escada estável em três velocidades", "escalera estable a tres velocidades", "stabilen Leiter mit drei Tempi", "安定した3段階テンポ", "稳定的三档速度阶梯"),
  },
  {
    evidence: text("playback check", "checagem da gravação", "comprobación de la grabación", "Wiedergabeprüfung", "再生確認", "回听核对"),
    repair: text("first playback flaw", "primeira falha da gravação", "primer fallo de la grabación", "erster Wiedergabefehler", "再生で見つけた最初の誤差", "回听发现的第一个误差"),
    result: text("one precise playback note", "uma observação precisa da gravação", "una observación precisa de la grabación", "einen genauen Wiedergabehinweis", "具体的な再生メモ一つ", "一条具体回听记录"),
  },
];

const TAP_ENGLISH_BODY_CUES = [
  { stage: "downbeat pass", evidence: "beat-one timeline", repair: "early first attack", result: "clean downbeat entry" },
  { stage: "even-attack pass", evidence: "spacing trace", repair: "uneven attack spacing", result: "eight centered attacks" },
  { stage: "two-beat hold pass", evidence: "hold-length trace", repair: "shortened hold", result: "full two-beat holds" },
  { stage: "subdivision pass", evidence: "half-beat trace", repair: "uneven half-beat gap", result: "even half-beat spacing" },
  { stage: "counted-rest pass", evidence: "rest-count timeline", repair: "early re-entry", result: "measured silent slot" },
  { stage: "silent-return pass", evidence: "return timeline", repair: "crowded return", result: "clean return after silence" },
  { stage: "offbeat pass", evidence: "offbeat timeline", repair: "filled downbeat", result: "clear offbeat placement" },
  { stage: "moving-accent pass", evidence: "accent trace", repair: "shifted attack", result: "traveling accent over fixed taps" },
  { stage: "three-tempo pass", evidence: "three-speed timeline", repair: "moved grid slot", result: "unchanged grid at three speeds" },
  { stage: "two-bar recording", evidence: "end-to-start timeline", repair: "end-of-bar drift", result: "matching first and last pulse" },
];

function unitSummary(locale, unitDefinition) {
  const summaries = UNIT_SUMMARIES[unitDefinition.slug];
  if (!summaries) throw new Error(`Missing bespoke unit summary for ${unitDefinition.slug}.`);
  return summaries[locale];
}

function ascendingDegrees(count) {
  return Array.from({ length: count + 1 }, (_, index) => index + 1).join(" ");
}

function descendingDegrees(count) {
  return Array.from({ length: count + 1 }, (_, index) => count + 1 - index).join(" ");
}

function scaleExerciseShape(unitDefinition, lessonIndex, scale) {
  const count = DEGREE_COUNTS[scale] || 7;
  const target = Math.min(count, [1, 3, 5, 6, 7][lessonIndex % 5]);
  const next = target === count ? count + 1 : target + 1;
  const base = {
    direction: "upAndDown",
    pattern: "scale",
    target,
    next,
    degreeDisplay: ascendingDegrees(count),
  };

  const ownedExercise = UNIT_EXERCISES[unitDefinition.slug]?.[lessonIndex];
  if (ownedExercise) {
    const resolved = { ...base, ...ownedExercise };
    if (ownedExercise.degrees) resolved.degreeDisplay = ownedExercise.degrees;
    return resolved;
  }

  if (unitDefinition.chromatic) {
    const lines = [
      "1 b2 2 b3 3 4 #4 5",
      "7 1 2 b3 3/2",
      "1 2 b3 3 4 #4 5/2",
      "5 #4 4 3 b3 2 b2 1/2",
      "2 b3 3/2",
      "4 3/2",
      "1 b2 2 b3 3 2 b2 1/2",
      "1 2 -/1 b3 3 4 #4 5/2",
      "1 #1 2 #2 3 4 #4 5/2",
      "5 #4 4 3 b3 2 b2 1/2",
    ];
    return { ...base, degrees: lines[lessonIndex], degreeDisplay: lines[lessonIndex] };
  }

  if (unitDefinition.wide) {
    const lines = [
      "1 4 2 5 3 6 4 7 5 8 1/2",
      "1 5 2 6 3 7 4 8",
      "8 4 7 3 6 2 5 1",
      "1 5 2 6 3 7 4 8 7 3 6 2 5 1",
      "1 3 2 4 3 5 4 6 5 7",
      "1 4 5 2 5 6 3 6 7 4 7 8",
      "8 6 7 5 6 4 5 3 4 2 3 1",
      "1 5 -/1 2 6 -/1 3 7 -/1 4 8",
      "1 4 2 5 3 6 4 7 5 8",
      "1 4 2 6 3 7 5 8 4 2 1/2",
    ];
    return {
      ...base,
      degrees: lessonIndex === 8 ? undefined : lines[lessonIndex],
      ladder: lessonIndex === 8,
      pattern: lessonIndex === 8 ? "thirds" : base.pattern,
      degreeDisplay: lines[lessonIndex],
    };
  }

  if (unitDefinition.kind === "harmony") {
    const lines = [
      "1 3 5 4 6 1/2",
      "5 4 2 1/2",
      "5 4 2 3/2",
      "2 3 4 5/2",
      "2 3/2",
      "4 3/2",
      "5 5 4 5/2",
      "1 3 5 2 4 6 5/2",
      "1 3 5 7 6 4 2 1/2",
      "1 2 3 5 4 6 5 3 2 1/2",
    ];
    return { ...base, degrees: lines[lessonIndex], degreeDisplay: lines[lessonIndex] };
  }

  if (unitDefinition.kind === "phrase") {
    const lines = [
      "1 2 -/2",
      "5 3 2 1/2",
      "1 2 3 1 1 2 3 1",
      "1 2 3 2 1 2 4 1/2",
      "1 3 -/1 2 1/2",
      "3 2 4 3 5 2 1/2",
      "1 2 3 5/2 4 3 2 1/2",
      "6 5 3 2 1 3 2 1/2",
      "1 2 3 5 3 2 4 6 5 3 2 1 1 2 3 1",
      "1 3 2 5 4 2 1 - 3 5 4 2 1 2 3 5 4 2 1 - 3 2 4 6 5 3 2 1 3 2 1 1",
    ];
    return { ...base, degrees: lines[lessonIndex], degreeDisplay: lines[lessonIndex] };
  }

  switch (lessonIndex) {
    case 0:
      return { ...base, degrees: `1 ${Math.min(5, count)} 1/2`, degreeDisplay: `1 ${Math.min(5, count)} 1` };
    case 1:
      return { ...base, direction: "ascending", degreeDisplay: ascendingDegrees(count) };
    case 2:
      return { ...base, direction: "descending", degreeDisplay: descendingDegrees(count) };
    case 3:
      return { ...base, direction: "upAndDown", degreeDisplay: `${ascendingDegrees(count)} ${descendingDegrees(count).split(" ").slice(1).join(" ")}` };
    case 4:
      return { ...base, pattern: "thirds", degreeDisplay: "1 3, 2 4, 3 5" };
    case 5:
      return { ...base, pattern: "groupsOfThree", degreeDisplay: "1 2 3, 2 3 4" };
    case 6: {
      const colorDegrees = {
        Dorian: 6,
        Phrygian: 2,
        Lydian: 4,
        Mixolydian: 7,
        Locrian: 5,
        "Natural Minor": 6,
      };
      const color = Math.min(count, colorDegrees[scale] || target);
      const release = color === count ? count + 1 : color + 1;
      return { ...base, target: color, next: release, degrees: `1 2 ${color}/2 ${release} ${color} 1/2`, degreeDisplay: `1 2 ${color} ${release} ${color} 1` };
    }
    case 7:
      return { ...base, degrees: "1 2 3 -/1 3 2 1/2", degreeDisplay: "1 2 3, rest, 3 2 1" };
    case 8:
      return { ...base, ladder: true, degreeDisplay: ascendingDegrees(count) };
    default:
      return { ...base, pattern: "groupsOfFour", degreeDisplay: "1 2 3 4, 2 3 4 5" };
  }
}

function makeContext(unitDefinition, lessonIndex) {
  if (!Array.isArray(unitDefinition.plans) || unitDefinition.plans.length !== 10) {
    throw new Error(`${unitDefinition.slug} must own exactly 10 lesson plans.`);
  }
  const plan = unitDefinition.plans[lessonIndex];
  const focusEntry = [plan.slug, plan.titles];
  const scale = plan.scale;
  const root = plan.root;
  const tempo = 58 + ((UNITS.indexOf(unitDefinition) * 7 + lessonIndex * 5) % 45);
  const shape = scaleExerciseShape(unitDefinition, lessonIndex, scale);
  const tap = unitDefinition.slug === "steady-pulse";
  return {
    unit: unitDefinition,
    lessonIndex,
    focusEntry,
    focusTitle: focusEntry[1],
    scale,
    root,
    tempo,
    slowTempo: Math.max(40, tempo - 12),
    estimatedMinutes: 5 + (lessonIndex % 4),
    shape,
    tap,
    compare: unitDefinition.kind === "ear" || unitDefinition.slug === "rhythmic-displacement" || (unitDefinition.comparisons && lessonIndex % 2 === 0),
    plan,
  };
}

function makeSummarySet(context) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, localizedSummary(locale, context)]));
}

function makeTitleSet(context) {
  return Object.fromEntries(LOCALES.map((locale) => [
    locale,
    titleFor(context.unit, context.focusEntry, locale),
  ]));
}

function actualDegreeTokens(context) {
  const source = context.shape.degrees || context.shape.degreeDisplay;
  const tokens = source
    .split(/[\s,]+/u)
    .map((event) => event.split("/")[0])
    .filter((event) => /^(?:bb|##|b|#)?\d+$/u.test(event));
  if (tokens.length < 2) return ["1", "2"];
  return [tokens[tokens.length - 2], tokens[tokens.length - 1]];
}

const TASKS = {
  scale: {
    en: [
      "Play the root, wait one beat, sing it back, and only then start the line.",
      "Give every ascending event the same length and keep the upper arrival inside the pulse.",
      "Hear the top note first, then descend without clipping the final root.",
      "Loop the last three rising events and the first three falling events until the turn has no gap.",
      "Accent the first event of each third pair once, then move the accent to the second event.",
      "Say one-two-three over each moving group and keep the overlap between groups audible.",
      "Hold the marked color event for its full value, then hear how the following event releases it.",
      "Count through the written dash and enter after it without shortening the silent beat.",
      "Use the three ladder tempos in order and stop as soon as attack or note length changes.",
      "Record the complete card without following the cursor and keep one movement plan throughout.",
    ],
    "pt-BR": [
      "Toque a tônica, espere um tempo, cante-a e só então comece a linha.",
      "Dê a mesma duração a cada evento ascendente e mantenha a chegada aguda dentro da pulsação.",
      "Ouça primeiro a nota mais aguda e depois desça sem cortar a tônica final.",
      "Repita os três últimos eventos da subida e os três primeiros da descida até eliminar a lacuna da volta.",
      "Acentue primeiro o início de cada par de terças e depois transfira o acento para o segundo evento.",
      "Diga um-dois-três em cada grupo móvel e deixe audível a sobreposição entre os grupos.",
      "Sustente o evento de cor marcado por todo o valor e escute como o evento seguinte o libera.",
      "Conte durante o traço escrito e entre depois dele sem encurtar o tempo silencioso.",
      "Use os três andamentos da escada em ordem e pare assim que o ataque ou a duração mudar.",
      "Grave o cartão completo sem seguir o cursor e mantenha o mesmo plano de movimento.",
    ],
    es: [
      "Toca la tónica, espera un pulso, cántala y solo entonces empieza la línea.",
      "Da la misma duración a cada evento ascendente y mantén la llegada aguda dentro del pulso.",
      "Escucha primero la nota más aguda y luego baja sin recortar la tónica final.",
      "Repite los tres últimos eventos de subida y los tres primeros de bajada hasta quitar el hueco del giro.",
      "Acentúa primero el inicio de cada par de terceras y después lleva el acento al segundo evento.",
      "Di uno-dos-tres sobre cada grupo móvil y deja audible el solapamiento entre los grupos.",
      "Sostén el evento de color marcado durante todo su valor y escucha cómo lo libera el siguiente evento.",
      "Cuenta durante el guion escrito y entra después sin acortar el pulso silencioso.",
      "Usa los tres tempos de la escalera en orden y detente si cambia el ataque o la duración.",
      "Graba la tarjeta completa sin seguir el cursor y conserva un solo plan de movimiento.",
    ],
    de: [
      "Spiele den Grundton, warte einen Schlag, singe ihn nach und beginne erst dann die Linie.",
      "Gib jedem aufsteigenden Ereignis dieselbe Länge und halte die obere Ankunft im Puls.",
      "Höre zuerst den höchsten Ton und steige dann ab, ohne den letzten Grundton zu kürzen.",
      "Wiederhole die letzten drei steigenden und die ersten drei fallenden Ereignisse, bis die Wende keine Lücke hat.",
      "Betone zuerst das erste Ereignis jedes Terzpaares und verschiebe den Akzent dann auf das zweite.",
      "Sprich eins-zwei-drei über jeder wandernden Gruppe und lass die Überlappung der Gruppen hörbar.",
      "Halte das markierte Farbereignis vollständig und höre, wie das folgende Ereignis es löst.",
      "Zähle durch den notierten Strich und setze danach ein, ohne den stillen Schlag zu kürzen.",
      "Nutze die drei Leiter-Tempi der Reihe nach und stoppe, sobald Anschlag oder Tonlänge sich ändern.",
      "Nimm die vollständige Karte ohne Blick auf den Cursor und mit einem Bewegungsplan auf.",
    ],
    ja: [
      "主音を弾き、1拍待って歌い返してからラインを始めます。",
      "上行する各音を同じ長さにし、最高音への到着を拍の内側に収めます。",
      "先に最高音を頭で聴き、最後の主音を短くせずに下降します。",
      "上行の最後3音と下降の最初3音を反復し、折り返しの隙間をなくします。",
      "各3度ペアの1音目を強調し、次は2音目へアクセントを移します。",
      "動く各グループで1・2・3と数え、グループ同士の重なりを聴き取ります。",
      "指定された特徴音を記譜どおり伸ばし、次の音でどう解放されるか聴きます。",
      "横線の間も数え、無音の1拍を縮めずに次の音へ入ります。",
      "3段階のテンポを順に使い、アタックや音価が変わった時点で止めます。",
      "カーソルを追わず、同じ運指計画でカード全体を録音します。",
    ],
    "zh-Hans": [
      "先弹根音，等一拍后唱回这个音，再开始整条线。",
      "让每个上行音保持同样长度，并把最高音的到达放在拍内。",
      "先在心里听到最高音，再向下弹，最后的根音不要缩短。",
      "循环上行最后三个音和下行最初三个音，直到转向处没有空隙。",
      "先重读每组三度的第一个音，再把重音移到第二个音。",
      "每个移动小组都数一二三，并听清相邻小组重叠的音。",
      "把标出的色彩音保持完整，再听后一个音如何释放它。",
      "横线期间继续数拍，在无声拍保持完整后再进入下一个音。",
      "按顺序使用三个阶梯速度，起音或时值一有变化就停下。",
      "不追随光标，用同一套动作方案录下整张卡片。",
    ],
  },
  ear: {
    en: [
      "Play A and B, hum each ending, and name the pitch that behaves like home before showing the labels.",
      "Pause before each card, sing its first pitch, then play and check the match.",
      "Alternate A and B, stop at their first difference, and name the changed scale event.",
      "Trace each contour in the air while listening, then reproduce the direction on the instrument.",
      "Sing the requested target from the root before playback and verify it against both cards.",
      "Tap each card on one pitch first, then copy its rhythm with the written notes.",
      "Stop before the final event, supply the ending yourself, and use playback only to check it.",
      "Play A, keep its degree pattern in memory, and move the same pattern to B's tonic.",
      "Hide the labels, identify A or B three times, and reveal the answer after each choice.",
      "Hear each card once, choose one, and reproduce its opening and ending without replaying it.",
    ],
    "pt-BR": [
      "Toque A e B, cantarole cada final e nomeie a altura que funciona como casa antes de mostrar os rótulos.",
      "Pause antes de cada cartão, cante a primeira altura e depois toque para conferir.",
      "Alterne A e B, pare na primeira diferença e nomeie o evento alterado da escala.",
      "Desenhe cada contorno no ar enquanto ouve e depois reproduza a direção no instrumento.",
      "Cante o alvo pedido a partir da tônica antes da reprodução e confira nos dois cartões.",
      "Bata primeiro o ritmo de cada cartão em uma altura e depois copie-o com as notas escritas.",
      "Pare antes do evento final, complete o encerramento e use a reprodução apenas para conferir.",
      "Toque A, guarde o padrão de graus e leve o mesmo padrão para a tônica de B.",
      "Oculte os rótulos, identifique A ou B três vezes e revele a resposta depois de cada escolha.",
      "Ouça cada cartão uma vez, escolha um e reproduza abertura e final sem repetir a audição.",
    ],
    es: [
      "Toca A y B, tararea cada final y nombra la altura que funciona como casa antes de mostrar las etiquetas.",
      "Haz una pausa antes de cada tarjeta, canta su primera altura y luego toca para comprobarla.",
      "Alterna A y B, detente en la primera diferencia y nombra el evento cambiado de la escala.",
      "Dibuja cada contorno en el aire mientras escuchas y luego reproduce la dirección en el instrumento.",
      "Canta el objetivo desde la tónica antes de reproducir y compruébalo con ambas tarjetas.",
      "Marca primero el ritmo de cada tarjeta en una altura y luego cópialo con las notas escritas.",
      "Detente antes del evento final, completa el cierre y usa la reproducción solo para comprobarlo.",
      "Toca A, guarda el patrón de grados y mueve el mismo patrón a la tónica de B.",
      "Oculta las etiquetas, identifica A o B tres veces y revela la respuesta después de elegir.",
      "Escucha cada tarjeta una vez, elige una y reproduce su inicio y final sin repetirla.",
    ],
    de: [
      "Spiele A und B, summe jeden Schluss und benenne vor den Etiketten den Ton, der wie Zuhause wirkt.",
      "Halte vor jeder Karte an, singe ihren ersten Ton und prüfe ihn dann beim Spielen.",
      "Wechsle zwischen A und B, stoppe beim ersten Unterschied und benenne das veränderte Skalenereignis.",
      "Zeichne beim Hören jeden Verlauf in die Luft und spiele danach seine Richtung nach.",
      "Singe den verlangten Zielton vom Grundton aus und prüfe ihn anschließend an beiden Karten.",
      "Klopfe zuerst den Rhythmus jeder Karte auf einer Tonhöhe und kopiere ihn dann mit den notierten Tönen.",
      "Stoppe vor dem letzten Ereignis, ergänze den Schluss selbst und nutze die Wiedergabe nur zur Kontrolle.",
      "Spiele A, merke dir das Stufenmuster und versetze dasselbe Muster auf den Grundton von B.",
      "Verdecke die Etiketten, bestimme dreimal A oder B und zeige die Antwort erst nach der Wahl.",
      "Höre jede Karte einmal, wähle eine und spiele Anfang und Schluss ohne weitere Wiedergabe nach.",
    ],
    ja: [
      "AとBを再生して各終止音を歌い、ラベルを見る前にホームとして働く音を答えます。",
      "各カードの前で止まり、最初の音を歌ってから再生し、一致を確かめます。",
      "AとBを交互に聴き、最初に違う音で止め、その変化を答えます。",
      "聴きながら音形を空中に描き、その方向を楽器で再現します。",
      "主音から目標音を先に歌い、両方のカードで確認します。",
      "各カードのリズムを一つの音で先にたたき、次に記譜音で写します。",
      "最後の音の前で止め、自分で終わりを補ってから再生で確認します。",
      "Aの音度パターンを記憶し、同じ並びをBの主音へ移します。",
      "ラベルを隠してAかBを3回答え、選んだ後にだけ正解を表示します。",
      "各カードを一度だけ聴き、一つ選んで冒頭と終わりを再生なしで再現します。",
    ],
    "zh-Hans": [
      "播放A和B，哼唱各自结尾，并在看标签前说出哪个音像归宿。",
      "每张卡片播放前先停下，唱出首音，再播放核对。",
      "交替播放A和B，在第一个不同音处停下，并说出变化的音阶位置。",
      "边听边用手画出旋律轮廓，再在乐器上复现方向。",
      "播放前从根音唱出指定目标，再用两张卡片核对。",
      "先用一个音拍出每张卡片的节奏，再用写出的音复制。",
      "在最后一个音前停下，自己补全结尾，再用播放核对。",
      "弹A并记住音级模式，再把同一模式移到B的根音。",
      "隐藏标签，连续三次判断A或B，每次选择后再揭晓。",
      "每张卡片只听一遍，选一张，不重播就复现开头和结尾。",
    ],
  },
  harmony: {
    en: [
      "Play the progression once, say every change aloud, and place the line's first event exactly on the new chord.",
      "Aim the final event at the root of each chord and let that landing carry the full beat.",
      "Aim the final event at each chord's third; listen for the quality before moving on.",
      "Land on the fifth with the same attack as the approach so it sounds connected, not announced.",
      "Start one scale event below the target and resolve upward on the next chord change.",
      "Start one scale event above the target and resolve downward without delaying the landing.",
      "Find one pitch shared by the first two chords and hold it through their boundary.",
      "Choose the nearest chord tone when the harmony moves and avoid resetting the line at the barline.",
      "Place one deliberate chord tone on every change across the four-chord loop.",
      "Record the whole progression and keep the target strategy unchanged from first chord to last.",
    ],
    "pt-BR": [
      "Toque a progressão uma vez, diga cada mudança e coloque o primeiro evento da linha exatamente no novo acorde.",
      "Mire o evento final na fundamental de cada acorde e sustente essa chegada pelo tempo inteiro.",
      "Mire o evento final na terça de cada acorde e ouça a qualidade antes de seguir.",
      "Chegue à quinta com o mesmo ataque da aproximação para soar ligada, não anunciada.",
      "Comece um evento da escala abaixo do alvo e resolva para cima na próxima mudança de acorde.",
      "Comece um evento acima do alvo e resolva para baixo sem atrasar a chegada.",
      "Encontre uma altura comum aos dois primeiros acordes e sustente-a através da mudança.",
      "Escolha a nota de acorde mais próxima quando a harmonia mudar e não reinicie a linha na barra.",
      "Coloque uma nota de acorde deliberada em cada mudança do ciclo de quatro acordes.",
      "Grave toda a progressão e mantenha a mesma estratégia de alvo do primeiro ao último acorde.",
    ],
    es: [
      "Toca la progresión una vez, di cada cambio y coloca el primer evento de la línea justo en el nuevo acorde.",
      "Dirige el evento final a la fundamental de cada acorde y sostén la llegada durante todo el pulso.",
      "Dirige el evento final a la tercera de cada acorde y escucha la calidad antes de seguir.",
      "Llega a la quinta con el mismo ataque de la aproximación para que suene conectada.",
      "Empieza un evento de escala debajo del objetivo y resuelve hacia arriba en el siguiente cambio.",
      "Empieza un evento por encima del objetivo y resuelve hacia abajo sin retrasar la llegada.",
      "Encuentra una altura común a los dos primeros acordes y sostenla durante el cambio.",
      "Elige la nota de acorde más cercana cuando cambie la armonía y no reinicies la línea en la barra.",
      "Coloca una nota de acorde deliberada en cada cambio del ciclo de cuatro acordes.",
      "Graba toda la progresión y conserva la misma estrategia de objetivo del primer acorde al último.",
    ],
    de: [
      "Spiele die Folge einmal, sage jeden Wechsel an und setze das erste Linienereignis genau auf den neuen Akkord.",
      "Ziele mit dem letzten Ereignis auf den Grundton jedes Akkords und halte die Landung einen ganzen Schlag.",
      "Ziele mit dem letzten Ereignis auf die Terz jedes Akkords und höre vor dem Weitergehen ihre Qualität.",
      "Lande mit demselben Anschlag der Annäherung auf der Quinte, damit sie verbunden klingt.",
      "Beginne ein Skalenereignis unter dem Ziel und löse beim nächsten Akkordwechsel aufwärts.",
      "Beginne ein Skalenereignis über dem Ziel und löse ohne verspätete Landung abwärts.",
      "Finde einen gemeinsamen Ton der ersten beiden Akkorde und halte ihn über ihre Grenze.",
      "Wähle beim Harmoniewechsel den nächsten Akkordton und starte die Linie am Taktstrich nicht neu.",
      "Setze bei jedem Wechsel der Vier-Akkord-Schleife bewusst einen Akkordton.",
      "Nimm die ganze Folge auf und behalte vom ersten bis zum letzten Akkord dieselbe Zielstrategie.",
    ],
    ja: [
      "進行を一度再生し、各コード変化を声で言い、新しいコードと同時にラインの最初の音を置きます。",
      "各コードのルートへ最後の音を狙い、その着地を1拍分保ちます。",
      "各コードの3度へ最後の音を狙い、次へ進む前にコードの性格を聴きます。",
      "アプローチと同じアタックで5度へ着地し、別の音ではなく接続として響かせます。",
      "目標の一つ下のスケール音から始め、次のコード変化で上へ解決します。",
      "目標の一つ上から始め、着地を遅らせず下へ解決します。",
      "最初の2コードに共通する音を一つ探し、境目をまたいで保ちます。",
      "和声が動くたび最も近いコードトーンを選び、小節線でラインをリセットしません。",
      "4コードの各変化に、意図したコードトーンを一つずつ置きます。",
      "進行全体を録音し、最初から最後まで同じ目標設定を保ちます。",
    ],
    "zh-Hans": [
      "先播放一遍和弦进行，说出每次变化，并让线条首音准确落在新和弦上。",
      "把每个和弦的根音作为最后目标，并让落点保持完整一拍。",
      "把每个和弦的三音作为最后目标，移动前先听清和弦性质。",
      "用与接近音相同的起音落在五音，让它听起来连贯而非突兀。",
      "从目标下方一个音阶位置开始，在下次和弦变化时向上解决。",
      "从目标上方一个音阶位置开始，向下解决时不要延误落点。",
      "找出前两个和弦的共同音，并跨过边界保持它。",
      "和声移动时选择最近的和弦音，不要在小节线重新开始乐句。",
      "四和弦循环的每次变化都放入一个明确选择的和弦音。",
      "录下整个进行，从第一个和弦到最后一个和弦保持同一目标策略。",
    ],
  },
  phrase: {
    en: [
      "Use the first two written events as a question and stop it away from the tonic.",
      "Answer the opening with the remaining events and make the final tonic sound intentional.",
      "Keep one rhythm for three repetitions while changing only the pitch contour.",
      "Repeat the opening exactly and change only the final two written events.",
      "Protect the full written rest; keep counting and let the next event enter from silence.",
      "Begin away from the tonic and withhold the root until the final part of the line.",
      "Choose one highest event, play it only once, and shape every earlier event toward it.",
      "Repeat the answer in a lower register while preserving its rhythm and direction.",
      "Use four bars as statement, repeat, answer, and ending; do not add material between them.",
      "Build eight bars from the written cell and bring its opening back in the final bar.",
    ],
    "pt-BR": [
      "Use os dois primeiros eventos escritos como pergunta e pare longe da tônica.",
      "Responda à abertura com os eventos restantes e faça a tônica final soar intencional.",
      "Mantenha um ritmo por três repetições e mude apenas o contorno das alturas.",
      "Repita a abertura exatamente e mude apenas os dois eventos finais.",
      "Proteja toda a pausa escrita, continue contando e deixe o próximo evento nascer do silêncio.",
      "Comece longe da tônica e reserve a fundamental para a parte final da linha.",
      "Escolha um único ponto agudo, toque-o uma vez e conduza até ele todos os eventos anteriores.",
      "Repita a resposta em registro mais grave, preservando ritmo e direção.",
      "Use quatro compassos como afirmação, repetição, resposta e final, sem material extra.",
      "Construa oito compassos com a célula escrita e recupere a abertura no último compasso.",
    ],
    es: [
      "Usa los dos primeros eventos escritos como pregunta y detenla lejos de la tónica.",
      "Responde a la apertura con los eventos restantes y haz intencional la tónica final.",
      "Mantén un ritmo durante tres repeticiones y cambia solo el contorno de alturas.",
      "Repite la apertura exactamente y cambia solo los dos eventos finales.",
      "Protege todo el silencio escrito, sigue contando y deja que el siguiente evento nazca del silencio.",
      "Empieza lejos de la tónica y reserva la fundamental para la parte final de la línea.",
      "Elige un solo punto agudo, tócalo una vez y dirige hacia él todos los eventos anteriores.",
      "Repite la respuesta en un registro más grave conservando ritmo y dirección.",
      "Usa cuatro compases como exposición, repetición, respuesta y final, sin añadir material.",
      "Construye ocho compases con la célula escrita y recupera la apertura en el último compás.",
    ],
    de: [
      "Nutze die ersten beiden notierten Ereignisse als Frage und beende sie fern vom Grundton.",
      "Beantworte den Anfang mit den übrigen Ereignissen und lass den letzten Grundton beabsichtigt klingen.",
      "Behalte für drei Wiederholungen einen Rhythmus und ändere nur den Tonhöhenverlauf.",
      "Wiederhole den Anfang genau und ändere nur die letzten beiden notierten Ereignisse.",
      "Schütze die ganze notierte Pause, zähle weiter und lass das nächste Ereignis aus der Stille kommen.",
      "Beginne fern vom Grundton und spare ihn bis zum letzten Teil der Linie auf.",
      "Wähle ein einziges höchstes Ereignis, spiele es einmal und führe alles davor darauf zu.",
      "Wiederhole die Antwort in tieferer Lage und erhalte Rhythmus und Richtung.",
      "Nutze vier Takte als Aussage, Wiederholung, Antwort und Schluss, ohne zusätzliches Material.",
      "Baue acht Takte aus der notierten Zelle und bringe ihren Anfang im letzten Takt zurück.",
    ],
    ja: [
      "最初の2音を問いとして使い、主音以外で止めます。",
      "残りの音で冒頭へ答え、最後の主音を意図した着地として響かせます。",
      "3回の反復でリズムを保ち、音高の輪郭だけを変えます。",
      "冒頭を正確に反復し、最後の2音だけを変えます。",
      "記譜された休符を完全に保ち、数え続けて無音から次の音へ入ります。",
      "主音以外から始め、ライン後半までルートを出しません。",
      "最高音を一つだけ選び、一度だけ弾き、それ以前の音をそこへ向けます。",
      "リズムと方向を保ったまま、低い音域で答えを反復します。",
      "4小節を提示、反復、応答、終止に分け、間に素材を足しません。",
      "記譜されたセルから8小節を作り、最後の小節で冒頭を戻します。",
    ],
    "zh-Hans": [
      "把写出的前两个音当作提问，并停在根音之外。",
      "用其余音回答开头，让最后的根音听起来是有意落点。",
      "三次重复保持同一节奏，只改变音高轮廓。",
      "准确重复开头，只改变最后两个写出的音。",
      "保留完整休止，继续数拍，让下一个音从静默中进入。",
      "从根音之外开始，直到线条后半段才给出根音。",
      "只选一个最高音并只弹一次，让此前所有音都朝它推进。",
      "在更低音区重复回答，同时保持节奏和方向。",
      "四小节依次作为陈述、重复、回答和结尾，中间不添加材料。",
      "用写出的动机构建八小节，并在最后一小节带回开头。",
    ],
  },
};

const TAP_TASKS = [
  text("After the count-in, place the first x exactly on beat one; do not add a pickup.", "Após a contagem, coloque o primeiro x exatamente no primeiro tempo; não acrescente anacruse.", "Tras la cuenta, coloca la primera x exactamente en el primer pulso; no añadas anacrusa.", "Setze nach dem Einzähler das erste x genau auf die Eins; füge keinen Auftakt hinzu.", "カウントイン後、最初のxを1拍目に正確に置き、アウフタクトを足しません。", "预备拍后把第一个x准确放在第一拍，不要添加弱起。"),
  text("Tap all eight x positions with equal spacing and weight; keep the last tap centered and add no accent.", "Bata os oito x com espaçamento e peso iguais; centralize o último toque e não acrescente acento.", "Golpea las ocho x con separación y peso iguales; centra el último golpe y no añadas acento.", "Klopfe alle acht x mit gleichem Abstand und Gewicht; setze den letzten Treffer mittig und ohne Akzent.", "8つのxを同じ間隔と強さでたたき、最後も中央に置いてアクセントを足しません。", "八个x保持相同间距与力度，最后一下落在拍点中央，不额外加重音。"),
  text("Give every x and following silent span its full two-beat value; keep counting through both.", "Dê a cada x e ao silêncio seguinte dois tempos inteiros; continue contando nos dois.", "Da a cada x y al silencio siguiente dos pulsos completos; sigue contando en ambos.", "Gib jedem x und der folgenden Stille volle zwei Schläge; zähle durch beides hindurch.", "各xと続く無音を2拍分保ち、どちらの間も数え続けます。", "每个x及其后的静默都保持完整两拍，全程继续数拍。"),
  text("Place each x on an exact half-beat subdivision and keep all eight gaps equal.", "Coloque cada x numa subdivisão exata de meio tempo e iguale os oito espaços.", "Coloca cada x en una subdivisión exacta de medio pulso e iguala los ocho espacios.", "Setze jedes x auf eine genaue halbe Unterteilung und halte alle acht Abstände gleich.", "各xを正確な半拍に置き、8つの間隔を均等に保ちます。", "把每个x放在准确的半拍细分上，八个间隔保持相等。"),
  text("Count every dash aloud while the hand keeps moving; the next x must not arrive early.", "Conte cada traço em voz alta sem parar a mão; o x seguinte não pode chegar cedo.", "Cuenta cada guion en voz alta sin detener la mano; la siguiente x no debe adelantarse.", "Zähle jeden Strich laut bei weiterlaufender Hand; das nächste x darf nicht zu früh kommen.", "横線を声で数えながら手を動かし、次のxを早く入れません。", "每条横线都大声数拍并保持手部运动，下一个x不得提前。"),
  text("Keep moving through both long silences and return on the written x without crowding the previous slot.", "Continue o movimento nas duas pausas longas e volte no x escrito sem apertar o espaço anterior.", "Sigue moviéndote durante los dos silencios largos y vuelve en la x escrita sin comprimir el espacio anterior.", "Bewege dich durch beide langen Pausen weiter und kehre beim notierten x zurück, ohne den vorigen Platz zu verkürzen.", "2つの長い無音でも動きを保ち、前の枠を縮めず記譜xへ戻ります。", "经过两处长静默时继续运动，在写出的x处返回，不挤短前一格。"),
  text("Count the downbeats silently and tap only the offbeat x positions; keep every empty downbeat clear.", "Conte os tempos fortes em silêncio e bata apenas os x no contratempo; deixe vazio cada tempo forte.", "Cuenta en silencio los pulsos fuertes y golpea solo las x a contratiempo; deja vacío cada pulso fuerte.", "Zähle die Hauptschläge still und klopfe nur die Offbeat-x; jeder leere Hauptschlag bleibt frei.", "表拍を内側で数え、裏拍のxだけをたたき、空の表拍を保ちます。", "默数正拍，只点击反拍x，每个空正拍都保持安静。"),
  text("Repeat the grid four times and move one audible accent to the next x on each repeat; do not move the taps.", "Repita a grade quatro vezes e leve um acento audível ao x seguinte; não desloque os toques.", "Repite la cuadrícula cuatro veces y mueve un acento audible a la siguiente x; no desplaces los golpes.", "Wiederhole das Raster viermal und verschiebe einen hörbaren Akzent zum nächsten x; verschiebe die Treffer nicht.", "グリッドを4回反復し、打点は動かさずアクセントだけを次のxへ移します。", "网格重复四次，点击位置不动，每次只把可听重音移到下一个x。"),
  text("Use the same grid at all three written tempos; stop if any attack or rest changes position.", "Use a mesma grade nos três andamentos escritos; pare se algum ataque ou pausa mudar de lugar.", "Usa la misma cuadrícula en los tres tempos escritos; detente si cambia de lugar un ataque o silencio.", "Nutze dasselbe Raster bei allen drei notierten Tempi; stoppe, wenn Anschlag oder Pause die Position wechselt.", "同じグリッドを3つのテンポで使い、打点か休符の位置が変わったら止めます。", "三个写出速度都使用同一网格，任何起音或休止移位就停下。"),
  text("Record two complete bars with one continuous hand motion; the final x must occupy the same pulse position as the first.", "Grave dois compassos completos com movimento contínuo da mão; o x final deve ocupar a mesma posição do primeiro.", "Graba dos compases completos con movimiento continuo; la última x debe ocupar la misma posición de pulso que la primera.", "Nimm zwei ganze Takte mit durchgehender Handbewegung auf; das letzte x liegt an derselben Pulsstelle wie das erste.", "手の動きを止めず2小節録音し、最後のxを最初と同じ拍位置に置きます。", "保持手部连续运动录下两小节，最后一个x与第一个处于相同拍位。"),
];

const OWNED_TASKS = {
  "whole-and-half-steps": [
    null, null, null, null, null,
    text("Copy A's exact rhythm into B while changing only the written step sequence; then name whole-whole-half.", "Copie em B o ritmo exato de A mudando apenas a sequência de passos; depois diga tom-tom-semitom.", "Copia en B el ritmo exacto de A cambiando solo la secuencia de pasos; después di tono-tono-semitono.", "Übertrage As genauen Rhythmus auf B und ändere nur die Schrittfolge; nenne danach Ganz-Ganz-Halb.", "Aの正確なリズムをBへ写し、音程順だけを変えて全・全・半と答えます。", "把A的准确节奏复制到B，只改变音程顺序，再说出全全半。"),
    null,
    text("Hear A's complete step cell, then supply the final omitted half step in B by ear before replaying it.", "Ouça a célula completa de A e complete em B o semitom final omitido antes de repetir.", "Escucha la célula completa de A y completa en B el semitono final omitido antes de repetir.", "Höre As vollständige Schrittzelle und ergänze vor der Wiederholung Bs ausgelassenen letzten Halbton.", "Aの完全な音程セルを聴き、Bで省かれた最後の半音を再生前に補います。", "听完A的完整音程单元，在重播前补上B省略的最后半音。"),
    text("Memorize A in C, then reproduce the same step order and rhythm from G in B; change only the starting pitch.", "Memorize A em dó e reproduza em B a mesma ordem de passos e ritmo a partir de sol; mude apenas o início.", "Memoriza A en do y reproduce en B el mismo orden de pasos y ritmo desde sol; cambia solo el inicio.", "Merke A in C und spiele in B dieselbe Schrittfolge und denselben Rhythmus ab G; ändere nur den Startton.", "CのAを覚え、開始音だけGへ変えて同じ音程順とリズムをBで再現します。", "记住C上的A，只把起点改为G，在B中复现相同音程顺序与节奏。"),
  ],
  "melodic-minor-map": [
    text("Compare C melodic minor with C natural minor and isolate the raised sixth and seventh.", "Compare dó menor melódica com dó menor natural e isole a sexta e a sétima elevadas.", "Compara do menor melódica con do menor natural y aísla la sexta y la séptima elevadas.", "Vergleiche C melodisch Moll mit C natürlich Moll und isoliere erhöhte Sexte und Septime.", "CメロディックマイナーとCナチュラルマイナーを比べ、上げた6度と7度を分離します。", "比较C旋律小调与C自然小调，单独听升高的六级和七级。"),
    text("Compare D Dorian flat two with D Dorian and sing the lowered second before replay.", "Compare ré dórica com segunda bemol com ré dórica e cante a segunda rebaixada antes de repetir.", "Compara re dórica con segunda bemol con re dórica y canta la segunda rebajada antes de repetir.", "Vergleiche D Dorisch mit kleiner Sekunde mit D Dorisch und singe vor der Wiederholung die erniedrigte Sekunde.", "Dドリアン♭2とDドリアンを比べ、再生前に下がった2度を歌います。", "比较D多利亚降二级与D多利亚，重播前唱出降低的二级。"),
    text("Compare Eb Lydian augmented with Eb Lydian and identify the raised fifth.", "Compare mi bemol lídia aumentada com mi bemol lídia e identifique a quinta elevada.", "Compara mi bemol lidia aumentada con mi bemol lidia e identifica la quinta aumentada.", "Vergleiche Es Lydisch übermäßig mit Es Lydisch und bestimme die erhöhte Quinte.", "E♭リディアンオーギュメンテッドとE♭リディアンを比べ、上がった5度を答えます。", "比较E♭增利底亚与E♭利底亚，说出升高的五级。"),
    text("Compare F Lydian dominant with F Mixolydian and isolate the raised fourth while flat seven stays fixed.", "Compare fá lídia dominante com fá mixolídia e isole a quarta elevada mantendo a sétima bemol.", "Compara fa lidia dominante con fa mixolidia y aísla la cuarta aumentada manteniendo la séptima bemol.", "Vergleiche F Lydisch dominant mit F Mixolydisch und isoliere die erhöhte Quarte bei gleicher kleiner Septime.", "FリディアンドミナントとFミクソリディアンを比べ、♭7を保ったまま♯4を分離します。", "比较F利底亚属调式与F混合利底亚，在降七级不变时单独听升四级。"),
    text("Compare G Mixolydian flat six with G Mixolydian and identify the lowered sixth before either card is replayed.", "Compare sol mixolídia com sexta bemol com sol mixolídia e identifique a sexta rebaixada.", "Compara sol mixolidia con sexta bemol con sol mixolidia e identifica la sexta rebajada.", "Vergleiche G Mixolydisch mit kleiner Sexte mit G Mixolydisch und bestimme die erniedrigte Sexte.", "Gミクソリディアン♭6とGミクソリディアンを比べ、下がった6度を答えます。", "比较G混合利底亚降六级与G混合利底亚，说出降低的六级。"),
    text("Compare A Locrian natural two with A Locrian and identify the natural second.", "Compare lá lócria com segunda natural com lá lócria e identifique a segunda natural.", "Compara la locria con segunda natural con la locria e identifica la segunda natural.", "Vergleiche A Lokrisch mit großer Sekunde mit A Lokrisch und bestimme die natürliche Sekunde.", "Aロクリアン♮2とAロクリアンを比べ、ナチュラル2度を答えます。", "比较A洛克里亚还原二级与A洛克里亚，说出还原二级。"),
    text("Hear the complete B altered line in A, then fill B's omitted final B before checking playback.", "Ouça em A a linha completa de si alterada e complete em B o si final omitido antes de conferir.", "Escucha en A la línea completa de si alterada y completa en B el si final omitido antes de comprobar.", "Höre in A die ganze Linie in B alteriert und ergänze vor der Kontrolle Bs ausgelassenes Schluss-B.", "AでBオルタードの全ラインを聴き、再生確認前にBで省かれた最後のBを補います。", "先听A中的完整B变化音阶线，再补上B中省略的末尾B并核对。"),
    text("Memorize A in C melodic minor, then move the same degrees and rhythm to D melodic minor in B.", "Memorize A em dó menor melódica e leve os mesmos graus e ritmo para ré menor melódica em B.", "Memoriza A en do menor melódica y lleva los mismos grados y ritmo a re menor melódica en B.", "Merke A in C melodisch Moll und übertrage dieselben Stufen und denselben Rhythmus in B nach D melodisch Moll.", "CメロディックマイナーのAを覚え、同じ音度とリズムをBのDメロディックマイナーへ移します。", "记住A中的C旋律小调，再把相同音级与节奏移到B中的D旋律小调。"),
    text("Hide the screen, play A's B altered tension into B's sustained C destination, and name where the resolution becomes audible.", "Oculte a tela, leve a tensão de si alterada em A ao dó sustentado de B e diga onde a resolução aparece.", "Oculta la pantalla, lleva la tensión de si alterada de A al do sostenido de B y di dónde se oye la resolución.", "Verdecke den Bildschirm, führe As Spannung in B alteriert zu Bs gehaltenem C und nenne den hörbaren Auflösungspunkt.", "画面を隠し、AのBオルタードの緊張をBの持続するCへ進め、解決が聴こえる位置を答えます。", "遮住屏幕，把A的B变化音阶张力引到B持续的C，并说出解决开始可听的位置。"),
    text("Hear A and B once, then reproduce C melodic minor and B altered without replay; name their shared parent pitch collection.", "Ouça A e B uma vez e reproduza dó menor melódica e si alterada sem repetir; nomeie a coleção comum.", "Escucha A y B una vez y reproduce do menor melódica y si alterada sin repetir; nombra la colección común.", "Höre A und B einmal, reproduziere C melodisch Moll und B alteriert ohne Wiederholung und nenne ihren gemeinsamen Tonvorrat.", "AとBを一度だけ聴き、再生せずCメロディックマイナーとBオルタードを再現し、共通音集合を答えます。", "A、B只听一遍，不重播就复现C旋律小调与B变化音阶，并说出共同母音集。"),
  ],
  "symmetric-scales": [
    text("Repeat the first pitch only at the end to create a temporary reference; do not treat it as an intrinsic tonic.", "Repita a primeira altura somente no fim para criar uma referência temporária; não a trate como tônica intrínseca.", "Repite la primera altura solo al final para crear una referencia temporal; no la trates como tónica intrínseca.", "Wiederhole den ersten Ton nur am Schluss als vorläufige Referenz; behandle ihn nicht als inneren Grundton.", "最初の音を終わりでだけ反復して一時的な基準を作り、固有の主音とは扱いません。", "只在结尾重复首音以建立临时参照，不要把它当作音阶内在主音。"),
    null, null, null, null, null,
    text("Play degrees one-three-five, then two-four-six; hear two augmented triads joined by the same whole-step symmetry.", "Toque os graus um-três-cinco e depois dois-quatro-seis; ouça duas tríades aumentadas ligadas pela mesma simetria de tons.", "Toca los grados uno-tres-cinco y después dos-cuatro-seis; escucha dos tríadas aumentadas unidas por la misma simetría de tonos.", "Spiele Stufe eins-drei-fünf, dann zwei-vier-sechs; höre zwei übermäßige Dreiklänge in derselben Ganzton-Symmetrie.", "1・3・5度、次に2・4・6度を弾き、同じ全音対称性で結ばれた2つの増三和音を聴きます。", "先弹一三五级，再弹二四六级，听出由同一全音对称关系连接的两个增三和弦。"),
  ],
  "chromatic-approaches": [
    null,
    text("Place degrees one, four, five, and one on the I–IV–V–I boundaries; keep each approach on the preceding beat.", "Coloque os graus um, quatro, cinco e um nas fronteiras I–IV–V–I; mantenha cada aproximação no tempo anterior.", "Coloca los grados uno, cuatro, cinco y uno en los límites I–IV–V–I; deja cada aproximación en el pulso anterior.", "Setze Stufe eins, vier, fünf und eins auf die Grenzen I–IV–V–I; jede Annäherung liegt auf dem vorigen Schlag.", "I–IV–V–Iの境界に1・4・5・1度を置き、各アプローチを直前の拍に置きます。", "把一、四、五、一级放在I–IV–V–I边界，每个接近音留在前一拍。"),
    null, null,
    text("Put a non-diatonic note one semitone below each chord-tone target and resolve upward exactly on the change.", "Coloque uma nota não diatônica um semitom abaixo de cada nota-alvo do acorde e resolva para cima na mudança.", "Coloca una nota no diatónica un semitono debajo de cada nota objetivo del acorde y resuelve hacia arriba en el cambio.", "Setze einen nicht-diatonischen Halbton unter jeden Akkordzielton und löse genau am Wechsel aufwärts.", "各コードトーン目標の半音下に非ダイアトニック音を置き、変化と同時に上へ解決します。", "在每个和弦目标音下方放一个非调内半音，并在切换点准确向上解决。"),
  ],
  "distinct-pitch-collections": [
    null, null, null, null, null, null,
    text("Hear A's complete C Neapolitan-minor line, then supply B's omitted final C before checking playback.", "Ouça a linha completa de dó menor napolitana em A e complete o dó final omitido em B antes de conferir.", "Escucha la línea completa de do menor napolitana en A y completa el do final omitido en B antes de comprobar.", "Höre As ganze Linie in C neapolitanisch Moll und ergänze vor der Kontrolle Bs ausgelassenes Schluss-C.", "AのCナポリタンマイナー全体を聴き、再生確認前にBで省かれた最後のCを補います。", "先听A的完整C那不勒斯小调线，再补上B省略的末尾C并核对。"),
    text("Memorize A in D Prometheus, then transpose the same degrees, contour, and rhythm to E Prometheus in B.", "Memorize A em ré Prometheus e transponha os mesmos graus, contorno e ritmo para mi Prometheus em B.", "Memoriza A en re Prometheus y transporta los mismos grados, contorno y ritmo a mi Prometheus en B.", "Merke A in D Prometheus und übertrage dieselben Stufen, denselben Verlauf und Rhythmus in B nach E Prometheus.", "DプロメテウスのAを覚え、同じ音度、輪郭、リズムをBのEプロメテウスへ移します。", "记住A中的D普罗米修斯，把相同音级、轮廓与节奏移到B中的E普罗米修斯。"),
    text("Hide the labels, identify E Hirajoshi against E Iwato, and name the interval clue before replay.", "Oculte os rótulos, identifique mi Hirajoshi contra mi Iwato e diga a pista intervalar antes de repetir.", "Oculta las etiquetas, identifica mi Hirajoshi frente a mi Iwato y di la pista interválica antes de repetir.", "Verdecke die Etiketten, erkenne E Hirajoshi gegen E Iwato und nenne vor der Wiederholung den Intervallhinweis.", "ラベルを隠し、E平調子をE岩戸と判別して、再生前に音程の手掛かりを答えます。", "遮住标签，在E Hirajoshi与E Iwato之间辨认，并在重播前说出音程线索。"),
    text("Hear F Iwato once, cover the labels, reproduce it from memory, and use F Kumoi only as the final check.", "Ouça fá Iwato uma vez, cubra os rótulos, reproduza de memória e use fá Kumoi apenas como conferência final.", "Escucha fa Iwato una vez, tapa las etiquetas, reprodúcelo de memoria y usa fa Kumoi solo como comprobación final.", "Höre F Iwato einmal, verdecke die Etiketten, spiele es aus dem Gedächtnis und nutze F Kumoi erst zur Endkontrolle.", "F岩戸を一度聴き、ラベルを隠して記憶から再現し、F雲井は最後の確認だけに使います。", "F Iwato只听一遍，遮住标签后凭记忆复现，最后才用F Kumoi核对。"),
  ],
  "sequence-workshop": [
    null, null, null,
    text("Play 1–2–3–4–3–2, then 2–3–4–5–4–3; keep 4–3 and 5–4 in time without pausing or accenting either peak at the join.", "Toque 1–2–3–4–3–2 e depois 2–3–4–5–4–3; mantenha 4–3 e 5–4 no tempo, sem pausa nem acento nos picos.", "Toca 1–2–3–4–3–2 y después 2–3–4–5–4–3; mantén 4–3 y 5–4 a tiempo, sin pausa ni acento en los picos.", "Spiele 1–2–3–4–3–2, dann 2–3–4–5–4–3; halte 4–3 und 5–4 im Puls, ohne Pause oder Gipfelakzent.", "1–2–3–4–3–2、次に2–3–4–5–4–3を弾き、4–3と5–4で止まったり頂点を強調したりしません。", "先弹1–2–3–4–3–2，再弹2–3–4–5–4–3；4–3与5–4保持拍内，不停顿也不强调高点。"),
  ],
};

const ENGLISH_COMPARISON_TASKS = {
  "three-minor-colors": [
    "Use A natural minor as the reference, then sing B's raised seventh and describe how it changes the return to the tonic.",
    "Alternate the written five-seven-one cell in natural and harmonic minor; point to the seventh that gives B its stronger pull home.",
    "Keep the rhythm fixed while natural minor becomes melodic minor, then sing the raised sixth and seventh before replaying either card.",
    "Run both descending cards from tonic to tonic and identify the seventh that separates natural minor from harmonic minor.",
    "Hold the long sixth and final tonic for their full values, then name whether A or B carries melodic minor's brighter upper notes.",
    "Hear the quick fifth-to-sixth pickup in both cards, then choose the sixth that distinguishes harmonic minor from melodic minor.",
    "Sustain each sixth before seven, compare its height in A and B, and name which card uses melodic minor.",
    "Listen through every seven-to-one resolution, then identify the card whose raised seventh creates the tighter pull to the tonic.",
    "Cover the labels for the full ascending-and-descending line; choose natural or melodic minor and cite both changed degrees.",
    "Compare the complete harmonic- and melodic-minor phrases, then choose which sixth gives the written line the color you intended.",
  ],
  "modes-by-color-note": [
    "Hold the tonic steady while A Dorian and B natural minor alternate; sing the sixth that keeps Dorian brighter.",
    "Compare the opening four degrees of Phrygian and natural minor, then sing the lowered second before either label returns.",
    "Loop three-four-five in Lydian and major; name the raised fourth that makes A sound open rather than settled.",
    "Follow five-six-seven-one in Mixolydian and major, then identify the lowered seventh before replaying the full cards.",
    "Use natural minor as A and Dorian as B; hold the sixth long enough to hear which card carries the darker color.",
    "Alternate Locrian with Phrygian over the same tonic, then sing the lowered fifth that removes Locrian's stable fifth.",
    "Play the full Dorian and natural-minor arches with labels covered; choose the mode from the sixth alone.",
    "Keep the three-four-five arch identical in Lydian and major, then identify the sharp fourth at both crossings.",
    "Compare the descending Mixolydian and major turns, and use the lowered seventh to name A before checking the labels.",
    "Hear Phrygian and Locrian through degree five, then name the mode by deciding whether that fifth is perfect or lowered.",
  ],
};

function taskInstruction(locale, context) {
  if (context.tap) return TAP_TASKS[context.lessonIndex][locale];
  const ownedTask = OWNED_TASKS[context.unit.slug]?.[context.lessonIndex];
  if (ownedTask) return ownedTask[locale];
  const englishComparisonTask = ENGLISH_COMPARISON_TASKS[context.unit.slug]?.[context.lessonIndex];
  if (locale === "en" && englishComparisonTask) return englishComparisonTask;
  const focus = context.plan.goalText[locale];
  const special = {
    "whole-and-half-steps": {
      en: `Keep the lower note and rhythm fixed, alternate A with B, and judge only “${focus}”; say half step or whole step before replay.`,
      "pt-BR": `Mantenha a nota grave e o ritmo, alterne A com B e julgue apenas “${focus}”; diga semitom ou tom antes de repetir.`,
      es: `Mantén la nota grave y el ritmo, alterna A con B y juzga solo “${focus}”; di semitono o tono antes de repetir.`,
      de: `Halte unteren Ton und Rhythmus fest, wechsle A mit B und beurteile nur „${focus}“; nenne Halb- oder Ganzton vor der Wiederholung.`,
      ja: `低音とリズムを固定してAとBを交互に鳴らし、「${focus}」だけを判定して、再生前に半音か全音か答えます。`,
      "zh-Hans": `固定低音和节奏，交替播放A、B，只判断“${focus}”；重播前先说半音或全音。`,
    },
    "interval-landmarks": {
      en: `Use C as the fixed lower note, sing A's upper note, then choose the interval named by “${focus}” before checking B.`,
      "pt-BR": `Use dó como nota grave fixa, cante a nota aguda de A e escolha o intervalo de “${focus}” antes de conferir B.`,
      es: `Usa do como nota grave fija, canta la nota aguda de A y elige el intervalo de “${focus}” antes de comprobar B.`,
      de: `Nutze C als festen unteren Ton, singe den oberen Ton von A und wähle vor B das Intervall aus „${focus}“.`,
      ja: `Cを固定した低音にし、Aの上音を歌ってから、「${focus}」の音程を答え、Bで確認します。`,
      "zh-Hans": `以C为固定低音，先唱A的上方音，再回答“${focus}”所指音程，最后用B核对。`,
    },
    "move-one-idea": {
      en: `Memorize A's degrees, durations, and rests; begin on B's tonic and complete “${focus}” without changing any part of the motif.`,
      "pt-BR": `Memorize graus, durações e pausas de A; comece na tônica de B e faça “${focus}” sem alterar nenhuma parte do motivo.`,
      es: `Memoriza grados, duraciones y silencios de A; empieza en la tónica de B y haz “${focus}” sin cambiar ninguna parte del motivo.`,
      de: `Merke Stufen, Dauern und Pausen von A; beginne auf dem Grundton von B und führe „${focus}“ ohne Motivänderung aus.`,
      ja: `Aの音度、音価、休符を覚え、Bの主音から始めて、動機を一つも変えずに「${focus}」を行います。`,
      "zh-Hans": `记住A的音级、时值与休止；从B的主音开始，不改动机任何部分，完成“${focus}”。`,
    },
    "three-minor-colors": {
      en: `Hold the tonic and rhythm constant, compare A with B through degrees six and seven, and name which minor color proves “${focus}.”`,
      "pt-BR": `Mantenha tônica e ritmo, compare A com B pelos graus seis e sete e nomeie qual cor menor comprova “${focus}”.`,
      es: `Mantén tónica y ritmo, compara A con B por los grados seis y siete y nombra qué color menor demuestra “${focus}”.`,
      de: `Halte Grundton und Rhythmus fest, vergleiche A mit B über Stufe sechs und sieben und nenne die Mollfarbe zu „${focus}“.`,
      ja: `主音とリズムを固定し、6度と7度でAとBを比べ、「${focus}」を示すマイナーの種類を答えます。`,
      "zh-Hans": `保持主音和节奏不变，通过六级、七级比较A与B，说出哪种小调色彩证明“${focus}”。`,
    },
    "modes-by-color-note": {
      en: `Alternate A and B on one tonic with identical rhythm, sing the first differing degree, and use that color note to prove “${focus}.”`,
      "pt-BR": `Alterne A e B na mesma tônica e com o mesmo ritmo, cante o primeiro grau diferente e use essa nota de cor para provar “${focus}”.`,
      es: `Alterna A y B sobre una tónica y con el mismo ritmo, canta el primer grado distinto y usa esa nota de color para demostrar “${focus}”.`,
      de: `Wechsle A und B bei gleichem Grundton und Rhythmus, singe die erste abweichende Stufe und belege damit „${focus}“.`,
      ja: `同じ主音とリズムでAとBを交互に鳴らし、最初に異なる音度を歌って、その特徴音で「${focus}」を確かめます。`,
      "zh-Hans": `用同一主音和节奏交替播放A、B，唱出第一个不同音级，用这个色彩音证明“${focus}”。`,
    },
    "melodic-minor-map": {
      en: `Keep A and B on the written root with matching rhythm, locate their defining alteration, and identify the mode required by “${focus}.”`,
      "pt-BR": `Mantenha A e B na tônica escrita e com o mesmo ritmo, localize a alteração característica e identifique o modo de “${focus}”.`,
      es: `Mantén A y B en la raíz escrita y con el mismo ritmo, localiza la alteración característica e identifica el modo de “${focus}”.`,
      de: `Halte A und B auf dem notierten Grundton bei gleichem Rhythmus, finde die Kennstufe und bestimme den Modus aus „${focus}“.`,
      ja: `AとBを記譜された主音と同じリズムに保ち、特徴となる変化音を探して、「${focus}」のモードを答えます。`,
      "zh-Hans": `让A、B保持写出的主音和相同节奏，找出决定性的变化音，并辨认“${focus}”要求的调式。`,
    },
    "distinct-pitch-collections": {
      en: `Use the same root, contour, and rhythm for A and B, name the collection and one interval clue that supports “${focus},” and treat Pelog playback as equal-tempered.`,
      "pt-BR": `Use a mesma tônica, contorno e ritmo em A e B, nomeie a coleção e uma pista intervalar para “${focus}” e trate Pelog como aproximação temperada.`,
      es: `Usa la misma raíz, contorno y ritmo en A y B, nombra la colección y una pista interválica para “${focus}” y trata Pelog como aproximación temperada.`,
      de: `Nutze für A und B denselben Grundton, Verlauf und Rhythmus, nenne Tonsammlung und Intervallhinweis zu „${focus}“ und behandle Pelog als gleichstufige Annäherung.`,
      ja: `AとBで主音、輪郭、リズムをそろえ、音集合と「${focus}」を裏付ける音程を答え、Pelogは平均律による近似として扱います。`,
      "zh-Hans": `A、B使用相同主音、轮廓和节奏，说出音集名称及支持“${focus}”的一个音程线索，并把Pelog视为十二平均律近似。`,
    },
    "rhythmic-displacement": {
      en: `Play A, then keep every pitch and duration while moving only B's entry point; clap the new accent that makes “${focus}” audible.`,
      "pt-BR": `Toque A e mantenha alturas e durações ao mover apenas a entrada de B; bata o novo acento que torna “${focus}” audível.`,
      es: `Toca A y conserva alturas y duraciones al mover solo la entrada de B; marca el nuevo acento que hace audible “${focus}”.`,
      de: `Spiele A und bewahre Töne sowie Dauern, während nur Bs Einsatz wandert; klopfe den neuen Akzent zu „${focus}“.`,
      ja: `Aを弾き、音高と音価をすべて保ったままBの開始位置だけを動かし、「${focus}」を示す新しいアクセントをたたきます。`,
      "zh-Hans": `先弹A，保持所有音高和时值，只移动B的起点；拍出让“${focus}”清楚可听的新重音。`,
    },
    "rhythm-inside-the-scale": {
      en: `Keep every written scale pitch unchanged while you count its holds, rests, and subdivisions; make “${focus}” audible without replacing the line with taps.`,
      "pt-BR": `Mantenha todas as alturas escritas enquanto conta sustentações, pausas e subdivisões; deixe “${focus}” audível sem trocar a linha por batidas.`,
      es: `Mantén todas las alturas escritas mientras cuentas duraciones, silencios y subdivisiones; haz audible “${focus}” sin sustituir la línea por golpes.`,
      de: `Bewahre alle notierten Skalentöne beim Zählen von Halten, Pausen und Unterteilungen; mache „${focus}“ hörbar, ohne nur zu klopfen.`,
      ja: `記譜された音高を変えずに音価、休符、細分を数え、タップだけに置き換えず「${focus}」をラインで示します。`,
      "zh-Hans": `保持所有写出的音高，同时数清延音、休止和细分；不要改成纯点击，用带音高的线条表现“${focus}”。`,
    },
  }[context.unit.slug];
  if (special) return special[locale];
  const kind = context.unit.kind;
  const rawTask = (TASKS[kind] || TASKS.scale)[locale][context.lessonIndex];
  return rawTask;
}

function setupInstruction(locale, context) {
  const scale = SCALE_NAMES[context.scale][locale];
  const degrees = context.shape.degreeDisplay;
  if (context.compare) {
    const pair = comparisonSpec(context);
    const sideA = displayedComparisonSide(pair, "A", locale);
    const sideB = displayedComparisonSide(pair, "B", locale);
    const values = {
      en: `For ${context.unit.titles.en}, set ${context.tempo} BPM, then play A in ${sideA.root} ${sideA.scale} and B in ${sideB.root} ${sideB.scale}. The two lines are ${pair.a} and ${pair.b}.`,
      "pt-BR": `Ajuste ${context.tempo} BPM e toque A em ${sideA.root} ${sideA.scale} e B em ${sideB.root} ${sideB.scale}. As linhas escritas são ${pair.a} e ${pair.b}.`,
      es: `Ajusta ${context.tempo} BPM y toca A en ${sideA.root} ${sideA.scale} y B en ${sideB.root} ${sideB.scale}. Las líneas escritas son ${pair.a} y ${pair.b}.`,
      de: `Stelle ${context.tempo} BPM ein und spiele A in ${sideA.root} ${sideA.scale} sowie B in ${sideB.root} ${sideB.scale}. Die notierten Linien sind ${pair.a} und ${pair.b}.`,
      ja: `${context.tempo} BPMに設定し、Aの${sideA.root}${sideA.scale}とBの${sideB.root}${sideB.scale}を再生します。記譜ラインは${pair.a}と${pair.b}です。`,
      "zh-Hans": `设为${context.tempo} BPM，播放A的${sideA.root}${sideA.scale}和B的${sideB.root}${sideB.scale}。两条书写线分别是${pair.a}和${pair.b}。`,
    };
    return values[locale];
  }
  if (context.unit.kind === "harmony") {
    if (context.lessonIndex === 6) {
      const values = {
        en: `Play the loop twice and hold one correctly named common tone across the first chord boundary without reattacking it.`,
        "pt-BR": `Toque o ciclo duas vezes e sustente uma nota comum nomeada através da primeira mudança, sem novo ataque.`,
        es: `Toca el ciclo dos veces y sostén una nota común nombrada durante el primer cambio, sin volver a atacarla.`,
        de: `Spiele die Schleife zweimal und halte einen korrekt benannten gemeinsamen Ton ohne neuen Anschlag über den ersten Wechsel.`,
        ja: `ループを2回弾き、正しく答えた共通音を最初のコード境界で弾き直さず保つ。`,
        "zh-Hans": `把循环弹两遍，说出一个正确的共同音，并跨过第一次和弦变化保持它，不重新起音。`,
      };
      return values[locale];
    }
    const values = {
      en: `For ${context.unit.titles.en}, set ${context.tempo} BPM, play the four-chord card once, then use the ${context.root} ${scale} line ${degrees} over its changes.`,
      "pt-BR": `Ajuste ${context.tempo} BPM, toque uma vez o cartão de quatro acordes e use a linha ${degrees} de ${context.root} ${scale} sobre as mudanças.`,
      es: `Ajusta ${context.tempo} BPM, toca una vez la tarjeta de cuatro acordes y usa la línea ${degrees} de ${context.root} ${scale} sobre los cambios.`,
      de: `Stelle ${context.tempo} BPM ein, spiele die Vier-Akkord-Karte einmal und nutze über den Wechseln die Linie ${degrees} in ${context.root} ${scale}.`,
      ja: `${context.tempo} BPMに設定し、4コードのカードを一度再生してから、変化の上で${context.root}${scale}の${degrees}を使います。`,
      "zh-Hans": `设为${context.tempo} BPM，先播放一遍四和弦卡片，再在变化上使用${context.root}${scale}线条${degrees}。`,
    };
    return values[locale];
  }
  const values = {
    en: `For ${context.unit.titles.en}, set ${context.tempo} BPM, hear ${context.root}, and play the ${context.root} ${scale} card once while following ${degrees}.`,
    "pt-BR": `Ajuste ${context.tempo} BPM, ouça ${context.root} e toque uma vez o cartão de ${scale} em ${context.root}, acompanhando ${degrees}.`,
    es: `Ajusta ${context.tempo} BPM, escucha ${context.root} y toca una vez la tarjeta de ${scale} en ${context.root}, siguiendo ${degrees}.`,
    de: `Stelle ${context.tempo} BPM ein, höre ${context.root} und spiele die Karte in ${context.root} ${scale} einmal mit ${degrees}.`,
    ja: `${context.tempo} BPMに設定し、${context.root}を頭で聴いてから、${context.root}${scale}の${degrees}を一度弾きます。`,
    "zh-Hans": `设为${context.tempo} BPM，先在心里听到${context.root}，再按${degrees}弹一遍${context.root}${scale}卡片。`,
  };
  return values[locale];
}

function pitchParagraphs(locale, context) {
  const scale = SCALE_NAMES[context.scale][locale];
  const focus = lowerFirst(context.focusTitle[locale], locale);
  const degrees = context.shape.degreeDisplay;
  const [target, next] = actualDegreeTokens(context);
  const task = taskInstruction(locale, context);
  const setup = setupInstruction(locale, context);

  switch (locale) {
    case "en":
      return [
        `${setup} ${task} For ${context.unit.titles.en}, center every attack and give each written duration its full value. During “${context.focusTitle.en},” listen closely when event ${target} meets event ${next}; that connection carries the line forward. Stop this ${context.unit.titles.en} pass if the pulse bends there instead of covering the seam with another repetition.`,
        `Repeat the ${context.unit.titles.en} line three times with the same hand plan. On the first “${context.focusTitle.en}” pass, say the events; on the second, watch the metronome instead of the cursor; on the third, lower playback. If event ${target} arrives early during ${context.unit.titles.en}, loop the event before it, the target, and event ${next} at ${context.slowTempo} BPM. Restore the full ${context.root} line only after that ${context.unit.titles.en} cell stays even twice, with no extra accent at its join. Here ${degrees} is the complete line and the audible test is: ${focus}.`,
      ];
    case "pt-BR":
      return [
        `${setup} ${task} Centralize cada ataque e respeite por inteiro toda duração escrita. Escute com atenção quando o evento ${target} encontra o evento ${next}; essa ligação conduz a linha. Pare se a pulsação se deformar ali, em vez de esconder a emenda com outra repetição.`,
        `Repita a linha três vezes com o mesmo plano de mãos. Diga os graus na primeira passagem, acompanhe o metrônomo em vez do cursor na segunda e abaixe o volume da referência na terceira. Se o grau ${target} chegar cedo, repita o evento anterior, o alvo e o evento seguinte a ${context.slowTempo} BPM. Retome a linha completa em ${context.root} somente depois que essa pequena célula ficar regular duas vezes, sem acento extra na junção. Neste estudo de ${context.unit.titles["pt-BR"]}, ${degrees} é a linha completa e o teste audível é: ${focus}.`,
      ];
    case "es":
      return [
        `${setup} ${task} Centra cada ataque y respeta por completo cada duración escrita. Escucha con atención cuando el evento ${target} encuentra el evento ${next}; esa unión impulsa la línea. Detente si el pulso se dobla allí, en vez de ocultar la unión con otra repetición.`,
        `Repite la línea tres veces con el mismo plan de manos. Di los grados en la primera pasada, mira el metrónomo en lugar del cursor en la segunda y baja el volumen de la referencia en la tercera. Si el grado ${target} llega pronto, repite el evento anterior, el objetivo y el evento siguiente a ${context.slowTempo} BPM. Recupera la línea completa en ${context.root} solo cuando esa célula pequeña quede regular dos veces, sin un acento añadido en la unión. En este estudio de ${context.unit.titles.es}, ${degrees} es la línea completa y la prueba audible es: ${focus}.`,
      ];
    case "de":
      return [
        `${setup} ${task} Setze jeden Anschlag mittig und halte jeden notierten Wert vollständig. Höre genau hin, wenn Ereignis ${target} auf Ereignis ${next} trifft; diese Verbindung trägt die Linie weiter. Halte an, wenn sich dort der Puls verbiegt, statt die Naht mit einer weiteren Wiederholung zu verdecken.`,
        `Wiederhole die Linie dreimal mit demselben Bewegungsplan. Sprich im ersten Durchgang die Stufen, beobachte im zweiten das Metronom statt des Cursors und senke im dritten die Lautstärke der Vorlage. Kommt Stufe ${target} zu früh, übe das Ereignis davor, den Zielton und das Ereignis danach bei ${context.slowTempo} BPM. Setze erst dann die ganze Linie in ${context.root} zusammen, wenn diese kleine Zelle zweimal gleichmäßig bleibt und an der Naht kein zusätzlicher Akzent entsteht. In dieser Studie zu ${context.unit.titles.de} ist ${degrees} die ganze Linie und der hörbare Test lautet: ${focus}.`,
      ];
    case "ja":
      return [
        `${setup}${task} 各音の立ち上がりを拍の中央に置き、書かれた長さを最後まで保ちます。イベント${target}から${next}へ移る瞬間をよく聴き、その接続でテンポが動いたら、続けてごまかさずその場で止めます。`,
        `同じ運指と手順で3回繰り返します。1回目は音度を声に出し、2回目はカーソルではなくメトロノームを見て、3回目は再生音を小さくします。イベント${target}が早く入る場合は、その前の音、目標音、次の音だけを${context.slowTempo} BPMで反復してください。短い3音のつながりが2回続けて均等になり、接続に余分なアクセントが付かなくなってから、${context.root}の全ラインへ戻します。${context.unit.titles.ja}では、${degrees}を全体として使い、${focus}ことを耳で判定します。`,
      ];
    case "zh-Hans":
      return [
        `${setup}${task} 让每次起音落在拍点中央，并把标出的时值保持完整。特别听事件${target}接到事件${next}的瞬间，这个连接负责推动乐句。如果拍子在那里弯曲，不要靠继续弹来掩盖，立即停下并指出具体位置。`,
        `使用同一套指法和动作重复三遍。第一遍念出音级，第二遍看节拍器而不追光标，第三遍降低示范音量。如果音级${target}进入过早，就在${context.slowTempo} BPM下循环前一个音、目标音和后一个音。这个三音小单元连续两次保持均匀，而且连接处没有多余重音后，才回到完整的${context.root}乐句；三遍都不要临时更换手指安排。在${context.unit.titles["zh-Hans"]}练习中，${degrees}是完整线条，要用耳朵判断是否做到${focus}。`,
      ];
    default:
      throw new Error(`Unsupported locale ${locale}`);
  }
}

function earParagraphs(locale, context) {
  const pair = comparisonSpec(context);
  const setup = setupInstruction(locale, context);
  const task = taskInstruction(locale, context);
  const focus = context.plan.goalText[locale];
  switch (locale) {
    case "en": return [
      `${setup} ${task} In ${context.unit.titles.en}, keep the A line ${pair.a} and the B line ${pair.b} separate in memory. Play each ${context.unit.titles.en} card twice with labels visible, then once with the labels covered. For “${focus},” do not decide from the first note alone; listen through the event that actually changes the tonic, contour, pitch, rhythm, or ending named by the task.`,
      `Answer the ${context.unit.titles.en} question before replaying either card. On the second “${focus}” round, sing or tap your answer first, perform it, and only then use playback as a check. If that ${context.unit.titles.en} answer is wrong, isolate the shortest different cell from A and B at ${context.slowTempo} BPM and alternate it four times. Return to both complete ${context.unit.titles.en} cards at ${context.tempo} BPM, keep their durations intact, and name the audible clue that completed “${focus}” without labels.`,
    ];
    case "pt-BR": return [
      `${setup} ${task} Em ${context.unit.titles["pt-BR"]}, guarde separadamente a linha A ${pair.a} e a linha B ${pair.b}. Toque cada cartão duas vezes com os rótulos e uma vez com eles cobertos. Não decida apenas pela primeira nota; escute até o evento que realmente muda a tônica, o contorno, a altura, o ritmo ou o final indicado pela tarefa.`,
      `Responda antes de repetir qualquer cartão. Na segunda rodada, cante ou bata primeiro sua resposta, faça-a no instrumento e só então confira na reprodução. Se errar, isole a menor célula diferente de A e B a ${context.slowTempo} BPM e alterne-a quatro vezes. Volte aos dois cartões completos a ${context.tempo} BPM, preserve as durações escritas e anote qual pista audível permitiu fazer “${focus}” sem os rótulos.`,
    ];
    case "es": return [
      `${setup} ${task} En ${context.unit.titles.es}, guarda por separado la línea A ${pair.a} y la línea B ${pair.b}. Toca cada tarjeta dos veces con etiquetas y una vez con ellas tapadas. No decidas solo por la primera nota; escucha hasta el evento que cambia realmente la tónica, el contorno, la altura, el ritmo o el final señalado por la tarea.`,
      `Responde antes de repetir cualquiera de las tarjetas. En la segunda ronda, canta o marca primero tu respuesta, tócala en el instrumento y solo entonces comprueba la reproducción. Si fallas, aísla la célula distinta más corta de A y B a ${context.slowTempo} BPM y altérnala cuatro veces. Vuelve a las dos tarjetas completas a ${context.tempo} BPM, conserva sus duraciones y anota qué pista audible permitió hacer “${focus}” sin etiquetas.`,
    ];
    case "de": return [
      `${setup} ${task} Halte in ${context.unit.titles.de} die Linie A ${pair.a} und die Linie B ${pair.b} getrennt im Gedächtnis. Spiele jede Karte zweimal mit und einmal ohne sichtbare Etiketten. Entscheide nicht nur nach dem ersten Ton; höre bis zu dem Ereignis, das den in der Aufgabe genannten Grundton, Verlauf, Ton, Rhythmus oder Schluss tatsächlich verändert.`,
      `Antworte, bevor du eine Karte wiederholst. Singe oder klopfe in der zweiten Runde zuerst deine Antwort, spiele sie auf dem Instrument und prüfe sie erst danach. Bei einem Fehler isolierst du die kürzeste unterschiedliche Zelle aus A und B bei ${context.slowTempo} BPM und wechselst viermal zwischen beiden. Kehre bei ${context.tempo} BPM zu den ganzen Karten zurück, erhalte die notierten Dauern und notiere den Hinweis, mit dem „${focus}“ ohne Etiketten gelang.`,
    ];
    case "ja": return [
      `${setup}${task}${context.unit.titles.ja}では、Aの${pair.a}とBの${pair.b}を別々に記憶します。ラベルを見て各カードを2回、隠して1回再生してください。最初の音だけで決めず、課題で示された主音、音形、音高、リズム、または終わりが実際に変わるイベントまで聴きます。二つのカードを同じ手順で扱い、長さの違いも音高の違いと同じ精度で保ちます。`,
      `どちらかを再生し直す前に答えます。2巡目は答えを先に歌うかたたき、楽器で再現してから再生で確認してください。誤った場合は、AとBで異なる最小のセルを${context.slowTempo} BPMで切り出し、4回交互に鳴らします。その後${context.tempo} BPMの全カードへ戻り、記譜された音価を保ちます。最後に、ラベルなしで「${focus}」を行う手掛かりになった音を一つ言葉にします。`,
    ];
    case "zh-Hans": return [
      `${setup}${task}在${context.unit.titles["zh-Hans"]}中，把A线${pair.a}和B线${pair.b}分开记忆。显示标签时每张播放两遍，隐藏标签后再各播一遍。不要只凭首音判断，要一直听到任务所说的根音、轮廓、音高、节奏或结尾真正发生变化的位置。两张卡片使用同一套动作，并像保持音高一样准确保持时值差别。`,
      `重播任何卡片前先给出答案。第二轮先唱出或拍出答案，再在乐器上复现，最后才用播放核对。如果答错，就在${context.slowTempo} BPM下截取A和B最短的不同单元，交替四次。随后回到${context.tempo} BPM的两张完整卡片，保留所有写出的时值。最后说出一个可听见的线索，说明你如何在隐藏标签时完成“${focus}”。`,
    ];
    default: throw new Error(`Unsupported locale ${locale}`);
  }
}

function tapParagraphs(locale, context) {
  const pattern = TAP_PATTERNS[context.lessonIndex];
  const focus = lowerFirst(context.focusTitle[locale], locale);
  const special = context.lessonIndex === 7 ? {
    en: "Repeat the grid four times and move the accent to the next x on each repeat.",
    "pt-BR": "Repita quatro vezes, movendo o acento ao x seguinte.",
    es: "Repite la cuadrícula cuatro veces y lleva el acento audible a la siguiente x en cada repetición.",
    de: "Wiederhole das Raster viermal und verschiebe den hörbaren Akzent jeweils auf das nächste x.",
    ja: "グリッドを4回繰り返し、毎回アクセントを次のxへ移します。",
    "zh-Hans": "把网格重复四次，每次把可听见的重音移到下一个x。",
  }[locale] : context.lessonIndex === 8 ? {
    en: `Play the three cards at ${context.slowTempo}, ${context.tempo}, and ${context.tempo + 10} BPM without changing the grid.`,
    "pt-BR": `Toque os três cartões a ${context.slowTempo}, ${context.tempo} e ${context.tempo + 10} BPM sem mudar a grade.`,
    es: `Toca las tres tarjetas a ${context.slowTempo}, ${context.tempo} y ${context.tempo + 10} BPM sin cambiar la cuadrícula.`,
    de: `Spiele die drei Karten bei ${context.slowTempo}, ${context.tempo} und ${context.tempo + 10} BPM ohne Rasteränderung.`,
    ja: `${context.slowTempo}、${context.tempo}、${context.tempo + 10} BPMの3枚を、グリッドを変えずに弾きます。`,
    "zh-Hans": `在${context.slowTempo}、${context.tempo}和${context.tempo + 10} BPM下弹三张卡片，网格保持不变。`,
  }[locale] : "";
  switch (locale) {
    case "en":
      return [
        `For ${context.unit.titles.en}, set ${context.tempo} BPM and hear the full count-in before moving. The ${context.unit.titles.en} tap grid is ${pattern}; each x is an attack and each dash owns measured time. Your “${context.focusTitle.en}” job is: ${focus}. ${special} Keep one continuous ${context.unit.titles.en} hand motion through silent slots. Restart this ${context.unit.titles.en} grid if an extra tap enters a dash or the return crowds the previous beat.`,
        `Run the ${context.unit.titles.en} pattern three ways: count aloud, whisper subdivisions, then count internally. At ${context.slowTempo} BPM, loop four ${context.unit.titles.en} slots around the weakest attack until spacing matches twice. Restore the complete pattern at ${context.tempo} BPM. Judge “${context.focusTitle.en}” on the timeline: no input in a rest, no missed x, and no final drift. Here ${pattern} is the full grid and the evidence confirms: ${focus}.`,
      ];
    case "pt-BR":
      return [
        `Ajuste ${context.tempo} BPM e escute a contagem antes de mover as mãos. O cartão mostra ${pattern}; cada x é um ataque e cada traço ocupa tempo medido. Sua tarefa: ${focus}. ${special} Mantenha movimento contínuo nos espaços silenciosos. Reinicie se surgir um toque extra em um traço ou se o retorno apertar o tempo anterior.`,
        `Faça o padrão de três maneiras. Conte em voz alta na primeira passagem, sussurre as subdivisões na segunda e mantenha a contagem interna na terceira. A ${context.slowTempo} BPM, isole os quatro espaços ao redor do ataque menos preciso e repita até a distância coincidir duas vezes. Depois recupere o padrão completo a ${context.tempo} BPM. Julgue pela linha do tempo: nenhum toque extra na pausa, nenhum x perdido e nenhum desvio visível rumo ao espaço final. Neste estudo de ${context.unit.titles["pt-BR"]}, ${pattern} é a grade completa e essas marcas confirmam: ${focus}.`,
      ];
    case "es":
      return [
        `Ajusta ${context.tempo} BPM y escucha la cuenta antes de mover las manos. La tarjeta marca ${pattern}; cada x es un ataque y cada guion ocupa tiempo medido. Tu tarea: ${focus}. ${special} Mantén movimiento continuo en los espacios silenciosos. Reinicia si aparece un toque extra en un guion o si el regreso aprieta el pulso anterior.`,
        `Haz el patrón de tres maneras. Cuenta en voz alta en la primera pasada, susurra las subdivisiones en la segunda y conserva la cuenta interna en la tercera. A ${context.slowTempo} BPM, aísla los cuatro espacios alrededor del ataque menos preciso y repítelos hasta igualar dos veces la separación. Después recupera el patrón completo a ${context.tempo} BPM. Evalúa la línea de tiempo: ningún toque extra en el silencio, ninguna x omitida y ningún desplazamiento visible hacia el último espacio. En este estudio de ${context.unit.titles.es}, ${pattern} es la cuadrícula completa y esas marcas confirman: ${focus}.`,
      ];
    case "de":
      return [
        `Stelle ${context.tempo} BPM ein und höre vor der Bewegung den Einzähler. Die Tap-Karte zeigt ${pattern}; jedes x ist ein Anschlag, jeder Strich gemessene Zeit. Deine Aufgabe: ${focus}. ${special} Führe die Hand durch stille Plätze weiter. Beginne neu, wenn ein zusätzlicher Treffer entsteht oder die Rückkehr den vorherigen Schlag einengt.`,
        `Spiele das Muster auf drei Arten. Zähle im ersten Durchgang laut, flüstere im zweiten die Unterteilungen und führe die Zählung im dritten nur innerlich. Isoliere bei ${context.slowTempo} BPM die vier Plätze um den ungenauesten Anschlag und wiederhole sie, bis der Abstand zweimal übereinstimmt. Stelle danach das ganze Muster bei ${context.tempo} BPM wieder her. Beurteile die Zeitleiste: kein zusätzlicher Treffer in einer Pause, kein fehlendes x und kein sichtbares Driften zum letzten Platz. In dieser Studie zu ${context.unit.titles.de} ist ${pattern} das ganze Raster; diese Merkmale bestätigen: ${focus}.`,
      ];
    case "ja":
      return [
        `テンポを${context.tempo} BPMに設定し、動き始める前にカウントインを最後まで聴きます。タップカードは${pattern}で、xは打点、横線は同じ長さの無音です。まだ音程を加えず、${focus}ことに集中してください。${special} 無音の枠でも手の動きを止めず、最後の打点を最初と同じ落ち着きで置きます。横線に余分な入力が入ったり、戻りが前の拍へ詰まったりしたら、その場でやり直します。`,
        `同じパターンを3通りで行います。1回目は声で数え、2回目は細分を小声で言い、3回目は内側だけで数えてください。最もずれた打点の前後4枠を${context.slowTempo} BPMで切り出し、間隔が2回続けてそろうまで反復します。その後${context.tempo} BPMの全体へ戻ります。タイムライン上で休符への余分な入力、xの抜け、最後へ向かうずれが一つもないか確認します。${context.unit.titles.ja}では、${pattern}を全体として使い、この結果で${focus}ことを確かめます。`,
      ];
    case "zh-Hans":
      return [
        `把速度设为${context.tempo} BPM，动作前先听完整个预备拍。点击卡片显示${pattern}；每个x代表一次击打，每条横线也占有同样准确的时间。暂时不要加入音高，唯一任务是：${focus}。${special} 经过无声格时仍让手保持连续运动，使最后一下和第一下一样稳定。如果横线位置出现多余输入，或返回时挤向前一拍，就立刻重新开始，不要带着误差继续。`,
        `用三种方式完成同一模式。第一遍大声数拍，第二遍轻声数细分，第三遍只在心里计数。把最不准的击打及其前后四格截出，在${context.slowTempo} BPM下循环，直到间距连续两次一致，再恢复${context.tempo} BPM的完整模式。根据时间线判断：休止格没有额外点击，所有x都出现，并且最后几格没有逐渐向前或向后漂移。在${context.unit.titles["zh-Hans"]}练习中，${pattern}是完整网格，这些结果用于确认${focus}。`,
      ];
    default:
      throw new Error(`Unsupported locale ${locale}`);
  }
}

function methodSentence(locale, context) {
  const [target, next] = actualDegreeTokens(context);
  const methods = {
    en: {
      rhythm: `Count every dash through the next attack and keep the hand moving during silence.`,
      ear: `Keep A and B separate in memory and make the choice before replaying either side.`,
      harmony: `Hear the next chord early and place event ${target} exactly on its boundary.`,
      phrase: `Keep the written note set bounded and change only the requested phrase feature.`,
      scale: `Use one movement plan through events ${target}–${next} and stop if that connection loses its written length.`,
    },
    "pt-BR": {
      rhythm: `Conte cada traço até o ataque seguinte e mantenha a mão em movimento durante o silêncio.`,
      ear: `Guarde A e B separadamente e escolha antes de repetir qualquer lado.`,
      harmony: `Antecipe o próximo acorde e coloque o evento ${target} exatamente na fronteira.`,
      phrase: `Limite-se às notas escritas e mude somente o aspecto pedido da frase.`,
      scale: `Use um só plano de movimento nos eventos ${target}–${next} e pare se a ligação perder a duração escrita.`,
    },
    es: {
      rhythm: `Cuenta cada guion hasta el ataque siguiente y mantén la mano en movimiento durante el silencio.`,
      ear: `Guarda A y B por separado y elige antes de repetir cualquiera.`,
      harmony: `Anticipa el acorde siguiente y coloca el evento ${target} justo en el límite.`,
      phrase: `Limítate a las notas escritas y cambia solo el rasgo pedido de la frase.`,
      scale: `Usa un solo plan de movimiento en los eventos ${target}–${next} y detente si la unión pierde la duración escrita.`,
    },
    de: {
      rhythm: `Zähle jeden Strich bis zum nächsten Anschlag und führe die Hand in der Stille weiter.`,
      ear: `Halte A und B im Gedächtnis getrennt und entscheide vor jeder Wiederholung.`,
      harmony: `Höre den nächsten Akkord früh und setze Ereignis ${target} genau auf seine Grenze.`,
      phrase: `Bleibe beim notierten Tonvorrat und ändere nur das verlangte Phrasenmerkmal.`,
      scale: `Nutze für Ereignis ${target}–${next} einen Bewegungsplan und halte an, wenn die Verbindung ihre notierte Dauer verliert.`,
    },
    ja: {
      rhythm: `横線から次の打点まで数え続け、無音でも手の動きを保ちます。`,
      ear: `AとBを別々に記憶し、追加再生で印象が変わる前に判断します。`,
      harmony: `境界の前に次のコードを聴き、イベント${target}を変化の瞬間に置きます。`,
      phrase: `記譜された音だけを使い、指定されたフレーズの特徴だけを変えます。`,
      scale: `イベント${target}–${next}を一つの運指でつなぎ、記譜音価が崩れたら止まります。`,
    },
    "zh-Hans": {
      rhythm: `从横线数到下一次击打，无声处仍保持手部运动。`,
      ear: `把A、B分开记忆，在再次播放改变印象之前先判断。`,
      harmony: `提前听见下一个和弦，让事件${target}与和弦变化同时到达。`,
      phrase: `只使用写出的音，单独改变指定的乐句特征。`,
      scale: `用一套动作连接事件${target}–${next}，若书写时值改变就在该处停下。`,
    },
  };
  return methods[locale][context.unit.kind];
}

function reviewInstruction(locale, context) {
  const unitName = UNIT_MATERIALS[context.unit.slug][locale];
  const focus = context.plan.goalText[locale];
  const slow = context.slowTempo;
  const tempo = context.tempo;
  const reviews = {
    en: [
      `After the first ${unitName} pass, mute playback and repeat from memory. If the opening and return disagree, loop only those two points at ${slow} BPM.`,
      `Give ${unitName} three attempts: one counted aloud, one with quiet subdivisions, and one from internal time. Mark the earliest place where “${focus}” disappears.`,
      `Hear the final event before beginning ${unitName}, then work backward from it once. Restore forward motion at ${tempo} BPM only when the ending keeps its full value.`,
      `Isolate the turn in ${unitName} and alternate the last rising cell with the first falling cell. Two gap-free joins earn a complete pass.`,
      `Record one plain ${unitName} take, then one with the planned grouping lightly accented. The pulse and written durations must match between the two recordings.`,
      `Say the grouping over ${unitName} without playing, then add the notes beneath the spoken count. Keep the overlap audible rather than restarting each cell.`,
      `Sing the target used in ${unitName} from the tonic, play the card, and name the event that releases it. Repeat only if that release is unclear.`,
      `Count through every rest in ${unitName} with the hand still moving. Re-enter once softly and once at normal volume without shortening either side of the silence.`,
      `Run ${unitName} at the three written speeds with the same motion and touch. Stop the ladder when timing changes, repair one cell, then resume there.`,
      `Make one uninterrupted ${unitName} recording without watching the cursor. On review, identify one precise success and one event to repair next time.`,
    ],
    "pt-BR": [
      `Após a primeira passagem de ${unitName}, silencie a referência e repita de memória. Se abertura e retorno divergirem, isole apenas esses pontos a ${slow} BPM.`,
      `Faça três tentativas de ${unitName}: contando alto, sussurrando subdivisões e usando contagem interna. Marque o primeiro lugar onde “${focus}” desaparece.`,
      `Ouça o evento final antes de começar ${unitName} e percorra a linha uma vez de trás para frente. Só retome o sentido normal a ${tempo} BPM com o final inteiro.`,
      `Isole a volta de ${unitName} e alterne a última célula ascendente com a primeira descendente. Duas junções sem lacuna liberam a passagem completa.`,
      `Grave uma tomada neutra de ${unitName} e outra com o agrupamento levemente acentuado. Pulsação e durações escritas devem coincidir nas duas.`,
      `Diga o agrupamento de ${unitName} sem tocar e depois coloque as notas sob a contagem falada. Deixe a sobreposição audível, sem reiniciar cada célula.`,
      `Cante a partir da tônica o alvo usado em ${unitName}, toque o cartão e nomeie o evento que o libera. Repita somente se essa saída ficar obscura.`,
      `Conte todas as pausas de ${unitName} mantendo a mão em movimento. Volte uma vez suave e outra normal, sem encurtar nenhum lado do silêncio.`,
      `Faça ${unitName} nas três velocidades escritas com o mesmo movimento e toque. Pare quando o tempo mudar, corrija uma célula e retome dali.`,
      `Grave ${unitName} de ponta a ponta sem olhar o cursor. Na revisão, indique um acerto preciso e um evento para corrigir na próxima tentativa.`,
    ],
    es: [
      `Tras la primera pasada de ${unitName}, silencia la referencia y repite de memoria. Si inicio y regreso difieren, aísla solo esos puntos a ${slow} BPM.`,
      `Haz tres intentos de ${unitName}: contando en voz alta, susurrando subdivisiones y con cuenta interna. Marca el primer lugar donde desaparece “${focus}”.`,
      `Escucha el evento final antes de empezar ${unitName} y recorre la línea una vez hacia atrás. Recupera el sentido normal a ${tempo} BPM solo con el final completo.`,
      `Aísla el giro de ${unitName} y alterna la última célula ascendente con la primera descendente. Dos uniones sin hueco permiten la pasada completa.`,
      `Graba una toma neutra de ${unitName} y otra con la agrupación levemente acentuada. Pulso y duraciones escritas deben coincidir en ambas.`,
      `Di la agrupación de ${unitName} sin tocar y añade después las notas bajo la cuenta hablada. Deja audible la superposición sin reiniciar cada célula.`,
      `Canta desde la tónica el objetivo usado en ${unitName}, toca la tarjeta y nombra el evento que lo libera. Repite solo si esa salida no queda clara.`,
      `Cuenta todos los silencios de ${unitName} con la mano en movimiento. Regresa una vez suave y otra normal sin acortar ningún lado del silencio.`,
      `Haz ${unitName} a las tres velocidades escritas con el mismo movimiento y toque. Detén la escalera si cambia el tiempo, corrige una célula y sigue desde allí.`,
      `Graba ${unitName} completo sin mirar el cursor. Al revisar, señala un acierto preciso y un evento para corregir en el próximo intento.`,
    ],
    de: [
      `Schalte nach dem ersten Durchgang von ${unitName} die Vorlage stumm und wiederhole aus dem Gedächtnis. Weichen Anfang und Rückkehr ab, übe nur diese Punkte bei ${slow} BPM.`,
      `Spiele ${unitName} dreimal: laut gezählt, mit geflüsterten Unterteilungen und mit innerem Puls. Markiere die erste Stelle, an der „${focus}“ verschwindet.`,
      `Höre vor ${unitName} das letzte Ereignis und arbeite einmal rückwärts von dort. Kehre erst bei vollständig gehaltenem Schluss zu ${tempo} BPM vorwärts zurück.`,
      `Isoliere die Wende von ${unitName} und wechsle zwischen letzter Aufwärts- und erster Abwärtszelle. Zwei lückenlose Verbindungen erlauben den ganzen Durchgang.`,
      `Nimm ${unitName} einmal neutral und einmal mit leicht betonter Gruppierung auf. Puls und notierte Dauern müssen in beiden Aufnahmen übereinstimmen.`,
      `Sprich die Gruppierung von ${unitName} ohne Instrument und lege danach die Töne unter die Zählung. Lass die Überlappung hörbar, ohne jede Zelle neu anzusetzen.`,
      `Singe den Zielton aus ${unitName} vom Grundton, spiele die Karte und nenne das lösende Ereignis. Wiederhole nur bei unklarer Auflösung.`,
      `Zähle durch jede Pause von ${unitName} und halte die Hand in Bewegung. Setze einmal leise und einmal normal ein, ohne die Stille zu kürzen.`,
      `Spiele ${unitName} bei drei notierten Tempi mit gleicher Bewegung und Berührung. Stoppe bei verändertem Timing, repariere eine Zelle und setze dort fort.`,
      `Nimm ${unitName} ohne Blick auf den Cursor vollständig auf. Benenne danach einen genauen Erfolg und ein Ereignis für die nächste Korrektur.`,
    ],
    ja: [
      `${unitName}を一度弾いたら再生音を消し、記憶だけで反復します。冒頭と戻りが一致しなければ、その2点だけを${slow} BPMでつなぎます。`,
      `${unitName}を3回行います。声で数える、小声で細分する、内側だけで数える順にし、「${focus}」が最初に消える場所を記録します。`,
      `${unitName}を始める前に最後の音を聴き、そこから一度逆向きに確認します。終わりを完全に保てたら${tempo} BPMの順方向へ戻します。`,
      `${unitName}の折り返しを切り出し、上行の最後のセルと下降の最初のセルを交互に弾きます。隙間なく2回つながったら全体へ戻ります。`,
      `${unitName}を平坦に一度、計画したまとまりを軽く強調して一度録音します。2つの録音で拍と記譜された音価を一致させます。`,
      `${unitName}のまとまりを楽器なしで声に出し、その数え方の下に音を加えます。各セルを始め直さず、重なりを聴こえる形で保ちます。`,
      `${unitName}の目標音を主音から歌い、カードを弾いて、その音を解放するイベントを答えます。解決が不明瞭な場合だけ反復します。`,
      `${unitName}の休符中も手を動かして数えます。無音の前後を縮めず、弱い音量と通常音量で一度ずつ戻ります。`,
      `${unitName}を記譜された3つのテンポで、同じ動きとタッチを使って弾きます。タイミングが変わったら止め、1セル直してそこから再開します。`,
      `カーソルを見ずに${unitName}を最後まで録音します。再生を確認し、正確にできた点を一つ、次回直すイベントを一つ挙げます。`,
    ],
    "zh-Hans": [
      `${unitName}第一遍后关闭示范，只凭记忆重复。若开头与回归不一致，就在${slow} BPM下只循环这两个位置。`,
      `${unitName}做三次：大声数拍、轻声数细分、只用内在拍感。标出“${focus}”最早消失的位置。`,
      `开始${unitName}前先听见最后一个音，再从终点向前倒查一次。结尾保持完整后，才以${tempo} BPM恢复正向演奏。`,
      `截取${unitName}的转向处，交替弹上行最后单元与下行第一个单元。连续两次无缝连接后再回到全段。`,
      `${unitName}先录一遍平直版本，再录一遍轻微强调计划分组的版本。两次录音的脉搏和写出时值必须一致。`,
      `先不用乐器说出${unitName}的分组，再把音符放到口头计数下面。不要重新启动每个单元，要让重叠清楚可听。`,
      `从主音唱出${unitName}的目标音，弹卡片并说出释放它的事件。只有在解决不清楚时才重复。`,
      `${unitName}的每个休止都继续计数并保持手部动作。用轻声和正常音量各返回一次，不缩短静默两侧。`,
      `${unitName}按写出的三个速度演奏，保持相同动作与触键。时值一改变就停下，修好一个单元后从那里继续。`,
      `不看光标完整录下${unitName}。回听后指出一个准确成果，以及下次要修正的一个具体事件。`,
    ],
  };
  const source = reviews[locale][context.lessonIndex];
  return source.match(/^.*?[.!?。！？]/u)?.[0] || source;
}

function withoutFinalPunctuation(value) {
  return value.replace(/([.!?。！？]+)([”"’']*)$/u, "$2");
}

function lowerSentenceStart(value, locale) {
  if (locale === "ja" || locale === "zh-Hans") return value;
  return value.charAt(0).toLocaleLowerCase(locale) + value.slice(1);
}

function setupSentence(locale, context) {
  const unitName = context.unit.titles[locale];
  const scale = SCALE_NAMES[context.scale][locale];
  if (context.tap) {
    const pattern = TAP_PATTERNS[context.lessonIndex];
    const values = {
      en: `Set ${context.tempo} BPM for ${unitName} and tap ${pattern}; x marks an attack, while every dash keeps its full silent slot.`,
      "pt-BR": `Ajuste ${context.tempo} BPM para ${unitName} e bata ${pattern}; x marca um ataque e cada traço mantém seu espaço silencioso inteiro.`,
      es: `Ajusta ${context.tempo} BPM para ${unitName} y marca ${pattern}; x indica un ataque y cada guion conserva todo su espacio silencioso.`,
      de: `Stelle für ${unitName} ${context.tempo} BPM ein und klopfe ${pattern}; x markiert einen Anschlag, jeder Strich behält seine volle stille Dauer.`,
      ja: `${unitName}を${context.tempo} BPMに設定して${pattern}をたたき、xは打点、横線は省略せず保つ無音として扱います。`,
      "zh-Hans": `${unitName}设为${context.tempo} BPM并点击${pattern}；x表示起音，每条横线都要保留完整的无声时值。`,
    };
    return values[locale];
  }
  if (context.compare) {
    const pair = comparisonSpec(context);
    const sideA = displayedComparisonSide(pair, "A", locale);
    const sideB = displayedComparisonSide(pair, "B", locale);
    const values = {
      en: `Set ${context.tempo} BPM for ${unitName}, then compare A in ${sideA.root} ${sideA.scale} (${pair.a}) with B in ${sideB.root} ${sideB.scale} (${pair.b}).`,
      "pt-BR": `Ajuste ${context.tempo} BPM para ${unitName} e compare A em ${sideA.root} ${sideA.scale} (${pair.a}) com B em ${sideB.root} ${sideB.scale} (${pair.b}).`,
      es: `Ajusta ${context.tempo} BPM para ${unitName} y compara A en ${sideA.root} ${sideA.scale} (${pair.a}) con B en ${sideB.root} ${sideB.scale} (${pair.b}).`,
      de: `Stelle für ${unitName} ${context.tempo} BPM ein und vergleiche A in ${sideA.root} ${sideA.scale} (${pair.a}) mit B in ${sideB.root} ${sideB.scale} (${pair.b}).`,
      ja: `${unitName}を${context.tempo} BPMに設定し、Aの${sideA.root}${sideA.scale}（${pair.a}）とBの${sideB.root}${sideB.scale}（${pair.b}）を比べます。`,
      "zh-Hans": `${unitName}设为${context.tempo} BPM，比较A的${sideA.root}${sideA.scale}（${pair.a}）与B的${sideB.root}${sideB.scale}（${pair.b}）。`,
    };
    return values[locale];
  }
  const degrees = context.shape.degreeDisplay;
  if (context.unit.kind === "harmony") {
    const values = {
      en: `Set ${context.tempo} BPM for ${unitName}, play the four-chord loop twice, and place the ${context.root} ${scale} line ${degrees} across its changes.`,
      "pt-BR": `Ajuste ${context.tempo} BPM para ${unitName}, toque duas vezes o ciclo de quatro acordes e coloque a linha ${degrees} de ${context.root} ${scale} sobre as mudanças.`,
      es: `Ajusta ${context.tempo} BPM para ${unitName}, toca dos veces el ciclo de cuatro acordes y coloca la línea ${degrees} de ${context.root} ${scale} sobre los cambios.`,
      de: `Stelle für ${unitName} ${context.tempo} BPM ein, spiele die Vier-Akkord-Schleife zweimal und lege die Linie ${degrees} in ${context.root} ${scale} über die Wechsel.`,
      ja: `${unitName}を${context.tempo} BPMに設定し、4コードのループを2回弾いて、${context.root}${scale}のライン${degrees}を変化に重ねます。`,
      "zh-Hans": `${unitName}设为${context.tempo} BPM，把四和弦循环弹两遍，再将${context.root}${scale}线条${degrees}放在和弦变化上。`,
    };
    return values[locale];
  }
  const values = {
    en: `Set ${context.tempo} BPM for ${unitName}, hear ${context.root}, then play the ${context.root} ${scale} line ${degrees} once without stopping.`,
    "pt-BR": `Ajuste ${context.tempo} BPM para ${unitName}, ouça ${context.root} e toque uma vez, sem parar, a linha ${degrees} de ${context.root} ${scale}.`,
    es: `Ajusta ${context.tempo} BPM para ${unitName}, escucha ${context.root} y toca una vez, sin detenerte, la línea ${degrees} de ${context.root} ${scale}.`,
    de: `Stelle für ${unitName} ${context.tempo} BPM ein, höre ${context.root} und spiele die Linie ${degrees} in ${context.root} ${scale} einmal ohne Halt.`,
    ja: `${unitName}を${context.tempo} BPMに設定し、${context.root}を聴いてから、${context.root}${scale}のライン${degrees}を止まらず一度弾きます。`,
    "zh-Hans": `${unitName}设为${context.tempo} BPM，先听见${context.root}，再把${context.root}${scale}线条${degrees}不停顿地弹一遍。`,
  };
  return values[locale];
}

function purposeSentence(locale, context) {
  const summary = withoutFinalPunctuation(UNIT_SUMMARIES[context.unit.slug][locale]);
  const focus = context.plan.goalText[locale];
  const values = {
    en: `${summary}, concentrating on “${focus}.”`,
    "pt-BR": `${summary}, concentrando-se em “${focus}”.`,
    es: `${summary}, concentrándote en “${focus}”.`,
    de: `${summary} und achte dabei besonders auf „${focus}“.`,
    ja: `「${focus}」を聴き取りながら、${summary}。`,
    "zh-Hans": `围绕“${focus}”，${summary}。`,
  };
  return values[locale];
}

function diagnosisSentence(locale, context) {
  const [target, next] = actualDegreeTokens(context);
  const values = context.compare ? {
    en: `If the difference remains unclear, alternate only the first unequal event in A and B four times at ${context.slowTempo} BPM, then retry both complete lines.`,
    "pt-BR": `Se a diferença continuar incerta, alterne somente o primeiro evento desigual de A e B quatro vezes a ${context.slowTempo} BPM e retome as linhas completas.`,
    es: `Si la diferencia sigue sin estar clara, alterna solo el primer evento desigual de A y B cuatro veces a ${context.slowTempo} BPM y retoma las líneas completas.`,
    de: `Bleibt der Unterschied unklar, wechsle bei ${context.slowTempo} BPM viermal nur das erste ungleiche Ereignis von A und B und spiele dann beide Linien ganz.`,
    ja: `違いが不明瞭なら、AとBで最初に異なるイベントだけを${context.slowTempo} BPMで4回交互に鳴らし、その後で両方の全ラインへ戻ります。`,
    "zh-Hans": `若差别仍不清楚，就以${context.slowTempo} BPM交替四次A、B中第一个不同事件，再回到两条完整线。`,
  } : context.tap ? {
    en: `If a dash receives a tap, repeat one bar at ${context.slowTempo} BPM while the hand moves through every silent slot.`,
    "pt-BR": `Se um traço receber toque, repita um compasso a ${context.slowTempo} BPM mantendo a mão em movimento nos espaços silenciosos.`,
    es: `Si un guion recibe un golpe, repite un compás a ${context.slowTempo} BPM moviendo la mano durante cada silencio.`,
    de: `Erhält ein Strich einen Treffer, wiederhole einen Takt bei ${context.slowTempo} BPM mit durchgehender Handbewegung.`,
    ja: `横線をたたいたら、${context.slowTempo} BPMに下げ、無音の枠でも手を動かして1小節を反復します。`,
    "zh-Hans": `若在横线处误点，就降到${context.slowTempo} BPM重做一小节，所有无声格都保持手部运动。`,
  } : context.unit.kind === "harmony" ? {
    en: `If event ${target} misses a chord boundary, loop the preceding beat and its landing at ${context.slowTempo} BPM before restoring the four chords.`,
    "pt-BR": `Se o evento ${target} perder a fronteira do acorde, repita o tempo anterior e a chegada a ${context.slowTempo} BPM antes de retomar os quatro acordes.`,
    es: `Si el evento ${target} pierde el límite del acorde, repite el pulso anterior y la llegada a ${context.slowTempo} BPM antes de recuperar los cuatro acordes.`,
    de: `Verfehlt Ereignis ${target} die Akkordgrenze, übe Vorschlag und Landung bei ${context.slowTempo} BPM und stelle dann alle vier Akkorde wieder her.`,
    ja: `イベント${target}がコード境界を外れたら、直前の拍と着地を${context.slowTempo} BPMで反復してから4コードへ戻ります。`,
    "zh-Hans": `若事件${target}错过和弦边界，就以${context.slowTempo} BPM循环前一拍与落点，再恢复四个和弦。`,
  } : context.unit.kind === "phrase" ? {
    en: `If the ending changes, preserve the opening and repair only written events ${target}–${next}.`,
    "pt-BR": `Se o final mudar, preserve a abertura e corrija somente os eventos escritos ${target}–${next}.`,
    es: `Si cambia el final, conserva el inicio y corrige solo los eventos escritos ${target}–${next}.`,
    de: `Ändert sich der Schluss, behalte den Anfang und korrigiere nur die notierten Ereignisse ${target}–${next}.`,
    ja: `終わりが変わったら、冒頭を保ち、記譜イベント${target}–${next}だけを直します。`,
    "zh-Hans": `若结尾改变，就保留开头，只修正书写事件${target}–${next}。`,
  } : {
    en: `If events ${target}–${next} bend the pulse, isolate that three-event cell at ${context.slowTempo} BPM and repeat it evenly twice.`,
    "pt-BR": `Se os eventos ${target}–${next} deformarem a pulsação, isole essa célula de três eventos a ${context.slowTempo} BPM e iguale-a duas vezes.`,
    es: `Si los eventos ${target}–${next} doblan el pulso, aísla esa célula de tres eventos a ${context.slowTempo} BPM e iguálala dos veces.`,
    de: `Verbiegen Ereignis ${target}–${next} den Puls, isoliere die Dreiergruppe bei ${context.slowTempo} BPM und spiele sie zweimal gleichmäßig.`,
    ja: `イベント${target}–${next}が拍を崩したら、その3音だけを${context.slowTempo} BPMで切り出し、均等に2回つなぎます。`,
    "zh-Hans": `若事件${target}–${next}拉弯节拍，就以${context.slowTempo} BPM截取这个三音单元并均匀重复两次。`,
  };
  return values[locale];
}

function acceptanceSentence(locale, context) {
  const focus = context.plan.goalText[locale];
  const values = context.compare ? {
    en: `The comparison is ready when two blind choices for “${focus}” match playback and you can name the first event that separates A from B.`,
    "pt-BR": `A comparação está pronta quando duas escolhas sem rótulos de “${focus}” coincidirem com a reprodução e você nomear o primeiro evento que separa A de B.`,
    es: `La comparación está lista cuando dos elecciones sin etiquetas de “${focus}” coinciden con la reproducción y puedes nombrar el primer evento que separa A de B.`,
    de: `Der Vergleich sitzt, wenn zwei Entscheidungen ohne Etiketten zu „${focus}“ der Wiedergabe entsprechen und du das erste abweichende Ereignis benennen kannst.`,
    ja: `ラベルなしで「${focus}」を2回答え、両方が再生例と一致し、AとBを分ける最初のイベントを言えたら完了です。`,
    "zh-Hans": `隐藏标签后连续两次正确判断“${focus}”，并能说出区分A、B的第一个事件，比较才算完成。`,
  } : context.tap ? {
    en: `A clean result for “${focus}” has every x present, every dash silent, and the final attack centered at ${context.tempo} BPM.`,
    "pt-BR": `O resultado limpo de “${focus}” traz todos os x, todos os traços em silêncio e o ataque final centralizado a ${context.tempo} BPM.`,
    es: `Un resultado limpio de “${focus}” incluye todas las x, todos los guiones en silencio y el ataque final centrado a ${context.tempo} BPM.`,
    de: `Bei einem sauberen Ergebnis für „${focus}“ erklingt jedes x, jeder Strich bleibt still und der letzte Anschlag liegt bei ${context.tempo} BPM mittig.`,
    ja: `「${focus}」の合格条件は、${context.tempo} BPMですべてのxを打ち、横線を無音にし、最後の打点を拍の中央へ置くことです。`,
    "zh-Hans": `“${focus}”的清楚结果是：在${context.tempo} BPM下每个x都有输入、每条横线安静、最后一下位于拍点中央。`,
  } : context.unit.kind === "harmony" ? {
    en: `Record the loop twice; “${focus}” must place its chosen chord tone on all four boundaries without a late attack.`,
    "pt-BR": `Grave o ciclo duas vezes; “${focus}” deve colocar a nota de acorde escolhida nas quatro fronteiras sem ataque atrasado.`,
    es: `Graba el ciclo dos veces; “${focus}” debe colocar la nota de acorde elegida en los cuatro límites sin ataque tardío.`,
    de: `Nimm die Schleife zweimal auf; bei „${focus}“ muss der gewählte Akkordton ohne späten Anschlag auf allen vier Grenzen liegen.`,
    ja: `ループを2回録音し、「${focus}」で選んだコードトーンを遅れず4つの境界すべてに置けたら完了です。`,
    "zh-Hans": `把循环录两遍；“${focus}”所选和弦音必须不延迟地落在四个边界上。`,
  } : context.unit.kind === "phrase" ? {
    en: `Record the written duration twice; “${focus}” should remain audible while the opening, rests, and final event stay where they were planned.`,
    "pt-BR": `Grave duas vezes a duração escrita; “${focus}” deve continuar audível com abertura, pausas e evento final nos lugares planejados.`,
    es: `Graba dos veces la duración escrita; “${focus}” debe seguir audible con el inicio, los silencios y el evento final en sus lugares previstos.`,
    de: `Nimm die notierte Dauer zweimal auf; „${focus}“ bleibt hörbar, während Anfang, Pausen und Schlussereignis an ihren geplanten Stellen liegen.`,
    ja: `記譜された長さを2回録音し、冒頭、休符、最後のイベントを計画位置に保ったまま「${focus}」を聴かせます。`,
    "zh-Hans": `按写出长度录两遍；开头、休止和最后事件保持计划位置时，“${focus}”仍应清楚可听。`,
  } : {
    en: `Record two complete lines at ${context.tempo} BPM; “${focus}” must survive with equal written durations and a deliberate finish on ${context.root}.`,
    "pt-BR": `Grave duas linhas completas a ${context.tempo} BPM; “${focus}” deve permanecer com durações iguais às escritas e final deliberado em ${context.root}.`,
    es: `Graba dos líneas completas a ${context.tempo} BPM; “${focus}” debe mantenerse con las duraciones escritas y un final deliberado en ${context.root}.`,
    de: `Nimm zwei ganze Linien bei ${context.tempo} BPM auf; „${focus}“ muss bei notierten Dauern und bewusstem Schluss auf ${context.root} erhalten bleiben.`,
    ja: `${context.tempo} BPMで全ラインを2回録音し、記譜音価と${context.root}への明確な終わりを保ったまま「${focus}」を聴かせます。`,
    "zh-Hans": `以${context.tempo} BPM录两条完整线；保持书写时值并明确结束在${context.root}时，“${focus}”仍要清楚。`,
  };
  return values[locale];
}

function repairNoteSentence(locale, context) {
  const focus = context.plan.goalText[locale];
  const unitName = context.unit.titles[locale];
  const values = {
    en: `Review “${focus}” from one event before the first unstable connection instead of restarting ${unitName} from the top.`,
    "pt-BR": `Revise “${focus}” a partir de um evento antes da primeira ligação instável, sem reiniciar ${unitName} desde o começo.`,
    es: `Revisa “${focus}” desde un evento antes de la primera unión inestable, sin reiniciar ${unitName} desde el comienzo.`,
    de: `Prüfe „${focus}“ ab einem Ereignis vor der ersten instabilen Verbindung, statt ${unitName} von vorn zu beginnen.`,
    ja: `最初に崩れた接続の1音前から「${focus}」を直し、${unitName}を毎回冒頭からやり直さないようにします。`,
    "zh-Hans": `回听${unitName}时，先核对“${focus}”发生处的起音与时值，再从最早不准连接的前一个事件开始，以${context.slowTempo} BPM修正三次后接回完整线。`,
  };
  return values[locale];
}

function compactBodyEventTokens(value) {
  return String(value || "")
    .split(/[\s,]+/u)
    .map((event) => event.trim())
    .filter(Boolean);
}

function compactBodyFacts(locale, context) {
  const tapCue = locale === "en" && context.tap
    ? TAP_ENGLISH_BODY_CUES[context.lessonIndex]
    : null;
  const stage = tapCue?.stage || PLAN_STAGES[context.lessonIndex][locale];
  const material = UNIT_MATERIALS[context.unit.slug][locale];
  const bodyCue = PLAN_BODY_CUES[context.lessonIndex];
  const anchors = {
    stage,
    material,
    copyTag: locale === "en" ? ENGLISH_UNIT_TAGS[context.unit.slug] : "",
    evidenceCue: tapCue?.evidence || bodyCue.evidence[locale],
    repairCue: tapCue?.repair || bodyCue.repair[locale],
    resultCue: tapCue?.result || bodyCue.result[locale],
  };
  if (context.tap) {
    const pattern = TAP_PATTERNS[context.lessonIndex];
    const events = compactBodyEventTokens(pattern);
    const attacks = events.filter((event) => event.startsWith("x")).length;
    const rests = events.filter((event) => event.startsWith("-")).length;
    return {
      type: "tap",
      ...anchors,
      pattern,
      eventCount: events.length,
      attacks,
      rests,
      firstRest: Math.max(1, events.findIndex((event) => event.startsWith("-")) + 1),
    };
  }
  if (context.compare) {
    const pair = comparisonSpec(context);
    const sideA = displayedComparisonSide(pair, "A", locale);
    const sideB = displayedComparisonSide(pair, "B", locale);
    const aEvents = compactBodyEventTokens(pair.a);
    const bEvents = compactBodyEventTokens(pair.b);
    const sharedLength = Math.min(aEvents.length, bEvents.length);
    let differenceIndex = -1;
    for (let index = 0; index < sharedLength; index += 1) {
      if (aEvents[index] !== bEvents[index]) {
        differenceIndex = index;
        break;
      }
    }
    if (differenceIndex < 0 && aEvents.length !== bEvents.length) differenceIndex = sharedLength;
    return {
      type: "compare",
      ...anchors,
      pair: {
        ...pair,
        rootA: sideA.root,
        rootB: sideB.root,
      },
      aCount: aEvents.length,
      bCount: bEvents.length,
      differencePosition: Number.isInteger(pair.differencePosition)
        ? pair.differencePosition
        : differenceIndex < 0
          ? null
          : differenceIndex + 1,
      scaleA: sideA.scale,
      scaleB: sideB.scale,
    };
  }
  const events = compactBodyEventTokens(context.shape.degreeDisplay);
  const pitches = events
    .map((event) => event.split("/")[0])
    .filter((event) => /^(?:bb|##|b|#)?\d+$/u.test(event));
  const [target, next] = actualDegreeTokens(context);
  return {
    type: context.unit.kind === "harmony"
      ? "harmony"
      : context.unit.kind === "phrase" ? "phrase" : "scale",
    ...anchors,
    eventCount: events.length,
    firstPitch: pitches[0] || "1",
    lastPitch: pitches.at(-1) || "1",
    target,
    next,
    scale: SCALE_NAMES[context.scale][locale],
  };
}

function anchoredSetupSentence(locale, context, facts) {
  if (facts.type === "tap") {
    return text(
      `Set ${context.tempo} BPM and use the ${facts.material} for the ${facts.stage}: ${facts.pattern} gives ${facts.attacks} attacks and ${facts.rests} measured rests.`,
      `Ajuste ${context.tempo} BPM e use ${facts.material} na ${facts.stage}: ${facts.pattern} traz ${facts.attacks} ataques e ${facts.rests} pausas medidas.`,
      `Ajusta ${context.tempo} BPM y usa ${facts.material} en la ${facts.stage}: ${facts.pattern} tiene ${facts.attacks} ataques y ${facts.rests} silencios medidos.`,
      `Stelle ${context.tempo} BPM ein und nutze ${facts.material} im ${facts.stage}: ${facts.pattern} enthält ${facts.attacks} Anschläge und ${facts.rests} gemessene Pausen.`,
      `${context.tempo} BPMで${facts.material}の${facts.stage}を行い、${facts.pattern}の${facts.attacks}打点と${facts.rests}休符を確認します。`,
      `${facts.material}的${facts.stage}设为${context.tempo} BPM，先核对${facts.pattern}中的${facts.attacks}次起音和${facts.rests}个完整无声格。`
    )[locale];
  }
  if (facts.type === "compare") {
    return text(
      `Set ${context.tempo} BPM and use the ${facts.material} for the ${facts.stage}: A is ${facts.pair.rootA} ${facts.scaleA} with ${facts.aCount} notes; B is ${facts.pair.rootB} ${facts.scaleB} with ${facts.bCount}.`,
      `Ajuste ${context.tempo} BPM e use ${facts.material} na ${facts.stage}: A é ${facts.pair.rootA} ${facts.scaleA}, com ${facts.aCount} notas; B é ${facts.pair.rootB} ${facts.scaleB}, com ${facts.bCount}.`,
      `Ajusta ${context.tempo} BPM y usa ${facts.material} en la ${facts.stage}: A es ${facts.pair.rootA} ${facts.scaleA}, con ${facts.aCount} notas; B es ${facts.pair.rootB} ${facts.scaleB}, con ${facts.bCount}.`,
      `Stelle ${context.tempo} BPM ein und nutze ${facts.material} im ${facts.stage}: A ist ${facts.pair.rootA} ${facts.scaleA} mit ${facts.aCount} Tönen, B ist ${facts.pair.rootB} ${facts.scaleB} mit ${facts.bCount}.`,
      `${context.tempo} BPMで${facts.material}の${facts.stage}を行い、Aを${facts.pair.rootA}${facts.scaleA}の${facts.aCount}音、Bを${facts.pair.rootB}${facts.scaleB}の${facts.bCount}音として確認します。`,
      `${facts.material}的${facts.stage}设为${context.tempo} BPM，先确认A的${facts.pair.rootA}${facts.scaleA}有${facts.aCount}个事件，B的${facts.pair.rootB}${facts.scaleB}有${facts.bCount}个事件。`
    )[locale];
  }
  const boundary = facts.type === "harmony"
    ? text("across four chord boundaries", "sobre quatro fronteiras de acordes", "a través de cuatro límites de acorde", "über vier Akkordgrenzen", "4つのコード境界にまたがり", "跨过四个和弦边界")[locale]
    : text("in one uninterrupted card", "em um cartão sem interrupção", "en una tarjeta sin interrupción", "in einer ununterbrochenen Karte", "一枚のカードを止めずに", "在一张不中断的卡片中")[locale];
  return text(
    `Set ${context.tempo} BPM and use the ${facts.material} for the ${facts.stage}: ${facts.eventCount} notes in ${context.root} ${facts.scale} move from ${facts.firstPitch} to ${facts.lastPitch} ${boundary}.`,
    `Ajuste ${context.tempo} BPM e use ${facts.material} na ${facts.stage}: ${facts.eventCount} notas de ${context.root} ${facts.scale} vão de ${facts.firstPitch} a ${facts.lastPitch} ${boundary}.`,
    `Ajusta ${context.tempo} BPM y usa ${facts.material} en la ${facts.stage}: ${facts.eventCount} notas de ${context.root} ${facts.scale} van de ${facts.firstPitch} a ${facts.lastPitch} ${boundary}.`,
    `Stelle ${context.tempo} BPM ein und nutze ${facts.material} im ${facts.stage}: ${facts.eventCount} Töne in ${context.root} ${facts.scale} führen von ${facts.firstPitch} zu ${facts.lastPitch} ${boundary}.`,
    `${context.tempo} BPMで${facts.material}の${facts.stage}を行い、${context.root}${facts.scale}の${facts.eventCount}音を${facts.firstPitch}から${facts.lastPitch}まで${boundary}確認します。`,
    `${facts.material}的${facts.stage}设为${context.tempo} BPM，先确认${context.root}${facts.scale}的${facts.eventCount}个书写事件${boundary}，从${facts.firstPitch}走到${facts.lastPitch}。`
  )[locale];
}

function anchoredTaskSentence(locale, context, facts) {
  const task = taskInstruction(locale, context);
  return text(
    `For the ${facts.stage}, use the ${facts.material} this way: ${task}`,
    `Na ${facts.stage}, use ${facts.material} assim: ${task}`,
    `En la ${facts.stage}, usa ${facts.material} así: ${task}`,
    `Nutze ${facts.material} im ${facts.stage} so: ${task}`,
    `${facts.stage}では${facts.material}を使い、${task}`,
    `在${facts.stage}中用${facts.material}完成这项任务：${task}`
  )[locale];
}

function anchoredEvidenceSentence(locale, context, facts) {
  let clause;
  if (facts.type === "tap") {
    clause = text(
      `all ${facts.attacks} attacks appear, all ${facts.rests} silent slots remain empty, and the last slot does not drift`,
      `os ${facts.attacks} ataques aparecem, as ${facts.rests} pausas ficam vazias e o último espaço não deriva`,
      `aparecen los ${facts.attacks} ataques, los ${facts.rests} silencios quedan vacíos y el último espacio no se desplaza`,
      `alle ${facts.attacks} Anschläge erscheinen, alle ${facts.rests} Pausen leer bleiben und der letzte Platz nicht driftet`,
      `${facts.attacks}個の打点がすべて現れ、${facts.rests}個の無音枠に入力がなく、最後の枠までずれがないこと`,
      `${facts.attacks}次起音全部出现、${facts.rests}个无声格没有输入，而且最后一格没有逐渐漂移`
    )[locale];
  } else if (facts.type === "compare") {
    const clue = facts.differencePosition === null
      ? text("name the root or collection clue", "nomeie a pista de tônica ou coleção", "nombra la pista de raíz o colección", "nenne Grundton oder Tonsammlung als Hinweis", "主音か音集合の手掛かりを答えること", "说出根音或音集线索")[locale]
      : text(`name note ${facts.differencePosition} as the first A/B difference`, `nomeie a nota ${facts.differencePosition} como primeira diferença entre A e B`, `nombra la nota ${facts.differencePosition} como primera diferencia entre A y B`, `nenne Ton ${facts.differencePosition} als ersten Unterschied zwischen A und B`, `${facts.differencePosition}音目をAとBの最初の違いとして答えること`, `说出第${facts.differencePosition}个音是A、B的首个差异`)[locale];
    clause = text(
      `keep both labels covered to the end, then ${clue}`,
      `mantenha os rótulos cobertos até o fim e depois ${clue}`,
      `mantén las etiquetas tapadas hasta el final y después ${clue}`,
      `halte beide Etiketten bis zum Ende verdeckt und ${clue}`,
      `最後まで両方のラベルを隠し、${clue}`,
      `两张卡片结束前始终遮住标签，再${clue}`
    )[locale];
  } else if (facts.type === "harmony") {
    clause = text(
      `each of the four chord boundaries receives the written target, with the ${facts.target}–${facts.next} connection neither early nor late`,
      `cada uma das quatro fronteiras recebe o alvo escrito, sem adiantar nem atrasar a ligação ${facts.target}–${facts.next}`,
      `cada uno de los cuatro límites recibe el objetivo escrito, sin adelantar ni retrasar la unión ${facts.target}–${facts.next}`,
      `jede der vier Akkordgrenzen den notierten Zielton erhält und die Verbindung ${facts.target}–${facts.next} weder zu früh noch zu spät kommt`,
      `4つのコード境界すべてに記譜された目標音が入り、${facts.target}から${facts.next}の接続が早くも遅くもないこと`,
      `四个和弦边界都收到书写目标，而且${facts.target}到${facts.next}的连接既不提前也不延后`
    )[locale];
  } else if (facts.type === "phrase") {
    clause = text(
      `the opening, every written rest, and the final event keep their planned positions across all ${facts.eventCount} events`,
      `a abertura, cada pausa escrita e o evento final mantêm seus lugares planejados nos ${facts.eventCount} eventos`,
      `el inicio, cada silencio escrito y el evento final conservan sus lugares previstos en los ${facts.eventCount} eventos`,
      `Anfang, jede notierte Pause und Schlussereignis in allen ${facts.eventCount} Ereignissen an ihren geplanten Stellen bleiben`,
      `${facts.eventCount}イベントの冒頭、記譜された休符、最後の音がすべて計画位置に残ること`,
      `${facts.eventCount}个事件中的开头、每处书写休止与最后事件都留在计划位置`
    )[locale];
  } else {
    clause = text(
      `all ${facts.eventCount} written events retain their duration and the ${facts.target}–${facts.next} connection stays centered in the pulse`,
      `os ${facts.eventCount} eventos mantêm sua duração e a ligação ${facts.target}–${facts.next} fica no centro da pulsação`,
      `los ${facts.eventCount} eventos conservan su duración y la unión ${facts.target}–${facts.next} queda centrada en el pulso`,
      `alle ${facts.eventCount} notierten Ereignisse ihre Dauer behalten und die Verbindung ${facts.target}–${facts.next} mittig im Puls liegt`,
      `${facts.eventCount}イベントの音価が保たれ、${facts.target}から${facts.next}の接続が拍の中央に置かれること`,
      `${facts.eventCount}个书写事件都保持原时值，而且${facts.target}到${facts.next}的连接位于拍点中央`
    )[locale];
  }
  return text(
    `For the ${facts.evidenceCue}, record the ${facts.material} once and check that ${clause}.`,
    `Na ${facts.evidenceCue}, grave ${facts.material} uma vez e confira se ${clause}.`,
    `En la ${facts.evidenceCue}, graba ${facts.material} una vez y comprueba que ${clause}.`,
    `Nimm für die ${facts.evidenceCue} ${facts.material} einmal auf und prüfe, ob ${clause}.`,
    `${facts.evidenceCue}では${facts.material}を一度録音し、${clause}を確かめます。`,
    `为${facts.material}做一次${facts.evidenceCue}录音，再查看回放并具体确认${clause}。`
  )[locale];
}

function anchoredReviewSentence(locale, context, facts) {
  const review = withoutFinalPunctuation(reviewInstruction(locale, context));
  return text(
    `During the ${facts.stage}, ${lowerSentenceStart(review, locale)}; keep every written event unchanged while checking the ${facts.material}.`,
    `Durante a ${facts.stage}, ${lowerSentenceStart(review, locale)}; mantenha cada evento escrito intacto ao conferir ${facts.material}.`,
    `Durante la ${facts.stage}, ${lowerSentenceStart(review, locale)}; conserva intacto cada evento escrito al revisar ${facts.material}.`,
    `Im ${facts.stage}: ${review}; lass beim Prüfen von ${facts.material} jedes notierte Ereignis unverändert.`,
    `${facts.stage}では${facts.material}の記譜イベントを変えず、次の手順で結果を振り返ります：${review}。`,
    `在${facts.stage}中保持${facts.material}的书写事件不变，并按以下步骤复查结果：${review}。`
  )[locale];
}

function anchoredRepairSentence(locale, context, facts) {
  if (context.unit.slug === "sequence-workshop" && context.lessonIndex === 3) {
    return text(
      `If either peak catches, loop 3–4–3 or 4–5–4 twice at ${context.slowTempo} BPM, then restore the ${facts.material}.`,
      `Se algum pico prender, repita 3–4–3 ou 4–5–4 duas vezes a ${context.slowTempo} BPM e retome ${facts.material}.`,
      `Si algún pico se atasca, repite 3–4–3 o 4–5–4 dos veces a ${context.slowTempo} BPM y recupera ${facts.material}.`,
      `Hakt einer der Gipfel, wiederhole 3–4–3 oder 4–5–4 zweimal bei ${context.slowTempo} BPM und setze ${facts.material} wieder zusammen.`,
      `どちらかの頂点で引っかかったら、${context.slowTempo} BPMで3–4–3か4–5–4を2回反復し、${facts.material}全体へ戻します。`,
      `若任一高点卡住，就以${context.slowTempo} BPM把3–4–3或4–5–4重复两次，再恢复${facts.material}。`
    )[locale];
  }
  if (facts.type === "tap") {
    const pivot = facts.rests === 0
      ? text("attack 1", "ataque 1", "ataque 1", "Anschlag 1", "最初の打点", "第一次起音")[locale]
      : text(`rest ${facts.firstRest}`, `pausa ${facts.firstRest}`, `silencio ${facts.firstRest}`, `Pause ${facts.firstRest}`, `休符${facts.firstRest}`, `休止${facts.firstRest}`)[locale];
    return text(
      `If ${facts.repairCue} appears in the ${facts.material}, drop to ${context.slowTempo} BPM and loop four slots around ${pivot} until two tries match.`,
      `Se surgir ${facts.repairCue} em ${facts.material}, reduza para ${context.slowTempo} BPM e repita quatro espaços em torno de ${pivot} até duas tentativas coincidirem.`,
      `Si aparece ${facts.repairCue} en ${facts.material}, baja a ${context.slowTempo} BPM y repite cuatro espacios alrededor de ${pivot} hasta igualar dos intentos.`,
      `Zeigt ${facts.material} ${facts.repairCue}, gehe auf ${context.slowTempo} BPM und wiederhole vier Plätze um ${pivot}, bis zwei Versuche übereinstimmen.`,
      `${facts.material}で${facts.repairCue}が出たら${context.slowTempo} BPMに下げ、${pivot}の前後4枠を2回そろうまで反復します。`,
      `若${facts.material}出现${facts.repairCue}，就降到${context.slowTempo} BPM，循环${pivot}前后四格，直到两次间距完全一致。`
    )[locale];
  }
  if (facts.type === "compare") {
    const repair = facts.differencePosition === null
      ? text("sing both roots, then alternate the complete A and B cards twice", "cantar as duas tônicas e alternar duas vezes os cartões completos A e B", "cantar ambas raíces y alternar dos veces las tarjetas completas A y B", "beide Grundtöne zu singen und danach die ganzen Karten A und B zweimal abzuwechseln", "両方の主音を歌ってからAとBの全カードを2回交互に鳴らす", "先唱出两个根音，再把完整的A、B卡片交替两次")[locale]
      : text(`alternate only event ${facts.differencePosition} in A and B four times`, `alternar somente o evento ${facts.differencePosition} de A e B quatro vezes`, `alternar solo el evento ${facts.differencePosition} de A y B cuatro veces`, `nur Ereignis ${facts.differencePosition} von A und B viermal abzuwechseln`, `AとBのイベント${facts.differencePosition}だけを4回交互に鳴らす`, `只把A、B的事件${facts.differencePosition}交替四次`)[locale];
    return text(
      `If ${facts.repairCue} causes a wrong ${facts.material} choice, ${repair} at ${context.slowTempo} BPM, then replay both full cards.`,
      `Se ${facts.repairCue} causar erro em ${facts.material}, use ${context.slowTempo} BPM para ${repair} e depois retome os dois cartões.`,
      `Si ${facts.repairCue} causa un error en ${facts.material}, usa ${context.slowTempo} BPM para ${repair} y después recupera ambas tarjetas.`,
      `Führt ${facts.repairCue} bei ${facts.material} zur falschen Wahl, nutze ${context.slowTempo} BPM, um ${repair}, und spiele danach beide Karten ganz.`,
      `${facts.material}で${facts.repairCue}により誤答したら、${context.slowTempo} BPMで${repair}方法を使い、両方の全カードへ戻します。`,
      `若${facts.repairCue}导致${facts.material}判断错误，就以${context.slowTempo} BPM${repair}，然后恢复两张完整卡片。`
    )[locale];
  }
  const repair = facts.type === "harmony"
    ? text(`loop the beat before ${facts.target} and its landing on ${facts.next}`, `repita o tempo antes de ${facts.target} e sua chegada em ${facts.next}`, `repite el pulso anterior a ${facts.target} y su llegada en ${facts.next}`, `wiederhole den Schlag vor ${facts.target} und seine Landung auf ${facts.next}`, `${facts.target}の直前の拍と${facts.next}への着地だけを反復する`, `循环${facts.target}之前一拍及其到${facts.next}的落点`)[locale]
    : facts.type === "phrase"
      ? text(`keep the opening and repair only events ${facts.target}–${facts.next}`, `preserve a abertura e corrija somente os eventos ${facts.target}–${facts.next}`, `conserva el inicio y corrige solo los eventos ${facts.target}–${facts.next}`, `behalte den Anfang und repariere nur Ereignis ${facts.target}–${facts.next}`, `冒頭を保ってイベント${facts.target}から${facts.next}だけを直す`, `保留开头，只修正事件${facts.target}到${facts.next}`)[locale]
      : text(`isolate events ${facts.target}–${facts.next} and their preceding attack`, `isole os eventos ${facts.target}–${facts.next} e o ataque anterior`, `aísla los eventos ${facts.target}–${facts.next} y el ataque anterior`, `isoliere Ereignis ${facts.target}–${facts.next} samt vorherigem Anschlag`, `イベント${facts.target}から${facts.next}と直前のアタックを切り出す`, `截取事件${facts.target}到${facts.next}及其前一个起音`)[locale];
  return text(
    `If ${facts.repairCue} appears in the ${facts.material}, drop to ${context.slowTempo} BPM and ${repair}; restore the card after the repaired link stays even twice.`,
    `Se surgir ${facts.repairCue} em ${facts.material}, baixe para ${context.slowTempo} BPM e ${repair}; retome o cartão após duas correções regulares.`,
    `Si aparece ${facts.repairCue} en ${facts.material}, baja a ${context.slowTempo} BPM y ${repair}; recupera la tarjeta tras dos correcciones regulares.`,
    `Zeigt ${facts.material} ${facts.repairCue}, gehe auf ${context.slowTempo} BPM und ${repair}; setze die Karte nach zwei gleichmäßigen Korrekturen zusammen.`,
    `${facts.material}で${facts.repairCue}が出たら${context.slowTempo} BPMに下げ、${repair}方法で直し、2回均等になってから全体へ戻します。`,
    `若${facts.material}出现${facts.repairCue}，就降到${context.slowTempo} BPM并${repair}；连续两次均匀后才接回完整卡片。`
  )[locale];
}

function anchoredAcceptanceSentence(locale, context, facts) {
  let result;
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 0) {
    result = text(
      "the repeated pitch stays a temporary reference across two equal tritone spans, 1–4 and 4–1",
      "a altura repetida permanece uma referência temporária em dois trítonos iguais, 1–4 e 4–1",
      "la altura repetida sigue siendo una referencia temporal a través de dos tritonos iguales, 1–4 y 4–1",
      "der wiederholte Ton über zwei gleiche Tritonusspannen, 1–4 und 4–1, nur eine vorläufige Referenz bleibt",
      "反復音が1–4と4–1の等しい2つのトライトーンを通して一時的な基準だけになること",
      "重复音在1–4与4–1两个相等三全音跨度中只作为临时参照"
    )[locale];
  } else if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    result = text(
      "degrees one-three-five and two-four-six sound as two augmented triads within one whole-step cycle",
      "os graus um-três-cinco e dois-quatro-seis soam como duas tríades aumentadas no mesmo ciclo de tons",
      "los grados uno-tres-cinco y dos-cuatro-seis suenan como dos tríadas aumentadas dentro del mismo ciclo de tonos",
      "Stufe eins-drei-fünf und zwei-vier-sechs als zwei übermäßige Dreiklänge im selben Ganztonzyklus klingen",
      "1・3・5度と2・4・6度が一つの全音周期内の2つの増三和音として聴こえること",
      "一三五级与二四六级听成同一全音循环中的两个增三和弦"
    )[locale];
  } else if (context.unit.slug === "sequence-workshop" && context.lessonIndex === 3) {
    result = text(
      "two recorded passes keep 4–3 and 5–4 even, with no pause at the repeated degree two",
      "duas gravações mantêm 4–3 e 5–4 regulares, sem pausa no grau dois repetido",
      "dos grabaciones mantienen regulares 4–3 y 5–4, sin pausa en el grado dos repetido",
      "zwei Aufnahmen 4–3 und 5–4 gleichmäßig halten, ohne Pause an der wiederholten Stufe zwei",
      "2回の録音で4–3と5–4が均等になり、反復する2度で止まらないこと",
      "两次录音中的4–3与5–4都均匀，并且重复的二级处没有停顿"
    )[locale];
  } else if (facts.type === "tap") {
    result = text(
      `two complete passes each contain exactly ${facts.attacks} attacks, ${facts.rests} silent slots, and no drift after the final x`,
      `duas passagens completas têm exatamente ${facts.attacks} ataques, ${facts.rests} espaços silenciosos e nenhum desvio após o último x`,
      `dos pasadas completas contienen exactamente ${facts.attacks} ataques, ${facts.rests} espacios silenciosos y ningún desvío tras la última x`,
      `zwei ganze Durchgänge genau ${facts.attacks} Anschläge, ${facts.rests} stille Plätze und kein Driften nach dem letzten x enthalten`,
      `2回の全通しで${facts.attacks}個の打点と${facts.rests}個の無音枠が一致し、最後のxの後にもずれがないこと`,
      `两次完整演奏都恰有${facts.attacks}次起音和${facts.rests}个无声格，而且最后一个x之后没有漂移`
    )[locale];
  } else if (facts.type === "compare") {
    const clue = facts.differencePosition === null
      ? text("the changed root or collection", "a tônica ou coleção alterada", "la raíz o colección modificada", "den geänderten Grundton oder die Tonsammlung", "変わった主音または音集合", "改变的根音或音集")[locale]
      : text(`the change at event ${facts.differencePosition}`, `a mudança no evento ${facts.differencePosition}`, `el cambio del evento ${facts.differencePosition}`, `die Änderung bei Ereignis ${facts.differencePosition}`, `イベント${facts.differencePosition}の変化`, `事件${facts.differencePosition}的变化`)[locale];
    result = text(
      `two blind choices match playback and you can name ${clue} without hearing either card again`,
      `duas escolhas sem rótulo coincidem com a reprodução e você nomeia ${clue} sem ouvir os cartões novamente`,
      `dos elecciones sin etiqueta coinciden con la reproducción y puedes nombrar ${clue} sin oír otra vez las tarjetas`,
      `zwei Entscheidungen ohne Etikett der Wiedergabe entsprechen und du ${clue} ohne erneutes Hören benennen kannst`,
      `ラベルなしの判定が2回再生と一致し、カードを聴き直さず${clue}を言えること`,
      `两次盲选都与播放一致，而且无需重听就能说出${clue}`
    )[locale];
  } else if (facts.type === "harmony") {
    result = text(
      `two loops place the chosen target on all four chord boundaries and preserve the ${facts.target}–${facts.next} connection`,
      `dois ciclos colocam o alvo escolhido nas quatro fronteiras e preservam a ligação ${facts.target}–${facts.next}`,
      `dos ciclos colocan el objetivo elegido en los cuatro límites y conservan la unión ${facts.target}–${facts.next}`,
      `zwei Schleifen den Zielton auf alle vier Akkordgrenzen setzen und die Verbindung ${facts.target}–${facts.next} erhalten`,
      `2回のループで選んだ目標音が4つの境界すべてに入り、${facts.target}から${facts.next}の接続も保たれること`,
      `两个循环都把所选目标放在四个边界上，并保持${facts.target}到${facts.next}的连接`
    )[locale];
  } else if (facts.type === "phrase") {
    result = text(
      `two takes preserve the planned opening, rests, contour, and final event across all ${facts.eventCount} written events`,
      `duas tomadas preservam abertura, pausas, contorno e evento final nos ${facts.eventCount} eventos escritos`,
      `dos tomas conservan el inicio, los silencios, el contorno y el evento final en los ${facts.eventCount} eventos escritos`,
      `zwei Takes Anfang, Pausen, Verlauf und Schluss in allen ${facts.eventCount} notierten Ereignissen erhalten`,
      `2回の録音で${facts.eventCount}イベントの冒頭、休符、輪郭、最後の音が計画どおり保たれること`,
      `两次录音都按计划保留${facts.eventCount}个事件的开头、休止、轮廓与最后事件`
    )[locale];
  } else {
    result = text(
      `two takes keep all ${facts.eventCount} written durations even, connect ${facts.target} to ${facts.next}, and finish deliberately on ${context.root}`,
      `duas tomadas mantêm as ${facts.eventCount} durações regulares, ligam ${facts.target} a ${facts.next} e terminam de propósito em ${context.root}`,
      `dos tomas mantienen regulares las ${facts.eventCount} duraciones, conectan ${facts.target} con ${facts.next} y terminan de forma deliberada en ${context.root}`,
      `zwei Takes alle ${facts.eventCount} Dauern gleichmäßig halten, ${facts.target} mit ${facts.next} verbinden und bewusst auf ${context.root} enden`,
      `2回の録音で${facts.eventCount}イベントの音価を均等に保ち、${facts.target}から${facts.next}をつないで${context.root}へ明確に終わること`,
      `两次录音都让${facts.eventCount}个事件时值均匀、连接${facts.target}到${facts.next}，并明确结束在${context.root}`
    )[locale];
  }
  if (locale === "en") return variedEnglishAcceptanceSentence(context, facts, result);
  return text(
    `A take qualifies for ${facts.resultCue} on the ${facts.material} when ${result}; note one remaining flaw.`,
    `Marque ${facts.resultCue} em ${facts.material} como resultado válido quando ${result}; anote uma falha restante.`,
    `Marca ${facts.resultCue} en ${facts.material} como resultado válido cuando ${result}; anota un fallo restante.`,
    `Werte ${facts.resultCue} bei ${facts.material} als geschafft, wenn ${result}; notiere einen verbleibenden Fehler.`,
    `${facts.material}の${facts.resultCue}は、${result}なら合格とし、残る誤差を一つ書きます。`,
    `${facts.material}的${facts.resultCue}只有在${result}时才算完成，并记下下一次仍要修正的第一个具体事件。`
  )[locale];
}

function variedEnglishSetupSentence(context, facts) {
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 0) {
    return `At ${context.tempo} BPM, treat the first pitch as a temporary marker in the ${facts.material}. Play 1–4–1 as two equal tritone spans, not as a tonic cadence.`;
  }
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    return `At ${context.tempo} BPM, split the ${facts.material} into 1–3–5 and 2–4–6. Those partitions are two augmented triads inside one whole-step cycle.`;
  }
  if (facts.type === "tap") {
    return `Start the ${facts.material}'s ${facts.stage} at ${context.tempo} BPM. Its pattern ${facts.pattern} contains ${facts.attacks} attacks and ${facts.rests} silent slots.`;
  }
  if (facts.type === "compare") {
    return `Open the ${facts.material}'s ${facts.stage} at ${context.tempo} BPM; A uses ${facts.pair.rootA} ${facts.scaleA} on the ${facts.material}, while B uses ${facts.pair.rootB} ${facts.scaleB} on that ${facts.material}.`;
  }
  if (facts.type === "harmony") {
    return `Lay the ${facts.material} at ${context.tempo} BPM during the ${facts.stage}; cross four ${facts.material} boundaries, and keep ${facts.firstPitch}–${facts.lastPitch} inside that ${facts.material} without a barline reset.`;
  }
  if (facts.type === "phrase") {
    return `Shape the ${facts.material} at ${context.tempo} BPM during the ${facts.stage}; that ${facts.material} keeps ${facts.firstPitch}–${facts.lastPitch}, while every planned rest stays inside the ${facts.material}.`;
  }
  return `Put the ${facts.material} at ${context.tempo} BPM for the ${facts.stage}; in ${context.root} ${facts.scale}, that ${facts.material} holds ${facts.eventCount} events, and the ${facts.material} route is ${facts.firstPitch}–${facts.lastPitch}.`;
}

function variedEnglishTaskSentence(context, facts) {
  const task = withoutFinalPunctuation(taskInstruction("en", context));
  return `${task}.`;
}

function variedEnglishEvidenceSentence(context, facts) {
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 0) {
    return `Use the ${facts.evidenceCue} on the ${facts.material}: both 1–4 and 4–1 must span the same tritone, with the repeated pitch acting only as a temporary reference.`;
  }
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    return `Record the ${facts.material} once for its partition check. The first three attacks must form 1–3–5; the next three must answer with 2–4–6.`;
  }
  if (facts.type === "tap") {
    return `For the ${facts.material}, read the ${facts.evidenceCue}: it must show ${facts.attacks} attacks, ${facts.rests} empty slots, and no drift after the last x.`;
  }
  if (facts.type === "compare") {
    const clue = facts.differencePosition === null
      ? `${facts.material}'s changed root or collection`
      : `${facts.material}'s change at event ${facts.differencePosition}`;
    return `For the ${facts.material}, keep labels hidden through the ${facts.evidenceCue}; name ${clue}, then return to the ${facts.material} with labels visible.`;
  }
  if (facts.type === "harmony") {
    return `For the ${facts.material}, use the ${facts.evidenceCue}; each ${facts.material} boundary receives its target in the ${facts.stage}, and the ${facts.material} keeps ${facts.target}–${facts.next} on time.`;
  }
  if (facts.type === "phrase") {
    return `For the ${facts.material}, use the ${facts.evidenceCue}; the ${facts.material} opening stays fixed in the ${facts.stage}, while its rests and ending remain planned.`;
  }
  return `For the ${facts.material}, use the ${facts.evidenceCue}; written lengths hold through the ${facts.stage}, and the ${facts.material} keeps ${facts.target}–${facts.next} centered.`;
}

function englishReviewSentence(context, facts) {
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    return `Play 1–3–5, then 2–4–6, without leaning on either partition as a tonic. Repeat the ${facts.material} with both augmented triads equally weighted.`;
  }
  if (facts.type === "tap") {
    return [
      `Count one bar before touching the ${facts.material}; repeat its ${facts.stage} only if the first x lands squarely on beat one.`,
      `Tap the ${facts.material} once aloud and once silently; its ${facts.stage} should keep all eight attacks equally spaced.`,
      `Count both beats around every ${facts.material} attack; repeat that ${facts.material} without clipping a hold or its following silence.`,
      `Speak eighth-note subdivisions over the ${facts.material}; let that ${facts.material} place every x at the grid's midpoint or edge.`,
      `Count each dash in the ${facts.material}; re-enter that ${facts.material} only when the next x reaches its written slot.`,
      `Keep the hand moving across both ${facts.material} silences; let that ${facts.material} return without stealing time from either gap.`,
      `Count silent downbeats under the ${facts.material}; that ${facts.material} should sound only on the written offbeat x positions.`,
      `Repeat the ${facts.material} four times while its taps stay fixed; only the ${facts.material} accent may travel.`,
      `Run the ${facts.material} at all three speeds; its ${facts.stage} must retain the same attack and rest positions.`,
      `Record two bars of the ${facts.material} without watching the cursor; compare that ${facts.material}'s first and final pulse positions.`,
    ][context.lessonIndex];
  }
  if (context.lessonIndex === 6) {
    if (facts.type === "compare") {
      return `Sing the first changed ${facts.material} event, then choose A or B on that ${facts.material} before replay.`;
    }
    if (facts.type === "harmony") {
      return `Sing the ${facts.material}'s chord target first; let the next ${facts.material} boundary confirm that same target.`;
    }
    if (facts.type === "phrase") {
      return `Name the ${facts.material}'s high point first; play it once and keep every earlier ${facts.material} event below it.`;
    }
    return `Sing the ${facts.material}'s target from its starting pitch, then play that ${facts.material} and name the release.`;
  }
  return [
    `Play the ${facts.material} once; mute it, then rebuild the ${facts.material} opening and return from memory.`,
    `Give the ${facts.material} three passes: count that ${facts.material} aloud, then whisper it; finish with internal time.`,
    `Hear the last ${facts.material} event first; work backward through that ${facts.material}, then restore it at ${context.tempo} BPM.`,
    `Inside the ${facts.material}, alternate its last rise with its first fall; restore that ${facts.material} after two clean joins.`,
    `Record the ${facts.material} plain, then give that ${facts.material} one light grouping accent. Both ${facts.material} versions must keep an identical pulse.`,
    `Speak the ${facts.material}'s grouping first, then fit that ${facts.material} beneath the count. Let each cell overlap its neighbor.`,
    null,
    `Count every ${facts.material} rest with your hand moving. Re-enter the ${facts.material} softly once, then once at normal volume.`,
    `Run the ${facts.material} at all three speeds. If its timing changes, repair one ${facts.material} cell before the full pattern resumes.`,
    `Record the ${facts.material} without the cursor. During playback, name one ${facts.material} success and its next repair.`,
  ][context.lessonIndex];
}

function variedEnglishRepairSentence(context, facts) {
  if (context.unit.slug === "sequence-workshop" && context.lessonIndex === 3) {
    return `If either peak catches, loop 3–4–3 or 4–5–4 twice at ${context.slowTempo} BPM, then restore the ${facts.material}.`;
  }
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    return `If one augmented triad starts to sound final, slow the ${facts.material} to ${context.slowTempo} BPM. Alternate 1–3–5 with 2–4–6 at equal weight.`;
  }
  if (facts.type === "tap") {
    const pivot = facts.rests === 0 ? "first attack" : `rest ${facts.firstRest}`;
    return `When the ${facts.repairCue} appears, set the ${facts.material} to ${context.slowTempo} BPM. Loop four slots around the ${pivot}; restore the ${facts.stage} after two matches.`;
  }
  if (facts.type === "compare") {
    if (facts.differencePosition === null) {
      return `A wrong ${facts.material} choice needs a root check at ${context.slowTempo} BPM. Sing both ${facts.material} roots, alternate the full cards, then return to that ${facts.material}.`;
    }
    return `A wrong ${facts.material} choice needs event ${facts.differencePosition} at ${context.slowTempo} BPM. Alternate that ${facts.material} event four times, then replay the full ${facts.material}.`;
  }
  if (facts.type === "harmony") {
    return `If ${facts.target} misses a ${facts.material} boundary, slow to ${context.slowTempo} BPM. Loop its preceding beat and landing, then restore the ${facts.material} after two aligned entries.`;
  }
  if (facts.type === "phrase") {
    return `If ${facts.target}–${facts.next} changes the ${facts.material}'s opening, keep that opening fixed. At ${context.slowTempo} BPM, repair those ${facts.material} events before restoring the full ${facts.material}.`;
  }
  return `If ${facts.target}–${facts.next} bends the ${facts.material}, pause the full line. At ${context.slowTempo} BPM, isolate the ${facts.material}'s preceding attack; rejoin that ${facts.material} after two even links.`;
}

function variedEnglishAcceptanceSentence(context, facts, result) {
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 0) {
    return `Keep the ${facts.material} take when both 1–4 and 4–1 remain equal tritone spans. The repeated pitch is a temporary reference, not an intrinsic tonic.`;
  }
  if (context.unit.slug === "symmetric-scales" && context.lessonIndex === 6) {
    return `Keep the ${facts.material} take when 1–3–5 and 2–4–6 register as two equal augmented-triad partitions. Neither partition may claim a privileged resolution.`;
  }
  if (facts.type === "tap") {
    return `Two ${facts.material} passes prove ${facts.resultCue} when their ${facts.attacks} attacks and ${facts.rests} silent slots match. Keep the steadier ${facts.stage}.`;
  }
  if (facts.type === "compare") {
    const clue = facts.differencePosition === null
      ? "its changed root or collection"
      : `its change at event ${facts.differencePosition}`;
    return `Two blind ${facts.material} choices prove ${facts.resultCue} after matching playback twice. During the ${facts.stage}, name ${clue} from that ${facts.material} before uncovering labels.`;
  }
  if (facts.type === "harmony") {
    return `Two ${facts.material} loops prove ${facts.resultCue} when every ${facts.material} boundary receives its target. The ${facts.stage} must keep that ${facts.material} ${facts.target}–${facts.next} link intact.`;
  }
  if (facts.type === "phrase") {
    return `Two ${facts.material} takes prove ${facts.resultCue} when the ${facts.material} opening stays fixed. The ${facts.stage} must preserve that ${facts.material}'s rests, contour, and ending.`;
  }
  return `Two ${facts.material} takes prove ${facts.resultCue} when the ${facts.stage} keeps every ${facts.material} duration and ${facts.target}–${facts.next} even. Both ${facts.material} takes must end on ${context.root}.`;
}

function conciseAnchoredTaskSentence(locale, context, facts) {
  const task = taskInstruction(locale, context);
  const splitJapaneseTask = locale === "ja"
    && context.unit.slug === "harmonic-minor-in-practice"
    && (context.lessonIndex === 3 || context.lessonIndex === 6);
  return text(
    `${facts.material} — ${facts.evidenceCue}: ${task}`,
    `${facts.material} — ${facts.evidenceCue}: ${task}`,
    `${facts.material} — ${facts.evidenceCue}: ${task}`,
    `${facts.material} — ${facts.evidenceCue}: ${task}`,
    splitJapaneseTask
      ? `${facts.material}・${facts.evidenceCue}。${task}`
      : `${facts.material}・${facts.evidenceCue}：${task}`,
    `${facts.material}·${facts.evidenceCue}：${task}`
  )[locale];
}

function needsRawCompactReview(locale, context) {
  const key = `${context.unit.slug}:${context.lessonIndex}`;
  const exceptions = {
    "pt-BR": new Set(["modes-by-color-note:6", "melodic-minor-map:6"]),
    es: new Set([
      "modes-by-color-note:2",
      "modes-by-color-note:3",
      "modes-by-color-note:6",
      "melodic-minor-map:3",
      "melodic-minor-map:6",
    ]),
    ja: new Set([
      "melodic-minor-map:3",
      "harmonic-minor-in-practice:3",
      "harmonic-minor-in-practice:6",
    ]),
  };
  return exceptions[locale]?.has(key) || false;
}

function omitEnglishEvidence(context) {
  if (context.unit.slug === "rhythm-inside-the-scale") return true;
  const key = `${context.unit.slug}:${context.lessonIndex}`;
  return new Set([
    "sequence-workshop:3",
    "land-on-chord-tones:1",
    "land-on-chord-tones:3",
    "land-on-chord-tones:6",
    "harmonic-minor-in-practice:0",
    "harmonic-minor-in-practice:1",
    "harmonic-minor-in-practice:3",
    "harmonic-minor-in-practice:6",
    "chromatic-approaches:1",
    "chromatic-approaches:3",
    "chromatic-approaches:6",
  ]).has(key);
}

function englishFlowVariant(context) {
  const unitIndex = UNITS.findIndex((unitDefinition) => unitDefinition.slug === context.unit.slug);
  return (unitIndex + context.lessonIndex) % 3;
}

function conciseEnglishTask(context, facts) {
  const material = facts.material;
  const stage = facts.stage;
  const tasks = {
    scale: [
      `Anchor ${material} on ${context.root}; sing that root before the ${stage} begins, then enter without chasing the reference.` ,
      `Climb through ${material} with equal values; keep the ${stage} inside the pulse and let the highest event arrive without an accent.`,
      `Hear the top of ${material} first; descend through the ${stage} to ${context.root}, preserving the final event's complete value.`,
      `Join the two halves of ${material}; loop its turning seam during the ${stage} until neither direction creates an extra gap.`,
      `Accent each third-pair in ${material} once; move that emphasis during the ${stage} while every unaccented event keeps its duration.`,
      `Count three over ${material}; preserve the overlap through the ${stage}, so each new group begins before the prior shape feels detached.`,
      `Hold ${material}'s marked color event; during the ${stage}, hear the following pitch answer without forcing either event louder.`,
      `Count the written dash in ${material}; enter the ${stage} after its full silence, with the hand still tracing the pulse.`,
      `Run ${material} at the three written tempos; stop when the ${stage} changes its attack, duration, or movement plan.`,
      `Record ${material} without the cursor; preserve one ${stage} movement plan and name the first event that needs another pass.`,
    ],
    tap: [
      `Count one bar for ${material}; begin the ${stage} on beat one and keep the count moving after the first attack.`,
      `Tap every x in ${material}; let the ${stage} distribute all attacks evenly instead of correcting a late hit with a rush.`,
      `Count both beats around ${material}; keep each ${stage} hold complete and leave the following silent slot untouched.`,
      `Speak eighth-note subdivisions over ${material}; place every ${stage} attack on its written half-beat without changing the hand motion.`,
      `Say tap or rest through ${material}; the ${stage} must preserve every dash before the next x enters.`,
      `Move the hand through both silences in ${material}; let the ${stage} return without borrowing time from either gap.`,
      `Count silent downbeats beneath ${material}; sound the ${stage} only at its written offbeat x positions.`,
      `Repeat ${material} four times with fixed taps; during the ${stage}, move only the accent from one x to the next.`,
      `Use three tempos for ${material}; keep the ${stage} grid unchanged while touch and motion remain comfortably small.`,
      `Record two bars of ${material}; compare the ${stage}'s first pulse with its last and reject any accumulating drift.`,
    ],
    compare: [
      `Hold one reference beneath ${material}; in the ${stage}, choose the side whose center remains convincing after the final event.`,
      `Sing the predicted first pitch for ${material}; reveal the ${stage} only after the sung note is steady and correctly placed.`,
      `Locate the first changed event in ${material}; during the ${stage}, name its interval or degree before replaying either side.`,
      `Trace both contours in ${material}; keep the ${stage} rhythm fixed, then judge only the direction that separates A from B.`,
      `Name the target degree in ${material}; use the ${stage} to check its position without relying on the displayed collection name.`,
      `Copy A's rhythm inside ${material}; make the ${stage} preserve every duration while B changes only the written pitch material.`,
      `Predict the omitted ending of ${material}; complete the ${stage} before playback, then compare only the final written events.`,
      `Move ${material} to the second root; let the ${stage} retain its intervals, contour, and rhythm rather than copying absolute pitches.`,
      `Hide both labels for ${material}; answer during the ${stage}, then uncover the cards and state the audible clue.`,
      `Hear ${material} once without touching playback again; reproduce the ${stage} and identify one exact mismatch from memory.`,
    ],
    harmony: [
      `Hear each change under ${material}; start the ${stage} exactly with the new chord and name the target before continuing.`,
      `Place every root in ${material}; let the ${stage} land on each boundary without detaching the approach from its arrival.`,
      `Aim each third in ${material}; during the ${stage}, hear chord quality before moving toward the next boundary.`,
      `Land on each fifth in ${material}; keep the ${stage} attack connected so the target sounds like part of one line.`,
      `Approach each ${material} target from below; make the ${stage} resolve on time without lengthening the chromatic neighbor.`,
      `Approach each ${material} target from above; preserve the ${stage} pulse and give the landing its written duration.`,
      `Find a common tone inside ${material}; hold it through the ${stage} boundary while the surrounding harmony changes.`,
      `Connect the nearest tones in ${material}; let the ${stage} cross two chords without resetting at the barline.`,
      `Carry one deliberate line through ${material}; the ${stage} must place a chord tone on all four changes.`,
      `Record the complete ${material} loop; keep one ${stage} target strategy from the first chord through the last.`,
    ],
    phrase: [
      `Use the first events of ${material} as a question; stop the ${stage} away from the tonic and leave room for an answer.`,
      `Answer the opening of ${material} briefly; make the ${stage} close on purpose without adding an unrelated second idea.`,
      `Repeat one rhythm throughout ${material}; let the ${stage} vary pitch contour while every copied duration stays recognizable.`,
      `Copy the opening of ${material} exactly; during the ${stage}, change only the last two events and preserve the setup.`,
      `Protect one complete beat of silence in ${material}; keep counting through the ${stage} before the next event enters.`,
      `Begin ${material} away from its tonic; let the ${stage} withhold the root until the latter part of the phrase.`,
      `Choose one highest event in ${material}; shape the ${stage} toward it once, then leave enough space for the descent.`,
      `Answer ${material} in a lower register; preserve the ${stage} rhythm and direction while changing only its range.`,
      `Shape four bars from ${material}; use the ${stage} for statement, repeat, answer, and ending without extra filler.`,
      `Build eight bars from ${material}; return to its opening during the ${stage}'s final bar and finish deliberately.`,
    ],
  };
  const type = facts.type === "ear" ? "compare" : facts.type;
  return tasks[type][context.lessonIndex];
}

function naturalEnglishParagraphs(context, facts) {
  const evenVariant = context.lessonIndex % 2 === 0;
  const setupLead = [
    `${facts.material} begins a ${facts.copyTag} ${facts.stage}, using ${context.tempo} BPM`,
    `${facts.stage} places ${facts.material} at ${context.tempo} BPM with ${facts.copyTag} timing`,
    `At ${context.tempo} BPM, ${facts.material} enters its ${facts.copyTag} ${facts.stage}`,
    `Prepare ${facts.material} for a ${facts.copyTag} ${facts.stage}, using ${context.tempo} BPM`,
    `With ${facts.material} prepared, set ${context.tempo} BPM and run its ${facts.copyTag} ${facts.stage}`,
    `For ${facts.material}, start a ${facts.copyTag} ${facts.stage} on a ${context.tempo} BPM metronome`,
    `${facts.stage} checks ${facts.material} with ${facts.copyTag} detail against a ${context.tempo} BPM pulse`,
    `Inside ${facts.stage}, keep ${facts.material} ${facts.copyTag} at ${context.tempo} BPM`,
    `${facts.material} uses ${context.tempo} BPM throughout its ${facts.copyTag} ${facts.stage}`,
    `Record a ${facts.copyTag} ${facts.stage} for ${facts.material} against a ${context.tempo} BPM click track`,
  ][context.lessonIndex];
  const repairLead = [
    `${facts.repairCue} sends ${facts.material} into ${facts.copyTag} work at ${context.slowTempo} BPM for the ${facts.stage}`,
    `At ${facts.repairCue}, rehearse ${facts.material} with ${facts.copyTag} care near ${context.slowTempo} BPM inside the ${facts.stage}`,
    `When ${facts.repairCue} appears, ${facts.stage} slows its ${facts.copyTag} ${facts.material} to ${context.slowTempo} BPM`,
    `${facts.stage} treats ${facts.repairCue} by moving ${facts.copyTag} ${facts.material} to ${context.slowTempo} BPM`,
    `Repair ${facts.repairCue} on ${facts.material} with ${facts.copyTag} detail at ${context.slowTempo} BPM during the ${facts.stage}`,
    `${facts.material} answers ${facts.repairCue} with ${facts.copyTag} work at ${context.slowTempo} BPM within the ${facts.stage}`,
    `For ${facts.repairCue}, place ${facts.copyTag} ${facts.material} at ${context.slowTempo} BPM in the ${facts.stage}`,
    `Inside ${facts.stage}, correct ${facts.repairCue} on ${facts.copyTag} ${facts.material} at ${context.slowTempo} BPM`,
    `${facts.repairCue} lowers ${facts.material} to ${context.slowTempo} BPM before the ${facts.copyTag} ${facts.stage} returns`,
    `Playback marks ${facts.repairCue}; set ${facts.copyTag} ${facts.material} near ${context.slowTempo} BPM for the ${facts.stage}`,
  ][context.lessonIndex];
  const ownedRepairLead = `${facts.material}: ${repairLead}`;
  let setup;
  let evidence;
  let repair;
  let proof;
  if (facts.type === "tap") {
    setup = `${setupLead}; ${facts.material} shows ${facts.pattern}, with ${facts.attacks} ${facts.copyTag} attacks and ${facts.rests} silent slots in the ${facts.stage}.`;
    evidence = `Check ${facts.material} with ${facts.evidenceCue}; the ${facts.stage} needs ${facts.attacks} ${facts.copyTag} attacks, ${facts.rests} empty slots, and no drift after its final x.`;
    const pivot = facts.rests === 0 ? "first attack" : `rest position ${facts.firstRest}`;
    repair = `${ownedRepairLead}; loop four ${facts.material} slots around the ${pivot}, then retest the ${facts.stage}.`;
    proof = `For ${facts.material}, accept ${facts.resultCue}; two ${facts.copyTag} ${facts.stage} passes need matching attacks, silences, and total bar length.`;
  } else if (facts.type === "compare") {
    setup = evenVariant
      ? `${setupLead}; the ${facts.copyTag} A side of ${facts.material} is ${facts.pair.rootA} ${facts.scaleA}, while its B side is ${facts.pair.rootB} ${facts.scaleB} in the ${facts.stage}.`
      : `${setupLead}; ${facts.material} uses ${facts.pair.rootA} ${facts.scaleA} for its ${facts.copyTag} A side and ${facts.pair.rootB} ${facts.scaleB} for B inside the ${facts.stage}.`;
    const clue = facts.differencePosition === null
      ? "changed root or collection"
      : `change at event ${facts.differencePosition}`;
    evidence = evenVariant
      ? `Check ${facts.material} with ${facts.evidenceCue}; hide its labels, then let the ${facts.copyTag} ${facts.stage} identify the ${clue} before playback.`
      : `Check ${facts.material} with ${facts.evidenceCue}; listen without names, then ask the ${facts.copyTag} ${facts.stage} to identify the ${clue} before playback.`;
    repair = evenVariant
      ? `${ownedRepairLead}; alternate the ${facts.material} ${clue} four times, then replay the ${facts.stage} in full.`
      : `${ownedRepairLead}; loop the ${facts.material} ${clue} for four A/B pairs, then hear the complete ${facts.stage}.`;
    proof = evenVariant
      ? `For ${facts.material}, accept ${facts.resultCue}; two blind ${facts.copyTag} ${facts.stage} answers must match and cite the same audible clue.`
      : `For ${facts.material}, accept ${facts.resultCue}; repeat the blind ${facts.copyTag} choice twice, naming the same clue after each ${facts.stage}.`;
  } else if (facts.type === "harmony") {
    setup = `${setupLead}; ${facts.material} carries ${facts.eventCount} events; its ${facts.copyTag} ${facts.stage} crosses four chord boundaries from ${facts.firstPitch} through ${facts.copyTag} motion to ${facts.lastPitch}.`;
    evidence = evenVariant
      ? `Check ${facts.material} with ${facts.evidenceCue}; the ${facts.copyTag} link from ${facts.target} to ${facts.next} must reach each ${facts.stage} boundary on time.`
      : `Check ${facts.material} with ${facts.evidenceCue}; the ${facts.copyTag} connection between ${facts.target} and ${facts.next} must cross every ${facts.stage} boundary on time.`;
    repair = `${ownedRepairLead}; loop the ${facts.material} beat before its landing, then reconnect that pair to the ${facts.stage}.`;
    proof = `For ${facts.material}, accept ${facts.resultCue}; two ${facts.copyTag} ${facts.stage} loops must connect all four targets to their approaches in steady time.`;
  } else if (facts.type === "phrase") {
    setup = `${setupLead}; ${facts.material} has ${facts.eventCount} events; its ${facts.copyTag} ${facts.stage} moves from ${facts.firstPitch} through planned space to ${facts.lastPitch}.`;
    evidence = `Check ${facts.material} with ${facts.evidenceCue}; its opening, rests, contour, and ending let the ${facts.copyTag} ${facts.stage} preserve one recognizable idea.`;
    repair = `${ownedRepairLead}; reconnect the first changed ${facts.material} event to its neighbor, then rebuild the ${facts.stage} from its opening.`;
    proof = `For ${facts.material}, accept ${facts.resultCue}; two ${facts.copyTag} ${facts.stage} takes require matching openings, planned rests, and deliberate endings.`;
  } else {
    setup = evenVariant
      ? `${setupLead}; ${facts.material}'s ${facts.eventCount} events let the ${facts.copyTag} ${facts.stage} trace ${facts.firstPitch}–${facts.lastPitch} through ${context.root} ${facts.scale}.`
      : `${setupLead}; with ${facts.eventCount} events in ${facts.material}, the ${facts.copyTag} ${facts.stage} covers ${context.root} ${facts.scale} between ${facts.firstPitch} and ${facts.lastPitch}.`;
    evidence = evenVariant
      ? `Check ${facts.material} with ${facts.evidenceCue}; written values stay even, and the ${facts.copyTag} link from ${facts.target} to ${facts.next} remains inside the ${facts.stage} pulse.`
      : `Confirm ${facts.material} with ${facts.evidenceCue}; every written value remains even while the ${facts.copyTag} connection between ${facts.target} and ${facts.next} stays inside the ${facts.stage} pulse.`;
    repair = evenVariant
      ? `${ownedRepairLead}; reconnect the preceding ${facts.material} attack with ${facts.target}–${facts.next}, then restore the ${facts.stage}.`
      : `${ownedRepairLead}; loop ${facts.target}–${facts.next} with the prior ${facts.material} event, then rebuild the ${facts.stage}.`;
    proof = evenVariant
      ? `For ${facts.material}, accept ${facts.resultCue}; two ${facts.copyTag} ${facts.stage} takes must preserve every duration and finish deliberately on ${context.root}.`
      : `For ${facts.material}, accept ${facts.resultCue}; repeat the ${facts.copyTag} ${facts.stage} twice with unchanged durations and a deliberate ${context.root} finish.`;
  }
  const task = conciseEnglishTask(context, facts);
  const review = [
    `Mute ${facts.material} after one pass; rebuild its ${facts.copyTag} ${facts.stage} opening from memory, then compare the return with playback.`,
    `Count ${facts.material} aloud; whisper the ${facts.copyTag} ${facts.stage} subdivision, then finish that material once with internal time.`,
    `Hear ${facts.material}'s last event first; reverse the ${facts.copyTag} ${facts.stage} once, then restore that material at ${context.tempo} BPM.`,
    `Alternate the last rise in ${facts.material} with its first fall; restore the ${facts.copyTag} ${facts.stage} after two seamless joins.`,
    `Record ${facts.material} plain, then accent one group; both ${facts.copyTag} ${facts.stage} versions must keep identical pulse and written values.`,
    `Speak ${facts.material}'s grouping before playing; fit the ${facts.copyTag} ${facts.stage} beneath that count and preserve each overlap.`,
    `Sing ${facts.material}'s target before playback; let the ${facts.copyTag} ${facts.stage} confirm its position, duration, and following event.`,
    `Count every ${facts.material} rest with a moving hand; re-enter the ${facts.copyTag} ${facts.stage} once softly and once at normal volume.`,
    `Run ${facts.material} at all three speeds; repair one ${facts.copyTag} ${facts.stage} cell if its timing or touch changes.`,
    `Record ${facts.material} without the cursor; during ${facts.copyTag} ${facts.stage} playback, name one success and one precise next repair.`,
  ][context.lessonIndex];
  return [
    [setup, task, evidence].join(" "),
    [review, repair, proof].join(" "),
  ];
}

function polishedEnglishParagraphs(context, facts) {
  const subject = facts.material.charAt(0).toUpperCase() + facts.material.slice(1);
  const copyLabel = facts.copyTag.charAt(0).toUpperCase() + facts.copyTag.slice(1);
  const tempoLead = [
    `Set a metronome to ${context.tempo} BPM and prepare ${facts.material}.`,
    `Start ${facts.material} at ${context.tempo} BPM.`,
    `Use a ${context.tempo} BPM pulse for ${facts.material}.`,
    `Prepare ${facts.material}, then set ${context.tempo} BPM.`,
    `Begin with ${facts.material} against a ${context.tempo} BPM click.`,
    `At ${context.tempo} BPM, play ${facts.material} once without stopping.`,
    `Put ${facts.material} on a steady ${context.tempo} BPM pulse.`,
    `Before recording, hear ${facts.material} at ${context.tempo} BPM.`,
    `Count in at ${context.tempo} BPM, then play ${facts.material}.`,
    `Record ${facts.material} once at ${context.tempo} BPM.`,
  ][context.lessonIndex];
  const review = [
    `Before reviewing ${facts.material} in the ${facts.stage}, mute playback and rebuild the opening from memory.`,
    `For the ${facts.material} ${facts.stage}, count aloud once, then repeat with the subdivision only in your head.`,
    `During the ${facts.material} ${facts.stage}, hear the final event first, play backward once, and restore the written order.`,
    `To review the ${facts.material} ${facts.stage}, isolate the last rise and first fall, then reconnect them without a pause.`,
    `Record the ${facts.material} ${facts.stage} plain and accented without changing duration.`,
    `Say the ${facts.material} grouping aloud before the ${facts.stage}, then keep that count underneath the line.`,
    `Sing the ${facts.material} target before the ${facts.stage} and check its position and duration against playback.`,
    `Count every ${facts.material} rest with a moving hand during the ${facts.stage}; make both re-entries deliberate.`,
    `Try ${facts.material} at three speeds in the ${facts.stage}; note where timing or touch changes.`,
    `Play the ${facts.material} ${facts.stage} without the cursor, then name one success and one repair.`,
  ][context.lessonIndex];
  const task = conciseEnglishTask(context, facts);
  const evenVariant = context.lessonIndex % 2 === 0;
  let detail;
  let evidence;
  let repair;
  let proof;

  if (facts.type === "tap") {
    const pivot = facts.rests === 0 ? "the first attack" : `rest position ${facts.firstRest}`;
    detail = `${subject} anchors the ${facts.copyTag} ${facts.stage}: ${facts.pattern} has ${facts.attacks} attacks and ${facts.rests} silent slots. Count each dash in this ${facts.copyTag} ${facts.stage}; never rush the next x.`;
    evidence = `Record the ${facts.stage} with ${facts.material}; use ${facts.evidenceCue} to verify each x, each empty dash, and a final attack that does not pull forward.`;
    repair = `If ${facts.repairCue} appears in ${facts.material}, use ${context.slowTempo} BPM and loop four slots around ${pivot}; count through the gap, then restore the ${facts.stage} without changing its spacing.`;
    proof = `Return the ${facts.material} ${facts.stage} to ${context.tempo} BPM. The ${facts.copyTag} take is ready only when two complete passes have the same attacks, silences, and bar length; that is ${facts.resultCue}.`;
  } else if (facts.type === "compare") {
    detail = `In ${facts.material}'s ${facts.stage}, A is ${facts.pair.rootA} ${facts.scaleA}, and B is ${facts.pair.rootB} ${facts.scaleB}. ${evenVariant ? `${copyLabel} work matches rhythm, register, and volume throughout the ${facts.stage}; let the pitch collection create the contrast, not the performance` : `${copyLabel} listening holds register, volume, and rhythm consistent through the ${facts.stage}; judge the collection rather than the performance`}.`;
    evidence = evenVariant
      ? `During the ${facts.material} ${facts.stage}, hide the labels and use ${facts.evidenceCue} to locate the ${facts.differencePosition === null ? "changed root or collection" : `change at event ${facts.differencePosition}`}; name the clue before looking at the answer.`
      : `For the ${facts.material} ${facts.stage}, listen without reading the names; on the ${facts.evidenceCue}, identify the ${facts.differencePosition === null ? "changed root or collection" : `change at event ${facts.differencePosition}`} and explain which sound gave it away.`;
    repair = evenVariant
      ? `If ${facts.repairCue} affects ${facts.material}, slow to ${context.slowTempo} BPM and alternate only the decisive moment four times; then replay the complete ${facts.stage} without exaggerating the difference.`
      : `If ${facts.repairCue} affects ${facts.material}, set ${context.slowTempo} BPM and loop the decisive moment for four A/B pairs; then replay the full ${facts.stage} without exaggeration.`;
    proof = evenVariant
      ? `${copyLabel} proof requires two blind trials of ${facts.material} in the ${facts.stage} at ${context.tempo} BPM. ${copyLabel} listening accepts ${facts.resultCue} only when both answers agree and cite the same audible clue.`
      : `${copyLabel} listening uses a pair of blind trials of ${facts.material} in the ${facts.stage} at ${context.tempo} BPM. ${copyLabel} proof accepts ${facts.resultCue} provided the two choices match and cite one audible clue.`;
  } else if (facts.type === "harmony") {
    detail = `${subject} anchors the ${facts.copyTag} ${facts.stage} with ${facts.eventCount} events across four chord boundaries, from ${facts.firstPitch} to ${facts.lastPitch}. During the ${facts.copyTag} ${facts.stage}, follow one line—not four shapes—and hear each arrival in context.`;
    evidence = evenVariant
      ? `In the ${facts.material} ${facts.stage}, use ${facts.evidenceCue} to check ${facts.target}–${facts.next}; the target must reach its chord on time without breaking the line around it.`
      : `At the ${facts.evidenceCue} in the ${facts.material} ${facts.stage}, listen closely to ${facts.target}–${facts.next}; both notes should connect while the chord change stays steady.`;
    repair = `When ${facts.repairCue} occurs in ${facts.material}, reduce the tempo to ${context.slowTempo} BPM; loop the beat before the landing, add the following beat, and only then rebuild the full ${facts.stage}.`;
    proof = `Make two final ${facts.stage} passes with ${facts.material} at ${context.tempo} BPM. For this ${facts.copyTag} study, ${facts.resultCue} means every target meets its chord and every approach keeps the same pulse.`;
  } else if (facts.type === "phrase") {
    detail = `${subject} anchors the ${facts.copyTag} ${facts.stage} with ${facts.eventCount} events between ${facts.firstPitch} and ${facts.lastPitch}. Shape the ${facts.copyTag} ${facts.stage} through its opening, space, contour, and ending; do not fill every beat.`;
    evidence = `Use ${facts.evidenceCue} on the ${facts.material} ${facts.stage} to decide if it sounds like one thought; its rests should feel counted and its ending chosen, not accidental.`;
    repair = `If ${facts.repairCue} changes ${facts.material}, move to ${context.slowTempo} BPM and join the first changed event to its neighbor; rebuild from the opening so the repair belongs to the ${facts.stage}.`;
    proof = `Record two ${facts.stage} takes with ${facts.material} at ${context.tempo} BPM. Accept the ${facts.copyTag} result, ${facts.resultCue}, when both keep the same opening, intentional rests, and clear ending without extra filler.`;
  } else {
    detail = `${subject} anchors the ${facts.copyTag} ${facts.stage} with ${facts.eventCount} events spanning ${facts.firstPitch} to ${facts.lastPitch} in ${context.root} ${facts.scale}. ${evenVariant ? `${copyLabel} practice keeps each written value even and connects ${facts.target}–${facts.next}` : `${copyLabel} work holds every duration steady while joining ${facts.target}–${facts.next}`} inside the ${facts.stage}.`;
    evidence = evenVariant
      ? `In the ${facts.material} ${facts.stage}, check ${facts.evidenceCue} while following the score; ${facts.target}–${facts.next} must stay inside the pulse, with no shortened value before the turn or landing.`
      : `Follow the score through the ${facts.material} ${facts.stage} and use ${facts.evidenceCue}; listen for equal written values and a clean ${facts.target}–${facts.next} connection inside the pulse.`;
    repair = evenVariant
      ? `If ${facts.repairCue} appears in ${facts.material}, slow to ${context.slowTempo} BPM and loop ${facts.target}–${facts.next} with the previous event; add one event on each side before returning to the full ${facts.stage}.`
      : `If ${facts.repairCue} appears in ${facts.material}, use ${context.slowTempo} BPM and pair the prior event with ${facts.target}–${facts.next}; expand one event in each direction before restoring the full ${facts.stage}.`;
    proof = evenVariant
      ? `${copyLabel} practice ends with two takes of ${facts.material} in the ${facts.stage} at ${context.tempo} BPM. The ${copyLabel} result, ${facts.resultCue}, counts only when every duration survives and the ending settles deliberately on ${context.root}.`
      : `Play two ${facts.copyTag} takes of ${facts.material} in the ${facts.stage} at ${context.tempo} BPM. The ${copyLabel} result, ${facts.resultCue}, is valid when all durations survive and the line closes deliberately on ${context.root}.`;
  }

  return [
    [tempoLead, detail, task, evidence].join(" "),
    [review, repair, proof].join(" "),
  ];
}

function compactParagraphs(locale, context) {
  const facts = compactBodyFacts(locale, context);
  if (locale === "en") {
    return polishedEnglishParagraphs(context, facts);
  }
  const conciseLocale = locale === "pt-BR" || locale === "es" || locale === "ja";
  const task = conciseLocale
    ? conciseAnchoredTaskSentence(locale, context, facts)
    : anchoredTaskSentence(locale, context, facts);
  const restoreJapaneseEvidence = locale === "ja"
    && context.unit.slug === "steady-pulse"
    && (context.lessonIndex === 1 || context.lessonIndex === 7);
  const omitEvidence = (conciseLocale && !restoreJapaneseEvidence)
    || (context.compare && (locale === "en" || locale === "de"))
    || (locale === "en" && omitEnglishEvidence(context));
  const evidence = omitEvidence ? "" : anchoredEvidenceSentence(locale, context, facts);
  const review = needsRawCompactReview(locale, context)
    || (locale === "es" && context.compare)
    ? reviewInstruction(locale, context)
    : anchoredReviewSentence(locale, context, facts);
  return [
    [anchoredSetupSentence(locale, context, facts), task, evidence].filter(Boolean).join(" "),
    [review, anchoredRepairSentence(locale, context, facts), anchoredAcceptanceSentence(locale, context, facts)].join(" "),
  ];
}

function localizedCheckpoint(locale, context) {
  if (context.unit.slug === "sequence-workshop" && context.lessonIndex === 3) {
    return text(
      `Record two passes at ${context.tempo} BPM; both turns stay even, and the repeated degree two between cells creates no pause.`,
      `Grave duas passagens a ${context.tempo} BPM; as duas voltas ficam regulares e o grau dois repetido entre células não cria pausa.`,
      `Graba dos pasadas a ${context.tempo} BPM; ambos giros quedan regulares y el grado dos repetido entre células no crea pausa.`,
      `Nimm zwei Durchgänge bei ${context.tempo} BPM auf; beide Wenden bleiben gleichmäßig und die wiederholte Stufe zwei erzeugt keine Pause.`,
      `${context.tempo} BPMで2回録音し、両方の折り返しを均等に保ち、セル間で反復する2度に間を作らない。`,
      `以${context.tempo} BPM录两遍；两次转向都保持均匀，单元之间重复的二级不产生停顿。`
    )[locale];
  }
  if (context.tap) {
    if (context.lessonIndex === 8) {
      const values = {
        en: `Complete one clean card at ${context.slowTempo}, ${context.tempo}, and ${context.tempo + 10} BPM with the same pattern and no extra taps.`,
        "pt-BR": `Complete um cartão limpo a ${context.slowTempo}, ${context.tempo} e ${context.tempo + 10} BPM com o mesmo padrão e sem toques extras.`,
        es: `Completa una tarjeta limpia a ${context.slowTempo}, ${context.tempo} y ${context.tempo + 10} BPM con el mismo patrón y sin golpes extra.`,
        de: `Spiele je eine saubere Karte bei ${context.slowTempo}, ${context.tempo} und ${context.tempo + 10} BPM mit gleichem Muster ohne Zusatztap.`,
        ja: `${context.slowTempo}、${context.tempo}、${context.tempo + 10} BPMで同じパターンを1回ずつ行い、余分なタップを入れない。`,
        "zh-Hans": `用同一模式分别在${context.slowTempo}、${context.tempo}和${context.tempo + 10} BPM完成一遍，不多点一下。`,
      };
      return values[locale];
    }
    if (context.lessonIndex === 7) {
      const values = {
        en: `Record four repeats at ${context.tempo} BPM; move one audible accent to the next x each time while every tap stays centered.`,
        "pt-BR": `Grave quatro repetições a ${context.tempo} BPM; leve um acento audível ao x seguinte sem tirar os toques do centro.`,
        es: `Graba cuatro repeticiones a ${context.tempo} BPM; mueve un acento audible a la siguiente x sin desplazar los golpes.`,
        de: `Nimm vier Wiederholungen bei ${context.tempo} BPM auf; verschiebe einen hörbaren Akzent jeweils zum nächsten x, ohne die Treffer zu versetzen.`,
        ja: `${context.tempo} BPMで4回録音し、打点をずらさずアクセントだけを毎回次のxへ移す。`,
        "zh-Hans": `以${context.tempo} BPM录四次，点击位置不变，每次只把可听重音移到下一个x。`,
      };
      return values[locale];
    }
    switch (locale) {
      case "en": return `Record two passes at ${context.tempo} BPM with every x present, every dash silent, and the last attack centered.`;
      case "pt-BR": return `Grave duas passagens a ${context.tempo} BPM com todos os x presentes, todos os traços em silêncio e o último ataque centralizado.`;
      case "es": return `Graba dos pasadas a ${context.tempo} BPM con todas las x presentes, todos los guiones en silencio y el último ataque centrado.`;
      case "de": return `Nimm zwei Durchgänge bei ${context.tempo} BPM auf: jedes x erklingt, jeder Strich bleibt still und der letzte Anschlag liegt mittig.`;
      case "ja": return `${context.tempo} BPMで2回録音し、すべてのxを打ち、横線では入力せず、最後の打点を拍の中央に置く。`;
      case "zh-Hans": return `以${context.tempo} BPM录两遍：每个x都有输入，每条横线保持安静，最后一下落在拍点中央。`;
      default: throw new Error(`Unsupported locale ${locale}`);
    }
  }
  if (context.unit.slug === "rhythmic-displacement") {
    const tempoText = context.lessonIndex === 8
      ? `${context.slowTempo}, ${context.tempo}, ${context.tempo + 10} BPM`
      : `${context.tempo} BPM`;
    const values = {
      en: `Record A and B at ${tempoText}; B must keep A's pitches and durations, shift only the written onset, and finish inside the same time window.`,
      "pt-BR": `Grave A e B a ${tempoText}; B deve manter alturas e durações de A, deslocar apenas a entrada escrita e terminar na mesma janela de tempo.`,
      es: `Graba A y B a ${tempoText}; B debe conservar alturas y duraciones de A, mover solo la entrada escrita y terminar en la misma ventana temporal.`,
      de: `Nimm A und B bei ${tempoText} auf; B behält Töne und Dauern von A, verschiebt nur den notierten Einsatz und endet im gleichen Zeitfenster.`,
      ja: `${tempoText}でAとBを録音し、BではAの音高と音価を保ち、記譜された開始位置だけをずらして同じ時間枠内で終える。`,
      "zh-Hans": `以${tempoText}录下A和B；B保持A的音高与时值，只移动写出的起点，并在同一时间窗口内结束。`,
    };
    return values[locale];
  }
  const [target, next] = actualDegreeTokens(context);
  const focus = context.focusTitle[locale];
  if (context.unit.kind === "ear") {
    const values = {
      en: `Complete “${focus}” on A and B twice without labels; both choices or reproductions must match playback.`,
      "pt-BR": `Faça “${focus}” em A e B duas vezes sem rótulos; as duas escolhas ou reproduções devem coincidir com a referência.`,
      es: `Haz “${focus}” en A y B dos veces sin etiquetas; ambas elecciones o reproducciones deben coincidir con la referencia.`,
      de: `Führe „${focus}“ zweimal ohne Etiketten an A und B aus; beide Entscheidungen oder Wiedergaben müssen stimmen.`,
      ja: `ラベルを隠してAとBで「${focus}」を2回行い、選択または再現をどちらも再生例と一致させる。`,
      "zh-Hans": `隐藏标签，在A和B上各完成两次“${focus}”，每次选择或复现都要与播放一致。`,
    };
    return values[locale];
  }
  if (context.unit.kind === "harmony") {
    const values = {
      en: `Play the four-chord loop twice and show “${focus}” on every change; keep events ${target}–${next} connected.`,
      "pt-BR": `Toque o ciclo de quatro acordes duas vezes e mostre “${focus}” em cada mudança; ligue os eventos ${target}–${next}.`,
      es: `Toca dos veces el ciclo de cuatro acordes y muestra “${focus}” en cada cambio; conecta los eventos ${target}–${next}.`,
      de: `Spiele die Vier-Akkord-Schleife zweimal und zeige bei jedem Wechsel „${focus}“; verbinde Ereignis ${target}–${next}.`,
      ja: `4コードのループを2回弾き、各変化で「${focus}」を示し、イベント${target}–${next}をつなげる。`,
      "zh-Hans": `把四和弦循环弹两遍，每次变化都做到“${focus}”，并连接事件${target}–${next}。`,
    };
    return values[locale];
  }
  if (context.unit.kind === "phrase") {
    const bars = context.lessonIndex === 9 ? 8 : context.lessonIndex === 8 ? 4 : null;
    const values = {
      en: bars
        ? `Record ${bars} bars twice and make “${focus}” audible in both takes; preserve the written rhythm and ending.`
        : `Record the written line twice and make “${focus}” audible in both takes; preserve its exact duration and ending.`,
      "pt-BR": bars
        ? `Grave ${bars} compassos duas vezes e deixe “${focus}” audível nas duas tomadas; preserve o ritmo e o final escritos.`
        : `Grave a linha escrita duas vezes e deixe “${focus}” audível nas duas tomadas; preserve sua duração e seu final.`,
      es: bars
        ? `Graba ${bars} compases dos veces y haz audible “${focus}” en ambas tomas; conserva el ritmo y el final escritos.`
        : `Graba dos veces la línea escrita y haz audible “${focus}” en ambas tomas; conserva su duración y su final.`,
      de: bars
        ? `Nimm zweimal ${bars} Takte auf und mache „${focus}“ in beiden Takes hörbar; erhalte Rhythmus und Schluss.`
        : `Nimm die notierte Linie zweimal auf und mache „${focus}“ in beiden Takes hörbar; erhalte Dauer und Schluss.`,
      ja: bars
        ? `${bars}小節を2回録音し、両方で「${focus}」を聴き取れるようにして、記譜リズムと終わりを保つ。`
        : `記譜されたラインを2回録音し、両方で「${focus}」を聴き取れるようにして、長さと終わりを保つ。`,
      "zh-Hans": bars
        ? `把${bars}小节录两遍，两遍都要听出“${focus}”，并保持写出的节奏和结尾。`
        : `把写出的乐句录两遍，两遍都要听出“${focus}”，并保持准确长度和结尾。`,
    };
    return values[locale];
  }
  switch (locale) {
    case "en": return `Record two passes at ${context.tempo} BPM that show “${focus}”; keep events ${target}–${next} even and finish on ${context.root}.`;
    case "pt-BR": return `Grave duas passagens a ${context.tempo} BPM que mostrem “${focus}”; ligue os eventos ${target}–${next} e termine em ${context.root}.`;
    case "es": return `Graba dos pasadas a ${context.tempo} BPM que muestren “${focus}”; conecta los eventos ${target}–${next} y termina en ${context.root}.`;
    case "de": return `Nimm zwei Durchgänge bei ${context.tempo} BPM auf, die „${focus}“ zeigen; verbinde Ereignis ${target}–${next} und ende auf ${context.root}.`;
    case "ja": return `${context.tempo} BPMで「${focus}」を示す演奏を2回録音し、イベント${target}–${next}を均等につないで${context.root}で終える。`;
    case "zh-Hans": return `以${context.tempo} BPM录两遍并做到“${focus}”，均匀连接事件${target}–${next}，最后落在${context.root}。`;
    default: throw new Error(`Unsupported locale ${locale}`);
  }
}

function proseUnits(source) {
  const words = source.trim() ? source.trim().split(/\s+/u).length : 0;
  const cjk = (source.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  return Math.max(words, Math.floor(cjk / 2));
}

function localizedBody(locale, context, title) {
  const paragraphs = compactParagraphs(locale, context);
  if (paragraphs.length !== 2) throw new Error("Every body must have exactly two prose paragraphs.");
  const units = proseUnits(paragraphs.join(" "));
  if (units < 120 || units > 180) {
    const warning = `${context.unit.level}/${context.unit.slug}/${context.lessonIndex + 1} ${locale} has ${units} prose units.`;
    if (process.env.SCALE_LENGTH_REPORT === "1") LENGTH_WARNINGS.push(warning);
    else throw new Error(warning);
  }
  return [
    `# ${title}`,
    "",
    paragraphs[0],
    "",
    paragraphs[1],
    "",
    `:::checkpoint ${localizedCheckpoint(locale, context)}`,
  ].join("\n");
}

function safeFenceTitle(value) {
  return value.replace(/\n/g, " ");
}

function scaleFenceSource(id, title, context, override = {}) {
  const shape = context.shape;
  const scale = override.scale || context.scale;
  const root = override.root || context.root;
  const neutralTitle = `${root} · ${scale} · ${context.tempo} BPM`;
  const lines = [
    `id: ${id}`,
    `title: ${neutralTitle}`,
    `root: ${root}`,
    `scale: ${scale}`,
    `tempo: ${context.tempo}`,
    `beat: ${context.lessonIndex % 3 === 1 ? 0.5 : 1}`,
  ];
  if (override.degrees || shape.degrees) {
    lines.push(`degrees: ${override.degrees || shape.degrees}`);
  } else {
    lines.push(`pattern: ${shape.pattern}`);
    lines.push(`direction: ${shape.direction}`);
    lines.push(`octaves: ${context.unit.octaves || 1}`);
  }
  if (shape.ladder) {
    lines.push(`ladder: ${context.slowTempo} ${context.tempo} ${context.tempo + 10}`);
  }
  return lines.join("\n");
}

function transposeRoot(root) {
  const roots = ["C", "D", "E", "F", "G", "A", "Bb"];
  const index = roots.indexOf(root);
  return roots[(index + 1 + roots.length) % roots.length];
}

function comparisonSpec(context) {
  const scaleA = context.scale;
  const scaleIndex = context.unit.scales.indexOf(scaleA);
  const nextScale = context.unit.scales[(scaleIndex + 1) % context.unit.scales.length];
  const rootA = context.root;
  const rootIndex = context.unit.roots.indexOf(rootA);
  const listedRoot = context.unit.roots[(rootIndex + 1) % context.unit.roots.length];
  const rootB = listedRoot === rootA ? transposeRoot(rootA) : listedRoot;
  const common = "1 2 3 4 5 4 3 2 1";

  const sameMotion = (firstScale, secondScale, degrees, options = {}) => ({
    rootA: options.rootA || rootA,
    scaleA: firstScale,
    rootB: options.rootB || options.rootA || rootA,
    scaleB: secondScale,
    a: options.a || degrees,
    b: options.b || degrees,
    displayRootA: options.displayRootA,
    displayScaleA: options.displayScaleA,
    displayRootB: options.displayRootB,
    displayScaleB: options.displayScaleB,
    labelA: options.labelA,
    labelB: options.labelB,
    differencePosition: options.differencePosition,
  });

  const specialComparisons = {
    "whole-and-half-steps": [
      sameMotion("Chromatic", "Chromatic", "1 2 1/2", { b: "1 3 1/2" }),
      sameMotion("Chromatic", "Chromatic", "1 3 1/2", { b: "1 2 1/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 1 3 1/2", { b: "1 3 1 2 1/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 1/2", { rootA: "E", b: "1 3 1/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 1/2", { rootA: "B", b: "1 3 1/2" }),
      sameMotion("Chromatic", "Chromatic", "1/0.5 3/0.5 5 6/2", { b: "1/0.5 3/0.5 5 7/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 4 6/2", { b: "1 3 4 6/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 4 5/2", { b: "1 2 4 -/2" }),
      sameMotion("Chromatic", "Chromatic", "1 3 5 6/2", { rootA: "C", rootB: "G" }),
      sameMotion("Chromatic", "Chromatic", "1 3 5 6 8 10 12 13/2", { b: "1 3 5 7 9 11 12 13/2" }),
    ],
    "interval-landmarks": [
      sameMotion("Chromatic", "Chromatic", "1 1/2", { b: "1 2/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2/2", { b: "1 3/2" }),
      sameMotion("Chromatic", "Chromatic", "1 3/2", { b: "1 2/2" }),
      sameMotion("Chromatic", "Chromatic", "1 4/2", { b: "1 5/2" }),
      sameMotion("Chromatic", "Chromatic", "1 5/2", { b: "1 4/2" }),
      sameMotion("Chromatic", "Chromatic", "1 6/2", { b: "1 7/2" }),
      sameMotion("Chromatic", "Chromatic", "1 7/2", { b: "1 8/2" }),
      sameMotion("Chromatic", "Chromatic", "1 8/2", { b: "1 7/2" }),
      sameMotion("Chromatic", "Chromatic", "1 13/2", { b: "1 8/2" }),
      sameMotion("Chromatic", "Chromatic", "1 2 1 3 1 4 1 5/2", { b: "1 6 1 7 1 8 1 13/2" }),
    ],
    "move-one-idea": Array.from({ length: 10 }, (_, index) => {
      const motifs = [
        "1 2 3 5 3 2 1/2", "3 2 1 -/1 3 2 1/2", "1 3 2 5 3 2 1/2",
        "5 3 2 1 2 3 1/2", "1 2 3/2 5 3 2 1/2", "1/0.5 2/0.5 3 5 3 2 1/2",
        "1 3 5 3 -/1 2 1/2", "3 5 6 5 3 2 1/2", "1 2 4 3 5 3 1/2",
        "1 3 2 5 4 2 1/2",
      ];
      return sameMotion("Major", "Major", motifs[index], { rootB });
    }),
    "three-minor-colors": [
      sameMotion("Natural Minor", "Harmonic Minor", "1 3 5 6 7 8/2"),
      sameMotion("Natural Minor", "Harmonic Minor", "5 7 8/2"),
      sameMotion("Natural Minor", "Melodic Minor", "5 6 7 8/2"),
      sameMotion("Natural Minor", "Harmonic Minor", "8 7 6 5 3 1/2"),
      sameMotion("Natural Minor", "Melodic Minor", "5 6/2 7 8/2"),
      sameMotion("Harmonic Minor", "Melodic Minor", "5/0.5 6/0.5 7 8/2"),
      sameMotion("Harmonic Minor", "Melodic Minor", "6/2 7 8 7 6/2"),
      sameMotion("Natural Minor", "Harmonic Minor", "6 7/2 8/2 7 8/2"),
      sameMotion("Natural Minor", "Melodic Minor", "1 3 5 6 7 8 7 5 3 1/2"),
      sameMotion("Harmonic Minor", "Melodic Minor", "1 5 6 7 8 7 6 5 1/2"),
    ],
    "modes-by-color-note": [
      sameMotion("Dorian", "Natural Minor", "5 6/2 5 1/2"),
      sameMotion("Phrygian", "Natural Minor", "1 2 3 4/2"),
      sameMotion("Lydian", "Major", "3 4 5/2"),
      sameMotion("Mixolydian", "Major", "5 6 7 8/2"),
      sameMotion("Natural Minor", "Dorian", "5 6 7/2"),
      sameMotion("Locrian", "Phrygian", "4 5 6/2"),
      sameMotion("Dorian", "Natural Minor", "1 3 5 6 5 3 1/2"),
      sameMotion("Lydian", "Major", "3 4 5 4 3/2"),
      sameMotion("Mixolydian", "Major", "5 6 7 8 7 6 5/2"),
      sameMotion("Phrygian", "Locrian", "1 2 3 4 5/2"),
    ],
    "hear-then-play": Array.from({ length: 10 }, (_, index) => {
      const recallLines = [
        "1 2 3 2 1 2 1/2", "3 2 1 2 3 2 1/2", "1 3 2 5 3 2 1/2", "5 4 2 3 1 2 1/2",
        "1 2 -/1 3 2 3 1/2", "1/0.5 2/0.5 3 2 3 2 1/2", "1 3 5 4 2 3 1/2",
        "3 5 4 2 3 2 1/2", "1 2 4 3 5 3 1/2", "1 3 2 5 4 2 1/2",
      ];
      return sameMotion(scaleA, scaleA, recallLines[index], {
        b: recallLines[(index + 1) % recallLines.length],
      });
    }),
    "melodic-minor-map": [
      sameMotion("Melodic Minor", "Natural Minor", "1 3 5 6 7 8/2", { rootA: "C", differencePosition: 4 }),
      sameMotion("Javaneese", "Dorian", "1 2 3 5 2 1/2", { rootA: "D", differencePosition: 2 }),
      sameMotion("Lydian Augmented", "Lydian", "1 3 4 5 8/2", { rootA: "Eb", differencePosition: 4 }),
      sameMotion("Melodic Minor", "Mixolydian", "4 5 6 7 8 9 10 11/2", {
        rootA: "C",
        rootB: "F",
        b: "1 2 3 4 5 6 7 8/2",
        displayRootA: "F",
        displayScaleA: "Lydian Dominant",
        differencePosition: 4,
        labelA: text("F Lydian dominant · C melodic-minor degrees 4–11", "Fá lídia dominante · graus 4–11 de dó menor melódica", "Fa lidia dominante · grados 4–11 de do menor melódica", "F Lydisch dominant · Stufen 4–11 aus C melodisch Moll", "Fリディアンドミナント・Cメロディックマイナーの4–11度", "F利底亚属调式·C旋律小调4–11级"),
        labelB: text("F Mixolydian", "Fá mixolídia", "Fa mixolidia", "F Mixolydisch", "Fミクソリディアン", "F混合利底亚"),
      }),
      sameMotion("Hindu", "Mixolydian", "1 3 5 6 7 8/2", { rootA: "G", differencePosition: 4 }),
      sameMotion("Half‑Diminished ♯2 (Locrian ♮2)", "Locrian", "1 2 3 5 6 8/2", { rootA: "A", differencePosition: 2 }),
      sameMotion("Super Locrian", "Super Locrian", "1 2 3 4 5 6 7 8/2", {
        rootA: "B",
        b: "1 2 3 4 5 6 7 -/2",
      }),
      sameMotion("Melodic Minor", "Melodic Minor", "1 3 5 6 7 8/2", { rootA: "C", rootB: "D" }),
      sameMotion("Super Locrian", "Melodic Minor", "5 6 7 8/2", {
        rootA: "B",
        rootB: "C",
        b: "1/2 1 1 1",
        labelA: text("B altered tension", "Tensão de si alterada", "Tensión de si alterada", "Spannung in B alteriert", "Bオルタードの緊張", "B变化音阶张力"),
        labelB: text("Sustained C destination", "Destino sustentado em dó", "Destino sostenido en do", "Gehaltenes Ziel C", "持続する到着点C", "持续的C目标音"),
      }),
      sameMotion("Melodic Minor", "Super Locrian", "1 2 3 4 5 6 7 8/2", { rootA: "C", rootB: "B" }),
    ],
    "distinct-pitch-collections": [
      sameMotion("Hirajoshi", "Iwato", "1 2 3 4 5 4 3 2 1/2", { rootA: "C" }),
      sameMotion("Iwato", "Kumoi", "1 2 3 5 4 2 1/2", { rootA: "D" }),
      sameMotion("Kumoi", "Hirajoshi", "1 3 2 4 5 3 1/2", { rootA: "E" }),
      sameMotion("Pelog", "Hirajoshi", "1 2 4 5 3 2 1/2", { rootA: "F" }),
      sameMotion("Romanian Minor", "Hungarian Major", "1 2 3 4 5 6 5 4 3 2 1/2", { rootA: "G" }),
      sameMotion("Hungarian Major", "Neapolitan Minor", "1/0.5 2/0.5 3 4 5/2 6 5 3 1/2", { rootA: "A" }),
      sameMotion("Neapolitan Minor", "Neapolitan Minor", "1 2 3 4 5 6 5 4 3 2 1/2", {
        rootA: "C",
        b: "1 2 3 4 5 6 5 4 3 2 -/2",
      }),
      sameMotion("Prometheus", "Prometheus", "1 2 3 4 5 6 5 4 3 2 1/2", { rootA: "D", rootB: "E" }),
      sameMotion("Hirajoshi", "Iwato", "1 2 3 5 4 2 1/2", { rootA: "E" }),
      sameMotion("Iwato", "Kumoi", "1 3 2 5 4 3 1/2", { rootA: "F" }),
    ],
    "rhythmic-displacement": Array.from({ length: 10 }, (_, index) => {
      const motifs = [
        ["1/0.5 3/0.5 2/0.5 5/0.5 3/0.5 1/0.5 -/0.5 -/0.5", "-/0.5 1/0.5 3/0.5 2/0.5 5/0.5 3/0.5 1/0.5 -/0.5"],
        ["1/0.5 2/0.5 3/0.5 5/0.5 3/0.5 2/0.5 1/0.5 -/0.5", "-/0.5 1/0.5 2/0.5 3/0.5 5/0.5 3/0.5 2/0.5 1/0.5"],
        ["1/0.5 2/0.5 4/0.5 5/0.5 4/0.5 2/0.5 1/0.5 -/0.5 -/0.5", "-/0.5 -/0.5 1/0.5 2/0.5 4/0.5 5/0.5 4/0.5 2/0.5 1/0.5"],
        ["1/0.5 2/0.5 3/0.5 5/0.5 3/0.5 2/0.5 1/0.5 -/0.5 -/0.5 -/0.5", "-/0.5 -/0.5 -/0.5 1/0.5 2/0.5 3/0.5 5/0.5 3/0.5 2/0.5 1/0.5"],
        ["1 2 - 3 5 3 2 1 -", "- 1 2 - 3 5 3 2 1"],
        ["1 2 3/2 5 3 2 1 -", "- 1 2 3/2 5 3 2 1"],
        ["1/0.5 3/0.5 2/0.5 5/0.5 3/0.5 2/0.5 1/0.5 -/0.5", "-/0.5 1/0.5 3/0.5 2/0.5 5/0.5 3/0.5 2/0.5 1/0.5"],
        ["1 2 4 3 5 3 1 -", "- 1 2 4 3 5 3 1"],
        ["1 2 3 5 3 2 1 -", "- 1 2 3 5 3 2 1"],
        ["1 2 3 5 3 2 1 - 1 2 3 5 3 2 1 -", "- 1 2 3 5 3 2 1 - 1 2 3 5 3 2 1"],
      ];
      return sameMotion(scaleA, scaleA, motifs[index][0], { b: motifs[index][1] });
    }),
  };

  if (specialComparisons[context.unit.slug]) {
    return specialComparisons[context.unit.slug][context.lessonIndex];
  }

  const variants = [
    { rootB: rootA, scaleB: scaleA, a: "1 2 3 2 1/2", b: "1 2 3 2 2/2" },
    { rootB, scaleB: scaleA, a: common, b: common },
    { rootB: rootA, scaleB: scaleA, a: common, b: "1 2 b3 4 5 4 b3 2 1" },
    { rootB: rootA, scaleB: scaleA, a: "1 2 3 5 4 2 1", b: "1 3 2 5 3 2 1" },
    { rootB: rootA, scaleB: nextScale, a: "1 2 3 4 5 4 3 2 1", b: "1 2 3/2 4 5 4 3 2 1" },
    { rootB: rootA, scaleB: scaleA, a: "1 2 3 2 1", b: "1/0.5 2/0.5 3 2/0.5 1/0.5" },
    { rootB: rootA, scaleB: scaleA, a: "1 2 3 2 1/2", b: "1 2 3 2 -/2" },
    { rootB, scaleB: scaleA, a: common, b: common },
    { rootB: rootA, scaleB: nextScale === scaleA ? "Natural Minor" : nextScale, a: common, b: common },
    { rootB, scaleB: nextScale, a: "1 3 2 5 4 2 1", b: "1 3 2 5 4 2 1" },
  ];
  return { rootA, scaleA, ...variants[context.lessonIndex] };
}

function compareFence(id, title, context, tempo = context.tempo) {
  const comparison = comparisonSpec(context);
  const lines = [
    `id: ${id}`,
    `title: A / B · ${tempo} BPM`,
    `tempo: ${tempo}`,
    "beat: 0.5",
    `a: root: ${comparison.rootA} | scale: ${comparison.scaleA} | degrees: ${comparison.a}`,
    `b: root: ${comparison.rootB} | scale: ${comparison.scaleB} | degrees: ${comparison.b}`,
  ];
  for (const locale of LOCALES) {
    const defaultLabels = {
      en: ["Example A", "Example B"],
      "pt-BR": ["Exemplo A", "Exemplo B"],
      es: ["Ejemplo A", "Ejemplo B"],
      de: ["Beispiel A", "Beispiel B"],
      ja: ["例A", "例B"],
      "zh-Hans": ["示例A", "示例B"],
    };
    const sideA = displayedComparisonSide(comparison, "A", locale);
    const sideB = displayedComparisonSide(comparison, "B", locale);
    const labelA = comparison.labelA?.[locale]
      || (comparison.displayRootA || comparison.displayScaleA
        ? `${sideA.root} ${sideA.scale}`
        : defaultLabels[locale][0]);
    const labelB = comparison.labelB?.[locale]
      || (comparison.displayRootB || comparison.displayScaleB
        ? `${sideB.root} ${sideB.scale}`
        : defaultLabels[locale][1]);
    lines.push(`label.a.${locale}: ${labelA}`);
    lines.push(`label.b.${locale}: ${labelB}`);
  }
  return lines.join("\n");
}

function progressionFence(id, title, context) {
  const numeralSets = {
    Major: "I IV V I",
    "Natural Minor": "i iv v i",
    "Harmonic Minor": "i iv V i",
    "Melodic Minor": "i IV V i",
    Dorian: "i IV v i",
    Phrygian: "i iv v° i",
    Mixolydian: "I IV v I",
  };
  const numerals = numeralSets[context.scale] || "I IV V I";
  return [
    "```progression",
    `id: ${id}-harmony`,
    `title: ${context.root} · ${context.scale} · ${numerals.replaceAll(" ", "–")}`,
    `key: ${context.root}`,
    `scale: ${context.scale}`,
    `numerals: ${numerals}`,
    "seventh: false",
    `tempo: ${Math.max(50, context.tempo - 8)}`,
    "beatsPerChord: 4",
    "```",
  ].join("\n");
}

function playableFence(id, title, context) {
  if (context.tap) {
    const tempos = context.lessonIndex === 8
      ? [context.slowTempo, context.tempo, context.tempo + 10]
      : [context.tempo];
    return tempos.map((tempo, index) => [
      "```tap",
      `id: ${id}-tap-${index + 1}`,
      `title: ${tempo} BPM · ${TAP_PATTERNS[context.lessonIndex]}`,
      `tempo: ${tempo}`,
      `pattern: ${TAP_PATTERNS[context.lessonIndex]}`,
      "countIn: 4",
      "```",
    ].join("\n")).join("\n\n");
  }
  if (context.compare) {
    const tempos = context.unit.slug === "rhythmic-displacement" && context.lessonIndex === 8
      ? [context.slowTempo, context.tempo, context.tempo + 10]
      : [context.tempo];
    return tempos.map((tempo, index) => [
      "```compare",
      compareFence(`${id}-compare-${index + 1}`, title, context, tempo),
      "```",
    ].join("\n")).join("\n\n");
  }
  const scaleFence = [
    "```scale",
    scaleFenceSource(`${id}-exercise`, title, context),
    "```",
  ].join("\n");
  if (context.unit.kind === "harmony") {
    return `${progressionFence(id, title, context)}\n\n${scaleFence}`;
  }
  return scaleFence;
}

function markdownFor(lesson, context) {
  const frontMatter = [
    "---",
    "schema: 2",
    `id: ${lesson.id}`,
    "course: instrument-scales",
    `level: ${context.unit.level}`,
    `section: ${context.unit.level}`,
    `unit: scale-${context.unit.slug}`,
    `order: ${lesson.order}`,
    "revision: 1",
    `estimatedMinutes: ${lesson.estimatedMinutes}`,
    "instrument: adaptive",
  ];
  for (const locale of LOCALES) frontMatter.push(`title.${locale}: ${lesson.titles[locale]}`);
  for (const locale of LOCALES) frontMatter.push(`summary.${locale}: ${lesson.summaries[locale]}`);
  frontMatter.push("---", "", ":::localized");

  const bodies = [];
  for (const locale of LOCALES) {
    bodies.push(`:::locale ${locale}`);
    bodies.push(localizedBody(locale, context, lesson.titles[locale]));
  }
  bodies.push(":::endlocalized", "", playableFence(lesson.id, lesson.titles.en, context), "");
  return [...frontMatter, ...bodies].join("\n");
}

function activityFor(kind) {
  switch (kind) {
    case "rhythm": return "rhythm";
    case "ear": return "ear-training";
    case "harmony": return "improvisation";
    case "phrase": return "improvisation";
    default: return "guided-practice";
  }
}

function catalogLesson(context, unitID) {
  const id = `scale-${context.unit.level}-${context.unit.slug}-${context.focusEntry[0]}`;
  const titles = makeTitleSet(context);
  const summaries = makeSummarySet(context);
  return {
    id,
    order: context.lessonIndex + 1,
    estimatedMinutes: context.estimatedMinutes,
    activity: activityFor(context.unit.kind),
    instrument: "adaptive",
    optional: true,
    titles,
    summaries,
    path: `levels/${context.unit.level}/sections/${context.unit.level}/units/${unitID}/lessons/${id}/lesson.md`,
  };
}

function catalogUnit(unitDefinition, unitOrder) {
  const unitID = `scale-${unitDefinition.slug}`;
  const lessons = [];
  for (let lessonIndex = 0; lessonIndex < 10; lessonIndex += 1) {
    const context = makeContext(unitDefinition, lessonIndex);
    lessons.push(catalogLesson(context, unitID));
  }
  return {
    id: unitID,
    order: unitOrder,
    titles: unitDefinition.titles,
    summaries: Object.fromEntries(LOCALES.map((locale) => [locale, unitSummary(locale, unitDefinition)])),
    theme: THEMES[(unitOrder - 1) % THEMES.length],
    lessons,
  };
}

function assertUniqueLocalized(entries, field, label) {
  for (const locale of LOCALES) {
    const values = entries.map((entry) => entry[field][locale]);
    if (new Set(values).size !== values.length) {
      throw new Error(`${label}.${locale} values are not unique.`);
    }
  }
}

function generate() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (catalog.course !== "instrument-scales") throw new Error("Unexpected course catalog.");

  const generatedUnits = new Set(UNITS.map((entry) => `scale-${entry.slug}`));
  const allGeneratedLessons = [];
  for (const section of catalog.sections) {
    const definitions = UNITS.filter((entry) => entry.level === section.id);
    if (definitions.length !== 10) {
      throw new Error(`${section.id} needs exactly 10 generated units.`);
    }
    section.units = section.units.filter((entry) => !generatedUnits.has(entry.id));
    const baseCount = section.units.length;
    if (baseCount !== 2) {
      throw new Error(`${section.id} expected 2 preserved units, found ${baseCount}.`);
    }
    const appended = definitions.map((entry, index) => catalogUnit(entry, baseCount + index + 1));
    section.units.push(...appended);
    for (const generatedUnit of appended) allGeneratedLessons.push(...generatedUnit.lessons);
  }

  if (allGeneratedLessons.length !== 300) {
    throw new Error(`Expected 300 generated lessons, found ${allGeneratedLessons.length}.`);
  }
  if (new Set(allGeneratedLessons.map((entry) => entry.id)).size !== 300) {
    throw new Error("Generated lesson ids are not unique.");
  }
  if (allGeneratedLessons.some((entry) => !entry.id.startsWith("scale-"))) {
    throw new Error("Every generated lesson id must start with scale-.");
  }
  assertUniqueLocalized(allGeneratedLessons, "titles", "lesson titles");
  assertUniqueLocalized(allGeneratedLessons, "summaries", "lesson summaries");

  for (const section of catalog.sections) {
    for (const generatedUnit of section.units.filter((entry) => generatedUnits.has(entry.id))) {
      const definition = UNITS.find((entry) => `scale-${entry.slug}` === generatedUnit.id);
      for (const lesson of generatedUnit.lessons) {
        const context = makeContext(definition, lesson.order - 1);
        const lessonPath = path.join(COURSE_ROOT, lesson.path);
        fs.mkdirSync(path.dirname(lessonPath), { recursive: true });
        fs.writeFileSync(lessonPath, markdownFor(lesson, context), "utf8");
      }
    }
  }

  catalog.revision = 6;
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  if (LENGTH_WARNINGS.length > 0) {
    process.stderr.write(`${LENGTH_WARNINGS.join("\n")}\n`);
  }
  process.stdout.write("Generated 300 scale- lessons in 30 units; catalog revision is 6.\n");
}

generate();
