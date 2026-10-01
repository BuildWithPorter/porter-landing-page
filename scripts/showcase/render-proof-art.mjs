// Workflow vignettes illustrate the supplied stories; they contain no invented metrics.
import { mkdir,writeFile } from 'node:fs/promises';
const folder=new URL('../../public/proof/',import.meta.url);await mkdir(folder,{recursive:true});
const text=(x,y,s,size=19,fill='#1A1C1C')=>`<text x="${x}" y="${y}" fill="${fill}" font-family="Georgia,serif" font-size="${size}">${s}</text>`;
const paper=(x,y,w,h,body,rotate=0,dark=false)=>`<g transform="translate(${x} ${y}) rotate(${rotate} ${w/2} ${h/2})"><rect x="10" y="12" width="${w}" height="${h}" fill="#707973" opacity=".09"/><rect width="${w}" height="${h}" fill="${dark?'url(#dark)':'url(#paper)'}" stroke="${dark?'#707973':'#fff'}" stroke-width=".8" filter="url(#shadow)"/>${body}</g>`;
const line=(d)=>`<path d="${d}" fill="none" stroke="#2D6A4F" stroke-width="1.5" opacity=".7"/>`;
const scenes=[
 line('M325 105V160M160 205V160H490V205M325 160V205')+paper(235,28,180,80,text(30,47,'Group accounts',21),-3,true).replace('fill="#1A1C1C"','fill="#F2F0EA"')+[90,255,420].map((x,i)=>paper(x,192,140,68,text(19,40,['Company A','Company B','Company C'][i],18),[-5,0,5][i])).join(''),
 line('M245 150C335 150 310 205 395 205')+paper(105,30,180,195,text(20,38,'Invoice',26)+line('M20 62H155M20 86H155M20 110H120')+text(20,166,'SENT',14,'#2D6A4F'),-7)+paper(370,110,185,126,text(20,40,'Payment',25)+text(20,78,'Matched to invoice',16,'#2D6A4F'),5),
 line('M320 78C125 78 135 220 315 220C520 220 525 78 320 78')+paper(100,90,180,115,text(22,39,'Home team',23)+text(22,78,'Payroll + records',16),-6)+paper(385,90,180,115,text(22,39,'Overseas team',23)+text(22,78,'Pay + commissions',16),6)+text(253,266,'One finance function',17,'#2D6A4F'),
 paper(105,35,160,210,text(20,35,'Receipts',25)+line('M20 65H130')+text(20,88,'Sales',18)+text(20,124,'Sales tax',18)+text(20,160,'Payroll',18),-9)+paper(330,65,230,175,text(25,42,'Weekly profit',27)+line('M25 135H205')+text(25,78,'Sales − costs',20)+text(25,112,'= profit',24,'#2D6A4F')+text(24,158,'Food-cost view',15),4),
 paper(85,60,230,165,text(22,41,'Annual contract',25)+line('M22 70H200')+text(22,112,'Terms → schedule',18),-6)+paper(325,65,245,166,text(20,37,'Revenue by month',22)+['Jan','Feb','Mar','Apr'].map((m,i)=>text(22+i*53,78,m,15)+`<rect x="${22+i*53}" y="95" width="35" height="45" fill="#2D6A4F" opacity="${.35+i*.15}"/>`).join(''),5),
 paper(110,45,205,175,text(22,42,'Client deposits',24)+text(22,110,'Held separately',18,'#2D6A4F'),-7)+paper(350,80,205,175,text(22,42,'Studio fees',24)+text(22,110,'Recognized as earned',16,'#2D6A4F'),6)+line('M325 40V255'),
 line('M150 180H530')+[140,280,420].map((x,i)=>`<circle cx="${x}" cy="180" r="7" fill="#2D6A4F"/>`+paper(x-55,55,145,92,text(15, 32,['Credit line','Draw','Interest'][i],20)+text(15, 65,['Available','Recorded','Tracked'][i],15),i*4-4)).join(''),
 line('M175 100H470M175 205H470M320 100V205')+[['Online',105,35],['Stores',375,35],['Wholesale',105,160],['Workshops',375,160]].map(([t,x,y],i)=>paper(x,y,170,85,text(20,48,t,23),i%2?5:-5)).join(''),
 paper(190,48,230,208,text(26, 40,'Porter',22)+line('M26 65H200')+text(26,106,'Investor report',27)+text(26,145,'Current books.',18)+text(26,177,'Ready for questions.',18),-7)+paper(400,146,140,96,text(17,39,'Month end',19)+text(17, 70,'Reviewed',16,'#2D6A4F'),7),
 line('M245 90C340 90 300 110 405 110')+line('M245 210C340 210 300 170 405 170')+paper( 80,45,195,190,text(20,42,'Billing system',24)+text(20,100,'Payout A',19)+text(20,150,'Payout B',19),-5)+paper(385,70,185,150,text(20,42,'Bank deposits',23)+text(20,90,'Matched',19,'#2D6A4F'),5)
];
for(let i=0;i<scenes.length;i++){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="650" height="300" viewBox="0 0 650 300"><defs><linearGradient id="paper" x2=".8" y2="1"><stop stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#EDEBE8" stop-opacity=".78"/></linearGradient><linearGradient id="dark" x2="1" y2="1"><stop stop-color="#38423C"/><stop offset="1" stop-color="#101211"/></linearGradient><filter id="shadow" x="-40%" y="-40%" width="190%" height="210%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#101211" flood-opacity=".13"/></filter></defs>${scenes[i]}</svg>`;
 await writeFile(new URL(`story-${i+1}.svg`,folder),svg);
}
