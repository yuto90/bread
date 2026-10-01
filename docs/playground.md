# Bread Playground

A local-only, static browser UI over Bread's existing parser, semantic resolver,
placement, netlist verification, routing and SVG renderer. The core is unchanged.

## Start

Use **Node.js 24 or newer**:

```sh
npm run playground
```

Open **http://127.0.0.1:4173** in your own browser. The command builds the static
files and serves them on loopback only. No package install is needed to start it.
Change the local port with `PORT=4174 npm run playground` if needed. Stop with
Ctrl+C. Run the command again after editing source files; there is no hot reload.

For a static build only:

```sh
npm run build:playground
```

The output is `dist/playground/`. Serve that directory over HTTP with a static
server. Opening `index.html` via `file://` will not work reliably with ES modules,
fetch and module workers. The Playground has not been deployed as a live site.
Source publication is tracked in [Draft PR #1](https://github.com/yuto90/bread-poc/pull/1).

## Included

- Live connection-only `.bread` editor with line numbers, caret position and a
  180 ms debounce; native Tab leaves the editor for keyboard navigation
- One-LED, three-LED, six-LED and mixed-parts samples, copied from `examples/`
  during build rather than maintained as a second set of strings
- Compilation in a module worker; stale worker results and image-load callbacks
  cannot replace a newer edit
- Stable error codes, messages and optional line numbers, with a jump-to-line
  control; line numbers are never guessed for topology-level errors
- Separate warnings for reversed LED polarity and the qualified button footprint
- Last-valid diagram retained and explicitly marked during errors or updates;
  downloads disabled until the current source compiles and its SVG image decodes
- Fit and bounded 5–200% zoom, with scrollable inspection and automatic refit
  after viewport size changes
- Exact renderer SVG download, with a safe title-derived filename
- Responsive side-by-side desktop panels and stacked phone layout

Edits are held only in the tab's memory and are discarded on reload or sample
replacement. No source code is uploaded or saved to storage. There is no
application backend, account, database, AI API or simulator. The development
server serves files only; all compilation happens in the browser.

## Boundaries

This extends published commit `c8c7045c6625c3af1d92c4854e14c5d10d62a9b0`.
The separate unpushed layout improvement
`efbd29b9299545a4f44c6d24091952bed94eab68` was not recoverable from the remote and
is **not included**. Existing layout limitations, including mixed-part wire
crossings, are preserved. No existing CLI command, part definition, placement,
routing or SVG-rendering implementation has changed.

Supported topology is deliberately bounded: one branch or three to six contiguous
D13-down LED/resistor branches, plus the shipped mixed-parts wiring study. Two
branches are not supported. Seven or more branches fail at placement capacity.
A visually crossing wire is not an electrical junction. The mixed-parts example
is a static wiring study, not a working temperature alarm; component fit and
hardware behavior remain unverified.

The Playground limits input to 32,768 characters. Titles containing XML-invalid
lone surrogates or U+FFFE/U+FFFF are rejected at the browser adapter boundary with
`E_SVG_TEXT`; the CLI core is not changed. SVG previews use Blob-backed `img`
elements, not user HTML inserted into the page. CSP limits scripts, workers and
connections to the serving origin.

## Verification

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build:playground
```

Verification performed on 2026-10-01:

- Existing 109 core/CLI regression tests remain passing
- 16 added checks (125 total) cover all samples, byte-identical renderer output,
  capacity errors, syntax and line diagnostics, title escaping, XML-invalid
  titles, source limits, filename/line utilities, and built browser-module parity
- DOM integration tests cover repeated sample switching, valid→invalid→valid
  recovery, line selection, warnings, out-of-order worker results and image loads,
  image failure, worker failure, download Blob bytes, zoom and resize calculations
- TypeScript strict typecheck and static build passed
- Static review checked loopback-only serving, diagnostics inserted as text,
  Blob image isolation and the absence of new network/runtime dependencies

**Visual browser QA remains blocked.** The available cloud browser refused
`http://127.0.0.1:4173` with `net::ERR_BLOCKED_BY_CLIENT`; an auxiliary browser
CLI also could not start. No access-control workaround was attempted. There is
no verified UI screenshot. jsdom is a unit-level DOM environment, not a visual
browser: real responsive rendering, CSP behavior, actual module-worker execution,
SVG image decoding and browser download interaction still need a real-browser
pass. DOM tests mock those boundaries and must not be read as proof of them.

Suggested final browser pass, once an allowed local browser is available:

1. Try all four samples on desktop and at 390 px phone width; inspect code,
   diagram, labels, warnings and page overflow
2. Enter an unknown pin, jump to its line, then fix it; confirm stale-preview
   labeling and disabled download during errors/updates
3. Switch samples rapidly and type while a mixed preview is generating; the
   latest source must win
4. Zoom in/out, scroll the diagram, fit, then resize the browser
5. Download each current SVG and open it; compare bytes to the CLI render
6. Check console errors, keyboard focus/Tab order and screen-reader announcements

The validation above was completed before source publication. The user later
approved adding this Playground to Draft PR #1. No merge or deployment is included.
