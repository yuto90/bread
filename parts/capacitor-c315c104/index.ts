// SPDX-License-Identifier: MIT
// KEMET C315C104K5R5TA: non-polar 100nF / 50V X7R, straight 2.54mm leads.
// C1050_GOLDMAX_X7R, pages 1, 3, 6: C315 body max L=3.81, T=2.54mm.
export const capacitor = {
  type: 'capacitor-c315c104', pins: ['1', '2'], value: '100nF', rowSpan: 1,
  model: 'KEMET C315C104K5R5TA', bodyLengthMm: 3.81, bodyThicknessMm: 2.54,
} as const;
