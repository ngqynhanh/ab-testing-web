from pathlib import Path
p=Path(__file__).parent
f=p/'public/app.js';s=f.read_text(encoding='utf-8')
a=s.index('function intro()');b=s.index('async function render()',a)
s=s[:a]+'''function intro(){
const available=config.availablePairs||[];
app.innerHTML=`<section class="card narrow"><div class="eyebrow">VISUAL QUALITY RESEARCH / 02</div><h1>Bạn muốn đánh giá<br>ảnh theo tiêu chí nào?</h1><p>Chọn <strong>2 trong 3 tiêu chí</strong> bên dưới. Mỗi tiêu chí có 8 cặp ảnh ngẫu nhiên, tổng cộng 16 lượt. Ở mỗi lượt, so sánh hai kết quả A/B với ảnh gốc và trả lời đúng câu hỏi đang hiển thị.</p><div class="facts"><div><strong>2 / 3</strong><small>tiêu chí tự chọn</small></div><div><strong>8 × 2</strong><small>16 lượt so sánh</small></div><div><strong>A / B / Hòa</strong><small>ba cách trả lời</small></div></div><form id="start"><fieldset class="question-picker"><legend>Chọn đúng 2 tiêu chí</legend>${config.questions.map(q=>`<label class="question-option"><input type="checkbox" name="criterion" value="${esc(q.id)}"><span><strong>${esc(q.label)}</strong><small>${esc(q.prompt)}</small></span></label>`).join('')}</fieldset><p id="selection-note" class="help"></p><p class="help">Không cần tài khoản hoặc mã mời. Hãy dùng máy tính, có thể bấm ảnh để xem lớn. Chúng tôi lưu mã phiên ngẫu nhiên, lựa chọn và thời gian phản hồi, không yêu cầu tên/email và không tạo fingerprint từ thiết bị. Một người chỉ nên tham gia một lần. Bạn có thể dừng; các phản hồi đã gửi được giữ trên máy chủ.</p>${config.mode==='pilot'?'<p class="notice">Chế độ pilot cũng có 16 lượt; dữ liệu được tách khỏi thống kê chính thức.</p>':''}<label class="consent"><input id="consent" type="checkbox" required><span>Tôi đã đọc thông tin và đồng ý tự nguyện tham gia nghiên cứu.</span></label><button id="begin" disabled>Bắt đầu 16 lượt →</button><p id="error" class="error" role="alert"></p></form></section>`;
const boxes=[...document.querySelectorAll('[name=criterion]')],button=document.querySelector('#begin');
const selected=()=>boxes.filter(b=>b.checked).map(b=>b.value);
function update(){const ids=selected();const valid=ids.length===2&&available.some(pair=>pair.every(id=>ids.includes(id)));boxes.forEach(b=>b.disabled=!b.checked&&(ids.length===2||!available.some(pair=>pair.includes(b.value))));button.disabled=!config.open||!valid;document.querySelector('#selection-note').textContent=!config.open?'Nghiên cứu chưa mở tuyển người.':!available.length?'Đã đủ số lượng cho các tiêu chí.':ids.length===2&&!valid?'Cặp này không còn nhận thêm người. Hãy đổi một tiêu chí.':`Đã chọn ${ids.length}/2 tiêu chí. Một số lựa chọn có thể đóng khi gần đủ chỉ tiêu.`;}
boxes.forEach(b=>b.onchange=update);update();
document.querySelector('#start').onsubmit=async e=>{e.preventDefault();button.disabled=true;try{session=await api('start',{selectedQuestions:selected(),consent:document.querySelector('#consent').checked});token=session.token;localStorage.setItem(key,token);render();}catch(e){try{config=await api('config');intro();}catch{}errorText(e);}};
}
''' +s[b:]
s=s.replace('<p>Mã hoàn thành: <strong>${esc(session.id)}</strong></p>','')
s=s.replace('Kết quả nào giữ nội dung và hình dạng tốt hơn?</h2><p class="hint">So sánh với ảnh gốc · Bấm ảnh để xem lớn · Chọn hòa nếu không phân biệt được','${esc(t.prompt)}</h2><p class="hint">${esc(t.hint)}<br>Tiêu chí này: ${t.questionIndex}/8 · Bấm ảnh để xem lớn · Có thể chọn hòa')
f.write_text(s,encoding='utf-8')
f=p/'dev.mjs';s=f.read_text(encoding='utf-8').replace("import {initial,inviteCodes}","import {initial}")
s=s.replace("'local-pilot'","'local-criteria-v2'").replace("'.dev-state.json'","'.dev-state-v2.json'")
a=s.index('if(!Object.keys(state.invites)');b=s.index('let queue=',a);s=s[:a]+s[b:]
s=s.replace("Demo invitation codes: .dev-invites.txt", "No participant login or invitation codes")
f.write_text(s,encoding='utf-8')
f=p/'scripts-check.mjs';s=f.read_text(encoding='utf-8').replace("import {conditions} from './lib/study.mjs';\n",'');s=s.replace('const pairs=new Set();',"const conditions=Object.keys(tables).filter(k=>k.startsWith('group_'));\nconst pairs=new Set();")
f.write_text(s,encoding='utf-8')
