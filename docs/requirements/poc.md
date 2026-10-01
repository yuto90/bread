# Bread PoC 要件定義

## 1. 概要

**Bread** は、電子工作の配線情報を簡潔なテキストDSLで記述し、実物風の配線図へ自動レンダリングするツールである。

Breadの最大の特徴は、ユーザーやAIが**接続情報だけを記述し、部品配置・ブレッドボードの穴位置・配線経路を指定しない**ことである。

PoCでは、このコンセプトが技術的に成立するかを検証する。

---

## 2. PoCの目的

PoCの目的は、Bread全体を実装することではない。

以下の仮説を検証することを目的とする。

> **電子的な接続関係だけを入力すれば、人間による座標・穴番号・レイアウト指定なしで、初心者が理解できる実物風Arduino配線図を自動生成できる。**

特に、既存のDSL型配線ツールとの差別化となる以下を検証する。

> **No coordinates.  
> No hole addresses.  
> No manual layout.**

---

## 3. PoCで検証するプロダクト仮説

### 仮説1：AIは配線の意味だけ記述すればよい

AIは以下だけを生成する。

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

AIに以下を書かせない。

```text
breadboard row = 12
hole = E12
x = 140
y = 220
rotation = 90
wire bend = ...
```

---

### 仮説2：Breadが物理配置を自動決定できる

Breadは入力された接続情報から、自動的に以下を決定する。

- Arduino Unoの配置
- ブレッドボードの配置
- LEDの配置
- 抵抗の配置
- LEDの向き
- 抵抗を挿す穴
- LEDを挿す穴
- Arduinoからブレッドボードへのジャンパー線
- ブレッドボード内部の電気的接続
- Wireの経路
- Wireの色

---

### 仮説3：生成された図が初心者にとって理解可能である

生成結果を見たユーザーが、

> ArduinoのどのPinから、ブレッドボード上のどの部品へ接続すればよいか

を図だけで理解できることを目標とする。

---

## 4. PoC成功時のユーザー体験

### 入力

ユーザーまたはAIが `blink.bread` を作成する。

```bread
bread 0.1

title "Arduino LED"

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

### 実行

```bash
bread render blink.bread -o blink.svg
```

### 出力

以下を含む実物風SVGを生成する。

```text
Arduino Uno
      │
     D13
      │
      │ jumper wire
      ▼
┌─────────────────────────────┐
│         Breadboard          │
│                             │
│       220Ω          LED     │
│     ─/\/\/─         ─▷|     │
│                             │
└─────────────────────────────┘
      ▲
      │
     GND
      │
Arduino Uno
```

実際の出力では、Arduino・Breadboard・LED・抵抗を実物風に描画する。

---

## 5. PoCスコープ

PoCでは、**LED点灯回路1種類を正しく自動配置できること**に集中する。

### 対応Component

以下の3種類のみ必須とする。

- Arduino Uno R3
- 5mm LED
- Resistor

さらに、レンダリング上必要となる以下をシステム側で使用する。

- Breadboard
- Jumper Wire

Breadboardはユーザーが `part` として宣言しなくてもよい。

Breadが必要に応じて自動的に配置する。

---

## 6. 対象回路

PoCの標準回路は以下とする。

```text
Arduino D13
    │
    ↓
220Ω Resistor
    │
    ↓
LED Anode
LED Cathode
    │
    ↓
Arduino GND
```

Bread DSL：

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

---

## 7. PoC DSL仕様

PoCでは文法を最小限にする。

### 7.1 バージョン

```bread
bread 0.1
```

必須。

---

### 7.2 タイトル

```bread
title "Arduino LED"
```

任意。

---

### 7.3 Component宣言

```bread
part <id>: <component-type>
```

例：

```bread
part uno: arduino-uno-r3
part led: led-5mm-red
```

属性付き：

```bread
part r1: resistor [value=220ohm]
```

---

### 7.4 接続

```bread
<component>.<pin> -- <component>.<pin>
```

例：

```bread
uno.D13 -- r1.1
```

---

### 7.5 コメント

```bread
// LED current limiting resistor
uno.D13 -- r1.1
```

---

## 8. DSLで禁止するもの

PoCでは、以下の指定を意図的に提供しない。

### 座標

```text
x = 100
y = 200
```

### 回転角

```text
rotation = 90
```

### Breadboard Hole

```text
@E12
@F12
@20a
```

### Wire Path

```text
wire bend 100,200
```

### 相対配置

```text
place led right-of resistor
```

これらを必要とせずに図を生成できるかを検証することがPoCの目的である。

---

## 9. Breadboardモデル

PoCではBreadboardの種類を1種類に固定する。

### 要件

- 一般的なSolderless Breadboard
- 中央にIC用の溝が存在
- 各Holeの電気的接続グループを内部データとして持つ

例えば、

```text
A1 B1 C1 D1 E1
```

が内部的に接続されている場合、

```text
NetGroup 1:
A1
B1
C1
D1
E1
```

として保持する。

ユーザーはこのHole情報を意識しない。

---

## 10. Breadboard自動Hole Assignment

BreadはNetlistから、部品を挿すHoleを自動決定する。

例：

```text
Net 1:
uno.D13
r1.1

Net 2:
r1.2
led.A

Net 3:
led.K
uno.GND
```

Breadはこれを、

```text
r1.1 → E10
r1.2 → E14

led.A → D14
led.K → D18

D13 jumper → A10
GND jumper → A18
```

のような物理配置へ変換する。

上記Hole番号は例であり、入力DSLには存在しない。

---

## 11. Auto Placement要件

PoCのPlacement Engineは以下を満たす。

### Arduino

Arduino Unoを固定領域に配置する。

PoCでは例えば、

```text
Arduino Uno = 左側
Breadboard  = 右側
```

の固定方針でもよい。

PoCでは完全汎用レイアウトを目指さない。

---

### Breadboard

Arduinoと重ならない位置へ自動配置する。

---

### Resistor

以下を満たす位置に配置する。

- 両端が異なるElectrical Netに属する
- Breadboardの内部接続によって抵抗がShortしない
- LEDとの接続を容易にする

---

### LED

以下を満たす位置に配置する。

- AnodeとCathodeが異なるNetへ接続される
- 同一Breadboard Netに両脚が入らない
- 極性が図から判別できる

---

## 12. Electrical Model

PoCでも、

> 見た目が正しいだけで、電気的には違う

状態を許容しない。

内部では以下を分離する。

```text
Logical Connection
        ↓
Electrical Net
        ↓
Physical Hole Assignment
        ↓
Rendered Wire
```

---

## 13. Netlist生成

以下のDSLから、

```bread
uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

次のNetを生成する。

```text
NET_1
- uno.D13
- r1.1

NET_2
- r1.2
- led.A

NET_3
- led.K
- uno.GND
```

ResistorやLEDの内部を同一Netとして扱ってはならない。

---

## 14. 配置後のElectrical Validation

Physical Placement完了後、Breadは、

> 実際のBreadboard内部接続を考慮したNetlist

を再構築する。

その結果がDSLから生成したLogical Netlistと一致することを確認する。

処理：

```text
Bread DSL
   ↓
Expected Netlist
   ↓
Auto Placement
   ↓
Physical Breadboard Netlist
   ↓
Compare
```

一致しない場合、SVG生成を成功扱いにしてはならない。

---

## 15. Wire Routing

PoCでは高度なWire Routerは不要。

以下を満たせばよい。

- Arduino Pinから正しいBreadboard Holeへ接続
- WireがどのPinにつながっているか視認できる
- Wire同士の重なりを極力避ける
- Component上を極端に横切らない
- SVG上でWireを識別できる

必要に応じて直交配線を使用する。

```text
────┐
    │
    └────
```

---

## 16. Wire Color

PoCでは以下の単純な規則を使用してよい。

```text
GND   → Black
Signal → Yellow / Green
```

色は電気的な意味そのものとして扱わない。

---

## 17. Component Rendering

### Arduino Uno

最低限以下を実物と対応させる。

- 基板外形
- D13
- GND
- Pin Header位置

---

### Resistor

以下を描画する。

- Resistor本体
- Lead
- 220Ωであることが分かる表示

カラーコードの完全対応はPoCでは必須ではない。

---

### LED

以下を描画する。

- LED本体
- Anode
- Cathode
- Pin位置
- 極性が視覚的に分かること

---

### Breadboard

以下を描画する。

- Hole grid
- 中央溝
- Componentの差し込み位置
- Jumper Wireの差し込み位置

---

## 18. 出力形式

PoCの出力形式はSVGのみとする。

```bash
bread render blink.bread -o blink.svg
```

PNG / PDFはPoC対象外。

---

## 19. SVG要件

SVGは以下を満たす。

- ブラウザ単体で表示可能
- 外部JavaScript不要
- 外部CSS不要
- ComponentとWireが視認できる
- README等へ画像として掲載可能

---

## 20. CLI

PoCでは最低限以下のみ実装する。

### Render

```bash
bread render blink.bread -o blink.svg
```

### Check

```bash
bread check blink.bread
```

---

## 21. Validation

PoCでは最低限以下を検出する。

### Unknown Component

```bread
part foo: unknown-part
```

```text
ERROR E_UNKNOWN_COMPONENT
```

---

### Unknown Pin

```bread
uno.D99 -- led.A
```

```text
ERROR E_UNKNOWN_PIN
```

---

### Duplicate ID

```bread
part led: led-5mm-red
part led: led-5mm-red
```

```text
ERROR E_DUPLICATE_COMPONENT_ID
```

---

### Physical Placement Error

自動配置に失敗した場合、

```text
ERROR E_PLACEMENT_FAILED
```

を返す。

誤った配線図を生成して成功扱いにしてはならない。

---

### Electrical Mismatch

配置後NetlistがLogical Netlistと一致しない場合、

```text
ERROR E_NETLIST_MISMATCH
```

を返す。

---

## 22. PoCの画面

Web PlaygroundはPoCでは必須としない。

最小構成：

```text
.bread
   ↓
CLI
   ↓
SVG
```

でよい。

必要であれば開発確認用として、

```text
┌──────────────┬───────────────┐
│ Bread Source │ SVG Preview   │
└──────────────┴───────────────┘
```

程度の簡易ページを用意してもよい。

ただし、Playground開発によってPoCの本質であるAuto Placementの検証を遅らせない。

---

## 23. 推奨Architecture

```text
blink.bread
     ↓
Parser
     ↓
AST
     ↓
Semantic Resolver
     ↓
Logical Netlist
     ↓
Auto Placement
     ↓
Breadboard Hole Assignment
     ↓
Physical Netlist
     ↓
Electrical Validation
     ↓
Wire Routing
     ↓
SVG Renderer
     ↓
blink.svg
```

---

## 24. 実装技術候補

PoCでは以下を候補とする。

```text
TypeScript
Node.js
SVG
```

必要に応じて、

```text
ELK.js
```

を利用してもよい。

ただし、PoCの目的はELK.jsを導入することではない。

LED回路程度であれば固定配置ルールや独自の簡易Placement Algorithmでもよい。

---

## 25. Deterministic要件

同一の `.bread` に対して、毎回同じPlacementを生成する。

以下は禁止する。

```text
Math.random()
ランダムなHole Assignment
実行ごとに変わるWire経路
```

Git管理やAI Agent利用を想定し、結果の再現性を確保する。

---

## 26. PoC対象外

以下は実装しない。

### Hardware

- ESP32
- Raspberry Pi Pico
- Arduino Nano
- DHT22
- HC-SR04
- OLED
- Servo
- Motor

### Software

- MCU Simulation
- Firmware Execution
- Wokwi Integration
- BOM
- Firmware Validation
- VS Code Extension
- Markdown Plugin
- GitHub Integration
- AI API
- Natural Language Input

### Layout

- 任意数のComponent
- 大規模回路
- Breadboard複数枚
- 複数Arduino
- ユーザーによる手動配置
- Drag & Drop

---

## 27. 最重要Acceptance Criteria

PoCの最重要合格条件は以下。

### AC-01

以下の入力だけで、

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

SVGを生成できる。

---

### AC-02

入力DSLに、

- 座標
- Breadboard Hole
- Component位置
- Wire経路

が一切含まれていない。

---

### AC-03

BreadがBreadboard上のLEDとResistorのHoleを自動決定する。

---

### AC-04

BreadがArduinoからBreadboardへのJumper Wire接続先を自動決定する。

---

### AC-05

生成されたPhysical Netlistが、入力DSLから生成したLogical Netlistと一致する。

---

### AC-06

LEDのAnode / Cathodeが正しく配置されている。

---

### AC-07

抵抗がLEDと直列接続されている。

---

### AC-08

WireがArduino D13およびGNDの正しい物理Pin位置へ接続される。

---

### AC-09

ユーザーによるSVG編集やGUI配置調整なしで、配線方法を理解できる。

---

### AC-10

同じ `.bread` から毎回同じSVG Layoutを生成できる。

---

## 28. PoCテストケース

### Test 1：正常系

```bread
bread 0.1

part uno: arduino-uno-r3
part r1: resistor [value=220ohm]
part led: led-5mm-red

uno.D13 -- r1.1
r1.2 -- led.A
led.K -- uno.GND
```

期待：

```text
PASS
SVG生成
Electrical Net一致
```

---

### Test 2：Pin変更

```bread
uno.D12 -- r1.1
```

期待：

- Arduino側のWireがD12へ変更される
- Breadboard側の配置は必要に応じて自動再計算される
- 手動Layout変更は不要

---

### Test 3：Unknown Pin

```bread
uno.D99 -- r1.1
```

期待：

```text
E_UNKNOWN_PIN
```

---

### Test 4：LED逆接続をDSLで明示

```bread
r1.2 -- led.K
led.A -- uno.GND
```

Breadは入力を勝手に修正しない。

DSL通りに扱う。

必要であれば、

```text
WARNING W_LED_POLARITY
```

を出すことは可能だが、PoCでは必須ではない。

---

## 29. 比較検証

PoC完成後、既存の配線DSLとの違いを評価する。

特に確認するポイント：

```text
Bread
↓
Connection only
↓
Auto Placement
```

に対して、

```text
Existing Tool
↓
Connection
+
Hole / Position
↓
Render
```

となっているかを比較する。

BreadでHole指定や配置指定が必要になった場合、差別化仮説を再評価する。

---

## 30. PoC Go / No-Go基準

### Go

以下をすべて満たす場合、MVP開発へ進む。

- Connectionのみで図が生成できる
- Hole Assignmentが完全自動
- Electrical Netが正しい
- 初心者が理解できるVisual Quality
- 手動Layout修正が不要
- AIが容易に生成可能なDSLである

---

### No-Go

以下のいずれかに該当する場合、現在のコンセプトを再検討する。

- Hole番号をユーザーに書かせる必要がある
- Component位置を手動指定しないと図が成立しない
- 簡単なLED回路でもAuto Placementが不安定
- Physical Placement後にElectrical Netを保証できない
- 出力品質を上げるため毎回人間によるGUI修正が必要
- 既存ツールと比較してBreadを使うメリットがほとんどない

---

## 31. PoC成果物

PoC完了時に以下を成果物とする。

```text
bread/
├ src/
│  ├ parser/
│  ├ netlist/
│  ├ placement/
│  ├ breadboard/
│  ├ routing/
│  └ renderer/
│
├ parts/
│  ├ arduino-uno-r3/
│  ├ resistor/
│  ├ led-5mm-red/
│  └ breadboard/
│
├ examples/
│  └ blink.bread
│
├ output/
│  └ blink.svg
│
└ README.md
```

---

## 32. PoC完了定義

以下の1コマンドで、

```bash
bread render examples/blink.bread -o output/blink.svg
```

次の条件を満たすSVGが生成された時点でPoC完了とする。

1. Arduino Unoが表示される
2. Breadboardが表示される
3. 220Ω抵抗が自動配置される
4. LEDが自動配置される
5. D13から抵抗へ接続される
6. 抵抗からLED Anodeへ接続される
7. LED CathodeからGNDへ接続される
8. Breadboard Holeをユーザーが指定していない
9. 座標をユーザーが指定していない
10. 配線後のElectrical NetがDSLと一致している
11. 人間によるLayout修正なしで配線方法を理解できる

---

## 33. PoCで最も重要なこと

Bread PoCでは、多機能性を評価しない。

検証するのは一点だけである。

> **「接続だけ書けば、正しい実物配線図になる」は本当に実現できるか。**

PoCでは、この一点を証明することを最優先する。
