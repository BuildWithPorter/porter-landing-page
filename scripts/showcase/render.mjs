import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const require = createRequire(process.env.SHOWCASE_TOOLS ? `${process.env.SHOWCASE_TOOLS}/package.json` : import.meta.url);
const { chromium } = require('playwright');
const ffmpeg = require('ffmpeg-static');
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = path.join(root, 'scripts/showcase/source');
const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url)));
const mode = process.argv[2] || 'posters';
const chosen = process.argv[3] ? manifest.filter(x => x.slug === process.argv[3]) : manifest;
const server = createServer(async (req,res) => {
 try {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  const file = name.startsWith('node_modules/') ? path.join(root,name) : path.join(source,name);
  if (!file.startsWith(source) && !file.startsWith(path.join(root,'node_modules/'))) throw Error('Path');
  const mime={'.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.html':'text/html'}[path.extname(file)];
  res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});res.end(await readFile(file));
 }catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
async function encode(args,input) {
 const child=spawn(ffmpeg,['-y','-loglevel','error',...args],{stdio:[input?'pipe':'ignore','ignore','inherit']});
 const done=once(child,'exit').then(([code])=>{if(code)throw Error(`ffmpeg: ${code}`)});
 return {child,done};
}
try {
 for (const item of chosen) {
  const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
  page.on('pageerror',error=>{throw error});
  await page.goto(`${origin}/${item.source}?fmt=43`);await page.waitForFunction(()=>window.READY===true);
  await page.evaluate(()=>document.fonts.ready);
  const dest=path.join(root,'public/use-cases',item.slug);await mkdir(dest,{recursive:true});
  await page.evaluate(t=>window.renderWebsite(t),item.poster);
  await page.screenshot({path:path.join(dest,`${item.slug}-poster.jpg`),type:'jpeg',quality:90});
  await page.setViewportSize({width:720,height:540});
  await page.addStyleTag({content:'html{width:720px!important;height:540px!important}body{transform:scale(.5);transform-origin:0 0}'});
  await page.screenshot({path:path.join(dest,`${item.slug}-poster-small.jpg`),type:'jpeg',quality:85});
  await page.setViewportSize({width:1440,height:1080});
  await page.addStyleTag({content:'html{width:1440px!important;height:1080px!important}body{transform:none}'});
  if(mode==='frames'){
   for(const t of [2,6,8.5,10.5]) {await page.evaluate(t=>window.renderWebsite(t),t);await page.screenshot({path:`/tmp/porter-showcase-reference/${item.slug}-${t}.jpg`,type:'jpeg',quality:88});}
  }
  if(mode==='video') {
   const mp4=path.join(dest,`${item.slug}.mp4`);
   const {child,done}=await encode(['-f','image2pipe','-framerate','24','-i','-','-an','-c:v','libx264','-threads','4','-pix_fmt','yuv420p','-crf','25','-preset','fast','-movflags','+faststart',mp4],true);
   for(let frame=0;frame<288;frame++) {
    await page.evaluate(t=>window.renderWebsite(t),frame/24);
    const buffer=await page.screenshot({type:'jpeg',quality:90});
    if(!child.stdin.write(buffer))await once(child.stdin,'drain');
   }
   child.stdin.end();await done;
   const webm=await encode(['-i',mp4,'-an','-c:v','libvpx-vp9','-threads','4','-row-mt','1','-crf','36','-b:v','0',path.join(dest,`${item.slug}.webm`)],false);await webm.done;
  }
  console.log(`${mode}: ${item.slug}`);await page.close();
 }
} finally {await browser.close();server.close();}
