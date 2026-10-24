import test from 'node:test';import assert from 'node:assert/strict';import {route} from '../netlify/functions/api.mjs';import {initial} from '../lib/study.mjs';
test('API config, unauthenticated participant start, secure admin, resume, answer, CSV',async()=>{
process.env.ADMIN_TOKEN='test-admin-secret-with-at-least-32-characters';process.env.STUDY_OPEN='true';process.env.STUDY_MODE='pilot';process.env.TARGET_PER_QUESTION='30';
let state=initial();const tx=async fn=>{const copy=structuredClone(state),result=await fn(copy);state=copy;return result;};
const call=(p,{method='GET',body,token}={})=>route(new Request('http://localhost/api/'+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),tx);
const c=await(await call('config')).json();assert.equal(c.questions.length,3);assert.equal(c.profileFields.length,7);assert.equal(c.availablePairs.length,4);assert.equal((await call('admin-report')).status,401);assert.equal((await call('admin-participants')).status,401);
const p=await(await call('start',{method:'POST',body:{profile:{ageGroup:'25_34',gender:'prefer_not',career:'employed',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'},selectedQuestions:['distortion','preservation'],consent:true}})).json();assert.equal(p.total,16);assert.ok(p.token);assert.equal((await call('session',{token:p.token})).status,200);
assert.equal((await call('answer',{method:'POST',token:p.token,body:{trialId:p.trial.id,choice:'bad',rt:100}})).status,400);
const q=await(await call('answer',{method:'POST',token:p.token,body:{trialId:p.trial.id,choice:'right',rt:1000}})).json();assert.equal(q.index,1);
const output=await(await call('admin-export',{token:process.env.ADMIN_TOKEN})).text();assert.ok(output.includes('question_id'));assert.equal(output.split('\r\n').length,2);assert.equal((await call('session',{token:'wrong'})).status,401);
const people=await(await call('admin-participants',{token:process.env.ADMIN_TOKEN})).text();assert.equal(people.split('\r\n').length,2);assert.ok(people.includes('"25_34","prefer_not","employed"'));
});
