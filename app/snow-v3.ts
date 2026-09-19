import * as T from 'three';

// Broad scallops describe slid-away snow; smaller waves soften the remaining lips.
export function snowEdge(x:number,side:number){
 const bite=(center:number,width:number,depth:number)=>depth*Math.exp(-Math.pow((x-center)/width,2));
 return 2.87+.055*Math.sin(x*4.3+side)-bite(-2.25*side,.48,.61)-bite(.28*side,.65,.83)-bite(2.3*side,.34,.46);
}

/** A single rounded snow mantle, thick at the ridge with irregular exposed eaves. */
export function roofSnowGeometry(){
 const nx=96,nz=48,positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=(i/nx-.5)*7.04,q=j/nz*2-1,side=q<0?-1:1,u=Math.abs(q)*snowEdge(x,side);
   const edgeRound=Math.sqrt(Math.max(0,1-Math.pow(Math.abs(q),14)));
   const sideRound=Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x)/3.52,16)));
   const drift=.24+.045*Math.sin(x*2.2)*Math.cos(u*2.7)+.03*Math.cos(x*5.4+u*3);
   const thickness=.055+(drift*(1-u*.16)+.065*Math.exp(-u*u*2))*edgeRound*sideRound;
   positions.push(x,5.64-u*(1.5/2.9)+thickness,-1.4+side*u);uv.push(i/nx,j/nz);
   if(j<nz&&i<nx){const n=j*(nx+1)+i;indices.push(n,n+nx+1,n+1,n+1,n+nx+1,n+nx+2);}
 }
 // Fold the outer boundary underneath the mantle for a softly rounded, substantial edge.
 const boundary:number[]=[];
 for(let i=0;i<=nx;i++)boundary.push(i);
 for(let j=1;j<=nz;j++)boundary.push(j*(nx+1)+nx);
 for(let i=nx-1;i>=0;i--)boundary.push(nz*(nx+1)+i);
 for(let j=nz-1;j>0;j--)boundary.push(j*(nx+1));
 const first=positions.length/3;
 boundary.forEach(n=>{const x=positions[n*3],z=positions[n*3+2],u=Math.abs(z+1.4);positions.push(x*.996,5.60-u*(1.5/2.9),-1.4+(z+1.4)*.996);uv.push(uv[n*2],uv[n*2+1]);});
 boundary.forEach((a,k)=>{const next=(k+1)%boundary.length,b=boundary[next];indices.push(a,b,first+k,b,first+next,first+k);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
