const FMT=new URLSearchParams(location.search).get('fmt')||'916';
const LAYOUT={'916':{W:1080,H:1920,hx:96,hy:200,hw:900,hs:80,vy:640,vs:1,ly:110,lf:40,ls:64,ey:760,es:84,hzx:'70%',hzy:'45%'},
              '43':{W:1440,H:1080,hx:80,hy:112,hw:1280,hs:60,vy:318,vs:.72,ly:30,lf:30,ls:44,ey:500,es:60,hzx:'70%',hzy:'50%'},
              '45':{W:1080,H:1350,hx:96,hy:100,hw:880,hs:68,vy:420,vs:.8,ly:70,lf:34,ls:54,ey:420,es:72,hzx:'72%',hzy:'50%'}}[FMT];
(function(){const R=document.documentElement.style;for(const k in LAYOUT){const v=LAYOUT[k];R.setProperty('--'+k,typeof v==='number'?v+'px':v)}})();
const $=id=>document.getElementById(id);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const lerp=(a,b,k)=>a+(b-a)*k;
const ease=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};const out=x=>1-Math.pow(1-clamp(x),4);
const win=(t,a,d)=>clamp((t-a)/d);const money=v=>'$'+Math.round(v).toLocaleString('en-US');
const GRAIN='<svg id="grain" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>';
const LOGO=`<div id="logo"><svg height="${LAYOUT.ls}" viewBox="0 0 120 64"><circle cx="32" cy="32" r="28" style="fill:var(--l1)"/><circle cx="56" cy="32" r="28" style="fill:var(--l2)"/><circle cx="84" cy="32" r="28" style="fill:var(--l3)"/></svg><span>Porter</span></div>`;
// flowing contour field
function buildField(){const W=LAYOUT.W,H=LAYOUT.H;const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.id='field';s.setAttribute('width',W);s.setAttribute('height',H);
 s.innerHTML=`<defs><linearGradient id="fg" x1="0" x2="1"><stop offset="0" style="stop-color:var(--c1)" stop-opacity="0"/><stop offset=".45" style="stop-color:var(--c2)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--c1)" stop-opacity=".15"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="6"/></filter></defs><g id="fl"></g><g id="rb" filter="url(#gl)"></g><g id="rb2"></g>`;
 $('stage').insertBefore(s,$('stage').children[1]);}
const NL=34;
function fieldPath(i,t,W,H){const y0=H*.50+i*(H*.016);const amp=H*.06+i*1.5;let d='';for(let x=-40;x<=W+40;x+=24){const y=y0+Math.sin(x*.004+t*.25+i*.18)*amp*.6+Math.sin(x*.0017-t*.15+i*.05)*amp-(x/W)*H*.22;d+=(x<-39?'M':'L')+x+' '+y.toFixed(1)}return d}
function renderField(t,alpha=1){const W=LAYOUT.W,H=LAYOUT.H;let g='';for(let i=0;i<NL;i++){const o=(.16+.42*Math.sin(i/NL*Math.PI))*alpha;g+=`<path d="${fieldPath(i,t,W,H)}" fill="none" stroke="url(#fg)" stroke-width="1.2" opacity="${o.toFixed(3)}"/>`}
 $('fl').innerHTML=g;const r=fieldPath(NL*.45,t,W,H);$('rb').innerHTML=`<path d="${r}" fill="none" style="stroke:var(--rib)" stroke-width="6" opacity="${.35*alpha}"/>`;$('rb2').innerHTML=`<path d="${r}" fill="none" stroke="url(#fg)" stroke-width="1.6" opacity="${.9*alpha}"/>`}
function heads(){for(const h of document.querySelectorAll('.hd')){h.innerHTML=(h.dataset.k?`<div class="kk">${h.dataset.k}</div>`:'')+h.dataset.l.split('|').map(l=>`<div class="ln"><span>${l}</span></div>`).join('')}}
function head(id,a,b,t){const h=$(id);const o=ease(win(t,b-.5,.5));h.style.opacity=(t<a||t>b)?0:1-o;const kk=h.querySelector('.kk');if(kk){const q=out(win(t,a,.7));kk.style.opacity=.82*q;kk.style.transform=`translateY(${(1-q)*12}px)`}h.querySelectorAll('.ln span').forEach((s,j)=>{const q=out(win(t,a+j*.14,.9));s.style.transform=`translateY(${(1-q)*105}%)`;s.style.opacity=q});h.style.transform=`translateY(${-o*10}px)`}
function fade(el,t,a,b,dy=30,din=.8,dout=.5){const i=out(win(t,a,din)),o=ease(win(t,b,dout));el.style.opacity=i*(1-o);el.style.transform=(el.dataset.base||'')+` translateY(${(1-i)*dy-o*dy*.5}px)`;el.style.filter=`blur(${(1-i)*10}px)`}
function sheen(el,t,a){const e=el.querySelector('.edge');if(!e)return;const k=win(t,a,1.4);e.style.opacity=k>0&&k<1?Math.sin(k*Math.PI):0;e.style.backgroundPosition=`${-300+k*900}px 0`;e.style.backgroundSize='200% 100%'}
function endCard(t,a){const k=out(win(t,a,1));$('end').style.opacity=k;$('end').querySelectorAll('.ln span').forEach((s,j)=>{const q=out(win(t,a+j*.14,.9));s.style.transform=`translateY(${(1-q)*105}%)`})}
function stageFade(t,d){$('stage').style.opacity=Math.min(out(t/.4),1-ease(win(t,d-.5,.5)))}
function vizScale(t){$('viz').style.transform=`scale(${LAYOUT.vs*(1+.02*t/20)})`}
function typeInto(el,s,t,a,b){el.textContent=s.slice(0,Math.round(s.length*win(t,a,b-a)))}
function ready(){const th=new URLSearchParams(location.search).get('theme');if(th)document.body.className='t-'+th;heads();buildField();document.fonts.ready.then(()=>{window.READY=true;window.render(0)})}
