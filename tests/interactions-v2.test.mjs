import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TapGesture} from '../app/interactions-v3.ts';
const event=(id=1,x=100,y=100,time=0,type='mouse',button=0)=>({pointerId:id,clientX:x,clientY:y,timeStamp:time,pointerType:type,button});
test('mouse and touch taps within slop activate once',()=>{
  for(const type of ['mouse','touch']){const g=new TapGesture();g.down(event(1,100,100,0,type));assert.equal(g.up(event(1,103,102,150,type)),true);assert.equal(g.up(event(1,103,102,151,type)),false);}
});
test('orbit drag cannot turn into a click even after returning to its origin',()=>{
  const g=new TapGesture();g.down(event());g.move(event(1,130,100,20));g.move(event(1,100,100,80));assert.equal(g.up(event(1,100,100,100)),false);
});
test('pinch suppresses both fingers and recovers on the next gesture',()=>{
  const g=new TapGesture();g.down(event(1));g.down(event(2));assert.equal(g.up(event(2,100,100,50)),false);assert.equal(g.up(event(1,100,100,60)),false);g.down(event(3,100,100,80));assert.equal(g.up(event(3,100,100,140)),true);
});
test('right button, long hold, pointer cancel and lost capture are not clicks',()=>{
  const g=new TapGesture();g.down(event(1,100,100,0,'mouse',2));assert.equal(g.up(event(1,100,100,50,'mouse',2)),false);
  g.down(event());assert.equal(g.up(event(1,100,100,900)),false);
  g.down(event());g.cancel(1);assert.equal(g.up(event(1,100,100,100)),false);
  g.down(event());g.clear();assert.equal(g.active,false);assert.equal(g.up(event(1,100,100,100)),false);
});
