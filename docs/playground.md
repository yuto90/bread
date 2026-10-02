# Bread Playground

A local-only, static browser UI over Bread's existing parser, semantic resolver,
placement, netlist verification, routing and SVG renderer. The UI shares the CLI's checked core.

## Start

Use the tested **Node.js 24.19.0**:

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
The baseline was merged in [PR #1](https://github.com/yuto90/bread/pull/1).

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
is **not included**. The later [bounded mixed-routing change](mixed-routing.md) reduces crossings while
retaining physical placement. Capacity and mechanical limits still apply.

Supported topology is deliberately bounded: one branch or three to six contiguous
D13-down LED/resistor branches, plus the shipped mixed-parts wiring study. Two
branches are not supported. Seven or more branches fail at placement capacity.
A visually crossing wire is not an electrical junction. The mixed-parts example
is a static wiring study, not a working temperature alarm; component fit and
hardware behavior remain unverified.

The Playground limits input to 32,768 characters. Titles containing XML-invalid
lone surrogates or U+FFFE/U+FFFF are rejected by the shared parser with
`E_SVG_TEXT`, including CLI input. SVG previews use Blob-backed `img`
elements, not user HTML inserted into the page. CSP limits scripts, workers and
connections to the serving origin.

## Verification

```sh
npm ci --ignore-scripts
npm run verify
npx --no-install playwright install chromium
npm run test:browser
```

The [production foundation record](production-foundation.md) supersedes the
2026-10-01 browser-access limitation. Actual local Chromium now exercises both
desktop and phone-size viewports with real module Workers, CSP, Blob image
decoding and SVG downloads. All four samples download byte-identically to the
core renderer. Errors, stale previews, capacity limits, warnings, recovery,
zoom/Fit and keyboard Tab exit are covered. Screenshots:
[desktop](images/playground-desktop.png), [phone](images/playground-phone.png).

Core/CLI/DOM regression tests remain in `npm test`; mocked race and failure cases
complement the browser scenarios. Browser tests caught and now guard a desktop
preview sizing defect. No Firefox, Safari, physical mobile-device, screen-reader
or real hardware qualification is claimed. Small diagram labels need zoom.

GitHub Actions runs these checks on PRs and main and retains browser evidence for
seven days. Consult the PR's actual checks for hosted results. The application
has not been deployed.
