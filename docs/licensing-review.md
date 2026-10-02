# Licensing: MIT software, CC BY-SA 4.0 illustrations

The maintainer approved this split on 2026-10-02. Original software and repository
documentation use [MIT](../LICENSE); the precise exceptions and attribution are
in [LICENSES/README.md](../LICENSES/README.md). Package metadata points to that
scope document rather than claiming blanket MIT. The package remains private.

## Verified provenance and boundaries

Git history attributes original changes to sagara yuto / yuto90; the MIT notice
uses that existing author spelling. This does not assign rights to third-party
material. Arduino-derived board coordinates and outline have been isolated in
`parts/arduino-uno-r3/geometry.ts`, marked CC-BY-SA-4.0. Original transforms,
rendering algorithms and other software remain MIT. The software uses the
separately licensed data; it does not convert it to MIT.

Arduino UNO R3 A000066 / UNO-TH Rev3e is the upstream work. The pinned official
CAD archive was downloaded again, its SHA-256 matched, and its `License.txt`
explicitly confirmed CC BY-SA 4.0. The official pinout independently states the
same version. [Hardware sources](hardware-sources.md) and the scope document
supply source links, checksum, transformations and attribution. No upstream CAD
archive, EAGLE library collection, logo or manufacturer illustration is vendored.

Both renderer families embed self-contained source/license URLs, creator/work,
modification notice and license metadata in exported SVG. Licensing commit bc981d9 regenerated all six stored SVGs without changing their
graphics outside metadata. The later [mixed-routing change](mixed-routing.md)
intentionally updates the mixed diagram while preserving its attribution. Output PNGs
and Playground screenshots contain these illustrations and carry the same asset
terms through the repository's attribution documents.

## What this means for users

Commercial use is allowed. Share a generated illustration with its attribution,
source/license link and modification notices. When adapting and redistributing
it, follow CC-BY-SA-4.0's ShareAlike terms. If conversion to PNG loses metadata,
include the credit and license link in a caption or accompanying notice.

These are terms for the derived illustration; they do not by themselves require
publishing independent `.bread` input, firmware, an entire article or application.
Do not remove Arduino-derived material's notices or label the whole diagram MIT.
See the [CC BY-SA 4.0 terms](https://creativecommons.org/licenses/by-sa/4.0/).

## Other references and dependencies

Omron, Bourns and Adafruit provide the component facts cited in the mixed report.
KiCad footprints corroborated dimensions/pairs; no footprint file was copied.
Its [CC BY-SA 4.0 library license with design-output exception](https://www.kicad.org/libraries/license/)
must be reviewed if a future change redistributes library material. This approval
does not pre-authorize relicensing any newly introduced third-party assets.

[dependency-licenses.json](dependency-licenses.json) records 43 locked npm entries
and declared licenses: MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC,
BlueOak-1.0.0 and CC0-1.0. Direct development tools are TypeScript 5.9.3, Node types
24.10.1, jsdom 30.1.1 and Playwright test 1.63.0. There are no runtime npm
dependencies. Browser binaries and GitHub Actions retain upstream terms and are
outside that npm inventory. `npm audit` reported zero known vulnerabilities on
2026-10-02; this does not establish legal provenance or guarantee security.
