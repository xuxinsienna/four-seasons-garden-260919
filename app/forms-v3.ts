import * as T from 'three';

/** A stuffed square pillow: rounded outline, domed fabric and a shallow seat dimple. */
export function softCushion():T.BufferGeometry {
  const g=new T.SphereGeometry(1,24,12),p=g.attributes.position;
  const signed=(v:number,e:number)=>Math.sign(v)*Math.pow(Math.abs(v),e);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    p.setXYZ(i,signed(x,.52),signed(y,.8)*(1-.18*Math.exp(-(x*x+z*z)*8)),signed(z,.52));
  }
  g.computeVertexNormals();return g;
}

/** Weathered granite: broad unequal planes with softly lit edges, no moss overlays. */
export function riverRock(seed:number):T.BufferGeometry {
  const g=new T.SphereGeometry(1,10,7),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const r=1+.11*Math.sin(x*4+seed)*Math.cos(z*3-seed)+.07*Math.sin(y*7+x*2);
    p.setXYZ(i,x*r+.07*y,Math.max(-.65,Math.min(.77,y*r)),z*r);
  }
  g.computeVertexNormals();return g;
}

/** One watertight gable, overlapping both the side plaster and the roof underside. */
export function sealedGable():T.BufferGeometry {
  const shape=new T.Shape();shape.moveTo(-2.65,3.70);shape.lineTo(-2.65,4.10);
  shape.lineTo(0,5.44);shape.lineTo(2.65,4.10);shape.lineTo(2.65,3.70);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false});g.rotateY(Math.PI/2);return g;
}

/** Original ink landscape drawn in code; deliberately restrained at miniature scale. */
export function landscapePainting():T.CanvasTexture {
  const c=document.createElement('canvas');c.width=512;c.height=384;const p=c.getContext('2d')!;
  p.fillStyle='#e7dbc0';p.fillRect(0,0,512,384);
  for(let layer=0;layer<3;layer++){
    p.fillStyle=['#bec1ab','#9eab98','#778d7c'][layer];p.beginPath();p.moveTo(0,310);
    for(let x=0;x<=512;x+=8){const y=185+layer*45-Math.sin(x*.012+layer*1.5)*45-Math.cos(x*.028+layer)*22;p.lineTo(x,y);}
    p.lineTo(512,384);p.lineTo(0,384);p.fill();
  }
  p.fillStyle='#c78d6e';p.beginPath();p.arc(360,86,24,0,Math.PI*2);p.fill();
  p.strokeStyle='#ded6b9';p.lineWidth=14;p.beginPath();p.moveTo(325,240);p.bezierCurveTo(190,285,420,320,250,384);p.stroke();
  p.strokeStyle='#626e5b';p.lineWidth=5;p.beginPath();p.moveTo(78,338);p.quadraticCurveTo(89,251,65,222);p.stroke();
  for(let i=0;i<8;i++){const x=70+Math.sin(i*2.4)*28,y=224+i*9;p.fillStyle=i%2?'#7c896c':'#647961';p.beginPath();p.ellipse(x,y,27,10,-.1,0,Math.PI*2);p.fill();}
  p.strokeStyle='#67786b';p.lineWidth=2;
  for(let i=0;i<3;i++){const x=240+i*21,y=112+i%2*12;p.beginPath();p.moveTo(x-5,y);p.lineTo(x,y+3);p.lineTo(x+5,y);p.stroke();}
  p.fillStyle='#b36e57';p.fillRect(445,310,13,17);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
}

/** Rounded, tapered branches. Ends close to a point instead of a sawn cylinder. */
export function curvedBranch(points:T.Vector3[],radius:number,tip=.008,segments=16):T.BufferGeometry {
  const curve=new T.CatmullRomCurve3(points), frames=curve.computeFrenetFrames(segments,false);
  const radial=10,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++) {
    const t=i/segments, p=curve.getPointAt(t), r=tip+(radius-tip)*Math.pow(1-t,.9);
    for(let j=0;j<=radial;j++) {
      const a=j/radial*Math.PI*2;
      const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
      positions.push(v.x,v.y,v.z);uvs.push(j/radial,t);
      if(i<segments&&j<radial){const n=i*(radial+1)+j;indices.push(n,n+1,n+radial+1,n+1,n+radial+2,n+radial+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Roof clearance includes the full leaf/flower radius and maximum branch motion. */
export function clearsRoof(p:T.Vector3,radius=.22):boolean {
  if(Math.abs(p.x)>3.88+radius||p.z < -4.85-radius||p.z > 2.05+radius)return true;
  const roofY=5.58-Math.min(3.1,Math.abs(p.z+1.4))*.515;
  return p.y-radius > roofY+.42;
}

/** A cupped thin leaf or a rounded five-petal blossom, not a polyhedron. */
export function botanicalDisc(flower=false):T.BufferGeometry {
  const count=flower?30:12,positions=[0,0,.09],uv=[.5,.5],indices:number[]=[];
  for(let i=0;i<=count;i++) {
    const a=i/count*Math.PI*2,r=flower?.82+.18*Math.cos(a*5):1;
    const x=Math.cos(a)*r*(flower?1:.46),y=Math.sin(a)*r;
    positions.push(x,y,flower?-.055:Math.abs(x)*-.14);uv.push(x*.5+.5,y*.5+.5);
    if(i<count)indices.push(0,i+1,i+2);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
