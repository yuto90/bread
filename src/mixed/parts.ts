import {pushbutton} from '../../parts/pushbutton-b3f1000-formed/index.ts';
import {potentiometer} from '../../parts/potentiometer-3296w/index.ts';
import {dht22} from '../../parts/dht22-bare/index.ts';
import type {Circuit,Part} from '../model.ts';
export const mixedPins:Record<string,readonly string[]>={
 [pushbutton.type]:pushbutton.pins,[potentiometer.type]:potentiometer.pins,[dht22.type]:dht22.pins,
 resistor:['1','2'],'led-5mm-red':['A','K']
};
export const isMixed=(c:Circuit)=>c.parts.some(p=>[pushbutton.type,potentiometer.type,dht22.type].includes(p.type as any));
export const fixedPairs=(p:Part):readonly (readonly string[])[]=>p.type===pushbutton.type?pushbutton.fixedPairs:[];
