// SPDX-License-Identifier: CC-BY-SA-4.0
// Arduino UNO R3 A000066 / UNO-TH Rev3e, adapted by Bread.
// Source: https://github.com/arduino/docs-content/blob/bdd379bc55bd1ec9449c87235640cedde017f751/content/hardware/uno/boards/uno-rev3/downloads/A000066-cad-files.zip
// License: https://creativecommons.org/licenses/by-sa/4.0/
// Changes: selected socket coordinates and simplified outline; omitted corner arcs.
// Application transforms and rendering logic are separately MIT-licensed.
export const unoGeometry = {
  width: 68.58, height: 53.34, pitch: 2.54,
  upperStart: 18.796, upperAfterGap: 45.72, upperY: 50.8,
  lowerStart: 27.94, lowerAfterGap: 50.8, lowerY: 2.54,
  outline: [[0,53.34],[64.516,53.34],[66.04,51.816],[66.04,40.386],[68.58,37.846],[68.58,5.08],[66.04,2.54],[66.04,0],[0,0]],
} as const;
