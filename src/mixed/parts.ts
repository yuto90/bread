import {pushbutton} from '../../parts/pushbutton-b3f1000-formed/index.ts';
import {potentiometer} from '../../parts/potentiometer-3296w/index.ts';
import {dht22} from '../../parts/dht22-bare/index.ts';
import {diode} from '../../parts/diode-1n4148/index.ts';
import {capacitor} from '../../parts/capacitor-c315c104/index.ts';
import type {Circuit,Part} from '../model.ts';
export const mixedPins:Record<string,readonly string[]>={
 [pushbutton.type]:pushbutton.pins,[potentiometer.type]:potentiometer.pins,[dht22.type]:dht22.pins,
 [diode.type]:diode.pins,[capacitor.type]:capacitor.pins,
 resistor:['1','2'],'led-5mm-red':['A','K']
};
export const isDiscrete=(c:Circuit)=>c.parts.some(p=>p.type===diode.type||p.type===capacitor.type);
export const isMixed=(c:Circuit)=>isDiscrete(c)||c.parts.some(p=>[pushbutton.type,potentiometer.type,dht22.type].includes(p.type as any));
export const fixedPairs=(p:Part):readonly (readonly string[])[]=>p.type===pushbutton.type?pushbutton.fixedPairs:[];
