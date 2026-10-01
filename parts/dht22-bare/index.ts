// Bare four-pin DHT22, 2.54mm pitch. Front/grille view: 1 VCC, 2 DATA,
// 3 NC, 4 GND. NC is physically inserted but must remain isolated.
export const dht22 = {type:'dht22-bare',pins:['1','2','3','4'],nc:'3',rowSpan:3} as const;
