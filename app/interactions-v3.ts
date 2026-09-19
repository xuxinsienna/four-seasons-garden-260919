export type PointerSample={pointerId:number;clientX:number;clientY:number;timeStamp:number;pointerType:string;button:number};

/** One short, stationary pointer only. A drag, pinch or cancellation cannot become a tap. */
export class TapGesture {
  private pointers=new Set<number>();
  private candidate:{id:number;x:number;y:number;time:number;slop:number}|null=null;
  down(e:PointerSample){
    this.pointers.add(e.pointerId);
    if(this.pointers.size!==1||e.button!==0){this.candidate=null;return;}
    this.candidate={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp,slop:e.pointerType==='touch'?12:7};
  }
  move(e:PointerSample){
    const c=this.candidate;
    if(c?.id===e.pointerId&&Math.hypot(e.clientX-c.x,e.clientY-c.y)>c.slop)this.candidate=null;
  }
  up(e:PointerSample){
    this.move(e);const c=this.candidate;
    const valid=!!c&&c.id===e.pointerId&&this.pointers.size===1&&e.timeStamp-c.time<650;
    this.pointers.delete(e.pointerId);this.candidate=null;return valid;
  }
  cancel(id:number){this.pointers.delete(id);this.candidate=null;}
  clear(){this.pointers.clear();this.candidate=null;}
  get active(){return this.pointers.size>0;}
}

/** Short synthesized meow; no samples or downloads and no sound before a user tap. */
export class CatVoice {
  private context:AudioContext|undefined;
  private next=0;
  private disposed=false;
  async meow(){
    if(this.disposed)return;
    try{
      this.context??=new AudioContext();
      const ctx=this.context;await ctx.resume();
      if(this.disposed||ctx.state!=='running'||ctx.currentTime<this.next)return;
      const t=ctx.currentTime;this.next=t+.85;
      const voice=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      voice.type='sawtooth';voice.frequency.setValueAtTime(510,t);voice.frequency.exponentialRampToValueAtTime(760,t+.12);voice.frequency.exponentialRampToValueAtTime(460,t+.52);voice.frequency.exponentialRampToValueAtTime(370,t+.74);
      filter.type='bandpass';filter.Q.value=2.2;filter.frequency.setValueAtTime(1600,t);filter.frequency.exponentialRampToValueAtTime(820,t+.7);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.075,t+.04);gain.gain.linearRampToValueAtTime(.055,t+.23);gain.gain.exponentialRampToValueAtTime(.001,t+.77);
      voice.connect(filter);filter.connect(gain);gain.connect(ctx.destination);voice.start(t);voice.stop(t+.8);
      voice.onended=()=>{voice.disconnect();filter.disconnect();gain.disconnect();};
    }catch{/* Audio restrictions must never prevent the visible ear response. */}
  }
  suspend(){this.context?.suspend().catch(()=>{});}
  dispose(){this.disposed=true;this.context?.close().catch(()=>{});}
}
