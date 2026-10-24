import {randomBytes,createHash,randomInt} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const tables=JSON.parse(fs.readFileSync(path.resolve('data/tables.json'),'utf8'));
export const conditions=Object.keys(tables).filter(k=>k.startsWith('group_'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export function initial(){return {revision:1,invites:{},sessions:{}};}
const rows=condition=>tables[condition].slice(1).map(r=>Object.fromEntries(tables[condition][0].map((h,i)=>[h,r[i]])));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function counts(state){return conditions.map(condition=>({condition,completed:Object.values(state.sessions).filter(s=>s.condition===condition&&s.mode==='research'&&s.status==='complete').length,active:Object.values(state.sessions).filter(s=>s.condition===condition&&s.mode==='research'&&s.status==='active').length}));}
export function publicSession(s){const trial=rows(s.condition).find(r=>r.trial_id===s.order[s.responses.length]);return {id:s.id,mode:s.mode,status:s.status,index:s.responses.length,total:s.order.length,trial:trial?{id:trial.trial_id,original:trial.original,left:trial.left_image,right:trial.right_image}:null};}
export function findSession(state,token){const s=Object.values(state.sessions).find(s=>s.tokenHash===hash(token||''));if(!s)fail('Phiên không hợp lệ. Hãy nhập lại mã mời.',401);return s;}
export function start(state,{code,consent,mode='pilot',target=5,open=false,dimensions=false}){
 if(!['pilot','research'].includes(mode))fail('STUDY_MODE phải là pilot hoặc research.',503);
 if(!consent)fail('Bạn cần đồng ý tham gia.');
 if(!open)fail('Nghiên cứu chưa mở tuyển người.',403);
 if(mode==='research'&&!dimensions)fail('Chưa xác nhận quy trình kích thước ảnh.',403);
 const invite=state.invites[hash(String(code||'').trim())];
 if(!invite)fail('Mã mời không hợp lệ.',401);
 if(invite.sessionId)fail('Mã đã được sử dụng. Tiếp tục trên trình duyệt ban đầu hoặc liên hệ người nghiên cứu.',409);
 // The enclosing database transaction locks the study row, serializing allocation.
 const slots=shuffle(counts(state)).filter(c=>c.completed+c.active<target).sort((a,b)=>(a.completed+a.active)-(b.completed+b.active));
 if(mode==='research'&&!slots.length)fail('Đã đủ số lượng đăng ký. Vui lòng liên hệ người nghiên cứu.',409);
 const condition=mode==='pilot'?'pilot_8_trials':slots[0].condition;
 const token=randomBytes(32).toString('hex');
 const s={id:randomBytes(12).toString('hex'),tokenHash:hash(token),condition,mode,status:'active',createdAt:new Date().toISOString(),order:shuffle(rows(condition).map(r=>r.trial_id)),responses:[]};
 state.sessions[s.id]=s;invite.sessionId=s.id;
 return {...publicSession(s),token};
}
export function answer(state,token,p){const s=findSession(state,token);if(s.status==='released')fail('Phiên đã được đóng bởi quản trị viên.',409);
 if(!['left','right','tie'].includes(p.choice))fail('Lựa chọn không hợp lệ.');
 if(!Number.isFinite(p.rt)||p.rt<0||p.rt>86400000)fail('Thời gian phản hồi không hợp lệ.');
 const old=s.responses.find(r=>r.trialId===p.trialId);
 if(old){if(old.choice!==p.choice)fail('Lượt đã được ghi với lựa chọn khác.',409);return publicSession(s);}
 if(s.order[s.responses.length]!==p.trialId)fail('Thứ tự lượt không khớp. Hãy tải lại trang.',409);
 const t=rows(s.condition).find(r=>r.trial_id===p.trialId);
 s.responses.push({trialId:p.trialId,choice:p.choice,rt:p.rt,receivedAt:new Date().toISOString(),...t});
 if(s.responses.length===s.order.length){s.status='complete';s.completedAt=new Date().toISOString();}
 return publicSession(s);
}
export function inviteCodes(state,n){if(!Number.isInteger(n)||n<1||n>500)fail('Số mã phải từ 1 đến 500.');return Array.from({length:n},()=>{const code=randomBytes(8).toString('hex').toUpperCase();state.invites[hash(code)]={createdAt:new Date().toISOString()};return code;});}
export function report(state){const summary={};for(const s of Object.values(state.sessions)){if(s.mode!=='research'||s.status!=='complete')continue;for(const r of s.responses){const a=summary[r.baseline]??={ours:0,baseline:0,tie:0,total:0};a.total++;if(r.choice==='tie')a.tie++;else if(r[r.choice+'_method']==='ours')a.ours++;else a.baseline++;}}
 return {counts:counts(state),summary,sessions:Object.values(state.sessions).map(s=>({id:s.id,mode:s.mode,condition:s.condition,status:s.status,progress:s.responses.length,total:s.order.length,createdAt:s.createdAt})),note:'Summary includes completed research sessions only; completion does not imply quality validation.'};}
export function csv(state){const fields=['participant_id','mode','condition','status','trial_order','trial_id','image_id','baseline','left_method','right_method','choice','winner','reaction_time_ms','received_at','size_mismatch'];const all=[fields];for(const s of Object.values(state.sessions))s.responses.forEach((r,i)=>all.push([s.id,s.mode,s.condition,s.status,i+1,r.trialId,r.image_id,r.baseline,r.left_method,r.right_method,r.choice,r.choice==='tie'?'tie':r[r.choice+'_method'],r.rt,r.receivedAt,r.size_mismatch]));return '\ufeff'+all.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}
