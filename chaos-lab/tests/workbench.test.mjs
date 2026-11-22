import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOARD,boardPosition,findSpace} from '../src/workbench.js';
test('lesson boards have over four times the original area',()=>{assert.ok(BOARD.width*BOARD.depth>14*10*4);assert.deepEqual(boardPosition(80,-80),{x:12.5,z:-9.5});});
test('free build preserves distant placement with half-unit snapping',()=>{assert.deepEqual(boardPosition(1200.2,-2500.4,true),{x:1200,z:-2500.5});});
test('new parts can be placed near a distant camera position',()=>{const p=findSpace([{x:1000,z:-300}],{x:1000,z:-300},true);assert.ok(Math.abs(p.x-1000)<4&&Math.abs(p.z+300)<4);assert.ok(Math.abs(p.x-1000)>=2.4||Math.abs(p.z+300)>=1.7);});
test('larger lesson boards fit more than the former twelve parts',()=>{const parts=[];for(let i=0;i<30;i++){const p=findSpace(parts);assert.ok(p);parts.push(p);}assert.equal(parts.length,30);});
