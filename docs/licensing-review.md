# Licensing decision pending

No repository-wide software license has been chosen. This review does not apply
one. `package.json` remains private and no package has been published.

## Recommendation for the maintainer

Choose **MIT for original application code** if straightforward permissive reuse
is the goal. MIT requires preserving copyright and license notices; it does not
require downstream source disclosure. If an explicit patent grant is a priority,
consider Apache-2.0 instead. The maintainer must select the license and copyright
holder before a LICENSE file or package license field is added.

Keep hardware-derived geometry and illustrations under their separately recorded
terms rather than claiming all repository content is covered by that code license.
Sources: [MIT summary and text](https://choosealicense.com/licenses/mit/),
[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0),
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Inspected provenance

- Original parser, placement, verifier, routing, UI and renderer source are held
  in this repository; existing provenance describes them as original. A repository
  inspection is not proof of chain of title. Confirm authorship before release.
- Uno socket coordinates and board outline derive from Arduino UNO R3 A000066 /
  UNO-TH Rev3e CAD. [hardware-sources.md](hardware-sources.md) records the archive,
  checksum, transform, attribution and **CC BY-SA 4.0** terms. Generated SVGs carry
  attribution. This work preserves those notices and does not relicense them.
- The mixed-parts report cites Omron, Bourns and Adafruit documentation and uses
  KiCad footprints as corroborating sources. No downloaded footprint/artwork file
  is vendored, but a release audit should distinguish factual dimensions from any
  copied expressive geometry and retain any applicable upstream terms. Physical
  uncertainty remains separately documented.
- PNGs in `output/` are render screenshots; new screenshots in `docs/images/`
  also contain the derived diagrams. Do not label them as wholly MIT-licensed.
- There are no runtime npm dependencies or bundled third-party scripts/fonts in
  the generated Playground. Development tools and browser binaries have their own
  licenses and are not relicensed by Bread.

## Dependency inventory

[dependency-licenses.json](dependency-licenses.json) records all **43** locked npm
package entries, their exact versions and declared licenses at this milestone.
Direct development dependencies: TypeScript 5.9.3 (Apache-2.0), Node types 24.10.1
(MIT), jsdom 30.1.1 (MIT), Playwright test 1.63.0 (Apache-2.0). Transitive declared
licenses include MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC,
BlueOak-1.0.0 and CC0-1.0. The inventory is metadata, not a complete legal audit.
Browser binaries and GitHub Actions are outside this npm inventory.

`npm audit` on 2026-10-02 reported zero known vulnerabilities for the lockfile.
This is a time-specific registry result, not a guarantee of security or licensing.

## Release gate

Before calling Bread an OSS release, record the user's software license decision,
confirm authorship, define file-level boundaries for derived geometry/artwork,
review the upstream notices and add the chosen license/attribution files. Package
publication, repository visibility and deployment are separate decisions. None is
performed by this foundation change.
