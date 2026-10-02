# Supported scope

This is the current implementation contract, not the full future roadmap.

## Language and CLI

- First non-comment statement: `bread 0.1`. Optional single JSON-quoted title,
  at most 64 UTF-16 code units; control characters and XML-invalid titles fail.
- `part id: type [value=...]` and `part.pin -- part.pin`; `//` comments.
- IDs: case-sensitive ASCII letter followed by up to 23 letters, digits or
  underscores. No layout directives, expressions, includes or code execution.
- `node src/cli.ts check input.bread` validates through physical placement.
  `node src/cli.ts render input.bread -o output.svg` additionally routes and
  serializes SVG. Routing failure can therefore prevent render after check passes.
- Errors exit 1 with stable `E_*` codes and a line when available. Render validates
  before writing and preserves an existing output on validation failure; that
  existing file may be stale. Reversed LED input is preserved with `W_LED_POLARITY`.
- No formatter, JSON diagnostics CLI, Markdown plugin, PNG export or Wokwi export.

## Circuit families

| Family | Accepted topology | Limits |
| --- | --- | --- |
| Single LED | One Uno R3, 220Ω resistor and `led-5mm-red`, three two-terminal nets forming D12/D13 → resistor → LED → GND1 | Either resistor direction and explicitly reversed LED supported |
| Multi LED | 3–6 separate resistor/LED branches on D13, D12, … with common GND1 | No 2-branch case; 7–12 semantically supported branches fail `E_PLACEMENT_CAPACITY`; larger counts fail `E_UNSUPPORTED_CIRCUIT` |
| Mixed | One Uno, LED + 220Ω resistor, DHT22 + 10kΩ pull-up, button + 10kΩ pull-down, 10kΩ trimmer divider with wiper on A0 | Exactly this circuit family; three distinct digital roles may use D2–D13. Equivalent button pair endpoints and resistor directions supported |

The exact mixed example and its mechanical assumptions are documented in
[mixed-parts-preview.md](mixed-parts-preview.md). Recognized part identifiers are
`arduino-uno-r3`, `resistor`, `led-5mm-red`, `pushbutton-b3f1000-formed`,
`potentiometer-3296w`, and `dht22-bare`. These are not a general component library.
Unknown pins are rejected separately from valid pins in unsupported topologies.
Uno ground socket identity is preserved; GND2/GND3 are not silently substituted.

## Physical model

The automatically added breadboard has 30 rows, A–E and F–J isolated strips, an
isolated center gap and no power rails. A lead or jumper occupies each hole at
most once. Resistors, LEDs and potentiometer internals are not ideal conductor
unions. The button is statically open between its two permanent contact pairs.
All DHT22 pins are placed, including its reserved isolated NC pin.

Physical reconstruction checks actual inserted leads, sockets, strips and
jumpers against expected logical nets. It also checks supported footprints and
conservative component envelopes. Routing is heuristic, deterministic and
bounded, not complete: a physically feasible circuit may still be rejected.

## Quality limits and evidence

The six-LED diagram has 17 crossing points; the mixed diagram has 27. Crossings
are not junctions. Neither the historical unpushed 10-crossing improvement nor a
new general router is present. Capacity is an algorithm/footprint limit, not a
claim about the absolute capacity of every real breadboard.

The button assumes formed leads; native lead pitch does not exactly fit the
breadboard grid. DHT22 enclosure dimensions, under-body jumper clearance and
actual assembly remain unverified. No voltage/current/thermal analysis, circuit
simulation, firmware execution, physical hardware test or beginner study is
included. Browser tests establish UI behavior, not assembly safety or usability.

The Playground accepts at most 32,768 UTF-16 code units and uses the same core.
Errors retain the last good diagram with a stale label and disable its download.
CI exercises Chromium desktop and phone-size viewports; this is not a claim of
Safari/Firefox, physical mobile-device or screen-reader qualification.
