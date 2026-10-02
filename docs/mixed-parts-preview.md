# Mixed-parts temperature-alarm wiring study

Added three component types and generated an actual connection-only wiring preview: a four-leg pushbutton, 10kΩ trim potentiometer and bare four-pin DHT22. An Uno, LED, 220Ω series resistor, 10kΩ DHT pull-up and 10kΩ button pull-down complete the example. This is **intended alarm wiring**, not working alarm firmware, simulation, hardware testing or a safety validation.

## Deliverables

- [Desktop-width PNG](../output/temperature-alarm-fit-preview.png)
- [Native-size PNG](../output/temperature-alarm-preview.png)
- [Standalone SVG](../output/temperature-alarm.svg)
- [Connection-only source](../examples/temperature-alarm.bread)
- [Physical/logical net evidence and placement](mixed-netlist-evidence.json)
- [Test transcript](mixed-test-results.txt), [browser evidence](mixed-browser.json)

```sh
./bin/bread check examples/temperature-alarm.bread
./bin/bread render examples/temperature-alarm.bread -o output/temperature-alarm.svg
npm test
npm run typecheck
```

## Hardware choices and mechanical qualifications

**Button: Omron B3F-1000, explicitly formed-lead model.** The [manufacturer document, page 4](https://omronfs.omron.com/en_US/ecb/products/pdf/en-b3f.pdf) gives a 6×6 mm body and native 6.5×4.5 mm contact pitch. That is not an exact 2.54 mm breadboard grid. The type `pushbutton-b3f1000-formed` explicitly assumes insertion pitch 7.62×5.08 mm, with each lead displaced approximately 0.56 mm sideways and 0.29 mm longitudinally. This is a modeling assumption, not a manufacturer-approved fit or a verified physical build. The compiler warns, and the image states the qualification. Do not substitute an unformed switch and infer guaranteed fit.

The [KiCad project's Omron-referenced footprint](https://github.com/KiCad/kicad-footprints/blob/master/Button_Switch_THT.pretty/SW_PUSH_6mm.kicad_mod) independently encodes the two permanent pairs across the body. Functional labels A1/A2 denote one pair and B1/B2 the other; these are our labels, not numbers stamped on the package. The normally open contact between the pairs stays open in this static model. The footprint straddles the center gap.

**Potentiometer: Bourns 3296W-1-103LF.** This is a 10kΩ multiturn trimmer, not a large panel knob. The [Bourns datasheet](https://www.bourns.com/docs/product-datasheets/3296.pdf) specifies the 103 resistance code and terminal 2 as the wiper. The [KiCad 3296W footprint](https://github.com/KiCad/kicad-footprints/blob/master/Potentiometer_THT.pretty/Potentiometer_Bourns_3296W_Vertical.kicad_mod) confirms three inline pins at 2.54 mm and a 9.53×4.83 mm body. The model rotates that inline footprint along breadboard rows. Pin 1 goes to 5V, pin 3 to ground and pin 2 to A0, following the divider arrangement in [Arduino's AnalogReadSerial example](https://github.com/arduino/arduino-examples/blob/main/examples/01.Basics/AnalogReadSerial/AnalogReadSerial.ino). No pot terminal pair is unioned as an ideal conductor.

**Sensor: bare four-pin DHT22, not a three-pin module.** The [Adafruit connection guide](https://learn.adafruit.com/dht/connecting-to-a-dhtxx-sensor) gives 2.54 mm pin pitch, front-view pin order 1 VCC / 2 DATA / 3 unused / 4 GND and a 10kΩ DATA-to-VCC pull-up. Pin 3 is inserted, reserved and proven isolated. The guide shows D2 as data; that is the example's choice.

There is an unresolved enclosure-documentation discrepancy: the PDF linked as `DHT22.pdf` currently identifies itself as AM2303, while the [DHT22 product page](https://www.adafruit.com/product/385) lists a much larger 27×59×13.5 mm body than commonly pictured bare sensors. We do not silently treat the PDF's case drawing as a verified DHT22 drawing. Placement conservatively reserves a 27×13.5 mm top-view envelope around the upright pin row, plus margins. The drawing is a raised/cutaway illustration with exposed contacts, not a dimension-certified 3D assembly. Case orientation, actual part dimensions, jumper clearance under raised bodies and mechanical fit still need physical confirmation. Pin pitch and electrical pin order are the verified facts.

## Uno sockets

The official Uno Rev3e CAD already cited in [hardware sources](hardware-sources.md) was re-read for this extension. The existing transform scales CAD millimeters by seven; the mixed renderer translates the Uno downward by 80 SVG units without changing socket spacing or identity.

| Socket | CAD element/pad | CAD x,y (mm) | Existing SVG x,y |
| --- | --- | --- | --- |
| 5V | POWER/5 | 38.100, 2.540 | 336.700, 585.600 |
| A0 | AD/1 | 50.800, 2.540 | 425.600, 585.600 |
| D2 | IOL/3 | 58.420, 50.800 | 478.940, 247.780 |
| D4 | IOL/5 | 53.340, 50.800 | 443.380, 247.780 |
| D13 | IOH/6 | 28.956, 50.800 | 272.692, 247.780 |
| GND1 | IOH/7 | 26.416, 50.800 | 254.912, 247.780 |

D0/D1 serial pins are not used. `GND` remains an alias for the single specific GND1 socket between AREF and D13. No hidden interchange with other ground sockets occurs.

## Algorithm and bounded scope

The new mixed family requires one of each new part, one LED, one 220Ω resistor and two 10kΩ resistors on one Uno. Roles are found from actual nets. Distinct digital pins D2–D13 can be reassigned; IDs, resistor direction, equivalent button pair endpoints and declaration/connection ordering are not placement instructions. Other topologies fail explicitly.

The placement engine enumerates legal footprint candidates on the same 300-contact, 30-row board. It sorts by envelope area, then uses deterministic first-fit with body clearance, unique holes and compatible strip nets. No example IDs or fixed example hole map is embedded in the placer. A minimum-distance conductor-cluster joining rule adds jumpers, accounting for permanent button bridges. A finite corridor search derives wire paths, rejecting collinear overlaps and paths through other jumper endpoints, with a crossing penalty. It is a bounded heuristic, not a general layout optimizer; it may reject otherwise physically feasible circuits.

The independent physical reconstruction uses only strip metal, inserted leads, actual jumper endpoints and the button's permanent contact pairs. It never reuses input edges or expected net IDs. All 19 component pins—including NC and the two button legs omitted from input connections—are inventoried. Potentiometer resistance, resistor internals, LED internals and an unpressed switch are not ideal conductor unions.

## Results

- Eight static logical nets exactly match the reconstructed physical nets.
- Eight components plus one existing breadboard; 19 inserted component pins.
- Fourteen jumpers: six Uno-to-board and eight board-to-board.
- Forty-one distinct occupied holes; one wire per used Uno socket.
- Twenty-seven wire-pair crossing points, zero collinear wire overlaps and no crossing through another wire endpoint. Crossings are not junctions. This is a crowded preview, not a claim of clean arbitrary-size routing.
- No component envelope overlap in the conservative placement model.
- **109 tests pass** (82 previous + 27 mixed), TypeScript checking passes.
- Original 1-, 3- and 6-LED SVGs remain byte-identical; the historical six-branch pattern's 17 crossings and seven/ten-branch capacity limits remain unchanged.
- Tests cover NC misuse, missing/wrong pull-up, missing pull-down, wrong power/wiper wiring, fixed button pairs, wrong pin order, omitted physical leads, shorted rails, shared-ground corruption, occupied holes, overlap, socket identity, reassigned digital pins, equivalent pair endpoints, deterministic output and routing endpoints.

Final SVG and both native/desktop-width PNGs were inspected in Chromium. The guide identifies all parts, holes, button pairs, pot wiper and DHT NC. Browser evidence reports 300 holes, 19 component lead markers, 14 jumper groups, no parser errors and no external image/script assets. Small pin labels benefit from zoom; wire tracing remains harder than the simple examples. No beginner study or physical hardware test was performed.

A single supported Library upload attempt failed with a network error. GitHub publication of the completed artifacts was separately approved; remote delivery is reported in the PR. No firmware, merge or deployment is included.
