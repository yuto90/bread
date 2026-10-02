// Native B3F-1000: 6.5 x 4.5 mm. This variant explicitly assumes formed
// lead insertion at 7.62 x 5.08 mm. Fit is conditional, not factory pitch.
export const pushbutton = {type:'pushbutton-b3f1000-formed',pins:['A1','A2','B1','B2'],fixedPairs:[['A1','A2'],['B1','B2']],rowSpan:2} as const;
