import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const source=readFileSync(new URL('../examples/blink.bread',import.meta.url),'utf8');
const cli=new URL('../src/cli.ts',import.meta.url).pathname;
const run=(...args:string[])=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
test('CLI check/render, process determinism, failure status and atomic output',()=>{
  const dir=mkdtempSync(join(tmpdir(),'bread-test-'));
  try {
    const input=join(dir,'blink.bread'), output=join(dir,'nested/blink.svg'), output2=join(dir,'two.svg');
    writeFileSync(input,source);
    assert.equal(run('check',input).status,0);
    assert.equal(run('render',input,'-o',output).status,0);
    assert.equal(run('render',input,'-o',output2).status,0);
    const svg=readFileSync(output,'utf8');
    assert.equal(svg,readFileSync(output2,'utf8'));
    writeFileSync(input,source.replace('D13','D99'));
    const bad=run('render',input,'-o',output);
    assert.equal(bad.status,1); assert.match(bad.stderr,/E_UNKNOWN_PIN/);
    assert.equal(readFileSync(output,'utf8'),svg);
    assert.equal(run('render',input,'-o',join(dir,'bad.svg')).status,1);
    assert.equal(existsSync(join(dir,'bad.svg')),false);
    assert.equal(run('check',input).status,1);
    assert.match(run('check',join(dir,'absent')).stderr,/E_IO/);
    assert.match(run('render',input,'-o',input).stderr,/E_USAGE/);
    assert.match(run('render',input).stderr,/E_USAGE/);
    assert.match(run('check',input,'--ignored').stderr,/E_USAGE/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
