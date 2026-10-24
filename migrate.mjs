import './lib/env.mjs';
import {readFile} from 'node:fs/promises';
import {createPool} from './lib/store.mjs';
const pool=createPool(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
try{
 await pool.query(await readFile(new URL('./migrations/001_studies.sql',import.meta.url),'utf8'));
 console.log('PASS: migration 001_studies.sql applied; table retargeting_studies exists.');
}catch(e){console.error('Migration failed:',e.code||e.name);process.exitCode=1;}
finally{await pool.end();}
