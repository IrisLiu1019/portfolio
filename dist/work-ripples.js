// Refract the preview pixels under the pointer; captions and links stay native.
export function initWorkRipples(rail) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'work-water-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let gl, program, texture, uniforms, active, frame = 0, drops = [], hovering = false;
  let lastPoint = null, lastDrop = 0, failed = false;
  const vertex = `attribute vec2 point; varying vec2 uv;
    void main(){uv=point;gl_Position=vec4(point.x*2.-1.,1.-point.y*2.,0.,1.);}`;
  const fragment = `precision mediump float;
    varying vec2 uv; uniform sampler2D artwork; uniform vec2 size;
    uniform vec4 drops[8]; uniform float time;
    void main(){
      vec2 pixel=uv*size, displacement=vec2(0.);
      float light=0.;
      for(int i=0;i<8;i++){
        vec2 offset=pixel-drops[i].xy;
        float age=time-drops[i].z;
        float distance=length(offset);
        if(drops[i].w>0. && age>=0. && age<1.65){
          float crest=distance-age*115.;
          float envelope=exp(-pow(crest/29.,2.))*pow(1.-age/1.65,1.4);
          float wave=sin(crest/8.5)*envelope*drops[i].w;
          displacement+=offset/max(distance,1.)*wave*4.2;
          light+=cos(crest/8.5)*envelope*.012;
        }
      }
      float edge=smoothstep(0.,14.,min(min(pixel.x,size.x-pixel.x),min(pixel.y,size.y-pixel.y)));
      vec2 bent=clamp(uv+clamp(displacement,vec2(-7.),vec2(7.))*edge/size,vec2(.001),vec2(.999));
      vec4 color=texture2D(artwork,bent);
      gl_FragColor=vec4(color.rgb+light*edge,color.a);
    }`;
  function initialize() {
    if (gl) return true;
    if (failed) return false;
    try {
      gl = canvas.getContext('webgl', {alpha:true,antialias:false,premultipliedAlpha:false});
      if (!gl) throw new Error('WebGL unavailable');
      const compile = (type, source) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program,'point'); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      uniforms = Object.fromEntries(['artwork','size','drops[0]','time'].map(name=>[name,gl.getUniformLocation(program,name)]));
      gl.uniform1i(uniforms.artwork,0);
      return true;
    } catch(error) { failed=true; gl=null; return false; }
  }
  function clear() {
    cancelAnimationFrame(frame); frame=0; drops=[]; lastPoint=null;
    active?.classList.remove('water-active'); active=null;
    canvas.remove(); hovering=false;
  }
  function draw(now) {
    frame=0;
    if (!active || reduced.matches || document.hidden) {clear();return;}
    const time=now/1000;
    drops=drops.filter(drop=>time-drop.time<1.65);
    if (!hovering && !drops.length) {clear();return;}
    const rect=active.getBoundingClientRect(), ratio=Math.min(devicePixelRatio||1,2);
    const width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
    if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uniforms.size,rect.width,rect.height); gl.uniform1f(uniforms.time,time);
    const data=new Float32Array(32);
    drops.forEach((drop,i)=>data.set([drop.x*rect.width,drop.y*rect.height,drop.time,drop.strength],i*4));
    gl.uniform4fv(uniforms['drops[0]'],data); gl.drawArrays(gl.TRIANGLES,0,6);
    active.classList.add('water-active');
    canvas.dataset.state=drops.length?'rippling':'still'; canvas.dataset.waves=String(drops.length);
    if (drops.length) frame=requestAnimationFrame(draw);
  }
  function wake() {if (!frame) frame=requestAnimationFrame(draw);}
  function addDrop(event, strength=1) {
    const rect=active.getBoundingClientRect();
    const x=event.clientX-rect.left,y=event.clientY-rect.top,now=performance.now();
    if(strength===1 && lastPoint && (now-lastDrop<65 || Math.hypot(x-lastPoint.x,y-lastPoint.y)<6)) return;
    drops.push({x:x/rect.width,y:y/rect.height,time:now/1000,strength});
    if(drops.length>8)drops.shift();
    lastPoint={x,y};lastDrop=now;wake();
  }
  rail.querySelectorAll('.work-project img').forEach(img=>{
    const preview=document.createElement('span'); preview.className='work-preview';
    img.before(preview);preview.append(img);
    function enter(event) {
      if(event.pointerType==='touch'||reduced.matches||!img.complete||!img.naturalWidth||!initialize())return;
      if(active!==preview){
        clear(); active=preview;preview.append(canvas);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      }
      hovering=true;addDrop(event,1.15);
    }
    preview.addEventListener('pointerenter',enter,{passive:true});
    preview.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'||reduced.matches)return;
      if(active!==preview)enter(event);else addDrop(event);
    },{passive:true});
    preview.addEventListener('pointerleave',()=>{if(active===preview){hovering=false;lastPoint=null;wake();}},{passive:true});
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;gl=null;clear();});
  reduced.addEventListener('change',()=>{if(reduced.matches)clear();});
  window.addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('resize',()=>{if(active)wake();});
}
