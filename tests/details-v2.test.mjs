import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as T from 'three';
registerHooks({resolve(s,c,next){return next(s.startsWith('.')&&!/\.[a-z]+$/i.test(s)?s+'.ts':s,c);}});
const {createDetails}=await import('../app/details-v3.ts');
const {COURT,riverCenter,meadowGeometry,gentleGust}=await import('../app/layout-v3.ts');
test('finite meadow and front approach leave room before the river',()=>{
 const g=meadowGeometry(()=>0),p=g.attributes.position;
 for(let i=0;i<p.count;i++){assert.ok(Math.hypot(p.getX(i)/14,p.getZ(i)/13)<1.000001);assert.ok(g.attributes.normal.getY(i)>.99);}
 for(const x of [-COURT.lampX,COURT.lampX])assert.ok(riverCenter(x)-1.5-COURT.lampZ>.9);
 assert.ok(riverCenter(0)-1.5-(COURT.lowerStepZ+COURT.stepDepth/2)>1);
 assert.ok(COURT.deckFront-1.23>1);
 assert.equal(gentleGust(0),0);assert.ok(Math.abs(gentleGust(4))<1e-10);g.dispose();
});
test('merged detail geometry, moving door hit targets, isolated pots and snow lifecycle',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial();
 const d=createDetails({scene,box:new T.BoxGeometry(),round:new T.SphereGeometry(1,12,8),wood:material,woodLight:material,darkWood:material,mat:c=>new T.MeshStandardMaterial({color:c}),mobile:true},[{p:new T.Vector3(-5,6,0),tree:0},{p:new T.Vector3(5,6,0),tree:1}],()=>0);
 d.update(0,0,[1,0,0,0]);scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(o.geometry){assert.ok(o.geometry.attributes.position.count>0);for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
 const doors=d.pickables.filter(m=>m.userData.kind==='door');assert.equal(doors.length,4);
 const ray=new T.Raycaster(new T.Vector3(.7,2.3,5),new T.Vector3(0,0,-1));
 assert.equal(ray.intersectObjects(doors).length,0);
 d.toggleDoors();for(let i=0;i<240;i++)d.update(i/60,1/60,[1,0,0,0]);scene.updateMatrixWorld(true);
 assert.ok(ray.intersectObjects(doors).length>0);
 const roots=[0,1].map(id=>d.pickables.find(m=>m.userData.kind==='pot'&&m.userData.id===id).parent);
 d.update(10,0,[1,0,0,0]);const before=roots.map(g=>g.rotation.z);
 d.touchPot(0,9);d.update(10,0,[1,0,0,0]);assert.notEqual(roots[0].rotation.z,before[0]);assert.equal(roots[1].rotation.z,before[1]);
 d.shakeSnow(0);assert.ok(d.update(11,.016,[0,0,0,1]).activeSnow>0);
 let state;for(let i=0;i<300;i++)state=d.update(11+i/60,1/60,[0,0,0,1]);assert.equal(state.activeSnow,0);
});
