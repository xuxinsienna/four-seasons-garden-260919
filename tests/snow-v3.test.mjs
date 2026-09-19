import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roofSnowGeometry,snowEdge} from '../app/snow-v3.ts';
test('snow mantle stays above tiles, has thick ridge and recessed broken eaves',()=>{
 const g=roofSnowGeometry(),p=g.attributes.position,n=g.attributes.normal;
 let ridge=0,minEdge=4,maxEdge=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.abs(z+1.4);
  assert.ok(Number.isFinite(y)&&Number.isFinite(n.getY(i)));
  assert.ok(y-(5.56-u*1.5/2.9)>.024);
  if(u<.001)ridge=Math.max(ridge,y-5.60);
 }
 for(let i=0;i<100;i++)for(const s of [-1,1]){const edge=snowEdge(-3.52+i*7.04/99,s);minEdge=Math.min(minEdge,edge);maxEdge=Math.max(maxEdge,edge);}
 assert.ok(ridge>.3);assert.ok(maxEdge-minEdge>.6);assert.ok(maxEdge<2.98);
 assert.ok(n.getY(24*97+48)>.9);g.dispose();
});
