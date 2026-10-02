# Bilingual Playground and static documentation

This work is stacked on the unmerged discrete-parts branch at
`9693e4dc087970130e39cfe19a1aea5ee5509c7e`. It does not merge that PR or deploy a site.
The generated docs describe this build, not the state of an independently hosted
Playground.

## Product behavior

- English / 日本語 picker, native keyboard control, localized accessible labels,
  sample descriptions, caret/status/warnings and diagnostic guidance.
- Valid saved language wins over supported browser languages, with English
  fallback; explicit `?lang=en|ja` links override initial display. Only manual
  selector changes write `bread.language`. Storage denial is tolerated.
- Compiler error codes, source, filenames and SVG exports remain unchanged.
  Japanese guidance includes original English compiler detail, including user
  identifiers. All dynamic text is inserted with `textContent`, not HTML.
- Language changes preserve pending/error state, current source, previous image
  and disabled stale downloads. They do not compile or render another diagram.
- Six known `?sample=` IDs can be opened from docs; unknown IDs fall back to blink.

## Documentation structure

Nine fully paired English/Japanese guides: overview, quickstart, DSL reference,
parts, examples, errors/warnings, limits, licensing and contributing. Static HTML
lives under `/docs/` and `/docs/ja/`; the root remains the Playground. Every page
has navigation, section anchors, same-page language switching and previous/next
links. Same-origin search covers the selected language and exact DSL identifiers;
no hosted search provider or backend is required.

The example-led organization was informed by the official
[Mermaid repository](https://github.com/mermaid-js/mermaid): a direct editor entry,
getting-started material, syntax references, and source alongside diagram examples.
No Mermaid prose, code, assets, dependencies, build-system assumptions or branding
were copied. Bread does not implement Mermaid syntax or a Markdown plugin.

`scripts/build-docs.ts` reads the exact six `examples/*.bread` inputs and uses the
actual renderer to produce downloadable SVG previews. It preserves embedded
Arduino attribution and adds visible CC-BY-SA captions. Docs and browser modules
ship in the same deterministic build with the existing license files. No new npm
dependencies, GitHub secrets, hosting configuration or external services are added.

## Verification

Run `npm run verify` and `npm run test:browser`. Tests cover both guide structures,
all local links/fragments/assets, exact source/SVG parity, attribution, translated
copy completeness, locale selection, storage denial, stable diagnostic details,
safe interpolation and pending-result behavior. Browser coverage includes all six
Japanese sample exports, preference reload, error-state switching/recovery,
markup-like titles, mobile overflow, localized search, lazy preview loading,
source download and docs-to-Playground links.

The initial browser check correctly waited for rendered images but tried to
inspect off-screen lazy images before scrolling. The check now scrolls each image
into view before testing decode, preserving lazy loading in the product.

Local verification passes **202 tests**, strict typecheck, two byte-identical
**77-file** builds, and **12 desktop/phone Chromium scenarios**. Hosted CI results
are recorded in the draft PR. Screenshots: [Playground desktop](images/playground-ja-desktop.png),
[Playground phone](images/playground-ja-phone.png), [docs desktop](images/docs-ja-desktop.png),
[docs phone](images/docs-ja-phone.png). These contain attributed illustrations
under the existing [license scope](../LICENSES/README.md). Chromium at desktop/phone viewport sizes is the verified browser;
this is not a claim about Safari/Firefox, actual phones or screen readers.
Japanese diagnostic guidance is not a complete line-by-line translation of all
compiler detail. SVG illustration labels remain in the renderer's existing English.
No new circuit capabilities, physical assembly validation or deployment is included.
