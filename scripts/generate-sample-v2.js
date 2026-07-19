#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "v2", "education", "courses", "instrument-scales");
const t = (en, pt, es, de, ja, zh) => ({ en, "pt-BR": pt, es, de, ja, "zh-Hans": zh });
const practice = t(
  "Listen once, then play slowly. Repeat only while the pulse and tone stay relaxed.",
  "Ouça uma vez e depois toque devagar. Repita somente enquanto a pulsação e o som estiverem relaxados.",
  "Escucha una vez y luego toca despacio. Repite solo mientras el pulso y el sonido sigan relajados.",
  "Höre einmal zu und spiele dann langsam. Wiederhole nur mit ruhigem Puls und Klang.",
  "一度聴いてから、ゆっくり演奏しましょう。拍と音が安定している間だけ繰り返します。",
  "先听一遍，再慢速演奏。只有在节拍和音色都放松稳定时才重复。"
);
const coaching = t(
  "Keep the goal small: accuracy first, then add speed on the next attempt.",
  "Mantenha o objetivo pequeno: primeiro a precisão, depois aumente a velocidade na próxima tentativa.",
  "Mantén el objetivo pequeño: primero la precisión y luego añade velocidad en el siguiente intento.",
  "Halte das Ziel klein: zuerst Genauigkeit, dann beim nächsten Versuch mehr Tempo.",
  "目標を小さく保ちましょう。まず正確さを優先し、次の反復で速度を上げます。",
  "把目标定得小一些：先保证准确，再在下一次尝试中提高速度。"
);
const checkpoint = t(
  "Complete one clean repetition without stopping.",
  "Complete uma repetição limpa sem parar.",
  "Completa una repetición limpia sin detenerte.",
  "Spiele eine saubere Wiederholung ohne anzuhalten.",
  "止まらずに、きれいな反復を1回完成させましょう。",
  "不停顿地完成一次干净的重复。"
);

const lessons = {
  "find-the-tonic": [
    t("Find the tonic", "Encontre a tônica", "Encuentra la tónica", "Finde den Grundton", "主音を見つける", "找到主音"),
    t("Hear and locate the note that makes a phrase feel complete.", "Ouça e encontre a nota que faz a frase parecer completa.", "Escucha y encuentra la nota que hace que una frase se sienta completa.", "Höre und finde den Ton, der eine Phrase abschließt.", "フレーズを落ち着かせる音を聴き分けます。", "听辨并找到让乐句产生结束感的音。"),
    "ear-training", "piano", 6,
    "```notes\nid: tonic-home\ntitle: Return to C\ninstrument: piano\ntempo: 72\nsequence: C4 E4 G4 B4 C5/2\n```"
  ],
  "major-vs-minor": [
    t("Major or minor?", "Maior ou menor?", "¿Mayor o menor?", "Dur oder Moll?", "メジャー？マイナー？", "大调还是小调？"),
    t("Compare the third degree and hear how one note changes the color.", "Compare o terceiro grau e ouça como uma nota muda a cor.", "Compara el tercer grado y escucha cómo una nota cambia el color.", "Vergleiche die Terz und höre, wie ein Ton die Farbe ändert.", "第3音を比べ、1音で響きが変わることを聴きます。", "比较第三级音，听一个音如何改变色彩。"),
    "ear-training", "guitar", 7,
    "```notes\nid: major-minor\ntitle: Major then minor\ninstrument: guitar\ntempo: 68\nsequence: C3 D3 E3 F3 G3/2 C3 D3 Eb3 F3 G3/2\n```"
  ],
  "c-major-one-octave": [
    t("C major: one octave", "Dó maior: uma oitava", "Do mayor: una octava", "C-Dur: eine Oktave", "Cメジャー：1オクターブ", "C大调：一个八度"),
    t("Play eight scale tones with an even pulse and relaxed fingers.", "Toque oito notas da escala com pulsação regular e dedos relaxados.", "Toca ocho notas con pulso uniforme y dedos relajados.", "Spiele acht Skalentöne mit gleichmäßigem Puls und lockeren Fingern.", "8つの音を均等な拍とリラックスした指で弾きます。", "用均匀节拍和放松的手指演奏八个音。"),
    "keyboard", "piano", 7,
    "```notes\nid: c-octave\ntitle: C major up and down\ninstrument: piano\ntempo: 70\nsequence: C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4/2\n```"
  ],
  "c-major-open-position": [
    t("C major in open position", "Dó maior na posição aberta", "Do mayor en posición abierta", "C-Dur in offener Lage", "オープンポジションのCメジャー", "开放把位C大调"),
    t("Follow exact strings and frets through a compact C-major shape.", "Siga cordas e casas exatas em uma forma compacta de dó maior.", "Sigue cuerdas y trastes exactos en una forma compacta de do mayor.", "Folge exakten Saiten und Bünden in einer kompakten C-Dur-Form.", "正確な弦とフレットでCメジャーを弾きます。", "按准确的弦和品位演奏紧凑的C大调音型。"),
    "fretboard", "guitar", 7,
    "```fretboard\nid: c-open\ntitle: C major open position\ninstrument: guitar\ntuning: E2 A2 D3 G3 B3 E4\nfrets: 0-5\ntempo: 70\npositions: 5:3/3 4:0 4:2/2 4:3/3 3:0 3:2/2 2:0 2:1/1\n```"
  ],
  "connect-pentatonic-positions": [
    t("Connect pentatonic positions", "Conecte posições pentatônicas", "Conecta posiciones pentatónicas", "Verbinde Pentatonik-Lagen", "ペンタトニックのポジションをつなぐ", "连接五声音阶把位"),
    t("Cross one position boundary without breaking the pulse.", "Atravesse uma mudança de posição sem interromper a pulsação.", "Cruza un cambio de posición sin romper el pulso.", "Wechsle die Lage, ohne den Puls zu unterbrechen.", "拍を止めずにポジションを移動します。", "在不打断节拍的情况下跨越一个把位。"),
    "fretboard", "guitar", 7,
    "```notes\nid: pentatonic-bridge\ntitle: A minor pentatonic bridge\ninstrument: guitar\ntempo: 72\nsequence: A2 C3 D3 E3 G3 A3 C4 D4 E4 G4 A4\n```"
  ],
  "octave-pivot-relay": [
    t("Octave pivot relay", "Revezamento de pivôs de oitava", "Relevo de pivotes de octava", "Oktav-Drehpunkt-Staffel", "オクターブ・ピボット・リレー", "八度支点接力"),
    t("Use octave shapes to move a scale idea between bass strings.", "Use formas de oitava para mover uma ideia de escala entre as cordas do baixo.", "Usa formas de octava para mover una idea entre cuerdas del bajo.", "Nutze Oktavformen, um eine Skalenidee über Basssaiten zu bewegen.", "オクターブ形でベース弦をまたいで移動します。", "用八度指型在贝斯弦之间移动音阶动机。"),
    "fretboard", "bass", 7,
    "```fretboard\nid: octave-relay\ntitle: A octave relay\ninstrument: bass\ntuning: E1 A1 D2 G2\nfrets: 0-9\ntempo: 68\npositions: 4:5/1 2:7/3 3:5/1 1:7/3 4:5/1\n```"
  ],
  "rest-and-return": [
    t("Rest and return", "Pausa e retorno", "Pausa y regreso", "Pause und Rückkehr", "休符とリターン", "休止与回归"),
    t("Shape a short phrase by leaving deliberate silence before the tonic.", "Modele uma frase curta deixando silêncio antes da tônica.", "Da forma a una frase dejando silencio antes de la tónica.", "Forme eine Phrase mit bewusster Stille vor dem Grundton.", "主音の前に意図的な休符を置きます。", "在主音前留出有意识的空白来塑造乐句。"),
    "rhythm", "guitar", 6,
    "```notes\nid: rest-return\ntitle: Phrase with rests\ninstrument: guitar\ntempo: 76\nbeat: 0.5\nsequence: A3 C4 D4 - E4 G4 - A4/2\n```"
  ],
  "bass-groove-scale-fill": [
    t("Bass groove scale fill", "Virada de escala no groove de baixo", "Relleno de escala en el groove de bajo", "Bass-Groove mit Skalen-Fill", "ベースグルーヴのスケールフィル", "贝斯律动音阶加花"),
    t("Keep the root groove steady, then add a scale fill at the phrase ending.", "Mantenha o groove da tônica e adicione uma virada no fim da frase.", "Mantén el groove de raíz y añade un relleno al final.", "Halte den Grundton-Groove und ergänze am Phrasenende ein Fill.", "ルートのグルーヴを保ち、最後にフィルを加えます。", "保持根音律动，在乐句末尾加入音阶加花。"),
    "rhythm", "bass", 8,
    "```notes\nid: bass-fill\ntitle: Groove and fill\ninstrument: bass\ntempo: 82\nbeat: 0.5\nsequence: A2 A2 E3 A2 A2 E3 G3 A3 B3 C4 D4 E4/2\n```"
  ],
  "diatonic-thirds-across-neck": [
    t("Diatonic thirds across the neck", "Terças diatônicas pelo braço", "Terceras diatónicas por el mástil", "Diatonische Terzen über das Griffbrett", "指板を横断するダイアトニック3度", "横跨指板的自然音三度"),
    t("Keep every skip-step pair even while the fingering changes.", "Mantenha cada par em terças regular enquanto a digitação muda.", "Mantén uniforme cada pareja de terceras mientras cambia la digitación.", "Halte jedes Terzpaar gleichmäßig, während der Fingersatz wechselt.", "運指が変わっても3度のペアを均等に保ちます。", "在指法变化时保持每组三度均匀。"),
    "theory", "guitar", 8,
    "```notes\nid: thirds-neck\ntitle: C major in thirds\ninstrument: guitar\ntempo: 66\nsequence: C3 E3 D3 F3 E3 G3 F3 A3 G3 B3 A3 C4 B3 D4 C4\n```"
  ],
  "contrary-motion-scale-mirror": [
    t("Contrary-motion scale mirror", "Espelho de escalas em movimento contrário", "Espejo de escalas en movimiento contrario", "Tonleiter-Spiegel in Gegenbewegung", "反進行スケール・ミラー", "反向进行音阶镜像"),
    t("Balance both hands as they travel away from and back to the center.", "Equilibre as mãos enquanto se afastam e voltam ao centro.", "Equilibra ambas manos al alejarse y volver al centro.", "Balanciere beide Hände auf dem Weg vom Zentrum und zurück.", "両手が中央から離れ戻る動きをそろえます。", "双手从中心向外再返回时保持平衡。"),
    "keyboard", "piano", 8,
    "```notes\nid: contrary-mirror\ntitle: Contrary motion in C\ninstrument: piano\ntempo: 60\nsequence: [C3,C5] [B2,D5] [A2,E5] [G2,F5] [F2,G5] [G2,F5] [A2,E5] [B2,D5] [C3,C5]/2\n```"
  ],
  "chord-tone-landing": [
    t("Chord-tone landing", "Pouso nas notas do acorde", "Llegada a notas del acorde", "Landung auf Akkordtönen", "コードトーンに着地", "落在和弦音上"),
    t("Aim short scale runs at the third of each changing chord.", "Direcione frases de escala para a terça de cada acorde.", "Dirige frases de escala a la tercera de cada acorde.", "Ziele kurze Skalenläufe auf die Terz jedes Akkords.", "短いスケールを各コードの3度へ着地させます。", "让短音阶乐句落在每个和弦的三音上。"),
    "improvisation", "guitar", 8,
    "```notes\nid: chord-landing\ntitle: Land on thirds\ninstrument: guitar\ntempo: 72\nsequence: C4 D4 E4/2 G4 F4 E4 D4 C4/2 A3 B3 C4 D4 E4/2\n```"
  ],
  "dorian-aeolian-color-switch": [
    t("Dorian–Aeolian color switch", "Troca de cor dórico–eólio", "Cambio de color dórico–eólico", "Dorisch-Äolisch-Farbwechsel", "ドリアン–エオリアンの色替え", "多利亚–自然小调色彩切换"),
    t("Change only the sixth degree and hear the mode shift over one root.", "Mude somente o sexto grau e ouça a troca de modo sobre a mesma tônica.", "Cambia solo el sexto grado y escucha el cambio modal sobre una raíz.", "Ändere nur die Sexte und höre den Moduswechsel über demselben Grundton.", "第6音だけを変え、同じ主音上のモード変化を聴きます。", "只改变第六级，听同一根音上的调式变化。"),
    "ear-training", "guitar", 8,
    "```notes\nid: dorian-aeolian\ntitle: Dorian then Aeolian\ninstrument: guitar\ntempo: 68\nsequence: D3 E3 F3 G3 A3 B3 C4 D4/2 D3 E3 F3 G3 A3 Bb3 C4 D4/2\n```"
  ]
};

const sectionSpecs = [
  ["beginner", t("Beginner", "Iniciante", "Principiante", "Anfänger", "初級", "初级"), t("Build a reliable musical home base.", "Construa uma base musical confiável.", "Construye una base musical sólida.", "Baue eine sichere musikalische Basis.", "確かな音楽の土台を作ります。", "建立可靠的音乐基础。"), "sparkles", [
    ["home-base", t("Home Base", "Ponto de partida", "Punto de partida", "Ausgangspunkt", "ホームベース", "音乐起点"), ["find-the-tonic", "major-vs-minor"]],
    ["first-octave-trail", t("First Octave Trail", "Trilha da primeira oitava", "Ruta de la primera octava", "Erste Oktavroute", "最初のオクターブ", "第一个八度路径"), ["c-major-one-octave", "c-major-open-position"]]
  ]],
  ["intermediate", t("Intermediate", "Intermediário", "Intermedio", "Mittelstufe", "中級", "中级"), t("Connect positions, rhythm, and musical movement.", "Conecte posições, ritmo e movimento musical.", "Conecta posiciones, ritmo y movimiento musical.", "Verbinde Lagen, Rhythmus und Bewegung.", "ポジション、リズム、動きをつなぎます。", "连接把位、节奏与音乐运动。"), "point.topleft.down.to.point.bottomright.curvepath", [
    ["position-bridges", t("Position Bridges", "Pontes de posição", "Puentes de posición", "Lagenbrücken", "ポジションの橋", "把位桥梁"), ["connect-pentatonic-positions", "octave-pivot-relay"]],
    ["rhythm-lab", t("Rhythm Lab", "Laboratório de ritmo", "Laboratorio de ritmo", "Rhythmuslabor", "リズム研究室", "节奏实验室"), ["rest-and-return", "bass-groove-scale-fill"]]
  ]],
  ["advanced", t("Advanced", "Avançado", "Avanzado", "Fortgeschritten", "上級", "高级"), t("Control intervals, resolution, and modal color.", "Controle intervalos, resolução e cor modal.", "Controla intervalos, resolución y color modal.", "Beherrsche Intervalle, Auflösung und modale Farbe.", "音程、解決、モードの色彩を操ります。", "掌控音程、解决与调式色彩。"), "bolt.fill", [
    ["intervals-in-motion", t("Intervals in Motion", "Intervalos em movimento", "Intervalos en movimiento", "Intervalle in Bewegung", "動く音程", "运动中的音程"), ["diatonic-thirds-across-neck", "contrary-motion-scale-mirror"]],
    ["target-and-resolve", t("Target and Resolve", "Alvo e resolução", "Objetivo y resolución", "Ziel und Auflösung", "狙って解決", "目标与解决"), ["chord-tone-landing", "dorian-aeolian-color-switch"]]
  ]]
];

const summaries = t("Two quick lessons with one clear goal each.", "Duas lições rápidas com um objetivo claro cada.", "Dos lecciones rápidas con un objetivo claro cada una.", "Zwei kurze Lektionen mit je einem klaren Ziel.", "明確な目標を持つ2つの短いレッスンです。", "两节各有明确目标的短课。")
const sections = sectionSpecs.map(([id, titles, sectionSummaries, theme, units], sectionIndex) => ({
  id, level: id, order: sectionIndex + 1, titles, summaries: sectionSummaries, theme,
  units: units.map(([unitID, unitTitles, ids], unitIndex) => ({
    id: unitID, order: unitIndex + 1, titles: unitTitles, summaries, theme,
    lessons: ids.map((lessonID, lessonIndex) => {
      const [titles, lessonSummaries, activity, instrument, estimatedMinutes] = lessons[lessonID];
      return { id: lessonID, order: lessonIndex + 1, estimatedMinutes, activity, instrument, optional: lessonIndex === 1,
        titles, summaries: lessonSummaries,
        path: `sections/${id}/units/${unitID}/lessons/${lessonID}/lesson.md` };
    })
  }))
}));

fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, "course.json"), `${JSON.stringify({ schema: 2, id: "instrument-scales", revision: 2,
  titles: t("Instrument Scales", "Escalas de instrumentos", "Escalas de instrumentos", "Instrumentenskalen", "楽器のスケール", "乐器音阶"),
  levels: ["beginner", "intermediate", "advanced"] }, null, 2)}\n`);
fs.writeFileSync(path.join(root, "catalog.json"), `${JSON.stringify({ schema: 2, course: "instrument-scales", revision: 2, sections }, null, 2)}\n`);

for (const section of sections) for (const unit of section.units) for (const ref of unit.lessons) {
  const data = lessons[ref.id];
  const directory = path.join(root, path.dirname(ref.path));
  fs.mkdirSync(directory, { recursive: true });
  const metadata = ["---", "schema: 2", `id: ${ref.id}`, "course: instrument-scales", `level: ${section.level}`,
    `section: ${section.id}`, `unit: ${unit.id}`, `order: ${ref.order}`, "revision: 1", `estimatedMinutes: ${ref.estimatedMinutes}`,
    `instrument: ${ref.instrument}`];
  for (const locale of Object.keys(data[0])) metadata.push(`title.${locale}: ${data[0][locale]}`);
  for (const locale of Object.keys(data[1])) metadata.push(`summary.${locale}: ${data[1][locale]}`);
  metadata.push("---", "", ":::localized");
  for (const locale of Object.keys(data[0])) metadata.push(`:::locale ${locale}`, `# ${data[0][locale]}`, "", data[1][locale], "", practice[locale], "", coaching[locale], "", `:::checkpoint ${checkpoint[locale]}`, "");
  metadata.push(":::endlocalized", "", data[5], "");
  fs.writeFileSync(path.join(directory, "lesson.md"), metadata.join("\n"));
}
console.log("Generated the 3-section, 6-unit, 12-lesson V2 starter curriculum.");
