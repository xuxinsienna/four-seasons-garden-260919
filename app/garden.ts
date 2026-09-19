import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type GardenState = { season: number; hour: number; rain: number };
export type GardenAPI = { setSeason: (s:number)=>void; setHour:(h:number)=>void; setPaused:(p:boolean)=>void; setSpeed:(s:number)=>void; setWeather:(w:'auto'|'clear'|'rain')=>void; setSound:(s:boolean)=>void; resetView:()=>void; dispose:()=>void };
const TAU=Math.PI*2;
function random(seed=19){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const clamp=T.MathUtils.clamp;

export function createGarden(host:HTMLDivElement,onState:(s:GardenState)=>void,onFailure?:(message:string)=>void):GardenAPI {
 const rand=random(), mobile=matchMedia('(pointer: coarse)').matches;
 const scene=new T.Scene();scene.background=new T.Color('#b5d3c8');scene.fog=new T.FogExp2('#b5d3c8',.019);
 const renderer=new T.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(38,1,.2,230), controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=8;controls.maxDistance=37;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.18;controls.enablePan=true;controls.panSpeed=.7;controls.zoomSpeed=.65;controls.target.set(0,1.8,0);
 controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
 let previousAspect=0;
 function resetView(){const aspect=host.clientWidth/host.clientHeight;const framing=aspect<.8?1.45:aspect<1.35?1.16:1;camera.position.set(12.8,10.8,18).multiplyScalar(framing);controls.target.set(0,1.7,0);controls.update();}
 const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.fov=camera.aspect<.8?46:38;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);if(previousAspect&&(previousAspect<1)!==(camera.aspect<1))resetView();previousAspect=camera.aspect;};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();resetView();
 const hemi=new T.HemisphereLight('#e6f2ce','#647552',2.2);scene.add(hemi);
 const sunLight=new T.DirectionalLight('#fff0c9',3.2);sunLight.position.set(-9,18,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sunLight.shadow.camera.left=-14;sunLight.shadow.camera.right=14;sunLight.shadow.camera.top=14;sunLight.shadow.camera.bottom=-14;sunLight.shadow.normalBias=.08;sunLight.shadow.bias=-.0002;scene.add(sunLight);
 const fill=new T.DirectionalLight('#a4d8d0',.6);fill.position.set(10,8,-8);scene.add(fill);
 const lamp=new T.PointLight('#ffc46e',0,12,1.5);lamp.position.set(.3,2,-1.2);scene.add(lamp);
 const materials=new Map<string,T.MeshStandardMaterial>(),batches=new Map<T.Material,T.BufferGeometry[]>();
 const allGeometries=new Set<T.BufferGeometry>(),allMaterials=new Set<T.Material>();
 function mat(color:string,roughness=.95){const key=color+roughness;let m=materials.get(key);if(!m){m=new T.MeshStandardMaterial({color,roughness,flatShading:true});materials.set(key,m);allMaterials.add(m);}return m;}
 const wood=mat('#77533c'),woodLight=mat('#b18759'),darkWood=mat('#4b4434'),plaster=mat('#ecdeb8'),roofMat=mat('#367b79'),roofEdge=mat('#275b58'),stone=mat('#8c9a87'),stoneLight=mat('#b8b9a0'),grassMat=mat('#91ad69');
 const obj=new T.Object3D();
 function batch(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();const geo=g.clone().applyMatrix4(obj.matrix);if(geo.index){const n=geo.toNonIndexed();geo.dispose();if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(n);}else{if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(geo);}}
 const box=new T.BoxGeometry(1,1,1),sphere=new T.IcosahedronGeometry(1,1),round=new T.SphereGeometry(1,10,7),cylinder=new T.CylinderGeometry(1,1,1,8),cone=new T.ConeGeometry(1,1,7);
 [box,sphere,round,cylinder,cone].forEach(g=>allGeometries.add(g));
 function cube(m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0){batch(box,m,x,y,z,sx,sy,sz,rx,ry,rz);}
 function ball(m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){batch(sphere,m,x,y,z,sx,sy,sz);}
 function beam(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const d=b.clone().sub(a);obj.position.copy(a).add(b).multiplyScalar(.5);obj.scale.set(r,d.length(),r);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());obj.updateMatrix();const g=cylinder.clone().applyMatrix4(obj.matrix).toNonIndexed();if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(g);}
 function flush(){const colored:T.BufferGeometry[]=[];for(const [m,gs]of batches){if(m instanceof T.MeshStandardMaterial&&m.emissive.getHex()===0){for(const g of gs){const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=m.color.r;colors[i+1]=m.color.g;colors[i+2]=m.color.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));colored.push(g);}}else{const geometry=mergeGeometries(gs);gs.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);allGeometries.add(geometry);}}if(colored.length){const geometry=mergeGeometries(colored);colored.forEach(g=>g.dispose());const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true});allMaterials.add(m);allGeometries.add(geometry);const mesh=new T.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}batches.clear();}
 const river=(x:number)=>4.6+Math.sin(x*.26)*.95+Math.sin(x*.6)*.18;
 function height(x:number,z:number){const d=Math.abs(z-river(x));const hills=(Math.sin(x*.17)*Math.cos(z*.14)*.8+Math.sin(z*.31+x*.15)*.24)*Math.min(1,Math.max(0,Math.hypot(x,z)-10)/18);return d<1.5?-.65+Math.pow(d/1.5,4)*.65: hills;}
 // A continuous landscape, carved down along the stream; no floating diorama edges.
 const groundGeo=new T.PlaneGeometry(160,160,120,120);groundGeo.rotateX(-Math.PI/2);
 const gp=groundGeo.attributes.position;const gc=[];
 for(let i=0;i<gp.count;i++){const u=gp.getX(i),v=gp.getZ(i),x=Math.sign(u)*Math.pow(Math.abs(u)/80,1.6)*80,z=Math.sign(v)*Math.pow(Math.abs(v)/80,1.6)*80;gp.setXYZ(i,x,height(x,z),z);const col=new T.Color('#8fab69').lerp(new T.Color('#b1be80'),rand()*.5);gc.push(col.r,col.g,col.b);}
 groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundGeo.computeVertexNormals();const groundMat=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,flatShading:true});const ground=new T.Mesh(groundGeo,groundMat);ground.receiveShadow=true;scene.add(ground);allGeometries.add(groundGeo);allMaterials.add(groundMat);
 // Mountain silhouettes and a distant forest repeat geometry, never external models.
 for(let i=0;i<35;i++){const a=TAU*i/35,d=44+rand()*35,h=8+rand()*15;batch(cone,mat(['#799e8e','#82a698','#719a8d'][i%3]),Math.cos(a)*d,h*.4-3,Math.sin(a)*d,12+rand()*10,h,12+rand()*8,0,rand()*3,0);}
 for(let i=0;i<100;i++){const a=TAU*rand(),d=18+rand()*31,x=Math.cos(a)*d,z=Math.sin(a)*d;const h=2.5+rand()*4;if(z>8&&Math.abs(x)<15)continue;const y=height(x,z);cube(wood,x,y+h*.3,z,.23,h*.6,.23);for(let j=0;j<3;j++)batch(cone,mat(['#466f57','#597f5c','#628863'][i%3]),x,y+h*.5+j*h*.19,z,h*.36-j*.18,h*.7,h*.36-j*.18);}
 // Raised timber house: completely open frontage and furnished interior.
 for(const x of [-2.85,0,2.85])for(const z of [-3.7,.9]){cube(darkWood,x,.28,z,.22,.85,.22);ball(stone,x,-.02,z,.33,.16,.29);}
 cube(wood,0,.5,-1.4,6.3,.27,5.4);
 for(let i=0;i<25;i++)cube(i%3===0?woodLight:mat('#ae875b'),-3+i*.25,.66,-1.4,.235,.085,5.2);
 cube(woodLight,0,.23,1.65,2.1,.2,.75);cube(woodLight,0,.05,2.05,2.5,.17,.42);
 cube(plaster,0,2.22,-3.9,5.9,3.05,.16);cube(plaster,-2.95,2.2,-1.7,.14,3,4.3);cube(plaster,2.95,2.2,-2.5,.14,3,2.7);
 for(const x of [-3,0,3])for(const z of [-3.95,1.15])cube(darkWood,x,2.25,z,.17,3.4,.17);
 for(const z of [-3.98,1.17]){cube(darkWood,0,3.9,z,6.6,.2,.23);cube(wood,0,.88,z,6,.14,.14);}
 for(const x of [-3,3])cube(darkWood,x,3.88,-1.4,.22,.23,5.4);
 // Sliding panels drawn fully aside, lattice on the back and right wall.
 for(const x of [-2.6,2.6]){cube(wood,x,2.2,1.1,.65,2.7,.085);cube(plaster,x,2.25,1.16,.49,2.45,.02);for(let j=0;j<7;j++)cube(wood,x,1.2+j*.34,1.185,.55,.035,.025);cube(wood,x,2.25,1.19,.035,2.45,.025);}
 for(let i=0;i<7;i++)cube(wood,-2.65+i*.87,2.25,-3.78,.045,2.65,.045);
 for(let j=0;j<5;j++)cube(wood,0,1.1+j*.55,-3.76,5.5,.035,.04);
 cube(wood,3.01,2.2,-.45,.09,2.6,1.4);cube(plaster,3.065,2.2,-.45,.02,2.4,1.25);
 for(let j=0;j<5;j++)cube(wood,3.09,1.2+j*.5,-.45,.025,.035,1.28);
 for(let j=0;j<4;j++)cube(wood,3.09,2.2,-1+j*.37,.025,2.4,.035);
 // Roof with individually articulated glazed tile ribs and lifted eaves.
 const slope=Math.atan2(1.5,2.9), roofLen=Math.hypot(1.5,2.9);
 for(const side of [-1,1]){cube(roofMat,0,4.65,-1.4+side*1.45,7.15,.17,roofLen,side*slope);for(let i=0;i<39;i++){const x=-3.55+i*.186;cube(i%4?roofMat:mat('#4d9188'),x,4.77,-1.4+side*1.45,.075,.085,roofLen+.07,side*slope);}cube(roofEdge,0,3.93,-1.4+side*2.97,7.45,.19,.16);for(let j=0;j<8;j++){const f=j/8;cube(mat('#3f8078'),0,5.46-f*1.5,-1.4+side*f*2.9,7.15,.038,.045);}}
 cube(roofEdge,0,5.49,-1.4,7.4,.22,.25);for(const x of [-3.62,3.62]){ball(roofEdge,x,5.53,-1.4,.21,.15,.19);for(const side of [-1,1])cube(darkWood,x,4.57,-1.4+side*1.46,.13,.15,roofLen+.2,side*slope);}
 // Gable infill beneath the roof, with small decorative rafters.
 for(const x of [-2.96,2.96])for(let j=0;j<13;j++){const z=-4.2+j*.46,h=1.4-Math.abs(z+1.4)*.5;if(h>0)cube(woodLight,x,3.95+h*.5,z,.08,h,.45);}
 for(let i=0;i<12;i++)cube(wood,-2.8+i*.51,3.85,-1.4,.065,.13,5.8);
 // Tatami, table, teapot, cups, books, cushions, cabinet and bedding.
 for(const x of [-1.3,1.3])for(const z of [-2.7,-.8]){cube(mat('#abb27a'),x,.745,z,2.38,.065,1.7);cube(mat('#728667'),x-1.15,.787,z,.045,.015,1.7);cube(mat('#728667'),x+1.15,.787,z,.045,.015,1.7);}
 cube(woodLight,.1,1.15,-.9,1.65,.13,1.05);for(const x of [-.58,.77])for(const z of [-1.25,-.55])cube(wood,x,.96,z,.09,.35,.09);
 const ceramic=mat('#678e86');ball(ceramic,.2,1.36,-.9,.16,.13,.15);batch(cylinder,ceramic,.2,1.47,-.9,.1,.035,.1);ball(darkWood,.2,1.51,-.9,.028);beam(new T.Vector3(.3,1.33,-.9),new T.Vector3(.48,1.45,-.9),.035,ceramic);
 for(const x of [-.35,.65])batch(cylinder,mat('#eee5c5'),x,1.29,-.65,.075,.09,.075);
 for(const z of [-.1,-1.85])cube(mat('#819b9b'),.1,.84,z,.68,.13,.47,0,.12);
 cube(wood,2.14,1.3,-3.4,1.22,1.1,.6);for(let j=0;j<3;j++){cube(woodLight,2.14,.93+j*.34,-3.08,1.07,.29,.025);ball(darkWood,2.14,.94+j*.34,-3.04,.035);}
 cube(wood,-2.12,1.65,-3.46,1.2,1.8,.45);for(let j=0;j<3;j++){cube(darkWood,-2.12,1.02+j*.6,-3.2,1.14,.055,.48);for(let i=0;i<6;i++)cube(mat(['#708779','#c4aa72','#b67f63','#9ca79c'][i%4]),-2.56+i*.16,1.23+j*.6,-3.16,.1,.36+rand()*.12,.26,0,0,(rand()-.5)*.1);}
 cube(mat('#e8dcc4'),-1.8,.89,-1.6,1.1,.25,1.8);cube(mat('#94a89c'),-1.8,1,-1.3,1.14,.17,1.23);cube(mat('#eee5ca'),-1.8,1.08,-2.2,.83,.15,.4);
 cube(wood,0,2.8,-3.76,.95,.85,.06);cube(mat('#e3d6b2'),0,2.8,-3.715,.81,.72,.025);batch(cone,mat('#8d9c7d'),0,2.75,-3.69,.27,.39,.015);
 beam(new T.Vector3(.4,3.8,-1.3),new T.Vector3(.4,3.3,-1.3),.018,darkWood);
 const lanternMat=new T.MeshStandardMaterial({color:'#fce3a3',emissive:'#ffc465',emissiveIntensity:.3,roughness:1});allMaterials.add(lanternMat);batch(round,lanternMat,.4,3.1,-1.3,.28,.28,.28);batch(cylinder,wood,.4,2.84,-1.3,.14,.05,.14);
 // A wind chime on the veranda.
 beam(new T.Vector3(2.2,3.85,1.2),new T.Vector3(2.2,3.3,1.2),.008,darkWood);ball(ceramic,2.2,3.28,1.2,.12,.1,.12);
 const chime=new T.Mesh(box,mat('#e5d9b4'));chime.position.set(2.2,3.03,1.2);chime.scale.set(.075,.28,.01);scene.add(chime);
 // Mossy stones and a meandering stepping-stone approach, with no bridge.
 for(let i=0;i<95;i++){const x=(rand()-.5)*37,side=i%2?1:-1,z=river(x)+side*(1.36+rand()*.45);ball(i%3?stone:stoneLight,x,.02,z,.2+rand()*.4,.1+rand()*.16,.2+rand()*.32);if(i%3===0)ball(mat('#759063'),x,.15,z,.24,.035,.22);}
 for(let i=0;i<7;i++){const x=Math.sin(i*.8)*.25,z=2.15+i*.25;if(z<river(x)-1.6)ball(stoneLight,x,.035,z,.3,.045,.21);}
 // Stone lantern and an old garden stool.
 for(const x of [-3.8,4.1]){const z=x<0?2.4:1.6;batch(cylinder,stone,x,.14,z,.36,.26,.36);batch(cylinder,stone,x,.57,z,.16,.7,.16);cube(stone,x,.95,z,.52,.15,.52);cube(lanternMat,x,1.14,z,.24,.26,.24);for(const a of [-1,1])for(const b of [-1,1])cube(stone,x+a*.19,1.15,z+b*.19,.065,.35,.065);batch(cone,stone,x,1.45,z,.54,.35,.54);ball(stone,x,1.65,z,.085);}
 cube(woodLight,4.15,.55,-.25,1.15,.14,.6);for(const x of [3.7,4.6])cube(wood,x,.25,-.25,.12,.55,.42);
 // Pots, broad leaves and flower stems.
 for(const [x,z,s] of [[-2.6,1.45,.3],[2.8,1.45,.23],[-3.5,-2,.38],[4.1,-1.6,.32]]){batch(cylinder,mat('#b77f5c'),x,.24,z,s,.46,s*.82);batch(cylinder,darkWood,x,.475,z,s*.88,.012,s*.88);for(let j=0;j<7;j++){const a=TAU*j/7;beam(new T.Vector3(x,.4,z),new T.Vector3(x+Math.cos(a)*.23,.9+rand()*.25,z+Math.sin(a)*.2),.015,mat('#668458'));ball(mat('#6d935a'),x+Math.cos(a)*.21,.85+rand()*.2,z+Math.sin(a)*.2,.08,.2,.055);}}
 // Two distinct deciduous trees, forked trunks and individual instanced crowns.
 const leafData:{p:T.Vector3;s:T.Vector3;phase:number;tree:number}[]=[];
 const fruitData:T.Vector3[]=[];
 for(let k=0;k<2;k++){const x=k===0?-4.4:4.25,z=k===0?-.4:-3.05,h=k===0?6.3:5.1;
 beam(new T.Vector3(x,0,z),new T.Vector3(x+.2,h*.63,z-.15),k===0?.3:.23,wood);
 for(let j=0;j<7;j++){const a=j*2.399,kx=x+Math.cos(a)*(1.2+rand()*.6),kz=z+Math.sin(a)*(1.1+rand()*.5),ky=h-1+rand()*1.4;beam(new T.Vector3(x+.1,h*.4,z),new T.Vector3(kx,ky-.35,kz),.09+rand()*.05,wood);beam(new T.Vector3(x,0,z),new T.Vector3(x+Math.cos(a)*.8,.03,z+Math.sin(a)*.8),.09,wood);
 for(let n=0;n<38;n++){const u=rand()*TAU,v=Math.acos(2*rand()-1),r=Math.cbrt(rand());const p=new T.Vector3(kx+Math.cos(u)*Math.sin(v)*r*1.4,ky+Math.cos(v)*r*.9,kz+Math.sin(u)*Math.sin(v)*r*1.12);leafData.push({p,s:new T.Vector3(.28+rand()*.23,.18+rand()*.15,.26+rand()*.21),phase:rand()*TAU,tree:k});if(n%12===0)fruitData.push(p.clone().add(new T.Vector3(0,-.24,0)));}
 }}
 const leafMat=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});allMaterials.add(leafMat);
 const crownGeo=new T.IcosahedronGeometry(1,0);allGeometries.add(crownGeo);const leaves=new T.InstancedMesh(crownGeo,leafMat,leafData.length);leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);leaves.castShadow=true;leaves.receiveShadow=true;scene.add(leaves);
 const fruitMat=mat('#db9040'),fruit=new T.InstancedMesh(round,fruitMat,fruitData.length);scene.add(fruit);
 const blossomMat=mat('#ffe3d6');const blossoms=new T.InstancedMesh(crownGeo,blossomMat,leafData.length);scene.add(blossoms);leaves.frustumCulled=false;blossoms.frustumCulled=false;fruit.frustumCulled=false;
 // Batched meadow tufts, flowers and ferns sway in the vertex shader.
 const vegetationUniforms={time:{value:0},rain:{value:0},winter:{value:0}};
 groundMat.onBeforeCompile=shader=>{shader.uniforms.winter=vegetationUniforms.winter;shader.fragmentShader='uniform float winter;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.84,.81),winter*.96);');};
 const plantMat=new T.MeshStandardMaterial({color:'#6d9855',side:T.DoubleSide,roughness:1,flatShading:true});allMaterials.add(plantMat);
 plantMat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,vegetationUniforms);shader.vertexShader='uniform float time; uniform float rain; uniform float winter;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float sway=sin(time*1.6+position.x*2.4+position.z*1.5)*.065 + sin(time*19.0+position.x*17.0)*rain*.024; transformed.x+=sway*max(0.0,position.y); transformed.y*=1.0-winter*.73;');};
 const plantGeos:T.BufferGeometry[]=[];const flowerPoints:T.Vector3[]=[];
 for(let i=0;i<(mobile?650:1100);i++){const x=(rand()-.5)*23,z=(rand()-.5)*19;if(Math.abs(z-river(x))<1.65|| (Math.abs(x)<3.4&&z>-4.7&&z<2.8))continue;
 const y=height(x,z),h=.13+rand()*.29;for(let j=0;j<3;j++){const geo=new T.BufferGeometry();const a=j*TAU/3+rand(),w=.035,dx=Math.cos(a),dz=Math.sin(a);geo.setAttribute('position',new T.Float32BufferAttribute([x-dx*w,y,z-dz*w,x+dx*w,y,z+dz*w,x+dx*.06,y+h,z+dz*.06],3));geo.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));plantGeos.push(geo);}if(i%6===0&&Math.hypot(x,z)<10)flowerPoints.push(new T.Vector3(x,y+h*.8,z));}
 const plantGeo=mergeGeometries(plantGeos);plantGeos.forEach(g=>g.dispose());allGeometries.add(plantGeo);scene.add(new T.Mesh(plantGeo,plantMat));
 const flowers=new T.InstancedMesh(sphere,mat('#fff2cb'),flowerPoints.length*5);scene.add(flowers);
 for(let i=0;i<flowerPoints.length;i++){const p=flowerPoints[i];for(let j=0;j<5;j++){obj.position.copy(p).add(new T.Vector3(Math.cos(j*TAU/5)*.046,0,Math.sin(j*TAU/5)*.046));obj.scale.set(.049,.024,.046);obj.rotation.set(0,0,0);obj.updateMatrix();flowers.setMatrixAt(i*5+j,obj.matrix);flowers.setColorAt(i*5+j,new T.Color(i%3?'#fff6d0':'#dfb3c0'));}}
 // Broad ferns beside the stream.
 for(let i=0;i<20;i++){const x=(rand()-.5)*19,z=river(x)-1.8-rand()*.5;for(let j=0;j<7;j++){const a=j*TAU/7;beam(new T.Vector3(x,0,z),new T.Vector3(x+Math.cos(a)*.45,.3,z+Math.sin(a)*.45),.012,mat('#527b51'));for(let n=1;n<5;n++){const t=n/5;ball(mat('#668d57'),x+Math.cos(a)*t*.45,.15+Math.sin(t*Math.PI)*.17,z+Math.sin(a)*t*.45,.11*(1-t*.5),.025,.065);}}}
 // Seasonal objects use animated group scales to appear gently.
 const seasonal:T.Group[]=[];for(let i=0;i<4;i++){const g=new T.Group();scene.add(g);seasonal.push(g);}
 function mesh(g:T.Group,geo:T.BufferGeometry,m:T.Material,p:number[],s:number[]){const o=new T.Mesh(geo,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=true;g.add(o);return o;}
 seasonal[0].position.set(-1.8,.7,.9);mesh(seasonal[0],round,mat('#789ca0'),[0,.18,0],[.15,.22,.15]);for(let i=0;i<5;i++){mesh(seasonal[0],cylinder,mat('#698053'),[(i-2)*.06,.46,0],[.012,.5,.012]);mesh(seasonal[0],sphere,blossomMat,[(i-2)*.065,.64+Math.sin(i)*.05,0],[.095,.07,.085]);}
 seasonal[1].position.set(1.45,.74,1.1);const fan=mesh(seasonal[1],round,mat('#d8c999'),[0,.025,0],[.29,.024,.25]);fan.rotation.y=.45;mesh(seasonal[1],box,woodLight,[0,.02,.31],[.035,.035,.36]);mesh(seasonal[1],round,mat('#567c45'),[.62,.16,-.12],[.23,.23,.23]);
 seasonal[2].position.set(-1.7,.8,1);mesh(seasonal[2],round,mat('#b18a55'),[0,.08,0],[.43,.18,.31]);for(let i=0;i<9;i++)mesh(seasonal[2],round,mat(i%2?'#ce833d':'#b14d39'),[(rand()-.5)*.55,.2+rand()*.11,(rand()-.5)*.35],[.115,.11,.11]);
 seasonal[3].position.set(.95,.76,-.05);mesh(seasonal[3],cylinder,mat('#514a45'),[0,.25,0],[.26,.45,.26]);const fireMat=new T.MeshStandardMaterial({color:'#ffc15d',emissive:'#ff8b24',emissiveIntensity:2});allMaterials.add(fireMat);mesh(seasonal[3],sphere,fireMat,[0,.32,.25],[.13,.13,.02]);mesh(seasonal[3],cylinder,darkWood,[0,.53,0],[.3,.04,.3]);mesh(seasonal[3],round,ceramic,[0,.63,0],[.18,.13,.18]);
 // A curled cat on the sun-warmed veranda, and a meadow rabbit.
 const cat=new T.Group();cat.position.set(1.6,.8,.65);scene.add(cat);const catMat=mat('#d5b28b');mesh(cat,round,catMat,[0,.13,0],[.34,.18,.21]);mesh(cat,round,catMat,[.24,.22,.06],[.17,.15,.14]);for(const x of [.14,.33])mesh(cat,cone,catMat,[x,.36,.06],[.065,.13,.055]);for(const x of [.19,.29])mesh(cat,box,darkWood,[x,.23,.192],[.04,.012,.01]);const tail=mesh(cat,round,mat('#a8815b'),[-.17,.13,.14],[.26,.06,.09]);tail.rotation.y=-.45;
 const bunny=new T.Group();bunny.position.set(-3.7,.12,3);scene.add(bunny);const fur=mat('#ece3ca');mesh(bunny,round,fur,[0,.17,0],[.19,.19,.27]);mesh(bunny,round,fur,[0,.34,.17],[.135,.135,.13]);for(const x of [-.067,.067]){mesh(bunny,round,fur,[x,.53,.17],[.042,.17,.043]);mesh(bunny,round,mat('#caa8a1'),[x,.54,.202],[.02,.11,.012]);mesh(bunny,round,darkWood,[x,.365,.281],[.016,.017,.012]);}mesh(bunny,round,fur,[0,.2,-.25],[.08,.08,.08]);
 flush();
 // Flowing water shader: ripples, sunlight streaks and smoothly forming ice.
 const waterGeo=new T.PlaneGeometry(150,2.65,180,10);waterGeo.rotateX(-Math.PI/2);const wp=waterGeo.attributes.position;
 for(let i=0;i<wp.count;i++)wp.setXYZ(i,wp.getX(i),-.18,wp.getZ(i)+river(wp.getX(i)));
 const waterMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},rain:{value:0},ice:{value:0},day:{value:1}},vertexShader:'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:
 `varying vec3 p; uniform float time; uniform float rain; uniform float ice; uniform float day;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){float t=time*(1.0-ice);float wave=sin(p.x*3.1-t*1.6+sin(p.z*8.0+t))*sin(p.z*19.0+p.x*.8-t*.5);float streak=pow(max(0.0,wave),15.0);vec2 cell=floor(p.xz*2.8);vec2 uv=fract(p.xz*2.8)-.5;float age=fract(t*.8+hash(cell));float ripple=(1.0-smoothstep(.015,.052,abs(length(uv)-age*.52)))*(1.0-age)*rain;vec3 water=mix(vec3(.21,.57,.53),vec3(.55,.8,.7),.5+.5*sin(p.z*8.0+p.x*.5));water+=streak*.23+ripple*.28;float crack=pow(1.0-abs(sin(p.x*2.8+sin(p.z*3.0))),25.0)*.13;vec3 frozen=vec3(.64,.82,.84)+crack;gl_FragColor=vec4(mix(water,frozen,ice)*(.27+day*.73),mix(.79,.96,ice));}`});
 const water=new T.Mesh(waterGeo,waterMat);scene.add(water);allGeometries.add(waterGeo);allMaterials.add(waterMat);
 const koi=new T.Group();scene.add(koi);for(let i=0;i<5;i++){const fish=new T.Group();mesh(fish,round,mat(i%2?'#e4bf72':'#d7754d'),[0,0,0],[.22,.055,.08]);const ft=mesh(fish,cone,mat('#f1ddba'),[-.23,0,0],[.09,.16,.03]);ft.rotation.z=Math.PI/2;koi.add(fish);}
 // Butterflies: two independently beating wings, made from primitive geometry.
 const butterflyWings=new T.InstancedMesh(crownGeo,mat('#fff0ae'),18),butterflyBodies=new T.InstancedMesh(crownGeo,darkWood,9);butterflyWings.frustumCulled=false;butterflyBodies.frustumCulled=false;scene.add(butterflyWings,butterflyBodies);
 const butterflyFrame=new T.Object3D(),wingFrame=new T.Object3D();
 function pointCloud(count:number,size:number,color:string){const pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(rand()-.5)*32;pos[i*3+1]=rand()*15;pos[i*3+2]=(rand()-.5)*26;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({color,size,transparent:true,opacity:0,depthWrite:false});m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse, opacity ); diffuseColor.a *= 1.0-smoothstep(.2,.5,length(gl_PointCoord-.5));');};const p=new T.Points(geo,m);p.frustumCulled=false;scene.add(p);allGeometries.add(geo);allMaterials.add(m);return{p,pos,m};}
 const snow=pointCloud(mobile?450:800,.075,'#f4f7ef'),petals=pointCloud(100,.065,'#f6d5d2'),fireflies=pointCloud(45,.055,'#edffac'),stars=pointCloud(240,.17,'#dce8da');
 for(let i=0;i<240;i++){const a=TAU*rand(),r=65+rand()*30;stars.pos[i*3]=Math.cos(a)*r;stars.pos[i*3+1]=20+rand()*55;stars.pos[i*3+2]=Math.sin(a)*r;}stars.p.geometry.attributes.position.needsUpdate=true;
 const rainCount=mobile?420:850,rainPos=new Float32Array(rainCount*6);for(let i=0;i<rainCount;i++){const x=(rand()-.5)*32,y=rand()*17,z=(rand()-.5)*28;rainPos.set([x,y,z,x-.055,y-.55,z],i*6);}
 const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rainMat=new T.LineBasicMaterial({color:'#dae8df',transparent:true,opacity:0,depthWrite:false});const rainLines=new T.LineSegments(rainGeo,rainMat);rainLines.frustumCulled=false;scene.add(rainLines);allGeometries.add(rainGeo);allMaterials.add(rainMat);
 const sun=new T.Mesh(round,new T.MeshBasicMaterial({color:'#fff2c6',fog:false}));sun.scale.setScalar(2.4);scene.add(sun);allMaterials.add(sun.material);
 const moon=new T.Mesh(round,new T.MeshBasicMaterial({color:'#e1ecdb',fog:false}));moon.scale.setScalar(1.5);scene.add(moon);allMaterials.add(moon.material);
 const clouds=new T.Group();scene.add(clouds);const cloudMat=new T.MeshStandardMaterial({color:'#edf0db',roughness:1,transparent:true,opacity:.75,flatShading:true,depthWrite:false});allMaterials.add(cloudMat);
 for(let i=0;i<11;i++){const g=new T.Group();g.position.set((rand()-.5)*95,20+rand()*9,-15-rand()*50);for(let j=0;j<4;j++)mesh(g,round,cloudMat,[j*2,rand()*.7,rand()],[2.7,1,1.6]);clouds.add(g);}
 clouds.updateMatrixWorld(true);const cloudParts:T.BufferGeometry[]=[];clouds.traverse(o=>{if(o instanceof T.Mesh)cloudParts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));});const cloudGeo=mergeGeometries(cloudParts);cloudParts.forEach(g=>g.dispose());allGeometries.add(cloudGeo);clouds.clear();clouds.add(new T.Mesh(cloudGeo,cloudMat));
 // A thin snow layer appears on the roof as winter approaches.
 const snowRoof=new T.Group();scene.add(snowRoof);const snowCoverMat=mat('#e4eddf');for(const side of [-1,1]){const m=mesh(snowRoof,box,snowCoverMat,[0,4.81,-1.4+side*1.45],[7.15,.06,roofLen]);m.rotation.x=side*slope;}
 let hour=9,visualHour=9,season=0,speed=1,paused=false,weather:'auto'|'clear'|'rain'='auto',dayCount=0,rain=0,elapsed=0,disposed=false;
 const weights=[1,0,0,0];const leafColors=[new T.Color('#d78ba1'),new T.Color('#4d894e'),new T.Color('#d5972b'),new T.Color('#dfe5d3')];
 let audio:AudioContext|undefined,master:GainNode|undefined,soundEnabled=false;
 function setSound(enabled:boolean){soundEnabled=enabled;if(!enabled){master?.gain.setTargetAtTime(0,audio!.currentTime,.5);return;}if(!audio){audio=new AudioContext();master=audio.createGain();master.gain.value=0;master.connect(audio.destination);const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);const data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(rand()*2-1)*.025)/1.025;data[i]=brown*3;}const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=950;source.connect(filter);filter.connect(master);source.start();}audio.resume().catch(()=>{});master!.gain.setTargetAtTime(.27,audio.currentTime,1);}
 let previousTime=performance.now();let raf=0,lastPaint=0,lastState=-1,frame=0,fpsTotal=0,fpsCount=0,qualityReduced=false;
 const tempColor=new T.Color(),skyDay=new T.Color('#b5d3c8'),skyNight=new T.Color('#172d43'),skySunset=new T.Color('#d6ab8e'),skyRain=new T.Color('#839f9a');
 function animate(now:number){if(disposed)return;raf=requestAnimationFrame(animate);if(document.hidden)return;if(mobile&&now-lastPaint<31)return;lastPaint=now;const rawDelta=Math.max(.001,(now-previousTime)/1000),dt=Math.min(rawDelta,.07);previousTime=now;elapsed+=dt;frame++;
 if(!paused){hour+=dt*.1*speed;if(hour>=24){hour%=24;if(++dayCount>=3){dayCount=0;season=(season+1)%4;}}}
 const damp=1-Math.exp(-dt*1.3);for(let i=0;i<4;i++)weights[i]+=((i===season?1:0)-weights[i])*damp;
 const winter=weights[3],spring=weights[0],summer=weights[1],autumn=weights[2];
 const wantedRain=weather==='rain'?1:weather==='clear'?0:Math.max(winter*.85,clamp((Math.sin(elapsed*.009+dayCount*1.7)-.38)*2.1,0,1));rain+=(wantedRain-rain)*dt*.35;
 visualHour=(((visualHour+(((hour-visualHour+36)%24)-12)*(1-Math.exp(-dt*1.8)))%24)+24)%24;
 const elevation=Math.sin((visualHour-6)/24*TAU),day=clamp(elevation*2.5+.25,0,1),sunset=Math.max(0,1-Math.abs(elevation)*5)*day;
 tempColor.copy(skyNight).lerp(skyDay,day).lerp(skySunset,sunset*.6).lerp(skyRain,rain*day*.65);(scene.background as T.Color).lerp(tempColor,.045);(scene.fog as T.FogExp2).color.copy(scene.background as T.Color);(scene.fog as T.FogExp2).density=.017+rain*.009;
 hemi.intensity=.35+day*1.2;sunLight.intensity=(.14+day*2.15)*(1-rain*.68);sunLight.color.set('#fff2d4').lerp(new T.Color('#ffb36a'),sunset*.6);fill.intensity=.25+day*.3;lamp.intensity=(1-day)*5.5+winter*.8;lanternMat.emissiveIntensity=.25+(1-day)*2.4;renderer.toneMappingExposure=1.05+day*.06;
 const angle=(visualHour-6)/24*TAU;sun.position.set(Math.cos(angle)*-48,Math.sin(angle)*52,-42);moon.position.copy(sun.position).multiplyScalar(-1);moon.position.z=-48;sun.visible=elevation>-.13;moon.visible=elevation<.13;
 sunLight.position.set(-Math.cos(angle)*12,Math.max(3,Math.sin(angle)*19),8);
 cloudMat.color.copy(new T.Color('#607b85')).lerp(new T.Color('#eef0de'),day);cloudMat.opacity=.5+rain*.3;clouds.position.x=Math.sin(elapsed*.009)*9;
 groundMat.color.set('#ffffff').lerp(new T.Color('#d1dbe3'),winter*.85);plantMat.color.set('#6d9855').lerp(new T.Color('#b3995b'),autumn).lerp(new T.Color('#d7ded2'),winter);vegetationUniforms.time.value=elapsed;vegetationUniforms.rain.value=rain;vegetationUniforms.winter.value=winter;
 // Update instance transforms only every other frame to reduce CPU work.
 if(frame%2===0){for(let i=0;i<leafData.length;i++){const d=leafData[i],gust=Math.sin(elapsed*1.3+d.phase)*.045+Math.sin(elapsed*21+d.phase*8)*rain*.015;
 obj.position.copy(d.p);obj.position.x+=gust*(d.p.y-1);obj.position.z+=Math.cos(elapsed*.9+d.phase)*.045;obj.scale.copy(d.s).multiplyScalar(1-winter*.66);obj.rotation.set(gust,.1,Math.sin(elapsed+d.phase)*.07);obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);
 tempColor.setRGB(0,0,0);for(let s=0;s<4;s++)tempColor.add(leafColors[s].clone().multiplyScalar(weights[s]));tempColor.multiplyScalar(.84+(Math.sin(d.phase)+1)*.13);leaves.setColorAt(i,tempColor);
 obj.position.y+=.25;obj.scale.setScalar(spring*(.11+.07*Math.sin(d.phase)**2)+.00001);obj.scale.y*=.65;obj.updateMatrix();blossoms.setMatrixAt(i,obj.matrix);}
 leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor!.needsUpdate=true;blossoms.instanceMatrix.needsUpdate=true;
 for(let i=0;i<fruitData.length;i++){obj.position.copy(fruitData[i]);obj.scale.setScalar(.115*autumn+.00001);obj.rotation.set(0,0,0);obj.updateMatrix();fruit.setMatrixAt(i,obj.matrix);}fruit.instanceMatrix.needsUpdate=true;}
 for(let i=0;i<4;i++){seasonal[i].scale.setScalar(Math.max(.0001,weights[i]));seasonal[i].visible=weights[i]>.005;}flowers.visible=spring+summer>.05;flowers.scale.y=Math.max(.01,spring+summer);blossoms.visible=spring>.01;fruit.visible=autumn>.01;snowRoof.visible=winter>.15;snowCoverMat.transparent=true;snowCoverMat.opacity=winter;chime.rotation.z=Math.sin(elapsed*2)*(.09+rain*.12);
 cat.scale.y=1+Math.sin(elapsed*1.4)*.022;bunny.rotation.y=Math.sin(elapsed*.35)*.18;bunny.position.y=.12+Math.max(0,Math.sin(elapsed*.8)-.92)*.9;
 butterflyWings.visible=butterflyBodies.visible=spring>.02;
 for(let i=0;i<9;i++){butterflyFrame.position.set(Math.sin(elapsed*.3+i*2)*3.6-1,.7+Math.sin(elapsed*.9+i)*.25,2.5+Math.cos(elapsed*.4+i)*.8);butterflyFrame.rotation.set(0,elapsed*.3+i,0);butterflyFrame.scale.setScalar(spring);butterflyFrame.updateMatrix();for(let j=0;j<2;j++){const side=j?1:-1;wingFrame.position.set(side*.085,Math.abs(Math.sin(elapsed*15+i))*.035,0);wingFrame.rotation.set(0,side*.4,Math.sin(elapsed*15+i)*side*.85);wingFrame.scale.set(.09,.012,.09);wingFrame.updateMatrix();obj.matrix.multiplyMatrices(butterflyFrame.matrix,wingFrame.matrix);butterflyWings.setMatrixAt(i*2+j,obj.matrix);}wingFrame.position.set(0,0,0);wingFrame.rotation.set(0,0,0);wingFrame.scale.set(.015,.018,.07);wingFrame.updateMatrix();obj.matrix.multiplyMatrices(butterflyFrame.matrix,wingFrame.matrix);butterflyBodies.setMatrixAt(i,obj.matrix);}butterflyWings.instanceMatrix.needsUpdate=true;butterflyBodies.instanceMatrix.needsUpdate=true;
 koi.visible=winter<.6;for(let i=0;i<koi.children.length;i++){const x=Math.sin(elapsed*.12+i*1.3)*5;koi.children[i].position.set(x,-.25,river(x)+Math.cos(elapsed*.2+i)*.65);koi.children[i].rotation.y=Math.cos(elapsed*.12+i*1.3)>0?0:Math.PI;}
 waterMat.uniforms.time.value=elapsed;waterMat.uniforms.ice.value=winter;waterMat.uniforms.rain.value=rain*(1-winter);waterMat.uniforms.day.value=day;
 rainMat.opacity=rain*(1-winter)*.42;rainLines.visible=rainMat.opacity>.005;for(let i=0;i<rainCount;i++){const k=i*6;rainPos[k]-=dt*.8;rainPos[k+1]-=dt*13;if(rainPos[k+1]<0){rainPos[k+1]=15+rand()*2;rainPos[k]=(rand()-.5)*32;}rainPos[k+3]=rainPos[k]-.055;rainPos[k+4]=rainPos[k+1]-.55;}rainGeo.attributes.position.needsUpdate=true;
 snow.m.opacity=winter*rain*.9;snow.p.visible=snow.m.opacity>.01;for(let i=0;i<snow.pos.length/3;i++){const k=i*3;snow.pos[k]+=Math.sin(elapsed*.6+i)*dt*.3;snow.pos[k+1]-=dt*(.6+i%3*.18);if(snow.pos[k+1]<-.1)snow.pos[k+1]=14;}snow.p.geometry.attributes.position.needsUpdate=true;
 petals.m.opacity=spring*.7+autumn*.9;petals.m.color.set('#f5d4d1').lerp(new T.Color('#ce963b'),autumn);petals.p.visible=petals.m.opacity>.02;for(let i=0;i<100;i++){const k=i*3;petals.pos[k]=Math.sin(elapsed*.16+i)*5.2;petals.pos[k+1]=((i*.713-elapsed*.27)%6+6)%6;petals.pos[k+2]=Math.cos(i*2.4+elapsed*.05)*3;}petals.p.geometry.attributes.position.needsUpdate=true;
 fireflies.m.opacity=summer*(1-day)*(.65+Math.sin(elapsed*2)*.2);fireflies.p.visible=fireflies.m.opacity>.01;for(let i=0;i<45;i++){const k=i*3;fireflies.pos[k]=Math.sin(i*1.8+elapsed*.17)*6;fireflies.pos[k+1]=.5+(Math.sin(i+elapsed*.6)+1)*.7;fireflies.pos[k+2]=Math.cos(i*3.4+elapsed*.12)*5;}fireflies.p.geometry.attributes.position.needsUpdate=true;stars.m.opacity=(1-day)*(1-rain)*.8;
 if(soundEnabled&&master&&audio)master.gain.setTargetAtTime(.22+rain*.13,audio.currentTime,.7);
 controls.target.x=clamp(controls.target.x,-12,12);controls.target.z=clamp(controls.target.z,-10,10);controls.target.y=clamp(controls.target.y,.2,7);controls.update();renderer.render(scene,camera);
 if(elapsed-lastState>.3){onState({season,hour,rain});lastState=elapsed;renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);renderer.domElement.dataset.fps=String(Math.round(1/rawDelta));}
 if(!qualityReduced&&elapsed>4){fpsTotal+=rawDelta;fpsCount++;if(fpsCount>60&&fpsTotal/fpsCount>.043){renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;qualityReduced=true;}}
 }
 const visibility=()=>{previousTime=performance.now();if(document.hidden)audio?.suspend().catch(()=>{});else if(soundEnabled)audio?.resume().catch(()=>{});};document.addEventListener('visibilitychange',visibility);
 const contextLost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);onFailure?.('图形渲染暂时中断，重新打开即可回到庭院。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
 raf=requestAnimationFrame(animate);
 return {setSeason(s){season=clamp(Math.round(s),0,3);dayCount=0;onState({season,hour,rain});},setHour(h){hour=clamp(h,0,23.99);},setPaused(p){paused=p;},setSpeed(s){speed=s;},setWeather(w){weather=w;},setSound,resetView,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',contextLost);controls.dispose();audio?.close().catch(()=>{});scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points||o instanceof T.LineSegments){allGeometries.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>allMaterials.add(m));}});allGeometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}

