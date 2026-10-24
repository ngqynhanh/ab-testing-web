import pg from 'pg';
import {Pool as NeonPool, neonConfig} from '@neondatabase/serverless';
import WebSocket from 'ws';
import {initial} from './study.mjs';
neonConfig.webSocketConstructor = WebSocket;
export function createPool(connectionString=process.env.DATABASE_URL){
 if(!connectionString)throw Object.assign(new Error('Chưa cấu hình DATABASE_URL trên máy chủ.'),{status:503});
 const hostname=new URL(connectionString).hostname;
 const Pool=hostname.endsWith('.neon.tech')?NeonPool:pg.Pool;
 return new Pool({connectionString,max:1,connectionTimeoutMillis:15000});
}
export async function transaction(fn){
 const pool=createPool();let c;
 try{
  c=await pool.connect();
  await c.query('BEGIN');
  const id=process.env.STUDY_ID||'retargeting-v1';
  await c.query('INSERT INTO retargeting_studies(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,JSON.stringify(initial())]);
  const {rows}=await c.query('SELECT payload FROM retargeting_studies WHERE id=$1 FOR UPDATE',[id]);
  const state=rows[0].payload;const result=await fn(state);
  await c.query('UPDATE retargeting_studies SET payload=$2 WHERE id=$1',[id,JSON.stringify(state)]);
  await c.query('COMMIT');return result;
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c?.release();await pool.end();}
}
