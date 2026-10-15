const $=id=>document.getElementById(id);
const local=['127.0.0.1','localhost'].includes(location.hostname);
const base=local?'/api':'https://api.muonnoi.org/api';
let current=null,rows=[],capabilities={},actorId=null,canReview=false,dirty=false,busy=false,requestKey=crypto.randomUUID();
const labels={DRAFT:'Bản nháp',REVIEW:'Chờ biên tập',APPROVED:'Đã duyệt phiên bản',PUBLISHED:'Đã xuất bản'};
const errors={LOGIN_REQUIRED:'Đăng nhập để lưu và xem bản thảo.',ACCOUNT_INACTIVE:'Tài khoản hiện chưa có quyền sử dụng.',PUBLISH_LOCKED:'Xuất bản đang khóa. Bản thảo và nhận xét vẫn được lưu.',INDEPENDENT_REVIEWER_REQUIRED:'Cần một người biên tập khác tác giả.',VERSION_CONFLICT:'Bản thảo đã thay đổi. Tải lại trước khi tiếp tục.',STATE_OR_VERSION_CONFLICT:'Trạng thái đã đổi. Tải lại bản thảo trước khi tiếp tục.',RIGHTS_CONFIRMATION_REQUIRED:'Xác nhận quyền sử dụng trước khi gửi biên tập.',REVIEW_NOTE_REQUIRED:'Cần nhận xét biên tập ít nhất 12 ký tự.',APPROVAL_REQUIRED:'Cần duyệt đúng phiên bản trước khi xuất bản.',STUDIO_STORAGE_UNAVAILABLE:'Xưởng viết chưa được cấp cơ sở dữ liệu hoặc kết nối đang lỗi. Có thể tải bản viết về máy.',REQUEST_KEY_CONFLICT:'Lần lưu trước dùng cùng mã với nội dung khác. Tải lại thư viện để kiểm tra bản đã lưu.'};
async function api(path,data,method='POST'){
 const response=await fetch(base+path,{method:data===undefined?'GET':method,credentials:'include',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
 const value=await response.json();if(!response.ok||value.ok===false)throw Error(errors[value.error]||value.error||'Chưa thực hiện được thao tác.');return value;
}
function feedback(value){$('feedback').textContent=value;}
function controls(){
 const owner=!current||String(current.author_id)===String(actorId),published=current?.state==='PUBLISHED';
 for(const id of ['title','topic','body','sources','format','rights','ai'])$(id).disabled=busy||!owner||published;
 $('save').disabled=busy||!owner||published||actorId===null;
 $('submit').disabled=busy||dirty||!owner||current?.state!=='DRAFT';
 $('publish').disabled=busy||dirty||!owner||current?.state!=='APPROVED'||!capabilities.publishEnabled;
 $('newDraft').disabled=busy;$('reloadDrafts').disabled=busy;$('export').disabled=busy;
 $('reviewPanel').hidden=!(canReview&&!owner&&current?.state==='REVIEW');
 $('approve').disabled=busy;$('reject').disabled=busy;
}
function library(){
 $('drafts').replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='muted small';p.textContent='Bản thảo đã lưu sẽ xuất hiện ở đây.';$('drafts').append(p);}
 for(const row of rows){
  const button=document.createElement('button');button.type='button';button.className='draft-item'+(current?.id===row.id?' current':'');
  const title=document.createElement('strong');title.textContent=row.title;
  const meta=document.createElement('span');meta.textContent=`${labels[row.state]} · v${row.version} · ${row.topic}`;
  button.append(title,meta);button.disabled=busy;button.onclick=()=>{if(!dirty||confirm('Bỏ thay đổi chưa lưu để mở bản khác?'))open(row);};$('drafts').append(button);
 }
}
function open(row){
 current=row;dirty=false;requestKey=crypto.randomUUID();$('draftForm').reset();$('reviewNote').value='';$('publishedLink').replaceChildren();
 if(row){$('title').value=row.title;$('topic').value=row.topic;$('format').value=row.format;$('body').value=row.body;$('sources').value=row.sources.join('\n');$('rights').checked=row.rights_confirmed===1;$('ai').checked=row.ai_assisted===1;}
 $('draftState').textContent=row?labels[row.state]:'Bản thảo mới';$('version').textContent=row?'Phiên bản '+row.version:'Chưa lưu';
 if(row?.review_note)feedback('Nhận xét: '+row.review_note);else feedback('');
 if(row?.post_id){const a=document.createElement('a');a.href='/post/?id='+encodeURIComponent(row.post_id);a.textContent='Mở bài đã xuất bản';$('publishedLink').append(a);}
 $('wordCount').textContent=$('body').value.length.toLocaleString('vi-VN')+' ký tự';controls();library();
}
function values(){return {title:$('title').value,body:$('body').value,topic:$('topic').value,format:$('format').value,sources:$('sources').value.split('\n').map(v=>v.trim()).filter(Boolean),rightsConfirmed:$('rights').checked,aiAssisted:$('ai').checked};}
async function refresh(){const result=await api('/publishing/drafts');rows=result.data;actorId=result.actorId;canReview=result.canReview;library();controls();}
async function action(fn){if(busy)return;busy=true;controls();library();try{await fn();}catch(error){feedback(error.name==='TimeoutError'?'Kết nối quá hạn. Nội dung trên màn hình vẫn còn; kiểm tra thư viện trước khi gửi lại.':error.message);}finally{busy=false;controls();library();}}
$('draftForm').addEventListener('input',()=>{dirty=true;$('version').textContent='Có thay đổi chưa lưu';$('wordCount').textContent=$('body').value.length.toLocaleString('vi-VN')+' ký tự';controls();});
$('draftForm').addEventListener('submit',event=>{event.preventDefault();action(async()=>{
 const data=values();const result=current?await api('/publishing/drafts/'+current.id,{...data,version:current.version},'PUT'):await api('/publishing/drafts',{...data,requestKey});
 open(result.data);feedback('Đã lưu bản nháp.');await refresh();
});});
for(const name of ['submit','publish'])$(name).onclick=()=>action(async()=>{
 if(dirty)throw Error('Lưu thay đổi trước khi tiếp tục.');
 const result=await api(`/publishing/drafts/${current.id}/${name}`,{version:current.version});open(result.data);feedback(name==='submit'?'Đã gửi đúng phiên bản cho biên tập.':'Đã xuất bản đúng phiên bản được duyệt.');await refresh();
});
for(const [id,decision] of [['approve','approve'],['reject','reject']])$(id).onclick=()=>action(async()=>{
 const result=await api(`/publishing/drafts/${current.id}/review`,{version:current.version,decision,note:$('reviewNote').value});open(result.data);feedback(decision==='approve'?'Đã duyệt phiên bản này.':'Đã trả lại tác giả để sửa.');await refresh();
});
$('newDraft').onclick=()=>{if(!dirty||confirm('Bỏ thay đổi chưa lưu để viết bài mới?')){open(null);$('title').focus();}};
$('reloadDrafts').onclick=()=>action(async()=>{await refresh();feedback('Đã đọc lại thư viện. Nội dung đang soạn được giữ nguyên.');});
$('export').onclick=()=>{
 const v=values();const text=v.title+'\n\n'+v.body+'\n\nChủ đề: '+v.topic+'\nDạng bài: '+v.format+'\nAI hỗ trợ: '+(v.aiAssisted?'Có':'Không')+'\n\nNguồn:\n'+v.sources.join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ban-thao-nha-chung.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function init(){
 try{
  capabilities=await api('/publishing/capabilities');
  $('connection').textContent=capabilities.publishEnabled?'Lưu nháp, gửi biên tập và xuất bản phiên bản đã duyệt.':'Có thể lưu nháp và gửi biên tập. Xuất bản đang chờ mở trên môi trường được duyệt.';
  if(capabilities.localPreview){
   $('connection').textContent='Bản thử trên máy · dữ liệu thử nghiệm · không gọi AI, không đăng lên website hoặc mạng xã hội.';
   const label=document.createElement('label');label.textContent='Vai trò thử nghiệm trên máy';const select=document.createElement('select');select.id='previewRole';
   for(const [value,text]of [['writer','Tác giả thử nghiệm'],['reviewer','Biên tập viên thử nghiệm']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=capabilities.previewRole||'writer';
   select.onchange=async()=>{if(dirty&&!confirm('Bỏ thay đổi chưa lưu để đổi vai thử nghiệm?')){select.value=capabilities.previewRole;return;}await fetch('/__preview/identity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:select.value})});dirty=false;location.reload();};label.append(select);$('connection').after(label);
  }
  await refresh();controls();
 }catch(error){$('connection').textContent=error.message;controls();}
}
init();
