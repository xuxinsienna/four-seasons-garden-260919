import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { botanicalDisc,curvedBranch } from './forms-v3';
import { COURT,doorCenter,gentleGust,riverCenter } from './layout-v3';

type Context={scene:T.Scene;box:T.BufferGeometry;round:T.BufferGeometry;wood:T.Material;woodLight:T.Material;darkWood:T.Material;mat:(color:string)=>T.MeshStandardMaterial;mobile:boolean};
export function createDetails(c:Context,clusters:{p:T.Vector3;tree:number}[],height:(x:number,z:number)=>number){
 const {scene,box,round,wood,woodLight,darkWood,mat,mobile}=c;
 const leaf=botanicalDisc(),flower=botanicalDisc(true);
 const pickables:T.Mesh[]=[];
 const add=(g:T.Object3D,geo:T.BufferGeometry,m:T.Material,p:number[],s:number[]=[1,1,1])=>{
   const o=new T.Mesh(geo,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;
 };
 const block=(g:T.Object3D,m:T.Material,p:number[],s:number[])=>add(g,box,m,p,s);
 const branch=(g:T.Object3D,points:number[][],r:number,tip=.003,m:T.Material=wood)=>add(g,curvedBranch(points.map(p=>new T.Vector3(...p as [number,number,number])),r,tip),m,[0,0,0]);
 const target=(g:T.Object3D,kind:string,id:number)=>g.traverse(o=>{if(o instanceof T.Mesh){o.userData={kind,id};pickables.push(o);}});
 const compact=(parent:T.Object3D,parts:T.Mesh[])=>{
   const discarded=new Set<T.BufferGeometry>(),geometries=[...parts].map(o=>{
     o.updateMatrix();const indexed=o.geometry.clone().applyMatrix4(o.matrix),g=indexed.index?indexed.toNonIndexed():indexed;if(g!==indexed)indexed.dispose();
     const m=o.material as T.MeshStandardMaterial,colors=new Float32Array(g.attributes.position.count*3),prior=g.getAttribute('color');
     for(let i=0;i<colors.length/3;i++){colors[i*3]=m.color.r*(prior?prior.getX(i):1);colors[i*3+1]=m.color.g*(prior?prior.getY(i):1);colors[i*3+2]=m.color.b*(prior?prior.getZ(i):1);}
     g.setAttribute('color',new T.BufferAttribute(colors,3));parent.remove(o);if(![box,round,leaf,flower].includes(o.geometry))discarded.add(o.geometry);return g;
   });
   const g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());discarded.forEach(g=>g.dispose());
   return add(parent,g,new T.MeshStandardMaterial({vertexColors:true,roughness:.92}),[0,0,0]);
 };

 // Four shoji leaves stack into two pairs. Actual moving meshes are also their hit targets.
 const doors:T.Group[]=[];let doorOpen=1,doorGoal=1;
 for(const side of [-1,1])for(let panel=0;panel<2;panel++){
   const g=new T.Group();g.position.set(doorCenter(side,panel,1),2.32,1.12+panel*.11);scene.add(g);doors.push(g);
   block(g,wood,[0,0,0],[1.47,2.96,.065]);
   block(g,mat('#ede5cc'),[0,.02,.043],[1.32,2.76,.018]);
   for(let i=0;i<5;i++)block(g,woodLight,[-.62+i*.31,.02,.062],[.024,2.77,.019]);
   for(let j=0;j<10;j++)block(g,woodLight,[0,-1.3+j*.293,.064],[1.34,.025,.02]);
   block(g,woodLight,[0,-1.30,.067],[1.34,.26,.02]);
   block(g,darkWood,[-side*.57,-.08,.079],[.026,.14,.012]);compact(g,g.children as T.Mesh[]);target(g,'door',0);
 }

 // Glass furin, supported outside the door tracks and suspended from its top point.
 const chime=new T.Group();chime.position.set(2.2,3.85,1.76);scene.add(chime);
 branch(scene,[[2.2,3.89,1.13],[2.2,3.89,1.76]],.026,.026,darkWood);
 branch(chime,[[0,0,0],[0,-.3,0]],.004,.004,darkWood);
 const glass=new T.MeshPhysicalMaterial({color:'#deeee8',roughness:.12,transparent:true,opacity:mobile?.36:.5,transmission:mobile?0:.72,thickness:.025,ior:1.45,side:T.DoubleSide,depthWrite:false});
 const bell=add(chime,new T.SphereGeometry(.23,24,14,0,Math.PI*2,0,2.12),glass,[0,-.52,0]);bell.castShadow=false;
 const rim=add(chime,new T.TorusGeometry(.196,.008,6,32),mat('#adc5ba'),[0,-.64,0]);rim.rotation.x=Math.PI/2;
 branch(chime,[[0,-.38,0],[0,-.87,0]],.003,.003,mat('#8d8270'));
 add(chime,round,mat('#b8a17b'),[0,-.61,0],[.025,.04,.025]);
 const paper=block(chime,mat('#e9dfba'),[0,-1.04,0],[.12,.36,.008]);
 for(let i=0;i<3;i++)block(chime,mat('#94ada1'),[0,-.96-i*.065,.006],[.043,.012,.002]);
 target(chime,'chime',0);let chimeTouch=-100;

 // One woody stem divides naturally. Leaves attach to twig endpoints; winter exposes the branches.
 const pots:{root:T.Group;leaves:T.InstancedMesh;flowers:T.InstancedMesh;leafParts:T.Mesh[];flowerParts:T.Mesh[];leafMaterial:T.MeshStandardMaterial;touch:number}[]=[];
 for(const side of [-1,1]){
   const root=new T.Group();root.position.set(side*COURT.potX,.59,COURT.potZ);scene.add(root);
   const leaves=new T.Group(),flowers=new T.Group();root.add(leaves,flowers);
   const leafMaterial=mat('#758e65').clone();
   branch(root,[[0,0,0],[-.015,.22,.02],[.03,.43,0],[.015,.63,-.02]],.039,.012,mat('#8e6e51'));
   for(let j=0;j<6;j++){
     const a=j*2.399,s=.14+j%3*.035,start=[.01,.18+j%3*.075,0],mid=[Math.cos(a)*s,.45+j%2*.06,Math.sin(a)*s],end=[Math.cos(a)*.33,.65+(j%3)*.075,Math.sin(a)*.33];
     branch(root,[start,mid,end],.018,.004,mat('#927359'));
     for(let k=0;k<3;k++){
       const t=.55+k*.18,tip=[end[0]*t+Math.cos(a+k)*.12,end[1]*t+.18,end[2]*t+Math.sin(a+k)*.12];
       branch(root,[[mid[0],mid[1],mid[2]],tip],.008,.002,mat('#927359'));
       for(const sign of [-1,1]){
         const l=add(leaves,leaf,leafMaterial,[tip[0]+sign*.035,tip[1]-.035,tip[2]],[.12,.15,.12]);l.rotation.set(-.65,sign*.45,a+sign*.7);
       }
       for(let n=0;n<3;n++){const f=add(flowers,flower,mat(n%2?'#e8b6ae':'#f0dfc7'),[tip[0]+Math.cos(n*2.1)*.052,tip[1]+.027,tip[2]+Math.sin(n*2.1)*.052],[.085,.085,.085]);f.rotation.set(-1.0,n*.4,a);}
     }
   }
   const leafParts=[...leaves.children] as T.Mesh[],flowerParts=[...flowers.children] as T.Mesh[];
   root.remove(leaves,flowers);
   const leafInstances=new T.InstancedMesh(leaf,leafMaterial,leafParts.length);
   const flowerInstances=new T.InstancedMesh(flower,new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide}),flowerParts.length);
   leafMaterial.side=T.DoubleSide;
   flowerParts.forEach((f,i)=>flowerInstances.setColorAt(i,(f.material as T.MeshStandardMaterial).color));
   compact(root,root.children.filter(o=>o instanceof T.Mesh) as T.Mesh[]);
   root.add(leafInstances,flowerInstances);leafInstances.castShadow=true;leafInstances.receiveShadow=true;flowerInstances.castShadow=true;
   const id=pots.length;pots.push({root,leaves:leafInstances,flowers:flowerInstances,leafParts,flowerParts,leafMaterial,touch:-100});target(root,'pot',id);
 }

 // Tea is separate from the board. Players sit on the left/right; their right-hand bowls are diagonal.
 const tea=new T.Group();scene.add(tea);
 block(tea,mat('#c3a276'),[0,1.265,-1.30],[1.02,.04,1.10]);
 for(let i=0;i<13;i++){
   block(tea,mat('#765e43'),[-.45+i*.075,1.287,-1.30],[.003,.002,.96]);
   block(tea,mat('#765e43'),[0,1.288,-1.78+i*.08],[.9,.002,.003]);
 }
 for(const [x,z,b]of [[3,3,1],[4,3,0],[5,4,1],[6,6,0],[7,6,1],[7,7,0],[8,6,1],[3,8,0],[5,7,1],[8,3,0],[6,9,1]])
   add(tea,round,mat(b?'#3d413f':'#e9e5d6'),[-.45+x*.075,1.303,-1.78+z*.08],[.029,.014,.029]);
 const bowlGeo=new T.LatheGeometry([[0,0],[.105,0],[.174,.09],[.185,.17],[.161,.17],[.149,.095],[.092,.025],[0,.025]].map(([x,y])=>new T.Vector2(x,y)),24);
 for(const [x,z,black]of [[-.83,-.83,1],[.83,-1.77,0]]){
   add(tea,bowlGeo,mat('#71563f'),[x,1.247,z]);
   for(let i=0;i<12;i++){const a=i*2.4,r=.03+Math.sqrt(i/12)*.1;add(tea,round,mat(black?'#3e4240':'#e6e4d7'),[x+Math.cos(a)*r,1.35+(i%3)*.012,z+Math.sin(a)*r],[.031,.015,.031]);}
 }
 const cupGeo=new T.LatheGeometry([[0,0],[.04,0],[.074,.072],[.06,.072],[.035,.017],[0,.017]].map(([x,y])=>new T.Vector2(x,y)),24);
 for(const x of [-.38,.38]){
   add(tea,new T.CylinderGeometry(.10,.10,.013,24),mat('#ced6c9'),[x,1.258,-.58]);
   add(tea,cupGeo,mat('#e7e8d7'),[x,1.266,-.58]);
   add(tea,new T.CylinderGeometry(.057,.057,.002,20),mat('#8c835f'),[x,1.321,-.58]);
 }
 const ceramic=mat('#74988d');
 add(tea,round,ceramic,[0,1.39,-2.00],[.15,.14,.145]);
 add(tea,new T.CylinderGeometry(.087,.087,.017,20),ceramic,[0,1.516,-2.00]);
 add(tea,round,darkWood,[0,1.544,-2.00],[.023,.022,.023]);
 branch(tea,[[-.1,1.39,-2],[-.22,1.45,-2],[-.21,1.59,-2],[-.09,1.5,-2]],.018,.018,darkWood);
 branch(tea,[[.11,1.35,-2],[.22,1.42,-2],[.25,1.48,-2]],.032,.020,ceramic);
 compact(tea,[...tea.children] as T.Mesh[]);
 const steamPos=new Float32Array(48),steamGeo=new T.BufferGeometry();steamGeo.setAttribute('position',new T.BufferAttribute(steamPos,3));
 const steamMat=new T.PointsMaterial({color:'#f5f1df',size:.043,transparent:true,opacity:.12,depthWrite:false});
 steamMat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse, opacity ); diffuseColor.a*=1.0-smoothstep(.03,.5,length(gl_PointCoord-.5));');};
 const steam=new T.Points(steamGeo,steamMat);scene.add(steam);

 // Painted koi with a flexible tail joint, a forked fan and two pectoral fins.
 const fishRoot=new T.Group();scene.add(fishRoot);
 const fishes:{root:T.Group;tail:T.Group;fins:T.Mesh[]}[]=[];
 const finShape=new T.Shape();finShape.moveTo(0,0);finShape.quadraticCurveTo(-.10,.11,-.24,.14);finShape.lineTo(-.18,0);finShape.lineTo(-.24,-.14);finShape.quadraticCurveTo(-.10,-.11,0,0);
 const finGeo=new T.ShapeGeometry(finShape,8);finGeo.rotateX(Math.PI/2);
 const finMat=new T.MeshStandardMaterial({color:'#e6be9b',side:T.DoubleSide,transparent:true,opacity:.88,roughness:.7});
 for(let i=0;i<5;i++){
   const root=new T.Group();fishRoot.add(root);
   const bodyGeo=new T.SphereGeometry(1,20,12),colors:number[]=[];
   const p=bodyGeo.attributes.position;
   for(let v=0;v<p.count;v++){const x=p.getX(v),y=p.getY(v),z=p.getZ(v);p.setXYZ(v,x*.34,y*.085*(.82+x*.16),z*.12*(.88+x*.1));const col=new T.Color(Math.sin(x*8+i*2)+Math.cos(z*6)>.65?'#c87852':'#e4dfc5');colors.push(col.r,col.g,col.b);}
   bodyGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));bodyGeo.computeVertexNormals();
   add(root,bodyGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:.65}),[0,0,0]);
   const tail=new T.Group();tail.position.x=-.27;root.add(tail);
   add(tail,round,mat('#d7c9aa'),[-.018,0,0],[.10,.049,.055]);add(tail,finGeo,finMat,[-.055,0,0]);
   const fins:T.Mesh[]=[];
   for(const sign of [-1,1]){add(root,round,mat('#343c35'),[.225,.036,sign*.076],[.018,.014,.012]);const f=add(root,finGeo,finMat,[.055,-.027,sign*.11],[.55,1,.55]);f.rotation.y=sign*.9;fins.push(f);}
   fishes.push({root,tail,fins});
 }

 // Soft lobes rest along branch clusters; shaking sheds a bounded pool of irregular snow pieces.
 const snowMat=new T.MeshStandardMaterial({color:'#edf0e7',roughness:1});
 const caps=clusters.flatMap(({p,tree})=>[0,1,2].map(i=>({p:p.clone().add(new T.Vector3((i-1)*.38,.20+(i%2)*.08,Math.sin(i*2.4)*.32)),tree,size:new T.Vector3(.84+i%2*.25,.29+i%2*.10,.67)})));
 const capMesh=new T.InstancedMesh(round,snowMat,caps.length);capMesh.frustumCulled=false;capMesh.castShadow=true;capMesh.receiveShadow=true;scene.add(capMesh);
 const snowPieces=Array.from({length:48},()=>({p:new T.Vector3(),v:new T.Vector3(),age:10,size:.1}));
 const snowPiecesMesh=new T.InstancedMesh(round,snowMat,48);snowPiecesMesh.frustumCulled=false;scene.add(snowPiecesMesh);
 const snowAmount=[1,1];let snowCursor=0;const obj=new T.Object3D();
 function shakeSnow(tree:number){
   snowAmount[tree]=Math.max(.35,snowAmount[tree]-.24);
   const choices=caps.filter(p=>p.tree===tree);
   for(let i=0;i<16;i++){const c=choices[(i*7+snowCursor)%choices.length],p=snowPieces[snowCursor++%48];p.p.copy(c.p);p.p.x+=Math.sin(i*2.4)*.4;p.v.set(Math.sin(i*2.4)*.28,-.25,Math.cos(i*2.4)*.2);p.age=0;p.size=.075+(i%4)*.025;}
 }
 function update(time:number,dt:number,weights:number[]){
   const [spring,summer,autumn,winter]=weights;
   doorOpen+=(doorGoal-doorOpen)*(1-Math.exp(-dt*3.3));
   doors.forEach((g,i)=>{g.position.x=doorCenter(i<2?-1:1,i%2,doorOpen);g.updateMatrixWorld(true);});
   const chimeAge=Math.max(0,time-chimeTouch);
   chime.rotation.z=Math.sin(time*.8)*.017+Math.sin(chimeAge*5.4)*Math.exp(-chimeAge*.75)*.23;
   chime.rotation.x=Math.sin(time*.6)*.010+Math.sin(chimeAge*4.4)*Math.exp(-chimeAge*.8)*.09;paper.rotation.z=Math.sin(time*1.2)*.07;
   pots.forEach(p=>{
     p.root.rotation.z=Math.sin(time*.7+p.root.position.x)*.010+gentleGust(time-p.touch)*.022;
     p.root.rotation.x=Math.sin(time*.6)*.006;
     p.leaves.visible=winter<.98;p.leafMaterial.color.set('#758e65').lerp(new T.Color('#9a8655'),autumn);
     p.leafParts.forEach((l,i)=>{obj.position.copy(l.position);obj.rotation.copy(l.rotation);obj.scale.set(.12,.15,.12).multiplyScalar(Math.max(.001,1-winter));obj.updateMatrix();p.leaves.setMatrixAt(i,obj.matrix);});p.leaves.instanceMatrix.needsUpdate=true;
     const bloom=spring+summer*.65+autumn*.08;p.flowers.visible=bloom>.015;
     p.flowerParts.forEach((f,i)=>{obj.position.copy(f.position);obj.rotation.copy(f.rotation);obj.scale.setScalar(.085*T.MathUtils.clamp((bloom-(i*.618%1)) * 7,0,1));obj.updateMatrix();p.flowers.setMatrixAt(i,obj.matrix);});p.flowers.instanceMatrix.needsUpdate=true;
   });
   for(let i=0;i<16;i++){const t=(time*.22+i/8)%1,x=i<8?-.38:.38;steamPos.set([x+Math.sin(t*6+i)*.012,1.35+t*.27,-.58+Math.cos(t*7+i)*.01],i*3);}steamGeo.attributes.position.needsUpdate=true;steamMat.opacity=.105+winter*.035;
   fishRoot.visible=winter<.7;
   fishes.forEach((f,i)=>{
     const t=time*.10+i*1.23,x=Math.sin(t)*5.3,z=riverCenter(x)+Math.sin(time*.15+i*2)*.48;
     const dx=Math.cos(t)*.53,dz=(Math.cos(x*.26)*.156+Math.cos(x*.6)*.072)*dx+Math.cos(time*.15+i*2)*.072;
     f.root.position.set(x,-.30+Math.sin(time*.7+i)*.017,z);f.root.rotation.y=-Math.atan2(dz,dx);
     f.tail.rotation.y=Math.sin(time*5.1+i)*.38;f.fins.forEach((fin,j)=>fin.rotation.y=(j?1:-1)*(.9+Math.sin(time*3.2+i)*.16));
   });
   snowAmount.forEach((n,i)=>snowAmount[i]=Math.min(1,n+dt*.012));
   capMesh.visible=winter>.015;
   caps.forEach((c,i)=>{obj.position.copy(c.p);obj.rotation.set(0,i*.47,0);obj.scale.copy(c.size).multiplyScalar(winter);obj.scale.y*=snowAmount[c.tree];obj.updateMatrix();capMesh.setMatrixAt(i,obj.matrix);});capMesh.instanceMatrix.needsUpdate=true;
   let activeSnow=0;
   snowPieces.forEach((p,i)=>{p.age+=dt;if(p.age<4.3){p.v.y-=dt*.70;p.p.addScaledVector(p.v,dt);const roof=Math.abs(p.p.x)<3.65&&p.p.z>-4.5&&p.p.z<1.7;const floor=roof?5.58-Math.abs(p.p.z+1.4)*.517:height(p.p.x,p.p.z)+.05;if(p.p.y<floor){p.p.y=floor;p.age=Math.max(p.age,3.8);}obj.position.copy(p.p);obj.rotation.set(p.age,p.age*.7,i);obj.scale.set(p.size,p.size*.7,p.size*.85).multiplyScalar(Math.min(1,(4.3-p.age)*2)*winter);activeSnow++;}else obj.scale.setScalar(0);obj.updateMatrix();snowPiecesMesh.setMatrixAt(i,obj.matrix);});
   snowPiecesMesh.visible=activeSnow>0;if(activeSnow)snowPiecesMesh.instanceMatrix.needsUpdate=true;
   return {doorOpen,activeSnow};
 }
 return {pickables,update,toggleDoors:()=>doorGoal=doorGoal>.5?0:1,touchChime:(t:number)=>chimeTouch=t,touchPot:(id:number,t:number)=>{if(pots[id])pots[id].touch=t;},shakeSnow};
}
