// SPDX-License-Identifier: MIT
// Licensing facts for exported illustrations, not a license for user circuit input.
export const illustrationAttribution = {
  license: 'CC-BY-SA-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  creator: 'Arduino',
  sourceTitle: 'UNO R3 A000066 / UNO-TH Rev3e',
  sourceUrl: 'https://github.com/arduino/docs-content/blob/bdd379bc55bd1ec9449c87235640cedde017f751/content/hardware/uno/boards/uno-rev3/downloads/A000066-cad-files.zip',
  sourceSha256: '532b306cb153846eafc0ca9fe991d7a4dfa0c52dcefafa2efeaebf4b845ec820',
  adapter: 'Bread contributors',
  modifications: 'Simplified board outline; selected and scaled socket geometry; USB-left orientation; original component illustrations, connection overlays and labels.',
  notice: 'No Arduino endorsement. Illustration provided without warranty. This notice does not license independently supplied circuit text or firmware.',
} as const;

// Constants only: both SVG families carry the same self-contained attribution.
export function illustrationMetadata(): string {
  const a = illustrationAttribution;
  return `<metadata id="bread-illustration-license"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#"><cc:Work rdf:about=""><dc:title>Bread wiring illustration</dc:title><dc:creator>${a.creator}: ${a.sourceTitle}; adapted by ${a.adapter}</dc:creator><dc:source rdf:resource="${a.sourceUrl}"/><cc:license rdf:resource="${a.licenseUrl}"/><dc:description>${a.modifications} ${a.notice}</dc:description></cc:Work></rdf:RDF></metadata>`;
}
