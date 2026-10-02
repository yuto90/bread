# Bounded mixed-family routing

This milestone reduces the shipped mixed-parts circuit from **27 crossings to 8**
without changing component holes, jumper endpoints, net count or the independently
verified physical netlist. It is a finite heuristic for the existing family,
not an arbitrary-circuit router or a physical clearance certification.

## Implementation and limits

The router enumerates orthogonal paths through terminal escape points and finite
horizontal/vertical corridors. It tries eight deterministic routing orders and
two rip-up/reroute passes per order. Cost strongly prefers fewer crossings, then
fewer bends and shorter paths. There is no randomness, input-specific hole map,
wall-clock cutoff or unbounded search. At most 24 wires are accepted by this
router; the supported DSL family still has 14. Excessive wire counts, unavailable
terminal corridors or exhaustion of non-overlapping candidates produce
`E_ROUTING_FAILED`; no unchecked fallback SVG is emitted.

A separate segment inspector checks exact endpoints, orthogonal finite segments,
canvas bounds, self intersections, foreign endpoints, body/lead keepouts,
collinear overlap and parallel centerlines less than six SVG units apart.
It recomputes crossings rather than trusting planner scores. The renderer still
performs independent physical-net verification before calling the router.

Bodies reserve their visible drawing bounds plus six SVG units. Component lead
markers reserve a six-unit square about each insertion center. The Uno is a
board/connector obstacle, with top sockets escaping upward and bottom sockets
downward. Wires stay out of these regions except for the explicit terminal case
below. **This is a drawing-space model**, not a model of real wire insulation,
height, bend radius, component tolerances or electrical behavior. Label/text
avoidance and a complete stroke-to-stroke distance model are future work.

### Raised-body terminal exception

The inherited placement puts some jumper holes under the raised/cutaway DHT22
illustration. Such an endpoint may leave or enter its containing body on exactly
one straight first/last segment. Internal turns, through-routes and re-entry are
rejected. Component-lead keepouts never permit this exception. The canonical
result has **13 terminal/body escapes: six Uno socket exits and seven sensor-body
exits**. This is explicitly not a claim that jumpers fit beneath the physical
sensor. The SVG carries a notice and the insertion guide remains authoritative
for modeled hole identity. Mechanical fit must be checked separately.

## Benchmark and regression evidence

The fixed corpus contains the canonical example and twelve three-role digital
pin assignments, each repeated with renamed parts and reordered declarations /
connections: **25 cases**, all still within the supported mixed topology.

| Metric | Foundation baseline | This change |
| --- | ---: | ---: |
| Canonical crossings | 27 | 8 |
| Corpus crossing range | 26–32 | 8–11 |
| Canonical jumper count / static nets | 14 / 8 | 14 / 8 |
| Canonical occupied holes | 41 | 41 |
| Six-LED crossings | 17 | 17 |
| New routing-verifier violations | Previously unchecked constraints | 0 across 25 cases |

[Baseline fixture](../tests/fixtures/mixed-routing-baseline.json) records source
commit `bc981d981e3e4bb0c348da11174f7f518bf09905`, measurements and placement
hashes. Each corpus regression verifies the placement hash, unchanged physical
nets, repeated-call determinism, lower crossing count and independent route
validation. Existing tests also verify statement-order and button-alias output
invariance. A regression run caught declaration-order sensitivity in obstacle
ordering; canonical geometric sorting fixed it.

[Current measurements](mixed-routing-evidence.json) are reproducible with:

```sh
npm run benchmark:routing
node scripts/measure-routing.ts > docs/mixed-routing-evidence.json
npm run verify
npm run test:browser
```

Timing uses one warmup and five measured routing calls per case. On the recorded
Node 24.19.0 environment the canonical median was about 44 ms; timings are
observational, not a cross-machine CI threshold or worst-case guarantee.

Full local checks: **162 tests**, strict typecheck, two identical **38-file**
static builds, and **four real Chromium scenarios** at desktop/phone widths.
Browser tests independently measure actual SVG body and lead-marker bounds with
`getBBox()` and compare them with the routing keepouts. Downloaded SVG bytes still
match the core renderer. Corruption tests cover obstacles, incorrect/diagonal /
reversing paths, illegal terminal escape, overlaps, foreign endpoints, parallel
spacing and explicit search failure.

Updated artifacts: [SVG](../output/temperature-alarm.svg),
[native PNG](../output/temperature-alarm-preview.png),
[desktop-width PNG](../output/temperature-alarm-fit-preview.png),
[desktop Playground](images/playground-desktop.png),
[phone Playground](images/playground-phone.png). These contain CC-BY-SA-4.0
illustrations; see [license scope](../LICENSES/README.md).

## Still outside scope

No capacity expansion: two LED branches remain unsupported and seven/ten fail
placement. One-, three- and six-LED drawing fixtures remain unchanged. The older
unpublished layout improvement is not used. This is new work on the current
foundation. Firmware, simulation, AI services, deployment and package publication
are not included. Real assembly, label readability and beginner comprehension
remain unverified; fewer crossings alone do not establish them.
