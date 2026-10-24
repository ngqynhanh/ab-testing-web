import test from 'node:test';import assert from 'node:assert/strict';
import {route} from '../netlify/functions/api.mjs';import {initial} from '../lib/study.mjs';
test('API auth, invitation start, resume, answer, export and invalid input',async()=>{
 process.env.ADMIN_TOKEN='test-admin-secret-with-at-least-32-characters';process.env.STUDY_OPEN='true';process.env.STUDY_MODE='pilot';
 let state=initial();const tx=async fn=>{const copy=structuredClone(state);const r=await fn(copy);state=copy;return r;};
 const call=(p,{method='GET',body,token}={})=>route(new Request('http://localhost/api/'+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),tx);
 assert.equal((await call('admin-report')).status,401);
 const codes=await (await call('admin-invites',{method:'POST',body:{count:1},token:process.env.ADMIN_TOKEN})).json();
 const p=await(await call('start',{method:'POST',body:{code:codes.codes[0],consent:true}})).json();assert.equal(p.total,8);assert.ok(p.token);
 assert.equal((await call('session',{token:p.token})).status,200);
 assert.equal((await call('answer',{method:'POST',token:p.token,body:{trialId:p.trial.id,choice:'bogus',rt:100}})).status,400);
 const q=await(await call('answer',{method:'POST',token:p.token,body:{trialId:p.trial.id,choice:'right',rt:1000}})).json();assert.equal(q.index,1);
 const csv=await(await call('admin-export',{token:process.env.ADMIN_TOKEN})).text();assert.ok(csv.includes('reaction_time_ms'));assert.equal(csv.split('\r\n').length,2);
 assert.equal((await call('session',{token:'wrong'})).status,401);
});
