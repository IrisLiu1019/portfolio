export function initWorkRail(rail, button) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const first=rail.querySelector('.work-sequence');
  const clone=first.cloneNode(true);clone.setAttribute('aria-hidden','true');
  clone.querySelectorAll('a').forEach(a=>a.tabIndex=-1);
  rail.querySelector('.work-track').append(clone);
  let paused=reduced.matches,hover=false,focused=false,dragging=false,delay=performance.now()+1800,last=0,position=0,frame=0;
  function label(){button.textContent=paused?'Play':'Pause';button.setAttribute('aria-label',paused?'Play automatic project scrolling':'Pause automatic project scrolling');button.setAttribute('aria-pressed',String(paused));rail.dataset.autoscroll=paused?'paused':'playing';}
  function tick(now){
    frame=0;const dt=Math.min((now-(last||now))/1000,.06);last=now;
    if(!paused&&!hover&&!focused&&!dragging&&!document.hidden&&now>delay){
      position+=dt*24;const length=first.getBoundingClientRect().width;
      if(length&&position>=length)position-=length;
      rail.scrollLeft=position;
    }else position=rail.scrollLeft;
    if(!document.hidden)frame=requestAnimationFrame(tick);
  }
  button.addEventListener('click',()=>{paused=!paused;label();});
  // Empty gallery space should not stop the exhibition; pause over a project only.
  rail.querySelectorAll('.work-project').forEach(card=>{
    card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')hover=true;});
    card.addEventListener('pointerleave',()=>{hover=false;});
  });
  rail.addEventListener('focusin',event=>{focused=event.target!==rail;});
  rail.addEventListener('focusout',event=>{focused=event.relatedTarget!==rail&&rail.contains(event.relatedTarget);});
  rail.addEventListener('pointerdown',()=>{dragging=true;delay=performance.now()+6000;},{passive:true});
  window.addEventListener('pointerup',()=>{dragging=false;delay=performance.now()+2500;},{passive:true});
  window.addEventListener('pointercancel',()=>{dragging=false;},{passive:true});
  rail.addEventListener('wheel',event=>{
    delay=performance.now()+5000;
    if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){
      const multiplier=event.deltaMode===1?16:event.deltaMode===2?rail.clientWidth:1;
      rail.scrollLeft+=event.deltaY*multiplier;position=rail.scrollLeft;event.preventDefault();
    }
  },{passive:false});
  rail.addEventListener('keydown',event=>{
    if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
      event.preventDefault();paused=true;label();
      const length=first.getBoundingClientRect().width;
      rail.scrollLeft=event.key==='Home'?0:event.key==='End'?length-rail.clientWidth:rail.scrollLeft+(event.key==='ArrowRight'?280:-280);
      position=rail.scrollLeft;
    }
  });
  rail.addEventListener('scroll',()=>{const length=first.getBoundingClientRect().width;if(length&&rail.scrollLeft>=length){rail.scrollLeft-=length;position=rail.scrollLeft;}},{passive:true});
  reduced.addEventListener('change',()=>{paused=reduced.matches;label();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;if(!frame)frame=requestAnimationFrame(tick);}});
  label();frame=requestAnimationFrame(tick);
}
