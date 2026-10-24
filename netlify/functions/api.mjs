import {timingSafeEqual} from 'node:crypto';
import {transaction} from '../../lib/store.mjs';
import {start,answer,findSession,publicSession,availablePairs,questions,profileFields,report,csv,participantsCsv} from '../../lib/study.mjs';
const deny=(msg,status)=>{throw Object.assign(new Error(msg),{status});};
export async function route(request,tx=transaction){
 try{
 const url=new URL(request.url),path=url.pathname.split('/').filter(Boolean).at(-1);
 const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
 const target=Number(process.env.TARGET_PER_QUESTION||30);if(!Number.isInteger(target)||target<2)deny('TARGET_PER_QUESTION phải là số nguyên từ 2 trở lên (ví dụ 20 hoặc 30).',503);
 if(request.method==='GET'&&path==='config'){const mode=process.env.STUDY_MODE||'pilot';return json({mode,open:process.env.STUDY_OPEN==='true',studyId:process.env.STUDY_ID||'retargeting-criteria-v2',questions,profileFields,availablePairs:mode==='pilot'?[...questions.flatMap((q,i)=>questions.slice(i+1).map(r=>[q.id,r.id])),questions.map(q=>q.id)]:await tx(s=>availablePairs(s,target))});}
 const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
 if(path.startsWith('admin-')){const secret=process.env.ADMIN_TOKEN||'';if(secret.length<32)deny('Chưa cấu hình ADMIN_TOKEN tối thiểu 32 ký tự.',503);const a=Buffer.from(token),b=Buffer.from(secret);if(a.length!==b.length||!timingSafeEqual(a,b))deny('Không có quyền quản trị.',401);}
 const body=async()=>{const raw=await request.text();if(raw.length>8000)deny('Yêu cầu quá lớn.',413);try{return JSON.parse(raw);}catch{deny('JSON không hợp lệ.',400);}};
 if(request.method==='POST'&&path==='start'){const p=await body();return json(await tx(s=>start(s,{...p,mode:process.env.STUDY_MODE||'pilot',target,open:process.env.STUDY_OPEN==='true',dimensions:process.env.DIMENSIONS_ACKNOWLEDGED==='true'})));}
 if(request.method==='GET'&&path==='session')return json(await tx(s=>publicSession(findSession(s,token))));
 if(request.method==='POST'&&path==='answer'){const p=await body();return json(await tx(s=>answer(s,token,p)));}
 if(request.method==='GET'&&path==='admin-report')return json(await tx(s=>({...report(s),target})));
 if(request.method==='POST'&&path==='admin-release'){const p=await body();return json(await tx(s=>{const session=s.sessions[p.id];if(!session||session.status!=='active')deny('Chỉ đóng phiên đang làm dở.',400);session.status='released';return {ok:true};}));}
 if(request.method==='GET'&&path==='admin-export')return new Response(await tx(csv),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="responses.csv"','Cache-Control':'no-store'}});
 if(request.method==='GET'&&path==='admin-participants')return new Response(await tx(participantsCsv),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="participants.csv"','Cache-Control':'no-store'}});
 if(request.method==='GET'&&path==='admin-backup')return json(await tx(s=>({studyId:process.env.STUDY_ID||'retargeting-criteria-v2',exportedAt:new Date().toISOString(),state:s})));
 return json({error:'Không tìm thấy API.'});
 }catch(e){if(!e.status)console.error('Study API error code:',e.code||'unknown');return Response.json({error:e.status?e.message:'Lỗi lưu dữ liệu. Vui lòng thử lại.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
}
export default request=>route(request);

