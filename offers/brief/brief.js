import {IntakeSession, normalize, JOURNAL} from './intake.js';
import {ActionJournal, STATUS_LABELS} from './actions.js';
const $ = id => document.getElementById(id);
const form = $('briefForm');
const loopback = ['localhost','127.0.0.1'].includes(location.hostname);
// Pages previews remain offline. They never submit customer input to the production API.
const base = loopback ? '/api' : location.hostname === 'ai.muonnoi.org' ? 'https://api.muonnoi.org/api' : null;
let storage; try { storage = localStorage; } catch { storage = {getItem(){throw new Error('unavailable');}}; }
const session = new IntakeSession(storage);
const sharing = new ActionJournal(storage,'owner-sharing');
let available = false; let triageEnabled = false; let dirty = false; let actorId = null; let viewEpoch = 0;
const errors = {
  LOGIN_REQUIRED:'Đăng nhập rồi quay lại để gửi brief.', ACCOUNT_INACTIVE:'Tài khoản hiện chưa được phép gửi brief.',
  ORIGIN_REJECTED:'Trang hiện tại chưa được phép gửi tới hệ thống tiếp nhận.', INTAKE_DISABLED:'Hệ thống chưa mở tiếp nhận. Anh/chị vẫn có thể tải bản brief.',
  BRIEF_QUOTA_REACHED:'Tài khoản đã đạt hạn mức tiếp nhận. Hãy kiểm tra các brief đã gửi.',
  REQUEST_KEY_CONFLICT:'Mã yêu cầu đã gắn với nội dung khác. Giữ bản này và kiểm tra brief đã nhận.',
  PENDING_PAYLOAD_CHANGED:'Có lần gửi chưa xác nhận. Hãy nhập lại đúng bản brief đã tải hoặc kiểm tra brief đã nhận trước khi tạo yêu cầu khác.',
  STORAGE_UNAVAILABLE:'Trình duyệt không lưu được mã chống gửi trùng. Hãy tải brief và tiếp tục trong cửa sổ cho phép lưu trữ.',
  INVALID_BRIEF:'Hãy kiểm tra độ dài các trường, gói đã chọn và xác nhận quyền tư liệu.',
  ALREADY_RECEIVED:'Brief này đã được hệ thống tiếp nhận.',
  ACTOR_MISMATCH:'Tài khoản đã thay đổi. Hãy đăng nhập lại đúng tài khoản đã bắt đầu gửi brief để đối chiếu; không gửi bản này sang tài khoản khác.',
  VERSION_CONFLICT:'Brief đã thay đổi. Bấm xem trạng thái để lấy bản hiện tại trước khi quyết định lại.',
  TRIAGE_DISABLED:'Chức năng chia sẻ cho Studio chưa mở.',
  PENDING_ACTION_CHANGED:'Có thay đổi quyền xem đang chờ xác nhận. Hãy kiểm tra đúng brief đó hoặc thử lại nguyên yêu cầu trước.',
};
function payload() { const data = Object.fromEntries(new FormData(form)); data.rights_confirmed = form.elements.rights_confirmed.checked; return normalize(data); }
function fillBrief(brief) { for (const [key,text] of Object.entries(normalize(brief))) { if (key === 'rights_confirmed') form.elements[key].checked = text; else form.elements[key].value = text; } }
function render() {
  $('briefFields').disabled = session.locked;
  $('sendBtn').disabled = !available || !actorId || session.busy || session.journal?.state === 'accepted' || session.storageError;
  $('sendBtn').textContent = session.busy ? 'Đang gửi…' : session.journal?.state === 'pending' ? 'Thử lại đúng yêu cầu' : 'Gửi brief';
  $('refreshBtn').disabled = !available || session.busy;
  $('newBtn').hidden = session.journal?.state !== 'accepted';
  $('importFile').disabled = session.locked;
  if (session.journal?.state === 'accepted') {
    $('receipt').hidden = false; $('receipt').textContent = `Đã nhận brief · mã ${session.journal.id}. Đây là xác nhận lưu yêu cầu, chưa phải đơn hàng hay giao dịch.`;
  }
}
async function request(path, options = {}) {
  if (!base) throw new Error('INTAKE_DISABLED');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(base + path, {...options, credentials:'include', cache:'no-store', signal:controller.signal});
    let body; try { body = await response.json(); } catch { throw new Error('UNCONFIRMED'); }
    return {status:response.status,body};
  } finally { clearTimeout(timer); }
}
function feedback(error) {
  $('message').textContent = errors[error.message] || 'Chưa xác nhận được kết quả. Giữ bản brief; bấm kiểm tra hoặc thử lại cùng yêu cầu, không tạo bản gửi mới.';
  if (error.message === 'LOGIN_REQUIRED') $('loginLink').hidden = false;
}
function showBriefRow(row) {
  const item=document.createElement('li');const title=document.createElement('h3');
  title.textContent=`${row.name} · mã ${row.id}`;item.append(title);
  const status=document.createElement('p');status.textContent=row.triage ? STATUS_LABELS[row.triage.status] || row.triage.status : 'Đã lưu yêu cầu';item.append(status);
  if(!triageEnabled)return item;
  const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent='Xem trạng thái và quyền chia sẻ';item.append(button);
  const detail=document.createElement('div');detail.className='sharing-detail';item.append(detail);
  const load=async()=>{
    if(!available||!actorId)return;
    const epoch=viewEpoch;const expectedActor=actorId;
    button.disabled=true;
    try{
      const response=await request('/intake/briefs/'+row.id);
      if(epoch!==viewEpoch||!available)return;
      if(response.status!==200||response.body?.ok!==true||response.body.actor_id!==expectedActor||response.body.data?.id!==row.id||!response.body.data.triage)throw new Error(response.body?.error||'UNCONFIRMED');
      const current=response.body.data.triage;
      const matched=sharing.reconcile(row.id,actorId,current.history);
      detail.replaceChildren();status.textContent=STATUS_LABELS[current.status]||current.status;
      const info=document.createElement('p');info.textContent=current.share_with_studio?'Anh/chị đang cho phép tài khoản vận hành được chỉ định xem toàn bộ brief, kể cả liên hệ và tư liệu. Có thể thu hồi quyền xem tiếp theo.':'Brief đang riêng tư. Studio chưa được phép xem nội dung.';detail.append(info);
      if(current.customer_message){const message=document.createElement('p');message.className='receipt';message.textContent='Phản hồi từ Studio: '+current.customer_message;detail.append(message);}
      const note=document.createElement('p');note.className='helper-text';note.textContent='Chia sẻ chỉ mở quyền đọc và phản hồi trong hệ thống; chưa đặt hàng, gửi email, thanh toán hay đăng nội dung. Thu hồi không xóa thông tin mà người vận hành đã đọc trước đó.';detail.append(note);
      const pending=sharing.journal?.outcome==='pending'?sharing.journal:null;
      if(pending){const warning=document.createElement('p');warning.textContent=pending.brief_id===row.id?'Thay đổi quyền xem chưa được xác nhận. Giữ nguyên mã để đối chiếu hoặc thử lại.':'Một brief khác đang chờ xác nhận quyền xem. Kiểm tra brief mã '+pending.brief_id+' trước.';detail.append(warning);}
      if(matched)$('message').textContent='Đã đối chiếu xác nhận thay đổi quyền xem trên máy chủ.';
      const samePending=pending?.brief_id===row.id;
      const shareValue=samePending?pending.share_with_studio:!current.share_with_studio;
      const action=document.createElement('button');action.type='button';action.className='btn btn-secondary';
      action.textContent=samePending?'Thử lại đúng thay đổi quyền xem':shareValue?'Cho phép Studio xem brief này':'Thu hồi quyền xem của Studio';
      action.disabled=!available||!actorId||sharing.storageError||sharing.busy||Boolean(pending&&!samePending)||Boolean(pending&&pending.actor_id!==actorId);detail.append(action);
      action.addEventListener('click',async()=>{
        if(!available||!actorId||epoch!==viewEpoch||actorId!==expectedActor)return;
        action.disabled=true;
        try{
          await sharing.submit({brief_id:row.id,action:shareValue?'SHARE':'REVOKE',version:samePending?pending.version:current.version,share_with_studio:shareValue},actorId,(path,body)=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
          $('message').textContent='Máy chủ đã xác nhận thay đổi quyền xem. Đang lấy trạng thái hiện tại…';
        }catch(error){feedback(error);}finally{await load();}
      });
    }catch(error){if(epoch===viewEpoch)feedback(error);}finally{button.disabled=!available;}
  };
  button.addEventListener('click',load);return item;
}
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('submit', async event => {
  event.preventDefault(); if (!available || session.busy) return;
  let value; try { value = session.pending || payload(); } catch(error) { feedback(error); return; }
  $('message').textContent = 'Đang lưu yêu cầu…';
  try {
    const sending = session.submit(value, actorId, async brief => {
      render();
      return request('/intake/briefs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(brief)});
    });
    await sending; dirty = false; $('message').textContent = 'Đã lưu thành công. Hãy tải bản brief để giữ mã xác nhận.';
  } catch(error) { feedback(error); }
  render();
});
$('downloadBtn').addEventListener('click', () => {
  try {
    const value = session.receipt ? normalize(session.receipt) : session.pending ? normalize(session.pending) : payload();
    const backup = {schema:'muonnoi-studio-brief-v1',status:session.journal?.state || 'local_draft',request_key:session.journal?.key || null,receipt_id:session.journal?.id || null,note:'Tệp tải về không chứng minh việc gửi, thanh toán hoặc doanh thu. Chỉ receipt trên máy chủ xác nhận tiếp nhận.',brief:value};
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
    const link = document.createElement('a');link.href=url;link.download='muonnoi-studio-brief.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    dirty = false; $('message').textContent = 'Đã tạo tệp tải về trên máy. Thao tác tải không gửi brief tới máy chủ.';
  } catch(error) { feedback(error); }
});
$('importFile').addEventListener('change', async event => {
  try {
    const file = event.target.files[0]; if (!file || file.size > 50000) throw new Error('INVALID_BRIEF');
    const value = JSON.parse(await file.text()); if (value.schema !== 'muonnoi-studio-brief-v1') throw new Error('INVALID_BRIEF');
    const brief = normalize(value.brief);
    if (value.status === 'pending' && value.request_key) {
      // A pending backup may only restore an existing matching local journal. Avoid duplicating a request on another browser/account.
      if (session.journal?.key !== value.request_key) throw new Error('PENDING_PAYLOAD_CHANGED');
    }
    if (value.status === 'accepted') throw new Error('ALREADY_RECEIVED');
    fillBrief(brief);
    dirty = true; $('message').textContent = 'Đã đọc tệp trên máy. Kiểm lại nội dung trước khi gửi; chưa có dữ liệu nào được gửi.';
  } catch(error) { feedback(error); }
  event.target.value = '';
});
async function refresh() {
  if (!available || session.busy) return;
  const epoch=++viewEpoch;
  $('refreshBtn').disabled = true;
  try {
    const response = await request('/intake/briefs');
    if(epoch!==viewEpoch||!available)return;
    if (response.status !== 200 || response.body?.ok !== true || !Array.isArray(response.body.data) || typeof response.body.actor_id !== 'string') throw new Error(response.body?.error || 'UNCONFIRMED');
    actorId = response.body.actor_id;
    const rows = response.body.data; $('briefHistory').replaceChildren();
    for (const row of rows) {
      $('briefHistory').append(showBriefRow(row));
    }
    const match = await session.reconcile(rows, actorId);
    if (match) { dirty = false; fillBrief(match); }
    $('message').textContent = match ? 'Đã đối chiếu và tìm thấy đúng brief đã nhận.' : session.journal?.state === 'pending' ? 'Chưa tìm thấy xác nhận cho lần gửi đang chờ. Giữ nguyên mã và bản brief để thử lại.' : `Có ${rows.length} brief trong tài khoản này.`;
  } catch(error) { if(epoch===viewEpoch){actorId = null;$('briefHistory').replaceChildren();feedback(error);} }
  render();
}
$('refreshBtn').addEventListener('click', refresh);
$('newBtn').addEventListener('click', () => { session.startNew();form.reset();$('receipt').hidden=true;$('message').textContent='Bản mới chưa được gửi.';dirty=false;render(); });
window.addEventListener('beforeunload', event => { if (dirty || session.journal?.state === 'pending' || sharing.journal?.outcome === 'pending') {event.preventDefault();event.returnValue='';} });
window.addEventListener('storage', event => { if ([JOURNAL,sharing.key].includes(event.key)) {viewEpoch++;available=false;actorId=null;$('briefHistory').replaceChildren();$('message').textContent='Brief đã thay đổi ở cửa sổ khác. Tải bản đang soạn trước khi tải lại trang để đối chiếu.';render();} });
render();
if (session.journal?.state === 'pending') $('message').textContent='Có lần gửi đang chờ xác nhận. Nhập lại bản brief đã lưu hoặc kiểm tra brief đã nhận; giữ nguyên mã yêu cầu.';
if (session.storageError) feedback(new Error('STORAGE_UNAVAILABLE'));
if (!base) $('availability').textContent='Bản xem trước: soạn và tải brief trên máy. Chưa mở gửi trực tuyến tại địa chỉ này.';
else {
  request('/intake/capabilities').then(({status,body}) => {
    available = status === 200 && body?.ok === true && body.intakeEnabled === true;
    triageEnabled = available && body.triageEnabled === true;
    $('availability').textContent = available ? body.localFixture ? 'Thử nghiệm cục bộ · tài khoản và dữ liệu giả lập.' : 'Đã mở tiếp nhận brief cho tài khoản đang hoạt động.' : 'Chưa mở tiếp nhận trực tuyến. Anh/chị có thể soạn và tải brief.';
    $('loginLink').hidden = !available;render();
    if (available) refresh();
  }).catch(() => {$('availability').textContent='Chưa kết nối được hệ thống tiếp nhận. Anh/chị vẫn có thể soạn và tải brief.';});
}
