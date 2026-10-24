import pg from 'pg';
import {initial} from './study.mjs';
let pool;
export async function transaction(fn){
 if(!process.env.DATABASE_URL)throw Object.assign(new Error('Chưa cấu hình DATABASE_URL trên máy chủ.'),{status:503});
 pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(19841024)');
  await c.query('CREATE TABLE IF NOT EXISTS retargeting_studies (id text PRIMARY KEY, payload jsonb NOT NULL)');
  const id=process.env.STUDY_ID||'retargeting-v1';
  await c.query('INSERT INTO retargeting_studies(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,JSON.stringify(initial())]);
  const {rows}=await c.query('SELECT payload FROM retargeting_studies WHERE id=$1 FOR UPDATE',[id]);
  const state=rows[0].payload;const result=await fn(state);
  await c.query('UPDATE retargeting_studies SET payload=$2 WHERE id=$1',[id,JSON.stringify(state)]);
  await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
