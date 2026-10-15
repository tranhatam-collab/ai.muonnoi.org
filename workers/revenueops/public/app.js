const $=s=>document.querySelector(s);let report,scenarioData;let activeView=({'/shop':'shop','/work':'work','/orders':'today'})[location.pathname]??'today';
const vnd=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
const node=(tag,value,className)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(className)el.className=className;return el;};
const titles={today:'Biết rõ việc.\nĐo đúng tiền.',shop:'Sản phẩm rõ phạm vi.',work:'Việc có đầu ra.\nBản nháp có người duyệt.',scenario:'Mục tiêu cần\nđược thử bằng số.',audit:'Giữ quyền kiểm soát.'};
function view(name){activeView=name;for(const p of document.querySelectorAll('[data-panel]'))p.hidden=p.dataset.panel!==name;for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===name);$('#page-title').textContent=titles[name];$('#page-title').style.whiteSpace='pre-line';}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));view(activeView);
function notice(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);}
async function api(path,body){const res=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error??'Không đọc được dữ liệu');return data;}
function detail(a){$('#detail-id').textContent=a.id+' / ĐỢT '+a.wave;$('#detail-title').textContent=a.name;$('#detail-scope').textContent=a.scope;$('#detail-next').textContent=a.nextAction;$('#detail').showModal();}
$('#close-detail').addEventListener('click',()=>$('#detail').close());
function renderReport(){
 $('#today').textContent=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
 $('#agent-rows').replaceChildren();$('#product-grid').replaceChildren();
 const selected=$('#agent-filter').value;$('#agent-filter').replaceChildren(new Option('Tất cả','all'));
 for(const a of report.agents){
  const tr=node('tr');const name=node('td');const box=node('div',undefined,'agent-name');box.append(node('span',a.id,'agent-code'));const label=node('div');label.append(node('span',a.name,'agent-title'),node('span','Đang chuẩn bị · chưa mở bán','draft-state'));box.append(label);name.append(box);
  const last=node('td');const button=node('button','Xem kế hoạch ↗','text-button');button.addEventListener('click',()=>detail(a));last.append(button);tr.append(name,node('td',vnd(a.targetVnd)),node('td','Chưa xác minh'),node('td','0'+a.wave),last);$('#agent-rows').append(tr);
  const card=node('article',undefined,'product');card.append(node('span',a.id+' / ĐỢT '+a.wave,'eyebrow'),node('h3',a.name),node('p',a.scope),node('p',vnd(a.priceVnd)+' · giá đề xuất','price'),node('span','ĐANG CHUẨN BỊ · CHƯA NHẬN ĐƠN','badge'));$('#product-grid').append(card);
  $('#agent-filter').append(new Option(a.id+' · '+a.name,a.id));
 }
 $('#agent-filter').value=selected;renderJobs();$('#audit-rows').replaceChildren();
 for(const a of report.audit){const tr=node('tr');tr.append(node('td',a.event),node('td',a.entity_id),node('td',new Date(a.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})));$('#audit-rows').append(tr);}
}
function renderJobs(){if(!report)return;const filter=$('#agent-filter').value;const jobs=report.jobs.filter(j=>filter==='all'||j.agent_id===filter);$('#jobs-empty').hidden=jobs.length>0;$('#job-list').replaceChildren();for(const j of jobs){const item=node('article',undefined,'job');item.append(node('span',j.agent_id+' / '+j.day+' / '+j.state,'eyebrow'),node('h3','Phiếu chuẩn bị · chưa xuất bản'),node('pre',j.draft),node('p',j.reason,'caption'));$('#job-list').append(item);}}
$('#agent-filter').addEventListener('change',renderJobs);
let scenarioRevision=0;
async function renderScenario(){
 const revision=++scenarioRevision;
 const volume=Number($('#volume').value)/100,margin=Number($('#margin').value)*100;
 $('#volume-label').textContent=Math.round(volume*100)+'%';$('#margin-label').textContent=margin/100+' điểm %';
 const data=await api('/api/scenario?volume='+volume+'&margin='+margin);
 if(revision!==scenarioRevision)return;scenarioData=data;
 $('#scenario-metrics').replaceChildren();for(const [label,value,explain] of [['ĐƠN GIẢ ĐỊNH / NGÀY',scenarioData.orders,'Không phải khách đã mua'],['THU GIẢ ĐỊNH',vnd(scenarioData.grossVnd),'Giá × sản lượng mô hình'],['RÒNG GIẢ ĐỊNH',vnd(scenarioData.netVnd),'Đã trừ biến phí và cố định mô hình']]){const card=node('article');card.append(node('p',label),node('strong',value,'unknown'),node('small',explain));$('#scenario-metrics').append(card);}
 $('#scenario-rows').replaceChildren();for(const row of scenarioData.rows){const a=report.agents.find(a=>a.id===row.agentId),tr=node('tr'),meter=node('meter');meter.min=0;meter.max=a.targetVnd*2;meter.value=Math.max(0,row.netVnd);meter.setAttribute('aria-label',row.agentId+' ròng giả định '+vnd(row.netVnd)+'; mục tiêu '+vnd(a.targetVnd));const td=node('td');td.append(meter);tr.append(node('td',row.agentId),node('td',row.orders),node('td',vnd(row.grossVnd)),node('td',vnd(row.netVnd)),td);$('#scenario-rows').append(tr);}
 $('#capacity').textContent='Công kiểm tra chất lượng giả định: '+scenarioData.qaHours.toLocaleString('vi-VN',{maximumFractionDigits:2})+' giờ/ngày. Chưa gồm bán hàng, hỗ trợ và kế toán.';
}
let scenarioTimer;for(const s of ['#volume','#margin'])$(s).addEventListener('input',()=>{clearTimeout(scenarioTimer);scenarioTimer=setTimeout(()=>renderScenario().catch(e=>notice(e.message,true)),150);});
async function load(){try{report=await api('/api/report');renderReport();await renderScenario();notice('Bản chuẩn bị cục bộ · ngân sách được cấp 0 đ · AI, thanh toán và xuất bản giữ khóa.');}catch(e){notice('Chưa đọc được bàn điều hành: '+e.message+'. Nếu ở Cloudflare, cần cấu hình Access và quyền truy cập.',true);}}
$('#plan-day').addEventListener('click',async()=>{const b=$('#plan-day');b.disabled=true;try{await api('/api/run-daily',{});await load();notice('Đã lưu phiếu của 10 Agent cho ngày Việt Nam. Không gọi AI, không gửi hoặc đăng nội dung.');view('work');}catch(e){notice(e.message,true);}finally{b.disabled=false;}});
$('#stop').addEventListener('click',async()=>{try{await api('/api/stop',{});await load();notice('Đã lưu lệnh dừng. Nghĩa vụ công việc đã nhận được giữ nguyên.');}catch(e){notice(e.message,true);}});
$('#refresh').addEventListener('click',load);load();
