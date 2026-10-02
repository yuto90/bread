# Hardware geometry and assets

Verified on 2026-10-01 against Arduino's primary documents. All component artwork
is drawn by this renderer; there are no downloaded logos, images, fonts or scripts
in the SVG. Board pad coordinates and outline are derived from Arduino's CAD.

## Uno R3

- [Official product and downloads](https://docs.arduino.cc/hardware/uno-rev3)
- [Official full pinout, A000066, page 1](https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf)
- [Official CAD archive in Arduino's documentation repository](https://github.com/arduino/docs-content/blob/bdd379bc55bd1ec9449c87235640cedde017f751/content/hardware/uno/boards/uno-rev3/downloads/A000066-cad-files.zip)

Read the complete pinout and visually inspected its top view. Extracted the
EAGLE XML board `UNO-TH_Rev3e.brd` from the official CAD archive, resolved the
IOH/IOL/POWER/AD elements against their package pads, applied R180 to the upper
headers, and inspected signal contact references. Archive SHA-256:
`532b306cb153846eafc0ca9fe991d7a4dfa0c52dcefafa2efeaebf4b845ec820`.

| Socket | CAD element/pad | CAD signal | Board x (mm) | Board y (mm) | SVG center |
| --- | --- | --- | ---: | ---: | --- |
| D13 | IOH / 6 | SCK | 28.956 | 50.800 | 272.692, 247.780 |
| D12 | IOH / 5 | MISO | 31.496 | 50.800 | 290.472, 247.780 |
| D11 (three-LED extension) | IOH / 4 | MOSI | 34.036 | 50.800 | 308.252, 247.780 |
| GND1 (alias GND) | IOH / 7 | GND | 26.416 | 50.800 | 254.912, 247.780 |

The pinout confirms D13 = PB5/SCK and D12 = PB4/CIPO (formerly MISO).
Rendering uses `x = 70 + 7 * CAD_x`, `y = 230 + 7 * (53.34 - CAD_y)`.
The physical board is 68.58 × 53.34 mm; the SVG rounds coordinates to 0.001 units.
The renderer follows the board edge vertices, simplifying its tiny corner arcs.
Unconnected chips, USB/power connector details and silkscreen are illustrative.

With USB at left, the upper header runs SCL, SDA, AREF, GND, D13, D12, D11,
D10, D9, D8, then the header gap and D7 through D0. GND1 is **always** the
socket between AREF and D13. This is Bread's stable name, not Arduino's own
GND numbering. GND2/GND3 refer to the two power-header ground sockets; they are
recognized physical pins but their use is outside this PoC's supported chain.
They are never silently substituted for GND1. The model distinguishes physical
socket identity even where the Uno internally shares ground.

The official CAD archive and pinout state **CC BY-SA 4.0**. Attribution:
Arduino, UNO R3 A000066 / UNO-TH Rev3e. The derived board geometry and generated
SVG illustrations are provided under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Changes: simplified artwork, rotation to USB-left view, coordinate scaling,
connection overlays, labels and breadboard/component illustrations. No Arduino
logo or endorsement is implied. Application code is original; this document
does not assign a repository-wide software license.

## Breadboard and discrete components

The fixed model is a rail-free 300-contact terminal strip: 30 rows × 10 columns,
two isolated groups of five holes per row, with a three-pitch center gap.
The common 2.54 mm grid and approximately 7.62 mm gap are consistent with the
terminal area of [SparkFun's solderless board](https://www.sparkfun.com/breadboard-self-adhesive-white.html).
Its additional power buses are deliberately **not** part of this model or drawing.
This is a generic terminal-strip model, not a claim to model every commercial
breadboard's power rails or numbering convention.

The resistor spans four row pitches (10.16 mm bent lead spacing). The LED spans
one row pitch (2.54 mm) and is illustrated with gently bent leads and a raised
body, so insertion points remain visible. A and K are explicitly labeled; the
flat side marks K. Exact lead length and package tolerances are not modeled.
No physical hardware was operated and no electrical simulation was performed.
