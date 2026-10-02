import { createMotion } from './motion.js?v=20';

const W = 1672, H = 941;
export async function initPond(root = document, options = {}) {
const query = selector => root.querySelector(selector);
const labels = { pause:'暂停', play:'播放', original:'原图', compare:'查看原图', back:'返回动效', paused:'动效已暂停', hint:'移动或点击水面', error:'动效未能加载，请用支持 WebGL 的浏览器打开。', lost:'动效连接中断，请刷新预览。', ...options.labels };
const canvas = query('#pond');
const stage = query('#stage');
const loading = query('#loading');
const hint = query('#hint');
const pauseButton = query('#pause');
const compareButton = query('#compare');
const rippleButton = query('#ripple');
const resetButton = query('#reset');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const controls = [pauseButton, compareButton, rippleButton, resetButton].filter(Boolean);
controls.forEach(button => button.disabled = true);

const imageAssets = options.assets || window.POND_ASSETS || {
  original: 'assets/original.png', clean: 'assets/pond-clean.png', creatures: 'assets/creatures.png',
};
let atlas;
function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

try {
  atlas = options.atlas || window.POND_ATLAS || await fetch(options.atlasUrl || 'assets/creature-atlas.json').then(r => { if(!r.ok) throw new Error('Creature atlas did not load'); return r.json(); });
  const images = await Promise.all(Object.values(imageAssets).map(loadImage));
  start(Object.fromEntries(Object.keys(imageAssets).map((key, i) => [key, images[i]])));
} catch (error) {
  console.error(error);
  canvas.dataset.state = 'fallback';
  if(loading)loading.textContent = labels.error;
  options.onFallback?.(error);
}

function start(images) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL is unavailable');
  const quadVertex = `attribute vec2 point; varying vec2 uv;
    void main(){uv=point;gl_Position=vec4(point.x*2.-1.,1.-point.y*2.,0.,1.);}`;
  const imageFragment = `precision mediump float; varying vec2 uv; uniform sampler2D image;uniform vec4 view;
    void main(){gl_FragColor=vec4(texture2D(image,uv*view.zw+view.xy).rgb,1.);}`;
  const spriteVertex = `precision highp float;
    attribute vec2 point; uniform vec4 crop; uniform vec2 head,tail,center,at;
    uniform float bodySize,isFly,upright,phase;uniform vec2 forward;uniform vec4 view;
    varying vec2 tex,source,scenePosition;
    void main(){
      source=crop.xy+point*crop.zw;tex=source/vec2(1536.,1024.);
      vec2 axis=normalize(head-tail),side=vec2(-axis.y,axis.x);
      float lengthBody=length(head-tail);
      vec2 local=vec2(dot(source-center,axis),dot(source-center,side));
      float scale=bodySize/mix(lengthBody,max(crop.z,crop.w),isFly);
      if(isFly>.5){
        // Only points away from the body axis flutter. The thorax, head and
        // long abdomen remain still; wing tips change span by at most 3.5%.
        float wing=smoothstep(9.,28.,abs(local.y))*(1.-smoothstep(80.,115.,abs(local.x)));
        wing*=smoothstep(24.,40.,length(source-head));
        local.y*=1.+sin(phase)*.035*wing;
        local.x+=sin(phase+.7)*abs(local.y)*.009*wing;
      }
      local*=scale;
      if(isFly<.5){
        // Anchor the head and front body. A travelling bend builds toward the
        // tail, reaching about 10px on a large koi and 3px on a small fish.
        float along=clamp(dot(head-source,axis)/lengthBody,0.,1.);
        float tailWeight=smoothstep(.28,1.,along);
        local.y+=sin(phase-along*2.5)*pow(tailWeight,1.5)*bodySize*.045;
      }
      // Each fish atlas has an explicit dorsal side. Facing direction changes
      // only X; its back remains above its belly for either swimming direction.
      // Dragonflies hover at a fixed position and angle.
      if(isFly<.5)scenePosition=at+vec2(local.x*forward.x,local.y*upright);
      else scenePosition=at+forward*local.x+vec2(-forward.y,forward.x)*local.y;
      vec2 screen=(scenePosition/vec2(1672.,941.)-view.xy)/view.zw;
      gl_Position=vec4(screen.x*2.-1.,1.-screen.y*2.,0.,1.);
    }`;
  const spriteFragment = `precision highp float;
    varying vec2 tex,source,scenePosition;uniform sampler2D sheet;
    uniform vec2 polygon[32];uniform int polygonCount;uniform float isFly,depth;
    void main(){
      if(polygonCount>0){
        bool inside=false;vec2 previous=polygon[0];
        for(int j=0;j<32;j++){if(j<polygonCount)previous=polygon[j];}
        for(int i=0;i<32;i++){
          if(i<polygonCount){vec2 current=polygon[i];
            if(((current.y>source.y)!=(previous.y>source.y)) &&
              source.x<(previous.x-current.x)*(source.y-current.y)/(previous.y-current.y)+current.x)inside=!inside;
            previous=current;
          }
        }
        if(!inside)discard;
      }
      vec4 c=texture2D(sheet,tex);
      c.a*=smoothstep(.045,.20,c.a);
      if(isFly>.5)c.a=pow(c.a,.78);
      if(c.a<.015)discard;
      if(isFly<.5){
        float frog=1.-smoothstep(.85,1.05,length((scenePosition-vec2(360.,817.))/vec2(260.,185.)));
        float bottom=smoothstep(880.,929.,scenePosition.y);
        c.a*=(1.-frog)*(1.-bottom)*(.83+depth*.17);
        c.rgb=mix(c.rgb,vec3(.25,.72,.71),.035);
      }
      gl_FragColor=c;
    }`;
  const waterFragment = `precision highp float;varying vec2 uv;
    uniform sampler2D scene;uniform float clock;uniform vec4 drops[16];uniform float strength;uniform vec4 view;
    void main(){
      vec2 sceneUV=uv*view.zw+view.xy;
      vec2 p=sceneUV*vec2(1672.,941.);vec2 displacement=vec2(0.);float light=0.;
      for(int i=0;i<16;i++){
        float age=clock-drops[i].z;
        if(drops[i].w>0. && age>0. && age<5.5){
          vec2 delta=(p-drops[i].xy)*vec2(1.,1.22);
          float d=length(delta),front=d-age*170.;
          float envelope=exp(-front*front/4800.)*exp(-age*.56)*smoothstep(0.,.08,age)*smoothstep(0.,12.,d);
          float wave=(sin(front*.09)+sin(front*.044)*.3)*envelope*drops[i].w;
          displacement+=normalize(delta+vec2(.001))/vec2(1.,1.22)*wave*8.5;
          light+=cos(front*.09)*envelope*drops[i].w*.012;
        }
      }
      float frog=1.-smoothstep(.8,1.15,length((p-vec2(356.,810.))/vec2(285.,180.)));
      float left=(1.-smoothstep(160.,350.,p.x))*smoothstep(525.,745.,p.y);
      float right=smoothstep(1350.,1535.,p.x)*smoothstep(640.,825.,p.y);
      float water=(1.-frog)*(1.-max(left,right))*(1.-smoothstep(845.,925.,p.y));
      vec2 current=vec2(sin(p.y*.018+clock*.61)+cos(p.x*.014-clock*.45),cos(p.x*.012+clock*.47))*.6;
      vec2 q=clamp(sceneUV+(displacement+current)*water*strength/vec2(1672.,941.),vec2(.001),vec2(.999));
      vec3 color=texture2D(scene,vec2(q.x,1.-q.y)).rgb;
      gl_FragColor=vec4(color+light*water*strength,1.);
    }`;
  const bubbleFragment = `precision highp float;varying vec2 uv;uniform float clock;uniform vec4 view;
    void main(){
      vec2 p=(uv*view.zw+view.xy)*vec2(1672.,941.);vec3 color=vec3(0.);float alpha=0.;
      float cycle=mod(clock,8.4);
      // Four bubbles per breath, emitted from the same point at the frog's mouth.
      for(int i=0;i<4;i++){
        float age=cycle-.10-float(i)*.68;
        if(age>0. && age<5.7){
          float grow=smoothstep(0.,.48,age);
          float radius=(i==0?17.:(i==1?12.:(i==2?15.:10.)))*(.24+.76*grow);
          vec2 center=vec2(543.+sin(age*1.25)*7.+age*3.,740.-age*47.);
          vec2 delta=(p-center)/vec2(1.,1.05);
          float angle=atan(delta.y,delta.x);
          float distance=length(delta);
          float rough=sin(angle*5.+.4)*.35+sin(angle*11.)*.20;
          float ring=1.-smoothstep(1.,2.5,abs(distance-radius-rough));
          float glint=(1.-smoothstep(1.4,3.6,length(delta-vec2(-radius*.47,-radius*.62))));
          float inside=(1.-smoothstep(radius-1.,radius+1.,distance))*.035;
          float arc=.54+.34*smoothstep(-.2,.8,-sin(angle+.65));
          float fade=smoothstep(0.,.18,age)*(1.-smoothstep(4.9,5.7,age));
          float a=clamp(ring*arc+glint*.7+inside,0.,.96)*fade;
          vec3 tint=mix(vec3(.73,.93,.92),vec3(1.,.98,.77),smoothstep(-.7,.6,-sin(angle)));
          color=color*(1.-a)+tint*a;alpha=alpha+(1.-alpha)*a;
        }
      }
      gl_FragColor=vec4(color/max(alpha,.001),alpha);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function program(vertex, fragment, uniforms) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return { p, point: gl.getAttribLocation(p, 'point'), ...Object.fromEntries(uniforms.map(u => [u, gl.getUniformLocation(p, u)])) };
  }
  const background = program(quadVertex, imageFragment, ['image','view']);
  const sprite = program(spriteVertex, spriteFragment, ['crop','head','tail','center','at','bodySize','isFly','upright','forward','phase','sheet','polygon[0]','polygonCount','depth','view']);
  const water = program(quadVertex, waterFragment, ['scene','clock','drops[0]','strength','view']);
  const bubbles = program(quadVertex, bubbleFragment, ['clock','view']);
  function buffer(data) {const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b;}
  const quad = buffer([0,0,1,0,0,1,0,1,1,0,1,1]);
  const grid = []; const cols=32, rows=16;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)grid.push(x/cols,y/rows,(x+1)/cols,y/rows,x/cols,(y+1)/rows,x/cols,(y+1)/rows,(x+1)/cols,y/rows,(x+1)/cols,(y+1)/rows);
  const mesh = buffer(grid);
  function bind(p, b) {gl.useProgram(p.p);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(p.point);gl.vertexAttribPointer(p.point,2,gl.FLOAT,false,0,0);}
  function texture(img) {
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(img)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    return t;
  }
  const textures=Object.fromEntries(Object.entries(images).map(([k,img])=>[k,texture(img)]));
  const sceneTexture=texture();const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,sceneTexture,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Scene framebuffer unavailable');
  const movement=createMotion();
  const assignments={ 'koi-red':'redKoi','koi-dark':'darkKoi','fish-left':'orangeKoi','fish-middle':'goldKoi','fish-small':'orangeKoi','fish-bottom':'goldKoi','fish-right':'orangeKoi','dragonfly-small':'dragonflyUpperRight','dragonfly-large':'dragonflyLarge' };
  for(const entry of Object.values(atlas.sprites)){
    entry.mask=new Float32Array(64);entry.polygon?.forEach((p,i)=>entry.mask.set(p,i*2));
  }
  let elapsed=0, lastTime=0, lastDraw=0, frame=0, paused=reduced.matches, comparing=false, lastPointer=0, lastPoint=null, lastStats=0;
  let drops=[], dropCount=0, contextLost=false, bubbleEpoch=0;
  const dropUniforms=new Float32Array(64);
  const fullView=new Float32Array([0,0,1,1]),view=new Float32Array([0,0,1,1]);

  function imagePass(t, crop=fullView) {bind(background,quad);gl.uniform4fv(background.view,crop);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(background.image,0);gl.drawArrays(gl.TRIANGLES,0,6);}
  function drawCreature(c) {
    const spriteName=c.sprite||assignments[c.id];
    const entry=atlas.sprites[spriteName];
    bind(sprite,mesh);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures.creatures);gl.uniform1i(sprite.sheet,0);
    gl.uniform4fv(sprite.crop,entry.rect);gl.uniform2fv(sprite.head,entry.head);gl.uniform2fv(sprite.tail,entry.tail);gl.uniform2fv(sprite.center,entry.center);
    gl.uniform2f(sprite.at,c.x,c.y);gl.uniform1f(sprite.bodySize,c.size);
    gl.uniform2f(sprite.forward,Math.cos(c.angle),Math.sin(c.angle));
    gl.uniform1f(sprite.upright,spriteName==='redKoi'?1:-1);
    gl.uniform4fv(sprite.view,c.kind==='dragonfly'?view:fullView);
    gl.uniform1f(sprite.phase,c.phase);
    gl.uniform1f(sprite.isFly,c.kind==='dragonfly'?1:0);gl.uniform1f(sprite.depth,c.depth);gl.uniform1i(sprite.polygonCount,entry.polygon?.length||0);gl.uniform2fv(sprite['polygon[0]'],entry.mask);
    gl.drawArrays(gl.TRIANGLES,0,grid.length/2);
  }
  function draw() {
    if(contextLost)return;
    gl.disable(gl.BLEND);
    if(comparing){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);imagePass(textures.original,view);return;}
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,W,H);imagePass(textures.clean);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    movement.creatures.filter(c=>c.kind==='fish').sort((a,b)=>a.depth-b.depth).forEach(drawCreature);
    gl.disable(gl.BLEND);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
    bind(water,quad);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);gl.uniform1i(water.scene,0);gl.uniform4fv(water.view,view);
    dropUniforms.fill(0);drops.slice(-16).forEach((d,i)=>dropUniforms.set([d.x,d.y,d.time,d.strength],i*4));
    gl.uniform4fv(water['drops[0]'],dropUniforms);gl.uniform1f(water.clock,elapsed);gl.uniform1f(water.strength,reduced.matches&&paused?0:1);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.BLEND);movement.creatures.filter(c=>c.kind==='dragonfly').forEach(drawCreature);
    bind(bubbles,quad);gl.uniform4fv(bubbles.view,view);gl.uniform1f(bubbles.clock,elapsed-bubbleEpoch);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);
  }
  function ui() {
    if(pauseButton){pauseButton.textContent=paused?labels.play:labels.pause;pauseButton.setAttribute('aria-pressed',String(paused));}
    if(compareButton){compareButton.textContent=comparing?labels.back:labels.compare;compareButton.setAttribute('aria-pressed',String(comparing));}
    if(hint)hint.textContent=comparing?labels.original:paused?labels.paused:labels.hint;
    canvas.dataset.state=comparing?'original':paused?'paused':'playing';
    if(rippleButton)rippleButton.disabled=paused||comparing;
  }
  function animate(ms) {
    frame=0;if(contextLost||document.hidden||paused||comparing)return;
    const dt=lastTime?Math.min((ms-lastTime)/1000,.06):0;lastTime=ms;elapsed+=dt;
    movement.update(dt,elapsed,drops);drops=drops.filter(d=>elapsed-d.time<5.5);
    if(ms-lastDraw>=30){draw();lastDraw=ms;}
    if(ms-lastStats>500){
      canvas.dataset.time=elapsed.toFixed(2);canvas.dataset.creatures=JSON.stringify(movement.creatures.map(c=>({id:c.id,x:+c.x.toFixed(1),y:+c.y.toFixed(1),angle:c.angle,phase:+c.phase.toFixed(3)})));
      const cycle=(elapsed-bubbleEpoch)%8.4;
      canvas.dataset.bubbles=String([.10,.78,1.46,2.14].filter(start=>cycle>start&&cycle<start+5.7).length);
      lastStats=ms;
    }
    frame=requestAnimationFrame(animate);
  }
  function schedule() {if(!contextLost&&!frame&&!paused&&!comparing&&!document.hidden)frame=requestAnimationFrame(animate);}
  function resize() {
    if(contextLost)return;
    const rect=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5,1920/rect.width);
    if(options.fit==='cover'){
      const cover=Math.max(rect.width/W,rect.height/H);
      view[2]=rect.width/(W*cover);view[3]=rect.height/(H*cover);
      view[0]=(1.-view[2])*(rect.width/rect.height<.85?.30:.50);
      view[1]=(1.-view[3])*.50;
    }
    canvas.width=Math.max(2,Math.round(rect.width*dpr));canvas.height=Math.max(2,Math.round(rect.height*dpr));draw();
  }
  function addDrop(x,y,strength=1) {if(paused||comparing)return;drops.push({x,y,time:elapsed,strength});if(drops.length>16)drops.shift();canvas.dataset.interactions=String(++dropCount);}
  stage.addEventListener('pointermove',event=>{
    const now=performance.now();if(now-lastPointer<105)return;
    const r=stage.getBoundingClientRect(),x=(view[0]+(event.clientX-r.left)/r.width*view[2])*W,y=(view[1]+(event.clientY-r.top)/r.height*view[3])*H;
    if(lastPoint&&Math.hypot(x-lastPoint.x,y-lastPoint.y)<15)return;
    lastPoint={x,y};lastPointer=now;addDrop(x,y,.60);
  },{passive:true});
  stage.addEventListener('pointerdown',event=>{
    const r=stage.getBoundingClientRect(),x=(view[0]+(event.clientX-r.left)/r.width*view[2])*W,y=(view[1]+(event.clientY-r.top)/r.height*view[3])*H;
    addDrop(x,y,1.35);
    if(!paused&&!comparing&&x>250&&x<585&&y>630&&y<890)bubbleEpoch=elapsed;
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{lastPoint=null;});
  rippleButton?.addEventListener('click',()=>addDrop(935,460,1.6));
  pauseButton?.addEventListener('click',()=>{paused=!paused;lastTime=0;cancelAnimationFrame(frame);frame=0;ui();draw();schedule();});
  compareButton?.addEventListener('click',()=>{comparing=!comparing;lastTime=0;cancelAnimationFrame(frame);frame=0;ui();draw();schedule();});
  resetButton?.addEventListener('click',()=>{movement.reset();elapsed=0;bubbleEpoch=0;drops=[];lastTime=0;comparing=false;paused=false;ui();draw();schedule();if(!paused)addDrop(935,460,1.2);});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;lastTime=0;ui();draw();schedule();});
  document.addEventListener('keydown',event=>{if(event.code==='Space'&&event.target===document.body){event.preventDefault();pauseButton?.click();}});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;paused=true;cancelAnimationFrame(frame);frame=0;canvas.classList.remove('ready');controls.forEach(b=>b.disabled=true);if(loading){loading.hidden=false;loading.textContent=labels.lost;}});
  controls.forEach(button=>button.disabled=false);resize();ui();canvas.classList.add('ready');if(loading)loading.hidden=true;schedule();
  setTimeout(()=>addDrop(920,475,1.15),650);
}

}
