// SPDX-License-Identifier: MIT
// Vishay 1N4148, DO-35: black band is K. Numerical facts from document 81857.
// Axial leads are formed to 10.16mm insertion span, not a native lead pitch.
export const diode = {
  type: 'diode-1n4148', pins: ['A', 'K'], rowSpan: 4,
  model: 'Vishay 1N4148', bodyLengthMm: 3.4, bodyDiameterMm: 1.75,
} as const;
