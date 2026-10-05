{
  "schema": 1,
  "kind": "independent-editorial-language-review",
  "status": "changes_required",
  "verdictSummary": "All 36 lessons were read in full in all six locales and every playable sequence was checked by hand. I found no musical, alignment, physical-demand, concept-answer or false-evaluation-claim defect. Changes are required only for text: stale pilot wording in the six ukulele lessons and in the paths.json path summaries (plus its pending metadata), and a missing German B/H notice in one mandolin lesson. 29 lesson files are approved as read; 7 lesson files and paths.json are not approved in their current bytes.",
  "reviewer": "Claude Opus 5.5 (model id claude-opus-5-5), max effort; independent AI editorial and language reviewer; read-only session (Read, Grep, Glob only)",
  "reviewedAt": "2026-10-04",
  "reviewedAtNote": "Session-local date from the environment. I had no clock access; the UTC date is 2026-10-05 (the newest record I read is stamped 2026-10-05T00:36:46.909Z). The root should stamp the exact receipt time.",
  "reviewNature": "AI editorial and six-language text review. Not a native-speaker certification. Not a physical playthrough. No audio was rendered or heard, and no parser or validator was executed.",
  "ownerContext": "The owner release approval (basis owner-release, playthrough not-claimed) is taken as given. This review neither adds nor implies a physical playthrough.",
  "dataRoot": "/Users/thiagomartins/Developer/AppsGitHub/InstrumentScalesOnlineData",
  "findingPathBase": "editorial/candidates/",
  "hashBinding": {
    "sha256RecomputedByReviewer": false,
    "reason": "Bash was denied by the session permission mode (three attempts, including shasum -a 256) and no other available tool can hash bytes.",
    "sha256Source": "The sha256 values in reviewedFiles are copied from Docs/Implementation/2026-10-04-activation/review/pilot-content-inventory.json. They also match documentSHA256 in editorial/approvals/2026-10-04-guided-pilot-owner-release.json as I read it. They are expected hashes, not hashes I computed.",
    "whatBindsMyReading": "Each entry carries the line count I read plus the listening and transfer sequences exactly as read, so the reviewed text can be checked against the bytes the root hashes.",
    "rootMustDo": "Recompute sha256 for the 36 files and compare with the inventory before binding any verdict. A verdict applies only to a file whose current bytes hash to the listed value.",
    "candidatePathsJsonSha256": null
  },
  "coverage": {
    "lessonFilesInInventory": 36,
    "lessonFilesReadInFull": 36,
    "lessonFilesSampledOnly": 0,
    "lessonFilesUnread": 0,
    "lessonLinesRead": 9476,
    "stepsPerFile": 6,
    "localesReadPerFile": 6,
    "localizedSectionsRead": 1296,
    "frontMatterTitleAndSummaryStringsRead": 432,
    "checkpointsRead": 216,
    "notesBlocksVerified": 114,
    "fretboardBlocksVerified": 30,
    "quizBlocksVerified": 6,
    "tapBlocksVerified": 2,
    "candidatePathsJson": { "path": "editorial/candidates/paths.json", "linesRead": 1488, "readInFull": true, "paths": 5, "units": 6, "placements": 36 },
    "filesApprovedAsRead": 29,
    "filesChangesRequired": 7
  },
  "independentReview": {
    "status": "changes_required",
    "scope": "Musical correctness (MIDI, pitch, octave, string, fret, re-entrant high G, mandolin courses), demonstration versus instruction alignment, physical demands, concept answers, observable assessment, meaningful content, absence of false automatic-evaluation claims.",
    "result": "No defect found in any of these dimensions in any of the 36 lessons. The only editorial changes required are removal of stale pilot wording in the six ukulele lessons (F01) and in the paths.json path summaries and metadata (F02, F03).",
    "filesPassingAsRead": 30,
    "filesRequiringChange": 6,
    "note": "The 30 passing files are the 29 approved files plus mandolin-cross-the-fifth, whose only required change falls under the languages verdict (F04)."
  },
  "languages": {
    "status": "changes_required",
    "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
    "result": "Instructions are clear and usable in all six locales. Required: F01 in all six locales (six ukulele files) and F04 in German (one mandolin file). The other language findings are recommendations.",
    "filesPassingAsRead": 29,
    "filesRequiringChange": 7,
    "perLocale": {
      "en": "Clear, consistent British English. Required: F01. Low: F13, F14, F25.",
      "pt-BR": "Natural and clear. Required: F01. Medium: F06, F07. Low: F16, F18.",
      "es": "Clear. Required: F01. Medium: F07. Low: F09, F16, F18.",
      "de": "Clear. Required: F01, F04. Medium: F05. Low: F12, F17.",
      "ja": "Clear polite-form instructions. Required: F01. Low: F10, F18, F19. My terminology confidence is moderate.",
      "zh-Hans": "Clear. Required: F01. Medium: F07, F08. Low: F11, F19. My terminology confidence is moderate."
    }
  },
  "explicitApproval": "For the 29 files marked approved below, as read, I approve the editorial review and the six-language text review within the stated limits: AI review, not native-speaker certification, not a physical playthrough, and hashes not recomputed by me. For the 7 files marked changes_required and for candidate paths.json I do not approve the current bytes.",
  "afterFixes": "Re-review is needed only for bytes that change: the 7 lesson files, paths.json, and any other file touched while bundling optional findings. If F01 to F04 are applied as specified and nothing else changes, I expect no remaining blocker, but that is an expectation and not an approval of unread bytes. F02 text changes will change all five pathManifestsSHA256 values in the approval record.",
  "requiredChangeIds": ["F01", "F02", "F03", "F04"],
  "findings": [
    {
      "id": "F01",
      "severity": "required",
      "blocking": true,
      "category": "stale-pilot-wording",
      "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
      "locations": [
        "guided/ukulele/reentrant-foundation/ukulele-know-the-four-strings/lesson.md:36,43,50,57,64,71",
        "guided/ukulele/reentrant-foundation/ukulele-a-clean-c-chord/lesson.md:36,43,50,57,64,71",
        "guided/ukulele/reentrant-foundation/ukulele-strum-and-rest/lesson.md:36,43,50,57,64,71",
        "guided/ukulele/reentrant-foundation/ukulele-melody-on-two-strings/lesson.md:36,43,50,57,64,71",
        "guided/ukulele/reentrant-foundation/ukulele-melody-and-chord-answer/lesson.md:36,43,50,57,64,71",
        "guided/ukulele/reentrant-foundation/ukulele-reentrant-unison/lesson.md:36,43,50,57,64,71"
      ],
      "issue": "The shared ukulele setup sentence calls the released course a pilot in every locale: en 'This pilot does not describe low-G tuning', pt-BR 'O piloto não descreve sol grave', es 'Este piloto no describe sol grave', de 'Dieser Pilot gilt nicht für tiefes G', ja 'このパイロットは低いGの調弦用ではありません', zh-Hans '本试点不描述低G调弦'. It is user-visible in the orientation step of every ukulele lesson. In de and ja the bare word also reads as an aircraft pilot. A grep of all 36 lessons found pilot wording only in these six files.",
      "fix": {
        "action": "Replace the setup paragraph in all six ukulele lessons. The single source appears to be the ukulele entry of SETUP_TEXT in scripts/author-guided-pilot.py (I read only its guitar and bass entries).",
        "en": "Use four strings G4–C4–E4–A4 with high G. String 1 is A. These lessons do not cover low-G tuning; check the octave before practising.",
        "pt-BR": "Use quatro cordas G4–C4–E4–A4 com sol agudo. Corda 1 é lá. Estas lições não abordam a afinação com sol grave; confira a oitava antes de praticar.",
        "es": "Usa cuatro cuerdas G4–C4–E4–A4 con sol agudo. La cuerda 1 es la. Estas lecciones no cubren la afinación con sol grave; comprueba la octava.",
        "de": "Nutze G4–C4–E4–A4 mit hohem G. Saite 1 ist A. Diese Lektionen gelten nicht für tiefes G; prüfe vorher die Oktave.",
        "ja": "高いGのG4–C4–E4–A4です。第1弦はAです。これらのレッスンは低いGの調弦用ではありません。練習前にオクターブを確認します。",
        "zh-Hans": "使用高G的G4–C4–E4–A4，第1弦为A。这些课程不涉及低G调弦，练习前核对八度。"
      }
    },
    {
      "id": "F02",
      "severity": "required",
      "blocking": true,
      "category": "stale-pilot-wording",
      "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
      "locations": ["paths.json:24-29", "paths.json:489-494", "paths.json:743-748", "paths.json:992-997", "paths.json:1246-1251"],
      "issue": "All five path-level summaries read 'A finite foundation pilot.' and its translations ('Piloto finito de fundamentos.', 'Ein begrenzter Grundlagenpilot.', '範囲を定めた基礎パイロットです。', '范围明确的基础试点。'). I presume this field is shown as the course summary; I did not check the UI code.",
      "fix": {
        "action": "Replace with a truthful description of each path. Suggested text follows; any replacement must be re-read.",
        "guitar-foundation": {
          "en": "Foundations: find notes, count rests and shape short phrases across two strings.",
          "pt-BR": "Fundamentos: localize notas, conte pausas e construa frases curtas em duas cordas.",
          "es": "Fundamentos: localiza notas, cuenta silencios y crea frases cortas en dos cuerdas.",
          "de": "Grundlagen: Töne finden, Pausen zählen und kurze Phrasen auf zwei Saiten gestalten.",
          "ja": "基礎：音を見つけ、休符を数え、2本の弦で短いフレーズを作ります。",
          "zh-Hans": "基础：找音、数休止，并在两根弦上组织短乐句。"
        },
        "bass-foundation": {
          "en": "Foundations: roots, fifths, note length and chord arrivals that support a four-bar accompaniment.",
          "pt-BR": "Fundamentos: tônicas, quintas, duração das notas e chegadas que sustentam quatro compassos de acompanhamento.",
          "es": "Fundamentos: fundamentales, quintas, duración de las notas y llegadas que sostienen cuatro compases de acompañamiento.",
          "de": "Grundlagen: Grundtöne, Quinten, Tondauer und Ankünfte, die vier Begleittakte tragen.",
          "ja": "基礎：ルート、5度、音の長さ、和音の変わり目への着地で4小節の伴奏を支えます。",
          "zh-Hans": "基础：用根音、五音、时值与和弦到达支撑四小节伴奏。"
        },
        "piano-foundation": {
          "en": "Foundations: a five-finger melody, counted rests and simple left-hand roots.",
          "pt-BR": "Fundamentos: melodia de cinco dedos, pausas contadas e fundamentais simples na mão esquerda.",
          "es": "Fundamentos: melodía de cinco dedos, silencios contados y fundamentales sencillas en la mano izquierda.",
          "de": "Grundlagen: Fünffinger-Melodie, gezählte Pausen und einfache Grundtöne in der linken Hand.",
          "ja": "基礎：5本の指の旋律、休符の数え方、左手のシンプルなルートを学びます。",
          "zh-Hans": "基础：五指旋律、数休止，以及左手的简单根音。"
        },
        "ukulele-foundation": {
          "en": "Foundations for high-G (re-entrant) tuning: string order, a C chord, strumming with rests and a short melody.",
          "pt-BR": "Fundamentos para afinação com sol agudo (reentrante): ordem das cordas, acorde C, batida com pausas e uma melodia curta.",
          "es": "Fundamentos para afinación con sol agudo (reentrante): orden de las cuerdas, acorde C, rasgueo con silencios y una melodía corta.",
          "de": "Grundlagen für die Stimmung mit hohem G (re-entrant): Saitenfolge, C-Akkord, Anschlag mit Pausen und eine kurze Melodie.",
          "ja": "高いG（リエントラント）調弦の基礎：弦の順番、Cコード、休符を入れたストローク、短い旋律を学びます。",
          "zh-Hans": "高G（回入式）调弦基础：弦序、C和弦、带休止的扫弦和一段短旋律。"
        },
        "mandolin-foundation": {
          "en": "Foundations: paired courses tuned in fifths, alternate picking and a short phrase with an open D voicing.",
          "pt-BR": "Fundamentos: pares de cordas afinados em quintas, palhetada alternada e uma frase curta com uma disposição aberta de D.",
          "es": "Fundamentos: órdenes dobles afinados en quintas, púa alternada y una frase corta con una disposición abierta de D.",
          "de": "Grundlagen: Doppelchöre in Quinten, Wechselschlag und eine kurze Phrase mit offener D-Lage.",
          "ja": "基礎：5度に調弦した複弦、ダウンとアップの交互ピッキング、開放Dの配置を使った短いフレーズを学びます。",
          "zh-Hans": "基础：五度定弦的双弦组、交替拨弦，以及带开放D排列的短乐句。"
        }
      }
    },
    {
      "id": "F03",
      "severity": "required",
      "blocking": true,
      "category": "pending-metadata",
      "locales": [],
      "locations": ["paths.json:473-474", "paths.json:727-728", "paths.json:976-977", "paths.json:1230-1231", "paths.json:1484-1485"],
      "issue": "Every path still carries publicationStatus 'review-pending' and humanPlaythrough 'pending'. This is the expected pre-promotion state named in the brief.",
      "fix": "At promotion write publicationStatus 'approved' and humanPlaythrough 'not-claimed', with an approval record of basis 'owner-release'. These values match LKLearningPath.swift:35,43 and LKPathApprovalRecord.swift:70-71,114 in the uncommitted app working tree. Never write humanPlaythrough 'approved'. LKPathManifestDigest.swift:13-14 appears to normalise these two fields before hashing, so they should not affect manifest digests, unlike F02."
    },
    {
      "id": "F04",
      "severity": "required",
      "blocking": true,
      "category": "german-note-naming",
      "locales": ["de"],
      "locations": ["guided/mandolin/paired-courses/mandolin-cross-the-fifth/lesson.md:22,55,119,201,246", "paths.json:1384"],
      "issue": "The German text names B4 with no notice that international note names are used. In German, B means B flat, so 'A4–B4 auf A' reads as A4 to B flat 4 (fret 1), while the demonstration plays B natural at course 2 fret 2 (MIDI 71). The content's own convention adds 'Internationale Notennamen: B bedeutet H.' wherever German text names B: it appears in all 12 guitar lessons (19 occurrences) and in no mandolin lesson. Mitigation: the fretboard position and audio are exact, and the same sentence writes F#4 rather than Fis, which hints at international naming. I still do not sign the German text of this file without the notice.",
      "fix": "Append the notice to summary.de and its two repeats: 'Spiele D4–F#4 auf D und A4–B4 auf A, dann zurück. Internationale Notennamen: B bedeutet H.' (lesson lines 22, 55, 119; paths.json line 1384). Lines 201 and 246 can stay once the notice is in the lesson. Alternative that also resolves F05: put the notice in the German mandolin setup sentence (line 57 of all six mandolin lessons), which changes all six mandolin hashes."
    },
    {
      "id": "F05",
      "severity": "medium",
      "blocking": false,
      "category": "german-note-naming",
      "locales": ["de"],
      "locations": ["guided/mandolin/paired-courses/mandolin-a-four-bar-phrase/lesson.md:57,103,136,222"],
      "issue": "B4 appears in the displayed notation (lines 103, 136, 222) but the German prose of this lesson never names B and its setup line 57 carries no B/H notice.",
      "fix": "Use the German mandolin setup sentence for the notice: 'Nutze acht Saiten in vier Chören G3–D4–A4–E5. Chor 1 ist E. Internationale Notennamen: B bedeutet H. Ein dargestellter Chor meint zwei Unisonosaiten, keine unabhängig gegriffenen Stimmen.'"
    },
    {
      "id": "F06",
      "severity": "medium",
      "blocking": false,
      "category": "terminology",
      "locales": ["pt-BR"],
      "locations": [
        "guided/mandolin/paired-courses/mandolin-hear-paired-courses/lesson.md:17,18,39,41,43,113,150,191,236,264,270",
        "guided/mandolin/paired-courses/mandolin-alternate-on-one-course/lesson.md:17,18,39,41,43,113",
        "guided/mandolin/paired-courses/mandolin-cross-the-fifth/lesson.md:17,18,39,41,43,113",
        "guided/mandolin/paired-courses/mandolin-a-small-d-triad/lesson.md:18,41,43,113,150",
        "guided/mandolin/paired-courses/mandolin-a-four-bar-phrase/lesson.md:17,18,39,41,43,113,150",
        "guided/mandolin/paired-courses/mandolin-two-attacks-one-note/lesson.md:43",
        "paths.json:1283,1291,1312,1320,1343,1351,1374,1382,1413,1436,1444"
      ],
      "issue": "'curso' is used for a string course ('Ouça os cursos duplos', 'Alterne em um curso'). The established Portuguese terms are 'ordem' or simply 'par de cordas'; 'curso' is a calque and collides with the app's own 'cursos' (lesson courses). The first lesson defines the word in context, so it is decodable. I am about 80 percent confident of this judgement; a Brazilian mandolin player should confirm.",
      "fix": "Prefer 'par de cordas / pares' (alternative: 'ordem / ordens duplas'). Examples: 'Ouça os pares de cordas'; 'Use oito cordas em quatro pares G3–D4–A4–E5. O par 1 é mi. Cada par exibido representa duas cordas em uníssono, não vozes com digitação independente.'; 'No par ré toque casas 0–2–4–5…'; 'Cruze ao próximo par'; 'Uma frase entre pares'."
    },
    {
      "id": "F07",
      "severity": "medium",
      "blocking": false,
      "category": "terminology",
      "locales": ["es", "pt-BR", "zh-Hans"],
      "locations": [
        "guided/bass/supporting-line/bass-length-and-release/lesson.md:17,39,150",
        "guided/bass/supporting-line/bass-length-and-release/lesson.md:19,46,155",
        "guided/bass/supporting-line/bass-length-and-release/lesson.md:25,67",
        "guided/guitar/two-places/guitar-change-the-touch/lesson.md:170",
        "paths.json:534,535,617,618,621"
      ],
      "issue": "'Release' is rendered with words that read differently in music. es 'soltura' normally means ease or fluency ('tocar con soltura'), so 'Duración y soltura' and 'practica solo la soltura' mislead. pt-BR 'soltura' is unusual here (release from custody, colloquially loose bowels). zh '放音' usually means playback; the lesson body itself uses '止音', and '提早放音' can be read as starting the note early.",
      "fix": "es: title 'Duración y corte de la nota'; line 155 '…baja el tempo y practica solo el corte de la nota.'; paths.json 535 '…quintas, cortes limpios y llegadas armónicas…'. pt-BR: title 'Duração e corte da nota'; line 150 'Se ruído ocupar a pausa, reduza o andamento e pratique apenas o corte da nota.'; paths.json 534 '…quintas, cortes limpos e chegadas harmônicas…'. zh-Hans: title '时值与止音' (lines 25, 67; paths.json 621); guitar-change-the-touch line 170 '若断开改变速度，提早止音，起音仍在原拍。'"
    },
    {
      "id": "F08",
      "severity": "medium",
      "blocking": false,
      "category": "terminology",
      "locales": ["zh-Hans"],
      "locations": ["guided/bass/supporting-line/bass-arrive-at-the-change/lesson.md:26,69,125,268,274", "paths.json:660"],
      "issue": "'A小调' and 'D小调' name keys, but the lesson means the chords Am and Dm.",
      "fix": "Lines 26, 69, 125 and paths.json 660: '伴奏一小节Am和弦和一小节Dm和弦，各自从A1和D2开始。' Line 268: 'Dm和弦的小节从哪个根音开始？' Line 274: 'Dm和弦的根音是D，A是五音。练习到达D前先止住A。'"
    },
    {
      "id": "F09",
      "severity": "low",
      "blocking": false,
      "category": "orthography",
      "locales": ["es"],
      "locations": ["guided/bass/supporting-line/bass-root-on-one/lesson.md:155", "guided/bass/supporting-line/bass-length-and-release/lesson.md:20,48,116", "paths.json:626"],
      "issue": "'deténla' and 'deténlo' carry an accent that current RAE orthography drops.",
      "fix": "Write 'detenla' and 'detenlo'."
    },
    {
      "id": "F10",
      "severity": "low",
      "blocking": false,
      "category": "omission",
      "locales": ["ja"],
      "locations": ["guided/guitar/two-places/guitar-choose-the-ending/lesson.md:24,62,122", "paths.json:405"],
      "issue": "The Japanese drops 'imagined': 'C和音の上で' suggests a C chord actually sounds, but none is played.",
      "fix": "'同じ出だしを、想像したCコードの上でC4またはG4に終わらせて比べます。'"
    },
    {
      "id": "F11",
      "severity": "low",
      "blocking": false,
      "category": "terminology",
      "locales": ["zh-Hans"],
      "locations": ["guided/mandolin/paired-courses/mandolin-two-attacks-one-note/lesson.md:211,256"],
      "issue": "'轮指' is a finger-rotation tremolo (pipa, classical guitar). Plectrum tremolo on mandolin is normally '震音'. Moderate confidence.",
      "fix": "'把两次起音移到末尾D4；这还不是震音（tremolo）。'"
    },
    {
      "id": "F12",
      "severity": "low",
      "blocking": false,
      "category": "german-polish",
      "locales": ["de"],
      "locations": [
        "guided/mandolin/paired-courses/mandolin-hear-paired-courses/lesson.md:160",
        "guided/guitar/two-places/guitar-cross-two-strings/lesson.md:201,246",
        "guided/bass/supporting-line/bass-a-small-anticipation/lesson.md:22,55,119",
        "guided/bass/supporting-line/bass-arrive-at-the-change/lesson.md:21,53",
        "guided/piano/melody-and-support/piano-melody-with-roots/lesson.md:22,55,119",
        "paths.json:650,718,938"
      ],
      "issue": "Non-idiomatic or misspelt German: 'rauht' (old spelling and wrong verb), 'Schlagpause' (not a standard term), 'auf der nächsten eins' (nominalised beat number is capitalised), 'Komme zum Wechsel an', 'einer rechten Melodie' (reads as a proper melody).",
      "fix": "'Schwebt ein Chor oder klingt er rau, stimme beide Saiten einzeln.'; 'Wiederhole mit einer Pause von einem Schlag vor dem Saitenwechsel.'; 'Spiele D2 auf der Vier-und und nochmals auf der nächsten Eins.'; title 'Pünktlich zum Akkordwechsel'; '…und einer Melodie der rechten Hand, die auf C4 endet.'"
    },
    {
      "id": "F13",
      "severity": "low",
      "blocking": false,
      "category": "clarity",
      "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
      "locations": [
        "guided/bass/supporting-line/bass-root-and-fifth/lesson.md:186,191,196,201,206,211,231,236,241,246,251,256",
        "guided/guitar/two-places/guitar-same-pitch-two-strings/lesson.md:16-26,34-69,110-125",
        "paths.json:308-313"
      ],
      "issue": "The string:fret shorthand ('at 2:0 and 1:2', 'at 1:3 and 2:8') is used in prose and never defined for the learner.",
      "fix": "Spell it out ('string 2 open, then string 1 fret 2'; 'G4 on string 1 fret 3 and string 2 fret 8') or define it once in the orientation ('positions are written string:fret')."
    },
    {
      "id": "F14",
      "severity": "low",
      "blocking": false,
      "category": "clarity",
      "locales": ["en"],
      "locations": [
        "guided/ukulele/reentrant-foundation/ukulele-know-the-four-strings/lesson.md:16,34,110",
        "guided/ukulele/reentrant-foundation/ukulele-a-clean-c-chord/lesson.md:16,34,110,145",
        "paths.json:1036,1065,1096"
      ],
      "issue": "English uses 'course' for single ukulele strings ('in course order', 'play each course'), while the mandolin path defines a course as a pair. The other five locales correctly say string.",
      "fix": "'in physical string order (4 to 1)'; 'play each string'; 'test that string alone'; 'hear each string of the C chord'."
    },
    {
      "id": "F15",
      "severity": "low",
      "blocking": false,
      "category": "clarity",
      "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"],
      "locations": ["guided/mandolin/paired-courses/mandolin-a-small-d-triad/lesson.md:34,41,48,55,62,69,110-125"],
      "issue": "The three-course D voicing (D4, A4, F#5) is correct, but nothing tells the learner to leave the G course silent; strumming all four adds G3.",
      "fix": "Add one sentence: en 'Leave the G course silent.'; pt-BR 'Não toque o par sol.'; es 'No toques el orden sol.'; de 'Lass den G-Chor stumm.'; ja 'Gコースは鳴らしません。'; zh-Hans '不要弹G弦组。'"
    },
    {
      "id": "F16",
      "severity": "low",
      "blocking": false,
      "category": "consistency",
      "locales": ["pt-BR", "es"],
      "locations": [
        "guided/bass/supporting-line/bass-arrive-at-the-change/lesson.md:150,191,236,264,270",
        "guided/ukulele/reentrant-foundation/ukulele-a-clean-c-chord/lesson.md:191,196,236,241",
        "guided/ukulele/reentrant-foundation/ukulele-know-the-four-strings/lesson.md:264",
        "guided/ukulele/reentrant-foundation/ukulele-reentrant-unison/lesson.md:150"
      ],
      "issue": "pt-BR mixes 'tônicas' (body) and 'fundamental' (quiz) in one lesson. 'voz' is used for voicing in pt-BR and es where the mandolin path says 'disposição' / 'disposición'. pt-BR uses the anglicism 'setup' for tuning.",
      "fix": "Quiz: 'Qual tônica inicia o compasso de ré menor?' and 'D é a tônica de ré menor; A é sua quinta.' Voicing: 'a disposição mais leve de C' / 'la disposición más ligera de C'. Tuning: '…nesta afinação com sol agudo?' and '…precisa de outra afinação.'"
    },
    {
      "id": "F17",
      "severity": "low",
      "blocking": false,
      "category": "german-note-naming",
      "locales": ["de"],
      "locations": ["guided/guitar/notes-and-pulse/guitar-move-the-question/lesson.md:22", "paths.json:256", "guided/guitar/notes-and-pulse/guitar-hear-the-distance/lesson.md:266"],
      "issue": "The catalogue summary names B3 without the notice (the lesson body has it at line 57). The German quiz prompt offers B3–C4 with the notice only in the explanation.",
      "fix": "Append ' Internationale Notennamen: B bedeutet H.' to the summary; prompt 'Welches Paar umfasst einen Halbton? (B bedeutet H.)'"
    },
    {
      "id": "F18",
      "severity": "low",
      "blocking": false,
      "category": "ambiguity",
      "locales": ["ja", "pt-BR", "es"],
      "locations": [
        "guided/mandolin/paired-courses/mandolin-alternate-on-one-course/lesson.md:206,251",
        "guided/guitar/two-places/guitar-change-the-touch/lesson.md:18,20,41,48,113,116,191,196,236,241"
      ],
      "issue": "ja '反対の方向から' can be read as direction along the neck rather than pick stroke. On guitar, pt-BR 'ligada' and es 'ligada / Liga' also name the slur technique (hammer-on, pull-off), though the contrast with 'separadas' makes the intent recoverable.",
      "fix": "ja: '帰りを逆のストローク（ダウン／アップ）で始め、拍を保ちます。' pt-BR: 'com as notas conectadas' / 'Use notas conectadas na pergunta e separadas na resposta.' es: 'con las notas conectadas' / 'Conecta las notas de la pregunta y separa las de la respuesta.'"
    },
    {
      "id": "F19",
      "severity": "low",
      "blocking": false,
      "category": "typography",
      "locales": ["ja", "zh-Hans", "de"],
      "locations": [
        "guided/ukulele/reentrant-foundation/ukulele-strum-and-rest/lesson.md:208,213",
        "guided/guitar/notes-and-pulse/guitar-one-string-landmarks/lesson.md:55,57",
        "guided/guitar/notes-and-pulse/guitar-hear-the-distance/lesson.md:55,57"
      ],
      "issue": "A stray ASCII space follows the full stop '。' before the appended sentence in ja and zh. The B/H notice is printed twice in consecutive German paragraphs.",
      "fix": "Remove the space; keep the notice once per step."
    },
    {
      "id": "F20",
      "severity": "info",
      "blocking": false,
      "category": "assessment",
      "locales": [],
      "locations": ["guided/guitar/notes-and-pulse/guitar-count-the-silence/lesson.md:259-265", "guided/piano/melody-and-support/piano-breath-and-articulation/lesson.md:257-263"],
      "issue": "The two tap blocks have no localized sentence introducing them. Their patterns match the listening rhythm and the lessons make no claim about them; the app checks screen taps, not instrument playing.",
      "fix": "Optional: one localized line such as 'Tap this rhythm on screen; it checks your screen taps only, not your playing.'"
    },
    {
      "id": "F21",
      "severity": "info",
      "blocking": false,
      "category": "alignment",
      "locales": [],
      "locations": ["guided/guitar/notes-and-pulse/guitar-two-bar-answer/lesson.md:179", "guided/mandolin/paired-courses/mandolin-a-four-bar-phrase/lesson.md:179"],
      "issue": "These practice cells are variants, not excerpts, of the demonstrated phrase (C4 D4 - E4 against C4 D4 E4 -; F#4 E4 D4 - D4/2 against … E4 D4 F#4 - D4/2). Each is self-consistent with its own block and stated beat count.",
      "fix": "None needed; align with the demonstration if an exact excerpt is preferred."
    },
    {
      "id": "F22",
      "severity": "info",
      "blocking": false,
      "category": "sequencing",
      "locales": [],
      "locations": ["paths.json:243,451,705,954,1208,1462"],
      "issue": "The six extra placements declare no prerequisites but refer to earlier material ('the question', 'the phrase', 'return the roots to the left').",
      "fix": "Confirm the runtime shows extras only after the unit's core lessons, or add prerequisites."
    },
    {
      "id": "F23",
      "severity": "info",
      "blocking": false,
      "category": "content-quality",
      "locales": [],
      "locations": ["all 36 lesson.md: experiment step (line 110 block) and block title fields"],
      "issue": "Content is meaningful but heavily templated: each lesson repeats its summary verbatim in the front matter, the orientation and the experiment step, and block titles are symbolic ('A1 → -', '[G4,C4,E4,C5] → - · 4'). Each lesson still has a distinct objective, troubleshooting tip and transfer task.",
      "fix": "None required for release."
    },
    {
      "id": "F24",
      "severity": "info",
      "blocking": false,
      "category": "physical-demand",
      "locales": [],
      "locations": ["guided/guitar/two-places/guitar-same-pitch-two-strings/lesson.md:135"],
      "issue": "The only position above fret 5 in the set: 1:3 to 2:8 to 1:0 on consecutive beats. At 48 to 56 BPM with the stated 'move the hand' guidance I judge it reasonable, but this is reasoning, not a played test.",
      "fix": "None required; an owner or tester may wish to try this one first."
    },
    {
      "id": "F25",
      "severity": "low",
      "blocking": false,
      "category": "wording",
      "locales": ["en"],
      "locations": ["paths.json:16"],
      "issue": "The English path title 'Guitar / acoustic guitar' is a back-translation of pt-BR 'Guitarra / violão' and is redundant in English.",
      "fix": "'Guitar'."
    },
    {
      "id": "F26",
      "severity": "info",
      "blocking": false,
      "category": "terminology-uncertainty",
      "locales": ["zh-Hans", "ja"],
      "locations": ["paths.json:988,1062,1215", "guided/ukulele/reentrant-foundation/ukulele-know-the-four-strings/lesson.md:25,67"],
      "issue": "zh '回入式调弦' for re-entrant tuning and ja '高いGのウクレレ' are understandable but I cannot confirm they are the community-standard terms (ja players often say ハイG / High-G).",
      "fix": "Optional native check."
    }
  ],
  "verifiedChecks": [
    "Path setups are correct: guitar 40,45,50,55,59,64 (E2 A2 D3 G3 B3 E4); bass 28,33,38,43 (E1 A1 D2 G2); ukulele 67,60,64,69 (G4 C4 E4 A4, re-entrant high G); mandolin 55,62,69,76 (G3 D4 A4 E5) with stringsPerCourse 2; piano range 48 to 84 with C4 as middle C. Lesson tunings match.",
    "All 30 fretboard blocks: every string:fret position recomputed from the tuning equals its expectedNotes entry. String 1 is the highest-listed course, consistent with the texts.",
    "All 114 notes blocks: every pitch lies inside its path's MIDI range, and durations sum as stated. The 'N-beat cell' figure in each practice step matches its block in all 36 lessons.",
    "All 146 tempo fields are 56 or 48 and match the texts (56 listening and transfer, 48 practice).",
    "Summary and instruction text agree with the demonstration in all 36 lessons.",
    "All 6 quiz keys are correct in all six locales: D2, B3–C4, E4, 8, C4 (piano), C4 (ukulele).",
    "Both tap patterns (x x - x x - x/2) match their listening rhythms.",
    "No lesson claims automatic evaluation of playing. Every verify step, in all six locales, states that playback completion is listening evidence and the self-report does not certify execution. A grep for scoring, detection and microphone wording in six languages found nothing.",
    "Re-entrant high G is handled correctly: string 4 (G4) sounds above string 3 (C4), the unison 4:0 equals 2:3, and the low-G octave warning is right.",
    "Mandolin courses are handled correctly: four courses, eight strings, fretted per course; the chord 3:0, 2:0, 1:2 is D4, A4, F#5.",
    "Physical demands are appropriate on reasoning: slow tempi, frets 0 to 5 except one guitar position (F24), one-finger chords, five-finger piano positions, and an explicit shift instruction for frets 1–3–5.",
    "Structure: 36 files, each with 6 steps and all six locales in every step (grep counts 1080 plus 216), 216 checkpoints. The 36 placements in paths.json map one to one onto the 36 inventory files. Lesson titles and summaries agree with paths.json by reading, not by machine diff.",
    "Notation semantics were taken from PKNoteSequenceParser.swift, PKFretboardExercise.swift, PKTapExercise.swift and LKLessonDocument.swift, which I read; '/n' and '@n' are durations in beats."
  ],
  "reviewedFiles": [
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-a-small-anticipation/lesson.md", "sha256": "6f18f03d09fab35930ac244a3529a38d00fd122b56bd19cfc5996294f4e70dc0", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "A1/2 E2/1.5 D2/0.5 D2/2 A2/2", "transfer": "A1/2 E2/2 D2/2 A2/2" }, "findings": ["F12"] },
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-arrive-at-the-change/lesson.md", "sha256": "b264e546f69e0a1286f2913073c48b2da581b8b51941db335da8e035b5d3ee93", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 279, "listen": "A1/2 E2/2 D2/2 A2/2", "transfer": "A1/2 -/2 D2/2 -/2" }, "findings": ["F08", "F12", "F16"] },
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-four-bars-of-support/lesson.md", "sha256": "f54de56bf4b958498c692a5715462db6e44f076a5e8038685a9d3875b2fb998f", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "A1/2 E2/2 D2/2 A2/2 G1/2 D2/2 A1/2 -/2", "transfer": "A1/2 E2/2 D2/2 A2/2 G1/2 D2/2 A1 -/3" }, "findings": [] },
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-length-and-release/lesson.md", "sha256": "1e00de04c43506af14f1adccd9cb760e34c990393c5507d2e23af4b3c06c13e2", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "A1 - A1/2 A1 - E2/2", "transfer": "E2 - A1/2 E2 - A1/2" }, "findings": ["F07", "F09"] },
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-root-and-fifth/lesson.md", "sha256": "795944c919f9d99c69880a29ec5c5e108d824e740d66d9e6b5649cf0dd12347f", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "A1/2 E2/2 A1/2 E2/2", "transfer": "D2/2 A2/2 D2/2 A2/2" }, "findings": ["F13"] },
    { "path": "editorial/candidates/guided/bass/supporting-line/bass-root-on-one/lesson.md", "sha256": "115e465df7a05cc2f7c8ef1f6ffa37db9e46664daf99ebf4a6e21743b8b5e883", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "A1/2 -/2 A1/2 -/2", "transfer": "D2/2 -/2 D2/2 -/2" }, "findings": ["F09"] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-count-the-silence/lesson.md", "sha256": "ad4940aef211f96e9f1b9e89cd8044bd57a75e71834067df80b59a7a11a8dd21", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 267, "listen": "C4 D4 - E4 D4 - C4/2", "transfer": "C4 - D4 E4 D4 C4/2 -" }, "findings": ["F20"] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-hear-the-distance/lesson.md", "sha256": "c101e9d05d560683c6dccb5f8df1063cb0b3781b46cdc18bbdee7bd62e7f6f24", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 279, "listen": "B3 C4 - B3 C#4 - B3 C4", "transfer": "E4 F4 - E4 F4 - E4/2" }, "findings": ["F17", "F19"] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-move-the-question/lesson.md", "sha256": "5b3d3d4e5271f8f24545e1a4961c35da325c4ab8d99ba4c05700bd36d5f3949e", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "G3 A3 B3 A3 G3/2 -/2", "transfer": "C4 D4 E4 D4 C4/2 -/2 G3 A3 B3 A3 G3/2 -/2" }, "findings": ["F17"] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-one-string-landmarks/lesson.md", "sha256": "bceaa4ec8a88479564b1784b067eccd30f8da4e36f6bd55789afd3e19c98e275", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "B3 C4 D4 C4 B3/2 -/2", "transfer": "D4 C4 B3/2 -/4" }, "findings": ["F19"] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-three-note-question/lesson.md", "sha256": "fe697f9cb5aef069203adf30182285197a2d3398837ee27cf799fa4115b343a4", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 D4 C4/2 -/2", "transfer": "C4/2 D4 E4 D4 C4/2 -" }, "findings": [] },
    { "path": "editorial/candidates/guided/guitar/notes-and-pulse/guitar-two-bar-answer/lesson.md", "sha256": "1f8947aa1bc454d1081e2fb93b3dac3ed9dbb5aa885138ee4c33eef275256a91", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 - D4 C4 -/2", "transfer": "C4 D4 - E4 E4 D4 C4 -" }, "findings": ["F21"] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-change-the-touch/lesson.md", "sha256": "7adf651a900ae2a301d4ee02fcba99c9ba40ab1b816869c7acf09b489d9eed7e", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 D4 C4/2 -/2", "transfer": "C4 D4 E4 D4 C4/2 -/2 C4/0.5 -/0.5 D4/0.5 -/0.5 E4/0.5 -/0.5 D4/0.5 -/0.5 C4 - -/2" }, "findings": ["F07", "F18"] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-choose-the-ending/lesson.md", "sha256": "5fa22c7b7de504fb04f5971ec438ff3dad2de7a5f1d9e6b73b31c88862d9c2fd", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 C4/2 -/3 C4 D4 E4 G4/2 -/3", "transfer": "C4 D4 E4 G4 E4 D4 C4/2" }, "findings": ["F10"] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-cross-two-strings/lesson.md", "sha256": "94c1825eab69b4c5c113f76f7f42f78fb49ea30f441683559006e5213129da53", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 F4 E4 D4 C4 -", "transfer": "C4 D4 - E4 F4 E4 D4 C4" }, "findings": ["F12"] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-four-bar-story/lesson.md", "sha256": "c19ce5aff9791c04bcff489b9a66e643fec4d7f3d23fa50a2a92f192a17d8d27", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "C4 D4 E4 - G4 E4 D4 - C4 E4 G4 E4 D4 - C4/2", "transfer": "C4 D4 E4 - G4 E4 D4 - E4 G4 E4 D4 D4 - C4/2" }, "findings": [] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-hear-a-triad/lesson.md", "sha256": "7e8c4a0a6dabda325b8703ce2ba19cd04a573b570afa6bdd0f2f3bc5520942b5", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 279, "listen": "C4 E4 G4 E4 C4/2 -/2", "transfer": "C4 D4 E4 G4/2 E4 C4/2" }, "findings": [] },
    { "path": "editorial/candidates/guided/guitar/two-places/guitar-same-pitch-two-strings/lesson.md", "sha256": "9741e7a9b16b129d9646279fd945f5d8da9d2809817ac354a887e722286613ca", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "E4 E4 G4 G4 E4/2 -/2", "transfer": "E4 G4 E4/2 -/4" }, "findings": ["F13", "F24"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-a-four-bar-phrase/lesson.md", "sha256": "b7219858a0613f0ad1616acda40a6aa12e9dc50a01ce2cdbf50104827104cc11", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "D4 E4 F#4 - A4 B4 A4 - G4 F#4 E4 D4 F#4 - D4/2", "transfer": "D4 E4 F#4 - A4 B4 A4 - F#4 E4 E4 D4 F#4 - D4/2" }, "findings": ["F05", "F06", "F21"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-a-small-d-triad/lesson.md", "sha256": "712b26ebb092369aec2dd44460f29e805768eb1286c1669ad4157beaffdb5a8b", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "D4 F#4 A4 [D4,A4,F#5]/2 -/3", "transfer": "D4 F#4 A4 - [D4,A4,F#5]/2 -/2" }, "findings": ["F06", "F15"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-alternate-on-one-course/lesson.md", "sha256": "61820dc91cd67a4d6438c41a4b9c2754040d59286a953888e014374f59ddd21f", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "D4 E4 F#4 G4 F#4 E4 D4 -", "transfer": "G4 F#4 E4 D4/2 -/3" }, "findings": ["F06", "F18"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-cross-the-fifth/lesson.md", "sha256": "04e7f1edc0ad2fe719c08638f8d74302dd21bb1a1f206d5918cee8c2ae3e5e5d", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; the German text needs the B/H notice (F04).", "anchors": { "lines": 260, "listen": "D4 F#4 A4 B4 A4 F#4 D4 -", "transfer": "D4 F#4 A4/2 F#4 D4/2 -" }, "findings": ["F04", "F06"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-hear-paired-courses/lesson.md", "sha256": "31adb2a164fede2dab42c76c4205a1cf3754e1d3ac8052d1ae6dc704e2c6af5a", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 279, "listen": "G3 D4 A4 E5 E5 A4 D4 G3", "transfer": "G3 D4 G3 D4 - A4 E5 -" }, "findings": ["F06", "F12"] },
    { "path": "editorial/candidates/guided/mandolin/paired-courses/mandolin-two-attacks-one-note/lesson.md", "sha256": "6815c47703f9ce4a704be87ab8bb9452d8c6d444894d2c77eee95e30bf940362", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 260, "listen": "D4/0.5 D4/0.5 E4 F#4 G4 F#4 E4 D4/2", "transfer": "D4 E4 F#4 G4 F#4 E4 D4/0.5 D4/0.5 -" }, "findings": ["F06", "F11"] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-breath-and-articulation/lesson.md", "sha256": "fc712697eac5b77ec766a571528a7ccfbabe1f453253580069e62ba85a3d6ada", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 265, "listen": "C4 D4 - E4 G4 - C4/2", "transfer": "C4 D4 E4/0.5 -/0.5 G4/0.5 -/0.5 C4/2 -/2" }, "findings": ["F20"] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-find-the-region/lesson.md", "sha256": "f763d1aa62d01fc782963ef3d3a1c123ca9c023da664a027e4e03b710d2af812", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 277, "listen": "C4 D4 E4 F4 G4 F4 E4 C4", "transfer": "C4/2 C5/2 C4/2 -/2" }, "findings": [] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-five-finger-phrase/lesson.md", "sha256": "1ed4e76a70a3d15a241371da20a6006873b106dc04a392fe88ef4a83fed0060d", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 258, "listen": "C4 D4 E4 G4 F4 E4 D4 C4", "transfer": "E4 F4 G4 F4 E4 D4 C4/2" }, "findings": [] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-left-hand-anchor/lesson.md", "sha256": "ba4ec80b363c85f8348965d8f4a98f3f009e146c9974e3dfd401a360e3df8520", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 258, "listen": "[C3,C4] D4 E4 G4 [G3,F4] E4 D4 C4", "transfer": "C4 D4 E4 G4 F4 E4 D4 C4" }, "findings": [] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-melody-with-roots/lesson.md", "sha256": "6ce94625ed2ef830e2fc4b83c1e2c6d4772e97c3333f699fbba705504aaef077", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 258, "listen": "[C3,C4] D4 E4 - [F3,F4] E4 D4 - [G3,G4] F4 E4 D4 [C3,C4]/2 -/2", "transfer": "[C3,C4] D4 E4 - [F3,F4] G4 F4 - [G3,G4] F4 E4 D4 [C3,C4]/2 -/2" }, "findings": ["F12"] },
    { "path": "editorial/candidates/guided/piano/melody-and-support/piano-swap-a-small-role/lesson.md", "sha256": "7b0bb4007a63c3d8ce135569d40e6fc1fb267d14a7c89b101fdbbcba714b974b", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "approved", "anchors": { "lines": 258, "listen": "[C4,C5] D4 E4 - [F4,C5] E4 D4 C4", "transfer": "[C3,C4] D4 E4 G4 [G3,F4] E4 D4 C4" }, "findings": [] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-a-clean-c-chord/lesson.md", "sha256": "654afec33ba4add6d11f3123ee42bd4730f87e7d4fef57fb3b8f4e8ff801a3c3", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 260, "listen": "G4 C4 E4 C5 [G4,C4,E4,C5]/2 -/2", "transfer": "[C4,E4,C5]/2 -/2 [C4,E4,C5]/2 -/2" }, "findings": ["F01", "F14", "F16"] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-know-the-four-strings/lesson.md", "sha256": "337fb879fbbd26a6a95637feadd107f0797194cdba6c1cbb45145ce647ea4494", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 279, "listen": "G4 C4 E4 A4 A4 E4 C4 G4", "transfer": "C4 G4 C4 A4 - E4 C4/2" }, "findings": ["F01", "F14", "F16", "F26"] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-melody-and-chord-answer/lesson.md", "sha256": "8dfd2bfb330cc5a3401d2c7081e4e10d36656f619da1e71fe2ae04d17264a388", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 260, "listen": "E4 F4 G4 - [G4,C4,E4,C5]/2 -/2 E4 G4 A4 - [G4,C4,E4,C5]/2 -/2", "transfer": "G4 F4 E4 - [G4,C4,E4,C5]/2 -/2 G4 E4 A4 - [G4,C4,E4,C5]/2 -/2" }, "findings": ["F01"] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-melody-on-two-strings/lesson.md", "sha256": "3c133852f60fd43c72e18cb06017bd408ec3b92bfce28141d00713a0712218ba", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 260, "listen": "E4 F4 G4 A4 G4 F4 E4 -", "transfer": "A4 G4 F4 E4/2 -/3" }, "findings": ["F01"] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-reentrant-unison/lesson.md", "sha256": "7317efb3327aa2a660e34e448171aa4031d2a7d191e4516fa292aeac96976b75", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 260, "listen": "G4 G4 A4 G4/2 -/3", "transfer": "G4 A4 G4 A4 G4/2 -/2" }, "findings": ["F01", "F16"] },
    { "path": "editorial/candidates/guided/ukulele/reentrant-foundation/ukulele-strum-and-rest/lesson.md", "sha256": "79218c488957bda00b327a2df09dc3f0a86eb029eb20fb522532efe6f2064111", "sha256Source": "inventory-not-recomputed", "readInFull": true, "locales": ["en", "pt-BR", "es", "de", "ja", "zh-Hans"], "status": "changes_required", "statusNote": "Musical content passes; stale pilot wording must be removed (F01).", "anchors": { "lines": 260, "listen": "[G4,C4,E4,C5] - [G4,C4,E4,C5] - [G4,C4,E4,C5]/2 -/2", "transfer": "[G4,C4,E4,C5] - [C4,E4,C5] - [G4,C4,E4,C5]/2 -/2" }, "findings": ["F01", "F19"] }
  ],
  "candidatePathsJson": {
    "path": "editorial/candidates/paths.json",
    "sha256": null,
    "sha256Note": "Not in the inventory and not computable in this session.",
    "readInFull": true,
    "linesRead": 1488,
    "status": "changes_required",
    "requiredFindings": ["F02", "F03", "F04"],
    "otherFindings": ["F06", "F07", "F08", "F09", "F10", "F12", "F13", "F14", "F17", "F22", "F25", "F26"],
    "structureOk": "5 paths, 6 units, 36 placements; setups, capabilities, prerequisite chains and estimated minutes are consistent with the lessons."
  },
  "confidence": {
    "musicalData": "High. Every sequence and position was computed by hand against the tuning and the parser semantics I read; I found no error. Not confirmed by running the parser or hearing audio.",
    "demonstrationAlignment": "High.",
    "conceptAnswers": "High.",
    "noFalseEvaluationClaims": "High.",
    "physicalDemands": "Medium. Reasoned from positions and tempi; nothing was played.",
    "languages": {
      "en": "High.",
      "pt-BR": "Medium-high; F06 and F07 need a native musician's confirmation.",
      "es": "Medium-high.",
      "de": "Medium-high.",
      "ja": "Medium; grammar and clarity checked, instrument terminology less certain.",
      "zh-Hans": "Medium; grammar and clarity checked, instrument terminology less certain."
    },
    "hashBinding": "None from me; see hashBinding."
  },
  "limits": [
    "No sha256 was computed by me; inventory values are reported as expected hashes.",
    "No parser, validator or test was executed; structure was checked by reading and by grep counts.",
    "No audio was rendered or heard, and no instrument was played.",
    "Language review is by an AI, not a native speaker; terminology findings carry the stated uncertainty.",
    "Lesson front matter was compared with paths.json by reading, not by machine diff.",
    "Suggested replacement texts are my own drafts and are themselves unreviewed."
  ],
  "notReviewed": [
    "editorial/candidates/legacy-repairs and editorial/candidates/riffs.json",
    "Currently published originals and anything under v2, dist or .editorial-state",
    "App UI strings, the tap and quiz UI, audio samples",
    "scripts/author-guided-pilot.py beyond the few lines surfaced by one grep",
    "The correctness of the approval record or promotion tooling"
  ],
  "sessionNotices": [
    "Bash was denied in this session, so hashes and validators could not be run; everything else requested was completed with Read, Grep and Glob.",
    "No file was edited, nothing was published, and no browser was used.",
    "Unrelated to this review: the claude.ai Google Drive connector needs authorization in claude.ai connector settings and is unavailable in this non-interactive session until then. It was not needed here."
  ]
}
