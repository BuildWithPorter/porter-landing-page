// Six static service illustrations, rendered with the campaign's original paper/contour system.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require=createRequire(process.env.SHOWCASE_TOOLS ? `${process.env.SHOWCASE_TOOLS}/package.json` : import.meta.url);
const {chromium}=require('playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=path.join(root,'scripts/showcase/source');
const server=createServer(async(req,res)=>{try {
 const name=new URL(req.url,'http://localhost').pathname.slice(1);
 const file=path.resolve(name.startsWith('node_modules/')?root:source,name);
 if(!file.startsWith(source+'/')&&!file.startsWith(path.join(root,'node_modules/'))) throw Error('Path');
 const mime={'.css':'text/css','.js':'text/javascript','.html':'text/html','.woff2':'font/woff2'}[path.extname(file)];
 res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 await mkdir(path.join(root,'public/services'),{recursive:true});
 for(let i=0;i<6;i++){
  await page.goto(`http://127.0.0.1:${server.address().port}/service-art.html?fmt=43&service=${i}`);
  await page.waitForFunction(()=>window.READY);
  await page.evaluate(()=>window.render(4));
  await page.screenshot({path:path.join(root,`public/services/service-${i+1}.jpg`),type:'jpeg',quality:88});
 }
}finally{await browser.close();server.close();}
