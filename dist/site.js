import { projects, projectStories } from './projects.js?v=19';
import { initStory } from './story-reader.js?v=19';
import { initWorkRail } from './work-rail.js?v=6';
import { initWorkRipples } from './work-ripples.js?v=19';
const base = new URL('.', import.meta.url);
const version = new URL(import.meta.url).searchParams.get('v');
const url = path => {
 const target = new URL(path, base);
 // Keep internal navigation on this preview revision, including previously visited pages.
 if(version && (!path || path.endsWith('/'))) target.searchParams.set('v', version);
 return target.href;
};
const assets = name => url(`assets/${name}`);
const email = 'mailto:202422089035@mail.bnu.edu.cn';
const page = document.body.dataset.page;
const nav = `<header class="site-header"><a class="signature" href="${url('')}" aria-label="Hairong Liu — Home"><img src="${assets('Hairong.svg')}" alt="Hairong"><img src="${assets('Liu.svg')}" alt="Liu"></a><nav class="nav" aria-label="Main navigation">${[['work/','Work'],['about/','About'],[email,'Contact']].map(([href,label])=>`<a href="${href===email?email:url(href)}" ${page===label.toLowerCase()||(page==='project'&&label==='Work')?'aria-current="page"':''}><img src="${assets(label+'.svg')}" alt="${label}"></a>`).join('')}</nav></header>`;
document.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">Skip to content</a>'+nav);
const main=document.querySelector('main');
if(page==='work'){
 main.className='work';
 const cards=projects.map(p=>`<figure class="work-project" style="--card-width:${p.width}px;--card-gap:${p.gap}px;--card-offset:${p.offset}px"><a href="${url(p.path)}" aria-label="View ${p.title}"><img src="${assets(p.image)}" alt="${p.title} project artwork"><figcaption><h2>${p.title}</h2><p>${p.description}<br>${p.year}</p></figcaption></a></figure>`).join('');
 main.innerHTML=`<h1 class="sr-only">Selected work</h1><div class="work-rail" tabindex="0" role="region" aria-label="Selected projects, horizontally scrolling. Use left and right arrow keys to browse."><div class="work-track"><div class="work-sequence">${cards}</div></div></div><div class="work-controls"><button class="scroll-toggle" type="button">Pause</button></div>`;
 initWorkRail(main.querySelector('.work-rail'), main.querySelector('.scroll-toggle'));
 initWorkRipples(main.querySelector('.work-rail'));
}
if(page==='about'){
 main.className='about';
 main.innerHTML=`<img class="portrait" style="height:auto;object-fit:contain;aspect-ratio:1084 / 1090" src="${assets('portrait.png')}" width="1084" height="1090" alt="Hairong Liu standing in front of leafy trees"><section class="biography"><h1>Hello,</h1><p>I’m Hairong Liu, an M.F.A. student in Design Education at Beijing Normal University. With a background in visual communication design, my work has gradually moved from designing visual experiences to exploring how children learn, create, and participate through designed activities and technologies.<br>My current interests lie at the intersection of child-computer interaction, participatory design, and learning through play and making. Across STEAM curriculum development, children’s museum research, and educational game design, I am particularly interested in how design can make children’s thinking visible and give them greater agency in learning experiences.</p><p>Outside my studies and design work, I enjoy jogging and capturing beautiful moments in everyday life through photography. My recent favorite read is Fyodor Dostoevsky’s Crime and Punishment. I’m drawn to his precise portrayal of subtle shifts in his characters’ emotions, and I often recognize something of the people around me in the characters he creates.</p><div class="about-links"><a href="${url('cv/')}" target="_blank" rel="noopener" aria-label="View Hairong Liu CV"><img src="${assets('cv.svg')}" alt="CV"></a><a href="${email}" aria-label="Email Hairong Liu"><img src="${assets('email.svg')}" alt="email"></a></div></section>`;
}
if(page==='project'){
 const project=projects.find(p=>p.slug===document.body.dataset.project);
 const next=projects[(projects.indexOf(project)+1)%projects.length];
 initStory(main, project, projectStories[project.slug], next, {url, assets});
}
if(page==='home'){
 document.body.classList.add('home');
 main.className='home-scene';
 main.innerHTML=`<h1 class="sr-only">Hairong Liu — Designer and researcher</h1><div id="stage" class="intro-stage"><img id="fallback" class="home-water" src="${assets('pond-opening.webp')}" width="1672" height="941" alt="A painted pond with lily pads, fish and a frog"><canvas id="pond" class="water-canvas" aria-label="Interactive pond. Move or tap the water to make ripples. Fish swim in schools and dragonflies circle the lily pads."></canvas><span id="loading" class="intro-status" role="status">Opening the pond…</span></div><div class="home-tools"><button id="ripple" class="water-invitation" type="button" aria-label="Create a ripple in the water">Touch the water <span aria-hidden="true">↗</span></button><button id="pause" class="water-toggle" type="button" aria-pressed="false">Pause motion</button></div>`;
 import('./pond/scene.js?v=19').then(({initPond})=>initPond(main,{
   fit:'cover',
   assets:{original:assets('pond-clean.webp'),clean:assets('pond-clean.webp'),creatures:assets('pond-creatures.webp')},
   atlasUrl:url('pond/atlas.json'),
   onFallback:()=>{main.querySelector('#loading').hidden=true;main.querySelector('.home-tools').hidden=true;},
   labels:{pause:'Pause motion',play:'Play motion',hint:'Move or tap the water',paused:'Motion paused',error:'Explore the portfolio below.',lost:'Explore the portfolio below.'}
 })).catch(()=>{main.querySelector('#loading').hidden=true;main.querySelector('.home-tools').hidden=true;});
}
