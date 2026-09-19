import * as T from 'three';
import { COURT,riverCenter,insideMeadow,meadowGeometry,gentleGust } from './layout-v3';
import { createDetails } from './details-v3';
import { roofSnowGeometry } from './snow-v3';
import { TapGesture, CatVoice } from './interactions-v3';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { curvedBranch, clearsRoof, botanicalDisc, softCushion, riverRock, sealedGable, landscapePainting } from './forms-v3';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type GardenState = { season: number; hour: number; rain: number };
export type GardenAPI = { setSeason: (s:number)=>void; setHour:(h:number)=>void; setPaused:(p:boolean)=>void; setSpeed:(s:number)=>void; setWeather:(w:'clear'|'rain')=>void; setSound:(s:boolean)=>void; resetView:()=>void; dispose:()=>void };
const TAU=Math.PI*2;
function random(seed=19){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const clamp=T.MathUtils.clamp;

export function createGarden(host:HTMLDivElement,onState:(s:GardenState)=>void,onFailure?:(message:string)=>void):GardenAPI {
 const rand=random(), mobile=matchMedia('(pointer: coarse)').matches;
 const scene=new T.Scene();scene.background=new T.Color('#b5d3c8');scene.fog=new T.Fog('#c9cebf',32,95);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.25;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(38,1,.2,230), controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=8;controls.maxDistance=60;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.18;controls.enablePan=true;controls.panSpeed=.7;controls.zoomSpeed=.65;controls.target.set(0,1.8,0);
 controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
 let previousAspect=0;
 function resetView(){const aspect=host.clientWidth/host.clientHeight;const framing=aspect<.8?2.05:aspect<1.35?1.30:1;camera.position.set(12.8,10.8,18).multiplyScalar(framing);controls.target.set(0,2.05,0);controls.update();}
 const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.fov=camera.aspect<.8?46:38;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);if(previousAspect&&(previousAspect<1)!==(camera.aspect<1))resetView();previousAspect=camera.aspect;};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();resetView();
 const hemi=new T.HemisphereLight('#e3e9e9','#8e8978',2.2);scene.add(hemi);
 const sunLight=new T.DirectionalLight('#fff0c9',3.2);sunLight.position.set(-9,18,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sunLight.shadow.camera.left=-14;sunLight.shadow.camera.right=14;sunLight.shadow.camera.top=14;sunLight.shadow.camera.bottom=-14;sunLight.shadow.radius=3;sunLight.shadow.normalBias=.035;sunLight.shadow.bias=-.0002;scene.add(sunLight);
 const fill=new T.DirectionalLight('#cfdbdf',.6);fill.position.set(10,8,-8);scene.add(fill);
 const lamp=new T.PointLight('#ffc46e',0,12,1.5);lamp.position.set(.3,2,-1.2);scene.add(lamp);
 const materials=new Map<string,T.MeshStandardMaterial>(),batches=new Map<T.Material,T.BufferGeometry[]>();
 const allGeometries=new Set<T.BufferGeometry>(),allMaterials=new Set<T.Material>();
 function mat(color:string,roughness=.95){const key=color+roughness;let m=materials.get(key);if(!m){m=new T.MeshStandardMaterial({color,roughness,flatShading:false});materials.set(key,m);allMaterials.add(m);}return m;}
 const wood=mat('#95704c'),woodLight=mat('#bd9467'),darkWood=mat('#675039'),plaster=mat('#ecdeb8'),roofMat=mat('#7b8981'),roofEdge=mat('#526860'),stone=mat('#8c9a87'),stoneLight=mat('#b8b9a0'),grassMat=mat('#91ad69');
 const obj=new T.Object3D();
 const localAir={airColor:{value:new T.Color('#c9cebf')},airAmount:{value:.065}};
 function softenAir(m:T.MeshStandardMaterial){
   m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,localAir);shader.fragmentShader='uniform vec3 airColor; uniform float airAmount;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\n gl_FragColor.rgb=mix(gl_FragColor.rgb,airColor,airAmount);');};
 }

 function batch(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();const geo=g.clone().applyMatrix4(obj.matrix);if(geo.index){const n=geo.toNonIndexed();geo.dispose();if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(n);}else{if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(geo);}}
 const box=new RoundedBoxGeometry(1,1,1,1,.025),sphere=new T.SphereGeometry(1,12,8),round=new T.SphereGeometry(1,24,16),cylinder=new T.CylinderGeometry(1,1,1,16),cone=new T.ConeGeometry(1,1,20);
 [box,sphere,round,cylinder,cone].forEach(g=>allGeometries.add(g));
 function cube(m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0){batch(box,m,x,y,z,sx,sy,sz,rx,ry,rz);}
 function ball(m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){batch(sphere,m,x,y,z,sx,sy,sz);}
 function beam(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const d=b.clone().sub(a);obj.position.copy(a).add(b).multiplyScalar(.5);obj.scale.set(r,d.length(),r);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());obj.updateMatrix();const g=cylinder.clone().applyMatrix4(obj.matrix).toNonIndexed();if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(g);}
 function flush(){const colored:T.BufferGeometry[]=[];for(const [m,gs]of batches){if(m instanceof T.MeshStandardMaterial&&m.emissive.getHex()===0){for(const g of gs){const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=m.color.r;colors[i+1]=m.color.g;colors[i+2]=m.color.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));colored.push(g);}}else{const geometry=mergeGeometries(gs);gs.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);allGeometries.add(geometry);}}if(colored.length){const geometry=mergeGeometries(colored);colored.forEach(g=>g.dispose());const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:false});allMaterials.add(m);softenAir(m);allGeometries.add(geometry);const mesh=new T.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}batches.clear();}
 const river=riverCenter;
 function height(x:number,z:number){const d=Math.abs(z-river(x));const hills=(Math.sin(x*.17)*Math.cos(z*.14)*.8+Math.sin(z*.31+x*.15)*.24)*Math.min(1,Math.max(0,Math.hypot(x,z)-10)/18);return d<1.5?-.65+Math.pow(d/1.5,4)*.65: hills;}
 function habitat(x:number,z:number){
   const bank=Math.abs(z-river(x)),wet=1-clamp((bank-1.55)/1.35,0,1);
   const trodden=Math.exp(-Math.pow(x/1.15,2)-Math.pow((z-4.08)/.52,2));
   const path=z>3.82&&z<river(x)-1.6?Math.exp(-Math.pow((x-Math.sin((z-3.8)*1.8)*.3)/.55,2)):0;
   const inHouse=Math.abs(x)<3.16&&z>-4.12&&z<COURT.deckFront;
   const steps=Math.abs(x)<1.43&&z>2.5&&z<3.84;
   const obstacle=[[-COURT.potX,COURT.potZ,.39],[COURT.potX,COURT.potZ,.39],[-COURT.lampX,COURT.lampZ,.42],[COURT.lampX,COURT.lampZ,.42],[-4.8,-1.45,.40],[4.7,-3.15,.36]].some(([a,b,r])=>Math.hypot(x-a,z-b)<r);
   return {wet,trodden,path,allowed:insideMeadow(x,z,.12)&&bank>1.57&&!inHouse&&!steps&&!obstacle,density:(1-wet*.72)*(1-path*.78)*(1-trodden*.36)};
 }
 // A continuous landscape, carved down along the stream; no floating diorama edges.
 const groundGeo=meadowGeometry(height);
 const gp=groundGeo.attributes.position;const gc=[];
 for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setXYZ(i,x,height(x,z),z);const col=new T.Color('#a7b491').lerp(new T.Color('#b8bd96'),rand()*.5);const soil=habitat(x,z);col.lerp(new T.Color('#879e8c'),soil.wet*.45).lerp(new T.Color('#bfc6a4'),soil.trodden*.75);gc.push(col.r,col.g,col.b);}
 groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundGeo.computeVertexNormals();const groundMat=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,flatShading:false});const ground=new T.Mesh(groundGeo,groundMat);ground.receiveShadow=true;scene.add(ground);allGeometries.add(groundGeo);allMaterials.add(groundMat);
 // A shallow earth edge finishes the finite garden; no distant landscape or trees.
 const edgePos:number[]=[],edgeUv:number[]=[],edgeIndex:number[]=[];
 for(let i=0;i<=144;i++){const a=i/144*TAU,x=Math.cos(a)*14,z=Math.sin(a)*13,y=height(x,z);edgePos.push(x,y,z,x,-1.05,z);edgeUv.push(i/144,1,i/144,0);if(i<144){const n=i*2;edgeIndex.push(n,n+2,n+1,n+2,n+3,n+1);}}
 const edgeGeo=new T.BufferGeometry();edgeGeo.setAttribute('position',new T.Float32BufferAttribute(edgePos,3));edgeGeo.setAttribute('uv',new T.Float32BufferAttribute(edgeUv,2));edgeGeo.setIndex(edgeIndex);edgeGeo.computeVertexNormals();allGeometries.add(edgeGeo);scene.add(new T.Mesh(edgeGeo,mat('#91a080')));
 // Raised timber house: completely open frontage and furnished interior.
 for(const x of [-2.85,0,2.85])for(const z of [-3.7,.9]){cube(darkWood,x,.28,z,.22,.85,.22);ball(stone,x,-.02,z,.33,.16,.29);}
 cube(wood,0,.5,-.775,6.3,.27,6.65);
 for(let i=0;i<25;i++)cube(i%3===0?woodLight:mat('#ae875b'),-3+i*.25,.66,-.775,.235,.085,6.48);
 cube(wood,0,.23,COURT.upperStepZ,COURT.stepWidth,.46,COURT.stepDepth);
 cube(wood,0,.115,COURT.lowerStepZ,COURT.stepWidth,.23,COURT.stepDepth);
 for(let j=0;j<11;j++){cube(woodLight,-1.27+j*.254,.466,COURT.upperStepZ,.244,.012,.64);cube(woodLight,-1.27+j*.254,.236,COURT.lowerStepZ,.244,.012,.64);}
 for(const x of [-2.86,2.86])cube(darkWood,x,.27,2.30,.19,.73,.19);
 // Continuous plaster enclosure, timber wainscot and overlapping wall plates.
 cube(plaster,0,2.35,-3.90,5.88,3.28,.18);
 for(const x of [-2.96,2.96]){
   // End caps are recessed into the corner posts, with no coincident plaster/timber faces.
   cube(plaster,x,2.35,-1.4,.20,3.28,4.90);
   cube(wood,x,1.13,-1.4,.23,.83,4.86);
   for(let j=0;j<16;j++)cube(j%3?wood:woodLight,Math.sign(x)*3.098,1.13,-3.68+j*.30,.024,.8,.018);
   cube(darkWood,x,1.57,-1.4,.25,.065,4.88);
   cube(darkWood,x,3.92,-1.4,.26,.28,5.45);
 }
 for(const x of [-3,3])for(const z of [-3.95,1.15])cube(darkWood,x,2.36,z,.29,3.5,.29);
 for(const z of [-4.01,1.17]){cube(darkWood,0,3.98,z,6.6,.26,.27);if(z<0)cube(wood,0,.81,z,6,.10,.17);}
 // Sliding door leaves are rendered as moving groups in createDetails.
 for(const z of [1.10,1.23])cube(woodLight,0,.724,z,6,.025,.027);
 // A few understated grain seams on the wooden lintel and veranda.
 for(let i=0;i<9;i++)cube(mat('#a38159'),-2.7+i*.67,.707,-.05,.009,.003,2.3);
 // Roof with individually articulated glazed tile ribs and lifted eaves.
 const slope=Math.atan2(1.5,2.9), roofLen=Math.hypot(1.5,2.9);
 for(const side of [-1,1]){cube(roofMat,0,4.65,-1.4+side*1.45,7.15,.17,roofLen,side*slope);for(let i=0;i<39;i++){const x=-3.55+i*.186;cube(i%4?roofMat:mat('#929c91'),x,4.77,-1.4+side*1.45,.075,.085,roofLen+.07,side*slope);}cube(roofEdge,0,3.93,-1.4+side*2.97,7.45,.19,.16);for(let j=0;j<8;j++){const f=j/8;cube(mat('#6d7c70'),0,5.46-f*1.5,-1.4+side*f*2.9,7.15,.038,.045);}}
 cube(roofEdge,0,5.49,-1.4,7.4,.22,.25);for(const x of [-3.62,3.62]){ball(roofEdge,x,5.53,-1.4,.21,.15,.19);for(const side of [-1,1])cube(darkWood,x,4.57,-1.4+side*1.46,.13,.15,roofLen+.2,side*slope);}
 // Solid gables join the wall plates to the roof, including the roof's full pitch.
 const gable=sealedGable();allGeometries.add(gable);
 for(const x of [-3.06,2.86])batch(gable,plaster,x,0,-1.4);
 for(const x of [-3.08,3.08]){
   cube(wood,x,4.14,-1.4,.10,.09,5.15);
   cube(wood,x,4.7,-1.4,.11,1.25,.10);
   for(const side of [-1,1])beam(new T.Vector3(x,4.11,-1.4+side*2.56),new T.Vector3(x,5.37,-1.4),.055,wood);
 }
 // Continuous wooden floor and a low game table for two.
 cube(woodLight,0,1.17,-1.30,2.3,.15,1.80);
 cube(wood,0,1.071,-1.30,2.10,.10,1.58);
 for(const x of [-.94,.94])for(const z of [-2,-.60])cube(wood,x,.91,z,.115,.42,.115);
 const cushion=softCushion();allGeometries.add(cushion);
 for(const x of [-1.73,1.73]){
   batch(cushion,mat('#899d96'),x,.818,-1.30,.47,.115,.45,0,x<0?.055:-.04);
   // Recessed central button and four lightly gathered stitches.
   ball(mat('#7b9189'),x,.922,-1.30,.021,.006,.02);
   for(let j=0;j<4;j++){const a=j*Math.PI/2+.3;beam(new T.Vector3(x+Math.cos(a)*.09, .922,-1.30+Math.sin(a)*.09),new T.Vector3(x+Math.cos(a)*.16,.919,-1.30+Math.sin(a)*.16),.003,mat('#b7c0ad'));}
 }
 const ceramic=mat('#678e86');
 const cupGeo=new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.047,0),new T.Vector2(.071,.087),new T.Vector2(.057,.087),new T.Vector2(.037,.02),new T.Vector2(0,.02)],20);allGeometries.add(cupGeo);
 // Cabinet, a small framed photograph, a cup and a ceramic jar.
 cube(wood,2.12,1.3,-3.43,1.24,1.1,.63);
 for(let j=0;j<3;j++){cube(woodLight,2.12,.93+j*.34,-3.10,1.09,.28,.035);for(const x of [1.83,2.41])ball(darkWood,x,.94+j*.34,-3.067,.025);}
 cube(darkWood,1.88,2.08,-3.39,.30,.40,.04,0,0,-.06);
 cube(mat('#d9ccb1'),1.88,2.08,-3.36,.245,.33,.009,0,0,-.06);
 ball(mat('#899887'),1.86,2.07,-3.35,.065,.075,.007);ball(mat('#b89677'),1.91,2.17,-3.35,.031,.033,.008);
 batch(cupGeo,mat('#d7c6a2'),2.42,1.852,-3.26,1.2,1.2,1.2);
 ball(ceramic,2.25,1.98,-3.6,.095,.125,.095);batch(cylinder,woodLight,2.25,2.105,-3.6,.055,.022,.055);
 // Open bookshelf: unequal heights, leaning spines, horizontal piles and keepsakes.
 cube(wood,-2.1,1.66,-3.65,1.32,1.85,.12);
 for(const x of [-2.73,-1.47])cube(wood,x,1.66,-3.40,.09,1.85,.55);
 for(const y of [.78,1.38,1.98,2.58])cube(woodLight,-2.1,y,-3.38,1.34,.065,.58);
 const bookColors=['#758b82','#b59b70','#ae7e63','#8997a1','#c7b991'];
 for(let row=0;row<3;row++){
   const base=.816+row*.6;let x=-2.61;
   for(let i=0;i<(row===1?3:5);i++){
     const width=.075+rand()*.065,h=.27+rand()*.19,tilt=i===3?.13:(rand()-.5)*.07;
     cube(mat(bookColors[(i+row*2)%5]),x+width/2,base+h/2,-3.34,width,h,.32,0,0,tilt);
     cube(mat('#dfd1ac'),x+width/2,base+h*.74,-3.171,width*.7,.013,.003,0,0,tilt);
     x+=width+.025;
   }
   if(row===0)for(let j=0;j<3;j++){cube(mat(bookColors[j]),-1.7,base+.025+j*.052,-3.34,.30,.044,.33,0,(j-1)*.09);}
   if(row===1){ball(ceramic,-1.81,base+.14,-3.35,.11,.14,.10);batch(cylinder,ceramic,-1.81,base+.27,-3.35,.055,.035,.055);beam(new T.Vector3(-1.81,base+.26,-3.35),new T.Vector3(-1.86,base+.45,-3.34),.006,wood);}
   if(row===2){ball(mat('#c8b28f'),-1.69,base+.08,-3.34,.10,.075,.075);ball(mat('#c8b28f'),-1.65,base+.16,-3.34,.055,.055,.05);}
 }
 // A restrained landscape print in a thin timber frame, painted procedurally.
 cube(wood,0,2.82,-3.79,1.45,1.10,.065);
 cube(mat('#e9dfc4'),0,2.82,-3.751,1.32,.97,.025);
 const paintingTexture=landscapePainting(),paintingGeo=new T.PlaneGeometry(1.18,.86);
 allGeometries.add(paintingGeo);const paintingMat=new T.MeshStandardMaterial({map:paintingTexture,roughness:1});allMaterials.add(paintingMat);
 softenAir(paintingMat);const painting=new T.Mesh(paintingGeo,paintingMat);painting.position.set(0,2.82,-3.731);scene.add(painting);
 beam(new T.Vector3(.4,3.8,-1.3),new T.Vector3(.4,3.3,-1.3),.018,darkWood);
 const lanternMat=new T.MeshStandardMaterial({color:'#fce3a3',emissive:'#ffc465',emissiveIntensity:.3,roughness:1});allMaterials.add(lanternMat);
 const lanterns:{bulb:T.Mesh;material:T.MeshStandardMaterial;light:T.PointLight;manual:boolean|null}[]=[];
 function addLantern(geo:T.BufferGeometry,x:number,y:number,z:number,sx:number,sy:number,sz:number,indoor=false){
   const material=lanternMat.clone();allMaterials.add(material);
   const bulb=new T.Mesh(geo,material);bulb.position.set(x,y,z);bulb.scale.set(sx,sy,sz);scene.add(bulb);
   const light=indoor?lamp:new T.PointLight('#ffd599',0,5,2);if(!indoor){light.position.set(x,y,z);scene.add(light);}
   lanterns.push({bulb,material,light,manual:null});
 }
 addLantern(round,.4,3.1,-1.3,.28,.28,.28,true);batch(cylinder,wood,.4,2.84,-1.3,.14,.05,.14);
 // Unequal river-worn granite stones, with no artificial green caps.
 const rockFootprints:{x:number;z:number;rx:number;rz:number}[]=[];
 const rockGeos=[riverRock(2),riverRock(5),riverRock(9)];rockGeos.forEach(g=>allGeometries.add(g));
 for(let i=0;i<85;i++){
   const x=(rand()-.5)*26,z=river(x)+(i%2?1:-1)*(1.58+rand()*.55),rx=.24+rand()*.35,ry=.16+rand()*.16,rz=.21+rand()*.3;if(!insideMeadow(x,z,.6))continue;
   batch(rockGeos[i%3],mat(['#a1a299','#bbb9aa','#93978f','#aca89c'][i%4]),x,height(x,z)-ry*.25,z,rx,ry,rz,0,rand()*TAU,(rand()-.5)*.12);
   rockFootprints.push({x,z,rx:rx*.66,rz:rz*.66});
 }
 for(let i=0;i<5;i++){const x=Math.sin(i*.8)*.25,z=4.10+i*.35;if(z<river(x)-1.7)batch(rockGeos[i%3],stoneLight,x,.008,z,.30,.07,.23,0,i*.7);}
 // Stone lanterns frame the front planting.
 for(const x of [-COURT.lampX,COURT.lampX]){const z=COURT.lampZ;batch(cylinder,stone,x,.14,z,.36,.26,.36);batch(cylinder,stone,x,.57,z,.16,.7,.16);cube(stone,x,.95,z,.52,.15,.52);addLantern(box,x,1.14,z,.24,.26,.24);for(const a of [-1,1])for(const b of [-1,1])cube(stone,x+a*.19,1.15,z+b*.19,.065,.35,.065);batch(cone,stone,x,1.45,z,.54,.35,.54);ball(stone,x,1.65,z,.085);}
 // Clay containers sit in front of the veranda; their seasonal woody plants are separate.
 const planter=new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.28,0),new T.Vector2(.38,.53),new T.Vector2(.40,.55),new T.Vector2(.40,.60),new T.Vector2(.34,.60),new T.Vector2(.33,.54),new T.Vector2(.22,.06),new T.Vector2(0,.06)],24);allGeometries.add(planter);
 for(const x of [-COURT.potX,COURT.potX]){batch(planter,mat('#ad8066'),x,.015,COURT.potZ);batch(cylinder,mat('#6d6450'),x,.54,COURT.potZ,.335,.02,.335);}
 // V2 trees: curved, tapered limbs and a quiet crown of thin botanical surfaces.
 const leafData:{p:T.Vector3;s:T.Vector3;phase:number;tree:number;rotation:T.Euler}[]=[];
 const blossomData:{p:T.Vector3;rotation:T.Euler;size:number;tree:number}[]=[];
 const fruitData:T.Vector3[]=[];
 const crownClusters:{p:T.Vector3;tree:number}[]=[];
 function branch(points:T.Vector3[],r:number,tip=.006){const g=curvedBranch(points,r,tip);allGeometries.add(g);batch(g,wood);}
 for(let k=0;k<2;k++){
   const x=k===0?-4.8:4.7,z=k===0?-1.45:-3.15,h=k===0?7.65:6.95;
   const root=new T.Vector3(x,0,z),fork=new T.Vector3(x+(k===0?.16:-.15),h*.48,z-.15);
   branch([root,new T.Vector3(x-.13,h*.19,z+.12),fork,new T.Vector3(x+.28,h*.92,z-.1)],k===0?.46:.40,.035);
   for(let n=0;n<7;n++){const a=n*TAU/7;branch([new T.Vector3(x+Math.cos(a)*1.12,.035,z+Math.sin(a)*.92),new T.Vector3(x+Math.cos(a)*.3,.14,z+Math.sin(a)*.28),new T.Vector3(x,.55,z)],.024,.22);}
   for(let j=0;j<15;j++){
     const a=j*2.399,spread=.75+(j%5)*.49,cx=x+Math.cos(a)*spread,cz=z+Math.sin(a)*spread*.85,cy=h-1.05+Math.sin(j*1.7)*.65+(j%3)*.28;
     const end=new T.Vector3(cx,cy,cz);
     if(Math.abs(cx)<4.05&&cz>-4.9&&cz<2.05)end.y=Math.max(end.y,6.15);
     crownClusters.push({p:end.clone(),tree:k});
     const mid=fork.clone().lerp(end,.3);mid.y=Math.max(end.y-.3,mid.y);
     branch([fork.clone().add(new T.Vector3(0,(j%3)*.16,0)),mid,end],.155-j*.005,.009);
     for(let q=0;q<3;q++){const twig=end.clone().add(new T.Vector3(Math.cos(q*2.4)*.53,.23+q*.13,Math.sin(q*2.4)*.46));if(clearsRoof(twig,.35))branch([mid.clone().lerp(end,.65),end,twig],.025,.003);}
     const count=mobile?185:270;
     for(let n=0;n<count;n++){
       const u=rand()*TAU,v=Math.acos(2*rand()-1),r=Math.pow(rand(),.4);
       const p=new T.Vector3(cx+Math.cos(u)*Math.sin(v)*r*1.46,end.y+Math.cos(v)*r*.72,cz+Math.sin(u)*Math.sin(v)*r*1.25);
       if(!clearsRoof(p,.37))continue;
       const rot=new T.Euler(-1.1+rand()*.8,(rand()-.5)*.8,rand()*TAU);
       leafData.push({p,s:new T.Vector3(.20+rand()*.055,.24+rand()*.07,.16),phase:rand()*TAU,tree:k,rotation:rot});
       {const bp=p.clone().add(new T.Vector3(0,.075,0));if(clearsRoof(bp,.25))blossomData.push({p:bp,rotation:new T.Euler(-Math.PI/2+(rand()-.5)*1.15,(rand()-.5)*.85,rand()*TAU),size:.16+rand()*.055,tree:k});}
       if(n===17||n===81){const fp=p.clone().add(new T.Vector3(0,-.2,0));if(clearsRoof(fp,.18))fruitData.push(fp);}
     }
   }
 }
 host.dataset.foliageClearance=String(leafData.every(d=>clearsRoof(d.p,.37))&&blossomData.every(d=>clearsRoof(d.p,.25)));
 const leafMat=new T.MeshStandardMaterial({color:'#ffffff',roughness:.9,side:T.DoubleSide});allMaterials.add(leafMat);
 const crownGeo=botanicalDisc(),bloomGeo=botanicalDisc(true);allGeometries.add(crownGeo);allGeometries.add(bloomGeo);
 const leaves=new T.InstancedMesh(crownGeo,leafMat,leafData.length);leaves.castShadow=true;leaves.receiveShadow=true;leaves.frustumCulled=false;scene.add(leaves);
 const blossomMat=new T.MeshStandardMaterial({color:'#fff0e6',emissive:'#ad877e',emissiveIntensity:.16,roughness:.95,side:T.DoubleSide});allMaterials.add(blossomMat);
 const blossoms=new T.InstancedMesh(bloomGeo,blossomMat,blossomData.length);blossoms.castShadow=true;blossoms.receiveShadow=true;blossoms.frustumCulled=false;scene.add(blossoms);
 const fruitMat=mat('#c78739'),fruit=new T.InstancedMesh(sphere,fruitMat,fruitData.length);fruit.frustumCulled=false;fruit.castShadow=true;scene.add(fruit);
 // All leaves on a branch share the same small displacement, entirely on the GPU.
 const touchPlant={plantOrigin:{value:new T.Vector3(100,100,100)},plantTime:{value:-100}};
 const crownMotion={time:{value:0},wet:{value:0},treePulse:{value:new T.Vector2()},...touchPlant};
 for(const material of [leafMat,blossomMat,fruitMat]){
   material.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,crownMotion);
     shader.vertexShader='uniform float time; uniform float wet; uniform vec2 treePulse; uniform vec3 plantOrigin; uniform float plantTime;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition=vec4(transformed,1.0);
       #ifdef USE_INSTANCING
         mvPosition=instanceMatrix*mvPosition;
         float side=step(0.0,mvPosition.x);
         mvPosition.x+=sin(time*.48+side*1.4)*.018 + sin(time*2.2+side)*wet*.006;
         mvPosition.z+=sin(time*.38+side)*.009;
         float treeResponse=mix(treePulse.x,treePulse.y,side)*smoothstep(3.5,5.5,mvPosition.y);
         float localAge=max(0.,time-plantTime),localDistance=length(mvPosition.xyz-plantOrigin);
         float localResponse=sin(min(localAge/3.6,1.)*3.14159)*exp(-localAge*.42-localDistance*localDistance*.7);
         mvPosition.x+=treeResponse*.045+localResponse*.025;
         mvPosition.z+=treeResponse*.018+localResponse*.012;
       #endif
       mvPosition=modelViewMatrix*mvPosition;
       gl_Position=projectionMatrix*mvPosition;`);
   };
 }
 
 // A continuous, root-anchored meadow. One instanced draw, broad coherent wind waves.
 const vegetationUniforms={time:{value:0},rain:{value:0},winter:{value:0},...touchPlant};
 groundMat.onBeforeCompile=shader=>{shader.uniforms.winter=vegetationUniforms.winter;shader.fragmentShader='uniform float winter;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.84,.81),winter*.96);');};
 const plantMat=new T.MeshStandardMaterial({color:'#89996b',side:T.DoubleSide,roughness:1});allMaterials.add(plantMat);
 plantMat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,vegetationUniforms);
   shader.vertexShader='uniform float time; uniform float rain; uniform float winter; uniform vec3 plantOrigin; uniform float plantTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     vec3 root=instanceMatrix[3].xyz;
     float wave=sin(root.x*.62+root.z*.37-time*.9)*.052+sin(root.z*.93-root.x*.21-time*.63)*.025;
     float age=max(0.,time-plantTime),distance=length(root.xz-plantOrigin.xz);
     float passing=max(0.,age-distance*.13);
     wave+=sin(min(passing/3.6,1.)*3.14159)*exp(-passing*.42-distance*distance*.5)*.055;
     float bend=position.y*position.y*clamp(instanceMatrix[1][1]*4.,.15,1.);
     transformed.x+=(wave+rain*sin(time*2.1+root.x*.6)*.008)*bend;
     transformed.z+=cos(root.x*.3+root.z*.42-time*.7)*.025*bend;
     transformed.y*=1.0-winter*.84;`);
 };
 const bladeGeo=new T.BufferGeometry();
 bladeGeo.setAttribute('position',new T.Float32BufferAttribute([-.045,0,0,.045,0,0,-.036,.45,.018,.036,.45,.018,-.018,.78,.045,.018,.78,.045,0,1,.09],3));
 bladeGeo.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);bladeGeo.computeVertexNormals();allGeometries.add(bladeGeo);
 const grassCount=mobile?18000:30000,meadow=new T.InstancedMesh(bladeGeo,plantMat,grassCount),flowerPoints:T.Vector3[]=[];
 let planted=0;const meadowColor=new T.Color();
 for(let i=0;i<grassCount*2&&planted<grassCount;i++){
   const x=(rand()-.5)*27,z=(rand()-.5)*24,d=Math.abs(z-river(x));
   const terrain=habitat(x,z);
   if(!terrain.allowed||rand()>terrain.density||rockFootprints.some(r=>Math.pow((x-r.x)/r.rx,2)+Math.pow((z-r.z)/r.rz,2)<1))continue;
   const edge=clamp((1-Math.hypot(x/14,z/13))*5,0,1);if(rand()>edge)continue;
   const y=height(x,z),rim=Math.abs(x)<3.3&&z>-4.3&&z<2.8;
   const h=(.18+rand()*.14+(Math.sin(x*.6+z*.4)+1)*.035)*(.3+edge*.7)*(1-terrain.trodden*.82)*(1-terrain.path*.65)*(rim?.65:1);
   obj.position.set(x,y,z);obj.rotation.set(0,rand()*TAU,0);obj.scale.set(1.15+rand()*.45,h,1);obj.updateMatrix();meadow.setMatrixAt(planted,obj.matrix);
   meadowColor.set('#d3dec0').lerp(new T.Color('#afc29b'),rand()*.65).lerp(new T.Color('#93b4a3'),terrain.wet*.6).lerp(new T.Color('#e0dec0'),terrain.trodden*.8);meadow.setColorAt(planted,meadowColor);planted++;
   if(planted%107===0&&Math.hypot(x,z)<11)flowerPoints.push(new T.Vector3(x,y+h*.95,z));
 }
 meadow.count=planted;meadow.receiveShadow=true;meadow.frustumCulled=false;scene.add(meadow);host.dataset.grassBlades=String(planted);
 const flowerMaterial=mat('#f4e5bd');flowerMaterial.onBeforeCompile=leafMat.onBeforeCompile;
 const flowers=new T.InstancedMesh(bloomGeo,flowerMaterial,flowerPoints.length);scene.add(flowers);
 for(let i=0;i<flowerPoints.length;i++){obj.position.copy(flowerPoints[i]);obj.scale.setScalar(.052);obj.rotation.set(-Math.PI/2,.1,i*2.4);obj.updateMatrix();flowers.setMatrixAt(i,obj.matrix);flowers.setColorAt(i,new T.Color(i%3?'#fff2c6':'#d9a4a3'));}
 // Broad ferns beside the stream.
 for(let i=0;i<20;i++){const x=(rand()-.5)*19,z=river(x)-1.8-rand()*.5;if(!insideMeadow(x,z,.6))continue;for(let j=0;j<7;j++){const a=j*TAU/7;beam(new T.Vector3(x,0,z),new T.Vector3(x+Math.cos(a)*.45,.3,z+Math.sin(a)*.45),.012,mat('#527b51'));for(let n=1;n<5;n++){const t=n/5;batch(crownGeo,mat('#668d57'),x+Math.cos(a)*t*.45,.15+Math.sin(t*Math.PI)*.17,z+Math.sin(a)*t*.45,.11*(1-t*.5),.12,.09,-1.15,0,a);}}}
 // The display table is separate from the rail, cushions and tea table.
 const displayTop=.996,displayAnchor=new T.Vector3(-1.62,displayTop,.43);
 cube(woodLight,-1.62,.93,.43,.96,.12,.68);
 for(const x of [-1.98,-1.26])for(const z of [.2,.66])cube(wood,x,.805,z,.055,.19,.055);
 const seasonal:T.Group[]=[];for(let i=0;i<4;i++){const g=new T.Group();g.position.copy(displayAnchor);g.visible=i===0;scene.add(g);seasonal.push(g);}
 function mesh(g:T.Group,geo:T.BufferGeometry,m:T.Material,p:number[],s:number[]){const o=new T.Mesh(geo,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 function tube(g:T.Group,points:T.Vector3[],r:number,m:T.Material,tip=r){const geo=curvedBranch(points,r,tip,18);allGeometries.add(geo);return mesh(g,geo,m,[0,0,0],[1,1,1]);}
 function lathe(profile:number[][]){const g=new T.LatheGeometry(profile.map(p=>new T.Vector2(p[0],p[1])),24);allGeometries.add(g);return g;}
 function ring(g:T.Group,r:number,t:number,y:number,m:T.Material,sx=1,sz=1){const geo=new T.TorusGeometry(r,t,7,36);allGeometries.add(geo);const o=mesh(g,geo,m,[0,y,0],[sx,sz,1]);o.rotation.x=Math.PI/2;return o;}
 // Spring: an open ceramic vase with individual stems and five-petal flowers.
 const vaseGeo=lathe([[0,0],[.1,0],[.14,.07],[.15,.2],[.09,.31],[.082,.35],[.06,.35],[.066,.29],[.12,.19],[.09,.035],[0,.035]]);
 mesh(seasonal[0],vaseGeo,mat('#7e9a98'),[0,0,0],[1,1,1]);ring(seasonal[0],.072,.012,.35,mat('#a6bcb1'));
 for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.19,z=Math.sin(a)*.12,h=.55+rand()*.18;
 tube(seasonal[0],[new T.Vector3(0,.18,0),new T.Vector3(x*.6,.42,z*.6),new T.Vector3(x,h,z)],.007,mat('#708365'),.002);
 const f=mesh(seasonal[0],bloomGeo,blossomMat,[x,h,z],[.075,.075,.075]);f.rotation.set(-.35,0,a);
 mesh(seasonal[0],round,mat('#d8b97f'),[x,h,z+.015],[.014,.014,.008]);}
 // Summer: a rounded fan, handle and quiet bamboo ribs, laid on the tabletop.
 const fan=mesh(seasonal[1],round,mat('#e0cfa4'),[0,.035,-.035],[.245,.024,.215]);
 mesh(seasonal[1],round,woodLight,[0,.033,.21],[.023,.023,.19]);
 for(let i=0;i<9;i++){const a=(i-4)*.29; tube(seasonal[1],[new T.Vector3(0,.059,.14),new T.Vector3(Math.sin(a)*.1,.061,-.015),new T.Vector3(Math.sin(a)*.2,.059,-.14*Math.cos(a))],.0038,mat('#b99c69'));}
 // Autumn: an actual hollow woven bowl; fruits rest inside it, above its floor.
 const bowl=lathe([[0,0],[.19,0],[.28,.08],[.34,.19],[.34,.22],[.31,.22],[.3,.18],[.25,.09],[.17,.032],[0,.032]]);
 mesh(seasonal[2],bowl,mat('#aa8254'),[0,0,0],[1,1,.78]);
 for(let i=0;i<5;i++)ring(seasonal[2],.2+i*.032,.009,.035+i*.041,mat('#c3a173'),1,.78);
 for(let i=0;i<16;i++){const a=i*TAU/16;tube(seasonal[2],[new T.Vector3(Math.cos(a)*.18,.03,Math.sin(a)*.14),new T.Vector3(Math.cos(a)*.27,.12,Math.sin(a)*.21),new T.Vector3(Math.cos(a)*.338,.217,Math.sin(a)*.264)],.007,woodLight);}
 for(let i=0;i<5;i++){const a=i*TAU/5,x=Math.cos(a)*.16,z=Math.sin(a)*.13;mesh(seasonal[2],round,mat(i%2?'#c99544':'#b86148'),[x,.195,z],[.093,.092,.089]);tube(seasonal[2],[new T.Vector3(x,.27,z),new T.Vector3(x+.018,.32,z)],.009,wood,.005);}
 mesh(seasonal[2],round,mat('#cfab53'),[0,.25,0],[.105,.1,.097]);
 // Winter: a small glazed warmer, with feet, a front window and a kettle.
 const fireMat=new T.MeshStandardMaterial({color:'#d49243',emissive:'#dd7724',emissiveIntensity:.65,roughness:.8});allMaterials.add(fireMat);
 for(const x of [-.15,.15])for(const z of [-.12,.12])mesh(seasonal[3],round,darkWood,[x,.038,z],[.035,.038,.035]);
 mesh(seasonal[3],cylinder,mat('#666b62'),[0,.24,0],[.235,.36,.235]);
 mesh(seasonal[3],box,darkWood,[0,.24,.232],[.28,.23,.025]);mesh(seasonal[3],box,fireMat,[0,.24,.25],[.23,.18,.012]);
 for(let i=0;i<4;i++)mesh(seasonal[3],cylinder,darkWood,[-.09+i*.06,.24,.263],[.007,.19,.007]);
 mesh(seasonal[3],cylinder,darkWood,[0,.428,0],[.26,.03,.26]);
 mesh(seasonal[3],round,ceramic,[0,.535,0],[.155,.115,.15]);mesh(seasonal[3],cylinder,ceramic,[0,.635,0],[.085,.015,.085]);mesh(seasonal[3],round,darkWood,[0,.66,0],[.022,.023,.022]);
 tube(seasonal[3],[new T.Vector3(-.13,.55,0),new T.Vector3(-.14,.78,0),new T.Vector3(.14,.78,0),new T.Vector3(.13,.55,0)],.016,darkWood);
 tube(seasonal[3],[new T.Vector3(.1,.5,0),new T.Vector3(.21,.54,0),new T.Vector3(.24,.6,0)],.035,ceramic,.023);
 // Rounded miniature animals: soft normals, modeled paws, cheeks, eyes and curved tails.
  // Bounding boxes are measured with every prop at full size, before seasonal animation.
 scene.updateMatrixWorld(true);
 const propChecks=seasonal.map(group=>{const bounds=new T.Box3().setFromObject(group,true);return {floor:bounds.min.y>=displayTop-.001,rail:bounds.max.z<.99,rear:bounds.min.z>-.64,table:bounds.min.x>=-2.11&&bounds.max.x<=-1.13};});
 if(propChecks.some(p=>!p.floor||!p.rail||!p.rear||!p.table))throw new Error('Prop clearance check failed');
 host.dataset.propClearance=JSON.stringify(propChecks);
 const cat=new T.Group();cat.position.set(1.45,.705,1.99);scene.add(cat);const catMat=mat('#caaa81'),cream=mat('#e5d5b9'),noseMat=mat('#ba8d85');
 mesh(cat,round,catMat,[0,.18,0],[.34,.18,.235]);mesh(cat,round,catMat,[.235,.31,.09],[.18,.165,.155]);
 const catEars:T.Group[]=[];
 for(const x of [.13,.34]){const ear=new T.Group();ear.position.set(x,.415,.08);ear.rotation.z=x<.2?.22:-.22;cat.add(ear);catEars.push(ear);mesh(ear,round,catMat,[0,.04,0],[.065,.115,.05]);mesh(ear,round,noseMat,[0,.057,.036],[.032,.063,.011]);}
 for(const x of [.185,.285]){mesh(cat,round,cream,[x,.26,.214],[.055,.038,.028]);tube(cat,[new T.Vector3(x-.023,.329,.235),new T.Vector3(x,.317,.24),new T.Vector3(x+.023,.329,.235)],.007,darkWood);}
 mesh(cat,round,noseMat,[.235,.283,.252],[.018,.012,.01]);
 mesh(cat,round,cream,[.16,.063,.15],[.1,.058,.065]);mesh(cat,round,cream,[-.015,.06,.17],[.105,.055,.067]);
 const tail=tube(cat,[new T.Vector3(-.27,.14,-.02),new T.Vector3(-.36,.1,.15),new T.Vector3(-.17,.075,.28),new T.Vector3(.08,.09,.24)],.055,catMat,.035);
 flush();
 // Natural water: lighting-aware slate blue, low contrast irregular ripples, no luminous stripes.
 const waterGeo=new T.PlaneGeometry(28,2.58,144,8);waterGeo.rotateX(-Math.PI/2);const wp=waterGeo.attributes.position;
 for(let i=0;i<wp.count;i++)wp.setXYZ(i,wp.getX(i),-.175,wp.getZ(i)+river(wp.getX(i)));
 const waterUniforms={time:{value:0},rain:{value:0},ice:{value:0},day:{value:1},tapRipples:{value:Array.from({length:8},()=>new T.Vector4(0,0,-100,0))}};
 const waterMat=new T.MeshStandardMaterial({color:'#9ebbc0',roughness:.23,metalness:0,transparent:true,opacity:.54,depthWrite:false});
 waterMat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,waterUniforms);
   shader.vertexShader='varying vec3 waterPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPosition=position;');
   shader.fragmentShader=`varying vec3 waterPosition;uniform float time;uniform float rain;uniform float ice;uniform float day;uniform vec4 tapRipples[8];
     float waterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
     float waterNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1,0)),f.x),mix(waterHash(i+vec2(0,1)),waterHash(i+vec2(1,1)),f.x),f.y);}
     float rippleField(vec2 p){vec2 cell=floor(p*1.4);float rings=0.;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec2 c=cell+vec2(float(x),float(y));float h=waterHash(c);vec2 center=(c+vec2(waterHash(c+4.),waterHash(c+9.)))/1.4;float age=fract(time*.38+h);float d=length(p-center);rings+=(1.-smoothstep(.012,.032,abs(d-age*.38)))*(1.-age)*step(.62,h);}}return rings;}`+'\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec2 p=waterPosition.xz;
     if(dot(p/vec2(14.,13.),p/vec2(14.,13.))>1.)discard;
     float n=waterNoise(p*1.6+vec2(-time*.07,time*.018));
     float detail=waterNoise(p*4.2-vec2(time*.06,0.));
     diffuseColor.rgb*=.97+n*.05;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.75,.76),ice*.77);
     float ripple=rippleField(p)*rain*(1.-ice);
     diffuseColor.rgb+=ripple*.038;
     float touchRing=0.;
     for(int i=0;i<8;i++){
       float age=time-tapRipples[i].z;
       if(age>0.&&age<3.5){
         float d=length(p-tapRipples[i].xy);
         float envelope=(1.-smoothstep(1.8,3.5,age))*smoothstep(0.,.12,age);
         float front=d-age*.72;
         float ring=sin(front*38.)*exp(-pow(front/.14,2.))+.32*sin((front+.23)*33.)*exp(-pow((front+.23)/.12,2.));
         touchRing+=ring*envelope*tapRipples[i].w;
       }
     }
     diffuseColor.rgb+=touchRing*.035*(1.-ice*.8);
     diffuseColor.a=mix(.54,.92,ice);
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     float flow=waterNoise(waterPosition.xz*1.8+vec2(-time*.07,time*.018));
     normal=normalize(normal+vec3(dFdx(flow)*.18,0.,dFdy(flow)*.18)*(1.-ice));
   `);
 };
 waterGeo.computeVertexNormals();
 const water=new T.Mesh(waterGeo,waterMat);water.receiveShadow=true;scene.add(water);allGeometries.add(waterGeo);allMaterials.add(waterMat);
 // Smooth pebbles are visible through shallow water instead of a painted glow.
 for(let i=0;i<55;i++){const x=(rand()-.5)*20,z=river(x)+(rand()-.5)*1.8;ball(mat(i%2?'#999b88':'#b3aa94'),x,-.48,z,.075+rand()*.13,.065,.09+rand()*.12);}
 flush();
 
 const details=createDetails({scene,box,round,wood,woodLight,darkWood,mat,mobile},crownClusters,height);
 // Butterflies: two independently beating wings, made from primitive geometry.
 const butterflyWings=new T.InstancedMesh(crownGeo,mat('#fff0ae'),18),butterflyBodies=new T.InstancedMesh(crownGeo,darkWood,9);butterflyWings.frustumCulled=false;butterflyBodies.frustumCulled=false;scene.add(butterflyWings,butterflyBodies);
 const butterflyFrame=new T.Object3D(),wingFrame=new T.Object3D();
 function pointCloud(count:number,size:number,color:string){const pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(rand()-.5)*32;pos[i*3+1]=rand()*15;pos[i*3+2]=(rand()-.5)*26;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({color,size,transparent:true,opacity:0,depthWrite:false});m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse, opacity ); diffuseColor.a *= 1.0-smoothstep(.2,.5,length(gl_PointCoord-.5));');};const p=new T.Points(geo,m);p.frustumCulled=false;scene.add(p);allGeometries.add(geo);allMaterials.add(m);return{p,pos,m};}
 const snow=pointCloud(mobile?450:800,.075,'#f4f7ef'),petals=pointCloud(36,.045,'#f6d5d2'),fireflies=pointCloud(36,.105,'#edffac');
 const rainCount=mobile?420:850,rainPos=new Float32Array(rainCount*6);for(let i=0;i<rainCount;i++){const x=(rand()-.5)*32,y=rand()*17,z=(rand()-.5)*28;rainPos.set([x,y,z,x-.055,y-.55,z],i*6);}
 const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rainMat=new T.LineBasicMaterial({color:'#dae8df',transparent:true,opacity:0,depthWrite:false});const rainLines=new T.LineSegments(rainGeo,rainMat);rainLines.frustumCulled=false;scene.add(rainLines);allGeometries.add(rainGeo);allMaterials.add(rainMat);
 // Daylight still follows the clock; the finite courtyard has no far landscape or sky props.
 // A thin snow layer appears on the roof as winter approaches.
 const snowRoof=new T.Group();scene.add(snowRoof);const snowCoverMat=mat('#edf0e7');
 const roofSnowGeo=roofSnowGeometry();allGeometries.add(roofSnowGeo);
 const roofSnow=new T.Mesh(roofSnowGeo,snowCoverMat);roofSnow.castShadow=true;roofSnow.receiveShadow=true;snowRoof.add(roofSnow);
 // Soft contact shadows remain legible even when dynamic shadows adapt down.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
 const sc=shadowCanvas.getContext('2d')!;const gradient=sc.createRadialGradient(64,64,3,64,64,63);gradient.addColorStop(0,'rgba(43,52,44,.42)');gradient.addColorStop(.38,'rgba(43,52,44,.21)');gradient.addColorStop(.72,'rgba(43,52,44,.055)');gradient.addColorStop(1,'rgba(53,57,42,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
 const contactTexture=new T.CanvasTexture(shadowCanvas);
 const contactMaterial=new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,opacity:.8});allMaterials.add(contactMaterial);
 for(const [x,z,sx,sz]of [[0,-1.4,9.4,7.5],[0,-1.4,6.8,5.6],[-4.8,-1.45,4.8,4.1],[4.7,-3.15,4.5,3.8],[-4.8,-1.45,1.6,1.5],[4.7,-3.15,1.5,1.4],[-2.85,.9,1,1],[2.85,.9,1,1]]){
   const g=new T.PlaneGeometry(sx,sz,10,10);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(x+p.getX(i),z+p.getZ(i))+.021);allGeometries.add(g);const shadow=new T.Mesh(g,contactMaterial);shadow.position.set(x,0,z);scene.add(shadow);
 }
 let hour=10,visualHour=10,season=0,speed=1,paused=false,weather:'clear'|'rain'='clear',dayCount=0,rain=0,elapsed=0,disposed=false;
 const lastCrownWeights=[-1,-1,-1,-1];
 const weights=[1,0,0,0];const leafColors=[new T.Color('#819671'),new T.Color('#68856a'),new T.Color('#bd974b'),new T.Color('#dfe5d3')];
 let audio:AudioContext|undefined,master:GainNode|undefined,soundEnabled=false;
 function setSound(enabled:boolean){soundEnabled=enabled;if(!enabled){master?.gain.setTargetAtTime(0,audio!.currentTime,.5);return;}if(!audio){audio=new AudioContext();master=audio.createGain();master.gain.value=0;master.connect(audio.destination);const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);const data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(rand()*2-1)*.025)/1.025;data[i]=brown*3;}const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=950;source.connect(filter);filter.connect(master);source.start();}audio.resume().catch(()=>{});master!.gain.setTargetAtTime(.27,audio.currentTime,1);}

 // Bounded interaction effects. Meshes and audio are allocated at most once, not per tap.
 const catVoice=new CatVoice(),gesture=new TapGesture();
 let catTouched=-100,rippleCursor=0,petalCursor=0,interactionCount=0;
 const treeTouched=[-100,-100];
 const burstCount=mobile?72:120,burstMesh=new T.InstancedMesh(bloomGeo,blossomMat,burstCount);
 burstMesh.frustumCulled=false;burstMesh.visible=false;scene.add(burstMesh);
 const burstParticles=Array.from({length:burstCount},()=>({p:new T.Vector3(),v:new T.Vector3(),age:10,life:6,phase:0}));
 function tell(kind:string){host.dataset.lastInteraction=kind;host.dataset.interactionCount=String(++interactionCount);}
 function shakePlant(p:T.Vector3){touchPlant.plantOrigin.value.copy(p);touchPlant.plantTime.value=elapsed;}
 function shower(tree:number){
   const candidates=blossomData.filter(b=>b.tree===tree);
   for(let i=0;i<(mobile?28:44);i++){
     const d=candidates[Math.floor(rand()*candidates.length)];if(!d)break;
     const p=burstParticles[petalCursor++%burstCount];p.p.copy(d.p);p.v.set((rand()-.5)*.4,-.24-rand()*.22,(rand()-.5)*.3);p.age=0;p.life=5+rand()*2;p.phase=rand()*TAU;
   }
 }
 type HitKind='cat'|'lamp'|'tree'|'plant'|'pot'|'door'|'chime'|'block';
 const pickMeshes:T.Mesh[]=[...details.pickables];
 const proxyMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});allMaterials.add(proxyMaterial);
 function proxy(kind:HitKind,id:number,p:number[],scale:number[],geo:T.BufferGeometry=round,rx=0){
   const m=new T.Mesh(geo,proxyMaterial);m.position.set(p[0],p[1],p[2]);m.scale.set(scale[0],scale[1],scale[2]);m.rotation.x=rx;m.userData={kind,id};m.updateMatrixWorld(true);pickMeshes.push(m);return m;
 }
 // The wall/roof proxies block through-house clicks. They never enter the rendered scene.
 for(const x of [-2.96,2.96])proxy('block',0,[x,2.35,-1.4],[.23,3.28,5.3],box);
 proxy('block',0,[0,2.35,-3.94],[6,3.28,.23],box);
 proxy('block',0,[0,.5,-.775],[6.3,.27,6.65],box);
 for(const side of [-1,1])proxy('block',0,[0,4.65,-1.4+side*1.45],[7.15,.20,roofLen],box,side*slope);
 for(const x of [-3,3])proxy('block',0,[x,2.36,1.15],[.29,3.5,.29],box);
 proxy('cat',0,[1.60,1.0,2.10],[.40,.31,.30]);
 lanterns.forEach((l,i)=>proxy('lamp',i,[l.bulb.position.x,i===0?3.1:.91,l.bulb.position.z],i===0?[.39,.39,.39]:[.49,.85,.49]));
 for(let i=0;i<2;i++){
   const x=i===0?-4.8:4.7,z=i===0?-1.45:-3.15;
   proxy('tree',i,[x,6.65-i*.7,z],[3.35,1.8,2.9]);
   proxy('tree',i,[x,2.6,z],[.56,2.6,.55]);
 }
 for(const side of [-1,1])proxy('pot',side<0?0:1,[side*COURT.potX,.31,COURT.potZ],[.39,.32,.39]);

 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),surfacePlane=new T.Plane(new T.Vector3(0,1,0),0);
 type Pick={kind:HitKind|'water';id:number;point:T.Vector3;distance:number};
 function pick(clientX:number,clientY:number):Pick|null{
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
   raycaster.setFromCamera(pointer,camera);
   scene.updateMatrixWorld(true);
   const visibleTargets=pickMeshes.filter(m=>{for(let p:T.Object3D|null=m;p;p=p.parent)if(!p.visible)return false;return true;});
   const hit=raycaster.intersectObjects(visibleTargets,false)[0];
   let result:Pick|null=hit?{kind:hit.object.userData.kind,id:hit.object.userData.id,point:hit.point,distance:hit.distance}:null;
   const waterHit=raycaster.intersectObject(water,false)[0];
   if(waterHit&&insideMeadow(waterHit.point.x,waterHit.point.z)&&(!result||waterHit.distance<result.distance))result={kind:'water',id:0,point:waterHit.point,distance:waterHit.distance};
   const point=new T.Vector3();
   if(raycaster.ray.intersectPlane(surfacePlane,point)){
     const distance=point.distanceTo(raycaster.ray.origin),h=habitat(point.x,point.z);
     if((!result||distance<result.distance)&&h.allowed&&Math.hypot(point.x/14,point.z/13)<.96)
       result={kind:'plant',id:0,point,distance};
   }
   return result?.kind==='block'?null:result;
 }
 function activate(hit:Pick){
   if(hit.kind==='cat'){catTouched=elapsed;void catVoice.meow();tell('cat');}
   if(hit.kind==='water'){waterUniforms.tapRipples.value[rippleCursor++%8].set(hit.point.x,hit.point.z,elapsed,1);tell('water');}
   if(hit.kind==='lamp'){
     const l=lanterns[hit.id];l.manual=l.manual===null?l.material.emissiveIntensity<1:!l.manual;
     tell('lamp');
   }
   if(hit.kind==='tree'){
     treeTouched[hit.id]=elapsed;
     if(weights[0]>.5)shower(hit.id);
     if(weights[3]>.5)details.shakeSnow(hit.id);
     tell('tree');
   }
   if(hit.kind==='pot'){details.touchPot(hit.id,elapsed);tell('pot');}
   if(hit.kind==='door'){details.toggleDoors();tell('door');}
   if(hit.kind==='chime'){details.touchChime(elapsed);tell('chime');}
   if(hit.kind==='plant'){shakePlant(hit.point);tell('plant');}
 }
 const onDown=(e:PointerEvent)=>gesture.down(e);
 const onMove=(e:PointerEvent)=>gesture.move(e);
 const onUp=(e:PointerEvent)=>{if(gesture.up(e)){const hit=pick(e.clientX,e.clientY);if(hit)activate(hit);}};
 const onCancel=(e:PointerEvent)=>gesture.cancel(e.pointerId);
 const onBlur=()=>{gesture.clear();};
 renderer.domElement.addEventListener('pointerdown',onDown,true);
 renderer.domElement.addEventListener('pointermove',onMove,true);
 renderer.domElement.addEventListener('pointerup',onUp,true);
 renderer.domElement.addEventListener('pointercancel',onCancel,true);
 renderer.domElement.addEventListener('lostpointercapture',onCancel);
 window.addEventListener('blur',onBlur);
 function updateInteraction(dt:number){
   const catAge=elapsed-catTouched;
   catEars.forEach((ear,i)=>{ear.rotation.z=(i===0?.22:-.22)+Math.sin(catAge*14+i*.8)*Math.exp(-catAge*2.2)*.32;});
   tail.rotation.y=Math.sin(catAge*6)*Math.exp(-catAge*1.6)*.11;
   crownMotion.treePulse.value.set(gentleGust(elapsed-treeTouched[0]),gentleGust(elapsed-treeTouched[1]));
   let active=0;
   for(let i=0;i<burstCount;i++){
     const p=burstParticles[i];p.age+=dt;
     if(p.age<p.life){
       p.p.addScaledVector(p.v,dt);p.p.x+=Math.sin(elapsed*1.4+p.phase)*dt*.14;
       // Petals settle at the roof surface instead of falling through it.
       const roofHere=Math.abs(p.p.x)<3.6&&p.p.z>-4.4&&p.p.z<1.65;
       const floor=roofHere?5.53-Math.abs(p.p.z+1.4)*.517:height(p.p.x,p.p.z)+.04;
       if(p.p.y<floor){p.p.y=floor;p.age=Math.max(p.age,p.life-.7);}
       obj.position.copy(p.p);obj.rotation.set(p.age*1.3,p.phase,p.age*.6);obj.scale.setScalar(.052*Math.min(1,(p.life-p.age)*1.8));active++;
     }else obj.scale.setScalar(0);
     obj.updateMatrix();burstMesh.setMatrixAt(i,obj.matrix);
   }
   burstMesh.visible=active>0;if(active)burstMesh.instanceMatrix.needsUpdate=true;
   const detailState=details.update(elapsed,dt,weights);
   host.dataset.doorOpen=detailState.doorOpen.toFixed(3);host.dataset.snowChunks=String(detailState.activeSnow);
   host.dataset.activeRipples=String(waterUniforms.tapRipples.value.filter(r=>elapsed-r.z<3.5).length);
   host.dataset.petalBurst=String(active);
   host.dataset.lightStates=JSON.stringify(lanterns.map(l=>l.manual));
 }

 let previousTime=performance.now();let raf=0,lastPaint=0,lastState=-1,frame=2,fpsTotal=0,fpsCount=0,qualityReduced=false;
 const tempColor=new T.Color(),skyDay=new T.Color('#c9cebf'),skyNight=new T.Color('#172d43'),skySunset=new T.Color('#d6ab8e'),skyRain=new T.Color('#a5b3b0');
 function animate(now:number){if(disposed)return;raf=requestAnimationFrame(animate);if(document.hidden)return;if(mobile&&now-lastPaint<31)return;lastPaint=now;const rawDelta=Math.max(.001,(now-previousTime)/1000),dt=Math.min(rawDelta,.07);previousTime=now;elapsed+=dt;frame++;
 if(!paused){hour+=dt*.1*speed;if(hour>=24){hour%=24;if(++dayCount>=3){dayCount=0;season=(season+1)%4;}}}
 const damp=1-Math.exp(-dt*1.3);for(let i=0;i<4;i++)weights[i]+=((i===season?1:0)-weights[i])*damp;
 const winter=weights[3],spring=weights[0],summer=weights[1],autumn=weights[2];
 const wantedRain=weather==='rain'?1:0;rain+=(wantedRain-rain)*dt*.35;
 visualHour=(((visualHour+(((hour-visualHour+36)%24)-12)*(1-Math.exp(-dt*1.8)))%24)+24)%24;
 const elevation=Math.sin((visualHour-6)/24*TAU),day=clamp(elevation*2.5+.25,0,1),sunset=Math.max(0,1-Math.abs(elevation)*5)*day;
 tempColor.copy(skyNight).lerp(skyDay,day).lerp(skySunset,sunset*.6).lerp(skyRain,rain*day*.65);(scene.background as T.Color).lerp(tempColor,.045);(scene.fog as T.Fog).color.copy(scene.background as T.Color);const viewOffset=Math.max(0,camera.position.distanceTo(controls.target)-28);(scene.fog as T.Fog).near=19-rain*5+viewOffset;(scene.fog as T.Fog).far=95-rain*30+viewOffset;
 localAir.airColor.value.copy(scene.fog!.color);localAir.airAmount.value=.035+day*.025+rain*.025;
 hemi.intensity=.35+day*1.2;sunLight.intensity=(.14+day*2.0)*(1-rain*.68);sunLight.color.set('#fff2d4').lerp(new T.Color('#ffb36a'),sunset*.6);fill.intensity=.25+day*.3;for(let i=0;i<lanterns.length;i++){const l=lanterns[i],level=l.manual===null?(.10+(1-day)*.9+winter*.1):l.manual?1:0;l.material.emissiveIntensity=level*2.7;l.material.color.set(l.manual===false?'#aaa98e':'#fce3a3');l.light.intensity=level*(i===0?5.5:1.2);}renderer.toneMappingExposure=1.05+day*.06;
 const angle=(visualHour-6)/24*TAU;
 sunLight.position.set(-Math.cos(angle)*12,Math.max(3,Math.sin(angle)*19),8);
 groundMat.color.set('#ffffff').lerp(new T.Color('#d1dbe3'),winter*.85);plantMat.color.set('#b8c69e').lerp(new T.Color('#b3995b'),autumn).lerp(new T.Color('#d7ded2'),winter);vegetationUniforms.time.value=elapsed;vegetationUniforms.rain.value=rain;vegetationUniforms.winter.value=winter;
 // Only seasonal shape changes update the instance buffers. Wind is coherent GPU motion.
 crownMotion.time.value=elapsed;crownMotion.wet.value=rain;
 if(frame%3===0&&weights.some((w,i)=>Math.abs(w-lastCrownWeights[i])>.0015)){
   for(let i=0;i<4;i++)lastCrownWeights[i]=weights[i];
   const foliageColor=new T.Color(0,0,0);
   for(let k=0;k<4;k++)foliageColor.add(leafColors[k].clone().multiplyScalar(weights[k]));
   for(let i=0;i<leafData.length;i++){const d=leafData[i];
     obj.position.copy(d.p);obj.rotation.copy(d.rotation);obj.scale.copy(d.s).multiplyScalar(.27*spring+1.05*summer+autumn+.012*winter);
     obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);
     tempColor.copy(foliageColor).multiplyScalar(.88+(Math.sin(d.phase)+1)*.11);leaves.setColorAt(i,tempColor);
   }
   for(let i=0;i<blossomData.length;i++){const d=blossomData[i];obj.position.copy(d.p);obj.rotation.copy(d.rotation);obj.scale.setScalar(Math.max(.0001,spring*d.size));obj.updateMatrix();blossoms.setMatrixAt(i,obj.matrix);
     blossoms.setColorAt(i,new T.Color(i%5===0?'#e7baba':i%3?'#fff1e7':'#f3dad1'));
   }
   for(let i=0;i<fruitData.length;i++){obj.position.copy(fruitData[i]);obj.rotation.set(0,0,0);obj.scale.setScalar(.095*autumn+.00001);obj.updateMatrix();fruit.setMatrixAt(i,obj.matrix);}
   leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor!.needsUpdate=true;blossoms.instanceMatrix.needsUpdate=true;blossoms.instanceColor!.needsUpdate=true;fruit.instanceMatrix.needsUpdate=true;
 }
 for(let i=0;i<4;i++){const displayScale=Math.max(0,(weights[i]-.5)*2);seasonal[i].visible=displayScale>.005;seasonal[i].scale.setScalar(displayScale);}

 flowers.visible=spring+summer>.05;flowers.scale.y=Math.max(.01,spring+summer);blossoms.visible=spring>.01;fruit.visible=autumn>.01;
 snowRoof.visible=winter>.15;snowCoverMat.transparent=true;snowCoverMat.opacity=winter;

 cat.scale.y=1+Math.sin(elapsed*.95)*.009;
 updateInteraction(dt);

 butterflyWings.visible=butterflyBodies.visible=spring>.02;
 for(let i=0;i<9;i++){butterflyFrame.position.set(Math.sin(elapsed*.3+i*2)*3.6-1,.7+Math.sin(elapsed*.9+i)*.25,2.5+Math.cos(elapsed*.4+i)*.8);butterflyFrame.rotation.set(0,elapsed*.3+i,0);butterflyFrame.scale.setScalar(spring);butterflyFrame.updateMatrix();for(let j=0;j<2;j++){const side=j?1:-1;wingFrame.position.set(side*.085,Math.abs(Math.sin(elapsed*15+i))*.035,0);wingFrame.rotation.set(0,side*.4,Math.sin(elapsed*15+i)*side*.85);wingFrame.scale.set(.09,.012,.09);wingFrame.updateMatrix();obj.matrix.multiplyMatrices(butterflyFrame.matrix,wingFrame.matrix);butterflyWings.setMatrixAt(i*2+j,obj.matrix);}wingFrame.position.set(0,0,0);wingFrame.rotation.set(0,0,0);wingFrame.scale.set(.015,.018,.07);wingFrame.updateMatrix();obj.matrix.multiplyMatrices(butterflyFrame.matrix,wingFrame.matrix);butterflyBodies.setMatrixAt(i,obj.matrix);}butterflyWings.instanceMatrix.needsUpdate=true;butterflyBodies.instanceMatrix.needsUpdate=true;
 waterUniforms.time.value=elapsed;waterUniforms.ice.value=winter;waterUniforms.rain.value=rain*(1-winter);waterUniforms.day.value=day;
 rainMat.opacity=rain*(1-winter)*.42;rainLines.visible=rainMat.opacity>.005;for(let i=0;i<rainCount;i++){const k=i*6;rainPos[k]-=dt*.8;rainPos[k+1]-=dt*13;const rainRoof=Math.abs(rainPos[k])<3.65&&rainPos[k+2]>-4.5&&rainPos[k+2]<1.65?5.5-Math.abs(rainPos[k+2]+1.4)*.515:0;if(rainPos[k+1]<rainRoof){rainPos[k+1]=15+rand()*2;rainPos[k]=(rand()-.5)*32;}rainPos[k+3]=rainPos[k]-.055;rainPos[k+4]=rainPos[k+1]-.55;}rainGeo.attributes.position.needsUpdate=true;
 snow.m.opacity=winter*rain*.9;snow.p.visible=snow.m.opacity>.01;for(let i=0;i<snow.pos.length/3;i++){const k=i*3;snow.pos[k]+=Math.sin(elapsed*.6+i)*dt*.3;snow.pos[k+1]-=dt*(.6+i%3*.18);const snowRoofY=Math.abs(snow.pos[k])<3.65&&snow.pos[k+2]>-4.5&&snow.pos[k+2]<1.65?5.5-Math.abs(snow.pos[k+2]+1.4)*.515:-.1;if(snow.pos[k+1]<snowRoofY)snow.pos[k+1]=14;}snow.p.geometry.attributes.position.needsUpdate=true;
 petals.m.opacity=spring*.7+autumn*.9;petals.m.color.set('#f5d4d1').lerp(new T.Color('#ce963b'),autumn);petals.p.visible=petals.m.opacity>.02;for(let i=0;i<36;i++){const k=i*3;petals.pos[k]=Math.sin(elapsed*.16+i)*5.2;petals.pos[k+1]=((i*.713-elapsed*.27)%6+6)%6;petals.pos[k+2]=Math.cos(i*2.4+elapsed*.05)*3;}petals.p.geometry.attributes.position.needsUpdate=true;
 fireflies.m.opacity=summer*(1-day)*(.65+Math.sin(elapsed*2)*.2);fireflies.p.visible=fireflies.m.opacity>.01;for(let i=0;i<36;i++){const k=i*3;fireflies.pos[k]=Math.sin(i*1.8+elapsed*.17)*6;fireflies.pos[k+1]=.5+(Math.sin(i+elapsed*.6)+1)*.7;fireflies.pos[k+2]=Math.cos(i*3.4+elapsed*.12)*5;}fireflies.p.geometry.attributes.position.needsUpdate=true;
 if(soundEnabled&&master&&audio)master.gain.setTargetAtTime(.22+rain*.13,audio.currentTime,.7);
 controls.target.x=clamp(controls.target.x,-12,12);controls.target.z=clamp(controls.target.z,-10,10);controls.target.y=clamp(controls.target.y,.2,7);controls.update();renderer.render(scene,camera);
 if(elapsed-lastState>.3){onState({season,hour,rain});lastState=elapsed;renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);renderer.domElement.dataset.fps=String(Math.round(1/rawDelta));}
 if(!qualityReduced&&elapsed>4){fpsTotal+=rawDelta;fpsCount++;if(fpsCount>60&&fpsTotal/fpsCount>.043){renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;qualityReduced=true;}}
 }
 const visibility=()=>{previousTime=performance.now();if(document.hidden){audio?.suspend().catch(()=>{});catVoice.suspend();gesture.clear();}else if(soundEnabled)audio?.resume().catch(()=>{});};document.addEventListener('visibilitychange',visibility);
 const contextLost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);onFailure?.('图形渲染暂时中断，重新打开即可回到庭院。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
 raf=requestAnimationFrame(animate);
 return {setSeason(s){season=clamp(Math.round(s),0,3);dayCount=0;onState({season,hour,rain});},setHour(h){hour=clamp(h,0,23.99);},setPaused(p){paused=p;},setSpeed(s){speed=s;},setWeather(w){weather=w;},setSound,resetView,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',contextLost);controls.dispose();catVoice.dispose();window.removeEventListener('blur',onBlur);
 renderer.domElement.removeEventListener('pointerdown',onDown,true);renderer.domElement.removeEventListener('pointermove',onMove,true);renderer.domElement.removeEventListener('pointerup',onUp,true);renderer.domElement.removeEventListener('pointercancel',onCancel,true);renderer.domElement.removeEventListener('lostpointercapture',onCancel);audio?.close().catch(()=>{});scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points||o instanceof T.LineSegments){allGeometries.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>allMaterials.add(m));}});contactTexture.dispose();paintingTexture.dispose();allGeometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
