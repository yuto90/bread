# Scaling study: six branches fit; ten exceed the supported pattern

The user's request was to see more parts and cables and test whether the preview stays clean as parts increase. This study extends the actual connection-only compiler, not a hand-drawn illustration. **Six branches are electrically consistent within the model but visibly more congested. Ten are rejected. This does not demonstrate unlimited scaling or consistently clean routing.**

## Artifacts

- [Six-LED SVG](../output/6-leds.svg)
- [Six-LED PNG, native 1580×1140](../output/6-leds-preview.png)
- [Six-LED PNG fitted to 1440px desktop width](../output/6-leds-fit-preview.png)
- [Six-branch DSL](../examples/6-leds.bread), [ten-branch DSL](../examples/10-leds.bread)
- [Machine-readable measurements and placements](scaling-evidence.json)
- [82-test transcript](scaling-test-results.txt), [browser evidence](scaling-browser.json)

There is deliberately no ten-LED wiring SVG: the CLI fails before creating it. An existing destination is preserved on failure.

## Comparison

| Measure | Reviewed 3 branches | 6 branches | 10 branches |
| --- | ---: | ---: | --- |
| Uno + resistors + LEDs | 7 | 13 | 21 requested |
| Physical breadboards | 1 | 1 | 1 requested |
| Available holes | 300 | 300 | 300 |
| Occupied holes, all distinct | 20 | 41 | No placement |
| Jumper wires (Uno + breadboard) | 6 (4 + 2) | 12 (7 + 5) | No routes |
| Verified nets | 7 | 13 | Not physically verified |
| Distinct wire-pair crossing points | 0 | 17 | Not rendered |
| Collinear overlapping wire runs | 0 | 0 | Not rendered |
| Component envelope overlaps | 0 | 0 | Not placed |
| Median render time | 0.92 ms | 1.07 ms | Capacity error |
| p95 render time | 1.46 ms | 1.70 ms | Capacity error |

Timing is one warmup plus 100 in-process samples on Node v24.19.0 in this environment, including parsing, semantic checks, placement, physical validation and SVG creation. It excludes process startup, disk writes and browser rendering and is not a production benchmark. Reproduce with `node scripts/measure-scaling.ts`.

Crossings are measured as wire-pair point intersections, deduplicated across adjacent segments. They are insulated wire crossings, not electrical junctions; white underlays show the over/under distinction. Collinear overlaps are measured separately. The physical verifier uses only endpoint connections, not visual line intersections.

## Capacity and actual algorithm

The board remains the existing rail-free 30-row A–J model: A–E and F–J form isolated five-hole strips per row. Canvas growth adds space for the guide, not physical holes. No new hardware model was added.

The resolver follows each real series branch from distinct Uno pin through a resistor and LED to a common GND1 net. The placement rule uses nine-row slots derived from the existing resistor spacing and raised-LED body envelope. The first bank receives up to three branches; further branches use the other bank with the resistor on F, LED on H and signal on J. Identical rules handle four, five and six branches. Ground links connect return strips using distinct holes and one physical Uno GND1 socket. Neither IDs nor input coordinates select the layout.

The supported pattern's capacity is **six branches**, not an assertion that no other physical arrangement could ever fit more on a 300-hole board. The seventh branch would require another slot beyond the supported bank capacity. Packing LEDs differently, optimizing placement, or adding a larger/second breadboard would be a further model and renderer change. This study does not silently make those changes.

Both seven- and ten-branch examples resolve genuine logical topologies, then fail with `E_PLACEMENT_CAPACITY`. The public physical verifier also enforces the same capacity. Ten branches must not be displayed as a successful physical design by simply enlarging the canvas.

## Pin and footprint validation

Six uses D13, D12, D11, D10, D9 and D8. Ten requests D13 through D4. All are real Uno R3 GPIO pins; D0/RX and D1/TX are excluded, so serial pins are not consumed. D10–D13 also have SPI functions; this illustration assumes GPIO use, not simultaneous SPI operation. No firmware or electrical simulation is provided.

The official Uno Rev3e CAD archive already cited in [hardware sources](hardware-sources.md) was re-read. IOH is rotated R180 at (30.226, 50.8) mm. Pads 3, 2 and 1 give D10, D9 and D8 at x=36.576, 39.116 and 41.656 mm. The existing SVG transform gives (326.032,247.78), (343.812,247.78), (361.592,247.78). IOL pads 8–5 give D7–D4 at x=45.72,48.26,50.8,53.34 mm. D13–D11 were checked previously. Sources: [official pinout](https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf) and the pinned CAD archive in the hardware source document.

Resistor lead span stays four pitches (10.16 mm); LED lead span stays one pitch (2.54 mm). Conservative component/body/lead envelopes are checked against each other and the board boundaries. Independent physical net reconstruction unions only strips, actual lead insertion holes and actual jumper endpoints, then compares against the logical netlist. It does not reuse logical connection edges.

## Visual result and tests

Chromium displayed the standalone SVG without parser or browser errors. DOM inspection found exactly 300 holes, 24 leads and 12 jumper paths, with no external image/script assets. Both native and desktop-width PNGs were visually inspected.

At 1440px width, the insertion guide and numbered LED bodies are readable; the smallest board/polarity labels still benefit from zoom. The six-branch signal fan-out and ground bridges are noticeably harder to trace than three branches because of the 17 crossings. Removing overlapping wire labels and using the guide improves readability but does not remove that routing limitation. This is an agent visual assessment, not beginner usability validation.

All **82 tests** pass (67 previous + 15 scaling tests), and TypeScript checking passes. Tests cover healthy four/five/six cases, the first oversized seven case, ten's capacity failure without output damage, actual pin/hole endpoints, hole/socket uniqueness, missing/wrong ground bridges, short/overlap corruption, deterministic output across calls and processes, reordered input and no collinear wire runs. Both reviewed one-LED and three-LED SVGs remain byte-identical.

Prepared locally on `feat/scaling-preview`. Publication is pending separate approval; no push, PR change, merge or deployment was performed for this study. Library upload was not retried because its supported route already returned a network failure during this session. Local SVG/PNG files are the deliverables.
