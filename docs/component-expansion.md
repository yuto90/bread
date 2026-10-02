# Discrete component expansion

This increment adds two concrete through-hole models to the checked core and
Playground. It reuses the mixed-family placer, independent physical verifier and
bounded router. It does not turn recognized parts into arbitrary circuit support.

## Models and provenance

| Bread type | Concrete model | Terminals | Modeled footprint |
| --- | --- | --- | --- |
| `diode-1n4148` | Vishay 1N4148, DO-35 | `A` anode, `K` cathode; black band identifies K | Axial leads formed to 10.16 mm insertion span (four board rows); maximum body length 3.4 mm, diameter 1.75 mm |
| `capacitor-c315c104 [value=100nF]` | KEMET C315C104K5R5TA, 100 nF, 50 V, X7R | `1`, `2`, non-polar; either electrical orientation accepted | Straight 2.54 mm lead pitch (adjacent rows); maximum body length 3.81 mm, thickness 2.54 mm |

Sources inspected on 2026-10-02:

- [Vishay document 81857](https://www.vishay.com/docs/81857/1n4148.pdf),
  revision 1.6, 2024-11-07: page 1 identifies the case and cathode band; page 3
  supplies the maximum body dimensions. **10.16 mm is Bread's lead-forming
  assumption, not a manufacturer-specified native pitch.**
- [KEMET C1050 GOLDMAX X7R](https://content.kemet.com/datasheets/KEM_C1050_GOLDMAX_X7R.pdf),
  revision 2025-08-05: page 1 gives the ordering code, page 3 the C315 body and
  lead dimensions, and page 6 includes the 100 nF / 50 V combination.

Bodies align along the breadboard rows. Placement uses maximum planar body
dimensions plus a 0.5 mm margin on each side; rendering uses the maximum body
dimensions themselves. Routing adds the existing six-SVG-unit clearance and
includes every lead. Newly derived obstacle bounds round outward to 0.001 SVG
units so Chromium's float32 path measurements remain enclosed. Mechanical
height, actual lead forming and real assembly have not been validated.

The numerical package facts informed original source and drawings. No vendor
PDF, artwork, symbol or footprint file is redistributed. Original software is
MIT; generated diagrams retain the separate Arduino-derived CC BY-SA 4.0
attribution and modification metadata. See [license scope](../LICENSES/README.md).

## Accepted circuit

The new family requires exactly one Uno, one 220 ohm resistor, one red 5 mm LED
and one 1N4148:

`Uno D12/D13 → resistor → diode A/K → LED A/K → Uno GND1`

Zero or one non-polar 100 nF capacitor may connect between Uno 5V and GND1.
The resistor and capacitor may use either terminal orientation. IDs, declaration
order and equivalent connection order remain user-controlled. GND aliases GND1;
other Uno ground sockets do not silently replace it.

Reversed diode and LED connections fail `E_DIODE_POLARITY` and `E_LED_POLARITY`
in this family. Invalid named pins retain their source line (`E_UNKNOWN_PIN`);
unsupported values fail `E_ATTRIBUTE`; a capacitor on other nets fails
`E_CAPACITOR_NET`. Power shorts and terminals on the same net fail independently.
Extra components, multiple capacitors and mixtures with the temperature-alarm
family fail `E_UNSUPPORTED_CIRCUIT`. Existing LED families keep their previous
reversed-LED warning behavior.

The two examples are [diode-led.bread](../examples/diode-led.bread) and
[diode-decoupling.bread](../examples/diode-decoupling.bread). Both expose the
`W_DIODE_FOOTPRINT` assembly warning. The capacitor example demonstrates its
named terminals and physical placement; no electrical decoupling effectiveness,
firmware behavior or safe hardware assembly is established.

## Measured evidence

| Sample | Parts | Inserted part terminals | Nets | Uno jumpers | Board links | Occupied holes | Route crossings | Route violations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Diode LED | 4 | 6 | 4 | 2 | 2 | 12 | 1 | 0 |
| Diode + 100 nF | 5 | 8 | 5 | 3 | 3 | 17 | 1 | 0 |

See [placement and routing measurements](discrete-layout-evidence.json),
[diode SVG](../output/diode-led.svg) and
[capacitor SVG](../output/diode-decoupling.svg). Crossings are not junctions.
An internal placement-only stress corpus bypasses semantic validation and adds
capacitors until placement fails: the first failure occurs at 23 total
capacitors with `E_PLACEMENT_CAPACITY`. This measures this deterministic placer,
not supported product capacity, routing success or physical board capacity.
The public family accepts at most one capacitor.

Local verification used Node 24.19.0 and Chrome 154.0.8037.93 on macOS:

- Strict typecheck and 194 core/CLI/DOM tests passed. These include literal
  expected terminal nets, altered physical placements and independent
  reconstruction with logical connection edges removed.
- Two clean static builds produced 41 files with identical paths and bytes.
- Six real-browser tests passed at 1440×1000 and 390×844. All six Playground
  samples decoded and downloaded byte-identically to the core renderer. Actual
  SVG body/lead bounds, new pin/value/polarity errors, stale download protection
  and recovery were checked.

Screenshots: [desktop](images/discrete-desktop.png),
[phone viewport](images/discrete-phone.png). Small labels still require zoom;
these checks do not qualify other browser engines, actual mobile hardware or
beginner comprehension. This branch does not deploy the public Playground.

## Next candidate

A transistor is deferred until package and forming choices are explicit.
[onsemi 2N3903/2N3904 datasheet](https://www.onsemi.com/download/data-sheet/pdf/2n3903-d.pdf),
revision 9, August 2021, pages 1 and 7–8, identifies Style 1 pins E/B/C and
different straight/bent lead forms. Its straight TO-92 lead pitch is not the
board's 2.54 mm pitch. A future implementation must select an exact ordering
code and insertion treatment, name E/B/C, avoid shorting three terminals on a
single board strip, and provide a separately verified bounded topology. No
generic TO-92 model or transistor simulation is added here.
