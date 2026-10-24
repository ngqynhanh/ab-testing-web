import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {route} from './netlify/functions/api.mjs';
import {initial,inviteCodes} from './lib/study.mjs';
const root=path.resolve('public');
process.env.STUDY_OPEN??='true';process.env.STUDY_MODE??='pilot';process.env.STUDY_ID??='local-pilot';process.env.ADMIN_TOKEN??='local-demo-admin-key-change-before-production';
let state;try{state=JSON.parse(await fs.readFile('.dev-state.json','utf8'));}catch{state=initial();}
if(!Object.keys(state.invites).length){const codes=inviteCodes(state,20);await fs.writeFile('.dev-state.json',JSON.stringify(state));await fs.writeFile('.dev-invites.txt',codes.join('\n'));}
let queue=Promise.resolve();
const tx=fn=>{const operation=queue.then(async()=>{const copy=structuredClone(state),result=await fn(copy);await fs.writeFile('.dev-state.tmp',JSON.stringify(copy));await fs.rename('.dev-state.tmp','.dev-state.json');state=copy;return result;});queue=operation.catch(()=>{});return operation;};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost:4173');if(url.pathname.startsWith('/api/')){let body='';for await(const c of req){body+=c;if(body.length>10000){res.writeHead(413);res.end();return;}}const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body})});const r=await route(request,tx);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
export {server};
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port+'\nAdmin: /admin.html\nLocal admin key: '+process.env.ADMIN_TOKEN+'\nDemo invitation codes: .dev-invites.txt\nLocal mode uses disk storage only. Production uses PostgreSQL.'));
