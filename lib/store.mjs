import pg from 'pg';
import {Pool as NeonPool, neonConfig} from '@neondatabase/serverless';
import WebSocket from 'ws';
import {initial} from './study.mjs';
neonConfig.webSocketConstructor = WebSocket;
export function createPool(connectionString=process.env.DATABASE_URL){
 if(!connectionString)throw Object.assign(new Error('Chưa cấu hình DATABASE_URL trên máy chủ.'),{status:503});
 let hostname;try{hostname=new URL(connectionString).hostname;}catch{hostname='';}
 if(!hostname||hostname==='HOST'||!hostname.includes('.')&&hostname!=='localhost')throw Object.assign(new Error('DATABASE_URL trên máy chủ chưa hợp lệ (vẫn là giá trị mẫu). Hãy dán connection string thật của database.'),{status:503});
 const Pool=hostname.endsWith('.neon.tech')?NeonPool:pg.Pool;
 return new Pool({connectionString,max:1,connectionTimeoutMillis:15000});
}
const dbMessages={ENOTFOUND:'Không tìm thấy máy chủ database. Kiểm tra lại DATABASE_URL.',ECONNREFUSED:'Database từ chối kết nối. Kiểm tra lại DATABASE_URL.','28P01':'Sai tên đăng nhập hoặc mật khẩu database trong DATABASE_URL.','3D000':'Tên database trong DATABASE_URL không tồn tại.','42P01':'Chưa tạo bảng dữ liệu. Hãy chạy npm run db:migrate.'};
function dbError(e){const msg=!e.status&&dbMessages[e.code];return msg?Object.assign(new Error(msg),{status:503,code:e.code}):e;}
export async function transaction(fn){
 const pool=createPool();let c;
 try{
  c=await pool.connect();
  await c.query('BEGIN');
  const id=process.env.STUDY_ID||'retargeting-criteria-v2';
  await c.query('INSERT INTO retargeting_studies(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,JSON.stringify(initial())]);
  const {rows}=await c.query('SELECT payload FROM retargeting_studies WHERE id=$1 FOR UPDATE',[id]);
  const state=rows[0].payload;const result=await fn(state);
  await c.query('UPDATE retargeting_studies SET payload=$2 WHERE id=$1',[id,JSON.stringify(state)]);
  await c.query('COMMIT');return result;
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});throw dbError(e);}finally{c?.release();await pool.end();}
}
