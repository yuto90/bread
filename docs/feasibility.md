# Bread PoC feasibility: conditional Go

Verified 2026-10-01 with Node v24.19.0, TypeScript 5.9.3 and Chromium.
The supported Arduino LED circuit compiles from connection-only input to a
deterministic standalone SVG with automatic hole assignment and independently
reconstructed electrical connectivity. No SVG editing or manual layout was used.

**Conditional Go**, not an unconditional PoC acceptance: AC-09 requires beginner
testing, and the claim that AI can generate the DSL reliably has not been
benchmarked. The technical result supports proceeding to that validation step.
It does not establish general circuit layout feasibility.

## Requirements read

Both complete user documents were read through authorized Library text reads
before implementation: `idea.md` (1511 lines) and `poc.md` (1122 lines). Both
completed with no remaining content. Their preserved reference texts and
provenance are in [requirements/](requirements/README.md). `poc.md` takes
precedence: automatic breadboard placement is core; Playground, Markdown
integration, formatting and simulation are excluded.

## Acceptance evidence

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-01: canonical input generates SVG | Pass | `bin/bread render examples/blink.bread -o output/blink.svg`; canonical test also succeeds without a title because the title defaults to Arduino LED. |
| AC-02: no input placement data | Pass | Example has only version/title/parts/connections. Tests reject coordinates, rotation, holes, routing and relative/layout directives. |
| AC-03: resistor/LED holes assigned automatically | Pass | Resistor E10/E14, LED C14/C15; identity and polarity derive from logical connections. No user holes accepted. |
| AC-04: jumpers assigned automatically | Pass | D13→A10 and GND1→A15; D12 substitution automatically uses its actual socket. |
| AC-05: physical and logical nets match | Pass within model | Exact three-net equality in `netlist-evidence.json`; independent strip/lead/jumper reconstruction. Mutation tests reject wrong strips, wrong side of gap, wrong socket, occupied holes and missing leads. |
| AC-06: LED polarity correct | Pass within model | Normal A=C14/K=C15. Reversed input K=C14/A=C15 is preserved, labeled, and warned. Both diagrams inspected. |
| AC-07: resistor in series | Pass | Exactly three two-terminal nets; resistor and LED terminals are never joined through their component internals. Shorted component tests fail. |
| AC-08: actual D13/GND positions | Pass for supported board | Official Uno Rev3e CAD pad extraction and official pinout; source table in `hardware-sources.md`. Route tests assert coordinates and stable GND identity. |
| AC-09: beginner understands with no manual edits | Pending user validation | Three generated diagrams render and were visually inspected; clear endpoints, row highlights, insertion instructions and polarity. No beginner study conducted. Self-inspection cannot prove comprehension. |
| AC-10: deterministic SVG | Pass | 20 repeated in-process renders and independent CLI processes produce identical bytes. Connection order/direction and GND alias normalization also preserve bytes. |

The full suite currently has **46 passing tests, 0 failures**. See
[test-results.txt](test-results.txt), [browser-evidence.json](browser-evidence.json)
and [netlist-evidence.json](netlist-evidence.json). The preserved test transcript
includes fault-injection test names and timings from this verification run.

## Commands executed

```sh
npm run typecheck
npm test
./bin/bread check examples/blink.bread
./bin/bread render examples/blink.bread -o output/blink.svg
./bin/bread render examples/blink-d12.bread -o output/blink-d12.svg
./bin/bread render examples/blink-reversed.bread -o output/blink-reversed.svg
```

The first two render commands returned PASS with 3 verified nets and 2 jumpers.
The reversed command also returned PASS and emitted `W_LED_POLARITY`. CLI tests
verify a nonexistent pin produces nonzero status, creates no new SVG and leaves
an existing output untouched. Public renderer tests independently verify that
invalid physical placements cannot produce an SVG.

The route regression check found and then prevented a wire crossing. Final
routing takes the ground jumper around the board perimeter and the signal
jumper above it; both D12 and D13 routes have correct endpoints and no crossings.
Component footprint checks reject overlapping bodies/bare-lead envelopes.

## Visual verification

A local read-only static server served `output/` to Chromium through
`agent-browser`. All three final SVGs loaded successfully; browser screenshots
were generated and visually inspected. Canonical DOM checks found 300 breadboard
holes, 4 component insertion endpoints, 2 jumpers, 0 XML parser errors, and no
script, external image, foreignObject or stylesheet elements. Browser error
inspection reported no page errors. A browser favicon request is unrelated to
the self-contained SVG content.

Observed: Uno and breadboard are distinct, board sockets follow the official
geometry, endpoints land on highlighted holes, resistor value is legible, both
LED pins are identified in the diagram and insertion guide, and reversing LED
input visibly changes A/K assignment and its flat-side marker. The D12 image
moves the signal socket one header pitch without moving ground.

Preview PNGs are Chromium screenshots for this verification, not a PNG export
feature. SVG itself needs neither JavaScript nor network assets.

## Canonical connectivity

```text
led.A  — r1.2       C14 — E14  (same five-hole strip)
led.K  — uno.GND1   C15 — A15 — ground jumper
r1.1   — uno.D13    E10 — A10 — signal jumper
```

Canonical SVG SHA-256:
`135d94378d17d393e5239b0c6547c45af9ae1b79404d0f93b2ba8d6f2f277d43`

D12 SVG SHA-256:
`1102c63b707d8e92bb6d9517e584b43e5247285944bae2bb7885e6552e8cffd7`

Reversed SVG SHA-256:
`e2aad6092f70d95ab5edede8529151394f6563d48ac3e9e85c1eef9f7d6bdefc`

## Limits and decision gates

- One pattern: Uno R3 + 220Ω resistor + red LED, D12 or D13, one rail-free
  breadboard. Unsupported valid pins/topologies fail explicitly. No generic
  optimizer, arbitrary component library or multiple boards.
- Connectivity proof covers this model's contacts and conductors, not electrical
  simulation, resistor tolerance, LED forward voltage, thermal behavior,
  firmware, counterfeit hardware or incorrect real-world insertion.
- Physical ground socket identity is retained; the proof does not model every
  internal Uno circuit. GND2/GND3 are not automatically interchanged with GND1.
- SVG font substitution may affect appearance across systems; identical source
  guarantees SVG bytes for the same version, not pixel identity in every browser.
- Original visual primitives are simplified. Board pad coordinates/outline are
  CAD-derived; decorative chip and connector details are illustrative.
- The existing-tool comparison is grounded in official documentation, not a
  competitive benchmark. Coordinate-free schematic tools already exist.

Next validation: give the diagram to several Arduino beginners without coaching;
ask them to identify both Uno sockets, all insertion holes, and LED polarity on
paper or an unpowered board. Record errors and time against a text-only baseline
and Wokwi's normal workflow. Separately benchmark DSL generation on the same
prompts without adding AI APIs to this repository. An unconditional Go requires
evidence that users can follow the output without fixing layout, and that the
workflow offers enough benefit over existing tools.
