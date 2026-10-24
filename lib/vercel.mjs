import {route} from './http.mjs';
const actions=new Set(['config','start','session','answer','admin-report','admin-release','admin-export','admin-participants','admin-backup']);
export function handleRequest(request,tx){
 const url=new URL(request.url);
 // Rewrites may preserve the public URL or present the destination URL.
 // The explicit action query works in both cases and never carries secrets.
 const action=url.searchParams.get('studyAction')||url.pathname.split('/').filter(Boolean).at(-1);
 if(!actions.has(action))return Response.json({error:'Không tìm thấy API.'},{status:404,headers:{'Cache-Control':'no-store'}});
 return route(request,tx,action);
}
