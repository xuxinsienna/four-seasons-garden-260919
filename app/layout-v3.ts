import * as T from 'three';

export const COURT={radiusX:14,radiusZ:13,deckFront:2.55,deckBack:-4.1,deckWidth:6.3,deckTop:.7025,stepWidth:2.8,upperStepZ:2.88,lowerStepZ:3.49,stepDepth:.66,lampX:3.9,lampZ:3.25,potX:2.75,potZ:3.15};
export const riverCenter=(x:number)=>7.1+Math.sin(x*.26)*.6+Math.sin(x*.6)*.12;
export const insideMeadow=(x:number,z:number,margin=0)=>Math.hypot(x/(COURT.radiusX-margin),z/(COURT.radiusZ-margin))<=1;
export const gentleGust=(age:number)=>age<0?0:Math.sin(Math.min(age/3.6,1)*Math.PI)*Math.exp(-age*.42);
export const doorCenter=(side:number,panel:number,open:number)=>side*T.MathUtils.lerp(.735+panel*1.47,2.16+panel*.10,open);

/** Concentric rings retain a smooth finite outline and enough vertices for the stream bed. */
export function meadowGeometry(height:(x:number,z:number)=>number){
  const positions:number[]=[0,height(0,0),0],uvs:number[]=[.5,.5],indices:number[]=[];
  const rings=64,sectors=144;
  for(let r=1;r<=rings;r++)for(let j=0;j<sectors;j++){
    const a=j/sectors*Math.PI*2,x=Math.cos(a)*COURT.radiusX*r/rings,z=Math.sin(a)*COURT.radiusZ*r/rings;
    positions.push(x,height(x,z),z);uvs.push(x/28+.5,z/26+.5);
    const current=1+(r-1)*sectors+j,next=1+(r-1)*sectors+(j+1)%sectors;
    if(r===1)indices.push(0,next,current);
    else{const prior=current-sectors,priorNext=next-sectors;indices.push(prior,next,current,prior,priorNext,next);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
