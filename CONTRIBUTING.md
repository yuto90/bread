# Developing Bread

Original software is MIT-licensed; derived geometry and illustrations use CC BY-SA
4.0. Follow [the file-level scope](LICENSES/README.md). Contributions must identify
third-party source/assets and their provenance; do not assume the root MIT license
covers them.

Use Node 24.19.0 and the committed npm lockfile. Install development dependencies
with `npm ci --ignore-scripts`, then run `npm run verify`. If a sandbox's default
npm cache is unwritable, use `npm ci --ignore-scripts --cache /tmp/bread-npm-cache`.
For browser checks, install Chromium with `npx --no-install playwright install
chromium` and run `npm run test:browser`. Linux may need Playwright's documented
`--with-deps` installation step. An existing Chromium can be selected with
`BREAD_CHROMIUM_PATH=/path/to/chromium npm run test:browser`; record its version
because it differs from the pinned Playwright browser. Tests start their own
loopback server on port 4174 and fail if that port is already occupied.

Keep changes bounded and open a draft PR with the problem, changed behavior,
validation results and support limits. Extend regression coverage for changed
behavior. Preserve deterministic output or explain intentional fixture changes.
Model new parts from primary hardware documentation and document geometry,
conductor facts, provenance and mechanical uncertainty. A new part needs logical
and independently reconstructed physical tests, including incorrect placement.
Never infer physical correctness from the expected logical nets.

CI uses read-only repository permissions and SHA-pinned actions. It installs the
lockfile without lifecycle scripts, runs type/core/DOM/build checks and real
Chromium tests, and uploads browser evidence for seven days. It neither deploys
nor publishes. Repository branch protection is a separate maintainer setting;
adding CI alone does not require checks or reviews. Further PR merges need the
maintainer's approval.

Report bugs with a minimal `.bread` file, expected behavior, actual error/output,
Node/browser versions and reproduction steps. Remove credentials and unrelated
private information. Do not post confidential inputs in public issues.

For UI copy, update `playground/i18n.ts` and `playground/i18n-static.ts` together
with meaningful locale tests. Insert diagnostic details with `textContent`.
Keep DSL identifiers, error codes and renderer bytes independent of UI language.

Documentation content is paired in `docs-site/content.ts`. Keep the English and
Japanese slug/section structures aligned. The build reads exact sample sources
and generates attributed SVGs through the core renderer. `tests/docs.test.mjs`
checks local links, fragments, preview parity and the search index. Browser tests
exercise search, language navigation and links back to the actual samples.
