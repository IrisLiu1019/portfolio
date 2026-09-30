// Animate the original painted texture with small, feathered deformations.
// No cut-out copies or replacement artwork; lettering remains on its own DOM layer.
export function initPond(canvas, image) {
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const invitation = document.querySelector('.water-invitation');
 const toggle = document.querySelector('.water-toggle');
 const gl = canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
 if (!gl) { canvas.dataset.rippleState='static-fallback'; return; }

 const vertex = `attribute vec2 position; varying vec2 uv;
 void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
 const fragment = `precision highp float;
 varying vec2 uv;
 uniform sampler2D painting;
 uniform vec2 viewport, imageSize;
 uniform float now, motion;
 uniform vec4 drops[16];
 uniform float response[8];

 vec2 fish(vec2 p, vec2 head, vec2 tail, float breadth, float phase, float reaction){
   vec2 axis=normalize(tail-head), side=vec2(-axis.y,axis.x);
   float bodyLength=length(tail-head);
   float along=dot(p-head,axis), across=dot(p-head,side);
   vec2 ellipse=vec2((along-bodyLength*.5)/(bodyLength*.66),across/breadth);
   float mask=1.-smoothstep(.68,1.1,length(ellipse));
   float tailWeight=smoothstep(.06,1.,along/bodyLength);
   float stroke=sin(now*1.6+phase-tailWeight*2.2)*(.25+tailWeight*4.2);
   float drift=sin(now*.55+phase)*.65;
   float sway=sin(now*.8+phase)*.25+reaction*(.45+tailWeight*2.1);
   return (side*(stroke+sway)+axis*(drift+reaction*.6))*mask*motion;
 }
 vec2 dragonfly(vec2 p, vec2 center, vec2 extent, float phase, float reaction){
   vec2 q=p-center;
   float mask=1.-smoothstep(.64,1.06,length(q/extent));
   float angle=sin(now*1.1+phase)*.018+reaction*.016;
   vec2 rotated=vec2(q.x*cos(angle)-q.y*sin(angle),q.x*sin(angle)+q.y*cos(angle));
   // The wing tips flex more than the central thorax and abdomen.
   float wing=1.-smoothstep(25.,65.,abs(q.x));
   float flutter=sin(now*25.+phase)*.026;
   vec2 flutterShift=vec2(q.y*.16,q.y)*flutter*wing;
   vec2 drift=vec2(sin(now*.8+phase)*1.6,cos(now*1.25+phase)*1.8+reaction*2.);
   return ((rotated-q)+flutterShift+drift)*mask*motion;
 }
 void main(){
   vec2 screen=vec2(uv.x,1.-uv.y);
   float cover=max(viewport.x/imageSize.x,viewport.y/imageSize.y);
   vec2 visible=viewport/(imageSize*cover);
   vec2 tex=(screen-.5)*visible+.5;
   vec2 p=tex*imageSize;
   vec2 refraction=vec2(0.); float gleam=0.;
   for(int i=0;i<16;i++){
     float age=now-drops[i].z;
     if(age>0. && age<4.8 && drops[i].w>0.){
       vec2 delta=(screen-drops[i].xy)*viewport*vec2(1.,1.3);
       float distance=length(delta), front=distance-age*155.;
       float envelope=exp(-front*front/5200.)*exp(-age*.68)*smoothstep(0.,.12,age)*smoothstep(0.,20.,distance);
       float wave=sin(front*.086)*envelope*drops[i].w;
       vec2 direction=normalize(delta+vec2(.001))/vec2(1.,1.3);
       refraction+=direction*wave*11.;
       gleam+=wave*.018;
     }
   }
   // The water is alive; foreground rocks and the frog remain a steady anchor.
   float water=smoothstep(.2,.36,tex.y)*(1.-smoothstep(.81,.90,tex.y));
   float frog=1.-smoothstep(.75,1.1,length((p-vec2(470.,765.))/vec2(225.,170.)));
   float nearLeft=(1.-smoothstep(210.,330.,p.x))*smoothstep(580.,690.,p.y);
   float nearRight=smoothstep(1380.,1490.,p.x)*smoothstep(630.,745.,p.y);
   water*=(1.-frog*.98)*(1.-max(nearLeft,nearRight));
   vec2 current=vec2(sin(p.y*.011+now*.7)+sin(p.x*.008-now*.42),cos(p.x*.010+now*.56))*.95;
   p+=(refraction*visible*imageSize/viewport+current)*water*motion;
   p+=fish(p,vec2(862.,637.),vec2(705.,461.),64.,0.,response[0]);
   p+=fish(p,vec2(1151.,576.),vec2(1370.,695.),56.,1.7,response[1]);
   p+=fish(p,vec2(576.,580.),vec2(488.,548.),28.,3.2,response[2]);
   p+=fish(p,vec2(1043.,631.),vec2(979.,612.),23.,1.1,response[3]);
   p+=fish(p,vec2(1011.,758.),vec2(1090.,724.),29.,2.6,response[4]);
   p+=fish(p,vec2(1528.,628.),vec2(1588.,612.),26.,4.3,response[5]);
   p+=dragonfly(p,vec2(875.,154.),vec2(73.,82.),.4,response[6]);
   p+=dragonfly(p,vec2(1311.,191.),vec2(134.,136.),2.4,response[7]);
   vec3 color=texture2D(painting,clamp(p/imageSize,vec2(.001),vec2(.999))).rgb;
   gl_FragColor=vec4(color+gleam*water*motion,1.);
 }`;

 function compile(type,source){
   const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error('Pond shader could not compile');
   return shader;
 }
 let program;
 try {
   program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Pond shader could not link');
 } catch {canvas.dataset.rippleState='static-fallback';return;}
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const locations=Object.fromEntries(['painting','viewport','imageSize','now','motion','drops[0]','response[0]'].map(name=>[name,gl.getUniformLocation(program,name)]));
 const drops=new Float32Array(64), responses=new Float32Array(8);
 const creatures=[[780,550],[1260,620],[535,565],[1010,620],[1045,740],[1560,620],[875,154],[1311,191]];
 let ready=false,frame=0,elapsed=0,lastTime=0,lastPaint=0,nextDrop=0,lastPointer=0,lastPoint=null,introduced=false,manualPause=false;
 let width=1,height=1;
 const paused=()=>manualPause||reduced.matches;
 function controls(){
   invitation.hidden=!ready||paused();toggle.hidden=!ready;
   toggle.disabled=reduced.matches;
   toggle.textContent=reduced.matches?'Motion off':manualPause?'Play motion':'Pause motion';
   toggle.setAttribute('aria-pressed',String(paused()));
   canvas.dataset.rippleState=reduced.matches?'reduced-motion':manualPause?'paused':'ready';
 }
 function responseAt(x,y){
   const cover=Math.max(width/image.naturalWidth,height/image.naturalHeight);
   const sx=(x-image.naturalWidth*.5)*cover+width*.5,sy=(y-image.naturalHeight*.5)*cover+height*.5;
   let sum=0;
   for(let i=0;i<16;i++){
     const age=elapsed-drops[i*4+2];
     if(age<=0||age>=4.8||!drops[i*4+3])continue;
     const distance=Math.hypot(sx-drops[i*4]*width,(sy-drops[i*4+1]*height)*1.3);
     const front=distance-age*155;
     sum+=Math.sin(front*.056)*Math.exp(-front*front/9000)*Math.exp(-age*.6)*drops[i*4+3];
   }
   return Math.max(-1.5,Math.min(1.5,sum));
 }
 function draw(){
   creatures.forEach(([x,y],i)=>{responses[i]=responseAt(x,y);});
   gl.uniform1f(locations.now,elapsed);gl.uniform1f(locations.motion,reduced.matches?0:1);
   gl.uniform4fv(locations['drops[0]'],drops);gl.uniform1fv(locations['response[0]'],responses);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 function animate(ms){
   frame=0;if(!ready||document.hidden)return;
   if(!paused()){
     if(lastTime)elapsed+=Math.min((ms-lastTime)/1000,.05);
     lastTime=ms;
   }
   if(ms-lastPaint>=30||paused()){draw();lastPaint=ms;}
   if(!paused())frame=requestAnimationFrame(animate);
 }
 function schedule(){if(ready&&!frame&&!document.hidden)frame=requestAnimationFrame(animate);}
 function resize(){
   const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
   const ratio=Math.min(devicePixelRatio||1,1.25,1600/width,1100/height);
   canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
   gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(locations.viewport,width,height);if(ready)draw();schedule();
 }
 function drop(x,y,strength){
   if(!ready||paused()||document.hidden)return;
   const rect=canvas.getBoundingClientRect();
   drops.set([(x-rect.left)/width,(y-rect.top)/height,elapsed,strength],nextDrop*4);nextDrop=(nextDrop+1)%16;
   canvas.dataset.interactions=String((Number(canvas.dataset.interactions)||0)+1);
 }
 function introduce(){if(!introduced&&ready&&!paused()&&!document.hidden){introduced=true;drop(width*.52,height*.43,1.1);}}
 function load(){
   if(!image.naturalWidth)return;
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.uniform1i(locations.painting,0);gl.uniform2f(locations.imageSize,image.naturalWidth,image.naturalHeight);
   ready=true;resize();canvas.classList.add('is-ready');controls();setTimeout(introduce,550);
 }
 if(image.complete)load();else image.addEventListener('load',load,{once:true});
 window.addEventListener('pointermove',event=>{
   if(event.target.closest('a,button'))return;
   const time=performance.now();if(time-lastPointer<120)return;
   if(lastPoint&&Math.hypot(event.clientX-lastPoint.x,event.clientY-lastPoint.y)<22)return;
   lastPointer=time;lastPoint={x:event.clientX,y:event.clientY};drop(event.clientX,event.clientY,.75);
 },{passive:true});
 window.addEventListener('pointerdown',event=>{if(!event.target.closest('a,button'))drop(event.clientX,event.clientY,1.3);},{passive:true});
 window.addEventListener('pointerleave',()=>{lastPoint=null;});
 invitation.addEventListener('click',()=>drop(width*.52,height*.43,1.3));
 toggle.addEventListener('click',()=>{manualPause=!manualPause;lastTime=0;controls();if(paused()){cancelAnimationFrame(frame);frame=0;}else schedule();});
 window.addEventListener('resize',resize,{passive:true});
 document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{schedule();setTimeout(introduce,300);}});
 reduced.addEventListener('change',()=>{lastTime=0;drops.fill(0);controls();draw();schedule();});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;ready=false;canvas.classList.remove('is-ready');invitation.hidden=true;toggle.hidden=true;canvas.dataset.rippleState='static-fallback';});
}
