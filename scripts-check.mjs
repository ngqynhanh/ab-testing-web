import fs from 'node:fs';
const tables=JSON.parse(fs.readFileSync('data/tables.json','utf8'));
const conditions=Object.keys(tables).filter(k=>k.startsWith('group_'));
const pairs=new Set();
for(const name of conditions){const [headers,...rows]=tables[name];if(rows.length!==40)throw Error(name+' trial count');const data=rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));if(new Set(data.map(r=>r.image_id)).size!==40)throw Error('Repeated image');if(data.filter(r=>r.left_method==='ours').length!==20)throw Error('Unbalanced side');for(const r of data){for(const k of ['original','left_image','right_image'])if(!fs.existsSync('public/stimuli/'+r[k]))throw Error('Missing '+r[k]);if(name.endsWith('_A'))pairs.add(r.trial_id);}}
if(pairs.size!==320)throw Error('Pair coverage');
console.log('Checked 16 conditions, 320 unique pairs, 480 original assets. No build transformation needed.');
