process.env.PORT='0';
const {server}=await import('./dev.mjs');
if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
const headers={Authorization:'Bearer local-demo-admin-key-change-before-production'};
let r=await fetch(base+'/');if(!r.ok)throw Error('homepage');
r=await fetch(base+'/api/admin-invites',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({count:1})});
const inv=await r.json();
r=await fetch(base+'/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:inv.codes[0],consent:true})});
let s=await r.json();if(!s.token)throw Error(JSON.stringify(s));const token=s.token;
for(let i=0;i<8;i++){
 for(const f of [s.trial.original,s.trial.left,s.trial.right])if(!(await fetch(base+'/stimuli/'+f)).ok)throw Error('image failed');
 s=await(await fetch(base+'/api/answer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({trialId:s.trial.id,choice:i%3===0?'tie':i%2?'left':'right',rt:1200})})).json();
}
if(s.status!=='complete')throw Error('not complete');
const report=await(await fetch(base+'/api/admin-report',{headers})).json();
const csv=await(await fetch(base+'/api/admin-export',{headers})).text();if(!csv.includes(s.id))throw Error('missing export');
console.log('HTTP smoke passed: home, 24 images, invite, 8 saves, completion, report, CSV. Pilot excluded:',Object.keys(report.summary).length===0);
server.close();
