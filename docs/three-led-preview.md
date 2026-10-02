# Three-LED preview (local extension)

This is a user-requested extension after the original one-LED PoC review. It adds one bounded topology: one Uno R3, three 220Ω resistor/LED branches on D13, D12 and D11, with one shared ground. It does not change the original requirements or claim a general router.

## Preview and reproduction

- [Connection-only input](../examples/three-leds.bread)
- [Standalone SVG](../output/three-leds.svg)
- [Browser PNG preview](../output/three-leds-preview.png)

```sh
./bin/bread render examples/three-leds.bread -o output/three-leds.svg
npm test
npm run typecheck
```

The input specifies parts and connections only. Placement and routing are deterministic patterns selected from the resolved topology; no hole addresses or coordinates are required in the DSL.

| Signal | Resistor leads 1 / 2 | LED anode / cathode | Signal jumper hole |
| --- | --- | --- | --- |
| D13 | r1 E2 / E6 | led1 C6 / C7 | A2 |
| D12 | r2 E11 / E15 | led2 C15 / C16 | A11 |
| D11 | r3 E20 / E24 | led3 C24 / C25 | A20 |

One Uno GND1 wire ends at A25. Breadboard jumpers D7–D16 and E16–D25 join the return strips. All 20 occupied holes are distinct, and each of the four occupied Uno sockets has one wire. There are seven logical nets and six jumper wires, including the two ground bridges.

D11's socket coordinate was checked against the official Uno R3 CAD: IOH pad 4, MOSI, at (34.036, 50.8) mm. D12, D13 and GND1 are adjacent pads 5–7. See [hardware sources](hardware-sources.md) for the official source and pinned archive checksum.

## Validation

All 67 tests passed (46 original tests and 21 extension tests); TypeScript checking passed. The original one-LED SVG remains byte-for-byte identical to the reviewed baseline, SHA-256 `135d94378d17d393e5239b0c6547c45af9ae1b79404d0f93b2ba8d6f2f277d43`.

Physical connectivity is reconstructed independently from breadboard strip conductors, actual component insertion holes and jumper endpoints. Expected logical edges and net IDs are not used to construct the physical netlist. Tests exercise missing/wrong ground bridges, a shorted LED, duplicate occupied holes/sockets, wrong socket identity, component overlap, endpoint alignment, noncrossing jumper routes, reversed polarity and deterministic output across separate processes and reordered declarations/connections.

The SVG was opened in Chromium and the final 1440×940 PNG visually inspected. Browser checks found 300 breadboard holes, 12 component leads, six jumper paths, no SVG parser errors, no external assets and no browser errors. Labels, separate signal paths and shared-ground bridge endpoints are visible. This is visual/model verification, not a physical build or beginner usability test.

- [Test transcript](three-led-test-results.txt)
- [Physical netlist evidence](three-led-netlist.json)
- [Browser evidence](three-led-browser.json)
- [Artifact checksums](three-led-checksums.txt)

## Scope and delivery

This extension supports exactly the original one-LED family or the specified three-branch/shared-ground family. Arbitrary circuit routing, arbitrary board pins, more branches, electrical simulation and full physical safety validation remain out of scope. The original beginner validation acceptance criterion remains pending.

Prepared locally on `feat/three-led-preview`; no push, PR update, merge or deployment was performed. A single supported Library batch-upload attempt failed with `hosted apps tools/list request failed: network`. Neither artifact received a Library file ID; the files above remain available locally.
