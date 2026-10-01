# Existing approaches

Reviewed primary documentation on 2026-10-01. This is a documentation comparison,
not a timed usability benchmark or proof that no similar product exists.

| Approach | Input/layout contract | Output and relevance |
| --- | --- | --- |
| [Wokwi diagram.json](https://docs.wokwi.com/diagram-format) | Parts have IDs/types; optional `left`, `top`, and `rotate`. Connections specify endpoints, color and optional wire placement instructions. The editor supports dragging parts. | A simulation diagram can omit these optional fields, so it would be inaccurate to say coordinates are always required. The documented format does not promise connection-only automatic breadboard hole assignment plus post-placement net equivalence. Bread targets that narrower workflow, not Wokwi's simulation capabilities. |
| [netlistsvg](https://github.com/nturley/netlistsvg) | JSON netlist feeds ELK-based automatic layout. | Automatic SVG schematic layout already exists. Bread's claimed distinction is physical Uno sockets and breadboard strips with verified hole assignment, not the invention of connection-only graph rendering. |
| [Schemdraw](https://schemdraw.readthedocs.io/en/latest/usage/placement.html) | Python drawing DSL with a current position/direction, automatic sequential placement, anchors and explicit routing/placement helpers. | Coordinates are not necessary for every schematic. The documented placement abstraction is schematic geometry rather than a breadboard connectivity/occupancy model. |

For Bread's supported family, changing `uno.D13` to `uno.D12` needs no separate
layout change and moves the wire to the correct socket. The resistor/LED holes
can remain unchanged because the electrical chain is unchanged. Reversing LED
A/K changes actual terminal assignment and polarity illustration, not just text.

The PoC supports the proposed workflow distinction for one circuit. It does not
establish superior learning outcomes, better AI generation accuracy, broad
competitive novelty, or scalable placement for larger circuits. Before expanding,
compare completion time and error rates for the same beginner task in Bread and
Wokwi; include both tools' normal default/automatic behaviors.
