// Only the photograph is refracted. The SVG lettering stays on a separate, sharp layer.
export function initWater(canvas, image) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const invitation = document.querySelector('.water-invitation');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    varying vec2 uv; uniform sampler2D painting; uniform vec2 viewport; uniform vec2 imageSize;
    uniform float now; uniform vec4 drops[20];
    void main(){
      vec2 screen=vec2(uv.x,1.-uv.y); vec2 shift=vec2(0.); float light=0.;
      for(int i=0;i<20;i++){
        float age=now-drops[i].z;
        if(age>0. && age<4.6 && drops[i].w>0.){
          // A shallow viewing angle makes the ripples elliptical, like the photograph.
          vec2 delta=(screen-drops[i].xy)*viewport*vec2(1.,1.48);
          float dist=length(delta); float ring=dist-age*155.;
          float fadeIn=smoothstep(0.,.10,age);
          float envelope=exp(-ring*ring/4200.)*exp(-age*.78)*fadeIn*smoothstep(0.,24.,dist);
          float wave=sin(ring*.092)*envelope*drops[i].w;
          vec2 direction=normalize(delta+vec2(.001))/vec2(1.,1.48);
          shift+=direction*wave*17.;
          light+=wave*direction.y*.022;
        }
      }
      float cover=max(viewport.x/imageSize.x,viewport.y/imageSize.y);
      vec2 visible=viewport/(imageSize*cover);
      vec2 tex=(screen-.5+shift/viewport)*visible+.5;
      gl_FragColor=vec4(texture2D(painting,clamp(tex,vec2(.001),vec2(.999))).rgb+light,1.);
    }`;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  let program;
  try { program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return; } catch {return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const loc=Object.fromEntries(['painting','viewport','imageSize','now','drops[0]'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const drops=new Float32Array(80);let next=0,frame=0,ready=false,introduced=false,lastEvent=0,lastPoint=null,lastDrop=-10000;
  function render(ms){
    frame=0;if(!ready||document.hidden)return;
    gl.uniform1f(loc.now,ms/1000);gl.uniform4fv(loc['drops[0]'],drops);gl.drawArrays(gl.TRIANGLES,0,6);
    if(ms-lastDrop<4700&&!reduced.matches)frame=requestAnimationFrame(render);
  }
  function schedule(){if(!frame&&ready&&!document.hidden)frame=requestAnimationFrame(render);}
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(loc.viewport,rect.width,rect.height);schedule();}
  function drop(x,y,strength){if(reduced.matches||!ready||document.hidden)return;const rect=canvas.getBoundingClientRect(),ms=performance.now();drops.set([(x-rect.left)/rect.width,(y-rect.top)/rect.height,ms/1000,strength],next*4);next=(next+1)%20;lastDrop=ms;canvas.dataset.interactions=String((Number(canvas.dataset.interactions)||0)+1);schedule();}
  function hint(){if(invitation)invitation.hidden=reduced.matches||!ready;}
  function introduce(){if(!introduced&&ready&&!document.hidden&&!reduced.matches){introduced=true;drop(innerWidth*.55,innerHeight*.50,1.15);}}
  function load(){
    if(!image.naturalWidth)return;
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.uniform1i(loc.painting,0);gl.uniform2f(loc.imageSize,image.naturalWidth,image.naturalHeight);ready=true;resize();canvas.classList.add('is-ready');canvas.dataset.rippleState=reduced.matches?'reduced-motion':'ready';hint();
    // One introductory drop makes the water interaction discoverable; then it rests.
    setTimeout(introduce,650);
  }
  if(image.complete)load();else image.addEventListener('load',load,{once:true});
  window.addEventListener('pointermove',event=>{if(event.target.closest('a,button'))return;const ms=performance.now();if(ms-lastEvent<90)return;if(lastPoint&&Math.hypot(event.clientX-lastPoint.x,event.clientY-lastPoint.y)<18)return;lastEvent=ms;lastPoint={x:event.clientX,y:event.clientY};drop(event.clientX,event.clientY,.9);},{passive:true});
  window.addEventListener('pointerdown',event=>{if(event.target.closest('a,button'))return;drop(event.clientX,event.clientY,1.55);},{passive:true});
  window.addEventListener('pointerleave',()=>{lastPoint=null;});
  invitation?.addEventListener('click',()=>drop(innerWidth*.55,innerHeight*.5,1.55));
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{drops.fill(0);schedule();setTimeout(introduce,400);}});
  reduced.addEventListener('change',()=>{drops.fill(0);canvas.dataset.rippleState=reduced.matches?'reduced-motion':'ready';hint();schedule();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);ready=false;canvas.classList.remove('is-ready');hint();});
}
