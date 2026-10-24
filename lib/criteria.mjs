import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import fs from 'node:fs';import path from 'node:path';
const tables=JSON.parse(fs.readFileSync(path.resolve('data/tables.json'),'utf8'));
export const questions=[
 {id:'distortion',label:'Ít biến dạng',prompt:'Which result has less visual distortion?',hint:'So với ảnh gốc, chú ý hình dạng, tỷ lệ đối tượng và các đường nét.'},
 {id:'preservation',label:'Giữ nội dung chính',prompt:'Which result crops out less important content?',hint:'So với ảnh gốc, chú ý nội dung quan trọng bị mất hoặc bị cắt.'},
 {id:'overall',label:'Chất lượng tổng thể',prompt:'Which result is better overall?',hint:'Đánh giá chất lượng tổng thể theo cảm nhận của bạn, dựa trên ảnh gốc.'}
];
export const baselines=['retvi','cycleir','selfplay','linear'];
export const profileFields=[
 {id:'ageGroup',label:'Nhóm tuổi',options:[['18_24','18–24'],['25_34','25–34'],['35_44','35–44'],['45_54','45–54'],['55_plus','≥55']]},
 {id:'gender',label:'Giới tính',optional:true,options:[['male','Nam'],['female','Nữ'],['other','Giới tính khác'],['prefer_not','Không muốn trả lời']]},
 {id:'career',label:'Nghề nghiệp',optional:true,options:[['student','Sinh viên'],['employed','Đang đi làm'],['other','Khác'],['prefer_not','Không muốn trả lời']]},
 {id:'fieldOfWork',label:'Lĩnh vực học tập / làm việc',options:[['it_ai','CNTT–AI'],['design_photography','Thiết kế–nhiếp ảnh'],['other','Lĩnh vực khác']]},
 {id:'imageExperience',label:'Kinh nghiệm xử lý ảnh',options:[['none','Chưa có'],['basic','Cơ bản'],['frequent','Thường xuyên'],['professional_research','Chuyên môn hoặc nghiên cứu']]},
 {id:'vision',label:'Khả năng nhìn ảnh hiện tại',options:[['clear_without_glasses','Nhìn rõ không cần kính'],['clear_with_glasses','Nhìn rõ khi dùng kính'],['difficulty','Vẫn khó nhìn rõ']]},
 {id:'priorParticipation',label:'Đã tham gia đánh giá này chưa?',options:[['no','Chưa'],['yes','Đã tham gia']]}
];
function validateProfile(profile){if(!profile||typeof profile!=='object'||Array.isArray(profile))fail('Vui lòng điền thông tin người tham gia.');const clean={};for(const f of profileFields){const value=profile[f.id];if(f.optional&&(value===undefined||value==='')){clean[f.id]='not_provided';continue;}if(!f.options.some(([v])=>v===value))fail('Thông tin '+f.label+' không hợp lệ.');clean[f.id]=value;}return clean;}
const pool=Object.keys(tables).filter(k=>k.startsWith('group_')&&k.endsWith('_A')).flatMap(k=>{const [h,...rows]=tables[k];return rows.map(r=>Object.fromEntries(h.map((v,i)=>[v,r[i]])));});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function initial(){return {revision:2,sessions:{}};}
export function ensureV2(s){if(s.revision!==2)fail('Dữ liệu đang dùng thiết kế cũ. Đặt STUDY_ID mới cho thiết kế 3 tiêu chí rồi redeploy; dữ liệu cũ được giữ nguyên.',409);}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function counts(state){ensureV2(state);return questions.map(q=>({question:q.id,label:q.label,completed:Object.values(state.sessions).filter(s=>s.mode==='research'&&s.status==='complete'&&s.questions.includes(q.id)).length,active:Object.values(state.sessions).filter(s=>s.mode==='research'&&s.status==='active'&&s.questions.includes(q.id)).length}));}
export function availablePairs(state,target){const c=counts(state),pairs=[];for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++){
 const r=c.map((q,k)=>target-q.completed-q.active-(k===i||k===j?1:0)),sum=r.reduce((a,b)=>a+b,0);
 // Pairs and triples can fill remaining quotas when no criterion exceeds the other two combined.
 if(r.every(n=>n>=0)&&Math.max(...r)<=sum-Math.max(...r))pairs.push([c[i].question,c[j].question]);
}const r=c.map(q=>target-q.completed-q.active-1),sum=r.reduce((a,b)=>a+b,0);if(r.every(n=>n>=0)&&Math.max(...r)<=sum-Math.max(...r))pairs.push(c.map(q=>q.question));return pairs;}
export function publicSession(s){const t=s.trials[s.responses.length],q=t?questions.find(q=>q.id===t.question_id):null;return {id:s.id,mode:s.mode,status:s.status,index:s.responses.length,total:s.trials.length,questions:s.questions,trial:t?{id:t.trial_id,question:q.id,prompt:q.prompt,hint:q.hint,questionIndex:s.responses.filter(r=>r.question_id===q.id).length+1,questionTotal:8,original:t.original,left:t.left_image,right:t.right_image}:null};}
export function findSession(state,token){ensureV2(state);const s=Object.values(state.sessions).find(s=>s.token===token&&typeof token==='string'&&token.length>=32);if(!s)fail('Phiên không hợp lệ. Hãy liên hệ người nghiên cứu.',401);return s;}
export function start(state,{selectedQuestions,profile,consent,mode='pilot',target=30,open=false,dimensions=false}){
 ensureV2(state);if(!['pilot','research'].includes(mode))fail('STUDY_MODE phải là pilot hoặc research.',503);
 if(!consent)fail('Bạn cần đồng ý tham gia.');if(!open)fail('Nghiên cứu chưa mở tuyển người.',403);if(mode==='research'&&!dimensions)fail('Chưa xác nhận quy trình kích thước ảnh.',403);
 if(!Array.isArray(selectedQuestions)||selectedQuestions.length<2||selectedQuestions.length>3||new Set(selectedQuestions).size!==selectedQuestions.length||selectedQuestions.some(id=>!questions.some(q=>q.id===id)))fail('Hãy chọn ít nhất 2 và tối đa 3 tiêu chí khác nhau.');
 if(mode==='research'&&!availablePairs(state,target).some(p=>p.length===selectedQuestions.length&&p.every(q=>selectedQuestions.includes(q))))fail('Cặp tiêu chí hoặc bộ ba này đã đủ người hoặc cần giới hạn để cân bằng chỉ tiêu. Vui lòng tải lại và chọn bộ tiêu chí còn mở.',409);
 const cleanProfile=validateProfile(profile);
 const used=new Set(),trials=[];
 for(const q of shuffle([...selectedQuestions])){
  const block=[];
  for(const b of shuffle([...baselines])){
   const candidates=shuffle(pool.filter(r=>r.baseline===b&&!used.has(r.image_id)));
   if(candidates.length<2)fail('Không đủ ảnh để lấy mẫu.',503);
   for(let i=0;i<2;i++){
    const r=candidates[i];used.add(r.image_id);
    const source=r.left_method==='ours'?['left','right']:['right','left'],sides=i===0?source:[...source].reverse();
    block.push({...r,trial_id:q+'__'+r.trial_id,question_id:q,left_image:r[sides[0]+'_image'],right_image:r[sides[1]+'_image'],left_method:r[sides[0]+'_method'],right_method:r[sides[1]+'_method'],left_width:r[sides[0]+'_width'],left_height:r[sides[0]+'_height'],right_width:r[sides[1]+'_width'],right_height:r[sides[1]+'_height']});
   }
  }
  trials.push(...shuffle(block));
 }
 const s={id:randomUUID(),token:randomBytes(32).toString('base64url'),mode,questions:[...selectedQuestions],profile:cleanProfile,profileVersion:2,consentVersion:'participant-background-v2',status:'active',createdAt:new Date().toISOString(),trials,responses:[]};
 state.sessions[s.id]=s;return {...publicSession(s),token:s.token};
}
export function answer(state,token,p){const s=findSession(state,token);if(s.status==='released')fail('Phiên đã được đóng bởi quản trị viên.',409);
 if(!['left','right','tie'].includes(p.choice))fail('Lựa chọn không hợp lệ.');if(!Number.isFinite(p.rt)||p.rt<0||p.rt>86400000)fail('Thời gian phản hồi không hợp lệ.');
 const old=s.responses.find(r=>r.trial_id===p.trialId);if(old){if(old.choice!==p.choice)fail('Lượt đã được ghi với lựa chọn khác.',409);return publicSession(s);}
 const t=s.trials[s.responses.length];if(!t||t.trial_id!==p.trialId)fail('Thứ tự lượt không khớp. Hãy tải lại trang.',409);
 s.responses.push({...t,choice:p.choice,rt:p.rt,receivedAt:new Date().toISOString()});if(s.responses.length===s.trials.length){s.status='complete';s.completedAt=new Date().toISOString();}return publicSession(s);
}
export function report(state){ensureV2(state);const summary={};for(const s of Object.values(state.sessions)){if(s.mode!=='research'||s.status!=='complete')continue;for(const r of s.responses){summary[r.question_id]??={};const a=summary[r.question_id][r.baseline]??={ours:0,baseline:0,tie:0,total:0};a.total++;if(r.choice==='tie')a.tie++;else if(r[r.choice+'_method']==='ours')a.ours++;else a.baseline++;}}
 return {counts:counts(state),summary,questions,profileFields,sessions:Object.values(state.sessions).map(s=>({id:s.id,mode:s.mode,questions:s.questions,profile:s.profile||null,status:s.status,progress:s.responses.length,total:s.trials.length,createdAt:s.createdAt})),note:'Only complete research sessions count. Completion does not imply quality validation.'};}
export function csv(state){ensureV2(state);const fields=['participant_id','age_group','gender','career','field_of_work','image_experience','vision','prior_participation','mode','status','selected_questions','question_id','question_prompt','trial_order','trial_id','image_id','baseline','left_method','right_method','choice','winner','reaction_time_ms','received_at','size_mismatch','profile_version','consent_version'];const all=[fields];for(const s of Object.values(state.sessions))s.responses.forEach((r,i)=>all.push([s.id,s.profile?.ageGroup||'not_collected',s.profile?.gender||'not_collected',s.profile?.career||'not_collected',s.profile?.fieldOfWork||'not_collected',s.profile?.imageExperience||'not_collected',s.profile?.vision||'not_collected',s.profile?.priorParticipation||'not_collected',s.mode,s.status,s.questions.join('|'),r.question_id,questions.find(q=>q.id===r.question_id).prompt,i+1,r.trial_id,r.image_id,r.baseline,r.left_method,r.right_method,r.choice,r.choice==='tie'?'tie':r[r.choice+'_method'],r.rt,r.receivedAt,r.size_mismatch,s.profileVersion||'not_collected',s.consentVersion||'not_collected']));return '\ufeff'+all.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}

export function participantsCsv(state){ensureV2(state);const all=[['participant_id','age_group','gender','career','field_of_work','image_experience','vision','prior_participation','mode','status','selected_questions','responses_count','trials_total','created_at','completed_at','consent_version','profile_version']];for(const s of Object.values(state.sessions))all.push([s.id,s.profile?.ageGroup||'not_collected',s.profile?.gender||'not_collected',s.profile?.career||'not_collected',s.profile?.fieldOfWork||'not_collected',s.profile?.imageExperience||'not_collected',s.profile?.vision||'not_collected',s.profile?.priorParticipation||'not_collected',s.mode,s.status,s.questions.join('|'),s.responses.length,s.trials.length,s.createdAt,s.completedAt||'',s.consentVersion||'not_collected',s.profileVersion||'not_collected']);return '\ufeff'+all.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}
