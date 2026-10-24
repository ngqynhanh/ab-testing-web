import './lib/env.mjs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createPool} from './lib/store.mjs';

if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is missing. Run neon deploy first.');
// Isolated test namespace: never reuse the configured research study ID.
const id='neon-e2e-'+randomBytes(12).toString('hex');
process.env.STUDY_ID=id;
process.env.STUDY_STORAGE='database';
process.env.STUDY_MODE='pilot';
process.env.STUDY_OPEN='true';
process.env.ADMIN_TOKEN=randomBytes(32).toString('hex');
process.env.PORT='0';
const probe=createPool();let server;
try{
 await probe.query('SELECT 1 AS connected');
 console.log('PASS: real Neon PostgreSQL connection.');
 ({server}=await import('./dev.mjs'));
 if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,body,token)=>{
  const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,data:await res.json()};
 };
 assert.equal((await fetch(base)).status,200);
 let result=await request('start',{profile:{ageGroup:'25_34',gender:'prefer_not',career:'employed',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'},selectedQuestions:['distortion','preservation','overall'],consent:true});
 assert.equal(result.status,200);let session=result.data;const token=session.token;
 const first={trialId:session.trial.id,choice:'left',rt:1200};
 const concurrent=await Promise.all([request('answer',first,token),request('answer',first,token)]);
 assert.ok(concurrent.every(r=>r.status===200&&r.data.index===1));session=concurrent[0].data;
 for(let i=1;i<24;i++){
  for(const file of [session.trial.original,session.trial.left,session.trial.right])assert.equal((await fetch(base+'/stimuli/'+file)).status,200);
  const saved=await request('answer',{trialId:session.trial.id,choice:i%2?'tie':'right',rt:1500},token);
  assert.equal(saved.status,200);session=saved.data;
 }
 assert.equal(session.status,'complete');
 assert.equal((await request('session',null,token)).data.status,'complete');
 const stored=await probe.query('SELECT payload FROM retargeting_studies WHERE id=$1',[id]);
 const persisted=Object.values(stored.rows[0].payload.sessions).find(s=>s.id===session.id);
 assert.equal(persisted.responses.length,24);assert.equal(persisted.status,'complete');
 assert.deepEqual(persisted.profile,{ageGroup:'25_34',gender:'prefer_not',career:'employed',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'});assert.equal(persisted.profileVersion,2);
 const people=await fetch(base+'/api/admin-participants',{headers:{Authorization:'Bearer '+process.env.ADMIN_TOKEN}});assert.equal(people.status,200);assert.ok((await people.text()).includes('field_of_work'));
 console.log('PASS: seven participant fields stored in PostgreSQL and participant CSV.');
 const exported=await fetch(base+'/api/admin-export',{headers:{Authorization:'Bearer '+process.env.ADMIN_TOKEN}});
 assert.equal(exported.status,200);assert.equal((await exported.text()).split('\r\n').length,25);
 console.log('PASS: app started; no login → 24 answers → resume → completion → CSV; independently read 24 saved responses from Neon.');
 console.log('PASS: simultaneous retry stored only one response.');
 process.env.STUDY_MODE='research';process.env.DIMENSIONS_ACKNOWLEDGED='true';process.env.TARGET_PER_QUESTION='6';
 const pairs=[['distortion','preservation'],['distortion','overall'],['preservation','overall']];
 const starts=await Promise.all(Array.from({length:9},(_,i)=>request('start',{profile:{ageGroup:'25_34',gender:'prefer_not',career:'employed',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'},selectedQuestions:pairs[i%3],consent:true})));
 assert.equal(starts.filter(r=>r.status===200).length,9);
 assert.equal((await request('start',{profile:{ageGroup:'25_34',gender:'prefer_not',career:'employed',fieldOfWork:'it_ai',imageExperience:'basic',vision:'clear_with_glasses',priorParticipation:'no'},selectedQuestions:pairs[0],consent:true})).status,409);
 const report=await request('admin-report',null,process.env.ADMIN_TOKEN);
 assert.ok(report.data.counts.every(c=>c.active===6));
 assert.deepEqual(report.data.summary,{});
 console.log('PASS: 9 concurrent participants reserve exactly 6 slots per criterion; overflow rejected; pilot excluded.');
}catch(e){console.error('Neon end-to-end failed:',e.code||e.name, e instanceof assert.AssertionError?e.message:'See preceding PASS lines for the last completed stage.');process.exitCode=1;}
finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 try{await probe.query('DELETE FROM retargeting_studies WHERE id=$1',[id]);console.log('PASS: removed only the generated end-to-end test study.');}
 catch(e){console.error('Test-study cleanup failed:',e.code||e.name);process.exitCode=1;}
 await probe.end();
}
