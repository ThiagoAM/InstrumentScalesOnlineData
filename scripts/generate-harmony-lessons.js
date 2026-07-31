#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DATA_ROOT = path.resolve(__dirname, "..");
const COURSE_ROOT = path.join(DATA_ROOT, "v2/education/courses/chords-harmony");
const CATALOG_PATH = path.join(COURSE_ROOT, "catalog.json");
const LOCALES = ["en", "pt-BR", "es", "de", "ja", "zh-Hans"];

const l = (en, ptBR, es, de, ja, zhHans) => ({
  en,
  "pt-BR": ptBR,
  es,
  de,
  ja,
  "zh-Hans": zhHans,
});
const same = (value) => Object.fromEntries(LOCALES.map((locale) => [locale, value]));

const ACTIONS = {
  play: l("Play", "Toque", "Toca", "Spiele", "弾く", "弹奏"),
  build: l("Build", "Monte", "Construye", "Baue", "組み立てる", "构建"),
  hear: l("Hear", "Ouça", "Escucha", "Höre", "聴き分ける", "聆听"),
  compare: l("Compare", "Compare", "Compara", "Vergleiche", "比べる", "比较"),
  tap: l("Tap", "Marque", "Marca", "Klopfe", "叩く", "击拍"),
  follow: l("Follow", "Acompanhe", "Sigue", "Verfolge", "追う", "跟随"),
  read: l("Read", "Leia", "Lee", "Lies", "読む", "识读"),
  write: l("Write", "Escreva", "Escribe", "Schreibe", "書く", "写出"),
  keep: l("Keep", "Mantenha", "Mantén", "Halte", "保つ", "保持"),
  resolve: l("Resolve", "Resolva", "Resuelve", "Löse", "解決する", "解决"),
  connect: l("Connect", "Conecte", "Conecta", "Verbinde", "つなぐ", "连接"),
  arrange: l("Arrange", "Arranje", "Arregla", "Arrangiere", "編曲する", "编配"),
  borrow: l("Borrow", "Empreste", "Toma prestado", "Entlehne", "借用する", "借用"),
};

function localizedTitle(action, target, locale) {
  if (locale === "ja") return `${target[locale]}を${ACTIONS[action][locale]}`;
  if (locale === "zh-Hans") return `${ACTIONS[action][locale]}${target[locale]}`;
  return `${ACTIONS[action][locale]} ${target[locale]}`;
}

function progression(slug, target, numerals, options = {}) {
  return {
    slug,
    action: options.action || "play",
    target: typeof target === "string" ? same(target) : target,
    kind: "progression",
    key: options.key || "C",
    scale: options.scale || "Major",
    numerals,
    tempo: options.tempo || 72,
    beats: options.beats || 2,
    seventh: options.seventh || false,
    alternatives: options.alternatives,
  };
}

function chord(slug, target, root, quality, options = {}) {
  return {
    slug,
    action: options.action || "build",
    target: typeof target === "string" ? same(target) : target,
    kind: "chord",
    root,
    quality,
    style: options.style || "arpeggio",
    tempo: options.tempo || 68,
    repeats: options.repeats || 3,
  };
}

function notes(slug, target, sequence, options = {}) {
  return {
    slug,
    action: options.action || "follow",
    target: typeof target === "string" ? same(target) : target,
    kind: "notes",
    sequence,
    tempo: options.tempo || 66,
    beat: options.beat || 2,
    splitAt: options.splitAt,
  };
}

function compare(slug, target, a, b, options = {}) {
  return {
    slug,
    action: options.action || "compare",
    target: typeof target === "string" ? same(target) : target,
    kind: "compare",
    root: options.root || "C",
    scale: options.scale || "Major",
    a,
    b,
    tempo: options.tempo || 68,
  };
}

function tap(slug, target, pattern, options = {}) {
  return {
    slug,
    action: "tap",
    target: typeof target === "string" ? same(target) : target,
    kind: "tap",
    pattern,
    tempo: options.tempo || 72,
  };
}

const KIND_LANGUAGE = {
  progression: {
    en: "Read the numerals before you play. On the first pass, follow the bass roots; on the second, listen to the last chord and decide whether it closes the phrase. Keep every chord the same length. On the third pass, say each numeral one beat before it arrives. If a change is late, isolate that pair and reconnect it before repeating the whole example.",
    "pt-BR": "Leia os algarismos antes de tocar. Na primeira passagem, acompanhe as fundamentais do baixo; na segunda, escute o último acorde e decida se ele fecha a frase. Dê a mesma duração a todos os acordes. Na terceira passagem, diga cada algarismo um tempo antes da entrada. Se uma troca atrasar, isole o par e reconecte-o antes de repetir o exemplo inteiro.",
    es: "Lee los números antes de tocar. En la primera pasada, sigue las fundamentales del bajo; en la segunda, escucha el último acorde y decide si cierra la frase. Mantén la misma duración para todos los acordes. En la tercera pasada, di cada número un pulso antes de que llegue. Si un cambio se retrasa, aísla ese par y vuelve a conectarlo antes de repetir el ejemplo completo.",
    de: "Lies die Stufen vor dem Spielen. Verfolge im ersten Durchgang die Basstöne; höre im zweiten auf den letzten Akkord und entscheide, ob er die Phrase schließt. Gib jedem Akkord dieselbe Länge. Sage im dritten Durchgang jede Stufe einen Schlag vor ihrem Einsatz. Kommt ein Wechsel zu spät, übe nur dieses Paar und setze danach das ganze Beispiel wieder zusammen.",
    ja: "弾く前にローマ数字を読みます。1回目は低音、2回目は最後のコードの終止感を聴きます。長さをそろえ、3回目は各数字を1拍前に言ってください。遅れた変更は2コードだけで直してから全体へ戻し、最後の響きが続きと停止のどちらを求めるか答えます。",
    "zh-Hans": "弹奏前先读出罗马数字。第一遍只跟随低音根音，第二遍聆听最后一个和弦是否真正结束乐句。所有和弦保持相同长度；第三遍在每个和弦进入前一拍说出其级数。若某次转换迟到，只循环那一对和弦，拍点稳定后再放回完整进行。不要用更大音量掩盖换和弦的问题，依次检查低音、共同音和终止感。让最后的和弦充分延长，并明确说出耳朵期待继续还是停止。",
  },
  chord: {
    en: "Play the chord once as a block, then once as a slow arpeggio. Name the root and quality before the second pass. Sing the defining tone named above and replay the chord to check it. Keep the root sounding while you add the remaining tones one at a time. Finish with three even attacks, listening for a clear onset rather than extra force.",
    "pt-BR": "Toque o acorde uma vez em bloco e depois como arpejo lento. Diga a fundamental e a qualidade antes da segunda passagem. Cante a nota definidora indicada acima e toque novamente para conferi-la. Sustente a fundamental enquanto acrescenta as demais notas uma a uma. Termine com três ataques regulares, buscando início claro sem aumentar a força.",
    es: "Toca el acorde una vez en bloque y después como arpegio lento. Di la fundamental y la cualidad antes de la segunda pasada. Canta la nota definitoria indicada arriba y repite el acorde para comprobarla. Mantén la fundamental mientras añades las demás notas una por una. Termina con tres ataques regulares, buscando un inicio claro sin añadir fuerza.",
    de: "Spiele den Akkord einmal als Block und danach als langsames Arpeggio. Nenne vor dem zweiten Durchgang Grundton und Qualität. Singe den oben genannten Kennzeichnungston und prüfe ihn am Akkord. Halte den Grundton, während du die übrigen Töne einzeln hinzufügst. Beende die Übung mit drei gleichmäßigen Anschlägen und achte auf einen klaren Beginn statt auf mehr Kraft.",
    ja: "最初は同時に鳴らし、次はゆっくりアルペジオにします。2回目の前にルートとクオリティを言い、上で示した特徴音を歌って確認します。ルートへ他の音を一つずつ加え、立ち上がりのそろった3回のアタックで終えます。濁ったら構成音を確認して重ね直します。",
    "zh-Hans": "先把和弦同时奏响一次，再用慢速琶音奏一次。第二遍之前说出根音与性质。唱出上面指定的决定音，再重弹和弦核对。保持根音持续，同时逐个加入其余和弦音。最后用三次均匀而清楚的起音收尾；若声音混浊，就放慢速度逐音确认后重新叠合。",
  },
  notes: {
    en: "Listen once without playing and follow the lowest note. On the next pass, track the highest note instead. Play the written voicings slowly enough that every attack begins together. Then isolate the one voice that moves by step and sing it over the held chords. Repeat the full sequence three times without changing register; the comparison only works when rhythm, touch, and spacing stay consistent.",
    "pt-BR": "Escute uma vez sem tocar e acompanhe a nota mais grave. Na passagem seguinte, siga a nota mais aguda. Toque as aberturas escritas devagar, fazendo todas as notas começarem juntas. Depois isole a voz que anda por grau conjunto e cante-a sobre os acordes sustentados. Repita a sequência inteira três vezes sem mudar de registro; a comparação só funciona com ritmo, ataque e espaçamento constantes.",
    es: "Escucha una vez sin tocar y sigue la nota más grave. En la pasada siguiente, atiende a la nota más aguda. Toca las disposiciones escritas despacio, procurando que todas las notas comiencen juntas. Después aísla la voz que se mueve por grado conjunto y cántala sobre los acordes sostenidos. Repite la secuencia completa tres veces sin cambiar de registro; la comparación exige ritmo, ataque y espacio constantes.",
    de: "Höre einmal nur zu und verfolge den tiefsten Ton. Achte im nächsten Durchgang stattdessen auf den höchsten Ton. Spiele die notierten Lagen so langsam, dass alle Töne gemeinsam beginnen. Isoliere danach die Stimme, die sich schrittweise bewegt, und singe sie über den gehaltenen Akkorden. Wiederhole die ganze Folge dreimal ohne Lagenwechsel; nur bei gleichem Rhythmus, Anschlag und Abstand bleibt der Vergleich aussagekräftig.",
    ja: "最初は最低音だけ、次は最高音だけを追って聴きます。全音が同時に始まる速さで弾き、順次進行する声部を取り出してコードの上で歌ってください。音域を変えず3回繰り返し、動く声部の出発音と到着音、半音か全音かを確認します。最後は低音と上声のどちらが終止感を強めたか説明します。",
    "zh-Hans": "先只听一遍，不弹奏，并跟随最低音；下一遍改为跟随最高音。慢速弹奏写出的和弦配置，确保每个音同时开始。随后单独找出级进移动的声部，在持续和弦上把它唱出来。保持同一音区，把完整序列重复三遍；只有节奏、触键和音程间距一致时，比较才有意义。每遍之前说出移动声部的起点与终点，并判断它走了半音还是全音。延长最后一个和弦，再说明低音或上声哪一方更加强了终止感。",
  },
  compare: {
    en: "Play A and B with the same tempo, register, and touch. Do not decide from the label: sing the changed scale degree before replaying each side. Alternate the pair four times, leaving one silent beat between them. On the last two passes, look away from the screen and identify the version from the sound alone. If the answer is uncertain, reduce the example to the one changed note and its destination.",
    "pt-BR": "Toque A e B com o mesmo andamento, registro e ataque. Não decida pelo rótulo: cante o grau alterado antes de repetir cada lado. Alterne o par quatro vezes e deixe um tempo de silêncio entre as versões. Nas duas últimas passagens, desvie os olhos da tela e identifique a versão apenas pelo som. Se houver dúvida, reduza o exemplo à nota que mudou e ao destino dela.",
    es: "Toca A y B con el mismo tempo, registro y ataque. No decidas por la etiqueta: canta el grado que cambia antes de repetir cada lado. Alterna el par cuatro veces y deja un pulso de silencio entre las versiones. En las dos últimas pasadas, aparta la vista de la pantalla e identifica la versión solo por el sonido. Si dudas, reduce el ejemplo a la nota modificada y a su destino.",
    de: "Spiele A und B mit gleichem Tempo, gleicher Lage und gleichem Anschlag. Entscheide nicht nach der Beschriftung: Singe vor jeder Wiederholung die veränderte Stufe. Wechsle viermal zwischen beiden Fassungen und lasse jeweils einen Schlag Stille. Schaue bei den letzten zwei Durchgängen weg und erkenne die Fassung nur am Klang. Bleibt die Antwort unsicher, reduziere das Beispiel auf den veränderten Ton und sein Ziel.",
    ja: "AとBを同じテンポ、音域、タッチで鳴らします。変化する音を歌い、間に1拍の無音を置いて4回交互に聴いてください。最後の2回は画面を見ずに答えます。迷ったら変わる1音と到着音だけを確認し、全体へ戻して明るさ、緊張、安定のどれが変わったか説明します。",
    "zh-Hans": "用相同速度、音区和触键播放A与B。不要根据标签作答；重播每一边之前，先唱出发生变化的音级。两者交替四次，中间留一拍安静。最后两遍移开视线，只凭声音判断版本。若答案仍不确定，就把例子缩减为那个变化音及其去向，再放回完整和声。作答后简要说明该音改变的是明亮度、张力还是稳定感。保持节奏与音量不变，只比较音程关系。",
  },
  tap: {
    en: "Count one full bar before the first tap. Keep the pulse moving through every rest instead of pausing the count. Tap the pattern four times, speaking each attack as “tap” and each rest as “rest.” On the last pass, accent only beat one. A correct attempt has an even count-in, silent rests, and no extra tap at the bar line.",
    "pt-BR": "Conte um compasso inteiro antes do primeiro toque. Mantenha o pulso durante cada pausa, sem interromper a contagem. Marque o padrão quatro vezes, dizendo “toque” em cada ataque e “pausa” em cada silêncio. Na última passagem, acentue apenas o tempo um. A tentativa correta tem contagem regular, pausas silenciosas e nenhum toque extra na barra.",
    es: "Cuenta un compás completo antes del primer golpe. Mantén el pulso durante cada silencio sin detener la cuenta. Marca el patrón cuatro veces, diciendo “golpe” en cada ataque y “silencio” en cada pausa. En la última pasada, acentúa solo el primer pulso. El intento correcto tiene entrada regular, silencios reales y ningún golpe extra en la barra.",
    de: "Zähle vor dem ersten Schlag einen ganzen Takt ein. Halte den Puls in jeder Pause weiter. Klopfe das Muster viermal und sage bei jedem Anschlag „Schlag“ und bei jeder Pause „Pause“. Betone im letzten Durchgang nur Schlag eins. Ein korrekter Versuch hat ein gleichmäßiges Einzählen, echte Pausen und keinen zusätzlichen Schlag am Taktstrich.",
    ja: "最初のタップ前に1小節を数え、休符でも拍を止めません。アタックでは「タップ」、休符では「休み」と言いながら4回叩き、最後は1拍目だけを強調します。均等なカウントイン、完全な無音、余分なタップがないことを録音で確認します。",
    "zh-Hans": "第一次击拍前先完整数一小节，休止时也让内部拍点继续。连续四遍，在起音处说“击”，休止处说“停”；最后一遍只强调第一拍。正确尝试应有均匀预备拍、真正安静的休止，并且小节线处没有多余击拍。",
  },
};

const BODY_OPENERS = {
  en: [
    (summary, concept, target) => `${summary} ${concept} Keep ${target} as the fixed reference, so the ear can connect the written symbol to one audible result. Before touching the play control, say what should remain stable and what should move. That prediction turns playback into a check rather than a demonstration.`,
    (summary, concept, target) => `${summary} ${concept} Treat ${target} as a short musical sentence, not a diagram. Read it aloud, locate its root or bass path, and predict the point of greatest tension. The prediction matters because harmony becomes useful when you can anticipate its direction before the next chord sounds.`,
    (summary, concept, target) => `${summary} ${concept} The material ${target} is deliberately brief. Hold tempo and register constant while you listen for the exact interval, bass note, or function named here. Removing extra variables makes the lesson transferable to another key, instrument, or voicing.`,
  ],
  "pt-BR": [
    (summary, concept, target) => `${summary} ${concept} Mantenha ${target} como referência fixa para ligar o símbolo escrito a um resultado audível. Antes de iniciar a reprodução, diga o que deve permanecer estável e o que deve se mover. Essa previsão transforma a escuta em verificação, não em simples demonstração.`,
    (summary, concept, target) => `${summary} ${concept} Trate ${target} como frase musical curta, não como diagrama. Leia em voz alta, localize a fundamental ou o caminho do baixo e antecipe o ponto de maior tensão. A harmonia se torna prática quando a direção é ouvida antes da chegada do próximo acorde.`,
    (summary, concept, target) => `${summary} ${concept} O material ${target} é breve de propósito. Preserve andamento e registro enquanto escuta o intervalo, a nota do baixo ou a função indicada. Ao retirar variáveis extras, a mesma ideia pode ser levada para outra tonalidade, outro instrumento ou outra abertura.`,
  ],
  es: [
    (summary, concept, target) => `${summary} ${concept} Mantén ${target} como referencia fija para unir el símbolo escrito con un resultado audible. Antes de iniciar la reproducción, di qué debe permanecer estable y qué debe moverse. Esa predicción convierte la escucha en una comprobación y no en una simple demostración.`,
    (summary, concept, target) => `${summary} ${concept} Trata ${target} como una frase musical corta, no como un diagrama. Léelo en voz alta, localiza la fundamental o el recorrido del bajo y anticipa el punto de mayor tensión. La armonía resulta práctica cuando puedes prever su dirección antes del siguiente acorde.`,
    (summary, concept, target) => `${summary} ${concept} El material ${target} es breve a propósito. Mantén constantes el tempo y el registro mientras escuchas el intervalo, la nota del bajo o la función indicada. Al retirar variables innecesarias, la misma idea se traslada a otra tonalidad, instrumento o disposición.`,
  ],
  de: [
    (summary, concept, target) => `${summary} ${concept} Nutze ${target} als feste Referenz, damit das notierte Symbol mit einem hörbaren Ergebnis verbunden wird. Sage vor dem Abspielen, was stabil bleiben und was sich bewegen soll. Diese Vorhersage macht das Hören zu einer Kontrolle und nicht nur zu einer Vorführung.`,
    (summary, concept, target) => `${summary} ${concept} Behandle ${target} als kurzen musikalischen Satz und nicht als Diagramm. Lies ihn laut, finde Grundton oder Bassweg und sage die stärkste Spannungsstelle voraus. Harmonie wird praktisch, wenn ihre Richtung bereits vor dem nächsten Akkord hörbar ist.`,
    (summary, concept, target) => `${summary} ${concept} Das Material ${target} ist bewusst kurz. Halte Tempo und Lage konstant, während du genau auf das genannte Intervall, den Basston oder die Funktion hörst. Ohne zusätzliche Variablen lässt sich dieselbe Idee auf eine andere Tonart, ein anderes Instrument oder eine andere Lage übertragen.`,
  ],
  ja: [
    (summary, concept, target) => `${summary}${concept}${target}を基準に記号と響きを結びます。再生前に保つ音と動く音を言い、低音、3度、7度、終止位置のうち一つへ注意を絞ってください。最後まで拍を保ち、別の音域でも関係が残るか考えます。`,
    (summary, concept, target) => `${summary}${concept}${target}を短い楽句として扱います。記号を読み、ルートまたは低音を確認し、最大の緊張位置を予想してください。テンポと音域を変えず、共通音と動く音を分けて聴き、別のキーでも機能が残る理由を説明します。`,
    (summary, concept, target) => `${summary}${concept}${target}は短い素材です。テンポと音域を一定にして指定された音程、低音、機能だけを聴きます。記号を読み、低音を歌い、全体を鳴らして、安定する音と次へ進む音を答えてください。`,
  ],
  "zh-Hans": [
    (summary, concept, target) => `${summary}${concept}把${target}作为固定参照，将书面符号与实际听感连接起来。播放前先说出哪些音应保持、哪些音应移动；有了预测，播放就成为听觉核对，而不只是示范。不要只靠和弦名称作答，把注意力集中在本课指定的低音、三音、七音或终止位置。思考换到另一音区后关系为何仍然成立，并让稳定拍点持续到最后一个和弦完全结束。`,
    (summary, concept, target) => `${summary}${concept}把${target}当作一句短乐句，而不是静止图表。先读出符号，找出根音或低音路线，再预测张力最大的时刻。能够在下一个和弦出现前听见方向，和声知识才会进入实际演奏。保持速度与音区不变，分别辨认共同音与移动音。最后说明移调后为何仍保留同一功能，再回到原例确认一次。`,
    (summary, concept, target) => `${summary}${concept}${target}被刻意保持简短。固定速度与音区，只聆听本课指定的音程、低音或功能；减少多余变量后，同一思路才能可靠地转移到别的调、乐器或和弦配置。先读符号，再唱低音，最后弹完整和声。说出哪个音稳定、哪个音倾向继续，并核对预测是否与实际声音一致。`,
  ],
};

const SUMMARY_SUFFIXES = {
  en: [(t) => `Working example: ${t}.`, (t) => `Apply the idea to ${t}.`, (t) => `Hear the result in ${t}.`],
  "pt-BR": [(t) => `Exemplo prático: ${t}.`, (t) => `Aplique a ideia a ${t}.`, (t) => `Escute o resultado em ${t}.`],
  es: [(t) => `Ejemplo práctico: ${t}.`, (t) => `Aplica la idea a ${t}.`, (t) => `Escucha el resultado en ${t}.`],
  de: [(t) => `Arbeitsbeispiel: ${t}.`, (t) => `Wende die Idee auf ${t} an.`, (t) => `Höre das Ergebnis in ${t}.`],
  ja: [(t) => `練習例は${t}です。`, (t) => `${t}で考え方を試します。`, (t) => `${t}の響きで確かめます。`],
  "zh-Hans": [(t) => `练习材料是${t}。`, (t) => `用${t}应用这一思路。`, (t) => `在${t}中确认听感。`],
};

function checkpoint(lesson, locale) {
  const target = lesson.target[locale];
  const bpm = lesson.tempo;
  const prompts = {
    play: l(
      `Play ${target} three times at ${bpm} BPM; before the last pass, name the root, bass, or function you are tracking.`,
      `Toque ${target} três vezes a ${bpm} BPM; antes da última, diga a fundamental, o baixo ou a função acompanhada.`,
      `Toca ${target} tres veces a ${bpm} BPM; antes de la última, di la fundamental, el bajo o la función que sigues.`,
      `Spiele ${target} dreimal bei ${bpm} BPM; nenne vor dem letzten Durchgang Grundton, Bass oder verfolgte Funktion.`,
      `${target}を${bpm} BPMで3回弾き、最後の前に追うルート、低音、機能のどれかを言う。`,
      `以${bpm} BPM弹奏${target}三遍；最后一遍前说出正在跟随的根音、低音或功能。`),
    build: l(
      `Build ${target} from its root, name each interval, then play the finished chord three times at ${bpm} BPM.`,
      `Monte ${target} desde a fundamental, diga cada intervalo e toque o acorde completo três vezes a ${bpm} BPM.`,
      `Construye ${target} desde la fundamental, di cada intervalo y toca el acorde completo tres veces a ${bpm} BPM.`,
      `Baue ${target} vom Grundton aus, nenne jedes Intervall und spiele den fertigen Akkord dreimal bei ${bpm} BPM.`,
      `${target}をルートから組み立て、各音程を言ってから完成したコードを${bpm} BPMで3回弾く。`,
      `从根音构建${target}，说出每个音程，再以${bpm} BPM弹奏完整和弦三次。`),
    hear: l(
      `Hear ${target} once without looking, state its quality or destination, then replay it to check the answer.`,
      `Ouça ${target} uma vez sem olhar, diga a qualidade ou o destino e reproduza novamente para conferir.`,
      `Escucha ${target} una vez sin mirar, di su cualidad o destino y repítelo para comprobar la respuesta.`,
      `Höre ${target} einmal ohne hinzusehen, nenne Qualität oder Ziel und prüfe die Antwort beim nächsten Durchgang.`,
      `${target}を画面を見ずに一度聴き、クオリティまたは到着先を答えてから再生で確認する。`,
      `不看屏幕聆听${target}一遍，说出性质或目标，再重播核对答案。`),
    compare: l(
      `Compare both versions of ${target} four times at ${bpm} BPM and identify ${comparisonFocus(lesson, locale)} twice without looking.`,
      `Compare as duas versões de ${target} quatro vezes a ${bpm} BPM e identifique ${comparisonFocus(lesson, locale)} duas vezes sem olhar.`,
      `Compara las dos versiones de ${target} cuatro veces a ${bpm} BPM e identifica ${comparisonFocus(lesson, locale)} dos veces sin mirar.`,
      `Vergleiche beide Fassungen von ${target} viermal bei ${bpm} BPM und erkenne ${comparisonFocus(lesson, locale)} zweimal ohne Hinsehen.`,
      `${target}の2種類を${bpm} BPMで4回比べ、画面を見ずに${comparisonFocus(lesson, locale)}を2回答える。`,
      `以${bpm} BPM比较${target}的两个版本四遍，并在不看屏幕时两次说出${comparisonFocus(lesson, locale)}。`),
    tap: l(
      `Tap ${target} four times at ${bpm} BPM with every rest silent and no extra beat at the bar line.`,
      `Marque ${target} quatro vezes a ${bpm} BPM, com pausas silenciosas e sem tempo extra na barra.`,
      `Marca ${target} cuatro veces a ${bpm} BPM, con silencios reales y sin pulso extra en la barra.`,
      `Klopfe ${target} viermal bei ${bpm} BPM mit stillen Pausen und ohne Extraschlag am Taktstrich.`,
      `${target}を${bpm} BPMで4回叩き、休符を無音にして小節線に余分な拍を入れない。`,
      `以${bpm} BPM击打${target}四遍，休止保持安静，小节线处不增加拍点。`),
    follow: l(
      `Sing the lowest or named moving voice in ${target}, then play the written sequence three times at ${bpm} BPM.`,
      `Cante a voz mais grave ou indicada em ${target} e toque a sequência escrita três vezes a ${bpm} BPM.`,
      `Canta la voz más grave o indicada de ${target} y toca la secuencia escrita tres veces a ${bpm} BPM.`,
      `Singe die tiefste oder benannte bewegte Stimme in ${target} und spiele die notierte Folge dreimal bei ${bpm} BPM.`,
      `${target}の最低声部または指定された動く声部を歌い、書かれた並びを${bpm} BPMで3回弾く。`,
      `唱出${target}的最低声部或指定移动声部，再以${bpm} BPM弹奏写出的序列三遍。`),
    read: l(
      `Read every symbol in ${target} aloud, state its root or function, then verify the reading at ${bpm} BPM.`,
      `Leia cada símbolo de ${target} em voz alta, diga a fundamental ou função e confira a ${bpm} BPM.`,
      `Lee en voz alta cada símbolo de ${target}, di la fundamental o función y comprueba la lectura a ${bpm} BPM.`,
      `Lies jedes Symbol von ${target} laut, nenne Grundton oder Funktion und prüfe die Lesung bei ${bpm} BPM.`,
      `${target}の記号をすべて読み、ルートまたは機能を言ってから${bpm} BPMで確認する。`,
      `读出${target}的每个符号，说出根音或功能，再以${bpm} BPM核对。`),
    write: l(
      `Write ${target} from memory, circle its bass motion or altered tone, then use playback to correct the page.`,
      `Escreva ${target} de memória, circule o baixo ou a nota alterada e use a reprodução para corrigir o papel.`,
      `Escribe ${target} de memoria, rodea el bajo o la nota alterada y usa la reproducción para corregir la página.`,
      `Schreibe ${target} aus dem Gedächtnis, markiere Bassweg oder Alteration und korrigiere danach mit der Wiedergabe.`,
      `${target}を記憶で書き、低音の動きまたは変化音を囲んでから再生で紙面を直す。`,
      `凭记忆写出${target}，圈出低音移动或变化音，再用播放订正。`),
    keep: l(
      `Hold the specified common or pedal tone through ${target}; repeat three times without reattacking that voice.`,
      `Sustente a nota comum ou pedal indicada em ${target}; repita três vezes sem reatacar essa voz.`,
      `Mantén la nota común o pedal indicada en ${target}; repite tres veces sin volver a atacar esa voz.`,
      `Halte den gemeinsamen oder Pedalton durch ${target} und wiederhole dreimal, ohne diese Stimme neu anzuschlagen.`,
      `${target}の指定された共通音またはペダル音を保ち、その声部を弾き直さず3回繰り返す。`,
      `在${target}中保持指定共同音或持续音；重复三遍且不重新起奏该声部。`),
    resolve: l(
      `Name the tendency tone and its destination in ${target}, sing that motion, then play the resolution three times.`,
      `Diga a nota de tendência e seu destino em ${target}, cante o movimento e toque a resolução três vezes.`,
      `Di la nota de tendencia y su destino en ${target}, canta el movimiento y toca la resolución tres veces.`,
      `Nenne Strebeton und Ziel in ${target}, singe die Bewegung und spiele die Auflösung dreimal.`,
      `${target}の傾向音と到着音を言い、その動きを歌ってから解決を3回弾く。`,
      `说出${target}中的倾向音与目标，唱出该移动，再弹奏解决三遍。`),
    connect: l(
      `Connect ${target} three times at ${bpm} BPM without a gap and name one held or stepwise voice afterward.`,
      `Conecte ${target} três vezes a ${bpm} BPM sem lacuna e depois diga uma voz mantida ou conjunta.`,
      `Conecta ${target} tres veces a ${bpm} BPM sin hueco y después nombra una voz mantenida o conjunta.`,
      `Verbinde ${target} dreimal bei ${bpm} BPM ohne Lücke und nenne danach eine gehaltene oder schrittweise Stimme.`,
      `${target}を${bpm} BPMで隙間なく3回つなぎ、保った声部または順次進行を一つ言う。`,
      `以${bpm} BPM无间隙连接${target}三遍，随后说出一个保持或级进声部。`),
    arrange: l(
      `Mark the bass, chord texture, and phrase boundary for ${target}, then perform the marked version twice at ${bpm} BPM.`,
      `Marque baixo, textura e limite de frase em ${target} e toque a versão anotada duas vezes a ${bpm} BPM.`,
      `Marca bajo, textura y límite de frase en ${target} y toca la versión anotada dos veces a ${bpm} BPM.`,
      `Markiere Bass, Textur und Phrasengrenze für ${target} und spiele die notierte Fassung zweimal bei ${bpm} BPM.`,
      `${target}の低音、テクスチャ、楽句境界を記し、その形を${bpm} BPMで2回演奏する。`,
      `标出${target}的低音、织体与乐句边界，再以${bpm} BPM演奏标注版本两遍。`),
    borrow: l(
      `Name the borrowed chord and altered scale degree in ${target}, then play its return to tonic three times.`,
      `Diga o acorde emprestado e o grau alterado em ${target} e toque três vezes o retorno à tônica.`,
      `Nombra el acorde prestado y el grado alterado de ${target} y toca tres veces su regreso a la tónica.`,
      `Nenne entlehnten Akkord und alterierte Stufe in ${target} und spiele die Rückkehr zur Tonika dreimal.`,
      `${target}の借用コードと変化した度数を言い、トニックへの帰還を3回弾く。`,
      `说出${target}中的借用和弦与变化音级，再弹奏回到主和弦三遍。`),
  };
  return prompts[lesson.action][locale];
}

function unit(id, titles, summaries, concepts, lessons) {
  if (lessons.length !== 10) throw new Error(`${id} must contain exactly ten lessons.`);
  return { id, titles, summaries, concepts, lessons };
}

const CURRICULUM = {
  beginner: [
    unit(
      "triads-in-practice",
      l("Triads in Practice", "Tríades na prática", "Tríadas en práctica", "Dreiklänge in der Praxis", "トライアドの実践", "三和弦实践"),
      l("Connect chord tones to the sound of a complete triad.", "Relacione as notas do acorde ao som de uma tríade completa.", "Relaciona las notas del acorde con el sonido de una tríada completa.", "Verbinde Akkordtöne mit dem Klang eines vollständigen Dreiklangs.", "構成音と完成したトライアドの響きを結びます。", "把和弦音与完整三和弦的声音联系起来。"),
      l("The root names the chord, the third establishes major or minor, and the fifth supplies the outer frame.", "A fundamental nomeia o acorde, a terça define maior ou menor e a quinta forma a moldura externa.", "La fundamental nombra el acorde, la tercera define mayor o menor y la quinta forma el marco exterior.", "Der Grundton benennt den Akkord, die Terz bestimmt Dur oder Moll und die Quinte bildet den äußeren Rahmen.", "ルートがコード名を決め、3度がメジャーかマイナーを決め、5度が外枠を支えます。", "根音决定和弦名称，三音决定大调或小调性质，五音形成外部框架。"),
      [
        chord("c-major-by-tone", "C–E–G", "C", "major"),
        chord("a-minor-by-tone", "A–C–E", "A", "minor"),
        chord("g-major-by-tone", "G–B–D", "G", "major"),
        chord("d-minor-by-tone", "D–F–A", "D", "minor"),
        chord("f-major-by-tone", "F–A–C", "F", "major"),
        chord("e-minor-by-tone", "E–G–B", "E", "minor"),
        compare("major-third-frame", "1–3–5 / 1–♭3–5", "degrees: 1 3 5", "intervals: 0 3 7 | degrees: 1 2 3"),
        compare("triad-and-power", "1–5–8 / 1–3–5", "degrees: 1 5 8", "degrees: 1 3 5"),
        chord("b-diminished-by-tone", "B–D–F", "B", "diminished"),
        chord("c-augmented-by-tone", "C–E–G♯", "C", "augmented"),
      ]),
    unit(
      "inversions-without-mystery",
      l("Inversions Without Mystery", "Inversões sem mistério", "Inversiones sin misterio", "Umkehrungen ohne Rätsel", "転回形のしくみ", "转位不再神秘"),
      l("Hear the bass note that separates root position from each inversion.", "Ouça a nota do baixo que separa o estado fundamental de cada inversão.", "Escucha la nota del bajo que distingue el estado fundamental de cada inversión.", "Höre den Basston, der Grundstellung und Umkehrungen unterscheidet.", "基本形と各転回形を分ける低音を聴き取ります。", "听出区分原位与各转位的低音。"),
      l("An inversion keeps the chord tones but places the third or fifth in the bass, changing weight without changing identity.", "Uma inversão preserva as notas do acorde, mas põe terça ou quinta no baixo, mudando o peso sem mudar a identidade.", "Una inversión conserva las notas del acorde, pero coloca tercera o quinta en el bajo y cambia el peso sin cambiar la identidad.", "Eine Umkehrung behält die Akkordtöne, setzt aber Terz oder Quinte in den Bass und verändert so das Gewicht, nicht die Identität.", "転回形は構成音を保ったまま3度または5度を低音に置き、コードの同一性を変えず重心を変えます。", "转位保留和弦音，却把三音或五音放在低音，使重心变化而和弦身份不变。"),
      [
        notes("c-root-position", "C", "[C4,E4,G4]/3", { action: "play" }),
        notes("c-first-inversion", "C/E", "[E3,G3,C4]/3", { action: "play" }),
        notes("c-second-inversion", "C/G", "[G3,C4,E4]/3", { action: "play" }),
        notes("c-three-bass-notes", "C → C/E → C/G", "[C3,E3,G3] [E3,G3,C4] [G3,C4,E4]", { action: "compare" }),
        notes("f-first-inversion", "F/A", "[A3,C4,F4]/3", { action: "play" }),
        notes("g-first-inversion", "G/B", "[B3,D4,G4]/3", { action: "play" }),
        notes("am-first-inversion", "Am/C", "[C4,E4,A4]/3", { action: "play" }),
        notes("c-to-am-one-move", "C → Am/C", "[C4,E4,G4] [C4,E4,A4]", { action: "connect" }),
        notes("f-to-c-one-move", "F/A → C/G", "[A3,C4,F4] [G3,C4,E4]", { action: "connect" }),
        notes("inversion-bass-check", "C → C/E → C/G → C", "[C3,E3,G3] [E3,G3,C4] [G3,C4,E4] [C3,E3,G3]", { action: "hear" }),
      ]),
    unit(
      "reading-chord-symbols",
      l("Reading Chord Symbols", "Leitura de cifras", "Lectura de cifrados", "Akkordsymbole lesen", "コード記号を読む", "识读和弦符号"),
      l("Turn common chord symbols into the correct root and quality.", "Transforme cifras comuns na fundamental e qualidade corretas.", "Convierte cifrados comunes en la fundamental y cualidad correctas.", "Übersetze gebräuchliche Akkordsymbole in den richtigen Grundton und die richtige Qualität.", "よく使うコード記号から正しいルートとクオリティを判断します。", "把常见和弦符号转换成正确的根音与性质。"),
      l("A plain letter means major; m, 7, maj7, dim, sus, add9, and a slash each add a specific instruction.", "Uma letra simples indica maior; m, 7, maj7, dim, sus, add9 e a barra acrescentam instruções específicas.", "Una letra sola indica mayor; m, 7, maj7, dim, sus, add9 y la barra añaden instrucciones concretas.", "Ein einzelner Buchstabe bedeutet Dur; m, 7, maj7, dim, sus, add9 und ein Schrägstrich ergänzen genaue Angaben.", "文字だけならメジャーで、m、7、maj7、dim、sus、add9、スラッシュはそれぞれ具体的な指示を加えます。", "单独字母表示大三和弦；m、7、maj7、dim、sus、add9与斜线各自增加明确指示。"),
      [
        chord("symbol-c-major", "C", "C", "major", { action: "read" }),
        chord("symbol-c-minor", "Cm", "C", "minor", { action: "read" }),
        chord("symbol-f-sharp-minor", "F♯m", "F#", "minor", { action: "read" }),
        chord("symbol-g-seven", "G7", "G", "dominant7", { action: "read" }),
        chord("symbol-c-major-seven", "Cmaj7", "C", "major7", { action: "read" }),
        chord("symbol-a-minor-seven", "Am7", "A", "minor7", { action: "read" }),
        chord("symbol-b-diminished", "Bdim", "B", "diminished", { action: "read" }),
        chord("symbol-d-sus-four", "Dsus4", "D", "suspended4", { action: "read" }),
        chord("symbol-f-add-nine", "Fadd9", "F", "add9", { action: "read" }),
        notes("symbol-c-over-e", "C/E", "[E3,G3,C4]/3", { action: "read" }),
      ]),
    unit(
      "clean-chord-changes",
      l("Clean Chord Changes", "Trocas de acorde limpas", "Cambios de acorde limpios", "Saubere Akkordwechsel", "滑らかなコード変更", "干净的和弦转换"),
      l("Place each new chord on the beat without a gap or an extra attack.", "Coloque cada novo acorde no tempo, sem lacuna nem ataque extra.", "Coloca cada acorde nuevo en el pulso, sin hueco ni ataque extra.", "Setze jeden neuen Akkord ohne Lücke oder zusätzlichen Anschlag auf den Schlag.", "各コードを隙間や余分なアタックなしで拍上に置きます。", "让每个新和弦准确落在拍点上，不留空隙也不增加起音。"),
      l("A clean change starts with a steady count and economical motion; speed comes after both chords sound together.", "Uma troca limpa começa com contagem estável e movimento econômico; a velocidade vem depois que os dois acordes soam juntos.", "Un cambio limpio empieza con cuenta estable y movimiento económico; la velocidad llega después de que ambos acordes suenan juntos.", "Ein sauberer Wechsel beginnt mit stabilem Zählen und sparsamer Bewegung; Tempo folgt erst, wenn beide Akkorde geschlossen klingen.", "滑らかな変更は安定したカウントと小さな動きから始まり、両コードがそろって鳴ってから速度を上げます。", "干净转换始于稳定计数与简洁动作；两个和弦都能整齐发声后再提高速度。"),
      [
        progression("change-c-g", "C → G", "I V", { beats: 4 }),
        progression("change-c-f", "C → F", "I IV", { beats: 4 }),
        progression("change-g-d", "G → D", "I V", { key: "G", beats: 4 }),
        progression("change-am-f", "Am → F", "vi IV", { beats: 4 }),
        progression("change-dm-g", "Dm → G", "ii V", { beats: 4 }),
        progression("change-c-am", "C → Am", "I vi", { beats: 2 }),
        progression("change-f-g", "F → G", "IV V", { beats: 2 }),
        progression("change-c-g-am-f", "C → G → Am → F", "I V vi IV", { beats: 2 }),
        progression("change-g-d-em-c", "G → D → Em → C", "I V vi IV", { key: "G", beats: 2 }),
        progression("four-clean-loops", "I–vi–IV–V", "I vi IV V", { beats: 2, tempo: 76 }),
      ]),
    unit(
      "home-away-back",
      l("Home, Away, Back", "Casa, saída e volta", "Casa, salida y regreso", "Zuhause, Aufbruch, Rückkehr", "ホーム、出発、帰還", "回家、离开、返回"),
      l("Recognize tonic, departure, tension, and return in short progressions.", "Reconheça tônica, saída, tensão e retorno em progressões curtas.", "Reconoce tónica, salida, tensión y regreso en progresiones breves.", "Erkenne Tonika, Aufbruch, Spannung und Rückkehr in kurzen Folgen.", "短い進行の中でトニック、出発、緊張、帰還を聴き分けます。", "在短和弦进行中识别主和弦、离开、张力与返回。"),
      l("I is the tonal reference, IV opens space, V creates direction, and vi can postpone a complete arrival.", "I é a referência tonal, IV abre espaço, V cria direção e vi pode adiar uma chegada completa.", "I es la referencia tonal, IV abre espacio, V crea dirección y vi puede aplazar una llegada completa.", "I ist die tonale Referenz, IV öffnet Raum, V erzeugt Richtung und vi kann eine vollständige Ankunft verzögern.", "Iが調の基準、IVが空間を開き、Vが方向を作り、viが完全な到着を先延ばしにします。", "I是调性参照，IV打开空间，V产生方向，vi可以延后完整落点。"),
      [
        progression("home-i", "I → I", "I I", { action: "hear", beats: 3 }),
        progression("away-i-iv", "I → IV", "I IV", { action: "hear", beats: 3 }),
        progression("away-i-v", "I → V", "I V", { action: "hear", beats: 3 }),
        progression("iv-or-v", "I–IV / I–V", "I IV I V", { action: "compare", beats: 2, alternatives: [{ key: "C", numerals: "I IV" }, { key: "C", numerals: "I V" }] }),
        progression("home-i-iv-v", "I–IV–V", "I IV V", { beats: 2 }),
        progression("landing-v-i", "V → I", "V I", { action: "resolve", beats: 3 }),
        progression("soft-iv-i", "IV → I", "IV I", { action: "resolve", beats: 3 }),
        progression("start-on-vi", "vi–IV–I–V", "vi IV I V", { action: "hear" }),
        progression("end-on-vi", "I–IV–V–vi", "I IV V vi", { action: "hear" }),
        progression("find-home-loop", "ii–V–I–vi", "ii V I vi", { action: "hear" }),
      ]),
    unit(
      "numbers-travel",
      l("Numbers Travel", "Os números viajam", "Los números viajan", "Stufen wandern", "数字で移調する", "级数可以移调"),
      l("Move a progression to another key while preserving its harmonic functions.", "Leve uma progressão a outra tonalidade preservando suas funções harmônicas.", "Lleva una progresión a otra tonalidad conservando sus funciones armónicas.", "Übertrage eine Folge in eine andere Tonart und erhalte ihre harmonischen Funktionen.", "機能を保ったまま進行を別のキーへ移します。", "把和弦进行移到另一个调，同时保留其和声功能。"),
      l("Roman numerals describe position inside a key, so the chord names change while the pattern of tension and release remains.", "Os algarismos romanos descrevem a posição na tonalidade; os nomes mudam, mas o desenho de tensão e resolução permanece.", "Los números romanos describen la posición en la tonalidad; los nombres cambian, pero el patrón de tensión y resolución permanece.", "Römische Stufen beschreiben die Position in einer Tonart; Akkordnamen ändern sich, Spannung und Auflösung bleiben geordnet.", "ローマ数字はキー内の位置を示すため、コード名が変わっても緊張と解決の型は保たれます。", "罗马数字描述和弦在调内的位置，因此和弦名称会变化，而张力与解决模式保持不变。"),
      [
        progression("numbers-i-iv-v-c", "I–IV–V in C", "I IV V", { action: "read", key: "C" }),
        progression("numbers-i-iv-v-g", "I–IV–V in G", "I IV V", { action: "read", key: "G" }),
        progression("numbers-i-iv-v-d", "I–IV–V in D", "I IV V", { action: "read", key: "D" }),
        progression("numbers-i-iv-v-f", "I–IV–V in F", "I IV V", { action: "read", key: "F" }),
        progression("numbers-i-v-vi-iv-c", "I–V–vi–IV in C", "I V vi IV", { action: "play", key: "C" }),
        progression("numbers-i-v-vi-iv-g", "I–V–vi–IV in G", "I V vi IV", { action: "play", key: "G" }),
        progression("numbers-vi-iv-i-v-c", "vi–IV–I–V in C", "vi IV I V", { action: "play", key: "C" }),
        progression("numbers-vi-iv-i-v-a", "vi–IV–I–V in A", "vi IV I V", { action: "play", key: "A" }),
        progression("numbers-two-keys", "C: I–vi–IV–V / G: I–vi–IV–V", "I vi IV V I vi IV V", { action: "compare", key: "C", alternatives: [{ key: "C", numerals: "I vi IV V" }, { key: "G", numerals: "I vi IV V" }] }),
        progression("numbers-transpose-check", "I–ii–IV–V in E", "I ii IV V", { action: "write", key: "E" }),
      ]),
    unit(
      "chord-rhythm",
      l("Chord Rhythm", "Ritmo de acordes", "Ritmo de acordes", "Akkordrhythmus", "コードのリズム", "和弦节奏"),
      l("Place chord attacks and rests inside a steady count.", "Coloque ataques de acorde e pausas dentro de uma contagem estável.", "Coloca ataques de acorde y silencios dentro de una cuenta estable.", "Setze Akkordanschläge und Pausen in einen stabilen Puls.", "安定したカウントの中にコードのアタックと休符を置きます。", "把和弦起音与休止放进稳定计数中。"),
      l("Harmony has rhythm even when the chord names stay unchanged; a rest or accent can reshape the phrase without adding notes.", "A harmonia tem ritmo mesmo quando as cifras não mudam; uma pausa ou acento pode remodelar a frase sem acrescentar notas.", "La armonía tiene ritmo aunque no cambien los acordes; un silencio o acento puede reformar la frase sin añadir notas.", "Harmonie hat Rhythmus, auch wenn die Akkordnamen gleich bleiben; Pause oder Akzent formen die Phrase ohne neue Töne.", "コード名が変わらなくても和声にはリズムがあり、休符やアクセントは音を増やさず楽句を変えます。", "即使和弦名称不变，和声也有节奏；休止或重音无需增加音符就能重塑乐句。"),
      [
        tap("four-quarter-attacks", "4/4: x x x x", "x x x x", { tempo: 68 }),
        tap("two-half-attacks", "4/4: x/2 x/2", "x/2 x/2", { tempo: 68 }),
        tap("one-whole-attack", "4/4: x/4", "x/4", { tempo: 64 }),
        tap("rest-on-four", l("rest on beat four: x x x -", "pausa no tempo quatro: x x x -", "silencio en el pulso cuatro: x x x -", "Pause auf Schlag vier: x x x -", "4拍目が休符: x x x -", "第四拍休止：x x x -"), "x x x -", { tempo: 72 }),
        tap("backbeat-attacks", "4/4: - x - x", "- x - x", { tempo: 76 }),
        tap("eighth-note-pulse", "4/4: x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5", "x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5 x/0.5", { tempo: 64 }),
        tap("accented-beat-one", "4/4: x - - -", "x - - -", { tempo: 72 }),
        tap("three-beat-pulse", "3/4: x x x", "x x x", { tempo: 66 }),
        tap("syncopated-entry", "4/4: -/0.5 x/0.5 x - x", "-/0.5 x/0.5 x - x", { tempo: 64 }),
        tap("rest-and-return-pattern", l("rest on beat three: x x - x", "pausa no tempo três: x x - x", "silencio en el pulso tres: x x - x", "Pause auf Schlag drei: x x - x", "3拍目が休符: x x - x", "第三拍休止：x x - x"), "x x - x", { tempo: 80 }),
      ]),
    unit(
      "hearing-chord-quality",
      l("Hearing Chord Quality", "Ouvindo a qualidade do acorde", "Escuchar la cualidad del acorde", "Akkordqualität hören", "コード・クオリティを聴く", "聆听和弦性质"),
      l("Identify chord quality from the interval that changes, not from the root name.", "Identifique a qualidade pelo intervalo que muda, não pelo nome da fundamental.", "Identifica la cualidad por el intervalo que cambia y no por el nombre de la fundamental.", "Erkenne die Akkordqualität am veränderten Intervall, nicht am Namen des Grundtons.", "ルート名ではなく変化する音程からコード・クオリティを判断します。", "根据变化的音程而不是根音名称判断和弦性质。"),
      l("Keeping the root and fifth fixed exposes the third, seventh, or suspended tone that gives a chord its recognizable sound.", "Manter fundamental e quinta fixas revela a terça, a sétima ou a suspensão que dá ao acorde seu som reconhecível.", "Mantener fijas fundamental y quinta revela la tercera, la séptima o la suspensión que da al acorde su sonido reconocible.", "Bleiben Grundton und Quinte fest, wird die Terz, Septime oder Vorhaltsnote hörbar, die den Akkord kennzeichnet.", "ルートと5度を固定すると、コードを特徴づける3度、7度、サスペンション音がはっきりします。", "固定根音与五音，便能突出决定和弦辨识度的三音、七音或挂留音。"),
      [
        compare("quality-c-cm", "C / Cm", "degrees: 1 3 5", "intervals: 0 3 7 | degrees: 1 2 3"),
        compare("quality-g-gm", "G / Gm", "degrees: 1 3 5", "intervals: 0 3 7 | degrees: 1 2 3", { root: "G" }),
        compare("quality-triad-power", "C / C5", "degrees: 1 3 5", "degrees: 1 5 8"),
        compare("quality-triad-seven", "G / G7", "degrees: 1 3 5 8", "intervals: 0 4 7 10 | degrees: 1 2 3 4", { root: "G" }),
        compare("quality-maj7-dom7", "Cmaj7 / C7", "intervals: 0 4 7 11 | degrees: 1 2 3 4", "intervals: 0 4 7 10 | degrees: 1 2 3 4"),
        compare("quality-maj7-min7", "Cmaj7 / Cm7", "intervals: 0 4 7 11 | degrees: 1 2 3 4", "intervals: 0 3 7 10 | degrees: 1 2 3 4"),
        compare("quality-sus2-sus4", "Csus2 / Csus4", "intervals: 0 2 7 | degrees: 1 2 3", "intervals: 0 5 7 | degrees: 1 2 3"),
        compare("quality-dim-minor", "Cdim / Cm", "intervals: 0 3 6 | degrees: 1 2 3", "intervals: 0 3 7 | degrees: 1 2 3"),
        compare("quality-aug-major", l("C augmented / C major", "C aumentado / C maior", "C aumentado / C mayor", "C übermäßig / C-Dur", "Cオーギュメント / Cメジャー", "C增三和弦 / C大三和弦"), "intervals: 0 4 8 | degrees: 1 2 3", "degrees: 1 3 5"),
        compare("quality-add9-triad", "Cadd9 / C", "intervals: 0 2 4 7 | degrees: 1 2 3 4", "degrees: 1 3 5 8"),
      ]),
    unit(
      "first-seventh-chords",
      l("First Seventh Chords", "Primeiros acordes com sétima", "Primeros acordes de séptima", "Erste Septakkorde", "最初のセブンス・コード", "初识七和弦"),
      l("Build and distinguish major, dominant, and minor seventh chords.", "Monte e diferencie acordes maiores, dominantes e menores com sétima.", "Construye y distingue acordes mayores, dominantes y menores de séptima.", "Baue Dur-, Dominant- und Mollseptakkorde und unterscheide sie.", "メジャー、ドミナント、マイナーのセブンス・コードを組み立てて区別します。", "构建并区分大七、属七与小七和弦。"),
      l("A seventh adds a fourth chord tone; the triad quality and type of seventh together shape whether the chord rests, points, or stays open.", "A sétima acrescenta a quarta nota; a qualidade da tríade e o tipo de sétima juntos definem se o acorde repousa, aponta ou permanece aberto.", "La séptima añade una cuarta nota; la cualidad de la tríada y el tipo de séptima juntos definen si el acorde reposa, apunta o queda abierto.", "Die Septime ergänzt einen vierten Ton; Dreiklangsqualität und Septimtyp bestimmen gemeinsam Ruhe, Richtung oder Offenheit.", "7度を加えると4音になり、トライアドのクオリティと7度の種類が一緒に安定、方向、開放感を形作ります。", "七音增加第四个和弦音；三和弦性质与七音类型共同决定安定、指向或开放感。"),
      [
        chord("seventh-c-major-seven", "Cmaj7", "C", "major7"),
        chord("seventh-g-dominant-seven", "G7", "G", "dominant7"),
        chord("seventh-a-minor-seven", "Am7", "A", "minor7"),
        chord("seventh-f-major-seven", "Fmaj7", "F", "major7"),
        chord("seventh-d-minor-seven", "Dm7", "D", "minor7"),
        progression("seventh-g7-c", "G7 → C", "V I", { action: "resolve", seventh: true, beats: 3 }),
        progression("seventh-dm7-g7-cmaj7", "Dm7–G7–Cmaj7", "ii V I", { seventh: true, beats: 2 }),
        compare("seventh-c-cmaj7", "C / Cmaj7", "degrees: 1 3 5 8", "intervals: 0 4 7 11 | degrees: 1 2 3 4"),
        compare("seventh-g-g7", l("G triad / G dominant seventh", "tríade de G / G com sétima dominante", "tríada de G / G con séptima dominante", "G-Dreiklang / G-Dominantseptakkord", "Gトライアド / Gドミナント・セブンス", "G三和弦 / G属七和弦"), "degrees: 1 3 5 8", "intervals: 0 4 7 10 | degrees: 1 2 3 4", { root: "G", action: "hear" }),
        compare("seventh-three-colors", l("Cmaj7 / C7 colors", "cores de Cmaj7 / C7", "colores de Cmaj7 / C7", "Farben von Cmaj7 / C7", "Cmaj7 / C7のカラー", "Cmaj7 / C7的色彩"), "intervals: 0 4 7 11 | degrees: 1 2 3 4", "intervals: 0 4 7 10 | degrees: 1 2 3 4", { action: "hear" }),
      ]),
    unit(
      "accompaniment-basics",
      l("Accompaniment Basics", "Fundamentos de acompanhamento", "Fundamentos de acompañamiento", "Grundlagen der Begleitung", "伴奏の基本", "伴奏基础"),
      l("Support a short progression with clear texture, pulse, and space.", "Sustente uma progressão curta com textura, pulso e espaço claros.", "Sostén una progresión breve con textura, pulso y espacio claros.", "Begleite eine kurze Folge mit klarer Textur, klarem Puls und Raum.", "明確なテクスチャ、拍、間を使って短い進行を支えます。", "用清楚的织体、拍点与留白支撑短和弦进行。"),
      l("Accompaniment serves the phrase: block chords define landmarks, arpeggios create motion, and rests leave room for melody.", "O acompanhamento serve à frase: acordes em bloco marcam pontos, arpejos criam movimento e pausas deixam espaço para a melodia.", "El acompañamiento sirve a la frase: los acordes en bloque marcan puntos, los arpegios crean movimiento y los silencios dejan espacio a la melodía.", "Begleitung dient der Phrase: Blockakkorde markieren Punkte, Arpeggien erzeugen Bewegung und Pausen lassen Platz für die Melodie.", "伴奏は楽句を支えます。ブロック・コードは節目を示し、アルペジオは動きを作り、休符はメロディーの空間を残します。", "伴奏服务于乐句：柱式和弦标记节点，琶音制造流动，休止为旋律留出空间。"),
      [
        chord("accompaniment-block-c", "C as a block chord", "C", "major", { action: "play", style: "block" }),
        chord("accompaniment-broken-am", "Am as an arpeggio", "A", "minor", { action: "play", style: "arpeggio" }),
        chord("accompaniment-slow-strum-g", "G with an even strum", "G", "major", { action: "play", style: "strum" }),
        notes("accompaniment-bass-then-chord", "bass–chord in C", "C3 [C4,E4,G4] G2 [G3,B3,D4]", { action: "arrange", beat: 1 }),
        progression("accompaniment-one-per-bar", "I–V–vi–IV, one per bar", "I V vi IV", { action: "arrange", beats: 4 }),
        progression("accompaniment-two-per-bar", "I–V–vi–IV, two per bar", "I V vi IV", { action: "arrange", beats: 2 }),
        tap("accompaniment-leave-space", "x x x -", "x x x -", { tempo: 70 }),
        progression("accompaniment-quiet-verse", "vi–IV–I–V", "vi IV I V", { action: "arrange", tempo: 68 }),
        tap("accompaniment-count-in", "count-in: x x x x", "x x x x", { tempo: 72 }),
        progression("accompaniment-eight-bars", "eight bars: I–vi–IV–V | I–vi–ii–V", "I vi IV V I vi ii V", { action: "arrange", beats: 4 }),
      ]),
  ],
  intermediate: [
    unit(
      "function-by-ear",
      l("Function by Ear", "Função de ouvido", "Función de oído", "Funktion nach Gehör", "機能を耳で聴く", "用耳朵听功能"),
      l("Group diatonic chords by tonic, predominant, and dominant function.", "Agrupe acordes diatônicos pelas funções tônica, pré-dominante e dominante.", "Agrupa acordes diatónicos por función tónica, predominante y dominante.", "Ordne diatonische Akkorde Tonika-, Subdominant- und Dominantfunktion zu.", "ダイアトニック・コードをトニック、プレドミナント、ドミナント機能に分けます。", "按主功能、下属准备功能与属功能归类自然音和弦。"),
      l("Function describes a chord's job in a phrase: tonic rests, predominant prepares, and dominant directs the ear toward a destination.", "Função descreve o trabalho do acorde na frase: tônica repousa, pré-dominante prepara e dominante conduz o ouvido a um destino.", "La función describe el trabajo del acorde en la frase: la tónica reposa, la predominante prepara y la dominante dirige el oído.", "Funktion beschreibt die Aufgabe im Satz: Tonika ruht, Subdominante bereitet vor und Dominante lenkt das Ohr zum Ziel.", "機能は楽句内の役割を示します。トニックは休み、プレドミナントは準備し、ドミナントは耳を到着先へ導きます。", "功能描述和弦在乐句中的工作：主功能安定，属前功能准备，属功能把耳朵引向目标。"),
      [
        progression("function-tonic-i-vi", "I–vi–I", "I vi I", { action: "hear" }),
        progression("function-predominant-ii-iv", "ii–IV–V", "ii IV V", { action: "hear" }),
        progression("function-dominant-v-vii", "V–vii°–I", "V vii I", { action: "hear" }),
        progression("function-iii-vi", "iii–vi–ii–V", "iii vi ii V", { action: "follow" }),
        progression("function-tonic-expansion", "I–iii–vi", "I iii vi", { action: "play" }),
        progression("function-predominant-expansion", "IV–ii–V", "IV ii V", { action: "play" }),
        progression("function-two-routes-v", "ii–V / IV–V", "ii V IV V", { action: "compare", alternatives: [{ key: "C", numerals: "ii V" }, { key: "C", numerals: "IV V" }] }),
        progression("function-t-p-d-t", "I–IV–V–I", "I IV V I", { action: "read" }),
        progression("function-vi-ii-v-i", "vi–ii–V–I", "vi ii V I", { action: "hear" }),
        progression("function-write-route", "I–vi–IV–ii–V–I", "I vi IV ii V I", { action: "write" }),
      ]),
    unit(
      "diatonic-sevenths",
      l("Diatonic Seventh Chords", "Acordes diatônicos com sétima", "Acordes diatónicos de séptima", "Diatonische Septakkorde", "ダイアトニック・セブンス", "自然音七和弦"),
      l("Build the seven seventh chords of a major key and hear their functions.", "Monte os sete acordes com sétima de uma tonalidade maior e ouça suas funções.", "Construye los siete acordes de séptima de una tonalidad mayor y escucha sus funciones.", "Baue die sieben Septakkorde einer Durtonart und höre ihre Funktionen.", "メジャー・キーの7つのセブンス・コードを作り、その機能を聴きます。", "构建大调的七个七和弦，并听出各自功能。"),
      l("Stacking one more diatonic third turns each triad into a seventh chord without changing its scale degree.", "Empilhar mais uma terça diatônica transforma cada tríade em acorde com sétima sem mudar seu grau.", "Apilar una tercera diatónica más convierte cada tríada en acorde de séptima sin cambiar su grado.", "Eine weitere diatonische Terz macht aus jedem Dreiklang einen Septakkord, ohne seine Stufe zu ändern.", "ダイアトニックな3度をもう一つ重ねると、度数を変えず各トライアドがセブンス・コードになります。", "再叠加一个自然音三度，就能在不改变级数的情况下把每个三和弦变成七和弦。"),
      [
        chord("diatonic-seven-cmaj7", "Imaj7: Cmaj7", "C", "major7"),
        chord("diatonic-seven-dm7", "ii7: Dm7", "D", "minor7"),
        chord("diatonic-seven-em7", "iii7: Em7", "E", "minor7"),
        chord("diatonic-seven-fmaj7", "IVmaj7: Fmaj7", "F", "major7"),
        chord("diatonic-seven-g7", "V7: G7", "G", "dominant7"),
        chord("diatonic-seven-am7", "vi7: Am7", "A", "minor7"),
        chord("diatonic-seven-b-halfdim", "viiø7: Bm7♭5", "B", "halfdim7"),
        progression("diatonic-seven-family", "I–ii–iii–IV–V–vi–vii°", "I ii iii IV V vi vii", { seventh: true, beats: 1 }),
        progression("diatonic-seven-functions", "Imaj7–vi7–ii7–V7", "I vi ii V", { seventh: true, beats: 2 }),
        progression("diatonic-seven-home", "ii7–V7–Imaj7", "ii V I", { seventh: true, action: "resolve", beats: 3 }),
      ]),
    unit(
      "minor-progressions",
      l("Minor Progressions", "Progressões em menor", "Progresiones en menor", "Mollfolgen", "マイナー進行", "小调和弦进行"),
      l("Shape minor-key loops with natural-minor chords and a stronger raised leading tone.", "Modele ciclos em tom menor com acordes da menor natural e uma sensível elevada mais forte.", "Da forma a ciclos menores con acordes de menor natural y una sensible elevada más fuerte.", "Forme Mollschleifen mit natürlich-mollenen Akkorden und einem stärkeren erhöhten Leitton.", "ナチュラル・マイナーのコードと、より強い導音を使ってマイナー進行を作ります。", "用自然小调和弦与更有力的升高导音塑造小调循环。"),
      l("Natural minor supplies a gentle minor v; harmonic minor raises degree seven so V can pull firmly back to i.", "A menor natural fornece um v menor suave; a menor harmônica eleva o sétimo grau para que V volte com força a i.", "La menor natural ofrece un v menor suave; la menor armónica eleva el séptimo grado para que V vuelva con fuerza a i.", "Natürlich Moll liefert eine sanfte Moll-v; harmonisch Moll erhöht Stufe sieben, damit V kräftig nach i zieht.", "ナチュラル・マイナーではvが穏やかで、ハーモニック・マイナーは第7音を上げてVからiへの引力を強めます。", "自然小调中的小属和弦较温和；和声小调升高第七音，使V更有力地回到i。"),
      [
        progression("minor-natural-loop", "A: i–VI–III–VII", "i VI III VII", { key: "A", scale: "Natural Minor" }),
        progression("minor-descending-loop", "i–VII–VI–VII", "i VII VI VII", { key: "A", scale: "Natural Minor" }),
        progression("minor-iv-to-iii", "i–iv–VII–III", "i iv VII III", { key: "A", scale: "Natural Minor" }),
        progression("minor-vi-iii-vii", "E: i–VI–III–VII", "i VI III VII", { key: "E", scale: "Natural Minor" }),
        progression("minor-iii-vii-vi", "i–III–VII–VI", "i III VII VI", { key: "D", scale: "Natural Minor" }),
        progression("minor-gentle-v", l("minor v: i–iv–v–i", "v menor: i–iv–v–i", "v menor: i–iv–v–i", "Moll-v: i–iv–v–i", "マイナーv：i–iv–v–i", "小属和弦v：i–iv–v–i"), "i iv v i", { key: "A", scale: "Natural Minor", action: "hear" }),
        compare("minor-leading-tone", l("G / G♯ above A", "G / G♯ sobre A", "G / G♯ sobre A", "G / G♯ über A", "A上のG / G♯", "A上方的G / G♯"), "scale: Natural Minor | degrees: 7 8 7 8", "scale: Harmonic Minor | degrees: 7 8 7 8", { root: "A", scale: "Natural Minor" }),
        progression("minor-major-v", l("major V: i–iv–V–i", "V maior: i–iv–V–i", "V mayor: i–iv–V–i", "Dur-V: i–iv–V–i", "メジャーV：i–iv–V–i", "大属和弦V：i–iv–V–i"), "i iv V i", { key: "A", scale: "Harmonic Minor", action: "resolve" }),
        progression("minor-relative-major", "i–III–VII–i", "i III VII i", { key: "A", scale: "Natural Minor", action: "follow" }),
        progression("minor-clear-close", "VI–iv–V–i", "VI iv V i", { key: "A", scale: "Harmonic Minor", action: "resolve" }),
      ]),
    unit(
      "voice-leading-basics",
      l("Voice-Leading Basics", "Fundamentos de condução de vozes", "Fundamentos de conducción de voces", "Grundlagen der Stimmführung", "ボイス・リーディングの基本", "声部进行基础"),
      l("Connect chords by holding common tones and moving other voices by step.", "Conecte acordes mantendo notas comuns e movendo as outras vozes por grau conjunto.", "Conecta acordes manteniendo notas comunes y moviendo las otras voces por grado conjunto.", "Verbinde Akkorde durch gemeinsame Töne und schrittweise Bewegung der übrigen Stimmen.", "共通音を保ち、他の声部を順次進行させてコードをつなぎます。", "保留共同音，并让其他声部级进，从而连接和弦。"),
      l("Smooth voice leading measures the distance traveled by individual notes, not the distance between chord roots.", "A condução suave mede a distância percorrida por cada nota, não a distância entre as fundamentais.", "La conducción suave mide la distancia recorrida por cada nota y no la distancia entre fundamentales.", "Glatte Stimmführung misst den Weg einzelner Töne, nicht den Abstand zwischen Akkordgrundtönen.", "滑らかなボイス・リーディングはコードのルート間ではなく、各音が進む距離で考えます。", "平滑声部进行衡量的是各个音移动的距离，而不是和弦根音之间的距离。"),
      [
        notes("voice-nearest-c-am", "C → Am/C by step", "[C4,E4,G4] [C4,E4,A4]", { action: "follow" }),
        notes("voice-common-c-f", l("C → F/C with common C", "C → F/C com C comum", "C → F/C con C común", "C → F/C mit gemeinsamem C", "共通音Cを保つC → F/C", "保留共同音C的C → F/C"), "[C4,E4,G4] [C4,F4,A4]", { action: "keep" }),
        notes("voice-oblique-outer", l("oblique outer voices: C/E → F", "vozes externas oblíquas: C/E → F", "voces exteriores oblicuas: C/E → F", "Außenstimmen in Seitenbewegung: C/E → F", "外声の斜行：C/E → F", "外声部斜向进行：C/E → F"), "[E3,G3,C4] [F3,A3,C4]", { action: "follow" }),
        notes("voice-stepwise-bass", "C → G/B → Am", "[C3,E3,G3] [B2,D3,G3] [A2,C3,E3]", { action: "follow" }),
        notes("voice-held-top-c", l("held top C: F → C/E → Dm7", "C sustentado no topo: F → C/E → Dm7", "C sostenido arriba: F → C/E → Dm7", "gehaltenes C oben: F → C/E → Dm7", "トップCを保持：F → C/E → Dm7", "保持顶声部C：F → C/E → Dm7"), "[F3,A3,C4] [E3,G3,C4] [D3,F3,A3,C4]", { action: "keep" }),
        notes("voice-one-jump-only", "Dm → G → C", "[D3,F3,A3] [D3,G3,B3] [C3,E3,G3]", { action: "connect" }),
        notes("voice-smooth-pop-loop", "C–Am–F–G", "[C3,E3,G3] [C3,E3,A3] [C3,F3,A3] [B2,D3,G3]", { action: "connect" }),
        notes("voice-halfstep-home", "Dm7–G7–Cmaj7", "[D3,F3,A3,C4] [D3,F3,G3,B3] [C3,E3,G3,B3]", { action: "resolve" }),
        compare("voice-smooth-blocky", "stepwise / wide", "degrees: 1 3 2 4", "degrees: 1 6 2 7", { action: "compare" }),
        notes("voice-rewrite-rough", "G → C/E", "[G3,B3,D4] [E3,G3,C4]", { action: "write" }),
      ]),
    unit(
      "inversions-in-motion",
      l("Inversions in Motion", "Inversões em movimento", "Inversiones en movimiento", "Umkehrungen in Bewegung", "進行の中の転回形", "进行中的转位"),
      l("Choose inversions that create a singable bass line through a progression.", "Escolha inversões que criem uma linha de baixo cantável na progressão.", "Elige inversiones que creen una línea de bajo cantable dentro de la progresión.", "Wähle Umkehrungen, die eine sangliche Basslinie durch die Folge bilden.", "歌える低音線を作る転回形を進行の中で選びます。", "选择能在和弦进行中形成可歌低音线的转位。"),
      l("Slash notation names the chord first and the bass second; the selected bass can connect roots with smaller, clearer motion.", "A cifra com barra nomeia primeiro o acorde e depois o baixo; o baixo escolhido pode ligar fundamentais com movimento menor e claro.", "El cifrado con barra nombra primero el acorde y después el bajo; el bajo elegido conecta fundamentales con movimiento menor y claro.", "Ein Slash-Symbol nennt zuerst den Akkord und danach den Bass; der gewählte Bass verbindet Grundtöne mit kleinerer Bewegung.", "スラッシュ表記は先にコード、後に低音を示し、選んだ低音がルート同士を小さく明確な動きでつなぎます。", "斜线和弦先写和弦、后写低音；选定低音能以更小、更清楚的动作连接根音。"),
      [
        notes("motion-first-inversion", "C → G/B", "[C3,E3,G3] [B2,D3,G3]", { action: "connect" }),
        notes("motion-second-inversion", "C/G → G", "[G2,C3,E3] [G2,B2,D3]", { action: "compare" }),
        notes("motion-read-slash", "F/A → G/B → C", "[A2,C3,F3] [B2,D3,G3] [C3,E3,G3]", { action: "read" }),
        notes("motion-i-iii-six-iv", "I–iii6–IV6", "[C3,E3,G3] [B2,E3,G3] [A2,C3,F3]", { action: "follow" }),
        notes("motion-i-v-six-vi", "I–V6–vi", "[C3,E3,G3] [B2,D3,G3] [A2,C3,E3]", { action: "follow" }),
        notes("motion-i-six-iv-v-i", "I6–IV–V–I", "[E3,G3,C4] [F3,A3,C4] [G3,B3,D4] [C3,E3,G3]", { action: "play" }),
        notes("motion-bass-one-seven-six", "bass 1–7–6", "[C3,E3,G3] [B2,D3,G3] [A2,E3,C4]", { action: "follow" }),
        notes("motion-pedal-c", "C pedal: I–IV6/4–I", "[C3,E3,G3] [C3,F3,A3] [C3,E3,G3]", { action: "keep" }),
        notes("motion-cadential-six-four", "I6/4–V–I", "[G2,C3,E3] [G2,B2,D3] [C3,E3,G3]", { action: "resolve" }),
        notes("motion-choose-inversion", "C–G/B–Am–F/A", "[C3,E3,G3] [B2,D3,G3] [A2,C3,E3] [A2,C3,F3]", { action: "arrange" }),
      ]),
    unit(
      "cadences-and-phrases",
      l("Cadences and Phrases", "Cadências e frases", "Cadencias y frases", "Kadenzen und Phrasen", "カデンツと楽句", "终止式与乐句"),
      l("Place authentic, half, plagal, and deceptive cadences at useful phrase endings.", "Coloque cadências autênticas, suspensivas, plagais e de engano em finais úteis de frase.", "Coloca cadencias auténticas, semicadencias, plagales y engañosas en finales útiles de frase.", "Setze authentische, Halb-, plagale und Trugschlüsse an passende Phrasenenden.", "正格、半終止、変格、偽終止を役立つ楽句末に配置します。", "把正格、半终止、变格与阻碍终止放在合适的乐句结尾。"),
      l("A cadence combines chord function, bass motion, and rhythmic placement; the same pair sounds weaker when it arrives off the phrase boundary.", "A cadência combina função, movimento do baixo e posição rítmica; o mesmo par soa mais fraco fora do limite da frase.", "Una cadencia combina función, movimiento del bajo y posición rítmica; el mismo par suena más débil fuera del límite de frase.", "Eine Kadenz verbindet Funktion, Bassbewegung und Rhythmus; dasselbe Paar wirkt abseits der Phrasengrenze schwächer.", "カデンツは機能、低音の動き、リズム上の位置を組み合わせ、同じ2コードでも楽句境界から外れると弱く聞こえます。", "终止式结合和弦功能、低音移动与节奏位置；同一对和弦若偏离乐句边界，结束感就会减弱。"),
      [
        progression("cadence-authentic", "V–I", "V I", { action: "resolve", beats: 4 }),
        notes("cadence-perfect-imperfect", "V–I: root / inversion", "[G2,B2,D3] [C3,E3,G3] [B2,D3,G3] [E3,G3,C4]", { action: "compare", splitAt: 2 }),
        progression("cadence-half", "ii–V", "ii V", { action: "hear", beats: 4 }),
        progression("cadence-plagal", "IV–I", "IV I", { action: "resolve", beats: 4 }),
        progression("cadence-deceptive", "V–vi", "V vi", { action: "hear", beats: 4 }),
        progression("cadence-on-barline", "I–IV–ii–V | I", "I IV ii V I", { action: "follow", beats: 2 }),
        progression("cadence-four-bar-question", l("four-bar question: I–vi–ii–V", "pergunta de quatro compassos: I–vi–ii–V", "pregunta de cuatro compases: I–vi–ii–V", "viertaktige Frage: I–vi–ii–V", "4小節の問い：I–vi–ii–V", "四小节问句：I–vi–ii–V"), "I vi ii V", { action: "hear", beats: 4 }),
        progression("cadence-four-bar-answer", l("four-bar answer: I–IV–V–I", "resposta de quatro compassos: I–IV–V–I", "respuesta de cuatro compases: I–IV–V–I", "viertaktige Antwort: I–IV–V–I", "4小節の答え：I–IV–V–I", "四小节答句：I–IV–V–I"), "I IV V I", { action: "resolve", beats: 4 }),
        progression("cadence-turnaround", l("one-bar turnaround: I–vi–ii–V", "turnaround de um compasso: I–vi–ii–V", "turnaround de un compás: I–vi–ii–V", "eintaktiger Turnaround: I–vi–ii–V", "1小節のターンアラウンド：I–vi–ii–V", "一小节回转：I–vi–ii–V"), "I vi ii V", { action: "connect", beats: 1 }),
        progression("cadence-eight-bar-map", l("eight-bar map: I–vi–ii–V | I–IV–V–I", "mapa de oito compassos: I–vi–ii–V | I–IV–V–I", "mapa de ocho compases: I–vi–ii–V | I–IV–V–I", "achttaktige Karte: I–vi–ii–V | I–IV–V–I", "8小節の地図：I–vi–ii–V | I–IV–V–I", "八小节和声图：I–vi–ii–V | I–IV–V–I"), "I vi ii V I IV V I", { action: "read", beats: 4 }),
      ]),
    unit(
      "progression-grammar",
      l("Progression Grammar", "Gramática de progressões", "Gramática de progresiones", "Grammatik von Akkordfolgen", "進行の文法", "和弦进行语法"),
      l("Combine familiar functional patterns into clear four- and eight-bar progressions.", "Combine padrões funcionais conhecidos em progressões claras de quatro e oito compassos.", "Combina patrones funcionales conocidos en progresiones claras de cuatro y ocho compases.", "Verbinde vertraute Funktionsmuster zu klaren vier- und achttaktigen Folgen.", "よく使う機能パターンを明確な4小節と8小節の進行にまとめます。", "把熟悉的功能模式组合成清楚的四小节与八小节进行。"),
      l("Progressions read clearly when each chord either extends the current function or prepares a specific next function.", "Progressões ficam claras quando cada acorde prolonga a função atual ou prepara uma função seguinte específica.", "Las progresiones se entienden cuando cada acorde prolonga la función actual o prepara una función siguiente concreta.", "Akkordfolgen werden klar, wenn jeder Akkord die aktuelle Funktion verlängert oder eine bestimmte nächste vorbereitet.", "各コードが現在の機能を延ばすか、次の機能を具体的に準備すると進行が明確になります。", "当每个和弦延续当前功能或明确准备下一功能时，和弦进行就会清楚。"),
      [
        progression("grammar-two-five-one", "ii–V–I", "ii V I", { beats: 3 }),
        progression("grammar-one-six-two-five", "I–vi–ii–V", "I vi ii V", { beats: 2 }),
        progression("grammar-six-two-five-one", "vi–ii–V–I", "vi ii V I", { beats: 2 }),
        progression("grammar-one-four-two-five", "I–IV–ii–V", "I IV ii V", { beats: 2 }),
        progression("grammar-long-fifths", "I–iii–vi–ii–V–I", "I iii vi ii V I", { beats: 2 }),
        progression("grammar-descending-fifths", "iii–vi–ii–V–I", "iii vi ii V I", { action: "follow", beats: 2 }),
        progression("grammar-descending-bass", "I–V–vi–iii–IV", "I V vi iii IV", { action: "follow", beats: 2 }),
        progression("grammar-rising-bass", "I–ii–iii–IV–V", "I ii iii IV V", { action: "follow", beats: 2 }),
        progression("grammar-two-endings", "I–vi–IV–V / I–vi–IV–I", "I vi IV V I vi IV I", { action: "compare", beats: 1, alternatives: [{ key: "C", numerals: "I vi IV V" }, { key: "C", numerals: "I vi IV I" }] }),
        progression("grammar-eight-bars", "eight bars: I–iii–vi–IV | ii–V–I–V", "I iii vi IV ii V I V", { action: "write", beats: 4 }),
      ]),
    unit(
      "sevenths-in-motion",
      l("Sevenths in Motion", "Sétimas em movimento", "Séptimas en movimiento", "Septimen in Bewegung", "動くセブンス", "运动中的七音"),
      l("Resolve chordal sevenths and guide tones through connected progressions.", "Resolva sétimas e notas-guia em progressões conectadas.", "Resuelve séptimas y notas guía a través de progresiones conectadas.", "Löse Akkordseptimen und Leittöne in verbundenen Folgen auf.", "コードの7度とガイドトーンをつながった進行の中で解決します。", "在连贯和弦进行中解决和弦七音与导向音。"),
      l("The third and seventh carry most of a seventh chord's function; stepwise resolution makes their direction audible even without the root.", "A terça e a sétima carregam grande parte da função; a resolução por grau conjunto revela a direção mesmo sem a fundamental.", "La tercera y la séptima llevan gran parte de la función; su resolución conjunta hace audible la dirección incluso sin fundamental.", "Terz und Septime tragen den größten Teil der Funktion; schrittweise Auflösung zeigt ihre Richtung auch ohne Grundton.", "3度と7度が機能の中心を担い、順次解決によってルートなしでも方向が聞こえます。", "三音与七音承载大部分功能；级进解决即使没有根音也能让方向清楚可听。"),
      [
        progression("motion-seven-two-five-one", "ii7–V7–Imaj7", "ii V I", { seventh: true, beats: 3 }),
        notes("motion-seven-third-rises", "B → C over G7–C", "B3 C4", { action: "follow" }),
        notes("motion-seven-seventh-falls", "F → E over G7–C", "F3 E3", { action: "resolve" }),
        notes("motion-seven-guide-pair", "B–F → C–E", "[B3,F4] [C4,E4]", { action: "resolve" }),
        notes("motion-seven-common-tone", "Cmaj7 → Am7", "[C3,E3,G3,B3] [C3,E3,G3,A3]", { action: "keep" }),
        progression("motion-seven-six-two-five", "vi7–ii7–V7", "vi ii V", { seventh: true, beats: 2 }),
        progression("motion-seven-three-six-two-five", "iii7–vi7–ii7–V7", "iii vi ii V", { seventh: true, beats: 2 }),
        notes("motion-seven-minor-cadence", "Bm7♭5–E7–Am", "[B2,D3,F3,A3] [B2,D3,G#3,E4] [A2,C3,E3,A3]", { action: "resolve" }),
        compare("motion-seven-triad-or-seven", "triads / sevenths", "degrees: 2 4 6 9", "degrees: 2 4 6 8", { action: "compare" }),
        notes("motion-seven-all-active", "Dm7–G7–Cmaj7 guide tones", "[D3,F3,A3,C4] [D3,F3,G3,B3] [C3,E3,G3,B3]", { action: "connect" }),
      ]),
    unit(
      "sixths-and-ninths",
      l("Sixths and Ninths", "Sextas e nonas", "Sextas y novenas", "Sexten und Nonen", "6度と9度のコード", "六和弦与九和弦"),
      l("Use sixths and ninths as clear colors without losing the underlying triad.", "Use sextas e nonas como cores claras sem perder a tríade de base.", "Usa sextas y novenas como colores claros sin perder la tríada de base.", "Nutze Sexten und Nonen als klare Farben, ohne den Dreiklang zu verdecken.", "土台のトライアドを失わず、6度と9度を明確な色として使います。", "在不掩盖基础三和弦的情况下，把六音与九音用作清楚色彩。"),
      l("A sixth or ninth works best when its register leaves the third audible; spacing clarifies whether the note is structure or decoration.", "Sexta ou nona funciona melhor quando o registro mantém a terça audível; o espaçamento esclarece se a nota é estrutura ou decoração.", "Una sexta o novena funciona mejor cuando el registro mantiene audible la tercera; el espacio aclara si la nota es estructura o adorno.", "Sexten und Nonen wirken am besten, wenn die Lage die Terz hörbar lässt; Abstand klärt Struktur und Verzierung.", "6度や9度は3度が聞こえる音域で最も機能し、音の間隔が構造音か装飾音かを明確にします。", "六音或九音最好放在仍能听清三音的音区；声部间距能说明它是结构还是装饰。"),
      [
        compare("sixth-major-triad", "C / C6", "degrees: 1 3 5 8", "intervals: 0 4 7 9 | degrees: 1 2 3 4"),
        compare("sixth-minor-triad", "Cm / Cm6", "intervals: 0 3 7 | degrees: 1 2 3 1", "intervals: 0 3 7 9 | degrees: 1 2 3 4"),
        compare("sixth-major-seven", "C6 / Cmaj7", "intervals: 0 4 7 9 | degrees: 1 2 3 4", "intervals: 0 4 7 11 | degrees: 1 2 3 4"),
        compare("ninth-add-major", "Cadd9 / Cmaj9", "intervals: 0 2 4 7 | degrees: 1 2 3 4 1", "intervals: 0 2 4 7 11 | degrees: 1 2 3 4 5"),
        chord("ninth-c-major", "Cmaj9", "C", "major9"),
        chord("ninth-a-minor", "Am9", "A", "minor9"),
        chord("ninth-g-dominant", "G9", "G", "dominant9"),
        notes("ninth-on-top", "Cmaj9 with D on top", "[C3,E3,G3,B3,D4]/3", { action: "keep" }),
        notes("ninth-wide-spacing", "Am9 in open spacing", "[A2,E3,G3,C4,B4]/3", { action: "play" }),
        notes("ninth-color-choice", "C6 → Cmaj7 → Cmaj9", "[C3,E3,G3,A3] [C3,E3,G3,B3] [C3,E3,G3,B3,D4]", { action: "hear" }),
      ]),
    unit(
      "hear-write-arrange",
      l("Hear, Write, Arrange", "Ouvir, escrever, arranjar", "Escuchar, escribir, arreglar", "Hören, schreiben, arrangieren", "聴く、書く、編曲する", "聆听、记录、编配"),
      l("Turn a heard progression into numerals and a playable accompaniment.", "Transforme uma progressão ouvida em algarismos e acompanhamento tocável.", "Convierte una progresión escuchada en números y acompañamiento tocable.", "Übertrage eine gehörte Folge in Stufen und eine spielbare Begleitung.", "聴いた進行をローマ数字と演奏できる伴奏に変えます。", "把听到的和弦进行转换成级数与可弹奏的伴奏。"),
      l("Transcription becomes reliable when bass, quality, function, inversion, cadence, and texture are checked in that order.", "A transcrição fica confiável quando baixo, qualidade, função, inversão, cadência e textura são conferidos nessa ordem.", "La transcripción resulta fiable cuando bajo, cualidad, función, inversión, cadencia y textura se comprueban en ese orden.", "Transkription wird zuverlässig, wenn Bass, Qualität, Funktion, Umkehrung, Kadenz und Textur in dieser Reihenfolge geprüft werden.", "低音、クオリティ、機能、転回形、カデンツ、テクスチャの順に確認すると採譜が安定します。", "按低音、性质、功能、转位、终止式、织体的顺序核对，听写会更可靠。"),
      [
        progression("transcribe-count-changes", l("count changes in I–vi–IV–V", "conte as trocas em I–vi–IV–V", "cuenta los cambios en I–vi–IV–V", "zähle die Wechsel in I–vi–IV–V", "I–vi–IV–Vの変更回数", "数出I–vi–IV–V的变化"), "I vi IV V", { action: "hear", beats: 4 }),
        progression("transcribe-follow-roots", "bass roots: I–V–vi–iii–IV", "I V vi iii IV", { action: "hear", beats: 2 }),
        progression("transcribe-find-minor", "I–iii–IV–vi", "I iii IV vi", { action: "hear", beats: 2 }),
        progression("transcribe-name-functions", "I–ii–V–I", "I ii V I", { action: "read", beats: 2 }),
        notes("transcribe-hear-inversion", "C–G/B–Am", "[C3,E3,G3] [B2,D3,G3] [A2,C3,E3]", { action: "hear" }),
        progression("transcribe-name-cadence", "ii–V–I / IV–I", "ii V I IV I", { action: "hear", beats: 3, alternatives: [{ key: "C", numerals: "ii V I" }, { key: "C", numerals: "IV I" }] }),
        progression("transcribe-write-numerals", "C–Am–Dm–G", "I vi ii V", { action: "write", beats: 2 }),
        progression("transcribe-move-numerals", "G: I–vi–ii–V", "I vi ii V", { action: "write", key: "G", beats: 2 }),
        notes("transcribe-two-textures", l(
          "I–vi–IV–V as block chords / bass–chord",
          "I–vi–IV–V em blocos / baixo–acorde",
          "I–vi–IV–V en bloques / bajo–acorde",
          "I–vi–IV–V als Blockakkorde / Bass–Akkord",
          "I–vi–IV–Vのブロック / 低音–コード",
          "I–vi–IV–V的柱式 / 低音–和弦"),
        "[C3,E3,G3]/2 [A2,C3,E3]/2 [F3,A3,C4]/2 [G2,B2,D3]/2 C3 [E3,G3] A2 [C3,E3] F3 [A3,C4] G2 [B2,D3]",
        { action: "arrange", tempo: 76, beat: 1, splitAt: 4 }),
        progression("transcribe-eight-bars", "eight bars: I–iii–vi–IV | ii–V–I–V", "I iii vi IV ii V I V", { action: "arrange", beats: 4 }),
      ]),
  ],
  advanced: [
    unit(
      "tensions-and-extensions",
      l("Tensions and Extensions", "Tensões e extensões", "Tensiones y extensiones", "Spannungen und Erweiterungen", "テンションとエクステンション", "张力音与扩展音"),
      l("Voice ninths, elevenths, and thirteenths so their function stays clear.", "Disponha nonas, décimas primeiras e décimas terceiras mantendo clara sua função.", "Dispón novenas, oncenas y trecenas manteniendo clara su función.", "Setze Nonen, Undezimen und Tredezimen so, dass ihre Funktion klar bleibt.", "9th、11th、13thを機能が明確に残るようボイシングします。", "配置九音、十一音与十三音，同时保持功能清楚。"),
      l("Extensions continue the stack of thirds above the seventh; register and omitted tones determine whether the result sounds open or crowded.", "Extensões continuam a pilha de terças acima da sétima; registro e notas omitidas determinam se o resultado soa aberto ou congestionado.", "Las extensiones continúan la pila de terceras sobre la séptima; registro y omisiones determinan si el resultado suena abierto o cargado.", "Erweiterungen setzen die Terzschichtung über der Septime fort; Lage und Auslassungen entscheiden über Offenheit oder Dichte.", "エクステンションは7度の上へ3度堆積を続け、音域と省略音が開放的か混雑した響きかを決めます。", "扩展音在七音之上继续叠置三度；音区与省略音决定声音是开放还是拥挤。"),
      [
        compare("extension-add9-nine", "Cadd9 / C9 (C–D–E–B♭)", "intervals: 0 2 4 7 | degrees: 1 2 3 4", "intervals: 0 2 4 10 | degrees: 1 2 3 4"),
        chord("extension-major-nine", "Cmaj9", "C", "major9", { action: "play" }),
        chord("extension-minor-nine", "Am9", "A", "minor9", { action: "play" }),
        notes("extension-dominant-nine-resolve", "G9 → Cmaj7", "[G2,F3,A3,B3,D4] [C3,E3,G3,B3]", { action: "resolve" }),
        notes("extension-minor-eleven", "Dm11", "[D3,C4,E4,F4,G4]/3", { action: "build" }),
        notes("extension-eleven-major-third", "G11: B against C", "[G2,F3,A3,B3,C4]/3", { action: "hear" }),
        notes("extension-thirteen-on-top", "G13 with E on top", "[G2,B2,D3,F3,E4]/3", { action: "keep" }),
        notes("extension-omit-fifth", "G13 without D", "[G2,F3,B3,E4]/3", { action: "build" }),
        notes("extension-or-melody", "Cmaj7 with D melody", "[C3,E3,G3,B3,D4] [C3,E3,G3,B3]", { action: "compare" }),
        notes("extension-clear-voicing", "Dm9–G13–Cmaj9", "[D3,F3,C4,E4] [G2,F3,B3,E4] [C3,E3,B3,D4]", { action: "connect" }),
      ]),
    unit(
      "applied-dominants",
      l("Applied Dominants", "Dominantes aplicadas", "Dominantes aplicadas", "Zwischendominanten", "セカンダリー・ドミナント", "副属和弦"),
      l("Tonicize diatonic destinations with their own dominant chords.", "Tonicize destinos diatônicos com suas próprias dominantes.", "Toniciza destinos diatónicos con sus propios dominantes.", "Tonikalisiere diatonische Ziele mit ihren eigenen Dominanten.", "ダイアトニックな到着先を、それぞれのドミナントで一時的にトニック化します。", "用各自的属和弦暂时主音化自然音目标。"),
      l("An applied dominant introduces an altered leading tone that belongs to the destination chord, creating a brief local V–I without abandoning the main key.", "Uma dominante aplicada introduz uma sensível alterada do acorde de destino, criando um V–I local sem abandonar a tonalidade principal.", "Un dominante aplicado introduce la sensible alterada del acorde de destino y crea un V–I local sin abandonar la tonalidad principal.", "Eine Zwischendominante bringt den alterierten Leitton des Zielakkords und erzeugt ein lokales V–I, ohne die Haupttonart zu verlassen.", "セカンダリー・ドミナントは到着コードの導音を一時的に導入し、主調を離れず局所的なV–Iを作ります。", "副属和弦引入目标和弦的变化导音，在不离开主调的情况下形成短暂的局部V–I。"),
      [
        notes("applied-five-of-five", "D7 → G → C", "[D3,F#3,A3,C4] [G2,B2,D3,G3] [C3,E3,G3]", { action: "resolve" }),
        notes("applied-five-of-two", "A7 → Dm", "[A2,C#3,E3,G3] [D3,F3,A3]", { action: "resolve" }),
        notes("applied-five-of-three", "B7 → Em", "[B2,D#3,F#3,A3] [E3,G3,B3]", { action: "resolve" }),
        notes("applied-five-of-four", "C7 → F", "[C3,E3,G3,Bb3] [F3,A3,C4]", { action: "resolve" }),
        notes("applied-five-of-six", "E7 → Am", "[E3,G#3,B3,D4] [A3,C4,E4]", { action: "resolve" }),
        notes("applied-two-five-of-five", "Am7–D7–G", "[A2,C3,E3,G3] [D3,F#3,A3,C4] [G2,B2,D3,G3]", { action: "connect" }),
        notes("applied-dominant-chain", "E7–A7–D7–G7–C", "[E3,G#3,B3,D4] [A2,C#3,E3,G3] [D3,F#3,A3,C4] [G2,B2,D3,F3] [C3,E3,G3]", { action: "follow" }),
        notes("applied-delayed-resolution", "D7–Em7–G", "[D3,F#3,A3,C4] [E3,G3,B3,D4] [G2,B2,D3,G3]", { action: "hear" }),
        notes("applied-tonicize-or-modulate", "D7–G–C / D7–G–A7–D", "[D3,F#3,A3,C4] [G2,B2,D3,G3] [C3,E3,G3] [D3,F#3,A3,C4] [G2,B2,D3,G3] [A2,C#3,E3,G3] [D3,F#3,A3]", { action: "compare", splitAt: 3 }),
        notes("applied-write-phrase", "C–E7–Am–D7–G–C", "[C3,E3,G3] [E3,G#3,B3,D4] [A2,C3,E3] [D3,F#3,A3,C4] [G2,B2,D3,F3] [C3,E3,G3]", { action: "write" }),
      ]),
    unit(
      "borrowed-harmony",
      l("Borrowed Harmony", "Harmonia emprestada", "Armonía prestada", "Entlehnte Harmonie", "借用和音", "借用和声"),
      l("Borrow chords from the parallel key while keeping the original tonic clear.", "Empreste acordes da tonalidade paralela mantendo clara a tônica original.", "Toma acordes de la tonalidad paralela manteniendo clara la tónica original.", "Entleihe Akkorde aus der Paralleltonart und halte die ursprüngliche Tonika klar.", "平行調からコードを借りながら元のトニックを明確に保ちます。", "从同主音调借用和弦，同时保持原主音清楚。"),
      l("Modal mixture changes selected scale degrees for one chord; its effect is strongest when common tones and the return to tonic remain audible.", "A mistura modal altera graus escolhidos em um acorde; o efeito é mais forte quando notas comuns e retorno à tônica permanecem audíveis.", "La mezcla modal altera grados concretos durante un acorde; funciona mejor cuando siguen audibles las notas comunes y el regreso a la tónica.", "Modaler Austausch verändert ausgewählte Stufen für einen Akkord; gemeinsame Töne und die Rückkehr zur Tonika machen den Effekt deutlich.", "モーダル・インターチェンジは1コードだけ音階音を変え、共通音とトニックへの帰還が聞こえるほど効果が明確になります。", "调式互换只在一个和弦中改变选定音级；共同音与回到主和弦仍清楚时，效果最明显。"),
      [
        compare("borrowed-parallel-tonics", "parallel C / Cm", "degrees: 1 3 5", "intervals: 0 3 7 | degrees: 1 2 3", { action: "hear" }),
        notes("borrowed-minor-four", "C–Fm–C", "[C3,E3,G3] [F3,Ab3,C4] [C3,E3,G3]", { action: "borrow" }),
        notes("borrowed-flat-seven", "C–B♭–F–C", "[C3,E3,G3] [Bb2,D3,F3] [F3,A3,C4] [C3,E3,G3]", { action: "borrow" }),
        notes("borrowed-flat-six", "C–A♭–G–C", "[C3,E3,G3] [Ab2,C3,Eb3] [G2,B2,D3] [C3,E3,G3]", { action: "borrow" }),
        notes("borrowed-two-diminished", "C–Ddim–G–C", "[C3,E3,G3] [D3,F3,Ab3] [G2,B2,D3] [C3,E3,G3]", { action: "borrow" }),
        notes("borrowed-major-four-minor", "Am–D–Am", "[A2,C3,E3] [D3,F#3,A3] [A2,C3,E3]", { action: "borrow" }),
        notes("borrowed-picardy-third", "Am–E–A", "[A2,C3,E3] [E3,G#3,B3] [A2,C#3,E3]", { action: "resolve" }),
        notes("borrowed-backdoor", "Fm7–B♭7–Cmaj7", "[F3,Ab3,C4,Eb4] [Bb2,Ab3,D4,F4] [C3,E3,G3,B3]", { action: "resolve" }),
        notes("borrowed-one-chord", "C–Am–F–Fm–C", "[C3,E3,G3] [A2,C3,E3] [F3,A3,C4] [F3,Ab3,C4] [C3,E3,G3]", { action: "hear" }),
        notes("borrowed-color-phrase", "C–E♭–F–Fm–C", "[C3,E3,G3] [Eb3,G3,Bb3] [F3,A3,C4] [F3,Ab3,C4] [C3,E3,G3]", { action: "write" }),
      ]),
    unit(
      "diminished-augmented-motion",
      l("Diminished and Augmented Motion", "Movimento diminuto e aumentado", "Movimiento disminuido y aumentado", "Verminderte und übermäßige Bewegung", "ディミニッシュとオーギュメントの動き", "减和弦与增和弦的运动"),
      l("Resolve symmetrical and altered triads by following their tendency tones.", "Resolva tríades simétricas e alteradas acompanhando suas notas de tendência.", "Resuelve tríadas simétricas y alteradas siguiendo sus notas de tendencia.", "Löse symmetrische und alterierte Dreiklänge über ihre Strebetöne auf.", "傾向音を追って対称形と変化トライアドを解決します。", "跟随倾向音，解决对称与变化三和弦。"),
      l("Diminished chords compress intervals and augmented chords widen the fifth; trace the actual voice leading because many, but not all, tendency tones resolve by semitone.", "Acordes diminutos comprimem intervalos e aumentados alargam a quinta; acompanhe a condução real, pois muitas notas de tendência, mas não todas, resolvem por semitom.", "Los acordes disminuidos comprimen intervalos y los aumentados amplían la quinta; sigue la conducción real, porque muchas notas de tendencia, pero no todas, resuelven por semitono.", "Verminderte Akkorde verengen Intervalle und übermäßige erweitern die Quinte; verfolge die tatsächliche Stimmführung, denn viele, aber nicht alle Strebetöne lösen sich halbtonweise.", "ディミニッシュは音程を縮め、オーギュメントは5度を広げます。多くの傾向音は半音で解決しますが、すべてではないため実際の声部進行を追います。", "减和弦压缩音程，增和弦扩大五度；许多倾向音会按半音解决，但并非全部，因此要跟随实际声部移动。"),
      [
        chord("altered-leading-triad", "Bdim", "B", "diminished"),
        chord("altered-leading-seventh", "Bm7♭5", "B", "halfdim7"),
        chord("altered-full-diminished", "Bdim7", "B", "diminished7"),
        notes("altered-dim-symmetry", "Bdim7 / Ddim7", "[B2,D3,F3,Ab3] [D3,F3,Ab3,Cb4]", { action: "compare", splitAt: 1 }),
        notes("altered-passing-diminished", "C–C♯dim7–Dm", "[C3,E3,G3] [C#3,E3,G3,Bb3] [D3,F3,A3]", { action: "connect" }),
        notes("altered-common-tone-dim", "C–Cdim7–C", "[C3,E3,G3] [C3,Eb3,Gb3,A3] [C3,E3,G3]", { action: "hear" }),
        notes("altered-secondary-leading", "C♯dim7–Dm", "[C#3,E3,G3,Bb3] [D3,F3,A3]", { action: "resolve" }),
        chord("altered-augmented-triad", "Caug", "C", "augmented"),
        notes("altered-augmented-hinge", "C–Caug–Am/C", "[C3,E3,G3] [C3,E3,G#3] [C3,E3,A3]", { action: "connect" }),
        notes("altered-halfstep-resolution", "Bdim7–C / Caug–Am", "[B2,D3,F3,Ab3] [C3,E3,G3] [C3,E3,G#3] [C3,E3,A3]", { action: "resolve", splitAt: 2 }),
      ]),
    unit(
      "modal-harmony",
      l("Modal Harmony", "Harmonia modal", "Armonía modal", "Modale Harmonie", "モード和声", "调式和声"),
      l("Build modal vamps around each mode's characteristic scale degree.", "Monte ciclos modais em torno do grau característico de cada modo.", "Construye ciclos modales alrededor del grado característico de cada modo.", "Baue modale Vamps um die charakteristische Stufe jedes Modus.", "各モードの特徴音を中心にモーダル・ヴァンプを作ります。", "围绕每个调式的特征音构建调式循环。"),
      l("Modal harmony sustains one tonal center while avoiding dominant motion that would redefine the passage as ordinary major or minor.", "A harmonia modal sustenta um centro tonal e evita movimento dominante que redefiniria a passagem como maior ou menor comum.", "La armonía modal sostiene un centro tonal y evita el movimiento dominante que convertiría el pasaje en mayor o menor común.", "Modale Harmonie hält ein Zentrum und vermeidet Dominantbewegung, die die Passage als gewöhnliches Dur oder Moll deuten würde.", "モード和声は一つの中心を保ち、通常のメジャーやマイナーへ戻すドミナント進行を避けます。", "调式和声保持一个中心，并避免会把段落重新定义为普通大调或小调的属功能运动。"),
      [
        compare("modal-tonal-modal", "A minor / A Dorian", "scale: Natural Minor | degrees: 1 3 5 6", "scale: Dorian | degrees: 1 3 5 6", { root: "A", scale: "Natural Minor" }),
        progression("modal-dorian", "i–IV in D Dorian", "i IV", { key: "D", scale: "Dorian", beats: 4 }),
        progression("modal-mixolydian", "I–♭VII in G Mixolydian", "I VII", { key: "G", scale: "Mixolydian", beats: 4 }),
        progression("modal-phrygian", "i–♭II in E Phrygian", "i II", { key: "E", scale: "Phrygian", beats: 4 }),
        progression("modal-lydian", "I–II in F Lydian", "I II", { key: "F", scale: "Lydian", beats: 4 }),
        progression("modal-aeolian", "i–♭VII–♭VI in A Aeolian", "i VII VI", { key: "A", scale: "Natural Minor", beats: 3 }),
        notes("modal-pedal", "D pedal under Dm–G", "[D2,D3,F3,A3] [D2,D3,G3,B3]", { action: "keep" }),
        progression("modal-two-chord-vamp", "Dm–G in D Dorian", "i IV", { key: "D", scale: "Dorian", tempo: 78, beats: 2 }),
        compare("modal-one-degree-shift", "A Aeolian / A Dorian", "scale: Natural Minor | degrees: 1 3 5 6 5", "scale: Dorian | degrees: 1 3 5 6 5", { root: "A", scale: "Natural Minor" }),
        progression("modal-eight-bars", "eight bars: i–IV–i–VII | i–IV–VII–i", "i IV i VII i IV VII i", { key: "D", scale: "Dorian", action: "write", beats: 4 }),
      ]),
    unit(
      "modulation",
      l("Modulation", "Modulação", "Modulación", "Modulation", "転調", "转调"),
      l("Establish a new tonic with pivots, common tones, or a direct change.", "Estabeleça uma nova tônica com pivôs, notas comuns ou mudança direta.", "Establece una nueva tónica con pivotes, notas comunes o un cambio directo.", "Etabliere eine neue Tonika mit Drehakkorden, gemeinsamen Tönen oder direktem Wechsel.", "ピボット、共通音、直接転調で新しいトニックを確立します。", "用枢纽和弦、共同音或直接变化建立新主音。"),
      l("A modulation is complete only when the new key receives enough functional evidence to sound like home rather than a temporary destination.", "A modulação se completa quando a nova tonalidade recebe evidência funcional suficiente para soar como casa, não como destino temporário.", "La modulación se completa cuando la nueva tonalidad recibe evidencia funcional suficiente para sonar como casa y no como destino temporal.", "Eine Modulation ist erst vollständig, wenn die neue Tonart funktional als Zuhause und nicht nur als Zwischenziel bestätigt wird.", "新しいキーが一時的な到着先ではなくホームに聞こえるだけの機能的根拠があって初めて転調が成立します。", "只有新调获得足够功能证据、听起来像新的归宿而非临时目标时，转调才算完成。"),
      [
        notes("modulation-hear-new-tonic", "C–D7–G–D7–G", "[C3,E3,G3] [D3,F#3,A3,C4] [G2,B2,D3] [D3,F#3,A3,C4] [G2,B2,D3]", { action: "hear" }),
        notes("modulation-common-pivot", "C: vi (Am) = G: ii", "[C3,E3,G3] [A2,C3,E3] [D3,F#3,A3] [G2,B2,D3]", { action: "follow" }),
        notes("modulation-relative-minor", "C–G–Am–E7–Am", "[C3,E3,G3] [G2,B2,D3] [A2,C3,E3] [E3,G#3,B3,D4] [A2,C3,E3]", { action: "connect" }),
        notes("modulation-dominant-key", "C–Am–D7–G", "[C3,E3,G3] [A2,C3,E3] [D3,F#3,A3,C4] [G2,B2,D3]", { action: "connect" }),
        notes("modulation-direct", "C → E♭", "[C3,E3,G3]/4 [Eb3,G3,Bb3]/4", { action: "compare" }),
        notes("modulation-common-tone", "C → A♭ with C held", "[C3,E3,G3] [C3,Eb3,Ab3]", { action: "keep" }),
        notes("modulation-sequence", "C–A7–Dm–B7–Em", "[C3,E3,G3] [A2,C#3,E3,G3] [D3,F3,A3] [B2,D#3,F#3,A3] [E3,G3,B3]", { action: "follow" }),
        notes("modulation-confirm-five-one", "A7–D–A7–D", "[A2,C#3,E3,G3] [D3,F#3,A3] [A2,C#3,E3,G3] [D3,F#3,A3]", { action: "resolve" }),
        notes("modulation-stay-return", "G–D7–G / G–G7–C", "[G2,B2,D3] [D3,F#3,A3,C4] [G2,B2,D3] [G2,B2,D3] [G2,B2,D3,F3] [C3,E3,G3]", { action: "compare", splitAt: 3 }),
        notes("modulation-sixteen-bar-map", l("sixteen bars: C–Am–D7–G | Em–A7–D–G", "dezesseis compassos: C–Am–D7–G | Em–A7–D–G", "dieciséis compases: C–Am–D7–G | Em–A7–D–G", "sechzehn Takte: C–Am–D7–G | Em–A7–D–G", "16小節：C–Am–D7–G | Em–A7–D–G", "十六小节：C–Am–D7–G | Em–A7–D–G"), "[C3,E3,G3]/8 [A2,C3,E3]/8 [D3,F#3,A3,C4]/8 [G2,B2,D3]/8 [E3,G3,B3]/8 [A2,C#3,E3,G3]/8 [D3,F#3,A3]/8 [G2,B2,D3]/8", { action: "write" }),
      ]),
    unit(
      "jazz-cadences",
      l("Jazz Cadences", "Cadências de jazz", "Cadencias de jazz", "Jazzkadenzen", "ジャズ・カデンツ", "爵士终止式"),
      l("Voice-lead guide tones through major and minor ii–V–I cadences.", "Conduza notas-guia por cadências ii–V–I maiores e menores.", "Conduce notas guía por cadencias ii–V–I mayores y menores.", "Führe Leittöne durch Dur- und Moll-ii–V–I-Kadenzen.", "メジャーとマイナーのii–V–Iでガイドトーンを導きます。", "在大调与小调ii–V–I终止中连接导向音。"),
      l("Shell voicings expose thirds and sevenths, making substitutions and altered dominants easier to hear without dense chord stacks.", "Aberturas shell expõem terças e sétimas, facilitando ouvir substituições e dominantes alteradas sem acordes densos.", "Las disposiciones shell exponen terceras y séptimas y facilitan oír sustituciones y dominantes alterados sin acordes densos.", "Shell-Voicings zeigen Terzen und Septimen und machen Substitutionen sowie alterierte Dominanten ohne dichte Akkorde hörbar.", "シェル・ボイシングは3度と7度を露出させ、密集和音なしで代理コードやオルタード・ドミナントを聴きやすくします。", "壳式配置突出三音与七音，使替代和弦和变化属和弦无需密集堆叠也能听清。"),
      [
        notes("jazz-guide-tones", "Dm7–G7: F–C → F–B", "[F3,C4] [F3,B3]", { action: "follow" }),
        notes("jazz-shells", "Dm7–G7–Cmaj7 shells", "[D3,F3,C4] [G2,F3,B3] [C3,E3,B3]", { action: "play" }),
        notes("jazz-major-two-five-one", "Dm7–G7–Cmaj7", "[D3,F3,A3,C4] [D3,F3,G3,B3] [C3,E3,G3,B3]", { action: "connect" }),
        notes("jazz-minor-two-five-one", "Bm7♭5–E7♭9–Am", "[B2,D3,F3,A3,B3] [E2,D3,F3,G#3,B3] [A2,C3,E3,A3,C4]", { action: "resolve" }),
        notes("jazz-thirds-sevenths-swap", "F–C → F–B → E–B", "[F3,C4] [F3,B3] [E3,B3]", { action: "follow" }),
        notes("jazz-rootless-dominant", "G9 without G", "[B3,D4,F4,A4]/3", { action: "build" }),
        notes("jazz-tritone-sub", "Dm7–D♭7–Cmaj7", "[D3,F3,A3,C4] [Db3,F3,Ab3,Cb4] [C3,E3,G3,B3]", { action: "resolve" }),
        notes("jazz-backdoor-two-five", "backdoor Fm7–B♭7–Cmaj7", "[F3,Ab3,C4,Eb4] [Bb2,Ab3,D4,F4] [C3,E3,G3,B3]", { action: "connect" }),
        notes("jazz-altered-dominant", "G7♭9 → Cmaj7", "[G2,F3,Ab3,B3,D4] [C3,E3,G3,B3]", { action: "resolve" }),
        notes("jazz-voice-led-chorus", "Cmaj7–A7–Dm7–G7", "[C3,E3,G3,B3] [C#3,E3,G3,A3] [D3,F3,A3,C4] [D3,F3,G3,B3]", { action: "arrange" }),
      ]),
    unit(
      "harmonic-sequences",
      l("Harmonic Sequences", "Sequências harmônicas", "Secuencias armónicas", "Harmonische Sequenzen", "和声シークエンス", "和声模进"),
      l("Repeat a harmonic pattern while tracking its bass and upper-voice lines.", "Repita um padrão harmônico acompanhando suas linhas de baixo e voz superior.", "Repite un patrón armónico siguiendo sus líneas de bajo y voz superior.", "Wiederhole ein harmonisches Muster und verfolge Bass- und Oberstimme.", "低音線と上声を追いながら和声パターンを反復します。", "重复和声模式，同时跟随低音线与上声线。"),
      l("A sequence preserves intervallic motion while shifting its starting point; clear voice leading keeps repetition from sounding mechanical.", "Uma sequência preserva o movimento intervalar ao mudar o ponto inicial; condução clara evita que a repetição soe mecânica.", "Una secuencia conserva el movimiento interválico al cambiar el punto inicial; una conducción clara evita que la repetición suene mecánica.", "Eine Sequenz erhält die Intervallbewegung bei verschobenem Startpunkt; klare Stimmführung verhindert mechanische Wiederholung.", "シークエンスは開始位置を移しても音程の動きを保ち、明確な声部進行が機械的な反復を防ぎます。", "模进在移动起点时保留音程运动；清楚声部进行能避免重复显得机械。"),
      [
        progression("sequence-descending-fifths", "descending fifths: iii–vi–ii–V–I", "iii vi ii V I", { action: "play" }),
        progression("sequence-ascending-fifths", "I–V–ii–vi–iii", "I V ii vi iii", { action: "follow" }),
        progression("sequence-descending-thirds", "I–vi–IV–ii–vii°", "I vi IV ii vii", { action: "follow" }),
        progression("sequence-ascending-thirds", "I–iii–V–vii°–ii", "I iii V vii ii", { action: "follow" }),
        notes("sequence-five-six", "5–6 over C–Dm–Em", "[C3,G3,E4] [D3,A3,F4] [E3,B3,G4]", { action: "follow" }),
        notes("sequence-line-cliche", "Am–Am(maj7)–Am7–Am6", "[A2,C3,E3,A3] [A2,C3,E3,G#3] [A2,C3,E3,G3] [A2,C3,E3,F#3]", { action: "follow" }),
        notes("sequence-chromatic-bass-down", "C–G/B–B♭dim7–Am", "[C3,E3,G3] [B2,D3,G3] [Bb2,Db3,E3,G3] [A2,C3,E3]", { action: "follow" }),
        notes("sequence-chromatic-bass-up", "C–C♯dim7–Dm–E♭dim7–Em", "[C3,E3,G3] [C#3,E3,G3,Bb3] [D3,F3,A3] [Eb3,Gb3,A3,C4] [E3,G3,B3]", { action: "follow" }),
        notes("sequence-pedal-point", "C pedal under I–IV–ii–V", "[C3,E3,G3] [C3,F3,A3] [C3,D3,F3,A3] [C3,D3,G3,B3]", { action: "keep" }),
        progression("sequence-keep-home", "I–iii–vi–ii–V–I", "I iii vi ii V I", { action: "hear", beats: 2 }),
      ]),
    unit(
      "reharmonization",
      l("Reharmonization", "Rearmonização", "Rearmonización", "Reharmonisation", "リハーモナイズ", "重新和声化"),
      l("Change harmony under a fixed melody while preserving clear voice leading.", "Mude a harmonia sob uma melodia fixa preservando condução clara.", "Cambia la armonía bajo una melodía fija conservando una conducción clara.", "Verändere die Harmonie unter einer festen Melodie und erhalte klare Stimmführung.", "固定したメロディーの下で、明確な声部進行を保ちながら和声を変えます。", "在固定旋律下改变和声，同时保持清楚声部进行。"),
      l("A useful reharmonization supports the melody note, clarifies a destination, and changes one variable at a time so its effect can be heard.", "Uma boa rearmonização sustenta a nota da melodia, esclarece um destino e muda uma variável por vez para que o efeito seja ouvido.", "Una buena rearmonización sostiene la nota melódica, aclara un destino y cambia una variable cada vez para que se oiga el efecto.", "Eine brauchbare Reharmonisation trägt den Melodieton, klärt ein Ziel und verändert jeweils nur eine Variable.", "有効なリハーモナイズはメロディー音を支え、到着先を明確にし、効果が聞こえるよう一度に一要素だけ変えます。", "有效的重新和声化要支撑旋律音、明确目标，并一次只改变一个变量，使效果可听。"),
      [
        notes("reharm-melody-first", "E melody over C / Fmaj7", "[C3,E3,G3,E4] [F3,A3,C4,E4]", { action: "compare", splitAt: 1 }),
        notes("reharm-six-for-one", "C → Am under E", "[C3,E3,G3,E4] [A2,C3,E3,E4]", { action: "compare" }),
        notes("reharm-two-for-four", "F → Dm7 under A", "[F3,A3,C4,A4] [D3,F3,C4,A4]", { action: "compare" }),
        notes("reharm-seven-for-five", l("G7 → Bdim7 under top F", "G7 → Bdim7 sob F no topo", "G7 → Bdim7 bajo F arriba", "G7 → Bdim7 unter oberem F", "トップFの下でG7 → Bdim7", "顶声部F下的G7 → Bdim7"), "[G2,B2,D3,F4] [B2,D3,Ab3,F4]", { action: "compare" }),
        notes("reharm-applied-dominant", "C–E7–Am", "[C3,E3,G3] [E3,G#3,B3,D4] [A2,C3,E3]", { action: "write" }),
        notes("reharm-passing-diminished", "C–C♯dim7–Dm", "[C3,E3,G3] [C#3,E3,G3,Bb3] [D3,F3,A3]", { action: "write" }),
        notes("reharm-borrow-minor-four", "F–Fm–C", "[F3,A3,C4] [F3,Ab3,C4] [C3,E3,G3]", { action: "borrow" }),
        notes("reharm-bass-change", "C / C/E / C/G", "[C3,E3,G3] [E3,G3,C4] [G3,C4,E4]", { action: "compare", splitAt: [1, 2] }),
        notes("reharm-cadence-swap", "G7–C / Fm–C", "[G2,B2,D3,F3] [C3,E3,G3] [F3,Ab3,C4] [C3,E3,G3]", { action: "compare", splitAt: 2 }),
        notes("reharm-original-new", "C–Am–F–G / C–A7–Dm–G7", "[C3,E3,G3] [A2,C3,E3] [F3,A3,C4] [G2,B2,D3] [C3,E3,G3] [A2,C#3,E3,G3] [D3,F3,A3] [G2,B2,D3,F3]", { action: "arrange", splitAt: 4 }),
      ]),
    unit(
      "form-and-composition",
      l("Form and Composition", "Forma e composição", "Forma y composición", "Form und Komposition", "形式と作曲", "曲式与创作"),
      l("Use harmonic rhythm and key contrast to shape complete sections.", "Use ritmo harmônico e contraste tonal para moldar seções completas.", "Usa ritmo armónico y contraste tonal para dar forma a secciones completas.", "Forme vollständige Abschnitte mit harmonischem Rhythmus und Tonartkontrast.", "ハーモニック・リズムとキーの対比で完成したセクションを形作ります。", "用和声节奏与调性对比塑造完整段落。"),
      l("Form becomes audible when chord-change density, cadence strength, register, and tonal center distinguish one section from the next.", "A forma se torna audível quando densidade de trocas, força das cadências, registro e centro tonal diferenciam uma seção da seguinte.", "La forma se vuelve audible cuando densidad de cambios, fuerza de cadencias, registro y centro tonal distinguen una sección de la siguiente.", "Form wird hörbar, wenn Wechseldichte, Kadenzstärke, Lage und tonales Zentrum Abschnitte voneinander unterscheiden.", "コード変更の密度、カデンツの強さ、音域、調の中心が各セクションを分けると形式が聞こえます。", "当和弦变化密度、终止强度、音区与调性中心区分相邻段落时，曲式就能被听见。"),
      [
        notes("form-harmonic-rhythm", "I–IV–V–I at 4 / 2 beats", "[C3,E3,G3]/4 [F3,A3,C4]/4 [G2,B2,D3]/4 [C3,E3,G3]/4 [C3,E3,G3]/2 [F3,A3,C4]/2 [G2,B2,D3]/2 [C3,E3,G3]/2 [C3,E3,G3]/2 [F3,A3,C4]/2 [G2,B2,D3]/2 [C3,E3,G3]/2", { action: "compare", beat: 1, splitAt: 4 }),
        progression("form-eight-bar-blues", l("eight bars in A: I–IV–I–I | IV–IV–I–V", "oito compassos em A: I–IV–I–I | IV–IV–I–V", "ocho compases en A: I–IV–I–I | IV–IV–I–V", "acht Takte in A: I–IV–I–I | IV–IV–I–V", "Aの8小節：I–IV–I–I | IV–IV–I–V", "A调八小节：I–IV–I–I | IV–IV–I–V"), "I IV I I IV IV I V", { key: "A", action: "arrange", beats: 4 }),
        progression("form-quick-change", "G: I–IV–I–I | IV–IV–I–V", "I IV I I IV IV I V", { key: "G", action: "arrange", beats: 1 }),
        notes("form-minor-blues", "Am7–Dm7–Am7–E7", "[A2,C3,E3,G3] [D3,F3,A3,C4] [A2,C3,E3,G3] [E3,G#3,B3,D4]", { action: "arrange" }),
        progression("form-aaba-map", "AABA harmonic map", "I vi V I vi V IV ii V I vi V", { action: "read", beats: 1 }),
        progression("form-verse-chorus", "verse: vi–IV–I–V | chorus: I–V–vi–IV", "vi IV I V I V vi IV", { action: "arrange", beats: 2 }),
        progression("form-prechorus-lift", "ii–IV–V–V", "ii IV V V", { action: "follow", beats: 2 }),
        notes("form-bridge-new-key", "C section → E♭ bridge", "[C3,E3,G3] [A2,C3,E3] [F3,A3,C4] [G2,B2,D3] [Eb3,G3,Bb3] [Ab2,C3,Eb3] [Bb2,D3,F3] [Eb3,G3,Bb3]", { action: "arrange" }),
        notes("form-keep-melody", "G melody over C–Am–F–G", "[C3,E3,G3,G4] [A2,C3,E3,G4] [F3,A3,C4,G4] [G2,B2,D3,G4]", { action: "keep" }),
        notes("form-aaba-section-sketch", l("A–A–B–A section sketch", "esboço de seção A–A–B–A", "bosquejo de sección A–A–B–A", "Skizze eines A–A–B–A-Abschnitts", "A–A–B–Aセクションのスケッチ", "A–A–B–A段落草图"), "[C3,E3,G3] [A2,C3,E3] [D3,F3,A3] [G2,B2,D3] [C3,E3,G3] [A2,C3,E3] [D3,F3,A3] [G2,B2,D3] [F3,A3,C4] [F3,Ab3,C4] [C3,E3,G3] [G2,B2,D3] [C3,E3,G3] [A2,C3,E3] [D3,F3,A3] [G2,B2,D3]", { action: "write" }),
      ]),
  ],
};

const EXAMPLE_WORD = l("example", "exemplo", "ejemplo", "Beispiel", "例", "示例");
const CHORD_SYMBOLS = {
  major: "",
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  power: "5",
  suspended2: "sus2",
  suspended4: "sus4",
  major6: "6",
  minor6: "m6",
  major7: "maj7",
  dominant7: "7",
  minor7: "m7",
  halfdim7: "m7♭5",
  diminished7: "dim7",
  add9: "add9",
  minorAdd9: "m(add9)",
  dominant9: "9",
  major9: "maj9",
  minor9: "m9",
};
const STYLE_NAMES = {
  block: l("block", "bloco", "bloque", "Block", "ブロック", "柱式"),
  arpeggio: l("arpeggio", "arpejo", "arpegio", "Arpeggio", "アルペジオ", "琶音"),
  strum: l("strum", "batida", "rasgueo", "Anschlag", "ストラム", "扫弦"),
};
const SCALE_NAMES = {
  Major: l("major", "maior", "mayor", "Dur", "メジャー", "大调"),
  "Natural Minor": l("natural minor", "menor natural", "menor natural", "Natürlich Moll", "ナチュラル・マイナー", "自然小调"),
  "Harmonic Minor": l("harmonic minor", "menor harmônica", "menor armónica", "Harmonisch Moll", "ハーモニック・マイナー", "和声小调"),
  Dorian: l("Dorian", "Dórico", "Dórico", "Dorisch", "ドリアン", "多利亚"),
  Mixolydian: l("Mixolydian", "Mixolídio", "Mixolidio", "Mixolydisch", "ミクソリディアン", "混合利底亚"),
  Phrygian: l("Phrygian", "Frígio", "Frigio", "Phrygisch", "フリジアン", "弗里几亚"),
  Lydian: l("Lydian", "Lídio", "Lidio", "Lydisch", "リディアン", "利底亚"),
};
const SOLFEGE_NAMES = {
  C: l("do", "dó", "do", "C", "ド", "do"),
  D: l("re", "ré", "re", "D", "レ", "re"),
  E: l("mi", "mi", "mi", "E", "ミ", "mi"),
  F: l("fa", "fá", "fa", "F", "ファ", "fa"),
  G: l("sol", "sol", "sol", "G", "ソ", "sol"),
  A: l("la", "lá", "la", "A", "ラ", "la"),
  B: l("ti", "si", "si", "H", "シ", "si"),
};
const NUMBER_WORDS = {
  0: l("zero", "zero", "cero", "null", "ゼロ", "零"),
  1: l("one", "um", "uno", "eins", "一", "一"),
  2: l("two", "dois", "dos", "zwei", "二", "二"),
  3: l("three", "três", "tres", "drei", "三", "三"),
  4: l("four", "quatro", "cuatro", "vier", "四", "四"),
  5: l("five", "cinco", "cinco", "fünf", "五", "五"),
  6: l("six", "seis", "seis", "sechs", "六", "六"),
  7: l("seven", "sete", "siete", "sieben", "七", "七"),
  8: l("eight", "oito", "ocho", "acht", "八", "八"),
  9: l("nine", "nove", "nueve", "neun", "九", "九"),
  10: l("ten", "dez", "diez", "zehn", "十", "十"),
  11: l("eleven", "onze", "once", "elf", "十一", "十一"),
  12: l("twelve", "doze", "doce", "zwölf", "十二", "十二"),
};
const FUNCTION_WORDS = {
  I: l("tonic", "tônica", "tónica", "Tonika", "トニック", "主功能"),
  II: l("supertonic", "supertônica", "supertónica", "Supertonika", "スーパートニック", "上主音功能"),
  III: l("mediant", "mediante", "mediante", "Mediante", "メディアント", "中音功能"),
  IV: l("subdominant", "subdominante", "subdominante", "Subdominante", "サブドミナント", "下属功能"),
  V: l("dominant", "dominante", "dominante", "Dominante", "ドミナント", "属功能"),
  VI: l("submediant", "submediante", "submediante", "Submediante", "サブメディアント", "下中音功能"),
  VII: l("leading-tone function", "função da sensível", "función de sensible", "Leittonfunktion", "導音機能", "导音功能"),
};
const INTERVAL_WORDS = {
  0: l("unison", "uníssono", "unísono", "Prime", "ユニゾン", "同度"),
  2: l("major second", "segunda maior", "segunda mayor", "große Sekunde", "長2度", "大二度"),
  3: l("minor third", "terça menor", "tercera menor", "kleine Terz", "短3度", "小三度"),
  4: l("major third", "terça maior", "tercera mayor", "große Terz", "長3度", "大三度"),
  5: l("perfect fourth", "quarta justa", "cuarta justa", "reine Quarte", "完全4度", "纯四度"),
  6: l("tritone", "trítono", "tritono", "Tritonus", "トライトーン", "三全音"),
  7: l("perfect fifth", "quinta justa", "quinta justa", "reine Quinte", "完全5度", "纯五度"),
  8: l("raised fifth", "quinta elevada", "quinta elevada", "übermäßige Quinte", "増5度", "升五度"),
  9: l("major sixth", "sexta maior", "sexta mayor", "große Sexte", "長6度", "大六度"),
  10: l("minor seventh", "sétima menor", "séptima menor", "kleine Septime", "短7度", "小七度"),
  11: l("major seventh", "sétima maior", "séptima mayor", "große Septime", "長7度", "大七度"),
  12: l("octave", "oitava", "octava", "Oktave", "オクターブ", "八度"),
};

function spokenPitch(token, locale) {
  const match = token.match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)?$/u);
  if (!match) return token;
  const syllable = SOLFEGE_NAMES[match[1].toUpperCase()][locale];
  const accidental = {
    "": "",
    "#": l(" sharp", " sustenido", " sostenido", "is", "・シャープ", "升")[locale],
    "♯": l(" sharp", " sustenido", " sostenido", "is", "・シャープ", "升")[locale],
    b: l(" flat", " bemol", " bemol", "es", "・フラット", "降")[locale],
    "♭": l(" flat", " bemol", " bemol", "es", "・フラット", "降")[locale],
  }[match[2]];
  return `${syllable}${accidental}${match[3] || ""}`;
}

function compactVoicingMap(lesson, locale) {
  const events = sequenceEvents(lesson.sequence, lesson.beat);
  const selected = events.length <= 4
    ? events
    : [events[0], events[Math.floor(events.length / 2)], events[events.length - 1]];
  return selected.map((event) => event.pitches.map((pitch) => spokenPitch(pitch, locale)).join("–")).join(" / ");
}

function localizedCompareDescriptor(value, locale) {
  let result = value;
  const labels = {
    "degrees:": l("degrees", "graus", "grados", "Stufen", "度数", "音级")[locale],
    "intervals:": l("semitones", "semitons", "semitonos", "Halbtöne", "半音", "半音")[locale],
    "scale:": l("scale", "escala", "escala", "Skala", "スケール", "音阶")[locale],
  };
  for (const [source, replacement] of Object.entries(labels)) result = result.replaceAll(source, replacement);
  for (const [name, translations] of Object.entries(SCALE_NAMES)) result = result.replaceAll(name, translations[locale]);
  return result.replaceAll(" | ", "; ");
}

function wordSequence(values, locale) {
  return values.map((value) => NUMBER_WORDS[value]?.[locale] || String(value)).join("–");
}

function functionRouteFor(lesson, locale) {
  const route = (numerals) => {
    const tokens = numerals.trim().split(/\s+/u);
    const selected = tokens.length <= 6
      ? tokens
      : [...tokens.slice(0, 3), "…", ...tokens.slice(-2)];
    return selected.map((token) => {
      if (token === "…") return token;
    const roman = token.replace(/[^ivx]/giu, "").toUpperCase();
      const translated = FUNCTION_WORDS[roman]?.[locale];
      return translated ? `${translated} (${token})` : token;
    }).join("–");
  };
  if (lesson.alternatives) {
    return lesson.alternatives.map((entry, index) => `${String.fromCharCode(65 + index)} ${route(entry.numerals)}`).join(" / ");
  }
  return route(lesson.numerals);
}

function compareBrief(value, locale) {
  const intervalMatch = value.match(/intervals:\s*([^|]+)/u);
  if (intervalMatch) {
    const values = [...intervalMatch[1].matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => Number(match[0]));
    return values.map((number) => INTERVAL_WORDS[number]?.[locale] || `${NUMBER_WORDS[number]?.[locale] || number} semitones`).join("–");
  }
  const degreeMatch = value.match(/degrees:\s*([^|]+)/u);
  const scaleMatch = value.match(/scale:\s*([^|]+)/u);
  const degrees = degreeMatch
    ? [...degreeMatch[1].matchAll(/\d+/gu)].map((match) => Number(match[0]))
    : [];
  const scaleName = scaleMatch?.[1].trim();
  const localizedScale = scaleName ? (SCALE_NAMES[scaleName] || same(scaleName))[locale] : "";
  const degreeWords = wordSequence(degrees, locale);
  return [localizedScale, degreeWords].filter(Boolean).join(" ");
}

function eventMapFor(lesson, locale) {
  return lesson.pattern.trim().split(/\s+/u).map((token) => token.startsWith("x")
    ? l("attack", "ataque", "ataque", "Anschlag", "アタック", "起音")[locale]
    : l("rest", "pausa", "silencio", "Pause", "休符", "休止")[locale]).join("–");
}

function fingerprintFor(lesson, locale) {
  if (lesson.kind === "chord") {
    const root = spokenPitch(lesson.root, locale);
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    return l(
      `${root} as root with ${focus}`, `${root} como fundamental com ${focus}`, `${root} como fundamental con ${focus}`,
      `Grundton ${root} mit Klangmerkmal ${focus}`, `ルート${root}と${focus}`, `根音${root}与${focus}`)[locale];
  }
  if (lesson.kind === "progression") {
    const key = spokenPitch(lesson.key, locale);
    return l(
      `${functionRouteFor(lesson, locale)} with ${key} as tonic`, `${functionRouteFor(lesson, locale)} com ${key} como tônica`,
      `${functionRouteFor(lesson, locale)} con ${key} como tónica`, `${functionRouteFor(lesson, locale)} mit ${key} als Tonika`,
      `${key}をトニックにした${functionRouteFor(lesson, locale)}`, `${key}为主音的${functionRouteFor(lesson, locale)}`)[locale];
  }
  if (lesson.kind === "notes") return compactVoicingMap(lesson, locale);
  if (lesson.kind === "compare") {
    return `A ${compareBrief(lesson.a, locale)} / B ${compareBrief(lesson.b, locale)}`;
  }
  return eventMapFor(lesson, locale);
}

function distinctionFor(lesson, locale) {
  if (lesson.kind === "chord") {
    const root = spokenPitch(lesson.root, locale);
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    return l(
      `Fixed-do cue: root ${root}; quality marker ${focus}.`,
      `Pista em dó fixo: fundamental ${root}; marca de qualidade ${focus}.`,
      `Pista de do fijo: fundamental ${root}; marca de cualidad ${focus}.`,
      `Fester Tonbezug: Grundton ${root}; Klangmerkmal ${focus}.`,
      `固定ドの手掛かりはルート${root}、クオリティの目印は${focus}です。`,
      `固定唱名提示：根音${root}，性质标志${focus}。先单独唱准这个决定音，再与根音合唱；若性质仍不清楚，只重建这段音程，不要用更大音量掩盖错误。最后回到${lesson.target[locale]}，说明决定音怎样改变完整和弦的色彩。`)[locale];
  }
  if (lesson.kind === "progression") {
    const key = spokenPitch(lesson.key, locale);
    return l(
      `Functional fingerprint: key syllable ${key}; numeral route ${lesson.numerals}.`,
      `Impressão funcional: sílaba da tonalidade ${key}; rota ${lesson.numerals}.`,
      `Huella funcional: sílaba tonal ${key}; ruta ${lesson.numerals}.`,
      `Funktionsprofil: Tonsilbe ${key}; Stufenweg ${lesson.numerals}.`,
      `機能の指紋はキー唱名${key}、度数経路${lesson.numerals}です。`,
      `功能指纹：调性唱名${key}，级数路线${lesson.numerals}。先唱每次变化的低音，再把级数名称放在转换前一拍；若方向不清楚，只循环最后两个功能。回到${lesson.target[locale]}后，明确说出末和弦是结束、延后还是转向。`)[locale];
  }
  if (lesson.kind === "notes") {
    const map = compactVoicingMap(lesson, locale);
    return l(
      `Written pitch map: ${map}.`,
      `Mapa escrito das notas: ${map}.`,
      `Mapa escrito de notas: ${map}.`,
      `Notierte Tonkarte: ${map}.`,
      `書かれた音の地図は${map}です。`,
      `书面音高图：${map}。先分别弹出每组最低音与最高音，再恢复方括号内的同时起奏；若某个内声被遮住，只减轻该音的触键。回到${lesson.target[locale]}后，指出哪条声部保持、哪条移动，以及它们怎样造成到达感。`)[locale];
  }
  if (lesson.kind === "compare") {
    const a = localizedCompareDescriptor(lesson.a, locale);
    const b = localizedCompareDescriptor(lesson.b, locale);
    return l(
      `Card A reads ${a}; card B reads ${b}.`,
      `O cartão A traz ${a}; o cartão B traz ${b}.`,
      `La tarjeta A indica ${a}; la tarjeta B indica ${b}.`,
      `Karte A lautet ${a}; Karte B lautet ${b}.`,
      `カードAは${a}、カードBは${b}です。`,
      `卡片A为${a}；卡片B为${b}。先把分叉位置唱出或击拍，再以相同音量重播两边；若仍不确定，只保留分叉点与紧接的目标。恢复${lesson.target[locale]}后，不看屏幕判断两次，并用具体音级或音程说明依据。`)[locale];
  }
  const eventMap = lesson.pattern.trim().split(/\s+/u).map((token) => token.startsWith("x")
    ? l("attack", "ataque", "ataque", "Anschlag", "アタック", "起音")[locale]
    : l("rest", "pausa", "silencio", "Pause", "休符", "休止")[locale]).join("–");
  return l(
    `Event map: ${eventMap}.`,
    `Mapa de eventos: ${eventMap}.`,
    `Mapa de eventos: ${eventMap}.`,
    `Ereigniskarte: ${eventMap}.`,
    `イベント地図は${eventMap}です。`,
    `事件图：${eventMap}。先把每个位置说成“击”或“停”，再让手跟随口令；若休止处出现误击，保持计数并完全取消动作。回到${lesson.target[locale]}后连续完成四轮，最后一轮只强调第一拍，并检查末尾没有多余起音。`)[locale];
}

function lowerFirst(value, locale) {
  return value[0].toLocaleLowerCase(locale) + value.slice(1);
}

function capabilityFor(unitDefinition, lesson, locale, variant) {
  const target = lesson.target[locale];
  const fingerprint = fingerprintFor(lesson, locale);
  const stats = materialStats(lesson);
  let detail;
  if (lesson.kind === "chord") {
    const style = STYLE_NAMES[lesson.style][locale];
    detail = l(
      `the adaptive card repeats ${target} ${lesson.repeats} times in ${style} style and exposes ${fingerprint}`,
      `o cartão adaptável repete ${target} ${lesson.repeats} vezes em estilo ${style} e expõe ${fingerprint}`,
      `la tarjeta adaptable repite ${target} ${lesson.repeats} veces con estilo ${style} y expone ${fingerprint}`,
      `die adaptive Karte wiederholt ${target} ${lesson.repeats}-mal im Stil ${style} und legt ${fingerprint} offen`,
      `アダプティブ・カードが${target}を${style}で${lesson.repeats}回鳴らし、${fingerprint}を示します`,
      `自适应卡片以${style}方式把${target}重复${lesson.repeats}次，并呈现${fingerprint}`)[locale];
  } else if (lesson.kind === "progression") {
    detail = lesson.alternatives
      ? l(
        `two adaptive cards separate ${target} into routes lasting ${stats.sideBeats} beats and preserve ${fingerprint}`,
        `dois cartões adaptáveis separam ${target} em rotas de ${stats.sideBeats} tempos e preservam ${fingerprint}`,
        `dos tarjetas adaptables separan ${target} en rutas de ${stats.sideBeats} pulsos y conservan ${fingerprint}`,
        `zwei adaptive Karten trennen ${target} in Wege von ${stats.sideBeats} Schlägen und erhalten ${fingerprint}`,
        `二つのカードが${target}を${stats.sideBeats}拍の経路に分け、${fingerprint}を保ちます`,
        `两张自适应卡片把${target}分成${stats.sideBeats}拍的路线，并保留${fingerprint}`)[locale]
      : l(
        `the adaptive card gives each of ${stats.chordCount} changes ${lesson.beats} beats and preserves ${fingerprint}`,
        `o cartão adaptável dá ${lesson.beats} tempos a cada uma das ${stats.chordCount} trocas e preserva ${fingerprint}`,
        `la tarjeta adaptable da ${lesson.beats} pulsos a cada uno de los ${stats.chordCount} cambios y conserva ${fingerprint}`,
        `die adaptive Karte gibt jedem der ${stats.chordCount} Wechsel ${lesson.beats} Schläge und erhält ${fingerprint}`,
        `アダプティブ・カードが${stats.chordCount}回の変更を各${lesson.beats}拍にし、${fingerprint}を保ちます`,
        `自适应卡片让${stats.chordCount}次变化各占${lesson.beats}拍，并保留${fingerprint}`)[locale];
  } else if (lesson.kind === "notes") {
    const eventNoun = stats.eventCount === 1
      ? l("one fixed voicing", "uma abertura fixa", "una disposición fija", "eine feste Lage", "一つの固定ボイシング", "一个固定和弦排列")[locale]
      : l(`${stats.eventCount} coordinated voicings`, `${stats.eventCount} aberturas coordenadas`, `${stats.eventCount} disposiciones coordinadas`, `${stats.eventCount} koordinierte Lagen`, `${stats.eventCount}個のそろったボイシング`, `${stats.eventCount}个协调和弦排列`)[locale];
    detail = l(
      `the piano card preserves ${eventNoun} for ${stats.totalBeats} beats in the exact map ${fingerprint}`,
      `o cartão de piano preserva ${eventNoun} por ${stats.totalBeats} tempos no mapa exato ${fingerprint}`,
      `la tarjeta de piano conserva ${eventNoun} durante ${stats.totalBeats} pulsos en el mapa exacto ${fingerprint}`,
      `die Klavierkarte bewahrt ${eventNoun} über ${stats.totalBeats} Schläge in der genauen Karte ${fingerprint}`,
      `ピアノ・カードが${eventNoun}を${stats.totalBeats}拍、正確な地図${fingerprint}で保ちます`,
      `钢琴卡片按准确音高图${fingerprint}保留${eventNoun}，共${stats.totalBeats}拍`)[locale];
  } else if (lesson.kind === "compare") {
    detail = l(
      `the adaptive A/B card fixes root ${spokenPitch(lesson.root, locale)}, tempo, and register while testing ${fingerprint}`,
      `o cartão adaptável A/B fixa fundamental ${spokenPitch(lesson.root, locale)}, andamento e registro enquanto testa ${fingerprint}`,
      `la tarjeta adaptable A/B fija fundamental ${spokenPitch(lesson.root, locale)}, tempo y registro mientras prueba ${fingerprint}`,
      `die adaptive A/B-Karte hält Grundton ${spokenPitch(lesson.root, locale)}, Tempo und Register fest und prüft ${fingerprint}`,
      `A/Bカードがルート${spokenPitch(lesson.root, locale)}、テンポ、音域を固定して${fingerprint}を確かめます`,
      `A/B卡片固定根音${spokenPitch(lesson.root, locale)}、速度与音区，并检验${fingerprint}`)[locale];
  } else {
    detail = l(
      `the tap card places ${stats.attacks} attacks and ${stats.rests} rests at ${lesson.tempo} BPM in the event map ${fingerprint}`,
      `o cartão coloca ${stats.attacks} ataques e ${stats.rests} pausas a ${lesson.tempo} BPM no mapa ${fingerprint}`,
      `la tarjeta coloca ${stats.attacks} ataques y ${stats.rests} silencios a ${lesson.tempo} BPM en el mapa ${fingerprint}`,
      `die Klopfkarte setzt ${stats.attacks} Anschläge und ${stats.rests} Pausen bei ${lesson.tempo} BPM in ${fingerprint}`,
      `タップ・カードが${lesson.tempo} BPMで${stats.attacks}回のアタックと${stats.rests}個の休符を${fingerprint}に置きます`,
      `击拍卡片以${lesson.tempo} BPM把${stats.attacks}个起音与${stats.rests}个休止放入${fingerprint}`)[locale];
  }

  const concept = unitDefinition.concepts[locale].replace(/[.!?。！？]$/u, "");
  const capitalizedDetail = `${detail[0].toLocaleUpperCase(locale)}${detail.slice(1)}`;
  if (locale === "en") {
    const forms = [
      `${concept}. ${capitalizedDetail}.`,
      `${capitalizedDetail}. This works because ${lowerFirst(concept, locale)}.`,
      `Use this principle: ${concept}. Then hear how ${detail}.`,
      `${capitalizedDetail}. It directly tests this principle: ${lowerFirst(concept, locale)}.`,
      `${capitalizedDetail}. The result shows why ${lowerFirst(concept, locale)}.`,
    ];
    return forms[variant % forms.length];
  }
  if (locale === "ja" || locale === "zh-Hans") return `${concept}。${capitalizedDetail}。`;
  return `${concept}. ${capitalizedDetail}.`;
}

function actionInstructionFor(unitDefinition, lesson, locale) {
  const target = lesson.target[locale];
  const fingerprint = fingerprintFor(lesson, locale);
  const action = ACTIONS[lesson.action][locale];
  const japaneseActionStems = {
    play: "弾き", build: "組み立て", hear: "聴き分け", compare: "比べ", tap: "叩き",
    follow: "追い", read: "読み", write: "書き", keep: "保ち", resolve: "解決し",
    connect: "つなぎ", arrange: "編曲し", borrow: "借用し",
  };
  return {
    en: `Now ${lowerFirst(action, "en")} ${target}. Use ${fingerprint} as the audible check.`,
    "pt-BR": `Agora ${lowerFirst(action, "pt-BR")} ${target}. Use ${fingerprint} como conferência audível.`,
    es: `Ahora ${lowerFirst(action, "es")} ${target}. Usa ${fingerprint} como comprobación audible.`,
    de: `${action} jetzt ${target}. Nutze ${fingerprint} als hörbare Kontrolle.`,
    ja: `次に${target}を${japaneseActionStems[lesson.action]}ます。聴覚チェックは${fingerprint}です。`,
    "zh-Hans": `现在${action}${target}。用${fingerprint}作听觉核对。`,
  }[locale];
}

function drillFor(lesson, locale, variant) {
  const target = lesson.target[locale];
  const fingerprint = fingerprintFor(lesson, locale);
  const stats = materialStats(lesson);
  const alternate = variant >= 5;
  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    const root = spokenPitch(lesson.root, locale);
    return alternate ? l(
      `Sing ${focus} above ${root}, then play ${target} from bottom to top. Hold ${root} while adding the remaining tones one at a time. If ${focus} disappears, rebuild only that interval before the final three attacks.`,
      `Cante ${focus} sobre ${root} e toque ${target} de baixo para cima. Sustente ${root} ao acrescentar as outras notas. Se ${focus} sumir, reconstrua só esse intervalo antes dos três ataques finais.`,
      `Canta ${focus} sobre ${root} y toca ${target} de abajo arriba. Mantén ${root} mientras añades las demás notas. Si desaparece ${focus}, reconstruye solo ese intervalo antes de los tres ataques finales.`,
      `Singe ${focus} über ${root} und spiele ${target} von unten nach oben. Halte ${root} beim Hinzufügen der übrigen Töne. Verschwindet ${focus}, baue nur dieses Intervall vor den letzten drei Anschlägen neu.`,
      `${root}の上で${focus}を歌い、${target}を低音から弾きます。${root}を保って残りの音を加えます。${focus}が消えたら、その音程だけ直してから最後の3回を鳴らします。`,
      `在${root}上方唱出${focus}，再从低到高弹${target}。保持${root}并逐个加入其余音。若${focus}消失，只重建该音程，再完成最后三次起奏。`)[locale]
      : l(
        `Play ${target} once as a block and once as a slow arpeggio while naming ${root}. Sing ${focus} against the held chord on the third pass. Repair a blurred ${fingerprint} by correcting its first wrong interval, not by striking harder.`,
        `Toque ${target} em bloco e como arpejo lento, dizendo ${root}. Na terceira passagem, cante ${focus} contra o acorde sustentado. Corrija ${fingerprint} ajustando o primeiro intervalo errado, não tocando mais forte.`,
        `Toca ${target} en bloque y como arpegio lento, diciendo ${root}. En la tercera pasada, canta ${focus} contra el acorde sostenido. Corrige ${fingerprint} ajustando el primer intervalo erróneo, no tocando más fuerte.`,
        `Spiele ${target} als Block und langsames Arpeggio und nenne ${root}. Singe im dritten Durchgang ${focus} gegen den gehaltenen Akkord. Repariere ${fingerprint} am ersten falschen Intervall, nicht durch stärkeren Anschlag.`,
        `${root}を言いながら${target}を同時奏と遅いアルペジオで弾きます。3回目は保持したコードに対して${focus}を歌います。${fingerprint}が濁ったら、強くせず最初の誤った音程を直します。`,
        `说出${root}，把${target}用柱式与慢琶音各弹一次。第三遍对着持续和弦唱${focus}。若${fingerprint}混浊，改正第一个错误音程，不要加大力度。`)[locale];
  }
  if (lesson.kind === "progression") {
    return alternate ? l(
      `Speak ${functionRouteFor(lesson, locale)} before playback, then sing the bass entry for every change in ${target}. Keep each chord for exactly ${lesson.beats} beats. If the destination arrives late, loop the final functional pair and restore the full route after two even passes.`,
      `Diga ${functionRouteFor(lesson, locale)} antes de reproduzir e cante o baixo de cada troca em ${target}. Dê exatamente ${lesson.beats} tempos a cada acorde. Se o destino atrasar, repita o último par funcional e restaure a rota após duas passagens regulares.`,
      `Di ${functionRouteFor(lesson, locale)} antes de reproducir y canta el bajo de cada cambio en ${target}. Da exactamente ${lesson.beats} pulsos a cada acorde. Si el destino llega tarde, repite el último par funcional y restaura la ruta tras dos pasadas regulares.`,
      `Sage ${functionRouteFor(lesson, locale)} vor dem Abspielen und singe jeden Basseinsatz in ${target}. Halte jeden Akkord genau ${lesson.beats} Schläge. Kommt das Ziel zu spät, wiederhole das letzte Funktionspaar und stelle nach zwei gleichmäßigen Durchgängen den ganzen Weg her.`,
      `再生前に${functionRouteFor(lesson, locale)}を言い、${target}の各変更で低音を歌います。各コードを正確に${lesson.beats}拍保ちます。到着が遅れたら最後の機能ペアを2回そろえてから全経路へ戻します。`,
      `播放前说出${functionRouteFor(lesson, locale)}，再唱${target}每次变化的低音。每个和弦准确保持${lesson.beats}拍。若目标迟到，循环最后一对功能，两遍稳定后恢复完整路线。`)[locale]
      : l(
        `Count ${lesson.beats} beats through each change of ${target} and say ${functionRouteFor(lesson, locale)} one step ahead. Listen to bass roots on the second pass and the destination on the third. Repair a late ${fingerprint} by looping only the offending pair before replaying the whole card.`,
        `Conte ${lesson.beats} tempos em cada troca de ${target} e diga ${functionRouteFor(lesson, locale)} um passo antes. Ouça as fundamentais na segunda passagem e o destino na terceira. Corrija o atraso em ${fingerprint} repetindo só o par problemático antes do cartão inteiro.`,
        `Cuenta ${lesson.beats} pulsos en cada cambio de ${target} y di ${functionRouteFor(lesson, locale)} un paso antes. Escucha las fundamentales en la segunda pasada y el destino en la tercera. Corrige el retraso de ${fingerprint} repitiendo solo el par problemático antes de la tarjeta completa.`,
        `Zähle in jedem Wechsel von ${target} ${lesson.beats} Schläge und sage ${functionRouteFor(lesson, locale)} einen Schritt voraus. Höre im zweiten Durchgang die Bassgrundtöne und im dritten das Ziel. Repariere ein spätes ${fingerprint} am betroffenen Paar vor der ganzen Karte.`,
        `${target}の各変更を${lesson.beats}拍数え、${functionRouteFor(lesson, locale)}を一つ先に言います。2回目は低音ルート、3回目は到着先を聴きます。${fingerprint}が遅れたら問題の2コードだけ直してから全体を再生します。`,
        `${target}每次变化数${lesson.beats}拍，并提前一步说出${functionRouteFor(lesson, locale)}。第二遍听低音根音，第三遍听目标。若${fingerprint}迟到，只循环出错和弦对，再重播整张卡片。`)[locale];
  }
  if (lesson.kind === "notes") {
    const bass = stats.bass;
    const top = stats.top;
    return alternate ? l(
      `Play the written groups in ${target} as coordinated piano attacks. Sing ${bass} first and ${top} second, then restore the complete map ${fingerprint}. At the first uneven boundary, repeat only those two voicings until bass and top arrive together twice.`,
      `Toque os grupos de ${target} como ataques coordenados ao piano. Cante primeiro ${bass} e depois ${top}, então restaure ${fingerprint}. Na primeira fronteira desigual, repita só as duas aberturas até baixo e topo chegarem juntos duas vezes.`,
      `Toca los grupos de ${target} como ataques coordinados de piano. Canta primero ${bass} y después ${top}, luego restaura ${fingerprint}. En el primer límite desigual, repite solo esas dos disposiciones hasta que bajo y voz superior lleguen juntos dos veces.`,
      `Spiele die Gruppen von ${target} als koordinierte Klavieranschläge. Singe zuerst ${bass}, danach ${top} und stelle dann ${fingerprint} her. Wiederhole an der ersten ungleichen Grenze nur diese zwei Lagen, bis Bass und Oberstimme zweimal gemeinsam ankommen.`,
      `${target}の各グループをそろったピアノ・アタックで弾きます。先に${bass}、次に${top}を歌って${fingerprint}へ戻します。最初にずれた境界の2ボイシングだけを、低音と上声が2回そろうまで反復します。`,
      `把${target}各组弹成协调钢琴起奏。先唱${bass}，再唱${top}，随后恢复${fingerprint}。在第一个不齐边界只重复两个和弦排列，直到低音与顶声部两次同时到达。`)[locale]
      : l(
        `Hear ${bass} without playing, then follow ${top} on a second pass through ${target}. Play every bracketed group together and keep the map ${fingerprint} in its written register. If one attack smears, isolate that boundary and reconnect it before the final complete take.`,
        `Ouça ${bass} sem tocar e depois acompanhe ${top} em ${target}. Toque junto cada grupo entre colchetes e preserve ${fingerprint} no registro escrito. Se um ataque borrar, isole essa fronteira e reconecte-a antes da tomada completa.`,
        `Escucha ${bass} sin tocar y después sigue ${top} en ${target}. Toca junto cada grupo entre corchetes y conserva ${fingerprint} en su registro escrito. Si un ataque se emborrona, aísla ese límite y reconéctalo antes de la toma completa.`,
        `Höre ${bass} ohne mitzuspielen und folge danach ${top} in ${target}. Spiele jede eingeklammerte Gruppe gemeinsam und behalte ${fingerprint} in der notierten Lage. Verschmiert ein Anschlag, isoliere diese Grenze und verbinde sie vor dem letzten ganzen Durchgang neu.`,
        `${bass}を演奏せずに聴き、次に${target}で${top}を追います。角括弧内を同時に鳴らし、${fingerprint}を記譜どおりの音域に保ちます。アタックが濁ったら、その境界だけを直してから最後の全体奏へ戻します。`,
        `先不弹奏聆听${bass}，下一遍在${target}中跟随${top}。同时弹出每组方括号，并把${fingerprint}保持在书面音区。若某次起奏模糊，只分离该边界，接好后再完成最后整遍。`)[locale];
  }
  if (lesson.kind === "compare") {
    const a = compareBrief(lesson.a, locale);
    const b = compareBrief(lesson.b, locale);
    return alternate ? l(
      `Sing A as ${a}, leave one silent beat, then sing B as ${b}. Match volume and register when replaying ${target}. If ${fingerprint} remains unclear, isolate the first divergence and its next destination before two blind trials.`,
      `Cante A como ${a}, deixe um tempo de silêncio e cante B como ${b}. Iguale volume e registro ao repetir ${target}. Se ${fingerprint} ficar incerto, isole a primeira divergência e o destino seguinte antes de duas tentativas sem olhar.`,
      `Canta A como ${a}, deja un pulso de silencio y canta B como ${b}. Iguala volumen y registro al repetir ${target}. Si ${fingerprint} no queda claro, aísla la primera divergencia y su destino antes de dos pruebas sin mirar.`,
      `Singe A als ${a}, lasse einen stillen Schlag und singe B als ${b}. Gleiche bei ${target} Lautstärke und Register an. Bleibt ${fingerprint} unklar, isoliere die erste Abzweigung samt Ziel vor zwei Blindversuchen.`,
      `Aを${a}、1拍空けてBを${b}として歌います。${target}の音量と音域をそろえます。${fingerprint}が不明なら最初の分岐と次の到着だけを直し、画面を見ず2回答えます。`,
      `把A唱成${a}，空一拍后把B唱成${b}。重播${target}时统一音量与音区。若${fingerprint}仍不清楚，只保留第一个分叉及其目标，再做两次盲听。`)[locale]
      : l(
        `Read ${a} for A and ${b} for B before hearing ${target}. Alternate them four times with one silent beat between cards. When ${fingerprint} is uncertain, sing only the changed interval or degree and restore the full pair after two correct blind answers.`,
        `Leia ${a} para A e ${b} para B antes de ouvir ${target}. Alterne quatro vezes com um tempo de silêncio. Se ${fingerprint} estiver incerto, cante só o intervalo ou grau alterado e restaure o par após duas respostas corretas sem olhar.`,
        `Lee ${a} para A y ${b} para B antes de oír ${target}. Alterna cuatro veces con un pulso de silencio. Si ${fingerprint} es incierto, canta solo el intervalo o grado cambiado y recupera el par tras dos respuestas correctas sin mirar.`,
        `Lies ${a} für A und ${b} für B vor ${target}. Wechsle viermal mit einem stillen Schlag dazwischen. Ist ${fingerprint} unsicher, singe nur das veränderte Intervall oder die Stufe und stelle das Paar nach zwei richtigen Blindantworten wieder her.`,
        `${target}を聴く前にAの${a}とBの${b}を読みます。間に1拍置いて4回交互に聴きます。${fingerprint}が不確かなら変化した音程か度数だけを歌い、盲聴で2回答えてから全体へ戻します。`,
        `聆听${target}前先读A的${a}与B的${b}。两者交替四遍，中间留一拍。若${fingerprint}不确定，只唱变化音程或音级，盲听两次正确后再恢复完整对比。`)[locale];
  }
  const eventMap = eventMapFor(lesson, locale);
  return alternate ? l(
    `Speak ${eventMap} before tapping ${target}. Keep the hand moving through every rest and accent only the first slot on the last cycle. If ${fingerprint} gains an extra attack, remove the motion at that rest and repeat four clean cycles.`,
    `Diga ${eventMap} antes de marcar ${target}. Mantenha a mão em movimento nas pausas e acentue só a primeira posição no último ciclo. Se ${fingerprint} ganhar ataque extra, retire o gesto nessa pausa e faça quatro ciclos limpos.`,
    `Di ${eventMap} antes de marcar ${target}. Mantén la mano en movimiento durante los silencios y acentúa solo la primera posición al final. Si ${fingerprint} gana un ataque extra, elimina el gesto en ese silencio y repite cuatro ciclos limpios.`,
    `Sprich ${eventMap} vor ${target}. Halte die Hand durch jede Pause in Bewegung und betone zuletzt nur den ersten Platz. Erhält ${fingerprint} einen Extraschlag, entferne dort die Bewegung und klopfe vier saubere Durchgänge.`,
    `${target}の前に${eventMap}と言います。休符でも手の流れを保ち、最後の周だけ最初を強調します。${fingerprint}に余分なアタックが入ったら、その休符の動きを消して4周そろえます。`,
    `击打${target}前说出${eventMap}。休止时手势仍保持流动，最后一轮只强调第一位置。若${fingerprint}多出起音，就取消该休止动作并完成四轮干净循环。`)[locale]
    : l(
      `Count one bar, then tap ${target} as ${eventMap} at ${lesson.tempo} BPM. Say every attack and rest on the first two cycles, then internalize the count. Repair ${fingerprint} by silencing the first crowded rest before four uninterrupted repetitions.`,
      `Conte um compasso e marque ${target} como ${eventMap} a ${lesson.tempo} BPM. Diga cada ataque e pausa nos dois primeiros ciclos e depois internalize a contagem. Corrija ${fingerprint} silenciando a primeira pausa apertada antes de quatro repetições.`,
      `Cuenta un compás y marca ${target} como ${eventMap} a ${lesson.tempo} BPM. Di cada ataque y silencio en los dos primeros ciclos y luego interioriza la cuenta. Corrige ${fingerprint} silenciando el primer descanso apretado antes de cuatro repeticiones.`,
      `Zähle einen Takt und klopfe ${target} als ${eventMap} bei ${lesson.tempo} BPM. Sprich in den ersten zwei Durchgängen jeden Anschlag und jede Pause, danach innerlich. Repariere ${fingerprint} an der ersten gedrängten Pause vor vier Wiederholungen.`,
      `1小節数え、${target}を${lesson.tempo} BPMで${eventMap}として叩きます。最初の2周は各アタックと休符を言い、その後は内側で数えます。${fingerprint}の詰まった休符を無音にしてから4回続けます。`,
      `先数一小节，再以${lesson.tempo} BPM把${target}击成${eventMap}。前两轮说出每个起音与休止，随后改为内在计数。先让${fingerprint}中第一个拥挤休止真正安静，再连续重复四遍。`)[locale];
}

function lessonCardLabel(lesson, locale, index) {
  const target = lesson.target[locale];
  return l(
    `card ${index + 1} for ${target} at ${lesson.tempo} BPM`,
    `cartão ${index + 1} de ${target} a ${lesson.tempo} BPM`,
    `tarjeta ${index + 1} de ${target} a ${lesson.tempo} BPM`,
    `Karte ${index + 1} für ${target} bei ${lesson.tempo} BPM`,
    `${lesson.tempo} BPMのカード${index + 1}「${target}」`,
    `${lesson.tempo} BPM的${target}第${index + 1}张卡片`)[locale];
}

function supplementSentencesFor(lesson, locale, index) {
  const target = lesson.target[locale];
  const fingerprint = fingerprintFor(lesson, locale);
  const stats = materialStats(lesson);
  const card = lessonCardLabel(lesson, locale, index);
  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    const root = spokenPitch(lesson.root, locale);
    return [
      l(`On ${card}, write the tones upward from ${root} and circle ${focus}.`, `No ${card}, escreva as notas desde ${root} e circule ${focus}.`, `En la ${card}, escribe las notas desde ${root} y rodea ${focus}.`, `Notiere auf ${card} die Töne ab ${root} und markiere ${focus}.`, `${card}で${root}から構成音を書き、${focus}を囲みます。`, `在${card}上从${root}向上写出和弦音，并圈出${focus}。`)[locale],
      l(`Compare attack one with attack ${lesson.repeats} in ${target}; ${fingerprint} should keep the same color.`, `Compare o primeiro ataque ao ataque ${lesson.repeats} de ${target}; ${fingerprint} deve manter a mesma cor.`, `Compara el primer ataque con el ${lesson.repeats} de ${target}; ${fingerprint} debe conservar el mismo color.`, `Vergleiche in ${target} Anschlag eins mit Anschlag ${lesson.repeats}; ${fingerprint} soll gleich klingen.`, `${target}の1回目と${lesson.repeats}回目を比べ、${fingerprint}の色を保ちます。`, `比较${target}的第一次与第${lesson.repeats}次起奏；${fingerprint}的色彩应保持一致。`)[locale],
      l(`Move ${target} one octave only after ${focus} stays audible against ${root}.`, `Mude ${target} de oitava só quando ${focus} continuar audível contra ${root}.`, `Mueve ${target} una octava solo cuando ${focus} siga audible contra ${root}.`, `Versetze ${target} erst dann um eine Oktave, wenn ${focus} gegen ${root} hörbar bleibt.`, `${focus}が${root}に対して聞こえるときだけ、${target}を1オクターブ移します。`, `只有${focus}在${root}上方仍清楚可听时，才把${target}移高一个八度。`)[locale],
      l(`Keep the cleanest take from ${card}; reject any version that hides ${focus}.`, `Guarde a melhor tomada do ${card}; descarte a versão que esconder ${focus}.`, `Conserva la mejor toma de la ${card}; descarta cualquier versión que oculte ${focus}.`, `Behalte den saubersten Durchgang von ${card}; verwirf jede Fassung, die ${focus} verdeckt.`, `${card}の最も明瞭なテイクを残し、${focus}が隠れたものは外します。`, `保留${card}中最清楚的一遍；若${focus}被遮住，就舍弃该版本。`)[locale],
    ];
  }
  if (lesson.kind === "progression") {
    const route = functionRouteFor(lesson, locale);
    const rawRoute = lesson.alternatives
      ? lesson.alternatives.map((entry) => entry.numerals).join(" / ")
      : lesson.numerals;
    const beats = lesson.alternatives ? stats.sideBeats : stats.totalBeats;
    return [
      l(`Write ${rawRoute} above ${card}, then point to each numeral before it sounds.`, `Escreva ${rawRoute} sobre o ${card} e aponte cada grau antes que soe.`, `Escribe ${rawRoute} sobre la ${card} y señala cada grado antes de que suene.`, `Schreibe ${rawRoute} über ${card} und zeige vor dem Klang auf jede Stufe.`, `${card}の上に${rawRoute}を書き、鳴る前に各度数を指します。`, `在${card}上方写出${rawRoute}，每个级数响起前用手指向它。`)[locale],
      l(`The route lasts ${beats} beats; in ${target}, check equal chord lengths before judging the ending.`, `A rota dura ${beats} tempos; em ${target}, confira durações iguais antes de julgar o final.`, `La ruta dura ${beats} pulsos; en ${target}, comprueba duraciones iguales antes de juzgar el final.`, `Der Weg dauert ${beats} Schläge; prüfe in ${target} gleiche Akkordlängen vor dem Schluss.`, `経路は${beats}拍です。${target}で各コードの長さをそろえてから終止を判断します。`, `路线共${beats}拍。在${target}中先核对和弦时值等长，再判断结尾。`)[locale],
      l(`Circle the last pair in ${route}; replay only that turn if ${fingerprint} loses its destination.`, `Circule o último par em ${route}; repita só essa virada se ${fingerprint} perder o destino.`, `Rodea el último par de ${route}; repite solo ese giro si ${fingerprint} pierde su destino.`, `Markiere das letzte Paar in ${route}; wiederhole nur diese Wendung, falls ${fingerprint} ihr Ziel verliert.`, `${route}の最後のペアを囲み、${fingerprint}の到着が曖昧ならそこだけ再生します。`, `圈出${route}的最后一对；若${fingerprint}失去目标感，只重播这个转折。`)[locale],
      l(`Finish ${card} by naming whether its final function closes, delays, or redirects the phrase.`, `Finalize o ${card} dizendo se a função final fecha, adia ou redireciona a frase.`, `Termina la ${card} diciendo si la función final cierra, retrasa o redirige la frase.`, `Beende ${card} mit der Aussage, ob die Schlussfunktion die Phrase schließt, verzögert oder umlenkt.`, `${card}の最後に、末機能が楽句を閉じる、延ばす、転じるのどれかを言います。`, `完成${card}时，说明末功能是结束、延后还是转向乐句。`)[locale],
    ];
  }
  if (lesson.kind === "notes") {
    return [
      l(`Mark ${stats.eventCount} attacks across ${stats.totalBeats} beats on ${card}; every bracket is simultaneous.`, `Marque ${stats.eventCount} ataques em ${stats.totalBeats} tempos no ${card}; cada colchete é simultâneo.`, `Marca ${stats.eventCount} ataques en ${stats.totalBeats} pulsos en la ${card}; cada corchete es simultáneo.`, `Markiere auf ${card} ${stats.eventCount} Einsätze in ${stats.totalBeats} Schlägen; jede Klammer beginnt gemeinsam.`, `${card}で${stats.totalBeats}拍に${stats.eventCount}回のアタックを記し、各角括弧を同時に鳴らします。`, `在${card}上标出${stats.totalBeats}拍内的${stats.eventCount}次起奏；每组方括号都必须同时发声。`)[locale],
      l(`Sing the bass path ${stats.bass}, then the top path ${stats.top}, before restoring ${target}.`, `Cante o baixo ${stats.bass} e depois o topo ${stats.top} antes de restaurar ${target}.`, `Canta el bajo ${stats.bass} y luego la voz superior ${stats.top} antes de restaurar ${target}.`, `Singe den Bassweg ${stats.bass}, danach den Oberstimmenweg ${stats.top}, bevor ${target} wieder vollständig klingt.`, `低音${stats.bass}、上声${stats.top}の順に歌い、その後${target}を全体で鳴らします。`, `先唱低音路线${stats.bass}，再唱顶声部${stats.top}，随后恢复${target}的完整织体。`)[locale],
      l(`Copy ${fingerprint} once; underline the first pitch that moves at each boundary of ${target}.`, `Copie ${fingerprint} uma vez; sublinhe a primeira nota que se move em cada fronteira de ${target}.`, `Copia ${fingerprint} una vez; subraya la primera nota que se mueve en cada límite de ${target}.`, `Schreibe ${fingerprint} einmal ab; unterstreiche an jeder Grenze von ${target} den ersten bewegten Ton.`, `${fingerprint}を1度写し、${target}の各境界で最初に動く音に下線を引きます。`, `把${fingerprint}抄写一遍；在${target}每个边界下画出第一个移动的音。`)[locale],
      l(`Keep only a take of ${card} where bass and top arrive together at every change.`, `Guarde apenas uma tomada do ${card} em que baixo e topo cheguem juntos a cada troca.`, `Conserva solo una toma de la ${card} donde bajo y voz superior lleguen juntos en cada cambio.`, `Behalte von ${card} nur einen Durchgang, in dem Bass und Oberstimme bei jedem Wechsel gemeinsam ankommen.`, `${card}で低音と上声がすべての変化点に同時に着いたテイクだけ残します。`, `只保留${card}中低音与顶声部在每次变化时同时到达的一遍。`)[locale],
    ];
  }
  if (lesson.kind === "compare") {
    const a = compareBrief(lesson.a, locale);
    const b = compareBrief(lesson.b, locale);
    return [
      l(`Write A as ${a} and B as ${b} above ${card}.`, `Escreva A como ${a} e B como ${b} sobre o ${card}.`, `Escribe A como ${a} y B como ${b} sobre la ${card}.`, `Notiere A als ${a} und B als ${b} über ${card}.`, `${card}の上にAを${a}、Bを${b}と書きます。`, `在${card}上方把A写成${a}，B写成${b}。`)[locale],
      l(`Circle the first divergence in ${target}; sing that one interval before replaying both cards.`, `Circule a primeira divergência em ${target}; cante esse intervalo antes de repetir os dois cartões.`, `Rodea la primera divergencia de ${target}; canta ese intervalo antes de repetir ambas tarjetas.`, `Markiere die erste Abzweigung in ${target}; singe dieses Intervall vor beiden Karten.`, `${target}で最初に分かれる位置を囲み、両カードの前にその音程を歌います。`, `圈出${target}第一个分叉；重播两张卡片前只唱该音程。`)[locale],
      l(`At ${lesson.tempo} BPM, label four takes of ${target} only after listening; keep timing and touch matched.`, `A ${lesson.tempo} BPM, rotule quatro tomadas de ${target} só depois de ouvir; iguale duração e ataque.`, `A ${lesson.tempo} BPM, etiqueta cuatro tomas de ${target} solo después de oír; iguala tiempo y ataque.`, `Beschrifte vier Durchgänge von ${target} bei ${lesson.tempo} BPM erst nach dem Hören; halte Timing und Anschlag gleich.`, `${lesson.tempo} BPMで${target}を4回録音し、聴いた後だけA/Bを記します。長さとタッチはそろえます。`, `以${lesson.tempo} BPM录下${target}四遍，听完后才标A/B；时值与触键要一致。`)[locale],
      l(`Accept ${fingerprint} only after two correct blind answers on ${card}.`, `Aceite ${fingerprint} só depois de duas respostas corretas sem olhar no ${card}.`, `Acepta ${fingerprint} solo tras dos respuestas correctas sin mirar en la ${card}.`, `Akzeptiere ${fingerprint} auf ${card} erst nach zwei richtigen Blindantworten.`, `${card}で画面を見ず2回正解した後だけ${fingerprint}を習得済みとします。`, `只有在${card}上盲听连续答对两次，才算掌握${fingerprint}。`)[locale],
    ];
  }
  const eventMap = eventMapFor(lesson, locale);
  return [
    l(`Draw ${stats.slots} boxes for ${card}; fill ${stats.attacks} attacks and leave ${stats.rests} rests open.`, `Desenhe ${stats.slots} caixas para o ${card}; preencha ${stats.attacks} ataques e deixe ${stats.rests} pausas vazias.`, `Dibuja ${stats.slots} casillas para la ${card}; llena ${stats.attacks} ataques y deja ${stats.rests} silencios vacíos.`, `Zeichne ${stats.slots} Kästchen für ${card}; fülle ${stats.attacks} Anschläge und lasse ${stats.rests} Pausen offen.`, `${card}用に${stats.slots}個の箱を書き、${stats.attacks}回のアタックを入れ、${stats.rests}個の休符を空けます。`, `为${card}画${stats.slots}个方格；填入${stats.attacks}个起音，留出${stats.rests}个休止。`)[locale],
    l(`Say ${eventMap} once before tapping ${target}; keep the hand moving silently through each rest.`, `Diga ${eventMap} antes de marcar ${target}; mantenha a mão em movimento silencioso nas pausas.`, `Di ${eventMap} antes de marcar ${target}; mantén la mano en movimiento silencioso durante los descansos.`, `Sprich ${eventMap} vor ${target}; führe die Hand in jeder Pause lautlos weiter.`, `${target}を叩く前に${eventMap}と言い、休符中も手だけ無音で動かします。`, `击打${target}前先说${eventMap}；每个休止中手势仍无声移动。`)[locale],
    l(`Record four cycles of ${target} at ${lesson.tempo} BPM and inspect the first silent slot.`, `Grave quatro ciclos de ${target} a ${lesson.tempo} BPM e confira a primeira posição silenciosa.`, `Graba cuatro ciclos de ${target} a ${lesson.tempo} BPM y revisa la primera posición silenciosa.`, `Nimm vier Durchgänge von ${target} bei ${lesson.tempo} BPM auf und prüfe den ersten stillen Platz.`, `${target}を${lesson.tempo} BPMで4周録音し、最初の無音位置を確認します。`, `以${lesson.tempo} BPM录下${target}四轮，并检查第一个安静位置。`)[locale],
    l(`Keep ${card} only when its final attack lands without pulling ${fingerprint} forward.`, `Guarde o ${card} apenas se o ataque final não adiantar ${fingerprint}.`, `Conserva la ${card} solo si el ataque final no adelanta ${fingerprint}.`, `Behalte ${card} nur, wenn der Schlussanschlag ${fingerprint} nicht vorzieht.`, `${card}の最後のアタックが${fingerprint}を前に引かないテイクだけ残します。`, `只保留${card}中末起音没有把${fingerprint}向前拖的一遍。`)[locale],
  ];
}

function countPhrase(count, locale, singular, plural) {
  return `${count} ${count === 1 ? singular[locale] : plural[locale]}`;
}

const BEAT_NOUN = l("beat", "tempo", "pulso", "Schlag", "拍", "拍");
const BEATS_NOUN = l("beats", "tempos", "pulsos", "Schläge", "拍", "拍");
const CHANGE_NOUN = l("change", "troca", "cambio", "Wechsel", "回の変化", "次变化");
const CHANGES_NOUN = l("changes", "trocas", "cambios", "Wechsel", "回の変化", "次变化");
const VOICING_NOUN = l("voicing", "abertura", "disposición", "Lage", "ボイシング", "和弦排列");
const VOICINGS_NOUN = l("voicings", "aberturas", "disposiciones", "Lagen", "ボイシング", "和弦排列");

function directSummaryFor(lesson, locale) {
  const target = lesson.target[locale];
  const fingerprint = fingerprintFor(lesson, locale);
  const stats = materialStats(lesson);
  if (lesson.kind === "chord") {
    const root = spokenPitch(lesson.root, locale);
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    return l(
      `${target} places ${focus} above root ${root}; that interval establishes the chord color.`,
      `${target} coloca ${focus} sobre a fundamental ${root}; esse intervalo estabelece a cor do acorde.`,
      `${target} coloca ${focus} sobre la fundamental ${root}; ese intervalo establece el color del acorde.`,
      `${target} setzt ${focus} über den Grundton ${root}; dieses Intervall bestimmt die Akkordfarbe.`,
      `${target}ではルート${root}の上に${focus}を置き、その音程がコードの色を決めます。`,
      `${target}把${focus}放在根音${root}上方；这个音程决定和弦色彩。`)[locale];
  }
  if (lesson.kind === "progression") {
    const key = spokenPitch(lesson.key, locale);
    const route = functionRouteFor(lesson, locale);
    return l(
      `${target} sets ${key} as tonic for the functional route ${route}.`,
      `${target} põe ${key} como tônica da rota funcional ${route}.`,
      `${target} pone ${key} como tónica de la ruta funcional ${route}.`,
      `${target} setzt ${key} als Tonika für den Funktionsweg ${route}.`,
      `${target}では${key}をトニックにして、機能経路${route}を作ります。`,
      `${target}把${key}设为主音，并形成明确的功能路线${route}。`)[locale];
  }
  if (lesson.kind === "notes") {
    return l(
      `${target} uses the written piano path ${fingerprint}.`, `${target} usa o caminho escrito ao piano ${fingerprint}.`,
      `${target} usa el recorrido escrito de piano ${fingerprint}.`, `${target} nutzt den notierten Klavierweg ${fingerprint}.`,
      `${target}の記譜されたピアノ経路は${fingerprint}です。`, `${target}使用写出的钢琴路线${fingerprint}。`)[locale];
  }
  if (lesson.kind === "compare") {
    const a = compareBrief(lesson.a, locale);
    const b = compareBrief(lesson.b, locale);
    return l(
      `${target} contrasts A, ${a}, with B, ${b}.`, `${target} contrapõe A, ${a}, a B, ${b}.`,
      `${target} contrapone A, ${a}, a B, ${b}.`, `${target} stellt A, ${a}, B, ${b}, gegenüber.`,
      `${target}ではAの${a}とBの${b}を対比します。`, `${target}对比A的${a}与B的${b}。`)[locale];
  }
  return l(
    `${target} distributes ${stats.attacks} attacks and ${stats.rests} rests in the order ${fingerprint}.`,
    `${target} distribui ${stats.attacks} ataques e ${stats.rests} pausas na ordem ${fingerprint}.`,
    `${target} distribuye ${stats.attacks} ataques y ${stats.rests} silencios en el orden ${fingerprint}.`,
    `${target} verteilt ${stats.attacks} Anschläge und ${stats.rests} Pausen in der Folge ${fingerprint}.`,
    `${target}は${stats.attacks}回のアタックと${stats.rests}個の休符を${fingerprint}の順に配置します。`,
    `${target}按${fingerprint}的顺序分配${stats.attacks}个起音与${stats.rests}个休止。`)[locale];
}

function directFactFor(unitDefinition, lesson, locale, index) {
  const concept = lowerFirst(unitDefinition.concepts[locale].replace(/[.!?。！？]$/u, ""), locale);
  const stats = materialStats(lesson);
  if (lesson.kind === "chord") {
    const root = spokenPitch(lesson.root, locale);
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    return l(
      `The pairing of ${root} and ${focus} matters because ${concept}.`, `A relação entre ${root} e ${focus} importa porque ${concept}.`,
      `La relación entre ${root} y ${focus} importa porque ${concept}.`, `Die Verbindung von ${root} und ${focus} ist wichtig, denn ${concept}.`,
      `${root}と${focus}の関係が重要なのは、${unitDefinition.concepts.ja.replace(/[。！？]$/u, "")}からです。`, `${root}与${focus}的关系很重要，因为${concept}。`)[locale];
  }
  if (lesson.kind === "progression") {
    const route = functionRouteFor(lesson, locale);
    return l(
      `The route ${route} makes that direction audible because ${concept}.`, `A rota ${route} torna essa direção audível porque ${concept}.`,
      `La ruta ${route} vuelve audible esa dirección porque ${concept}.`, `Der Weg ${route} macht diese Richtung hörbar, denn ${concept}.`,
      `${route}の経路で方向が聞こえるのは、${unitDefinition.concepts.ja.replace(/[。！？]$/u, "")}からです。`, `${route}让这个方向可听，因为${concept}。`)[locale];
  }
  if (lesson.kind === "notes") {
    const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
    return l(
      `The bass path ${stats.bass} against the top path ${stats.top} makes ${cue} audible before the full voicings return.`,
      `O baixo ${stats.bass} contra o topo ${stats.top} torna ${cue} audível antes da volta das aberturas completas.`,
      `El bajo ${stats.bass} frente a la voz superior ${stats.top} vuelve audible ${cue} antes de recuperar las disposiciones completas.`,
      `Der Bassweg ${stats.bass} gegen den Oberstimmenweg ${stats.top} macht ${cue} vor der Rückkehr aller Lagen hörbar.`,
      `低音${stats.bass}と上声${stats.top}を対比すると、全ボイシングへ戻る前に${cue}が聞こえます。`,
      `把低音路线${stats.bass}与顶声部${stats.top}对照，就能在恢复完整和弦排列前听清${cue}。`)[locale];
  }
  if (lesson.kind === "compare") {
    const root = spokenPitch(lesson.root, locale);
    const focus = comparisonFocus(lesson, locale);
    return l(
      `Holding root ${root} steady exposes ${focus}; that controlled difference is the comparison's evidence.`,
      `Manter a fundamental ${root} fixa expõe ${focus}; essa diferença controlada é a prova da comparação.`,
      `Mantener fija la fundamental ${root} revela ${focus}; esa diferencia controlada es la prueba de la comparación.`,
      `Der feste Grundton ${root} legt ${focus} frei; dieser kontrollierte Unterschied ist der Beleg des Vergleichs.`,
      `ルート${root}を固定すると${focus}が明らかになり、その制御された差が比較の根拠になります。`,
      `固定根音${root}会显出${focus}；这个受控差异就是判断两边的依据。`)[locale];
  }
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const eventMap = eventMapFor(lesson, locale);
  return l(
    `The order ${eventMap} turns ${cue} into a physical distinction between ${stats.attacks} attacks and ${stats.rests} rests.`,
    `A ordem ${eventMap} transforma ${cue} numa distinção física entre ${stats.attacks} ataques e ${stats.rests} pausas.`,
    `El orden ${eventMap} convierte ${cue} en una distinción física entre ${stats.attacks} ataques y ${stats.rests} silencios.`,
    `Die Folge ${eventMap} macht ${cue} als körperlichen Unterschied zwischen ${stats.attacks} Anschlägen und ${stats.rests} Pausen greifbar.`,
    `${eventMap}の順序にすると、${cue}を${stats.attacks}回のアタックと${stats.rests}個の休符の身体的な差として捉えられます。`,
    `${eventMap}的顺序把${cue}变成身体可感的差异：${stats.attacks}个起音必须与${stats.rests}个休止清楚分开。`)[locale];
}

function directMechanicsFor(unitDefinition, lesson, locale, index) {
  const stats = materialStats(lesson);
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const lens = PRACTICE_LENSES[index][locale];
  if (lesson.kind === "chord") {
    const style = STYLE_NAMES[lesson.style][locale];
    return l(
      `The ${lens} tests ${cue} with ${lesson.repeats} ${style} attacks at ${lesson.tempo} BPM; register and dynamics stay fixed.`,
      `A ${lens} testa ${cue} com ${lesson.repeats} ataques em ${style} a ${lesson.tempo} BPM; registro e dinâmica ficam fixos.`,
      `La ${lens} comprueba ${cue} con ${lesson.repeats} ataques en ${style} a ${lesson.tempo} BPM; registro y dinámica quedan fijos.`,
      `Der ${lens} prüft ${cue} mit ${lesson.repeats} Anschlägen als ${style} bei ${lesson.tempo} BPM; Lage und Dynamik bleiben gleich.`,
      `${lens}では${cue}を確かめるため、${lesson.tempo} BPMの${style}を${lesson.repeats}回行い、音域と強弱を固定します。`,
      `${lens}用${lesson.tempo} BPM的${lesson.repeats}次${style}起奏检查${cue}；音区、力度与触键始终固定。`)[locale];
  }
  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      return l(
        `The ${lens} tests ${cue} on two separate routes of ${stats.sideCounts} chords and ${stats.sideBeats} beats, never as one long chain.`,
        `A ${lens} testa ${cue} em duas rotas separadas de ${stats.sideCounts} acordes e ${stats.sideBeats} tempos, nunca como uma só cadeia.`,
        `La ${lens} comprueba ${cue} en dos rutas separadas de ${stats.sideCounts} acordes y ${stats.sideBeats} pulsos, nunca como una sola cadena.`,
        `Der ${lens} prüft ${cue} an zwei getrennten Wegen mit ${stats.sideCounts} Akkorden und ${stats.sideBeats} Schlägen, nie als eine lange Kette.`,
        `${lens}では${cue}を確かめるため、${stats.sideCounts}個のコードと${stats.sideBeats}拍の二経路を、長い一本の進行にせず別々に扱います。`,
        `${lens}用两条各含${stats.sideCounts}个和弦、长${stats.sideBeats}拍的独立路线检查${cue}；不要把它们接成长链。`)[locale];
    }
    const changes = countPhrase(stats.chordCount, locale, CHANGE_NOUN, CHANGES_NOUN);
    const beatsEach = countPhrase(lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
    const total = countPhrase(stats.totalBeats, locale, BEAT_NOUN, BEATS_NOUN);
    return l(
      `For ${cue}, the ${lens} uses ${changes}, gives each chord ${beatsEach}, and lasts ${total}.`,
      `Para ${cue}, a ${lens} usa ${changes}, dá ${beatsEach} a cada acorde e dura ${total}.`,
      `Para ${cue}, la ${lens} usa ${changes}, da ${beatsEach} a cada acorde y dura ${total}.`,
      `Für ${cue} enthält der ${lens} ${changes}, gibt jedem Akkord ${beatsEach} und dauert ${total}.`,
      `${cue}を扱う${lens}には${changes}があり、各コードは${beatsEach}、全体は${total}です。`,
      `${lens}用${changes}检查${cue}；每个和弦占${beatsEach}，完整路线共${total}。`)[locale];
  }
  if (lesson.kind === "notes") {
    const voicings = countPhrase(stats.eventCount, locale, VOICING_NOUN, VOICINGS_NOUN);
    const beats = countPhrase(stats.totalBeats, locale, BEAT_NOUN, BEATS_NOUN);
    return l(
      `The ${lens} tests ${cue} in ${voicings} across ${beats}; every bracketed piano group begins together in its written register.`,
      `A ${lens} testa ${cue} em ${voicings} ao longo de ${beats}; cada grupo do piano começa junto no registro escrito.`,
      `La ${lens} comprueba ${cue} en ${voicings} durante ${beats}; cada grupo de piano empieza unido en el registro escrito.`,
      `Der ${lens} prüft ${cue} in ${voicings} über ${beats}; jede Klaviergruppe beginnt gemeinsam in der notierten Lage.`,
      `${lens}では${beats}にわたる${voicings}で${cue}を確かめ、各ピアノの角括弧グループを記譜音域で同時に始めます。`,
      `${lens}在${beats}内用${voicings}检查${cue}；每组钢琴方括号都在写出的音区同时开始，并保持原位。`)[locale];
  }
  if (lesson.kind === "compare") {
    const root = spokenPitch(lesson.root, locale);
    return l(
      `The ${lens} tests ${cue}: both sides keep root ${root}, ${lesson.tempo} BPM, register, and touch fixed while the written contrast changes.`,
      `A ${lens} testa ${cue}: os dois lados mantêm fundamental ${root}, ${lesson.tempo} BPM, registro e ataque enquanto o contraste escrito muda.`,
      `La ${lens} comprueba ${cue}: ambos lados mantienen fundamental ${root}, ${lesson.tempo} BPM, registro y ataque mientras cambia el contraste escrito.`,
      `Der ${lens} prüft ${cue}: Beide Seiten halten Grundton ${root}, ${lesson.tempo} BPM, Lage und Anschlag fest, während der notierte Kontrast wechselt.`,
      `${lens}では${cue}を確かめるため、両側のルート${root}、${lesson.tempo} BPM、音域、タッチを固定し、記譜上の差だけを変えます。`,
      `${lens}检查${cue}：两边都固定根音${root}、${lesson.tempo} BPM、音区、力度与触键，只让写出的对比发生变化。`)[locale];
  }
  const slots = countPhrase(stats.slots, locale, l("slot", "posição", "posición", "Platz", "位置", "位置"), l("slots", "posições", "posiciones", "Plätze", "位置", "位置"));
  return l(
    `For ${cue}, the ${lens} spans ${slots} at ${lesson.tempo} BPM; counting motion continues while every written rest stays silent.`,
    `Para ${cue}, a ${lens} ocupa ${slots} a ${lesson.tempo} BPM; o gesto da contagem continua enquanto cada pausa escrita fica muda.`,
    `Para ${cue}, la ${lens} ocupa ${slots} a ${lesson.tempo} BPM; el gesto de contar continúa mientras cada silencio escrito queda mudo.`,
    `Für ${cue} umfasst der ${lens} ${slots} bei ${lesson.tempo} BPM; die Zählbewegung läuft weiter, während jede notierte Pause still bleibt.`,
    `${cue}を扱う${lens}は${lesson.tempo} BPMで${slots}です。書かれた休符を無音に保ち、数える動作は止めません。`,
    `${lens}以${lesson.tempo} BPM跨越${slots}来检查${cue}；每个写出的休止都保持安静，计数动作则连续不断。`)[locale];
}

const UNIT_PRACTICE_CUES = {
  "triads-in-practice": l("triad spelling", "formação da tríade", "formación de la tríada", "Dreiklangsaufbau", "トライアドの構成音", "三和弦构成"),
  "inversions-without-mystery": l("inversion bass", "baixo da inversão", "bajo de la inversión", "Umkehrungsbass", "転回形の低音", "转位低音"),
  "reading-chord-symbols": l("symbol spelling", "leitura da cifra", "lectura del cifrado", "Symboldeutung", "コード記号の読み", "和弦符号解读"),
  "clean-chord-changes": l("gapless change", "troca sem lacuna", "cambio sin hueco", "lückenloser Wechsel", "切れ目のない変化", "无空隙转换"),
  "home-away-back": l("tonic pull", "atração da tônica", "atracción de la tónica", "Tonikazug", "トニックへの引力", "主和弦引力"),
  "numbers-travel": l("movable numerals", "graus móveis", "grados móviles", "bewegliche Stufen", "移動できる度数", "可移调级数"),
  "chord-rhythm": l("chord-entry rhythm", "ritmo da entrada", "ritmo de entrada", "Akkordeinsatz", "コードの入りのリズム", "和弦进入节奏"),
  "hearing-chord-quality": l("quality marker", "marca de qualidade", "marca de cualidad", "Klangmerkmal", "クオリティの目印", "和弦性质标志"),
  "first-seventh-chords": l("seventh color", "cor da sétima", "color de la séptima", "Septimenfarbe", "7度の色", "七音色彩"),
  "accompaniment-basics": l("accompaniment texture", "textura de acompanhamento", "textura de acompañamiento", "Begleittextur", "伴奏テクスチャ", "伴奏织体"),
  "function-by-ear": l("tonic–predominant–dominant function", "função tônica–predominante–dominante", "función tónica–predominante–dominante", "Tonika–Vorhalt–Dominante", "トニック–プレドミナント–ドミナント機能", "主–下属准备–属功能"),
  "diatonic-sevenths": l("diatonic seventh family", "família de sétimas diatônicas", "familia de séptimas diatónicas", "diatonische Septakkordfamilie", "音階内の七和音系列", "自然音级七和弦系列"),
  "minor-progressions": l("minor leading tone", "sensível menor", "sensible menor", "Moll-Leitton", "マイナーの導音", "小调导音"),
  "voice-leading-basics": l("economical voice motion", "movimento econômico das vozes", "movimiento económico de voces", "sparsame Stimmbewegung", "声部の無駄のない動き", "精简声部移动"),
  "inversions-in-motion": l("singable inversion bass", "baixo cantável da inversão", "bajo cantable de la inversión", "singbarer Umkehrungsbass", "歌える転回形の低音", "可歌转位低音"),
  "cadences-and-phrases": l("cadence placement", "posição da cadência", "colocación de la cadencia", "Kadenzplatzierung", "カデンツの位置", "终止位置"),
  "progression-grammar": l("progression syntax", "sintaxe da progressão", "sintaxis de la progresión", "Fortschreitungssyntax", "コード進行の構文", "和弦进行句法"),
  "sevenths-in-motion": l("guide-tone resolution", "resolução das notas-guia", "resolución de notas guía", "Leittonauflösung", "ガイドトーンの解決", "导向音解决"),
  "sixths-and-ninths": l("sixth-and-ninth spacing", "espaçamento das notas de cor", "espacio de las notas de color", "Sexten- und Nonenlage", "6度と9度の配置", "六音与九音间距"),
  "hear-write-arrange": l("transcription evidence", "evidência da transcrição", "evidencia de transcripción", "Transkriptionsbeleg", "採譜の根拠", "听写依据"),
  "tensions-and-extensions": l("extension hierarchy", "hierarquia das extensões", "jerarquía de extensiones", "Erweiterungshierarchie", "テンションの優先順位", "延伸音层级"),
  "applied-dominants": l("temporary tonic pull", "atração da tônica temporária", "atracción de la tónica temporal", "Zug zur Zwischentonika", "一時的なトニックへの引力", "临时主和弦引力"),
  "borrowed-harmony": l("borrowed scale degree", "grau emprestado", "grado prestado", "entlehnte Stufe", "借用した度数", "借用音级"),
  "diminished-augmented-motion": l("altered-chord symmetry", "simetria do acorde alterado", "simetría del acorde alterado", "Symmetrie alterierter Akkorde", "変化和音の対称性", "变化和弦对称性"),
  "modal-harmony": l("modal characteristic tone", "nota característica modal", "nota característica modal", "modaler Charakterton", "モードの特徴音", "调式特征音"),
  modulation: l("new-tonic proof", "confirmação da nova tônica", "confirmación de la nueva tónica", "Bestätigung der neuen Tonika", "新しいトニックの根拠", "新主音证据"),
  "jazz-cadences": l("jazz shell motion", "movimento das aberturas shell", "movimiento de disposiciones shell", "Jazz-Shell-Bewegung", "ジャズ・シェルの動き", "爵士壳式移动"),
  "harmonic-sequences": l("sequence cell", "célula da sequência", "célula de la secuencia", "Sequenzzelle", "シークエンス・セル", "模进单元"),
  reharmonization: l("melody-safe substitution", "substituição que preserva a melodia", "sustitución que conserva la melodía", "melodieverträgliche Ersetzung", "メロディーを保つ代理コード", "保持旋律的替代"),
  "form-and-composition": l("section contrast", "contraste entre seções", "contraste entre secciones", "Abschnittskontrast", "セクション間の対比", "段落对比"),
};

const PRACTICE_LENSES = [
  l("root-first pass", "passagem pela fundamental", "pasada desde la fundamental", "grundtonbezogener Durchgang", "ルート優先の回", "根音优先遍"),
  l("outer-voice pass", "passagem das vozes externas", "pasada de voces exteriores", "Außenstimmendurchgang", "外声優先の回", "外声部优先遍"),
  l("pulse-first pass", "passagem pelo pulso", "pasada desde el pulso", "pulsbezogener Durchgang", "拍優先の回", "拍点优先遍"),
  l("silent-prediction pass", "passagem de previsão silenciosa", "pasada de predicción silenciosa", "stiller Vorhersagedurchgang", "無音予測の回", "无声预测遍"),
  l("contrast pass", "passagem de contraste", "pasada de contraste", "Kontrastdurchgang", "対比優先の回", "对比遍"),
  l("bass-led pass", "passagem guiada pelo baixo", "pasada guiada por el bajo", "bassgeführter Durchgang", "低音主導の回", "低音主导遍"),
  l("top-line pass", "passagem da voz superior", "pasada de la voz superior", "Oberstimmendurchgang", "上声優先の回", "顶声部优先遍"),
  l("boundary-repair pass", "passagem de reparo da fronteira", "pasada de reparación del límite", "Grenzstellenreparatur", "境界修正の回", "边界修正遍"),
  l("no-restart take", "tomada sem reinício", "toma sin reinicio", "Durchgang ohne Neustart", "再開しないテイク", "不重启录音"),
  l("transfer pass", "passagem de transferência", "pasada de transferencia", "Übertragungsdurchgang", "応用優先の回", "转用遍"),
];

function englishPracticeOpening(index, lens, instruction) {
  const stems = [
    `Start the ${lens}:`,
    `On the ${lens},`,
    `Set the pulse for the ${lens}, then`,
    `Prepare the ${lens} in silence, then`,
    `Use the ${lens} as a contrast check:`,
    `Let the low register lead the ${lens}:`,
    `Let the upper line guide the ${lens}:`,
    `At the repair point in the ${lens},`,
    `Keep the ${lens} moving:`,
    `Transfer the idea through the ${lens}:`,
  ];
  return `${stems[index]} ${lowerFirst(instruction.replace(/[.!?]$/u, ""), "en")}.`;
}

function directPracticeFor(unitDefinition, lesson, locale, index) {
  const target = lesson.target[locale];
  const stats = materialStats(lesson);
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const lens = PRACTICE_LENSES[index][locale];
  if (lesson.kind === "chord") {
    const root = spokenPitch(lesson.root, locale);
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    const style = STYLE_NAMES[lesson.style][locale];
    const pairedStyle = lesson.style === "block" ? STYLE_NAMES.arpeggio[locale] : style;
    const englishOpening = englishPracticeOpening(index, lens, `Play ${target} once as a block and once as a ${pairedStyle} at ${lesson.tempo} BPM`);
    return l(
      `${englishOpening} Test ${cue} by saying ${root} before the attack, then singing ${focus} against the sustained chord. Add the remaining tones above ${root} one at a time, but keep the ${focus} interval and written register unchanged. If ${cue} blurs, isolate ${root} against ${focus} and rebuild that interval before restoring the full chord. Finish with ${lesson.repeats} even ${style} notes; keep the take where ${root} and ${focus} speak without extra force.`,
      `Comece a ${lens} com ${target}: toque uma vez em bloco e uma vez como ${pairedStyle} a ${lesson.tempo} BPM. Teste ${cue} dizendo ${root} antes do ataque e cantando ${focus} contra o acorde sustentado. Acrescente as demais notas acima de ${root}, uma por vez, preservando o intervalo de ${focus} e o registro escrito. Se ${cue} borrar, isole ${root} contra ${focus} e reconstrua esse intervalo antes de restaurar o acorde inteiro. Termine com ${lesson.repeats} notas regulares em ${style}; guarde a tomada em que ${root} e ${focus} soem sem força extra.`,
      `Empieza la ${lens} con ${target}: toca una vez en bloque y otra como ${pairedStyle} a ${lesson.tempo} BPM. Comprueba ${cue} diciendo ${root} antes del ataque y cantando ${focus} contra el acorde sostenido. Añade las demás notas sobre ${root}, una por una, conservando el intervalo de ${focus} y el registro escrito. Si ${cue} se emborrona, aísla ${root} contra ${focus} y reconstruye ese intervalo antes de recuperar el acorde completo. Termina con ${lesson.repeats} notas regulares en ${style}; conserva la toma donde ${root} y ${focus} suenen sin fuerza extra.`,
      `Beginne den ${lens} mit ${target}: Spiele einen Block und ein ${pairedStyle} bei ${lesson.tempo} BPM. Prüfe ${cue}, indem du ${root} vor dem Anschlag nennst und ${focus} gegen den gehaltenen Akkord singst. Füge die übrigen Töne über ${root} einzeln hinzu, aber halte das ${focus}-Intervall und die notierte Lage fest. Wird ${cue} unscharf, isoliere ${root} gegen ${focus} und baue dieses Intervall vor dem ganzen Akkord neu auf. Schließe mit ${lesson.repeats} gleichmäßigen ${style}-Tönen ab; behalte den Durchgang, in dem ${root} und ${focus} ohne Zusatzkraft sprechen.`,
      `${lens}では${target}を${lesson.tempo} BPMのブロックと${pairedStyle}で1回ずつ弾きます。アタック前に${root}を言い、保持したコードに対して${focus}を歌って${cue}を確かめます。${root}の上へ残りの音を1音ずつ加えますが、${focus}の音程と記譜音域は変えません。${cue}が曖昧なら${root}と${focus}だけを取り出し、その音程を直してから全コードへ戻します。最後は${style}で${lesson.repeats}回そろえ、${root}と${focus}が余計な力なしに聞こえるテイクを残します。`,
      `先做${lens}：以${lesson.tempo} BPM把${target}用柱式与${pairedStyle}各弹一遍。起奏前先说出${root}，再对着持续和弦唱${focus}，用来检查${cue}是否清楚。从${root}上方开始逐个加入其余和弦音，但${focus}的音程与写出的音区都不能改变。若${cue}变模糊，只分离${root}与${focus}，修好这段音程后再恢复完整和弦。最后用${style}均匀起奏${lesson.repeats}次，只保留${root}与${focus}都清楚而手上没有额外用力的一遍。`)[locale];
  }
  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      const [left, right] = lesson.alternatives;
      const leftTokens = left.numerals.trim().split(/\s+/u);
      const rightTokens = right.numerals.trim().split(/\s+/u);
      const leftEnding = leftTokens.slice(-2).join(" → ");
      const rightEnding = rightTokens.slice(-2).join(" → ");
      const leftChords = countPhrase(leftTokens.length, locale, l("chord", "acorde", "acorde", "Akkord", "コード", "个和弦"), l("chords", "acordes", "acordes", "Akkorde", "コード", "个和弦"));
      const rightChords = countPhrase(rightTokens.length, locale, l("chord", "acorde", "acorde", "Akkord", "コード", "个和弦"), l("chords", "acordes", "acordes", "Akkorde", "コード", "个和弦"));
      const leftBeats = countPhrase(leftTokens.length * lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
      const rightBeats = countPhrase(rightTokens.length * lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
      const englishOpening = englishPracticeOpening(index, lens, `Treat A, ${left.numerals}, and B, ${right.numerals}, as alternatives rather than one chain`);
      return l(
        `${englishOpening} For ${cue}, give A ${leftChords} across ${leftBeats} and B ${rightChords} across ${rightBeats}. Sing bass roots under ${left.numerals}, leave one silent beat, then do the same under ${right.numerals}. If their destinations blur, loop ${leftEnding} and ${rightEnding} separately with equal chord lengths. At ${lesson.tempo} BPM, name how each ending handles ${cue}: it may close, delay, or redirect the phrase.`,
        `Comece a ${lens} tratando A, ${left.numerals}, e B, ${right.numerals}, como alternativas, não como uma cadeia. Para ${cue}, dê a A ${leftChords} em ${leftBeats} e a B ${rightChords} em ${rightBeats}. Cante as fundamentais sob ${left.numerals}, deixe um tempo de silêncio e faça o mesmo sob ${right.numerals}. Se os destinos borrarem, repita ${leftEnding} e ${rightEnding} separadamente, com acordes de mesma duração. A ${lesson.tempo} BPM, diga como cada final trata ${cue}: ele pode fechar, adiar ou redirecionar a frase.`,
        `Empieza la ${lens} tratando A, ${left.numerals}, y B, ${right.numerals}, como alternativas, no como una cadena. Para ${cue}, da a A ${leftChords} en ${leftBeats} y a B ${rightChords} en ${rightBeats}. Canta las fundamentales bajo ${left.numerals}, deja un pulso de silencio y haz lo mismo bajo ${right.numerals}. Si los destinos se emborronan, repite ${leftEnding} y ${rightEnding} por separado, con acordes de igual duración. A ${lesson.tempo} BPM, di cómo trata cada final ${cue}: puede cerrar, retrasar o redirigir la frase.`,
        `Beginne den ${lens}, indem du A, ${left.numerals}, und B, ${right.numerals}, als Alternativen statt als Kette behandelst. Für ${cue} erhält A ${leftChords} in ${leftBeats} und B ${rightChords} in ${rightBeats}. Singe die Bassgrundtöne unter ${left.numerals}, lass einen stillen Schlag und wiederhole das unter ${right.numerals}. Werden die Ziele unscharf, übe ${leftEnding} und ${rightEnding} getrennt mit gleichen Akkordlängen. Benenne bei ${lesson.tempo} BPM, wie jeder Schluss ${cue} behandelt: abschließend, verzögernd oder umlenkend.`,
        `${lens}ではAの${left.numerals}とBの${right.numerals}を、一本の連鎖ではなく別案として扱います。${cue}を確かめるため、Aを${leftChords}と${leftBeats}、Bを${rightChords}と${rightBeats}にそろえます。${left.numerals}の低音ルートを歌い、1拍空けてから${right.numerals}でも同じことをします。到着先が曖昧なら${leftEnding}と${rightEnding}を分け、同じコード長で反復します。${lesson.tempo} BPMで、各終止が${cue}をどう扱うか、閉じる、遅らせる、転じるから答えます。`,
        `先做${lens}：把A的${left.numerals}与B的${right.numerals}当成两个方案，不要连成一条长链。为检查${cue}，A使用${leftChords}与${leftBeats}，B使用${rightChords}与${rightBeats}，两边时值各自完整。唱出${left.numerals}下方的低音根音，留一拍安静，再对${right.numerals}做同样练习。若到达位置模糊，把${leftEnding}与${rightEnding}分开循环，并保持相同的和弦长度。最后以${lesson.tempo} BPM说明每个结尾如何处理${cue}：结束、延后，还是把乐句转向。`)[locale];
    }
    const route = lesson.numerals;
    const tokens = route.trim().split(/\s+/u);
    const finalPair = tokens.slice(-2).join(" → ");
    const beatsEach = countPhrase(lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
    const englishOpening = englishPracticeOpening(index, lens, `Speak ${route} in time before you play it`);
    return l(
      `${englishOpening} Check ${cue}: count ${beatsEach} through every change, then sing each new bass root. Hear ${finalPair} inside the whole path and name the function of its last chord. If ${cue} arrives late, loop ${finalPair} twice with equal lengths before restoring the earlier changes. At ${lesson.tempo} BPM, play the full path once and state whether ${finalPair} closes, delays, or redirects the phrase.`,
      `Comece a ${lens} dizendo ${route} no pulso antes de tocar. Confira ${cue}: conte ${beatsEach} em cada troca e depois cante cada nova fundamental. Ouça ${finalPair} dentro do caminho inteiro e diga a função de seu último acorde. Se ${cue} chegar atrasada, repita ${finalPair} duas vezes com durações iguais antes de restaurar as trocas anteriores. A ${lesson.tempo} BPM, toque o caminho completo e diga se ${finalPair} fecha, adia ou redireciona a frase.`,
      `Empieza la ${lens} diciendo ${route} a tiempo antes de tocar. Comprueba ${cue}: cuenta ${beatsEach} en cada cambio y después canta cada nueva fundamental. Oye ${finalPair} dentro del recorrido completo y di la función de su último acorde. Si ${cue} llega tarde, repite ${finalPair} dos veces con duraciones iguales antes de recuperar los cambios anteriores. A ${lesson.tempo} BPM, toca el recorrido completo y di si ${finalPair} cierra, retrasa o redirige la frase.`,
      `Beginne den ${lens}, indem du ${route} vor dem Spielen im Puls sprichst. Prüfe ${cue}: Zähle bei jedem Wechsel ${beatsEach} und singe danach jeden neuen Bassgrundton. Höre ${finalPair} im ganzen Weg und nenne die Funktion seines letzten Akkords. Kommt ${cue} zu spät, wiederhole ${finalPair} zweimal mit gleichen Längen und stelle dann die früheren Wechsel wieder her. Spiele den ganzen Weg bei ${lesson.tempo} BPM und beurteile, ob ${finalPair} die Phrase schließt, verzögert oder umlenkt.`,
      `${lens}では弾く前に${route}を拍に合わせて言います。各変化を${beatsEach}数え、新しい低音ルートを歌って${cue}を確かめます。全経路の中で${finalPair}を聴き、最後のコードの機能を言います。${cue}の到着が遅れたら${finalPair}を同じ長さで2回反復し、それから前半の変化を戻します。${lesson.tempo} BPMで全経路を1回弾き、${finalPair}が楽句を閉じるか、遅らせるか、転じるか答えます。`,
      `先做${lens}：弹奏前按拍说出${route}，确认自己知道每次变化的顺序。每个和弦都数${beatsEach}，再唱出新的低音根音，用来检查${cue}是否准时。把${finalPair}放回完整路线中聆听，并说出最后一个和弦承担的功能。若${cue}到达迟缓，就用相同时值循环${finalPair}两次，再恢复前面的变化。最后以${lesson.tempo} BPM弹一遍完整路线，说明${finalPair}是结束、延后，还是把乐句转向。`)[locale];
  }
  if (lesson.kind === "notes") {
    const voicings = countPhrase(stats.eventCount, locale, VOICING_NOUN, VOICINGS_NOUN);
    const beats = countPhrase(stats.totalBeats, locale, BEAT_NOUN, BEATS_NOUN);
    if (stats.eventCount === 1) {
      return l(
        `Begin the ${lens} by sounding the written voicing at ${lesson.tempo} BPM, then let it ring without another piano attack. Check ${cue}: sing ${stats.bass}, then ${stats.top}, over the sustain while keeping both pitches in register. Replay ${stats.bass} below ${stats.top} as a block and a slow arpeggio, naming each interval above the bass. If ${cue} disappears behind an inner note, lighten only that finger; do not widen or respell the chord. Keep three clean attacks whose ${stats.bass} and ${stats.top} begin together, then say which outer tone carried the color.`,
        `Comece a ${lens} tocando a abertura escrita a ${lesson.tempo} BPM e deixe-a soar sem novo ataque ao piano. Confira ${cue}: cante ${stats.bass} e depois ${stats.top} sobre a sustentação, preservando as duas notas no registro. Repita ${stats.bass} sob ${stats.top} em bloco e como arpejo lento, dizendo cada intervalo acima do baixo. Se ${cue} desaparecer atrás de uma nota interna, alivie só esse dedo; não abra nem reescreva o acorde. Guarde três ataques limpos em que ${stats.bass} e ${stats.top} comecem juntos e diga qual voz externa levou a cor.`,
        `Empieza la ${lens} tocando la disposición escrita a ${lesson.tempo} BPM y déjala sonar sin otro ataque de piano. Comprueba ${cue}: canta ${stats.bass} y después ${stats.top} sobre el sonido sostenido, con ambas notas en su registro. Repite ${stats.bass} bajo ${stats.top} en bloque y como arpegio lento, nombrando cada intervalo sobre el bajo. Si ${cue} desaparece tras una nota interior, aligera solo ese dedo; no abras ni reformules el acorde. Conserva tres ataques limpios donde ${stats.bass} y ${stats.top} empiecen juntos y di qué voz exterior llevó el color.`,
        `Beginne den ${lens} mit der notierten Lage bei ${lesson.tempo} BPM und lass sie ohne neuen Klavieranschlag klingen. Prüfe ${cue}: Singe ${stats.bass}, danach ${stats.top}, über dem gehaltenen Klang in derselben Lage. Spiele ${stats.bass} unter ${stats.top} als Block und langsames Arpeggio und nenne jedes Intervall über dem Bass. Verschwindet ${cue} hinter einem Innenton, spiele nur diesen Finger leichter; spreize oder deute den Akkord nicht um. Behalte drei saubere Anschläge, bei denen ${stats.bass} und ${stats.top} gemeinsam beginnen, und benenne den farbtragenden Außenton.`,
        `${lens}では、記譜されたボイシングを${lesson.tempo} BPMで鳴らし、ピアノを打ち直さず伸ばします。${cue}を確かめるため、同じ音域のまま${stats.bass}、次に${stats.top}を持続音へ重ねて歌います。${stats.bass}を低音、${stats.top}を上声にしてブロックと遅いアルペジオで弾き、各音程を言います。内声の後ろに${cue}が隠れたら、その指だけ弱め、コードを広げたり綴り直したりしません。${stats.bass}と${stats.top}が同時に始まるきれいな3回を残し、どちらの外声が色を担ったか答えます。`,
        `先做${lens}：以${lesson.tempo} BPM在写出的音区奏响该和弦排列，让声音延续，不要再次按键。用${cue}核对听感；在持续音上先唱${stats.bass}，再唱${stats.top}，两音都留在原音区。把${stats.bass}置于${stats.top}下方，用柱式与慢琶音重弹同一组音，并逐一说出音程。若内声遮住${cue}，只减轻那个手指，不要扩开排列或改写和弦。保留三次${stats.bass}与${stats.top}同时开始的干净起奏，再说出哪条外声承担主要色彩。`)[locale];
    }
    return l(
      `Begin the ${lens} at ${lesson.tempo} BPM and place all ${voicings} across ${beats} without breaking a bracketed group. Check ${cue} by singing the bass path ${stats.bass}, leaving one silent beat, then singing the top path ${stats.top}. Restore the full voicings and find where ${stats.bass} first stops arriving with ${stats.top}. Loop only that neighboring pair until ${cue} is clear in both outer voices for two clean repetitions. Record all ${beats} without restarting; circle the first late onset on ${stats.bass} or ${stats.top}, or mark it as an inner voice.`,
      `Comece a ${lens} a ${lesson.tempo} BPM e distribua as ${voicings} por ${beats} sem separar nenhum grupo entre colchetes. Confira ${cue} cantando o baixo ${stats.bass}, deixando um tempo de silêncio e depois cantando o topo ${stats.top}. Restaure todas as aberturas e encontre onde ${stats.bass} deixa de chegar junto com ${stats.top} pela primeira vez. Repita apenas esse par vizinho até ${cue} ficar claro nas duas vozes externas por duas repetições limpas. Grave todos os ${beats} sem reiniciar; marque o primeiro ataque atrasado em ${stats.bass} ou ${stats.top}, ou identifique-o como voz interna.`,
      `Empieza la ${lens} a ${lesson.tempo} BPM y reparte las ${voicings} durante ${beats} sin separar ningún grupo entre corchetes. Comprueba ${cue} cantando el bajo ${stats.bass}, dejando un pulso de silencio y cantando después la voz superior ${stats.top}. Recupera todas las disposiciones y localiza dónde ${stats.bass} deja de llegar junto con ${stats.top} por primera vez. Repite solo ese par vecino hasta que ${cue} quede claro en ambas voces exteriores durante dos repeticiones limpias. Graba los ${beats} completos sin reiniciar; marca el primer ataque tardío en ${stats.bass} o ${stats.top}, o identifícalo como voz interior.`,
      `Beginne den ${lens} bei ${lesson.tempo} BPM und verteile alle ${voicings} über ${beats}, ohne eine Klammergruppe zu trennen. Prüfe ${cue}: Singe den Bassweg ${stats.bass}, lass einen stillen Schlag und singe dann den Oberstimmenweg ${stats.top}. Stelle alle Lagen wieder her und finde, wo ${stats.bass} erstmals nicht mit ${stats.top} ankommt. Wiederhole nur dieses benachbarte Paar, bis ${cue} in beiden Außenstimmen zweimal sauber hörbar ist. Nimm alle ${beats} ohne Neustart auf; markiere den ersten späten Einsatz in ${stats.bass} oder ${stats.top}, sonst als Innenstimme.`,
      `${lens}を${lesson.tempo} BPMで始め、${voicings}を${beats}に収め、角括弧内の音は分けずに鳴らします。${cue}の確認では、低音経路${stats.bass}を歌い、1拍空けてから上声経路${stats.top}を歌います。全ボイシングへ戻り、${stats.bass}が${stats.top}と初めて同時に着かなくなる境界を探します。その隣り合う2つだけを反復し、両外声で${cue}が明瞭な状態を2回そろえます。途中で再開せず${beats}を録音し、${stats.bass}か${stats.top}で最初に遅れた起音を記し、違えば内声と書きます。`,
      `先以${lesson.tempo} BPM完成${lens}，把${voicings}放进${beats}；每组方括号内的音必须同时开始，不能拆开。用${cue}核对路线：先唱低音${stats.bass}，留一拍安静，再唱顶声部${stats.top}。恢复全部和弦排列，找出${stats.bass}第一次不能与${stats.top}同时到达的边界。只循环该边界两侧相邻的排列，直到两条外声连续两次都清楚呈现${cue}。不中途重启地录下全部${beats}，圈出${stats.bass}或${stats.top}中第一个迟到的起音；若都不是，就注明为内声。`)[locale];
  }
  if (lesson.kind === "compare") {
    const root = spokenPitch(lesson.root, locale);
    const focus = comparisonFocus(lesson, locale);
    const left = compareBrief(lesson.a, locale);
    const right = compareBrief(lesson.b, locale);
    return l(
      `Begin the ${lens} by hearing A and B once without looking, then hum the first difference you notice. Use ${cue} as the question and describe ${focus} before revealing either label. Alternate A (${left}) with B (${right}) four times at ${lesson.tempo} BPM, leaving one silent beat between them. Keep root ${root}, volume, register, and touch fixed; if unsure, isolate ${cue} within ${focus}. Label the last two trials only after listening, and keep them when A's ${left} and B's ${right} are both named correctly.`,
      `Comece a ${lens} ouvindo A e B uma vez sem olhar e cantarole a primeira diferença percebida. Use ${cue} como pergunta e descreva ${focus} antes de revelar qualquer rótulo. Alterne A (${left}) e B (${right}) quatro vezes a ${lesson.tempo} BPM, com um tempo de silêncio entre eles. Preserve fundamental ${root}, volume, registro e ataque; se houver dúvida, isole ${cue} dentro de ${focus}. Rotule as duas últimas tentativas só depois de ouvir e guarde-as quando ${left} em A e ${right} em B forem nomeados corretamente.`,
      `Empieza la ${lens} oyendo A y B una vez sin mirar y tararea la primera diferencia que percibas. Usa ${cue} como pregunta y describe ${focus} antes de revelar las etiquetas. Alterna A (${left}) y B (${right}) cuatro veces a ${lesson.tempo} BPM, con un pulso de silencio entre ambos. Mantén fundamental ${root}, volumen, registro y ataque; si dudas, aísla ${cue} dentro de ${focus}. Etiqueta los dos últimos intentos solo después de oírlos y consérvalos cuando ${left} en A y ${right} en B estén bien nombrados.`,
      `Beginne den ${lens}, indem du A und B einmal ohne hinzusehen hörst und den ersten Unterschied summst. Nutze ${cue} als Frage und beschreibe ${focus}, bevor du eine Seite benennst. Wechsle A (${left}) und B (${right}) bei ${lesson.tempo} BPM viermal mit einem stillen Schlag dazwischen. Halte Grundton ${root}, Lautstärke, Lage und Anschlag fest; isoliere bei Zweifel ${cue} innerhalb von ${focus}. Beschrifte die letzten zwei Versuche erst nach dem Hören und behalte sie, wenn ${left} in A und ${right} in B richtig benannt sind.`,
      `${lens}では、画面を見ずにAとBを1回ずつ聴き、最初に気づいた差をハミングします。${cue}を問いにして、ラベルを明かす前に${focus}を言葉で説明します。A（${left}）とB（${right}）を${lesson.tempo} BPMで4回交互に聴き、間には1拍の無音を置きます。ルート${root}、音量、音域、タッチを固定し、迷ったら${focus}の中の${cue}だけを取り出します。最後の2回は聴いた後にだけラベルを付け、Aの${left}とBの${right}を正しく言えたテイクを残します。`,
      `先做${lens}：不看屏幕各听A与B一遍，再轻声唱出最先察觉的差别。把${cue}当作判断问题，在揭示标签前先用自己的话说明${focus}。以${lesson.tempo} BPM把A（${left}）与B（${right}）交替四遍，两边之间保留一拍完整安静。根音${root}、音量、音区与触键始终固定；若仍犹豫，只分离${focus}中的${cue}。最后两次都要先听完再标记，正确说出A的${left}与B的${right}后才保留结果。`)[locale];
  }
  const eventMap = eventMapFor(lesson, locale);
  const slots = countPhrase(stats.slots, locale, l("slot", "posição", "posición", "Platz", "位置", "位置"), l("slots", "posições", "posiciones", "Plätze", "位置", "位置"));
  return l(
    `Begin the ${lens} at ${lesson.tempo} BPM after counting one complete bar, then tap the written pattern once without an accent. Speak ${eventMap} through the first two cycles and use ${cue} to keep the counting gesture flowing across each rest. On cycles three and four, say ${eventMap} internally and accent only the first of ${slots}. If ${cue} breaks at a rest, cancel that strike while the counting motion continues, then enter on the next written attack without restarting. Record four cycles of ${eventMap} and keep the take only when the bar line stays clean and every rest remains silent.`,
    `Comece a ${lens} a ${lesson.tempo} BPM depois de contar um compasso inteiro e marque o padrão escrito uma vez, sem acento. Diga ${eventMap} nos dois primeiros ciclos e use ${cue} para manter o gesto da contagem atravessando cada pausa. Nos ciclos três e quatro, diga ${eventMap} por dentro e acentue apenas a primeira de ${slots}. Se ${cue} falhar numa pausa, cancele esse golpe enquanto o gesto da contagem continua e entre no próximo ataque escrito sem reiniciar. Grave quatro ciclos de ${eventMap} e guarde a tomada somente quando a barra ficar limpa e todas as pausas permanecerem mudas.`,
    `Empieza la ${lens} a ${lesson.tempo} BPM después de contar un compás completo y marca una vez el patrón escrito sin acento. Di ${eventMap} durante los dos primeros ciclos y usa ${cue} para mantener el gesto de contar a través de cada silencio. En los ciclos tres y cuatro, di ${eventMap} por dentro y acentúa solo la primera de ${slots}. Si ${cue} falla en un silencio, cancela ese golpe mientras el gesto de contar continúa y entra en el siguiente ataque escrito sin reiniciar. Graba cuatro ciclos de ${eventMap} y conserva la toma solo cuando la barra quede limpia y todos los silencios permanezcan mudos.`,
    `Beginne den ${lens} bei ${lesson.tempo} BPM nach einem ganzen Einzähltakt und klopfe das notierte Muster einmal ohne Akzent. Sprich ${eventMap} in den ersten zwei Durchgängen und nutze ${cue}, damit die Zählbewegung durch jede Pause fließt. Sprich ${eventMap} im dritten und vierten Durchgang innerlich und betone nur den ersten der ${slots}. Bricht ${cue} an einer Pause, lass diesen Schlag aus, während die Zählbewegung weiterläuft, und setze beim nächsten notierten Anschlag ohne Neustart ein. Nimm vier Durchgänge von ${eventMap} auf und behalte nur einen sauberen Taktstrich mit stillen Pausen.`,
    `${lens}では1小節を数えてから、${lesson.tempo} BPMで記譜パターンをアクセントなしに1回叩きます。最初の2周は${eventMap}と言い、${cue}を手掛かりに、各休符の間も数える動作を流し続けます。3周目と4周目は${eventMap}を内側で言い、${slots}の最初だけを強調します。休符で${cue}が崩れたら、その打音だけを取り消し、数える動作は保ったまま次の記譜アタックへ入り、最初からやり直しません。${eventMap}を4周録音し、小節線に余分な音がなく、すべての休符が無音のテイクだけを残します。`,
    `先做${lens}：数满一小节后，以${lesson.tempo} BPM把写出的节奏型无重音击打一遍。前两轮说出${eventMap}，并用${cue}检查动作；经过每个休止时，计数手势仍要平稳向前。第三与第四轮在心里说${eventMap}，只强调${slots}中的第一个位置。若某个休止让${cue}中断，就取消那一下击打，但计数手势继续运行；随后在下一个写出的起音进入，不要从头重启。连续录下${eventMap}四轮，只保留小节线干净、没有额外起音，而且每个休止都完全安静的一遍。`)[locale];
}

const HARMONY_FLOW_TRANSITIONS = [
  l("First,", "Primeiro,", "Primero,", "Zuerst,", "まず、", "首先，"),
  l("Next,", "Depois,", "Después,", "Danach,", "次に、", "其次，"),
  l("Rhythmically,", "Ritmicamente,", "Rítmicamente,", "Rhythmisch,", "リズム面では、", "节奏方面，"),
  l("Aurally,", "Auditivamente,", "Auditivamente,", "Nach Gehör,", "耳では、", "听觉方面，"),
  l("Conversely,", "Em contraste,", "En contraste,", "Im Kontrast,", "対比すると、", "对比时，"),
  l("Fundamentally,", "Pela fundamental,", "Desde la fundamental,", "Vom Bass aus,", "低音から、", "从低音开始，"),
  l("Melodically,", "Pela voz superior,", "Desde la voz superior,", "Von oben,", "上声から、", "从顶声部开始，"),
  l("Locally,", "Na fronteira,", "En el límite,", "An der Grenze,", "境界では、", "在边界处，"),
  l("Continuously,", "Sem parar,", "Sin parar,", "Durchgehend,", "止めずに、", "不停顿地，"),
  l("Finally,", "Por fim,", "Por último,", "Zum Schluss,", "最後に、", "最后，"),
];

const HARMONY_FACT_ORDERS = [
  [0, 1, 2, 3, 4, 5],
  [0, 2, 1, 3, 4, 5],
  [2, 0, 1, 3, 4, 5],
  [1, 0, 2, 3, 4, 5],
  [0, 1, 3, 2, 4, 5],
  [2, 1, 0, 3, 4, 5],
  [1, 2, 0, 3, 4, 5],
  [0, 3, 1, 2, 4, 5],
  [0, 2, 3, 1, 4, 5],
  [1, 0, 3, 2, 4, 5],
];

function unitConceptClause(unitDefinition, locale) {
  return unitDefinition.concepts[locale]
    .replace(/[.!?。！？]$/u, "")
    .split(/[;；。！？]/u)[0]
    .trim();
}

function outerBoundaryFor(lesson, locale) {
  const events = sequenceEvents(lesson.sequence, lesson.beat);
  const right = events.at(-1);
  const left = events.at(-2) || right;
  const bassLeft = spokenPitch(left.pitches[0], locale);
  const bassRight = spokenPitch(right.pitches[0], locale);
  const topLeft = spokenPitch(left.pitches.at(-1), locale);
  const topRight = spokenPitch(right.pitches.at(-1), locale);
  return l(
    `bass ${bassLeft} → ${bassRight} and top ${topLeft} → ${topRight}`,
    `baixo ${bassLeft} → ${bassRight} e topo ${topLeft} → ${topRight}`,
    `bajo ${bassLeft} → ${bassRight} y voz superior ${topLeft} → ${topRight}`,
    `Bass ${bassLeft} → ${bassRight} und Oberstimme ${topLeft} → ${topRight}`,
    `低音${bassLeft}→${bassRight}と上声${topLeft}→${topRight}`,
    `低音${bassLeft}→${bassRight}与顶声部${topLeft}→${topRight}`
  )[locale];
}

function namedTendencyFor(lesson, locale) {
  if (!["motion-seven-minor-cadence", "jazz-minor-two-five-one"].includes(lesson.slug)) return "";
  return l(
    "G sharp → A and D → C",
    "sol sustenido → lá e ré → dó",
    "sol sostenido → la y re → do",
    "Gis → A und D → C",
    "G♯→AとD→C",
    "G升→A与D→C"
  )[locale];
}

function harmonyBodyFacts(unitDefinition, lesson, locale, index) {
  const target = lesson.target[locale];
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const lens = PRACTICE_LENSES[index][locale];
  const concept = unitConceptClause(unitDefinition, locale);
  const stats = materialStats(lesson);

  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    const style = STYLE_NAMES[lesson.style][locale];
    const pairedStyle = lesson.style === "block" ? STYLE_NAMES.arpeggio[locale] : style;
    const attacks = countPhrase(lesson.repeats, locale,
      l("attack", "ataque", "ataque", "Anschlag", "回のアタック", "次起奏"),
      l("attacks", "ataques", "ataques", "Anschläge", "回のアタック", "次起奏"));
    return [
      l(
        `Study ${target} in the ${lens}; its root supports ${focus}, and ${style} at ${lesson.tempo} BPM keeps that color exposed.`,
        `Estude ${target} na ${lens}; a fundamental sustenta ${focus}, e ${style} a ${lesson.tempo} BPM mantém essa cor exposta.`,
        `Estudia ${target} en la ${lens}; la fundamental sostiene ${focus}, y ${style} a ${lesson.tempo} BPM mantiene ese color expuesto.`,
        `Untersuche ${target} im ${lens}; der Grundton trägt ${focus}, und ${style} bei ${lesson.tempo} BPM hält diese Farbe offen.`,
        `${lens}で${target}を確かめ、ルートで${focus}を支え、${lesson.tempo} BPMの${style}でその色を明瞭に保ちます。`,
        `在${lens}中检查${target}；根音支撑${focus}，${lesson.tempo} BPM的${style}让这种色彩保持清楚。`)[locale],
      l(
        `Relate ${cue} to this principle: ${concept}; the defining interval must remain audible before the other chord tones enter.`,
        `Relacione ${cue} a este princípio: ${concept}; o intervalo definidor deve soar antes da entrada das demais notas do acorde.`,
        `Relaciona ${cue} con este principio: ${concept}; el intervalo definitorio debe oírse antes de que entren las demás notas del acorde.`,
        `Verbinde ${cue} mit diesem Prinzip: ${concept}; das kennzeichnende Intervall muss vor den übrigen Akkordtönen hörbar sein.`,
        `${cue}を「${concept}」という原理と結び、他の構成音を加える前に決め手の音程を聞き取ります。`,
        `把${cue}与“${concept}”这个原理联系起来；加入其余和弦音之前，决定性质的音程必须清楚可听。`)[locale],
      l(
        `Give the voicing ${attacks} in ${style}, holding register and dynamics steady so ${focus} can be judged against ${cue}.`,
        `Faça ${attacks} em ${style}, mantendo registro e dinâmica para julgar ${focus} em relação a ${cue}.`,
        `Haz ${attacks} en ${style}, manteniendo registro y dinámica para juzgar ${focus} frente a ${cue}.`,
        `Spiele die Lage mit ${attacks} als ${style}; halte Register und Dynamik fest, um ${focus} an ${cue} zu prüfen.`,
        `${style}で${attacks}を行い、音域と強弱を固定して、${focus}を${cue}に照らして判断します。`,
        `用${style}完成${attacks}，固定音区与力度，再依据${cue}判断${focus}是否清楚。`)[locale],
      l(
        `Sing ${focus} over the sustained root during the ${lens}, then rebuild the chord one tone at a time in the same spelling.`,
        `Cante ${focus} sobre a fundamental sustentada durante a ${lens} e remonte o acorde nota por nota com a mesma formação.`,
        `Canta ${focus} sobre la fundamental sostenida durante la ${lens} y reconstruye el acorde nota por nota con la misma escritura.`,
        `Singe ${focus} im ${lens} über dem gehaltenen Grundton und baue den Akkord danach mit derselben Schreibweise Ton für Ton auf.`,
        `${lens}では保持したルートの上で${focus}を歌い、同じ綴りのままコードを1音ずつ組み直します。`,
        `在${lens}中对着持续根音唱${focus}，再保持同一和弦拼写，逐音重建整个和弦。`)[locale],
      l(
        `Repair a masked ${focus} by softening the covering tone, not by widening the voicing or striking the root harder.`,
        `Corrija ${focus} encoberta suavizando a nota que a cobre, sem abrir a disposição nem atacar a fundamental com mais força.`,
        `Corrige una ${focus} tapada suavizando la nota que la cubre, sin abrir la disposición ni golpear más fuerte la fundamental.`,
        `Repariere verdecktes ${focus}, indem du den überdeckenden Ton leiser spielst, nicht die Lage spreizt oder den Grundton härter anschlägst.`,
        `${focus}が隠れたら、覆う音だけを弱め、ボイシングを広げたりルートを強く叩いたりしません。`,
        `若${focus}被遮住，只减轻覆盖它的和弦音；不要扩开排列，也不要更用力地击打根音。`)[locale],
      l(
        `Keep three consecutive ${pairedStyle} attacks only when ${focus} starts clearly, every chord tone arrives together, and the release is clean.`,
        `Guarde três ataques consecutivos em ${pairedStyle} apenas quando ${focus} começar clara, todas as notas chegarem juntas e a soltura ficar limpa.`,
        `Conserva tres ataques consecutivos en ${pairedStyle} solo cuando ${focus} empiece clara, todas las notas lleguen juntas y la suelta quede limpia.`,
        `Behalte drei aufeinanderfolgende ${pairedStyle}-Anschläge nur, wenn ${focus} klar beginnt, alle Akkordtöne gemeinsam kommen und sauber enden.`,
        `${pairedStyle}を3回続け、${focus}が明瞭に始まり、全構成音がそろって入り、離鍵もきれいな場合だけ残します。`,
        `连续完成三次${pairedStyle}；只有${focus}起始清楚、所有和弦音同时到达且收音干净时才保留。`)[locale],
    ];
  }

  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      const [left, right] = lesson.alternatives;
      const leftTokens = left.numerals.trim().split(/\s+/u);
      const rightTokens = right.numerals.trim().split(/\s+/u);
      const leftEnding = leftTokens.slice(-2).join(" → ");
      const rightEnding = rightTokens.slice(-2).join(" → ");
      const leftCount = countPhrase(leftTokens.length, locale,
        l("chord", "acorde", "acorde", "Akkord", "コード", "个和弦"),
        l("chords", "acordes", "acordes", "Akkorde", "コード", "个和弦"));
      const rightCount = countPhrase(rightTokens.length, locale,
        l("chord", "acorde", "acorde", "Akkord", "コード", "个和弦"),
        l("chords", "acordes", "acordes", "Akkorde", "コード", "个和弦"));
      const leftBeats = countPhrase(leftTokens.length * lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
      const rightBeats = countPhrase(rightTokens.length * lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
      const route = functionRouteFor(lesson, locale);
      return [
        l(
          `Read ${target} once in the ${lens}; ${route} marks two alternatives, never one continuous chain.`,
          `Leia ${target} uma vez na ${lens}; ${route} marca duas alternativas, nunca uma cadeia contínua.`,
          `Lee ${target} una vez en la ${lens}; ${route} marca dos alternativas, nunca una cadena continua.`,
          `Lies ${target} einmal im ${lens}; ${route} bezeichnet zwei Alternativen, keine durchgehende Kette.`,
          `${lens}で${target}を1回読み、${route}を一本の連鎖ではなく二つの別案として扱います。`,
          `在${lens}中把${target}读一遍；${route}表示两个独立方案，不是一条连续长链。`)[locale],
        l(
          `Relate ${cue} to this principle: ${concept}; compare the destination of ${left.numerals} with that of ${right.numerals}.`,
          `Relacione ${cue} a este princípio: ${concept}; compare o destino de ${left.numerals} ao de ${right.numerals}.`,
          `Relaciona ${cue} con este principio: ${concept}; compara el destino de ${left.numerals} con el de ${right.numerals}.`,
          `Verbinde ${cue} mit diesem Prinzip: ${concept}; vergleiche das Ziel von ${left.numerals} mit dem von ${right.numerals}.`,
          `${cue}を「${concept}」という原理と結び、${left.numerals}と${right.numerals}の到着先を比べます。`,
          `把${cue}与“${concept}”这个原理联系起来，再比较${left.numerals}与${right.numerals}的到达位置。`)[locale],
        l(
          `Give A ${leftCount} across ${leftBeats} and B ${rightCount} across ${rightBeats}; use ${cue} to keep both clocks independent.`,
          `Dê a A ${leftCount} em ${leftBeats} e a B ${rightCount} em ${rightBeats}; use ${cue} para manter os dois relógios independentes.`,
          `Da a A ${leftCount} en ${leftBeats} y a B ${rightCount} en ${rightBeats}; usa ${cue} para mantener independientes ambos relojes.`,
          `Gib A ${leftCount} in ${leftBeats} und B ${rightCount} in ${rightBeats}; halte mit ${cue} beide Zeitläufe getrennt.`,
          `Aは${leftCount}を${leftBeats}、Bは${rightCount}を${rightBeats}で弾き、${cue}を基準に二つの時間軸を分けます。`,
          `A用${leftCount}完成${leftBeats}，B用${rightCount}完成${rightBeats}；依据${cue}让两边的计时彼此独立。`)[locale],
        l(
          `Sing each route's bass roots during the ${lens}, leaving one silent beat before switching from ${leftEnding} to ${rightEnding}.`,
          `Cante as fundamentais de cada rota durante a ${lens}, deixando um tempo de silêncio antes de trocar ${leftEnding} por ${rightEnding}.`,
          `Canta las fundamentales de cada ruta durante la ${lens}, dejando un pulso de silencio antes de pasar de ${leftEnding} a ${rightEnding}.`,
          `Singe im ${lens} die Bassgrundtöne jedes Weges und lass vor dem Wechsel von ${leftEnding} zu ${rightEnding} einen stillen Schlag.`,
          `${lens}で各経路の低音ルートを歌い、${leftEnding}から${rightEnding}へ移る前に1拍の無音を置きます。`,
          `在${lens}中分别唱两条路线的低音根音；从${leftEnding}换到${rightEnding}之前留一拍完整安静。`)[locale],
        l(
          `Repair a blurred destination by looping ${leftEnding} and ${rightEnding} separately with equal chord lengths before comparing them again.`,
          `Corrija um destino borrado repetindo ${leftEnding} e ${rightEnding} separadamente, com acordes iguais, antes de compará-los outra vez.`,
          `Corrige un destino borroso repitiendo ${leftEnding} y ${rightEnding} por separado, con acordes iguales, antes de compararlos de nuevo.`,
          `Repariere ein unscharfes Ziel, indem du ${leftEnding} und ${rightEnding} getrennt mit gleichen Akkordlängen wiederholst.`,
          `到着先が曖昧なら、${leftEnding}と${rightEnding}を同じコード長で別々に反復してから再び比較します。`,
          `若到达位置模糊，先用相同和弦时值分别循环${leftEnding}与${rightEnding}，再重新比较两边。`)[locale],
        l(
          `Keep two blind comparisons only when both timings stay complete and you correctly name which ending closes, delays, or redirects the phrase.`,
          `Guarde duas comparações cegas apenas quando os dois tempos ficarem completos e você disser qual final fecha, adia ou redireciona a frase.`,
          `Conserva dos comparaciones a ciegas solo cuando ambos tiempos queden completos y digas qué final cierra, retrasa o redirige la frase.`,
          `Behalte zwei Blindvergleiche nur, wenn beide Zeitläufe vollständig sind und du die Wirkung jedes Schlusses richtig benennst.`,
          `時間を省かずに2回ブラインド比較し、どの終止が楽句を閉じる、遅らせる、転じるか正答した場合だけ残します。`,
          `完成两次盲听比较；只有两边时值都完整，而且能正确说出哪个结尾结束、延后或转向乐句时才保留。`)[locale],
      ];
    }

    const route = functionRouteFor(lesson, locale);
    const tokens = lesson.numerals.trim().split(/\s+/u);
    const finalPair = tokens.slice(-2).join(" → ");
    const changes = countPhrase(stats.chordCount, locale, CHANGE_NOUN, CHANGES_NOUN);
    const beatsEach = countPhrase(lesson.beats, locale, BEAT_NOUN, BEATS_NOUN);
    const totalBeats = countPhrase(stats.totalBeats, locale, BEAT_NOUN, BEATS_NOUN);
    const key = spokenPitch(lesson.key, locale);
    return [
      l(
        `Read ${target} once in the ${lens}; with ${key} as tonic, ${route} contains ${changes} across ${totalBeats}.`,
        `Leia ${target} uma vez na ${lens}; com ${key} como tônica, ${route} contém ${changes} em ${totalBeats}.`,
        `Lee ${target} una vez en la ${lens}; con ${key} como tónica, ${route} contiene ${changes} durante ${totalBeats}.`,
        `Lies ${target} einmal im ${lens}; mit ${key} als Tonika umfasst ${route} ${changes} in ${totalBeats}.`,
        `${lens}で${target}を1回読み、${key}をトニックにした${route}の${changes}を${totalBeats}に収めます。`,
        `在${lens}中把${target}读一遍；以${key}为主音的${route}把${changes}放进${totalBeats}。`)[locale],
      l(
        `Relate ${cue} to this principle: ${concept}; every function should point toward the next bass root before playback begins.`,
        `Relacione ${cue} a este princípio: ${concept}; cada função deve apontar para a próxima fundamental antes da reprodução.`,
        `Relaciona ${cue} con este principio: ${concept}; cada función debe apuntar a la siguiente fundamental antes de reproducir.`,
        `Verbinde ${cue} mit diesem Prinzip: ${concept}; jede Funktion soll vor dem Abspielen zum nächsten Bassgrundton weisen.`,
        `${cue}を「${concept}」という原理と結び、再生前に各機能が次の低音ルートへ向くことを予測します。`,
        `把${cue}与“${concept}”这个原理联系起来；播放前，每个功能都应指向下一个低音根音。`)[locale],
      l(
        `Count ${beatsEach} for every chord in ${lesson.numerals}; use ${cue} to keep ${changes} equal instead of rushing ${finalPair}.`,
        `Conte ${beatsEach} em cada acorde de ${lesson.numerals}; use ${cue} para manter ${changes} iguais sem correr em ${finalPair}.`,
        `Cuenta ${beatsEach} en cada acorde de ${lesson.numerals}; usa ${cue} para mantener ${changes} iguales sin acelerar ${finalPair}.`,
        `Zähle ${beatsEach} für jeden Akkord in ${lesson.numerals}; halte mit ${cue} die ${changes} gleich, statt ${finalPair} zu beschleunigen.`,
        `${lesson.numerals}の各コードを${beatsEach}数え、${cue}を基準に${changes}を均等にして、${finalPair}を急ぎません。`,
        `${lesson.numerals}中的每个和弦都数${beatsEach}；依据${cue}让${changes}保持等长，不要在${finalPair}处加速。`)[locale],
      l(
        `Sing the bass roots during the ${lens}, then hear ${finalPair} as one arrival and name the function of its last chord.`,
        `Cante as fundamentais durante a ${lens}, depois ouça ${finalPair} como uma chegada e diga a função do último acorde.`,
        `Canta las fundamentales durante la ${lens}, luego oye ${finalPair} como una llegada y di la función de su último acorde.`,
        `Singe im ${lens} die Bassgrundtöne, höre dann ${finalPair} als eine Ankunft und nenne die Funktion des letzten Akkords.`,
        `${lens}で低音ルートを歌い、${finalPair}を一つの到着として聴いて、最後のコードの機能を言います。`,
        `在${lens}中唱出低音根音，再把${finalPair}听成一次到达，并说出最后一个和弦的功能。`)[locale],
      l(
        `During the ${lens}, repair a late arrival by looping ${finalPair} twice with ${beatsEach} per chord, then restore the earlier functions without restarting.`,
        `Durante a ${lens}, corrija uma chegada atrasada repetindo ${finalPair} duas vezes com ${beatsEach} por acorde e restaure as funções anteriores sem reiniciar.`,
        `Durante la ${lens}, corrige una llegada tardía repitiendo ${finalPair} dos veces con ${beatsEach} por acorde y recupera las funciones anteriores sin reiniciar.`,
        `Repariere im ${lens} eine späte Ankunft, indem du ${finalPair} zweimal mit ${beatsEach} je Akkord wiederholst und den früheren Weg ohne Neustart ergänzt.`,
        `${lens}で到着の遅れを直すには、${finalPair}を各コード${beatsEach}で2回反復し、止めずに前の機能を戻します。`,
        `在${lens}中修正迟缓到达时，用每个和弦${beatsEach}的时值循环${finalPair}两次，再不停顿地恢复前面的功能。`)[locale],
      l(
        `For the ${lens}, keep two complete takes at ${lesson.tempo} BPM only when every change stays equal and you name whether ${finalPair} closes, delays, or redirects.`,
        `Na ${lens}, guarde duas tomadas a ${lesson.tempo} BPM apenas quando cada troca ficar igual e você disser se ${finalPair} fecha, adia ou redireciona.`,
        `En la ${lens}, conserva dos tomas a ${lesson.tempo} BPM solo cuando cada cambio quede igual y digas si ${finalPair} cierra, retrasa o redirige.`,
        `Behalte im ${lens} zwei Durchgänge bei ${lesson.tempo} BPM nur mit gleichen Wechseln und einer richtigen Deutung von ${finalPair}.`,
        `${lens}では、${lesson.tempo} BPMで2回弾き、各変化が均等で、${finalPair}の働きを正答した場合だけ残します。`,
        `在${lens}中以${lesson.tempo} BPM完成两遍；只有每次变化等长并能说明${finalPair}的作用时才保留。`)[locale],
    ];
  }

  if (lesson.kind === "notes") {
    const voicings = countPhrase(stats.eventCount, locale, VOICING_NOUN, VOICINGS_NOUN);
    const beats = countPhrase(stats.totalBeats, locale, BEAT_NOUN, BEATS_NOUN);
    const boundary = outerBoundaryFor(lesson, locale);
    const tendency = namedTendencyFor(lesson, locale);
    const repair = stats.eventCount === 1
      ? l(
        `Repair the balance between ${stats.bass} and ${stats.top} by softening a covering inner tone without changing the written register.`,
        `Corrija o equilíbrio entre ${stats.bass} e ${stats.top} suavizando uma nota interna que encobre, sem mudar o registro escrito.`,
        `Corrige el equilibrio entre ${stats.bass} y ${stats.top} suavizando una nota interior que tape, sin cambiar el registro escrito.`,
        `Repariere das Gleichgewicht zwischen ${stats.bass} und ${stats.top}, indem du einen verdeckenden Innenton leiser spielst und die Lage behältst.`,
        `${stats.bass}と${stats.top}の均衡が崩れたら、記譜音域を変えず、覆っている内声だけを弱めます。`,
        `若${stats.bass}与${stats.top}失去平衡，只减轻遮盖它们的内声，不改变写出的音区。`)[locale]
      : tendency
        ? l(
          `Repair the minor cadence by isolating ${tendency}; loop only those tendency resolutions before restoring the three full voicings.`,
          `Corrija a cadência menor isolando ${tendency}; repita apenas essas resoluções antes de restaurar as três aberturas completas.`,
          `Corrige la cadencia menor aislando ${tendency}; repite solo esas resoluciones antes de recuperar las tres disposiciones completas.`,
          `Repariere die Mollkadenz, indem du ${tendency} isolierst; übe nur diese Auflösungen vor den drei vollständigen Lagen.`,
          `マイナー・カデンツでは${tendency}だけを取り出して修正し、その解決を反復してから三つの全ボイシングへ戻します。`,
          `修正小调终止时只分离${tendency}；先循环这些倾向解决，再恢复三个完整和弦排列。`)[locale]
        : l(
          `Repair ${boundary} by looping only the final two written events until both outer voices arrive together twice.`,
          `Corrija ${boundary} repetindo apenas os dois eventos finais até as duas vozes externas chegarem juntas duas vezes.`,
          `Corrige ${boundary} repitiendo solo los dos eventos finales hasta que ambas voces exteriores lleguen juntas dos veces.`,
          `Repariere ${boundary}, indem du nur die letzten zwei Ereignisse wiederholst, bis beide Außenstimmen zweimal gemeinsam ankommen.`,
          `${boundary}を直すため、最後の二つの記譜イベントだけを反復し、両外声を2回同時に到着させます。`,
          `修正${boundary}时，只循环最后两个写出事件，直到两条外声连续两次同时到达。`)[locale];
    const acceptance = stats.eventCount === 1
      ? l(
        `Keep three attacks only when ${stats.bass} and ${stats.top} begin together, the inner tones remain audible, and every release is simultaneous.`,
        `Guarde três ataques apenas quando ${stats.bass} e ${stats.top} começarem juntos, as notas internas soarem e todas as solturas coincidirem.`,
        `Conserva tres ataques solo cuando ${stats.bass} y ${stats.top} empiecen juntos, las notas interiores se oigan y todas las sueltas coincidan.`,
        `Behalte drei Anschläge nur, wenn ${stats.bass} und ${stats.top} gemeinsam beginnen, Innentöne hörbar bleiben und alle Töne zugleich enden.`,
        `${stats.bass}と${stats.top}が同時に始まり、内声も聞こえ、全音が一緒に終わる3回だけを残します。`,
        `只保留三次合格起奏：${stats.bass}与${stats.top}同时开始，内声仍可听，而且所有音同时结束。`)[locale]
      : l(
        `Keep two uninterrupted takes of all ${beats} only when ${stats.bass} and ${stats.top} reach every boundary together in the written register.`,
        `Guarde duas tomadas contínuas de ${beats} apenas quando ${stats.bass} e ${stats.top} alcançarem cada fronteira juntos no registro escrito.`,
        `Conserva dos tomas continuas de ${beats} solo cuando ${stats.bass} y ${stats.top} alcancen juntos cada límite en el registro escrito.`,
        `Behalte zwei ununterbrochene Durchgänge über ${beats} nur, wenn ${stats.bass} und ${stats.top} jede Grenze gemeinsam in der notierten Lage erreichen.`,
        `${beats}を止めずに2回録音し、${stats.bass}と${stats.top}が記譜音域の各境界へ同時に着く場合だけ残します。`,
        `不中断地录下两遍${beats}；只有${stats.bass}与${stats.top}都在写出音区同时到达每个边界时才保留。`)[locale];
    return [
      l(
        `Read ${target} once in the ${lens}; the piano holds ${voicings} across ${beats}, with bass ${stats.bass} and top ${stats.top}.`,
        `Leia ${target} uma vez na ${lens}; o piano sustenta ${voicings} por ${beats}, com baixo ${stats.bass} e topo ${stats.top}.`,
        `Lee ${target} una vez en la ${lens}; el piano mantiene ${voicings} durante ${beats}, con bajo ${stats.bass} y voz superior ${stats.top}.`,
        `Lies ${target} einmal im ${lens}; das Klavier hält ${voicings} über ${beats}, mit Bass ${stats.bass} und Oberstimme ${stats.top}.`,
        `${lens}で${target}を1回読み、ピアノの${voicings}を${beats}保ち、低音${stats.bass}と上声${stats.top}を追います。`,
        `在${lens}中把${target}读一遍；钢琴在${beats}内保持${voicings}，低音为${stats.bass}，顶声部为${stats.top}。`)[locale],
      l(
        `Relate ${cue} to this principle: ${concept}; bracketed pitches must begin together while the two outer paths reveal direction.`,
        `Relacione ${cue} a este princípio: ${concept}; as notas entre colchetes começam juntas enquanto os caminhos externos revelam direção.`,
        `Relaciona ${cue} con este principio: ${concept}; las notas entre corchetes empiezan juntas mientras las líneas exteriores revelan dirección.`,
        `Verbinde ${cue} mit diesem Prinzip: ${concept}; Klammernoten beginnen gemeinsam, während die Außenwege Richtung zeigen.`,
        `${cue}を「${concept}」と結び、角括弧を同時に始めます。両外声の方向も聴きます。`,
        `把${cue}与“${concept}”这个原理联系起来；方括号内各音同时开始，两条外声路线则揭示方向。`)[locale],
      l(
        `Play all ${voicings} at ${lesson.tempo} BPM, then sing ${stats.bass} and ${stats.top} separately to verify ${cue} without changing register.`,
        `Toque todas as ${voicings} a ${lesson.tempo} BPM e cante ${stats.bass} e ${stats.top} separadamente para conferir ${cue} sem mudar o registro.`,
        `Toca todas las ${voicings} a ${lesson.tempo} BPM y canta ${stats.bass} y ${stats.top} por separado para comprobar ${cue} sin cambiar de registro.`,
        `Spiele alle ${voicings} bei ${lesson.tempo} BPM und singe ${stats.bass} sowie ${stats.top} getrennt, um ${cue} ohne Lagenwechsel zu prüfen.`,
        `${lesson.tempo} BPMで${voicings}をすべて弾き、音域を変えず${stats.bass}と${stats.top}を別々に歌って${cue}を確かめます。`,
        `以${lesson.tempo} BPM弹完${voicings}，再保持音区不变，分别唱${stats.bass}与${stats.top}来核对${cue}。`)[locale],
      l(
        `Restore every written group during the ${lens} and listen specifically for ${boundary}, not for a flattened single melody.`,
        `Restaure cada grupo escrito durante a ${lens} e ouça especificamente ${boundary}, não uma melodia única achatada.`,
        `Recupera cada grupo escrito durante la ${lens} y escucha específicamente ${boundary}, no una sola melodía aplanada.`,
        `Stelle im ${lens} jede notierte Gruppe wieder her und höre gezielt auf ${boundary}, nicht auf eine abgeflachte Einzelmelodie.`,
        `${lens}で各記譜グループを戻し、一本の旋律としてではなく、${boundary}を重点的に聴きます。`,
        `在${lens}中恢复每个写出音组，重点聆听${boundary}，不要把和声听成一条被摊平的旋律。`)[locale],
      repair,
      acceptance,
    ];
  }

  if (lesson.kind === "compare") {
    const focus = comparisonFocus(lesson, locale);
    const left = compareBrief(lesson.a, locale);
    const right = compareBrief(lesson.b, locale);
    return [
      l(
        `Hear ${target} once in the ${lens}, keeping the shared root, register, volume, and touch fixed while ${focus} changes.`,
        `Ouça ${target} uma vez na ${lens}, mantendo fundamental, registro, volume e ataque enquanto ${focus} muda.`,
        `Escucha ${target} una vez en la ${lens}, manteniendo fundamental, registro, volumen y ataque mientras cambia ${focus}.`,
        `Höre ${target} einmal im ${lens}; halte Grundton, Lage, Lautstärke und Anschlag fest, während ${focus} wechselt.`,
        `${lens}で${target}を1回聴き、共通のルート、音域、音量、タッチを固定して${focus}だけを変えます。`,
        `在${lens}中听${target}一遍；固定共同根音、音区、音量与触键，只让${focus}发生变化。`)[locale],
      l(
        `Relate ${cue} to this principle: ${concept}; the controlled difference must explain why A and B do not carry the same function or color.`,
        `Relacione ${cue} a este princípio: ${concept}; a diferença controlada explica por que A e B não têm a mesma função ou cor.`,
        `Relaciona ${cue} con este principio: ${concept}; la diferencia controlada explica por qué A y B no tienen la misma función o color.`,
        `Verbinde ${cue} mit diesem Prinzip: ${concept}; der kontrollierte Unterschied erklärt die verschiedene Funktion oder Farbe von A und B.`,
        `${cue}を「${concept}」という原理と結び、制御した差によってAとBの機能または色が違う理由を説明します。`,
        `把${cue}与“${concept}”这个原理联系起来；受控差异必须说明A与B为何具有不同功能或色彩。`)[locale],
      l(
        `Alternate A, ${left}, with B, ${right}, four times at ${lesson.tempo} BPM; use ${cue} to leave one silent beat between sides.`,
        `Alterne A, ${left}, com B, ${right}, quatro vezes a ${lesson.tempo} BPM; use ${cue} para deixar um tempo de silêncio entre os lados.`,
        `Alterna A, ${left}, con B, ${right}, cuatro veces a ${lesson.tempo} BPM; usa ${cue} para dejar un pulso de silencio entre lados.`,
        `Wechsle A, ${left}, und B, ${right}, viermal bei ${lesson.tempo} BPM; lass mit ${cue} einen stillen Schlag zwischen den Seiten.`,
        `Aの${left}とBの${right}を${lesson.tempo} BPMで4回交互に聴き、${cue}を基準に両側の間へ1拍の無音を置きます。`,
        `以${lesson.tempo} BPM把A的${left}与B的${right}交替四遍；依据${cue}在两边之间留一拍完整安静。`)[locale],
      l(
        `Name ${focus} during the ${lens}, then sing the first changed tone before either A or B label is revealed.`,
        `Diga ${focus} durante a ${lens} e cante a primeira nota alterada antes de revelar o rótulo A ou B.`,
        `Nombra ${focus} durante la ${lens} y canta la primera nota cambiada antes de revelar la etiqueta A o B.`,
        `Benenne ${focus} im ${lens} und singe den ersten veränderten Ton, bevor das A- oder B-Etikett erscheint.`,
        `${lens}で${focus}を言葉にし、AまたはBのラベルを見る前に最初の変化音を歌います。`,
        `在${lens}中说出${focus}，并在揭示A或B标签之前唱出第一个变化音。`)[locale],
      l(
        `Repair an uncertain answer by isolating ${left} from ${right}, then restore matched volume and the silent beat before comparing again.`,
        `Corrija uma resposta incerta isolando ${left} de ${right} e restaure volume igual e silêncio antes de comparar outra vez.`,
        `Corrige una respuesta incierta aislando ${left} de ${right} y recupera volumen igual y silencio antes de comparar de nuevo.`,
        `Repariere eine unsichere Antwort, indem du ${left} von ${right} isolierst und vor dem neuen Vergleich Lautstärke und Pause gleichsetzt.`,
        `答えが曖昧なら${left}と${right}を分け、同じ音量と1拍の無音を戻してから再び比較します。`,
        `若答案不确定，先把${left}与${right}分离，再恢复相同音量与一拍安静，然后重新比较。`)[locale],
      l(
        `Keep the final two blind trials only when both labels are correct and your spoken reason identifies ${focus} rather than loudness or register.`,
        `Guarde as duas tentativas cegas finais apenas quando os rótulos estiverem certos e a justificativa identificar ${focus}, não volume ou registro.`,
        `Conserva los dos intentos ciegos finales solo cuando las etiquetas sean correctas y la razón identifique ${focus}, no volumen ni registro.`,
        `Behalte die letzten zwei Blindversuche nur mit richtigen Etiketten und einer Begründung über ${focus} statt Lautstärke oder Lage.`,
        `最後の2回はブラインドで行い、両方のラベルが正しく、理由が音量や音域ではなく${focus}を示した場合だけ残します。`,
        `最后两次采用盲听；只有两个标签都正确，而且口头理由指出${focus}而不是音量或音区时才保留。`)[locale],
    ];
  }

  if (lesson.kind === "tap") {
    const eventMap = eventMapFor(lesson, locale);
    const slots = countPhrase(stats.slots, locale,
      l("slot", "posição", "posición", "Platz", "位置", "位置"),
      l("slots", "posições", "posiciones", "Plätze", "位置", "位置"));
    return [
      l(
        `Tap ${target} once in the ${lens}; ${eventMap} fills ${slots} at ${lesson.tempo} BPM without adding sound to a rest.`,
        `Marque ${target} uma vez na ${lens}; ${eventMap} ocupa ${slots} a ${lesson.tempo} BPM sem acrescentar som a uma pausa.`,
        `Marca ${target} una vez en la ${lens}; ${eventMap} ocupa ${slots} a ${lesson.tempo} BPM sin añadir sonido a un silencio.`,
        `Klopfe ${target} einmal im ${lens}; ${eventMap} füllt ${slots} bei ${lesson.tempo} BPM, ohne eine Pause zu vertonen.`,
        `${lens}で${target}を1回叩き、${eventMap}を${lesson.tempo} BPMの${slots}に置いて、休符には音を加えません。`,
        `在${lens}中击打${target}一遍；${eventMap}以${lesson.tempo} BPM填满${slots}，休止处不能增加声音。`)[locale],
      l(
        `Relate ${cue} to this principle: ${concept}; the written attack–rest order must remain physical even when the voice stops counting.`,
        `Relacione ${cue} a este princípio: ${concept}; a ordem ataque–pausa permanece física mesmo quando a voz para de contar.`,
        `Relaciona ${cue} con este principio: ${concept}; el orden ataque–silencio sigue físico aunque la voz deje de contar.`,
        `Verbinde ${cue} mit diesem Prinzip: ${concept}; die notierte Anschlag-Pausen-Folge bleibt körperlich, auch wenn die Stimme schweigt.`,
        `${cue}を「${concept}」という原理と結び、声で数えるのをやめても記譜されたアタックと休符の順序を身体に残します。`,
        `把${cue}与“${concept}”这个原理联系起来；即使停止出声计数，写出的起音与休止顺序仍要保留在动作中。`)[locale],
      l(
        `Count one full bar, then place ${stats.attacks} attacks and ${stats.rests} rests in ${eventMap}; use ${cue} to keep every slot equal.`,
        `Conte um compasso inteiro e coloque ${stats.attacks} ataques e ${stats.rests} pausas em ${eventMap}; use ${cue} para igualar cada posição.`,
        `Cuenta un compás completo y coloca ${stats.attacks} ataques y ${stats.rests} silencios en ${eventMap}; usa ${cue} para igualar cada posición.`,
        `Zähle einen ganzen Takt und setze ${stats.attacks} Anschläge sowie ${stats.rests} Pausen in ${eventMap}; halte mit ${cue} alle Plätze gleich.`,
        `1小節を数えてから${eventMap}に${stats.attacks}回のアタックと${stats.rests}個の休符を置き、${cue}で各位置を均等に保ちます。`,
        `先数完整一小节，再把${stats.attacks}个起音与${stats.rests}个休止放入${eventMap}；依据${cue}让每个位置保持等长。`)[locale],
      l(
        `Internalize ${eventMap} during the ${lens}, keep the counting gesture moving through each rest, and accent only the first slot.`,
        `Internalize ${eventMap} durante a ${lens}, mantenha o gesto da contagem nas pausas e acentue apenas a primeira posição.`,
        `Interioriza ${eventMap} durante la ${lens}, mantén el gesto de contar en los silencios y acentúa solo la primera posición.`,
        `Verinnerliche ${eventMap} im ${lens}, führe die Zählbewegung durch jede Pause und betone nur den ersten Platz.`,
        `${lens}で${eventMap}を内側で言い、各休符でも数える動作を続け、最初の位置だけを強調します。`,
        `在${lens}中默念${eventMap}，每个休止中都继续计数动作，只强调第一个位置。`)[locale],
      l(
        `Repair an extra rest attack by cancelling only that strike while the counting motion continues into the next event of ${eventMap}.`,
        `Corrija um ataque extra na pausa cancelando só esse golpe enquanto o gesto da contagem segue ao próximo evento de ${eventMap}.`,
        `Corrige un ataque extra en el silencio cancelando solo ese golpe mientras el gesto de contar sigue al siguiente evento de ${eventMap}.`,
        `Repariere einen Zusatzanschlag in der Pause, indem nur dieser Schlag ausfällt und die Zählbewegung zum nächsten Ereignis von ${eventMap} weiterläuft.`,
        `休符の余分なアタックは、その打音だけを取り消して修正し、数える動作は${eventMap}の次のイベントへ続けます。`,
        `若休止处多出起音，只取消那一下击打；计数动作继续进入${eventMap}的下一个事件，不要停手重启。`)[locale],
      l(
        `Keep four joined cycles only when ${eventMap} returns to the bar line without an extra attack and every written rest stays silent.`,
        `Guarde quatro ciclos unidos apenas quando ${eventMap} voltar à barra sem ataque extra e cada pausa escrita ficar muda.`,
        `Conserva cuatro ciclos unidos solo cuando ${eventMap} vuelva a la barra sin ataque extra y cada silencio escrito quede mudo.`,
        `Behalte vier verbundene Durchgänge nur, wenn ${eventMap} ohne Zusatzanschlag zum Taktstrich zurückkehrt und jede Pause still bleibt.`,
        `${eventMap}を4周つなぎ、小節線に余分なアタックがなく、すべての記譜休符が無音の場合だけ残します。`,
        `连续完成${eventMap}四轮；只有回到小节线时没有额外起音，而且每个写出休止都完全安静时才保留。`)[locale],
    ];
  }

  throw new Error(`Unsupported harmony lesson kind: ${lesson.kind}`);
}

const ENGLISH_HARMONY_FLOWS = [
  { material: "Read", principle: "Match", setup: "Mark", listen: "Track", repair: "Correct", proof: "Retain" },
  { material: "Build", principle: "Ground", setup: "Set", listen: "Hear", repair: "Rebalance", proof: "Keep" },
  { material: "Count", principle: "Time", setup: "Place", listen: "Follow", repair: "Retime", proof: "Record" },
  { material: "Predict", principle: "Imagine", setup: "Test", listen: "Compare", repair: "Revise", proof: "Confirm" },
  { material: "Compare", principle: "Separate", setup: "Match", listen: "Name", repair: "Isolate", proof: "Choose" },
  { material: "Trace", principle: "Ground", setup: "Set", listen: "Sing", repair: "Reconnect", proof: "Retain" },
  { material: "Sing", principle: "Shape", setup: "Set", listen: "Follow", repair: "Smooth", proof: "Retain" },
  { material: "Mark", principle: "Locate", setup: "Loop", listen: "Hear", repair: "Repair", proof: "Confirm" },
  { material: "Play", principle: "Sustain", setup: "Set", listen: "Continue", repair: "Recover", proof: "Keep" },
  { material: "Move", principle: "Preserve", setup: "Set", listen: "Test", repair: "Adapt", proof: "Keep" },
];

const ENGLISH_HARMONY_REVIEWS = [
  (target, lens, cue) => `Make one diagnostic recording of ${target} in the ${lens}; on playback, mark the first moment where ${cue} succeeds or fails, rehearse that moment twice, and return to the complete example.`,
  (target, lens, cue) => `Play ${target} once without stopping during the ${lens}; write down the first audible problem in ${cue}, repair only that moment, and make a second take without changing register or dynamics.`,
  (target, lens, cue) => `Count through ${target} in the ${lens} before touching the instrument; after one recorded pass, use ${cue} to locate a single weak arrival, loop it twice, and restore the full timing.`,
  (target, lens, cue) => `Predict the hardest boundary in ${target} before the ${lens}; check that prediction against playback, use ${cue} to name what actually changed, and rehearse only the smaller span before another full pass.`,
  (target, lens, cue) => `Compare two takes of ${target} from the ${lens}; keep tempo and volume fixed, judge ${cue} at the same timestamp in both, and retain the take with the clearer harmonic evidence.`,
  (target, lens, cue) => `Trace one outer voice through ${target} during the ${lens}; sing it alone, check ${cue} at each chord boundary, and add the remaining tones only after the line connects without a reset.`,
  (target, lens, cue) => `Sing the defining motion in ${target} before the ${lens}; record the complete texture, inspect ${cue}, and repeat the passage only if the sung destination and played arrival disagree.`,
  (target, lens, cue) => `Mark the beat where ${target} changes during the ${lens}; use ${cue} on playback, isolate one beat before and after that point, and reconnect the surrounding phrase without an extra pause.`,
  (target, lens, cue) => `Play ${target} through the ${lens} with the screen hidden; continue counting after the last event, then inspect ${cue} and name one specific correction before recording the next complete take.`,
  (target, lens, cue) => `Move ${target} through the ${lens} at its written tempo before making any adjustment; test ${cue} from memory, repair the first mismatch, and finish with one uninterrupted pass in the original register.`,
];

const UNIT_ENGLISH_BODY_ANCHORS = {
  "triads-in-practice": ["root–third–fifth roles", "a complete triad sound", "a clear defining interval"],
  "inversions-without-mystery": ["identity above a changed bass", "an audible inversion bass", "stable weight after revoicing"],
  "reading-chord-symbols": ["symbol-to-spelling accuracy", "a voiced written symbol", "the stated root and quality"],
  "clean-chord-changes": ["shared-tone economy", "a gapless hand change", "an even chord arrival"],
  "home-away-back": ["tonic and departure roles", "an audible return home", "a clear home-or-away judgment"],
  "numbers-travel": ["key-independent numeral function", "one route in new keys", "unchanged harmonic direction"],
  "chord-rhythm": ["harmony inside the pulse", "precise chord entrances", "silent rests kept in time"],
  "hearing-chord-quality": ["fixed-root quality contrast", "the changed quality tone", "sound-based quality labels"],
  "first-seventh-chords": ["triad plus seventh color", "an audible added seventh", "a distinct four-note quality"],
  "accompaniment-basics": ["texture serving harmonic time", "a steady accompaniment layer", "balanced bass and chord weight"],
  "function-by-ear": ["tonic–predominant–dominant direction", "function heard before labels", "a correctly predicted destination"],
  "diatonic-sevenths": ["scale-built seventh functions", "a complete diatonic family", "quality matched to scale degree"],
  "minor-progressions": ["minor-mode dominant pull", "a convincing return to minor", "the raised leading-tone effect"],
  "voice-leading-basics": ["distance between individual voices", "small singable voice motion", "a coordinated outer-voice arrival"],
  "inversions-in-motion": ["bass-line choice through inversions", "a singable inverted bass", "smooth weight across chord changes"],
  "cadences-and-phrases": ["function at a phrase boundary", "a placed cadence ending", "the intended closing strength"],
  "progression-grammar": ["function preparing the next function", "a readable harmonic sentence", "a clearly directed ending"],
  "sevenths-in-motion": ["third-and-seventh direction", "audible guide-tone resolution", "stepwise functional arrival"],
  "sixths-and-ninths": ["color above an audible third", "clear sixth-and-ninth spacing", "structure separated from decoration"],
  "hear-write-arrange": ["sound-to-symbol evidence", "a verifiable transcription", "notation matching the recording"],
  "tensions-and-extensions": ["extension priority above the shell", "a controlled tension color", "resolved or retained extensions"],
  "applied-dominants": ["dominant pull toward a temporary tonic", "a brief tonicization", "the intended temporary arrival"],
  "borrowed-harmony": ["borrowed degree against the key", "modal color inside tonality", "a clear return from borrowing"],
  "diminished-augmented-motion": ["altered-chord symmetry", "directed unstable motion", "a named resolution path"],
  "modal-harmony": ["characteristic tone over one center", "sustained modal identity", "color without dominant takeover"],
  modulation: ["evidence for a new tonic", "an audible key change", "a confirmed or rejected modulation"],
  "jazz-cadences": ["shell tones carrying function", "a compact jazz cadence", "third-and-seventh resolution"],
  "harmonic-sequences": ["one repeated sequence cell", "consistent transposed motion", "the cell preserved across levels"],
  reharmonization: ["substitution under a fixed melody", "a melody-safe harmonic change", "the melody retained in context"],
  "form-and-composition": ["contrast between musical sections", "a purposeful formal boundary", "section identity across the form"],
};

function englishAnchoredFrame(lead, anchor, detail, variant) {
  const lowerDetail = lowerFirst(detail, "en");
  const lowerLead = lead.toLocaleLowerCase("en");
  return [
    `${lead} ${anchor}; ${lowerDetail}`,
    `${detail}; ${lowerLead} ${anchor}`,
    `${anchor} sets the test; ${lowerDetail}`,
    `${detail}, using ${anchor}`,
    `For ${anchor}, ${lowerDetail}`,
    `${lead} ${anchor}: ${lowerDetail}`,
    `${anchor} matters here; ${lowerDetail}`,
    `${detail}; judge ${anchor}`,
    `Let ${anchor} guide this: ${lowerDetail}`,
    `${detail}, then ${lowerLead} ${anchor}`,
  ][variant];
}

function compactComparisonFocusEnglish(lesson) {
  const type = comparisonType(lesson);
  if (type === "pitch") {
    if (/intervals:/u.test(`${lesson.a} ${lesson.b}`)) return "changed interval";
    if (/scale:/u.test(`${lesson.a} ${lesson.b}`)) return "scale color";
    return "changed scale degree";
  }
  return {
    transposition: "shared numeral function",
    rhythm: "chord-change rate",
    bass: "bass position",
    voicing: "voicing and register",
    color: "color under the fixed tone",
    route: "route and destination",
  }[type] || "harmonic color";
}

function englishUnitVariant(unitID) {
  return [...unitID].reduce((sum, character) => sum + character.codePointAt(0), 0) % 10;
}

function cleanEnglishClause(value) {
  return String(value || "").replace(/[.!?]$/u, "").trim();
}

function englishUnitAnchors(unitDefinition) {
  const conceptParts = cleanEnglishClause(unitDefinition.concepts.en)
    .split(/\s*;\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    concept: conceptParts[0],
    summary: cleanEnglishClause(unitDefinition.summaries.en),
    proof: conceptParts[1] || cleanEnglishClause(unitDefinition.concepts.en),
  };
}

function englishConceptFrame(anchor, core, variant) {
  const lowerCore = lowerFirst(core, "en");
  const lowerAnchor = lowerFirst(anchor, "en");
  return [
    `${anchor}; ${core}`,
    `${anchor}, so ${lowerCore}`,
    `${core}; this follows because ${lowerAnchor}`,
    `${core}, since ${lowerAnchor}`,
    `Because ${lowerAnchor}, ${lowerCore}`,
    `${core}; hear it through this fact: ${lowerAnchor}`,
    `${anchor}; in practice, ${lowerCore}`,
    `${core}; the useful fact is ${lowerAnchor}`,
    `${anchor}, which means ${lowerCore}`,
    `${core}; that result reflects how ${lowerAnchor}`,
  ][variant];
}

function englishSummaryFrame(summary, core, variant) {
  const lowerSummary = lowerFirst(summary, "en");
  const lowerCore = lowerFirst(core, "en");
  return [
    `${summary}; ${core}`,
    `${core}; the aim is to ${lowerSummary}`,
    `To ${lowerSummary}, ${lowerCore}`,
    `${summary}, so ${lowerCore}`,
    `${core}; use that step to ${lowerSummary}`,
    `${summary}; in sound, ${lowerCore}`,
    `${core}, serving the aim to ${lowerSummary}`,
    `To ${lowerSummary}, first ${lowerCore}`,
    `${summary}; that requires you to ${lowerCore}`,
    `${core}; this is how you ${lowerSummary}`,
  ][variant];
}

function compactOuterPathsEnglish(lesson) {
  const events = sequenceEvents(lesson.sequence, lesson.beat);
  const first = events[0];
  const last = events.at(-1);
  const bassStart = spokenPitch(first.pitches[0], "en");
  const bassEnd = spokenPitch(last.pitches[0], "en");
  const topStart = spokenPitch(first.pitches.at(-1), "en");
  const topEnd = spokenPitch(last.pitches.at(-1), "en");
  return {
    bass: first === last ? bassStart : `${bassStart} → ${bassEnd}`,
    top: first === last ? topStart : `${topStart} → ${topEnd}`,
    boundary: `bass ${bassStart} → ${bassEnd}, top ${topStart} → ${topEnd}`,
  };
}

function compactCompareSideEnglish(value) {
  const intervalMatch = value.match(/intervals:\s*([^|]+)/u);
  const degreeMatch = value.match(/degrees:\s*([^|]+)/u);
  const scaleMatch = value.match(/scale:\s*([^|]+)/u);
  const source = intervalMatch?.[1] || degreeMatch?.[1] || "";
  const values = [...source.matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => match[0]).slice(0, 4);
  const label = intervalMatch ? "semitones" : "degrees";
  const scaleName = scaleMatch?.[1].trim();
  return [scaleName, values.length ? `${label} ${values.join("–")}` : "written values"].filter(Boolean).join(", ");
}

function compareDifferenceEnglish(lesson) {
  const values = (value) => {
    const match = value.match(/(?:intervals|degrees):\s*([^|]+)/u);
    return match ? [...match[1].matchAll(/-?\d+(?:\.\d+)?/gu)].map((entry) => entry[0]) : [];
  };
  const leftValues = values(lesson.a);
  const rightValues = values(lesson.b);
  const changedIndex = leftValues.findIndex((value, position) => value !== rightValues[position]);
  if (changedIndex >= 0) return `A ${leftValues[changedIndex]} against B ${rightValues[changedIndex]}`;
  const scaleName = (value) => value.match(/scale:\s*([^|]+)/u)?.[1].trim();
  const leftScale = scaleName(lesson.a);
  const rightScale = scaleName(lesson.b);
  if (leftScale && rightScale && leftScale !== rightScale) return `A ${leftScale} against B ${rightScale}`;
  return `A ${compactCompareSideEnglish(lesson.a)} against B ${compactCompareSideEnglish(lesson.b)}`;
}

function legacyEnglishHarmonyBodyFacts(unitDefinition, lesson, index) {
  const target = lesson.target.en;
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id].en;
  const lens = PRACTICE_LENSES[index].en;
  const concept = unitConceptClause(unitDefinition, "en");
  const goal = unitDefinition.summaries.en.replace(/[.!?]$/u, "");
  const stats = materialStats(lesson);

  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major).en;
    const style = STYLE_NAMES[lesson.style].en;
    const pairedStyle = lesson.style === "block" ? STYLE_NAMES.arpeggio.en : style;
    return [
      `Study ${target} through the ${lens}; ${style} at ${lesson.tempo} BPM keeps ${focus} exposed above its even root.`,
      `${concept}; let ${focus} stay audible in ${style}, with every supporting tone lighter than the defining interval.`,
      `Use ${cue} for ${lesson.repeats} ${style} attacks; fixed register and dynamics make ${focus} a fair test.`,
      `${goal}; during the ${lens}, sing ${focus} against the held root and rebuild the same spelling one tone at a time.`,
      `If ${cue} blurs, soften the tone covering ${focus}; preserve voicing width and root weight instead of striking harder.`,
      `Keep ${target} after three ${pairedStyle} attacks only if ${focus} starts clearly, every tone lands together, and the release is simultaneous.`,
    ];
  }

  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      const [left, right] = lesson.alternatives;
      const leftTokens = left.numerals.trim().split(/\s+/u);
      const rightTokens = right.numerals.trim().split(/\s+/u);
      const leftEnding = leftTokens.slice(-2).join(" → ");
      const rightEnding = rightTokens.slice(-2).join(" → ");
      const leftBeats = leftTokens.length * lesson.beats;
      const rightBeats = rightTokens.length * lesson.beats;
      return [
        `Read ${target} through the ${lens}; A lasts ${leftBeats} beats, B lasts ${rightBeats}, and neither route continues into the other.`,
        `${concept}; ${functionRouteFor(lesson, "en")} gives two destinations whose final function must be heard separately.`,
        `Use ${cue} while counting A, ${left.numerals}, then one silent beat before B, ${right.numerals}, at ${lesson.tempo} BPM.`,
        `${goal}; in the ${lens}, sing both bass routes and compare ${leftEnding} directly with ${rightEnding}.`,
        `If ${cue} loses the destination, loop ${leftEnding} and ${rightEnding} separately with equal chord lengths before alternating again.`,
        `Keep ${target} after two blind comparisons only when both clocks stay complete and each ending is named as closing, delaying, or redirecting.`,
      ];
    }
    const tokens = lesson.numerals.trim().split(/\s+/u);
    const finalPair = tokens.slice(-2).join(" → ");
    const route = functionRouteFor(lesson, "en");
    return [
      `Read ${target} through the ${lens}; ${route} places ${stats.chordCount} changes across ${stats.totalBeats} beats with ${spokenPitch(lesson.key, "en")} as tonic.`,
      `${concept}; ${route} should point toward each coming bass root before the next chord sounds.`,
      `Use ${cue} while counting ${lesson.beats} beats for every chord in ${lesson.numerals}; keep all ${stats.chordCount} changes equal.`,
      `${goal}; in the ${lens}, sing the bass route and hear ${finalPair} as the final functional arrival.`,
      `If ${cue} arrives late, loop ${finalPair} twice at ${lesson.beats} beats per chord, then reconnect the earlier functions without stopping.`,
      `Keep ${target} after two takes at ${lesson.tempo} BPM only when ${finalPair} stays even and its ending is named as closing, delaying, or redirecting.`,
    ];
  }

  if (lesson.kind === "notes") {
    const paths = compactOuterPathsEnglish(lesson);
    const voicings = stats.eventCount === 1 ? "one written voicing" : `${stats.eventCount} written voicings`;
    const tendency = namedTendencyFor(lesson, "en");
    const repair = stats.eventCount === 1
      ? `soften only the inner tone masking ${paths.bass} or ${paths.top}; keep the written register unchanged`
      : tendency
        ? `isolate ${tendency}, repeat those resolutions, then restore all ${stats.eventCount} voicings`
        : `loop the last two events around ${paths.boundary} until both outer voices arrive together twice`;
    const proof = stats.eventCount === 1
      ? `three attacks whose bass and top begin and release together`
      : `two uninterrupted ${stats.totalBeats}-beat takes whose outer voices meet every boundary together`;
    return [
      `Read ${target} through the ${lens}; ${voicings} span ${stats.totalBeats} beats, with ${paths.boundary} defining the outer motion.`,
      `${concept}; bracketed pitches begin together while bass ${paths.bass} and top ${paths.top} reveal direction.`,
      `Use ${cue} at ${lesson.tempo} BPM; play ${voicings}, then sing bass ${paths.bass} and top ${paths.top} separately.`,
      `${goal}; during the ${lens}, hear ${paths.boundary} as coordinated voices rather than one flattened melody.`,
      `If ${cue} weakens, ${repair}.`,
      `Keep ${target} only after ${proof}, with every pitch remaining in its written register.`,
    ];
  }

  if (lesson.kind === "compare") {
    const focus = comparisonFocus(lesson, "en");
    const left = compactCompareSideEnglish(lesson.a);
    const right = compactCompareSideEnglish(lesson.b);
    const difference = compareDifferenceEnglish(lesson);
    return [
      `Hear ${target} through the ${lens}; hold root, register, volume, and touch steady while ${focus} changes.`,
      `${concept}; the controlled difference in ${focus} must explain why A and B carry different color or function.`,
      `Use ${cue} at ${lesson.tempo} BPM while alternating A, ${left}, with B, ${right}, four times and leaving one silent beat.`,
      `${goal}; during the ${lens}, sing the first changed tone before either A or B is revealed.`,
      `If ${cue} gives an uncertain answer, isolate ${difference}; then restore matched volume and the silent beat.`,
      `Keep ${target} after two blind trials only when both labels are correct and the spoken reason identifies ${focus}.`,
    ];
  }

  if (lesson.kind === "tap") {
    const eventMap = eventMapFor(lesson, "en");
    return [
      `Tap ${target} through the ${lens}; ${eventMap} fills ${stats.slots} equal slots at ${lesson.tempo} BPM without sounding a rest.`,
      `${concept}; the written attack-rest order must remain physical after the spoken count becomes silent.`,
      `Use ${cue} after one full count-in; place ${stats.attacks} attacks and ${stats.rests} rests in ${eventMap}.`,
      `${goal}; during the ${lens}, keep the counting gesture moving through each rest and accent only the first slot.`,
      `If ${cue} breaks at a rest, cancel that strike while the hand continues toward the next written attack.`,
      `Keep ${target} after four joined cycles only when the bar line has no extra strike and every written rest stays silent.`,
    ];
  }

  throw new Error(`Unsupported English harmony lesson kind: ${lesson.kind}`);
}

function englishHarmonyBodyFacts(unitDefinition, lesson, index) {
  const target = lesson.target.en;
  const displayTarget = target.replace(/(?<=\d)\.(?=\d)/gu, "．");
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id].en;
  const lens = PRACTICE_LENSES[index].en;
  const anchors = UNIT_ENGLISH_BODY_ANCHORS[unitDefinition.id];
  const variant = englishUnitVariant(unitDefinition.id);
  const flow = ENGLISH_HARMONY_FLOWS[index];
  const stats = materialStats(lesson);
  const review = ENGLISH_HARMONY_REVIEWS[index](displayTarget, lens, cue);

  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major).en;
    const style = STYLE_NAMES[lesson.style].en;
    const pairedStyle = lesson.style === "block" ? STYLE_NAMES.arpeggio.en : style;
    return [
      `${flow.material} ${displayTarget} in the ${lens}; ${style} at ${lesson.tempo} BPM exposes ${focus} above its root.`,
      `${englishAnchoredFrame(flow.principle, anchors[0], `Keep ${focus} audible through ${style}, with support tones lighter`, variant)}.`,
      `${flow.setup} ${cue} with ${lesson.repeats} ${style} attacks; hold the register while ${focus} remains easy to judge.`,
      `${englishAnchoredFrame(flow.listen, anchors[1], `Sing ${focus} in the ${lens}, then rebuild ${style} from the root`, variant)}.`,
      review,
      `${flow.repair} ${cue} by softening the tone over ${focus}; preserve ${style} width and root weight.`,
      `${englishAnchoredFrame(flow.proof, anchors[2], `${index % 2 === 0 ? "Keep" : "Retain"} three ${pairedStyle} attacks with clear ${focus}, aligned ${style} tones, and one release`, (variant + 3) % 10)}.`,
    ];
  }

  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      const [left, right] = lesson.alternatives;
      const leftTokens = left.numerals.trim().split(/\s+/u);
      const rightTokens = right.numerals.trim().split(/\s+/u);
      const leftEnding = leftTokens.slice(-2).join(" to ");
      const rightEnding = rightTokens.slice(-2).join(" to ");
      const route = functionRouteFor(lesson, "en");
      return [
        `${flow.material} ${displayTarget} in the ${lens}; A lasts ${leftTokens.length * lesson.beats} beats and B lasts ${rightTokens.length * lesson.beats}.`,
        `${englishAnchoredFrame(flow.principle, anchors[0], `Hear separate destinations in ${route}`, variant)}.`,
        `${flow.setup} ${cue} by counting A ${left.numerals}, one silent beat, then B ${right.numerals} at ${lesson.tempo} BPM.`,
        `${englishAnchoredFrame(flow.listen, anchors[1], `Sing both bass routes in the ${lens}; compare ${leftEnding} with ${rightEnding}`, variant)}.`,
        review,
        `${flow.repair} ${cue} by looping ${leftEnding} and ${rightEnding} separately; match every chord length before alternating.`,
        `${englishAnchoredFrame(flow.proof, anchors[2], "Keep two blind comparisons with complete timing and named destinations", (variant + 3) % 10)}.`,
      ];
    }
    const tokens = lesson.numerals.trim().split(/\s+/u);
    const finalPair = tokens.slice(-2).join(" to ");
    const route = functionRouteFor(lesson, "en");
    return [
      `${flow.material} ${displayTarget} in the ${lens}; ${spokenPitch(lesson.key, "en")} stays tonic across ${stats.totalBeats} beats.`,
      `${englishAnchoredFrame(flow.principle, anchors[0], index % 2 === 0 ? `Hear ${route} point toward each coming bass root` : `Hear ${route} prepare each next bass root in order`, variant)}.`,
      index % 2 === 0
        ? `${flow.setup} ${cue} by counting ${lesson.beats} beats per chord in ${lesson.numerals}; keep ${stats.chordCount} changes equal.`
        : `${flow.setup} ${cue} by giving each chord ${lesson.beats} beats while reading ${lesson.numerals}; keep all ${stats.chordCount} changes equal.`,
      `${englishAnchoredFrame(flow.listen, anchors[1], index % 2 === 0 ? `Sing the bass in the ${lens}; hear ${finalPair} as one arrival` : `Trace ${finalPair} through every bass root in the ${lens}; connect the pair as one arrival`, variant)}.`,
      review,
      index % 2 === 0
        ? `${flow.repair} ${cue} by looping ${finalPair} twice; keep ${lesson.beats} beats per chord before reconnecting earlier functions.`
        : `${flow.repair} ${cue} by repeating ${finalPair} twice; give each chord ${lesson.beats} beats, then restore the earlier functions.`,
      `${englishAnchoredFrame(flow.proof, anchors[2], index % 2 === 0 ? `Keep two ${lesson.tempo}-BPM takes with even ${finalPair} and a named ending` : `Retain a pair of takes at ${lesson.tempo} BPM with matched ${finalPair} timing and a named ending`, (variant + 3) % 10)}.`,
    ];
  }

  if (lesson.kind === "notes") {
    const paths = compactOuterPathsEnglish(lesson);
    const voicings = stats.eventCount === 1 ? "one written voicing" : `${stats.eventCount} written voicings`;
    const tendency = namedTendencyFor(lesson, "en");
    const repair = stats.eventCount === 1
      ? `soften the inner tone masking ${paths.bass} or ${paths.top}; keep its written register`
      : tendency
        ? `isolate ${tendency}; repeat those resolutions before restoring ${stats.eventCount} voicings`
        : index % 2 === 0
          ? `loop the last events at ${paths.boundary}; align both arrivals twice`
          : `repeat the closing boundary at ${paths.boundary}; coordinate both arrivals twice`;
    const proof = stats.eventCount === 1
      ? `three attacks with bass ${paths.bass}, top ${paths.top}, and one release`
      : index % 2 === 0
        ? `two ${stats.totalBeats}-beat takes with ${paths.boundary} aligned at every change`
        : `a pair of ${stats.totalBeats}-beat passes aligning ${paths.boundary} at every change`;
    return [
      `${flow.material} ${displayTarget} in the ${lens}; ${voicings} span ${stats.totalBeats} beats through ${paths.boundary}.`,
      `${englishAnchoredFrame(flow.principle, anchors[0], index % 2 === 0 ? `Match bass ${paths.bass} with top ${paths.top}; begin each bracket together` : `Align bass ${paths.bass} with top ${paths.top}; attack each bracket together`, variant)}.`,
      index % 2 === 0
        ? `${flow.setup} ${cue} at ${lesson.tempo} BPM; play ${voicings}, then sing ${paths.bass} below ${paths.top}.`
        : `${flow.setup} ${cue} at ${lesson.tempo} BPM; sing ${paths.bass} below ${paths.top}, then play ${voicings}.`,
      `${englishAnchoredFrame(flow.listen, anchors[1], index % 2 === 0 ? `Hear ${paths.boundary} in the ${lens}, never as one melody` : `Keep ${paths.boundary} as separate outer lines through the ${lens}`, variant)}.`,
      review,
      `${flow.repair} ${cue}: ${repair}.`,
      `${englishAnchoredFrame(flow.proof, anchors[2], index % 2 === 0 ? `Keep ${proof} in the written register` : `Retain ${proof} without changing register`, (variant + 3) % 10)}.`,
    ];
  }

  if (lesson.kind === "compare") {
    const focus = compactComparisonFocusEnglish(lesson);
    const left = compactCompareSideEnglish(lesson.a);
    const right = compactCompareSideEnglish(lesson.b);
    const difference = compareDifferenceEnglish(lesson);
    return [
      `${flow.material} ${displayTarget} in the ${lens}; hold root, register, volume, and touch while ${focus} changes.`,
      `${englishAnchoredFrame(flow.principle, anchors[0], `Separate A from B through ${focus}, not loudness`, variant)}.`,
      `${flow.setup} ${cue} at ${lesson.tempo} BPM; alternate A ${left} with B ${right}, leaving one silent beat.`,
      `${englishAnchoredFrame(flow.listen, anchors[1], `Sing ${difference} in the ${lens} before either label appears`, variant)}.`,
      review,
      `${flow.repair} ${cue} by isolating ${difference}; restore matched volume and one silent beat.`,
      `${englishAnchoredFrame(flow.proof, anchors[2], `Keep two blind labels with a spoken reason naming ${focus}`, (variant + 3) % 10)}.`,
    ];
  }

  if (lesson.kind === "tap") {
    const eventMap = eventMapFor(lesson, "en");
    return [
      `${flow.material} ${displayTarget} in the ${lens}; ${eventMap} fills ${stats.slots} equal slots at ${lesson.tempo} BPM.`,
      `${englishAnchoredFrame(flow.principle, anchors[0], `Keep ${eventMap} physical through every silent slot`, variant)}.`,
      `${flow.setup} ${cue} after one count-in; place ${stats.attacks} attacks and ${stats.rests} rests in ${eventMap}.`,
      `${englishAnchoredFrame(flow.listen, anchors[1], `Carry the ${lens} count through each rest; accent slot one`, variant)}.`,
      review,
      `${flow.repair} ${cue} by cancelling the rest strike; continue the hand toward the next attack.`,
      `${englishAnchoredFrame(flow.proof, anchors[2], `Keep four joined cycles with a clean bar line and ${stats.rests} silent rests`, (variant + 3) % 10)}.`,
    ];
  }

  throw new Error(`Unsupported English harmony lesson kind: ${lesson.kind}`);
}

function englishConciseLessonBody(unitDefinition, lesson, index) {
  const facts = englishHarmonyBodyFacts(unitDefinition, lesson, index);
  return `# ${localizedTitle(lesson.action, lesson.target, "en")}\n\n${facts.slice(0, 4).join(" ")}\n\n${facts.slice(4).join(" ")}\n\n:::checkpoint ${checkpoint(lesson, "en")}`;
}

function localizedHarmonyReview(unitDefinition, lesson, locale, index) {
  const target = lesson.target[locale];
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const lens = PRACTICE_LENSES[index][locale];
  return l(
    `Record ${target} once in full, then use ${cue} to inspect the first boundary in the ${lens}; repair only that point twice and return to the original tempo and register.`,
    `Grave ${target} uma vez por inteiro e use ${cue} para conferir o primeiro limite na ${lens}; corrija apenas esse ponto duas vezes e volte ao andamento e registro originais.`,
    `Graba ${target} una vez completa y usa ${cue} para revisar el primer límite de la ${lens}; corrige solo ese punto dos veces y vuelve al tempo y registro originales.`,
    `Nimm ${target} einmal vollständig im ${lens} auf; prüfe ${cue} an der ersten Grenze, repariere nur diese Stelle zweimal und kehre dann zu Originaltempo und -lage zurück.`,
    `${target}を${lens}で一度通して録音し、${cue}で最初の境目を確認します。そこだけを2回直してから元のテンポと音域へ戻します。`,
    `先把${target}在${lens}中完整录一遍，再用${cue}检查第一个边界；只循环修正该处两次，随后回到原速度和音区，不要改动其他事件。`
  )[locale];
}

function splitLocalizedRunOnFact(value, locale) {
  const cjk = locale === "ja" || locale === "zh-Hans";
  const splitSegment = (segment) => {
    const trimmed = segment.trim();
    if (proseUnits(trimmed) <= 45) return trimmed;
    const candidates = [...trimmed.matchAll(/[;；,，、:：]/gu)]
      .map((match) => match.index)
      .filter((position) => (
        proseUnits(trimmed.slice(0, position)) >= 8
        && proseUnits(trimmed.slice(position + 1)) >= 8
      ));
    if (!candidates.length) return trimmed;
    const midpoint = trimmed.length / 2;
    const position = candidates.sort((left, right) => (
      Math.abs(left - midpoint) - Math.abs(right - midpoint)
    ))[0];
    const first = trimmed.slice(0, position).trim();
    let rest = trimmed.slice(position + 1).trim();
    if (!cjk) {
      rest = rest.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase(locale));
    }
    return `${first}${cjk ? "。" : ". "}${splitSegment(rest)}`;
  };
  return (String(value || "")
    .match(/[^.!?。！？]+[.!?。！？]?/gu) || [])
    .map(splitSegment)
    .join(cjk ? "" : " ");
}

function conciseLessonBody(unitDefinition, lesson, locale, index) {
  if (locale === "en") return englishConciseLessonBody(unitDefinition, lesson, index);
  const facts = harmonyBodyFacts(unitDefinition, lesson, locale, index);
  const joiner = locale === "ja" || locale === "zh-Hans" ? "" : " ";
  const cue = UNIT_PRACTICE_CUES[unitDefinition.id][locale];
  const lens = PRACTICE_LENSES[index][locale];
  const unitMarker = l(
    `Use ${cue} as the final check for the ${lens}.`,
    `Use ${cue} como verificação final da ${lens}.`,
    `Usa ${cue} como comprobación final de la ${lens}.`,
    `Nutze ${cue} als letzte Prüfung im ${lens}.`,
    `最後に${lens}の${cue}を確認します。`,
    `最后复核${lens}中的${cue}。`
  )[locale];
  const render = (selectedFacts) => {
    const breakAt = Math.ceil(selectedFacts.length / 2);
    const secondParagraph = [...selectedFacts.slice(breakAt), unitMarker].join(joiner);
    return `# ${localizedTitle(lesson.action, lesson.target, locale)}\n\n${selectedFacts.slice(0, breakAt).join(joiner)}\n\n${secondParagraph}\n\n:::checkpoint ${checkpoint(lesson, locale)}`;
  };
  let selectedFacts = [...facts];
  for (const removableIndex of [3, 1]) {
    if (proseUnits(render(selectedFacts)) <= 180) break;
    const fact = facts[removableIndex];
    const candidate = selectedFacts.filter((entry) => entry !== fact);
    if (proseUnits(render(candidate)) >= 120) selectedFacts = candidate;
  }
  if (proseUnits(render(selectedFacts)) < 120) {
    selectedFacts.push(localizedHarmonyReview(unitDefinition, lesson, locale, index));
  }
  selectedFacts = selectedFacts.map((fact) => splitLocalizedRunOnFact(fact, locale));
  return render(selectedFacts);
}

const TARGET_REPLACEMENTS = [
  ["as a block chord", l("as a block chord", "em bloco", "en bloque", "als Blockakkord", "（ブロック・コード）", "（柱式和弦）")],
  ["as an arpeggio", l("as an arpeggio", "como arpejo", "como arpegio", "als Arpeggio", "（アルペジオ）", "（琶音）")],
  ["with an even strum", l("with an even strum", "com batida regular", "con rasgueo regular", "mit gleichmäßigem Anschlag", "（均等なストラム）", "（均匀扫弦）")],
  ["bass–chord in C", l("bass–chord in C", "baixo–acorde em C", "bajo–acorde en C", "Bass–Akkord in C", "Cの低音–コード", "C中的低音–和弦")],
  ["one per bar", l("one per bar", "um por compasso", "uno por compás", "einer pro Takt", "1小節に1コード", "每小节一个")],
  ["two per bar", l("two per bar", "dois por compasso", "dos por compás", "zwei pro Takt", "1小節に2コード", "每小节两个")],
  ["count-in", l("count-in", "contagem de entrada", "cuenta de entrada", "Einzählen", "カウントイン", "预备拍")],
  ["by step", l("by step", "por grau conjunto", "por grado conjunto", "schrittweise", "（順次進行）", "（级进）")],
  ["root / inversion", l("root / inversion", "fundamental / inversão", "fundamental / inversión", "Grundton / Umkehrung", "ルート / 転回形", "根音 / 转位")],
  ["bass roots", l("bass roots", "fundamentais do baixo", "fundamentales del bajo", "Bassgrundtöne", "低音のルート", "低音根音")],
  ["bass 1–7–6", l("bass 1–7–6", "baixo 1–7–6", "bajo 1–7–6", "Bass 1–7–6", "低音1–7–6", "低音1–7–6")],
  ["C pedal", l("C pedal", "pedal de C", "pedal de C", "C-Pedal", "Cペダル", "C持续低音")],
  ["D pedal under Dm–G", l("D pedal under Dm–G", "pedal de D sob Dm–G", "pedal de D bajo Dm–G", "D-Pedal unter Dm–G", "Dm–G下のDペダル", "Dm–G下方的D持续音")],
  ["pedal under", l("pedal under", "pedal sob", "pedal bajo", "Pedal unter", "下のペダル", "下方持续音")],
  ["guide tones", l("guide tones", "notas-guia", "notas guía", "Leittöne", "ガイドトーン", "导向音")],
  ["stepwise / wide", l("stepwise / wide", "conjunto / amplo", "conjunto / amplio", "schrittweise / weit", "順次 / 広い跳躍", "级进 / 大跳")],
  ["triads / sevenths", l("triads / sevenths", "tríades / sétimas", "tríadas / séptimas", "Dreiklänge / Septakkorde", "トライアド / セブンス", "三和弦 / 七和弦")],
  ["above A", l("above A", "sobre A", "sobre A", "über A", "A上", "A上方")],
  ["over G7–C", l("over G7–C", "sobre G7–C", "sobre G7–C", "über G7–C", "G7–C上", "G7–C上方")],
  ["with D on top", l("with D on top", "com D no topo", "con D arriba", "mit D oben", "（トップにD）", "（D在顶声部）")],
  ["with E on top", l("with E on top", "com E no topo", "con E arriba", "mit E oben", "（トップにE）", "（E在顶声部）")],
  ["with D melody", l("with D melody", "com melodia em D", "con melodía en D", "mit D in der Melodie", "（メロディーはD）", "（旋律音D）")],
  ["in open spacing", l("in open spacing", "em abertura espaçada", "en disposición abierta", "in weiter Lage", "（オープン配置）", "（开放排列）")],
  ["without D", l("without D", "sem D", "sin D", "ohne D", "（D省略）", "（省略D）")],
  ["without G", l("without G", "sem G", "sin G", "ohne G", "（G省略）", "（省略G）")],
  ["B against C", l("B against C", "B contra C", "B contra C", "H gegen C", "BとCの衝突", "B与C的冲突")],
  ["with C held", l("with C held", "com C sustentado", "con C sostenido", "mit gehaltenem C", "（Cを保持）", "（保持C）")],
  ["shells", l("shells", "aberturas shell", "disposiciones shell", "Shell-Voicings", "シェル・ボイシング", "壳式配置")],
  ["backdoor", l("backdoor", "backdoor", "backdoor", "Backdoor", "バックドア", "后门进行")],
  ["descending fifths", l("descending fifths", "quintas descendentes", "quintas descendentes", "fallende Quinten", "下降5度進行", "下行五度")],
  ["over C–Dm–Em", l("over C–Dm–Em", "sobre C–Dm–Em", "sobre C–Dm–Em", "über C–Dm–Em", "C–Dm–Em上", "C–Dm–Em上方")],
  ["melody over", l("melody over", "melodia sobre", "melodía sobre", "Melodie über", "メロディー：", "旋律位于")],
  ["under E", l("under E", "sob E", "bajo E", "unter E", "（上声E）", "（上声E）")],
  ["under A", l("under A", "sob A", "bajo A", "unter A", "（上声A）", "（上声A）")],
  ["under F", l("under F", "sob F", "bajo F", "unter F", "（上声F）", "（上声F）")],
  ["eight bars", l("eight bars", "oito compassos", "ocho compases", "acht Takte", "8小節", "八小节")],
  ["at 4 / 2 beats", l("at 4 / 2 beats", "com 4 / 2 tempos", "con 4 / 2 pulsos", "mit 4 / 2 Schlägen", "（4拍 / 2拍）", "（4拍 / 2拍）")],
  ["verse", l("verse", "estrofe", "estrofa", "Strophe", "ヴァース", "主歌")],
  ["chorus", l("chorus", "refrão", "estribillo", "Refrain", "コーラス", "副歌")],
  ["section", l("section", "seção", "sección", "Abschnitt", "セクション", "段落")],
  ["bridge", l("bridge", "ponte", "puente", "Bridge", "ブリッジ", "桥段")],
  ["harmonic map", l("harmonic map", "mapa harmônico", "mapa armónico", "Harmonieplan", "和声マップ", "和声图")],
  ["parallel", l("parallel", "paralelo", "paralelo", "parallel", "平行調", "同主音")],
  ["A minor", l("A minor", "A menor", "La menor", "a-Moll", "Aマイナー", "A小调")],
  ["Dorian", l("Dorian", "Dórico", "Dórico", "Dorisch", "ドリアン", "多利亚")],
  ["Mixolydian", l("Mixolydian", "Mixolídio", "Mixolidio", "Mixolydisch", "ミクソリディアン", "混合利底亚")],
  ["Phrygian", l("Phrygian", "Frígio", "Frigio", "Phrygisch", "フリジアン", "弗里几亚")],
  ["Lydian", l("Lydian", "Lídio", "Lidio", "Lydisch", "リディアン", "利底亚")],
  ["Aeolian", l("Aeolian", "Eólio", "Eolio", "Äolisch", "エオリアン", "爱奥尼亚小调式")],
];

function translatedTarget(value, locale) {
  let result = value;
  for (const [source, translations] of [...TARGET_REPLACEMENTS].sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(source).join(translations[locale]);
  }
  const inMode = result.match(/^(.*) in ([A-G](?:♯|♭|#|b)?) (.+)$/);
  if (inMode) {
    if (["ja", "zh-Hans"].includes(locale)) result = `${inMode[2]} ${inMode[3]}: ${inMode[1]}`;
    else {
      const preposition = { "pt-BR": "em", es: "en", de: "in" }[locale];
      result = `${inMode[1]} ${preposition} ${inMode[2]} ${inMode[3]}`;
    }
  }
  const inKey = result.match(/^(.*) in ([A-G](?:♯|♭|#|b)?)$/);
  if (inKey) {
    if (["ja", "zh-Hans"].includes(locale)) result = `${inKey[2]}: ${inKey[1]}`;
    else {
      const preposition = { "pt-BR": "em", es: "en", de: "in" }[locale];
      result = `${inKey[1]} ${preposition} ${inKey[2]}`;
    }
  }
  return result;
}

function targetForLocale(unitDefinition, lesson, index, locale) {
  if (locale === "en") return lesson.target.en;
  return translatedTarget(lesson.target[locale], locale);
}

const ACTION_LEADS = {
  play: l(
    (u, t) => `In ${u}, play ${t} with an even pulse before changing tempo or register. `,
    (u, t) => `Em ${u}, toque ${t} com pulso regular antes de mudar andamento ou registro. `,
    (u, t) => `En ${u}, toca ${t} con pulso regular antes de cambiar tempo o registro. `,
    (u, t) => `Spiele in ${u} das Material ${t} mit gleichmäßigem Puls, bevor du Tempo oder Lage änderst. `,
    (u, t) => `「${u}」では、テンポや音域を変える前に${t}を均等な拍で弾きます。`,
    (u, t) => `在“${u}”中，先用均匀拍点弹奏${t}，再考虑改变速度或音区。`),
  build: l(
    (u, t) => `For ${u}, assemble ${t} from the root outward and check every interval before combining the tones. `,
    (u, t) => `Em ${u}, monte ${t} a partir da fundamental e confira cada intervalo antes de reunir as notas. `,
    (u, t) => `En ${u}, construye ${t} desde la fundamental y comprueba cada intervalo antes de reunir las notas. `,
    (u, t) => `Baue in ${u} das Material ${t} vom Grundton aus und prüfe jedes Intervall vor dem Zusammenklang. `,
    (u, t) => `「${u}」では、${t}をルートから組み立て、重ねる前に各音程を確認します。`,
    (u, t) => `在“${u}”中，从根音开始构建${t}，叠合前逐一核对音程。`),
  hear: l(
    (u, t) => `In ${u}, hear ${t} once without playing, make one prediction, and use the next pass to verify it. `,
    (u, t) => `Em ${u}, escute ${t} uma vez sem tocar, faça uma previsão e use a passagem seguinte para conferi-la. `,
    (u, t) => `En ${u}, escucha ${t} una vez sin tocar, haz una predicción y usa la pasada siguiente para comprobarla. `,
    (u, t) => `Höre in ${u} das Material ${t} einmal ohne mitzuspielen, formuliere eine Vorhersage und prüfe sie im nächsten Durchgang. `,
    (u, t) => `「${u}」では、${t}を演奏せずに一度聴き、予想してから次の再生で確かめます。`,
    (u, t) => `在“${u}”中，先只听${t}一遍，作出一个预测，再用下一遍核对。`),
  compare: l(
    (u, t) => `For ${u}, compare both parts of ${t} with identical timing and name the single musical difference. `,
    (u, t) => `Em ${u}, compare as duas partes de ${t} com duração idêntica e diga uma única diferença musical. `,
    (u, t) => `En ${u}, compara las dos partes de ${t} con duración idéntica y nombra una sola diferencia musical. `,
    (u, t) => `Vergleiche in ${u} beide Teile von ${t} bei identischem Timing und nenne den einen musikalischen Unterschied. `,
    (u, t) => `「${u}」では、${t}の両方を同じ長さで比べ、音楽的な違いを一つ言います。`,
    (u, t) => `在“${u}”中，用相同时值比较${t}的两部分，并说出一个音乐差异。`),
  tap: l(
    (u, t) => `In ${u}, tap ${t} while counting every sounding attack and every rest aloud. `,
    (u, t) => `Em ${u}, marque ${t} contando em voz alta cada ataque e cada pausa. `,
    (u, t) => `En ${u}, marca ${t} contando en voz alta cada ataque y cada silencio. `,
    (u, t) => `Klopfe in ${u} das Muster ${t} und zähle jeden Anschlag sowie jede Pause laut. `,
    (u, t) => `「${u}」では、${t}のアタックと休符をすべて数えながら叩きます。`,
    (u, t) => `在“${u}”中，击打${t}，并大声数出每个起音与休止。`),
  follow: l(
    (u, t) => `In ${u}, follow one named voice through ${t}; sing that line before playing the complete texture. `,
    (u, t) => `Em ${u}, acompanhe uma voz nomeada em ${t}; cante essa linha antes de tocar a textura completa. `,
    (u, t) => `En ${u}, sigue una voz nombrada en ${t}; canta esa línea antes de tocar la textura completa. `,
    (u, t) => `Verfolge in ${u} eine benannte Stimme durch ${t} und singe sie vor der vollständigen Textur. `,
    (u, t) => `「${u}」では、${t}の一声部を追い、全体を弾く前にその線を歌います。`,
    (u, t) => `在“${u}”中，跟随${t}的一条指定声部，并在弹完整织体前唱出该线条。`),
  read: l(
    (u, t) => `For ${u}, read every symbol in ${t} aloud, state its root or function, then verify it with playback. `,
    (u, t) => `Em ${u}, leia em voz alta cada símbolo de ${t}, diga a fundamental ou função e confira na reprodução. `,
    (u, t) => `En ${u}, lee en voz alta cada símbolo de ${t}, di la fundamental o función y compruébalo al reproducir. `,
    (u, t) => `Lies in ${u} jedes Symbol von ${t} laut, nenne Grundton oder Funktion und prüfe es beim Abspielen. `,
    (u, t) => `「${u}」では、${t}の記号を読み、ルートまたは機能を言ってから再生で確認します。`,
    (u, t) => `在“${u}”中，读出${t}的每个符号，说出根音或功能，再用播放核对。`),
  write: l(
    (u, t) => `In ${u}, write ${t} before replaying it, then circle the bass motion or altered tone that explains the sound. `,
    (u, t) => `Em ${u}, escreva ${t} antes de reproduzir e circule o movimento do baixo ou a nota alterada que explica o som. `,
    (u, t) => `En ${u}, escribe ${t} antes de reproducir y rodea el movimiento del bajo o la nota alterada que explica el sonido. `,
    (u, t) => `Schreibe in ${u} das Material ${t} vor dem Abspielen auf und markiere Bassweg oder Alteration, die den Klang erklärt. `,
    (u, t) => `「${u}」では、${t}を再生前に書き、響きを説明する低音の動きまたは変化音を囲みます。`,
    (u, t) => `在“${u}”中，播放前写出${t}，并圈出解释声音的低音移动或变化音。`),
  keep: l(
    (u, t) => `For ${u}, keep the named pitch present through ${t} and check that its attack does not restart between chords. `,
    (u, t) => `Em ${u}, mantenha a nota indicada durante ${t} e confira se o ataque não recomeça entre os acordes. `,
    (u, t) => `En ${u}, mantén la nota indicada durante ${t} y comprueba que no vuelva a atacarse entre acordes. `,
    (u, t) => `Halte in ${u} den benannten Ton durch ${t} und achte darauf, dass er zwischen den Akkorden nicht neu angeschlagen wird. `,
    (u, t) => `「${u}」では、${t}の指定音を保ち、コード間で弾き直さないよう確認します。`,
    (u, t) => `在“${u}”中，保持${t}中的指定音，并确认换和弦时不重新起音。`),
  resolve: l(
    (u, t) => `In ${u}, identify the active tone in ${t}, sing its destination, and only then play the resolution. `,
    (u, t) => `Em ${u}, identifique a nota ativa de ${t}, cante o destino e só então toque a resolução. `,
    (u, t) => `En ${u}, identifica la nota activa de ${t}, canta su destino y solo entonces toca la resolución. `,
    (u, t) => `Finde in ${u} den aktiven Ton von ${t}, singe sein Ziel und spiele erst danach die Auflösung. `,
    (u, t) => `「${u}」では、${t}の傾向音と到着音を歌ってから解決を弾きます。`,
    (u, t) => `在“${u}”中，找出${t}的倾向音，唱出目标后再弹解决。`),
  connect: l(
    (u, t) => `For ${u}, connect ${t} without a gap and name one common tone or stepwise voice after each pass. `,
    (u, t) => `Em ${u}, conecte ${t} sem lacuna e diga uma nota comum ou voz por grau conjunto após cada passagem. `,
    (u, t) => `En ${u}, conecta ${t} sin hueco y nombra una nota común o voz conjunta después de cada pasada. `,
    (u, t) => `Verbinde in ${u} das Material ${t} ohne Lücke und nenne nach jedem Durchgang einen gemeinsamen oder schrittweise geführten Ton. `,
    (u, t) => `「${u}」では、${t}を隙間なくつなぎ、各回後に共通音か順次進行を一つ言います。`,
    (u, t) => `在“${u}”中，无间隙连接${t}，每遍后说出一个共同音或级进声部。`),
  arrange: l(
    (u, t) => `In ${u}, assign ${t} a clear texture and mark where that texture changes at the next phrase boundary. `,
    (u, t) => `Em ${u}, dê a ${t} uma textura clara e marque onde ela muda no próximo limite de frase. `,
    (u, t) => `En ${u}, asigna a ${t} una textura clara y marca dónde cambia en el siguiente límite de frase. `,
    (u, t) => `Gib in ${u} dem Material ${t} eine klare Textur und markiere ihren Wechsel an der nächsten Phrasengrenze. `,
    (u, t) => `「${u}」では、${t}に明確なテクスチャを与え、次の楽句境界で変える位置を記します。`,
    (u, t) => `在“${u}”中，为${t}安排清楚织体，并标出下一乐句边界的织体变化。`),
  borrow: l(
    (u, t) => `For ${u}, play ${t} and name the borrowed chord, its altered scale degree, and its return to tonic. `,
    (u, t) => `Em ${u}, toque ${t} e diga o acorde emprestado, o grau alterado e o retorno à tônica. `,
    (u, t) => `En ${u}, toca ${t} y nombra el acorde prestado, el grado alterado y el regreso a la tónica. `,
    (u, t) => `Spiele in ${u} das Material ${t} und nenne entlehnten Akkord, alterierte Stufe und Rückkehr zur Tonika. `,
    (u, t) => `「${u}」では、${t}の借用コード、変化した度数、トニックへの帰還を言います。`,
    (u, t) => `在“${u}”中，弹奏${t}并说出借用和弦、变化音级与回到主和弦的位置。`),
};

const SINGLE_NOTE_PRACTICE = l(
  "Sustain the voicing, then sing its lowest and highest notes separately. Replay it as a block and as an arpeggio, naming each interval above the bass. Keep the register unchanged for three attacks. If one note masks another, reduce the touch on the inner voices rather than spreading the chord into a different shape.",
  "Sustente a abertura e cante separadamente a nota mais grave e a mais aguda. Repita em bloco e como arpejo, dizendo cada intervalo acima do baixo. Preserve o registro por três ataques. Se uma nota esconder outra, reduza o ataque das vozes internas em vez de abrir o acorde em outra forma.",
  "Sostén la disposición y canta por separado la nota más grave y la más aguda. Repítela en bloque y como arpegio, nombrando cada intervalo sobre el bajo. Conserva el registro durante tres ataques. Si una nota tapa otra, reduce el ataque de las voces internas en vez de abrir el acorde en otra forma.",
  "Halte die Lage und singe tiefsten sowie höchsten Ton getrennt. Spiele sie als Block und Arpeggio und nenne jedes Intervall über dem Bass. Behalte die Lage für drei Anschläge. Verdeckt ein Ton einen anderen, spiele die Innenstimmen leiser statt den Akkord anders zu spreizen.",
  "ボイシングを伸ばし、最低音と最高音を別々に歌います。ブロックとアルペジオで弾き、低音上の各音程を言ってください。同じ音域で3回鳴らし、内声が他の音を隠す場合は配置を変えずタッチを弱めます。",
  "延长该配置，分别唱出最低音与最高音。用柱式和琶音各弹一次，并说出低音上方的每个音程。同一音区连续起音三次；若内声遮住其他音，就减轻触键，不要改成另一种排列。"
);

const CHORD_FOCUS = {
  major: l("major third", "terça maior", "tercera mayor", "große Terz", "長3度", "大三音"),
  minor: l("minor third", "terça menor", "tercera menor", "kleine Terz", "短3度", "小三音"),
  diminished: l("lowered fifth", "quinta rebaixada", "quinta rebajada", "verminderte Quinte", "減5度", "降低五音"),
  augmented: l("raised fifth", "quinta elevada", "quinta elevada", "übermäßige Quinte", "増5度", "升高五音"),
  suspended4: l("fourth replacing the third", "quarta no lugar da terça", "cuarta en lugar de la tercera", "Quarte statt Terz", "3度を置き換える4度", "取代三音的四音"),
  add9: l("added ninth above the full triad", "nona acrescentada sobre a tríade completa", "novena añadida sobre la tríada completa", "hinzugefügte None über dem Dreiklang", "トライアドに加わる9度", "完整三和弦上增加的九音"),
  major6: l("added major sixth", "sexta maior acrescentada", "sexta mayor añadida", "hinzugefügte große Sexte", "加えた長6度", "增加的大六音"),
  minor6: l("minor third and major sixth", "terça menor e sexta maior", "tercera menor y sexta mayor", "kleine Terz und große Sexte", "短3度と長6度", "小三音与大六音"),
  major7: l("major seventh", "sétima maior", "séptima mayor", "große Septime", "長7度", "大七音"),
  dominant7: l("minor seventh above a major triad", "sétima menor sobre tríade maior", "séptima menor sobre tríada mayor", "kleine Septime über einem Durdreiklang", "メジャー・トライアド上の短7度", "大三和弦上的小七音"),
  minor7: l("minor third and minor seventh", "terça menor e sétima menor", "tercera menor y séptima menor", "kleine Terz und kleine Septime", "短3度と短7度", "小三音与小七音"),
  halfdim7: l("lowered fifth and minor seventh", "quinta rebaixada e sétima menor", "quinta rebajada y séptima menor", "verminderte Quinte und kleine Septime", "減5度と短7度", "降低五音与小七音"),
  diminished7: l("diminished seventh", "sétima diminuta", "séptima disminuida", "verminderte Septime", "減7度", "减七音"),
  dominant9: l("minor seventh and ninth", "sétima menor e nona", "séptima menor y novena", "kleine Septime und None", "短7度と9度", "小七音与九音"),
  major9: l("major seventh and ninth", "sétima maior e nona", "séptima mayor y novena", "große Septime und None", "長7度と9度", "大七音与九音"),
  minor9: l("minor third, minor seventh, and ninth", "terça menor, sétima menor e nona", "tercera menor, séptima menor y novena", "kleine Terz, kleine Septime und None", "短3度、短7度、9度", "小三音、小七音与九音"),
};

function practiceFor(lesson, locale) {
  if (lesson.kind === "chord") {
    const focus = CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major;
    const prefix = {
      en: `The defining tone here is the ${focus.en}. `,
      "pt-BR": `A nota que define este acorde é ${focus["pt-BR"]}. `,
      es: `La nota que define este acorde es la ${focus.es}. `,
      de: `Der kennzeichnende Ton ist hier die ${focus.de}. `,
      ja: `ここで決め手になるのは${focus.ja}です。`,
      "zh-Hans": `这里的决定音是${focus["zh-Hans"]}。`,
    }[locale];
    return `${prefix}${KIND_LANGUAGE.chord[locale]}`;
  }
  return KIND_LANGUAGE[lesson.kind][locale];
}

function sequenceEvents(sequence, defaultBeat = 2) {
  const tokens = sequence.match(/\[[^\]]+\](?:\/\d+(?:\.\d+)?)?|[A-Ga-g](?:#|b)?-?\d+(?:\/\d+(?:\.\d+)?)?/gu) || [];
  return tokens.map((token) => {
    const durationMatch = token.match(/\/(\d+(?:\.\d+)?)$/u);
    const pitchPart = token.replace(/\/\d+(?:\.\d+)?$/u, "");
    const pitches = pitchPart.startsWith("[")
      ? pitchPart.slice(1, -1).split(",")
      : [pitchPart];
    return { pitches, duration: durationMatch ? Number(durationMatch[1]) : defaultBeat };
  });
}

function notePath(events, position) {
  const pitches = events.map((event) => {
    const index = position === "bass" ? 0 : event.pitches.length - 1;
    return event.pitches[index].replace(/#/gu, "♯").replace(/b/gu, "♭");
  });
  if (pitches.length > 3) return `${pitches[0]} … ${pitches[pitches.length - 1]}`;
  return pitches.join(" → ");
}

function comparisonType(lesson) {
  const types = {
    "numbers-two-keys": "transposition",
    "form-harmonic-rhythm": "rhythm",
    "motion-second-inversion": "bass",
    "cadence-perfect-imperfect": "bass",
    "reharm-bass-change": "bass",
    "altered-dim-symmetry": "voicing",
    "ninth-color-choice": "color",
    "extension-or-melody": "color",
    "reharm-melody-first": "color",
    "reharm-six-for-one": "color",
    "reharm-two-for-four": "color",
    "reharm-seven-for-five": "color",
    "iv-or-v": "route",
    "function-two-routes-v": "route",
    "grammar-two-endings": "route",
    "applied-tonicize-or-modulate": "route",
    "modulation-stay-return": "route",
    "reharm-cadence-swap": "route",
  };
  return types[lesson.slug] || "pitch";
}

function comparisonFocus(lesson, locale) {
  const type = comparisonType(lesson);
  if (type === "pitch" && lesson.kind === "compare") {
    const a = localizedCompareDescriptor(lesson.a, locale);
    const b = localizedCompareDescriptor(lesson.b, locale);
    return l(
      `A (${a}) against B (${b})`,
      `A (${a}) contra B (${b})`,
      `A (${a}) frente a B (${b})`,
      `A (${a}) gegenüber B (${b})`,
      `A（${a}）とB（${b}）の差`,
      `A（${a}）与B（${b}）的差异`)[locale];
  }
  const values = {
    transposition: l("the same numeral function in both keys", "a mesma função numérica nas duas tonalidades", "la misma función numérica en ambas tonalidades", "dieselbe Stufenfunktion in beiden Tonarten", "両方のキーに共通する度数機能", "两个调中相同的级数功能"),
    rhythm: l("chord-change rate", "velocidade das trocas", "velocidad de cambio", "Akkordwechselrate", "コード変更の速さ", "和弦变化速度"),
    bass: l("bass position", "posição do baixo", "posición del bajo", "Basslage", "低音位置", "低音位置"),
    voicing: l("voicing and register", "abertura e registro", "disposición y registro", "Lage und Register", "ボイシングと音域", "和弦排列与音区"),
    color: l("chord color under the fixed tone", "cor do acorde sob a nota fixa", "color del acorde bajo la nota fija", "Akkordfarbe unter dem festen Ton", "固定音の下のコード・カラー", "固定音下方的和弦色彩"),
    route: l("harmonic route and destination", "caminho harmônico e destino", "recorrido armónico y destino", "harmonischen Weg und Ziel", "和声経路と到着先", "和声路线与目标"),
  };
  const resolvedType = type === "pitch" && lesson.kind === "progression"
    ? "route"
    : type === "pitch" && lesson.kind === "notes"
      ? "voicing"
      : values[type]
        ? type
        : "color";
  return values[resolvedType][locale];
}

function materialStats(lesson) {
  if (lesson.kind === "notes") {
    const events = sequenceEvents(lesson.sequence, lesson.beat);
    return {
      events,
      eventCount: events.length,
      totalBeats: events.reduce((sum, event) => sum + event.duration, 0),
      bass: notePath(events, "bass"),
      top: notePath(events, "top"),
    };
  }
  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      const sideCounts = lesson.alternatives.map((entry) => entry.numerals.trim().split(/\s+/u).length);
      return {
        alternatives: lesson.alternatives.length,
        sideCounts: sideCounts.join("/"),
        sideBeats: sideCounts.map((count) => count * lesson.beats).join("/"),
      };
    }
    const chordCount = lesson.numerals.trim().split(/\s+/u).length;
    return { chordCount, totalBeats: chordCount * lesson.beats };
  }
  if (lesson.kind === "tap") {
    const tokens = lesson.pattern.trim().split(/\s+/u);
    return {
      attacks: tokens.filter((token) => token.startsWith("x")).length,
      rests: tokens.filter((token) => token.startsWith("-")).length,
      slots: tokens.length,
    };
  }
  return {};
}

function summaryFor(unitDefinition, lesson, locale) {
  const target = lesson.target[locale];
  const focus = lesson.kind === "chord"
    ? (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale]
    : comparisonFocus(lesson, locale);
  const stats = materialStats(lesson);
  if (lesson.kind === "progression" && lesson.alternatives) {
    const counts = stats.sideCounts.split("/");
    const countPhrase = counts.every((value) => value === counts[0])
      ? l(`${counts[0]} chords apiece`, `${counts[0]} acordes em cada`, `${counts[0]} acordes en cada una`, `je ${counts[0]} Akkorde`, `各${counts[0]}コード`, `每条${counts[0]}个和弦`)[locale]
      : l(`${counts.join(" and ")} chords`, `${counts.join(" e ")} acordes`, `${counts.join(" y ")} acordes`, `${counts.join(" und ")} Akkorde`, `${counts.join("個と")}個のコード`, `${counts.join("和")}个和弦`)[locale];
    const sentence = l(
      `Compare the two routes in ${target}, keeping ${countPhrase} and their destinations distinct.`,
      `Compare as duas rotas de ${target}, distinguindo ${countPhrase} e seus destinos.`,
      `Compara las dos rutas de ${target}, distinguiendo ${countPhrase} y sus destinos.`,
      `Vergleiche die zwei Wege in ${target} und halte ${countPhrase} sowie ihre Ziele auseinander.`,
      `${target}の二つの経路を比べ、${countPhrase}と到着先を区別します。`,
      `比较${target}中的两条路线，区分${countPhrase}及其目标。`)[locale];
    return `${unitDefinition.titles[locale]}: ${sentence}`;
  }
  if (lesson.kind === "notes" && stats.eventCount === 1) {
    const sentence = l(
      `Study ${target} as one fixed piano voicing, naming its bass and top notes without implying melodic motion.`,
      `Estude ${target} como uma abertura fixa ao piano, dizendo baixo e nota superior sem sugerir movimento melódico.`,
      `Estudia ${target} como una disposición fija de piano, nombrando bajo y nota superior sin sugerir movimiento melódico.`,
      `Untersuche ${target} als feste Klavierlage und nenne Bass- sowie Oberton, ohne melodische Bewegung zu unterstellen.`,
      `${target}を固定した一つのピアノ・ボイシングとして扱い、旋律的な動きを想定せず最低音と最高音を言います。`,
      `把${target}作为一个固定钢琴和弦排列，分别说出最低音与最高音，不把它误解为旋律移动。`)[locale];
    return `${unitDefinition.titles[locale]}: ${sentence}`;
  }
  const summaries = {
    chord: l(
      `Build ${target} and use its ${focus} to recognize the chord by ear.`,
      `Monte ${target} e ouça como ${focus} define o acorde.`,
      `Construye ${target} y usa la ${focus} para reconocer el acorde de oído.`,
      `Baue ${target} und erkenne den Akkord am Klangmerkmal ${focus}.`,
      `${target}を組み立て、${focus}でコードを聴き分けます。`,
      `构建${target}，并通过${focus}用耳朵识别和弦。`),
    progression: l(
      `Trace ${target} through ${stats.chordCount} chord changes and hear where its function points.`,
      `Acompanhe ${target} por ${stats.chordCount} trocas e ouça para onde a função conduz.`,
      `Sigue ${target} durante ${stats.chordCount} cambios y escucha hacia dónde conduce su función.`,
      `Verfolge ${target} durch ${stats.chordCount} Akkordwechsel und höre das funktionale Ziel.`,
      `${target}の${stats.chordCount}回のコードを追い、機能が向かう先を聴きます。`,
      `跟随${target}的${stats.chordCount}次和弦变化，并听出功能指向。`),
    notes: l(
      `Follow ${target} through ${stats.eventCount} fixed piano events while separating its bass and top lines.`,
      `Acompanhe ${target} por ${stats.eventCount} eventos fixos ao piano, separando baixo e voz superior.`,
      `Sigue ${target} durante ${stats.eventCount} eventos fijos de piano, separando bajo y voz superior.`,
      `Verfolge ${target} durch ${stats.eventCount} feste Klavierereignisse und trenne Bass und Oberstimme.`,
      `${target}の${stats.eventCount}個のピアノ配置で、低音線と上声を分けて追います。`,
      `在${target}的${stats.eventCount}个固定钢琴事件中，分别跟随低音线与顶声部。`),
    compare: l(
      `Compare ${target} by listening specifically for ${focus}.`,
      `Compare ${target} ouvindo especificamente ${focus}.`,
      `Compara ${target} escuchando específicamente ${focus}.`,
      `Vergleiche ${target} und höre gezielt auf ${focus}.`,
      `${target}を比べ、${focus}を重点的に聴きます。`,
      `比较${target}，重点聆听${focus}。`),
    tap: l(
      `Place ${stats.attacks} attacks and ${stats.rests} rests in ${target} without disturbing the pulse.`,
      `Coloque ${stats.attacks} ataques e ${stats.rests} pausas em ${target} sem perturbar o pulso.`,
      `Coloca ${stats.attacks} ataques y ${stats.rests} silencios en ${target} sin alterar el pulso.`,
      `Setze ${stats.attacks} Anschläge und ${stats.rests} Pausen in ${target}, ohne den Puls zu stören.`,
      `${target}に${stats.attacks}回のアタックと${stats.rests}個の休符を置き、拍を崩さないようにします。`,
      `在${target}中放置${stats.attacks}个起音与${stats.rests}个休止，同时保持拍点稳定。`),
  };
  return `${unitDefinition.titles[locale]}: ${summaries[lesson.kind][locale]}`;
}

function conciseSummaryFor(unitDefinition, lesson, locale, index) {
  const target = lesson.target[locale];
  const fact = directFactFor(unitDefinition, lesson, locale, index)
    .replace(/^[A-ZÀ-Þぁ-ゖァ-ヺ一-鿿]/u, (letter) => letter.toLocaleLowerCase(locale));
  if (locale === "ja" || locale === "zh-Hans") return `${target}：${fact}`;
  return `${target}: ${fact}`;
}

function materialExplanation(unitDefinition, lesson, locale) {
  const target = lesson.target[locale];
  const stats = materialStats(lesson);
  if (lesson.kind === "chord") {
    const focus = (CHORD_FOCUS[lesson.quality] || CHORD_FOCUS.major)[locale];
    const style = STYLE_NAMES[lesson.style][locale];
    return l(
      `${unitDefinition.concepts.en} The adaptive card voices ${target} from root ${lesson.root} using the ${style} style, repeated ${lesson.repeats} times. The ${focus} is the diagnostic tone: sing it before the block or arpeggio begins, then check that the other tones support rather than mask it.`,
      `${unitDefinition.concepts["pt-BR"]} O cartão adaptável forma ${target} desde ${lesson.root} em padrão de ${style}, repetido ${lesson.repeats} vezes. ${focus} é a nota diagnóstica: cante-a antes do bloco ou arpejo e confira se as demais notas a sustentam sem escondê-la.`,
      `${unitDefinition.concepts.es} La tarjeta adaptable forma ${target} desde ${lesson.root} como patrón de ${style}, repetido ${lesson.repeats} veces. La ${focus} es la nota diagnóstica: cántala antes del bloque o arpegio y comprueba que las demás notas la apoyen sin taparla.`,
      `${unitDefinition.concepts.de} Die adaptive Karte setzt ${target} vom Grundton ${lesson.root} als ${style}-Muster und wiederholt es ${lesson.repeats}-mal. Die ${focus} ist der Prüfton: Singe sie vor Block oder Arpeggio und achte darauf, dass die übrigen Töne sie tragen statt verdecken.`,
      `${unitDefinition.concepts.ja}アダプティブ・カードは${target}をルート${lesson.root}から${style}型で組み、${lesson.repeats}回鳴らします。${focus}が判別音です。ブロックまたはアルペジオの前に歌い、他の構成音がその音を隠さず支えるか確認してください。`,
      `${unitDefinition.concepts["zh-Hans"]}自适应卡片从根音${lesson.root}构成${target}，使用${style}型并重复${lesson.repeats}次。${focus}是判断音：柱式或琶音开始前先唱出它，再确认其余和弦音是在支撑而不是遮盖它。`)[locale];
  }
  if (lesson.kind === "progression") {
    if (lesson.alternatives) {
      return l(
        `${unitDefinition.concepts.en} The two adaptive cards keep the alternatives separate: A and B contain ${stats.sideCounts} chords and last ${stats.sideBeats} beats. Read each route before playback, follow its bass roots, and compare the destination rather than hearing the two halves as one longer progression.`,
        `${unitDefinition.concepts["pt-BR"]} Os dois cartões adaptáveis separam as alternativas: A e B têm ${stats.sideCounts} acordes e duram ${stats.sideBeats} tempos. Leia cada rota, acompanhe as fundamentais do baixo e compare o destino, sem ouvir as duas metades como uma progressão longa.`,
        `${unitDefinition.concepts.es} Las dos tarjetas adaptables separan las alternativas: A y B tienen ${stats.sideCounts} acordes y duran ${stats.sideBeats} pulsos. Lee cada ruta, sigue las fundamentales y compara el destino, sin oír ambas mitades como una progresión larga.`,
        `${unitDefinition.concepts.de} Die zwei adaptiven Karten trennen die Alternativen: A und B enthalten ${stats.sideCounts} Akkorde und dauern ${stats.sideBeats} Schläge. Lies jeden Weg, verfolge seine Bassgrundtöne und vergleiche das Ziel, statt beide Hälften als eine lange Folge zu hören.`,
        `${unitDefinition.concepts.ja}二つのアダプティブ・カードは選択肢を分けます。AとBは${stats.sideCounts}個のコードで、長さは${stats.sideBeats}拍です。各経路を読み、低音のルートを追い、二つを長い一進行としてではなく到着先で比較します。`,
        `${unitDefinition.concepts["zh-Hans"]}两张自适应卡片把选项分开：A与B各有${stats.sideCounts}个和弦，时长为${stats.sideBeats}拍。先读每条路线，跟随低音根音，再比较目标，不要把两半听成一条更长的进行。`)[locale];
    }
    const scale = (SCALE_NAMES[lesson.scale] || same(lesson.scale))[locale];
    return l(
      `${unitDefinition.concepts.en} The adaptive card places ${stats.chordCount} changes in ${lesson.key} ${scale}, with ${lesson.beats} beats per chord and ${stats.totalBeats} beats overall. Read ${lesson.numerals} before playback; then track the first bass note of each change and decide whether the final harmony closes, delays, or redirects the phrase.`,
      `${unitDefinition.concepts["pt-BR"]} O cartão adaptável coloca ${stats.chordCount} trocas em ${lesson.key} ${scale}, com ${lesson.beats} tempos por acorde e ${stats.totalBeats} no total. Leia ${lesson.numerals} antes de reproduzir; acompanhe o primeiro baixo de cada troca e decida se a harmonia final fecha, adia ou redireciona a frase.`,
      `${unitDefinition.concepts.es} La tarjeta adaptable coloca ${stats.chordCount} cambios en ${lesson.key} ${scale}, con ${lesson.beats} pulsos por acorde y ${stats.totalBeats} en total. Lee ${lesson.numerals} antes de reproducir; sigue el primer bajo de cada cambio y decide si la armonía final cierra, retrasa o redirige la frase.`,
      `${unitDefinition.concepts.de} Die adaptive Karte setzt ${stats.chordCount} Wechsel in ${lesson.key} ${scale}, jeweils ${lesson.beats} Schläge und insgesamt ${stats.totalBeats} Schläge lang. Lies ${lesson.numerals} vor dem Abspielen, verfolge jeden neuen Basston und entscheide, ob die letzte Harmonie die Phrase schließt, verzögert oder umlenkt.`,
      `${unitDefinition.concepts.ja}アダプティブ・カードは${lesson.key} ${scale}で${stats.chordCount}回コードを変え、各コードは${lesson.beats}拍、全体は${stats.totalBeats}拍です。再生前に${lesson.numerals}を読み、各変更の最初の低音を追って、最後の和声が楽句を閉じる、延ばす、別方向へ向けるのどれかを判断します。`,
      `${unitDefinition.concepts["zh-Hans"]}自适应卡片在${lesson.key} ${scale}中安排${stats.chordCount}次变化，每个和弦${lesson.beats}拍，共${stats.totalBeats}拍。播放前读出${lesson.numerals}；随后跟随每次变化的第一个低音，并判断末和弦是在结束、延后还是改变乐句方向。`)[locale];
  }
  if (lesson.kind === "notes") {
    const singular = stats.eventCount === 1;
    return l(
      `${unitDefinition.concepts.en} The piano card preserves ${stats.eventCount} ${singular ? "written voicing" : "written events"} for ${stats.totalBeats} beats instead of flattening the harmony into a melody. Its bass path is ${stats.bass}; its top path is ${stats.top}. Hear those paths separately, then play every bracketed group as one coordinated attack.`,
      `${unitDefinition.concepts["pt-BR"]} O cartão de piano preserva ${stats.eventCount} ${singular ? "abertura escrita" : "eventos escritos"} por ${stats.totalBeats} tempos, sem achatar a harmonia em melodia. O baixo faz ${stats.bass}; a voz superior faz ${stats.top}. Escute os caminhos separadamente e toque cada grupo entre colchetes como um ataque coordenado.`,
      `${unitDefinition.concepts.es} La tarjeta de piano conserva ${stats.eventCount} ${singular ? "disposición escrita" : "eventos escritos"} durante ${stats.totalBeats} pulsos, sin aplanar la armonía en melodía. El bajo hace ${stats.bass}; la voz superior hace ${stats.top}. Escucha ambas líneas por separado y toca cada grupo entre corchetes como un ataque coordinado.`,
      `${unitDefinition.concepts.de} Die Klavierkarte erhält ${stats.eventCount} ${singular ? "notierte Lage" : "notierte Ereignisse"} über ${stats.totalBeats} Schläge, statt die Harmonie zu einer Melodie abzuflachen. Der Bassweg lautet ${stats.bass}, die Oberstimme ${stats.top}. Höre beide Wege getrennt und spiele jede eingeklammerte Gruppe als gemeinsamen Anschlag.`,
      `${unitDefinition.concepts.ja}ピアノ・カードは和声を旋律に平坦化せず、${stats.eventCount}個の${singular ? "書かれたボイシング" : "書かれたイベント"}を${stats.totalBeats}拍保ちます。低音線は${stats.bass}、上声は${stats.top}です。二つを別々に聴いてから、角括弧内の音を一つのそろったアタックとして弾いてください。`,
      `${unitDefinition.concepts["zh-Hans"]}钢琴卡片保留${stats.eventCount}个${singular ? "书面和弦排列" : "书面事件"}，共${stats.totalBeats}拍，不把和声摊平成旋律。低音路线是${stats.bass}，顶声部路线是${stats.top}。先分别聆听两条线，再把每组方括号内的音作为一次整齐起奏弹出。`)[locale];
  }
  if (lesson.kind === "compare") {
    const focus = comparisonFocus(lesson, locale);
    return l(
      `${unitDefinition.concepts.en} The adaptive A/B card keeps root ${lesson.root}, tempo, and register fixed; its two paths change the material named by ${focus}. Read both paths before listening, sing the point where they diverge, and leave one silent beat between A and B so the first sound does not blur into the second.`,
      `${unitDefinition.concepts["pt-BR"]} O cartão adaptável A/B mantém fundamental ${lesson.root}, andamento e registro fixos; os dois caminhos mudam o material indicado por ${focus}. Leia ambos, cante o ponto de divergência e deixe um tempo de silêncio entre A e B para que os sons não se misturem.`,
      `${unitDefinition.concepts.es} La tarjeta adaptable A/B mantiene fijos la fundamental ${lesson.root}, el tempo y el registro; ambos recorridos cambian el material indicado por ${focus}. Lee los dos, canta el punto donde divergen y deja un pulso de silencio entre A y B para que no se mezclen.`,
      `${unitDefinition.concepts.de} Die adaptive A/B-Karte hält Grundton ${lesson.root}, Tempo und Lage fest; ihre Wege verändern das durch ${focus} benannte Material. Lies beide Wege, singe ihren Abzweig und lasse zwischen A und B einen stillen Schlag, damit die Klänge nicht ineinanderlaufen.`,
      `${unitDefinition.concepts.ja}アダプティブA/Bカードはルート${lesson.root}、テンポ、音域を固定し、二つの経路で${focus}として示した素材を変えます。経路を読み、分かれる位置を歌い、AとBの間に1拍の無音を置いて響きが混ざらないようにします。`,
      `${unitDefinition.concepts["zh-Hans"]}自适应A/B卡片固定根音${lesson.root}、速度与音区，两条路线只改变${focus}所指的材料。聆听前读出路线，唱出分叉位置，并在A与B之间留一拍安静，避免前后声音混在一起。`)[locale];
  }
  return l(
    `${unitDefinition.concepts.en} The tap card divides ${target} into ${stats.slots} written slots: ${stats.attacks} attacks and ${stats.rests} rests. Count a full bar before entering, keep the internal pulse moving through each dash, and make every x one clean attack rather than a held or doubled sound.`,
    `${unitDefinition.concepts["pt-BR"]} O cartão divide ${target} em ${stats.slots} posições: ${stats.attacks} ataques e ${stats.rests} pausas. Conte um compasso antes de entrar, mantenha o pulso interno em cada traço e faça de cada x um ataque limpo, sem prolongar ou duplicar.`,
    `${unitDefinition.concepts.es} La tarjeta divide ${target} en ${stats.slots} posiciones: ${stats.attacks} ataques y ${stats.rests} silencios. Cuenta un compás antes de entrar, conserva el pulso interno en cada guion y convierte cada x en un ataque limpio, no prolongado ni doble.`,
    `${unitDefinition.concepts.de} Die Karte teilt ${target} in ${stats.slots} Plätze: ${stats.attacks} Anschläge und ${stats.rests} Pausen. Zähle einen Takt ein, halte den inneren Puls durch jeden Strich und spiele jedes x als einzelnen klaren Anschlag statt als gehaltenen oder doppelten Ton.`,
    `${unitDefinition.concepts.ja}タップ・カードは${target}を${stats.slots}個の位置に分け、${stats.attacks}回のアタックと${stats.rests}個の休符を置きます。入る前に1小節数え、ダッシュでも内側の拍を動かし、各xを伸ばした音や二重音ではなく一回の明確なアタックにします。`,
    `${unitDefinition.concepts["zh-Hans"]}击拍卡片把${target}分成${stats.slots}个书面位置，其中有${stats.attacks}个起音与${stats.rests}个休止。进入前完整数一小节，横线处也保持内在拍点，并让每个x成为一次清楚起音，而不是延长或重复的声音。`)[locale];
}

function practiceExplanation(unitDefinition, lesson, locale) {
  const target = lesson.target[locale];
  const stats = materialStats(lesson);
  let lead;
  if (lesson.action === "compare") {
    const focus = comparisonFocus(lesson, locale);
    lead = l(
      `In ${unitDefinition.titles.en}, compare ${target} with matched volume and listen for ${focus}. `,
      `Em ${unitDefinition.titles["pt-BR"]}, compare ${target} com volume igual e ouça ${focus}. `,
      `En ${unitDefinition.titles.es}, compara ${target} con el mismo volumen y escucha ${focus}. `,
      `Vergleiche in ${unitDefinition.titles.de} das Material ${target} bei gleicher Lautstärke und höre auf ${focus}. `,
      `「${unitDefinition.titles.ja}」では、${target}を同じ音量で比べ、${focus}を聴きます。`,
      `在“${unitDefinition.titles["zh-Hans"]}”中，以相同音量比较${target}并聆听${focus}。`)[locale];
  } else {
    lead = ACTION_LEADS[lesson.action][locale](unitDefinition.titles[locale], target);
  }

  if (lesson.kind === "notes") {
    const details = stats.eventCount === 1
      ? l(
        `Because ${target} contains one fixed voicing, name every interval above ${stats.bass}, play it once as a block and once from bottom to top, and keep the register unchanged. If an inner pitch disappears, lighten that finger instead of spreading the chord. Record the final three attacks and check that all written notes begin and end together.`,
        `Como ${target} contém uma abertura fixa, diga cada intervalo sobre ${stats.bass}, toque uma vez em bloco e outra de baixo para cima, sem mudar o registro. Se uma nota interna sumir, alivie esse dedo em vez de abrir o acorde. Grave os três ataques finais e confira se todas as notas começam e terminam juntas.`,
        `Como ${target} contiene una disposición fija, di cada intervalo sobre ${stats.bass}, toca una vez en bloque y otra de abajo arriba sin cambiar el registro. Si desaparece una nota interna, aligera ese dedo en vez de abrir el acorde. Graba los tres ataques finales y comprueba que todas las notas empiecen y terminen juntas.`,
        `Da ${target} eine feste Lage enthält, nenne jedes Intervall über ${stats.bass}, spiele sie als Block und von unten nach oben und behalte das Register. Verschwindet ein Innenton, spiele ihn leichter, statt den Akkord zu spreizen. Nimm drei letzte Anschläge auf und prüfe gemeinsamen Beginn und Schluss aller Töne.`,
        `${target}は固定ボイシング一つなので、${stats.bass}上の各音程を言い、同時奏と低音からのアルペジオを一度ずつ同じ音域で弾きます。内声が消えたら配置を広げず、その指のタッチを軽くしてください。最後の3回を録音し、全構成音の開始と終了がそろうか確認します。`,
        `${target}只有一个固定和弦排列，因此先说出${stats.bass}上方的每个音程，再以柱式和自下而上的琶音各弹一次，并保持音区不变。若内声消失，就减轻该手指而不要摊开和弦。录下最后三次起奏，检查所有书面音是否同时开始与结束。`)
      : l(
        `For ${target}, first sing the bass path ${stats.bass}; next sing the top path ${stats.top}; only then play the complete ${stats.eventCount}-event sequence. Stop at the first late attack and loop that boundary twice before restarting. On the final pass, state which voice moved least and which motion produced the arrival.`,
        `Em ${target}, cante primeiro o baixo ${stats.bass}; depois a voz superior ${stats.top}; só então toque a sequência completa de ${stats.eventCount} eventos. Pare no primeiro ataque atrasado e repita essa fronteira duas vezes. Na última passagem, diga qual voz se moveu menos e qual movimento criou a chegada.`,
        `En ${target}, canta primero el bajo ${stats.bass}; después la voz superior ${stats.top}; solo entonces toca la secuencia completa de ${stats.eventCount} eventos. Detente en el primer ataque tardío y repite dos veces ese límite. En la última pasada, di qué voz se movió menos y qué movimiento produjo la llegada.`,
        `Singe für ${target} zuerst den Bass ${stats.bass}, danach die Oberstimme ${stats.top} und spiele erst dann die vollständige Folge mit ${stats.eventCount} Ereignissen. Halte am ersten verspäteten Anschlag an und wiederhole diese Grenze zweimal. Nenne zuletzt die kleinste Stimmbewegung und die Bewegung, die das Ziel erzeugt.`,
        `${target}では、まず低音線${stats.bass}、次に上声${stats.top}を歌ってから、${stats.eventCount}イベントの全体を弾きます。遅れた最初のアタックで止まり、その境界だけを2回反復してください。最後は最小移動の声部と、到着感を作った動きを答えます。`,
        `练习${target}时，先唱低音路线${stats.bass}，再唱顶声部${stats.top}，之后才弹完整的${stats.eventCount}事件序列。在第一次迟到的起音处停下，只循环该边界两遍。最后一遍说出移动最少的声部，以及制造到达感的具体移动。`);
    return `${lead}${details[locale]}`;
  }

  const practices = {
    chord: l(
      `Say root ${lesson.root} and the defining interval before each pass of ${target}. Use the first repeat as a block, the second as a slow arpeggio, and the third to sing the defining tone against the remaining chord. If the quality is unclear, rebuild from the root and correct the first wrong interval rather than striking harder.`,
      `Diga a fundamental ${lesson.root} e o intervalo definidor antes de cada passagem de ${target}. Use a primeira em bloco, a segunda como arpejo lento e a terceira para cantar a nota definidora contra o acorde. Se a qualidade ficar incerta, reconstrua desde a fundamental e corrija o primeiro intervalo errado sem tocar mais forte.`,
      `Di la fundamental ${lesson.root} y el intervalo definitorio antes de cada pasada de ${target}. Usa la primera en bloque, la segunda como arpegio lento y la tercera para cantar la nota definitoria contra el acorde. Si la cualidad no queda clara, reconstruye desde la fundamental y corrige el primer intervalo erróneo sin tocar más fuerte.`,
      `Nenne vor jedem Durchgang von ${target} Grundton ${lesson.root} und Kennzeichnungsintervall. Spiele zuerst als Block, dann als langsames Arpeggio und singe zuletzt den Kennzeichnungston gegen den Rest. Bleibt die Qualität unklar, baue vom Grundton neu und korrigiere das erste falsche Intervall, statt kräftiger anzuschlagen.`,
      `${target}の各回前にルート${lesson.root}と特徴音程を言います。1回目は同時奏、2回目は遅いアルペジオ、3回目は残りのコードに対して特徴音を歌ってください。クオリティが不明なら強く弾かず、ルートから組み直して最初の誤った音程を直します。`,
      `${target}每遍开始前先说出根音${lesson.root}与决定音程。第一遍用柱式，第二遍用慢琶音，第三遍把决定音对着其余和弦音唱出。若性质不清楚，不要加大力度；从根音重建，并改正第一个错误音程。`),
    progression: l(
      `Count ${lesson.beats} beats for every chord in ${target}, saying the next numeral on the final beat before it arrives. On the second pass, reduce your attention to the bass roots; on the third, listen only to the last two functions. If a change lands late, loop that pair at ${lesson.tempo} BPM until the pulse stays even, then restore the full route.`,
      `Conte ${lesson.beats} tempos para cada acorde de ${target}, dizendo o próximo algarismo no último tempo antes da entrada. Na segunda passagem, ouça só as fundamentais do baixo; na terceira, apenas as duas funções finais. Se uma troca atrasar, repita o par a ${lesson.tempo} BPM até o pulso ficar regular e recoloque a rota inteira.`,
      `Cuenta ${lesson.beats} pulsos por acorde en ${target}, diciendo el siguiente número en el último pulso antes de su entrada. En la segunda pasada escucha solo las fundamentales; en la tercera, solo las dos funciones finales. Si un cambio llega tarde, repite ese par a ${lesson.tempo} BPM hasta estabilizar el pulso y recupera después la ruta completa.`,
      `Zähle für jeden Akkord in ${target} ${lesson.beats} Schläge und sage die nächste Stufe auf dem letzten Schlag davor. Höre im zweiten Durchgang nur auf die Bassgrundtöne und im dritten auf die letzten zwei Funktionen. Kommt ein Wechsel zu spät, wiederhole dieses Paar bei ${lesson.tempo} BPM und setze danach den ganzen Weg wieder ein.`,
      `${target}の各コードを${lesson.beats}拍数え、次のコードが来る直前の拍で度数を言います。2回目は低音のルートだけ、3回目は最後の二つの機能だけを聴いてください。変更が遅れたら、その2コードを${lesson.tempo} BPMで拍がそろうまで反復し、全経路へ戻します。`,
      `${target}中每个和弦数${lesson.beats}拍，并在进入前最后一拍说出下一个级数。第二遍只听低音根音，第三遍只听最后两个功能。若某次转换迟到，就以${lesson.tempo} BPM循环该和弦对，拍点稳定后再放回完整路线。`),
    compare: l(
      `Alternate A and B for ${target} four times with one silent beat between them. Before each replay, predict ${comparisonFocus(lesson, locale)} and sing or tap the feature that should differ. Finish with two blind trials; if either answer is uncertain, shorten the card to the divergence and its immediate destination before restoring the full pair.`,
      `Alterne A e B em ${target} quatro vezes, com um tempo de silêncio entre elas. Antes de repetir, antecipe ${comparisonFocus(lesson, locale)} e cante ou marque o aspecto diferente. Termine com duas tentativas sem olhar; se houver dúvida, reduza o cartão ao ponto de divergência e ao destino imediato antes de restaurar o par completo.`,
      `Alterna A y B en ${target} cuatro veces, con un pulso de silencio entre ambas. Antes de repetir, anticipa ${comparisonFocus(lesson, locale)} y canta o marca el rasgo diferente. Termina con dos pruebas sin mirar; si dudas, reduce la tarjeta al punto de divergencia y su destino inmediato antes de recuperar el par completo.`,
      `Wechsle für ${target} viermal zwischen A und B und lasse dazwischen einen stillen Schlag. Sage vor jeder Wiederholung ${comparisonFocus(lesson, locale)} voraus und singe oder klopfe das abweichende Merkmal. Beende mit zwei Blindversuchen; bei Unsicherheit verkürze auf Abzweig und direktes Ziel und stelle danach das ganze Paar wieder her.`,
      `${target}のAとBを間に1拍の無音を置いて4回交互に聴きます。各再生前に${comparisonFocus(lesson, locale)}を予想し、異なる要素を歌うか叩いてください。最後は画面を見ず2回答え、迷ったら分岐点と直後の到着だけに縮めてから全体へ戻します。`,
      `${target}的A与B交替四遍，中间留一拍安静。每次重播前先预测${comparisonFocus(lesson, locale)}，并唱出或击打应当不同的特征。最后做两次盲听；若有一次不确定，就缩短到分叉点与紧接的目标，再恢复完整对比。`),
    tap: l(
      `Speak every slot of ${target} as “tap” or “rest” before using your hands. Tap four cycles at ${lesson.tempo} BPM, accenting only the first position on the last cycle. If a rest shortens, keep counting aloud and remove the hand motion completely; the repair is silence in time, not a quieter accidental tap.`,
      `Diga cada posição de ${target} como “toque” ou “pausa” antes de usar as mãos. Marque quatro ciclos a ${lesson.tempo} BPM, acentuando só a primeira posição no último. Se uma pausa encurtar, continue contando e retire totalmente o gesto; o conserto é silêncio no tempo, não um toque acidental mais fraco.`,
      `Di cada posición de ${target} como “golpe” o “silencio” antes de usar las manos. Marca cuatro ciclos a ${lesson.tempo} BPM y acentúa solo la primera posición en el último. Si un silencio se acorta, sigue contando y elimina por completo el gesto; la corrección es silencio a tiempo, no un golpe accidental más suave.`,
      `Sprich jeden Platz von ${target} vor dem Klopfen als „Schlag“ oder „Pause“. Klopfe vier Durchgänge bei ${lesson.tempo} BPM und betone zuletzt nur den ersten Platz. Wird eine Pause zu kurz, zähle laut weiter und entferne die Handbewegung ganz; die Reparatur ist zeitgenaue Stille, kein leiser Fehlschlag.`,
      `${target}の各位置を手で叩く前に「タップ」または「休み」と言います。${lesson.tempo} BPMで4周し、最後の周だけ最初の位置を強調してください。休符が短くなったら声のカウントを続け、手の動きを完全に止めます。修正は弱い誤打ではなく拍どおりの無音です。`,
      `用手之前，先把${target}的每个位置说成“击”或“停”。以${lesson.tempo} BPM完成四轮，最后一轮只强调第一个位置。若休止变短，就继续大声计数并彻底取消手部动作；修正目标是准时的安静，不是更轻的误击。`),
  };
  return `${lead}${practices[lesson.kind][locale]}`;
}

function neutralFenceTitle(lesson) {
  if (lesson.kind === "chord") return `${lesson.root}${CHORD_SYMBOLS[lesson.quality] ?? ""}`;
  if (lesson.kind === "progression") return `${lesson.key}: ${lesson.numerals.replace(/\s+/g, "–")}`;
  if (lesson.kind === "compare") return "A / B";
  if (lesson.kind === "tap") return lesson.pattern;
  if (lesson.kind === "notes") return "♪";
  return "♪";
}

function fenceFor(lesson, id, title) {
  if (lesson.kind === "chord") {
    return [
      "```chord",
      `id: ${id}-exercise`,
      `title: ${title}`,
      `root: ${lesson.root}`,
      `quality: ${lesson.quality}`,
      `style: ${lesson.style}`,
      `tempo: ${lesson.tempo}`,
      `repeats: ${lesson.repeats}`,
      "```",
    ].join("\n");
  }
  if (lesson.kind === "progression") {
    const renderProgression = (entry, suffix, fenceTitle) => {
      const lines = [
        "```progression",
        `id: ${id}-exercise${suffix}`,
        `title: ${fenceTitle}`,
        `key: ${entry.key || lesson.key}`,
        `scale: ${entry.scale || lesson.scale}`,
        `numerals: ${entry.numerals}`,
      ];
      if (lesson.seventh) lines.push("seventh: true");
      lines.push(`tempo: ${lesson.tempo}`, `beatsPerChord: ${lesson.beats}`, "```");
      return lines.join("\n");
    };
    if (lesson.alternatives) {
      return lesson.alternatives.map((entry, index) => renderProgression(
        entry,
        index === 0 ? "-a" : "-b",
        index === 0 ? "A" : "B"
      )).join("\n\n");
    }
    return renderProgression(lesson, "", title);
  }
  if (lesson.kind === "notes") {
    const renderNotes = (sequence, suffix, fenceTitle) => [
        "```notes",
        `id: ${id}-exercise${suffix}`,
        `title: ${fenceTitle}`,
        "instrument: piano",
        `tempo: ${lesson.tempo}`,
        `beat: ${lesson.beat}`,
        `sequence: ${sequence}`,
        "```",
      ].join("\n");
    if (lesson.splitAt) {
      const tokens = lesson.sequence.match(/\[[^\]]+\](?:\/\d+(?:\.\d+)?)?|[A-Ga-g](?:#|b)?-?\d+(?:\/\d+(?:\.\d+)?)?/gu) || [];
      const boundaries = [0, ...(Array.isArray(lesson.splitAt) ? lesson.splitAt : [lesson.splitAt]), tokens.length];
      return boundaries.slice(0, -1).map((start, index) => renderNotes(
        tokens.slice(start, boundaries[index + 1]).join(" "),
        `-${String.fromCharCode(97 + index)}`,
        String.fromCharCode(65 + index)
      )).join("\n\n");
    }
    return renderNotes(lesson.sequence, "", title);
  }
  if (lesson.kind === "compare") {
    return [
      "```compare",
      `id: ${id}-exercise`,
      `title: ${title}`,
      `root: ${lesson.root}`,
      `scale: ${lesson.scale}`,
      `tempo: ${lesson.tempo}`,
      `a: ${lesson.a}`,
      `b: ${lesson.b}`,
      "label.a.en: A",
      "label.b.en: B",
      "```",
    ].join("\n");
  }
  if (lesson.kind === "tap") {
    return [
      "```tap",
      `id: ${id}-exercise`,
      `title: ${title}`,
      `tempo: ${lesson.tempo}`,
      `pattern: ${lesson.pattern}`,
      "countIn: 4",
      "toleranceMs: 120",
      "```",
    ].join("\n");
  }
  throw new Error(`Unsupported lesson kind: ${lesson.kind}`);
}

function proseUnits(body) {
  const prose = body
    .split("\n")
    .filter((line) => !/^\s*(?:#|:::checkpoint\b|:::)/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const whitespaceWords = prose ? prose.split(/\s+/u).length : 0;
  const cjkCharacters = (prose.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  return Math.max(whitespaceWords, Math.floor(cjkCharacters / 2));
}

function renderLesson(level, unitDefinition, lesson, lessonOrder) {
  const id = `harmony-${level}-${unitDefinition.id}-${lesson.slug}`;
  const localizedLesson = {
    ...lesson,
    target: Object.fromEntries(LOCALES.map((locale) => [
      locale,
      targetForLocale(unitDefinition, lesson, lessonOrder - 1, locale),
    ])),
  };
  const titles = Object.fromEntries(LOCALES.map((locale) => [
    locale,
    localizedTitle(localizedLesson.action, localizedLesson.target, locale),
  ]));
  const summaries = Object.fromEntries(LOCALES.map((locale) => [
    locale,
    conciseSummaryFor(unitDefinition, localizedLesson, locale, lessonOrder - 1),
  ]));
  const bodies = Object.fromEntries(LOCALES.map((locale) => {
    const body = conciseLessonBody(unitDefinition, localizedLesson, locale, lessonOrder - 1);
    const units = proseUnits(body);
    if (units < 120 || units > 180) {
      const message = `${id} ${locale} has ${units} prose units; expected 120...180.`;
      if (process.env.HARMONY_LENGTH_AUDIT === "1") console.log(message);
      else throw new Error(message);
    }
    return [locale, body];
  }));
  const estimatedMinutes = 5 + ((lessonOrder - 1) % 4);
  const frontMatter = [
    "---",
    "schema: 2",
    `id: ${id}`,
    "course: chords-harmony",
    `level: ${level}`,
    `section: ${level}`,
    `unit: ${unitDefinition.id}`,
    `order: ${lessonOrder}`,
    "revision: 1",
    `estimatedMinutes: ${estimatedMinutes}`,
    `instrument: ${lesson.kind === "notes" ? "piano" : "adaptive"}`,
    ...LOCALES.map((locale) => `title.${locale}: ${titles[locale]}`),
    ...LOCALES.map((locale) => `summary.${locale}: ${summaries[locale]}`),
    "---",
  ].join("\n");
  const localized = [
    ":::localized",
    ...LOCALES.flatMap((locale) => [`:::locale ${locale}`, bodies[locale]]),
    ":::endlocalized",
  ].join("\n");
  const markdown = `${frontMatter}\n\n${localized}\n\n${fenceFor(lesson, id, neutralFenceTitle(lesson))}\n`;
  return { id, titles, summaries, estimatedMinutes, markdown };
}

function activityFor(kind) {
  return {
    chord: "chords",
    progression: "harmony",
    notes: "guided-practice",
    compare: "ear-training",
    tap: "rhythm",
  }[kind];
}

function assertWithinCourse(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(`${COURSE_ROOT}${path.sep}`)) {
    throw new Error(`Refusing to write outside chords-harmony: ${resolved}`);
  }
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const seenIDs = new Set();
  const seenTitles = new Set();
  let generatedCount = 0;

  for (const section of catalog.sections) {
    const plannedUnits = CURRICULUM[section.id];
    if (!plannedUnits) continue;
    if (plannedUnits.length !== 10) throw new Error(`${section.id} must contain exactly ten generated units.`);
    const generatedUnitIDs = new Set(plannedUnits.map((entry) => entry.id));
    section.units = section.units.filter((entry) => !generatedUnitIDs.has(entry.id));
    const startingOrder = section.units.length + 1;

    for (const [unitIndex, unitDefinition] of plannedUnits.entries()) {
      const unitOrder = startingOrder + unitIndex;
      const lessonEntries = [];
      const unitRoot = path.join(
        COURSE_ROOT,
        "levels", section.level,
        "sections", section.id,
        "units", unitDefinition.id);
      assertWithinCourse(unitRoot);
      if (fs.existsSync(unitRoot)) fs.rmSync(unitRoot, { recursive: true });

      for (const [lessonIndex, lesson] of unitDefinition.lessons.entries()) {
        const rendered = renderLesson(section.level, unitDefinition, lesson, lessonIndex + 1);
        if (!rendered.id.startsWith("harmony-")) throw new Error(`Generated id lacks harmony- prefix: ${rendered.id}`);
        if (seenIDs.has(rendered.id)) throw new Error(`Duplicate generated lesson id: ${rendered.id}`);
        seenIDs.add(rendered.id);
        if (seenTitles.has(rendered.titles.en)) {
          const message = `Duplicate English lesson title: ${rendered.titles.en}`;
          if (process.env.HARMONY_LENGTH_AUDIT === "1") console.log(message);
          else throw new Error(message);
        }
        seenTitles.add(rendered.titles.en);

        const relativePath = `levels/${section.level}/sections/${section.id}/units/${unitDefinition.id}/lessons/${rendered.id}/lesson.md`;
        const absolutePath = path.join(COURSE_ROOT, relativePath);
        assertWithinCourse(absolutePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, rendered.markdown);
        lessonEntries.push({
          id: rendered.id,
          order: lessonIndex + 1,
          estimatedMinutes: rendered.estimatedMinutes,
          activity: activityFor(lesson.kind),
          instrument: lesson.kind === "notes" ? "piano" : "adaptive",
          optional: true,
          titles: rendered.titles,
          summaries: rendered.summaries,
          path: relativePath,
        });
        generatedCount += 1;
      }

      section.units.push({
        id: unitDefinition.id,
        order: unitOrder,
        titles: unitDefinition.titles,
        summaries: unitDefinition.summaries,
        theme: ["music.note.list", "ear", "pianokeys", "waveform", "metronome"][unitIndex % 5],
        lessons: lessonEntries,
      });
    }
  }

  if (generatedCount !== 300) throw new Error(`Expected 300 generated lessons, got ${generatedCount}.`);
  catalog.revision = 3;
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Generated ${generatedCount} chords-harmony lessons in 30 units.`);
}

main();
