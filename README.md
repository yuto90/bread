# Bread

**Describe connections. Get an automatically placed breadboard wiring diagram.**

Bread turns a small `.bread` text file into a standalone SVG with realistic
component drawings, physical pin labels and an insertion guide. You declare
parts and connections; Bread assigns holes and routes wires. It independently
reconstructs physical connectivity and compares it with the logical nets before
rendering.

Bread is in early product development. The checked circuit families below work;
arbitrary circuits, certified mechanical fit and electrical behavior are not
supported claims. Original software is **MIT-licensed**; Arduino-derived geometry and generated
illustrations are **CC BY-SA 4.0**. See the [file-level license scope](LICENSES/README.md)
and [output obligations](docs/licensing-review.md). No package release is published.

![Bread wiring output](output/blink.svg)

## Try it locally

Use **Node.js 24.19.0** (`nvm use` reads `.nvmrc`). The CLI and Playground have no
runtime npm dependencies. From a checkout of [yuto90/bread](https://github.com/yuto90/bread):

```sh
node src/cli.ts check examples/blink.bread
node src/cli.ts render examples/blink.bread -o dist/blink.svg
npm run playground
```

Open **http://127.0.0.1:4173** for the editor, six sample circuits, live errors,
zoom and SVG downloads. The loopback server serves static files; compilation runs
inside a browser Worker. Edits stay in the tab and are lost on reload or sample
replacement. Restart the server after source changes.

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

No coordinates, rotation, hole numbers or wire paths belong in the input.
`GND` aliases the specific `GND1` socket between AREF and D13, with USB at left.
A visual wire crossing is not a junction.

## Supported today

| Circuit family | Scope |
| --- | --- |
| One resistor and LED | Uno D12 or D13, 220Ω resistor, red 5mm LED, GND1 |
| Three to six LED branches | Contiguous Uno pins starting at D13 and descending, one 220Ω resistor per LED, shared GND1 |
| Mixed-parts family | The [temperature-alarm wiring topology](examples/temperature-alarm.bread): Uno, LED, three resistors, formed-lead button, 10kΩ trimmer, bare DHT22; qualified pin reassignment and equivalent connections |
| Diode LED family | Uno D12/D13 → 220Ω resistor → Vishay 1N4148 A/K → red LED A/K → GND1; optionally one KEMET C315C104 100nF capacitor between 5V/GND1 |

All use the same fixed 30-row, 300-hole breadboard without power rails. **Two LED
branches are unsupported; seven through twelve exceed placement capacity.**
Supported parts do not imply arbitrary combinations. Six-LED routing has 17
crossings, the mixed example 8 (down from 27), and each new diode sample 1.
See the [bounded routing results](docs/mixed-routing.md) and
[component models, datasheet provenance and evidence](docs/component-expansion.md).
The missing historical layout improvement
has not been incorporated. See the [full support contract](docs/supported-scope.md).

Validation checks modeled connectivity, hole/socket uniqueness, footprint rules
and component envelopes. It does not calculate voltage, current or temperature,
simulate firmware or prove safe assembly. Button lead forming and DHT22 clearance
still need physical verification, as do the 1N4148 leads formed to 10.16mm.
Beginner comprehension has not been measured.

## Develop and verify

```sh
npm ci --ignore-scripts
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run build
```

`verify` runs strict typechecking, core/CLI/DOM tests and two clean static builds
whose file lists and bytes must match. `test:browser` exercises real Chromium at
1440×1000 and 390×844. `build` writes static files to `dist/playground/`; serve them
over HTTP. Node's type stripping API is experimental, so the tested runtime is
pinned. Other Node versions and browser engines are not release-qualified.

GitHub Actions runs the same checks on pull requests and `main`, including browser
installation and evidence artifacts. See [contributing](CONTRIBUTING.md),
[Playground details](docs/playground.md) and the [foundation verification record](docs/production-foundation.md).

## Architecture and next steps

`parser → semantic validation → logical nets → placement → independent physical
net reconstruction → comparison → routing → SVG`

`src/` contains the core and CLI; `parts/` contains physical definitions;
`playground/` is a browser adapter over that same core. The physical verifier
unions actual board strips, component conductor facts and jumper endpoints,
without reusing expected net labels or logical connection edges.

The next engineering milestone is routing quality with explicit benchmark and
capacity criteria, followed by hardware-fit and beginner-usability validation.
Simulation, an AI service, package publication and public hosting are outside
this foundation change. The [original requirements](docs/requirements/) preserve
the product vision and historical experiment; they are not a promise that every
listed feature exists. [Hardware sources](docs/hardware-sources.md) document the
separate provenance and attribution of derived geometry and diagrams.
