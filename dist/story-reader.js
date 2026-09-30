// A scroll-led reader: native scrolling, complete boards and optional paced reading.
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const number = value => String(value).padStart(2, '0');

export function initStory(main, project, boards, next, {url, assets}) {
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 main.className = 'story';
 main.innerHTML = `
  <div class="reader-bar" aria-label="Project reading controls">
   <a class="reader-back" href="${url('work/')}">← Work</a>
   <span class="reader-title">${escape(project.title)}</span>
   <button class="chapter-toggle" type="button" aria-haspopup="dialog">Chapters <span class="chapter-count">01 / ${number(boards.length)}</span></button>
   <button class="auto-read" type="button" aria-pressed="false">Auto scroll</button>
   <button class="chapter-prev" type="button" aria-label="Previous chapter">←</button>
   <button class="chapter-next" type="button" aria-label="Next chapter">→</button>
   <progress class="reader-progress" max="100" value="0" aria-label="Project reading progress"></progress>
  </div>
  <header class="story-intro"><div><span class="story-year">${escape(project.year)}</span><h1>${escape(project.title)}</h1><p>${escape(project.description)}</p></div><a class="begin-story" href="#chapter-1">Scroll to explore <span aria-hidden="true">↓</span></a></header>
  <div class="story-scenes">${boards.map((board,index)=>`
   <section class="story-scene" id="chapter-${index+1}" aria-labelledby="chapter-title-${index+1}">
    <div class="scene-stage"><div class="scene-heading"><span class="scene-number">${number(index+1)} / ${number(boards.length)}</span><h2 tabindex="-1" id="chapter-title-${index+1}">${escape(board.label)}</h2></div>
     <button class="scene-art" type="button" data-board="${index}" aria-label="Enlarge: ${escape(board.label)}"><img src="${assets(board.image)}" width="${board.width}" height="${board.height}" loading="${index?'lazy':'eager'}" decoding="async" alt="${escape(board.label)}"></button>
     <div class="scene-foot"><span>${index===boards.length-1?'End of project':'Keep scrolling'}</span><button class="enlarge-board" type="button" data-board="${index}" aria-label="Enlarge chapter ${index+1}">View details ↗</button></div>
    </div>
   </section>`).join('')}</div>
  <footer class="story-end"><a href="${url('work/')}">← All work</a><a class="next-project" href="${url(next.path)}"><span>Next project</span><strong>${escape(next.title)} →</strong></a></footer>
  <dialog class="chapter-dialog" aria-labelledby="chapter-dialog-title"><div class="dialog-heading"><h2 id="chapter-dialog-title">${escape(project.title)}</h2><button type="button" class="close-chapters" aria-label="Close chapters">Close ×</button></div><nav aria-label="Project chapters">${boards.map((board,index)=>`<a href="#chapter-${index+1}"><span>${number(index+1)}</span>${escape(board.label)}</a>`).join('')}</nav></dialog>
  <dialog class="art-dialog" aria-labelledby="art-dialog-title"><div class="art-toolbar"><h2 id="art-dialog-title"></h2><button class="zoom-toggle" type="button">Fit to screen</button><a class="original-image" target="_blank" rel="noopener">Open image ↗</a><button class="close-art" type="button" aria-label="Close image">Close ×</button></div><div class="art-scroll" tabindex="0" role="region" aria-label="Enlarged artwork. Scroll horizontally and vertically to explore."><img alt=""></div><p class="art-help">Scroll to explore · Esc to close</p></dialog>`;

 const scenes = [...main.querySelectorAll('.story-scene')];
 const stages = [...main.querySelectorAll('.scene-stage')];
 const bar = main.querySelector('.reader-bar');
 const count = main.querySelector('.chapter-count');
 const previous = main.querySelector('.chapter-prev');
 const following = main.querySelector('.chapter-next');
 const progress = main.querySelector('progress');
 const autoButton = main.querySelector('.auto-read');
 const chapters = main.querySelector('.chapter-dialog');
 const art = main.querySelector('.art-dialog');
 const artScroll = art.querySelector('.art-scroll');
 const artImage = art.querySelector('img');
 const zoom = art.querySelector('.zoom-toggle');
 let current = 0, auto = false, frame = 0, previousTime = 0;
 let sceneTops = [], sceneHeights = [], headerHeight = 64;
 const smooth = () => motion.matches ? 'instant' : 'smooth';

 function setAuto(value) {
  auto = value;
  autoButton.textContent = auto ? 'Pause' : 'Auto scroll';
  autoButton.setAttribute('aria-pressed', String(auto));
  previousTime = 0;
  queue();
 }
 function measure() {
  headerHeight = bar.offsetHeight;
  main.style.setProperty('--reader-height', `${headerHeight}px`);
  sceneTops = scenes.map(scene => scene.getBoundingClientRect().top + scrollY);
  sceneHeights = scenes.map(scene => scene.offsetHeight);
  queue();
 }
 function queue() { if (!frame) frame = requestAnimationFrame(update); }
 function update(time) {
  frame = 0;
  if (auto && !document.hidden) {
   if (previousTime) window.scrollBy(0, Math.min(time - previousTime, 50) * .038);
   previousTime = time;
  }
  const position = scrollY + headerHeight;
  current = Math.max(0, sceneTops.findLastIndex(top => top <= position + innerHeight * .35));
  count.textContent = `${number(current+1)} / ${number(boards.length)}`;
  previous.disabled = current === 0;
  following.disabled = current === boards.length - 1;
  const first = sceneTops[0];
  const end = sceneTops.at(-1) + sceneHeights.at(-1) - innerHeight + headerHeight;
  const fraction = Math.max(0, Math.min(1, (position-first) / Math.max(1, end-first)));
  progress.value = fraction * 100;
  // Keep the full board still during reading; only ease its entrance and departure.
  stages.forEach((stage,index) => {
   const relative = sceneTops[index] - position;
   const enter = Math.max(0, Math.min(1, (relative - innerHeight*.15) / (innerHeight*.65)));
   const exit = Math.max(0, Math.min(1, (position - sceneTops[index] - sceneHeights[index] + innerHeight) / (innerHeight*.7)));
   stage.style.setProperty('--scene-opacity', motion.matches ? 1 : Math.max(.2, 1-enter*.8-exit*.55));
   stage.style.setProperty('--scene-shift', `${motion.matches ? 0 : enter*35-exit*20}px`);
  });
  chapters.querySelectorAll('nav a').forEach((link,index) => {
   if(index===current) link.setAttribute('aria-current','step');
   else link.removeAttribute('aria-current');
  });
  if (auto && position >= end) setAuto(false);
  if (auto) queue();
 }
 function go(index) {
  setAuto(false);
  chapters.close();
  document.body.classList.remove('reader-modal-open');
  index = Math.max(0, Math.min(boards.length-1,index));
  history.replaceState(null,'',`#chapter-${index+1}`);
  // Let the dialog release its focus and scroll lock before moving to the chapter.
  requestAnimationFrame(()=>{
   scenes[index].querySelector('h2').focus({preventScroll:true});
   scenes[index].scrollIntoView({behavior:smooth(),block:'start'});
  });
 }
 previous.addEventListener('click',()=>go(current-1));
 following.addEventListener('click',()=>go(current+1));
 autoButton.addEventListener('click',()=>setAuto(!auto));
 main.querySelector('.begin-story').addEventListener('click',event=>{event.preventDefault();go(0);});
 main.querySelector('.chapter-toggle').addEventListener('click',()=>{setAuto(false);chapters.showModal();});
 main.querySelector('.close-chapters').addEventListener('click',()=>chapters.close());
 chapters.querySelectorAll('nav a').forEach((link,index)=>link.addEventListener('click',event=>{event.preventDefault();go(index);}));
 main.querySelectorAll('[data-board]').forEach(button=>button.addEventListener('click',()=>{
  setAuto(false);
  const board = boards[Number(button.dataset.board)];
  art.querySelector('h2').textContent = board.label;
  artImage.src = assets(board.image);
  artImage.alt = board.label;
  artImage.width = board.width;
  artImage.height = board.height;
  artImage.style.setProperty('--art-width',`${board.width}px`);
  art.querySelector('.original-image').href = assets(board.image);
  art.classList.remove('is-fit');
  zoom.textContent = 'Fit to screen';
  art.showModal();
  artScroll.scrollTo(0,0);
 }));
 zoom.addEventListener('click',()=>{
  const fit = art.classList.toggle('is-fit');
  zoom.textContent = fit ? 'Actual size' : 'Fit to screen';
  artScroll.scrollTo(0,0);
 });
 art.querySelector('.close-art').addEventListener('click',()=>art.close());
 for (const dialog of [chapters,art]) {
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('reader-modal-open');queue();});
  new MutationObserver(()=>document.body.classList.toggle('reader-modal-open',Boolean(art.open||chapters.open))).observe(dialog,{attributes:true,attributeFilter:['open']});
 }
 addEventListener('scroll',queue,{passive:true});
 addEventListener('resize',measure);
 for (const type of ['wheel','touchstart','pointerdown']) addEventListener(type,event=>{if(!autoButton.contains(event.target)&&auto)setAuto(false);},{passive:true});
 addEventListener('keydown',event=>{
  if(auto && !autoButton.contains(event.target)) setAuto(false);
  if(art.open||chapters.open||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('button,a,input,select,textarea'))return;
  if(event.key==='ArrowRight'){event.preventDefault();go(current+1);}
  if(event.key==='ArrowLeft'){event.preventDefault();go(current-1);}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)setAuto(false);});
 motion.addEventListener('change',()=>{setAuto(false);measure();});
 main.classList.add('reader-ready');
 measure();
 // The sections are created after the document loads, so resolve shared chapter links now.
 const initial = location.hash.match(/^#chapter-(\d+)$/);
 if(initial) requestAnimationFrame(()=>go(Number(initial[1])-1));
}
