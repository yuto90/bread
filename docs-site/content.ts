export type Section = {
  id: string;
  title: string;
  paragraphs?: string[];
  code?: string;
  table?: string[][];
  samples?: string[];
};
export type Guide = {
  slug: string;
  title: string;
  summary: string;
  sections: Section[];
};
export const sampleIds = [
  "blink",
  "three-leds",
  "6-leds",
  "temperature-alarm",
  "diode-led",
  "diode-decoupling",
] as const;
export const guides: Record<"en" | "ja", Guide[]> = {
  en: [
    {
      slug: "index",
      title: "Connections in. Wiring out.",
      summary:
        "Bread turns a small connection-only language into a checked breadboard wiring diagram. Start with an example, then learn the supported rules.",
      sections: [
        {
          id: "workflow",
          title: "Describe → verify → wire",
          paragraphs: [
            "Describe parts and nets, not hole positions. Bread assigns supported components to a fixed breadboard, adds jumper wires, then independently reconstructs physical connectivity and compares it with the logical nets.",
            "The Playground runs the same compiler and renderer in a browser worker. Source stays in the tab; reloading discards edits. Only the language preference is saved locally. No account or circuit upload is required.",
          ],
        },
        {
          id: "first-diagram",
          title: "A complete first diagram",
          samples: ["blink"],
        },
        {
          id: "boundaries",
          title: "Understand what is verified",
          paragraphs: [
            "A matching netlist establishes modeled connectivity. It does not establish voltage/current limits, component fit, safe assembly, firmware behavior or simulation. Use the Limits guide before building hardware.",
            "This documentation describes the checked-out build, including the two discrete-part samples. A separately deployed Playground can be an older version. Follow its available sample buttons and support information.",
          ],
        },
      ],
    },
    {
      slug: "quickstart",
      title: "Quickstart",
      summary:
        "Try a supported sample in the browser or render it locally with Node 24.19.0.",
      sections: [
        {
          id: "browser",
          title: "Use the Playground",
          paragraphs: [
            "Open the Playground, choose a sample and wait for “static nets verified”. Edit a connection to see validation and a new diagram. Use Fit, zoom and scrolling to inspect the insertion guide.",
            "Download SVG is enabled only for the current valid source. After an error, the previous drawing stays visible with a stale label and cannot be downloaded until the source is valid again. Copy edited source somewhere safe before reloading.",
            "Use the English / 日本語 selector for UI language. DSL identifiers and exported diagrams remain unchanged. Japanese diagnostics include guidance and preserve the original compiler detail.",
          ],
        },
        {
          id: "local",
          title: "Run from source",
          code: "git clone https://github.com/yuto90/bread.git\ncd bread\nnvm install\nnvm use\nnpm ci --ignore-scripts\nnpm run playground",
          paragraphs: [
            "Use the local HTTP address printed by the server. Opening index.html as a file does not provide the HTTP/module-worker environment the app requires. The project is private in npm metadata and is not an installable published package.",
          ],
        },
        {
          id: "cli",
          title: "Check and render",
          code: "node src/cli.ts check examples/blink.bread\nnode src/cli.ts render examples/blink.bread -o output/blink.svg",
          paragraphs: [
            "check runs parsing, semantic validation, placement and physical netlist verification. render additionally routes wires and creates SVG. A routing error can therefore occur after check succeeds.",
            "The generated SVG contains Arduino-derived illustration attribution. Keep that metadata and the visible credit when sharing it; see Licensing.",
          ],
        },
      ],
    },
    {
      slug: "syntax",
      title: "DSL reference",
      summary:
        "A small, case-sensitive language for parts and connections. Layout is automatic.",
      sections: [
        {
          id: "statements",
          title: "Four statement forms",
          table: [
            ["Form", "Meaning"],
            ["bread 0.1", "Required first non-comment statement."],
            ['title "Arduino LED"', "Optional single JSON-quoted title."],
            [
              "part r: resistor [value=220ohm]",
              "Declare a named supported component and value.",
            ],
            [
              "uno.D13 -- r.1",
              "Join two named terminals into one logical net.",
            ],
            ["// comment", "A comment; blank lines are allowed."],
          ],
        },
        {
          id: "names",
          title: "Names, pins and values",
          paragraphs: [
            "A part ID begins with an ASCII letter and has at most 24 characters, using letters, digits or underscores. Names are case-sensitive. Pin names and component type IDs are fixed; do not translate them when using Japanese UI.",
            "Titles are limited to 64 UTF-16 code units. Control characters and XML-invalid text are rejected. Values are exact supported tokens: 220ohm for LED series resistors, 10kohm for the mixed family, and 100nF for the supported capacitor.",
            "Connections describe nets rather than current flow. Sharing a terminal connects the listed endpoints transitively. Component internals such as resistors, LEDs, diodes and capacitors are not ideal-wire unions.",
          ],
        },
        {
          id: "example",
          title: "Read the complete source",
          samples: ["blink"],
        },
        {
          id: "excluded",
          title: "No layout or execution statements",
          paragraphs: [
            "There are no placement coordinates, routing hints, includes, loops, expressions or executable code. Bread is not a Mermaid plugin or a Markdown renderer. A recognized component does not make every possible topology supported.",
          ],
        },
      ],
    },
    {
      slug: "parts",
      title: "Parts and terminals",
      summary:
        "Concrete component definitions for bounded circuit families, not an arbitrary component library.",
      sections: [
        {
          id: "catalog",
          title: "Recognized part types",
          table: [
            ["Type", "Terminals / value", "Supported use"],
            [
              "arduino-uno-r3",
              "Named Uno sockets; GND aliases GND1",
              "One Uno per circuit; GND2/GND3 are distinct.",
            ],
            [
              "resistor",
              "1, 2; 220ohm or mixed-family 10kohm",
              "Series resistor, pull-up or pull-down in the supported family.",
            ],
            [
              "led-5mm-red",
              "A, K",
              "LED branches and the mixed/discrete examples.",
            ],
            [
              "pushbutton-b3f1000-formed",
              "A1, A2, B1, B2",
              "Mixed family; A1/A2 and B1/B2 are permanent pairs, switch open.",
            ],
            [
              "potentiometer-3296w",
              "1, 2, 3; 10kohm",
              "Mixed family; 2 is the wiper, connected to A0.",
            ],
            [
              "dht22-bare",
              "1 VCC, 2 DATA, 3 NC, 4 GND",
              "Mixed family with a separate 10kohm DATA pull-up.",
            ],
            [
              "diode-1n4148",
              "A, K",
              "Diode/LED series family; cathode is the black band.",
            ],
            [
              "capacitor-c315c104",
              "1, 2; 100nF",
              "At most one non-polar capacitor across 5V/GND1 in the diode family.",
            ],
          ],
        },
        {
          id: "mechanics",
          title: "Footprint assumptions are visible",
          paragraphs: [
            "The button assumes leads formed to 7.62 × 5.08mm. The 1N4148 assumes a 10.16mm insertion span, not a native fixed pitch. Both assumptions produce warnings. The named KEMET capacitor has a straight 2.54mm pitch.",
            "DHT22 NC is placed and isolated. Some modeled jumper holes lie under the raised/cutaway sensor drawing; real clearance has not been verified. Datasheet dimensions and a model are not an assembly test.",
          ],
        },
        {
          id: "discrete",
          title: "Diode and capacitor example",
          samples: ["diode-decoupling"],
        },
      ],
    },
    {
      slug: "examples",
      title: "Examples",
      summary:
        "Exact source files alongside diagrams generated by this build of the compiler. Download either format or open the same sample in the Playground.",
      sections: [
        {
          id: "leds",
          title: "LED branches",
          samples: ["blink", "three-leds", "6-leds"],
        },
        {
          id: "mixed",
          title: "Mixed components",
          paragraphs: [
            "A temperature-alarm wiring study only: the static button is open and no temperature threshold, firmware or alarm behavior is simulated.",
          ],
          samples: ["temperature-alarm"],
        },
        {
          id: "discrete",
          title: "Diode and optional capacitor",
          paragraphs: [
            "D12/D13 → 220Ω → diode A/K → LED A/K → GND1. Only one optional 100nF capacitor across 5V/GND1 is supported. Reversed diode/LED polarity is rejected in this family.",
          ],
          samples: ["diode-led", "diode-decoupling"],
        },
      ],
    },
    {
      slug: "errors",
      title: "Errors and warnings",
      summary:
        "Codes are stable and remain in English in both interface languages. A line number is shown when the compiler can identify one.",
      sections: [
        {
          id: "codes",
          title: "Common diagnostics",
          table: [
            ["Code", "What to check"],
            [
              "E_SYNTAX",
              "Header, quoted title, part declaration or pin -- pin syntax.",
            ],
            [
              "E_UNKNOWN_COMPONENT / E_UNKNOWN_PIN",
              "Type names, declared IDs, capitalization and supported terminals.",
            ],
            [
              "E_ATTRIBUTE",
              "An exact supported value for this part and circuit family.",
            ],
            [
              "E_UNSUPPORTED_CIRCUIT",
              "The topology must match a documented family.",
            ],
            [
              "E_DIODE_POLARITY",
              "Diode and LED A/K order in the discrete family.",
            ],
            ["E_NC_CONNECTED", "DHT22 pin 3 must remain isolated."],
            [
              "E_COMPONENT_SHORT / E_POWER_NET",
              "Terminal shorts and required distinct 5V/GND nets.",
            ],
            [
              "E_PLACEMENT_CAPACITY",
              "The current placement/footprint model cannot fit this circuit.",
            ],
            [
              "E_ROUTING_FAILED",
              "No acceptable path was found within the bounded routing search.",
            ],
            [
              "E_SOURCE_LIMIT",
              "Playground input exceeds 32,768 UTF-16 code units.",
            ],
          ],
        },
        {
          id: "recovery",
          title: "Recover without trusting stale pixels",
          paragraphs: [
            "Use the line link to select an offending statement when available. The last valid drawing is only a reference while an error is present; it does not describe the current invalid text. Download is disabled. Choosing a supported sample restores a valid starting point.",
            "The CLI exits with status 1 on an error. Validation failure preserves an existing output file, so an old SVG on disk may also be stale. Rendering may reject a circuit that check accepted if the routing stage fails.",
          ],
        },
        {
          id: "warnings",
          title: "Warnings do not prove physical fit",
          paragraphs: [
            "W_LED_POLARITY preserves an explicitly reversed LED in the original LED families. W_BUTTON_FOOTPRINT and W_DIODE_FOOTPRINT disclose assumed lead forming. A successful diagram with a warning still needs physical and electrical review.",
            "Japanese UI shows localized guidance followed by the unmodified compiler detail. Unrecognized diagnostics retain their original message rather than inventing a translation.",
          ],
        },
      ],
    },
    {
      slug: "limits",
      title: "Supported scope and limits",
      summary:
        "Static modeled connectivity is the contract. It is not simulation or hardware qualification.",
      sections: [
        {
          id: "families",
          title: "Finite supported families",
          table: [
            ["Family", "Current boundary"],
            [
              "Single LED",
              "One resistor and LED on D12 or D13, with GND1 return.",
            ],
            [
              "Multi LED",
              "3–6 branches render. Two branches are unsupported; 7–12 fail placement capacity.",
            ],
            [
              "Mixed",
              "Exactly the DHT22, button, trimmer and LED family; three distinct D2–D13 roles and A0 wiper.",
            ],
            [
              "Diode LED",
              "Exactly one diode/resistor/LED series chain and at most one 100nF capacitor.",
            ],
          ],
        },
        {
          id: "board",
          title: "One fixed board",
          paragraphs: [
            "The board has 30 rows, A–E and F–J isolated strips, a center gap and no power rails. Each hole has at most one lead or jumper. Physical reconstruction uses inserted leads, sockets, strips and jumpers independently of the expected logical nets.",
            "Placement and routing are deterministic heuristics. Rejection does not prove that every real-world layout is impossible. Six LEDs have 17 crossing points; the shipped mixed example has 8. Crossings are not junctions.",
          ],
        },
        {
          id: "not-verified",
          title: "What remains unverified",
          paragraphs: [
            "No voltage/current/thermal analysis, physical assembly, wire insulation or bend-radius model, firmware execution, simulation, or beginner usability study is included. Sensor under-body wire clearance and full label/stroke separation remain limitations.",
            "Chromium desktop and phone-size browser checks establish UI behavior. They do not qualify Safari, Firefox, a physical phone or a screen reader. The browser input limit is 32,768 UTF-16 code units.",
            "There is no PNG exporter, Wokwi exporter, Markdown plugin, general circuit support or AI service.",
          ],
        },
      ],
    },
    {
      slug: "licensing",
      title: "Licensing and attribution",
      summary:
        "Original software is MIT. Arduino-derived geometry and generated illustrations have a separate CC-BY-SA-4.0 scope.",
      sections: [
        {
          id: "split",
          title: "Keep software and illustration terms distinct",
          paragraphs: [
            "Original Bread code, documentation and examples are MIT-licensed, except explicitly identified artwork. Arduino-derived Uno geometry, generated SVG/PNG illustrations and screenshots containing them are CC-BY-SA-4.0. Dependency licenses remain their own.",
            "The build distributes LICENSE, LICENSES/README.md and the complete CC-BY-SA-4.0 text. The file-level scope is authoritative; the whole package is not blanket MIT.",
          ],
        },
        {
          id: "sharing",
          title: "Sharing diagrams",
          paragraphs: [
            "Keep the creator/source credit, license link and modification notice embedded in exported SVG. If converting to PNG or embedding an illustration, preserve attribution in a visible caption or nearby credit where metadata is lost. Adapted illustrations must follow the applicable share-alike terms.",
            "These illustration terms do not by themselves relicense independent user DSL, firmware or an entire article. Users remain responsible for rights to their supplied content. No Arduino endorsement is implied.",
          ],
        },
        {
          id: "sources",
          title: "Hardware provenance",
          paragraphs: [
            "The Uno illustration adapts Arduino UNO R3 A000066 / UNO-TH Rev3e CAD coordinates and outline. Other named manufacturers supply numerical pin/package facts; their artwork and datasheets are not redistributed. Detailed source links and scope are in the repository attribution records.",
          ],
        },
      ],
    },
    {
      slug: "contributing",
      title: "Contributing",
      summary:
        "Make a bounded, reproducible improvement with evidence of its scope.",
      sections: [
        {
          id: "checks",
          title: "Run the checks",
          code: "npm ci --ignore-scripts\nnpm run verify\nnpx --no-install playwright install chromium\nnpm run test:browser",
          paragraphs: [
            "Use the pinned Node version in .nvmrc. verify runs strict typechecking, core/CLI/DOM tests and two clean byte-identical static builds. Browser checks cover desktop and phone-sized Chromium; install any required OS browser dependencies for your environment.",
            "The docs build compiles its sample previews from the exact examples/*.bread sources. Link and example checks prevent source/render drift. English and Japanese guides live together in docs-site/content.ts.",
          ],
        },
        {
          id: "changes",
          title: "Propose evidence, not unbounded claims",
          paragraphs: [
            "New components need concrete pin identities, source dimensions, license provenance, footprint assumptions, explicit supported topology, error behavior and independent physical verification. Include honest limits and reviewable screenshots.",
            "Keep identifiers and error codes stable. Localization must not alter user source or exported diagrams. Use textContent for untrusted diagnostic detail; keep CSP and worker boundaries intact.",
            "Open a focused pull request. No publication, deployment or merge follows automatically from passing checks. See the repository CONTRIBUTING.md for the contribution policy.",
          ],
        },
      ],
    },
  ],
  ja: [
    {
      slug: "index",
      title: "接続を書く。配線が見える。",
      summary:
        "Bread は接続だけを記述する小さな言語から、接続整合性を検証したブレッドボード配線図を生成します。まずサンプルを試し、対応するルールを確認しましょう。",
      sections: [
        {
          id: "workflow",
          title: "記述 → 検証 → 配線",
          paragraphs: [
            "穴の位置ではなく、部品とネットを記述します。Bread が対応部品を固定のブレッドボードに配置し、ジャンパー線を追加します。その後、物理接続を独立に再構築し、論理ネットとの一致を検証します。",
            "Playground は同じコンパイラーと描画処理をブラウザーの Worker で実行します。ソースはタブ内だけで扱われ、再読み込みすると消えます。言語設定だけをローカルに保存します。アカウント登録や回路のアップロードは不要です。",
          ],
        },
        {
          id: "first-diagram",
          title: "最初の配線図と完全なソース",
          samples: ["blink"],
        },
        {
          id: "boundaries",
          title: "検証している範囲を知る",
          paragraphs: [
            "ネットリストの一致が示すのはモデル上の接続整合性です。電圧・電流の上限、部品の収まり、安全な組み立て、ファームウェアの動作やシミュレーションを保証しません。実機を組む前に「対応範囲と制限」を確認してください。",
            "このドキュメントは、このビルドに含まれる機能（ダイオード系の2サンプルを含む）を説明します。別途公開されている Playground は古い版の可能性があります。実際に表示されるサンプルと対応範囲に従ってください。",
          ],
        },
      ],
    },
    {
      slug: "quickstart",
      title: "クイックスタート",
      summary:
        "ブラウザーで対応サンプルを試すか、Node 24.19.0 を使ってローカルで描画します。",
      sections: [
        {
          id: "browser",
          title: "Playground を使う",
          paragraphs: [
            "Playground でサンプルを選び、「静的ネットを検証済み」と表示されるまで待ちます。接続を編集すると検証と図の更新が行われます。全体表示、拡大・縮小、スクロールで挿入ガイドを確認してください。",
            "SVG のダウンロードは現在のソースが有効なときだけ使えます。エラー時は最後に成功した図を「最後に成功したプレビュー」として残しますが、修正するまでダウンロードはできません。再読み込み前に編集したソースを別の場所へコピーしてください。",
            "English / 日本語で UI 言語を切り替えます。DSL の識別子と出力 SVG は変わりません。日本語の診断には説明に加えて、元のコンパイラーの詳細も表示します。",
          ],
        },
        {
          id: "local",
          title: "ソースから実行する",
          code: "git clone https://github.com/yuto90/bread.git\ncd bread\nnvm install\nnvm use\nnpm ci --ignore-scripts\nnpm run playground",
          paragraphs: [
            "サーバーが表示するローカル HTTP アドレスを開いてください。index.html をファイルとして直接開く方法では、必要な HTTP・モジュール Worker 環境を利用できません。npm メタデータは private で、インストール可能なパッケージとしては未公開です。",
          ],
        },
        {
          id: "cli",
          title: "CLI で検証・描画する",
          code: "node src/cli.ts check examples/blink.bread\nnode src/cli.ts render examples/blink.bread -o output/blink.svg",
          paragraphs: [
            "check は構文、意味、配置、物理ネットリストを検証します。render はさらに配線経路の探索と SVG 生成を行うため、check 成功後でも経路のエラーで失敗する場合があります。",
            "生成 SVG には Arduino 由来のイラストの出典情報が含まれます。共有時はメタデータと表示上のクレジットを保持してください。「ライセンス」を参照してください。",
          ],
        },
      ],
    },
    {
      slug: "syntax",
      title: "DSL リファレンス",
      summary:
        "部品と接続を記述する、大文字・小文字を区別する小さな言語です。配置は自動です。",
      sections: [
        {
          id: "statements",
          title: "文の書き方",
          table: [
            ["形式", "意味"],
            ["bread 0.1", "コメント以外の最初の文として必須。"],
            [
              'title "Arduino LED"',
              "任意。JSON 形式の引用符で囲むタイトルは1つまで。",
            ],
            [
              "part r: resistor [value=220ohm]",
              "対応する部品と値を名前付きで宣言。",
            ],
            ["uno.D13 -- r.1", "2つの端子を同じ論理ネットにつなぐ。"],
            ["// comment", "コメント。空行も使えます。"],
          ],
        },
        {
          id: "names",
          title: "名前・ピン・値",
          paragraphs: [
            "部品 ID は ASCII 英字で始まり、英数字とアンダースコアで最大24文字です。大文字・小文字を区別します。ピン名と部品型 ID は固定で、日本語 UI でも翻訳しません。",
            "タイトルは最大64文字（UTF-16 コード単位）です。制御文字や XML で表現できない文字は拒否します。値は対応する表記を正確に使います。LED 直列抵抗は 220ohm、複合回路の抵抗は 10kohm、対応コンデンサーは 100nF です。",
            "接続は電流の向きではなくネットを表します。同じ端子を共有する接続は推移的に同じネットになります。抵抗、LED、ダイオード、コンデンサーの内部は理想導線として結合しません。",
          ],
        },
        { id: "example", title: "完全なソースを読む", samples: ["blink"] },
        {
          id: "excluded",
          title: "配置命令やコード実行はありません",
          paragraphs: [
            "座標、経路指定、include、ループ、式、実行コードは使えません。Bread は Mermaid プラグインや Markdown レンダラーではありません。部品型が認識されることと、任意の接続構成が使えることは別です。",
          ],
        },
      ],
    },
    {
      slug: "parts",
      title: "部品と端子",
      summary:
        "限定された回路構成向けの具体的な部品定義です。汎用的な部品ライブラリーではありません。",
      sections: [
        {
          id: "catalog",
          title: "認識する部品型",
          table: [
            ["型", "端子・値", "対応用途"],
            [
              "arduino-uno-r3",
              "Uno の名前付きソケット。GND は GND1 の別名",
              "回路ごとに1個。GND2/GND3 は別ソケット。",
            ],
            [
              "resistor",
              "1, 2。220ohm または複合回路の 10kohm",
              "対応回路内の直列抵抗、プルアップ、プルダウン。",
            ],
            ["led-5mm-red", "A, K", "LED 分岐、複合回路、ダイオード系。"],
            [
              "pushbutton-b3f1000-formed",
              "A1, A2, B1, B2",
              "複合回路。A1/A2 と B1/B2 は常時接続、スイッチは開状態。",
            ],
            [
              "potentiometer-3296w",
              "1, 2, 3。10kohm",
              "複合回路。2 がワイパーで A0 に接続。",
            ],
            [
              "dht22-bare",
              "1 VCC, 2 DATA, 3 NC, 4 GND",
              "独立した 10kohm DATA プルアップ付き複合回路。",
            ],
            [
              "diode-1n4148",
              "A, K",
              "ダイオード・LED 直列回路。黒帯がカソード K。",
            ],
            [
              "capacitor-c315c104",
              "1, 2。100nF",
              "ダイオード系の 5V/GND1 間に無極性コンデンサー最大1個。",
            ],
          ],
        },
        {
          id: "mechanics",
          title: "部品形状の仮定を明示する",
          paragraphs: [
            "ボタンは 7.62 × 5.08mm にリードを加工する前提です。1N4148 は 10.16mm の挿入幅を仮定しており、元から固定されたピッチではありません。どちらも警告を表示します。指定 KEMET コンデンサーのストレートピッチは 2.54mm です。",
            "DHT22 の NC も配置し、孤立させます。一部のジャンパー穴は、浮かせた・切り欠いたセンサー図の下にあります。実物での空間は未検証です。データシートの寸法とモデルは組み立て試験の代わりにはなりません。",
          ],
        },
        {
          id: "discrete",
          title: "ダイオードとコンデンサーの例",
          samples: ["diode-decoupling"],
        },
      ],
    },
    {
      slug: "examples",
      title: "サンプル集",
      summary:
        "実際のソースファイルと、このビルドのコンパイラーで生成した図を並べています。どちらもダウンロードでき、同じサンプルを Playground で開けます。",
      sections: [
        {
          id: "leds",
          title: "LED の分岐",
          samples: ["blink", "three-leds", "6-leds"],
        },
        {
          id: "mixed",
          title: "複数の部品を使う",
          paragraphs: [
            "温度アラームの配線例です。静的なボタンは開状態で、温度のしきい値、ファームウェア、アラームの動作はシミュレーションしません。",
          ],
          samples: ["temperature-alarm"],
        },
        {
          id: "discrete",
          title: "ダイオードと任意のコンデンサー",
          paragraphs: [
            "D12/D13 → 220Ω → ダイオード A/K → LED A/K → GND1。追加できるのは 5V/GND1 間の 100nF コンデンサー1個だけです。この構成ではダイオードと LED の逆接続を拒否します。",
          ],
          samples: ["diode-led", "diode-decoupling"],
        },
      ],
    },
    {
      slug: "errors",
      title: "エラーと警告",
      summary:
        "コードは両言語で同じ E_* / W_* を使います。コンパイラーが場所を特定できる場合は行番号を表示します。",
      sections: [
        {
          id: "codes",
          title: "よくある診断",
          table: [
            ["コード", "確認する内容"],
            [
              "E_SYNTAX",
              "ヘッダー、引用符付きタイトル、部品宣言、pin -- pin 構文。",
            ],
            [
              "E_UNKNOWN_COMPONENT / E_UNKNOWN_PIN",
              "型名、宣言した ID、大文字・小文字、対応端子。",
            ],
            ["E_ATTRIBUTE", "この部品と回路に対応した正確な値。"],
            [
              "E_UNSUPPORTED_CIRCUIT",
              "文書化された構成に一致する必要があります。",
            ],
            [
              "E_DIODE_POLARITY",
              "ダイオード系でのダイオード・LED の A/K の順序。",
            ],
            ["E_NC_CONNECTED", "DHT22 の3番ピンを孤立させます。"],
            [
              "E_COMPONENT_SHORT / E_POWER_NET",
              "端子短絡と、区別すべき 5V/GND ネット。",
            ],
            [
              "E_PLACEMENT_CAPACITY",
              "現在の配置・部品形状モデルでは収まりません。",
            ],
            [
              "E_ROUTING_FAILED",
              "限定された経路探索で適切な配線が見つかりません。",
            ],
            [
              "E_SOURCE_LIMIT",
              "Playground の入力が 32,768 UTF-16 コード単位を超えています。",
            ],
          ],
        },
        {
          id: "recovery",
          title: "古い図を正しい結果と思わない",
          paragraphs: [
            "行リンクがある場合は、クリックすると該当文を選択します。エラー中の図は最後に成功した参考表示で、現在の無効なソースを表していません。ダウンロードは無効になります。対応サンプルを選べば有効な状態に戻せます。",
            "CLI はエラー時に終了コード1を返します。検証に失敗しても既存の出力ファイルは残るため、ディスク上の SVG も古い場合があります。check の後、render の経路探索で失敗することもあります。",
          ],
        },
        {
          id: "warnings",
          title: "警告付き成功は実機適合の証明ではありません",
          paragraphs: [
            "W_LED_POLARITY は元の LED 系で指定された逆向きを保持します。W_BUTTON_FOOTPRINT と W_DIODE_FOOTPRINT はリード加工の仮定を示します。描画に成功しても、機械的・電気的な確認は別途必要です。",
            "日本語 UI は日本語の説明に続いて、元のコンパイラーの詳細をそのまま表示します。未対応の診断は推測で訳さず、原文を保持します。",
          ],
        },
      ],
    },
    {
      slug: "limits",
      title: "対応範囲と制限",
      summary:
        "対象は静的なモデル上の接続整合性です。シミュレーションや実機認定ではありません。",
      sections: [
        {
          id: "families",
          title: "対応する回路構成",
          table: [
            ["構成", "現在の境界"],
            [
              "LED 1個",
              "D12 または D13 から抵抗と LED をつなぎ、GND1 に戻す。",
            ],
            [
              "複数 LED",
              "3〜6分岐を描画。2分岐は未対応、7〜12分岐は配置容量エラー。",
            ],
            [
              "複合部品",
              "DHT22、ボタン、半固定抵抗、LED の指定構成のみ。D2〜D13 の別々の3役と A0 ワイパー。",
            ],
            [
              "ダイオード LED",
              "ダイオード・抵抗・LED 各1個の直列回路と、最大1個の 100nF コンデンサー。",
            ],
          ],
        },
        {
          id: "board",
          title: "固定のボード1枚",
          paragraphs: [
            "ボードは30行、A〜E と F〜J の独立ストリップ、中央の溝で構成され、電源レールはありません。1つの穴に挿せるリードまたはジャンパーは1つだけです。物理再構築は、期待する論理ネットとは独立にリード・ソケット・ストリップ・ジャンパーを使います。",
            "配置と経路探索は決定的なヒューリスティックです。拒否されても、現実のあらゆる配置が不可能だと証明したわけではありません。6 LED 図は17交差、複合部品図は8交差です。線の交差は接続点ではありません。",
          ],
        },
        {
          id: "not-verified",
          title: "検証していないこと",
          paragraphs: [
            "電圧・電流・熱解析、実機組み立て、絶縁や曲げ半径のモデル、ファームウェア実行、シミュレーション、初心者の使いやすさの調査は含みません。センサー下の配線空間、ラベルや線幅を含めた完全な分離にも制限があります。",
            "Chromium のデスクトップ・スマートフォン幅での確認は UI 動作の検証です。Safari、Firefox、実際の携帯端末、スクリーンリーダーの認定ではありません。ブラウザー入力上限は 32,768 UTF-16 コード単位です。",
            "PNG 出力、Wokwi 出力、Markdown プラグイン、汎用回路対応、AI サービスはありません。",
          ],
        },
      ],
    },
    {
      slug: "licensing",
      title: "ライセンスと出典",
      summary:
        "独自ソフトウェアは MIT。Arduino 由来の形状と生成イラストには別途 CC-BY-SA-4.0 が適用されます。",
      sections: [
        {
          id: "split",
          title: "ソフトウェアとイラストの条件を区別する",
          paragraphs: [
            "Bread 独自のコード、ドキュメント、サンプルは、明示したアートワークの例外を除き MIT です。Arduino 由来の Uno 形状、生成 SVG/PNG イラスト、それらを含むスクリーンショットは CC-BY-SA-4.0 です。依存物には各自のライセンスが適用されます。",
            "ビルドには LICENSE、LICENSES/README.md、CC-BY-SA-4.0 の全文が含まれます。ファイル単位の適用範囲を確認してください。配布物全体が一律 MIT という意味ではありません。",
          ],
        },
        {
          id: "sharing",
          title: "図を共有するとき",
          paragraphs: [
            "出力 SVG 内の作者・出典・ライセンスリンク・変更の記載を保持してください。PNG への変換や図の埋め込みでメタデータが失われる場合は、キャプションなど近くの見える場所にも出典を残します。改変したイラストには、該当する継承条件を適用してください。",
            "イラストの条件だけを理由に、独立したユーザーの DSL、ファームウェア、記事全体のライセンスが変わるわけではありません。提供する内容の権利は利用者が確認してください。Arduino の推奨や公認を意味しません。",
          ],
        },
        {
          id: "sources",
          title: "ハードウェア資料の由来",
          paragraphs: [
            "Uno 図は Arduino UNO R3 A000066 / UNO-TH Rev3e の CAD 座標と外形を改変しています。その他のメーカー資料は数値的な端子・パッケージ情報の参考で、メーカーの図版やデータシートは再配布しません。詳細な出典リンクと適用範囲はリポジトリーの出典記録にあります。",
          ],
        },
      ],
    },
    {
      slug: "contributing",
      title: "開発への参加",
      summary:
        "範囲を限定し、再現可能な検証結果とともに改善を提案してください。",
      sections: [
        {
          id: "checks",
          title: "検証を実行する",
          code: "npm ci --ignore-scripts\nnpm run verify\nnpx --no-install playwright install chromium\nnpm run test:browser",
          paragraphs: [
            ".nvmrc に固定した Node を使います。verify は厳密な型検査、コア・CLI・DOM テスト、クリーンな静的ビルド2回のバイト一致を確認します。ブラウザーテストはデスクトップとスマートフォン幅の Chromium が対象です。環境に必要な OS 側の依存物も導入してください。",
            "ドキュメントの図は examples/*.bread の実ソースから生成します。リンクとサンプルの検証でソースと図の食い違いを防ぎます。英語・日本語のガイドは docs-site/content.ts にまとめています。",
          ],
        },
        {
          id: "changes",
          title: "根拠を示し、対応範囲を明確にする",
          paragraphs: [
            "部品の追加には具体的なピン、寸法の出典、ライセンス、形状の仮定、対応構成、エラー動作、独立した物理検証が必要です。制限とレビュー可能なスクリーンショットも示してください。",
            "識別子とエラーコードを維持してください。翻訳でソースや出力図を変更しないでください。入力を含む診断には textContent を使い、CSP と Worker の境界を保持してください。",
            "焦点を絞ったプルリクエストを開いてください。検証の成功だけでは公開、デプロイ、マージは行われません。参加方針はリポジトリーの CONTRIBUTING.md を参照してください。",
          ],
        },
      ],
    },
  ],
};
