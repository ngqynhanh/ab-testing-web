import test from 'node:test';import assert from 'node:assert/strict';
import {handleRequest} from '../lib/vercel.mjs';
import entry from '../api/study.mjs';
import {initial} from '../lib/study.mjs';
import fs from 'node:fs';
test('Vercel entry accepts native Request; direct and rewritten config URLs work',async()=>{
 process.env.STUDY_MODE='pilot';process.env.STUDY_OPEN='true';
 assert.equal(typeof entry.fetch,'function');
 for(const path of ['/api/config','/api/study?studyAction=config','/api/config?studyAction=config']){
  const r=await entry.fetch(new Request('https://example.vercel.app'+path));assert.equal(r.status,200);
  const data=await r.json();assert.equal(data.profileFields.length,7);assert.equal(data.questions.length,3);assert.equal(data.availablePairs.length,4);assert.equal(r.headers.get('cache-control'),'no-store');
 }
});
test('Vercel rewrite preserves POST body, authorization, resume and both CSV exports',async()=>{
 process.env.STUDY_MODE='pilot';process.env.STUDY_OPEN='true';process.env.ADMIN_TOKEN='vercel-test-admin-key-at-least-32-characters';
 let state=initial();const tx=async fn=>{const copy=structuredClone(state),r=await fn(copy);state=copy;return r;};
 const call=(action,body,token)=>handleRequest(new Request('https://study.vercel.app/api/study?studyAction='+action,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),tx);
 const profile={ageGroup:'25_34',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'};
 const response=await call('start',{consent:true,selectedQuestions:['distortion','overall','preservation'],profile});assert.equal(response.status,200);let s=await response.json();assert.equal(s.total,24);const token=s.token;
 for(let i=0;i<24;i++){const r=await call('answer',{trialId:s.trial.id,choice:'tie',rt:1000},token);assert.equal(r.status,200);s=await r.json();}
 assert.equal(s.status,'complete');assert.equal((await(await call('session',null,token)).json()).status,'complete');
 assert.equal((await call('admin-export')).status,401);
 for(const [path,lines]of [['admin-export',25],['admin-participants',2]]){const r=await call(path,null,process.env.ADMIN_TOKEN);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/csv/);assert.equal((await r.text()).split('\r\n').length,lines);}
 assert.equal((await call('missing')).status,404);
});
test('Vercel configuration publishes only public files and includes server dataset explicitly',()=>{
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.equal(config.outputDirectory,'public');assert.equal(config.functions['api/study.mjs'].includeFiles,'data/tables.json');assert.ok(fs.existsSync('api/study.mjs'));assert.ok(config.rewrites.some(r=>r.source==='/api/:action'&&r.destination==='/api/study?studyAction=:action'));
});
