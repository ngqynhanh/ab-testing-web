from pathlib import Path
p=Path(__file__).parent
f=p/'test-http.mjs';s=f.read_text(encoding='utf-8')
a=s.index("r=await fetch(base+'/api/admin-invites'");b=s.index('let s=await r.json()',a)
s=s[:a]+"r=await fetch(base+'/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selectedQuestions:['distortion','overall'],consent:true})});\n"+s[b:]
s=s.replace('i<8','i<16').replace('home, 24 images, invite, 8 saves','home, 48 images, no login, 16 saves')
s=s.replace("process.env.PORT='0';", "process.env.PORT='0';process.env.STUDY_STORAGE='file';process.env.STUDY_MODE='pilot';process.env.STUDY_OPEN='true';process.env.ADMIN_TOKEN='local-demo-admin-key-change-before-production';")
f.write_text(s,encoding='utf-8')
f=p/'test-neon.mjs';s=f.read_text(encoding='utf-8')
a=s.index(" const invites=await request('admin-invites'");b=s.index(' assert.equal(result.status,200)',a)
s=s[:a]+" let result=await request('start',{selectedQuestions:['distortion','overall'],consent:true});\n"+s[b:]
s=s.replace('i<8','i<16').replace('persisted.responses.length,8','persisted.responses.length,16').replace("length,9)","length,17)")
s=s.replace('invite → 8 answers','no login → 16 answers').replace('read 8 saved responses','read 16 saved responses')
a=s.index(" process.env.STUDY_MODE='research';");b=s.index('\n}catch(e)',a)
s=s[:a]+''' process.env.STUDY_MODE='research';process.env.DIMENSIONS_ACKNOWLEDGED='true';process.env.TARGET_PER_QUESTION='6';
 const pairs=[['distortion','preservation'],['distortion','overall'],['preservation','overall']];
 const starts=await Promise.all(Array.from({length:9},(_,i)=>request('start',{selectedQuestions:pairs[i%3],consent:true})));
 assert.equal(starts.filter(r=>r.status===200).length,9);
 assert.equal((await request('start',{selectedQuestions:pairs[0],consent:true})).status,409);
 const report=await request('admin-report',null,process.env.ADMIN_TOKEN);
 assert.ok(report.data.counts.every(c=>c.active===6));
 assert.deepEqual(report.data.summary,{});
 console.log('PASS: 9 concurrent participants reserve exactly 6 slots per criterion; overflow rejected; pilot excluded.');'''+s[b:]
f.write_text(s,encoding='utf-8')
