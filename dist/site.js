import { projects, pollenPages } from './projects.js';
import { initWorkRail } from './work-rail.js?v=6';
const base = new URL('.', import.meta.url);
const url = path => new URL(path, base).href;
const assets = name => url(`assets/${name}`);
const email = 'mailto:202422089035@mail.bnu.edu.cn';
const page = document.body.dataset.page;
const nav = `<header class="site-header"><a class="signature" href="${url('')}" aria-label="Hairong Liu — Home"><img src="${assets('Hairong.svg')}" alt="Hairong"><img src="${assets('Liu.svg')}" alt="Liu"></a><nav class="nav" aria-label="Main navigation">${[['work/','Work'],['about/','About'],[email,'Contact']].map(([href,label])=>`<a href="${href===email?email:url(href)}" ${page===label.toLowerCase()||(page==='pollen'&&label==='Work')?'aria-current="page"':''}><img src="${assets(label+'.svg')}" alt="${label}"></a>`).join('')}</nav></header>`;
document.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">Skip to content</a>'+nav);
const main=document.querySelector('main');
if(page==='work'){
 main.className='work';
 const cards=projects.map(p=>`<figure class="work-project" style="--card-width:${p.width}px;--card-gap:${p.gap}px;--card-offset:${p.offset}px">${p.path?`<a href="${url(p.path)}" aria-label="View Pollen Express STEAM Course">`:''}<img src="${assets(p.image)}" alt="${p.title} project artwork"><figcaption><h2>${p.title}</h2><p>${p.description}<br>${p.year}</p></figcaption>${p.path?'</a>':''}</figure>`).join('');
 main.innerHTML=`<h1 class="sr-only">Selected work</h1><div class="work-rail" tabindex="0" role="region" aria-label="Selected projects, horizontally scrolling. Use left and right arrow keys to browse."><div class="work-track"><div class="work-sequence">${cards}</div></div></div><div class="work-controls"><button class="scroll-toggle" type="button">Pause</button></div>`;
 initWorkRail(main.querySelector('.work-rail'), main.querySelector('.scroll-toggle'));
}
if(page==='about'){
 main.className='about';
 main.innerHTML=`<img class="portrait" style="height:auto;object-fit:contain;aspect-ratio:1084 / 1090" src="${assets('portrait.png')}" width="1084" height="1090" alt="Hairong Liu standing in front of leafy trees"><section class="biography"><h1>Hello,</h1><p>I’m Hairong Liu, an M.F.A. student in Design Education at Beijing Normal University. With a background in visual communication design, my work has gradually moved from designing visual experiences to exploring how children learn, create, and participate through designed activities and technologies.<br>My current interests lie at the intersection of child-computer interaction, participatory design, and learning through play and making. Across STEAM curriculum development, children’s museum research, and educational game design, I am particularly interested in how design can make children’s thinking visible and give them greater agency in learning experiences.</p><p>Outside my studies and design work, I enjoy going for a five-kilometer run and capturing beautiful moments in everyday life through photography. My recent favorite read is Fyodor Dostoevsky’s Crime and Punishment. I’m drawn to his precise portrayal of subtle shifts in his characters’ emotions, and I often recognize something of the people around me in the characters he creates.</p><div class="about-links"><a href="${assets('Hairong-Liu-CV.pdf')}" target="_blank" rel="noopener" aria-label="View Hairong Liu CV (PDF)"><img src="${assets('cv.svg')}" alt="CV"></a><a href="${email}" aria-label="Email Hairong Liu"><img src="${assets('email.svg')}" alt="email"></a></div></section>`;
}
if(page==='pollen'){
 main.className='detail';
 main.innerHTML=`<h1 class="sr-only">Pollen Express — STEAM Course, 2026</h1><div class="project-boards">${pollenPages.map((caption,i)=>`<a class="project-board" href="${assets('pollen-'+String(i+1).padStart(2,'0')+'.webp')}" target="_blank" rel="noopener" aria-label="Open full image: ${caption}"><img src="${assets('pollen-'+String(i+1).padStart(2,'0')+'.webp')}" width="2048" height="1152" loading="${i?'lazy':'eager'}" alt="${caption}"></a>`).join('')}</div><a class="back" href="${url('work/')}">← Work</a>`;
}
if(page==='home'){
 document.body.classList.add('home');
 main.className='home-scene';
 main.innerHTML=`<h1 class="sr-only">Hairong Liu — Designer and researcher</h1><img class="home-water" src="${assets('water-photo.jpeg')}" width="1428" height="804" alt=""><canvas class="water-canvas" aria-hidden="true"></canvas>`;
 import('./water.js?v=7').then(({initWater})=>initWater(main.querySelector('canvas'),main.querySelector('img'))).catch(()=>{});
}
