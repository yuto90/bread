# Bread 要件定義

## 1. 概要

**Bread** は、ArduinoやESP32などの電子工作における配線情報を、Mermaidのような簡潔なテキストDSLで記述し、実物に近いビジュアル配線図へ自動レンダリングするツールである。

BreadのDSLファイルには **`.bread`** 拡張子を使用する。

主な利用シーンは、ChatGPT・Codex・ClaudeなどのAIに電子工作について質問した際に、文章による配線説明だけではなく、視覚的に理解できる配線図を生成できるようにすることである。

BreadはWokwiのようなシミュレーターを置き換えるものではない。

Breadが提供するのは、

> **AI・Markdown・Gitと相性の良い Hardware Wiring as Code**

のレイヤーである。

---

## 2. 背景

Arduinoを学習する際、AIに以下のような質問をすることがある。

> Arduino UnoでLEDを点灯させたい。配線方法を教えて。

現在のAIは一般的に、

```text
Arduino D13 → 220Ω抵抗
抵抗 → LED Anode
LED Cathode → GND
```

のような文章やテキストで配線を説明する。

しかし、特に電子工作初心者にとっては、

- D13がArduino基板上のどこにあるのか
- GNDが複数存在する場合どこへ接続するのか
- LEDのAnode/Cathodeがどちらなのか
- 抵抗をどの位置に入れるのか
- 実物としてどの部品とどの部品を接続するのか

をテキストだけから理解することは難しい。

画像生成AIに配線図そのものを生成させる方法もあるが、電子回路では、

- 存在しないPinを生成する
- 接続先を間違える
- Arduino基板形状やPin配置を誤る
- 同じ入力でも異なる配線図が生成される
- 電気的に危険な図を生成する可能性がある

といった問題がある。

そこでBreadでは、AIに画像そのものを生成させない。

AIには構造化された `.bread` ファイルを生成させ、Bread Rendererが決定論的にビジュアルへ変換する。

---

## 3. プロダクトコンセプト

### 3.1 一言で表すと

> **Mermaid for Hardware Wiring**

より具体的には、

> **AIが出力した電子工作の配線情報を、初心者でも理解しやすい実物風配線図へ変換するMarkdown対応DSL**

である。

---

## 4. プロダクト名・命名規則

### アプリ名

```text
Bread
```

Breadboardを想起しやすく、短く覚えやすい名称とする。

### DSLファイル拡張子

```text
.bread
```

例：

```text
blink.bread
temperature-sensor.bread
robot.bread
```

### Markdownコードフェンス

```markdown
```bread
...
```
```

### CLI

```bash
bread
```

---

## 5. 基本思想

利用者は、

> **何と何を接続するか**

だけを記述する。

Bread側が、

> **部品をどこに配置し、配線をどの経路で描画するか**

を担当する。

Breadの最重要原則は以下とする。

> **接続は書く。配置は書かない。**

ユーザーに以下のような指定を要求しない。

```text
x = 120
y = 340
rotation = 90
wire-bend = ...
```

配線図としてのレイアウトはBreadが自動決定する。

---

## 6. Breadが解決する問題

### Before

```text
ユーザー
   ↓
AIにArduinoの配線を質問
   ↓
AIが文章で回答
   ↓
Arduino D13 → resistor → LED → GND
   ↓
ユーザーが頭の中で実物の配線へ変換
```

### After

```text
ユーザー
   ↓
AIにArduinoの配線を質問
   ↓
AIがBread DSLを生成
   ↓
Bread Renderer
   ↓
実物風の配線図
```

ユーザーが文章から物理配線を頭の中で再構築する工程をなくす。

---

## 7. 想定ユーザー

### 7.1 初心者

主な用途：

- ChatGPT等を使ったArduino学習
- Arduino Pin位置の確認
- LEDやセンサーの配線方法の理解
- 電子工作教材の閲覧

提供価値：

> **どこに何を挿すのかが視覚的に分かる。**

初心者にとってBreadは、AIのテキスト回答を実物に近い図へ翻訳する役割を持つ。

---

### 7.2 中級者

主な用途：

- GitHub READMEへの配線図掲載
- 技術ブログ
- 電子工作教材
- Gitによる配線管理
- AI Coding Agentによる電子工作開発

提供価値：

> **配線図を画像ではなくソースコードとして管理できる。**

GPIO変更も通常のコード変更と同じようにGit diffで確認できる。

---

### 7.3 上級者

将来的には、

- CIによるPin検証
- FirmwareとのPin整合性確認
- BOM生成
- Pin Assignment生成
- AI Agentによる配線変更
- Wokwi形式へのExport

などへ発展させる。

提供価値：

> **AIとソフトウェアツールが扱えるHardware Interface Language。**

ただし、上級者向け機能はMVPの中心とはしない。

---

## 8. 代表ユースケース

### 8.1 AIでArduinoを学習する

ユーザー：

> Arduino Unoで外付けLEDを点灯させたい。

AIはArduinoコードと合わせて以下を生成する。

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND1
```

Bread Rendererがこれを実物風配線図へ変換する。

ユーザーはArduino Uno基板上のD13やGND位置を直接確認できる。

---

### 8.2 AI Coding Agentによる電子工作

ユーザー：

> HC-SR04で30cm以内の物体を検知したらLEDを光らせて。

Codex等のAgentが以下を生成する。

```text
src/
  main.cpp

hardware/
  circuit.bread
```

`circuit.bread`：

```bread
bread 0.1

part uno: arduino-uno-r3
part sonar: hc-sr04
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.5V -- sonar.VCC
uno.GND1 -- sonar.GND
uno.D9 -- sonar.TRIG
uno.D10 -- sonar.ECHO

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND2
```

AI Agentは、

- SVG座標
- 部品配置
- Wire経路

を扱う必要がない。

Breadがそれらを担当する。

---

### 8.3 README / 技術記事

リポジトリ：

```text
project/
├ src/
├ hardware/
│  └ circuit.bread
└ docs/
   └ circuit.svg
```

CI：

```bash
bread render hardware/circuit.bread -o docs/circuit.svg
```

README：

```markdown
## Wiring

![Wiring Diagram](./docs/circuit.svg)
```

GPIO変更時：

```diff
- esp.GPIO21 -- oled.SDA
+ esp.GPIO18 -- oled.SDA
```

配線変更をGit diffとしてレビューできる。

---

## 9. BreadとWokwiの位置付け

BreadはWokwiを置き換えない。

### Wokwiの主目的

- MCU Simulation
- Firmware実行
- 仮想Hardware
- Debug
- Automated Test

### Breadの主目的

- AI回答の可視化
- Wiring Diagram生成
- Markdown Integration
- Git管理
- Human-readable Hardware Description

将来的には以下の連携を想定する。

```text
circuit.bread
     │
     ├── SVG
     │
     ├── BOM
     │
     ├── Pin Assignment
     │
     └── Wokwi diagram.json
               │
               ↓
             Wokwi
               │
               ↓
          Simulation
```

役割としては、

```text
Bread
=
Hardware Description Frontend
```

```text
Wokwi
=
Simulation Backend
```

とする。

---

## 10. DSL設計方針

Bread DSLでは以下を重視する。

- Human-readable
- AI-friendly
- Git-friendly
- Deterministic
- Minimal Syntax
- 座標指定不要
- 曖昧さを極力排除
- 機械的なValidationが可能

---

## 11. Bread DSL基本構文

基本例：

```bread
bread 0.1

title "Arduino LED Example"

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND1
```

---

## 12. バージョン宣言

ファイル先頭でBread Language Versionを指定する。

```bread
bread 0.1
```

将来的な文法変更に備える。

---

## 13. タイトル

任意でタイトルを設定できる。

```bread
title "Arduino LED Example"
```

配線図のタイトルとして利用する。

省略可能。

---

## 14. 部品宣言

基本形式：

```bread
part <id>: <type>
```

例：

```bread
part uno: arduino-uno-r3
part sensor: dht22
part display: ssd1306-i2c
```

属性：

```bread
part r1: resistor [value=220ohm]
part led: led-5mm-red [label="Status LED"]
```

---

## 15. 接続

基本構文：

```bread
<part>.<pin> -- <part>.<pin>
```

例：

```bread
uno.D2 -- sensor.DATA
uno.5V -- sensor.VCC
uno.GND1 -- sensor.GND
```

初期バージョンでは `->` を使用しない。

理由：

```text
GPIO -> LED
```

と書くと、

- 電流方向
- データ方向
- Input / Output

を表しているように見えるため。

Breadの `--` は単純な物理接続を表す。

---

## 16. Pin指定

基本形式：

```bread
part.pin
```

例：

```bread
uno.D13
uno.5V
uno.GND1
led.A
led.K
r1.1
r1.2
```

特殊文字を含むPinについては将来的に、

```bread
esp["3V3"]
```

の形式をサポートする。

---

## 17. コメント

```bread
// LED control
uno.D13 -- r1.1
```

コメントはレンダリング結果に影響しない。

---

## 18. レイアウト指定

Breadの基本は自動レイアウトとする。

必要な場合のみ、

```bread
layout LR
```

または、

```bread
layout TB
```

を指定できる。

意味：

```text
LR = Left to Right
TB = Top to Bottom
```

以下のような絶対座標指定はMVPでは提供しない。

```text
x = 100
y = 300
```

---

## 19. レンダリング要件

`.bread` から実物風のWiring Diagramを生成する。

### 必須

- Arduino等の基板
- 電子部品
- 実際のPin位置へのWire接続
- 色付きWire
- Component Label
- Pin情報
- SVG出力

---

## 20. レイアウトエンジン

Bread Rendererは以下を自動処理する。

- Component Placement
- Wire Routing
- 部品間隔調整
- Wire交差削減
- Label重複回避
- Canvas Size決定

ユーザーによるGUI位置調整を必要としないことを目標とする。

---

## 21. 物理Pinと電気的Net

Bread内部では以下を分離して扱う。

```text
Physical Pin
Wiring
Electrical Net
```

例えばArduino UnoのGNDは電気的には同一でも、物理位置は異なる。

```text
uno.GND1
uno.GND2
uno.GND3
```

として保持する。

レンダラーが見た目の都合で別のPinへ自動変更してはならない。

---

## 22. Component Library

BreadではComponentごとに以下の情報を持つ。

```text
Component
├ type
├ displayName
├ revision
├ SVG
├ dimensions
├ pins
│  ├ id
│  ├ label
│  ├ aliases
│  ├ x
│  ├ y
│  └ electricalMetadata
└ metadata
```

---

## 23. 初期対応Component

### Phase 1

技術検証では以下のみ対応する。

```text
Arduino Uno R3
LED
Resistor
```

以下を正しく描画できる状態を最初の完成地点とする。

```bread
part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND1
```

### Phase 2

追加候補：

```text
Push Button
DHT11
DHT22
HC-SR04
SSD1306 OLED
```

### Phase 3

追加候補：

```text
Arduino Nano
ESP32 DevKit
Raspberry Pi Pico
Servo
Buzzer
LCD1602
```

---

## 24. Markdown対応

理想的には以下を直接レンダリング可能にする。

```markdown
```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND1
```
```

Mermaidに近い体験を目標とする。

ただしGitHubやChatGPTがBreadコードフェンスを標準でレンダリングするわけではないため、初期段階では以下を提供する。

- Bread Playground
- Bread CLI
- Remark / MDX Plugin

将来的には、

- VS Code Extension
- Browser Extension
- Documentation Plugin

を検討する。

---

## 25. CLI

CLI名：

```bash
bread
```

### Validation

```bash
bread check circuit.bread
```

`.bread` ファイルの構文と配線を検査する。

### Render

```bash
bread render circuit.bread -o circuit.svg
```

SVGを生成する。

### Format

```bash
bread fmt circuit.bread
```

Bread DSLを標準形式へ整形する。

### Machine-readable Validation

```bash
bread check circuit.bread --json
```

AI Agent向けにJSONでエラーを返す。

### Wokwi Export

将来的に、

```bash
bread export wokwi circuit.bread
```

を提供する。

---

## 26. Validation

### MVPで検出するエラー

- 不正なSyntax
- 存在しないComponent
- 存在しないPin
- Component ID重複
- 不正なAttribute
- 単一接続Pinへの不正な複数Wire
- 明らかな電源/GND短絡

例：

```bread
uno.D99 -- led.A
```

出力：

```text
ERROR E_UNKNOWN_PIN

arduino-uno-r3 に D99 は存在しません。

uno.D99 -- led.A
    ^^^
```

---

## 27. AI Friendly要件

BreadはLLMが安定して生成・編集できることを重要要件とする。

そのため、

- Syntaxを小さくする
- 曖昧な省略記法を避ける
- 同じ意味を複数のSyntaxで書ける仕様を減らす
- Pin名を明確にする
- Error Codeを安定させる
- JSON形式の診断を提供する

---

## 28. AI Agentによる修正ループ

```text
AI Agent
   ↓
circuit.bread変更
   ↓
bread check
   ↓
Validation Error
   ↓
AI Agentが修正
   ↓
bread check
   ↓
Success
```

AIがSVGや座標を操作する必要はない。

---

## 29. Git Friendly要件

`.bread` ファイルをSingle Source of Truthとする。

```text
circuit.bread
      ↓
Bread Renderer
      ↓
circuit.svg
```

例えば、

```diff
- uno.D13 -- led.A
+ uno.D12 -- led.A
```

という形でHardware変更をレビュー可能にする。

---

## 30. CI対応

CIでは以下の処理を実行できるようにする。

```text
bread check
    ↓
bread render
    ↓
Generated SVG Check
```

例：

```bash
bread check hardware/circuit.bread
bread render hardware/circuit.bread -o docs/circuit.svg
```

---

## 31. Bread Playground

ブラウザ上でBreadを試せるPlaygroundを提供する。

基本UI：

```text
┌──────────────────┬──────────────────┐
│                  │                  │
│ Bread Editor     │ Wiring Preview   │
│                  │                  │
│ .bread           │ SVG              │
│                  │                  │
└──────────────────┴──────────────────┘
```

機能：

- Live Preview
- Syntax Highlight
- Auto Complete
- Error表示
- Component / Pin候補
- SVG Export

ログインはMVPでは不要。

---

## 32. WebアプリのMVP方針

MVPでは以下を採用する。

```text
Local-first
No Account
No Database
No Cloud Storage
```

`.bread` ファイルをローカルに保存できればよい。

Breadはまずライブラリ・CLI・レンダラーとして成立させ、SaaS化を前提にしない。

---

## 33. 技術構成案

```text
bread/
├ apps/
│  └ playground/
│
├ packages/
│  ├ parser/
│  ├ core/
│  ├ parts/
│  ├ layout/
│  ├ renderer/
│  └ cli/
│
├ plugins/
│  └ remark-bread/
│
├ examples/
│
└ docs/
```

主な候補技術：

```text
TypeScript
SVG
ELK.js
React
Vite
```

---

## 34. Architecture

```text
.bread
   ↓
Parser
   ↓
AST
   ↓
Semantic Model
   ↓
Validation
   ↓
Electrical Model
   ↓
Layout Engine
   ↓
Wire Router
   ↓
SVG Renderer
```

Web UIとCoreは分離する。

CLIでもWebでも同じCoreを利用する。

---

## 35. Deterministic Rendering

同一条件では同一結果を生成することを目標とする。

条件：

```text
.bread source
+
Bread version
+
Component Library version
+
Renderer version
```

これらが同一なら、同じSVGを生成する。

ランダムな配置は使用しない。

---

## 36. SVG要件

生成SVGは可能な限り自己完結させる。

以下に依存しない。

- 外部JavaScript
- 外部Image URL
- 外部CSS

Markdown・README・技術記事へ配置しやすい形式とする。

---

## 37. Wokwi Export

将来的には `.bread` からWokwiの `diagram.json` を生成する。

```text
circuit.bread
      ↓
Bread Compiler
      ↓
diagram.json
      ↓
Wokwi
      ↓
Simulation
```

Bread側ではSimulationを実装しない。

---

## 38. BOM生成

将来的に、

```bash
bread bom circuit.bread
```

を提供する。

例：

```text
Arduino Uno R3    × 1
220Ω Resistor     × 1
5mm Red LED       × 1
HC-SR04           × 1
```

---

## 39. Pin Assignment生成

Breadから以下を生成可能にする。

```text
Arduino D9  → HC-SR04 TRIG
Arduino D10 → HC-SR04 ECHO
Arduino 5V  → HC-SR04 VCC
Arduino GND → HC-SR04 GND
```

Markdown Tableとしての出力も検討する。

---

## 40. Firmwareとの整合性確認

将来的にはFirmware上のPin設定とBreadを比較する。

Firmware：

```cpp
#define SDA_PIN 18
```

Bread：

```bread
esp.GPIO18 -- oled.SDA
```

一致しない場合、

```text
WARNING W_FIRMWARE_PIN_MISMATCH
```

を返す。

これによりFirmwareと配線図の陳腐化を防ぐ。

---

## 41. Breadboard対応

将来的にはブレッドボード自動配置を検討する。

```text
Bread DSL
   ↓
Electrical Net
   ↓
Breadboard Hole Assignment
   ↓
Component Placement
   ↓
Jumper Wire Routing
   ↓
Wiring Diagram
```

ユーザーに、

```text
A12
B13
F21
```

のような穴番号を手動指定させないことを目標とする。

---

## 42. MVP対象外

初期バージョンでは以下を実装しない。

- MCU Simulation
- Arduino Code Execution
- Debugger
- SPICE
- PCB設計
- KiCad代替
- Wokwi代替
- 高度なERC
- 自然言語生成AI
- 無制限Component Library
- GUI自由配置
- 複雑なBreadboard Auto Router
- Firmware書き込み

既存ツールで解決できる領域は再実装しない。

---

## 43. MVP完成条件

以下の `.bread` が、

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND1
```

ユーザーによる位置調整なしで、

- Arduino Uno R3
- 220Ω抵抗
- 赤色LED
- 正しい物理Pin位置
- 正しい3本の接続

を持った読みやすいSVGとしてレンダリングされれば、基本MVP成立とする。

---

## 44. MVP Acceptance Criteria

### DSL

- `.bread` を読み込める
- `bread 0.1` を認識できる
- `part` を解析できる
- `--` 接続を解析できる
- コメントを解析できる

### Validation

- 未知Componentを検出できる
- 未知Pinを検出できる
- ID重複を検出できる

### Rendering

- Arduino Uno SVGを表示できる
- Pin位置へ正しくWireが接続される
- LEDとResistorを表示できる
- Componentが重ならない
- WireがComponentを大きく横断しない
- SVGをExportできる

### CLI

以下が動作する。

```bash
bread check circuit.bread
bread render circuit.bread
bread fmt circuit.bread
```

### Playground

- `.bread` Editor
- Live Preview
- Error表示

を提供する。

---

## 45. MVP評価指標

### 45.1 AI生成精度

AIにBread DSLを生成させ、

- Syntax Error
- Unknown Pin
- Unknown Component

がどの程度発生するかを測定する。

---

### 45.2 初心者の理解度

同じ配線について、

```text
テキスト説明のみ
```

と、

```text
Bread Diagram
```

で、どちらが理解しやすいかを検証する。

---

### 45.3 自動レイアウト品質

ユーザーによるGUI修正なしで、

> READMEや教材へそのまま掲載したい

と思える品質になるかを検証する。

---

### 45.4 Wokwiとの差

同じAIユースケースに対して、

```text
AI → Wokwi diagram.json
```

より、

```text
AI → .bread
```

の方が、

- AI生成
- 人間による理解
- Git diff
- Markdown利用

の面で優れているかを検証する。

この差が小さい場合、独自DSLの必要性を再評価する。

---

## 46. プロダクトロードマップ

### Level 1 — Visual Learning

目的：

> **AI回答の配線を図にする。**

対象：

- Arduino初心者
- 電子工作学習者
- AIを使って電子工作を学ぶ人

主要機能：

```text
.bread
↓
SVG
```

---

### Level 2 — Wiring as Code

目的：

> **配線をGit・Markdownで管理する。**

対象：

- 個人開発者
- OSS
- 技術ブログ
- 教材制作者

主要機能：

```text
.bread
↓
├ SVG
├ Pin Table
└ CI
```

---

### Level 3 — Hardware Interface for AI

目的：

> **AI AgentがHardware構成を編集・検証できる形式にする。**

主要機能：

```text
AI Agent
    ↓
.bread
    ↓
Bread Validator
    ↓
├ SVG
├ BOM
├ Pin Assignment
├ Firmware Validation
└ Wokwi
      ↓
 Simulation
```

長期的には、

> **Hardware Interface Language for AI**

というポジションを目指す。

---

## 47. プロダクト原則

Breadの開発判断では、以下を優先する。

1. AIが書きやすい
2. 人間が読める
3. 初心者が図を理解できる
4. Gitで管理しやすい
5. Markdownと相性が良い
6. 座標をユーザーに書かせない
7. 同じ入力から再現可能な結果を生成する
8. 電気的な接続をレンダラーが勝手に変更しない
9. 既存ツールが優れている領域を再実装しない
10. Wokwiとは競争ではなく連携を基本とする
11. DSLを不用意に複雑化しない
12. AIに画像を生成させず、意味を記述させる

---

## 48. 最終ビジョン

現在：

```text
User
 ↓
AI
 ↓
「D13から220Ω抵抗へ接続してください」
 ↓
Userが頭の中で配線を解釈
```

Bread導入後：

```text
User
 ↓
AI
 ↓
Bread DSL
 ↓
Bread Renderer
 ↓
Visual Wiring Diagram
 ↓
User
```

最初に解決するのは非常に小さな問題である。

> **AIに電子工作を聞いたとき、配線まで図で理解できる。**

そこから、

```text
Visual Learning
      ↓
Wiring as Code
      ↓
Hardware Interface for AI
```

へ発展させる。

Breadが目指す最終的な状態は、

> **人間とAIが同じHardware Wiring定義を読み書きできること**

である。
